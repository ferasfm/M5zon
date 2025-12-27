import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/Card';
import { Icons } from './icons';

const UserGuide: React.FC = () => {
    const [expandedSection, setExpandedSection] = useState<string | null>('database');

    const toggleSection = (section: string) => {
        setExpandedSection(expandedSection === section ? null : section);
    };

    return (
        <div className="space-y-6">
            <Card className="border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50">
                <CardHeader>
                    <div className="flex items-center gap-3">
                        <div className="bg-blue-600 p-3 rounded-lg">
                            <Icons.BookOpen className="h-6 w-6 text-white" />
                        </div>
                        <div>
                            <CardTitle className="text-2xl text-blue-900">دليل استخدام البرنامج</CardTitle>
                            <p className="text-sm text-blue-700 mt-1">دليل شامل لاستخدام نظام إدارة المخزون الاحترافي</p>
                        </div>
                    </div>
                </CardHeader>
            </Card>

            {/* قسم 1: إعداد قاعدة البيانات */}
            <Card className={expandedSection === 'database' ? 'border-blue-400' : ''}>
                <CardHeader>
                    <div
                        className="flex items-center justify-between cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={() => toggleSection('database')}
                    >
                        <div className="flex items-center gap-3">
                            <span className="text-2xl">🗄️</span>
                            <CardTitle>1. إعداد قاعدة البيانات (الخطوة الأولى)</CardTitle>
                        </div>
                        {expandedSection === 'database' ? <Icons.ChevronUp /> : <Icons.ChevronDown />}
                    </div>
                </CardHeader>
                {expandedSection === 'database' && (
                    <CardContent className="space-y-4">
                        <div className="bg-blue-50 border-r-4 border-blue-500 p-4 rounded">
                            <h4 className="font-bold text-blue-900 mb-2">📌 قبل البدء</h4>
                            <p className="text-sm text-blue-800">يجب إعداد قاعدة البيانات أولاً قبل استخدام البرنامج</p>
                        </div>

                        <div className="space-y-3">
                            <h4 className="font-semibold text-slate-900">الخطوات:</h4>
                            <ol className="list-decimal list-inside space-y-2 text-sm text-slate-700">
                                <li className="pl-2">
                                    <strong>انتقل إلى الإعدادات</strong>
                                    <p className="pr-6 text-slate-600">من القائمة الجانبية، اضغط على "الإعدادات"</p>
                                </li>
                                <li className="pl-2">
                                    <strong>اختر "إعدادات متقدمة"</strong>
                                    <p className="pr-6 text-slate-600">من التبويبات في الأعلى، اختر "🔧 إعدادات متقدمة"</p>
                                </li>
                                <li className="pl-2">
                                    <strong>أدخل معلومات قاعدة البيانات</strong>
                                    <ul className="pr-6 mt-1 space-y-1 text-slate-600">
                                        <li>• Host: عنوان السيرفر (مثال: localhost أو aws.supabase.co)</li>
                                        <li>• Port: المنفذ (عادة 5432)</li>
                                        <li>• Database: اسم قاعدة البيانات</li>
                                        <li>• User: اسم المستخدم</li>
                                        <li>• Password: كلمة المرور</li>
                                    </ul>
                                </li>
                                <li className="pl-2">
                                    <strong>اختبر الاتصال</strong>
                                    <p className="pr-6 text-slate-600">اضغط على "اختبار الاتصال" للتأكد من صحة البيانات</p>
                                </li>
                                <li className="pl-2">
                                    <strong>احفظ الإعدادات</strong>
                                    <p className="pr-6 text-slate-600">بعد نجاح الاختبار، اضغط "حفظ الإعدادات"</p>
                                </li>
                            </ol>
                        </div>

                        <div className="bg-amber-50 border border-amber-200 p-3 rounded text-sm">
                            <p className="text-amber-900">
                                <strong>💡 نصيحة:</strong> إذا كنت تستخدم Supabase، يمكنك الحصول على معلومات الاتصال من لوحة تحكم Supabase &gt; Settings &gt; Database
                            </p>
                        </div>
                    </CardContent>
                )}
            </Card>

            {/* قسم 2: إعداد الفئات */}
            <Card className={expandedSection === 'categories' ? 'border-blue-400' : ''}>
                <CardHeader>
                    <div
                        className="flex items-center justify-between cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={() => toggleSection('categories')}
                    >
                        <div className="flex items-center gap-3">
                            <span className="text-2xl">📂</span>
                            <CardTitle>2. إعداد الفئات</CardTitle>
                        </div>
                        {expandedSection === 'categories' ? <Icons.ChevronUp /> : <Icons.ChevronDown />}
                    </div>
                </CardHeader>
                {expandedSection === 'categories' && (
                    <CardContent className="space-y-4">
                        <p className="text-slate-700">الفئات تساعدك على تنظيم المنتجات وتسهيل البحث والتقارير</p>

                        <div className="space-y-3">
                            <h4 className="font-semibold text-slate-900">الخطوات:</h4>
                            <ol className="list-decimal list-inside space-y-2 text-sm text-slate-700">
                                <li className="pl-2">
                                    <strong>انتقل إلى الإعدادات &gt; إدارة الفئات</strong>
                                </li>
                                <li className="pl-2">
                                    <strong>أضف فئات جديدة</strong>
                                    <p className="pr-6 text-slate-600">مثال: إلكترونيات، أثاث، ملابس، أدوات منزلية</p>
                                </li>
                                <li className="pl-2">
                                    <strong>يمكنك تعديل أو حذف الفئات</strong>
                                    <p className="pr-6 text-slate-600">استخدم أزرار التعديل والحذف بجانب كل فئة</p>
                                </li>
                            </ol>
                        </div>

                        <div className="bg-green-50 border border-green-200 p-3 rounded text-sm">
                            <p className="text-green-900">
                                <strong>✅ فائدة:</strong> تنظيم المنتجات في فئات يسهل عليك إنشاء التقارير وتصدير البيانات حسب الفئة
                            </p>
                        </div>
                    </CardContent>
                )}
            </Card>

            {/* قسم 3: إضافة الموردين */}
            <Card className={expandedSection === 'suppliers' ? 'border-blue-400' : ''}>
                <CardHeader>
                    <div
                        className="flex items-center justify-between cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={() => toggleSection('suppliers')}
                    >
                        <div className="flex items-center gap-3">
                            <span className="text-2xl">🏭</span>
                            <CardTitle>3. إضافة الموردين</CardTitle>
                        </div>
                        {expandedSection === 'suppliers' ? <Icons.ChevronUp /> : <Icons.ChevronDown />}
                    </div>
                </CardHeader>
                {expandedSection === 'suppliers' && (
                    <CardContent className="space-y-4">
                        <p className="text-slate-700">الموردون هم الشركات أو الأشخاص الذين تشتري منهم المنتجات</p>

                        <div className="space-y-3">
                            <h4 className="font-semibold text-slate-900">الخطوات:</h4>
                            <ol className="list-decimal list-inside space-y-2 text-sm text-slate-700">
                                <li className="pl-2">
                                    <strong>انتقل إلى صفحة "الموردون"</strong>
                                </li>
                                <li className="pl-2">
                                    <strong>اضغط "إضافة مورد جديد"</strong>
                                </li>
                                <li className="pl-2">
                                    <strong>أدخل معلومات المورد</strong>
                                    <ul className="pr-6 mt-1 space-y-1 text-slate-600">
                                        <li>• اسم المورد (مطلوب)</li>
                                        <li>• جهة الاتصال</li>
                                        <li>• رقم الهاتف</li>
                                        <li>• البريد الإلكتروني</li>
                                        <li>• العنوان</li>
                                    </ul>
                                </li>
                                <li className="pl-2">
                                    <strong>احفظ البيانات</strong>
                                </li>
                            </ol>
                        </div>

                        <div className="bg-blue-50 border border-blue-200 p-3 rounded text-sm">
                            <p className="text-blue-900">
                                <strong>💼 ميزة إضافية:</strong> يمكنك إدارة اتفاقيات الأسعار مع كل مورد من صفحة الموردين
                            </p>
                        </div>
                    </CardContent>
                )}
            </Card>

            {/* قسم 4: إضافة المنتجات */}
            <Card className={expandedSection === 'products' ? 'border-blue-400' : ''}>
                <CardHeader>
                    <div
                        className="flex items-center justify-between cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={() => toggleSection('products')}
                    >
                        <div className="flex items-center gap-3">
                            <span className="text-2xl">📦</span>
                            <CardTitle>4. إضافة المنتجات</CardTitle>
                        </div>
                        {expandedSection === 'products' ? <Icons.ChevronUp /> : <Icons.ChevronDown />}
                    </div>
                </CardHeader>
                {expandedSection === 'products' && (
                    <CardContent className="space-y-4">
                        <p className="text-slate-700">المنتجات هي السلع التي تديرها في المخزون</p>

                        <div className="space-y-3">
                            <h4 className="font-semibold text-slate-900">الخطوات:</h4>
                            <ol className="list-decimal list-inside space-y-2 text-sm text-slate-700">
                                <li className="pl-2">
                                    <strong>انتقل إلى صفحة "المنتجات"</strong>
                                </li>
                                <li className="pl-2">
                                    <strong>اضغط "إضافة منتج جديد"</strong>
                                </li>
                                <li className="pl-2">
                                    <strong>اختر نوع المنتج</strong>
                                    <ul className="pr-6 mt-1 space-y-1 text-slate-600">
                                        <li>• <strong>منتج عادي:</strong> منتجات بسيطة بدون أرقام تسلسلية</li>
                                        <li>• <strong>منتج متتبع:</strong> منتجات تحتاج تتبع بالرقم التسلسلي (مثل الأجهزة الإلكترونية)</li>
                                    </ul>
                                </li>
                                <li className="pl-2">
                                    <strong>أدخل معلومات المنتج</strong>
                                    <ul className="pr-6 mt-1 space-y-1 text-slate-600">
                                        <li>• اسم المنتج (مطلوب)</li>
                                        <li>• رمز المنتج/الباركود (مطلوب)</li>
                                        <li>• الفئة</li>
                                        <li>• السعر المرجعي</li>
                                        <li>• سعر البيع</li>
                                        <li>• الوصف</li>
                                    </ul>
                                </li>
                            </ol>
                        </div>

                        <div className="bg-purple-50 border border-purple-200 p-3 rounded text-sm">
                            <p className="text-purple-900">
                                <strong>🎯 نصيحة:</strong> استخدم المنتجات المتتبعة للأجهزة الإلكترونية والمعدات الثمينة لتتبع كل قطعة بشكل منفصل
                            </p>
                        </div>
                    </CardContent>
                )}
            </Card>

            {/* قسم 5: إدارة المخزون */}
            <Card className={expandedSection === 'inventory' ? 'border-blue-400' : ''}>
                <CardHeader>
                    <div
                        className="flex items-center justify-between cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={() => toggleSection('inventory')}
                    >
                        <div className="flex items-center gap-3">
                            <span className="text-2xl">📊</span>
                            <CardTitle>5. إدارة المخزون</CardTitle>
                        </div>
                        {expandedSection === 'inventory' ? <Icons.ChevronUp /> : <Icons.ChevronDown />}
                    </div>
                </CardHeader>
                {expandedSection === 'inventory' && (
                    <CardContent className="space-y-4">
                        <div className="space-y-3">
                            <h4 className="font-semibold text-slate-900">إضافة قطع للمخزون:</h4>
                            <ol className="list-decimal list-inside space-y-2 text-sm text-slate-700">
                                <li className="pl-2">
                                    <strong>انتقل إلى صفحة "المخزون"</strong>
                                </li>
                                <li className="pl-2">
                                    <strong>اضغط "إضافة قطعة جديدة"</strong>
                                </li>
                                <li className="pl-2">
                                    <strong>اختر المنتج والمورد</strong>
                                </li>
                                <li className="pl-2">
                                    <strong>أدخل التفاصيل</strong>
                                    <ul className="pr-6 mt-1 space-y-1 text-slate-600">
                                        <li>• الرقم التسلسلي (للمنتجات المتتبعة)</li>
                                        <li>• سعر الشراء</li>
                                        <li>• تاريخ الشراء</li>
                                        <li>• تاريخ انتهاء الكفالة (اختياري)</li>
                                    </ul>
                                </li>
                            </ol>
                        </div>

                        <div className="space-y-3 mt-4">
                            <h4 className="font-semibold text-slate-900">صرف قطع من المخزون:</h4>
                            <ol className="list-decimal list-inside space-y-2 text-sm text-slate-700">
                                <li className="pl-2">
                                    <strong>ابحث عن القطعة في المخزون</strong>
                                </li>
                                <li className="pl-2">
                                    <strong>اضغط على زر "صرف"</strong>
                                </li>
                                <li className="pl-2">
                                    <strong>اختر العميل وسبب الصرف</strong>
                                </li>
                                <li className="pl-2">
                                    <strong>أدخل سعر البيع (إن وجد)</strong>
                                </li>
                            </ol>
                        </div>

                        <div className="bg-green-50 border border-green-200 p-3 rounded text-sm">
                            <p className="text-green-900">
                                <strong>📈 ميزة:</strong> يمكنك تصفية المخزون حسب الحالة (متاح، مصروف، متلف) والبحث بالرقم التسلسلي
                            </p>
                        </div>
                    </CardContent>
                )}
            </Card>

            {/* قسم 6: اتفاقيات الأسعار */}
            <Card className={expandedSection === 'pricing' ? 'border-blue-400' : ''}>
                <CardHeader>
                    <div
                        className="flex items-center justify-between cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={() => toggleSection('pricing')}
                    >
                        <div className="flex items-center gap-3">
                            <span className="text-2xl">💰</span>
                            <CardTitle>6. إدارة اتفاقيات الأسعار</CardTitle>
                        </div>
                        {expandedSection === 'pricing' ? <Icons.ChevronUp /> : <Icons.ChevronDown />}
                    </div>
                </CardHeader>
                {expandedSection === 'pricing' && (
                    <CardContent className="space-y-4">
                        <p className="text-slate-700">نظام شامل لإدارة أسعار الموردين ومقارنتها</p>

                        <div className="space-y-3">
                            <h4 className="font-semibold text-slate-900">الخطوات:</h4>
                            <ol className="list-decimal list-inside space-y-2 text-sm text-slate-700">
                                <li className="pl-2">
                                    <strong>انتقل إلى صفحة "الموردون"</strong>
                                </li>
                                <li className="pl-2">
                                    <strong>اضغط على زر "اتفاقية الأسعار" بجانب المورد</strong>
                                </li>
                                <li className="pl-2">
                                    <strong>استخدم أزرار التصدير</strong>
                                    <ul className="pr-6 mt-1 space-y-1 text-slate-600">
                                        <li>• <strong>تصدير الكل (مفصل):</strong> جميع المنتجات مع كل التفاصيل</li>
                                        <li>• <strong>تصدير الكل (مبسط):</strong> تنسيق مبسط للتعبئة السريعة</li>
                                        <li>• <strong>المسعرة فقط:</strong> المنتجات التي لها أسعار</li>
                                        <li>• <strong>بدون أسعار:</strong> المنتجات التي تحتاج تسعير</li>
                                    </ul>
                                </li>
                                <li className="pl-2">
                                    <strong>عبئ الأسعار في ملف Excel</strong>
                                </li>
                                <li className="pl-2">
                                    <strong>استورد الملف مرة أخرى</strong>
                                </li>
                            </ol>
                        </div>

                        <div className="bg-indigo-50 border border-indigo-200 p-3 rounded text-sm space-y-2">
                            <p className="text-indigo-900">
                                <strong>🎯 مميزات إضافية:</strong>
                            </p>
                            <ul className="text-indigo-800 space-y-1 pr-4">
                                <li>• فلترة حسب الفئات</li>
                                <li>• عرض تاريخ تغيرات الأسعار</li>
                                <li>• تحديد الموردين المفضلين</li>
                                <li>• مقارنة الأسعار بين الموردين</li>
                            </ul>
                        </div>
                    </CardContent>
                )}
            </Card>

            {/* قسم 7: التقارير */}
            <Card className={expandedSection === 'reports' ? 'border-blue-400' : ''}>
                <CardHeader>
                    <div
                        className="flex items-center justify-between cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={() => toggleSection('reports')}
                    >
                        <div className="flex items-center gap-3">
                            <span className="text-2xl">📊</span>
                            <CardTitle>7. التقارير والتحليلات</CardTitle>
                        </div>
                        {expandedSection === 'reports' ? <Icons.ChevronUp /> : <Icons.ChevronDown />}
                    </div>
                </CardHeader>
                {expandedSection === 'reports' && (
                    <CardContent className="space-y-4">
                        <p className="text-slate-700">التقارير تساعدك على فهم أداء المخزون واتخاذ القرارات</p>

                        <div className="space-y-3">
                            <h4 className="font-semibold text-slate-900">أنواع التقارير المتاحة:</h4>
                            <div className="space-y-3 text-sm">
                                <div className="border-r-4 border-blue-500 pr-3">
                                    <strong className="text-slate-900">📈 تقرير المبيعات</strong>
                                    <p className="text-slate-600">عرض المبيعات حسب الفترة الزمنية مع الرسوم البيانية</p>
                                </div>
                                <div className="border-r-4 border-green-500 pr-3">
                                    <strong className="text-slate-900">💵 تقرير الأرباح</strong>
                                    <p className="text-slate-600">حساب الأرباح بناءً على الفرق بين سعر الشراء والبيع</p>
                                </div>
                                <div className="border-r-4 border-purple-500 pr-3">
                                    <strong className="text-slate-900">📦 تقرير المخزون</strong>
                                    <p className="text-slate-600">حالة المخزون الحالية والمنتجات المنخفضة</p>
                                </div>
                                <div className="border-r-4 border-amber-500 pr-3">
                                    <strong className="text-slate-900">⚠️ تقرير الكفالات</strong>
                                    <p className="text-slate-600">القطع التي ستنتهي كفالتها قريباً</p>
                                </div>
                                <div className="border-r-4 border-red-500 pr-3">
                                    <strong className="text-slate-900">💰 تقرير التوفير المحتمل</strong>
                                    <p className="text-slate-600">مقارنة أسعار الموردين لتحديد فرص التوفير</p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-blue-50 border border-blue-200 p-3 rounded text-sm">
                            <p className="text-blue-900">
                                <strong>📊 نصيحة:</strong> راجع التقارير بشكل دوري لمتابعة أداء المخزون واتخاذ قرارات مبنية على البيانات
                            </p>
                        </div>
                    </CardContent>
                )}
            </Card>

            {/* قسم 8: نصائح عامة */}
            <Card className={expandedSection === 'tips' ? 'border-blue-400' : ''}>
                <CardHeader>
                    <div
                        className="flex items-center justify-between cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={() => toggleSection('tips')}
                    >
                        <div className="flex items-center gap-3">
                            <span className="text-2xl">💡</span>
                            <CardTitle>8. نصائح وأفضل الممارسات</CardTitle>
                        </div>
                        {expandedSection === 'tips' ? <Icons.ChevronUp /> : <Icons.ChevronDown />}
                    </div>
                </CardHeader>
                {expandedSection === 'tips' && (
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="bg-green-50 border border-green-200 p-4 rounded">
                                <h4 className="font-semibold text-green-900 mb-2">✅ افعل</h4>
                                <ul className="text-sm text-green-800 space-y-1">
                                    <li>• احتفظ بنسخة احتياطية من قاعدة البيانات</li>
                                    <li>• حدّث أسعار الموردين بانتظام</li>
                                    <li>• راجع التقارير أسبوعياً</li>
                                    <li>• استخدم الفئات لتنظيم المنتجات</li>
                                    <li>• سجل تواريخ الكفالة للمنتجات</li>
                                </ul>
                            </div>
                            <div className="bg-red-50 border border-red-200 p-4 rounded">
                                <h4 className="font-semibold text-red-900 mb-2">❌ تجنب</h4>
                                <ul className="text-sm text-red-800 space-y-1">
                                    <li>• حذف البيانات بدون نسخة احتياطية</li>
                                    <li>• ترك المنتجات بدون فئات</li>
                                    <li>• إهمال تحديث المخزون</li>
                                    <li>• عدم تسجيل أسباب الصرف</li>
                                    <li>• تجاهل تنبيهات المخزون المنخفض</li>
                                </ul>
                            </div>
                        </div>

                        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 p-4 rounded">
                            <h4 className="font-semibold text-blue-900 mb-2">🚀 للحصول على أفضل النتائج</h4>
                            <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
                                <li>ابدأ بإعداد الفئات والموردين قبل إضافة المنتجات</li>
                                <li>استخدم أرقام تسلسلية واضحة ومنظمة</li>
                                <li>سجل جميع الحركات فور حدوثها</li>
                                <li>راجع تقرير التوفير المحتمل شهرياً</li>
                                <li>استفد من ميزة تصدير واستيراد الأسعار</li>
                            </ol>
                        </div>
                    </CardContent>
                )}
            </Card>

            {/* قسم المساعدة */}
            <Card className="border-slate-300 bg-slate-50">
                <CardContent className="py-6">
                    <div className="text-center space-y-3">
                        <div className="flex justify-center">
                            <div className="bg-blue-600 p-4 rounded-full">
                                <Icons.HelpCircle className="h-8 w-8 text-white" />
                            </div>
                        </div>
                        <h3 className="text-xl font-bold text-slate-900">هل تحتاج مساعدة إضافية؟</h3>
                        <p className="text-slate-600 max-w-2xl mx-auto">
                            إذا واجهت أي مشكلة أو كان لديك استفسار، يمكنك التواصل مع فريق الدعم الفني
                        </p>
                        <div className="flex justify-center gap-4 pt-2">
                            <div className="text-sm text-slate-700">
                                <strong>📧 البريد:</strong> support@m5zon.com
                            </div>
                            <div className="text-sm text-slate-700">
                                <strong>📱 الهاتف:</strong> +966 XX XXX XXXX
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default UserGuide;
