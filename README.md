# Chennai MTC Public Fleet Tracker

**#IthuUngalSoththu (#ThisIsYourProperty)**

This project is a public effort to enhance accountability in Chennai's public transport system. By providing a live, verifiable view of the Metropolitan Transport Corporation (MTC) fleet, we aim to empower citizens with the data they need to advocate for better services.

MTC, the public bus operator in Chennai, does not publish real-time, daily data on its fleet operations that can be independently verified. This Progressive Web App (PWA) consumes live data to present an accurate picture of how many buses are on the road at any given time, contrasting official figures with live data to highlight the accountability gap.

## Key Features

*   **Accountability Homepage:** The landing page provides a clear, data-driven narrative about the discrepancies between official reports and live data regarding fleet size and crew availability, setting the context for the app's purpose.
*   **Live Dashboard:** A high-level, real-time overview of the entire fleet's status. It includes key performance indicators like total buses, active buses, idle buses, and "deemed scrapped" buses, with breakdowns by agency (MTC vs. Switch Mobility) and fleet composition (Electric, Diesel, etc.).
*   **Detailed Fleet View:** A powerful data table for granular analysis of every bus. Users can search, sort, and apply multiple, combinable filters (status, fleet type, agency, series). The view includes summary statistics that update dynamically with the filters.
*   **Route Analysis:** Analyze the performance and fleet deployment on a per-route basis. This view shows how many buses of each type are running, idle, or scrapped on each route, along with a utilization metric to quickly identify under-serviced routes.
*   **Data Export:** Both the Fleet and Routes views allow users to export the currently filtered and sorted data to CSV format for offline analysis, research, and reporting.
*   **Multilingual Interface:** Full support for both English and Tamil (தமிழ்), with translations managed in a clean `i18n` pattern.
*   **Progressive Web App (PWA):** Installable on mobile and desktop devices for an app-like experience. The service worker provides basic offline capabilities by caching the application shell.

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

## Configuration-Driven Architecture

A key architectural feature of this application is its configuration-driven UI. The `MTC.json` file defines:
*   **Agency Details:** App name, hashtag, and other metadata.
*   **Business Logic:** The number of days of inactivity before a bus is "deemed scrapped".
*   **Filtering Logic:** The available filters in the Fleet view (e.g., Fleet Type, Agency, Series), their options, and the logic used to apply them to the dataset.
*   **Table Columns:** The columns displayed in the Fleet view table, including how to render derived data (e.g., determining the agency based on the vehicle ID).

This approach makes the application highly adaptable. It could be pointed to a different transport agency's data feed, and the UI, filters, and business logic could be updated by modifying only the JSON configuration file, without changing any React code.

## Data Source

This application fetches live data from the public API endpoint used by the official Chennai Bus App: `https://production.zophop.com/vasudha/dispatch/chennai/mtc/bus/`.

To bypass browser CORS restrictions during development, the data is fetched via a public proxy (`api.codetabs.com`). For a production deployment, it is highly recommended to set up a dedicated backend service (e.g., on Fly.io, Vercel, or Cloudflare Workers) to proxy requests. This backend would improve reliability, implement caching to reduce load on the source API, and prevent potential rate-limiting or blocking of a public proxy.

## Technology Stack

*   **Core:** React 19, TypeScript
*   **Styling:** Tailwind CSS for a utility-first approach.
*   **State Management:** React Hooks (`useState`, `useMemo`, `useCallback`) for local component state and derived data memoization.
*   **Internationalization (i18n):** React Context API for managing language state (English & Tamil).
*   **Offline Support:** A Service Worker provides PWA capabilities, caching the main application shell (`index.html`, `manifest.json`, etc.) for offline access after the first visit.

## Project Structure

The codebase is organized as follows:

```
/
├── public/                # Static assets served at the root
│   ├── MTC.json           # Main app configuration
│   ├── locales/           # Translation files (en.json, ta.json)
│   └── ...                # Other assets (icons, manifest.json)
├── src/
│   ├── components/        # Reusable React components
│   ├── context/           # React context for language
│   ├── services/          # API service for fetching data
│   ├── App.tsx            # Main application component and logic
│   ├── index.tsx          # Application entry point
│   └── types.ts           # TypeScript type definitions
├── README.md              # This file
├── index.html             # Main HTML file
└── service-worker.js      # PWA service worker
```

## How to Run Locally

This project is a static web application and does not require a complex build process.

1.  **Prerequisites:** You need a local web server to serve the files. Most modern development environments have one built-in. If not, you can use a simple tool like Python's built-in server.
2.  **Clone the Repository:**
    ```bash
    git clone <repository-url>
    cd <repository-directory>
    ```
3.  **Serve the Files:**
    For example, if you have Python 3 installed:
    ```bash
    python -m http.server 8000
    ```
    This will start a web server on port 8000.

4.  **View the App:**
    Open your browser and navigate to `http://localhost:8000`. The application should load and start fetching live data.
