import React, { useState, useEffect } from 'react';
import { useSupabase } from '../contexts/SupabaseContext';
import { Card, CardContent, CardHeader, CardTitle } from './ui/Card';
import { Button } from './ui/Button';
import { Icons } from './icons';
import { formatCurrency } from '../utils/currencyHelper';
import SupplierPriceHistory from './SupplierPriceHistory';
import * as XLSX from 'xlsx';

interface SupplierPriceAgreementProps {
    supplierId: string;
    supplierName: string;
}

interface ProductPrice {
    productId: string;
    productName: string;
    productSku: string;
    categoryName: string;
    currentPrice?: number;
    isPreferred: boolean;
    lastPurchasePrice?: number;
    stockQuantity: number;
    standardCostPrice: number;
    lastUpdated?: string;
    notes?: string;
}

const SupplierPriceAgreement: React.FC<SupplierPriceAgreementProps> = ({
    supplierId,
    supplierName
}) => {
    const { supabase } = useSupabase();
    const [products, setProducts] = useState<ProductPrice[]>([]);
    const [categories, setCategories] = useState<Array<{ id: string; name: string }>>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState<'all' | 'priced' | 'unpriced'>('all');
    const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
    const [sortBy, setSortBy] = useState<'name' | 'price' | 'difference'>('name');
    const [viewingHistory, setViewingHistory] = useState<{ productId: string; productName: string } | null>(null);

    useEffect(() => {
        loadProducts();
    }, [supplierId, supabase]);

    const loadProducts = async () => {
        if (!supabase) return;
        
        setIsLoading(true);
        try {
            // جلب جميع المنتجات
            const { data: allProducts, error: productsError } = await supabase
                .from('products')
                .select('id, name, sku, category_id, standard_cost_price')
                .order('name');

            if (productsError) throw productsError;

            // جلب الفئات
            const { data: categoriesData } = await supabase
                .from('categories')
                .select('id, name');
            
            setCategories(categoriesData || []);

            // جلب أسعار هذا المورد
            const { data: supplierPrices } = await supabase
                .from('supplier_products')
                .select('product_id, price, is_preferred, notes, updated_at')
                .eq('supplier_id', supplierId);

            // جلب كميات المخزون
            const { data: inventory } = await supabase
                .from('inventory_items')
                .select('product_id, cost_price')
                .eq('status', 'in_stock');

            // دمج البيانات
            const productsData: ProductPrice[] = allProducts?.map(product => {
                const supplierPrice = supplierPrices?.find(sp => sp.product_id === product.id);
                const category = categoriesData?.find(c => c.id === product.category_id);
                const productInventory = inventory?.filter(i => i.product_id === product.id) || [];
                const lastPurchase = productInventory.length > 0 
                    ? productInventory[productInventory.length - 1].cost_price 
                    : undefined;

                return {
                    productId: product.id,
                    productName: product.name,
                    productSku: product.sku,
                    categoryName: category?.name || 'غير مصنف',
                    currentPrice: supplierPrice?.price ? Number(supplierPrice.price) : undefined,
                    isPreferred: supplierPrice?.is_preferred || false,
                    lastPurchasePrice: lastPurchase ? Number(lastPurchase) : undefined,
                    stockQuantity: productInventory.length,
                    standardCostPrice: Number(product.standard_cost_price || 0),
                    lastUpdated: supplierPrice?.updated_at,
                    notes: supplierPrice?.notes
                };
            }) || [];

            setProducts(productsData);
        } catch (error) {
            console.error('Error loading products:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const exportToExcel = (type: 'all' | 'priced' | 'unpriced' | 'simple') => {
        let dataToExport = products;
        
        // فلترة حسب النوع
        if (type === 'priced') {
            dataToExport = products.filter(p => p.currentPrice !== undefined);
        } else if (type === 'unpriced') {
            dataToExport = products.filter(p => p.currentPrice === undefined);
        }
        
        // فلترة حسب الفئات المختارة
        if (selectedCategories.length > 0) {
            dataToExport = dataToExport.filter(p => selectedCategories.includes(p.categoryName));
        }

        // إعداد البيانات للتصدير
        const excelData = dataToExport.map(p => {
            const difference = p.currentPrice 
                ? ((p.currentPrice - p.standardCostPrice) / p.standardCostPrice * 100).toFixed(1)
                : '';

            if (type === 'simple') {
                return {
                    'اسم المنتج': p.productName,
                    'رمز المنتج': p.productSku,
                    'السعر الحالي': p.currentPrice || '',
                    'السعر الجديد': '',
                    'مفضل؟ (نعم/لا)': p.isPreferred ? 'نعم' : 'لا',
                    'ملاحظات': p.notes || ''
                };
            }

            return {
                'اسم المنتج': p.productName,
                'رمز المنتج': p.productSku,
                'الفئة': p.categoryName,
                'السعر المرجعي': p.standardCostPrice,
                'السعر الحالي من المورد': p.currentPrice || '',
                'الفرق %': difference,
                'آخر سعر شراء': p.lastPurchasePrice || '',
                'الكمية في المخزون': p.stockQuantity,
                'السعر الجديد': '',
                'مفضل؟ (نعم/لا)': p.isPreferred ? 'نعم' : 'لا',
                'ملاحظات': p.notes || '',
                'آخر تحديث': p.lastUpdated ? new Date(p.lastUpdated).toLocaleDateString('ar-SA') : ''
            };
        });

        // إنشاء ورقة العمل
        const ws = XLSX.utils.json_to_sheet(excelData);

        // تنسيق العرض
        const colWidths = type === 'simple' 
            ? [
                { wch: 30 }, // اسم المنتج
                { wch: 15 }, // رمز المنتج
                { wch: 12 }, // السعر الحالي
                { wch: 12 }, // السعر الجديد
                { wch: 15 }, // مفضل
                { wch: 30 }  // ملاحظات
            ]
            : [
                { wch: 30 }, // اسم المنتج
                { wch: 15 }, // رمز المنتج
                { wch: 15 }, // الفئة
                { wch: 12 }, // السعر المرجعي
                { wch: 15 }, // السعر الحالي
                { wch: 10 }, // الفرق
                { wch: 12 }, // آخر سعر شراء
                { wch: 10 }, // الكمية
                { wch: 12 }, // السعر الجديد
                { wch: 15 }, // مفضل
                { wch: 30 }, // ملاحظات
                { wch: 15 }  // آخر تحديث
            ];
        
        ws['!cols'] = colWidths;

        // تجميد الصف الأول
        ws['!freeze'] = { xSplit: 0, ySplit: 1 };

        // إنشاء ورقة التعليمات
        const instructionsData = [
            { 'التعليمات': 'كيفية تعبئة اتفاقية الأسعار' },
            { 'التعليمات': '' },
            { 'التعليمات': '1. قم بتعبئة عمود "السعر الجديد" للمنتجات المطلوبة' },
            { 'التعليمات': '2. السعر يجب أن يكون رقم موجب (مثال: 150.50)' },
            { 'التعليمات': '3. عمود "مفضل" يقبل فقط: نعم أو لا' },
            { 'التعليمات': '4. يمكنك إضافة ملاحظات في عمود الملاحظات' },
            { 'التعليمات': '5. لا تقم بتعديل أسماء المنتجات أو الأعمدة' },
            { 'التعليمات': '6. بعد التعبئة، احفظ الملف وقم برفعه في النظام' },
            { 'التعليمات': '' },
            { 'التعليمات': 'معلومات الاتصال:' },
            { 'التعليمات': `المورد: ${supplierName}` },
            { 'التعليمات': `تاريخ التصدير: ${new Date().toLocaleDateString('ar-SA')}` },
            { 'التعليمات': `عدد المنتجات: ${dataToExport.length}` }
        ];

        const wsInstructions = XLSX.utils.json_to_sheet(instructionsData);
        wsInstructions['!cols'] = [{ wch: 60 }];

        // إنشاء المصنف
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'الأسعار');
        XLSX.utils.book_append_sheet(wb, wsInstructions, 'التعليمات');

        // تحديد اسم الملف
        const fileName = `اتفاقية_أسعار_${supplierName}_${new Date().toISOString().split('T')[0]}.xlsx`;
        
        // تنزيل الملف
        XLSX.writeFile(wb, fileName);
    };

    const handleImportExcel = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        try {
            const data = await file.arrayBuffer();
            const workbook = XLSX.read(data);
            const worksheet = workbook.Sheets[workbook.SheetNames[0]];
            const jsonData = XLSX.utils.sheet_to_json(worksheet);

            // معالجة البيانات
            const updates: Array<{
                productName: string;
                productSku: string;
                newPrice: number;
                isPreferred: boolean;
                notes: string;
            }> = [];

            jsonData.forEach((row: any) => {
                const newPrice = parseFloat(row['السعر الجديد']);
                if (!isNaN(newPrice) && newPrice > 0) {
                    updates.push({
                        productName: row['اسم المنتج'],
                        productSku: row['رمز المنتج'],
                        newPrice: newPrice,
                        isPreferred: row['مفضل؟ (نعم/لا)'] === 'نعم',
                        notes: row['ملاحظات'] || ''
                    });
                }
            });

            if (updates.length === 0) {
                alert('لم يتم العثور على أسعار جديدة في الملف');
                return;
            }

            // عرض ملخص قبل الاستيراد
            const confirmed = confirm(
                `تم العثور على ${updates.length} سعر جديد.\n` +
                `هل تريد المتابعة مع الاستيراد؟`
            );

            if (!confirmed) return;

            await processImport(updates);

        } catch (error) {
            console.error('Error importing Excel:', error);
            alert('حدث خطأ أثناء قراءة الملف');
        }

        // إعادة تعيين input
        event.target.value = '';
    };

    const processImport = async (updates: Array<{
        productName: string;
        productSku: string;
        newPrice: number;
        isPreferred: boolean;
        notes: string;
    }>) => {
        if (!supabase) return;

        let added = 0;
        let updated = 0;
        let errors = 0;
        const errorMessages: string[] = [];

        for (const update of updates) {
            try {
                // البحث عن المنتج
                const product = products.find(p => 
                    p.productSku === update.productSku || p.productName === update.productName
                );

                if (!product) {
                    errors++;
                    errorMessages.push(`المنتج غير موجود: ${update.productName}`);
                    continue;
                }

                // التحقق من السعر
                if (update.newPrice <= 0) {
                    errors++;
                    errorMessages.push(`سعر غير صحيح للمنتج: ${update.productName}`);
                    continue;
                }

                // التحقق من وجود سعر حالي
                const { data: existing } = await supabase
                    .from('supplier_products')
                    .select('id, price')
                    .eq('product_id', product.productId)
                    .eq('supplier_id', supplierId)
                    .single();

                if (existing) {
                    // تحديث السعر الموجود
                    const { error } = await supabase
                        .from('supplier_products')
                        .update({
                            price: update.newPrice,
                            is_preferred: update.isPreferred,
                            notes: update.notes
                        })
                        .eq('id', existing.id);

                    if (error) {
                        errors++;
                        errorMessages.push(`فشل تحديث: ${update.productName}`);
                    } else {
                        updated++;
                        
                        // إذا تم تعيينه كمفضل، تحديث سعر المنتج
                        if (update.isPreferred) {
                            await supabase
                                .from('products')
                                .update({ standard_cost_price: update.newPrice })
                                .eq('id', product.productId);
                        }
                    }
                } else {
                    // إضافة سعر جديد
                    const { error } = await supabase
                        .from('supplier_products')
                        .insert({
                            product_id: product.productId,
                            supplier_id: supplierId,
                            price: update.newPrice,
                            is_preferred: update.isPreferred,
                            notes: update.notes
                        });

                    if (error) {
                        errors++;
                        errorMessages.push(`فشل إضافة: ${update.productName}`);
                    } else {
                        added++;
                        
                        // إذا تم تعيينه كمفضل، تحديث سعر المنتج
                        if (update.isPreferred) {
                            await supabase
                                .from('products')
                                .update({ standard_cost_price: update.newPrice })
                                .eq('id', product.productId);
                        }
                    }
                }
            } catch (error) {
                errors++;
                errorMessages.push(`خطأ في: ${update.productName}`);
            }
        }

        // عرض التقرير
        let message = `✅ تم الاستيراد بنجاح!\n\n`;
        message += `• تم إضافة: ${added} سعر\n`;
        message += `• تم تحديث: ${updated} سعر\n`;
        if (errors > 0) {
            message += `• أخطاء: ${errors}\n\n`;
            message += `الأخطاء:\n${errorMessages.slice(0, 5).join('\n')}`;
            if (errorMessages.length > 5) {
                message += `\n... و ${errorMessages.length - 5} أخطاء أخرى`;
            }
        }

        alert(message);
        loadProducts();
    };

    // الفلترة والترتيب
    const filteredProducts = products.filter(p => {
        const matchesSearch = p.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            p.productSku.toLowerCase().includes(searchTerm.toLowerCase());
        
        const matchesCategory = selectedCategories.length === 0 || 
                               selectedCategories.includes(p.categoryName);
        
        const matchesType = filterType === 'all' ? true :
                           filterType === 'priced' ? p.currentPrice !== undefined :
                           p.currentPrice === undefined;
        
        return matchesSearch && matchesCategory && matchesType;
    });

    const sortedProducts = [...filteredProducts].sort((a, b) => {
        switch (sortBy) {
            case 'name':
                return a.productName.localeCompare(b.productName, 'ar');
            case 'price':
                return (a.currentPrice || 0) - (b.currentPrice || 0);
            case 'difference':
                const diffA = a.currentPrice ? a.currentPrice - a.standardCostPrice : 0;
                const diffB = b.currentPrice ? b.currentPrice - b.standardCostPrice : 0;
                return Math.abs(diffB) - Math.abs(diffA);
            default:
                return 0;
        }
    });

    // الإحصائيات
    const stats = {
        total: products.length,
        priced: products.filter(p => p.currentPrice !== undefined).length,
        unpriced: products.filter(p => p.currentPrice === undefined).length,
        preferred: products.filter(p => p.isPreferred).length,
        avgDifference: (() => {
            const pricedProducts = products.filter(p => p.currentPrice !== undefined);
            if (pricedProducts.length === 0) return 0;
            const totalDiff = pricedProducts.reduce((sum, p) => sum + (Number(p.currentPrice || 0) - Number(p.standardCostPrice || 0)), 0);
            return totalDiff / pricedProducts.length;
        })()
    };

    if (isLoading) {
        return (
            <Card>
                <CardContent className="py-8 text-center">
                    <Icons.RefreshCw className="w-8 h-8 text-blue-600 animate-spin mx-auto" />
                    <p className="mt-2 text-slate-600">جاري تحميل المنتجات...</p>
                </CardContent>
            </Card>
        );
    }

    // عرض تاريخ منتج معين
    if (viewingHistory) {
        return (
            <div className="space-y-4">
                <Button onClick={() => setViewingHistory(null)} variant="secondary">
                    <Icons.ArrowLeft className="h-4 w-4 ml-2" />
                    العودة لاتفاقية الأسعار
                </Button>
                <SupplierPriceHistory
                    productId={viewingHistory.productId}
                    productName={viewingHistory.productName}
                    supplierId={supplierId}
                    supplierName={supplierName}
                />
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* الإحصائيات */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <Card>
                    <CardContent className="p-4 text-center">
                        <div className="text-2xl font-bold text-slate-900">{stats.total}</div>
                        <div className="text-xs text-slate-600">إجمالي المنتجات</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4 text-center">
                        <div className="text-2xl font-bold text-green-900">{stats.priced}</div>
                        <div className="text-xs text-slate-600">منتجات مسعرة</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4 text-center">
                        <div className="text-2xl font-bold text-amber-900">{stats.unpriced}</div>
                        <div className="text-xs text-slate-600">بدون أسعار</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4 text-center">
                        <div className="text-2xl font-bold text-blue-900">{stats.preferred}</div>
                        <div className="text-xs text-slate-600">مورد مفضل</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4 text-center">
                        <div className={`text-2xl font-bold ${stats.avgDifference > 0 ? 'text-red-900' : stats.avgDifference < 0 ? 'text-green-900' : 'text-slate-900'}`}>
                            {stats.avgDifference > 0 ? '+' : ''}{formatCurrency(Math.abs(stats.avgDifference))}
                        </div>
                        <div className="text-xs text-slate-600">متوسط الفرق</div>
                    </CardContent>
                </Card>
            </div>

            {/* أدوات التحكم */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Icons.FileText className="h-5 w-5" />
                        اتفاقية الأسعار - {supplierName}
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {/* البحث والفلترة */}
                        <div className="flex flex-wrap gap-3">
                            <input
                                type="text"
                                placeholder="بحث عن منتج..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="flex-1 min-w-[200px]"
                            />
                            
                            <select
                                value={filterType}
                                onChange={(e) => setFilterType(e.target.value as any)}
                                className="px-4 py-2 border rounded"
                            >
                                <option value="all">جميع المنتجات ({stats.total})</option>
                                <option value="priced">المسعرة فقط ({stats.priced})</option>
                                <option value="unpriced">بدون أسعار ({stats.unpriced})</option>
                            </select>

                            <div className="relative">
                                <select
                                    multiple
                                    value={selectedCategories}
                                    onChange={(e) => {
                                        const selected = Array.from(e.target.selectedOptions, option => option.value);
                                        setSelectedCategories(selected);
                                    }}
                                    className="px-4 py-2 border rounded min-w-[200px]"
                                    size={1}
                                >
                                    <option value="" disabled>اختر الفئات...</option>
                                    {categories.map(cat => (
                                        <option key={cat.id} value={cat.name}>
                                            {cat.name} ({products.filter(p => p.categoryName === cat.name).length})
                                        </option>
                                    ))}
                                </select>
                                {selectedCategories.length > 0 && (
                                    <button
                                        onClick={() => setSelectedCategories([])}
                                        className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                        title="مسح الفلترة"
                                    >
                                        <Icons.X className="h-4 w-4" />
                                    </button>
                                )}
                            </div>
                            <select
                                value={filterType}
                                onChange={(e) => setFilterType(e.target.value as any)}
                                className="px-4 py-2 border rounded"
                            >
                                <option value="all">جميع المنتجات ({stats.total})</option>
                                <option value="priced">المسعرة فقط ({stats.priced})</option>
                                <option value="unpriced">بدون أسعار ({stats.unpriced})</option>
                            </select>

                            <select
                                value={sortBy}
                                onChange={(e) => setSortBy(e.target.value as any)}
                                className="px-4 py-2 border rounded"
                            >
                                <option value="name">ترتيب حسب الاسم</option>
                                <option value="price">ترتيب حسب السعر</option>
                                <option value="difference">ترتيب حسب الفرق</option>
                            </select>
                        </div>

                        {/* أزرار التصدير والاستيراد */}
                        <div className="flex flex-wrap gap-2">
                            <Button
                                onClick={() => exportToExcel('all')}
                                variant="primary"
                                size="sm"
                            >
                                <Icons.Download className="h-4 w-4 ml-2" />
                                تصدير الكل (مفصل)
                            </Button>
                            
                            <Button
                                onClick={() => exportToExcel('simple')}
                                variant="secondary"
                                size="sm"
                            >
                                <Icons.Download className="h-4 w-4 ml-2" />
                                تصدير الكل (مبسط)
                            </Button>

                            <Button
                                onClick={() => exportToExcel('priced')}
                                variant="secondary"
                                size="sm"
                            >
                                <Icons.Download className="h-4 w-4 ml-2" />
                                المسعرة فقط
                            </Button>

                            <Button
                                onClick={() => exportToExcel('unpriced')}
                                variant="secondary"
                                size="sm"
                            >
                                <Icons.Download className="h-4 w-4 ml-2" />
                                بدون أسعار فقط
                            </Button>

                            <label className="inline-block cursor-pointer">
                                <input
                                    type="file"
                                    accept=".xlsx,.xls"
                                    onChange={handleImportExcel}
                                    className="hidden"
                                    id="import-excel"
                                />
                                <span className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700 transition-colors">
                                    <Icons.Upload className="h-4 w-4 ml-2" />
                                    استيراد من Excel
                                </span>
                            </label>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* جدول المنتجات */}
            <Card>
                <CardContent>
                    {sortedProducts.length === 0 ? (
                        <div className="text-center py-8 text-slate-500">
                            <Icons.Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                            <p>لا توجد منتجات</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-slate-50">
                                    <tr>
                                        <th className="px-4 py-3 text-right text-xs font-medium text-slate-700">المنتج</th>
                                        <th className="px-4 py-3 text-right text-xs font-medium text-slate-700">الفئة</th>
                                        <th className="px-4 py-3 text-right text-xs font-medium text-slate-700">المخزون</th>
                                        <th className="px-4 py-3 text-right text-xs font-medium text-slate-700">السعر المرجعي</th>
                                        <th className="px-4 py-3 text-right text-xs font-medium text-slate-700">سعر المورد</th>
                                        <th className="px-4 py-3 text-right text-xs font-medium text-slate-700">الفرق</th>
                                        <th className="px-4 py-3 text-right text-xs font-medium text-slate-700">الحالة</th>
                                        <th className="px-4 py-3 text-right text-xs font-medium text-slate-700">التاريخ</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {sortedProducts.map(product => {
                                        const difference = product.currentPrice 
                                            ? product.currentPrice - product.standardCostPrice 
                                            : 0;
                                        const percentage = product.currentPrice 
                                            ? ((difference / product.standardCostPrice) * 100).toFixed(1)
                                            : '';

                                        return (
                                            <tr 
                                                key={product.productId}
                                                className={`border-b border-slate-200 ${
                                                    product.currentPrice === undefined 
                                                        ? 'bg-amber-50' 
                                                        : difference < 0 
                                                            ? 'bg-green-50' 
                                                            : difference > 0 
                                                                ? 'bg-red-50' 
                                                                : 'bg-white'
                                                }`}
                                            >
                                                <td className="px-4 py-3">
                                                    <div>
                                                        <div className="font-medium text-slate-900">{product.productName}</div>
                                                        <div className="text-xs text-slate-600">{product.productSku}</div>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 text-sm text-slate-600">
                                                    {product.categoryName}
                                                </td>
                                                <td className="px-4 py-3 text-sm text-slate-900">
                                                    {product.stockQuantity}
                                                </td>
                                                <td className="px-4 py-3 text-sm font-medium">
                                                    {formatCurrency(product.standardCostPrice)}
                                                </td>
                                                <td className="px-4 py-3">
                                                    {product.currentPrice !== undefined ? (
                                                        <div>
                                                            <div className="font-bold text-slate-900">
                                                                {formatCurrency(product.currentPrice)}
                                                            </div>
                                                            {product.lastUpdated && (
                                                                <div className="text-xs text-slate-500">
                                                                    {new Date(product.lastUpdated).toLocaleDateString('ar-SA')}
                                                                </div>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <span className="text-amber-600 text-sm">غير محدد</span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3">
                                                    {product.currentPrice !== undefined ? (
                                                        <div className={`text-sm font-medium ${
                                                            difference < 0 ? 'text-green-700' : 
                                                            difference > 0 ? 'text-red-700' : 
                                                            'text-slate-700'
                                                        }`}>
                                                            {difference > 0 ? '+' : ''}{formatCurrency(Math.abs(difference))}
                                                            <div className="text-xs">
                                                                ({percentage}%)
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <span className="text-slate-400">-</span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3">
                                                    {product.isPreferred && (
                                                        <span className="inline-flex items-center gap-1 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                                                            ⭐ مفضل
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3">
                                                    {product.currentPrice !== undefined && (
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => setViewingHistory({ 
                                                                productId: product.productId, 
                                                                productName: product.productName 
                                                            })}
                                                            title="عرض تاريخ الأسعار"
                                                        >
                                                            <Icons.Clock className="h-4 w-4" />
                                                        </Button>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

export default SupplierPriceAgreement;
