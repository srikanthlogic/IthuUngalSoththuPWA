
import { BusData } from '../types';

// The original API endpoint.
const API_URL = 'https://production.zophop.com/vasudha/dispatch/chennai/mtc/bus/';

// A CORS proxy is used to bypass browser restrictions. 
// In a production setup, this logic should be moved to a dedicated backend server
// to protect the original API and implement caching, as you suggested.
// The new backend endpoint would replace this URL.
const PROXIED_API_URL = `https://api.codetabs.com/v1/proxy/?quest=${encodeURIComponent(API_URL)}`;

/**
 * Fetches and parses the raw bus data from the API.
 * This function encapsulates the data source, so if you build a backend,
 * you would only need to change the URL endpoint here.
 * @returns A promise that resolves to an array of BusData objects.
 */
export const getBusData = async (): Promise<BusData[]> => {
    // In the future, you would change this to your fly.io endpoint, e.g.:
    // const response = await fetch('https://your-app.fly.dev/api/bus-data');
    const response = await fetch(PROXIED_API_URL, {
        headers: { 'Accept': 'application/json' }
    });

    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }

    const rawBusData = await response.json();

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
