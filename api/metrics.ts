
export const config = {
  runtime: 'edge',
};

interface MetricsResponse {
  timestamp: string;
  version: string;
  environment: string;
  uptime: number;
  metrics: {
    requests: {
      total: number;
      successful: number;
      failed: number;
      average_response_time: number;
    };
    performance: {
      memory_usage_mb: number;
      cpu_usage_percent: number;
      active_connections: number;
    };
    errors: {
      total_errors: number;
      error_rate_percent: number;
      top_errors: Array<{
        error: string;
        count: number;
        last_occurrence: string;
      }>;
    };
    health: {
      overall_status: 'healthy' | 'degraded' | 'unhealthy';
      last_health_check: string;
      health_check_duration_ms: number;
    };
  };
  alerts: Array<{
    type: string;
    message: string;
    timestamp: string;
    severity: 'info' | 'warning' | 'critical';
  }>;
}

// Global metrics storage (in production, use a proper metrics database)
let requestMetrics = {
  total: 0,
  successful: 0,
  failed: 0,
  responseTimes: [] as number[],
};

let errorMetrics = {
  total: 0,
  errors: new Map<string, { count: number; lastOccurrence: string }>(),
};

let healthMetrics = {
  lastCheck: new Date().toISOString(),
  duration: 0,
  status: 'healthy' as 'healthy' | 'degraded' | 'unhealthy',
};

function getEnvironmentInfo(): { environment: string; version: string } {
  return {
    environment: process.env.NODE_ENV || 'unknown',
    version: process.env.VERCEL_GIT_COMMIT_SHA?.substring(0, 7) || 'dev',
  };
}

function getSystemMetrics(): { memory_usage_mb: number; cpu_usage_percent: number; active_connections: number } {
  // In Edge Runtime, we have limited access to system metrics
  // These would be populated with actual metrics in a Node.js runtime
  return {
    memory_usage_mb: 0,
    cpu_usage_percent: 0,
    active_connections: 1, // At least this request is active
  };
}

function calculateAverageResponseTime(): number {
  if (requestMetrics.responseTimes.length === 0) return 0;
  const sum = requestMetrics.responseTimes.reduce((a, b) => a + b, 0);
  return Math.round(sum / requestMetrics.responseTimes.length);
}

function calculateErrorRate(): number {
  if (requestMetrics.total === 0) return 0;
  return Math.round((requestMetrics.failed / requestMetrics.total) * 100 * 100) / 100;
}

function getTopErrors(limit: number = 5): Array<{ error: string; count: number; last_occurrence: string }> {
  return Array.from(errorMetrics.errors.entries())
    .map(([error, data]) => ({
      error,
      count: data.count,
      last_occurrence: data.lastOccurrence,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

function recordRequestMetrics(responseTime: number, success: boolean): void {
  requestMetrics.total++;
  if (success) {
    requestMetrics.successful++;
  } else {
    requestMetrics.failed++;
  }

  requestMetrics.responseTimes.push(responseTime);

  // Keep only last 1000 response times for memory efficiency
  if (requestMetrics.responseTimes.length > 1000) {
    requestMetrics.responseTimes = requestMetrics.responseTimes.slice(-1000);
  }
}

function recordErrorMetrics(error: string): void {
 errorMetrics.total++;
 const existing = errorMetrics.errors.get(error);
 if (existing) {
   existing.count++;
   existing.lastOccurrence = new Date().toISOString();
 } else {
   errorMetrics.errors.set(error, {
     count: 1,
     lastOccurrence: new Date().toISOString(),
   });
 }
}

function recordHealthCheck(duration: number, status: 'healthy' | 'degraded' | 'unhealthy'): void {
 healthMetrics.lastCheck = new Date().toISOString();
 healthMetrics.duration = duration;
 healthMetrics.status = status;
}

export default async function handler(request: Request): Promise<Response> {
 const startTime = Date.now();

 try {
   const { environment, version } = getEnvironmentInfo();
   const systemMetrics = getSystemMetrics();

   // Record this request
   const responseTime = Date.now() - startTime;
   recordRequestMetrics(responseTime, true);

   const metricsResponse: MetricsResponse = {
     timestamp: new Date().toISOString(),
     version,
     environment,
     uptime: process.uptime() || 0,
     metrics: {
       requests: {
         total: requestMetrics.total,
         successful: requestMetrics.successful,
         failed: requestMetrics.failed,
         average_response_time: calculateAverageResponseTime(),
       },
       performance: {
         memory_usage_mb: systemMetrics.memory_usage_mb,
         cpu_usage_percent: systemMetrics.cpu_usage_percent,
         active_connections: systemMetrics.active_connections,
       },
       errors: {
         total_errors: errorMetrics.total,
         error_rate_percent: calculateErrorRate(),
         top_errors: getTopErrors(),
       },
       health: {
         overall_status: healthMetrics.status,
         last_health_check: healthMetrics.lastCheck,
         health_check_duration_ms: healthMetrics.duration,
       },
     },
     alerts: [], // Would be populated with active alerts in a full implementation
   };

   return new Response(JSON.stringify(metricsResponse, null, 2), {
     status: 200,
     headers: {
       'Content-Type': 'application/json',
       'Cache-Control': 'no-cache, no-store, must-revalidate',
       'X-Metrics-Time': responseTime.toString(),
     },
   });
 } catch (error) {
   // Record the error
   recordErrorMetrics(error instanceof Error ? error.message : 'Unknown error');

   return new Response(
     JSON.stringify({
       error: 'Internal server error',
       message: 'Failed to retrieve metrics',
     }),
     {
       status: 500,
       headers: {
         'Content-Type': 'application/json',
       },
     }
   );
 }
}
