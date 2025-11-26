import React, { useState, useMemo } from 'react';
import { UseInventoryReturn, NewItem } from '../types';
import { Card, CardContent, CardHeader, CardTitle } from './ui/Card';
import { Button } from './ui/Button';
import { Icons } from './icons';
import InventoryItemForm from './InventoryItemForm';
import { useNotification } from '../contexts/NotificationContext';
import { formatCurrency } from '../utils/formatters';

// PURCHASE_REASONS now comes from database via reasonsApi

// This is a new type for the bundle component form
interface BundleComponentToReceive {
    productId: string;
    productName: string;
    serialNumber: string;
    costPrice: number;
}


const Receiving: React.FC<{ inventory: UseInventoryReturn }> = ({ inventory }) => {
    const notification = useNotification();
    const [itemsToReceive, setItemsToReceive] = useState<NewItem[]>([]);
    
    // State for common batch data
    const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split('T')[0]);
    const [supplierId, setSupplierId] = useState('');
    const [purchaseReason, setPurchaseReason] = useState('');
    const [initialStatus, setInitialStatus] = useState<'in_stock' | 'damaged_on_arrival'>('in_stock');

    // New state for tabs and bundle receiving
    const [activeTab, setActiveTab] = useState<'standard' | 'bundle'>('standard');
    const [selectedBundleId, setSelectedBundleId] = useState('');
    const [bundleQuantity, setBundleQuantity] = useState(1);
    const [preparedComponents, setPreparedComponents] = useState<BundleComponentToReceive[]>([]);
    
    const { suppliers, receiveItems, products, getProductById, reasonsApi } = inventory;
    const purchaseReasons = reasonsApi.getPurchaseReasons();
    
    const bundleProducts = useMemo(() => products.filter(p => p.productType === 'bundle'), [products]);

    const handleAddItemToList = (item: NewItem) => {
        if (itemsToReceive.some(i => i.serialNumber.trim().toLowerCase() === item.serialNumber.trim().toLowerCase())) {
            notification?.addNotification(`خطأ: بار كود القطعة ${item.serialNumber} مضاف بالفعل في هذه الدفعة.`, 'error');
            return;
        }
        setItemsToReceive(prev => [...prev, item]);
    };

    const handleRemoveItem = (serialNumber: string) => {
        setItemsToReceive(prev => prev.filter(item => item.serialNumber !== serialNumber));
    };
    
    const resetForm = () => {
        setItemsToReceive([]);
        setPurchaseDate(new Date().toISOString().split('T')[0]);
        setSupplierId('');
        setPurchaseReason('');
        setInitialStatus('in_stock');
        // Reset bundle state too
        setSelectedBundleId('');
        setBundleQuantity(1);
        setPreparedComponents([]);
        setActiveTab('standard');
    };

    const handleReceiveBatch = async () => {
        if (itemsToReceive.length === 0) {
            notification?.addNotification('الرجاء إضافة قطعة واحدة على الأقل للاستلام.', 'error');
            return;
        }

        const success = await receiveItems(itemsToReceive);
        if (success) {
            notification?.addNotification(`تم استلام ${itemsToReceive.length} قطعة بنجاح!`, 'success');
            resetForm();
        }
        // Error notifications are handled inside useInventory hook
    };

    const canStartAdding = purchaseDate && purchaseReason;

    const handlePrepareBundleComponents = () => {
        if (!selectedBundleId) return;

        const bundle = getProductById(selectedBundleId);
        if (!bundle || !bundle.components) return;

        const components: BundleComponentToReceive[] = [];
        for (let i = 0; i < bundleQuantity; i++) {
            for (const component of bundle.components) {
                for (let j = 0; j < component.quantity; j++) {
                    const product = getProductById(component.productId);
                    if(product) {
                        components.push({
                            productId: component.productId,
                            productName: product.name,
                            serialNumber: '',
                            costPrice: product.standardCostPrice
                        });
                    }
                }
            }
        }
        setPreparedComponents(components);
    };
    
    const handlePreparedComponentChange = (index: number, field: 'serialNumber' | 'costPrice', value: string) => {
        const updatedComponents = [...preparedComponents];
        const numValue = field === 'costPrice' ? parseFloat(value) : value;
        updatedComponents[index] = { ...updatedComponents[index], [field]: numValue };
        setPreparedComponents(updatedComponents);
    };

    const handleAddPreparedComponentsToList = () => {
        const currentSerials = new Set(itemsToReceive.map(i => i.serialNumber.trim().toLowerCase()));
        const batchSerials = new Set<string>();

        for (const comp of preparedComponents) {
            const trimmedSerial = comp.serialNumber.trim();
            if (!trimmedSerial) {
                notification?.addNotification('خطأ: يجب إدخال بار كود قطعة لكل المكونات.', 'error');
                return;
            }
            const lowerSerial = trimmedSerial.toLowerCase();
            if (currentSerials.has(lowerSerial) || batchSerials.has(lowerSerial)) {
                notification?.addNotification(`خطأ: بار كود القطعة ${comp.serialNumber} مكرر.`, 'error');
                return;
            }
            batchSerials.add(lowerSerial);
        }

        // توليد معرف فريد للحزمة
        const bundleGroupId = `bundle_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const bundle = getProductById(selectedBundleId);
        const bundleName = bundle?.name || 'حزمة';

        const newItems: NewItem[] = preparedComponents.map(comp => ({
            productId: comp.productId,
            serialNumber: comp.serialNumber.trim(),
            costPrice: comp.costPrice,
            status: initialStatus,
            purchaseDate: new Date(purchaseDate),
            supplierId: supplierId || undefined,
            purchaseReason: purchaseReason,
            bundleGroupId: bundleGroupId, // إضافة معرف الحزمة
            bundleName: bundleName, // إضافة اسم الحزمة
        }));
        
        setItemsToReceive(prev => [...prev, ...newItems]);
        setPreparedComponents([]);
        setSelectedBundleId('');
        setBundleQuantity(1);
    };


    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold text-dark">استلام بضاعة جديدة</h1>

            <Card>
                <CardHeader>
                    <CardTitle>1. معلومات الاستلام الأساسية</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div>
                            <label htmlFor="purchaseDate" className="block text-sm font-medium text-slate-700 mb-1">تاريخ الشراء/الاستلام*</label>
                            <input type="date" id="purchaseDate" value={purchaseDate} onChange={e => setPurchaseDate(e.target.value)} required className="w-full" />
                        </div>
                        <div>
                            <label htmlFor="supplierId" className="block text-sm font-medium text-slate-700 mb-1">المورد (اختياري)</label>
                            <select id="supplierId" value={supplierId} onChange={e => setSupplierId(e.target.value)} className="w-full">
                                <option value="">-- اختر مورد --</option>
                                {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label htmlFor="purchaseReason" className="block text-sm font-medium text-slate-700 mb-1">سبب الشراء*</label>
                            <select id="purchaseReason" value={purchaseReason} onChange={e => setPurchaseReason(e.target.value)} required className="w-full">
                                <option value="" disabled>اختر سبب الشراء...</option>
                                {purchaseReasons.map(r => <option key={r.id} value={r.reasonText}>{r.reasonText}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">الحالة الأولية للقطع</label>
                            <div className="flex gap-4 items-center h-full pt-2">
                                <label className="flex items-center gap-2">
                                    <input type="radio" name="initialStatus" value="in_stock" checked={initialStatus === 'in_stock'} onChange={() => setInitialStatus('in_stock')} />
                                    <span className="text-sm">سليم</span>
                                </label>
                                <label className="flex items-center gap-2">
                                    <input type="radio" name="initialStatus" value="damaged_on_arrival" checked={initialStatus === 'damaged_on_arrival'} onChange={() => setInitialStatus('damaged_on_arrival')} />
                                    <span className="text-sm">تالف</span>
                                </label>
                            </div>
                        </div>
                     </div>
                </CardContent>
            </Card>

            <div className="border-b border-slate-200">
                <nav className="-mb-px flex gap-6" aria-label="Tabs">
                    <button
                        onClick={() => setActiveTab('standard')}
                        className={`shrink-0 border-b-2 px-1 pb-4 text-sm font-medium ${
                            activeTab === 'standard' 
                            ? 'border-primary text-primary' 
                            : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700'
                        }`}
                    >
                        استلام منتجات عادية
                    </button>
                    <button
                        onClick={() => setActiveTab('bundle')}
                        className={`shrink-0 border-b-2 px-1 pb-4 text-sm font-medium ${
                            activeTab === 'bundle' 
                            ? 'border-primary text-primary' 
                            : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700'
                        }`}
                    >
                        استلام حزمة
                    </button>
                </nav>
            </div>
            
             {canStartAdding ? (
                <>
                {activeTab === 'standard' && (
                    <Card>
                        <CardHeader>
                            <CardTitle>2. إضافة المنتجات العادية</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <InventoryItemForm
                                inventory={inventory}
                                onAddItem={handleAddItemToList}
                                batchDefaults={{
                                    purchaseDate,
                                    supplierId,
                                    purchaseReason,
                                    initialStatus,
                                }}
                            />
                        </CardContent>
                    </Card>
                )}

                {activeTab === 'bundle' && (
                    <div className="space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>2. اختيار الحزمة والكمية</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="flex gap-4 items-end">
                                    <div className="flex-1">
                                        <label htmlFor="bundle-select" className="block text-sm font-medium text-slate-700 mb-1">اختر الحزمة</label>
                                        <select
                                            id="bundle-select"
                                            value={selectedBundleId}
                                            onChange={(e) => {
                                                setSelectedBundleId(e.target.value);
                                                setPreparedComponents([]); // Reset prepared if selection changes
                                            }}
                                            className="w-full"
                                        >
                                            <option value="">-- اختر حزمة --</option>
                                            {bundleProducts.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label htmlFor="bundle-quantity" className="block text-sm font-medium text-slate-700 mb-1">الكمية</label>
                                        <input
                                            id="bundle-quantity"
                                            type="number"
                                            min="1"
                                            value={bundleQuantity}
                                            onChange={(e) => setBundleQuantity(parseInt(e.target.value, 10))}
                                            className="w-24"
                                        />
                                    </div>
                                    <Button onClick={handlePrepareBundleComponents} disabled={!selectedBundleId}>
                                        تجهيز المكونات
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>

                        {preparedComponents.length > 0 && (
                            <Card>
                                <CardHeader>
                                    <CardTitle>3. إدخال بيانات مكونات الحزمة</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                     <div className="max-h-96 overflow-y-auto space-y-3 p-1">
                                    {preparedComponents.map((comp, index) => (
                                        <div key={index} className="grid grid-cols-1 md:grid-cols-3 gap-3 p-3 bg-slate-50 border rounded-md">
                                            <div className="md:col-span-1">
                                                <label className="text-xs font-medium text-slate-600">المنتج</label>
                                                <p className="font-semibold text-sm">{comp.productName}</p>
                                            </div>
                                            <div>
                                                <label htmlFor={`serial-${index}`} className="text-xs font-medium text-slate-600">بار كود القطعة*</label>
                                                <input
                                                    id={`serial-${index}`}
                                                    type="text"
                                                    value={comp.serialNumber}
                                                    onChange={(e) => handlePreparedComponentChange(index, 'serialNumber', e.target.value)}
                                                    placeholder="أدخل الباركود..."
                                                    className="text-sm"
                                                    required
                                                />
                                            </div>
                                            <div>
                                                <label htmlFor={`cost-${index}`} className="text-xs font-medium text-slate-600">سعر التكلفة*</label>
                                                <input
                                                    id={`cost-${index}`}
                                                    type="number"
                                                    value={comp.costPrice}
                                                    onChange={(e) => handlePreparedComponentChange(index, 'costPrice', e.target.value)}
                                                    className="text-sm"
                                                    required
                                                />
                                            </div>
                                        </div>
                                    ))}
                                    </div>
                                    <Button onClick={handleAddPreparedComponentsToList} className="w-full mt-4">
                                        إضافة المكونات إلى قائمة الاستلام
                                    </Button>
                                </CardContent>
                            </Card>
                        )}
                    </div>
                )}
                </>
            ) : (
                 <p className="text-center text-slate-500 py-8">الرجاء إكمال "معلومات الاستلام الأساسية" أولاً لبدء إضافة القطع.</p>
            )}

            {itemsToReceive.length > 0 && (
                <Card className="mt-6">
                    <CardHeader>
                        <CardTitle>قائمة الاستلام النهائية ({itemsToReceive.length})</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="max-h-96 overflow-y-auto">
                        <table className="w-full text-sm text-right">
                            <thead className="text-xs text-slate-700 uppercase bg-slate-100">
                                <tr>
                                    <th className="px-4 py-3">المنتج</th>
                                    <th className="px-4 py-3">بار كود القطعة</th>
                                    <th className="px-4 py-3">التكلفة</th>
                                    <th className="px-4 py-3">إجراء</th>
                                </tr>
                            </thead>
                            <tbody>
                                {itemsToReceive.map((item, index) => {
                                    const product = getProductById(item.productId);
                                    return (
                                        <tr key={`${item.serialNumber}-${index}`} className="bg-white border-b border-slate-200">
                                            <td className="px-4 py-3 font-medium">{product?.name || '-'}</td>
                                            <td className="px-4 py-3 font-mono">{item.serialNumber}</td>
                                            <td className="px-4 py-3">{formatCurrency(item.costPrice)}</td>
                                            <td className="px-4 py-3">
                                                <Button variant="ghost" size="sm" className="text-danger hover:bg-red-50" onClick={() => handleRemoveItem(item.serialNumber)}>
                                                    <Icons.Trash2 className="h-4 w-4" />
                                                </Button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                        </div>
                        <Button onClick={handleReceiveBatch} className="w-full mt-4">
                            <Icons.Receiving className="h-5 w-5 ml-2" />
                            تأكيد استلام ({itemsToReceive.length}) قطعة
                        </Button>
                    </CardContent>
                </Card>
            )}

        </div>
    );
};

export default Receiving;
