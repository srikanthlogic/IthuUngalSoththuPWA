import type {
  RequestContext,
  AuthenticatedRequest,
  ApiResponse,
  BusLocation,
  RouteInfo,
  StopInfo,
  RealTimeData,
  ProxyConfig
} from './types.ts';
import {
  withMiddleware,
  healthCheck
} from './_middleware.ts';
import {
  Logger,
  RequestUtils,
  ResponseUtils,
  BusDataUtils,
  EnvUtils
} from './utils.ts';

export const config = {
  runtime: "edge",
};

// Configuration
const PROXY_CONFIG: ProxyConfig = {
  target: EnvUtils.getRequiredEnv('BACKEND_URL'),
  changeOrigin: true,
  timeout: 30000,
  retries: 3,
  headers: {
    'Content-Type': 'application/json',
    'User-Agent': 'MTC-Bus-Tracker-Edge-Function/1.0.0'
  }
};

const REALTIME_CONFIG = {
  heartbeatInterval: 30000, // 30 seconds
  maxConnections: 1000,
  enableCompression: true
};

// Main edge function handler
export default async function handler(request: Request, context: RequestContext): Promise<Response> {
  const requestId = RequestUtils.generateRequestId();
  const logger = Logger.getInstance();

  // Handle health check
  if (request.method === 'GET' && new URL(request.url).pathname === '/api/health') {
    return await healthCheck();
  }

  // Use middleware for all other requests
  return await withMiddleware(request, context, async (authenticatedRequest) => {
    const url = new URL(request.url);
    const path = url.pathname;

    try {
      // Route requests based on path
      if (path.startsWith('/api/bus/location')) {
        return await handleBusLocation(request, authenticatedRequest);
      } else if (path.startsWith('/api/route')) {
        return await handleRouteInfo(request, authenticatedRequest);
      } else if (path.startsWith('/api/stop')) {
        return await handleStopInfo(request, authenticatedRequest);
      } else if (path.startsWith('/api/realtime')) {
        return await handleRealTimeData(request, authenticatedRequest);
      } else if (path.startsWith('/api/proxy')) {
        return await handleProxyRequest(request, authenticatedRequest);
      } else {
        return ResponseUtils.createErrorResponse(
          'Endpoint not found',
          'NOT_FOUND',
          404,
          requestId
        );
      }
    } catch (error) {
      logger.log({
        level: 'error',
        message: 'Unhandled error in proxy handler',
        requestId,
        method: request.method,
        url: request.url,
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: authenticatedRequest.user?.id
      });

      return ResponseUtils.createErrorResponse(
        'Internal server error',
        'INTERNAL_ERROR',
        500,
        requestId
      );
    }
  }, {
    auth: {
      required: true,
      strategies: ['apikey', 'jwt'],
      bypassPaths: ['/api/health']
    },
    rateLimit: {
      windowMs: 60000,
      maxRequests: 100
    }
  });
}

// Bus Location Handler
async function handleBusLocation(
  request: Request,
  authenticatedRequest: AuthenticatedRequest
): Promise<Response> {
  const requestId = RequestUtils.generateRequestId();
  const logger = Logger.getInstance();
  const url = new URL(request.url);

  logger.log({
    level: 'info',
    message: 'Bus location request',
    requestId,
    method: request.method,
    url: request.url,
    userId: authenticatedRequest.user?.id
  });

  try {
    if (request.method === 'GET') {
      // Get bus locations
      const routeId = url.searchParams.get('routeId');
      const busId = url.searchParams.get('busId');

      const queryParams = new URLSearchParams();
      if (routeId) queryParams.append('routeId', routeId);
      if (busId) queryParams.append('busId', busId);

      const backendUrl = `${PROXY_CONFIG.target}/api/bus/location?${queryParams}`;
      const response = await fetch(backendUrl, {
        method: 'GET',
        headers: {
          ...PROXY_CONFIG.headers,
          'Authorization': request.headers.get('authorization') || '',
          'X-API-Key': request.headers.get('x-api-key') || ''
        }
      });

      if (!response.ok) {
        throw new Error(`Backend responded with ${response.status}`);
      }

      const data = await response.json();

      // Validate and transform data
      const validatedData = Array.isArray(data)
        ? data.map(BusDataUtils.validateBusLocation).filter(Boolean)
        : BusDataUtils.validateBusLocation(data);

      return ResponseUtils.createSuccessResponse(
        validatedData,
        requestId,
        'Bus locations retrieved successfully'
      );

    } else if (request.method === 'POST') {
      // Update bus location
      const body = await RequestUtils.parseRequestBody<Partial<BusLocation>>(request);
      if (!body) {
        return ResponseUtils.createErrorResponse(
          'Invalid request body',
          'INVALID_BODY',
          400,
          requestId
        );
      }

      const validatedLocation = BusDataUtils.validateBusLocation(body);
      if (!validatedLocation) {
        return ResponseUtils.createErrorResponse(
          'Invalid bus location data',
          'INVALID_DATA',
          400,
          requestId
        );
      }

      const backendUrl = `${PROXY_CONFIG.target}/api/bus/location`;
      const response = await fetch(backendUrl, {
        method: 'POST',
        headers: {
          ...PROXY_CONFIG.headers,
          'Authorization': request.headers.get('authorization') || '',
          'X-API-Key': request.headers.get('x-api-key') || ''
        },
        body: JSON.stringify(validatedLocation)
      });

      if (!response.ok) {
        throw new Error(`Backend responded with ${response.status}`);
      }

      const result = await response.json();

      return ResponseUtils.createSuccessResponse(
        result,
        requestId,
        'Bus location updated successfully'
      );

    } else {
      return ResponseUtils.createErrorResponse(
        'Method not allowed',
        'METHOD_NOT_ALLOWED',
        405,
        requestId
      );
    }
  } catch (error) {
    logger.log({
      level: 'error',
      message: 'Error handling bus location request',
      requestId,
      method: request.method,
      url: request.url,
      error: error instanceof Error ? error.message : 'Unknown error',
      userId: authenticatedRequest.user?.id
    });

    return ResponseUtils.createErrorResponse(
      'Failed to process bus location request',
      'BUS_LOCATION_ERROR',
      500,
      requestId
    );
  }
}

