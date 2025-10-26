import React from 'react';
import { InventoryItem, UseInventoryReturn } from '../types';
import { Card, CardContent, CardHeader, CardTitle } from './ui/Card';
import { Icons } from './icons';

const Dashboard: React.FC<{ inventory: UseInventoryReturn }> = ({ inventory }) => {
    const { 
        inventoryItems,
        products,
        suppliers,
        settings, // Get settings from the hook
        getAggregatedInventoryValue,
        getLowStockProducts,
        getExpiringWarranties,
        getScrappedValueLast30Days
    } = inventory;

    const totalStockValue = getAggregatedInventoryValue();
    const inStockCount = inventoryItems.filter(i => i.status === 'in_stock').length;
    const scrappedValueLast30Days = getScrappedValueLast30Days();

    // Use settings for dynamic thresholds
    const lowStockProducts = getLowStockProducts(settings.lowStockThreshold);
    const expiringWarranties = getExpiringWarranties(settings.warrantyDaysThreshold);

    const recentActivities = [...inventoryItems]
        .filter(item => item.dispatchDate || item.status === 'scrapped' || item.status === 'in_stock')
        .sort((a, b) => {
            const dateA = a.dispatchDate || a.purchaseDate;
            const dateB = b.dispatchDate || b.purchaseDate;
            return new Date(dateB).getTime() - new Date(dateA).getTime();
        })
        .slice(0, 5); // get last 5 activities

    const getStatusInfo = (item: InventoryItem) => {
        const product = inventory.getProductById(item.productId);
        switch(item.status) {
            case 'in_stock': return { text: `استلام: ${product?.name}`, icon: <Icons.Receiving className="h-5 w-5 text-success" />, date: item.purchaseDate };
            case 'dispatched': return { text: `صرف: ${product?.name}`, icon: <Icons.Dispatching className="h-5 w-5 text-warning" />, date: item.dispatchDate! };
            case 'scrapped': return { text: `إتلاف: ${product?.name}`, icon: <Icons.Trash2 className="h-5 w-5 text-danger" />, date: item.scrapDate || item.purchaseDate };
        }
        return { text: '', icon: null, date: new Date() };
    };

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold text-dark">لوحة التحكم</h1>
            
            {/* Expiring Warranties Alert Card */}
            {expiringWarranties.length > 0 && (
                <Card className="bg-yellow-50 border-yellow-200 shadow-sm">
                    <CardHeader className="flex flex-row items-center gap-3 pb-2 border-yellow-200">
                        <Icons.CalendarClock className="h-6 w-6 text-yellow-600" />
                        <CardTitle className="text-yellow-800">تنبيه: كفالات شارفت على الانتهاء</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-yellow-700 mb-4">
                            القطع التالية ستنتهي كفالتها خلال {settings.warrantyDaysThreshold} يومًا.
                        </p>
                        <ul className="space-y-2 max-h-40 overflow-y-auto">
                            {expiringWarranties.map(item => {
                                const product = inventory.getProductById(item.productId);
                                return (
                                    <li key={item.id} className="flex justify-between items-center text-sm p-2 bg-white rounded-md border">
                                        <div>
                                            <span className="font-bold text-dark">{product?.name}</span>
                                            <span className="text-xs text-slate-500 block font-mono">بار كود القطعة: {item.serialNumber}</span>
                                        </div>
                                        <div className="text-right">
                                           <span className="font-semibold text-danger">
                                               تنتهي في: {new Date(item.warrantyEndDate!).toLocaleDateString('ar-EG')}
                                           </span>
                                           <span className="text-xs text-slate-500 block">بحاجة إلى تجديد</span>
                                        </div>
                                    </li>
                                );
                            })}
                        </ul>
                    </CardContent>
                </Card>
            )}

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">قيمة المخزون (بالتكلفة)</CardTitle>
                        <Icons.Dashboard className="h-4 w-4 text-slate-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{totalStockValue.toLocaleString('ar-SA', { style: 'currency', currency: 'ILS' })}</div>
                        <p className="text-xs text-slate-500">القيمة الإجمالية للقطع المتوفرة</p>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">القطع في المخزون</CardTitle>
                        <Icons.Products className="h-4 w-4 text-slate-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{inStockCount}</div>
                        <p className="text-xs text-slate-500">إجمالي القطع المتوفرة حالياً</p>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">أنواع المنتجات</CardTitle>
                        <Icons.Products className="h-4 w-4 text-slate-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{products.length}</div>
                        <p className="text-xs text-slate-500">إجمالي المنتجات في الكتالوج</p>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">الموردون</CardTitle>
                        <Icons.Suppliers className="h-4 w-4 text-slate-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{suppliers.length}</div>
                        <p className="text-xs text-slate-500">إجمالي الموردين المسجلين</p>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">قيمة المواد المتلفة (آخر 30 يومًا)</CardTitle>
                        <Icons.AlertTriangle className="h-4 w-4 text-danger" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-danger">{scrappedValueLast30Days.toLocaleString('ar-SA', { style: 'currency', currency: 'ILS' })}</div>
                        <p className="text-xs text-slate-500">إجمالي تكلفة القطع المتلفة</p>
                    </CardContent>
                </Card>
            </div>
            
            {/* Low Stock and Recent Activity */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle>منتجات ذات مخزون منخفض (أقل من {settings.lowStockThreshold})</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {lowStockProducts.length > 0 ? (
                            <ul className="space-y-3">
                                {lowStockProducts.map(({ product, quantity }) => (
                                    <li key={product.id} className="flex justify-between items-center text-sm">
                                        <span>{product.name} <span className="text-xs text-slate-500">(باركود: {product.sku})</span></span>
                                        <span className="font-bold text-danger bg-red-100 px-2 py-1 rounded-md">{quantity} قطعة</span>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="text-sm text-slate-500">لا توجد منتجات ذات مخزون منخفض حالياً.</p>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>آخر الحركات</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ul className="space-y-4">
                            {recentActivities.map(item => {
                                const { text, icon, date } = getStatusInfo(item);
                                return (
                                    <li key={item.id} className="flex items-center gap-4 text-sm">
                                        {icon}
                                        <div className="flex-1">
                                            <p className="font-medium text-dark">{text}</p>
                                            <p className="text-xs text-slate-500 font-mono">بار كود القطعة: {item.serialNumber}</p>
                                        </div>
                                        <span className="text-xs text-slate-500">{new Date(date).toLocaleDateString('ar-EG')}</span>
                                    </li>

                                );
                            })}
                        </ul>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default Dashboard;