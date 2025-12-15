import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Icons } from './icons';
import { Button } from './ui/Button';

interface ForgotPasswordProps {
    onBack: () => void;
}

const ForgotPassword: React.FC<ForgotPasswordProps> = ({ onBack }) => {
    const { resetPassword, confirmPasswordReset } = useAuth();
    const [step, setStep] = useState<'email' | 'token'>('email');
    const [email, setEmail] = useState('');
    const [resetToken, setResetToken] = useState('');
    const [generatedToken, setGeneratedToken] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const handleRequestReset = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        if (!email) {
            setError('الرجاء إدخال البريد الإلكتروني');
            return;
        }

        // التحقق من صيغة البريد الإلكتروني
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            setError('صيغة البريد الإلكتروني غير صحيحة');
            return;
        }

        setIsLoading(true);

        try {
            const result = await resetPassword(email);

            if (result.success && result.token) {
                setGeneratedToken(result.token);
                setSuccess('تم إنشاء رمز إعادة التعيين بنجاح');
                setStep('token');
            } else {
                setError(result.error || 'فشل إنشاء رمز إعادة التعيين');
            }
        } catch (error) {
            setError('حدث خطأ غير متوقع');
        } finally {
            setIsLoading(false);
        }
    };

    const handleConfirmReset = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        if (!resetToken || !newPassword || !confirmPassword) {
            setError('الرجاء ملء جميع الحقول');
            return;
        }

        if (newPassword !== confirmPassword) {
            setError('كلمة المرور غير متطابقة');
            return;
        }

        if (newPassword.length < 6) {
            setError('كلمة المرور يجب أن تكون 6 أحرف على الأقل');
            return;
        }

        setIsLoading(true);

        try {
            const result = await confirmPasswordReset(resetToken, newPassword);

            if (result.success) {
                setSuccess('تم تغيير كلمة المرور بنجاح! يمكنك الآن تسجيل الدخول');
                setTimeout(() => {
                    onBack();
                }, 2000);
            } else {
                setError(result.error || 'فشل تغيير كلمة المرور');
            }
        } catch (error) {
            setError('حدث خطأ غير متوقع');
        } finally {
            setIsLoading(false);
        }
    };

    const copyToClipboard = () => {
        navigator.clipboard.writeText(generatedToken);
        setSuccess('تم نسخ الرمز إلى الحافظة');
        setTimeout(() => setSuccess(''), 2000);
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8">
                {/* Header */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-20 h-20 bg-blue-100 rounded-full mb-4">
                        <Icons.Key className="w-10 h-10 text-blue-600" />
                    </div>
                    <h1 className="text-3xl font-bold text-gray-800 mb-2">
                        {step === 'email' ? 'نسيت كلمة المرور؟' : 'إعادة تعيين كلمة المرور'}
                    </h1>
                    <p className="text-gray-600">
                        {step === 'email' 
                            ? 'أدخل بريدك الإلكتروني لإنشاء رمز إعادة التعيين'
                            : 'أدخل الرمز وكلمة المرور الجديدة'
                        }
                    </p>
                </div>

                {/* Error Message */}
                {error && (
                    <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2">
                        <Icons.AlertCircle className="w-5 h-5 flex-shrink-0" />
                        <span className="text-sm">{error}</span>
                    </div>
                )}

                {/* Success Message */}
                {success && (
                    <div className="mb-6 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg flex items-center gap-2">
                        <Icons.CheckCircle className="w-5 h-5 flex-shrink-0" />
                        <span className="text-sm">{success}</span>
                    </div>
                )}

                {/* Step 1: Email */}
                {step === 'email' && (
                    <form onSubmit={handleRequestReset} className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                البريد الإلكتروني
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                                    <Icons.Mail className="h-5 w-5 text-gray-400" />
                                </div>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="block w-full pr-10 pl-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    placeholder="example@alhuda.ps"
                                    disabled={isLoading}
                                    autoFocus
                                />
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <button
                                type="submit"
                                disabled={isLoading}
                                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isLoading ? (
                                    <>
                                        <Icons.RefreshCw className="w-5 h-5 animate-spin" />
                                        جاري الإنشاء...
                                    </>
                                ) : (
                                    <>
                                        <Icons.Send className="w-5 h-5" />
                                        إنشاء رمز
                                    </>
                                )}
                            </button>
                            <button
                                type="button"
                                onClick={onBack}
                                disabled={isLoading}
                                className="px-6 py-3 border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-colors duration-200"
                            >
                                رجوع
                            </button>
                        </div>
                    </form>
                )}

                {/* Step 2: Token and New Password */}
                {step === 'token' && (
                    <>
                        {/* Display Generated Token */}
                        {generatedToken && (
                            <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
                                <div className="flex items-start gap-3">
                                    <Icons.Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                                    <div className="flex-1">
                                        <p className="text-sm font-medium text-blue-800 mb-2">
                                            رمز إعادة التعيين الخاص بك:
                                        </p>
                                        <div className="bg-white border border-blue-300 rounded p-3 mb-2">
                                            <code className="text-sm font-mono text-blue-900 break-all">
                                                {generatedToken}
                                            </code>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={copyToClipboard}
                                            className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
                                        >
                                            <Icons.Copy className="w-4 h-4" />
                                            نسخ الرمز
                                        </button>
                                        <p className="text-xs text-blue-700 mt-2">
                                            ⏰ صالح لمدة ساعة واحدة فقط
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}

                        <form onSubmit={handleConfirmReset} className="space-y-4">
                            {/* Reset Token */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    رمز إعادة التعيين
                                </label>
                                <input
                                    type="text"
                                    value={resetToken}
                                    onChange={(e) => setResetToken(e.target.value)}
                                    className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                                    placeholder="الصق الرمز هنا"
                                    disabled={isLoading}
                                />
                            </div>

                            {/* New Password */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    كلمة المرور الجديدة
                                </label>
                                <div className="relative">
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                        placeholder="6 أحرف على الأقل"
                                        disabled={isLoading}
                                    />
                                </div>
                            </div>

                            {/* Confirm Password */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    تأكيد كلمة المرور
                                </label>
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                    placeholder="أعد إدخال كلمة المرور"
                                    disabled={isLoading}
                                />
                            </div>

                            {/* Show Password */}
                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    id="showPassword"
                                    checked={showPassword}
                                    onChange={(e) => setShowPassword(e.target.checked)}
                                    className="rounded"
                                />
                                <label htmlFor="showPassword" className="text-sm text-gray-700 cursor-pointer">
                                    إظهار كلمات المرور
                                </label>
                            </div>

                            {/* Buttons */}
                            <div className="flex gap-3 pt-2">
                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isLoading ? (
                                        <>
                                            <Icons.RefreshCw className="w-5 h-5 animate-spin" />
                                            جاري التغيير...
                                        </>
                                    ) : (
                                        <>
                                            <Icons.Check className="w-5 h-5" />
                                            تغيير كلمة المرور
                                        </>
                                    )}
                                </button>
                                <button
                                    type="button"
                                    onClick={onBack}
                                    disabled={isLoading}
                                    className="px-6 py-3 border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-colors duration-200"
                                >
                                    رجوع
                                </button>
                            </div>
                        </form>
                    </>
                )}
            </div>
        </div>
    );
};

export default ForgotPassword;
