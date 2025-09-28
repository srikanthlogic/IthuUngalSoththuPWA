
import { BusData } from '../types.js';

/**
 * Fetches bus data from the proxy endpoint.
 * @returns A promise that resolves to an array of BusData objects.
 */
export const getBusData = async (): Promise<BusData[]> => {
    const response = await fetch('/api/proxy', {
        headers: { 'Accept': 'application/json' }
    });

    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
};
