import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Icons } from './icons';

const Login: React.FC<{ onLoginSuccess: () => void }> = ({ onLoginSuccess }) => {
    const { login } = useAuth();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [rememberMe, setRememberMe] = useState(false);

    // تحميل البيانات المحفوظة عند بدء التشغيل
    useEffect(() => {
        const savedUsername = localStorage.getItem('savedUsername');
        const savedPassword = localStorage.getItem('savedPassword');
        const savedRemember = localStorage.getItem('rememberMe');

        if (savedRemember === 'true' && savedUsername && savedPassword) {
            setUsername(savedUsername);
            setPassword(savedPassword);
            setRememberMe(true);
        }
    }, []);


    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!username || !password) {
            setError('الرجاء إدخال اسم المستخدم وكلمة المرور');
            return;
        }

        setIsLoading(true);

        try {
            const result = await login(username, password);

            if (result.success) {
                // حفظ البيانات إذا كان "تذكرني" مفعل
                if (rememberMe) {
                    localStorage.setItem('savedUsername', username);
                    localStorage.setItem('savedPassword', password);
                    localStorage.setItem('rememberMe', 'true');
                } else {
                    // حذف البيانات المحفوظة إذا كان "تذكرني" غير مفعل
                    localStorage.removeItem('savedUsername');
                    localStorage.removeItem('savedPassword');
                    localStorage.removeItem('rememberMe');
                }
                
                onLoginSuccess();
            } else {
                setError(result.error || 'فشل تسجيل الدخول');
            }
        } catch (error) {
            setError('حدث خطأ غير متوقع');
        } finally {
            setIsLoading(false);
        }
    };



    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8">
                {/* Logo and Title */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-20 h-20 bg-blue-100 rounded-full mb-4">
                        <Icons.Lock className="w-10 h-10 text-blue-600" />
                    </div>
                    <h1 className="text-3xl font-bold text-gray-800 mb-2">نظام إدارة المخزون</h1>
                    <p className="text-gray-600">تسجيل الدخول إلى حسابك</p>
                </div>

                {/* Error Message */}
                {error && (
                    <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2">
                        <Icons.AlertCircle className="w-5 h-5 flex-shrink-0" />
                        <span className="text-sm">{error}</span>
                    </div>
                )}

                {/* Login Form */}
                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Username */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2 text-right">
                            اسم المستخدم
                        </label>
                        <div className="relative">
                            <input
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                className="block w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-right"
                                placeholder="admin"
                                disabled={isLoading}
                                autoFocus
                            />
                        </div>
                    </div>

                    {/* Password */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2 text-right">
                            كلمة المرور
                        </label>
                        <div className="relative">
                            <input
                                type={showPassword ? 'text' : 'password'}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="block w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-right"
                                placeholder="••••••••"
                                disabled={isLoading}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute inset-y-0 left-0 pl-3 flex items-center z-10"
                            >
                                {showPassword ? (
                                    <Icons.EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                                ) : (
                                    <Icons.Eye className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                                )}
                            </button>
                        </div>
                    </div>

                    {/* Remember Me Checkbox */}
                    <div className="flex items-center justify-between">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={rememberMe}
                                onChange={(e) => setRememberMe(e.target.checked)}
                                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                            />
                            <span className="text-sm text-gray-700">تذكرني</span>
                        </label>
                        <button
                            type="button"
                            onClick={() => alert('يرجى التواصل مع مدير النظام لإعادة تعيين كلمة المرور')}
                            className="text-sm text-blue-600 hover:text-blue-700 hover:underline"
                        >
                            نسيت كلمة المرور؟
                        </button>
                    </div>

                    {/* Submit Button */}
                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isLoading ? (
                            <>
                                <Icons.RefreshCw className="w-5 h-5 animate-spin" />
                                جاري تسجيل الدخول...
                            </>
                        ) : (
                            <>
                                <Icons.LogIn className="w-5 h-5" />
                                تسجيل الدخول
                            </>
                        )}
                    </button>
                </form>

                {/* Footer */}
                <div className="mt-8 text-center text-sm text-gray-500">
                    <p>© 2025 نظام إدارة المخزون - Al-Huda</p>
                </div>
            </div>
        </div>
    );
};

export default Login;
