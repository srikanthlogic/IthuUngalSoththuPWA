
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { BusData, View, SortConfig, DashboardStats, RouteInfo, TableColumn, StatusFilter, FleetFilter, SeriesFilter } from './types';
import MapView from './components/MapView';
import FleetView from './components/TableView';
import RoutesView from './components/RoutesView';
import Loader from './components/Loader';
import LanguageSwitcher from './components/LanguageSwitcher';
import { useTranslation } from './context/LanguageContext';
import { getBusData } from './services/apiService';
import Sidebar from './components/Sidebar';
import HomePage from './components/HomePage';


const REFRESH_INTERVAL = 30000; // 30 seconds

interface BusStatusCounts {
    total: number;
    running: number;
    ranTodayWithoutTracking: number;
    idle: number;
    scrapped: number;
}

const initialDashboardStats: DashboardStats = {
    total: 0,
    running: 0,
    ranTodayWithoutTracking: 0,
    notRunLessThan7Days: 0,
    notRun7to30Days: 0,
    notRunMoreThan30Days: 0,
    scrapped: 0,
    elfac: { total: 0, running: 0, ranTodayWithoutTracking: 0, notRunLessThan7Days: 0, notRun7to30Days: 0, notRunMoreThan30Days: 0, scrapped: 0 },
    elf: { total: 0, running: 0, ranTodayWithoutTracking: 0, notRunLessThan7Days: 0, notRun7to30Days: 0, notRunMoreThan30Days: 0, scrapped: 0 },
    lf: { total: 0, running: 0, ranTodayWithoutTracking: 0, notRunLessThan7Days: 0, notRun7to30Days: 0, notRunMoreThan30Days: 0, scrapped: 0 },
    other: { total: 0, running: 0, ranTodayWithoutTracking: 0, notRunLessThan7Days: 0, notRun7to30Days: 0, notRunMoreThan30Days: 0, scrapped: 0 },
};


