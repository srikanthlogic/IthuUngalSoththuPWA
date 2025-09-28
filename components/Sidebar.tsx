import React from 'react';
import { View, AgencyConfig } from '../types';
import { useTranslation } from '../context/LanguageContext';

interface SidebarProps {
    currentView: View;
    setView: (view: View) => void;
    isSidebarOpen: boolean;
    setIsSidebarOpen: (isOpen: boolean) => void;
    agencyConfig: AgencyConfig | null;
}

const NavItem: React.FC<{
    view: View;
    label: string;
    icon: React.ReactElement;
    currentView: View;
    onClick: () => void;
}> = ({ view, label, icon, currentView, onClick }) => (
    <li>
        <button
            onClick={onClick}
            className={`flex items-center p-3 my-1 w-full text-left rounded-lg transition-colors ${
                currentView === view
                    ? 'bg-red-700 text-white font-semibold shadow-lg'
                    : 'text-gray-200 hover:bg-red-800 hover:text-white'
            }`}
        >
            <span className="w-6 h-6 mr-3">{icon}</span>
            <span>{label}</span>
        </button>
    </li>
);

const Sidebar: React.FC<SidebarProps> = ({ currentView, setView, isSidebarOpen, setIsSidebarOpen, agencyConfig }) => {
    const { t } = useTranslation();

    const handleSetView = (view: View) => {
        setView(view);
        setIsSidebarOpen(false); // Close sidebar on mobile after navigation
    };

    const navItems = [
        {
            view: View.Home,
            label: t('navHome'),
            icon: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6" aria-label={`Navigate to ${t('navHome')}`}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h7.5" /></svg>
        },
        {
            view: View.Dashboard,
            label: t('navDashboard'),
            icon: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6" aria-label={`Navigate to ${t('navDashboard')}`}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" /></svg>
        },
        {
            view: View.Fleet,
            label: t('navFleet'),
            icon: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6" aria-label={`Navigate to ${t('navFleet')}`}><path strokeLinecap="round" strokeLinejoin="round" d="M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 01-1.125-1.125M3.375 19.5h7.5c.621 0 1.125-.504 1.125-1.125m-8.625 0V5.625m0 12.75v-1.5c0-.621.504-1.125 1.125-1.125h1.5" /><path strokeLinecap="round" strokeLinejoin="round" d="M3.375 5.625c0-.621.504-1.125 1.125-1.125h15c.621 0 1.125.504 1.125 1.125v12.75c0 .621-.504 1.125-1.125 1.125h-15a1.125 1.125 0 01-1.125-1.125V5.625z" /></svg>
        },
        {
            view: View.Routes,
            label: t('navRoutes'),
            icon: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6" aria-label={`Navigate to ${t('navRoutes')}`}><path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" /></svg>
        },
        {
            view: View.About,
            label: t('navAbout'),
            icon: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6" aria-label={`Navigate to ${t('navAbout')}`}><path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" /></svg>
        },
    ];

    const sidebarContent = (
        <div className="flex flex-col h-full">
            <div className="p-4 border-b border-red-800">
                <h1 className="text-xl font-bold text-white">{agencyConfig?.appName ?? t('appTitle')}</h1>
                <span className="text-sm font-semibold text-red-200">{agencyConfig?.appHashtag ?? t('appHashtag')}</span>
            </div>
            <nav className="flex-grow p-2">
                <ul>
                    {navItems.map(item => (
                        <NavItem
                            key={item.view}
                            view={item.view}
                            label={item.label}
                            icon={item.icon}
                            currentView={currentView}
                            onClick={() => handleSetView(item.view)}
                        />
                    ))}
                </ul>
            </nav>
        </div>
    );

    return (
        <>
            {/* Mobile Sidebar */}
            <div
                className={`fixed inset-0 bg-black bg-opacity-50 z-30 md:hidden transition-opacity ${
                    isSidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
                }`}
                onClick={() => setIsSidebarOpen(false)}
            ></div>
            <div
                className={`fixed top-0 left-0 h-full w-64 bg-red-900 text-white shadow-lg z-40 transform transition-transform md:hidden ${
                    isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
                }`}
            >
                {sidebarContent}
            </div>

            {/* Desktop Sidebar */}
            <div className="hidden md:flex md:flex-shrink-0">
                <div className="flex flex-col w-64 bg-red-900">
                    {sidebarContent}
                </div>
            </div>
        </>
    );
};

export default Sidebar;