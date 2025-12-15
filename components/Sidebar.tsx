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
        { type: 'divider', label: 'الإدارة' },
        { id: 'users', label: 'إدارة المستخدمين', icon: <Icons.User className="h-5 w-5" /> },
    ] as const;

    return (
        <aside className="w-64 bg-white border-l border-slate-200 p-6 flex flex-col">
            <div className="flex items-center gap-3 mb-6">
                <Icons.Logo className="h-8 w-8 text-primary" />
                <h1 className="text-xl font-bold text-dark">{companyName}</h1>
            </div>

            {/* مؤشر حالة الاتصال */}
            <div className={`mb-6 p-3 rounded-lg border flex items-center justify-between ${isConnected ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
                }`}>
                <div className="flex flex-col w-full text-center">
                    <span className={`text-xs font-bold ${isConnected ? 'text-green-700' : 'text-red-700'}`}>
                        {isConnected ? 'متصل' : 'غير متصل'}
                    </span>
                    <span className="text-[10px] text-gray-500 mt-0.5">
                        {connectionType === 'local' ? 'سيرفر محلي' : 'قاعدة بيانات سحابية'}
                    </span>
                </div>
            </div>

            <nav className="flex-1 space-y-2">
                {navItems.map((item, index) => {
                    if ('id' in item) {
                        const { id, label, icon } = item;
                        const isActive = currentPage === id;
                        return (
                            <button
                                key={id}
                                onClick={() => setCurrentPage(id)}
                                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${isActive
                                        ? 'bg-primary text-white'
                                        : 'text-slate-700 hover:bg-slate-100'
                                    }`}
                            >
                                {icon}
                                {label}
                            </button>
                        );
                    } else {
                        return <h3 key={index} className="px-3 pt-4 pb-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">{item.label}</h3>;
                    }
                })}
            </nav>
            <div className="mt-auto space-y-2">
                {/* معلومات المستخدم */}
                {user && (
                    <div className="px-3 py-2 bg-slate-50 rounded-lg border border-slate-200">
                        <div className="flex items-center gap-2 mb-1">
                            <Icons.User className="h-4 w-4 text-slate-600" />
                            <span className="text-sm font-medium text-slate-800">{user.username}</span>
                        </div>
                        <div className="text-xs text-slate-500">{user.fullName}</div>
                        <div className="text-xs text-slate-400 mt-1">
                            {user.role === 'admin' ? 'مدير النظام' : 
                             user.role === 'manager' ? 'مدير' : 'مستخدم'}
                        </div>
                    </div>
                )}
                
                <button
                    onClick={() => setCurrentPage('settings')}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${currentPage === 'settings'
                            ? 'bg-slate-200 text-dark'
                            : 'text-slate-600 hover:bg-slate-100'
                        }`}
                >
                    <Icons.Settings className="h-5 w-5" />
                    الإعدادات
                </button>
                
                {/* زر تسجيل الخروج */}
                {onLogout && (
                    <button
                        onClick={onLogout}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
                    >
                        <Icons.LogOut className="h-5 w-5" />
                        تسجيل الخروج
                    </button>
                )}
            </div>
        </aside>
    );
};

export default Sidebar;