import React, { useState, useEffect } from 'react';
import { Page } from '../types';
import { Icons } from './icons';
import { useSettings } from '../contexts/SettingsContext';
import { useSupabase } from '../contexts/SupabaseContext';

interface SidebarProps {
    currentPage: Page;
    setCurrentPage: (page: Page) => void;
    user?: any;
    onLogout?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ currentPage, setCurrentPage, user, onLogout }) => {
    const { getSetting } = useSettings();
    const { connectionType, checkConnection } = useSupabase();
    const [companyName, setCompanyName] = useState('نظام المخزون');
    const [isConnected, setIsConnected] = useState(true);

    // جلب اسم الشركة من الإعدادات
    useEffect(() => {
        const fetchCompanyName = async () => {
            const name = await getSetting('company_name', 'نظام المخزون');
            setCompanyName(name);
        };
        fetchCompanyName();
    }, [getSetting]);

    // التحقق من الاتصال دورياً
    useEffect(() => {
        const check = async () => {
            const status = await checkConnection();
            setIsConnected(status);
        };
        check();
        const interval = setInterval(check, 30000); // Check every 30 seconds
        return () => clearInterval(interval);
    }, [checkConnection]);

    const navItems = [
        { id: 'dashboard', label: 'لوحة التحكم', icon: <Icons.Dashboard className="h-5 w-5" /> },
        { id: 'products', label: 'المنتجات', icon: <Icons.Products className="h-5 w-5" /> },
        { type: 'divider', label: 'الحركات' },
        { id: 'receiving', label: 'استلام بضاعة', icon: <Icons.Receiving className="h-5 w-5" /> },
        { id: 'dispatching', label: 'صرف بضاعة', icon: <Icons.Dispatching className="h-5 w-5" /> },
        { id: 'dispatch_management', label: 'إدارة التسليمات', icon: <Icons.Edit className="h-5 w-5" /> },
        { id: 'scrapping', label: 'إتلاف بضاعة', icon: <Icons.Trash2 className="h-5 w-5" /> },
        { type: 'divider', label: 'الجهات' },
        { id: 'suppliers', label: 'الموردون', icon: <Icons.Suppliers className="h-5 w-5" /> },
        { id: 'locations', label: 'المواقع والعملاء', icon: <Icons.MapPin className="h-5 w-5" /> },
        { type: 'divider', label: 'التقارير' },
        { id: 'reports', label: 'تقارير المخزون', icon: <Icons.FileText className="h-5 w-5" /> },
        { id: 'print_templates', label: 'مطالبات مالية', icon: <Icons.Printer className="h-5 w-5" /> },
    ] as const;

    return (
        <aside className="w-64 bg-white border-l border-slate-200 p-3 flex flex-col h-screen overflow-hidden">
            {/* Header مضغوط */}
            <div className="flex items-center gap-2 mb-3">
                <Icons.Logo className="h-6 w-6 text-primary" />
                <h1 className="text-base font-bold text-dark truncate">{companyName}</h1>
            </div>

            {/* معلومات المستخدم مضغوطة */}
            {user && (
                <div className="mb-2 px-2 py-2 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
                    <div className="flex items-center gap-2">
                        <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                            <Icons.User className="h-3 w-3 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="text-xs font-bold text-slate-800 truncate">{user.username}</div>
                            <div className="text-[10px] text-blue-700 font-medium">
                                {user.role === 'admin' ? '👑 مدير' : user.role === 'manager' ? '📊 مدير' : '👤 مستخدم'}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* مؤشر حالة الاتصال مضغوط */}
            <div className={`mb-2 px-2 py-1.5 rounded-lg border flex items-center justify-center ${isConnected ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                <span className={`text-[10px] font-bold ${isConnected ? 'text-green-700' : 'text-red-700'}`}>
                    {isConnected ? '🟢 متصل' : '🔴 غير متصل'} • {connectionType === 'local' ? 'محلي' : 'سحابي'}
                </span>
            </div>

            {/* القائمة مع تمرير داخلي */}
            <nav className="flex-1 space-y-1 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-transparent">
                {navItems.map((item, index) => {
                    if ('id' in item) {
                        const { id, label, icon } = item;
                        const isActive = currentPage === id;
                        return (
                            <button
                                key={id}
                                onClick={() => setCurrentPage(id)}
                                className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs font-medium transition-colors ${isActive
                                        ? 'bg-primary text-white'
                                        : 'text-slate-700 hover:bg-slate-100'
                                    }`}
                            >
                                <span className="flex-shrink-0">{icon}</span>
                                <span className="truncate">{label}</span>
                            </button>
                        );
                    } else {
                        return <h3 key={index} className="px-2 pt-2 pb-1 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{item.label}</h3>;
                    }
                })}
            </nav>

            {/* الأزرار السفلية */}
            <div className="mt-2 space-y-1 border-t border-slate-200 pt-2">
                <button
                    onClick={() => setCurrentPage('settings')}
                    className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs font-medium transition-colors ${currentPage === 'settings'
                            ? 'bg-slate-200 text-dark'
                            : 'text-slate-600 hover:bg-slate-100'
                        }`}
                >
                    <Icons.Settings className="h-4 w-4" />
                    الإعدادات
                </button>
                
                {onLogout && (
                    <button
                        onClick={onLogout}
                        className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs font-medium text-red-600 hover:bg-red-50 transition-colors"
                    >
                        <Icons.LogOut className="h-4 w-4" />
                        تسجيل الخروج
                    </button>
                )}
            </div>
        </aside>
    );
};

export default Sidebar;