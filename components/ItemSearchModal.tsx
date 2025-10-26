
import React, { useState, useMemo, useEffect } from 'react';
import { UseInventoryReturn, InventoryItem } from '../types';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import { useNotification } from '../contexts/NotificationContext';
import { convertArabicInput } from '../utils/converters';

interface ItemSearchModalProps {
    isOpen: boolean;
    onClose: () => void;
    inventory: UseInventoryReturn;
    onItemSelect: (item: InventoryItem) => void;
    existingItemIds: Set<string>;
    initialProductId?: string;
    allowedStatuses?: InventoryItem['status'][];
}

const ItemSearchModal: React.FC<ItemSearchModalProps> = ({ 
    isOpen, 
    onClose, 
    inventory, 
    onItemSelect,
    existingItemIds,
    initialProductId = '',
    allowedStatuses = ['in_stock'] 
}) => {
    const { inventoryItems, products, getProductById, getClientFullNameById } = inventory;
    const notification = useNotification();
    const [productId, setProductId] = useState(initialProductId);
    const [serialFilter, setSerialFilter] = useState('');
    const [clientId, setClientId] = useState('');

    useEffect(() => {
        if (isOpen) {
            setProductId(initialProductId);
            setSerialFilter('');
            setClientId('');
        }
    }, [isOpen, initialProductId]);

    const getWarrantyStatus = (item: InventoryItem) => {
        if (!item.warrantyEndDate) return { text: 'لا يوجد', color: 'text-slate-500', days: null };
        const now = new Date();
        const endDate = new Date(item.warrantyEndDate);
        if (endDate < now) return { text: 'منتهية', color: 'text-danger', days: 0 };
        const diffTime = endDate.getTime() - now.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return { text: 'سارية', color: 'text-success', days: diffDays };
    };

    const filteredItems = useMemo(() => {
        return inventoryItems.filter(item => {
            if (!allowedStatuses.includes(item.status)) return false;
            if (productId && item.productId !== productId) return false;
            if (serialFilter && !item.serialNumber.toLowerCase().includes(serialFilter.toLowerCase())) return false;
            if (clientId && item.destinationClientId !== clientId) return false;
            return true;
        }).slice(0, 100); // Limit results to 100 for performance
    }, [inventoryItems, allowedStatuses, productId, serialFilter, clientId]);
    
    const handleSelect = (item: InventoryItem) => {
        if (existingItemIds.has(item.id)) {
            notification?.addNotification('هذه القطعة مضافة بالفعل إلى القائمة.', 'error');
            return;
        }
        onItemSelect(item);
    };

    const standardProducts = useMemo(() => products.filter(p => p.productType === 'standard').sort((a,b) => a.name.localeCompare(b.name)), [products]);

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="بحث متقدم عن قطعة">
            <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 border rounded-md bg-slate-50">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">فلترة حسب المنتج</label>
                        <select value={productId} onChange={e => setProductId(e.target.value)} className="w-full">
                            <option value="">كل المنتجات</option>
                            {standardProducts.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">فلترة حسب بار كود القطعة</label>
                        <input 
                            type="text" 
                            value={serialFilter} 
                            onChange={e => setSerialFilter(convertArabicInput(e.target.value))} 
                            placeholder="جزء من بار كود القطعة..."
                            className="w-full"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">فلترة حسب الموقع الحالي</label>
                        <select value={clientId} onChange={e => setClientId(e.target.value)} className="w-full">
                            <option value="">كل المواقع</option>
                            {inventory.clients.map(c => <option key={c.id} value={c.id}>{getClientFullNameById(c.id)}</option>)}
                        </select>
                    </div>
                </div>

                <div className="max-h-96 overflow-y-auto">
                    {filteredItems.length > 0 ? (
                        <table className="w-full text-sm text-right">
                            <thead className="text-xs text-slate-700 uppercase bg-slate-100 sticky top-0">
                                <tr>
                                    <th className="px-4 py-3">المنتج</th>
                                    <th className="px-4 py-3">بار كود القطعة</th>
                                    <th className="px-4 py-3">حالة الكفالة</th>
                                    <th className="px-4 py-3">المدة المتبقية</th>
                                    <th className="px-4 py-3">إجراء</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredItems.map(item => {
                                    const product = getProductById(item.productId);
                                    const isAdded = existingItemIds.has(item.id);
                                    const warrantyStatus = getWarrantyStatus(item);
                                    return (
                                        <tr key={item.id} className={`bg-white border-b border-slate-200 ${isAdded ? 'opacity-50' : 'hover:bg-slate-50'}`}>
                                            <td className="px-4 py-3 font-medium">{product?.name || '-'}</td>
                                            <td className="px-4 py-3 font-mono">{item.serialNumber}</td>
                                            <td className={`px-4 py-3 font-semibold ${warrantyStatus.color}`}>{warrantyStatus.text}</td>
                                            <td className="px-4 py-3">{warrantyStatus.days !== null ? `${warrantyStatus.days} يوم` : '-'}</td>
                                            <td className="px-4 py-3">
                                                <Button 
                                                    size="sm" 
                                                    onClick={() => handleSelect(item)}
                                                    disabled={isAdded}
                                                >
                                                    {isAdded ? 'تمت الإضافة' : 'اختر'}
                                                </Button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    ) : (
                        <p className="text-center text-slate-500 py-8">لا توجد قطع تطابق معايير البحث.</p>
                    )}
                </div>
                 <div className="flex justify-end pt-4">
                    <Button variant="secondary" onClick={onClose}>إغلاق</Button>
                </div>
            </div>
        </Modal>
    );
};

export default ItemSearchModal;
