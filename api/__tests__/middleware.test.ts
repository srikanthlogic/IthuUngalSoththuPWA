import { describe, it, expect, beforeEach, vi } from 'vitest';
import { middleware, withMiddleware, healthCheck } from '../_middleware.ts';
import { Logger, RequestUtils, ResponseUtils } from '../utils.ts';

// Mock the utility classes
vi.mock('../utils.ts', () => ({
  RateLimiter: {
    getInstance: vi.fn(() => ({
      checkRateLimit: vi.fn().mockResolvedValue({
        allowed: true,
        remaining: 99,
        resetTime: Date.now() + 60000
      })
    }))
  },
  Logger: {
    getInstance: vi.fn(() => ({
      log: vi.fn()
    }))
  },
  AuthManager: {
    getInstance: vi.fn(() => ({
      authenticateRequest: vi.fn().mockResolvedValue({
        request: {} as any,
        env: {},
        params: {},
        user: null,
        apiKey: null,
        isAuthenticated: false
      })
    }))
  },
  RequestUtils: {
    generateRequestId: vi.fn(() => 'test-request-id'),
    getClientIP: vi.fn(() => '127.0.0.1'),
    getUserAgent: vi.fn(() => 'test-agent'),
    getRateLimitKey: vi.fn(() => 'test-key')
  },
  ResponseUtils: {
    createCorsResponse: vi.fn(() => new Response()),
    createErrorResponse: vi.fn(() => new Response()),
    createSuccessResponse: vi.fn(() => new Response())
  },
  EnvUtils: {
    getEnv: vi.fn(() => 'development')
  }
}));

describe('middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should handle CORS preflight requests', async () => {
    const request = new Request('http://example.com', {
      method: 'OPTIONS'
    });

    const context = {
      request,
      env: {},
      params: {},
      waitUntil: vi.fn(),
      passThroughOnException: vi.fn()
    };

    const result = await middleware(request, context);

    expect(result.shouldContinue).toBe(false);
    expect(result.response).toBeDefined();
    expect(ResponseUtils.createCorsResponse).toHaveBeenCalled();
  });

  it('should bypass middleware for configured paths', async () => {
    const request = new Request('http://example.com/api/health');
    const context = {
      request,
      env: {},
      params: {},
      waitUntil: vi.fn(),
      passThroughOnException: vi.fn()
    };

    const config = {
      auth: {
        required: false,
        strategies: ['apikey', 'jwt'] as ('apikey' | 'jwt')[],
        bypassPaths: ['/api/health']
      }
    };

    const result = await middleware(request, context, config);

    expect(result.shouldContinue).toBe(true);
    expect(result.authenticatedRequest.isAuthenticated).toBe(false);
  });

  it('should handle rate limiting', async () => {
    const request = new Request('http://example.com/api/test');
    const context = {
      request,
      env: {},
      params: {},
      waitUntil: vi.fn(),
      passThroughOnException: vi.fn()
    };

    // Mock rate limiter to return rate limit exceeded
    const mockRateLimiter = {
      checkRateLimit: vi.fn().mockResolvedValue({
        allowed: false,
        remaining: 0,
        resetTime: Date.now() + 60000
      })
    };

    vi.mocked((require('../utils.ts') as any).RateLimiter.getInstance).mockReturnValue(mockRateLimiter as any);
    vi.mocked((require('../utils.ts') as any).RequestUtils.getRateLimitKey).mockReturnValue('test-key');

    const result = await middleware(request, context, {
      rateLimit: {
        windowMs: 60000,
        maxRequests: 100
      }
    });

    expect(result.shouldContinue).toBe(false);
    expect(result.response).toBeDefined();
    expect((require('../utils.ts') as any).ResponseUtils.createErrorResponse).toHaveBeenCalledWith(
      'Too many requests',
      'RATE_LIMIT_EXCEEDED',
      429,
      'test-request-id',
      expect.any(Object)
    );
  });

  it('should handle authentication', async () => {
    const request = new Request('http://example.com/api/test');
    const context = {
      request,
      env: {},
      params: {},
      waitUntil: vi.fn(),
      passThroughOnException: vi.fn()
    };

    // Mock auth manager to return authenticated user
    const mockAuthManager = {
      authenticateRequest: vi.fn().mockResolvedValue({
        ...context,
        user: { id: 'user123', email: 'test@example.com' },
        apiKey: 'test-key',
        isAuthenticated: true
      })
    };

    vi.mocked((require('../utils.ts') as any).AuthManager.getInstance).mockReturnValue(mockAuthManager as any);

    const result = await middleware(request, context, {
      auth: {
        required: true,
        strategies: ['apikey', 'jwt'],
        bypassPaths: []
      }
    });

    expect(result.shouldContinue).toBe(true);
    expect(result.authenticatedRequest.isAuthenticated).toBe(true);
  });

  it('should reject unauthenticated requests when auth is required', async () => {
    const request = new Request('http://example.com/api/test');
    const context = {
      request,
      env: {},
      params: {},
      waitUntil: vi.fn(),
      passThroughOnException: vi.fn()
    };

    // Mock auth manager to return unauthenticated user
    const mockAuthManager = {
      authenticateRequest: vi.fn().mockResolvedValue({
        ...context,
        user: null,
        apiKey: null,
        isAuthenticated: false
      })
    };

    vi.mocked(require('../utils.ts').AuthManager.getInstance).mockReturnValue(mockAuthManager as any);

    const result = await middleware(request, context, {
      auth: {
        required: true,
        strategies: ['apikey', 'jwt'],
        bypassPaths: []
      }
    });

    expect(result.shouldContinue).toBe(false);
    expect(result.response).toBeDefined();
    expect(require('../utils.ts').ResponseUtils.createErrorResponse).toHaveBeenCalledWith(
      'Authentication required',
      'AUTH_REQUIRED',
      401,
      'test-request-id'
    );
  });
});

