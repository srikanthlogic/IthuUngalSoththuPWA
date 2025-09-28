# Chennai MTC Public Fleet Tracker

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-22-green)](https://nodejs.org/)
[![Deployed on Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-black)](https://ithuungalsoththu.vercel.app/)
[![X](https://img.shields.io/badge/X-%23000000.svg?style=for-the-badge&logo=X&logoColor=white)](https://x.com/hashtag/IthuUngalSoththu)

**#IthuUngalSoththu (#ThisIsYourAsset)**

This project is a public effort to enhance accountability in Chennai's public transport system. By providing a live, verifiable view of the Metropolitan Transport Corporation (MTC) fleet, we aim to empower citizens with the data they need to advocate for better services.

MTC, the public bus operator in Chennai, does not publish real-time, daily data on its fleet operations that can be independently verified. This Progressive Web App (PWA) consumes live data to present an accurate picture of how many buses are on the road at any given time, contrasting official figures with live data to highlight the accountability gap.

## Usage

- View live dashboard for real-time fleet status.
- Explore fleet data with filters, search, and export to CSV.
- Analyze routes.
- Switch languages (English/Tamil).
- Installable PWA.

## Key Features

- Accountability homepage with data-driven narrative.
- Live dashboard with fleet KPIs.
- Detailed fleet view with filters and search.
- Route analysis with utilization metrics.
- Data export to CSV.
- Multilingual support (English/Tamil).
- PWA with offline capabilities.

## The Accountability Gap

Official figures vs. live data show significant discrepancies in fleet size and operations.

| Metric                | Official Figure | Live Data (Example) |
| --------------------- | --------------- | ------------------- |
| Official Fleet        | 3,810           | -                   |
| Scheduled Services    | 3,420           | -                   |
| Total Buses in Feed   | -               | ~3600+              |
| Actively Tracked      | -               | Often  ~2,600       |

The gap highlights the need for public oversight. 'Total on App' includes idle or scrapped buses.

### The Crew Discrepancy

MTC reports 2.4M trip losses due to crew shortages, yet employs ~19,000 staff for ~2,500 buses requiring ~10,000 crew, indicating operational issues.

## Configuration-Driven Architecture

A key architectural feature of this application is its configuration-driven UI. The `MTC.json` file defines:
*   **Agency Details:** App name, hashtag, and other metadata.
*   **Business Logic:** The number of days of inactivity before a bus is "deemed scrapped".
*   **Filtering Logic:** The available filters in the Fleet view (e.g., Fleet Type, Agency, Series), their options, and the logic used to apply them to the dataset.
*   **Table Columns:** The columns displayed in the Fleet view table, including how to render derived data (e.g., determining the agency based on the vehicle ID).

This approach makes the application highly adaptable. It could be pointed to a different transport agency's data feed, and the UI, filters, and business logic could be updated by modifying only the JSON configuration file, without changing any React code.

## Data Source

This application fetches live data from the official Chennai Bus App.

## Technology Stack

*   **Core:** React 19, TypeScript
*   **Build Tool:** Vite
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

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Credits

Special thanks to supporters of IthuUngalSoththu, Google Gemini, and XAI Grok for their contributions.
