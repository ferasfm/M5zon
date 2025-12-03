import React, { useState, useEffect } from 'react';
import { useSupabase } from '../contexts/SupabaseContext';
import { Icons } from './icons';
import { Button } from './ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/Card';

const ConnectionStatus: React.FC = () => {
    const { supabase, isConfigured, configureSupabase, checkConnection: checkSupabaseConnection } = useSupabase();
    const [isConnected, setIsConnected] = useState(false);
    const [isChecking, setIsChecking] = useState(false);
    const [showConfigModal, setShowConfigModal] = useState(false);
    const [supabaseUrl, setSupabaseUrl] = useState('');
    const [supabaseKey, setSupabaseKey] = useState('');

    // تحقق من الاتصال بقاعدة البيانات
    const checkConnection = async () => {
        if (!supabase) return;
        setIsChecking(true);
        try {
            const connected = await checkSupabaseConnection();
            setIsConnected(connected);
        } catch (error) {
            setIsConnected(false);
        } finally {
            setIsChecking(false);
        }
    };

    // التحقق من الاتصال عند تحميل المكون وعند تغيير حالة الاتصال
    useEffect(() => {
        if (isConfigured && supabase) {
            checkConnection();
        } else {
            setIsConnected(false);
        }
    }, [isConfigured, supabase]);

    // استرجاع بيانات الاتصال المحفوظة
    useEffect(() => {
        const savedUrl = localStorage.getItem('supabaseUrl');
        const savedKey = localStorage.getItem('supabaseKey');
        if (savedUrl) setSupabaseUrl(savedUrl);
        if (savedKey) setSupabaseKey(savedKey);
    }, []);

    const handleSaveConfig = () => {
        if (supabaseUrl && supabaseKey) {
            configureSupabase(supabaseUrl, supabaseKey);
            setShowConfigModal(false);
        }
    };

    return (
        <>
            {/* تم إخفاء أيقونة الاتصال العائمة بناءً على طلب المستخدم */}

            {/* نافذة إعدادات الاتصال */}
            {showConfigModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <Card className="w-full max-w-md">
                        <CardHeader>
                            <CardTitle className="text-xl font-bold text-center">إعدادات الاتصال بقاعدة البيانات</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <label htmlFor="supabaseUrl" className="block text-sm font-medium mb-2">
                                    رابط Supabase
                                </label>
                                <input
                                    id="supabaseUrl"
                                    type="text"
                                    value={supabaseUrl}
                                    onChange={(e) => setSupabaseUrl(e.target.value)}
                                    className="w-full p-2 border border-gray-300 rounded-md"
                                    placeholder="https://your-project.supabase.co"
                                />
                            </div>
                            <div>
                                <label htmlFor="supabaseKey" className="block text-sm font-medium mb-2">
                                    مفتاح API العام (anon key)
                                </label>
                                <input
                                    id="supabaseKey"
                                    type="password"
                                    value={supabaseKey}
                                    onChange={(e) => setSupabaseKey(e.target.value)}
                                    className="w-full p-2 border border-gray-300 rounded-md"
                                    placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                                />
                            </div>
                            <div className="flex justify-between">
                                <Button
                                    variant="secondary"
                                    onClick={() => setShowConfigModal(false)}
                                >
                                    إلغاء
                                </Button>
                                <Button onClick={handleSaveConfig}>
                                    حفظ الاتصال
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* رسالة في منتصف الشاشة عند عدم الاتصال */}
            {!isConnected && (
                <div className="fixed inset-0 flex items-center justify-center z-40 bg-gray-100 bg-opacity-90">
                    <Card className="w-full max-w-md">
                        <CardHeader className="text-center">
                            <div className="flex justify-center mb-4">
                                <Icons.Database className="h-16 w-16 text-red-500" />
                            </div>
                            <CardTitle className="text-xl font-bold">لا يوجد اتصال بقاعدة البيانات</CardTitle>
                        </CardHeader>
                        <CardContent className="text-center space-y-4">
                            <p>
                                لا يمكن الاتصال بقاعدة البيانات حالياً. يرجى التحقق من إعدادات الاتصال أو المحاولة مرة أخرى.
                            </p>
                            <div className="flex flex-col gap-2">
                                <Button
                                    onClick={checkConnection}
                                    disabled={isChecking}
                                    className="w-full"
                                >
                                    {isChecking ? 'جاري التحقق...' : 'محاولة الاتصال مرة أخرى'}
                                </Button>
                                <Button
                                    variant="secondary"
                                    onClick={() => setShowConfigModal(true)}
                                    className="w-full"
                                >
                                    إعدادات الاتصال
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}
        </>
    );
};

export default ConnectionStatus;
