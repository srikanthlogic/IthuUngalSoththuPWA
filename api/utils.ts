import type {
  RequestContext,
  AuthenticatedRequest,
  User,
  RateLimitConfig,
  RateLimitData,
  LogEntry,
  ApiResponse,
  AuthToken,
  ApiKey,
  ErrorResponse,
  BusLocation,
  RouteInfo,
  StopInfo,
  RealTimeData
} from './types.ts';

// Rate Limiting Utilities
export class RateLimiter {
  private static instance: RateLimiter;
  private storage = new Map<string, RateLimitData>();

  static getInstance(): RateLimiter {
    if (!RateLimiter.instance) {
      RateLimiter.instance = new RateLimiter();
    }
    return RateLimiter.instance;
  }

  async checkRateLimit(
    key: string,
    config: RateLimitConfig
  ): Promise<{ allowed: boolean; remaining: number; resetTime: number }> {
    const now = Date.now();
    const existing = this.storage.get(key);

    if (!existing || now > existing.resetTime) {
      // Create new rate limit entry
      const resetTime = now + config.windowMs;
      this.storage.set(key, {
        count: 1,
        resetTime,
        lastRequest: now
      });

      return {
        allowed: true,
        remaining: config.maxRequests - 1,
        resetTime
      };
    }

    if (existing.count >= config.maxRequests) {
      return {
        allowed: false,
        remaining: 0,
        resetTime: existing.resetTime
      };
    }

    // Increment counter
    existing.count++;
    existing.lastRequest = now;
    this.storage.set(key, existing);

    return {
      allowed: true,
      remaining: config.maxRequests - existing.count,
      resetTime: existing.resetTime
    };
  }

  async cleanup(): Promise<void> {
    const now = Date.now();
    for (const [key, data] of this.storage.entries()) {
      if (now > data.resetTime) {
        this.storage.delete(key);
      }
    }
  }
}

// Logging Utilities
export class Logger {
  private static instance: Logger;
  private logs: LogEntry[] = [];
  private maxLogs = 1000;

  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  log(entry: Omit<LogEntry, 'timestamp'>): void {
    const logEntry: LogEntry = {
      ...entry,
      timestamp: Date.now()
    };

    this.logs.push(logEntry);

    // Keep only the most recent logs
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }

    // In production, you might want to send logs to a service
    console.log(JSON.stringify(logEntry));
  }

  getLogs(since?: number, level?: LogEntry['level']): LogEntry[] {
    let filtered = this.logs;

    if (since) {
      filtered = filtered.filter(log => log.timestamp >= since);
    }

    if (level) {
      filtered = filtered.filter(log => log.level === level);
    }

    return filtered;
  }

  clearLogs(): void {
    this.logs = [];
  }
}

// Authentication Utilities
export class AuthManager {
  private static instance: AuthManager;
  private apiKeys = new Map<string, ApiKey>();
  private users = new Map<string, User>();

  static getInstance(): AuthManager {
    if (!AuthManager.instance) {
      AuthManager.instance = new AuthManager();
    }
    return AuthManager.instance;
  }

  async validateApiKey(apiKey: string): Promise<ApiKey | null> {
    const key = this.apiKeys.get(apiKey);
    if (!key) return null;

    if (key.expiresAt && Date.now() > key.expiresAt) {
      this.apiKeys.delete(apiKey);
      return null;
    }

    // Update last used
    key.lastUsed = Date.now();
    this.apiKeys.set(apiKey, key);

    return key;
  }

  async validateJwtToken(token: string): Promise<User | null> {
    try {
      // In a real implementation, you would decode and verify the JWT
      // For now, we'll use a simple token validation
      const user = this.users.get(token);
      if (!user) return null;

      return user;
    } catch (error) {
      return null;
    }
  }

  async authenticateRequest(
    request: Request,
    context: RequestContext
  ): Promise<AuthenticatedRequest> {
    const authHeader = request.headers.get('authorization');
    const apiKey = request.headers.get('x-api-key');

    let user: User | null = null;
    let isAuthenticated = false;

    if (apiKey) {
      const keyData = await this.validateApiKey(apiKey);
      if (keyData) {
        user = this.users.get(keyData.userId) || null;
        isAuthenticated = true;
      }
    } else if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      user = await this.validateJwtToken(token);
      isAuthenticated = !!user;
    }

    return {
      ...context,
      user,
      apiKey,
      isAuthenticated
    };
  }

  // Admin methods for managing keys and users
  async createApiKey(userId: string, permissions: string[]): Promise<string> {
    const key = this.generateApiKey();
    const apiKey: ApiKey = {
      key,
      userId,
      permissions,
      rateLimit: {
        windowMs: 60000, // 1 minute
        maxRequests: 100
      },
      createdAt: Date.now()
    };

    this.apiKeys.set(key, apiKey);
    return key;
  }

  private generateApiKey(): string {
    return 'mtc_' + Math.random().toString(36).substring(2) + Date.now().toString(36);
  }
}

