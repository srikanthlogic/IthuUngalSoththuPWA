import { describe, it, expect, beforeEach, vi } from 'vitest';
import handler, { handleBusLocation, handleRouteInfo, handleStopInfo, handleRealTimeData, handleProxyRequest } from '../proxy.ts';

// Mock the dependencies
vi.mock('../_middleware.ts', () => ({
  withMiddleware: vi.fn().mockImplementation(async (req, ctx, handler) => {
    return await handler({
      ...ctx,
      user: null,
      apiKey: null,
      isAuthenticated: false
    });
  }),
  healthCheck: vi.fn().mockResolvedValue(new Response())
}));

vi.mock('../utils.ts', () => ({
  Logger: {
    getInstance: vi.fn(() => ({
      log: vi.fn()
    }))
  },
  RequestUtils: {
    generateRequestId: vi.fn(() => 'test-request-id'),
    parseRequestBody: vi.fn().mockResolvedValue(null)
  },
  ResponseUtils: {
    createSuccessResponse: vi.fn().mockReturnValue(new Response()),
    createErrorResponse: vi.fn().mockReturnValue(new Response())
  },
  BusDataUtils: {
    validateBusLocation: vi.fn().mockReturnValue(null),
    validateRouteInfo: vi.fn().mockReturnValue(null),
    validateStopInfo: vi.fn().mockReturnValue(null),
    createRealTimeUpdate: vi.fn().mockReturnValue({
      type: 'bus_location',
      data: {},
      timestamp: Date.now(),
      source: 'test'
    })
  },
  EnvUtils: {
    getRequiredEnv: vi.fn(() => 'http://backend.example.com')
  }
}));

// Import mocked modules
import { Logger, RequestUtils, ResponseUtils, BusDataUtils, EnvUtils } from '../utils.ts';

