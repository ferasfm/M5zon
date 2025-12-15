import React, { useState, useEffect } from 'react';
import { useInventory } from './hooks/useInventory';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import Products from './components/Products';
import Receiving from './components/Receiving';
import Dispatching from './components/Dispatching';
import DispatchManagement from './components/DispatchManagement';
import Scrapping from './components/Scrapping';
import Suppliers from './components/Suppliers';
import Locations from './components/Locations';
import Reports from './components/Reports';
import PrintTemplates from './components/PrintTemplates';
import Settings from './components/Settings';
import UsersManagement from './components/UsersManagement';
import ConnectionStatus from './components/ConnectionStatus';
import LoadingScreen from './components/LoadingScreen';
import Login from './components/Login';
import ChangePasswordModal from './components/ChangePasswordModal';
import ProtectedRoute from './components/ProtectedRoute';
import { Page } from './types';
import { NotificationProvider } from './contexts/NotificationContext';
import { SupabaseProvider, useSupabase } from './contexts/SupabaseContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { PermissionsProvider, usePermissions } from './contexts/PermissionsContext';
import { SettingsProvider } from './contexts/SettingsContext';
import { AppSettingsProvider } from './contexts/AppSettingsContext';
import ToastContainer from './components/ui/ToastContainer';
import { Icons } from './components/icons';

const MainApp: React.FC = () => {
    const inventory = useInventory();
    const { user, logout } = useAuth();
    const { canView } = usePermissions();
    const [currentPage, setCurrentPage] = useState<Page>('dashboard');

    // عرض شاشة التحميل فقط عند التحميل الأولي (عند بدء التطبيق)
    if (!inventory) {
        console.error('❌ inventory is null - لا يوجد اتصال بقاعدة البيانات');
        return (
            <div className="flex items-center justify-center h-screen bg-slate-50">
                <div className="text-center p-8 bg-white rounded-lg shadow-lg max-w-md">
                    <div className="text-6xl mb-4">⚠️</div>
                    <h2 className="text-2xl font-bold text-red-600 mb-4">خطأ في الاتصال</h2>
                    <p className="text-slate-700 mb-4">
                        لا يوجد اتصال بقاعدة البيانات. يرجى التحقق من:
                    </p>
                    <ul className="text-right text-sm text-slate-600 space-y-2 mb-6">
                        <li>✓ تشغيل خادم PostgreSQL</li>
                        <li>✓ إعدادات الاتصال في التطبيق</li>
                        <li>✓ اسم المستخدم وكلمة المرور</li>
                    </ul>
                    <button 
                        onClick={() => window.location.reload()} 
                        className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                    >
                        إعادة المحاولة
                    </button>
                </div>
            </div>
        );
    }
    
    // بعد التحميل الأولي، نستخدم Toast للإشعارات بدلاً من شاشة التحميل الكاملة
    if (inventory.isLoading && inventory.loadingMessage === 'جاري الاتصال بقاعدة البيانات...') {
        return <LoadingScreen message={inventory.loadingMessage} />;
    }

    const renderPage = () => {
        switch (currentPage) {
            case 'dashboard':
                return (
                    <ProtectedRoute page="dashboard">
                        <Dashboard inventory={inventory} />
                    </ProtectedRoute>
                );
            case 'products':
                return (
                    <ProtectedRoute page="products">
                        <Products inventory={inventory} />
                    </ProtectedRoute>
                );
            case 'receiving':
                return (
                    <ProtectedRoute page="receiving">
                        <Receiving inventory={inventory} />
                    </ProtectedRoute>
                );
            case 'dispatching':
                return (
                    <ProtectedRoute page="dispatching">
                        <Dispatching inventory={inventory} />
                    </ProtectedRoute>
                );
            case 'dispatch_management':
                return (
                    <ProtectedRoute page="dispatch_management">
                        <DispatchManagement inventory={inventory} />
                    </ProtectedRoute>
                );
            case 'scrapping':
                return (
                    <ProtectedRoute page="scrapping">
                        <Scrapping inventory={inventory} />
                    </ProtectedRoute>
                );
            case 'suppliers':
                return (
                    <ProtectedRoute page="suppliers">
                        <Suppliers inventory={inventory} />
                    </ProtectedRoute>
                );
            case 'locations':
                return (
                    <ProtectedRoute page="locations">
                        <Locations inventory={inventory} />
                    </ProtectedRoute>
                );
            case 'reports':
                return (
                    <ProtectedRoute page="reports">
                        <Reports inventory={inventory} />
                    </ProtectedRoute>
                );
            case 'print_templates':
                return (
                    <ProtectedRoute page="print_templates">
                        <PrintTemplates inventory={inventory} />
                    </ProtectedRoute>
                );
            case 'users':
                return (
                    <ProtectedRoute page="users">
                        <UsersManagement />
                    </ProtectedRoute>
                );
            case 'settings':
                return (
                    <ProtectedRoute page="settings">
                        <Settings inventory={inventory} />
                    </ProtectedRoute>
                );
            default:
                return (
                    <ProtectedRoute page="dashboard">
                        <Dashboard inventory={inventory} />
                    </ProtectedRoute>
                );
        }
    };

    return (
        <div className="flex h-screen bg-slate-50" dir="rtl">
            <ToastContainer />
            <ConnectionStatus />
            <Sidebar 
                currentPage={currentPage} 
                setCurrentPage={setCurrentPage}
                user={user}
                onLogout={logout}
            />
            <main className="flex-1 p-8 overflow-y-auto">
                {renderPage()}
            </main>
        </div>
    );
};

