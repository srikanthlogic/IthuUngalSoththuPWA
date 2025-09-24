import React, { useState, useMemo } from 'react';
import { RouteInfo, FleetBreakdown } from '../types';
import { useTranslation } from '../context/LanguageContext';

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
        `${t('routesColRunning')} ${t('routesColELFAC')}`, `${t('routesColRunning')} ${t('routesColELF')}`, `${t('routesColRunning')} ${t('routesColLF')}`, `${t('routesColRunning')} ${t('routesColOther')}`, `${t('routesColRunning')} Total`,
        `${t('routesColRanToday')} ${t('routesColELFAC')}`, `${t('routesColRanToday')} ${t('routesColELF')}`, `${t('routesColRanToday')} ${t('routesColLF')}`, `${t('routesColRanToday')} ${t('routesColOther')}`, `${t('routesColRanToday')} Total`,
        `${t('routesColScrapped')} ${t('routesColELFAC')}`, `${t('routesColScrapped')} ${t('routesColELF')}`, `${t('routesColScrapped')} ${t('routesColLF')}`, `${t('routesColScrapped')} ${t('routesColOther')}`, `${t('routesColScrapped')} Total`,
        'Utilization (%)',
        `${t('routesHeaderIdleStatus')} <7d`, `${t('routesHeaderIdleStatus')} 7-30d`, `${t('routesHeaderIdleStatus')} >30d`, `${t('routesHeaderIdleStatus')} Total`,
        `${t('routesHeaderTotalFleet')} ${t('routesColELFAC')}`, `${t('routesHeaderTotalFleet')} ${t('routesColELF')}`, `${t('routesHeaderTotalFleet')} ${t('routesColLF')}`, `${t('routesHeaderTotalFleet')} ${t('routesColOther')}`
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
            <span title={t('fleetLF')} className={`font-semibold px-2 py-0.5 rounded-full ${colorClasses.lf}`}>{counts.lf}</span>
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


