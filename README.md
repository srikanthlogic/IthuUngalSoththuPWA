
# Chennai MTC Public Fleet Tracker

**#IthuUngalSoththu (#ThisIsYourProperty)**

This project is a public effort to enhance accountability in Chennai's public transport system. By providing a live, verifiable view of the Metropolitan Transport Corporation (MTC) fleet, we aim to empower citizens with the data they need to advocate for better services.

MTC, the public bus operator in Chennai, does not publish real-time, daily data on its fleet operations that can be independently verified. This Progressive Web App (PWA) consumes live data to present an accurate picture of how many buses are on the road at any given time, contrasting official figures with live data to highlight the accountability gap.

## Key Features

*   **Live Dashboard:** A high-level, real-time overview of the entire fleet's status, including breakdowns by bus type (Electric, Low Floor, etc.) and idle duration.
*   **Detailed Fleet View:** A comprehensive table of every bus. Users can search, sort, and apply multiple filters (status, fleet type, series) to the data.
*   **Route Analysis:** Analyze the performance and fleet deployment on a per-route basis. See which routes have the most active buses and their utilization rate.
*   **Data Export:** Export filtered and sorted data from the Fleet and Routes views to CSV for further analysis and reporting.
*   **Multilingual Interface:** Full support for both English and Tamil (தமிழ்).
*   **Progressive Web App (PWA):** Installable on mobile and desktop devices for an app-like experience with offline capabilities.

## The Accountability Gap

According to MTC's official (undated) data, their fleet numbers are significantly higher than what is observed in the live data feed.

| Metric                | Official Figure | Live Data (Example) |
| --------------------- | --------------- | ------------------- |
| Official Fleet        | 3,810           | -                   |
| Scheduled Services    | 3,420           | -                   |
| Total Buses in Feed   | -               | ~3600+             |
| Actively Tracked      | -               | Often < 2,500       |

This significant gap between the officially declared fleet and the number of buses actually running is why public oversight is crucial. The 'Total on App' figure includes every bus ID ever broadcasted by MTC's live feed, which often includes buses that are idle for months or are potentially scrapped but not formally retired from the system.

### The Crew Discrepancy

The 2023-24 annual report of MTC mentions **2,447,403 trip losses** due to a "want of crew". However, this raises questions about resource allocation:

*   Operating ~2,500 buses daily requires approximately **10,000 crew members** (based on 2 shifts per day, 2 crew per bus).
*   Even when accounting for additional night services, this number does not align with the **~19,000 crew members** reportedly employed by MTC.

This discrepancy between reported crew shortages and the number of staff required for the active fleet suggests a deeper issue in operational management and transparency.

## Data Source

This application fetches live data from the public API endpoint used by the official Chennai Bus App: `https://production.zophop.com/vasudha/dispatch/chennai/mtc/bus/`.

To bypass browser CORS restrictions, the data is fetched via a public proxy (`api.codetabs.com`). In a production-scale environment, this would be replaced by a dedicated backend service for caching and reliability.

## Technology Stack

*   **Frontend:** React, TypeScript
*   **Styling:** Tailwind CSS
*   **Offline Support:** Service Workers (PWA)

## How to Run

This project is a static web application and does not require a complex build process.

1.  Clone or download the repository files.
2.  Serve the files using a simple local web server. For example, using Python:
    ```bash
    # If you have Python 3
    python -m http.server
    ```
3.  Open your browser and navigate to the local server's address (e.g., `http://localhost:8000`).

The application will be running.
