import React, { useState, useEffect } from 'react';
import { useSupabase } from '../contexts/SupabaseContext';
import { Card, CardContent, CardHeader, CardTitle } from './ui/Card';
import { Button } from './ui/Button';
import { Icons } from './icons';
import { formatCurrency } from '../utils/currencyHelper';

interface SupplierPriceHistoryProps {
    productId: string;
    productName: string;
    supplierId?: string;
    supplierName?: string;
}

interface PriceHistory {
    id: string;
    oldPrice: number | null;
    newPrice: number;
    changeReason: string;
    changedBy: string | null;
    createdAt: string;
    supplierName: string;
}

const SupplierPriceHistory: React.FC<SupplierPriceHistoryProps> = ({
    productId,
    productName,
    supplierId,
    supplierName
}) => {
    const { supabase } = useSupabase();
    const [history, setHistory] = useState<PriceHistory[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [viewMode, setViewMode] = useState<'all' | 'increases' | 'decreases'>('all');

    useEffect(() => {
        loadHistory();
    }, [productId, supplierId, supabase]);

    const loadHistory = async () => {
        if (!supabase) return;

        setIsLoading(true);
        try {
            let query = supabase
                .from('supplier_price_history')
                .select(`
                    id,
                    old_price,
                    new_price,
                    change_reason,
                    changed_by,
                    created_at,
                    supplier_id
                `)
                .eq('product_id', productId)
                .order('created_at', { ascending: false });

            // إذا كان هناك مورد محدد
            if (supplierId) {
                query = query.eq('supplier_id', supplierId);
            }

            const { data, error } = await query;

            if (error) throw error;

            // جلب أسماء الموردين
            const { data: suppliers } = await supabase
                .from('suppliers')
                .select('id, name');

            const historyData: PriceHistory[] = data?.map((h: any) => {
                const supplier = suppliers?.find(s => s.id === h.supplier_id);
                return {
                    id: h.id,
                    oldPrice: h.old_price,
                    newPrice: h.new_price,
                    changeReason: h.change_reason || 'تحديث',
                    changedBy: h.changed_by,
                    createdAt: h.created_at,
                    supplierName: supplier?.name || 'غير معروف'
                };
            }) || [];

            setHistory(historyData);
        } catch (error) {
            console.error('Error loading history:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const filteredHistory = history.filter(h => {
        if (viewMode === 'all') return true;
        if (!h.oldPrice) return false;
        
        const change = h.newPrice - h.oldPrice;
        if (viewMode === 'increases') return change > 0;
        if (viewMode === 'decreases') return change < 0;
        return true;
    });

    const stats = {
        total: history.length,
        increases: history.filter(h => h.oldPrice && h.newPrice > h.oldPrice).length,
        decreases: history.filter(h => h.oldPrice && h.newPrice < h.oldPrice).length,
        avgChange: history.length > 0 
            ? history
                .filter(h => h.oldPrice)
                .reduce((sum, h) => sum + (h.newPrice - (h.oldPrice || 0)), 0) / 
              history.filter(h => h.oldPrice).length
            : 0
    };

    if (isLoading) {
        return (
            <Card>
                <CardContent className="py-8 text-center">
                    <Icons.RefreshCw className="w-8 h-8 text-blue-600 animate-spin mx-auto" />
                    <p className="mt-2 text-slate-600">جاري تحميل التاريخ...</p>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-4">
            {/* الإحصائيات */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                    <CardContent className="p-4 text-center">
                        <div className="text-2xl font-bold text-slate-900">{stats.total}</div>
                        <div className="text-xs text-slate-600">إجمالي التغييرات</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4 text-center">
                        <div className="text-2xl font-bold text-red-900">{stats.increases}</div>
                        <div className="text-xs text-slate-600">زيادات</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4 text-center">
                        <div className="text-2xl font-bold text-green-900">{stats.decreases}</div>
                        <div className="text-xs text-slate-600">تخفيضات</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4 text-center">
                        <div className={`text-2xl font-bold ${stats.avgChange > 0 ? 'text-red-900' : stats.avgChange < 0 ? 'text-green-900' : 'text-slate-900'}`}>
                            {stats.avgChange > 0 ? '+' : ''}{formatCurrency(Math.abs(stats.avgChange))}
                        </div>
                        <div className="text-xs text-slate-600">متوسط التغيير</div>
                    </CardContent>
                </Card>
            </div>

            {/* أدوات التحكم */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-2">
                            <Icons.Clock className="h-5 w-5" />
                            تاريخ الأسعار - {productName}
                            {supplierName && <span className="text-sm text-slate-600">({supplierName})</span>}
                        </CardTitle>
                        <div className="flex gap-2">
                            <Button
                                variant={viewMode === 'all' ? 'primary' : 'secondary'}
                                size="sm"
                                onClick={() => setViewMode('all')}
                            >
                                الكل ({stats.total})
                            </Button>
                            <Button
                                variant={viewMode === 'increases' ? 'primary' : 'secondary'}
                                size="sm"
                                onClick={() => setViewMode('increases')}
                            >
                                زيادات ({stats.increases})
                            </Button>
                            <Button
                                variant={viewMode === 'decreases' ? 'primary' : 'secondary'}
                                size="sm"
                                onClick={() => setViewMode('decreases')}
                            >
                                تخفيضات ({stats.decreases})
                            </Button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    {filteredHistory.length === 0 ? (
                        <div className="text-center py-8 text-slate-500">
                            <Icons.Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                            <p>لا يوجد تاريخ للأسعار</p>
                            <p className="text-xs mt-2">سيتم حفظ التغييرات تلقائياً عند تحديث الأسعار</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {filteredHistory.map((item, index) => {
                                const change = item.oldPrice ? item.newPrice - item.oldPrice : null;
                                const changePercent = item.oldPrice && change 
                                    ? (change / item.oldPrice * 100).toFixed(1)
                                    : null;
                                const isIncrease = change && change > 0;
                                const isDecrease = change && change < 0;

                                return (
                                    <div 
                                        key={item.id}
                                        className={`border rounded-lg p-4 ${
                                            isIncrease ? 'border-red-200 bg-red-50' :
                                            isDecrease ? 'border-green-200 bg-green-50' :
                                            'border-slate-200 bg-white'
                                        }`}
                                    >
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-3 mb-2">
                                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                                                        isIncrease ? 'bg-red-100' :
                                                        isDecrease ? 'bg-green-100' :
                                                        'bg-blue-100'
                                                    }`}>
                                                        {isIncrease ? '📈' : isDecrease ? '📉' : '➕'}
                                                    </div>
                                                    <div>
                                                        <div className="font-medium text-slate-900">
                                                            {item.oldPrice ? (
                                                                <>
                                                                    {formatCurrency(item.oldPrice)} → {formatCurrency(item.newPrice)}
                                                                </>
                                                            ) : (
                                                                <>
                                                                    سعر جديد: {formatCurrency(item.newPrice)}
                                                                </>
                                                            )}
                                                        </div>
                                                        <div className="text-xs text-slate-600">
                                                            {new Date(item.createdAt).toLocaleString('ar-SA', {
                                                                year: 'numeric',
                                                                month: 'long',
                                                                day: 'numeric',
                                                                hour: '2-digit',
                                                                minute: '2-digit'
                                                            })}
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="mr-11 space-y-1">
                                                    {!supplierId && (
                                                        <div className="text-sm text-slate-700">
                                                            <span className="font-medium">المورد:</span> {item.supplierName}
                                                        </div>
                                                    )}
                                                    
                                                    {change !== null && (
                                                        <div className={`text-sm font-medium ${
                                                            isIncrease ? 'text-red-700' :
                                                            isDecrease ? 'text-green-700' :
                                                            'text-slate-700'
                                                        }`}>
                                                            <span className="font-medium">التغيير:</span>{' '}
                                                            {change > 0 ? '+' : ''}{formatCurrency(Math.abs(change))}
                                                            {changePercent && ` (${change > 0 ? '+' : ''}${changePercent}%)`}
                                                        </div>
                                                    )}

                                                    <div className="text-sm text-slate-600">
                                                        <span className="font-medium">السبب:</span> {item.changeReason}
                                                    </div>

                                                    {item.changedBy && (
                                                        <div className="text-sm text-slate-600">
                                                            <span className="font-medium">بواسطة:</span> {item.changedBy}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            {index === 0 && (
                                                <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                                                    الأحدث
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* الخط الزمني */}
            {filteredHistory.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Icons.TrendingUp className="h-5 w-5" />
                            الخط الزمني
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="relative">
                            {/* الخط الرأسي */}
                            <div className="absolute right-4 top-0 bottom-0 w-0.5 bg-slate-200"></div>
                            
                            {/* النقاط */}
                            <div className="space-y-6">
                                {filteredHistory.map((item, index) => {
                                    const change = item.oldPrice ? item.newPrice - item.oldPrice : null;
                                    const isIncrease = change && change > 0;
                                    const isDecrease = change && change < 0;

                                    return (
                                        <div key={item.id} className="relative pr-12">
                                            {/* النقطة */}
                                            <div className={`absolute right-2.5 w-3 h-3 rounded-full ${
                                                isIncrease ? 'bg-red-500' :
                                                isDecrease ? 'bg-green-500' :
                                                'bg-blue-500'
                                            }`}></div>

                                            {/* المحتوى */}
                                            <div className="bg-slate-50 rounded-lg p-3">
                                                <div className="flex items-center justify-between mb-1">
                                                    <span className="font-bold text-lg">
                                                        {formatCurrency(item.newPrice)}
                                                    </span>
                                                    <span className="text-xs text-slate-500">
                                                        {new Date(item.createdAt).toLocaleDateString('ar-SA')}
                                                    </span>
                                                </div>
                                                {item.oldPrice && (
                                                    <div className="text-sm text-slate-600">
                                                        من {formatCurrency(item.oldPrice)}
                                                        {change && (
                                                            <span className={`mr-2 font-medium ${
                                                                isIncrease ? 'text-red-600' : 'text-green-600'
                                                            }`}>
                                                                ({change > 0 ? '+' : ''}{formatCurrency(Math.abs(change))})
                                                            </span>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
};

export default SupplierPriceHistory;
