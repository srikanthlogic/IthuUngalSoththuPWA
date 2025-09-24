
import React from 'react';
import { useTranslation } from '../context/LanguageContext';
import { DashboardStats } from '../types';

interface HomePageProps {
    stats: DashboardStats;
}

const CtaCard: React.FC = () => {
    const { t } = useTranslation();
    return (
        <div className="bg-gradient-to-br from-red-100 to-yellow-100 p-4 sm:p-6 rounded-lg shadow-md border-l-4 border-red-500">
            <h3 className="text-lg sm:text-xl font-bold text-gray-800 mb-2">{t('ctaTitle')}</h3>
            <p className="text-gray-700 mb-4">{t('ctaBody')}</p>
            <a
                href="https://rtiindia.gov.in/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block bg-red-600 text-white font-semibold px-4 py-2 rounded-md hover:bg-red-700 transition-transform transform hover:scale-105"
            >
                {t('ctaButton')}
            </a>
        </div>
    );
};

const TweetCtaCard: React.FC<{ stats: DashboardStats }> = ({ stats }) => {
    const { t } = useTranslation();
    const tweetText = t('tweetText', { 
        total: stats.total, 
        running: stats.running, 
    });
    
    const tweetUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}`;

    return (
        <div className="bg-gradient-to-br from-blue-100 to-cyan-100 p-4 sm:p-6 rounded-lg shadow-md border-l-4 border-blue-500">
            <h3 className="text-lg sm:text-xl font-bold text-gray-800 mb-2">{t('tweetCtaTitle')}</h3>
            <p className="text-gray-700 mb-4">{t('tweetCtaBody')}</p>
            <a
                href={tweetUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center bg-blue-500 text-white font-semibold px-4 py-2 rounded-md hover:bg-blue-600 transition-transform transform hover:scale-105"
            >
                <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.71v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84"></path></svg>
                {t('tweetCtaButton')}
            </a>
        </div>
    );
};

const InfoCard: React.FC<{ title: string, children: React.ReactNode }> = ({ title, children }) => (
    <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
        <h3 className="text-xl font-bold text-gray-800 mb-3 border-b pb-2">{title}</h3>
        <div className="prose prose-sm max-w-none text-gray-700">
            {children}
        </div>
    </div>
);

const StatDisplay: React.FC<{ label: string; value: string | number; color: string }> = ({ label, value, color }) => (
    <div className="bg-gray-50 p-3 rounded-lg shadow-inner text-center border-t-4" style={{ borderColor: color }}>
        <p className="text-xs sm:text-sm font-semibold text-gray-600 uppercase tracking-wider">{label}</p>
        <p className="text-2xl sm:text-3xl font-bold text-gray-800">{value}</p>
    </div>
);


const HomePage: React.FC<HomePageProps> = ({ stats }) => {
    const { t } = useTranslation();
    const trackedToday = stats.running + stats.ranTodayWithoutTracking;

    return (
        <div className="p-3 sm:p-6 bg-gray-50 h-full overflow-y-auto">
            <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-4 gap-6">
                
                {/* Main Content (Left Column) */}
                <div className="lg:col-span-3 space-y-6">
                    <InfoCard title={t('homeTheProblemTitle')}>
                        <p className="mb-4">{t('homeTheProblemIntro')}</p>
                         <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 my-4">
                            <StatDisplay label={t('homeOfficialFleet')} value="3,810" color="#4A5568" />
                            <StatDisplay label={t('homeScheduledServices')} value="3,420" color="#4299E1" />
                            <StatDisplay label={t('homeTrackedToday')} value={trackedToday > 0 ? trackedToday.toLocaleString() : '...'} color="#48BB78" />
                            <StatDisplay label={t('homeTotalOnApp')} value={stats.total > 0 ? stats.total.toLocaleString() : '...'} color="#9F7AEA" />
                        </div>
                        <p className="mt-4 text-sm text-gray-600 bg-yellow-50 p-3 rounded-md border-l-4 border-yellow-400">{t('homeTheProblemExplanation')}</p>
                        <p className="mt-4 text-center italic">{t('homeTheProblemConclusion')}</p>
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
                    </InfoCard>

                    <InfoCard title={t('homeHelpTitle')}>
                        <p>{t('homeIntro1')}</p>
                        <p>{t('homeIntro2')}</p>
                        <ul className="list-disc list-inside mt-4 space-y-1">
                            <li><strong>{t('navDashboard')}:</strong> {t('homeHelpDashboard')}</li>
                            <li><strong>{t('navFleet')}:</strong> {t('homeHelpFleet')}</li>
                            <li><strong>{t('navRoutes')}:</strong> {t('homeHelpRoutes')}</li>
                        </ul>
                    </InfoCard>
                </div>

                {/* Sidebar Content (Right Column) */}
                <div className="lg:col-span-1 space-y-6">
                    <InfoCard title={t('homeScrappedLogicTitle')}>
                        <p>{t('homeScrappedLogicBody')}</p>
                    </InfoCard>
                    
                    <CtaCard />
                    <TweetCtaCard stats={stats} />
                </div>
            </div>
        </div>
    );
};

export default HomePage;
