import type {
  MiddlewareConfig,
  RequestContext,
  AuthenticatedRequest,
  LogEntry
} from './types.ts';
import {
  RateLimiter,
  Logger,
  AuthManager,
  RequestUtils,
  ResponseUtils,
  EnvUtils
} from './utils.ts';

// Default middleware configuration
const DEFAULT_CONFIG: MiddlewareConfig = {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    headers: ['Content-Type', 'Authorization', 'X-API-Key'],
    credentials: false
  },
  auth: {
    required: false,
    strategies: ['apikey', 'jwt'],
    bypassPaths: ['/api/health', '/api/public']
  },
  rateLimit: {
    windowMs: 60000, // 1 minute
    maxRequests: 100
  },
  logging: {
    level: 'info',
    format: 'json',
    includeRequestBody: false,
    includeResponseBody: false
  }
};

export async function middleware(
  request: Request,
  context: RequestContext,
  config: Partial<MiddlewareConfig> = {}
): Promise<{
  authenticatedRequest: AuthenticatedRequest;
  shouldContinue: boolean;
  response?: Response;
}> {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  const requestId = RequestUtils.generateRequestId();
  const startTime = Date.now();

  // Initialize utilities
  const rateLimiter = RateLimiter.getInstance();
  const logger = Logger.getInstance();
  const authManager = AuthManager.getInstance();

  // Handle CORS preflight requests
  if (request.method === 'OPTIONS') {
    logger.log({
      level: 'info',
      message: 'CORS preflight request',
      requestId,
      method: request.method,
      url: request.url,
      userAgent: RequestUtils.getUserAgent(request),
      ip: RequestUtils.getClientIP(request)
    });

    return {
      authenticatedRequest: {
        ...context,
        user: null,
        apiKey: null,
        isAuthenticated: false
      } as AuthenticatedRequest,
      shouldContinue: false,
      response: ResponseUtils.createCorsResponse()
    };
  }

  // Check if path should bypass middleware
  const url = new URL(request.url);
  const shouldBypass = finalConfig.auth.bypassPaths.some(path =>
    url.pathname.startsWith(path)
  );

  if (shouldBypass) {
    logger.log({
      level: 'info',
      message: 'Bypassing middleware for path',
      requestId,
      method: request.method,
      url: request.url,
      userAgent: RequestUtils.getUserAgent(request),
      ip: RequestUtils.getClientIP(request)
    });

    return {
      authenticatedRequest: {
        ...context,
        user: null,
        apiKey: null,
        isAuthenticated: false
      } as AuthenticatedRequest,
      shouldContinue: true
    };
  }

  // Rate limiting
  try {
    const rateLimitKey = RequestUtils.getRateLimitKey(request);
    const rateLimitResult = await rateLimiter.checkRateLimit(rateLimitKey, finalConfig.rateLimit);

    if (!rateLimitResult.allowed) {
      logger.log({
        level: 'warn',
        message: 'Rate limit exceeded',
        requestId,
        method: request.method,
        url: request.url,
        userAgent: RequestUtils.getUserAgent(request),
        ip: RequestUtils.getClientIP(request),
        metadata: {
          resetTime: rateLimitResult.resetTime,
          key: rateLimitKey
        }
      });

      return {
        authenticatedRequest: {
          ...context,
          user: null,
          apiKey: null,
          isAuthenticated: false
        } as AuthenticatedRequest,
        shouldContinue: false,
        response: ResponseUtils.createErrorResponse(
          'Too many requests',
          'RATE_LIMIT_EXCEEDED',
          429,
          requestId,
          {
            retryAfter: Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000)
          }
        )
      };
    }
  } catch (error) {
    logger.log({
      level: 'error',
      message: 'Rate limiting error',
      requestId,
      method: request.method,
      url: request.url,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }

  // Authentication
  let authenticatedRequest: AuthenticatedRequest;
  try {
    authenticatedRequest = await authManager.authenticateRequest(request, context);

    if (finalConfig.auth.required && !authenticatedRequest.isAuthenticated) {
      logger.log({
        level: 'warn',
        message: 'Authentication required but not provided',
        requestId,
        method: request.method,
        url: request.url,
        userAgent: RequestUtils.getUserAgent(request),
        ip: RequestUtils.getClientIP(request)
      });

      return {
        authenticatedRequest,
        shouldContinue: false,
        response: ResponseUtils.createErrorResponse(
          'Authentication required',
          'AUTH_REQUIRED',
          401,
          requestId
        )
      };
    }
  } catch (error) {
    logger.log({
      level: 'error',
      message: 'Authentication error',
      requestId,
      method: request.method,
      url: request.url,
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    return {
      authenticatedRequest: {
        ...context,
        user: null,
        apiKey: null,
        isAuthenticated: false
      } as AuthenticatedRequest,
      shouldContinue: false,
      response: ResponseUtils.createErrorResponse(
        'Authentication error',
        'AUTH_ERROR',
        500,
        requestId
      )
    };
  }

  // Request logging
  logger.log({
    level: 'info',
    message: 'Request started',
    requestId,
    method: request.method,
    url: request.url,
    userAgent: RequestUtils.getUserAgent(request),
    ip: RequestUtils.getClientIP(request),
    userId: authenticatedRequest.user?.id,
    metadata: {
      isAuthenticated: authenticatedRequest.isAuthenticated,
      userRole: authenticatedRequest.user?.role
    }
  });

  // Store request context for cleanup
  const cleanup = () => {
    const duration = Date.now() - startTime;
    logger.log({
      level: 'info',
      message: 'Request completed',
      requestId,
      method: request.method,
      url: request.url,
      duration,
      userId: authenticatedRequest.user?.id
    });
  };

  // Add cleanup to authenticated request for use in handlers
  (authenticatedRequest as any).cleanup = cleanup;

  return {
    authenticatedRequest,
    shouldContinue: true
  };
}

// Middleware wrapper for Vercel Edge Functions
export async function withMiddleware(
  request: Request,
  context: RequestContext,
  handler: (authenticatedRequest: AuthenticatedRequest) => Promise<Response>,
  config: Partial<MiddlewareConfig> = {}
): Promise<Response> {
  const middlewareResult = await middleware(request, context, config);

  if (!middlewareResult.shouldContinue) {
    return middlewareResult.response!;
  }

  try {
    const response = await handler(middlewareResult.authenticatedRequest);

    // Call cleanup if available
    if ((middlewareResult.authenticatedRequest as any).cleanup) {
      (middlewareResult.authenticatedRequest as any).cleanup();
    }

    return response;
  } catch (error) {
    const logger = Logger.getInstance();
    const requestId = RequestUtils.generateRequestId();

    logger.log({
      level: 'error',
      message: 'Unhandled error in handler',
      requestId,
      method: request.method,
      url: request.url,
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    return ResponseUtils.createErrorResponse(
      'Internal server error',
      'INTERNAL_ERROR',
      500,
      requestId
    );
  }
}

// Health check endpoint
export async function healthCheck(): Promise<Response> {
  const logger = Logger.getInstance();
  const requestId = RequestUtils.generateRequestId();

  logger.log({
    level: 'info',
    message: 'Health check requested',
    requestId,
    method: 'GET',
    url: '/api/health'
  });

  return ResponseUtils.createSuccessResponse(
    {
      status: 'healthy',
      timestamp: Date.now(),
      environment: EnvUtils.getEnv('ENVIRONMENT', 'development'),
      version: '1.0.0'
    },
    requestId,
    'Service is healthy'
  );
}