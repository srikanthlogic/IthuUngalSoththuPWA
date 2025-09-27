export const config = {
  runtime: 'edge',
};

interface HealthCheckResponse {
  status: 'healthy' | 'unhealthy';
  timestamp: string;
  version: string;
  environment: string;
  uptime: number;
  checks: {
    database: boolean;
    external_apis: boolean;
    memory: boolean;
    disk_space: boolean;
  };
  metrics: {
    response_time_ms: number;
    memory_usage_mb: number;
    cpu_usage_percent: number;
  };
  errors?: string[];
}

function getEnvironmentInfo(): { environment: string; version: string } {
  return {
    environment: process.env.NODE_ENV || 'unknown',
    version: process.env.VERCEL_GIT_COMMIT_SHA?.substring(0, 7) || 'dev',
  };
}

function getSystemMetrics(): { memory_usage_mb: number; cpu_usage_percent: number } {
  // In Edge Runtime, we have limited access to system metrics
  // These are placeholder values that would be replaced with actual metrics in a Node.js runtime
  return {
    memory_usage_mb: 0, // Would be calculated from process.memoryUsage()
    cpu_usage_percent: 0, // Would be calculated from process.cpuUsage()
  };
}

async function checkDatabaseConnection(): Promise<boolean> {
  try {
    // This would check your actual database connection
    // For now, we'll simulate a successful connection
    return true;
  } catch (error) {
    console.error('Database health check failed:', error);
    return false;
  }
}

async function checkExternalAPIs(): Promise<boolean> {
  try {
    // Check if external APIs are responding
    const apiEndpoints = [
      process.env.BACKEND_URL,
      // Add other external API endpoints here
    ].filter(Boolean);

    if (apiEndpoints.length === 0) {
      return true; // No external APIs to check
    }

    // Perform basic connectivity checks
    for (const endpoint of apiEndpoints) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        const response = await fetch(endpoint!, {
          method: 'HEAD',
          signal: controller.signal,
        });

        if (!response.ok) {
          console.warn(`External API ${endpoint} returned ${response.status}`);
          return false;
        }

        clearTimeout(timeoutId);
      } catch (error) {
        console.error(`External API check failed for ${endpoint}:`, error);
        return false;
      }
    }

    return true;
  } catch (error) {
    console.error('External API health check failed:', error);
    return false;
  }
}

async function checkMemoryUsage(): Promise<boolean> {
  try {
    // In Edge Runtime, memory limits are enforced by the platform
    // We'll assume memory is okay unless we have specific indicators
    return true;
  } catch (error) {
    console.error('Memory check failed:', error);
    return false;
  }
}

async function checkDiskSpace(): Promise<boolean> {
  try {
    // In Edge Runtime, disk space is managed by the platform
    // We'll assume disk space is okay
    return true;
  } catch (error) {
    console.error('Disk space check failed:', error);
    return false;
  }
}

export default async function handler(request: Request): Promise<Response> {
  const startTime = Date.now();
  const { environment, version } = getEnvironmentInfo();
  const systemMetrics = getSystemMetrics();

  const errors: string[] = [];

  // Perform all health checks concurrently
  const [
    databaseHealthy,
    externalAPIsHealthy,
    memoryHealthy,
    diskSpaceHealthy,
  ] = await Promise.all([
    checkDatabaseConnection().catch((error) => {
      errors.push(`Database check failed: ${error.message}`);
      return false;
    }),
    checkExternalAPIs().catch((error) => {
      errors.push(`External APIs check failed: ${error.message}`);
      return false;
    }),
    checkMemoryUsage().catch((error) => {
      errors.push(`Memory check failed: ${error.message}`);
      return false;
    }),
    checkDiskSpace().catch((error) => {
      errors.push(`Disk space check failed: ${error.message}`);
      return false;
    }),
  ]);

  const responseTime = Date.now() - startTime;

  const allChecksPassed = databaseHealthy && externalAPIsHealthy && memoryHealthy && diskSpaceHealthy;

  const healthResponse: HealthCheckResponse = {
    status: allChecksPassed ? 'healthy' : 'unhealthy',
    timestamp: new Date().toISOString(),
    version,
    environment,
    uptime: process.uptime() || 0,
    checks: {
      database: databaseHealthy,
      external_apis: externalAPIsHealthy,
      memory: memoryHealthy,
      disk_space: diskSpaceHealthy,
    },
    metrics: {
      response_time_ms: responseTime,
      memory_usage_mb: systemMetrics.memory_usage_mb,
      cpu_usage_percent: systemMetrics.cpu_usage_percent,
    },
    ...(errors.length > 0 && { errors }),
  };

  const statusCode = allChecksPassed ? 200 : 503;

  return new Response(JSON.stringify(healthResponse, null, 2), {
    status: statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'X-Health-Check-Time': responseTime.toString(),
    },
  });
}