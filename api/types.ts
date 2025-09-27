// TypeScript type definitions for the Chennai MTC Bus Tracker Edge Function

export interface RequestContext {
  request: Request;
  env: {
    [key: string]: string;
  };
  params: Record<string, string>;
  nextUrl?: URL;
}

export interface AuthenticatedRequest extends RequestContext {
  user: User | null;
  apiKey: string | null;
  isAuthenticated: boolean;
}

export interface User {
  id: string;
  email?: string;
  role: 'user' | 'admin';
  permissions: string[];
  lastActive: number;
  createdAt: number;
}

export interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests per window
  keyGenerator?: (req: Request) => string; // Function to generate rate limit key
  skipSuccessfulRequests?: boolean; // Skip rate limiting for successful requests
  skipFailedRequests?: boolean; // Skip rate limiting for failed requests
}

export interface RateLimitData {
  count: number;
  resetTime: number;
  lastRequest: number;
}

export interface LogEntry {
  timestamp: number;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  requestId: string;
  method: string;
  url: string;
  userAgent?: string;
  ip?: string;
  userId?: string;
  duration?: number;
  statusCode?: number;
  error?: string;
  metadata?: Record<string, any>;
}

export interface ProxyConfig {
  target: string;
  changeOrigin?: boolean;
  rewriteRules?: Array<{
    from: string;
    to: string;
  }>;
  timeout?: number;
  retries?: number;
  headers?: Record<string, string>;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp: number;
  requestId: string;
}

export interface BusLocation {
  busId: string;
  routeId: string;
  latitude: number;
  longitude: number;
  speed: number;
  heading: number;
  lastUpdated: number;
  status: 'active' | 'inactive' | 'maintenance';
}

export interface RouteInfo {
  routeId: string;
  routeName: string;
  origin: string;
  destination: string;
  stops: StopInfo[];
  schedule: ScheduleInfo[];
  isActive: boolean;
}

export interface StopInfo {
  stopId: string;
  stopName: string;
  latitude: number;
  longitude: number;
  routes: string[];
  amenities: string[];
}

export interface ScheduleInfo {
  tripId: string;
  departureTime: string;
  arrivalTime: string;
  frequency: number; // minutes
  isOperational: boolean;
}

export interface RealTimeData {
  type: 'bus_location' | 'route_update' | 'stop_update' | 'alert';
  data: any;
  timestamp: number;
  source: string;
}

export interface AuthToken {
  token: string;
  expiresAt: number;
  user: User;
  permissions: string[];
}

export interface ApiKey {
  key: string;
  userId: string;
  permissions: string[];
  rateLimit: RateLimitConfig;
  expiresAt?: number;
  createdAt: number;
  lastUsed?: number;
}

export interface ErrorResponse {
  error: string;
  code: string;
  details?: Record<string, any>;
  timestamp: number;
  requestId: string;
}

export interface MiddlewareConfig {
  cors: {
    origin: string | string[];
    methods: string[];
    headers: string[];
    credentials: boolean;
  };
  auth: {
    required: boolean;
    strategies: ('apikey' | 'jwt')[];
    bypassPaths: string[];
  };
  rateLimit: RateLimitConfig;
  logging: {
    level: 'info' | 'warn' | 'error' | 'debug';
    format: 'json' | 'text';
    includeRequestBody: boolean;
    includeResponseBody: boolean;
  };
}

export interface EdgeFunctionConfig {
  name: string;
  version: string;
  environment: 'development' | 'staging' | 'production';
  middleware: MiddlewareConfig;
  proxy: ProxyConfig;
  features: {
    realTimeUpdates: boolean;
    caching: boolean;
    compression: boolean;
  };
}