// Response Utilities
export class ResponseUtils {
  static createSuccessResponse<T>(
    data: T,
    requestId: string,
    message?: string
  ): Response {
    const response: ApiResponse<T> = {
      success: true,
      data,
      message,
      timestamp: Date.now(),
      requestId
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key'
      }
    });
  }

  static createErrorResponse(
    error: string,
    code: string,
    statusCode: number,
    requestId: string,
    details?: Record<string, any>
  ): Response {
    const errorResponse: ErrorResponse = {
      error,
      code,
      details,
      timestamp: Date.now(),
      requestId
    };

    return new Response(JSON.stringify(errorResponse), {
      status: statusCode,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key'
      }
    });
  }

  static createCorsResponse(): Response {
    return new Response(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key',
        'Access-Control-Max-Age': '86400'
      }
    });
  }
}

// Bus Data Utilities
export class BusDataUtils {
  static validateBusLocation(data: any): BusLocation | null {
    try {
      if (!data.busId || !data.routeId || typeof data.latitude !== 'number' || typeof data.longitude !== 'number') {
        return null;
      }

      return {
        busId: data.busId,
        routeId: data.routeId,
        latitude: data.latitude,
        longitude: data.longitude,
        speed: data.speed || 0,
        heading: data.heading || 0,
        lastUpdated: data.lastUpdated || Date.now(),
        status: data.status || 'active'
      };
    } catch (error) {
      return null;
    }
  }

  static validateRouteInfo(data: any): RouteInfo | null {
    try {
      if (!data.routeId || !data.routeName || !Array.isArray(data.stops)) {
        return null;
      }

      return {
        routeId: data.routeId,
        routeName: data.routeName,
        origin: data.origin || '',
        destination: data.destination || '',
        stops: data.stops,
        schedule: data.schedule || [],
        isActive: data.isActive !== false
      };
    } catch (error) {
      return null;
    }
  }

  static validateStopInfo(data: any): StopInfo | null {
    try {
      if (!data.stopId || !data.stopName || typeof data.latitude !== 'number' || typeof data.longitude !== 'number') {
        return null;
      }

      return {
        stopId: data.stopId,
        stopName: data.stopName,
        latitude: data.latitude,
        longitude: data.longitude,
        routes: data.routes || [],
        amenities: data.amenities || []
      };
    } catch (error) {
      return null;
    }
  }

  static createRealTimeUpdate(
    type: RealTimeData['type'],
    data: any,
    source: string
  ): RealTimeData {
    return {
      type,
      data,
      timestamp: Date.now(),
      source
    };
  }
}

// Request Utilities
export class RequestUtils {
  static getClientIP(request: Request): string {
    // In Vercel Edge Functions, we can get the IP from various headers
    return request.headers.get('x-forwarded-for') ||
           request.headers.get('x-real-ip') ||
           request.headers.get('cf-connecting-ip') ||
           'unknown';
  }

  static getUserAgent(request: Request): string {
    return request.headers.get('user-agent') || 'unknown';
  }

  static generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substring(2)}`;
  }

  static async parseRequestBody<T>(request: Request): Promise<T | null> {
    try {
      const contentType = request.headers.get('content-type');

      if (contentType?.includes('application/json')) {
        return await request.json();
      }

      if (contentType?.includes('application/x-www-form-urlencoded')) {
        const formData = await request.formData();
        return Object.fromEntries(formData) as T;
      }

      return null;
    } catch (error) {
      return null;
    }
  }

  static getRateLimitKey(request: Request, user?: User | null): string {
    const ip = this.getClientIP(request);
    const userId = user?.id || 'anonymous';

    // Use user ID if authenticated, otherwise use IP
    return user ? `user_${userId}` : `ip_${ip}`;
  }
}

// Environment Utilities
export class EnvUtils {
  static getRequiredEnv(key: string, env?: Record<string, string>): string {
    const value = env?.[key] || process.env?.[key];
    if (!value) {
      throw new Error(`Required environment variable ${key} is not set`);
    }
    return value;
  }

  static getEnv(key: string, defaultValue?: string, env?: Record<string, string>): string | undefined {
    return env?.[key] || process.env?.[key] || defaultValue;
  }

  static isDevelopment(env?: Record<string, string>): boolean {
    return this.getEnv('ENVIRONMENT', 'development', env) === 'development';
  }

  static isProduction(env?: Record<string, string>): boolean {
    return this.getEnv('ENVIRONMENT', 'development', env) === 'production';
  }
}