// Route Information Handler
async function handleRouteInfo(
  request: Request,
  authenticatedRequest: AuthenticatedRequest
): Promise<Response> {
  const requestId = RequestUtils.generateRequestId();
  const logger = Logger.getInstance();
  const url = new URL(request.url);

  logger.log({
    level: 'info',
    message: 'Route info request',
    requestId,
    method: request.method,
    url: request.url,
    userId: authenticatedRequest.user?.id
  });

  try {
    if (request.method === 'GET') {
      const routeId = url.searchParams.get('routeId');
      const includeStops = url.searchParams.get('includeStops') === 'true';

      const queryParams = new URLSearchParams();
      if (routeId) queryParams.append('routeId', routeId);
      if (includeStops) queryParams.append('includeStops', 'true');

      const backendUrl = `${PROXY_CONFIG.target}/api/route?${queryParams}`;
      const response = await fetch(backendUrl, {
        method: 'GET',
        headers: {
          ...PROXY_CONFIG.headers,
          'Authorization': request.headers.get('authorization') || '',
          'X-API-Key': request.headers.get('x-api-key') || ''
        }
      });

      if (!response.ok) {
        throw new Error(`Backend responded with ${response.status}`);
      }

      const data = await response.json();

      // Validate and transform data
      const validatedData = Array.isArray(data)
        ? data.map(BusDataUtils.validateRouteInfo).filter(Boolean)
        : BusDataUtils.validateRouteInfo(data);

      return ResponseUtils.createSuccessResponse(
        validatedData,
        requestId,
        'Route information retrieved successfully'
      );

    } else {
      return ResponseUtils.createErrorResponse(
        'Method not allowed',
        'METHOD_NOT_ALLOWED',
        405,
        requestId
      );
    }
  } catch (error) {
    logger.log({
      level: 'error',
      message: 'Error handling route info request',
      requestId,
      method: request.method,
      url: request.url,
      error: error instanceof Error ? error.message : 'Unknown error',
      userId: authenticatedRequest.user?.id
    });

    return ResponseUtils.createErrorResponse(
      'Failed to process route information request',
      'ROUTE_INFO_ERROR',
      500,
      requestId
    );
  }
}

// Stop Information Handler
async function handleStopInfo(
  request: Request,
  authenticatedRequest: AuthenticatedRequest
): Promise<Response> {
  const requestId = RequestUtils.generateRequestId();
  const logger = Logger.getInstance();
  const url = new URL(request.url);

  logger.log({
    level: 'info',
    message: 'Stop info request',
    requestId,
    method: request.method,
    url: request.url,
    userId: authenticatedRequest.user?.id
  });

  try {
    if (request.method === 'GET') {
      const stopId = url.searchParams.get('stopId');
      const routeId = url.searchParams.get('routeId');

      const queryParams = new URLSearchParams();
      if (stopId) queryParams.append('stopId', stopId);
      if (routeId) queryParams.append('routeId', routeId);

      const backendUrl = `${PROXY_CONFIG.target}/api/stop?${queryParams}`;
      const response = await fetch(backendUrl, {
        method: 'GET',
        headers: {
          ...PROXY_CONFIG.headers,
          'Authorization': request.headers.get('authorization') || '',
          'X-API-Key': request.headers.get('x-api-key') || ''
        }
      });

      if (!response.ok) {
        throw new Error(`Backend responded with ${response.status}`);
      }

      const data = await response.json();

      // Validate and transform data
      const validatedData = Array.isArray(data)
        ? data.map(BusDataUtils.validateStopInfo).filter(Boolean)
        : BusDataUtils.validateStopInfo(data);

      return ResponseUtils.createSuccessResponse(
        validatedData,
        requestId,
        'Stop information retrieved successfully'
      );

    } else {
      return ResponseUtils.createErrorResponse(
        'Method not allowed',
        'METHOD_NOT_ALLOWED',
        405,
        requestId
      );
    }
  } catch (error) {
    logger.log({
      level: 'error',
      message: 'Error handling stop info request',
      requestId,
      method: request.method,
      url: request.url,
      error: error instanceof Error ? error.message : 'Unknown error',
      userId: authenticatedRequest.user?.id
    });

    return ResponseUtils.createErrorResponse(
      'Failed to process stop information request',
      'STOP_INFO_ERROR',
      500,
      requestId
    );
  }
}

