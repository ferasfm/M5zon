import React, { useState, useMemo, useEffect } from 'react';
import { UseInventoryReturn, InventoryItem, Supplier } from '../types';
import { Card, CardContent, CardHeader, CardTitle } from './ui/Card';
import { Button } from './ui/Button';
import { Icons } from './icons';
import { Modal } from './ui/Modal';
import { useNotification } from '../contexts/NotificationContext';
import { useSettings } from '../contexts/SettingsContext';
import { formatCurrency, formatDate, formatDateTime } from '../utils/formatters';

// Data structure for the aggregated report row
interface FinancialClaimRow {
    productId: string;
    productName: string;
    productSku: string;
    purchaseReason: string;
    clientName: string;
    quantity: number;
    unitPrice: number; // average cost
    totalPrice: number;
    notes?: string; // ملاحظات اختيارية
}

type ColumnKey = 'product' | 'quantity' | 'unitPrice' | 'totalPrice' | 'reason' | 'client' | 'notes';

interface ColumnConfig {
    key: ColumnKey;
    label: string;
    visible: boolean;
}

const initialColumns: ColumnConfig[] = [
    { key: 'product', label: 'المنتج', visible: true },
    { key: 'unitPrice', label: 'سعر المنتج الفردي', visible: true },
    { key: 'quantity', label: 'الكمية', visible: true },
    { key: 'totalPrice', label: 'التكلفة الكلية', visible: true },
    { key: 'reason', label: 'سبب الشراء', visible: true },
    { key: 'client', label: 'العميل / الموقع', visible: true },
    { key: 'notes', label: 'ملاحظات', visible: true },
];