const App: React.FC = () => {
    const [allBuses, setAllBuses] = useState<BusData[]>([]);
    const [routesData, setRoutesData] = useState<RouteInfo[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [view, setView] = useState<View>(View.Home);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
    const [statusCounts, setStatusCounts] = useState<BusStatusCounts>({ total: 0, running: 0, ranTodayWithoutTracking: 0, idle: 0, scrapped: 0 });
    const [dashboardStats, setDashboardStats] = useState<DashboardStats>(initialDashboardStats);

    const [filterKey, setFilterKey] = useState<string>('all');
    const [filterValue, setFilterValue] = useState<string>('');
    const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'route_short_name', direction: 'ascending' });
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('running');
    const [fleetFilter, setFleetFilter] = useState<FleetFilter>('all');
    const [seriesFilter, setSeriesFilter] = useState<SeriesFilter>('all');
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [scrappedDate, setScrappedDate] = useState<Date>(() => {
        const d = new Date();
        d.setDate(d.getDate() - 30);
        d.setHours(0, 0, 0, 0);
        return d;
    });
    
    const isFetching = useRef(false);
    const { t } = useTranslation();

    const fetchBusData = useCallback(async () => {
        if (isFetching.current) return;
        isFetching.current = true;
        setLoading(true);
        setError(null);

        try {
            const allBusesFromApi: BusData[] = await getBusData();

            const now = Date.now();
            const todayStart = new Date().setHours(0, 0, 0, 0);
            const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
            const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;
            const scrappedTimestamp = scrappedDate.getTime();
            
            const breakdown: any = { // Using any to simplify dynamic key access
                elfac: { total: 0, running: 0, ranTodayWithoutTracking: 0, notRunLessThan7Days: 0, notRun7to30Days: 0, notRunMoreThan30Days: 0, scrapped: 0 },
                elf:   { total: 0, running: 0, ranTodayWithoutTracking: 0, notRunLessThan7Days: 0, notRun7to30Days: 0, notRunMoreThan30Days: 0, scrapped: 0 },
                lf:    { total: 0, running: 0, ranTodayWithoutTracking: 0, notRunLessThan7Days: 0, notRun7to30Days: 0, notRunMoreThan30Days: 0, scrapped: 0 },
                other: { total: 0, running: 0, ranTodayWithoutTracking: 0, notRunLessThan7Days: 0, notRun7to30Days: 0, notRunMoreThan30Days: 0, scrapped: 0 },
            };
            
            const routesMap = new Map<string, RouteInfo>();
            const emptyFleetBreakdown = (): any => ({ elfac: 0, elf: 0, lf: 0, other: 0 });

            allBusesFromApi.forEach(bus => {
                let fleetTypeKey: keyof typeof breakdown;
                if (bus.id.endsWith('ELFAC')) fleetTypeKey = 'elfac';
                else if (bus.id.endsWith('ELF')) fleetTypeKey = 'elf';
                else if (bus.id.endsWith('LF')) fleetTypeKey = 'lf';
                else fleetTypeKey = 'other';

                breakdown[fleetTypeKey].total++;

                const routeName = bus.route_short_name || 'Unknown';
                if (!routesMap.has(routeName)) {
                    routesMap.set(routeName, {
                        id: routeName,
                        destinations: [], 
                        totalBuses: 0, 
                        runningBuses: emptyFleetBreakdown(),
                        ranTodayWithoutTracking: emptyFleetBreakdown(), 
                        notRunLessThan7Days: 0, 
                        notRun7to30Days: 0, 
                        notRunMoreThan30Days: 0,
                        scrappedBuses: emptyFleetBreakdown(),
                        fleet: emptyFleetBreakdown()
                    });
                }
                const routeInfo = routesMap.get(routeName)!;
                routeInfo.totalBuses++;
                if (bus.trip_headsign && !routeInfo.destinations.includes(bus.trip_headsign)) {
                    routeInfo.destinations.push(bus.trip_headsign);
                }
                routeInfo.fleet[fleetTypeKey]++;

                const lastSeen = bus.lastSeenTimestamp;
                const isScrappedByDate = lastSeen ? lastSeen < scrappedTimestamp : false;
                
                if (bus.sId && String(bus.sId).trim() !== '') { // Running
                    breakdown[fleetTypeKey].running++;
                    routeInfo.runningBuses[fleetTypeKey]++;
                } else { // Not Running
                    if (isScrappedByDate) { // Scrapped by date
                        breakdown[fleetTypeKey].scrapped++;
                        routeInfo.scrappedBuses[fleetTypeKey]++;
                    } else { // Active Idle
                        if (lastSeen && lastSeen >= todayStart) {
                            breakdown[fleetTypeKey].ranTodayWithoutTracking++;
                            routeInfo.ranTodayWithoutTracking[fleetTypeKey]++;
                        } else if (lastSeen && lastSeen >= sevenDaysAgo) {
                            breakdown[fleetTypeKey].notRunLessThan7Days++;
                            routeInfo.notRunLessThan7Days++;
                        } else if (lastSeen && lastSeen >= thirtyDaysAgo) {
                            breakdown[fleetTypeKey].notRun7to30Days++;
                            routeInfo.notRun7to30Days++;
                        } else { 
                            breakdown[fleetTypeKey].notRunMoreThan30Days++;
                            routeInfo.notRunMoreThan30Days++;
                        }
                    }
                }
            });
            
            setRoutesData(Array.from(routesMap.values()));
            
            const sumAllFleets = (prop: keyof typeof breakdown.elfac) => 
                (breakdown.elfac[prop] as number) + (breakdown.elf[prop] as number) + (breakdown.lf[prop] as number) + (breakdown.other[prop] as number);

            const totalRunning = sumAllFleets('running');
            const totalRanToday = sumAllFleets('ranTodayWithoutTracking');
            const totalNotRunLessThan7Days = sumAllFleets('notRunLessThan7Days');
            const totalNotRun7to30Days = sumAllFleets('notRun7to30Days');
            const totalNotRunMoreThan30Days = sumAllFleets('notRunMoreThan30Days');
            const totalScrapped = sumAllFleets('scrapped');
            const totalIdle = totalNotRunLessThan7Days + totalNotRun7to30Days + totalNotRunMoreThan30Days;
            const total = allBusesFromApi.length;

            setDashboardStats({
                total,
                running: totalRunning,
                ranTodayWithoutTracking: totalRanToday,
                notRunLessThan7Days: totalNotRunLessThan7Days,
                notRun7to30Days: totalNotRun7to30Days,
                notRunMoreThan30Days: totalNotRunMoreThan30Days,
                scrapped: totalScrapped,
                elfac: breakdown.elfac,
                elf: breakdown.elf,
                lf: breakdown.lf,
                other: breakdown.other,
            });

            setStatusCounts({
                total,
                running: totalRunning,
                ranTodayWithoutTracking: totalRanToday,
                idle: totalIdle,
                scrapped: totalScrapped,
            });
            
            setAllBuses(allBusesFromApi);
            setLastUpdated(new Date());

        } catch (e) {
            console.error("Failed to fetch bus data:", e);
            const errorMessage = e instanceof Error ? e.message : "An unknown error occurred";
            setError(t('errorFetch', { error: errorMessage }));
        } finally {
            setLoading(false);
            isFetching.current = false;
        }
    }, [t, scrappedDate]);

    useEffect(() => {
        fetchBusData();
        const intervalId = setInterval(fetchBusData, REFRESH_INTERVAL);
        return () => clearInterval(intervalId);
    }, [fetchBusData]);

    const busesForTable = useMemo(() => {
        const todayStart = new Date().setHours(0, 0, 0, 0);
        const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
        const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
        const scrappedTimestamp = new Date(scrappedDate).setHours(0, 0, 0, 0);

        return allBuses
            .filter(bus => { // Status filter
                const lastSeen = bus.lastSeenTimestamp;
                const isScrappedByDate = lastSeen ? lastSeen < scrappedTimestamp : false;
                const isRunning = bus.sId && String(bus.sId).trim() !== '';

                switch (statusFilter) {
                    case 'running':
                        return !isScrappedByDate && isRunning;
                    case 'ranToday':
                        return !isScrappedByDate && !isRunning && 
                               lastSeen && lastSeen >= todayStart;
                    case 'idleOver7d':
                        return !isScrappedByDate && !isRunning &&
                               lastSeen && lastSeen < sevenDaysAgo;
                    case 'idleOver30d':
                         return !isScrappedByDate && !isRunning &&
                               lastSeen && lastSeen < thirtyDaysAgo;
                    case 'scrapped':
                        return !isRunning && isScrappedByDate;
                    case 'all':
                    default:
                        return true;
                }
            })
            .filter(bus => { // Fleet type filter
                if (fleetFilter === 'all') return true;
                switch (fleetFilter) {
                    case 'lf': return bus.id.endsWith('LF');
                    case 'elf': return bus.id.endsWith('ELF');
                    case 'elfac': return bus.id.endsWith('ELFAC');
                    case 'other': return !bus.id.endsWith('LF') && !bus.id.endsWith('ELF') && !bus.id.endsWith('ELFAC');
                    default: return true;
                }
            })
            .filter(bus => { // Series filter
                if (seriesFilter === 'all') return true;
                if (!bus.id || bus.id.length < 1) return false;
                const seriesChar = bus.id.charAt(0).toUpperCase();
                switch (seriesFilter) {
                    case 'h': return seriesChar === 'H';
                    case 'i': return seriesChar === 'I';
                    case 'j': return seriesChar === 'J';
                    case 'k': return seriesChar === 'K';
                    case 'c': return seriesChar === 'C';
                }
                return false;
            });
    }, [allBuses, statusFilter, fleetFilter, seriesFilter, scrappedDate]);

    const filteredBuses = useMemo(() => {
        if (!filterValue) return busesForTable;
        return busesForTable.filter(bus => {
            if (filterKey === 'all') {
                return Object.values(bus).some(val =>
                    String(val).toLowerCase().includes(filterValue.toLowerCase())
                );
            }
            const busValue = bus[filterKey as keyof BusData];
            return busValue !== undefined && String(busValue).toLowerCase().includes(filterValue.toLowerCase());
        });
    }, [busesForTable, filterKey, filterValue]);

    const sortedBuses = useMemo(() => {
        let sortableItems = [...filteredBuses];
        if (sortConfig !== null) {
            sortableItems.sort((a, b) => {
                const aValue = a[sortConfig.key];
                const bValue = b[sortConfig.key];
                if (aValue === undefined || aValue < bValue) {
                    return sortConfig.direction === 'ascending' ? -1 : 1;
                }
                if (bValue === undefined || aValue > bValue) {
                    return sortConfig.direction === 'ascending' ? 1 : -1;
                }
                return 0;
            });
        }
        return sortableItems;
    }, [filteredBuses, sortConfig]);

    const handleSort = (key: keyof BusData) => {
        let direction: 'ascending' | 'descending' = 'ascending';
        if (sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
    };
    
    const tableColumns = useMemo((): TableColumn[] => [
        { key: 'id', header: t('tableColVehicleID') },
        { key: 'route_short_name', header: t('tableColRoute') },
        { key: 'trip_headsign', header: t('tableColDestination') },
        { key: 'lastSeenTimestamp', header: t('tableColLastUpdate'), render: (ts) => ts ? new Date(ts).toLocaleString() : '-' },
        { 
            key: 'agency_name', 
            header: t('tableColAgency'), 
            render: (_value, bus) => {
                if (bus.id.endsWith('ELFAC') || bus.id.endsWith('ELF')) {
                    return 'Switch Mobility';
                }
                return 'MTC';
            }
        }
    ], [t]);

    const viewTitles: { [key in View]: string } = {
        [View.Home]: t('homeTitle'),
        [View.Dashboard]: t('navDashboard'),
        [View.Fleet]: t('navFleet'),
        [View.Routes]: t('navRoutes'),
    };

    return (
        <div className="flex h-screen bg-gray-100 font-sans">
            <Sidebar 
                currentView={view} 
                setView={setView} 
                isSidebarOpen={isSidebarOpen} 
                setIsSidebarOpen={setIsSidebarOpen} 
            />
            <div className="flex-1 flex flex-col overflow-hidden">
                <header className="bg-white shadow-md z-20">
                    <div className="container mx-auto px-4 py-3 flex justify-between items-center">
                        <div className="flex items-center min-w-0">
                            <button className="text-gray-500 focus:outline-none md:hidden" onClick={() => setIsSidebarOpen(true)} aria-label="Open sidebar">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"></path></svg>
                            </button>
                            <h1 className="text-lg sm:text-xl font-bold text-gray-800 ml-2 md:ml-0 truncate">{viewTitles[view]}</h1>
                        </div>
                        <div className="flex items-center space-x-2 sm:space-x-4">
                            <LanguageSwitcher />
                            <button onClick={() => fetchBusData()} disabled={loading} className="p-2 rounded-full hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed" aria-label="Refresh Data">
                               <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 text-gray-600 ${loading ? 'animate-spin' : ''}`} viewBox="0 0 20 20" fill="currentColor">
                                 <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 110 2H4a1 1 0 01-1-1V4a1 1 0 011 1zm12 14a1 1 0 01-1-1v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 111.885-.666A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v4a1 1 0 01-1 1z" clipRule="evenodd" />
                               </svg>
                            </button>
                        </div>
                    </div>
                </header>

                <main className="flex-grow overflow-y-auto relative">
                    {error && <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-yellow-400 text-yellow-900 px-4 py-2 rounded-md shadow-lg z-20">{error}</div>}
                    
                    {loading && dashboardStats.total === 0 && <Loader text={t('loaderFetching')} />}

                    <div className={`${view === View.Home ? 'block' : 'hidden'} h-full w-full`}>
                       <HomePage stats={dashboardStats} />
                    </div>
                    <div className={`${view === View.Dashboard ? 'block' : 'hidden'} h-full w-full`}>
                        <MapView 
                            stats={dashboardStats}
                            scrappedDate={scrappedDate}
                            setScrappedDate={setScrappedDate}
                        />
                    </div>
                    <div className={`${view === View.Fleet ? 'block' : 'hidden'} h-full w-full`}>
                        <FleetView 
                            buses={sortedBuses} 
                            columns={tableColumns}
                            filterKey={filterKey}
                            setFilterKey={setFilterKey}
                            filterValue={filterValue}
                            setFilterValue={setFilterValue}
                            sortConfig={sortConfig}
                            handleSort={handleSort}
                            statusFilter={statusFilter}
                            setStatusFilter={setStatusFilter}
                            fleetFilter={fleetFilter}
                            setFleetFilter={setFleetFilter}
                            seriesFilter={seriesFilter}
                            setSeriesFilter={setSeriesFilter}
                            scrappedDate={scrappedDate}
                            setScrappedDate={setScrappedDate}
                        />
                    </div>
                    <div className={`${view === View.Routes ? 'block' : 'hidden'} h-full w-full`}>
                        <RoutesView data={routesData} />
                    </div>
                </main>

                <footer className="bg-gray-800 text-white text-xs p-2 z-10">
                    <div className="container mx-auto grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2 text-center items-center">
                        <span className="font-bold">{t('footerTotal')}: <span className="font-normal">{statusCounts.total}</span></span>
                        <span className="text-green-400 font-bold">{t('footerRunning')}: <span className="font-normal">{statusCounts.running}</span></span>
                        <span className="text-yellow-400 font-bold">{t('footerRanToday')}: <span className="font-normal">{statusCounts.ranTodayWithoutTracking}</span></span>
                        <span className="text-orange-400 font-bold">{t('footerIdle')}: <span className="font-normal">{statusCounts.idle}</span></span>
                         <span className="text-gray-400 font-bold">{t('footerScrapped')}: <span className="font-normal">{statusCounts.scrapped}</span></span>
                        <span className="col-span-2 sm:col-span-4 md:col-span-1 text-right md:text-center">{lastUpdated ? `${t('footerLastUpdated')}: ${lastUpdated.toLocaleTimeString()}` : t('footerUpdating')}</span>
                    </div>
                </footer>
            </div>
        </div>
    );
};

export default App;
