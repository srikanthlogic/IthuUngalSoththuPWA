export const config = {
  runtime: 'edge',
};

interface StatusResponse {
  status: 'ok' | 'error';
  timestamp: string;
  version: string;
  environment: string;
  services: {
    api: 'up' | 'down';
    database: 'up' | 'down';
    external_apis: 'up' | 'down';
  };
  dependencies: {
    name: string;
    status: 'up' | 'down';
    response_time_ms?: number;
    last_check: string;
  }[];
}

function getEnvironmentInfo(): { environment: string; version: string } {
  return {
    environment: process.env.NODE_ENV || 'unknown',
    version: process.env.VERCEL_GIT_COMMIT_SHA?.substring(0, 7) || 'dev',
  };
}

async function checkServiceHealth(name: string, checkFn: () => Promise<boolean>): Promise<{ status: 'up' | 'down'; response_time_ms?: number }> {
  const startTime = Date.now();

  try {
    const isHealthy = await checkFn();
    const responseTime = Date.now() - startTime;

    return {
      status: isHealthy ? 'up' : 'down',
      response_time_ms: responseTime,
    };
  } catch (error) {
    return {
      status: 'down',
      response_time_ms: Date.now() - startTime,
    };
  }
}

async function checkAPIHealth(): Promise<boolean> {
  try {
    // Check if the API can handle basic requests
    return true;
  } catch (error) {
    console.error('API health check failed:', error);
    return false;
  }
}

async function checkDatabaseHealth(): Promise<boolean> {
  try {
    // This would check your actual database connection
    // For now, we'll simulate a successful connection
    return true;
  } catch (error) {
    console.error('Database health check failed:', error);
    return false;
  }
}

async function checkExternalAPIsHealth(): Promise<boolean> {
  try {
    const externalAPIs = [
      process.env.BACKEND_URL,
      // Add other external API endpoints here
    ].filter(Boolean);

    if (externalAPIs.length === 0) {
      return true; // No external APIs to check
    }

    for (const apiUrl of externalAPIs) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        const response = await fetch(apiUrl!, {
          method: 'HEAD',
          signal: controller.signal,
        });

        if (!response.ok) {
          console.warn(`External API ${apiUrl} returned ${response.status}`);
          return false;
        }

        clearTimeout(timeoutId);
      } catch (error) {
        console.error(`External API check failed for ${apiUrl}:`, error);
        return false;
      }
    }

    return true;
  } catch (error) {
    console.error('External APIs health check failed:', error);
    return false;
  }
}

export default async function handler(request: Request): Promise<Response> {
  const { environment, version } = getEnvironmentInfo();

  // Perform health checks concurrently
  const [apiHealth, dbHealth, externalAPIsHealth] = await Promise.all([
    checkServiceHealth('api', checkAPIHealth),
    checkServiceHealth('database', checkDatabaseHealth),
    checkServiceHealth('external_apis', checkExternalAPIsHealth),
  ]);

  const allServicesUp = apiHealth.status === 'up' && dbHealth.status === 'up' && externalAPIsHealth.status === 'up';

  const statusResponse: StatusResponse = {
    status: allServicesUp ? 'ok' : 'error',
    timestamp: new Date().toISOString(),
    version,
    environment,
    services: {
      api: apiHealth.status,
      database: dbHealth.status,
      external_apis: externalAPIsHealth.status,
    },
    dependencies: [
      {
        name: 'api',
        status: apiHealth.status,
        response_time_ms: apiHealth.response_time_ms,
        last_check: new Date().toISOString(),
      },
      {
        name: 'database',
        status: dbHealth.status,
        response_time_ms: dbHealth.response_time_ms,
        last_check: new Date().toISOString(),
      },
      {
        name: 'external_apis',
        status: externalAPIsHealth.status,
        response_time_ms: externalAPIsHealth.response_time_ms,
        last_check: new Date().toISOString(),
      },
    ],
  };

  const statusCode = allServicesUp ? 200 : 503;

  return new Response(JSON.stringify(statusResponse, null, 2), {
    status: statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
    },
  });
}