const PrintTemplates: React.FC<{ inventory: UseInventoryReturn }> = ({ inventory }) => {
    const { inventoryItems, getProductById, suppliers, getSupplierById, getClientFullNameById, products } = inventory;
    const notification = useNotification();
    const { getSetting } = useSettings();

    // Filters
    const [selectedSupplierId, setSelectedSupplierId] = useState<string>('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    // Report State
    const [reportData, setReportData] = useState<FinancialClaimRow[] | null>(null);
    const [columns, setColumns] = useState<ColumnConfig[]>(initialColumns);
    const [sortConfig, setSortConfig] = useState<{ key: ColumnKey, direction: 'asc' | 'desc' } | null>(null);
    const [isColumnsModalOpen, setIsColumnsModalOpen] = useState(false);
    const [isPrintPreviewOpen, setIsPrintPreviewOpen] = useState(false);
    const [isNotesModalOpen, setIsNotesModalOpen] = useState(false);
    const [productNotes, setProductNotes] = useState<{ [key: string]: string }>({});

    // New state for print settings
    const [printSettings, setPrintSettings] = useState({
        title: 'مطالبة مالية',
        companyName: 'نظام المخزون',
        showSupplierContact: true,
        footerText: 'شكراً لتعاملكم معنا.',
    });
    const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);

    // جلب اسم الشركة من الإعدادات
    useEffect(() => {
        const fetchCompanyName = async () => {
            const name = await getSetting('company_name', 'نظام المخزون');
            setPrintSettings(prev => ({ ...prev, companyName: name }));
        };
        fetchCompanyName();
    }, [getSetting]);

    const handleSettingsChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        if (type === 'checkbox') {
            setPrintSettings(prev => ({ ...prev, [name]: (e.target as HTMLInputElement).checked }));
        } else {
            setPrintSettings(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleGenerateReport = () => {
        if (!selectedSupplierId) {
            notification?.addNotification('الرجاء اختيار مورد أولاً.', 'error');
            return;
        }

        const filteredItems = inventoryItems.filter(item => {
            if (item.supplierId !== selectedSupplierId) return false;
            if (!item.purchaseDate) return false;
            const itemDate = new Date(item.purchaseDate);

            if (startDate && itemDate < new Date(startDate)) return false;
            if (endDate) {
                const end = new Date(endDate);
                end.setHours(23, 59, 59, 999);
                if (itemDate > end) return false;
            }
            return true;
        });

        // Aggregate the data - مع دعم الحزم
        const grouped = filteredItems.reduce((acc, item) => {
            // إذا كانت القطعة جزء من حزمة، نستخدم bundleGroupId كمفتاح
            // وإلا نستخدم المفتاح القديم (المنتج الفردي)
            let key: string;
            let productName: string;
            let productSku: string;
            let unitPrice: number;

            if (item.bundleGroupId) {
                // هذه قطعة من حزمة - نجمعها حسب الحزمة
                key = `bundle-${item.bundleGroupId}`;
                productName = item.bundleName || 'حزمة';
                productSku = 'حزمة';

                // حساب التكلفة الإجمالية للحزمة
                if (!acc[key]) {
                    unitPrice = 0; // سيتم حسابه لاحقاً
                } else {
                    unitPrice = acc[key].unitPrice;
                }
            } else {
                // منتج عادي - نستخدم المنطق القديم
                // استخدام dispatchClientId إذا كان موجود، وإلا destinationClientId
                const clientId = item.dispatchClientId || item.destinationClientId;
                key = `${item.productId}-${item.purchaseReason || 'N/A'}-${item.costPrice}-${clientId}`;
                const product = getProductById(item.productId);
                productName = product?.name || 'منتج غير معروف';
                productSku = product?.sku || '-';
                unitPrice = Number(item.costPrice || 0);
            }

            if (!acc[key]) {
                const productKey = item.bundleGroupId ? `bundle-${item.bundleGroupId}` : item.productId;
                // استخدام dispatchClientId إذا كانت القطعة مصروفة، وإلا destinationClientId
                const clientId = item.dispatchClientId || item.destinationClientId;
                acc[key] = {
                    productId: item.bundleGroupId ? 'bundle' : item.productId,
                    productName: productName,
                    productSku: productSku,
                    purchaseReason: item.purchaseReason || 'غير محدد',
                    clientName: clientId ? getClientFullNameById(clientId) : 'مستودع IT',
                    quantity: item.bundleGroupId ? 1 : 0, // الحزمة تعتبر وحدة واحدة
                    unitPrice: unitPrice,
                    totalPrice: 0,
                    notes: productNotes[productKey] || '',
                    items: [],
                    bundleGroupId: item.bundleGroupId
                };
            }

            // إضافة القطعة للمجموعة
            acc[key].items.push(item);
            acc[key].totalPrice += Number(item.costPrice || 0);

            // للمنتجات العادية، نزيد العدد
            if (!item.bundleGroupId) {
                acc[key].quantity += 1;
            }

            // للحزم، نحدث سعر الوحدة ليكون التكلفة الإجمالية
            if (item.bundleGroupId) {
                acc[key].unitPrice = acc[key].totalPrice;
            }

            return acc;
        }, {} as Record<string, FinancialClaimRow & { items: InventoryItem[]; bundleGroupId?: string }>);

        // التحقق من الحزم الناقصة وإضافة ملاحظات تلقائية
        const groupedWithNotes = Object.values(grouped).map(row => {
            if (row.bundleGroupId && row.items.length > 0) {
                // هذه حزمة - نحتاج للتحقق من اكتمالها
                const firstItem = row.items[0];

                // البحث عن تعريف الحزمة الأصلية
                const bundleProduct = products.find(p => p.name === firstItem.bundleName && p.productType === 'bundle');

                if (bundleProduct && bundleProduct.components) {
                    // حساب المنتجات الموجودة في الحزمة المصروفة
                    const dispatchedProducts = row.items.reduce((acc, item) => {
                        acc[item.productId] = (acc[item.productId] || 0) + 1;
                        return acc;
                    }, {} as Record<string, number>);

                    // التحقق من المنتجات الناقصة
                    const missingProducts: string[] = [];
                    for (const component of bundleProduct.components) {
                        const dispatchedQty = dispatchedProducts[component.productId] || 0;
                        if (dispatchedQty < component.quantity) {
                            const product = getProductById(component.productId);
                            const missing = component.quantity - dispatchedQty;
                            missingProducts.push(`${product?.name || 'منتج'} (${missing})`);
                        }
                    }

                    // إضافة ملاحظة تلقائية إذا كانت الحزمة ناقصة
                    if (missingProducts.length > 0) {
                        const autoNote = `⚠️ الحزمة غير مكتملة - ناقص: ${missingProducts.join(', ')}`;
                        row.notes = row.notes ? `${row.notes}\n${autoNote}` : autoNote;
                    }
                }
            }
            return row;
        });

        setReportData(groupedWithNotes);
    };

    const handlePrint = () => {
        if (!sortedData || !selectedSupplier) return;

        // إنشاء محتوى HTML للطباعة
        const printContent = `
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <title>${printSettings.title}</title>
    <link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700&display=swap" rel="stylesheet">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: 'Tajawal', Arial, sans-serif; 
            direction: rtl; 
            padding: 20px;
            background: white;
        }
        .print-header { margin-bottom: 30px; text-align: center; }
        .print-header h2 { font-size: 24px; font-weight: bold; margin-bottom: 10px; }
        .print-header p { font-size: 14px; color: #666; margin: 5px 0; }
        .header-info { 
            display: table; 
            width: 100%; 
            border: 1px solid #ddd; 
            padding: 15px; 
            margin-top: 20px;
            border-radius: 5px;
        }
        .header-info > div { 
            display: table-cell; 
            width: 50%; 
            vertical-align: top; 
            font-size: 12px; 
        }
        .header-info .left { text-align: left; }
        .header-info strong { font-weight: bold; }
        table { 
            width: 100%; 
            border-collapse: collapse; 
            margin: 20px 0;
        }
        th, td { 
            border: 1px solid #333; 
            padding: 8px; 
            text-align: right; 
            font-size: 11px;
        }
        th { 
            background-color: #f0f0f0; 
            font-weight: bold; 
            text-transform: uppercase; 
            font-size: 10px;
        }
        tbody tr:nth-child(even) { background-color: #fafafa; }
        .total-row { 
            background-color: #f0f0f0 !important; 
            font-weight: bold; 
            font-size: 12px;
        }
        .print-footer { 
            margin-top: 40px; 
            text-align: center; 
            font-size: 10px; 
            color: #666;
        }
        .product-name { font-weight: bold; }
        .product-sku { font-size: 9px; color: #666; display: block; margin-top: 2px; }
        @media print {
            @page { size: A4; margin: 10mm; }
            body { padding: 0; }
        }
    </style>
</head>
<body>
    <div class="print-header">
        <h2>${printSettings.title}</h2>
        <p>${printSettings.companyName}</p>
        <div class="header-info">
            <div>
                <p><strong>تاريخ المطالبة:</strong> ${formatDate(new Date())}</p>
                <p><strong>الفترة:</strong> ${getPeriodText()}</p>
            </div>
            <div class="left">
                <p><strong>إلى السيد/ة:</strong> ${selectedSupplier.name}</p>
                ${printSettings.showSupplierContact ? `<p><strong>هاتف:</strong> ${selectedSupplier.phone || 'غير متوفر'}</p>` : ''}
            </div>
        </div>
    </div>
    
    <table>
        <thead>
            <tr>
                ${visibleColumns.map(col => `<th>${col.label}</th>`).join('')}
            </tr>
        </thead>
        <tbody>
            ${sortedData.map(row => `
                <tr>
                    ${visibleColumns.map(col => {
            let content: string | number = '';
            switch (col.key) {
                case 'product':
                    content = `<span class="product-name">${row.productName}</span><span class="product-sku">باركود: ${row.productSku}</span>`;
                    break;
                case 'quantity':
                    content = String(row.quantity);
                    break;
                case 'unitPrice':
                    content = formatCurrency(row.unitPrice);
                    break;
                case 'totalPrice':
                    content = formatCurrency(row.totalPrice);
                    break;
                case 'reason':
                    content = row.purchaseReason;
                    break;
                case 'client':
                    content = row.clientName;
                    break;
                case 'notes':
                    content = row.notes || '-';
                    break;
                default:
                    content = '';
            }
            return `<td>${content}</td>`;
        }).join('')}
                </tr>
            `).join('')}
            <tr class="total-row">
                <td colspan="${Math.max(1, visibleColumns.length - 1)}" style="text-align: left;">الإجمالي النهائي للمطالبة</td>
                <td>${formatCurrency(grandTotal)}</td>
            </tr>
        </tbody>
    </table>
    
    <div class="print-footer">
        <p>${printSettings.footerText}</p>
    </div>
</body>
</html>
        `;

        // فتح نافذة جديدة للطباعة
        const printWindow = window.open('', '_blank');
        if (printWindow) {
            printWindow.document.write(printContent);
            printWindow.document.close();

            // الانتظار حتى يتم تحميل المحتوى ثم الطباعة
            printWindow.onload = () => {
                printWindow.focus();
                setTimeout(() => {
                    printWindow.print();
                    printWindow.close();
                }, 250);
            };
        }

        setIsPrintPreviewOpen(false);
    };

    const sortedData = useMemo(() => {
        if (!reportData) return null;

        let sorted = [...reportData];
        if (sortConfig) {
            sorted.sort((a, b) => {
                let aValue: any, bValue: any;
                switch (sortConfig.key) {
                    case 'product': aValue = a.productName; bValue = b.productName; break;
                    case 'quantity': aValue = a.quantity; bValue = b.quantity; break;
                    case 'unitPrice': aValue = a.unitPrice; bValue = b.unitPrice; break;
                    case 'totalPrice': aValue = a.totalPrice; bValue = b.totalPrice; break;
                    case 'reason': aValue = a.purchaseReason; bValue = b.purchaseReason; break;
                    case 'client': aValue = a.clientName; bValue = b.clientName; break;
                    default: aValue = ''; bValue = '';
                }

                if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
                if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }
        return sorted;
    }, [reportData, sortConfig]);

    const requestSort = (key: ColumnKey) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const handleColumnMove = (index: number, direction: 'up' | 'down') => {
        const newColumns = [...columns];
        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        if (targetIndex < 0 || targetIndex >= newColumns.length) return;
        [newColumns[index], newColumns[targetIndex]] = [newColumns[targetIndex], newColumns[index]];
        setColumns(newColumns);
    };

    const escapeCsvField = (field: string | number | undefined): string => {
        if (field === null || field === undefined) return '';
        const str = String(field);
        if (/[",\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
        return str;
    };

    const handleExport = () => {
        if (!sortedData || !selectedSupplierId) return;
        const supplier = getSupplierById(selectedSupplierId);
        const headers = visibleColumns.map(c => escapeCsvField(c.label)).join(',');

        const rows = sortedData.map(row => {
            return visibleColumns.map(col => {
                let value;
                switch (col.key) {
                    case 'product':
                        value = `${row.productName} (${row.productSku})`;
                        break;
                    case 'reason':
                        value = row.purchaseReason;
                        break;
                    case 'quantity':
                        value = row.quantity;
                        break;
                    case 'unitPrice':
                        value = row.unitPrice;
                        break;
                    case 'totalPrice':
                        value = row.totalPrice;
                        break;
                    case 'client':
                        value = row.clientName;
                        break;
                    default:
                        value = '';
                }
                return escapeCsvField(value);
            }).join(',');
        });

        const grandTotal = sortedData.reduce((acc, row) => acc + row.totalPrice, 0);

        const summaryHeaders = Array(Math.max(0, visibleColumns.length - 2)).fill('').join(',');
        const summary = `\n\n${summaryHeaders},${escapeCsvField('الإجمالي')},${escapeCsvField(grandTotal)}`;

        const csvContent = [headers, ...rows, summary].join('\n');
        const blob = new Blob([`\uFEFF${csvContent}`], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `financial_claim_${supplier?.name}_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const visibleColumns = columns.filter(c => c.visible);
    const selectedSupplier = getSupplierById(selectedSupplierId);
    const grandTotal = sortedData ? sortedData.reduce((acc, group) => acc + group.totalPrice, 0) : 0;

    // دالة لعرض الفترة بشكل جميل
    const getPeriodText = () => {
        if (!startDate && !endDate) return 'جميع الفترات';

        if (startDate && endDate) {
            const start = new Date(startDate);
            const end = new Date(endDate);

            // إذا كانا في نفس الشهر والسنة
            if (start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear()) {
                const monthNames = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
                return `شهر ${monthNames[start.getMonth()]}`;
            }
        }

        return `من ${startDate || 'البداية'} إلى ${endDate || 'النهاية'}`;
    };

    // Helper component for the report content to avoid duplication
    const ReportContent = () => (
        <div className="print-content" dir="rtl">
            <div className="print-header mb-8">
                <h2 className="text-3xl font-bold text-center">{printSettings.title}</h2>
                <p className="text-center text-slate-500">{printSettings.companyName}</p>
                <div className="grid grid-cols-2 gap-4 mt-6 text-sm border p-4 rounded-md">
                    <div>
                        <p><strong className="font-semibold">تاريخ المطالبة:</strong> {formatDate(new Date())}</p>
                        <p><strong className="font-semibold">الفترة:</strong> {getPeriodText()}</p>
                    </div>
                    <div className="text-left">
                        <p><strong className="font-semibold">إلى السيد/ة:</strong> {selectedSupplier?.name}</p>
                        {printSettings.showSupplierContact && <p><strong className="font-semibold">هاتف:</strong> {selectedSupplier?.phone || 'غير متوفر'}</p>}
                    </div>
                </div>
            </div>

            {sortedData && sortedData.length > 0 ? (
                <table className="w-full text-sm text-right">
                    <thead className="text-xs text-slate-700 uppercase bg-slate-100">
                        <tr>
                            {visibleColumns.map(col => (
                                <th key={col.key} className="px-4 py-3 border">{col.label}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {sortedData.map(row => (
                            <tr key={`${row.productId}-${row.purchaseReason}-${row.clientName}`} className="bg-white border-b">
                                {visibleColumns.map(col => (
                                    <td key={col.key} className="px-4 py-3 border">
                                        {
                                            {
                                                product: <div>
                                                    <span className="font-semibold">{row.productName}</span>
                                                    <span className="block text-xs text-slate-400 font-mono">باركود: {row.productSku}</span>
                                                </div>,
                                                quantity: row.quantity,
                                                unitPrice: formatCurrency(row.unitPrice),
                                                totalPrice: formatCurrency(row.totalPrice),
                                                reason: row.purchaseReason,
                                                client: row.clientName,
                                                notes: <span className="text-xs text-slate-600">{row.notes || '-'}</span>,
                                            }[col.key]
                                        }
                                    </td>
                                ))}
                            </tr>
                        ))}
                        {/* Total Row - Placed at the end of tbody to ensure it appears after all items */}
                        <tr className="bg-slate-100 font-bold text-base">
                            <td colSpan={Math.max(1, visibleColumns.length - 1)} className="px-4 py-3 text-left border">الإجمالي النهائي للمطالبة</td>
                            <td className="px-4 py-3 border">{formatCurrency(grandTotal)}</td>
                        </tr>
                    </tbody>
                </table>
            ) : (
                <p className="text-center text-slate-500 py-8">لا توجد بيانات تطابق الفلاتر المحددة.</p>
            )}
            <div className="print-footer text-center text-xs text-slate-500 mt-20">
                <p>{printSettings.footerText}</p>
            </div>
        </div>
    );

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold text-dark">إنشاء مطالبة مالية للموردين</h1>

            <Card className="no-print">
                <CardHeader>
                    <CardTitle>1. تحديد معايير المطالبة</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm font-medium">المورد*</label>
                            <select value={selectedSupplierId} onChange={e => setSelectedSupplierId(e.target.value)} required>
                                <option value="" disabled>-- اختر موردًا --</option>
                                {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium">من تاريخ</label>
                            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium">إلى تاريخ</label>
                            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
                        </div>
                    </div>
                    <div className="flex justify-end pt-4">
                        <Button onClick={handleGenerateReport} disabled={!selectedSupplierId}>إنشاء مطالبة</Button>
                    </div>
                </CardContent>
            </Card>

            {sortedData && (
                <Card>
                    <CardHeader className="flex justify-between items-center no-print">
                        <CardTitle>2. معاينة وتخصيص المطالبة</CardTitle>
                        <div className="flex gap-2">
                            <Button variant="secondary" onClick={() => setIsNotesModalOpen(true)}>
                                <Icons.FileText className="h-4 w-4 ml-2" />
                                إضافة ملاحظات
                            </Button>
                            <Button variant="secondary" onClick={() => setIsSettingsModalOpen(true)}>إعدادات الطباعة</Button>
                            <Button variant="secondary" onClick={() => setIsColumnsModalOpen(true)}>تخصيص الأعمدة</Button>
                            <Button variant="secondary" onClick={handleExport}>تصدير CSV</Button>
                            <Button onClick={() => setIsPrintPreviewOpen(true)}>طباعة</Button>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <ReportContent />
                    </CardContent>
                </Card>
            )}

            <Modal isOpen={isNotesModalOpen} onClose={() => setIsNotesModalOpen(false)} title="إضافة ملاحظات للمنتجات">
                <div className="space-y-4 max-h-[60vh] overflow-y-auto">
                    <p className="text-sm text-slate-600 mb-4">أضف ملاحظات اختيارية لكل منتج. ستظهر في عمود "ملاحظات" إذا قمت بتفعيله.</p>
                    {sortedData && sortedData.map((row) => {
                        const productKey = row.productId === 'bundle' ? `bundle-${row.productName}` : row.productId;
                        return (
                            <div key={productKey} className="border rounded-lg p-4 bg-slate-50">
                                <div className="flex items-start gap-3 mb-2">
                                    <div className="flex-1">
                                        <h4 className="font-semibold text-dark">{row.productName}</h4>
                                        <p className="text-xs text-slate-500">باركود: {row.productSku}</p>
                                    </div>
                                    <span className="text-sm text-slate-600">الكمية: {row.quantity}</span>
                                </div>
                                <textarea
                                    value={productNotes[productKey] || ''}
                                    onChange={(e) => {
                                        setProductNotes(prev => ({
                                            ...prev,
                                            [productKey]: e.target.value
                                        }));
                                        // تحديث البيانات مباشرة
                                        setReportData(prev => prev ? prev.map(item =>
                                            (item.productId === row.productId && item.productName === row.productName)
                                                ? { ...item, notes: e.target.value }
                                                : item
                                        ) : null);
                                    }}
                                    placeholder="أدخل ملاحظات اختيارية لهذا المنتج..."
                                    className="w-full p-2 border border-gray-300 rounded-md text-sm"
                                    rows={2}
                                />
                            </div>
                        );
                    })}
                </div>
                <div className="flex justify-end pt-4 mt-4 border-t">
                    <Button onClick={() => setIsNotesModalOpen(false)}>تم</Button>
                </div>
            </Modal>

            <Modal isOpen={isColumnsModalOpen} onClose={() => setIsColumnsModalOpen(false)} title="تخصيص أعمدة التقرير">
                <div className="space-y-2">
                    <p className="text-sm text-slate-600">اختر الأعمدة التي تريد إظهارها وأعد ترتيبها حسب الأولوية.</p>
                    {columns.map((col, index) => (
                        <div key={col.key} className="flex items-center justify-between p-2 hover:bg-slate-100 rounded-md">
                            <label className="flex items-center gap-3">
                                <input
                                    type="checkbox"
                                    checked={col.visible}
                                    onChange={() => setColumns(prev => prev.map(c => c.key === col.key ? { ...c, visible: !c.visible } : c))}
                                />
                                {col.label}
                            </label>
                            <div className="flex gap-1">
                                <button onClick={() => handleColumnMove(index, 'up')} disabled={index === 0} className="p-1 disabled:opacity-30">▲</button>
                                <button onClick={() => handleColumnMove(index, 'down')} disabled={index === columns.length - 1} className="p-1 disabled:opacity-30">▼</button>
                            </div>
                        </div>
                    ))}
                </div>
                <div className="flex justify-end pt-4">
                    <Button onClick={() => setIsColumnsModalOpen(false)}>تم</Button>
                </div>
            </Modal>

            <Modal isOpen={isSettingsModalOpen} onClose={() => setIsSettingsModalOpen(false)} title="إعدادات طباعة المطالبة">
                <div className="space-y-4">
                    <div>
                        <label htmlFor="title" className="block text-sm font-medium text-slate-700 mb-1">عنوان التقرير</label>
                        <input type="text" name="title" id="title" value={printSettings.title} onChange={handleSettingsChange} />
                    </div>
                    <div>
                        <label htmlFor="companyName" className="block text-sm font-medium text-slate-700 mb-1">اسم الشركة (في الهيدر)</label>
                        <input type="text" name="companyName" id="companyName" value={printSettings.companyName} onChange={handleSettingsChange} />
                    </div>
                    <div>
                        <label htmlFor="footerText" className="block text-sm font-medium text-slate-700 mb-1">نص الفوتر</label>
                        <textarea name="footerText" id="footerText" value={printSettings.footerText} onChange={handleSettingsChange} rows={2}></textarea>
                    </div>
                    <div className="flex items-center gap-2">
                        <input type="checkbox" name="showSupplierContact" id="showSupplierContact" checked={printSettings.showSupplierContact} onChange={handleSettingsChange} />
                        <label htmlFor="showSupplierContact" className="text-sm text-slate-700">إظهار معلومات الاتصال بالمورد</label>
                    </div>
                </div>
                <div className="flex justify-end pt-4 mt-4 border-t">
                    <Button onClick={() => setIsSettingsModalOpen(false)}>تم</Button>
                </div>
            </Modal>

            {/* Print Preview Modal */}
            {sortedData && (
                <Modal isOpen={isPrintPreviewOpen} onClose={() => setIsPrintPreviewOpen(false)} title="معاينة طباعة المطالبة المالية">
                    <div className="flex flex-col h-[75vh]">
                        <div className="flex-grow overflow-y-auto pr-4 -mr-4 bg-slate-50 p-4 rounded border">
                            <ReportContent />
                        </div>
                        <div className="flex-shrink-0 flex justify-end gap-2 mt-6 pt-4 border-t no-print">
                            <Button variant="secondary" onClick={() => setIsPrintPreviewOpen(false)}>إغلاق</Button>
                            <Button onClick={handlePrint}>
                                <Icons.Printer className="h-4 w-4 ml-2" />
                                طباعة الآن
                            </Button>
                        </div>
                    </div>
                </Modal>
            )}


        </div>
    );
};

export default PrintTemplates;
