import React from 'react';
import { useTranslation } from '../context/LanguageContext';
import { View } from '../types';

interface IthuUngalSoththuPageProps {
    setView: (view: View) => void;
}

const InfoCard: React.FC<{ title: string, children: React.ReactNode }> = ({ title, children }) => (
    <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
        <h3 className="text-xl font-bold text-gray-800 mb-3 border-b pb-2">{title}</h3>
        <div className="prose prose-sm max-w-none text-gray-700">
            {children}
        </div>
    </div>
);

const IthuUngalSoththuPage: React.FC<IthuUngalSoththuPageProps> = ({ setView }) => {
    const { t } = useTranslation();
    return (
        <div className="p-3 sm:p-6 bg-gray-50 h-full overflow-y-auto">
            <div className="max-w-7xl mx-auto space-y-6">

                {/* Hero Section */}
                <div className="bg-gradient-to-r from-red-500 to-blue-500 text-white p-8 rounded-lg shadow-md">
                    <h1 className="text-4xl font-bold mb-4">#IthuUngalSoththu</h1>
                    <p className="text-xl mb-6">This is Your Asset - Chennai MTC Bus Tracker</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <button
                            onClick={() => setView(View.Home)}
                            className="bg-white text-red-600 font-semibold py-3 px-4 rounded-md hover:bg-gray-100 transition-colors"
                        >
                            {t('navHome')}
                        </button>
                        <button
                            onClick={() => setView(View.Dashboard)}
                            className="bg-white text-blue-600 font-semibold py-3 px-4 rounded-md hover:bg-gray-100 transition-colors"
                        >
                            {t('navDashboard')}
                        </button>
                        <button
                            onClick={() => setView(View.Fleet)}
                            className="bg-white text-green-600 font-semibold py-3 px-4 rounded-md hover:bg-gray-100 transition-colors"
                        >
                            {t('navFleet')}
                        </button>
                        <button
                            onClick={() => setView(View.Routes)}
                            className="bg-white text-purple-600 font-semibold py-3 px-4 rounded-md hover:bg-gray-100 transition-colors"
                        >
                            {t('navRoutes')}
                        </button>
                    </div>
                </div>

                <InfoCard title={t('pages.ithuUngalSoththu.introTitle')}>
                    <p dangerouslySetInnerHTML={{ __html: t('pages.ithuUngalSoththu.introContent')}}></p>
                    <p>{t('pages.ithuUngalSoththu.introContent2')}</p>
                    <div dangerouslySetInnerHTML={{ __html: t('pages.ithuUngalSoththu.introAdditional') }}></div>
                    <p dangerouslySetInnerHTML={{ __html: t('pages.ithuUngalSoththu.introEtymology') }}></p>
                </InfoCard>

                <InfoCard title={t('pages.ithuUngalSoththu.culturalTitle')}>
                    <p>{t('pages.ithuUngalSoththu.culturalContent')}</p>
                    <p>{t('pages.ithuUngalSoththu.culturalContent2')}</p>
                    <div className="mt-4">
                        <iframe
                            src="https://www.youtube.com/embed/5bVTW0f9HX8?start=0&end=90"
                            title="Bagavathy Movie - Ithu Ungal Soththu Scene"
                            frameBorder="0"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                            className="w-full aspect-video rounded-lg shadow-md"
                        ></iframe>
                    </div>
                    <p>{t('pages.ithuUngalSoththu.culturalConclusion')}</p>
                </InfoCard>

                <InfoCard title={t('pages.ithuUngalSoththu.importanceTitle')}>
                    <p>{t('pages.ithuUngalSoththu.importanceContent')}</p>
                    <ul className="list-disc list-inside space-y-1">
                        <li dangerouslySetInnerHTML={{ __html: t('pages.ithuUngalSoththu.importanceList1') }}></li>
                        <li dangerouslySetInnerHTML={{ __html: t('pages.ithuUngalSoththu.importanceList2') }}></li>
                        <li dangerouslySetInnerHTML={{ __html: t('pages.ithuUngalSoththu.importanceList3') }}></li>
                        <li dangerouslySetInnerHTML={{ __html: t('pages.ithuUngalSoththu.importanceList4') }}></li>
                    </ul>
                    <p>{t('pages.ithuUngalSoththu.importanceConclusion')}</p>
                </InfoCard>

                <InfoCard title={t('pages.ithuUngalSoththu.financingTitle')}>
                    <p>{t('pages.ithuUngalSoththu.financingContent')}</p>
                    <ul className="list-disc list-inside space-y-1">
                        <li dangerouslySetInnerHTML={{ __html: t('pages.ithuUngalSoththu.financingList1') }}></li>
                        <li dangerouslySetInnerHTML={{ __html: t('pages.ithuUngalSoththu.financingList2') }}></li>
                        <li dangerouslySetInnerHTML={{ __html: t('pages.ithuUngalSoththu.financingList3') }}></li>
                        <li dangerouslySetInnerHTML={{ __html: t('pages.ithuUngalSoththu.financingList4') }}></li>
                    </ul>
                    <p>{t('pages.ithuUngalSoththu.financingConclusion')}</p>
                </InfoCard>

                <InfoCard title={t('pages.ithuUngalSoththu.accountabilityTitle')}>
                    <p>{t('pages.ithuUngalSoththu.accountabilityContent')}</p>
                    <ul className="list-disc list-inside space-y-1">
                        <li dangerouslySetInnerHTML={{ __html: t('pages.ithuUngalSoththu.accountabilityList1') }}></li>
                        <li dangerouslySetInnerHTML={{ __html: t('pages.ithuUngalSoththu.accountabilityList2') }}></li>
                        <li dangerouslySetInnerHTML={{ __html: t('pages.ithuUngalSoththu.accountabilityList3') }}></li>
                        <li dangerouslySetInnerHTML={{ __html: t('pages.ithuUngalSoththu.accountabilityList4') }}></li>
                    </ul>
                    <p>{t('pages.ithuUngalSoththu.accountabilityConclusion')}</p>
                </InfoCard>

                <InfoCard title={t('pages.ithuUngalSoththu.projectTitle')}>
                    <p>{t('pages.ithuUngalSoththu.projectContent')}</p>
                    <ul className="list-disc list-inside space-y-1">
                        <li dangerouslySetInnerHTML={{ __html: t('pages.ithuUngalSoththu.projectList1') }}></li>
                        <li dangerouslySetInnerHTML={{ __html: t('pages.ithuUngalSoththu.projectList2') }}></li>
                        <li dangerouslySetInnerHTML={{ __html: t('pages.ithuUngalSoththu.projectList3') }}></li>
                        <li dangerouslySetInnerHTML={{ __html: t('pages.ithuUngalSoththu.projectList4') }}></li>
                    </ul>
                    <p>{t('pages.ithuUngalSoththu.projectConclusion')}</p>
                    <div className="mt-4">
                        <a
                            href="https://twitter.com/intent/tweet?text=Ithu%20Ungal%20Soththu%20-%20Public%20transit%20is%20your%20asset!%20Check%20out%20the%20live%20tracker%20for%20Chennai%20MTC%20buses.%20%23IthuUngalSoththu%20https%3A//ithuungalsoththu.vercel.app/"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center bg-blue-500 text-white font-semibold px-4 py-2 rounded-md hover:bg-blue-600 transition-transform transform hover:scale-105"
                        >
                            <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.71v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84"></path></svg>
                            {t('pages.ithuUngalSoththu.tweetText')}
                        </a>
                    </div>
                </InfoCard>

            </div>
        </div>
    );
};

export default IthuUngalSoththuPage;