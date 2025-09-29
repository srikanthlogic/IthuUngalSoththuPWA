import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import App from './App';
import * as apiService from './services/apiService';
import { LanguageProvider } from './context/LanguageContext';

// Mock the apiService
vi.mock('./services/apiService');

// Mock the useTranslation hook to return a stable object/function
const mockUseTranslation = {
  t: (key: string) => ({
    'pauseAutoRefresh': 'Pause Auto-Refresh',
    'resumeAutoRefresh': 'Resume Auto-Refresh',
    'navIthuUngalSoththu': 'Ithu Ungal Soththu',
    'loaderConfig': 'Loading configuration...'
  }[key] || key),
  language: 'en',
  changeLanguage: vi.fn(),
};
vi.mock('./context/LanguageContext', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    useTranslation: () => mockUseTranslation,
  };
});


const renderApp = () => {
  return render(
    <LanguageProvider>
      <App />
    </LanguageProvider>
  );
};

describe('App component', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    global.fetch = vi.fn((url) =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          appName: "Test App",
          deemedScrappedDays: 30,
          filters: [],
          tableColumns: [],
        }),
      })
    ) as any;

    (apiService.getBusData as any).mockResolvedValue([]);
  });

  it('should render the refresh and pause buttons', async () => {
    renderApp();
    expect(await screen.findByLabelText('Refresh Data')).toBeInTheDocument();
    expect(await screen.findByLabelText('Pause Auto-Refresh')).toBeInTheDocument();
  });

  it('should call fetchBusData on initial load and when refresh is clicked', async () => {
    const getBusDataMock = (apiService.getBusData as any);
    renderApp();

    // Called once on initial load
    await waitFor(() => expect(getBusDataMock).toHaveBeenCalledTimes(1));

    const refreshButton = screen.getByLabelText('Refresh Data');
    fireEvent.click(refreshButton);

    // Called again on click
    await waitFor(() => expect(getBusDataMock).toHaveBeenCalledTimes(2));
  });

  it('should toggle auto-refresh when the pause/resume button is clicked', async () => {
    renderApp();

    const pauseButton = await screen.findByLabelText('Pause Auto-Refresh');
    fireEvent.click(pauseButton);

    const resumeButton = await screen.findByLabelText('Resume Auto-Refresh');
    expect(resumeButton).toBeInTheDocument();

    fireEvent.click(resumeButton);

    expect(await screen.findByLabelText('Pause Auto-Refresh')).toBeInTheDocument();
  });
});