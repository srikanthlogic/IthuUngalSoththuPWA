

import React, { useMemo, useState, useEffect, useRef, FC } from 'react';
import { BusData, SortConfig, TableColumn, StatusFilter, FleetFilter, SeriesFilter, AgencyFilter, AgencyConfig } from '../types';
import { useTranslation } from '../context/LanguageContext';
import Pagination from './Pagination';
import TooltipIcon from './TooltipIcon';

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
    agencyFilter: AgencyFilter;
    setAgencyFilter: (filter: AgencyFilter) => void;
    scrappedDate: Date;
    setScrappedDate: (date: Date) => void;
    agencyConfig: AgencyConfig | null;
    handleClearFilters: () => void;
}


interface MultiSelectDropdownProps {
    id: string;
    label: string;
    options: { value: string; label: string }[];
    selectedValues: string[];
    onChange: (values: string[]) => void;
}

const MultiSelectDropdown: FC<MultiSelectDropdownProps> = ({ id, label, options, selectedValues, onChange }) => {
    const [isOpen, setIsOpen] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);
    const { t } = useTranslation();

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [wrapperRef]);
    
    const handleSelect = (value: string) => {
        if (value === 'all') {
            onChange(selectedValues.includes('all') ? [] : ['all']);
            if (options.length > 10) setIsOpen(false); // Close for long lists
            return;
        }
        
        const newSelected = selectedValues.includes(value)
            ? selectedValues.filter(v => v !== value)
            : [...selectedValues.filter(v => v !== 'all'), value];

        if (newSelected.length === 0) {
            onChange(['all']);
        } else {
            onChange(newSelected);
        }
    };

    const displayLabel = useMemo(() => {
        if (selectedValues.includes('all') || selectedValues.length === 0) {
            const allOption = options.find(o => o.value === 'all');
            return allOption ? allOption.label : 'All';
        }
        if (selectedValues.length === 1) {
            const selectedOption = options.find(o => o.value === selectedValues[0]);
            return selectedOption ? selectedOption.label : selectedValues[0];
        }
        return `${selectedValues.length} ${t('items_selected')}`;
    }, [selectedValues, options, t]);

    return (
        <div ref={wrapperRef} className="relative w-full">
            <label htmlFor={id} className="text-sm font-medium text-gray-600 mb-1 block">{label}</label>
            <button
                id={id}
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="p-2 border border-gray-300 rounded-md bg-white text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500 w-full flex justify-between items-center text-left min-h-[42px]"
                aria-haspopup="listbox"
                aria-expanded={isOpen}
            >
                <span className="truncate">{displayLabel}</span>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                   <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
            </button>
            {isOpen && (
                <div className="absolute z-20 mt-1 w-full bg-white shadow-lg border rounded-md max-h-60 overflow-auto">
                    <ul role="listbox">
                        {options.map(option => (
                            <li
                                key={option.value}
                                className="p-2 hover:bg-gray-100 cursor-pointer select-none"
                                onClick={() => handleSelect(option.value)}
                                role="option"
                                aria-selected={selectedValues.includes(option.value)}
                            >
                                <div className="flex items-center">
                                    <input
                                        type="checkbox"
                                        readOnly
                                        checked={selectedValues.includes(option.value)}
                                        className="h-4 w-4 text-red-600 border-gray-300 rounded focus:ring-red-500 pointer-events-none"
                                    />
                                    <span className="ml-3 text-sm">{option.label}</span>
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
};


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

const StatCard: React.FC<{ title: string; value: number | string; icon: React.ReactElement; colorClass: string, tooltip?: React.ReactElement }> = ({ title, value, icon, colorClass, tooltip }) => (
    <div className={`bg-white p-4 rounded-lg shadow-md flex items-center space-x-4 border-l-4 ${colorClass}`}>
        <div className={`p-3 rounded-full bg-opacity-20 ${colorClass.replace('border', 'bg').replace('-500', '-100').replace('-gray', '-gray-200')}`}>
             {icon}
        </div>
        <div>
            <p className="text-sm font-medium text-gray-500 flex items-center">{title}{tooltip}</p>
            <p className="text-2xl font-bold text-gray-800">{value}</p>
        </div>
    </div>
);

const StatCardWithBreakdown: React.FC<{
    title: string;
    total: number;
    breakdown: { label: string; value: number }[];
    icon: React.ReactElement;
    colorClass: string;
    tooltip?: React.ReactElement;
}> = ({ title, total, breakdown, icon, colorClass, tooltip }) => (
    <div className={`bg-white p-4 rounded-lg shadow-md flex items-center space-x-4 border-l-4 ${colorClass}`}>
        <div className={`p-3 rounded-full bg-opacity-20 ${colorClass.replace('border', 'bg').replace('-500', '-100').replace('-gray', '-gray-200')}`}>
             {icon}
        </div>
        <div>
            <p className="text-sm font-medium text-gray-500 flex items-center">{title}{tooltip}</p>
            <p className="text-2xl font-bold text-gray-800">{total.toLocaleString()}</p>
            <div className="text-xs text-gray-500 mt-1 space-x-2">
                {breakdown.map((item) => (
                    <span key={item.label}>
                        {item.label}: <span className="font-semibold">{item.value.toLocaleString()}</span>
                    </span>
                ))}
            </div>
        </div>
    </div>
);

const ROWS_PER_PAGE = 50;

const FleetView: React.FC<FleetViewProps> = ({ 
    buses, columns, filterKey, setFilterKey, filterValue, setFilterValue, sortConfig, handleSort, 
    statusFilter, setStatusFilter, fleetFilter, setFleetFilter, seriesFilter, setSeriesFilter,
    agencyFilter, setAgencyFilter, scrappedDate, setScrappedDate, agencyConfig, handleClearFilters
}) => {
    const { t } = useTranslation();
    const [filtersVisible, setFiltersVisible] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);

    const hasActiveFilters = useMemo(() => {
        const isDefaultStatus = statusFilter.length === 1 && statusFilter[0] === 'all';
        const isDefaultFleet = fleetFilter.length === 1 && fleetFilter[0] === 'all';
        const isDefaultSeries = seriesFilter.length === 1 && seriesFilter[0] === 'all';
        const isDefaultAgency = agencyFilter.length === 1 && agencyFilter[0] === 'all';
        
        return filterValue !== '' || !isDefaultStatus || !isDefaultFleet || !isDefaultSeries || !isDefaultAgency;
    }, [statusFilter, fleetFilter, seriesFilter, agencyFilter, filterValue]);

    useEffect(() => {
        setCurrentPage(1);
    }, [buses]);

    const paginatedBuses = useMemo(() => {
        const startIndex = (currentPage - 1) * ROWS_PER_PAGE;
        const endIndex = startIndex + ROWS_PER_PAGE;
        return buses.slice(startIndex, endIndex);
    }, [buses, currentPage]);

    const totalPages = Math.ceil(buses.length / ROWS_PER_PAGE);

    const tableStats = useMemo(() => {
        const todayStart = new Date().setHours(0, 0, 0, 0);
        const scrappedTimestamp = new Date(scrappedDate).setHours(0, 0, 0, 0);

        const stats = {
            total: buses.length,
            totalMTC: 0,
            totalSwitch: 0,
            running: 0,
            ranToday: 0,
            idle: 0,
            idleMTC: 0,
            idleSwitch: 0,
            scrapped: 0,
            scrappedMTC: 0,
            scrappedSwitch: 0,
            trackedTodayMTC: 0,
            trackedTodaySwitch: 0,
        };

        buses.forEach(bus => {
            const isSwitch = bus.id.endsWith('ELFAC') || bus.id.endsWith('ELF');
            if (isSwitch) stats.totalSwitch++; else stats.totalMTC++;

            const lastSeen = bus.lastSeenTimestamp;
            const isRunning = bus.sId && String(bus.sId).trim() !== '';
            const isScrappedByDate = lastSeen ? lastSeen < scrappedTimestamp : false;
            const ranToday = !isRunning && lastSeen && lastSeen >= todayStart;

            if (isRunning) {
                stats.running++;
            } else if (isScrappedByDate) {
                stats.scrapped++;
                if (isSwitch) stats.scrappedSwitch++; else stats.scrappedMTC++;
            } else if (ranToday) {
                stats.ranToday++;
            } else {
                stats.idle++;
                if (isSwitch) stats.idleSwitch++; else stats.idleMTC++;
            }

            if (isRunning || ranToday) {
                if (isSwitch) stats.trackedTodaySwitch++; else stats.trackedTodayMTC++;
            }
        });
        return stats;
    }, [buses, scrappedDate]);

    const renderSortArrow = (key: keyof BusData) => {
        if (sortConfig.key !== key) return null;
        return sortConfig.direction === 'ascending' ? '▲' : '▼';
    };

    const statusFilters: { key: string, label: string }[] = [
        { key: 'all', label: t('quickFilterAllStatuses') },
        { key: 'running', label: t('quickFilterRunning') },
        { key: 'ranToday', label: t('quickFilterRanToday') },
        { key: 'idleOver7d', label: t('quickFilterIdleOver7d') },
        { key: 'idleOver30d', label: t('quickFilterIdleOver30d') },
        { key: 'scrapped', label: t('quickFilterScrapped') },
    ];

    const handleFilterChange = (id: string, values: string[]) => {
        switch (id) {
            case 'fleet': setFleetFilter(values); break;
            case 'agency': setAgencyFilter(values); break;
            case 'series': setSeriesFilter(values); break;
        }
    };

    const getActiveFilter = (id: string): string[] => {
        switch (id) {
            case 'fleet': return fleetFilter;
            case 'agency': return agencyFilter;
            case 'series': return seriesFilter;
            default: return [];
        }
    };

    const activeFiltersSummary = useMemo(() => {
        const active: string[] = [];
    
        // 1. Status Filter
        if (!statusFilter.includes('all') && statusFilter.length > 0) {
            statusFilter.forEach(sf => {
                const statusLabel = statusFilters.find(f => f.key === sf)?.label;
                if (statusLabel) active.push(statusLabel);
            });
        }
    
        // 2. Config-based filters
        if (agencyConfig) {
            agencyConfig.filters.forEach(group => {
                const activeValues = getActiveFilter(group.id);
                if (!activeValues.includes('all') && activeValues.length > 0) {
                    activeValues.forEach(val => {
                        const option = group.options.find(o => o.value === val);
                        if (option) {
                            active.push(t(option.labelKey));
                        }
                    });
                }
            });
        }
        
        // 3. Search text filter
        if (filterValue) {
            active.push(`"${filterValue}"`);
        }
    
        return active;
    }, [statusFilter, fleetFilter, agencyFilter, seriesFilter, filterValue, agencyConfig, t, statusFilters]);

    return (
        <div className="h-full w-full flex flex-col bg-gray-50 overflow-hidden">
            <div className="p-4 space-y-4 bg-gray-100 border-b">
                 <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <StatCardWithBreakdown
                        title={t('statVisibleTotal')} 
                        total={tableStats.total} 
                        breakdown={[
                            { label: t('agencyMTC'), value: tableStats.totalMTC },
                            { label: t('agencySwitch'), value: tableStats.totalSwitch },
                        ]}
                        colorClass="border-blue-500" 
                        icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>}
                    />
                    <StatCardWithBreakdown
                        title={t('homeTrackedToday')}
                        total={tableStats.running + tableStats.ranToday}
                        breakdown={[
                            { label: t('agencyMTC'), value: tableStats.trackedTodayMTC },
                            { label: t('agencySwitch'), value: tableStats.trackedTodaySwitch },
                        ]}
                        colorClass="border-green-500"
                        icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>}
                    />
                    <StatCardWithBreakdown
                        title={t('statVisibleIdle')} 
                        total={tableStats.idle} 
                        breakdown={[
                            { label: t('agencyMTC'), value: tableStats.idleMTC },
                            { label: t('agencySwitch'), value: tableStats.idleSwitch },
                        ]}
                        colorClass="border-red-500"
                        icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>}
                    />
                    <StatCardWithBreakdown
                        title={t('statScrapped')} 
                        total={tableStats.scrapped} 
                        breakdown={[
                            { label: t('agencyMTC'), value: tableStats.scrappedMTC },
                            { label: t('agencySwitch'), value: tableStats.scrappedSwitch },
                        ]}
                        colorClass="border-gray-500"
                        icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>}
                        tooltip={<TooltipIcon tooltipText={t('deemedScrappedTooltip')} />}
                    />
                </div>
                <div className="bg-white rounded-lg shadow-sm border">
                    <button onClick={() => setFiltersVisible(!filtersVisible)} className="w-full p-3 flex justify-between items-center text-left font-semibold text-gray-700">
                        <div className="flex items-center flex-wrap gap-2 min-w-0">
                            <span className="flex-shrink-0">{t('filtersTitle')}</span>
                            {!filtersVisible && activeFiltersSummary.length > 0 && (
                                <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                                    {activeFiltersSummary.map((filter, index) => (
                                        <span key={index} className="px-2 py-0.5 bg-red-100 text-red-800 text-xs font-medium rounded-full truncate">
                                            {filter}
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>
                         <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 transition-transform flex-shrink-0 ml-2 ${filtersVisible ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                    </button>
                    {filtersVisible && (
                        <div className="p-4 border-t">
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 items-start">
                                {/* Scrapped Date */}
                                <div>
                                    <label htmlFor="scrapped-date-table" className="text-sm font-medium text-gray-600 mb-1 block">{t('scrappedDateLabel')}</label>
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
                                        className="p-2 border border-gray-300 rounded-md bg-white text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500 w-full"
                                    />
                                </div>
                                {/* Status Filter */}
                                <MultiSelectDropdown
                                    id="status-filter"
                                    label={t('quickFiltersLabel')}
                                    options={statusFilters.map(f => ({ value: f.key, label: f.label }))}
                                    selectedValues={statusFilter}
                                    onChange={setStatusFilter}
                                />
                                
                                {/* Dynamic Filters */}
                                {agencyConfig && agencyConfig.filters.map(filterGroup => (
                                    <MultiSelectDropdown
                                        key={filterGroup.id}
                                        id={`${filterGroup.id}-filter`}
                                        label={t(filterGroup.labelKey)}
                                        options={filterGroup.options.map(o => ({ value: o.value, label: t(o.labelKey) }))}
                                        selectedValues={getActiveFilter(filterGroup.id)}
                                        onChange={(values) => handleFilterChange(filterGroup.id, values)}
                                    />
                                ))}
                            </div>
                            <div className="mt-4 flex justify-end">
                                <button
                                    onClick={handleClearFilters}
                                    disabled={!hasActiveFilters}
                                    className="px-4 py-2 bg-red-600 text-white text-sm font-semibold rounded-md hover:bg-red-700 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    {t('clearFiltersButton')}
                                </button>
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
                    <thead className="bg-gray-100 sticky top-0 z-10">
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
                        {paginatedBuses.length > 0 ? paginatedBuses.map(bus => (
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

export default FleetView;