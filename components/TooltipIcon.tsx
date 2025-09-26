import React from 'react';

interface TooltipIconProps {
    tooltipText: string;
}

const TooltipIcon: React.FC<TooltipIconProps> = ({ tooltipText }) => {
    return (
        <span className="ml-1.5 cursor-help relative group">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="absolute bottom-full mb-2 w-64 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-xs rounded py-1 px-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-20 text-center">
                {tooltipText}
            </span>
        </span>
    );
};

export default TooltipIcon;
