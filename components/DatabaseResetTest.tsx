import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/Card';
import { Button } from './ui/Button';
import { Icons } from './icons';
import { useSupabase } from '../contexts/SupabaseContext';
import { useNotification } from '../contexts/NotificationContext';

const DatabaseResetTest: React.FC = () => {
    const { supabase } = useSupabase();
    const notification = useNotification();
    const [isResetting, setIsResetting] = useState(false);
    const [confirmText, setConfirmText] = useState('');

    const testDatabaseConnection = async () => {
        if (!supabase) {
            notification?.addNotification('❌ لا يوجد اتصال بقاعدة البيانات', 'error');
            return;
        }

        try {
            // اختبار بسيط للاتصال
            const { data, error } = await supabase.from('products').select('count', { count: 'exact' });
            
            if (error) {
                notification?.addNotification(`❌ خطأ في الاتصال: ${error.message}`, 'error');
            } else {
                notification?.addNotification(`✅ الاتصال يعمل - عدد المنتجات: ${data?.length || 0}`, 'success');
            }
        } catch (error: any) {
            notification?.addNotification(`❌ خطأ في الاختبار: ${error.message}`, 'error');
        }
    };

    const resetDatabase = async () => {
        if (confirmText !== 'حذف') {
            notification?.addNotification('❌ يجب كتابة "حذف" للتأكيد', 'error');
            return;
        }

        if (!supabase) {
            notification?.addNotification('❌ لا يوجد اتصال بقاعدة البيانات', 'error');
            return;
        }

        setIsResetting(true);
        
        const tables = ['inventory_items', 'products', 'suppliers', 'clients', 'areas', 'provinces'];
        
        try {
            console.log('🗑️ بدء عملية حذف جميع البيانات...');
            
            for (const table of tables) {
                console.log(`🗑️ حذف البيانات من جدول: ${table}`);
                
                // أولاً، جلب جميع الصفوف ثم حذفها
                const { data: allRows, error: fetchError } = await supabase
                    .from(table)
                    .select('id');
                
                if (fetchError) {
                    console.error(`❌ خطأ في جلب بيانات جدول ${table}:`, fetchError);
                    throw fetchError;
                }
                
                if (allRows && allRows.length > 0) {
                    const { error } = await supabase
                        .from(table)
                        .delete()
                        .in('id', allRows.map(row => row.id));
                    
                    if (error) {
                        console.error(`❌ خطأ في حذف جدول ${table}:`, error);
                        throw error;
                    }
                    
                    console.log(`✅ تم حذف ${allRows.length} صف من جدول ${table}`);
                } else {
                    console.log(`ℹ️ جدول ${table} فارغ بالفعل`);
                }
                
                console.log(`✅ تم حذف جدول ${table} بنجاح`);
                notification?.addNotification(`✅ تم حذف جدول ${table}`, 'info');
            }
            
            console.log('✅ تم حذف جميع البيانات بنجاح');
            notification?.addNotification('🎉 تم حذف جميع البيانات بنجاح!', 'success');
            setConfirmText('');
            
        } catch (error: any) {
            console.error('❌ فشل في حذف البيانات:', error);
            notification?.addNotification(`❌ فشل حذف البيانات: ${error.message}`, 'error');
        } finally {
            setIsResetting(false);
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center text-red-600">
                    <Icons.AlertTriangle className="h-5 w-5 ml-2" />
                    اختبار إعادة تعيين قاعدة البيانات
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div className="flex items-start">
                        <Icons.Info className="h-5 w-5 text-yellow-400 ml-2 flex-shrink-0 mt-0.5" />
                        <div className="text-sm text-yellow-800">
                            <p className="font-medium">تحذير!</p>
                            <p>هذا المكون للاختبار فقط. سيحذف جميع البيانات من قاعدة البيانات.</p>
                        </div>
                    </div>
                </div>

                <div className="space-y-3">
                    <Button onClick={testDatabaseConnection} variant="secondary" className="w-full">
                        <Icons.Zap className="h-4 w-4 ml-2" />
                        اختبار الاتصال بقاعدة البيانات
                    </Button>

                    <div className="border-t pt-4">
                        <label className="block text-sm font-medium mb-2">
                            اكتب "حذف" للتأكيد:
                        </label>
                        <input
                            type="text"
                            value={confirmText}
                            onChange={(e) => setConfirmText(e.target.value)}
                            className="w-full p-2 border border-gray-300 rounded-md text-center"
                            placeholder="حذف"
                        />
                    </div>

                    <Button 
                        onClick={resetDatabase}
                        disabled={confirmText !== 'حذف' || isResetting}
                        variant="danger"
                        className="w-full"
                    >
                        {isResetting ? (
                            <span className="flex items-center">
                                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                جارٍ الحذف...
                            </span>
                        ) : (
                            <span className="flex items-center">
                                <Icons.Trash2 className="h-4 w-4 ml-2" />
                                حذف جميع البيانات
                            </span>
                        )}
                    </Button>
                </div>

                <div className="text-xs text-gray-500">
                    افتح Developer Tools (F12) لرؤية تفاصيل العملية
                </div>
            </CardContent>
        </Card>
    );
};

export default DatabaseResetTest;