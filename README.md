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

This application fetches live data from the public API endpoint used by the official Chennai Bus App.

To bypass browser CORS restrictions during development, the data is fetched via a public proxy (`api.codetabs.com`). For a production deployment, it is highly recommended to set up a dedicated backend service (e.g., on Fly.io, Vercel, or Cloudflare Workers) to proxy requests. This backend would improve reliability, implement caching to reduce load on the source API, and prevent potential rate-limiting or blocking of a public proxy.

## Technology Stack

*   **Core:** React 19, TypeScript
*   **Styling:** Tailwind CSS for a utility-first approach.
*   **State Management:** React Hooks (`useState`, `useMemo`, `useCallback`) for local component state and derived data memoization.
*   **Internationalization (i18n):** React Context API for managing language state (English & Tamil).
*   **Offline Support:** A Service Worker provides PWA capabilities, caching the main application shell (`index.html`, `manifest.json`, etc.) for offline access after the first visit.
*   **Testing:** Vitest for fast unit testing, React Testing Library for component testing, and jsdom for DOM environment simulation.

## Testing

This project includes comprehensive testing infrastructure to ensure code quality and reliability.

### Test Structure

```
/
├── src/__tests__/           # Frontend React component tests
│   ├── App.test.tsx         # Main App component tests
│   └── setup.ts             # Test environment setup
├── api/__tests__/           # Backend API tests
│   ├── utils.test.ts        # Utility functions tests
│   ├── middleware.test.ts   # Middleware tests
│   └── proxy.test.ts        # Edge function tests
├── vitest.config.ts         # Vitest configuration
└── package.json             # Test scripts
```

### Available Test Commands

```bash
# Run all tests once
npm run test:run

# Run tests in watch mode (recommended for development)
npm run test

# Run tests with UI interface
npm run test:ui

# Run tests with coverage report
npm run test:coverage

# Generate coverage report in HTML format
npm run test:coverage -- --reporter=html
```

### Test Coverage Requirements

The project maintains minimum coverage thresholds:

- **Branches:** 70%
- **Functions:** 70%
- **Lines:** 70%
- **Statements:** 70%

Coverage reports are automatically generated during CI/CD and uploaded to code coverage services.

### Writing Tests

#### Frontend Component Tests

Use React Testing Library for component testing:

```typescript
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import App from '../App';

describe('App Component', () => {
  it('should render the main application', () => {
    render(<App />);
    expect(screen.getByText('Home')).toBeInTheDocument();
  });
});
```

#### API Function Tests

Test utility functions and edge functions:

```typescript
import { describe, it, expect } from 'vitest';
import { RateLimiter } from '../utils';

describe('RateLimiter', () => {
  it('should allow requests within rate limit', async () => {
    const rateLimiter = RateLimiter.getInstance();
    const result = await rateLimiter.checkRateLimit('test-key', {
      windowMs: 60000,
      maxRequests: 5
    });

    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(4);
  });
});
```

### Test Environment Setup

The test environment is configured with:

- **jsdom** for DOM simulation
- **Mocked fetch** for API calls
- **Mocked browser APIs** (ResizeObserver, IntersectionObserver, matchMedia)
- **Environment variables** for testing
- **Global test utilities** and matchers

### CI/CD Integration

Tests are automatically run in the GitHub Actions workflow:

1. **Pre-deployment:** All tests must pass before deployment
2. **Coverage reporting:** Coverage reports are generated and uploaded
3. **Failure handling:** Failed tests prevent deployment to production
4. **Parallel execution:** Tests run in parallel for faster CI/CD

### Best Practices

- **Test isolation:** Each test should be independent and not rely on other tests
- **Mock external dependencies:** Use mocks for API calls, timers, and browser APIs
- **Descriptive test names:** Use clear, descriptive names for test cases
- **Arrange-Act-Assert:** Follow the AAA pattern for test structure
- **Coverage goals:** Aim for high coverage in critical business logic
- **Regular maintenance:** Keep tests up-to-date with code changes

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

### Prerequisites

- **Node.js 18+** and npm for running tests and development server
- **Local web server** to serve the files (most modern development environments have one built-in)

### Development Setup

1.  **Clone the Repository:**
    ```bash
    git clone <repository-url>
    cd <repository-directory>
    ```

2.  **Install Dependencies:**
    ```bash
    npm install
    ```

3.  **Run Tests:**
    ```bash
    # Run tests in watch mode (recommended for development)
    npm run test

    # Run all tests once
    npm run test:run

    # Run tests with coverage
    npm run test:coverage
    ```

4.  **Start Development Server:**
    ```bash
    npm run dev
    ```
    This will start the Vite development server with hot reload.

5.  **View the App:**
     Open your browser and navigate to `http://localhost:3000`. The application should load and start fetching live data.