describe('withMiddleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should execute handler when middleware passes', async () => {
    const request = new Request('http://example.com/api/test');
    const context = {
      request,
      env: {},
      params: {},
      waitUntil: vi.fn(),
      passThroughOnException: vi.fn()
    };

    const mockHandler = vi.fn().mockResolvedValue(new Response('success'));

    const result = await withMiddleware(request, context, mockHandler);

    expect(mockHandler).toHaveBeenCalled();
    expect(result.status).toBe(200);
  });

  it('should return middleware response when middleware blocks', async () => {
    const request = new Request('http://example.com/api/test', {
      method: 'OPTIONS'
    });
    const context = {
      request,
      env: {},
      params: {},
      waitUntil: vi.fn(),
      passThroughOnException: vi.fn()
    };

    const mockHandler = vi.fn();

    const result = await withMiddleware(request, context, mockHandler);

    expect(mockHandler).not.toHaveBeenCalled();
    expect(result).toBeDefined();
  });

  it('should handle handler errors', async () => {
    const request = new Request('http://example.com/api/test');
    const context = {
      request,
      env: {},
      params: {},
      waitUntil: vi.fn(),
      passThroughOnException: vi.fn()
    };

    const mockHandler = vi.fn().mockRejectedValue(new Error('Handler error'));

    const result = await withMiddleware(request, context, mockHandler);

    expect(result.status).toBe(500);
    expect(ResponseUtils.createErrorResponse).toHaveBeenCalledWith(
      'Internal server error',
      'INTERNAL_ERROR',
      500,
      expect.stringMatching(/^req_/)
    );
  });
});

describe('healthCheck', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return health check response', async () => {
    const result = await healthCheck();

    expect(result.status).toBe(200);
    expect(ResponseUtils.createSuccessResponse).toHaveBeenCalledWith(
      {
        status: 'healthy',
        timestamp: expect.any(Number),
        environment: 'development',
        version: '1.0.0'
      },
      'test-request-id',
      'Service is healthy'
    );
  });
});