// مكون للتحقق من الاتصال بقاعدة البيانات
const DatabaseConnectionChecker: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { supabase, isConfigured } = useSupabase();
    const [isChecking, setIsChecking] = useState(true);
    const [connectionError, setConnectionError] = useState<string | null>(null);

    useEffect(() => {
        checkDatabaseConnection();
    }, [supabase, isConfigured]);

    const checkDatabaseConnection = async () => {
        if (!supabase || !isConfigured) {
            setConnectionError('لم يتم تكوين الاتصال بقاعدة البيانات');
            setIsChecking(false);
            return;
        }

        try {
            const { data, error } = await supabase.from('users').select('id').limit(1);
            
            if (error) {
                setConnectionError(`خطأ في الاتصال بقاعدة البيانات: ${error.message}`);
            } else {
                setConnectionError(null);
            }
        } catch (error: any) {
            setConnectionError(`فشل الاتصال بقاعدة البيانات: ${error.message}`);
        } finally {
            setIsChecking(false);
        }
    };

    if (isChecking) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 flex items-center justify-center">
                <div className="bg-white rounded-2xl shadow-2xl p-8 text-center">
                    <Icons.RefreshCw className="w-16 h-16 text-blue-600 animate-spin mx-auto mb-4" />
                    <h2 className="text-2xl font-bold text-gray-800 mb-2">جاري فحص الاتصال</h2>
                    <p className="text-gray-600">يتم التحقق من الاتصال بقاعدة البيانات...</p>
                </div>
            </div>
        );
    }

    if (connectionError) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-red-600 via-red-700 to-red-800 flex items-center justify-center">
                <div className="bg-white rounded-2xl shadow-2xl p-8 text-center max-w-md">
                    <Icons.AlertCircle className="w-16 h-16 text-red-600 mx-auto mb-4" />
                    <h2 className="text-2xl font-bold text-gray-800 mb-2">خطأ في الاتصال</h2>
                    <p className="text-gray-600 mb-4">{connectionError}</p>
                    <button
                        onClick={checkDatabaseConnection}
                        className="bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors duration-200 flex items-center gap-2 mx-auto"
                    >
                        <Icons.RefreshCw className="w-4 h-4" />
                        إعادة المحاولة
                    </button>
                </div>
            </div>
        );
    }

    return <>{children}</>;
};

// مكون إدارة المصادقة
const AuthManager: React.FC = () => {
    const { user, isAuthenticated, isLoading } = useAuth();
    const [showChangePassword, setShowChangePassword] = useState(false);

    useEffect(() => {
        if (isAuthenticated && user && (user.mustChangePassword || user.isFirstLogin)) {
            setShowChangePassword(true);
        }
    }, [isAuthenticated, user]);

    const handlePasswordChangeSuccess = () => {
        setShowChangePassword(false);
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 flex items-center justify-center">
                <div className="bg-white rounded-2xl shadow-2xl p-8 text-center">
                    <Icons.RefreshCw className="w-16 h-16 text-blue-600 animate-spin mx-auto mb-4" />
                    <h2 className="text-2xl font-bold text-gray-800 mb-2">جاري التحميل</h2>
                    <p className="text-gray-600">يتم التحقق من حالة تسجيل الدخول...</p>
                </div>
            </div>
        );
    }

    if (!isAuthenticated) {
        return <Login onLoginSuccess={() => {}} />;
    }

    return (
        <>
            <AppSettingsProvider>
                <SettingsProvider>
                    <NotificationProvider>
                        <MainApp />
                    </NotificationProvider>
                </SettingsProvider>
            </AppSettingsProvider>
            
            <ChangePasswordModal
                isOpen={showChangePassword}
                isFirstLogin={user?.isFirstLogin || false}
                onClose={() => setShowChangePassword(false)}
                onSuccess={handlePasswordChangeSuccess}
            />
        </>
    );
};

// مكون داخلي للوصول إلى supabase
const AppWithSupabase: React.FC = () => {
    const { supabase } = useSupabase();
    
    return (
        <DatabaseConnectionChecker>
            <AuthProvider supabase={supabase}>
                <PermissionsProvider supabase={supabase}>
                    <AuthManager />
                </PermissionsProvider>
            </AuthProvider>
        </DatabaseConnectionChecker>
    );
};

const App: React.FC = () => {
    return (
        <SupabaseProvider>
            <AppWithSupabase />
        </SupabaseProvider>
    );
};

export default App;
