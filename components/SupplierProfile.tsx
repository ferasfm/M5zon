import React, { useMemo, useState, useRef, useEffect } from 'react';
import { Supplier, UseInventoryReturn } from '../types';
import { Card, CardContent, CardHeader, CardTitle } from './ui/Card';
import { Button } from './ui/Button';
import { Icons } from './icons';
import { Modal } from './ui/Modal';
import PriceAgreementForm from './PriceAgreementForm';
import { useNotification } from '../contexts/NotificationContext';
import { formatCurrency, formatDate } from '../utils/formatters';


interface SupplierProfileProps {
    supplierId: string;
    onBack: () => void;
    inventory: UseInventoryReturn;
}

const SupplierProfile: React.FC<SupplierProfileProps> = ({ supplierId, onBack, inventory }) => {
    const { getProductById, inventoryItems, removePriceAgreement, addPriceAgreement, products, getSupplierById } = inventory;
    const notification = useNotification();
    const supplier = getSupplierById(supplierId);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (!supplier) {
            onBack();
        }
    }, [supplier, onBack]);

    const supplierItems = useMemo(() => {
        if (!supplier) return [];
        return inventoryItems.filter(item => item.supplierId === supplier.id);
    }, [inventoryItems, supplier]);

    const handleSubmitAgreement = (data: { productId: string; price: number; startDate: string; }) => {
        if (!supplier) return;
        addPriceAgreement(supplier.id, data);
        setIsModalOpen(false);
    };

    const handleExportCSV = () => {
        if (!supplier) return;
        const standardProducts = products.filter(p => p.productType === 'standard');
        if (standardProducts.length === 0) {
            notification?.addNotification('لا توجد منتجات عادية في النظام لإنشاء قالب.', 'info');
            return;
        }
    
        const escapeCsvField = (field: string | number | undefined): string => {
            if (field === null || field === undefined) return '';
            const str = String(field);
            if (/[",\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
            return str;
        };
    
        const csvHeader = 'product_barcode,product_name,price,start_date\n';
        
        const csvRows = standardProducts.map(product => {
            const agreement = supplier.priceAgreements?.find(a => a.productId === product.id);
            
            const sku = escapeCsvField(product.sku);
            const name = escapeCsvField(product.name);
            const price = agreement ? agreement.price : ''; // Leave blank if no agreement
            const date = agreement ? new Date(agreement.startDate).toISOString().split('T')[0] : '';

            return `${sku},${name},${price},${date}`;
        }).join('\n');
    
        const csvContent = csvHeader + csvRows;
        const blob = new Blob([`\uFEFF${csvContent}`], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        
        const sanitizedSupplierName = supplier.name.replace(/[\\/:"*?<>|]/g, '_');
    
        link.setAttribute('href', url);
        link.setAttribute('download', `${sanitizedSupplierName}_price_agreements_template.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        URL.revokeObjectURL(url);
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (!supplier) return;
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            const text = e.target?.result;
            if (typeof text !== 'string') return;
            
            const lines = text.split(/[\r\n]+/).filter(line => line.trim() !== '');
            if (lines.length <= 1) {
                notification?.addNotification('الملف فارغ أو يحتوي على رؤوس فقط.', 'error');
                return;
            }

            const headerLine = lines[0].trim().replace(/\uFEFF/g, ''); // Remove BOM
            const headers = headerLine.toLowerCase().split(',').map(h => h.trim());
            
            const skuIndex = headers.indexOf('product_barcode');
            const priceIndex = headers.indexOf('price');
            const dateIndex = headers.indexOf('start_date');

            if (skuIndex === -1 || priceIndex === -1 || dateIndex === -1) {
                notification?.addNotification('صيغة الملف غير صحيحة. يجب أن يحتوي على الأعمدة: product_barcode, price, start_date', 'error');
                return;
            }

            let successCount = 0;
            let errorCount = 0;
            let skippedCount = 0;

            for (let i = 1; i < lines.length; i++) {
                const rowData = lines[i].split(',');
                const sku = rowData[skuIndex]?.trim();
                const priceStr = rowData[priceIndex]?.trim();
                const startDate = rowData[dateIndex]?.trim();

                if (!priceStr || !startDate) {
                    skippedCount++;
                    continue;
                }

                const product = products.find(p => p.sku.toLowerCase() === sku.toLowerCase());
                const price = parseFloat(priceStr);

                if (product && !isNaN(price) && startDate) {
                    addPriceAgreement(supplier.id, {
                        productId: product.id,
                        price: price,
                        startDate: startDate,
                    });
                    successCount++;
                } else {
                    errorCount++;
                    console.error(`Skipping row ${i+1}: Invalid data - SKU: ${sku}, Price: ${priceStr}, Date: ${startDate}`);
                }
            }
            notification?.addNotification(`اكتمل الاستيراد: ${successCount} نجاح, ${skippedCount} تجاهل, ${errorCount} فشل.`, 'info');
        };
        reader.readAsText(file, 'UTF-8');
        
        if(fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    if (!supplier) {
        return (
            <div className="text-center p-8">
                <p>جاري التحميل أو تعذر العثور على المورد...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Button onClick={onBack} variant="ghost" size="sm">
                     <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 transform -scale-x-100"><path d="m15 18-6-6 6-6"/></svg>
                    العودة للموردين
                </Button>
                <h1 className="text-3xl font-bold text-dark">{supplier.name}</h1>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="md:col-span-1">
                    <CardHeader>
                        <CardTitle>معلومات المورد</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                        <p><strong>جهة الاتصال:</strong> {supplier.contactPerson || '-'}</p>
                        <p><strong>الهاتف:</strong> {supplier.phone || '-'}</p>
                        <p><strong>البريد الإلكتروني:</strong> {supplier.email || '-'}</p>
                        <p><strong>العنوان:</strong> {supplier.address || '-'}</p>
                    </CardContent>
                </Card>
                <Card className="md:col-span-2">
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle>اتفاقيات الأسعار</CardTitle>
                        <div className="flex gap-2">
                             <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".csv" style={{ display: 'none' }} />
                            <Button size="sm" variant="secondary" onClick={() => fileInputRef.current?.click()}>
                                <Icons.Upload className="h-4 w-4 ml-2"/>
                                استيراد
                            </Button>
                            <Button size="sm" variant="secondary" onClick={handleExportCSV}>
                                <Icons.Download className="h-4 w-4 ml-2"/>
                                تصدير
                            </Button>
                            <Button size="sm" onClick={() => setIsModalOpen(true)}>
                                <Icons.PlusCircle className="h-4 w-4 ml-2"/>
                                إضافة
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {supplier.priceAgreements && supplier.priceAgreements.length > 0 ? (
                             <table className="w-full text-sm text-right">
                                <thead className="text-xs text-slate-700 uppercase bg-slate-100">
                                    <tr>
                                        <th className="px-4 py-3">المنتج</th>
                                        <th className="px-4 py-3">السعر المتفق عليه</th>
                                        <th className="px-4 py-3">تاريخ البدء</th>
                                        <th className="px-4 py-3">إجراء</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {supplier.priceAgreements.map(agreement => {
                                        const product = getProductById(agreement.productId);
                                        return (
                                            <tr key={agreement.productId} className="border-b">
                                                <td className="px-4 py-2 font-medium">{product?.name || 'منتج محذوف'}</td>
                                                <td className="px-4 py-2">{formatCurrency(agreement.price)}</td>
                                                <td className="px-4 py-2">{formatDate(agreement.startDate)}</td>
                                                <td className="px-4 py-2">
                                                    <Button variant="ghost" size="sm" className="text-danger" onClick={() => removePriceAgreement(supplier.id, agreement.productId)}>
                                                        <Icons.Trash2 className="h-4 w-4"/>
                                                    </Button>
                                                </td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        ) : (
                            <p className="text-center text-slate-500 py-4">لا توجد اتفاقيات أسعار مسجلة لهذا المورد.</p>
                        )}
                    </CardContent>
                </Card>
            </div>
            
            <Card>
                <CardHeader>
                    <CardTitle>سجل المشتريات من هذا المورد ({supplierItems.length})</CardTitle>
                </CardHeader>
                <CardContent>
                     <table className="w-full text-sm text-right">
                        <thead className="text-xs text-slate-700 uppercase bg-slate-100">
                            <tr>
                                <th className="px-4 py-3">تاريخ الشراء</th>
                                <th className="px-4 py-3">المنتج</th>
                                <th className="px-4 py-3">بار كود القطعة</th>
                                <th className="px-4 py-3">تكلفة الشراء</th>
                                <th className="px-4 py-3">الحالة الحالية</th>
                            </tr>
                        </thead>
                        <tbody>
                            {supplierItems.slice(0, 20).map(item => {
                                const product = getProductById(item.productId);
                                return (
                                <tr key={item.id} className="border-b">
                                    <td className="px-4 py-2">{formatDate(item.purchaseDate)}</td>
                                    <td className="px-4 py-2 font-medium">{product?.name}</td>
                                    <td className="px-4 py-2 font-mono">{item.serialNumber}</td>
                                    <td className="px-4 py-2">{formatCurrency(item.costPrice)}</td>
                                    <td className="px-4 py-2">{item.status}</td>
                                </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </CardContent>
            </Card>

            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="إضافة اتفاقية سعر جديدة">
                <PriceAgreementForm
                    onSubmit={handleSubmitAgreement}
                    onCancel={() => setIsModalOpen(false)}
                    products={products}
                    existingAgreementProductIds={supplier.priceAgreements?.map(a => a.productId) || []}
                />
            </Modal>
        </div>
    );
};

export default SupplierProfile;
