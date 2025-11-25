
import React, { useState, useMemo } from 'react';
import { UseInventoryReturn, InventoryItem, Supplier } from '../types';
import { Card, CardContent, CardHeader, CardTitle } from './ui/Card';
import { Button } from './ui/Button';
import { Icons } from './icons';
import ItemSearchModal from './ItemSearchModal';
import { convertArabicInput } from '../utils/converters';

// SCRAP_REASONS now comes from database via reasonsApi

const Scrapping: React.FC<{ inventory: UseInventoryReturn }> = ({ inventory }) => {
    const [itemsToScrap, setItemsToScrap] = useState<InventoryItem[]>([]);
    const [serialInput, setSerialInput] = useState('');
    const [error, setError] = useState('');
    const [scrapReason, setScrapReason] = useState('');
    const [scrapNotes, setScrapNotes] = useState('');
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [itemForReview, setItemForReview] = useState<InventoryItem | null>(null);
    
    const { findItemBySerial, getProductById, scrapItems, getSupplierById, reasonsApi } = inventory;
    const scrapReasons = reasonsApi.getScrapReasons();
    const existingItemIds = useMemo(() => new Set(itemsToScrap.map(i => i.id)), [itemsToScrap]);

    const handleSearchItem = (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        setError('');
        setItemForReview(null);
        if (!serialInput.trim()) return;

        if (itemsToScrap.some(i => i.serialNumber.toLowerCase() === serialInput.trim().toLowerCase())) {
            setError('هذه القطعة مضافة بالفعل إلى القائمة.');
            return;
        }

        const item = findItemBySerial(serialInput);
        if (item) {
             if (item.status !== 'in_stock' && item.status !== 'damaged_on_arrival') {
                setError(`لا يمكن إتلاف هذه القطعة لأن حالتها ليست "في المخزون" أو "تالفة عند الاستلام". الحالة الحالية: ${item.status}`);
                return;
            }
            setItemForReview(item);
            setSerialInput('');
        } else {
            setError(`لم يتم العثور على قطعة بالباركود: ${serialInput}`);
        }
    };
    
    const handleSelectItemFromSearch = (item: InventoryItem) => {
        if (existingItemIds.has(item.id)) {
            alert('هذه القطعة مضافة بالفعل إلى القائمة.');
            return;
        }
        setItemForReview(item);
        setIsSearchOpen(false);
    };

    const handleAddItemToList = () => {
        if (!itemForReview) return;
        setItemsToScrap(prev => [...prev, itemForReview]);
        setItemForReview(null);
        setError('');
    };

    const handleRemoveItem = (itemId: string) => {
        setItemsToScrap(prev => prev.filter(item => item.id !== itemId));
    };
    
    const resetForm = () => {
        setItemsToScrap([]);
        setScrapReason(SCRAP_REASONS[0]);
        setScrapNotes('');
        setError('');
        setSerialInput('');
        setItemForReview(null);
    };

    const handleScrapItems = () => {
        if (itemsToScrap.length === 0) {
            alert('الرجاء إضافة قطع لقائمة الإتلاف أولاً.');
            return;
        }
        if (!scrapReason) {
            alert('الرجاء تحديد سبب الإتلاف.');
            return;
        }
        if (scrapReason === 'أسباب أخرى' && !scrapNotes.trim()) {
            alert('الرجاء كتابة ملاحظات لتوضيح سبب الإتلاف.');
            return;
        }

        const itemIds = itemsToScrap.map(i => i.id);
        scrapItems(itemIds, scrapReason, scrapNotes);
        alert(`تم إتلاف ${itemsToScrap.length} قطعة بنجاح.`);
        resetForm();
    };

    const getWarrantyInfo = (item: InventoryItem | null) => {
        if (!item?.warrantyEndDate) return { status: 'لا يوجد كفالة', remainingDays: 0, isUnderWarranty: false };
        const endDate = new Date(item.warrantyEndDate);
        const now = new Date();
        const diffTime = endDate.getTime() - now.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays <= 0) {
            return { status: 'الكفالة منتهية', remainingDays: 0, isUnderWarranty: false };
        }
        return { status: 'الكفالة سارية', remainingDays: diffDays, isUnderWarranty: true };
    };

    const reviewWarrantyInfo = getWarrantyInfo(itemForReview);
    const reviewProduct = itemForReview ? getProductById(itemForReview.productId) : null;
    const reviewSupplier = itemForReview?.supplierId ? getSupplierById(itemForReview.supplierId) : null;

    return (
        <>
            <div className="space-y-6">
                <h1 className="text-3xl font-bold text-dark">إتلاف بضاعة</h1>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                    <div className="lg:col-span-1 space-y-6">
                        <Card>
                             <CardHeader>
                                <CardTitle>1. البحث عن قطعة</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <form onSubmit={handleSearchItem} className="space-y-4">
                                    <div>
                                        <label htmlFor="serial" className="block text-sm font-medium text-slate-700 mb-1">
                                            بار كود القطعة
                                        </label>
                                        <input 
                                            type="text" 
                                            id="serial"
                                            value={serialInput} 
                                            onChange={(e) => { setSerialInput(convertArabicInput(e.target.value)); setError(''); setItemForReview(null); }}
                                            className="w-full"
                                            placeholder="أدخل الباركود..."
                                            // FIX: Changed inputMode from "latin" to "text" to conform to HTML standards.
                                            inputMode="text"
                                        />
                                    </div>
                                    <div className="flex gap-2">
                                        <Button type="submit" className="flex-1">
                                            <Icons.SearchCheck className="h-5 w-5 ml-2" />
                                            بحث
                                        </Button>
                                        <Button type="button" variant="secondary" onClick={() => { setIsSearchOpen(true); setItemForReview(null); }} className="flex-1">
                                            بحث متقدم
                                        </Button>
                                    </div>
                                     {error && <p className="text-sm text-danger mt-2">{error}</p>}
                                </form>
                            </CardContent>
                        </Card>
                        {itemForReview && (
                            <Card className="border-primary shadow-lg">
                                <CardHeader>
                                    <CardTitle>2. مراجعة بيانات القطعة</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                     {reviewWarrantyInfo.isUnderWarranty && (
                                        <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md text-sm text-yellow-800 flex items-start gap-3">
                                            <Icons.AlertTriangle className="h-5 w-5 text-yellow-500 mt-0.5 flex-shrink-0"/>
                                            <div>
                                                <p className="font-bold">تنبيه: هذه القطعة تحت الكفالة!</p>
                                                <p>يفضل التواصل مع المورد لإمكانية استبدالها قبل إتلافها.</p>
                                            </div>
                                        </div>
                                    )}
                                    <div className="text-sm space-y-2">
                                        <p><strong>المنتج:</strong> {reviewProduct?.name}</p>
                                        <p><strong>بار كود القطعة:</strong> <span className="font-mono">{itemForReview.serialNumber}</span></p>
                                        <p><strong>حالة الكفالة:</strong> <span className={`font-bold ${reviewWarrantyInfo.isUnderWarranty ? 'text-success' : 'text-danger'}`}>{reviewWarrantyInfo.status}</span></p>
                                        {reviewWarrantyInfo.isUnderWarranty && (
                                            <p><strong>المدة المتبقية:</strong> {reviewWarrantyInfo.remainingDays} يوم</p>
                                        )}
                                        <div className="pt-2 border-t">
                                             <p className="font-bold mt-2">معلومات المورد:</p>
                                             {reviewSupplier ? (
                                                <>
                                                    <p><strong>الاسم:</strong> {reviewSupplier.name}</p>
                                                    <p><strong>جهة الاتصال:</strong> {reviewSupplier.contactPerson || '-'}</p>
                                                    <p><strong>الهاتف:</strong> {reviewSupplier.phone || '-'}</p>
                                                </>
                                             ) : <p className="text-slate-500">لا يوجد مورد مسجل لهذه القطعة.</p>}
                                        </div>
                                    </div>
                                   
                                    <div className="flex gap-2 pt-4 border-t">
                                        <Button onClick={handleAddItemToList} className="flex-1">
                                            <Icons.PlusCircle className="h-4 w-4 ml-2"/>
                                            إضافة لقائمة الإتلاف
                                        </Button>
                                        <Button variant="secondary" onClick={() => setItemForReview(null)} className="flex-1">
                                            إلغاء
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        )}
                    </div>

                    <div className="lg:col-span-2">
                         <Card>
                            <CardHeader>
                                <CardTitle>3. قائمة الإتلاف ({itemsToScrap.length})</CardTitle>
                            </CardHeader>
                             <CardContent>
                                {itemsToScrap.length > 0 ? (
                                    <div className="space-y-4">
                                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <label htmlFor="scrapReason" className="block text-sm font-medium text-slate-700 mb-1">سبب الإتلاف*</label>
                                                <select id="scrapReason" value={scrapReason} onChange={e => setScrapReason(e.target.value)} required className="w-full">
                                                    <option value="" disabled>اختر سبب الإتلاف...</option>
                                                    {scrapReasons.map(reason => <option key={reason.id} value={reason.reasonText}>{reason.reasonText}</option>)}
                                                </select>
                                            </div>
                                        </div>
                                        {scrapReason === 'أسباب أخرى' && (
                                            <div>
                                                <label htmlFor="scrapNotes" className="block text-sm font-medium text-slate-700 mb-1">ملاحظات (إلزامي)*</label>
                                                <textarea id="scrapNotes" value={scrapNotes} onChange={e => setScrapNotes(e.target.value)} rows={2} className="w-full" placeholder="يرجى توضيح سبب الإتلاف هنا..."></textarea>
                                            </div>
                                        )}
                                        <table className="w-full text-sm text-right mt-2">
                                            <thead className="text-xs text-slate-700 uppercase bg-slate-100">
                                                <tr>
                                                    <th className="px-4 py-3">المنتج</th>
                                                    <th className="px-4 py-3">بار كود القطعة</th>
                                                    <th className="px-4 py-3">حالة الكفالة</th>
                                                    <th className="px-4 py-3">إجراء</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {itemsToScrap.map(item => {
                                                    const product = getProductById(item.productId);
                                                    const warrantyInfo = getWarrantyInfo(item);
                                                    return (
                                                        <tr key={item.id} className="bg-white border-b border-slate-200">
                                                            <td className="px-4 py-3 font-medium">{product?.name}</td>
                                                            <td className="px-4 py-3 font-mono">{item.serialNumber}</td>
                                                            <td className={`px-4 py-3 font-semibold ${warrantyInfo.isUnderWarranty ? 'text-success' : 'text-danger'}`}>{warrantyInfo.status}</td>
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
                                         <Button onClick={handleScrapItems} className="w-full mt-4" variant="danger">
                                            <Icons.Trash2 className="h-5 w-5 ml-2" />
                                            تأكيد إتلاف ({itemsToScrap.length}) قطعة
                                        </Button>
                                    </div>
                                ) : (
                                    <p className="text-sm text-slate-500 text-center py-8">
                                        لم تتم إضافة أي قطع. ابحث عن قطعة لمراجعتها وإضافتها.
                                    </p>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
             <ItemSearchModal 
                isOpen={isSearchOpen}
                onClose={() => setIsSearchOpen(false)}
                inventory={inventory}
                onItemSelect={handleSelectItemFromSearch}
                existingItemIds={existingItemIds}
                allowedStatuses={['in_stock', 'damaged_on_arrival']}
            />
        </>
    );
};

export default Scrapping;