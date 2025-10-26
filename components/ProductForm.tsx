
import React, { useState, useEffect } from 'react';
import { Product, ProductComponent } from '../types';
import { Button } from './ui/Button';
import { Icons } from './icons';
import { convertArabicInput } from '../utils/converters';

interface ProductFormProps {
  product: Product | null;
  productTypeForCreation: 'standard' | 'bundle';
  products: Product[]; // For bundle component selection and SKU generation
  onSubmit: (productData: Omit<Product, 'id'> | Product) => void;
  onCancel: () => void;
}

const CATEGORIES: { [key: string]: string } = {
  'Hardware': 'HW',
  'Software': 'SW',
  'Systems': 'SYS',
  'Accessories': 'ACC',
};

const ProductForm: React.FC<ProductFormProps> = ({ product, productTypeForCreation, products, onSubmit, onCancel }) => {
    const [formData, setFormData] = useState({
        name: '',
        sku: '',
        category: Object.keys(CATEGORIES)[0], // Default to the first category
        standardCostPrice: 0,
        hasWarranty: false,
        warrantyDurationValue: 0,
        warrantyDurationUnit: 'months' as 'days' | 'months' | 'years',
        productType: product?.productType || productTypeForCreation,
        components: [] as ProductComponent[],
    });

    useEffect(() => {
        if (product) {
            setFormData({
                name: product.name,
                sku: product.sku,
                category: product.category,
                standardCostPrice: product.standardCostPrice,
                hasWarranty: product.hasWarranty,
                warrantyDurationValue: product.warrantyDurationValue || 0,
                warrantyDurationUnit: product.warrantyDurationUnit || 'months',
                productType: product.productType,
                components: product.components || [],
            });
        } else {
            // Reset form for new entry
            const initialCategory = Object.keys(CATEGORIES)[0];
            setFormData({
                name: '',
                sku: '',
                category: initialCategory,
                standardCostPrice: 0,
                hasWarranty: false,
                warrantyDurationValue: 0,
                warrantyDurationUnit: 'months',
                productType: productTypeForCreation,
                components: [],
            });
        }
    }, [product, productTypeForCreation]);

    const handleCategoryChange = (newCategory: string) => {
        setFormData(prev => ({ ...prev, category: newCategory }));
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        if (type === 'checkbox') {
            const checked = (e.target as HTMLInputElement).checked;
            setFormData(prev => ({ 
                ...prev, 
                [name]: checked,
                ...(name === 'hasWarranty' && !checked && { warrantyDurationValue: 0 })
            }));
        } else {
            const finalValue = name === 'sku' ? convertArabicInput(value) : value;
            setFormData(prev => ({ ...prev, [name]: finalValue }));
        }
    };

    const handleComponentChange = (index: number, field: keyof ProductComponent, value: string | number) => {
        const newComponents = [...formData.components];
        newComponents[index] = { ...newComponents[index], [field]: value };

        // Recalculate cost if it's a bundle
        if (formData.productType === 'bundle') {
             const newCost = newComponents.reduce((total, comp) => {
                const componentProduct = products.find(p => p.id === comp.productId);
                return total + (componentProduct?.standardCostPrice || 0) * comp.quantity;
            }, 0);
            setFormData(prev => ({ ...prev, components: newComponents, standardCostPrice: newCost }));
        } else {
            setFormData(prev => ({ ...prev, components: newComponents }));
        }
    };

    const addComponent = () => {
        setFormData(prev => ({
            ...prev,
            components: [...prev.components, { productId: '', quantity: 1 }],
        }));
    };

    const removeComponent = (index: number) => {
        const newComponents = formData.components.filter((_, i) => i !== index);
        const newCost = newComponents.reduce((total, comp) => {
            const componentProduct = products.find(p => p.id === comp.productId);
            return total + (componentProduct?.standardCostPrice || 0) * comp.quantity;
        }, 0);

        setFormData(prev => ({
            ...prev,
            components: newComponents,
            standardCostPrice: newCost,
        }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        
        const finalData: Omit<Product, 'id'> = {
            ...formData,
            standardCostPrice: Number(formData.standardCostPrice) || 0,
            warrantyDurationValue: formData.hasWarranty ? Number(formData.warrantyDurationValue) : undefined,
            warrantyDurationUnit: formData.hasWarranty ? formData.warrantyDurationUnit : undefined,
            components: formData.productType === 'bundle' ? formData.components.filter(c => c.productId) : undefined,
        };

        if (product) {
            onSubmit({ ...finalData, id: product.id });
        } else {
            onSubmit(finalData);
        }
    };
    
    const standardProductsForSelection = products.filter(p => p.productType === 'standard' && p.id !== product?.id);

    const isBundle = formData.productType === 'bundle';
    const nameLabel = isBundle ? "اسم الحزمة او المجموعة" : "اسم المنتج";
    const costLabel = isBundle ? "التكلفة المحسوبة للمجموعة" : "التكلفة القياسية";

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label htmlFor="name" className="block text-sm font-medium text-slate-700 mb-1">{nameLabel}</label>
                    <input type="text" name="name" id="name" value={formData.name} onChange={handleChange} required />
                </div>
                 <div>
                    <label htmlFor="category" className="block text-sm font-medium text-slate-700 mb-1">الفئة</label>
                    <select name="category" id="category" value={formData.category} onChange={(e) => handleCategoryChange(e.target.value)} required>
                       {Object.keys(CATEGORIES).map(cat => <option key={cat} value={cat}>{cat}</option>)}
                    </select>
                </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               <div>
                    <label htmlFor="sku" className="block text-sm font-medium text-slate-700 mb-1">باركود المنتج (SKU)</label>
                    {/* FIX: Changed inputMode from "latin" to "text" to conform to HTML standards. */}
                    <input type="text" name="sku" id="sku" value={formData.sku} onChange={handleChange} required readOnly={!!product} placeholder="استخدم قارئ الباركود هنا..." inputMode="text"/>
                    <p className="mt-1 text-xs text-slate-500">هذا هو الباركود العام للمنتج (الموجود على العلبة)، وليس الرقم التسلسلي للقطعة.</p>
                </div>
                <div>
                    <label htmlFor="standardCostPrice" className="block text-sm font-medium text-slate-700 mb-1">{costLabel}</label>
                    <input type="number" name="standardCostPrice" id="standardCostPrice" value={formData.standardCostPrice} onChange={handleChange} required min="0" step="any" readOnly={isBundle} />
                </div>
            </div>
             
             {formData.productType === 'standard' && (
                <div className="pt-2">
                    <div className="flex items-center gap-2">
                        <input type="checkbox" name="hasWarranty" id="hasWarranty" checked={formData.hasWarranty} onChange={handleChange} />
                        <label htmlFor="hasWarranty" className="text-sm font-medium text-slate-700">لديه كفالة؟</label>
                    </div>
                    {formData.hasWarranty && (
                        <div className="grid grid-cols-2 gap-4 mt-2 bg-slate-50 p-3 rounded-md border">
                            <div>
                                <label htmlFor="warrantyDurationValue" className="block text-sm font-medium text-slate-700 mb-1">مدة الكفالة</label>
                                <input type="number" name="warrantyDurationValue" id="warrantyDurationValue" value={formData.warrantyDurationValue} onChange={handleChange} required min="1" />
                            </div>
                            <div>
                                <label htmlFor="warrantyDurationUnit" className="block text-sm font-medium text-slate-700 mb-1">الوحدة</label>
                                <select name="warrantyDurationUnit" id="warrantyDurationUnit" value={formData.warrantyDurationUnit} onChange={handleChange}>
                                    <option value="days">أيام</option>
                                    <option value="months">أشهر</option>
                                    <option value="years">سنوات</option>
                                </select>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {isBundle && (
                <div className="space-y-3 pt-2">
                    <h4 className="text-md font-semibold text-slate-800 border-b pb-2">مكونات الحزمة</h4>
                    {formData.components.map((comp, index) => (
                        <div key={index} className="flex items-center gap-3 p-2 bg-slate-50 rounded-md">
                            <div className="flex-1">
                                <label className="text-xs">المنتج</label>
                                <select 
                                    value={comp.productId} 
                                    onChange={(e) => handleComponentChange(index, 'productId', e.target.value)}
                                    className="text-sm"
                                    required
                                >
                                     <option value="" disabled>اختر مكون...</option>
                                     {standardProductsForSelection.map(p => (
                                         <option key={p.id} value={p.id}>{p.name}</option>
                                     ))}
                                </select>
                            </div>
                            <div>
                                <label className="text-xs">الكمية</label>
                                <input 
                                    type="number"
                                    min="1"
                                    value={comp.quantity}
                                    onChange={(e) => handleComponentChange(index, 'quantity', Number(e.target.value))}
                                    className="w-20 text-sm"
                                    required
                                />
                            </div>
                             <button type="button" onClick={() => removeComponent(index)} className="text-danger hover:text-danger-hover self-end pb-1">
                                <Icons.Trash2 className="h-4 w-4"/>
                            </button>
                        </div>
                    ))}
                    <Button type="button" variant="secondary" size="sm" onClick={addComponent}>
                        <Icons.PlusCircle className="h-4 w-4 ml-2" />
                        إضافة مكون
                    </Button>
                </div>
            )}

            <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="secondary" onClick={onCancel}>إلغاء</Button>
                <Button type="submit">حفظ</Button>
            </div>
        </form>
    );
};

export default ProductForm;