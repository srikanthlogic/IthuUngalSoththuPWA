#!/usr/bin/env node
/**
 * Deployment Monitoring Script for Chennai MTC Bus Tracker
 * Monitors deployment health and provides early warning for issues
 */

import { execSync } from 'child_process';
import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

interface DeploymentAlert {
  type: 'BUILD_FAILURE' | 'RUNTIME_ERROR' | 'PERFORMANCE_DEGRADATION' | 'HEALTH_CHECK_FAILED';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  message: string;
  deployment: string;
  timestamp: number;
  details?: Record<string, any>;
}

interface MonitoringConfig {
  alerts: {
    buildFailureThreshold: number;
    responseTimeThreshold: number;
    errorRateThreshold: number;
    healthCheckInterval: number;
  };
  metrics: {
    endpoints: string[];
    collectInterval: number;
    retentionDays: number;
  };
  notifications: {
    webhook?: string;
    channels: string[];
    escalation: Record<string, number>;
  };
}

class DeploymentMonitor {
  private config: MonitoringConfig;
  private logsDir: string;
  private metricsDir: string;

  constructor() {
    this.config = this.loadConfig();
    this.logsDir = join(process.cwd(), 'logs');
    this.metricsDir = join(process.cwd(), 'metrics');
    
    // Ensure directories exist
    [this.logsDir, this.metricsDir].forEach(dir => {
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }
    });
  }

  private loadConfig(): MonitoringConfig {
    const defaultConfig: MonitoringConfig = {
      alerts: {
        buildFailureThreshold: 3,
        responseTimeThreshold: 2000,
        errorRateThreshold: 0.05,
        healthCheckInterval: 300000 // 5 minutes
      },
      metrics: {
        endpoints: ['/api/health', '/api/status', '/api/metrics'],
        collectInterval: 60000, // 1 minute
        retentionDays: 30
      },
      notifications: {
        webhook: process.env.MONITORING_WEBHOOK,
        channels: ['console'], // Default to console logging
        escalation: {
          'CRITICAL': 0,
          'HIGH': 300000, // 5 minutes
          'MEDIUM': 900000, // 15 minutes
          'LOW': 3600000 // 1 hour
        }
      }
    };

    try {
      const configPath = join(process.cwd(), 'monitoring.json');
      if (existsSync(configPath)) {
        const userConfig = JSON.parse(readFileSync(configPath, 'utf8'));
        return { ...defaultConfig, ...userConfig };
      }
    } catch (error) {
      console.warn('Failed to load monitoring config, using defaults');
    }

    return defaultConfig;
  }

  async checkDeploymentHealth(deploymentId?: string): Promise<DeploymentAlert[]> {
    const alerts: DeploymentAlert[] = [];
    
    try {
      // Get current or specified deployment
      const deployment = deploymentId || await this.getCurrentDeployment();
      
      // Check build logs for errors
      const buildAlerts = await this.analyzeBuildLogs(deployment);
      alerts.push(...buildAlerts);
      
      // Check runtime health
      const runtimeAlerts = await this.checkRuntimeHealth(deployment);
      alerts.push(...runtimeAlerts);
      
      // Check performance metrics
      const performanceAlerts = await this.checkPerformanceMetrics(deployment);
      alerts.push(...performanceAlerts);
      
      // Save alerts
      await this.saveAlerts(alerts);
      
      // Send notifications for critical alerts
      const criticalAlerts = alerts.filter(a => a.severity === 'CRITICAL');
      if (criticalAlerts.length > 0) {
        await this.sendNotifications(criticalAlerts);
      }
      
    } catch (error) {
      console.error('Error during health check:', error);
      alerts.push({
        type: 'RUNTIME_ERROR',
        severity: 'HIGH',
        message: `Health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        deployment: deploymentId || 'unknown',
        timestamp: Date.now()
      });
    }
    
    return alerts;
  }

  private async getCurrentDeployment(): Promise<string> {
    try {
      const output = execSync('vercel ls --limit 1', { encoding: 'utf8' });
      const lines = output.trim().split('\n');
      if (lines.length > 1) {
        const deploymentLine = lines[1];
        return deploymentLine.split(/\s+/)[1] || 'unknown';
      }
    } catch (error) {
      console.warn('Failed to get current deployment ID');
    }
    return 'unknown';
  }

  private async analyzeBuildLogs(deployment: string): Promise<DeploymentAlert[]> {
    const alerts: DeploymentAlert[] = [];
    
    try {
      // Fetch build logs
      const logs = execSync(`vercel logs ${deployment}`, { encoding: 'utf8' });
      
      // Error patterns to check
      const patterns = {
        CRITICAL_BUILD_ERRORS: [
          { regex: /Cannot find module.*\.ts/, message: 'TypeScript module resolution error' },
          { regex: /dist.*not found/, message: 'Build output directory missing' },
          { regex: /process is not defined/, message: 'Edge Runtime incompatibility' },
          { regex: /public.*not found/, message: 'Static assets missing' },
          { regex: /Build failed/, message: 'General build failure' }
        ],
        PERFORMANCE_ISSUES: [
          { regex: /Function execution timed out/, message: 'Function timeout' },
          { regex: /Memory limit exceeded/, message: 'Memory limit exceeded' },
          { regex: /Cold start.*>.*[5-9]\d{3}ms/, message: 'Slow cold start (>5s)' }
        ],
        COMPATIBILITY_ISSUES: [
          { regex: /React.*compatibility/, message: 'React version compatibility issue' },
          { regex: /Edge Runtime.*unsupported/, message: 'Edge Runtime API incompatibility' },
          { regex: /Node\.js.*version/, message: 'Node.js version mismatch' }
        ]
      };

      // Check patterns and generate alerts
      for (const [category, patternList] of Object.entries(patterns)) {
        for (const pattern of patternList) {
          if (pattern.regex.test(logs)) {
            const severity = category.includes('CRITICAL') ? 'CRITICAL' : 
                           category.includes('PERFORMANCE') ? 'HIGH' : 'MEDIUM';
            
            alerts.push({
              type: 'BUILD_FAILURE',
              severity: severity as any,
              message: pattern.message,
              deployment,
              timestamp: Date.now(),
              details: { category, pattern: pattern.regex.source }
            });
          }
        }
      }
      
    } catch (error) {
      alerts.push({
        type: 'RUNTIME_ERROR',
        severity: 'MEDIUM',
        message: `Failed to analyze build logs: ${error instanceof Error ? error.message : 'Unknown error'}`,
        deployment,
        timestamp: Date.now()
      });
    }
    
    return alerts;
  }

  private async checkRuntimeHealth(deployment: string): Promise<DeploymentAlert[]> {
    const alerts: DeploymentAlert[] = [];
    
    try {
      // Get deployment URL
      const deploymentUrl = await this.getDeploymentUrl(deployment);
      
      if (!deploymentUrl) {
        alerts.push({
          type: 'RUNTIME_ERROR',
          severity: 'HIGH',
          message: 'Could not determine deployment URL',
          deployment,
          timestamp: Date.now()
        });
        return alerts;
      }

      // Test health endpoints
      for (const endpoint of this.config.metrics.endpoints) {
        try {
          const startTime = Date.now();
          const response = await fetch(`${deploymentUrl}${endpoint}`, {
            method: 'GET',
            headers: { 'User-Agent': 'MTC-Monitor/1.0' }
          });
          
          const responseTime = Date.now() - startTime;
          
          if (!response.ok) {
            alerts.push({
              type: 'HEALTH_CHECK_FAILED',
              severity: response.status >= 500 ? 'CRITICAL' : 'HIGH',
              message: `Health check failed for ${endpoint}: HTTP ${response.status}`,
              deployment,
              timestamp: Date.now(),
              details: { endpoint, status: response.status, responseTime }
            });
          } else if (responseTime > this.config.alerts.responseTimeThreshold) {
            alerts.push({
              type: 'PERFORMANCE_DEGRADATION',
              severity: 'MEDIUM',
              message: `Slow response time for ${endpoint}: ${responseTime}ms`,
              deployment,
              timestamp: Date.now(),
              details: { endpoint, responseTime, threshold: this.config.alerts.responseTimeThreshold }
            });
          }
          
          // Save metrics
          await this.saveMetric(deployment, endpoint, {
            responseTime,
            status: response.status,
            timestamp: Date.now()
          });
          
        } catch (error) {
          alerts.push({
            type: 'HEALTH_CHECK_FAILED',
            severity: 'HIGH',
            message: `Health check error for ${endpoint}: ${error instanceof Error ? error.message : 'Unknown error'}`,
            deployment,
            timestamp: Date.now(),
            details: { endpoint, error: error instanceof Error ? error.message : 'Unknown error' }
          });
        }
      }
      
    } catch (error) {
      alerts.push({
        type: 'RUNTIME_ERROR',
        severity: 'HIGH',
        message: `Runtime health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        deployment,
        timestamp: Date.now()
      });
    }
    
    return alerts;
  }

  private async checkPerformanceMetrics(deployment: string): Promise<DeploymentAlert[]> {
    const alerts: DeploymentAlert[] = [];
    
    try {
      // Check recent metrics for performance trends
      const recentMetrics = await this.getRecentMetrics(deployment, 300000); // Last 5 minutes
      
      if (recentMetrics.length === 0) {
        return alerts;
      }
      
      // Calculate error rate
      const totalRequests = recentMetrics.length;
      const errorRequests = recentMetrics.filter(m => m.status >= 400).length;
      const errorRate = errorRequests / totalRequests;
      
      if (errorRate > this.config.alerts.errorRateThreshold) {
        alerts.push({
          type: 'PERFORMANCE_DEGRADATION',
          severity: errorRate > 0.2 ? 'CRITICAL' : 'HIGH',
          message: `High error rate: ${(errorRate * 100).toFixed(2)}% (${errorRequests}/${totalRequests})`,
          deployment,
          timestamp: Date.now(),
          details: { errorRate, totalRequests, errorRequests, threshold: this.config.alerts.errorRateThreshold }
        });
      }
      
      // Calculate average response time
      const avgResponseTime = recentMetrics.reduce((sum, m) => sum + m.responseTime, 0) / totalRequests;
      
      if (avgResponseTime > this.config.alerts.responseTimeThreshold) {
        alerts.push({
          type: 'PERFORMANCE_DEGRADATION',
          severity: avgResponseTime > this.config.alerts.responseTimeThreshold * 2 ? 'HIGH' : 'MEDIUM',
          message: `High average response time: ${Math.round(avgResponseTime)}ms`,
          deployment,
          timestamp: Date.now(),
          details: { avgResponseTime, threshold: this.config.alerts.responseTimeThreshold, sampleSize: totalRequests }
        });
      }
      
    } catch (error) {
      console.warn('Error checking performance metrics:', error);
    }
    
    return alerts;
  }

  private async getDeploymentUrl(deployment: string): Promise<string | null> {
    try {
      const output = execSync(`vercel ls`, { encoding: 'utf8' });
      const lines = output.split('\n');
      
      for (const line of lines) {
        if (line.includes(deployment)) {
          const parts = line.trim().split(/\s+/);
          if (parts.length > 0) {
            const url = parts[0];
            return url.startsWith('http') ? url : `https://${url}`;
          }
        }
      }
    } catch (error) {
      console.warn('Failed to get deployment URL:', error);
    }
    
    return null;
  }

  private async saveMetric(deployment: string, endpoint: string, metric: any): Promise<void> {
    const date = new Date().toISOString().split('T')[0];
    const metricsFile = join(this.metricsDir, `metrics-${date}.json`);
    
    let metrics = [];
    if (existsSync(metricsFile)) {
      try {
        metrics = JSON.parse(readFileSync(metricsFile, 'utf8'));
      } catch (error) {
        console.warn('Failed to load existing metrics');
      }
    }
    
    metrics.push({
      deployment,
      endpoint,
      ...metric
    });
    
    try {
      writeFileSync(metricsFile, JSON.stringify(metrics, null, 2));
    } catch (error) {
      console.warn('Failed to save metrics:', error);
    }
  }

  private async getRecentMetrics(deployment: string, timeWindow: number): Promise<any[]> {
    const date = new Date().toISOString().split('T')[0];
    const metricsFile = join(this.metricsDir, `metrics-${date}.json`);
    
    if (!existsSync(metricsFile)) {
      return [];
    }
    
    try {
      const allMetrics = JSON.parse(readFileSync(metricsFile, 'utf8'));
      const cutoffTime = Date.now() - timeWindow;
      
      return allMetrics.filter((m: any) => 
        m.deployment === deployment && 
        m.timestamp >= cutoffTime
      );
    } catch (error) {
      console.warn('Failed to load recent metrics:', error);
      return [];
    }
  }

  private async saveAlerts(alerts: DeploymentAlert[]): Promise<void> {
    if (alerts.length === 0) return;
    
    const date = new Date().toISOString().split('T')[0];
    const alertsFile = join(this.logsDir, `alerts-${date}.json`);
    
    let existingAlerts = [];
    if (existsSync(alertsFile)) {
      try {
        existingAlerts = JSON.parse(readFileSync(alertsFile, 'utf8'));
      } catch (error) {
        console.warn('Failed to load existing alerts');
      }
    }
    
    existingAlerts.push(...alerts);
    
    try {
      writeFileSync(alertsFile, JSON.stringify(existingAlerts, null, 2));
    } catch (error) {
      console.warn('Failed to save alerts:', error);
    }
  }

  private async sendNotifications(alerts: DeploymentAlert[]): Promise<void> {
    for (const alert of alerts) {
      const message = `🚨 MTC Tracker Alert: ${alert.message} (${alert.severity}) - Deployment: ${alert.deployment}`;
      
      // Console notification
      if (this.config.notifications.channels.includes('console')) {
        const color = alert.severity === 'CRITICAL' ? '\x1b[31m' : 
                     alert.severity === 'HIGH' ? '\x1b[33m' : '\x1b[36m';
        console.log(`${color}${message}\x1b[0m`);
      }
      
      // Webhook notification
      if (this.config.notifications.webhook && this.config.notifications.channels.includes('webhook')) {
        try {
          await fetch(this.config.notifications.webhook, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              text: message,
              alert,
              timestamp: new Date().toISOString()
            })
          });
        } catch (error) {
          console.warn('Failed to send webhook notification:', error);
        }
      }
    }
  }

  async generateReport(days: number = 7): Promise<void> {
    const report = {
      period: `Last ${days} days`,
      generated: new Date().toISOString(),
      summary: {
        totalAlerts: 0,
        criticalAlerts: 0,
        deploymentHealth: 'unknown' as 'healthy' | 'degraded' | 'unhealthy',
        avgResponseTime: 0,
        errorRate: 0
      },
      alerts: [] as DeploymentAlert[],
      recommendations: [] as string[]
    };
    
    // Collect alerts from the last N days
    for (let i = 0; i < days; i++) {
      const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const alertsFile = join(this.logsDir, `alerts-${date}.json`);
      
      if (existsSync(alertsFile)) {
        try {
          const dayAlerts = JSON.parse(readFileSync(alertsFile, 'utf8'));
          report.alerts.push(...dayAlerts);
        } catch (error) {
          console.warn(`Failed to load alerts for ${date}`);
        }
      }
    }
    
    // Calculate summary
    report.summary.totalAlerts = report.alerts.length;
    report.summary.criticalAlerts = report.alerts.filter(a => a.severity === 'CRITICAL').length;
    
    // Determine overall health
    if (report.summary.criticalAlerts > 0) {
      report.summary.deploymentHealth = 'unhealthy';
    } else if (report.alerts.filter(a => a.severity === 'HIGH').length > 5) {
      report.summary.deploymentHealth = 'degraded';
    } else {
      report.summary.deploymentHealth = 'healthy';
    }
    
    // Generate recommendations
    const alertTypes = report.alerts.reduce((acc, alert) => {
      acc[alert.type] = (acc[alert.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    if (alertTypes.BUILD_FAILURE > 2) {
      report.recommendations.push('Consider implementing stricter pre-deployment validation');
    }
    
    if (alertTypes.PERFORMANCE_DEGRADATION > 5) {
      report.recommendations.push('Investigate performance optimization opportunities');
    }
    
    if (alertTypes.HEALTH_CHECK_FAILED > 3) {
      report.recommendations.push('Review and strengthen health check endpoints');
    }
    
    // Save report
    const reportFile = join(this.logsDir, `monitoring-report-${new Date().toISOString().split('T')[0]}.json`);
    writeFileSync(reportFile, JSON.stringify(report, null, 2));
    
    console.log(`📊 Monitoring report generated: ${reportFile}`);
    console.log(`Overall health: ${report.summary.deploymentHealth}`);
    console.log(`Total alerts: ${report.summary.totalAlerts} (${report.summary.criticalAlerts} critical)`);
  }
}

// CLI interface
const main = async () => {
  const monitor = new DeploymentMonitor();
  const command = process.argv[2];
  const arg = process.argv[3];
  
  switch (command) {
    case 'check':
      console.log('🔍 Running deployment health check...');
      const alerts = await monitor.checkDeploymentHealth(arg);
      console.log(`Found ${alerts.length} alerts`);
      if (alerts.length > 0) {
        console.log('Recent alerts:');
        alerts.slice(-5).forEach(alert => {
          console.log(`  ${alert.severity}: ${alert.message}`);
        });
      }
      break;
      
    case 'report':
      const days = arg ? parseInt(arg, 10) : 7;
      await monitor.generateReport(days);
      break;
      
    case 'watch':
      console.log('👁️  Starting continuous monitoring...');
      setInterval(async () => {
        try {
          await monitor.checkDeploymentHealth();
        } catch (error) {
          console.error('Error during monitoring:', error);
        }
      }, 300000); // Every 5 minutes
      break;
      
    default:
      console.log('Usage: deployment-monitor.ts <command> [args]');
      console.log('Commands:');
      console.log('  check [deployment-id]  - Run single health check');
      console.log('  report [days]          - Generate monitoring report');
      console.log('  watch                  - Start continuous monitoring');
      process.exit(1);
  }
};

if (require.main === module) {
  main().catch(console.error);
}

export { DeploymentMonitor };