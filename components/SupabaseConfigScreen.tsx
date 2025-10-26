import React, { useState, useEffect } from 'react';
import { Button } from './ui/Button';
import { createClient } from '@supabase/supabase-js';

interface SupabaseConfigScreenProps {
    onConfigured: (url: string, key: string) => void;
}

const SupabaseConfigScreen: React.FC<SupabaseConfigScreenProps> = ({ onConfigured }) => {
    const [supabaseUrl, setSupabaseUrl] = useState('');
    const [supabaseKey, setSupabaseKey] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [testStatus, setTestStatus] = useState<string | null>(null);
    const [isTesting, setIsTesting] = useState(false);

    useEffect(() => {
        // Prefill from localStorage if available to help debugging
        const savedUrl = localStorage.getItem('supabaseUrl') || '';
        const savedKey = localStorage.getItem('supabaseKey') || '';
        if (savedUrl) setSupabaseUrl(savedUrl);
        if (savedKey) setSupabaseKey(savedKey);
    }, []);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        if (!supabaseUrl || !supabaseKey) {
            setError('Please fill in both the Supabase URL and the Anon Key.');
            return;
        }
        setIsLoading(true);
        // The onConfigured function will handle the connection logic
        onConfigured(supabaseUrl, supabaseKey);
        // We might not need to set loading to false if the component unmounts upon success.
    };

    const handleTestConnection = async () => {
        setTestStatus(null);
        setIsTesting(true);
        try {
            if (!supabaseUrl || !supabaseKey) {
                setTestStatus('يرجى تعبئة الحقول قبل الاختبار.');
                setIsTesting(false);
                return;
            }
            const client = createClient(supabaseUrl, supabaseKey);
            // Try a lightweight query to detect connectivity and common errors.
            const { data, error: testError } = await client.from('products').select('id').limit(1);
            if (testError) {
                // If table is missing, we are connected but schema is not initialized.
                if ((testError as any)?.code && String((testError as any).code).includes('42')) {
                    setTestStatus('اتصال ناجح، لكن جدول `products` غير موجود في المشروع. يمكنك تشغيل ملف supabase/init_tables.sql لإنشاء الجداول.');
                } else {
                    setTestStatus(`فشل الاتصال: ${testError.message || String(testError)}`);
                }
            } else {
                setTestStatus('تم الاتصال بنجاح ويمكن الوصول إلى جدول `products`.');
            }
        } catch (err: any) {
            setTestStatus(`فشل الاختبار: ${err?.message ?? String(err)}`);
        } finally {
            setIsTesting(false);
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100" dir="rtl">
            <div className="w-full max-w-lg p-8 bg-white rounded-2xl shadow-2xl">
                <div className="flex justify-center mb-6">
                    <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center">
                        <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4"></path>
                        </svg>
                    </div>
                </div>
                <h1 className="text-2xl font-bold text-gray-800 mb-2">إعدادات الاتصال بقاعدة البيانات</h1>
                <p className="text-gray-600 mb-6">
                    الرجاء إدخال معلومات Supabase الخاصة بك للاتصال بقاعدة البيانات.
                </p>
                <form onSubmit={handleSubmit} className="space-y-4 text-right">
                     <div>
                        <label htmlFor="supabaseUrl" className="block text-sm font-medium text-gray-700 mb-2">
                            Supabase URL
                        </label>
                        <div className="relative">
                            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                                <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M4.083 9h1.946c.089-1.546.383-2.97.837-4.118A6.004 6.004 0 009.166 4.765C8.632 4.294 8.1 4 7.5 4c-.6 0-1.13.295-1.666.765A6.004 6.004 0 004.083 9zM7.5 20a6.004 6.004 0 005.166-2.882c.454-1.147.748-2.572.837-4.118h-1.946c-.089 1.546-.383 2.97-.837 4.118A6.004 6.004 0 017.5 20zm5.5-6h1.946c.089-1.546.383-2.97.837-4.118A6.004 6.004 0 0015.834 4.765C15.3 4.294 14.768 4 14.168 4c-.6 0-1.13.295-1.666.765A6.004 6.004 0 0012.583 9zM14.168 20a6.004 6.004 0 005.166-2.882c.454-1.147.748-2.572.837-4.118h-1.946c-.089 1.546-.383 2.97-.837 4.118A6.004 6.004 0 0114.168 20z" clipRule="evenodd" />
                                </svg>
                            </div>
                            <input
                                id="supabaseUrl"
                                type="url"
                                value={supabaseUrl}
                                onChange={(e) => setSupabaseUrl(e.target.value)}
                                className="w-full pr-10 pl-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-150"
                                placeholder="https://your-project-ref.supabase.co"
                                required
                            />
                        </div>
                    </div>
                     <div>
                        <label htmlFor="supabaseKey" className="block text-sm font-medium text-gray-700 mb-2">
                            Supabase Anon Key
                        </label>
                        <div className="relative">
                            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                                <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M18 8a6 6 0 01-7.743 5.743L10 14l-1 1-1-1-.257-.257A6 6 0 1118 8zm-6 4a4 4 0 100-8 4 4 0 000 8z" clipRule="evenodd" />
                                </svg>
                            </div>
                            <input
                                id="supabaseKey"
                                type="text"
                                value={supabaseKey}
                                onChange={(e) => setSupabaseKey(e.target.value)}
                                className="w-full pr-10 pl-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-150"
                                placeholder="eyJhbGciOiJI..."
                                required
                            />
                        </div>
                    </div>
                    {error && (
                        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
                            <div className="flex items-center">
                                <svg className="h-5 w-5 text-red-400 ml-2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                </svg>
                                <p className="text-sm text-red-800">{error}</p>
                            </div>
                        </div>
                    )}
                    <div className="flex gap-3 items-center justify-center mt-6">
                        <Button
                            type="button"
                            className="!px-6 py-3 bg-gray-100 text-gray-700 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 rounded-lg transition duration-150"
                            onClick={handleTestConnection}
                            disabled={isTesting}
                        >
                            {isTesting ? (
                                <span className="flex items-center">
                                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-gray-700" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    جارٍ الاختبار...
                                </span>
                            ) : (
                                <span className="flex items-center">
                                    <svg className="ml-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                                    </svg>
                                    اختبار الاتصال
                                </span>
                            )}
                        </Button>
                        <Button
                            type="submit"
                            className="!px-8 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-lg text-white transition duration-150 shadow-lg"
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <span className="flex items-center">
                                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    جاري الاتصال...
                                </span>
                            ) : (
                                <span className="flex items-center">
                                    <svg className="ml-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                                    </svg>
                                    اتصال وحفظ
                                </span>
                            )}
                        </Button>
                    </div>
                    {testStatus && (
                        <div className={`mt-4 p-3 rounded-md ${testStatus.includes('نجح') ? 'bg-green-50 border border-green-200' : 'bg-blue-50 border border-blue-200'}`}>
                            <div className="flex items-center">
                                {testStatus.includes('نجح') ? (
                                    <svg className="h-5 w-5 text-green-400 ml-2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                    </svg>
                                ) : (
                                    <svg className="h-5 w-5 text-blue-400 ml-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                )}
                                <p className={`text-sm ${testStatus.includes('نجح') ? 'text-green-800' : 'text-blue-800'}`}>{testStatus}</p>
                            </div>
                        </div>
                    )}
                </form>
            </div>
        </div>
    );
};

export default SupabaseConfigScreen;