const RoutesView: React.FC<RoutesViewProps> = ({ data }) => {
    const [filterValue, setFilterValue] = useState('');
    const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'totalRunning', direction: 'descending' });
    const { t } = useTranslation();

    const filteredData = useMemo(() => {
        if (!filterValue) return data;
        const lowercasedFilter = filterValue.toLowerCase();
        return data.filter(route =>
            route.id.toLowerCase().includes(lowercasedFilter) ||
            route.destinations.some(d => d.toLowerCase().includes(lowercasedFilter))
        );
    }, [data, filterValue]);

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
                            return route.totalBuses > 0 ? totalActive / route.totalBuses : 0;
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
    
    const thClass = "px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer select-none";
    const groupThClass = "px-2 py-2 text-center text-xs font-semibold text-gray-700 uppercase bg-gray-200";

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
                <table className="min-w-full divide-y divide-gray-200 border-collapse">
                    <thead className="bg-gray-100 sticky top-0 z-20">
                        <tr>
                            <th colSpan={2} className={groupThClass}>{t('routesHeaderInfo')}</th>
                            <th colSpan={4} className={groupThClass}>{t('routesHeaderLiveStatus')}</th>
                            <th colSpan={1} className={groupThClass}>{t('routesHeaderUtilization')}</th>
                            <th colSpan={3} className={groupThClass}>{t('routesHeaderIdleStatus')}</th>
                            <th colSpan={4} className={groupThClass}>{t('routesHeaderTotalFleet')}</th>
                        </tr>
                        <tr>
                            <th onClick={() => handleSort('id')} className={`${thClass} sticky left-0 bg-gray-100 z-30 w-24`}><div className="flex items-center"><span>{t('routesColRoute')}</span><span className="ml-1 w-4">{renderSortArrow('id')}</span></div></th>
                            <th className={`${thClass} w-1/4`}>{t('routesColDestinations')}</th>
                            <th onClick={() => handleSort('totalRunning')} className={thClass}><div className="flex items-center"><span>{t('routesColRunning')}</span><span className="ml-1 w-4">{renderSortArrow('totalRunning')}</span></div></th>
                            <th onClick={() => handleSort('totalRanToday')} className={thClass}><div className="flex items-center"><span>{t('routesColRanToday')}</span><span className="ml-1 w-4">{renderSortArrow('totalRanToday')}</span></div></th>
                             <th onClick={() => handleSort('totalScrapped')} className={thClass}><div className="flex items-center"><span>{t('routesColScrapped')}</span><span className="ml-1 w-4">{renderSortArrow('totalScrapped')}</span></div></th>
                            <th onClick={() => handleSort('totalBuses')} className={thClass}><div className="flex items-center"><span>{t('routesColTotal')}</span><span className="ml-1 w-4">{renderSortArrow('totalBuses')}</span></div></th>
                            <th onClick={() => handleSort('utilization')} className={thClass}><div className="flex items-center"><span>{t('routesColActiveTotal')}</span><span className="ml-1 w-4">{renderSortArrow('utilization')}</span></div></th>
                            <th onClick={() => handleSort('notRunLessThan7Days')} className={thClass}><div className="flex items-center justify-center"><span>{t('routesColIdle7d')}</span><span className="ml-1 w-4">{renderSortArrow('notRunLessThan7Days')}</span></div></th>
                            <th onClick={() => handleSort('notRun7to30Days')} className={thClass}><div className="flex items-center justify-center"><span>{t('routesColIdle7_30d')}</span><span className="ml-1 w-4">{renderSortArrow('notRun7to30Days')}</span></div></th>
                            <th onClick={() => handleSort('notRunMoreThan30Days')} className={thClass}><div className="flex items-center justify-center"><span>{t('routesColIdle30d')}</span><span className="ml-1 w-4">{renderSortArrow('notRunMoreThan30Days')}</span></div></th>
                            <th onClick={() => handleSort('elfac')} className={thClass}><div className="flex items-center"><span>{t('routesColELFAC')}</span><span className="ml-1 w-4">{renderSortArrow('elfac')}</span></div></th>
                            <th onClick={() => handleSort('elf')} className={thClass}><div className="flex items-center"><span>{t('routesColELF')}</span><span className="ml-1 w-4">{renderSortArrow('elf')}</span></div></th>
                            <th onClick={() => handleSort('lf')} className={thClass}><div className="flex items-center"><span>{t('routesColLF')}</span><span className="ml-1 w-4">{renderSortArrow('lf')}</span></div></th>
                            <th onClick={() => handleSort('other')} className={thClass}><div className="flex items-center"><span>{t('routesColOther')}</span><span className="ml-1 w-4">{renderSortArrow('other')}</span></div></th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {sortedData.length > 0 ? sortedData.map(route => {
                            const totalRunning = sumFleet(route.runningBuses);
                            const totalRanToday = sumFleet(route.ranTodayWithoutTracking);
                            const totalActive = totalRunning + totalRanToday;

                            return (
                                <tr key={route.id} className="hover:bg-gray-50 group">
                                    <td className="px-2 py-2 whitespace-nowrap text-sm font-bold text-gray-900 sticky left-0 bg-white group-hover:bg-gray-50 z-10">{route.id}</td>
                                    <td className="px-2 py-2 text-xs text-gray-600 max-w-xs truncate" title={route.destinations.join(', ')}>{route.destinations.join(', ')}</td>
                                    <td className="px-2 py-2 whitespace-nowrap text-sm text-center"><FleetCountDisplay counts={route.runningBuses} /></td>
                                    <td className="px-2 py-2 whitespace-nowrap text-sm text-center"><FleetCountDisplay counts={route.ranTodayWithoutTracking} /></td>
                                    <td className="px-2 py-2 whitespace-nowrap text-sm text-center"><FleetCountDisplay counts={route.scrappedBuses} type="scrapped" /></td>
                                    <td className="px-2 py-2 whitespace-nowrap text-sm text-gray-700 font-semibold text-center">{route.totalBuses}</td>
                                    <td className="px-2 py-2 whitespace-nowrap text-sm text-center">
                                        <div className="font-semibold text-gray-800">{`${totalActive} / ${route.totalBuses}`}</div>
                                        <UtilizationBar total={route.totalBuses} active={totalActive} />
                                    </td>
                                    <td className="px-2 py-2 whitespace-nowrap text-sm text-orange-600 text-center">{route.notRunLessThan7Days}</td>
                                    <td className="px-2 py-2 whitespace-nowrap text-sm text-red-500 text-center">{route.notRun7to30Days}</td>
                                    <td className="px-2 py-2 whitespace-nowrap text-sm text-red-700 text-center">{route.notRunMoreThan30Days}</td>
                                    <td className="px-2 py-2 whitespace-nowrap text-sm text-blue-600 text-center">{route.fleet.elfac}</td>
                                    <td className="px-2 py-2 whitespace-nowrap text-sm text-teal-600 text-center">{route.fleet.elf}</td>
                                    <td className="px-2 py-2 whitespace-nowrap text-sm text-indigo-600 text-center">{route.fleet.lf}</td>
                                    <td className="px-2 py-2 whitespace-nowrap text-sm text-gray-600 text-center">{route.fleet.other}</td>
                                </tr>
                            );
                        }) : (
                           <tr>
                             <td colSpan={14} className="text-center py-10 text-gray-500">
                               {t('routesViewNoRoutes')}
                             </td>
                           </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default RoutesView;