describe('Edge Function Handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should handle health check requests', async () => {
    const request = new Request('http://example.com/api/health');
    const context = {
      request,
      env: {},
      params: {},
      waitUntil: vi.fn(),
      passThroughOnException: vi.fn()
    };

    const result = await handler(request, context);

    expect(result.status).toBe(200);
  });

  it('should handle bus location GET requests', async () => {
    const request = new Request('http://example.com/api/bus/location?routeId=1A');
    const context = {
      request,
      env: {},
      params: {},
      waitUntil: vi.fn(),
      passThroughOnException: vi.fn()
    };

    // Mock successful backend response
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue([
        {
          busId: 'MTC001',
          routeId: '1A',
          latitude: 13.0827,
          longitude: 80.2707
        }
      ])
    });

    const mockValidateBusLocation = vi.fn().mockReturnValue({
      busId: 'MTC001',
      routeId: '1A',
      latitude: 13.0827,
      longitude: 80.2707
    });

    vi.mocked(BusDataUtils.validateBusLocation).mockImplementation(mockValidateBusLocation);

    const result = await handler(request, context);

    expect(global.fetch).toHaveBeenCalledWith(
      'http://backend.example.com/api/bus/location?routeId=1A',
      expect.objectContaining({
        method: 'GET',
        headers: expect.any(Object)
      })
    );
    expect(result.status).toBe(200);
  });

  it('should handle bus location POST requests', async () => {
    const request = new Request('http://example.com/api/bus/location', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        busId: 'MTC001',
        routeId: '1A',
        latitude: 13.0827,
        longitude: 80.2707
      })
    });

    const context = {
      request,
      env: {},
      params: {},
      waitUntil: vi.fn(),
      passThroughOnException: vi.fn()
    };

    // Mock successful backend response
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ success: true })
    });

    const mockParseRequestBody = vi.fn().mockResolvedValue({
      busId: 'MTC001',
      routeId: '1A',
      latitude: 13.0827,
      longitude: 80.2707
    });

    const mockValidateBusLocation = vi.fn().mockReturnValue({
      busId: 'MTC001',
      routeId: '1A',
      latitude: 13.0827,
      longitude: 80.2707
    });

    vi.mocked(RequestUtils.parseRequestBody).mockImplementation(mockParseRequestBody);
    vi.mocked(BusDataUtils.validateBusLocation).mockImplementation(mockValidateBusLocation);

    const result = await handler(request, context);

    expect(mockParseRequestBody).toHaveBeenCalledWith(request);
    expect(mockValidateBusLocation).toHaveBeenCalled();
    expect(result.status).toBe(200);
  });

  it('should handle route information requests', async () => {
    const request = new Request('http://example.com/api/route?routeId=1A');
    const context = {
      request,
      env: {},
      params: {},
      waitUntil: vi.fn(),
      passThroughOnException: vi.fn()
    };

    // Mock successful backend response
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({
        routeId: '1A',
        routeName: 'Route 1A',
        stops: []
      })
    });

    const mockValidateRouteInfo = vi.fn().mockReturnValue({
      routeId: '1A',
      routeName: 'Route 1A',
      stops: []
    });

    vi.mocked(BusDataUtils.validateRouteInfo).mockImplementation(mockValidateRouteInfo);

    const result = await handler(request, context);

    expect(global.fetch).toHaveBeenCalledWith(
      'http://backend.example.com/api/route?routeId=1A',
      expect.objectContaining({
        method: 'GET',
        headers: expect.any(Object)
      })
    );
    expect(result.status).toBe(200);
  });

  it('should handle stop information requests', async () => {
    const request = new Request('http://example.com/api/stop?stopId=STOP001');
    const context = {
      request,
      env: {},
      params: {},
      waitUntil: vi.fn(),
      passThroughOnException: vi.fn()
    };

    // Mock successful backend response
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({
        stopId: 'STOP001',
        stopName: 'Central Station',
        latitude: 13.0827,
        longitude: 80.2707
      })
    });

    const mockValidateStopInfo = vi.fn().mockReturnValue({
      stopId: 'STOP001',
      stopName: 'Central Station',
      latitude: 13.0827,
      longitude: 80.2707
    });

    vi.mocked(BusDataUtils.validateStopInfo).mockImplementation(mockValidateStopInfo);

    const result = await handler(request, context);

    expect(global.fetch).toHaveBeenCalledWith(
      'http://backend.example.com/api/stop?stopId=STOP001',
      expect.objectContaining({
        method: 'GET',
        headers: expect.any(Object)
      })
    );
    expect(result.status).toBe(200);
  });

  it('should handle real-time data requests', async () => {
    const request = new Request('http://example.com/api/realtime?routeId=1A');
    const context = {
      request,
      env: {},
      params: {},
      waitUntil: vi.fn(),
      passThroughOnException: vi.fn()
    };

    const result = await handler(request, context);

    expect(result.status).toBe(200);
  });

  it('should handle proxy requests', async () => {
    const request = new Request('http://example.com/api/proxy/backend/data');
    const context = {
      request,
      env: {},
      params: {},
      waitUntil: vi.fn(),
      passThroughOnException: vi.fn()
    };

    // Mock successful backend response
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      headers: new Headers({ 'content-type': 'application/json' }),
      body: JSON.stringify({ data: 'test' })
    });

    const result = await handler(request, context);

    expect(global.fetch).toHaveBeenCalledWith(
      'http://backend.example.com/backend/data',
      expect.objectContaining({
        method: 'GET',
        headers: expect.any(Object)
      })
    );
    expect(result.status).toBe(200);
  });

  it('should return 404 for unknown endpoints', async () => {
    const request = new Request('http://example.com/api/unknown');
    const context = {
      request,
      env: {},
      params: {},
      waitUntil: vi.fn(),
      passThroughOnException: vi.fn()
    };

    const result = await handler(request, context);

    expect(result.status).toBe(404);
  });

  it('should handle backend errors gracefully', async () => {
    const request = new Request('http://example.com/api/bus/location');
    const context = {
      request,
      env: {},
      params: {},
      waitUntil: vi.fn(),
      passThroughOnException: vi.fn()
    };

    // Mock failed backend response
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500
    });

    const result = await handler(request, context);

    expect(result.status).toBe(500);
  });
});