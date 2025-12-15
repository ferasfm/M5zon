import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import { Icons } from './icons';

interface ChangePasswordModalProps {
    isOpen: boolean;
    isFirstLogin: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({ isOpen, isFirstLogin, onClose, onSuccess }) => {
    const { changePassword, user } = useAuth();
    const [oldPassword, setOldPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [showPasswords, setShowPasswords] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        // التحقق من الحقول
        if (!oldPassword || !newPassword || !confirmPassword) {
            setError('الرجاء ملء جميع الحقول');
            return;
        }

        // التحقق من تطابق كلمة المرور
        if (newPassword !== confirmPassword) {
            setError('كلمة المرور الجديدة غير متطابقة');
            return;
        }

        // التحقق من طول كلمة المرور
        if (newPassword.length < 6) {
            setError('كلمة المرور يجب أن تكون 6 أحرف على الأقل');
            return;
        }

        setIsLoading(true);

        try {
            const result = await changePassword(oldPassword, newPassword);

            if (result.success) {
                onSuccess();
            } else {
                setError(result.error || 'فشل تغيير كلمة المرور');
            }
        } catch (error) {
            setError('حدث خطأ غير متوقع');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Modal 
            isOpen={isOpen} 
            onClose={isFirstLogin ? () => {} : onClose} 
            title={isFirstLogin ? "تغيير كلمة المرور - أول دخول" : "تغيير كلمة المرور"}
        >
            <div className="p-6">
                {isFirstLogin && (
                    <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                        <div className="flex items-start gap-3">
                            <Icons.AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                            <div>
                                <p className="text-sm font-medium text-yellow-800 mb-1">
                                    مرحباً بك في نظام إدارة المخزون!
                                </p>
                                <p className="text-sm text-yellow-700">
                                    لأسباب أمنية، يجب عليك تغيير كلمة المرور الافتراضية قبل المتابعة.
                                </p>
                                {user?.email === 'it@alhuda.ps' && (
                                    <p className="text-sm text-yellow-700 mt-2">
                                        <strong>البريد الإلكتروني:</strong> {user.email} (ثابت)
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {error && (
                    <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2">
                        <Icons.AlertCircle className="w-5 h-5 flex-shrink-0" />
                        <span className="text-sm">{error}</span>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* كلمة المرور القديمة */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            كلمة المرور الحالية
                        </label>
                        <input
                            type={showPasswords ? 'text' : 'password'}
                            value={oldPassword}
                            onChange={(e) => setOldPassword(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            placeholder="أدخل كلمة المرور الحالية"
                            disabled={isLoading}
                            autoFocus
                        />
                    </div>

                    {/* كلمة المرور الجديدة */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            كلمة المرور الجديدة
                        </label>
                        <input
                            type={showPasswords ? 'text' : 'password'}
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            placeholder="أدخل كلمة المرور الجديدة (6 أحرف على الأقل)"
                            disabled={isLoading}
                        />
                    </div>

                    {/* تأكيد كلمة المرور */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            تأكيد كلمة المرور الجديدة
                        </label>
                        <input
                            type={showPasswords ? 'text' : 'password'}
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            placeholder="أعد إدخال كلمة المرور الجديدة"
                            disabled={isLoading}
                        />
                    </div>

                    {/* إظهار كلمات المرور */}
                    <div className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            id="showPasswords"
                            checked={showPasswords}
                            onChange={(e) => setShowPasswords(e.target.checked)}
                            className="rounded"
                        />
                        <label htmlFor="showPasswords" className="text-sm text-gray-700 cursor-pointer">
                            إظهار كلمات المرور
                        </label>
                    </div>

                    {/* الأزرار */}
                    <div className="flex gap-3 pt-4">
                        <Button
                            type="submit"
                            disabled={isLoading}
                            className="flex-1"
                        >
                            {isLoading ? (
                                <>
                                    <Icons.RefreshCw className="w-4 h-4 ml-2 animate-spin" />
                                    جاري التغيير...
                                </>
                            ) : (
                                <>
                                    <Icons.Check className="w-4 h-4 ml-2" />
                                    تغيير كلمة المرور
                                </>
                            )}
                        </Button>
                        {!isFirstLogin && (
                            <Button
                                type="button"
                                variant="secondary"
                                onClick={onClose}
                                disabled={isLoading}
                            >
                                إلغاء
                            </Button>
                        )}
                    </div>
                </form>
            </div>
        </Modal>
    );
};

export default ChangePasswordModal;
