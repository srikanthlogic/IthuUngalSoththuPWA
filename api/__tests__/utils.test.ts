import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  RateLimiter,
  Logger,
  AuthManager,
  ResponseUtils,
  BusDataUtils,
  RequestUtils,
  EnvUtils
} from '../utils.ts';

// Mock environment variables
const originalEnv = process.env;

describe('RateLimiter', () => {
  let rateLimiter: RateLimiter;

  beforeEach(() => {
    rateLimiter = RateLimiter.getInstance();
    // Clear the storage for each test
    (rateLimiter as any).storage = new Map();
  });

  it('should allow requests within rate limit', async () => {
    const config = { windowMs: 60000, maxRequests: 5 };
    const key = 'test-key';

    const result1 = await rateLimiter.checkRateLimit(key, config);
    expect(result1.allowed).toBe(true);
    expect(result1.remaining).toBe(4);

    const result2 = await rateLimiter.checkRateLimit(key, config);
    expect(result2.allowed).toBe(true);
    expect(result2.remaining).toBe(3);
  });

  it('should block requests exceeding rate limit', async () => {
    const config = { windowMs: 60000, maxRequests: 2 };
    const key = 'test-key';

    await rateLimiter.checkRateLimit(key, config); // 1st request
    await rateLimiter.checkRateLimit(key, config); // 2nd request

    const result = await rateLimiter.checkRateLimit(key, config); // 3rd request
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it('should reset rate limit after window expires', async () => {
    const config = { windowMs: 100, maxRequests: 1 };
    const key = 'test-key';

    await rateLimiter.checkRateLimit(key, config);

    // Wait for window to expire
    await new Promise(resolve => setTimeout(resolve, 150));

    const result = await rateLimiter.checkRateLimit(key, config);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(0);
  });
});

describe('Logger', () => {
  let logger: Logger;

  beforeEach(() => {
    logger = Logger.getInstance();
    logger.clearLogs();
    // Mock console.log to avoid noise in tests
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should log messages with timestamp', () => {
    const entry = {
      level: 'info' as const,
      message: 'Test message',
      requestId: 'test-123',
      method: 'GET',
      url: '/test'
    };

    logger.log(entry);

    const logs = logger.getLogs();
    expect(logs).toHaveLength(1);
    expect(logs[0]).toMatchObject({
      ...entry,
      timestamp: expect.any(Number)
    });
  });

  it('should filter logs by level', () => {
    logger.log({ level: 'info', message: 'Info message', requestId: '1', method: 'GET', url: '/test' });
    logger.log({ level: 'error', message: 'Error message', requestId: '2', method: 'POST', url: '/test' });
    logger.log({ level: 'warn', message: 'Warning message', requestId: '3', method: 'GET', url: '/test' });

    const errorLogs = logger.getLogs(undefined, 'error');
    expect(errorLogs).toHaveLength(1);
    expect(errorLogs[0].level).toBe('error');
  });

  it('should filter logs by timestamp', () => {
    const now = Date.now();
    logger.log({ level: 'info', message: 'Old message', requestId: '1', method: 'GET', url: '/test' });
    logger.log({ level: 'info', message: 'New message', requestId: '2', method: 'GET', url: '/test' });

    const recentLogs = logger.getLogs(now - 1000);
    expect(recentLogs).toHaveLength(2);
  });

  it('should limit log entries', () => {
    const originalMaxLogs = (logger as any).maxLogs;
    (logger as any).maxLogs = 2;

    logger.log({ level: 'info', message: 'Message 1', requestId: '1', method: 'GET', url: '/test' });
    logger.log({ level: 'info', message: 'Message 2', requestId: '2', method: 'GET', url: '/test' });
    logger.log({ level: 'info', message: 'Message 3', requestId: '3', method: 'GET', url: '/test' });

    expect(logger.getLogs()).toHaveLength(2);
    (logger as any).maxLogs = originalMaxLogs;
  });
});

describe('AuthManager', () => {
  let authManager: AuthManager;

  beforeEach(() => {
    authManager = AuthManager.getInstance();
    // Clear storage for each test
    (authManager as any).apiKeys = new Map();
    (authManager as any).users = new Map();
  });

  it('should validate valid API key', async () => {
    const userId = 'user123';
    const permissions = ['read:bus', 'read:route'];
    const apiKey = await authManager.createApiKey(userId, permissions);

    const result = await authManager.validateApiKey(apiKey);
    expect(result).toBeTruthy();
    expect(result?.userId).toBe(userId);
    expect(result?.permissions).toEqual(permissions);
  });

  it('should reject invalid API key', async () => {
    const result = await authManager.validateApiKey('invalid-key');
    expect(result).toBeNull();
  });

  it('should reject expired API key', async () => {
    const userId = 'user123';
    const permissions = ['read:bus'];

    // Create API key with immediate expiration
    const key = 'expired-key';
    const apiKeyData = {
      key,
      userId,
      permissions,
      rateLimit: { windowMs: 60000, maxRequests: 100 },
      createdAt: Date.now(),
      expiresAt: Date.now() - 1000 // Already expired
    };

    (authManager as any).apiKeys.set(key, apiKeyData);

    const result = await authManager.validateApiKey(key);
    expect(result).toBeNull();
  });

  it('should validate JWT token', async () => {
    const user = { id: 'user123', email: 'test@example.com', role: 'user' };
    const token = 'jwt-token-123';

    (authManager as any).users.set(token, user);

    const result = await authManager.validateJwtToken(token);
    expect(result).toEqual(user);
  });

  it('should reject invalid JWT token', async () => {
    const result = await authManager.validateJwtToken('invalid-token');
    expect(result).toBeNull();
  });
});

describe('ResponseUtils', () => {
  const requestId = 'test-request-123';

  it('should create success response', () => {
    const data = { message: 'Success' };
    const response = ResponseUtils.createSuccessResponse(data, requestId, 'Operation successful');

    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe('application/json');
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
  });

  it('should create error response', () => {
    const response = ResponseUtils.createErrorResponse(
      'Not found',
      'NOT_FOUND',
      404,
      requestId,
      { details: 'Resource not found' }
    );

    expect(response.status).toBe(404);
    expect(response.headers.get('Content-Type')).toBe('application/json');
  });

  it('should create CORS response', () => {
    const response = ResponseUtils.createCorsResponse();

    expect(response.status).toBe(200);
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
    expect(response.headers.get('Access-Control-Allow-Methods')).toContain('GET');
    expect(response.headers.get('Access-Control-Allow-Methods')).toContain('POST');
  });
});

describe('BusDataUtils', () => {
  it('should validate valid bus location', () => {
    const validData = {
      busId: 'MTC001',
      routeId: '1A',
      latitude: 13.0827,
      longitude: 80.2707,
      speed: 25,
      heading: 90,
      lastUpdated: Date.now()
    };

    const result = BusDataUtils.validateBusLocation(validData);
    expect(result).toBeTruthy();
    expect(result?.busId).toBe('MTC001');
    expect(result?.routeId).toBe('1A');
  });

  it('should reject invalid bus location', () => {
    const invalidData = {
      busId: 'MTC001',
      // Missing required fields
    };

    const result = BusDataUtils.validateBusLocation(invalidData);
    expect(result).toBeNull();
  });

  it('should validate valid route info', () => {
    const validData = {
      routeId: '1A',
      routeName: 'Route 1A',
      origin: 'Chennai Central',
      destination: 'Airport',
      stops: ['stop1', 'stop2'],
      schedule: [],
      isActive: true
    };

    const result = BusDataUtils.validateRouteInfo(validData);
    expect(result).toBeTruthy();
    expect(result?.routeId).toBe('1A');
    expect(result?.routeName).toBe('Route 1A');
  });

  it('should reject invalid route info', () => {
    const invalidData = {
      routeId: '1A',
      // Missing required fields
    };

    const result = BusDataUtils.validateRouteInfo(invalidData);
    expect(result).toBeNull();
  });

  it('should validate valid stop info', () => {
    const validData = {
      stopId: 'STOP001',
      stopName: 'Central Station',
      latitude: 13.0827,
      longitude: 80.2707,
      routes: ['1A', '2B'],
      amenities: ['shelter', 'bench']
    };

    const result = BusDataUtils.validateStopInfo(validData);
    expect(result).toBeTruthy();
    expect(result?.stopId).toBe('STOP001');
    expect(result?.stopName).toBe('Central Station');
  });

  it('should reject invalid stop info', () => {
    const invalidData = {
      stopId: 'STOP001',
      // Missing required fields
    };

    const result = BusDataUtils.validateStopInfo(invalidData);
    expect(result).toBeNull();
  });

  it('should create real-time update', () => {
    const data = { busId: 'MTC001', location: 'Chennai' };
    const result = BusDataUtils.createRealTimeUpdate('bus_location', data, 'test-source');

    expect(result.type).toBe('bus_location');
    expect(result.data).toEqual(data);
    expect(result.source).toBe('test-source');
    expect(result.timestamp).toBeGreaterThan(0);
  });
});

describe('RequestUtils', () => {
  it('should get client IP from various headers', () => {
    const request = new Request('http://example.com', {
      headers: {
        'x-forwarded-for': '192.168.1.1',
        'x-real-ip': '10.0.0.1',
        'cf-connecting-ip': '203.0.113.1'
      }
    });

    const ip = RequestUtils.getClientIP(request);
    expect(ip).toBe('192.168.1.1');
  });

  it('should return unknown for missing IP headers', () => {
    const request = new Request('http://example.com');

    const ip = RequestUtils.getClientIP(request);
    expect(ip).toBe('unknown');
  });

  it('should get user agent', () => {
    const request = new Request('http://example.com', {
      headers: {
        'user-agent': 'Test-Agent/1.0'
      }
    });

    const userAgent = RequestUtils.getUserAgent(request);
    expect(userAgent).toBe('Test-Agent/1.0');
  });

  it('should return unknown for missing user agent', () => {
    const request = new Request('http://example.com');

    const userAgent = RequestUtils.getUserAgent(request);
    expect(userAgent).toBe('unknown');
  });

  it('should generate request ID', () => {
    const requestId = RequestUtils.generateRequestId();
    expect(requestId).toMatch(/^req_\d+_[a-z0-9]+$/);
  });

  it('should parse JSON request body', async () => {
    const data = { message: 'test' };
    const request = new Request('http://example.com', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(data)
    });

    const result = await RequestUtils.parseRequestBody<{ message: string }>(request);
    expect(result).toEqual(data);
  });

  it('should parse form data', async () => {
    const formData = new FormData();
    formData.append('name', 'John');
    formData.append('age', '30');

    const request = new Request('http://example.com', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: 'name=John&age=30'
    });

    const result = await RequestUtils.parseRequestBody<{ name: string; age: string }>(request);
    expect(result).toEqual({ name: 'John', age: '30' });
  });

  it('should return null for invalid content type', async () => {
    const request = new Request('http://example.com', {
      method: 'POST',
      headers: { 'content-type': 'text/plain' },
      body: 'plain text'
    });

    const result = await RequestUtils.parseRequestBody(request);
    expect(result).toBeNull();
  });
});

