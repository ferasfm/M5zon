import React from 'react';

interface LoadingScreenProps {
    message?: string;
}

const LoadingScreen: React.FC<LoadingScreenProps> = ({ message = 'جاري تحميل البيانات...' }) => {
    return (
        <div className="fixed inset-0 bg-gradient-to-br from-primary/10 to-slate-100 flex items-center justify-center z-50">
            <div className="text-center">
                {/* Logo or Icon */}
                <div className="mb-8">
                    <div className="w-24 h-24 mx-auto bg-primary rounded-2xl flex items-center justify-center shadow-lg animate-pulse">
                        <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                        </svg>
                    </div>
                </div>

                {/* Loading Text */}
                <h2 className="text-2xl font-bold text-dark mb-2">نظام إدارة المخزون</h2>
                <p className="text-slate-600 mb-6">{message}</p>

                {/* Loading Spinner */}
                <div className="flex justify-center items-center gap-2">
                    <div className="w-3 h-3 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-3 h-3 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-3 h-3 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>

                {/* Progress Bar */}
                <div className="mt-8 w-64 mx-auto">
                    <div className="h-1 bg-slate-200 rounded-full overflow-hidden">
                        <div className="h-full bg-primary rounded-full animate-progress"></div>
                    </div>
                </div>

                {/* Tip */}
                <p className="text-xs text-slate-400 mt-6">💡 نصيحة: تأكد من اتصالك بالإنترنت</p>
            </div>

            <style>{`
                @keyframes progress {
                    0% { width: 0%; }
                    50% { width: 70%; }
                    100% { width: 100%; }
                }
                .animate-progress {
                    animation: progress 2s ease-in-out infinite;
                }
            `}</style>
        </div>
    );
};

export default LoadingScreen;
