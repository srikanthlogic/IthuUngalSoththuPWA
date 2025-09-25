
import React from 'react';
import { useTranslation } from '../context/LanguageContext';
import { DashboardStats } from '../types';

interface HomePageProps {
    stats: DashboardStats;
}

const StatDisplay: React.FC<{ label: string; value: string | number; color: string }> = ({ label, value, color }) => (
    <div className="bg-gray-50 p-3 rounded-lg shadow-inner text-center border-t-4" style={{ borderColor: color }}>
        <p className="text-xs sm:text-sm font-semibold text-gray-600 uppercase tracking-wider">{label}</p>
        <p className="text-2xl sm:text-3xl font-bold text-gray-800">{value}</p>
    </div>
);

const ValueDisplay: React.FC<{ label: string; value: string | number; tooltip?: string }> = ({ label, value, tooltip }) => (
    <div className="mb-2 last:mb-0 relative group">
        <p className="text-xs font-medium text-gray-500 flex items-center justify-center">
            {label}
            {tooltip && (
                <span className="ml-1.5 cursor-help">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="absolute bottom-full mb-2 w-48 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-xs rounded py-1 px-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-10">
                        {tooltip}
                    </span>
                </span>
            )}
        </p>
        <p className="text-xl sm:text-2xl font-bold text-red-600">{value}</p>
    </div>
);


const InfoTile: React.FC<{ title: string; children: React.ReactNode; icon: React.ReactElement }> = ({ title, children, icon }) => (
    <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200 h-full flex flex-col">
        <div className="flex items-center mb-4 border-b pb-3">
            <div className="text-red-500 mr-4 flex-shrink-0">{icon}</div>
            <h3 className="text-xl font-bold text-gray-800">{title}</h3>
        </div>
        <div className="text-gray-700 space-y-4 flex-grow prose prose-sm max-w-none">
            {children}
        </div>
    </div>
);

const HomePage: React.FC<HomePageProps> = ({ stats }) => {
    const { t } = useTranslation();
    const trackedToday = stats.running + stats.ranTodayWithoutTracking;

    return (
        <div className="p-3 sm:p-6 bg-gray-50 h-full overflow-y-auto">
            <div className="max-w-7xl mx-auto">
                 <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
                    <InfoTile
                        title={t('homeFleetGapTitle')}
                        icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>}
                    >
                        <p>{t('homeTheProblemIntro')}</p>
                         <div className="grid grid-cols-2 lg:grid-cols-2 gap-4 my-4">
                            <StatDisplay label={t('homeOfficialFleet')} value="3,810" color="#4A5568" />
                            <StatDisplay label={t('homeScheduledServices')} value="3,420" color="#4299E1" />
                            <StatDisplay label={t('homeTrackedToday')} value={trackedToday > 0 ? trackedToday.toLocaleString() : '...'} color="#48BB78" />
                            <StatDisplay label={t('homeTotalOnApp')} value={stats.total > 0 ? stats.total.toLocaleString() : '...'} color="#9F7AEA" />
                        </div>
                        <p className="text-sm text-gray-600 bg-yellow-50 p-3 rounded-md border-l-4 border-yellow-400">{t('homeTheProblemExplanation')}</p>
                        <p className="text-center italic">{t('homeTheProblemConclusion')}</p>
                        <div className="text-xs text-right mt-2">
                            <span className="font-semibold">{t('sourcesLabel')}: </span>
                            <a href="https://mtcbus.tn.gov.in/Home/fleet_scheduled_services" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                               {t('homeTheProblemSourceLink')}
                            </a>
                             <span className="mx-1">,</span>
                            <a href="https://play.google.com/store/apps/details?id=io.ionic.starter67676" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                                {t('homeTheProblemSourceLinkApp')}
                            </a>
                        </div>
                    </InfoTile>
                    
                    <InfoTile 
                        title={t('homeCrewShortageTitle')} 
                        icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.653-.084-1.283-.24-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.653.084-1.283.24-1.857m12.75-5.643A4.5 4.5 0 0012 12.75a4.5 4.5 0 00-8.25-1.5M12 12.75V15m0 0a2.25 2.25 0 004.5 0V15m-4.5 0a2.25 2.25 0 01-4.5 0V15m0-6.75A4.5 4.5 0 0012 3.75a4.5 4.5 0 00-8.25 1.5M12 3.75V6m0 0a2.25 2.25 0 004.5 0V6m-4.5 0a2.25 2.25 0 01-4.5 0V6" /></svg>}
                     >
                        <p className="text-center text-sm">{t('homeCrewIntro')}</p>
                        <div className="grid grid-cols-2 gap-4 my-4">
                            <div className="text-center p-3 bg-blue-50 rounded-lg border border-blue-200">
                                <h4 className="font-semibold text-gray-700 text-sm mb-2">Operational Need</h4>
                                <ValueDisplay label={t('homeCrewBusesOperatedLabel')} value={t('homeCrewBusesOperatedValue')} />
                                <ValueDisplay label={t('homeCrewRequiredLabel')} value={t('homeCrewRequiredValue')} tooltip={t('homeCrewCalcTooltip')} />
                            </div>
                            <div className="text-center p-3 bg-green-50 rounded-lg border border-green-200">
                                <h4 className="font-semibold text-gray-700 text-sm mb-2">Official Report</h4>
                                <ValueDisplay label={t('homeCrewEmployedLabel')} value={t('homeCrewEmployedValue')} />
                                <ValueDisplay label={t('homeCrewTripLossLabel')} value={t('homeCrewTripLossValue')} />
                            </div>
                        </div>
                        <p className="text-sm text-center italic text-gray-600 bg-red-50 p-3 rounded-md border-l-4 border-red-400">
                            {t('homeCrewConclusion')}
                        </p>
                        <div className="text-xs text-right mt-auto pt-4">
                            <span className="font-semibold">{t('sourcesLabel')}: </span>
                            <a href="https://mtcbus.tn.gov.in/asset/forms/MTC-52_nd_ANNUAL_REPORT_2023-2024.pdf" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                                {t('homeCrewShortageSourceLink')}
                            </a>
                        </div>
                    </InfoTile>
                </div>
            </div>
        </div>
    );
};

export default HomePage;
