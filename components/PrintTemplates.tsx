import React, { useState, useMemo } from 'react';
import { UseInventoryReturn, InventoryItem, Supplier } from '../types';
import { Card, CardContent, CardHeader, CardTitle } from './ui/Card';
import { Button } from './ui/Button';
import { Icons } from './icons';
import { Modal } from './ui/Modal';
import { useNotification } from '../contexts/NotificationContext';

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
}

type ColumnKey = 'product' | 'quantity' | 'unitPrice' | 'totalPrice' | 'reason' | 'client';

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
];

const PrintTemplates: React.FC<{ inventory: UseInventoryReturn }> = ({ inventory }) => {
    const { inventoryItems, getProductById, suppliers, getSupplierById, getClientFullNameById } = inventory;
    const notification = useNotification();
    
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
    
    // New state for print settings
    const [printSettings, setPrintSettings] = useState({
        title: 'مطالبة مالية',
        companyName: 'نظام المخزون الاحترافي',
        showSupplierContact: true,
        footerText: 'شكراً لتعاملكم معنا.',
    });
    const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);

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

        // Aggregate the data
        const grouped = filteredItems.reduce((acc, item) => {
            const key = `${item.productId}-${item.purchaseReason || 'N/A'}-${item.costPrice}-${item.destinationClientId}`;
            if (!acc[key]) {
                const product = getProductById(item.productId);
                acc[key] = {
                    productId: item.productId,
                    productName: product?.name || 'منتج غير معروف',
                    productSku: product?.sku || '-',
                    purchaseReason: item.purchaseReason || 'غير محدد',
                    clientName: getClientFullNameById(item.destinationClientId!),
                    quantity: 0,
                    unitPrice: item.costPrice,
                    totalPrice: 0,
                    items: []
                };
            }
            acc[key].quantity += 1;
            acc[key].totalPrice += item.costPrice;
            acc[key].items.push(item);
            return acc;
        }, {} as Record<string, FinancialClaimRow & { items: InventoryItem[] }>);

        setReportData(Object.values(grouped));
    };

    const handlePrint = () => {
        const afterPrintHandler = () => {
            setIsPrintPreviewOpen(false); // Close modal after printing/canceling
            window.removeEventListener('afterprint', afterPrintHandler);
        };
        window.addEventListener('afterprint', afterPrintHandler);
        window.print();
    };
    
    const sortedData = useMemo(() => {
        if (!reportData) return null;

        let sorted = [...reportData];
        if (sortConfig) {
            sorted.sort((a, b) => {
                let aValue: any, bValue: any;
                switch(sortConfig.key) {
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
                            <Button variant="secondary" onClick={() => setIsSettingsModalOpen(true)}>إعدادات الطباعة</Button>
                            <Button variant="secondary" onClick={() => setIsColumnsModalOpen(true)}>تخصيص الأعمدة</Button>
                            <Button variant="secondary" onClick={handleExport}>تصدير CSV</Button>
                            <Button onClick={() => setIsPrintPreviewOpen(true)}>طباعة</Button>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div>
                            {/* Print Header */}
                            <div className="mb-8 hidden sm:block">
                                <h2 className="text-3xl font-bold text-center">{printSettings.title}</h2>
                                <p className="text-center text-slate-500">{printSettings.companyName}</p>
                                <div className="grid grid-cols-2 gap-4 mt-6 text-sm border p-4 rounded-md">
                                    <div>
                                        <p><strong className="font-semibold">تاريخ المطالبة:</strong> {new Date().toLocaleDateString('ar-EG')}</p>
                                        <p><strong className="font-semibold">الفترة:</strong> من {startDate || 'البداية'} إلى {endDate || 'النهاية'}</p>
                                    </div>
                                    <div className="text-left">
                                        <p><strong className="font-semibold">إلى السيد/ة:</strong> {selectedSupplier?.name}</p>
                                        {printSettings.showSupplierContact && <p><strong className="font-semibold">هاتف:</strong> {selectedSupplier?.phone || 'غير متوفر'}</p>}
                                    </div>
                                </div>
                            </div>

                            {sortedData.length > 0 ? (
                                <table className="w-full text-sm text-right">
                                    <thead className="text-xs text-slate-700 uppercase bg-slate-100">
                                        <tr>
                                            {visibleColumns.map(col => (
                                                <th key={col.key} className="px-4 py-3 cursor-pointer" onClick={() => requestSort(col.key)}>
                                                    {col.label}
                                                    {sortConfig?.key === col.key && (sortConfig.direction === 'asc' ? ' ▲' : ' ▼')}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {sortedData.map(row => (
                                            <tr key={`${row.productId}-${row.purchaseReason}-${row.clientName}`} className="bg-white border-b hover:bg-slate-50">
                                                {visibleColumns.map(col => (
                                                    <td key={col.key} className="px-4 py-3">
                                                        {
                                                            {
                                                                product: <div>
                                                                    <span className="font-semibold">{row.productName}</span>
                                                                    <span className="block text-xs text-slate-400 font-mono">باركود: {row.productSku}</span>
                                                                </div>,
                                                                quantity: row.quantity,
                                                                unitPrice: row.unitPrice.toLocaleString('ar-SA', { style: 'currency', currency: 'ILS' }),
                                                                totalPrice: row.totalPrice.toLocaleString('ar-SA', { style: 'currency', currency: 'ILS' }),
                                                                reason: row.purchaseReason,
                                                                client: row.clientName,
                                                            }[col.key]
                                                        }
                                                    </td>
                                                ))}
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot>
                                        <tr className="bg-slate-100 font-bold text-base">
                                            <td colSpan={Math.max(1, visibleColumns.length - 1)} className="px-4 py-3 text-left">الإجمالي النهائي للمطالبة</td>
                                            <td className="px-4 py-3">{grandTotal.toLocaleString('ar-SA', { style: 'currency', currency: 'ILS' })}</td>
                                        </tr>
                                    </tfoot>
                                </table>
                            ) : (
                                <p className="text-center text-slate-500 py-8">لا توجد بيانات تطابق الفلاتر المحددة.</p>
                            )}
                        </div>
                    </CardContent>
                </Card>
            )}

            <Modal isOpen={isColumnsModalOpen} onClose={() => setIsColumnsModalOpen(false)} title="تخصيص أعمدة التقرير">
                <div className="space-y-2">
                    <p className="text-sm text-slate-600">اختر الأعمدة التي تريد إظهارها وأعد ترتيبها حسب الأولوية.</p>
                    {columns.map((col, index) => (
                         <div key={col.key} className="flex items-center justify-between p-2 hover:bg-slate-100 rounded-md">
                            <label className="flex items-center gap-3">
                                <input 
                                    type="checkbox" 
                                    checked={col.visible} 
                                    onChange={() => setColumns(prev => prev.map(c => c.key === col.key ? {...c, visible: !c.visible} : c))}
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
                        <div className="flex-grow overflow-y-auto pr-4 -mr-4">
                            <div className="print-area">
                                <div className="mb-8">
                                    <h2 className="text-3xl font-bold text-center">{printSettings.title}</h2>
                                    <p className="text-center text-slate-500">{printSettings.companyName}</p>
                                    <div className="grid grid-cols-2 gap-4 mt-6 text-sm border p-4 rounded-md">
                                        <div>
                                            <p><strong className="font-semibold">تاريخ المطالبة:</strong> {new Date().toLocaleDateString('ar-EG')}</p>
                                            <p><strong className="font-semibold">الفترة:</strong> من {startDate || 'البداية'} إلى {endDate || 'النهاية'}</p>
                                        </div>
                                        <div className="text-left">
                                            <p><strong className="font-semibold">إلى السيد/ة:</strong> {selectedSupplier?.name}</p>
                                            {printSettings.showSupplierContact && <p><strong className="font-semibold">هاتف:</strong> {selectedSupplier?.phone || 'غير متوفر'}</p>}
                                        </div>
                                    </div>
                                </div>

                                {sortedData.length > 0 ? (
                                    <table className="w-full text-sm text-right">
                                        <thead className="text-xs text-slate-700 uppercase bg-slate-100">
                                            <tr>
                                                {visibleColumns.map(col => (
                                                    <th key={col.key} className="px-4 py-3">{col.label}</th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {sortedData.map(row => (
                                                <tr key={`${row.productId}-${row.purchaseReason}-${row.clientName}`} className="bg-white border-b">
                                                    {visibleColumns.map(col => (
                                                        <td key={col.key} className="px-4 py-3">
                                                            {
                                                                {
                                                                    product: <div>
                                                                        <span className="font-semibold">{row.productName}</span>
                                                                        <span className="block text-xs text-slate-400 font-mono">باركود: {row.productSku}</span>
                                                                    </div>,
                                                                    quantity: row.quantity,
                                                                    unitPrice: row.unitPrice.toLocaleString('ar-SA', { style: 'currency', currency: 'ILS' }),
                                                                    totalPrice: row.totalPrice.toLocaleString('ar-SA', { style: 'currency', currency: 'ILS' }),
                                                                    reason: row.purchaseReason,
                                                                    client: row.clientName,
                                                                }[col.key]
                                                            }
                                                        </td>
                                                    ))}
                                                </tr>
                                            ))}
                                        </tbody>
                                        <tfoot>
                                            <tr className="bg-slate-100 font-bold text-base">
                                                <td colSpan={Math.max(1, visibleColumns.length - 1)} className="px-4 py-3 text-left">الإجمالي النهائي للمطالبة</td>
                                                <td className="px-4 py-3">{grandTotal.toLocaleString('ar-SA', { style: 'currency', currency: 'ILS' })}</td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                ) : (
                                    <p className="text-center text-slate-500 py-8">لا توجد بيانات تطابق الفلاتر المحددة.</p>
                                )}
                                <div className="print-footer text-center text-xs text-slate-500 mt-20">
                                    <p>{printSettings.footerText}</p>
                                    <p>صفحة <span className="page-number"></span></p>
                                </div>
                            </div>
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
