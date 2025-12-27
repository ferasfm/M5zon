import React, { useState, useEffect } from 'react';
import { useSupabase } from '../contexts/SupabaseContext';
import { Card, CardContent, CardHeader, CardTitle } from './ui/Card';
import { Button } from './ui/Button';
import { Icons } from './icons';
import { Modal } from './ui/Modal';
import { useNotification } from '../contexts/NotificationContext';

interface SupplierPrice {
    id: string;
    productId: string;
    supplierId: string;
    price: number;
    isPreferred: boolean;
    notes: string;
    createdAt: string;
    updatedAt: string;
}

interface SupplierProductPricingProps {
    productId: string;
    suppliers: Array<{ id: string; name: string }>;
    onPriceUpdate?: () => void;
    onProductPriceUpdate?: (newPrice: number) => void;
}

const SupplierProductPricing: React.FC<SupplierProductPricingProps> = ({
    productId,
    suppliers,
    onPriceUpdate,
    onProductPriceUpdate
}) => {
    const { supabase } = useSupabase();
    const notification = useNotification();
    const [prices, setPrices] = useState<SupplierPrice[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingPrice, setEditingPrice] = useState<SupplierPrice | null>(null);
    
    const [formData, setFormData] = useState({
        supplierId: '',
        price: '',
        isPreferred: false,
        notes: ''
    });
    const [formError, setFormError] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (productId && supabase) {
            loadPrices();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [productId, supabase]);

    const loadPrices = async () => {
        if (!supabase) return;
        
        setIsLoading(true);
        try {
            const { data, error } = await supabase
                .from('supplier_products')
                .select('*')
                .eq('product_id', productId)
                .order('is_preferred', { ascending: false })
                .order('price', { ascending: true });

            if (error) {
                console.error('Error loading prices:', error);
                notification?.addNotification('فشل تحميل الأسعار', 'error');
            } else {
                const loadedPrices = data.map((p: any) => ({
                    id: p.id,
                    productId: p.product_id,
                    supplierId: p.supplier_id,
                    price: parseFloat(p.price),
                    isPreferred: p.is_preferred,
                    notes: p.notes || '',
                    createdAt: p.created_at,
                    updatedAt: p.updated_at
                }));

                setPrices(loadedPrices);

                // إذا كان هناك مورد واحد فقط وليس مفضل، اجعله مفضل تلقائياً
                if (loadedPrices.length === 1 && !loadedPrices[0].isPreferred) {
                    const singlePrice = loadedPrices[0];
                    
                    // تحديث حالة المورد ليصبح مفضل
                    const { error: updateError } = await supabase
                        .from('supplier_products')
                        .update({ is_preferred: true })
                        .eq('id', singlePrice.id);

                    if (!updateError) {
                        // تحديث سعر المنتج
                        const { error: productError } = await supabase
                            .from('products')
                            .update({ standard_cost_price: singlePrice.price })
                            .eq('id', productId);

                        if (!productError) {
                            // إشعار المكون الأب بالتحديث
                            onProductPriceUpdate?.(singlePrice.price);
                            
                            // إعادة تحميل الأسعار لتحديث الواجهة
                            const { data: updatedData } = await supabase
                                .from('supplier_products')
                                .select('*')
                                .eq('product_id', productId)
                                .order('is_preferred', { ascending: false })
                                .order('price', { ascending: true });

                            if (updatedData) {
                                setPrices(updatedData.map((p: any) => ({
                                    id: p.id,
                                    productId: p.product_id,
                                    supplierId: p.supplier_id,
                                    price: parseFloat(p.price),
                                    isPreferred: p.is_preferred,
                                    notes: p.notes || '',
                                    createdAt: p.created_at,
                                    updatedAt: p.updated_at
                                })));
                            }

                            notification?.addNotification('تم تعيين المورد الوحيد كمفضل تلقائياً', 'success');
                        }
                    }
                }
            }
        } catch (error) {
            console.error('Error loading prices:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const openModalForNew = () => {
        setEditingPrice(null);
        setFormData({
            supplierId: '',
            price: '',
            isPreferred: false,
            notes: ''
        });
        setFormError('');
        setIsModalOpen(true);
    };

    const openModalForEdit = (price: SupplierPrice) => {
        setEditingPrice(price);
        setFormData({
            supplierId: price.supplierId,
            price: price.price.toString(),
            isPreferred: price.isPreferred,
            notes: price.notes
        });
        setFormError('');
        setIsModalOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setFormError('');

        if (!formData.supplierId) {
            setFormError('الرجاء اختيار المورد');
            return;
        }

        if (!formData.price || parseFloat(formData.price) <= 0) {
            setFormError('الرجاء إدخال سعر صحيح');
            return;
        }

        setIsSaving(true);

        try {
            if (editingPrice) {
                // Update existing price
                const { error } = await supabase
                    .from('supplier_products')
                    .update({
                        price: parseFloat(formData.price),
                        is_preferred: formData.isPreferred,
                        notes: formData.notes
                    })
                    .eq('id', editingPrice.id);

                if (error) {
                    setFormError(error.message);
                    return;
                }

                notification?.addNotification('تم تحديث السعر بنجاح', 'success');
            } else {
                // التحقق من عدد الموردين الحاليين
                const isFirstSupplier = prices.length === 0;
                
                // إذا كان أول مورد، يصبح مفضل تلقائياً
                const shouldBePreferred = isFirstSupplier ? true : formData.isPreferred;

                // Create new price
                const { error } = await supabase
                    .from('supplier_products')
                    .insert({
                        product_id: productId,
                        supplier_id: formData.supplierId,
                        price: parseFloat(formData.price),
                        is_preferred: shouldBePreferred,
                        notes: formData.notes
                    });

                if (error) {
                    if (error.message.includes('duplicate') || error.message.includes('unique')) {
                        setFormError('هذا المورد مضاف بالفعل لهذا المنتج');
                    } else {
                        setFormError(error.message);
                    }
                    return;
                }

                // إذا تم تعيينه كمفضل، تحديث سعر المنتج
                if (shouldBePreferred) {
                    const { error: productError } = await supabase
                        .from('products')
                        .update({ standard_cost_price: parseFloat(formData.price) })
                        .eq('id', productId);

                    if (productError) {
                        console.error('Error updating product price:', productError);
                    } else {
                        // إشعار المكون الأب بالتحديث
                        onProductPriceUpdate?.(parseFloat(formData.price));
                    }
                }

                const message = isFirstSupplier 
                    ? 'تم إضافة السعر وتعيينه كمورد مفضل تلقائياً' 
                    : 'تم إضافة السعر بنجاح';
                notification?.addNotification(message, 'success');
            }

            setIsModalOpen(false);
            loadPrices();
            onPriceUpdate?.();

        } catch (error: any) {
            console.error('Error saving price:', error);
            setFormError('حدث خطأ أثناء الحفظ');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (priceId: string) => {
        if (!confirm('هل أنت متأكد من حذف هذا السعر؟')) {
            return;
        }

        try {
            const { error } = await supabase
                .from('supplier_products')
                .delete()
                .eq('id', priceId);

            if (error) {
                notification?.addNotification('فشل حذف السعر: ' + error.message, 'error');
                return;
            }

            notification?.addNotification('تم حذف السعر بنجاح', 'success');
            loadPrices();
            onPriceUpdate?.();

        } catch (error) {
            console.error('Error deleting price:', error);
            notification?.addNotification('حدث خطأ أثناء الحذف', 'error');
        }
    };

    const handleTogglePreferred = async (priceId: string, currentValue: boolean) => {
        try {
            // إذا كان سيتم تفعيل المورد المفضل
            if (!currentValue) {
                // الحصول على السعر الجديد
                const selectedPrice = prices.find(p => p.id === priceId);
                if (selectedPrice) {
                    // تحديث سعر المنتج في جدول products
                    const { error: productError } = await supabase
                        .from('products')
                        .update({ standard_cost_price: selectedPrice.price })
                        .eq('id', productId);

                    if (productError) {
                        console.error('Error updating product price:', productError);
                        notification?.addNotification('فشل تحديث سعر المنتج', 'error');
                        return;
                    }

                    // إشعار المكون الأب بالتحديث
                    onProductPriceUpdate?.(selectedPrice.price);
                }
            }

            const { error } = await supabase
                .from('supplier_products')
                .update({ is_preferred: !currentValue })
                .eq('id', priceId);

            if (error) {
                notification?.addNotification('فشل تحديث المورد المفضل', 'error');
                return;
            }

            notification?.addNotification('تم تحديث المورد المفضل وسعر المنتج', 'success');
            loadPrices();
            onPriceUpdate?.();

        } catch (error) {
            console.error('Error toggling preferred:', error);
        }
    };

    const getSupplierName = (supplierId: string) => {
        const supplier = suppliers.find(s => s.id === supplierId);
        return supplier?.name || 'مورد غير معروف';
    };

    const availableSuppliers = suppliers.filter(
        s => !prices.some(p => p.supplierId === s.id) || editingPrice?.supplierId === s.id
    );

    const cheapestPrice = prices.length > 0 ? Math.min(...prices.map(p => p.price)) : 0;

    if (isLoading) {
        return (
            <Card>
                <CardContent className="py-8 text-center">
                    <Icons.RefreshCw className="w-8 h-8 text-blue-600 animate-spin mx-auto" />
                </CardContent>
            </Card>
        );
    }

    return (
        <>
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <CardTitle>💰 أسعار الموردين</CardTitle>
                        <Button onClick={openModalForNew} size="sm">
                            <Icons.Plus className="h-4 w-4 ml-2" />
                            إضافة مورد
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    {prices.length > 0 ? (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-right">
                                <thead className="text-xs text-slate-700 uppercase bg-slate-100">
                                    <tr>
                                        <th className="px-4 py-3">المورد</th>
                                        <th className="px-4 py-3">السعر</th>
                                        <th className="px-4 py-3">المفضل</th>
                                        <th className="px-4 py-3">ملاحظات</th>
                                        <th className="px-4 py-3">إجراءات</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {prices.map(price => (
                                        <tr 
                                            key={price.id} 
                                            className={`border-b border-slate-200 ${
                                                price.price === cheapestPrice && prices.length > 1
                                                    ? 'bg-green-50'
                                                    : 'bg-white'
                                            }`}
                                        >
                                            <td className="px-4 py-3 font-medium">
                                                {getSupplierName(price.supplierId)}
                                                {price.isPreferred && (
                                                    <span className="mr-2 text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded">
                                                        مفضل
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className="font-bold text-lg">
                                                    {price.price.toFixed(2)}
                                                </span>
                                                {price.price === cheapestPrice && prices.length > 1 && (
                                                    <span className="mr-2 text-xs bg-green-600 text-white px-2 py-0.5 rounded">
                                                        أرخص سعر
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3">
                                                <button
                                                    onClick={() => handleTogglePreferred(price.id, price.isPreferred)}
                                                    className={`p-1 rounded ${
                                                        price.isPreferred
                                                            ? 'text-yellow-500 hover:text-yellow-600'
                                                            : 'text-gray-300 hover:text-yellow-500'
                                                    }`}
                                                    title={price.isPreferred ? 'إزالة التفضيل' : 'تعيين كمفضل'}
                                                >
                                                    {price.isPreferred ? '⭐' : '☆'}
                                                </button>
                                            </td>
                                            <td className="px-4 py-3 text-xs text-gray-600">
                                                {price.notes || '-'}
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => openModalForEdit(price)}
                                                        className="text-blue-600 hover:text-blue-800"
                                                        title="تعديل"
                                                    >
                                                        <Icons.Edit className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(price.id)}
                                                        className="text-red-600 hover:text-red-800"
                                                        title="حذف"
                                                    >
                                                        <Icons.Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="text-center py-8 text-gray-500">
                            <span className="text-6xl">💰</span>
                            <p className="mt-3">لم يتم إضافة أسعار موردين بعد</p>
                            <p className="text-sm mt-1">اضغط "إضافة مورد" لإضافة السعر الأول</p>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Modal */}
            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={editingPrice ? 'تعديل سعر المورد' : 'إضافة سعر مورد'}
            >
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {formError && (
                        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                            {formError}
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            المورد *
                        </label>
                        <select
                            value={formData.supplierId}
                            onChange={(e) => setFormData({ ...formData, supplierId: e.target.value })}
                            className="w-full"
                            required
                            disabled={!!editingPrice}
                        >
                            <option value="">-- اختر المورد --</option>
                            {availableSuppliers.map(s => (
                                <option key={s.id} value={s.id}>{s.name}</option>
                            ))}
                        </select>
                        {editingPrice && (
                            <p className="text-xs text-gray-500 mt-1">
                                لا يمكن تغيير المورد بعد الإضافة
                            </p>
                        )}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            السعر *
                        </label>
                        <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={formData.price}
                            onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                            className="w-full"
                            required
                            placeholder="0.00"
                        />
                    </div>

                    <div className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            id="isPreferred"
                            checked={formData.isPreferred}
                            onChange={(e) => setFormData({ ...formData, isPreferred: e.target.checked })}
                            disabled={!editingPrice && prices.length === 0}
                        />
                        <label htmlFor="isPreferred" className="text-sm text-gray-700 flex items-center gap-1">
                            <span>⭐</span>
                            تعيين كمورد مفضل
                        </label>
                    </div>
                    {!editingPrice && prices.length === 0 && (
                        <p className="text-xs text-blue-600 bg-blue-50 p-2 rounded">
                            💡 المورد الأول سيصبح مفضلاً تلقائياً
                        </p>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            ملاحظات (اختياري)
                        </label>
                        <textarea
                            value={formData.notes}
                            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                            className="w-full"
                            rows={3}
                            placeholder="أي ملاحظات إضافية..."
                        />
                    </div>

                    <div className="flex gap-3 pt-4">
                        <Button type="submit" disabled={isSaving} className="flex-1">
                            {isSaving ? (
                                <>
                                    <Icons.RefreshCw className="w-4 h-4 ml-2 animate-spin" />
                                    جاري الحفظ...
                                </>
                            ) : (
                                <>
                                    <Icons.Check className="w-4 h-4 ml-2" />
                                    حفظ
                                </>
                            )}
                        </Button>
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={() => setIsModalOpen(false)}
                            disabled={isSaving}
                        >
                            إلغاء
                        </Button>
                    </div>
                </form>
            </Modal>
        </>
    );
};

export default SupplierProductPricing;
