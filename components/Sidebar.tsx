import React from 'react';
import { Page } from '../types';
import { Icons } from './icons';

interface SidebarProps {
    currentPage: Page;
    setCurrentPage: (page: Page) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ currentPage, setCurrentPage }) => {
    const navItems = [
        { id: 'dashboard', label: 'لوحة التحكم', icon: <Icons.Dashboard className="h-5 w-5" /> },
        { id: 'products', label: 'المنتجات', icon: <Icons.Products className="h-5 w-5" /> },
        { type: 'divider', label: 'الحركات' },
        { id: 'receiving', label: 'استلام بضاعة', icon: <Icons.Receiving className="h-5 w-5" /> },
        { id: 'dispatching', label: 'صرف بضاعة', icon: <Icons.Dispatching className="h-5 w-5" /> },
        { id: 'scrapping', label: 'إتلاف بضاعة', icon: <Icons.Trash2 className="h-5 w-5" /> },
        { type: 'divider', label: 'الجهات' },
        { id: 'suppliers', label: 'الموردون', icon: <Icons.Suppliers className="h-5 w-5" /> },
        { id: 'locations', label: 'المواقع والعملاء', icon: <Icons.MapPin className="h-5 w-5" /> },
        { type: 'divider', label: 'التقارير' },
        { id: 'reports', label: 'تقارير المخزون', icon: <Icons.FileText className="h-5 w-5" /> },
        { id: 'print_templates', label: 'مطالبات مالية', icon: <Icons.Printer className="h-5 w-5" /> },
    ] as const;

    return (
        <aside className="w-64 bg-white border-l border-slate-200 p-6 flex flex-col">
            <div className="flex items-center gap-3 mb-8">
                <Icons.Logo className="h-8 w-8 text-primary" />
                <h1 className="text-xl font-bold text-dark">نظام المخزون</h1>
            </div>
            <nav className="flex-1 space-y-2">
                {navItems.map((item, index) => {
                    // FIX: Use a type guard to differentiate between a navigation item and a divider.
                    // The 'in' operator checks for the existence of an 'id' property,
                    // which allows TypeScript to narrow the type of 'item' within each branch of the if/else statement.
                    if ('id' in item) {
                        const { id, label, icon } = item;
                        const isActive = currentPage === id;
                        return (
                            <button
                                key={id}
                                onClick={() => setCurrentPage(id)}
                                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
                                    isActive 
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
            <div className="mt-auto">
                 <button
                    onClick={() => setCurrentPage('settings')}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
                        currentPage === 'settings' 
                        ? 'bg-slate-200 text-dark' 
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                >
                    <Icons.Settings className="h-5 w-5"/>
                    الإعدادات
                </button>
            </div>
        </aside>
    );
};

export default Sidebar;