
import React, { useState, useMemo, useEffect } from 'react';
import { RouteInfo, FleetBreakdown } from '../types';
import { useTranslation } from '../context/LanguageContext';
import Pagination from './Pagination';
import TooltipIcon from './TooltipIcon';

type SortKey = keyof Omit<RouteInfo, 'fleet' | 'destinations' | 'runningBuses' | 'ranTodayWithoutTracking' | 'scrappedBuses'> | 'totalRunning' | 'totalRanToday' | 'utilization' | 'totalIdle' | 'totalScrapped' | 'elfac' | 'elf' | 'lf' | 'other';

interface SortConfig {
    key: SortKey;
    direction: 'ascending' | 'descending';
}

interface RoutesViewProps {
    data: RouteInfo[];
}

const sumFleet = (fleet: FleetBreakdown) => Object.values(fleet).reduce((s, c) => s + c, 0);

const exportRoutesToCSV = (routes: RouteInfo[], t: (key: string) => string) => {
    if (routes.length === 0) return;
    const headers = [
        t('routesColRoute'), t('routesColDestinations'), t('routesColTotal'), 
        `${t('routesColRunning')} ${t('routesColELFAC')}`, `${t('routesColRunning')} ${t('routesColELF')}`, `${t('routesColRunning')} ${t('routesColDieselLF')}`, `${t('routesColRunning')} ${t('routesColOther')}`, `${t('routesColRunning')} Total`,
        `${t('routesColRanToday')} ${t('routesColELFAC')}`, `${t('routesColRanToday')} ${t('routesColELF')}`, `${t('routesColRanToday')} ${t('routesColDieselLF')}`, `${t('routesColRanToday')} ${t('routesColOther')}`, `${t('routesColRanToday')} Total`,
        `${t('routesColScrapped')} ${t('routesColELFAC')}`, `${t('routesColScrapped')} ${t('routesColELF')}`, `${t('routesColScrapped')} ${t('routesColDieselLF')}`, `${t('routesColScrapped')} ${t('routesColOther')}`, `${t('routesColScrapped')} Total`,
        'Utilization (%)',
        `${t('routesHeaderIdleStatus')} <7d`, `${t('routesHeaderIdleStatus')} 7-30d`, `${t('routesHeaderIdleStatus')} >30d`, `${t('routesHeaderIdleStatus')} Total`,
        `${t('routesHeaderTotalFleet')} ${t('routesColELFAC')}`, `${t('routesHeaderTotalFleet')} ${t('routesColELF')}`, `${t('routesHeaderTotalFleet')} ${t('routesColDieselLF')}`, `${t('routesHeaderTotalFleet')} ${t('routesColOther')}`
    ];
    const headerRow = headers.join(',') + '\n';
    const rows = routes.map(route => {
        const totalRunning = sumFleet(route.runningBuses);
        const totalRanToday = sumFleet(route.ranTodayWithoutTracking);
        const totalScrapped = sumFleet(route.scrappedBuses);
        const totalActive = totalRunning + totalRanToday;
        const utilization = route.totalBuses > 0 ? (totalActive / route.totalBuses) * 100 : 0;
        const totalIdle = route.notRunLessThan7Days + route.notRun7to30Days + route.notRunMoreThan30Days;

        const rowData = [
            route.id,
            route.destinations.join('; '),
            route.totalBuses,
            route.runningBuses.elfac, route.runningBuses.elf, route.runningBuses.lf, route.runningBuses.other, totalRunning,
            route.ranTodayWithoutTracking.elfac, route.ranTodayWithoutTracking.elf, route.ranTodayWithoutTracking.lf, route.ranTodayWithoutTracking.other, totalRanToday,
            route.scrappedBuses.elfac, route.scrappedBuses.elf, route.scrappedBuses.lf, route.scrappedBuses.other, totalScrapped,
            utilization.toFixed(2),
            route.notRunLessThan7Days, route.notRun7to30Days, route.notRunMoreThan30Days, totalIdle,
            route.fleet.elfac, route.fleet.elf, route.fleet.lf, route.fleet.other
        ].map(d => `"${String(d).replace(/"/g, '""')}"`).join(',');
        return rowData;
    }).join('\n');

    const csvContent = headerRow + rows;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `mtc_routes_report_${new Date().toISOString()}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
};

const FleetCountDisplay: React.FC<{ counts: FleetBreakdown; type?: 'normal' | 'scrapped' }> = ({ counts, type = 'normal' }) => {
    const { t } = useTranslation();
    const colorClasses = {
        elfac: type === 'scrapped' ? 'text-gray-500 bg-gray-200' : 'text-blue-600 bg-blue-100',
        elf: type === 'scrapped' ? 'text-gray-500 bg-gray-200' : 'text-teal-600 bg-teal-100',
        lf: type === 'scrapped' ? 'text-gray-500 bg-gray-200' : 'text-indigo-600 bg-indigo-100',
        other: 'text-gray-600 bg-gray-200',
    };
    return (
        <div className="flex items-center justify-center space-x-2 text-xs">
            <span title={t('fleetELFAC')} className={`font-semibold px-2 py-0.5 rounded-full ${colorClasses.elfac}`}>{counts.elfac}</span>
            <span title={t('fleetELF')} className={`font-semibold px-2 py-0.5 rounded-full ${colorClasses.elf}`}>{counts.elf}</span>
            <span title={t('fleetDieselLF')} className={`font-semibold px-2 py-0.5 rounded-full ${colorClasses.lf}`}>{counts.lf}</span>
            <span title={t('fleetOther')} className={`font-semibold px-2 py-0.5 rounded-full ${colorClasses.other}`}>{counts.other}</span>
        </div>
    );
}

const UtilizationBar: React.FC<{ total: number, active: number }> = ({ total, active }) => {
    const { t } = useTranslation();
    const percentage = total > 0 ? (active / total) * 100 : 0;
    let barColor = 'bg-green-500';
    if (percentage < 75) barColor = 'bg-yellow-500';
    if (percentage < 50) barColor = 'bg-orange-500';
    if (percentage < 25) barColor = 'bg-red-500';
    
    return (
        <div className="w-full bg-gray-200 rounded-full h-2.5 my-1" title={t('utilizationTitle', {percentage: percentage.toFixed(1)})}>
            <div className={`${barColor} h-2.5 rounded-full`} style={{ width: `${percentage}%` }}></div>
        </div>
    );
};

const ROWS_PER_PAGE = 50;

const RoutesView: React.FC<RoutesViewProps> = ({ data }) => {
    const [filterValue, setFilterValue] = useState('');
    const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'totalRunning', direction: 'descending' });
    const [currentPage, setCurrentPage] = useState(1);
    const { t } = useTranslation();

    const filteredData = useMemo(() => {
        if (!filterValue) return data;
        const lowercasedFilter = filterValue.toLowerCase();
        return data.filter(route =>
            route.id.toLowerCase().includes(lowercasedFilter) ||
            route.destinations.some(d => d.toLowerCase().includes(lowercasedFilter))
        );
    }, [data, filterValue]);

    // Reset page when filter or sort changes
    useEffect(() => {
        setCurrentPage(1);
    }, [filteredData, sortConfig]);

    const sortedData = useMemo(() => {
        let sortableItems = [...filteredData];
        if (sortConfig) {
            sortableItems.sort((a, b) => {
                const { key, direction } = sortConfig;
                let aValue: number | string;
                let bValue: number | string;

                const getSortValue = (route: RouteInfo, sortKey: SortKey): number | string => {
                    switch(sortKey) {
                        case 'totalRunning': return sumFleet(route.runningBuses);
                        case 'totalRanToday': return sumFleet(route.ranTodayWithoutTracking);
                        case 'totalScrapped': return sumFleet(route.scrappedBuses);
                        case 'utilization': 
                            const totalActive = sumFleet(route.runningBuses) + sumFleet(route.ranTodayWithoutTracking);
                            return route.totalBuses - totalActive;
                        case 'totalIdle': return route.notRunLessThan7Days + route.notRun7to30Days + route.notRunMoreThan30Days;
                        case 'elfac': case 'elf': case 'lf': case 'other': return route.fleet[sortKey];
                        default: return route[sortKey as keyof Omit<RouteInfo, 'fleet' | 'destinations' | 'runningBuses' | 'ranTodayWithoutTracking' | 'scrappedBuses'>];
                    }
                }
                
                aValue = getSortValue(a, key);
                bValue = getSortValue(b, key);

                if (aValue < bValue) return direction === 'ascending' ? -1 : 1;
                if (aValue > bValue) return direction === 'ascending' ? 1 : -1;
                return 0;
            });
        }
        return sortableItems;
    }, [filteredData, sortConfig]);
    
    const paginatedData = useMemo(() => {
        const startIndex = (currentPage - 1) * ROWS_PER_PAGE;
        const endIndex = startIndex + ROWS_PER_PAGE;
        return sortedData.slice(startIndex, endIndex);
    }, [sortedData, currentPage]);
    
    const totalPages = Math.ceil(sortedData.length / ROWS_PER_PAGE);

    const handleSort = (key: SortKey) => {
        let direction: 'ascending' | 'descending' = 'ascending';
        if (sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
    };

    const renderSortArrow = (key: SortKey) => {
        if (sortConfig.key !== key) return null;
        return sortConfig.direction === 'ascending' ? '▲' : '▼';
    };
    
    const thClass = "px-4 py-4 text-left text-sm font-medium text-gray-500 uppercase tracking-wider cursor-pointer select-none";
    const groupThClass = "px-4 py-4 text-center text-sm font-semibold text-gray-700 uppercase bg-gray-200";

    return (
        <div className="h-full w-full flex flex-col bg-gray-50">
            <div className="p-3 bg-white border-b border-gray-200 shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
                <input
                    type="text"
                    placeholder={t('routesViewFilterPlaceholder')}
                    value={filterValue}
                    onChange={(e) => setFilterValue(e.target.value)}
                    className="p-2 border border-gray-300 rounded-md w-full sm:w-auto sm:flex-grow focus:ring-2 focus:ring-red-500 focus:border-red-500"
                />
                <button
                    onClick={() => exportRoutesToCSV(sortedData, t)}
                    className="px-4 py-2 bg-green-600 text-white font-semibold rounded-md hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={sortedData.length === 0}
                >
                    {t('routesViewExportCSV')}
                </button>
            </div>

            <div className="flex-grow overflow-auto">
                <div className="block sm:table w-full sm:min-w-full divide-y sm:divide-y divide-gray-200">
                    <div className="hidden sm:table-header-group bg-gray-100 sticky top-0 z-20">
                        <div className="hidden sm:table-row">
                            <div onClick={() => handleSort('id')} className={`${thClass} block sm:table-cell sticky left-0 bg-gray-100 z-30 w-24`}><div className="flex items-center"><span>{t('routesColRoute')}</span><span className="ml-1 w-4">{renderSortArrow('id')}</span></div></div>
                            <div className={`${thClass} block sm:table-cell w-1/4`}>{t('routesColDestinations')}</div>
                            <div onClick={() => handleSort('totalRunning')} className={`${thClass} block sm:table-cell`}><div className="flex items-center"><span>{t('routesColRunning')}</span><span className="ml-1 w-4">{renderSortArrow('totalRunning')}</span></div></div>
                             <div onClick={() => handleSort('totalRanToday')} className={`${thClass} block sm:table-cell`}><div className="flex items-center"><span>{t('routesColRanToday')}</span><span className="ml-1 w-4">{renderSortArrow('totalRanToday')}</span></div></div>
                              <div onClick={() => handleSort('totalScrapped')} className={`${thClass} block sm:table-cell`}><div className="flex items-center"><span>{t('routesColScrapped')}</span><TooltipIcon tooltipText={t('deemedScrappedTooltip')} /><span className="ml-1 w-4">{renderSortArrow('totalScrapped')}</span></div></div>
                            <div onClick={() => handleSort('totalBuses')} className={`${thClass} block sm:table-cell`}><div className="flex items-center"><span>{t('routesColTotal')}</span><span className="ml-1 w-4">{renderSortArrow('totalBuses')}</span></div></div>
                            <div onClick={() => handleSort('utilization')} className={`${thClass} block sm:table-cell`}><div className="flex items-center"><span>{t('routesColActiveTotal')}</span><span className="ml-1 w-4">{renderSortArrow('utilization')}</span></div></div>
                            <div onClick={() => handleSort('notRunLessThan7Days')} className={`${thClass} block sm:table-cell`}><div className="flex items-center justify-center"><span>{t('routesColIdle7d')}</span><span className="ml-1 w-4">{renderSortArrow('notRunLessThan7Days')}</span></div></div>
                            <div onClick={() => handleSort('notRun7to30Days')} className={`${thClass} block sm:table-cell`}><div className="flex items-center justify-center"><span>{t('routesColIdle7_30d')}</span><span className="ml-1 w-4">{renderSortArrow('notRun7to30Days')}</span></div></div>
                            <div onClick={() => handleSort('notRunMoreThan30Days')} className={`${thClass} block sm:table-cell`}><div className="flex items-center justify-center"><span>{t('routesColIdle30d')}</span><span className="ml-1 w-4">{renderSortArrow('notRunMoreThan30Days')}</span></div></div>
                            <div onClick={() => handleSort('elfac')} className={`${thClass} block sm:table-cell`}><div className="flex items-center"><span>{t('routesColELFAC')}</span><span className="ml-1 w-4">{renderSortArrow('elfac')}</span></div></div>
                            <div onClick={() => handleSort('elf')} className={`${thClass} block sm:table-cell`}><div className="flex items-center"><span>{t('routesColELF')}</span><span className="ml-1 w-4">{renderSortArrow('elf')}</span></div></div>
                            <div onClick={() => handleSort('lf')} className={`${thClass} block sm:table-cell`}><div className="flex items-center"><span>{t('routesColDieselLF')}</span><span className="ml-1 w-4">{renderSortArrow('lf')}</span></div></div>
                            <div onClick={() => handleSort('other')} className={`${thClass} block sm:table-cell`}><div className="flex items-center"><span>{t('routesColOther')}</span><span className="ml-1 w-4">{renderSortArrow('other')}</span></div></div>
                        </div>
                    </div>
                    <div className="table-row-group bg-white">
                        {paginatedData.length > 0 ? paginatedData.map(route => {
                            const totalRunning = sumFleet(route.runningBuses);
                            const totalRanToday = sumFleet(route.ranTodayWithoutTracking);
                            const totalActive = totalRunning + totalRanToday;
                
                            return (
                                <div key={route.id} className="table-row block bg-white rounded-lg shadow-sm p-4 mb-4 sm:table-row sm:bg-transparent sm:shadow-none sm:p-0 sm:mb-0 hover:bg-gray-50 group sm:border-b sm:border-gray-200">
                                    <div className="table-cell block sm:table-cell px-4 py-4 mb-2 sm:mb-0 last:mb-0 whitespace-nowrap text-sm font-bold text-gray-900 sticky left-0 bg-white group-hover:bg-gray-50 z-10 sm:sticky sm:left-0">
                                        <span className="block font-medium text-gray-500 sm:hidden">{t('routesColRoute')}:</span>
                                        {route.id}
                                    </div>
                                    <div className="table-cell block sm:table-cell px-4 py-4 mb-2 sm:mb-0 last:mb-0 text-sm text-gray-600 w-full sm:w-1/4 sm:max-w-xs sm:truncate" title={route.destinations.join(', ')}>
                                        <span className="block font-medium text-gray-500 sm:hidden">{t('routesColDestinations')}:</span>
                                        {route.destinations.join(', ')}
                                    </div>
                                    <div className="table-cell block sm:table-cell px-4 py-4 mb-2 sm:mb-0 last:mb-0 whitespace-nowrap text-sm text-center">
                                        <span className="block font-medium text-gray-500 sm:hidden">{t('routesColRunning')}:</span>
                                        <FleetCountDisplay counts={route.runningBuses} />
                                    </div>
                                    <div className="table-cell block sm:table-cell px-4 py-4 mb-2 sm:mb-0 last:mb-0 whitespace-nowrap text-sm text-center">
                                        <span className="block font-medium text-gray-500 sm:hidden">{t('routesColRanToday')}:</span>
                                        <FleetCountDisplay counts={route.ranTodayWithoutTracking} />
                                    </div>
                                    <div className="table-cell block sm:table-cell px-4 py-4 mb-2 sm:mb-0 last:mb-0 whitespace-nowrap text-sm text-center">
                                        <span className="block font-medium text-gray-500 sm:hidden">{t('routesColScrapped')}:</span>
                                        <FleetCountDisplay counts={route.scrappedBuses} type="scrapped" />
                                    </div>
                                    <div className="table-cell block sm:table-cell px-4 py-4 mb-2 sm:mb-0 last:mb-0 whitespace-nowrap text-sm text-gray-700 font-semibold text-center">
                                        <span className="block font-medium text-gray-500 sm:hidden">{t('routesColTotal')}:</span>
                                        {route.totalBuses}
                                    </div>
                                    <div className="table-cell block sm:table-cell px-4 py-4 mb-2 sm:mb-0 last:mb-0 text-sm text-center">
                                        <span className="block font-medium text-gray-500 sm:hidden">{t('routesColActiveTotal')}:</span>
                                        <div className="font-semibold text-gray-800">{`${totalActive} / ${route.totalBuses}`}</div>
                                        <UtilizationBar total={route.totalBuses} active={totalActive} />
                                    </div>
                                    <div className="table-cell block sm:table-cell px-4 py-4 mb-2 sm:mb-0 last:mb-0 whitespace-nowrap text-sm text-orange-600 text-center">
                                        <span className="block font-medium text-gray-500 sm:hidden">{t('routesColIdle7d')}:</span>
                                        {route.notRunLessThan7Days}
                                    </div>
                                    <div className="table-cell block sm:table-cell px-4 py-4 mb-2 sm:mb-0 last:mb-0 whitespace-nowrap text-sm text-red-500 text-center">
                                        <span className="block font-medium text-gray-500 sm:hidden">{t('routesColIdle7_30d')}:</span>
                                        {route.notRun7to30Days}
                                    </div>
                                    <div className="table-cell block sm:table-cell px-4 py-4 mb-2 sm:mb-0 last:mb-0 whitespace-nowrap text-sm text-red-700 text-center">
                                        <span className="block font-medium text-gray-500 sm:hidden">{t('routesColIdle30d')}:</span>
                                        {route.notRunMoreThan30Days}
                                    </div>
                                    <div className="table-cell block sm:table-cell px-4 py-4 mb-2 sm:mb-0 last:mb-0 whitespace-nowrap text-sm text-blue-600 text-center">
                                        <span className="block font-medium text-gray-500 sm:hidden">{t('routesColELFAC')}:</span>
                                        {route.fleet.elfac}
                                    </div>
                                    <div className="table-cell block sm:table-cell px-4 py-4 mb-2 sm:mb-0 last:mb-0 whitespace-nowrap text-sm text-teal-600 text-center">
                                        <span className="block font-medium text-gray-500 sm:hidden">{t('routesColELF')}:</span>
                                        {route.fleet.elf}
                                    </div>
                                    <div className="table-cell block sm:table-cell px-4 py-4 mb-2 sm:mb-0 last:mb-0 whitespace-nowrap text-sm text-indigo-600 text-center">
                                        <span className="block font-medium text-gray-500 sm:hidden">{t('routesColDieselLF')}:</span>
                                        {route.fleet.lf}
                                    </div>
                                    <div className="table-cell block sm:table-cell px-4 py-4 mb-2 sm:mb-0 last:mb-0 whitespace-nowrap text-sm text-gray-600 text-center">
                                        <span className="block font-medium text-gray-500 sm:hidden">{t('routesColOther')}:</span>
                                        {route.fleet.other}
                                    </div>
                                </div>
                            );
                        }) : (
                           <div className="table-row block sm:table-row">
                             <div className="table-cell block sm:table-cell col-span-14 text-center py-10 text-gray-500">
                               {t('routesViewNoRoutes')}
                             </div>
                           </div>
                        )}
                    </div>
                </div>
            </div>
            
            {/* Pagination Controls */}
            <div className="flex-shrink-0">
                 <Pagination 
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={setCurrentPage}
                />
            </div>
        </div>
    );
};

export default RoutesView;