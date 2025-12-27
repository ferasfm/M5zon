import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/Card';
import { Button } from './ui/Button';
import { Icons } from './icons';
import { Modal } from './ui/Modal';
import { UseInventoryReturn } from '../types';
import { useSettings } from '../contexts/SettingsContext';
import SystemSettings from './SystemSettings';
import DatabaseSettings from './DatabaseSettings';
import AppSettingsPanel from './AppSettingsPanel';
import ReasonsManager from './ReasonsManager';
import CategoriesManager from './CategoriesManager';
import UsersManagement from './UsersManagement';
import PermissionGroupsManager from './PermissionGroupsManager';
import UserGroupAssignment from './UserGroupAssignment';
import UserGuide from './UserGuide';

interface SettingsProps {
    inventory: UseInventoryReturn;
}

const Settings: React.FC<SettingsProps> = ({ inventory }) => {
    const { settings, wipeAllData, products, categories } = inventory;
    const { getSetting, updateSetting } = useSettings();
    const [activeTab, setActiveTab] = useState<'general' | 'categories' | 'reasons' | 'users' | 'groups' | 'user-groups' | 'system' | 'data' | 'guide'>('general');
    const [isResetModalOpen, setIsResetModalOpen] = useState(false);
    const [resetConfirmationText, setResetConfirmationText] = useState('');
    const [companyName, setCompanyName] = useState('');
    const [currency, setCurrency] = useState('');
    const [taxRate, setTaxRate] = useState('');
    const [lowStockThreshold, setLowStockThreshold] = useState('');
    const [warrantyDaysThreshold, setWarrantyDaysThreshold] = useState('');
    const [isUpdatingCategories, setIsUpdatingCategories] = useState(false);

    const RESET_CONFIRMATION_WORD = 'حذف';

    // جلب الإعدادات عند تحميل المكون
    useEffect(() => {
      const fetchSettings = async () => {
        setCompanyName(await getSetting('company_name', 'شركة المخزون الاحترافية'));
        setCurrency(await getSetting('currency', 'ريال سعودي'));
        setTaxRate(await getSetting('tax_rate', '15'));
        setLowStockThreshold(await getSetting('low_stock_threshold', '10'));
        setWarrantyDaysThreshold(await getSetting('warranty_days_threshold', '30'));
      };

      fetchSettings();
    }, [getSetting]);

    // حفظ الإعدادات عند التغيير
    const saveCompanyInfo = async () => {
      await updateSetting('company_name', companyName);
      await updateSetting('currency', currency);
      await updateSetting('tax_rate', taxRate);
      alert('تم حفظ معلومات الشركة بنجاح');
    };

    const saveThresholds = async () => {
      await updateSetting('low_stock_threshold', lowStockThreshold);
      await updateSetting('warranty_days_threshold', warrantyDaysThreshold);
      alert('تم حفظ حدود التنبيه بنجاح');
    };

    const handleResetData = async () => {
        if (resetConfirmationText === RESET_CONFIRMATION_WORD) {
            console.log('🗑️ المستخدم أكد إعادة تعيين قاعدة البيانات');
            
            try {
                await wipeAllData();
                console.log('✅ تمت عملية إعادة التعيين بنجاح');
            } catch (error) {
                console.error('❌ فشل في إعادة تعيين قاعدة البيانات:', error);
            }
            
            setIsResetModalOpen(false);
            setResetConfirmationText('');
        } else {
            console.log('❌ كلمة التأكيد غير صحيحة:', resetConfirmationText, 'المطلوب:', RESET_CONFIRMATION_WORD);
        }
    };

    const updateAllProductCategories = async () => {
        setIsUpdatingCategories(true);
        try {
            console.log('🔄 بدء تحديث فئات المنتجات...');
            console.log(`📊 إجمالي المنتجات: ${products.length}`);
            console.log(`📂 إجمالي الفئات: ${categories.length}`);
            
            // استخدام الدالة المحسّنة من categoriesApi
            const result = await inventory.categoriesApi.fixOldProductsCategories();
            
            if (result.success) {
                console.log('✅ اكتمل التحديث');
                
                let message = `تم التحديث بنجاح!\n\n`;
                message += `📊 الإحصائيات:\n`;
                message += `• تم إصلاح ${result.updated} منتج قديم\n`;
                
                if (result.errors.length > 0) {
                    message += `\n⚠️ تحذيرات (${result.errors.length}):\n`;
                    message += result.errors.slice(0, 5).join('\n');
                    if (result.errors.length > 5) {
                        message += `\n... و ${result.errors.length - 5} تحذير آخر`;
                    }
                    console.warn('⚠️ التحذيرات:', result.errors);
                }
                
                alert(message);
            } else {
                throw new Error(result.errors.join(', '));
            }
        } catch (error: any) {
            console.error('❌ خطأ في تحديث الفئات:', error);
            alert(`حدث خطأ أثناء تحديث الفئات:\n${error.message}\n\nراجع Console للتفاصيل.`);
        } finally {
            setIsUpdatingCategories(false);
        }
    };

    return (
        <>
            <div className="space-y-6">
                <h1 className="text-3xl font-bold text-dark">الإعدادات</h1>

                {/* Tabs Navigation */}
                <div className="border-b border-slate-200">
                    <nav className="-mb-px flex gap-6" aria-label="Tabs">
                        <button
                            onClick={() => setActiveTab('general')}
                            className={`shrink-0 border-b-2 px-1 pb-4 text-sm font-medium ${
                                activeTab === 'general' 
                                ? 'border-primary text-primary' 
                                : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700'
                            }`}
                        >
                            ⚙️ إعدادات عامة
                        </button>
                        <button
                            onClick={() => setActiveTab('categories')}
                            className={`shrink-0 border-b-2 px-1 pb-4 text-sm font-medium ${
                                activeTab === 'categories' 
                                ? 'border-primary text-primary' 
                                : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700'
                            }`}
                        >
                            📂 إدارة الفئات
                        </button>
                        <button
                            onClick={() => setActiveTab('reasons')}
                            className={`shrink-0 border-b-2 px-1 pb-4 text-sm font-medium ${
                                activeTab === 'reasons' 
                                ? 'border-primary text-primary' 
                                : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700'
                            }`}
                        >
                            📝 إدارة الأسباب
                        </button>
                        <button
                            onClick={() => setActiveTab('users')}
                            className={`shrink-0 border-b-2 px-1 pb-4 text-sm font-medium ${
                                activeTab === 'users' 
                                ? 'border-primary text-primary' 
                                : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700'
                            }`}
                        >
                            👥 المستخدمين
                        </button>
                        <button
                            onClick={() => setActiveTab('groups')}
                            className={`shrink-0 border-b-2 px-1 pb-4 text-sm font-medium ${
                                activeTab === 'groups' 
                                ? 'border-primary text-primary' 
                                : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700'
                            }`}
                        >
                            🛡️ المجموعات
                        </button>
                        <button
                            onClick={() => setActiveTab('user-groups')}
                            className={`shrink-0 border-b-2 px-1 pb-4 text-sm font-medium ${
                                activeTab === 'user-groups' 
                                ? 'border-primary text-primary' 
                                : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700'
                            }`}
                        >
                            🔗 ربط المستخدمين
                        </button>
                        <button
                            onClick={() => setActiveTab('system')}
                            className={`shrink-0 border-b-2 px-1 pb-4 text-sm font-medium ${
                                activeTab === 'system' 
                                ? 'border-primary text-primary' 
                                : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700'
                            }`}
                        >
                            🔧 إعدادات متقدمة
                        </button>
                        <button
                            onClick={() => setActiveTab('data')}
                            className={`shrink-0 border-b-2 px-1 pb-4 text-sm font-medium ${
                                activeTab === 'data' 
                                ? 'border-primary text-primary' 
                                : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700'
                            }`}
                        >
                            🗄️ إدارة البيانات
                        </button>
                        <button
                            onClick={() => setActiveTab('guide')}
                            className={`shrink-0 border-b-2 px-1 pb-4 text-sm font-medium ${
                                activeTab === 'guide' 
                                ? 'border-primary text-primary' 
                                : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700'
                            }`}
                        >
                            📖 دليل الاستخدام
                        </button>
                    </nav>
                </div>

                {/* General Settings Tab */}
                {activeTab === 'general' && (
                <>
                <Card>
                    <CardHeader>
                        <CardTitle>🏢 معلومات الشركة</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label htmlFor="companyName" className="block text-sm font-medium text-slate-700 mb-1">
                                    اسم الشركة
                                </label>
                                <input
                                    type="text"
                                    id="companyName"
                                    value={companyName}
                                    onChange={(e) => setCompanyName(e.target.value)}
                                    className="w-full p-2 border border-gray-300 rounded-md"
                                />
                            </div>
                            <div>
                                <label htmlFor="currency" className="block text-sm font-medium text-slate-700 mb-1">
                                    العملة
                                </label>
                                <input
                                    type="text"
                                    id="currency"
                                    value={currency}
                                    onChange={(e) => setCurrency(e.target.value)}
                                    className="w-full p-2 border border-gray-300 rounded-md"
                                    placeholder="مثال: شيكل، ريال سعودي، دولار"
                                />
                                <p className="text-xs text-slate-500 mt-1">
                                    💡 ستظهر هذه العملة في جميع التقارير والفواتير
                                </p>
                            </div>
                            <div>
                                <label htmlFor="taxRate" className="block text-sm font-medium text-slate-700 mb-1">
                                    نسبة الضريبة (%)
                                </label>
                                <input
                                    type="number"
                                    id="taxRate"
                                    value={taxRate}
                                    onChange={(e) => setTaxRate(e.target.value)}
                                    className="w-full p-2 border border-gray-300 rounded-md"
                                />
                            </div>
                        </div>
                        <div className="flex justify-end">
                            <Button onClick={saveCompanyInfo}>
                                حفظ معلومات الشركة
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>🔔 إعدادات التنبيهات</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label htmlFor="lowStockThreshold" className="block text-sm font-medium text-slate-700 mb-1">
                                    حد المخزون المنخفض
                                </label>
                                <input
                                    type="number"
                                    id="lowStockThreshold"
                                    value={lowStockThreshold}
                                    onChange={(e) => setLowStockThreshold(e.target.value)}
                                    className="w-full p-2 border border-gray-300 rounded-md"
                                />
                                <p className="text-xs text-slate-500 mt-1">
                                    سيتم تنبيهك في لوحة التحكم عندما يقل مخزون منتج ما عن هذا العدد.
                                </p>
                            </div>
                             <div>
                                <label htmlFor="warrantyDaysThreshold" className="block text-sm font-medium text-slate-700 mb-1">
                                    تنبيه انتهاء الكفالة (بالأيام)
                                </label>
                                <input
                                    type="number"
                                    id="warrantyDaysThreshold"
                                    value={warrantyDaysThreshold}
                                    onChange={(e) => setWarrantyDaysThreshold(e.target.value)}
                                    className="w-full p-2 border border-gray-300 rounded-md"
                                />
                                <p className="text-xs text-slate-500 mt-1">
                                    سيتم تنبيهك بالقطع التي ستنتهي كفالتها خلال هذه المدة (بالأيام).
                                </p>
                            </div>
                        </div>
                        <div className="flex justify-end">
                            <Button onClick={saveThresholds}>
                                حفظ حدود التنبيه
                            </Button>
                        </div>
                    </CardContent>
                </Card>
                </>
                )}

                {/* Categories Manager Tab */}
                {activeTab === 'categories' && (
                <>
                <Card className="border-blue-200 bg-blue-50">
                    <CardHeader>
                        <CardTitle className="text-blue-900">🔄 تحديث وإصلاح فئات المنتجات</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            <div className="flex justify-between items-start">
                                <div className="flex-1">
                                    <h4 className="font-semibold text-dark mb-2">مزامنة وإصلاح الفئات</h4>
                                    <div className="text-sm text-slate-600 space-y-1">
                                        <p>✅ تحديث أسماء الفئات للمنتجات الحالية</p>
                                        <p>🔗 ربط المنتجات القديمة بالفئات الجديدة</p>
                                        <p>📊 عرض تقرير مفصل بالتغييرات</p>
                                    </div>
                                </div>
                                <Button 
                                    onClick={updateAllProductCategories}
                                    disabled={isUpdatingCategories}
                                    variant="secondary"
                                    className="ml-4"
                                >
                                    {isUpdatingCategories ? (
                                        <>
                                            <Icons.RefreshCw className="h-4 w-4 ml-2 animate-spin" />
                                            جاري التحديث...
                                        </>
                                    ) : (
                                        <>
                                            <Icons.RefreshCw className="h-4 w-4 ml-2" />
                                            تحديث الآن
                                        </>
                                    )}
                                </Button>
                            </div>
                            <div className="bg-blue-100 border border-blue-300 rounded-md p-3 text-xs text-blue-800">
                                💡 <strong>نصيحة:</strong> استخدم هذه الأداة بعد تعديل أسماء الفئات أو لإصلاح المنتجات القديمة
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <CategoriesManager inventory={inventory} />
                </>
                )}

                {/* Reasons Manager Tab */}
                {activeTab === 'reasons' && (
                <ReasonsManager inventory={inventory} />
                )}

                {/* Users Management Tab */}
                {activeTab === 'users' && (
                <UsersManagement />
                )}

                {/* Permission Groups Tab */}
                {activeTab === 'groups' && (
                <PermissionGroupsManager />
                )}

                {/* User-Group Assignment Tab */}
                {activeTab === 'user-groups' && (
                <UserGroupAssignment />
                )}

                {/* Advanced Settings Tab */}
                {activeTab === 'system' && (
                <>
                <Card className="border-blue-200 bg-blue-50 mb-6">
                    <CardContent className="py-3">
                        <p className="text-sm text-blue-800">
                            ⚠️ <strong>تنبيه:</strong> هذه إعدادات متقدمة للمطورين والمسؤولين. التعديل عليها قد يؤثر على عمل البرنامج.
                        </p>
                    </CardContent>
                </Card>
                
                <AppSettingsPanel />
                <SystemSettings />
                <DatabaseSettings />
                </>
                )}

                {/* Data Management Tab */}
                {activeTab === 'data' && (
                <Card className="border-danger">
                    <CardHeader>
                        <CardTitle className="text-danger">إدارة البيانات</CardTitle>
                    </CardHeader>
                    <CardContent>
                         <div className="flex justify-between items-center">
                            <div>
                                <h4 className="font-semibold text-dark">إعادة تعيين قاعدة البيانات</h4>
                                <p className="text-sm text-slate-600 mt-1">
                                    سيؤدي هذا الإجراء إلى حذف جميع البيانات الحالية (المنتجات، المخزون، الموردون، إلخ) وإعادة التطبيق إلى حالته الأولية. <strong className="text-danger">لا يمكن التراجع عن هذا الإجراء.</strong>
                                </p>
                            </div>
                            <Button variant="danger" onClick={() => setIsResetModalOpen(true)}>
                                إعادة تعيين البيانات
                            </Button>
                        </div>
                    </CardContent>
                </Card>
                )}

                {/* User Guide Tab */}
                {activeTab === 'guide' && (
                <UserGuide />
                )}

            <Modal isOpen={isResetModalOpen} onClose={() => setIsResetModalOpen(false)} title="تأكيد إعادة تعيين البيانات">
                <div className="space-y-4">
                    <div className="p-4 bg-red-50 border border-red-200 rounded-md text-sm text-danger flex items-start gap-3">
                        <Icons.AlertTriangle className="h-6 w-6 text-red-500 flex-shrink-0 mt-1" />
                        <div>
                            <h4 className="font-bold">تحذير خطير!</h4>
                            <p>أنت على وشك حذف جميع بيانات هذا التطبيق بشكل نهائي. هذا يشمل كل المنتجات، والمخزون، والموردين، والعملاء، وجميع الحركات المسجلة.</p>
                        </div>
                    </div>
                    <p className="text-slate-700">
                        للتأكيد، يرجى كتابة كلمة "<strong className="font-mono">{RESET_CONFIRMATION_WORD}</strong>" في الحقل أدناه.
                    </p>
                    <div>
                        <input
                            type="text"
                            value={resetConfirmationText}
                            onChange={(e) => setResetConfirmationText(e.target.value)}
                            className="w-full text-center"
                            autoFocus
                        />
                    </div>
                    <div className="flex justify-end gap-3 pt-4">
                        <Button variant="secondary" onClick={() => { setIsResetModalOpen(false); setResetConfirmationText(''); }}>
                            إلغاء
                        </Button>
                        <Button
                            variant="danger"
                            onClick={handleResetData}
                            disabled={resetConfirmationText !== RESET_CONFIRMATION_WORD}
                        >
                            <Icons.Trash2 className="h-4 w-4 ml-2" />
                            أفهم العواقب، قم بالحذف
                        </Button>
                    </div>
                </div>
            </Modal>
            </div>
        </>
    );
};

export default Settings;