describe('EnvUtils', () => {
  beforeEach(() => {
    // Reset environment
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should get required environment variable', () => {
    process.env.TEST_VAR = 'test-value';
    const value = EnvUtils.getRequiredEnv('TEST_VAR');
    expect(value).toBe('test-value');
  });

  it('should throw error for missing required environment variable', () => {
    expect(() => {
      EnvUtils.getRequiredEnv('MISSING_VAR');
    }).toThrow('Required environment variable MISSING_VAR is not set');
  });

  it('should get optional environment variable', () => {
    process.env.OPTIONAL_VAR = 'value';
    const value = EnvUtils.getEnv('OPTIONAL_VAR');
    expect(value).toBe('value');
  });

  it('should return default value for missing optional environment variable', () => {
    const value = EnvUtils.getEnv('MISSING_VAR', 'default');
    expect(value).toBe('default');
  });

  it('should detect development environment', () => {
    process.env.ENVIRONMENT = 'development';
    expect(EnvUtils.isDevelopment()).toBe(true);
    expect(EnvUtils.isProduction()).toBe(false);
  });

  it('should detect production environment', () => {
    process.env.ENVIRONMENT = 'production';
    expect(EnvUtils.isDevelopment()).toBe(false);
    expect(EnvUtils.isProduction()).toBe(true);
  });
});