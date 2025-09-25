
import React from 'react';
import { DashboardStats, FleetStatusBreakdown } from '../types';
import { useTranslation } from '../context/LanguageContext';

interface MapViewProps {
    stats: DashboardStats;
    scrappedDate: Date;
    setScrappedDate: (date: Date) => void;
}

const StatCard: React.FC<{ title: string; value: number; colorClass: string; largeText?: boolean }> = ({ title, value, colorClass, largeText = true }) => (
    <div className="bg-white p-4 rounded-lg shadow-md flex flex-col items-center justify-center text-center h-full">
        <span className="text-sm font-medium text-gray-500">{title}</span>
        <span className={`font-bold ${largeText ? 'text-3xl sm:text-4xl' : 'text-2xl sm:text-3xl'} ${colorClass}`}>{value}</span>
    </div>
);

const FleetBreakdownCard: React.FC<{ title: string; stats: FleetStatusBreakdown; colorClass: string }> = ({ title, stats, colorClass }) => {
    const { t } = useTranslation();
    return (
        <div className="bg-white p-4 rounded-lg shadow-md flex flex-col justify-between h-full">
            <div>
                <div className="flex justify-between items-baseline mb-2 sm:mb-3">
                    <h3 className={`text-base sm:text-lg font-bold ${colorClass}`}>{title}</h3>
                    <span className="text-xl sm:text-2xl font-bold text-gray-800">{stats.total}</span>
                </div>
                <div className="space-y-1 text-sm text-gray-600">
                    <div className="flex justify-between items-center">
                        <span>{t('breakdownRunning')}</span>
                        <span className="font-semibold text-green-500 bg-green-100 px-2 py-0.5 rounded">{stats.running}</span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span>{t('breakdownRanToday')}</span>
                        <span className="font-semibold text-yellow-600 bg-yellow-100 px-2 py-0.5 rounded">{stats.ranTodayWithoutTracking}</span>
                    </div>
                     <div className="flex justify-between items-center">
                        <span>{t('breakdownIdle7d')}</span>
                        <span className="font-semibold text-orange-500 bg-orange-100 px-2 py-0.5 rounded">{stats.notRunLessThan7Days}</span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span>{t('breakdownIdle7_30d')}</span>
                        <span className="font-semibold text-red-500 bg-red-100 px-2 py-0.5 rounded">{stats.notRun7to30Days}</span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span>{t('breakdownIdle30d')}</span>
                        <span className="font-semibold text-red-700 bg-red-200 px-2 py-0.5 rounded">{stats.notRunMoreThan30Days}</span>
                    </div>
                    <div className="flex justify-between items-center mt-2 pt-2 border-t">
                        <span>{t('breakdownScrapped')}</span>
                        <span className="font-semibold text-gray-500 bg-gray-200 px-2 py-0.5 rounded">{stats.scrapped}</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

const MapView: React.FC<MapViewProps> = ({ stats, scrappedDate, setScrappedDate }) => {
    const { t } = useTranslation();
    if (!stats || stats.total === 0) {
        return null; // Or a loading state
    }
    const totalIdle = stats.notRunLessThan7Days + stats.notRun7to30Days + stats.notRunMoreThan30Days;


    return (
        <div className="p-3 sm:p-6 bg-gray-50 h-full overflow-y-auto">
            <div className="max-w-7xl mx-auto">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
                    <h2 className="text-xl sm:text-2xl font-bold text-gray-800">{t('dashboardTitle')}</h2>
                    <div className="flex items-center space-x-2 self-end sm:self-center">
                        <label htmlFor="scrapped-date-map" className="text-sm font-medium text-gray-700 whitespace-nowrap">{t('scrappedDateLabel')}</label>
                        <input
                            type="date"
                            id="scrapped-date-map"
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
                </div>
                
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                    <StatCard title={t('statTotalBuses')} value={stats.total} colorClass="text-gray-800" />
                    <StatCard title={t('statRunning')} value={stats.running} colorClass="text-green-500" />
                    <StatCard title={t('statRanToday')} value={stats.ranTodayWithoutTracking} colorClass="text-yellow-500" />
                    <StatCard title={t('statIdle')} value={totalIdle} colorClass="text-orange-500"/>
                    <StatCard title={t('statScrapped')} value={stats.scrapped} colorClass="text-gray-500" />
                </div>
                
                <h3 className="text-lg sm:text-xl font-semibold text-gray-700 mt-6 mb-2">{t('statIdleBreakdown')}</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 gap-4">
                    <StatCard title={t('statIdle7d')} value={stats.notRunLessThan7Days} colorClass="text-orange-500" largeText={false}/>
                    <StatCard title={t('statIdle7_30d')} value={stats.notRun7to30Days} colorClass="text-red-500" largeText={false}/>
                    <StatCard title={t('statIdle30d')} value={stats.notRunMoreThan30Days} colorClass="text-red-700" largeText={false}/>
                </div>

                <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mt-6 sm:mt-8 mb-4">{t('compositionTitle')}</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <FleetBreakdownCard title={t('fleetELFAC')} stats={stats.elfac} colorClass="text-blue-500" />
                    <FleetBreakdownCard title={t('fleetELF')} stats={stats.elf} colorClass="text-teal-500" />
                    <FleetBreakdownCard title={t('fleetLF')} stats={stats.lf} colorClass="text-indigo-500" />
                    <FleetBreakdownCard title={t('fleetOther')} stats={stats.other} colorClass="text-gray-600" />
                </div>
            </div>
        </div>
    );
};

export default MapView;