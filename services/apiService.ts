
/// <reference types="vite/client" />
import { BusData } from '../types';

// Using Vercel Edge Function proxy with environment-based configuration
// The Edge Function handles authentication, rate limiting, and CORS
const API_BASE_URL = (import.meta.env?.VITE_API_BASE_URL as string) || '/api';
const IS_DEVELOPMENT = import.meta.env.DEV;
const USE_MOCK_API = import.meta.env.VITE_MOCK_API === 'true';

// Debug logging to validate environment variables
console.log('🔍 DEBUG: Environment Variables Check');
console.log('  - IS_DEVELOPMENT:', IS_DEVELOPMENT);
console.log('  - VITE_MOCK_API:', import.meta.env.VITE_MOCK_API);
console.log('  - USE_MOCK_API (parsed):', USE_MOCK_API);
console.log('  - API_BASE_URL:', API_BASE_URL);
console.log('  - BACKEND_URL:', import.meta.env.BACKEND_URL);
console.log('  - VITE_API_KEY:', import.meta.env.VITE_API_KEY ? '***present***' : 'MISSING');

/**
 * Fetches and parses the raw bus data from the API.
 * This function encapsulates the data source, so if you build a backend,
 * you would only need to change the URL endpoint here.
 * @returns A promise that resolves to an array of BusData objects.
 */
export const getBusData = async (): Promise<BusData[]> => {
     // Use mock data for development if enabled
     console.log('🔍 DEBUG: Checking mock data condition...');
     console.log('  - USE_MOCK_API:', USE_MOCK_API);
     console.log('  - IS_DEVELOPMENT:', IS_DEVELOPMENT);
     console.log('  - Combined condition (USE_MOCK_API || IS_DEVELOPMENT):', USE_MOCK_API || IS_DEVELOPMENT);

     if (USE_MOCK_API) {
         console.log('🔧 Using mock API data (VITE_MOCK_API=true)');
         return getMockBusData();
     }

     console.log('✅ Proceeding with real API data (not using mock data)');
     console.log('   → Will attempt to fetch from:', import.meta.env.BACKEND_URL);
     console.log('   → API_KEY present:', import.meta.env.VITE_API_KEY ? 'YES' : 'NO');
     console.log('   → VITE_MOCK_API value:', import.meta.env.VITE_MOCK_API);
     console.log('   → USE_MOCK_API (parsed):', USE_MOCK_API);
     console.log('   → IS_DEVELOPMENT:', IS_DEVELOPMENT);

    try {
        // Try Edge Function proxy first (for production/staging)
        console.log('🌐 Attempting to fetch via Edge Function proxy...');
        const backendUrl = import.meta.env.BACKEND_URL;
        if (!backendUrl) {
            throw new Error('BACKEND_URL environment variable is required for proxy-only architecture');
        }
        const response = await fetch(`${API_BASE_URL}/proxy`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-API-Key': import.meta.env.VITE_API_KEY || ''
            },
            body: JSON.stringify({
                url: backendUrl
            })
        });

        if (response.ok) {
            console.log('✅ Successfully fetched data via Edge Function proxy');
            const rawBusData = await response.json();
            return processBusData(rawBusData);
        }

        // If Edge Function fails, fall back to development proxy
        if (IS_DEVELOPMENT && response.status === 404) {
            console.log('🔄 Edge Function not available, falling back to development proxy...');
            return await fetchViaDevelopmentProxy();
        }

        throw new Error(`HTTP error! status: ${response.status}`);

    } catch (error) {
        console.error('❌ Edge Function proxy failed:', error);

        // Fallback to development proxy for local development
        if (IS_DEVELOPMENT) {
            console.log('🔄 Falling back to development proxy...');
            return await fetchViaDevelopmentProxy();
        }

        throw error;
    }
};

/**
 * Process raw bus data into BusData objects
 */
const processBusData = (rawBusData: any): BusData[] => {

    if (rawBusData && typeof rawBusData === 'object' && !Array.isArray(rawBusData)) {
        return Object.entries(rawBusData)
            .map(([id, value]) => {
                try {
                    if (typeof value !== 'string') return null;
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
                        agency_name: 'MTC', // Default agency, can be refined later
                        ...details
                    };
                } catch (e) {
                    console.warn(`Failed to parse data for bus ID ${id}:`, value);
                    return null;
                }
            })
            .filter((bus): bus is BusData => bus !== null);
    }

    throw new Error("API response is not in the expected object format.");
};


/**
 * Get mock bus data for development and testing
 */
const getMockBusData = (): BusData[] => {
    const mockData = {
        "MTC001": JSON.stringify({
            rN: "1A",
            rId: "route_1A",
            eSN: "To Central",
            tS: Date.now(),
            lU: Date.now(),
            lat: 13.0827,
            lng: 80.2707,
            speed: 25,
            heading: 90
        }),
        "MTC002": JSON.stringify({
            rN: "21G",
            rId: "route_21G",
            eSN: "To Broadway",
            tS: Date.now() - 30000,
            lU: Date.now() - 30000,
            lat: 13.0877,
            lng: 80.2757,
            speed: 30,
            heading: 180
        }),
        "MTC003": JSON.stringify({
            rN: "5A",
            rId: "route_5A",
            eSN: "To T.Nagar",
            tS: Date.now() - 60000,
            lU: Date.now() - 60000,
            lat: 13.0777,
            lng: 80.2657,
            speed: 20,
            heading: 270
        })
    };

    return processBusData(mockData);
};

/**
 * Fetch data via development proxy (fallback for local development)
 */
const fetchViaDevelopmentProxy = async (): Promise<BusData[]> => {
    console.log('🔧 Using development proxy for local testing...');

    // Use the actual backend URL from environment variables
    const backendUrl = import.meta.env.BACKEND_URL;
    if (!backendUrl) {
        throw new Error('BACKEND_URL environment variable is required for proxy-only architecture');
    }

    // Use a CORS proxy service for local development (configurable)
    const PROXY_URL = import.meta.env.VITE_CORS_PROXY_URL || 'https://api.codetabs.com/v1/proxy';

    const response = await fetch(`${PROXY_URL}?quest=${encodeURIComponent(backendUrl)}`, {
        method: 'GET',
        headers: {
            'Accept': 'application/json',
            'User-Agent': 'MTC-Bus-Tracker-Dev/1.0.0'
        }
    });

    if (!response.ok) {
        throw new Error(`Development proxy error! status: ${response.status}`);
    }

    const rawBusData = await response.json();
    return processBusData(rawBusData);
};
