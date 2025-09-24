import React from 'react';

interface LoaderProps {
    text: string;
}

const Loader: React.FC<LoaderProps> = ({ text }) => {
    return (
        <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-75 z-50">
            <div className="flex flex-col items-center">
                 <div className="w-16 h-16 border-4 border-t-4 border-gray-200 border-t-red-600 rounded-full animate-spin"></div>
                 <p className="mt-4 text-gray-600 font-semibold">{text}</p>
            </div>
        </div>
    );
};

export default Loader;