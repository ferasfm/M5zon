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

    // عرض شاشة التحميل
    if (!inventory || inventory.isLoading) {
        return <LoadingScreen message={inventory?.loadingMessage || 'جاري الاتصال بقاعدة البيانات...'} />;
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