### Alternative Setup (Without Node.js)

If you don't want to install Node.js, you can serve the files directly:

1.  **Clone the Repository:**
    ```bash
    git clone <repository-url>
    cd <repository-directory>
    ```

2.  **Serve the Files:**
    For example, if you have Python 3 installed:
    ```bash
    python -m http.server 8000
    ```
    This will start a web server on port 8000.

3.  **View the App:**
     Open your browser and navigate to `http://localhost:8000`. The application should load and start fetching live data.

**Note:** Without Node.js, you won't be able to run the test suite or use the development server with hot reload.

## Deployment

This project includes a comprehensive GitHub Actions workflow for automated deployment to Vercel.

### GitHub Actions Workflow

The `.github/workflows/deploy.yml` file contains a complete CI/CD pipeline that:

- **Triggers** on pushes to the `main` branch and pull requests
- **Builds** the application using Node.js 18 with npm caching
- **Deploys** to Vercel with production and preview environments
- **Handles** deployment failures with automatic rollback
- **Notifies** about deployment status via PR comments

### Environment Variables Setup

This project requires comprehensive environment variable configuration for production deployment. All environment variables are documented in `.env.example` and must be configured in both GitHub Secrets and Vercel.

#### Required GitHub Secrets

Configure the following secrets in your GitHub repository (Settings → Secrets and variables → Actions):

##### Core Infrastructure Secrets
1. **VERCEL_TOKEN** - Your Vercel access token
2. **VERCEL_ORG_ID** - Your Vercel organization ID
3. **VERCEL_PROJECT_ID** - Your Vercel project ID

##### Required Environment Variables
4. **GEMINI_API_KEY** - Your Google Gemini API key (for AI features)
5. **BACKEND_URL** - Backend API URL for proxy requests
6. **AUTH_SECRET** - Secret key for JWT token signing
7. **ENVIRONMENT** - Environment type (production/staging)
8. **VERCEL_URL** - Deployment URL (auto-populated by Vercel)
9. **LOG_LEVEL** - Logging level (error, warn, info, debug)

##### Rate Limiting Secrets
10. **RATE_LIMIT_REQUESTS_PER_MINUTE** - API rate limit per minute
11. **RATE_LIMIT_WINDOW_MINUTES** - Rate limit window duration

##### PWA Configuration Secrets
12. **VITE_APP_NAME** - PWA application name
13. **VITE_APP_SHORT_NAME** - PWA short name
14. **VITE_APP_DESCRIPTION** - PWA description
15. **VITE_THEME_COLOR** - PWA theme color
16. **VITE_BACKGROUND_COLOR** - PWA background color

##### API Configuration Secrets
17. **VITE_API_BASE_URL** - Frontend API base URL
18. **VITE_API_TIMEOUT** - API request timeout
19. **VITE_API_RETRY_ATTEMPTS** - Number of retry attempts
20. **VITE_API_RETRY_DELAY** - Delay between retries
21. **VITE_API_CACHE_ENABLED** - Enable API caching
22. **VITE_API_CACHE_DURATION** - Cache duration in seconds

##### Security Configuration Secrets
23. **CORS_ORIGINS** - Allowed CORS origins (comma-separated)
24. **HTTPS_ENFORCED** - Enable HTTPS enforcement
25. **SESSION_TIMEOUT** - Session timeout in minutes
26. **CSRF_PROTECTION** - Enable CSRF protection

##### Performance Configuration Secrets
27. **VITE_SW_CACHE_ENABLED** - Enable service worker caching
28. **VITE_SW_CACHE_VERSION** - Service worker cache version
29. **VITE_LAZY_LOADING** - Enable lazy loading
30. **VITE_IMAGE_QUALITY** - Image optimization quality
31. **VITE_COMPRESSION_ENABLED** - Enable compression

##### Feature Flag Secrets
32. **VITE_ENABLE_MAP** - Enable map functionality
33. **VITE_ENABLE_NOTIFICATIONS** - Enable push notifications
34. **VITE_ENABLE_OFFLINE** - Enable offline mode
35. **VITE_ENABLE_EXPORT** - Enable data export
36. **VITE_DEBUG_MODE** - Enable debug mode

##### Localization Secrets
37. **VITE_DEFAULT_LANGUAGE** - Default language (en/ta)
38. **VITE_RTL_SUPPORT** - Enable RTL support

##### Optional Monitoring Secrets
39. **VITE_GA_ID** - Google Analytics ID
40. **VITE_SENTRY_DSN** - Sentry error tracking DSN
41. **VITE_ERROR_REPORTING** - Enable error reporting
42. **VITE_PERFORMANCE_MONITORING** - Enable performance monitoring

