// قالب جاهز لإضافة قسم جديد في دليل الاستخدام
// انسخ هذا القالب وعدّل عليه حسب الحاجة

{/* قسم X: [اسم الميزة الجديدة] */}
<Card className={expandedSection === 'section-id' ? 'border-blue-400' : ''}>
    <CardHeader>
        <div 
            className="flex items-center justify-between cursor-pointer hover:opacity-80 transition-opacity"
            onClick={() => toggleSection('section-id')}
        >
            <div className="flex items-center gap-3">
                <span className="text-2xl">🎯</span> {/* غيّر الإيموجي المناسب */}
                <CardTitle>X. [اسم الميزة]</CardTitle>
            </div>
            {expandedSection === 'section-id' ? <Icons.ChevronUp /> : <Icons.ChevronDown />}
        </div>
    </CardHeader>
    {expandedSection === 'section-id' && (
        <CardContent className="space-y-4">
            {/* وصف مختصر */}
            <p className="text-slate-700">[وصف مختصر للميزة وفائدتها]</p>
            
            {/* الخطوات */}
            <div className="space-y-3">
                <h4 className="font-semibold text-slate-900">الخطوات:</h4>
                <ol className="list-decimal list-inside space-y-2 text-sm text-slate-700">
                    <li className="pl-2">
                        <strong>[عنوان الخطوة الأولى]</strong>
                        <p className="pr-6 text-slate-600">[شرح تفصيلي للخطوة]</p>
                    </li>
                    <li className="pl-2">
                        <strong>[عنوان الخطوة الثانية]</strong>
                        <p className="pr-6 text-slate-600">[شرح تفصيلي للخطوة]</p>
                        {/* إذا كانت هناك خطوات فرعية */}
                        <ul className="pr-6 mt-1 space-y-1 text-slate-600">
                            <li>• [خطوة فرعية 1]</li>
                            <li>• [خطوة فرعية 2]</li>
                        </ul>
                    </li>
                    <li className="pl-2">
                        <strong>[عنوان الخطوة الثالثة]</strong>
                        <p className="pr-6 text-slate-600">[شرح تفصيلي للخطوة]</p>
                    </li>
                </ol>
            </div>

            {/* بطاقة معلومات - اختر النوع المناسب */}
            
            {/* نصيحة (أزرق) */}
            <div className="bg-blue-50 border border-blue-200 p-3 rounded text-sm">
                <p className="text-blue-900">
                    <strong>💡 نصيحة:</strong> [نصيحة مفيدة للمستخدم]
                </p>
            </div>

            {/* أو فائدة (أخضر) */}
            <div className="bg-green-50 border border-green-200 p-3 rounded text-sm">
                <p className="text-green-900">
                    <strong>✅ فائدة:</strong> [فائدة استخدام هذه الميزة]
                </p>
            </div>

            {/* أو تحذير (أصفر) */}
            <div className="bg-amber-50 border border-amber-200 p-3 rounded text-sm">
                <p className="text-amber-900">
                    <strong>⚠️ تنبيه:</strong> [تحذير مهم للمستخدم]
                </p>
            </div>

            {/* أو ميزة خاصة (بنفسجي) */}
            <div className="bg-purple-50 border border-purple-200 p-3 rounded text-sm">
                <p className="text-purple-900">
                    <strong>🎯 ميزة:</strong> [ميزة خاصة في هذا القسم]
                </p>
            </div>

            {/* أو قائمة مميزات (متدرج) */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 p-3 rounded text-sm space-y-2">
                <p className="text-indigo-900">
                    <strong>🎯 مميزات إضافية:</strong>
                </p>
                <ul className="text-indigo-800 space-y-1 pr-4">
                    <li>• [ميزة 1]</li>
                    <li>• [ميزة 2]</li>
                    <li>• [ميزة 3]</li>
                </ul>
            </div>
        </CardContent>
    )}
</Card>

// ============================================
// قوالب إضافية لحالات خاصة
// ============================================

// قالب لقسم يحتوي على أنواع فرعية
{/* مثال: أنواع التقارير */}
<div className="space-y-3">
    <h4 className="font-semibold text-slate-900">أنواع [الميزة] المتاحة:</h4>
    <div className="space-y-3 text-sm">
        <div className="border-r-4 border-blue-500 pr-3">
            <strong className="text-slate-900">📊 [النوع الأول]</strong>
            <p className="text-slate-600">[وصف النوع الأول]</p>
        </div>
        <div className="border-r-4 border-green-500 pr-3">
            <strong className="text-slate-900">💵 [النوع الثاني]</strong>
            <p className="text-slate-600">[وصف النوع الثاني]</p>
        </div>
        <div className="border-r-4 border-purple-500 pr-3">
            <strong className="text-slate-900">📦 [النوع الثالث]</strong>
            <p className="text-slate-600">[وصف النوع الثالث]</p>
        </div>
    </div>
</div>

// قالب لقسم يحتوي على جدول مقارنة
<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
    <div className="bg-green-50 border border-green-200 p-4 rounded">
        <h4 className="font-semibold text-green-900 mb-2">✅ افعل</h4>
        <ul className="text-sm text-green-800 space-y-1">
            <li>• [نصيحة 1]</li>
            <li>• [نصيحة 2]</li>
            <li>• [نصيحة 3]</li>
        </ul>
    </div>
    <div className="bg-red-50 border border-red-200 p-4 rounded">
        <h4 className="font-semibold text-red-900 mb-2">❌ تجنب</h4>
        <ul className="text-sm text-red-800 space-y-1">
            <li>• [تحذير 1]</li>
            <li>• [تحذير 2]</li>
            <li>• [تحذير 3]</li>
        </ul>
    </div>
</div>

// قالب لقسم يحتوي على خطوات متقدمة
<div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 p-4 rounded">
    <h4 className="font-semibold text-blue-900 mb-2">🚀 [عنوان القسم المتقدم]</h4>
    <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
        <li>[خطوة متقدمة 1]</li>
        <li>[خطوة متقدمة 2]</li>
        <li>[خطوة متقدمة 3]</li>
    </ol>
</div>

// ============================================
// ملاحظات مهمة
// ============================================

/*
1. غيّر 'section-id' إلى معرف فريد للقسم (مثل: 'new-feature', 'advanced-reports')
2. غيّر رقم القسم X إلى الرقم المناسب
3. اختر الإيموجي المناسب من القائمة في GUIDE_UPDATE_INSTRUCTIONS.md
4. استخدم نوع البطاقة الملونة المناسب للمحتوى
5. تأكد من وضوح الخطوات وسهولة فهمها
6. أضف أمثلة عملية إذا أمكن
7. اختبر القسم بعد الإضافة
*/
