import React, { useState, useEffect } from 'react';
import { useSupabase } from '../contexts/SupabaseContext';
import { UseInventoryReturn } from '../types';
import { Card, CardContent, CardHeader, CardTitle } from './ui/Card';
import { Button } from './ui/Button';
import { Icons } from './icons';
import { formatCurrency } from '../utils/currencyHelper';

interface PotentialSavingsReportProps {
    inventory: UseInventoryReturn;
}

interface ProductSavings {
    productId: string;
    productName: string;
    productSku: string;
    currentReferencePrice: number;
    inventoryCount: number;
    itemsWithHigherPrice: number;
    itemsWithLowerPrice: number;
    itemsWithSamePrice: number;
    totalActualCost: number;
    totalReferenceCost: number;
    potentialSavings: number;
    averageActualPrice: number;
    preferredSupplier?: string;
}

const PotentialSavingsReport: React.FC<PotentialSavingsReportProps> = ({ inventory }) => {
    const { supabase } = useSupabase();
    const { products, inventoryItems } = inventory;
    const [savingsData, setSavingsData] = useState<ProductSavings[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [sortBy, setSortBy] = useState<'savings' | 'count' | 'percentage'>('savings');
    const [showDetails, setShowDetails] = useState<Record<string, boolean>>({});

    useEffect(() => {
        const calculateSavings = async () => {
            if (!supabase || products.length === 0) return;

            setIsLoading(true);
            try {
                // جلب أسعار الموردين
                const { data: supplierPrices } = await supabase
                    .from('supplier_products')
                    .select('product_id, price, is_preferred, supplier_id');

                const { data: suppliers } = await supabase
                    .from('suppliers')
                    .select('id, name');

                const savingsAnalysis: ProductSavings[] = [];

                products.forEach(product => {
                    const productInventory = inventoryItems.filter(item => 
                        item.productId === product.id && item.status === 'in_stock'
                    );

                    if (productInventory.length === 0) return;

                    const totalActualCost = productInventory.reduce((sum, item) => sum + Number(item.costPrice || 0), 0);
                    const totalReferenceCost = productInventory.length * Number(product.standardCostPrice || 0);
                    const potentialSavings = totalActualCost - totalReferenceCost;
                    const averageActualPrice = totalActualCost / productInventory.length;

                    const itemsWithHigherPrice = productInventory.filter(item => item.costPrice > product.standardCostPrice).length;
                    const itemsWithLowerPrice = productInventory.filter(item => item.costPrice < product.standardCostPrice).length;
                    const itemsWithSamePrice = productInventory.filter(item => item.costPrice === product.standardCostPrice).length;

                    // البحث عن المورد المفضل
                    const preferredSupplierPrice = supplierPrices?.find(sp => 
                        sp.product_id === product.id && sp.is_preferred
                    );
                    const preferredSupplier = preferredSupplierPrice ? 
                        suppliers?.find(s => s.id === preferredSupplierPrice.supplier_id)?.name : undefined;

                    savingsAnalysis.push({
                        productId: product.id,
                        productName: product.name,
                        productSku: product.sku,
                        currentReferencePrice: product.standardCostPrice,
                        inventoryCount: productInventory.length,
                        itemsWithHigherPrice,
                        itemsWithLowerPrice,
                        itemsWithSamePrice,
                        totalActualCost,
                        totalReferenceCost,
                        potentialSavings,
                        averageActualPrice,
                        preferredSupplier
                    });
                });

                setSavingsData(savingsAnalysis);
            } catch (error) {
                console.error('Error calculating savings:', error);
            } finally {
                setIsLoading(false);
            }
        };

        calculateSavings();
    }, [supabase, products, inventoryItems]);

    const sortedData = [...savingsData].sort((a, b) => {
        switch (sortBy) {
            case 'savings':
                return Math.abs(b.potentialSavings) - Math.abs(a.potentialSavings);
            case 'count':
                return b.inventoryCount - a.inventoryCount;
            case 'percentage':
                const aPercentage = a.totalReferenceCost > 0 ? Math.abs(a.potentialSavings / a.totalReferenceCost) : 0;
                const bPercentage = b.totalReferenceCost > 0 ? Math.abs(b.potentialSavings / b.totalReferenceCost) : 0;
                return bPercentage - aPercentage;
            default:
                return 0;
        }
    });

    const totalInventoryValue = savingsData.reduce((sum, item) => sum + item.totalActualCost, 0);
    const totalReferenceValue = savingsData.reduce((sum, item) => sum + item.totalReferenceCost, 0);
    const totalPotentialSavings = totalInventoryValue - totalReferenceValue;
    const productsWithHigherPrices = savingsData.filter(item => item.potentialSavings > 0);
    const productsWithLowerPrices = savingsData.filter(item => item.potentialSavings < 0);

    const toggleDetails = (productId: string) => {
        setShowDetails(prev => ({
            ...prev,
            [productId]: !prev[productId]
        }));
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center p-8">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-slate-600">جاري حساب التوفير المحتمل...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* الملخص العام */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                    <CardContent className="p-4">
                        <div className="text-sm text-slate-600 mb-1">إجمالي قيمة المخزون</div>
                        <div className="text-2xl font-bold text-slate-900">{formatCurrency(totalInventoryValue)}</div>
                        <div className="text-xs text-slate-500 mt-1">التكلفة الفعلية</div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-4">
                        <div className="text-sm text-slate-600 mb-1">القيمة المرجعية</div>
                        <div className="text-2xl font-bold text-blue-900">{formatCurrency(totalReferenceValue)}</div>
                        <div className="text-xs text-slate-500 mt-1">بالأسعار المرجعية</div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-4">
                        <div className={`text-sm mb-1 ${totalPotentialSavings > 0 ? 'text-red-600' : totalPotentialSavings < 0 ? 'text-green-600' : 'text-slate-600'}`}>
                            الفرق الإجمالي
                        </div>
                        <div className={`text-2xl font-bold ${totalPotentialSavings > 0 ? 'text-red-900' : totalPotentialSavings < 0 ? 'text-green-900' : 'text-slate-900'}`}>
                            {totalPotentialSavings > 0 ? '+' : ''}{formatCurrency(Math.abs(totalPotentialSavings))}
                        </div>
                        <div className={`text-xs mt-1 ${totalPotentialSavings > 0 ? 'text-red-500' : totalPotentialSavings < 0 ? 'text-green-500' : 'text-slate-500'}`}>
                            {totalPotentialSavings > 0 ? 'دفعت أكثر' : totalPotentialSavings < 0 ? 'وفرت' : 'مطابق'}
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-4">
                        <div className="text-sm text-slate-600 mb-1">عدد المنتجات</div>
                        <div className="text-2xl font-bold text-slate-900">{savingsData.length}</div>
                        <div className="text-xs text-slate-500 mt-1">
                            {productsWithHigherPrices.length} بأسعار أعلى
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* أدوات التحكم */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-2">
                            <Icons.Activity className="h-5 w-5" />
                            تحليل التوفير المحتمل
                        </CardTitle>
                        <div className="flex gap-2">
                            <Button
                                variant={sortBy === 'savings' ? 'primary' : 'secondary'}
                                size="sm"
                                onClick={() => setSortBy('savings')}
                            >
                                ترتيب حسب الفرق
                            </Button>
                            <Button
                                variant={sortBy === 'count' ? 'primary' : 'secondary'}
                                size="sm"
                                onClick={() => setSortBy('count')}
                            >
                                ترتيب حسب الكمية
                            </Button>
                            <Button
                                variant={sortBy === 'percentage' ? 'primary' : 'secondary'}
                                size="sm"
                                onClick={() => setSortBy('percentage')}
                            >
                                ترتيب حسب النسبة
                            </Button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    {sortedData.length === 0 ? (
                        <div className="text-center py-8 text-slate-500">
                            <Icons.Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                            <p>لا توجد منتجات في المخزون</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {sortedData.map(item => {
                                const percentage = item.totalReferenceCost > 0 ? 
                                    (item.potentialSavings / item.totalReferenceCost * 100) : 0;
                                
                                return (
                                    <div key={item.productId} className="border border-slate-200 rounded-lg">
                                        {/* الملخص */}
                                        <div className="p-4">
                                            <div className="flex items-center justify-between">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-3">
                                                        <div>
                                                            <h3 className="font-semibold text-slate-900">{item.productName}</h3>
                                                            <p className="text-sm text-slate-600">{item.productSku}</p>
                                                            {item.preferredSupplier && (
                                                                <p className="text-xs text-blue-600">⭐ {item.preferredSupplier}</p>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-6">
                                                    <div className="text-center">
                                                        <div className="text-sm text-slate-600">الكمية</div>
                                                        <div className="text-lg font-bold">{item.inventoryCount}</div>
                                                    </div>

                                                    <div className="text-center">
                                                        <div className="text-sm text-slate-600">السعر المرجعي</div>
                                                        <div className="text-lg font-bold">{formatCurrency(item.currentReferencePrice)}</div>
                                                    </div>

                                                    <div className="text-center">
                                                        <div className="text-sm text-slate-600">متوسط السعر الفعلي</div>
                                                        <div className="text-lg font-bold">{formatCurrency(item.averageActualPrice)}</div>
                                                    </div>

                                                    <div className="text-center">
                                                        <div className={`text-sm ${item.potentialSavings > 0 ? 'text-red-600' : item.potentialSavings < 0 ? 'text-green-600' : 'text-slate-600'}`}>
                                                            الفرق الإجمالي
                                                        </div>
                                                        <div className={`text-xl font-bold ${item.potentialSavings > 0 ? 'text-red-900' : item.potentialSavings < 0 ? 'text-green-900' : 'text-slate-900'}`}>
                                                            {item.potentialSavings > 0 ? '+' : ''}{formatCurrency(Math.abs(item.potentialSavings))}
                                                        </div>
                                                        <div className={`text-xs ${item.potentialSavings > 0 ? 'text-red-600' : item.potentialSavings < 0 ? 'text-green-600' : 'text-slate-600'}`}>
                                                            ({percentage > 0 ? '+' : ''}{percentage.toFixed(1)}%)
                                                        </div>
                                                    </div>

                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => toggleDetails(item.productId)}
                                                    >
                                                        <Icons.ChevronDown className={`h-4 w-4 transition-transform ${showDetails[item.productId] ? 'rotate-180' : ''}`} />
                                                    </Button>
                                                </div>
                                            </div>

                                            {/* شريط التوزيع */}
                                            <div className="mt-4">
                                                <div className="flex text-xs text-slate-600 mb-2">
                                                    <span>توزيع الأسعار:</span>
                                                </div>
                                                <div className="flex h-2 bg-slate-200 rounded-full overflow-hidden">
                                                    {item.itemsWithLowerPrice > 0 && (
                                                        <div 
                                                            className="bg-green-500" 
                                                            style={{ width: `${(item.itemsWithLowerPrice / item.inventoryCount) * 100}%` }}
                                                            title={`${item.itemsWithLowerPrice} صنف بسعر أقل`}
                                                        />
                                                    )}
                                                    {item.itemsWithSamePrice > 0 && (
                                                        <div 
                                                            className="bg-blue-500" 
                                                            style={{ width: `${(item.itemsWithSamePrice / item.inventoryCount) * 100}%` }}
                                                            title={`${item.itemsWithSamePrice} صنف بالسعر المرجعي`}
                                                        />
                                                    )}
                                                    {item.itemsWithHigherPrice > 0 && (
                                                        <div 
                                                            className="bg-red-500" 
                                                            style={{ width: `${(item.itemsWithHigherPrice / item.inventoryCount) * 100}%` }}
                                                            title={`${item.itemsWithHigherPrice} صنف بسعر أعلى`}
                                                        />
                                                    )}
                                                </div>
                                                <div className="flex justify-between text-xs text-slate-600 mt-1">
                                                    <span className="text-green-600">{item.itemsWithLowerPrice} أقل</span>
                                                    <span className="text-blue-600">{item.itemsWithSamePrice} مطابق</span>
                                                    <span className="text-red-600">{item.itemsWithHigherPrice} أعلى</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* التفاصيل */}
                                        {showDetails[item.productId] && (
                                            <div className="border-t border-slate-200 p-4 bg-slate-50">
                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                    <div className="bg-white p-4 rounded-lg">
                                                        <h4 className="font-semibold text-slate-900 mb-2">التكاليف</h4>
                                                        <div className="space-y-2 text-sm">
                                                            <div className="flex justify-between">
                                                                <span className="text-slate-600">التكلفة الفعلية:</span>
                                                                <span className="font-medium">{formatCurrency(item.totalActualCost)}</span>
                                                            </div>
                                                            <div className="flex justify-between">
                                                                <span className="text-slate-600">التكلفة المرجعية:</span>
                                                                <span className="font-medium">{formatCurrency(item.totalReferenceCost)}</span>
                                                            </div>
                                                            <div className="flex justify-between border-t pt-2">
                                                                <span className="text-slate-600">الفرق:</span>
                                                                <span className={`font-bold ${item.potentialSavings > 0 ? 'text-red-600' : item.potentialSavings < 0 ? 'text-green-600' : 'text-slate-600'}`}>
                                                                    {item.potentialSavings > 0 ? '+' : ''}{formatCurrency(Math.abs(item.potentialSavings))}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="bg-white p-4 rounded-lg">
                                                        <h4 className="font-semibold text-slate-900 mb-2">التوزيع</h4>
                                                        <div className="space-y-2 text-sm">
                                                            <div className="flex justify-between">
                                                                <span className="text-green-600">أسعار أقل:</span>
                                                                <span className="font-medium">{item.itemsWithLowerPrice}</span>
                                                            </div>
                                                            <div className="flex justify-between">
                                                                <span className="text-blue-600">أسعار مطابقة:</span>
                                                                <span className="font-medium">{item.itemsWithSamePrice}</span>
                                                            </div>
                                                            <div className="flex justify-between">
                                                                <span className="text-red-600">أسعار أعلى:</span>
                                                                <span className="font-medium">{item.itemsWithHigherPrice}</span>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="bg-white p-4 rounded-lg">
                                                        <h4 className="font-semibold text-slate-900 mb-2">التوصيات</h4>
                                                        <div className="text-sm space-y-1">
                                                            {item.potentialSavings > 0 ? (
                                                                <>
                                                                    <p className="text-amber-700">💡 فرصة للتوفير</p>
                                                                    <p className="text-xs text-slate-600">
                                                                        في الشراء القادم ستوفر {formatCurrency(item.potentialSavings / item.inventoryCount)} للقطعة
                                                                    </p>
                                                                </>
                                                            ) : item.potentialSavings < 0 ? (
                                                                <>
                                                                    <p className="text-green-700">✅ أسعار ممتازة</p>
                                                                    <p className="text-xs text-slate-600">
                                                                        استمر بالشراء من المورد الحالي
                                                                    </p>
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <p className="text-blue-700">✅ أسعار مطابقة</p>
                                                                    <p className="text-xs text-slate-600">
                                                                        الأسعار مطابقة للمرجعي
                                                                    </p>
                                                                </>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* الخلاصة والتوصيات */}
            {savingsData.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Icons.AlertCircle className="h-5 w-5" />
                            الخلاصة والتوصيات
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* الإحصائيات */}
                            <div>
                                <h4 className="font-semibold mb-3">الإحصائيات:</h4>
                                <div className="space-y-2 text-sm">
                                    <div className="flex justify-between">
                                        <span>إجمالي المنتجات:</span>
                                        <span className="font-medium">{savingsData.length}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>منتجات بأسعار أعلى:</span>
                                        <span className="font-medium text-red-600">{productsWithHigherPrices.length}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>منتجات بأسعار أقل:</span>
                                        <span className="font-medium text-green-600">{productsWithLowerPrices.length}</span>
                                    </div>
                                    <div className="flex justify-between border-t pt-2">
                                        <span>إجمالي الفرق:</span>
                                        <span className={`font-bold ${totalPotentialSavings > 0 ? 'text-red-600' : totalPotentialSavings < 0 ? 'text-green-600' : 'text-slate-600'}`}>
                                            {totalPotentialSavings > 0 ? '+' : ''}{formatCurrency(Math.abs(totalPotentialSavings))}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* التوصيات */}
                            <div>
                                <h4 className="font-semibold mb-3">التوصيات:</h4>
                                <div className="space-y-2 text-sm">
                                    {totalPotentialSavings > 0 ? (
                                        <>
                                            <div className="flex items-start gap-2">
                                                <Icons.AlertCircle className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
                                                <p className="text-amber-700">
                                                    يمكن توفير {formatCurrency(totalPotentialSavings)} في المشتريات القادمة
                                                </p>
                                            </div>
                                            <div className="flex items-start gap-2">
                                                <Icons.Activity className="h-4 w-4 text-blue-500 flex-shrink-0 mt-0.5" />
                                                <p className="text-slate-700">
                                                    راجع أسعار الموردين للمنتجات ذات الفروقات العالية
                                                </p>
                                            </div>
                                        </>
                                    ) : totalPotentialSavings < 0 ? (
                                        <>
                                            <div className="flex items-start gap-2">
                                                <Icons.CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
                                                <p className="text-green-700">
                                                    ممتاز! وفرت {formatCurrency(Math.abs(totalPotentialSavings))} مقارنة بالأسعار المرجعية
                                                </p>
                                            </div>
                                            <div className="flex items-start gap-2">
                                                <Icons.Activity className="h-4 w-4 text-blue-500 flex-shrink-0 mt-0.5" />
                                                <p className="text-slate-700">
                                                    استمر بالشراء من الموردين الحاليين
                                                </p>
                                            </div>
                                        </>
                                    ) : (
                                        <div className="flex items-start gap-2">
                                            <Icons.CheckCircle className="h-4 w-4 text-blue-500 flex-shrink-0 mt-0.5" />
                                            <p className="text-slate-700">
                                                الأسعار مطابقة للمرجعي - وضع مثالي
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
};

export default PotentialSavingsReport;