##### Development Configuration Secrets
43. **VITE_DEV_TOOLS** - Enable development tools
44. **VITE_MOCK_API** - Enable mock API responses
45. **VITE_HOT_RELOAD** - Enable hot reload

### Setting up Vercel Deployment

1. **Create a Vercel account** and install the Vercel CLI:
   ```bash
   npm i -g vercel
   ```

2. **Create a new project** in Vercel and link it to your GitHub repository:
   ```bash
   vercel link
   ```

3. **Configure environment variables** in your Vercel project settings:
   - Go to your Vercel project dashboard
   - Navigate to Settings → Environment Variables
   - Add all environment variables listed in `.env.example`
   - Use the same values as configured in GitHub Secrets

4. **Add the required secrets** to your GitHub repository:
   - Go to Settings → Secrets and variables → Actions
   - Add all secrets listed above with appropriate values

5. **Deploy the project**:
   ```bash
   vercel --prod
   ```

### Environment Variables Best Practices

#### Security Guidelines
- **Never commit** actual values to version control
- **Use strong, unique secrets** for production environments
- **Rotate secrets regularly** (every 90 days recommended)
- **Use different values** for staging and production
- **Limit secret access** to only necessary team members

#### Production Configuration
- Set `ENVIRONMENT=production` for production deployments
- Enable `VITE_DEBUG_MODE=false` in production
- Set `LOG_LEVEL=info` or `error` for production
- Enable `HTTPS_ENFORCED=true` for all production domains
- Configure `CORS_ORIGINS` with your actual domain names

#### Monitoring and Logging
- Configure error tracking with Sentry or similar service
- Set up performance monitoring for production
- Enable structured logging for better observability
- Monitor rate limiting to prevent abuse

#### Performance Optimization
- Enable service worker caching for better performance
- Configure appropriate cache durations for your use case
- Enable compression for faster load times
- Set optimal image quality for your requirements

### Deployment Process

- **Production Deployment**: Automatically triggered when code is pushed to the `main` branch
- **Preview Deployment**: Automatically created for each pull request
- **Rollback**: If production deployment fails, the workflow will automatically rollback to the previous working version
- **Notifications**: PR comments will include links to preview deployments

The workflow is optimized for Vite + React + TypeScript PWA projects and includes proper error handling, build verification, and status reporting.

## Rollback Mechanisms

This project includes comprehensive rollback mechanisms to ensure high availability and quick recovery from deployment failures.

### Automated Rollback Features

#### 1. Health Check Monitoring
- **Automatic Health Checks**: Post-deployment health checks are performed automatically
- **Failure Detection**: If health checks fail, the system automatically triggers a rollback
- **Health Check Endpoint**: `/api/health` provides comprehensive system health information
- **Monitoring Period**: 5-minute monitoring window after deployment

#### 2. Automatic Rollback Triggers
- **Health Check Failures**: Automatic rollback if health checks fail within monitoring period
- **Build Failures**: Rollback if the application fails to build or start
- **Critical API Failures**: Rollback if essential APIs become unresponsive
- **Performance Degradation**: Rollback if response times exceed acceptable thresholds

#### 3. Manual Rollback Options
- **GitHub Actions Workflow**: Trigger manual rollback via GitHub Actions
- **Vercel Dashboard**: Manual rollback through Vercel interface
- **CLI Commands**: Direct rollback using Vercel CLI

### Rollback Scripts and Utilities

The project includes specialized scripts for rollback operations:

#### 1. Automated Rollback Script (`scripts/rollback.sh`)
```bash
# Automatic rollback (triggered by health check failure)
./scripts/rollback.sh auto

# Manual rollback with reason
./scripts/rollback.sh manual "Emergency fix required"

# Validate current deployment health
./scripts/rollback.sh validate

# Create backup before rollback
./scripts/rollback.sh backup
```

#### 2. Health Check Script (`scripts/health-check.sh`)
```bash
# Comprehensive health check
./scripts/health-check.sh https://your-app.vercel.app

# Health check with custom timeout
./scripts/health-check.sh https://your-app.vercel.app 60

# Health check with report generation
./scripts/health-check.sh https://your-app.vercel.app 30 false true
```

#### 3. Backup Configuration Script (`scripts/backup-config.sh`)
```bash
# Create comprehensive backup
./scripts/backup-config.sh create

# List available backups
./scripts/backup-config.sh list

# Clean up old backups (older than 30 days)
./scripts/backup-config.sh cleanup 30

# Verify backup integrity
./scripts/backup-config.sh verify /path/to/backup
```

### Manual Rollback Procedures

#### Emergency Rollback Checklist

1. **Assess the Situation**
   - Identify the nature of the deployment failure
   - Check deployment logs and error messages
   - Verify health check status

