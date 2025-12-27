import React, { useState, useEffect } from 'react';
import { useSupabase } from '../contexts/SupabaseContext';
import { Card, CardContent, CardHeader, CardTitle } from './ui/Card';
import { Icons } from './icons';
import { formatCurrency } from '../utils/currencyHelper';

interface PriceAnalysisProps {
    productId: string;
    productName: string;
    standardCostPrice: number;
    inventoryItems: Array<{ id: string; serialNumber: string; costPrice: number; purchaseDate: Date; status: string }>;
}

interface PriceGroup {
    price: number;
    count: number;
    difference: number;
    percentage: number;
}

const ProductPriceAnalysis: React.FC<PriceAnalysisProps> = ({
    productId,
    productName,
    standardCostPrice,
    inventoryItems
}) => {
    const { supabase } = useSupabase();
    const [showDetails, setShowDetails] = useState(false);
    const [supplierPrices, setSupplierPrices] = useState<Array<{ supplierName: string; price: number; isPreferred: boolean }>>([]);

    useEffect(() => {
        const fetchSupplierPrices = async () => {
            if (!supabase) return;

            const { data, error } = await supabase
                .from('supplier_products')
                .select('price, is_preferred, supplier_id')
                .eq('product_id', productId);

            if (!error && data) {
                const { data: suppliers } = await supabase.from('suppliers').select('id, name');
                
                const pricesWithNames = data.map(sp => ({
                    supplierName: suppliers?.find(s => s.id === sp.supplier_id)?.name || 'غير معروف',
                    price: sp.price,
                    isPreferred: sp.is_preferred
                }));

                setSupplierPrices(pricesWithNames);
            }
        };

        fetchSupplierPrices();
    }, [supabase, productId]);

    // تجميع الأصناف حسب السعر
    const priceGroups: PriceGroup[] = [];
    const priceMap = new Map<number, number>();

    inventoryItems.forEach(item => {
        const count = priceMap.get(item.costPrice) || 0;
        priceMap.set(item.costPrice, count + 1);
    });

    priceMap.forEach((count, price) => {
        const difference = price - standardCostPrice;
        const percentage = standardCostPrice > 0 ? (difference / standardCostPrice * 100) : 0;
        priceGroups.push({ price, count, difference, percentage });
    });

    priceGroups.sort((a, b) => b.count - a.count);

    const totalActualCost = inventoryItems.reduce((sum, item) => sum + item.costPrice, 0);
    const totalReferenceCost = inventoryItems.length * standardCostPrice;
    const totalDifference = totalActualCost - totalReferenceCost;

    const itemsWithHigherPrice = inventoryItems.filter(item => item.costPrice > standardCostPrice);
    const itemsWithLowerPrice = inventoryItems.filter(item => item.costPrice < standardCostPrice);
    const itemsWithSamePrice = inventoryItems.filter(item => item.costPrice === standardCostPrice);

    return (
        <div className="space-y-4">
            {/* الملخص */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Icons.Activity className="h-5 w-5" />
                        ملخص الأسعار
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-blue-50 p-4 rounded-lg">
                            <div className="text-sm text-blue-600 mb-1">السعر المرجعي الحالي</div>
                            <div className="text-2xl font-bold text-blue-900">{formatCurrency(standardCostPrice)}</div>
                            {supplierPrices.find(sp => sp.isPreferred) && (
                                <div className="text-xs text-blue-600 mt-1">
                                    ⭐ {supplierPrices.find(sp => sp.isPreferred)?.supplierName}
                                </div>
                            )}
                        </div>

                        <div className="bg-slate-50 p-4 rounded-lg">
                            <div className="text-sm text-slate-600 mb-1">عدد الأصناف في المخزون</div>
                            <div className="text-2xl font-bold text-slate-900">{inventoryItems.length}</div>
                        </div>

                        <div className="bg-green-50 p-4 rounded-lg">
                            <div className="text-sm text-green-600 mb-1">التكلفة الفعلية</div>
                            <div className="text-2xl font-bold text-green-900">{formatCurrency(totalActualCost)}</div>
                            <div className="text-xs text-green-600 mt-1">ما دفعته فعلاً</div>
                        </div>

                        <div className={`p-4 rounded-lg ${totalDifference > 0 ? 'bg-red-50' : totalDifference < 0 ? 'bg-green-50' : 'bg-slate-50'}`}>
                            <div className={`text-sm mb-1 ${totalDifference > 0 ? 'text-red-600' : totalDifference < 0 ? 'text-green-600' : 'text-slate-600'}`}>
                                الفرق
                            </div>
                            <div className={`text-2xl font-bold ${totalDifference > 0 ? 'text-red-900' : totalDifference < 0 ? 'text-green-900' : 'text-slate-900'}`}>
                                {totalDifference > 0 ? '+' : ''}{formatCurrency(Math.abs(totalDifference))}
                            </div>
                            <div className={`text-xs mt-1 ${totalDifference > 0 ? 'text-red-600' : totalDifference < 0 ? 'text-green-600' : 'text-slate-600'}`}>
                                {totalDifference > 0 ? 'دفعت أكثر' : totalDifference < 0 ? 'وفرت' : 'مطابق'}
                            </div>
                        </div>
                    </div>

                    {/* توزيع الأسعار */}
                    <div className="mt-6">
                        <h4 className="font-semibold mb-3">توزيع الأسعار:</h4>
                        <div className="space-y-2">
                            {priceGroups.map((group, idx) => (
                                <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                                    <div className="flex items-center gap-3">
                                        <div className="text-lg font-bold">{group.count}</div>
                                        <div className="text-sm text-slate-600">
                                            صنف بسعر {formatCurrency(group.price)}
                                        </div>
                                    </div>
                                    <div className={`text-sm font-medium ${group.difference > 0 ? 'text-red-600' : group.difference < 0 ? 'text-green-600' : 'text-slate-600'}`}>
                                        {group.difference > 0 ? '+' : ''}{formatCurrency(Math.abs(group.difference))}
                                        {group.difference !== 0 && (
                                            <span className="text-xs mr-1">
                                                ({group.percentage > 0 ? '+' : ''}{group.percentage.toFixed(1)}%)
                                            </span>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* الإحصائيات */}
                    {(itemsWithHigherPrice.length > 0 || itemsWithLowerPrice.length > 0) && (
                        <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                            <div className="flex items-start gap-2">
                                <Icons.Bell className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                                <div className="flex-1">
                                    <div className="font-semibold text-amber-900 mb-2">ملاحظات:</div>
                                    {itemsWithHigherPrice.length > 0 && (
                                        <div className="text-sm text-amber-800 mb-1">
                                            • {itemsWithHigherPrice.length} صنف بسعر أعلى من المرجعي (فرق: +{formatCurrency(itemsWithHigherPrice.reduce((sum, item) => sum + (item.costPrice - standardCostPrice), 0))})
                                        </div>
                                    )}
                                    {itemsWithLowerPrice.length > 0 && (
                                        <div className="text-sm text-green-700 mb-1">
                                            • {itemsWithLowerPrice.length} صنف بسعر أقل من المرجعي (وفرت: {formatCurrency(itemsWithLowerPrice.reduce((sum, item) => sum + (standardCostPrice - item.costPrice), 0))})
                                        </div>
                                    )}
                                    {itemsWithSamePrice.length > 0 && (
                                        <div className="text-sm text-slate-600">
                                            • {itemsWithSamePrice.length} صنف بالسعر المرجعي ✅
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* التفاصيل القابلة للطي */}
            {inventoryItems.length > 0 && (
                <Card>
                    <CardHeader>
                        <button
                            onClick={() => setShowDetails(!showDetails)}
                            className="w-full flex items-center justify-between hover:bg-slate-50 p-2 rounded-lg transition-colors"
                        >
                            <CardTitle className="flex items-center gap-2">
                                <Icons.List className="h-5 w-5" />
                                تفاصيل الأصناف ({inventoryItems.length})
                            </CardTitle>
                            <Icons.ChevronDown className={`h-5 w-5 transition-transform ${showDetails ? 'rotate-180' : ''}`} />
                        </button>
                    </CardHeader>
                    {showDetails && (
                        <CardContent>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead className="text-xs text-slate-700 uppercase bg-slate-100">
                                        <tr>
                                            <th className="px-4 py-3 text-right">الرقم التسلسلي</th>
                                            <th className="px-4 py-3 text-right">السعر الفعلي</th>
                                            <th className="px-4 py-3 text-right">السعر المرجعي</th>
                                            <th className="px-4 py-3 text-right">الفرق</th>
                                            <th className="px-4 py-3 text-right">تاريخ الشراء</th>
                                            <th className="px-4 py-3 text-right">الحالة</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {inventoryItems.map(item => {
                                            const difference = item.costPrice - standardCostPrice;
                                            return (
                                                <tr key={item.id} className="border-b border-slate-200 hover:bg-slate-50">
                                                    <td className="px-4 py-3 font-mono text-sm">{item.serialNumber}</td>
                                                    <td className="px-4 py-3 font-bold">{formatCurrency(item.costPrice)}</td>
                                                    <td className="px-4 py-3 text-slate-600">{formatCurrency(standardCostPrice)}</td>
                                                    <td className={`px-4 py-3 font-medium ${difference > 0 ? 'text-red-600' : difference < 0 ? 'text-green-600' : 'text-slate-600'}`}>
                                                        {difference > 0 ? '+' : ''}{formatCurrency(Math.abs(difference))}
                                                        {difference !== 0 && (
                                                            <span className="text-xs mr-1">
                                                                ({((difference / standardCostPrice) * 100).toFixed(1)}%)
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-3 text-slate-600 text-xs">
                                                        {new Date(item.purchaseDate).toLocaleDateString('ar-SA')}
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <span className={`text-xs px-2 py-1 rounded ${
                                                            item.status === 'in_stock' ? 'bg-green-100 text-green-800' :
                                                            item.status === 'dispatched' ? 'bg-blue-100 text-blue-800' :
                                                            'bg-slate-100 text-slate-800'
                                                        }`}>
                                                            {item.status === 'in_stock' ? 'في المخزون' :
                                                             item.status === 'dispatched' ? 'مصروف' : item.status}
                                                        </span>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    )}
                </Card>
            )}

            {/* أسعار الموردين */}
            {supplierPrices.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Icons.Suppliers className="h-5 w-5" />
                            أسعار الموردين الحالية
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            {supplierPrices.map((sp, idx) => (
                                <div key={idx} className={`flex items-center justify-between p-3 rounded-lg ${
                                    sp.isPreferred ? 'bg-blue-50 border border-blue-200' : 'bg-slate-50'
                                }`}>
                                    <div className="flex items-center gap-2">
                                        {sp.isPreferred && <span>⭐</span>}
                                        <span className="font-medium">{sp.supplierName}</span>
                                    </div>
                                    <div className="text-lg font-bold">{formatCurrency(sp.price)}</div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* التوصيات */}
            {totalDifference !== 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Icons.AlertCircle className="h-5 w-5" />
                            التوصيات
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {totalDifference > 0 ? (
                            <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg">
                                <div className="font-semibold text-amber-900 mb-2">💡 فرصة للتوفير:</div>
                                <div className="text-sm text-amber-800 space-y-1">
                                    <p>• المخزون الحالي يحتوي على أصناف بأسعار أعلى من المرجعي</p>
                                    <p>• في الشراء القادم، ستوفر {formatCurrency(totalDifference / inventoryItems.length)} للقطعة</p>
                                    <p>• لو اشتريت {inventoryItems.length} قطعة بالسعر الجديد، ستوفر {formatCurrency(totalDifference)}</p>
                                </div>
                            </div>
                        ) : (
                            <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
                                <div className="font-semibold text-green-900 mb-2">✅ ممتاز!</div>
                                <div className="text-sm text-green-800">
                                    <p>• جميع الأصناف بأسعار مساوية أو أقل من السعر المرجعي</p>
                                    <p>• استمر بالشراء من المورد الحالي</p>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}
        </div>
    );
};

export default ProductPriceAnalysis;
