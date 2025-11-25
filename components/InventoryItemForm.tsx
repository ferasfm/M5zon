
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
        destinationClientId?: string;
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
    const [quantity, setQuantity] = useState('1');
    
    const serialInputRef = useRef<HTMLInputElement>(null);
    const productSkuInputRef = useRef<HTMLInputElement>(null);
    const quantityInputRef = useRef<HTMLInputElement>(null);

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
        if (!selectedProduct || !costPrice || !quantity) {
            notification?.addNotification('الرجاء تعبئة جميع الحقول: المنتج، التكلفة، والكمية.', 'error');
            return;
        }

        const qty = parseInt(quantity);
        if (qty < 1 || qty > 1000) {
            notification?.addNotification('الكمية يجب أن تكون بين 1 و 1000', 'error');
            return;
        }

        // If serial number is provided and quantity > 1, show error
        if (serialNumber.trim() && qty > 1) {
            notification?.addNotification('لا يمكن إدخال باركود محدد مع كمية أكثر من 1. اترك الباركود فارغاً لتوليد باركودات تلقائية.', 'error');
            return;
        }

        // Add multiple items
        for (let i = 0; i < qty; i++) {
            // Generate serial if empty or for multiple items
            let finalSerial = serialNumber.trim();
            if (!finalSerial || qty > 1) {
                finalSerial = `NO-SERIAL-${selectedProduct.sku}-${Date.now()}-${i}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
            }

            // Check if serial number already exists in DB
            if (findItemBySerial(finalSerial)) {
                notification?.addNotification(`خطأ: بار كود القطعة ${finalSerial} موجود بالفعل في المخزون.`, 'error');
                return;
            }

            const newItem: NewItem = {
                productId: selectedProduct.id,
                serialNumber: finalSerial,
                costPrice: parseFloat(costPrice),
                status: batchDefaults.initialStatus,
                purchaseDate: new Date(batchDefaults.purchaseDate),
                supplierId: batchDefaults.supplierId || undefined,
                destinationClientId: batchDefaults.destinationClientId || undefined,
                purchaseReason: batchDefaults.purchaseReason,
            };

            onAddItem(newItem);
        }

        notification?.addNotification(`تم إضافة ${qty} قطعة بنجاح`, 'success');
        
        // Reset for next item, but keep product selected for batch entry
        setSerialNumber('');
        setQuantity('1');
        serialInputRef.current?.focus();
    };
    
    const standardProducts = products.filter(p => p.productType === 'standard');

    return (
        <form onSubmit={handleSubmit} className="space-y-4 p-4 border rounded-lg bg-slate-50">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
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
                <div>
                    <label htmlFor="quantity" className="block text-sm font-medium text-slate-700 mb-1">عدد القطع*</label>
                    <input 
                        id="quantity"
                        ref={quantityInputRef}
                        type="number"
                        min="1"
                        max="1000"
                        value={quantity}
                        onChange={e => setQuantity(e.target.value)}
                        required
                        className="w-full"
                        disabled={!selectedProduct}
                        placeholder="1"
                    />
                </div>
            </div>
            <div>
                 <label htmlFor="serialNumber" className="block text-sm font-medium text-slate-700 mb-1">
                    2. باركود القطعة (Serial Number) 
                    <span className="text-slate-500 font-normal"> - اختياري</span>
                 </label>
                 <input 
                    id="serialNumber"
                    ref={serialInputRef}
                    type="text"
                    value={serialNumber}
                    onChange={e => setSerialNumber(convertArabicInput(e.target.value))}
                    className="w-full"
                    placeholder="امسح باركود القطعة أو اتركه فارغاً..."
                    disabled={!selectedProduct || parseInt(quantity) > 1}
                    // FIX: Changed inputMode from "latin" to "text" to conform to HTML standards.
                    inputMode="text"
                />
                 <p className="text-xs text-slate-500 mt-1">
                    {parseInt(quantity) > 1 
                        ? '💡 عند إدخال أكثر من قطعة، سيتم توليد باركودات تلقائية لجميع القطع'
                        : '💡 إذا تركت الحقل فارغاً، سيتم توليد باركود تلقائي للقطعة'
                    }
                 </p>
            </div>
            
            <Button type="submit" className="w-full" disabled={!selectedProduct}>
                إضافة القطعة للقائمة
            </Button>
        </form>
    );
};

export default InventoryItemForm;