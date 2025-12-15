import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/Card';
import { Button } from './ui/Button';
import { Icons } from './icons';
import { useSupabase } from '../contexts/SupabaseContext';

const DatabaseDiagnostics: React.FC = () => {
    const { supabase } = useSupabase();
    const [results, setResults] = useState<string[]>([]);
    const [isRunning, setIsRunning] = useState(false);

    const addResult = (message: string) => {
        setResults(prev => [...prev, `${new Date().toLocaleTimeString()} - ${message}`]);
    };

    const runDiagnostics = async () => {
        setIsRunning(true);
        setResults([]);

        try {
            // 1. فحص الاتصال
            addResult('🔍 بدء الفحص الشامل...');
            
            if (!supabase) {
                addResult('❌ CRITICAL: supabase object is null - لا يوجد اتصال!');
                setIsRunning(false);
                return;
            }
            
            addResult('✅ supabase object موجود');

            // 2. فحص جدول المنتجات
            addResult('📊 فحص جدول products...');
            const { data: products, error: productsError } = await supabase.from('products').select('*').limit(5);
            
            if (productsError) {
                addResult(`❌ خطأ في قراءة products: ${productsError.message}`);
            } else {
                addResult(`✅ تم قراءة ${products?.length || 0} منتج`);
                if (products && products.length > 0) {
                    addResult(`📦 أول منتج: ${JSON.stringify(products[0], null, 2)}`);
                }
            }

            // 3. اختبار إضافة منتج تجريبي
            addResult('🧪 اختبار إضافة منتج تجريبي...');
            const testProduct = {
                name: 'TEST_PRODUCT_' + Date.now(),
                sku: 'TEST_' + Date.now(),
                category: 'اختبار',
                category_id: null,
                standard_cost_price: 100,
                has_warranty: false,
                product_type: 'standard',
                components: []
            };

            addResult(`📝 البيانات المُرسلة: ${JSON.stringify(testProduct, null, 2)}`);

            const { data: insertData, error: insertError } = await supabase
                .from('products')
                .insert([testProduct])
                .select();

            if (insertError) {
                addResult(`❌ خطأ في الإضافة: ${insertError.message}`);
            } else {
                addResult(`✅ تم الإضافة بنجاح!`);
                addResult(`📦 البيانات المُرجعة: ${JSON.stringify(insertData, null, 2)}`);
                
                if (insertData && insertData[0]) {
                    addResult(`📝 اسم المنتج المُرجع: "${insertData[0].name}"`);
                    
                    // حذف المنتج التجريبي
                    const { error: deleteError } = await supabase
                        .from('products')
                        .delete()
                        .eq('id', insertData[0].id);
                    
                    if (deleteError) {
                        addResult(`⚠️ فشل حذف المنتج التجريبي: ${deleteError.message}`);
                    } else {
                        addResult(`🗑️ تم حذف المنتج التجريبي`);
                    }
                }
            }

            // 4. فحص جدول الفئات
            addResult('📂 فحص جدول categories...');
            const { data: categories, error: categoriesError } = await supabase.from('categories').select('*');
            
            if (categoriesError) {
                addResult(`❌ خطأ في قراءة categories: ${categoriesError.message}`);
            } else {
                addResult(`✅ تم قراءة ${categories?.length || 0} فئة`);
            }

            // 5. فحص الاتصال المباشر
            addResult('🔌 فحص الاتصال المباشر...');
            if (window.electron?.database) {
                const isConnected = await window.electron.database.isConnected();
                addResult(`🔌 حالة الاتصال: ${isConnected ? '✅ متصل' : '❌ غير متصل'}`);
            } else {
                addResult('❌ window.electron.database غير موجود!');
            }

            addResult('✅ اكتمل الفحص!');

        } catch (error: any) {
            addResult(`❌ خطأ عام: ${error.message}`);
            console.error('Diagnostic error:', error);
        } finally {
            setIsRunning(false);
        }
    };

    const copyResults = () => {
        const text = results.join('\n');
        navigator.clipboard.writeText(text);
        alert('تم نسخ النتائج إلى الحافظة');
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>🔍 أداة تشخيص قاعدة البيانات</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="flex gap-3">
                    <Button 
                        onClick={runDiagnostics} 
                        disabled={isRunning}
                    >
                        {isRunning ? (
                            <>
                                <Icons.RefreshCw className="h-4 w-4 ml-2 animate-spin" />
                                جاري الفحص...
                            </>
                        ) : (
                            <>
                                <Icons.SearchCheck className="h-4 w-4 ml-2" />
                                بدء الفحص الشامل
                            </>
                        )}
                    </Button>
                    
                    {results.length > 0 && (
                        <Button variant="secondary" onClick={copyResults}>
                            <Icons.Copy className="h-4 w-4 ml-2" />
                            نسخ النتائج
                        </Button>
                    )}
                </div>

                {results.length > 0 && (
                    <div className="bg-slate-900 text-green-400 p-4 rounded-md font-mono text-xs overflow-auto max-h-96">
                        {results.map((result, index) => (
                            <div key={index} className="mb-1">
                                {result}
                            </div>
                        ))}
                    </div>
                )}

                <div className="bg-blue-50 border border-blue-200 rounded-md p-3 text-sm text-blue-800">
                    <p className="font-semibold mb-2">💡 ما يفحصه هذا الاختبار:</p>
                    <ul className="space-y-1 text-xs">
                        <li>✓ وجود كائن الاتصال (supabase)</li>
                        <li>✓ قراءة البيانات من جدول products</li>
                        <li>✓ إضافة منتج تجريبي</li>
                        <li>✓ التحقق من البيانات المُرجعة</li>
                        <li>✓ حذف المنتج التجريبي</li>
                        <li>✓ فحص جدول categories</li>
                        <li>✓ حالة الاتصال المباشر</li>
                    </ul>
                </div>
            </CardContent>
        </Card>
    );
};

export default DatabaseDiagnostics;
