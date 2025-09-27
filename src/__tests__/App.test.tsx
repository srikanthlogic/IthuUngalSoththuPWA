import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../../App';
import { View } from '../../types';

// Mock the API service
vi.mock('../../services/apiService', () => ({
  getBusData: vi.fn()
}));

// Import the mocked module for use in tests
import { getBusData } from '../../services/apiService';

// Mock the language context
vi.mock('../../context/LanguageContext.tsx', () => ({
  useTranslation: () => ({
    t: (key: string, options?: any) => {
      const translations: Record<string, string> = {
        'homeTitle': 'Home',
        'navDashboard': 'Dashboard',
        'navFleet': 'Fleet',
        'navRoutes': 'Routes',
        'aboutTitle': 'About',
        'loaderConfig': 'Loading configuration...',
        'loaderFetching': 'Fetching data...',
        'errorFetch': 'Error fetching data: {{error}}',
        'footerTotal': 'Total',
        'footerRunning': 'Running',
        'footerRanToday': 'Ran Today',
        'footerIdle': 'Idle',
        'footerScrapped': 'Scrapped',
        'footerLastUpdated': 'Last updated',
        'footerUpdating': 'Updating...',
        'footerPaused': 'Paused',
        'pauseAutoRefresh': 'Pause auto-refresh',
        'resumeAutoRefresh': 'Resume auto-refresh',
        'deemedScrappedTooltip': 'Buses not seen for 30+ days'
      };
      return translations[key] || key;
    }
  })
}));

// Mock fetch for configuration
global.fetch = vi.fn();

describe('App Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Mock successful configuration fetch
    (global.fetch as any).mockResolvedValue({
      json: vi.fn().mockResolvedValue({
        appName: 'MTC Bus Tracker',
        deemedScrappedDays: 30,
        filters: [],
        tableColumns: [
          { key: 'id', headerKey: 'busId' },
          { key: 'route_short_name', headerKey: 'route' }
        ]
      })
    });

    // Mock successful bus data fetch
    const mockBusData = [
      {
        id: 'MTC001',
        vehicle_id: 'MTC001',
        timestamp: Date.now(),
        route_short_name: '1A',
        trip_headsign: 'Chennai Central',
        sId: '123',
        lastSeenTimestamp: Date.now(),
        speed: 25,
        heading: 90
      },
      {
        id: 'MTC002',
        vehicle_id: 'MTC002',
        timestamp: Date.now() - 86400000,
        route_short_name: '2B',
        trip_headsign: 'Airport',
        sId: '',
        lastSeenTimestamp: Date.now() - 86400000, // 1 day ago
        speed: 0,
        heading: 0
      }
    ];

    vi.mocked(getBusData).mockResolvedValue(mockBusData);
  });

  it('should render loading state initially', async () => {
    render(<App />);

    expect(screen.getByText('Loading configuration...')).toBeInTheDocument();
  });

  it('should render the main application after loading', async () => {
    render(<App />);

    await waitFor(() => {
      expect(screen.getByText('Home')).toBeInTheDocument();
    });

    expect(screen.getByText('Total: 2')).toBeInTheDocument();
    expect(screen.getByText('Running: 1')).toBeInTheDocument();
  });

  it('should switch between views', async () => {
    render(<App />);

    await waitFor(() => {
      expect(screen.getByText('Home')).toBeInTheDocument();
    });

    // Mock navigation to Dashboard
    const dashboardButton = screen.getByRole('button', { name: /dashboard/i });
    fireEvent.click(dashboardButton);

    await waitFor(() => {
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
    });
  });

  it('should toggle sidebar on mobile', async () => {
    render(<App />);

    await waitFor(() => {
      expect(screen.getByText('Home')).toBeInTheDocument();
    });

    // Find and click the mobile menu button
    const menuButton = screen.getByLabelText('Open sidebar');
    fireEvent.click(menuButton);

    // Check if sidebar is opened (you might need to adjust this based on actual implementation)
    // This is a basic test - you might need to adjust based on your sidebar implementation
  });

  it('should handle auto-refresh pause/resume', async () => {
    render(<App />);

    await waitFor(() => {
      expect(screen.getByText('Home')).toBeInTheDocument();
    });

    const pauseButton = screen.getByLabelText('Pause auto-refresh');
    fireEvent.click(pauseButton);

    // Check if paused state is reflected
    expect(screen.getByText('Paused')).toBeInTheDocument();

    // Resume
    fireEvent.click(pauseButton);
    expect(screen.queryByText('Paused')).not.toBeInTheDocument();
  });

  it('should handle manual refresh', async () => {
    render(<App />);

    await waitFor(() => {
      expect(screen.getByText('Home')).toBeInTheDocument();
    });

    const refreshButton = screen.getByLabelText('Refresh Data');
    fireEvent.click(refreshButton);

    // Verify that getBusData was called again
    expect(vi.mocked(getBusData)).toHaveBeenCalledTimes(2);
  });

  it('should display error message when API fails', async () => {
    // Mock API failure
    vi.mocked(getBusData).mockRejectedValue(
      new Error('API Error')
    );

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText(/Error fetching data/)).toBeInTheDocument();
    });
  });

  it('should display error message when configuration fails', async () => {
    // Mock configuration fetch failure
    (global.fetch as any).mockRejectedValue(new Error('Config Error'));

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText(/Failed to load agency configuration/)).toBeInTheDocument();
    });
  });

  it('should update footer with current stats', async () => {
    render(<App />);

    await waitFor(() => {
      expect(screen.getByText('Total: 2')).toBeInTheDocument();
      expect(screen.getByText('Running: 1')).toBeInTheDocument();
      expect(screen.getByText('Ran Today: 1')).toBeInTheDocument();
      expect(screen.getByText('Idle: 0')).toBeInTheDocument();
      expect(screen.getByText('Scrapped: 0')).toBeInTheDocument();
    });
  });

  it('should handle language switching', async () => {
    render(<App />);

    await waitFor(() => {
      expect(screen.getByText('Home')).toBeInTheDocument();
    });

    // Find language switcher and test it
    const languageButtons = screen.getAllByRole('button');
    const languageButton = languageButtons.find(button =>
      button.textContent === 'EN' || button.textContent === 'TA'
    );

    if (languageButton) {
      fireEvent.click(languageButton);
      // Language switching behavior would depend on your implementation
    }
  });

  it('should render all navigation views', async () => {
    render(<App />);

    await waitFor(() => {
      expect(screen.getByText('Home')).toBeInTheDocument();
    });

    // Test that all views can be rendered
    const viewNames = ['Dashboard', 'Fleet', 'Routes', 'About'];

    for (const viewName of viewNames) {
      const viewButton = screen.getByRole('button', { name: new RegExp(viewName, 'i') });
      fireEvent.click(viewButton);

      await waitFor(() => {
        expect(screen.getByText(viewName)).toBeInTheDocument();
      });
    }
  });

  it('should handle empty bus data gracefully', async () => {
    // Mock empty bus data
    vi.mocked(getBusData).mockResolvedValue([]);

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText('Total: 0')).toBeInTheDocument();
      expect(screen.getByText('Running: 0')).toBeInTheDocument();
    });
  });

  it('should update last updated timestamp', async () => {
    render(<App />);

    await waitFor(() => {
      expect(screen.getByText(/Last updated/)).toBeInTheDocument();
    });

    // The timestamp should be recent
    const lastUpdatedElement = screen.getByText(/Last updated/);
    expect(lastUpdatedElement).toBeInTheDocument();
  });
});