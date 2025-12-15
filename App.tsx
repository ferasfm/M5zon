import React, { useState } from 'react';
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
import ConnectionStatus from './components/ConnectionStatus';
import LoadingScreen from './components/LoadingScreen';
import { Page } from './types';
import { NotificationProvider } from './contexts/NotificationContext';
import { SupabaseProvider, useSupabase } from './contexts/SupabaseContext';
import { SettingsProvider } from './contexts/SettingsContext';
import { AppSettingsProvider } from './contexts/AppSettingsContext';
import ToastContainer from './components/ui/ToastContainer';

const MainApp: React.FC = () => {
    const inventory = useInventory();
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
                return <Dashboard inventory={inventory} />;
            case 'products':
                return <Products inventory={inventory} />;
            case 'receiving':
                return <Receiving inventory={inventory} />;
            case 'dispatching':
                return <Dispatching inventory={inventory} />;
            case 'dispatch_management':
                return <DispatchManagement inventory={inventory} />;
            case 'scrapping':
                return <Scrapping inventory={inventory} />;
            case 'suppliers':
                return <Suppliers inventory={inventory} />;
            case 'locations':
                return <Locations inventory={inventory} />;
            case 'reports':
                return <Reports inventory={inventory} />;
            case 'print_templates':
                return <PrintTemplates inventory={inventory} />;
             case 'settings':
                return <Settings inventory={inventory} />;
            default:
                return <Dashboard inventory={inventory} />;
        }
    };

    return (
        <div className="flex h-screen bg-slate-50" dir="rtl">
            <ToastContainer />
            <ConnectionStatus />
            <Sidebar currentPage={currentPage} setCurrentPage={setCurrentPage} />
            <main className="flex-1 p-8 overflow-y-auto">
                {renderPage()}
            </main>
        </div>
    );
};

const App: React.FC = () => {
    return (
        <SupabaseProvider>
            <AppSettingsProvider>
                <SettingsProvider>
                    <NotificationProvider>
                        <MainApp />
                    </NotificationProvider>
                </SettingsProvider>
            </AppSettingsProvider>
        </SupabaseProvider>
    );
};

export default App;
