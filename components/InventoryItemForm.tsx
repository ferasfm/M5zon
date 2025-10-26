
import React, { useState, useRef } from 'react';
import { UseInventoryReturn, NewItem, Product } from '../types';
import { Button } from './ui/Button';
import { useNotification } from '../contexts/NotificationContext';
import { convertArabicInput } from '../utils/converters';

interface InventoryItemFormProps {
    inventory: UseInventoryReturn;
    onAddItem: (item: NewItem) => void;
    batchDefaults: {
        purchaseDate: string;
        supplierId: string;
        destinationClientId: string;
        purchaseReason: string;
        initialStatus: 'in_stock' | 'damaged_on_arrival';
    };
}

const InventoryItemForm: React.FC<InventoryItemFormProps> = ({ inventory, onAddItem, batchDefaults }) => {
    const { products, findItemBySerial } = inventory;
    const notification = useNotification();
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [serialNumber, setSerialNumber] = useState('');
    const [costPrice, setCostPrice] = useState('');
    const [productSku, setProductSku] = useState('');
    
    const serialInputRef = useRef<HTMLInputElement>(null);
    const productSkuInputRef = useRef<HTMLInputElement>(null);

    const findAndSetProduct = (sku: string) => {
        const product = products.find(p => p.sku.toLowerCase() === sku.toLowerCase());
        if (product) {
            setSelectedProduct(product);
            setCostPrice(String(product.standardCostPrice));
            serialInputRef.current?.focus();
        } else {
            setSelectedProduct(null);
            setCostPrice('');
            if (sku) { // Only show error if SKU is not empty
                notification?.addNotification(`لم يتم العثور على منتج بالباركود: ${sku}`, 'error');
            }
            productSkuInputRef.current?.select();
        }
    };

    const handleSkuKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault(); // Prevent form submission
            findAndSetProduct(convertArabicInput(e.currentTarget.value));
        }
    };
    
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedProduct || !serialNumber.trim() || !costPrice) {
            notification?.addNotification('الرجاء تعبئة جميع الحقول: المنتج، بار كود القطعة، والتكلفة.', 'error');
            return;
        }

        // Check if serial number already exists in DB
        if (findItemBySerial(serialNumber.trim())) {
            notification?.addNotification(`خطأ: بار كود القطعة ${serialNumber.trim()} موجود بالفعل في المخزون.`, 'error');
            setSerialNumber('');
            return;
        }


        const newItem: NewItem = {
            productId: selectedProduct.id,
            serialNumber: serialNumber.trim(),
            costPrice: parseFloat(costPrice),
            status: batchDefaults.initialStatus,
            purchaseDate: new Date(batchDefaults.purchaseDate),
            supplierId: batchDefaults.supplierId || undefined,
            destinationClientId: batchDefaults.destinationClientId,
            purchaseReason: batchDefaults.purchaseReason,
        };

        onAddItem(newItem);
        // Reset for next item, but keep product selected for batch entry
        setSerialNumber('');
        serialInputRef.current?.focus();
    };
    
    const standardProducts = products.filter(p => p.productType === 'standard');

    return (
        <form onSubmit={handleSubmit} className="space-y-4 p-4 border rounded-lg bg-slate-50">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                <div>
                    <label htmlFor="product-sku" className="block text-sm font-medium text-slate-700 mb-1">1. باركود المنتج (SKU)*</label>
                    <input 
                        id="product-sku"
                        ref={productSkuInputRef}
                        type="text"
                        list="product-suggestions"
                        placeholder="امسح باركود المنتج هنا..."
                        value={productSku}
                        onChange={e => setProductSku(convertArabicInput(e.target.value))}
                        onKeyDown={handleSkuKeyDown}
                        className="w-full"
                        // FIX: Changed inputMode from "latin" to "text" to conform to HTML standards.
                        inputMode="text"
                    />
                    <datalist id="product-suggestions">
                        {standardProducts.map(p => <option key={p.id} value={p.sku}>{p.name}</option>)}
                    </datalist>
                     {selectedProduct && <p className="text-xs text-slate-600 mt-1">المنتج المحدد: <span className="font-bold">{selectedProduct.name}</span></p>}
                </div>
                 <div>
                    <label htmlFor="costPrice" className="block text-sm font-medium text-slate-700 mb-1">سعر التكلفة*</label>
                    <input 
                        id="costPrice"
                        type="number"
                        min="0"
                        step="any"
                        value={costPrice}
                        onChange={e => setCostPrice(e.target.value)}
                        required
                        className="w-full"
                        disabled={!selectedProduct}
                    />
                </div>
            </div>
            <div>
                 <label htmlFor="serialNumber" className="block text-sm font-medium text-slate-700 mb-1">2. باركود القطعة (Serial Number)*</label>
                 <input 
                    id="serialNumber"
                    ref={serialInputRef}
                    type="text"
                    value={serialNumber}
                    onChange={e => setSerialNumber(convertArabicInput(e.target.value))}
                    required
                    className="w-full"
                    placeholder="امسح باركود القطعة الفريد هنا..."
                    disabled={!selectedProduct}
                    // FIX: Changed inputMode from "latin" to "text" to conform to HTML standards.
                    inputMode="text"
                />
            </div>
            
            <Button type="submit" className="w-full" disabled={!selectedProduct || !serialNumber.trim()}>
                إضافة القطعة للقائمة
            </Button>
        </form>
    );
};

export default InventoryItemForm;