import React, { useState } from 'react';
import { Product } from '../types';
import { Button } from './ui/Button';
import { useNotification } from '../contexts/NotificationContext';

interface PriceAgreementFormProps {
    onSubmit: (data: { productId: string; price: number; startDate: string; }) => void;
    onCancel: () => void;
    products: Product[];
    existingAgreementProductIds: string[];
}

const PriceAgreementForm: React.FC<PriceAgreementFormProps> = ({ onSubmit, onCancel, products, existingAgreementProductIds }) => {
    const notification = useNotification();
    const [productId, setProductId] = useState('');
    const [price, setPrice] = useState('');
    const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!productId || !price || !startDate) {
            notification?.addNotification('يرجى تعبئة جميع الحقول.', 'error');
            return;
        }
        onSubmit({ productId, price: Number(price), startDate });
    };

    const availableProducts = products.filter(p => p.productType === 'standard' && !existingAgreementProductIds.includes(p.id));

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <label htmlFor="productId" className="block text-sm font-medium text-slate-700 mb-1">المنتج*</label>
                <select id="productId" value={productId} onChange={e => setProductId(e.target.value)} required className="w-full">
                    <option value="" disabled>اختر منتجاً...</option>
                    {availableProducts.map(p => (
                        <option key={p.id} value={p.id}>{p.name} (باركود: {p.sku})</option>
                    ))}
                </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
                 <div>
                    <label htmlFor="price" className="block text-sm font-medium text-slate-700 mb-1">السعر المتفق عليه*</label>
                    <input type="number" id="price" value={price} onChange={e => setPrice(e.target.value)} required min="0" step="any" className="w-full" />
                </div>
                 <div>
                    <label htmlFor="startDate" className="block text-sm font-medium text-slate-700 mb-1">تاريخ بدء الاتفاقية*</label>
                    <input type="date" id="startDate" value={startDate} onChange={e => setStartDate(e.target.value)} required className="w-full" />
                </div>
            </div>
            <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="secondary" onClick={onCancel}>إلغاء</Button>
                <Button type="submit">حفظ الاتفاقية</Button>
            </div>
        </form>
    );
};

export default PriceAgreementForm;
