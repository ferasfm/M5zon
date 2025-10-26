

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


const DISPATCH_REASONS = [
    'احتياج جديد',
    'بدل تالف',
    'تجديد مخزون',
    'مكسور',
];

const Dispatching: React.FC<{ inventory: UseInventoryReturn }> = ({ inventory }) => {
    const notification = useNotification();
    const [serialInput, setSerialInput] = useState('');
    const [itemsToDispatch, setItemsToDispatch] = useState<InventoryItem[]>([]);
    const [error, setError] = useState('');
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

    const { clients, findItemBySerial, getProductById, products, inventoryItems, getClientFullNameById } = inventory;
    const bundleProducts = useMemo(() => products.filter(p => p.productType === 'bundle'), [products]);
    const existingItemIds = useMemo(() => new Set(itemsToDispatch.map(i => i.id)), [itemsToDispatch]);

    const sortedClients = useMemo(() => {
        return [...clients].sort((a, b) => 
            getClientFullNameById(a.id).localeCompare(getClientFullNameById(b.id))
        );
    }, [clients, getClientFullNameById]);

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
    
    const handleAddBundleItems = () => {
        if (!selectedBundleId) {
            setError('الرجاء اختيار حزمة أولاً.');
            return;
        }
        setError('');
    
        const bundle = products.find(p => p.id === selectedBundleId);
        if (!bundle || !bundle.components) return;
    
        const itemsToAdd: InventoryItem[] = [];
        let stockError = '';
    
        const currentDispatchIds = new Set(itemsToDispatch.map(i => i.id));
    
        for (const component of bundle.components) {
            const availableItems = inventoryItems.filter(
                item => item.productId === component.productId &&
                        item.status === 'in_stock' &&
                        !currentDispatchIds.has(item.id)
            );
    
            if (availableItems.length < component.quantity) {
                const product = getProductById(component.productId);
                stockError = `لا يوجد مخزون كافٍ من '${product?.name}'. المطلوب: ${component.quantity}, المتاح: ${availableItems.length}`;
                break;
            }
    
            const itemsForThisComponent = availableItems.slice(0, component.quantity);
            itemsToAdd.push(...itemsForThisComponent);
            itemsForThisComponent.forEach(item => currentDispatchIds.add(item.id));
        }
    
        if (stockError) {
            setError(stockError);
        } else {
            setItemsToDispatch(prev => [...prev, ...itemsToAdd]);
            setSelectedBundleId('');
            notification?.addNotification(`تم إضافة ${itemsToAdd.length} قطعة (مكونات الحزمة) إلى قائمة الصرف.`, 'success');
        }
    };


    const handleRemoveItem = (itemId: string) => {
        setItemsToDispatch(itemsToDispatch.filter(item => item.id !== itemId));
    };
    
    const resetForm = () => {
        setItemsToDispatch([]);
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
                                        <select
                                            id="preallocated-client"
                                            value={preallocatedClient}
                                            onChange={(e) => setPreallocatedClient(e.target.value)}
                                            className="w-full"
                                        >
                                            <option value="">-- اختر العميل / الموقع --</option>
                                            {sortedClients.map(c => <option key={c.id} value={c.id}>{getClientFullNameById(c.id)}</option>)}
                                        </select>
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
                                    <Button onClick={handleAddBundleItems} className="w-full" variant="secondary">
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
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                            <div className="lg:col-span-2">
                                                <label htmlFor="client" className="block text-sm font-medium text-slate-700 mb-1">صرف إلى (العميل / الموقع)*</label>
                                                <select id="client" value={dispatchClientId} onChange={e => setDispatchClientId(e.target.value)} required className="w-full">
                                                    <option value="" disabled>اختر العميل / الموقع...</option>
                                                    {sortedClients.map(c => <option key={c.id} value={c.id}>{getClientFullNameById(c.id)}</option>)}
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
                                                    {DISPATCH_REASONS.map(reason => <option key={reason} value={reason}>{reason}</option>)}
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
            {lastDispatch && (
                <Modal isOpen={!!lastDispatch} onClose={() => setLastDispatch(null)} title="تم الصرف بنجاح">
                    <div className="no-print p-6 pt-0 flex flex-col items-center gap-4 text-center">
                        <p>تم صرف {lastDispatch.items.length} قطعة بنجاح إلى "{getClientFullNameById(lastDispatch.client?.id)}".</p>
                        <div className="flex gap-3">
                            <Button variant="secondary" onClick={() => setLastDispatch(null)}>إغلاق</Button>
                            <Button onClick={() => window.print()}>
                                <Icons.Printer className="h-5 w-5 ml-2"/>
                                طباعة سند التسليم
                            </Button>
                        </div>
                    </div>
                    <div className="print-container hidden">
                        <DeliveryNote
                            client={lastDispatch.client}
                            date={lastDispatch.date}
                            reference={lastDispatch.reference}
                            items={lastDispatch.items}
                            inventory={inventory}
                        />
                    </div>
                </Modal>
            )}
        </>
    );
};

export default Dispatching;