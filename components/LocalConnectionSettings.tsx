import React, { useState, useEffect } from 'react';
import { localDb } from '../services/DatabaseService';
import { Database, Server, Save, RefreshCw, CheckCircle, XCircle } from 'lucide-react';

interface LocalConnectionSettingsProps {
    onConfigured: (host: string, port: string, database: string, user: string, password: string) => Promise<boolean>;
}

const LocalConnectionSettings: React.FC<LocalConnectionSettingsProps> = ({ onConfigured }) => {
    const [config, setConfig] = useState({
        host: '172.10.0.16',
        port: '5432',
        database: 'm5zon_local',
        user: 'postgres',
        password: ''
    });
    const [status, setStatus] = useState<'idle' | 'connecting' | 'connected' | 'error'>('idle');
    const [errorMessage, setErrorMessage] = useState('');

    useEffect(() => {
        // Load saved config
        const savedConfig = localStorage.getItem('localDbConfig');
        if (savedConfig) {
            setConfig(JSON.parse(savedConfig));
        }
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setConfig({ ...config, [e.target.name]: e.target.value });
    };

    const handleConnect = async () => {
        setStatus('connecting');
        setErrorMessage('');

        try {
            const success = await onConfigured(
                config.host,
                config.port,
                config.database,
                config.user,
                config.password
            );

            if (success) {
                setStatus('connected');
            } else {
                setStatus('error');
                setErrorMessage('فشل الاتصال بقاعدة البيانات');
            }
        } catch (error: any) {
            setStatus('error');
            setErrorMessage(error.message);
        }
    };

    return (
        <div className="bg-white p-6 rounded-lg shadow-md max-w-md mx-auto mt-10" dir="rtl">
            <div className="flex items-center gap-2 mb-6 border-b pb-4">
                <Server className="w-6 h-6 text-blue-600" />
                <h2 className="text-xl font-bold text-gray-800">إعدادات قاعدة البيانات المحلية</h2>
            </div>

            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">عنوان السيرفر (IP)</label>
                    <input
                        type="text"
                        name="host"
                        value={config.host}
                        onChange={handleChange}
                        className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 outline-none"
                        placeholder="مثال: 172.10.0.16"
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">المنفذ (Port)</label>
                        <input
                            type="text"
                            name="port"
                            value={config.port}
                            onChange={handleChange}
                            className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">اسم قاعدة البيانات</label>
                        <input
                            type="text"
                            name="database"
                            value={config.database}
                            onChange={handleChange}
                            className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">اسم المستخدم</label>
                    <input
                        type="text"
                        name="user"
                        value={config.user}
                        onChange={handleChange}
                        className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">كلمة المرور</label>
                    <input
                        type="password"
                        name="password"
                        value={config.password}
                        onChange={handleChange}
                        className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                </div>

                {errorMessage && (
                    <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm flex items-center gap-2">
                        <XCircle className="w-4 h-4" />
                        {errorMessage}
                    </div>
                )}

                {status === 'connected' && (
                    <div className="bg-green-50 text-green-600 p-3 rounded-md text-sm flex items-center gap-2">
                        <CheckCircle className="w-4 h-4" />
                        تم الاتصال بنجاح!
                    </div>
                )}

                <button
                    onClick={handleConnect}
                    disabled={status === 'connecting'}
                    className={`w-full py-2 px-4 rounded-md text-white font-medium flex items-center justify-center gap-2 transition-colors
            ${status === 'connecting' ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}
          `}
                >
                    {status === 'connecting' ? (
                        <>
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            جاري الاتصال...
                        </>
                    ) : (
                        <>
                            <Save className="w-4 h-4" />
                            حفظ واتصال
                        </>
                    )}
                </button>
            </div>
        </div>
    );
};

export default LocalConnectionSettings;