2. **Trigger Manual Rollback**
   ```bash
   # Option 1: GitHub Actions (Recommended)
   # Go to GitHub Actions → Deploy to Vercel → "Run workflow"
   # Set rollback=true and provide reason

   # Option 2: Vercel CLI
   vercel rollback --yes

   # Option 3: Vercel Dashboard
   # Go to Vercel Dashboard → Project → Deployments
   # Click "Rollback" on the previous successful deployment
   ```

3. **Verify Rollback Success**
   - Check that the application is accessible
   - Run health checks to confirm stability
   - Monitor error rates and performance metrics

4. **Post-Rollback Actions**
   - Investigate the root cause of the failure
   - Fix the underlying issues
   - Test the fixes in a staging environment
   - Prepare for redeployment

#### Incident Response Procedures

##### Level 1: Minor Issues (No Rollback Required)
- Monitor the situation for 5-10 minutes
- Check if issues resolve automatically
- Escalate if issues persist

##### Level 2: Service Degradation (Consider Rollback)
- Trigger health checks manually
- Monitor error rates and response times
- Prepare rollback if degradation continues

##### Level 3: Critical Failure (Immediate Rollback)
- Immediately trigger manual rollback
- Notify stakeholders about the incident
- Begin root cause analysis
- Prepare communication for users

### Rollback Testing and Validation

#### Pre-Deployment Testing
- **Health Check Validation**: Ensure health check endpoint works correctly
- **Rollback Script Testing**: Test rollback scripts in staging environment
- **Backup Verification**: Verify backup creation and restoration processes

#### Post-Rollback Validation
- **Application Accessibility**: Confirm the application loads correctly
- **API Functionality**: Verify all APIs are responding
- **Performance Metrics**: Check response times and error rates
- **Data Integrity**: Ensure no data loss occurred during rollback

### Monitoring and Alerting

#### Deployment Monitoring
- **Real-time Health Checks**: Continuous monitoring of application health
- **Performance Metrics**: Response time and throughput monitoring
- **Error Tracking**: Automated error detection and alerting
- **Resource Usage**: Memory and CPU usage monitoring

#### Alert Configuration
- **Email Notifications**: Alerts sent to development team
- **Slack Integration**: Real-time notifications in development channels
- **SMS Alerts**: Critical failure notifications via SMS
- **Dashboard Alerts**: Visual indicators in monitoring dashboards

### Backup Strategy

#### Automated Backups
- **Pre-deployment Backups**: Automatic backup before each deployment
- **Configuration Backups**: Regular backup of configuration files
- **Database Backups**: Scheduled backups of critical data
- **Log Backups**: Archival of application and system logs

#### Backup Retention
- **Daily Backups**: Retained for 7 days
- **Weekly Backups**: Retained for 4 weeks
- **Monthly Backups**: Retained for 3 months
- **Critical Backups**: Retained for 1 year

### Best Practices

#### Rollback Prevention
- **Thorough Testing**: Comprehensive testing before deployment
- **Gradual Rollouts**: Use feature flags for gradual feature releases
- **Monitoring Setup**: Ensure monitoring is configured before deployment
- **Documentation**: Keep rollback procedures well-documented

#### During Rollback
- **Communicate Clearly**: Keep stakeholders informed during rollback
- **Document Everything**: Record all actions taken during rollback
- **Test Thoroughly**: Validate rollback success before considering complete
- **Learn and Improve**: Use rollback incidents to improve future deployments

#### Post-Rollback
- **Root Cause Analysis**: Investigate and document the cause of failure
- **Process Improvement**: Update procedures based on lessons learned
- **Team Training**: Ensure all team members understand rollback procedures
- **Regular Drills**: Conduct regular rollback practice sessions

### Local Development Environment Setup

For local development, create a `.env.local` file in the project root and configure the following variables:

1. **Copy the environment template**:
   ```bash
   cp .env.example .env.local
   ```

2. **Configure local development variables**:
   ```bash
   # Required for local development
   GEMINI_API_KEY=your_gemini_api_key_here
   BACKEND_URL=http://localhost:3001
   AUTH_SECRET=your_local_development_secret
   ENVIRONMENT=development
   LOG_LEVEL=debug

   # Enable development features
   VITE_DEBUG_MODE=true
   VITE_DEV_TOOLS=true
   VITE_HOT_RELOAD=true
   VITE_MOCK_API=false
   ```

3. **Start the development server**:
   ```bash
   npm run dev
   ```

### Environment Variables Reference

All available environment variables are documented in `.env.example`. The file includes:

- **Required variables** for production deployment
- **Optional variables** for enhanced functionality
- **Development variables** for local testing
- **Security configurations** for production hardening
- **Performance optimizations** for better user experience

Refer to `.env.example` for the complete list of variables and their default values.
