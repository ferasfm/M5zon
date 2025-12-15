import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { usePermissions } from '../contexts/PermissionsContext';
import { Icons } from './icons';

interface ProtectedRouteProps {
    children: React.ReactNode;
    page: string;
    requireView?: boolean;
    requireAdd?: boolean;
    requireEdit?: boolean;
    requireDelete?: boolean;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
    children,
    page,
    requireView = true,
    requireAdd = false,
    requireEdit = false,
    requireDelete = false
}) => {
    const { isAuthenticated, user } = useAuth();
    const { canView, canAdd, canEdit, canDelete, isLoading } = usePermissions();

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <Icons.RefreshCw className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
                    <p className="text-gray-600">جاري التحميل...</p>
                </div>
            </div>
        );
    }

    if (!isAuthenticated) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-100">
                <div className="bg-white rounded-lg shadow-lg p-8 max-w-md text-center">
                    <Icons.Lock className="w-16 h-16 text-red-500 mx-auto mb-4" />
                    <h2 className="text-2xl font-bold text-gray-800 mb-2">غير مصرح</h2>
                    <p className="text-gray-600 mb-4">يجب تسجيل الدخول للوصول إلى هذه الصفحة</p>
                </div>
            </div>
        );
    }

    // التحقق من الصلاحيات
    const hasRequiredPermissions = 
        (!requireView || canView(page)) &&
        (!requireAdd || canAdd(page)) &&
        (!requireEdit || canEdit(page)) &&
        (!requireDelete || canDelete(page));

    if (!hasRequiredPermissions) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-100">
                <div className="bg-white rounded-lg shadow-lg p-8 max-w-md text-center">
                    <Icons.Shield className="w-16 h-16 text-red-500 mx-auto mb-4" />
                    <h2 className="text-2xl font-bold text-gray-800 mb-2">غير مصرح</h2>
                    <p className="text-gray-600 mb-4">
                        ليس لديك صلاحية للوصول إلى هذه الصفحة
                    </p>
                    <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-700">
                        <p><strong>المستخدم:</strong> {user?.username}</p>
                        <p><strong>الدور:</strong> {user?.role}</p>
                        <p><strong>الصفحة:</strong> {page}</p>
                    </div>
                </div>
            </div>
        );
    }

    return <>{children}</>;
};

export default ProtectedRoute;