// Real-time Data Handler
async function handleRealTimeData(
  request: Request,
  authenticatedRequest: AuthenticatedRequest
): Promise<Response> {
  const requestId = RequestUtils.generateRequestId();
  const logger = Logger.getInstance();
  const url = new URL(request.url);

  logger.log({
    level: 'info',
    message: 'Real-time data request',
    requestId,
    method: request.method,
    url: request.url,
    userId: authenticatedRequest.user?.id
  });

  try {
    if (request.method === 'GET') {
      // Stream real-time data
      const routeId = url.searchParams.get('routeId');
      const stopId = url.searchParams.get('stopId');

      // For now, return mock real-time data
      // In a real implementation, this would connect to a WebSocket or Server-Sent Events
      const mockData: RealTimeData = BusDataUtils.createRealTimeUpdate(
        'bus_location',
        {
          busId: 'MTC001',
          routeId: routeId || '1A',
          latitude: 13.0827 + Math.random() * 0.01,
          longitude: 80.2707 + Math.random() * 0.01,
          speed: 25 + Math.random() * 15,
          heading: Math.floor(Math.random() * 360)
        },
        'edge-function'
      );

      return ResponseUtils.createSuccessResponse(
        mockData,
        requestId,
        'Real-time data retrieved successfully'
      );

    } else {
      return ResponseUtils.createErrorResponse(
        'Method not allowed',
        'METHOD_NOT_ALLOWED',
        405,
        requestId
      );
    }
  } catch (error) {
    logger.log({
      level: 'error',
      message: 'Error handling real-time data request',
      requestId,
      method: request.method,
      url: request.url,
      error: error instanceof Error ? error.message : 'Unknown error',
      userId: authenticatedRequest.user?.id
    });

    return ResponseUtils.createErrorResponse(
      'Failed to process real-time data request',
      'REALTIME_ERROR',
      500,
      requestId
    );
  }
}

// Generic Proxy Handler
async function handleProxyRequest(
  request: Request,
  authenticatedRequest: AuthenticatedRequest
): Promise<Response> {
  const requestId = RequestUtils.generateRequestId();
  const logger = Logger.getInstance();
  const url = new URL(request.url);

  logger.log({
    level: 'info',
    message: 'Proxy request',
    requestId,
    method: request.method,
    url: request.url,
    userId: authenticatedRequest.user?.id
  });

  try {
    // Extract the target path from the proxy request
    const targetPath = url.pathname.replace('/api/proxy', '') || '/';
    const backendUrl = `${PROXY_CONFIG.target}${targetPath}${url.search}`;

    const response = await fetch(backendUrl, {
      method: request.method,
      headers: {
        ...PROXY_CONFIG.headers,
        'Authorization': request.headers.get('authorization') || '',
        'X-API-Key': request.headers.get('x-api-key') || '',
        'Content-Type': request.headers.get('content-type') || 'application/json'
      },
      body: request.method !== 'GET' && request.method !== 'HEAD'
        ? await request.text()
        : undefined
    });

    // Forward the response with CORS headers
    const responseHeaders = new Headers(response.headers);
    responseHeaders.set('Access-Control-Allow-Origin', '*');
    responseHeaders.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    responseHeaders.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-API-Key');

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders
    });

  } catch (error) {
    logger.log({
      level: 'error',
      message: 'Error handling proxy request',
      requestId,
      method: request.method,
      url: request.url,
      error: error instanceof Error ? error.message : 'Unknown error',
      userId: authenticatedRequest.user?.id
    });

    return ResponseUtils.createErrorResponse(
      'Failed to proxy request',
      'PROXY_ERROR',
      500,
      requestId
    );
  }
}

// Export additional utility functions for testing
export {
  handleBusLocation,
  handleRouteInfo,
  handleStopInfo,
  handleRealTimeData,
  handleProxyRequest
};