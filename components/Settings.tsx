import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/Card';
import { Button } from './ui/Button';
import { Icons } from './icons';
import { Modal } from './ui/Modal';
import { UseInventoryReturn } from '../types';
import { useSettings } from '../contexts/SettingsContext';
import SystemSettings from './SystemSettings';
import DatabaseSettings from './DatabaseSettings';

interface SettingsProps {
    inventory: UseInventoryReturn;
}

const Settings: React.FC<SettingsProps> = ({ inventory }) => {
    const { settings, wipeAllData } = inventory;
    const { getSetting, updateSetting } = useSettings();
    const [isResetModalOpen, setIsResetModalOpen] = useState(false);
    const [resetConfirmationText, setResetConfirmationText] = useState('');
    const [companyName, setCompanyName] = useState('');
    const [currency, setCurrency] = useState('');
    const [taxRate, setTaxRate] = useState('');
    const [lowStockThreshold, setLowStockThreshold] = useState('');
    const [warrantyDaysThreshold, setWarrantyDaysThreshold] = useState('');

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

    const handleResetData = () => {
        if (resetConfirmationText === RESET_CONFIRMATION_WORD) {
            wipeAllData();
            setIsResetModalOpen(false);
            setResetConfirmationText('');
        }
    };

    return (
        <>
            <div className="space-y-6">
                <h1 className="text-3xl font-bold text-dark">الإعدادات</h1>

                <SystemSettings />
                <DatabaseSettings />

                <Card>
                    <CardHeader>
                        <CardTitle>معلومات الشركة</CardTitle>
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
                                />
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
                        <CardTitle>إعدادات التنبيهات</CardTitle>
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
            </div>

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
        </>
    );
};

export default Settings;
