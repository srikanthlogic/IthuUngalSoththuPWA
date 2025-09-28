// api/proxy.ts
import type { BusData } from '../types.js';

export const config = {
  runtime: 'edge',
};

export default async function handler(request: Request): Promise<Response> {
  const requestId = crypto.randomUUID();
  console.log(`Proxy request started: ${requestId}`);

  // HTTPS Enforcement (skip for local development)
  if (request.url.startsWith('http://') && !request.url.includes('localhost')) {
    const httpsUrl = request.url.replace('http://', 'https://');
    return Response.redirect(httpsUrl, 301);
  }

  // Simple In-Memory Rate Limiting (per instance; use external store for production)
  const clientIp = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  const now = Date.now();
  const minuteAgo = now - 60000;
  if (!globalThis.rateLimitMap) {
    globalThis.rateLimitMap = new Map<string, { count: number; resetTime: number }>();
  }
  const ipData = globalThis.rateLimitMap.get(clientIp) || { count: 0, resetTime: now };
  if (now > ipData.resetTime) {
    ipData.count = 0;
    ipData.resetTime = now + 60000;
  }
  if (ipData.count >= 5) {
    console.warn(`Rate limit exceeded for IP ${clientIp} (${requestId})`);
    return new Response(JSON.stringify({ error: 'Rate limit exceeded' }), {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
      },
    });
  }
  ipData.count++;
  globalThis.rateLimitMap.set(clientIp, ipData);

  // Input Validation
  if (request.method !== 'GET') {
    console.error(`Invalid method: ${request.method} for ${requestId}`);
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
      },
    });
  }

  const url = new URL(request.url);
  if (url.pathname !== '/api/proxy') {
    console.error(`Invalid pathname: ${url.pathname} for ${requestId}`);
    return new Response(JSON.stringify({ error: 'Not found' }), {
      status: 404,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
      },
    });
  }

  // Query Param Validation (prevent injection: limit length, sanitize)
  const searchParams = url.searchParams;
  for (const [key, value] of searchParams) {
    if (key.length > 100 || value.length > 1000 || /[<>&"']/.test(value)) {
      console.error(`Invalid query param ${key}=${value} for ${requestId}`);
      return new Response(JSON.stringify({ error: 'Invalid input' }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store',
        },
      });
    }
  }

  try {
    // Forward Request to Backend
    const backendUrl = process.env.BACKEND_URL;
    if (!backendUrl) {
      console.error(`BACKEND_URL not set for ${requestId}`);
      return new Response(JSON.stringify({ error: 'Internal server error' }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store',
        },
      });
    }

    // Construct full backend URL (strip /api/proxy prefix)
    const targetPath = url.pathname.replace('/api/proxy', '') || '/';
    const backendFullUrl = `${backendUrl}${targetPath}${url.search}`;

    const backendResponse = await fetch(backendFullUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        // Forward relevant headers if needed, but avoid sensitive ones
      },
    });

    if (!backendResponse.ok) {
      console.error(`Backend error ${backendResponse.status} for ${requestId}`);
      return new Response(JSON.stringify({ error: 'Backend unavailable' }), {
        status: 502,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store',
        },
      });
    }

    let rawBusData;
    try {
      rawBusData = await backendResponse.json();
      // console.log(`Raw backend data for ${requestId}: type=${typeof rawBusData}, isArray=${Array.isArray(rawBusData)}, sample=${JSON.stringify(rawBusData?.slice?.(0,2) || rawBusData || {})}`);
    } catch (parseError) {
      console.error(`Failed to parse backend JSON for ${requestId}: ${parseError}`);
      return new Response(JSON.stringify({ error: 'Invalid backend response' }), {
        status: 502,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store',
        },
      });
    }

    // Data Transformation
    let busData: BusData[] = [];
    if (rawBusData && typeof rawBusData === 'object' && !Array.isArray(rawBusData)) {
      busData = Object.entries(rawBusData)
        .map(([id, value]) => {
          if (typeof value !== 'string') return null;
          try {
            const details = JSON.parse(value);
            return {
              id: id,
              vehicle_id: id,
              timestamp: (details.tS || details.lU || Date.now()),
              lastSeenTimestamp: details.lU || details.tS || null,
              lU: details.lU,
              route_short_name: details.rN,
              trip_headsign: details.eSN,
              route_id: details.rId,
              agency_name: 'MTC',
              ...details
            };
          } catch (e) {
            console.warn(`Failed to parse data for bus ID ${id}: ${e} for ${requestId}`);
            return null;
          }
        })
        .filter((bus): bus is BusData => bus !== null);
    } else {
      console.error(`Unexpected backend response format for ${requestId}: expected object, got ${typeof rawBusData} ${Array.isArray(rawBusData) ? 'array' : ''}`);
      return new Response(JSON.stringify({ error: 'Invalid data format' }), {
        status: 502,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store',
        },
      });
    }

    console.log(`Proxy success: ${busData.length} buses fetched for ${requestId}`);
    return new Response(JSON.stringify(busData), {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=30', // Short cache for live data
      },
    });

  } catch (error) {
    console.error(`Proxy error for ${requestId}: ${error}`);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
      },
    });
  }
}