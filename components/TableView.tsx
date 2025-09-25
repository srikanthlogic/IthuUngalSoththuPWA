import React, { useMemo, useState } from 'react';
import { BusData, SortConfig, TableColumn, StatusFilter, FleetFilter, SeriesFilter } from '../types';
import { useTranslation } from '../context/LanguageContext';

interface FleetViewProps {
    buses: BusData[];
    columns: TableColumn[];
    filterKey: string;
    setFilterKey: (key: string) => void;
    filterValue: string;
    setFilterValue: (value: string) => void;
    sortConfig: SortConfig;
    handleSort: (key: keyof BusData) => void;
    statusFilter: StatusFilter;
    setStatusFilter: (filter: StatusFilter) => void;
    fleetFilter: FleetFilter;
    setFleetFilter: (filter: FleetFilter) => void;
    seriesFilter: SeriesFilter;
    setSeriesFilter: (filter: SeriesFilter) => void;
    scrappedDate: Date;
    setScrappedDate: (date: Date) => void;
}

const exportToCSV = (buses: BusData[], columns: TableColumn[]) => {
    if (buses.length === 0) return;
    
    const header = columns.map(c => `"${c.header}"`).join(',') + '\n';
    
    const rows = buses.map(bus => 
        columns.map(col => {
            const value = bus[col.key];
            const displayValue = col.render ? col.render(value, bus) : String(value ?? '');
            const cleanedValue = typeof displayValue === 'string' ? displayValue : new DOMParser().parseFromString(displayValue as any, "text/html").body.textContent || "";
            return `"${cleanedValue.replace(/"/g, '""')}"`;
        }).join(',')
    ).join('\n');

    const csvContent = header + rows;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `mtc_bus_report_${new Date().toISOString()}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
};

// Fix: Changed JSX.Element to React.ReactElement to resolve namespace error on line 53.
const StatCard: React.FC<{ title: string; value: number | string; icon: React.ReactElement; colorClass: string }> = ({ title, value, icon, colorClass }) => (
    <div className={`bg-white p-4 rounded-lg shadow-md flex items-center space-x-4 border-l-4 ${colorClass}`}>
        <div className={`p-3 rounded-full bg-opacity-20 ${colorClass.replace('border', 'bg').replace('-500', '-100').replace('-gray', '-gray-200')}`}>
             {icon}
        </div>
        <div>
            <p className="text-sm font-medium text-gray-500">{title}</p>
            <p className="text-2xl font-bold text-gray-800">{value}</p>
        </div>
    </div>
);

const FleetView: React.FC<FleetViewProps> = ({ 
    buses, columns, filterKey, setFilterKey, filterValue, setFilterValue, sortConfig, handleSort, 
    statusFilter, setStatusFilter, fleetFilter, setFleetFilter, seriesFilter, setSeriesFilter,
    scrappedDate, setScrappedDate
}) => {
    const { t } = useTranslation();
    const [filtersVisible, setFiltersVisible] = useState(true);

    const tableStats = useMemo(() => {
        const todayStart = new Date().setHours(0, 0, 0, 0);
        const scrappedTimestamp = new Date(scrappedDate).setHours(0, 0, 0, 0);

        const stats = {
            total: buses.length,
            running: 0,
            ranToday: 0,
            idle: 0,
            scrapped: 0,
        };

        buses.forEach(bus => {
            const lastSeen = bus.lastSeenTimestamp;
            const isRunning = bus.sId && String(bus.sId).trim() !== '';
            const isScrappedByDate = lastSeen ? lastSeen < scrappedTimestamp : false;

            if (isRunning) {
                stats.running++;
            } else if (isScrappedByDate) {
                stats.scrapped++;
            } else if (lastSeen && lastSeen >= todayStart) {
                stats.ranToday++;
            } else {
                stats.idle++;
            }
        });
        return stats;
    }, [buses, scrappedDate]);

    const renderSortArrow = (key: keyof BusData) => {
        if (sortConfig.key !== key) return null;
        return sortConfig.direction === 'ascending' ? '▲' : '▼';
    };

    const statusFilters: { key: StatusFilter, label: string }[] = [
        { key: 'all', label: t('quickFilterAllStatuses') },
        { key: 'running', label: t('quickFilterRunning') },
        { key: 'ranToday', label: t('quickFilterRanToday') },
        { key: 'idleOver7d', label: t('quickFilterIdleOver7d') },
        { key: 'idleOver30d', label: t('quickFilterIdleOver30d') },
        { key: 'scrapped', label: t('quickFilterScrapped') },
    ];

    const fleetFilters: { key: FleetFilter, label: string }[] = [
        { key: 'all', label: t('fleetFilterAll') },
        { key: 'lf', label: t('fleetLF') },
        { key: 'elf', label: t('fleetELF') },
        { key: 'elfac', label: t('fleetELFAC') },
        { key: 'other', label: t('fleetOther') },
    ];

    const seriesFilters: { key: SeriesFilter, label: string }[] = [
        { key: 'all', label: t('seriesFilterAll') },
        { key: 'h', label: t('seriesFilterH') },
        { key: 'i', label: t('seriesFilterI') },
        { key: 'j', label: t('seriesFilterJ') },
        { key: 'k', label: t('seriesFilterK') },
        { key: 'c', label: t('seriesFilterC') },
    ];

    return (
        <div className="h-full w-full flex flex-col bg-gray-50 overflow-hidden">
            <div className="p-4 space-y-4 bg-gray-100 border-b">
                 <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    <StatCard 
                        title={t('statVisibleTotal')} 
                        value={tableStats.total} 
                        colorClass="border-blue-500" 
                        icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>}
                    />
                    <StatCard 
                        title={t('statVisibleRunning')} 
                        value={tableStats.running} 
                        colorClass="border-green-500"
                        icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>}
                    />
                    <StatCard 
                        title={t('statVisibleRanToday')} 
                        value={tableStats.ranToday} 
                        colorClass="border-yellow-500"
                        icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
                    />
                    <StatCard 
                        title={t('statVisibleIdle')} 
                        value={tableStats.idle} 
                        colorClass="border-red-500"
                        icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>}
                    />
                    <StatCard 
                        title={t('statScrapped')} 
                        value={tableStats.scrapped} 
                        colorClass="border-gray-500"
                        icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>}
                    />
                </div>
                <div className="bg-white rounded-lg shadow-sm border">
                    <button onClick={() => setFiltersVisible(!filtersVisible)} className="w-full p-3 flex justify-between items-center text-left font-semibold text-gray-700">
                        <span>{t('filtersTitle')}</span>
                         <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 transition-transform ${filtersVisible ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                    </button>
                    {filtersVisible && (
                        <div className="p-3 border-t flex flex-col space-y-3">
                             <div className="flex items-center space-x-2">
                                <label htmlFor="scrapped-date-table" className="text-sm font-medium text-gray-600 whitespace-nowrap">{t('scrappedDateLabel')}</label>
                                <input
                                    type="date"
                                    id="scrapped-date-table"
                                    value={scrappedDate.toISOString().split('T')[0]}
                                    onChange={(e) => {
                                        if(e.target.value) {
                                            const [year, month, day] = e.target.value.split('-').map(Number);
                                            setScrappedDate(new Date(year, month - 1, day));
                                        }
                                    }}
                                    className="p-1 border border-gray-300 rounded-md bg-white text-sm focus:ring-red-500 focus:border-red-500"
                                />
                            </div>
                            <div className="flex items-center flex-wrap gap-y-2 gap-x-2">
                                <span className="text-sm font-medium text-gray-600 mr-2">{t('quickFiltersLabel')}:</span>
                                {statusFilters.map(filter => (
                                    <button
                                        key={filter.key}
                                        onClick={() => setStatusFilter(filter.key)}
                                        className={`px-3 py-1 text-sm font-semibold rounded-full transition-colors ${statusFilter === filter.key ? 'bg-red-600 text-white shadow' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                                    >
                                        {filter.label}
                                    </button>
                                ))}
                            </div>
                            <div className="flex items-center flex-wrap gap-y-2 gap-x-2">
                                <span className="text-sm font-medium text-gray-600 mr-2">{t('fleetFiltersLabel')}:</span>
                                {fleetFilters.map(filter => (
                                    <button
                                        key={filter.key}
                                        onClick={() => setFleetFilter(filter.key)}
                                        className={`px-3 py-1 text-sm font-semibold rounded-full transition-colors ${fleetFilter === filter.key ? 'bg-red-600 text-white shadow' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                                    >
                                        {filter.label}
                                    </button>
                                ))}
                            </div>
                            <div className="flex items-center flex-wrap gap-y-2 gap-x-2">
                                <span className="text-sm font-medium text-gray-600 mr-2">{t('seriesFiltersLabel')}:</span>
                                {seriesFilters.map(filter => (
                                    <button
                                        key={filter.key}
                                        onClick={() => setSeriesFilter(filter.key)}
                                        className={`px-3 py-1 text-sm font-semibold rounded-full transition-colors ${seriesFilter === filter.key ? 'bg-blue-600 text-white shadow' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                                    >
                                        {filter.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
                    <div className="flex-grow flex flex-col sm:flex-row items-stretch sm:items-center space-y-2 sm:space-y-0 sm:space-x-2">
                        <select
                            value={filterKey}
                            onChange={(e) => setFilterKey(e.target.value)}
                            className="p-2 border border-gray-300 rounded-md bg-white focus:ring-2 focus:ring-red-500 focus:border-red-500"
                        >
                            <option value="all">{t('fleetViewFilterAllFields')}</option>
                            {columns.map(col => <option key={String(col.key)} value={String(col.key)}>{col.header}</option>)}
                        </select>
                        <input
                            type="text"
                            placeholder={t('fleetViewFilterPlaceholder')}
                            value={filterValue}
                            onChange={(e) => setFilterValue(e.target.value)}
                            className="p-2 border border-gray-300 rounded-md w-full sm:flex-grow focus:ring-2 focus:ring-red-500 focus:border-red-500"
                        />
                    </div>
                    <button
                        onClick={() => exportToCSV(buses, columns)}
                        className="px-4 py-2 bg-green-600 text-white font-semibold rounded-md hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={buses.length === 0}
                    >
                        {t('fleetViewExportCSV')}
                    </button>
                </div>
            </div>

            {/* Table */}
            <div className="flex-grow overflow-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-100 sticky top-0">
                        <tr>
                            {columns.map((col, index) => (
                                <th
                                    key={String(col.key)}
                                    scope="col"
                                    onClick={() => handleSort(col.key)}
                                    className={`px-2 py-3 sm:px-6 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer select-none ${index === 0 ? 'sticky left-0 bg-gray-100 z-10' : ''}`}
                                >
                                    <div className="flex items-center">
                                        <span>{col.header}</span>
                                        <span className="ml-2 w-4">{renderSortArrow(col.key)}</span>
                                    </div>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {buses.length > 0 ? buses.map(bus => (
                            <tr key={bus.id} className="hover:bg-gray-50 even:bg-gray-50 group">
                                {columns.map((col, colIndex) => (
                                    <td key={`${bus.id}-${String(col.key)}`} className={`px-2 py-3 sm:px-6 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-700 ${colIndex === 0 ? 'sticky left-0 bg-white group-hover:bg-gray-50 even:bg-gray-50 z-10 font-medium text-gray-900' : ''}`}>
                                        {col.render ? col.render(bus[col.key], bus) : String(bus[col.key] ?? '-')}
                                    </td>
                                ))}
                            </tr>
                        )) : (
                           <tr>
                             <td colSpan={columns.length || 1} className="text-center py-10 text-gray-500">
                               {t('fleetViewNoBuses')}
                             </td>
                           </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default FleetView;