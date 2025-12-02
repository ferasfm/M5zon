

import React, { useState, useMemo } from 'react';
import { UseInventoryReturn, InventoryItem } from '../types';
import { Card, CardContent, CardHeader, CardTitle } from './ui/Card';
import { Button } from './ui/Button';
import { Icons } from './icons';
import { Modal } from './ui/Modal';
import ItemSearchModal from './ItemSearchModal';
import DeliveryNote from './DeliveryNote';
import { useNotification } from '../contexts/NotificationContext';
import { convertArabicInput } from '../utils/converters';


// DISPATCH_REASONS now comes from database via reasonsApi

const Dispatching: React.FC<{ inventory: UseInventoryReturn }> = ({ inventory }) => {
    const notification = useNotification();
    const [serialInput, setSerialInput] = useState('');
    const [itemsToDispatch, setItemsToDispatch] = useState<InventoryItem[]>([]);
    const [error, setError] = useState('');
    const [selectedProvinceId, setSelectedProvinceId] = useState('');
    const [selectedAreaId, setSelectedAreaId] = useState('');
    const [dispatchClientId, setDispatchClientId] = useState('');
    const [dispatchDate, setDispatchDate] = useState(new Date().toISOString().split('T')[0]);
    const [dispatchReason, setDispatchReason] = useState('');
    const [dispatchNotes, setDispatchNotes] = useState('');
    const [dispatchReference, setDispatchReference] = useState('');
    const [selectedBundleId, setSelectedBundleId] = useState('');
    const [preallocatedClient, setPreallocatedClient] = useState('');

    // Modals state
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [searchModalInitialProductId, setSearchModalInitialProductId] = useState('');
    const [lastDispatch, setLastDispatch] = useState<{ client: any; date: string; reference: string; items: InventoryItem[] } | null>(null);
    const [isBundleDetailsOpen, setIsBundleDetailsOpen] = useState(false);
    const [bundleAvailability, setBundleAvailability] = useState<{
        bundleName: string;
        components: Array<{
            productId: string;
            productName: string;
            required: number;
            available: number;
            isComplete: boolean;
        }>;
        canAddFull: boolean;
    } | null>(null);

    const { clients, provinces, areas, findItemBySerial, getProductById, products, inventoryItems, getClientFullNameById, reasonsApi } = inventory;
    const dispatchReasons = reasonsApi.getDispatchReasons();
    const bundleProducts = useMemo(() => products.filter(p => p.productType === 'bundle'), [products]);
    const existingItemIds = useMemo(() => new Set(itemsToDispatch.map(i => i.id)), [itemsToDispatch]);

    // تصفية المناطق حسب المحافظة المختارة
    const filteredAreas = useMemo(() => {
        if (!selectedProvinceId) return [];
        return areas.filter(area => area.provinceId === selectedProvinceId);
    }, [areas, selectedProvinceId]);

    // تصفية العملاء حسب المنطقة المختارة
    const filteredClients = useMemo(() => {
        if (!selectedAreaId) return [];
        return clients.filter(client => client.areaId === selectedAreaId)
            .sort((a, b) => a.name.localeCompare(b.name));
    }, [clients, selectedAreaId]);

    // معالجة تغيير المحافظة
    const handleProvinceChange = (provinceId: string) => {
        setSelectedProvinceId(provinceId);
        setSelectedAreaId('');
        setDispatchClientId('');
    };

    // معالجة تغيير المنطقة
    const handleAreaChange = (areaId: string) => {
        setSelectedAreaId(areaId);
        setDispatchClientId('');
    };

    const preallocatedItems = useMemo(() => {
        if (!preallocatedClient) return [];
        return inventoryItems.filter(item =>
            item.status === 'in_stock' &&
            item.destinationClientId === preallocatedClient &&
            !existingItemIds.has(item.id)
        );
    }, [preallocatedClient, inventoryItems, existingItemIds]);

    const handleAddPreallocatedItem = (item: InventoryItem) => {
        setItemsToDispatch(prev => [...prev, item]);
    };

    const handleAddItemByInput = (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        setError('');
        const searchInput = serialInput.trim();
        if (!searchInput) return;

        // 1. Check for existing item in dispatch list
        if (itemsToDispatch.some(i => i.serialNumber.toLowerCase() === searchInput.toLowerCase())) {
            setError('هذه القطعة مضافة بالفعل إلى القائمة.');
            return;
        }

        // 2. Try to find by unique Serial Number
        const itemBySerial = findItemBySerial(searchInput);
        if (itemBySerial) {
            if (itemBySerial.status !== 'in_stock') {
                setError(`هذه القطعة ليست في المخزون حالياً (الحالة: ${itemBySerial.status})`);
                return;
            }
            setItemsToDispatch([...itemsToDispatch, itemBySerial]);
            setSerialInput('');
            return;
        }

        // 3. If not found by serial, try to find by SKU
        const productWithSku = products.find(p => p.sku.toLowerCase() === searchInput.toLowerCase());
        if (productWithSku) {
            // Find available items for this product that are not already in the dispatch list
            const availableItems = inventoryItems.filter(
                item => item.productId === productWithSku.id &&
                    item.status === 'in_stock' &&
                    !itemsToDispatch.some(d => d.id === item.id)
            );

            if (availableItems.length === 0) {
                setError(`لا توجد قطع متاحة في المخزون للمنتج بباركود المنتج: ${searchInput}`);
                return;
            }

            if (availableItems.length === 1) {
                // If only one is available, add it directly.
                setItemsToDispatch([...itemsToDispatch, availableItems[0]]);
                setSerialInput('');
                notification?.addNotification(`تمت إضافة القطعة الوحيدة المتاحة للمنتج ${productWithSku.name}.`, 'info');
                return;
            }

            // If multiple items are available, open the advanced search modal pre-filtered
            setSearchModalInitialProductId(productWithSku.id);
            setIsSearchOpen(true);
            setSerialInput('');
            return;
        }

        // 4. If not found at all
        setError(`لم يتم العثور على قطعة أو منتج بالباركود التالي: ${searchInput}`);
    };

    const handleAddItemFromSearch = (item: InventoryItem) => {
        if (itemsToDispatch.some(i => i.id === item.id)) {
            notification?.addNotification('هذه القطعة مضافة بالفعل إلى القائمة.', 'error');
            return;
        }
        setItemsToDispatch([...itemsToDispatch, item]);
    };

    const checkBundleAvailability = () => {
        if (!selectedBundleId) {
            setError('الرجاء اختيار حزمة أولاً.');
            return;
        }
        setError('');

        const bundle = products.find(p => p.id === selectedBundleId);
        if (!bundle || !bundle.components) return;

        const currentDispatchIds = new Set(itemsToDispatch.map(i => i.id));
        const componentsStatus = [];
        let canAddFull = true;

        for (const component of bundle.components) {
            const availableItems = inventoryItems.filter(
                item => item.productId === component.productId &&
                    item.status === 'in_stock' &&
                    !currentDispatchIds.has(item.id)
            );

            const product = getProductById(component.productId);
            const isComplete = availableItems.length >= component.quantity;
            
            if (!isComplete) {
                canAddFull = false;
            }

            componentsStatus.push({
                productId: component.productId,
                productName: product?.name || 'منتج غير معروف',
                required: component.quantity,
                available: availableItems.length,
                isComplete
            });
        }

        setBundleAvailability({
            bundleName: bundle.name,
            components: componentsStatus,
            canAddFull
        });
        setIsBundleDetailsOpen(true);
    };

    const handleAddBundleItems = (addPartial: boolean = false) => {
        if (!selectedBundleId) {
            setError('الرجاء اختيار حزمة أولاً.');
            return;
        }
        setError('');

        const bundle = products.find(p => p.id === selectedBundleId);
        if (!bundle || !bundle.components) return;

        const itemsToAdd: InventoryItem[] = [];
        const currentDispatchIds = new Set(itemsToDispatch.map(i => i.id));

        for (const component of bundle.components) {
            const availableItems = inventoryItems.filter(
                item => item.productId === component.productId &&
                    item.status === 'in_stock' &&
                    !currentDispatchIds.has(item.id)
            );

            const quantityToAdd = addPartial 
                ? Math.min(availableItems.length, component.quantity)
                : component.quantity;

            if (!addPartial && availableItems.length < component.quantity) {
                // في حالة الإضافة الكاملة، نفتح modal التفاصيل
                checkBundleAvailability();
                return;
            }

            const itemsForThisComponent = availableItems.slice(0, quantityToAdd);
            itemsToAdd.push(...itemsForThisComponent);
            itemsForThisComponent.forEach(item => currentDispatchIds.add(item.id));
        }

        setItemsToDispatch(prev => [...prev, ...itemsToAdd]);
        setSelectedBundleId('');
        setIsBundleDetailsOpen(false);
        notification?.addNotification(`تم إضافة ${itemsToAdd.length} قطعة (مكونات الحزمة) إلى قائمة الصرف.`, 'success');
    };


    const handleRemoveItem = (itemId: string) => {
        setItemsToDispatch(itemsToDispatch.filter(item => item.id !== itemId));
    };

    const resetForm = () => {
        setItemsToDispatch([]);
        setSelectedProvinceId('');
        setSelectedAreaId('');
        setDispatchClientId('');
        setDispatchReason('');
        setDispatchNotes('');
        setDispatchReference('');
        setError('');
        setSelectedBundleId('');
        setSerialInput('');
        setPreallocatedClient('');
    }

    const handleDispatch = () => {
        if (itemsToDispatch.length === 0) {
            notification?.addNotification('الرجاء إضافة قطع لقائمة الصرف أولاً.', 'error');
            return;
        }
        if (!dispatchClientId) {
            notification?.addNotification('الرجاء اختيار العميل / الموقع الذي ستصرف له البضاعة.', 'error');
            return;
        }
        if (!dispatchDate) {
            notification?.addNotification('الرجاء تحديد تاريخ الصرف.', 'error');
            return;
        }
        if (!dispatchReason) {
            notification?.addNotification('الرجاء تحديد سبب الصرف.', 'error');
            return;
        }

        const itemIds = itemsToDispatch.map(i => i.id);
        inventory.dispatchItems(itemIds, dispatchClientId, new Date(dispatchDate), dispatchReason, dispatchNotes, dispatchReference);

        // FIX: Corrected the function call to access `getClientById` from the nested `clientsApi` object as defined in the `UseInventoryReturn` type.
        setLastDispatch({
            client: inventory.clientsApi.getClientById(dispatchClientId),
            date: dispatchDate,
            reference: dispatchReference,
            items: itemsToDispatch
        });

        resetForm();
    };

    const handlePrintDeliveryNote = (dispatch: typeof lastDispatch) => {
        if (!dispatch) return;

        const companyName = 'نظام إدارة المخزون'; // يمكن تحسينه لاحقاً
        const clientName = dispatch.client ? getClientFullNameById(dispatch.client.id) : 'غير محدد';

        const printContent = `
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <title>سند تسليم بضاعة</title>
    <link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700&display=swap" rel="stylesheet">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: 'Tajawal', Arial, sans-serif; 
            direction: rtl; 
            padding: 30px;
            background: white;
            font-size: 14px;
        }
        header { 
            display: flex; 
            justify-content: space-between; 
            align-items: center; 
            border-bottom: 2px solid #ddd; 
            padding-bottom: 15px; 
            margin-bottom: 30px;
        }
        header h1 { font-size: 24px; font-weight: bold; color: #2563eb; }
        header h2 { font-size: 18px; font-weight: bold; }
        header p { font-size: 12px; color: #666; margin-top: 5px; }
        .header-right { text-align: left; }
        section { margin-bottom: 30px; }
        .info-grid { 
            display: table; 
            width: 100%; 
            margin-bottom: 30px;
        }
        .info-box { 
            display: table-cell; 
            width: 50%; 
            background: #f8f9fa; 
            padding: 15px; 
            border-radius: 5px;
        }
        .info-box:first-child { margin-left: 15px; }
        .info-box h3 { 
            font-weight: bold; 
            color: #666; 
            border-bottom: 1px solid #ddd; 
            padding-bottom: 5px; 
            margin-bottom: 10px;
            font-size: 13px;
        }
        .info-box p { margin: 5px 0; font-size: 13px; }
        .info-box span { font-weight: bold; }
        table { 
            width: 100%; 
            border-collapse: collapse; 
            margin: 20px 0;
        }
        th, td { 
            border: 1px solid #333; 
            padding: 10px; 
            text-align: right;
        }
        th { 
            background-color: #f0f0f0; 
            font-weight: bold;
            font-size: 13px;
        }
        td { font-size: 12px; }
        tbody tr:hover { background-color: #f8f9fa; }
        footer { 
            margin-top: 80px; 
            padding-top: 30px; 
            display: table;
            width: 100%;
            text-align: center;
        }
        .signature { 
            display: table-cell;
            width: 50%;
        }
        .signature p:first-child { 
            font-weight: bold; 
            margin-bottom: 10px;
        }
        .signature p:last-child { 
            font-size: 10px; 
            color: #666; 
            margin-top: 5px;
        }
        @media print {
            @page { size: A4; margin: 10mm; }
            body { padding: 0; }
        }
    </style>
</head>
<body>
    <header>
        <div>
            <h1>سند تسليم بضاعة</h1>
            <p>Delivery Note</p>
        </div>
        <div class="header-right">
            <h2>${companyName}</h2>
            <p>تاريخ الطباعة: ${new Date().toLocaleString('ar-EG')}</p>
        </div>
    </header>

    <div class="info-grid">
        <div class="info-box">
            <h3>تفاصيل العميل</h3>
            <p><span>العميل / الموقع:</span> ${clientName}</p>
        </div>
        <div class="info-box">
            <h3>تفاصيل التسليم</h3>
            <p><span>تاريخ التسليم:</span> ${new Date(dispatch.date).toLocaleDateString('ar-EG')}</p>
            <p><span>رقم المرجع:</span> ${dispatch.reference || 'لا يوجد'}</p>
        </div>
    </div>

    <section>
        <table>
            <thead>
                <tr>
                    <th>م.</th>
                    <th>اسم المنتج</th>
                    <th>بار كود القطعة (Serial Number)</th>
                </tr>
            </thead>
            <tbody>
                ${dispatch.items.map((item, index) => {
                    const product = getProductById(item.productId);
                    return `
                        <tr>
                            <td>${index + 1}</td>
                            <td>${product?.name || 'منتج غير معروف'}</td>
                            <td style="font-family: monospace;">${item.serialNumber}</td>
                        </tr>
                    `;
                }).join('')}
            </tbody>
        </table>
    </section>

    <footer>
        <div class="signature">
            <p>.................................................</p>
            <p>توقيع المستلم</p>
            <p>(Receiver's Signature)</p>
        </div>
        <div class="signature">
            <p>.................................................</p>
            <p>توقيع المسلّم</p>
            <p>(Giver's Signature)</p>
        </div>
    </footer>
</body>
</html>
        `;

        const printWindow = window.open('', '_blank');
        if (printWindow) {
            printWindow.document.write(printContent);
            printWindow.document.close();
            
            printWindow.onload = () => {
                printWindow.focus();
                setTimeout(() => {
                    printWindow.print();
                    printWindow.close();
                }, 250);
            };
        }
    };

    return (
        <>
            <div className="space-y-6">
                <h1 className="text-3xl font-bold text-dark">صرف بضاعة</h1>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Search and Add Section */}
                    <div className="lg:col-span-1 space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>إضافة قطعة (بحث)</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <form onSubmit={handleAddItemByInput} className="space-y-4">
                                    <div>
                                        <label htmlFor="serial" className="block text-sm font-medium text-slate-700 mb-1">
                                            باركود المنتج (SKU) / باركود القطعة
                                        </label>
                                        <input
                                            type="text"
                                            id="serial"
                                            value={serialInput}
                                            onChange={(e) => setSerialInput(convertArabicInput(e.target.value))}
                                            className="w-full"
                                            placeholder="امسح الباركود هنا..."
                                            // FIX: Changed inputMode from "latin" to "text" to conform to HTML standards.
                                            inputMode="text"
                                        />
                                    </div>
                                    <div className="flex gap-2">
                                        <Button type="submit" className="flex-1">
                                            <Icons.PlusCircle className="h-5 w-5 ml-2" />
                                            إضافة
                                        </Button>
                                        <Button type="button" variant="secondary" onClick={() => setIsSearchOpen(true)} className="flex-1">
                                            <Icons.SearchCheck className="h-5 w-5 ml-2" />
                                            بحث متقدم
                                        </Button>
                                    </div>
                                </form>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader>
                                <CardTitle>صرف بضاعة مخصصة</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    <div>
                                        <label htmlFor="preallocated-client" className="block text-sm font-medium text-slate-700 mb-1">
                                            عرض البضاعة المخصصة لـ (عميل / موقع)
                                        </label>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                            <select
                                                value={selectedProvinceId}
                                                onChange={(e) => handleProvinceChange(e.target.value)}
                                                className="w-full"
                                            >
                                                <option value="">-- المحافظة --</option>
                                                {provinces.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                            </select>
                                            <select
                                                value={selectedAreaId}
                                                onChange={(e) => handleAreaChange(e.target.value)}
                                                disabled={!selectedProvinceId}
                                                className="w-full disabled:bg-gray-100 disabled:cursor-not-allowed"
                                            >
                                                <option value="">-- المنطقة --</option>
                                                {filteredAreas.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                                            </select>
                                            <select
                                                id="preallocated-client"
                                                value={preallocatedClient}
                                                onChange={(e) => setPreallocatedClient(e.target.value)}
                                                disabled={!selectedAreaId}
                                                className="w-full disabled:bg-gray-100 disabled:cursor-not-allowed"
                                            >
                                                <option value="">-- العميل --</option>
                                                {filteredClients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                            </select>
                                        </div>
                                    </div>
                                    {preallocatedClient && (
                                        <div className="border-t pt-4">
                                            {preallocatedItems.length > 0 ? (
                                                <ul className="max-h-48 overflow-y-auto space-y-2">
                                                    {preallocatedItems.map(item => {
                                                        const product = getProductById(item.productId);
                                                        return (
                                                            <li key={item.id} className="flex justify-between items-center p-2 bg-slate-50 rounded-md text-sm">
                                                                <div>
                                                                    <span className="font-semibold">{product?.name}</span>
                                                                    <span className="block font-mono text-xs text-slate-500">{item.serialNumber}</span>
                                                                </div>
                                                                <Button size="sm" variant="secondary" onClick={() => handleAddPreallocatedItem(item)}>
                                                                    إضافة
                                                                </Button>
                                                            </li>
                                                        );
                                                    })}
                                                </ul>
                                            ) : (
                                                <p className="text-sm text-center text-slate-500 py-4">
                                                    لا توجد قطع مخصصة متاحة لهذا العميل / الموقع.
                                                </p>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader>
                                <CardTitle>إضافة حزمة كاملة</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    <div>
                                        <label htmlFor="bundle-select" className="block text-sm font-medium text-slate-700 mb-1">اختر الحزمة</label>
                                        <select
                                            id="bundle-select"
                                            value={selectedBundleId}
                                            onChange={(e) => setSelectedBundleId(e.target.value)}
                                            className="w-full"
                                        >
                                            <option value="">-- اختر حزمة من القائمة --</option>
                                            {bundleProducts.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                                        </select>
                                    </div>
                                    <Button onClick={checkBundleAvailability} className="w-full" variant="secondary">
                                        <Icons.PlusCircle className="h-5 w-5 ml-2" />
                                        إضافة مكونات الحزمة
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                        {error &&
                            <div className="p-4 bg-red-50 border border-red-200 rounded-md text-sm text-danger">
                                <p className="font-bold">حدث خطأ:</p>
                                <p>{error}</p>
                            </div>
                        }
                    </div>
                    {/* Dispatch List Section */}
                    <div className="lg:col-span-2">
                        <Card>
                            <CardHeader>
                                <CardTitle>قائمة الصرف</CardTitle>
                            </CardHeader>
                            <CardContent>
                                {itemsToDispatch.length > 0 ? (
                                    <div className="space-y-4">
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                            <div>
                                                <label htmlFor="provinceId" className="block text-sm font-medium text-slate-700 mb-1">1. المحافظة*</label>
                                                <select
                                                    id="provinceId"
                                                    value={selectedProvinceId}
                                                    onChange={e => handleProvinceChange(e.target.value)}
                                                    required
                                                    className="w-full"
                                                >
                                                    <option value="">-- اختر المحافظة --</option>
                                                    {provinces.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                                </select>
                                            </div>
                                            <div>
                                                <label htmlFor="areaId" className="block text-sm font-medium text-slate-700 mb-1">2. المنطقة*</label>
                                                <select
                                                    id="areaId"
                                                    value={selectedAreaId}
                                                    onChange={e => handleAreaChange(e.target.value)}
                                                    required
                                                    disabled={!selectedProvinceId}
                                                    className="w-full disabled:bg-gray-100 disabled:cursor-not-allowed"
                                                >
                                                    <option value="">-- اختر المنطقة --</option>
                                                    {filteredAreas.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                                                </select>
                                            </div>
                                            <div>
                                                <label htmlFor="client" className="block text-sm font-medium text-slate-700 mb-1">3. العميل*</label>
                                                <select
                                                    id="client"
                                                    value={dispatchClientId}
                                                    onChange={e => setDispatchClientId(e.target.value)}
                                                    required
                                                    disabled={!selectedAreaId}
                                                    className="w-full disabled:bg-gray-100 disabled:cursor-not-allowed"
                                                >
                                                    <option value="">-- اختر العميل --</option>
                                                    {filteredClients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                                </select>
                                            </div>
                                            <div>
                                                <label htmlFor="date" className="block text-sm font-medium text-slate-700 mb-1">تاريخ الصرف*</label>
                                                <input type="date" id="date" value={dispatchDate} onChange={e => setDispatchDate(e.target.value)} required className="w-full" />
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <label htmlFor="dispatchReason" className="block text-sm font-medium text-slate-700 mb-1">سبب الصرف*</label>
                                                <select id="dispatchReason" value={dispatchReason} onChange={e => setDispatchReason(e.target.value)} required className="w-full">
                                                    <option value="" disabled>اختر سبب الصرف...</option>
                                                    {dispatchReasons.map(reason => <option key={reason.id} value={reason.reasonText}>{reason.reasonText}</option>)}
                                                </select>
                                            </div>
                                            <div>
                                                <label htmlFor="dispatchReference" className="block text-sm font-medium text-slate-700 mb-1">رقم المرجع (فاتورة، طلب..)</label>
                                                <input type="text" id="dispatchReference" value={dispatchReference} onChange={e => setDispatchReference(e.target.value)} className="w-full" />
                                            </div>
                                        </div>
                                        <div>
                                            <label htmlFor="dispatchNotes" className="block text-sm font-medium text-slate-700 mb-1">ملاحظات (اختياري)</label>
                                            <textarea id="dispatchNotes" value={dispatchNotes} onChange={e => setDispatchNotes(e.target.value)} rows={2} className="w-full" placeholder="أدخل أي تفاصيل إضافية هنا..."></textarea>
                                        </div>
                                        <table className="w-full text-sm text-right mt-2">
                                            <thead className="text-xs text-slate-700 uppercase bg-slate-100">
                                                <tr>
                                                    <th className="px-4 py-3">المنتج / بار كود المنتج</th>
                                                    <th className="px-4 py-3">بار كود القطعة</th>
                                                    <th className="px-4 py-3">إجراء</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {itemsToDispatch.map(item => {
                                                    const product = getProductById(item.productId);
                                                    return (
                                                        <tr key={item.id} className="bg-white border-b border-slate-200">
                                                            <td className="px-4 py-3 font-medium">
                                                                {product?.name}
                                                                <span className="block font-mono text-xs text-slate-400">
                                                                    باركود: {product?.sku}
                                                                </span>
                                                            </td>
                                                            <td className="px-4 py-3 font-mono">{item.serialNumber}</td>
                                                            <td className="px-4 py-3">
                                                                <Button variant="ghost" size="sm" className="text-danger hover:bg-red-50" onClick={() => handleRemoveItem(item.id)}>
                                                                    <Icons.Trash2 className="h-4 w-4" />
                                                                </Button>
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                        <Button onClick={handleDispatch} className="w-full mt-4">
                                            <Icons.Dispatching className="h-5 w-5 ml-2" />
                                            تأكيد الصرف ({itemsToDispatch.length})
                                        </Button>
                                    </div>
                                ) : (
                                    <p className="text-sm text-slate-500 text-center py-8">
                                        لم تتم إضافة أي قطع. ابحث باستخدام الرقم التسلسلي أو قم بإضافة حزمة.
                                    </p>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
            <ItemSearchModal
                isOpen={isSearchOpen}
                onClose={() => {
                    setIsSearchOpen(false);
                    setSearchModalInitialProductId('');
                }}
                inventory={inventory}
                onItemSelect={handleAddItemFromSearch}
                existingItemIds={existingItemIds}
                initialProductId={searchModalInitialProductId}
                allowedStatuses={['in_stock']}
            />
            {/* Bundle Details Modal */}
            {bundleAvailability && (
                <Modal 
                    isOpen={isBundleDetailsOpen} 
                    onClose={() => {
                        setIsBundleDetailsOpen(false);
                        setBundleAvailability(null);
                    }} 
                    title={`تفاصيل الحزمة: ${bundleAvailability.bundleName}`}
                >
                    <div className="space-y-4">
                        <div className="bg-slate-50 p-4 rounded-md">
                            <h3 className="font-semibold mb-3 text-slate-700">حالة المكونات:</h3>
                            <div className="space-y-2">
                                {bundleAvailability.components.map((comp, index) => (
                                    <div 
                                        key={index} 
                                        className={`flex justify-between items-center p-3 rounded-md border ${
                                            comp.isComplete 
                                                ? 'bg-green-50 border-green-200' 
                                                : 'bg-red-50 border-red-200'
                                        }`}
                                    >
                                        <div className="flex items-center gap-2">
                                            {comp.isComplete ? (
                                                <Icons.CheckCircle className="h-5 w-5 text-green-600" />
                                            ) : (
                                                <Icons.AlertCircle className="h-5 w-5 text-red-600" />
                                            )}
                                            <span className={`font-medium ${
                                                comp.isComplete ? 'text-green-900' : 'text-red-900'
                                            }`}>
                                                {comp.productName}
                                            </span>
                                        </div>
                                        <div className={`text-sm font-semibold ${
                                            comp.isComplete ? 'text-green-700' : 'text-red-700'
                                        }`}>
                                            {comp.available} / {comp.required}
                                            {!comp.isComplete && (
                                                <span className="mr-2 text-xs">
                                                    (ناقص {comp.required - comp.available})
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {!bundleAvailability.canAddFull && (
                            <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
                                <div className="flex items-start gap-2">
                                    <Icons.AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
                                    <div>
                                        <p className="font-semibold text-yellow-900">تنبيه: الحزمة غير مكتملة</p>
                                        <p className="text-sm text-yellow-700 mt-1">
                                            بعض المنتجات غير متوفرة بالكمية المطلوبة. يمكنك إضافة المتوفر فقط.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="flex gap-3 pt-4 border-t">
                            <Button 
                                variant="secondary" 
                                onClick={() => {
                                    setIsBundleDetailsOpen(false);
                                    setBundleAvailability(null);
                                }}
                                className="flex-1"
                            >
                                إلغاء
                            </Button>
                            {bundleAvailability.canAddFull ? (
                                <Button 
                                    onClick={() => handleAddBundleItems(false)}
                                    className="flex-1"
                                >
                                    <Icons.CheckCircle className="h-5 w-5 ml-2" />
                                    إضافة الحزمة الكاملة
                                </Button>
                            ) : (
                                <Button 
                                    onClick={() => handleAddBundleItems(true)}
                                    className="flex-1"
                                    variant="secondary"
                                >
                                    <Icons.PlusCircle className="h-5 w-5 ml-2" />
                                    إضافة المتوفر فقط
                                </Button>
                            )}
                        </div>
                    </div>
                </Modal>
            )}

            {lastDispatch && (
                <Modal isOpen={!!lastDispatch} onClose={() => setLastDispatch(null)} title="تم الصرف بنجاح">
                    <div className="p-6 pt-0 flex flex-col items-center gap-4 text-center">
                        <p>تم صرف {lastDispatch.items.length} قطعة بنجاح إلى "{getClientFullNameById(lastDispatch.client?.id)}".</p>
                        <div className="flex gap-3">
                            <Button variant="secondary" onClick={() => setLastDispatch(null)}>إغلاق</Button>
                            <Button onClick={() => handlePrintDeliveryNote(lastDispatch)}>
                                <Icons.Printer className="h-5 w-5 ml-2" />
                                طباعة سند التسليم
                            </Button>
                        </div>
                    </div>
                </Modal>
            )}
        </>
    );
};

export default Dispatching;