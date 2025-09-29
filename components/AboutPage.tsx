
import React from 'react';
import { useTranslation } from '../context/LanguageContext';
import { DashboardStats } from '../types';
import data from '../public/MTC.json';

interface AboutPageProps {
    stats: DashboardStats;
}

const CtaCard: React.FC = () => {
    const { t } = useTranslation();
    return (
        <div className="bg-gradient-to-br from-red-100 to-yellow-100 p-4 sm:p-6 rounded-lg shadow-md border-l-4 border-red-500">
            <h3 className="text-lg sm:text-xl font-bold text-gray-800 mb-2">{t('ctaTitle')}</h3>
            <p className="text-gray-800 mb-4">{t('ctaBody')}</p>
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
    const Z = stats.running + stats.ranTodayWithoutTracking;
    const X = stats.running;
    const Y = Z - X;
    const idle = data.scheduled - Z;
    const tweetText = t('tweetText', { X, Z, Y, idle });

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

const GitHubCtaCard: React.FC = () => {
    const { t } = useTranslation();
    return (
        <div className="bg-gradient-to-br from-green-100 to-emerald-100 p-4 sm:p-6 rounded-lg shadow-md border-l-4 border-green-500">
            <h3 className="text-lg sm:text-xl font-bold text-gray-800 mb-2">{t('githubCtaTitle')}</h3>
            <p className="text-gray-800 mb-4">{t('githubCtaBody')}</p>
            <a
                href="https://github.com/srikanthlogic/IthuUngalSoththuPWA/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block bg-green-600 text-white font-semibold px-4 py-2 rounded-md hover:bg-green-700 transition-transform transform hover:scale-105"
            >
                {t('githubCtaButton')}
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


const AboutPage: React.FC<AboutPageProps> = ({ stats }) => {
    const { t } = useTranslation();

    return (
        <div className="p-3 sm:p-6 bg-gray-50 h-full overflow-y-auto">
            <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                <div className="lg:col-span-2 space-y-6">
                    <InfoCard title={t('aboutIntroTitle')}>
                        <p>{t('aboutIntro1')}</p>
                        <p className="mt-2">{t('aboutIntro2')}</p>
                    </InfoCard>

                    <InfoCard title={t('homeHelpTitle')}>
                        <ul className="list-disc list-inside space-y-1">
                            <li><strong>{t('navDashboard')}:</strong> {t('homeHelpDashboard')}</li>
                            <li><strong>{t('navFleet')}:</strong> {t('homeHelpFleet')}</li>
                            <li><strong>{t('navRoutes')}:</strong> {t('homeHelpRoutes')}</li>
                        </ul>
                    </InfoCard>
                    
                     <InfoCard title={t('homeScrappedLogicTitle')}>
                        <p>{t('homeScrappedLogicBody')}</p>
                    </InfoCard>
                </div>

                <div className="lg:col-span-1 space-y-6">
                    <CtaCard />
                    <TweetCtaCard stats={stats} />
                    <GitHubCtaCard />
                </div>
            </div>
             <footer className="mt-8 text-center text-gray-600">
                  {t('footerMadeWith')}
              </footer>
        </div>
    );
};

export default AboutPage;
