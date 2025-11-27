-- ═══════════════════════════════════════════════════════════════
-- سكريبت فحص وإصلاح بيانات المواقع (المحافظات والمناطق والعملاء)
-- ═══════════════════════════════════════════════════════════════

-- ───────────────────────────────────────────────────────────────
-- الخطوة 1: فحص البيانات الحالية
-- ───────────────────────────────────────────────────────────────

-- 1.1 عرض جميع المحافظات
SELECT 
    'المحافظات' as النوع,
    id,
    name as الاسم,
    (SELECT COUNT(*) FROM areas WHERE province_id = provinces.id) as عدد_المناطق
FROM provinces
ORDER BY name;

-- 1.2 عرض جميع المناطق مع محافظاتها
SELECT 
    'المناطق' as النوع,
    a.id,
    a.name as اسم_المنطقة,
    p.name as اسم_المحافظة,
    a.province_id as معرف_المحافظة,
    (SELECT COUNT(*) FROM clients WHERE area_id = a.id) as عدد_العملاء
FROM areas a
LEFT JOIN provinces p ON a.province_id = p.id
ORDER BY p.name, a.name;

-- 1.3 عرض جميع العملاء مع مناطقهم ومحافظاتهم
SELECT 
    'العملاء' as النوع,
    c.id,
    c.name as اسم_العميل,
    a.name as اسم_المنطقة,
    p.name as اسم_المحافظة
FROM clients c
LEFT JOIN areas a ON c.area_id = a.id
LEFT JOIN provinces p ON a.province_id = p.id
ORDER BY p.name, a.name, c.name;

-- 1.4 فحص المناطق بدون محافظة (خطأ!)
SELECT 
    '⚠️ مناطق بدون محافظة' as المشكلة,
    a.id,
    a.name as اسم_المنطقة,
    a.province_id as معرف_المحافظة
FROM areas a
WHERE a.province_id IS NULL OR a.province_id NOT IN (SELECT id FROM provinces);

-- 1.5 فحص العملاء بدون منطقة (خطأ!)
SELECT 
    '⚠️ عملاء بدون منطقة' as المشكلة,
    c.id,
    c.name as اسم_العميل,
    c.area_id as معرف_المنطقة
FROM clients c
WHERE c.area_id IS NULL OR c.area_id NOT IN (SELECT id FROM areas);

-- ───────────────────────────────────────────────────────────────
-- الخطوة 2: فحص الأخطاء الشائعة
-- ───────────────────────────────────────────────────────────────

-- 2.1 فحص المناطق المكررة في نفس المحافظة
SELECT 
    '⚠️ مناطق مكررة' as المشكلة,
    a.name as اسم_المنطقة,
    p.name as اسم_المحافظة,
    COUNT(*) as عدد_التكرار
FROM areas a
JOIN provinces p ON a.province_id = p.id
GROUP BY a.name, p.name, a.province_id
HAVING COUNT(*) > 1;

-- 2.2 فحص العملاء المكررين في نفس المنطقة
SELECT 
    '⚠️ عملاء مكررين' as المشكلة,
    c.name as اسم_العميل,
    a.name as اسم_المنطقة,
    COUNT(*) as عدد_التكرار
FROM clients c
JOIN areas a ON c.area_id = a.id
GROUP BY c.name, a.name, c.area_id
HAVING COUNT(*) > 1;

-- ───────────────────────────────────────────────────────────────
-- الخطوة 3: إصلاح المشاكل (إذا وجدت)
-- ───────────────────────────────────────────────────────────────

-- ⚠️ تحذير: لا تشغل هذه الأوامر إلا بعد التأكد من المشكلة!
-- ⚠️ قم بعمل نسخة احتياطية من قاعدة البيانات أولاً!

-- 3.1 حذف المناطق بدون محافظة (إذا لم يكن لها عملاء)
-- DELETE FROM areas 
-- WHERE (province_id IS NULL OR province_id NOT IN (SELECT id FROM provinces))
-- AND id NOT IN (SELECT DISTINCT area_id FROM clients WHERE area_id IS NOT NULL);

-- 3.2 حذف العملاء بدون منطقة (إذا لم يكن لهم حركات مخزون)
-- DELETE FROM clients 
-- WHERE (area_id IS NULL OR area_id NOT IN (SELECT id FROM areas))
-- AND id NOT IN (
--     SELECT DISTINCT destination_client_id FROM inventory_items WHERE destination_client_id IS NOT NULL
--     UNION
--     SELECT DISTINCT dispatch_client_id FROM inventory_items WHERE dispatch_client_id IS NOT NULL
-- );

-- ───────────────────────────────────────────────────────────────
-- الخطوة 4: إعادة بناء البيانات بشكل صحيح (اختياري)
-- ───────────────────────────────────────────────────────────────

-- إذا كانت البيانات فوضوية جداً، يمكنك إعادة بنائها:

-- 4.1 حذف جميع البيانات القديمة (⚠️ خطر!)
-- DELETE FROM clients;
-- DELETE FROM areas;
-- DELETE FROM provinces;

-- 4.2 إدخال محافظات جديدة (مثال)
-- INSERT INTO provinces (name) VALUES 
--     ('بغداد'),
--     ('البصرة'),
--     ('نينوى'),
--     ('الأنبار'),
--     ('كربلاء'),
--     ('النجف'),
--     ('ذي قار'),
--     ('القادسية'),
--     ('بابل'),
--     ('ديالى'),
--     ('واسط'),
--     ('صلاح الدين'),
--     ('كركوك'),
--     ('أربيل'),
--     ('دهوك'),
--     ('السليمانية'),
--     ('ميسان'),
--     ('المثنى')
-- ON CONFLICT DO NOTHING;

-- 4.3 إدخال مناطق جديدة (مثال لبغداد)
-- INSERT INTO areas (name, province_id) 
-- SELECT 'الكرخ', id FROM provinces WHERE name = 'بغداد'
-- UNION ALL
-- SELECT 'الرصافة', id FROM provinces WHERE name = 'بغداد'
-- UNION ALL
-- SELECT 'الكاظمية', id FROM provinces WHERE name = 'بغداد'
-- UNION ALL
-- SELECT 'الأعظمية', id FROM provinces WHERE name = 'بغداد'
-- UNION ALL
-- SELECT 'المنصور', id FROM provinces WHERE name = 'بغداد'
-- UNION ALL
-- SELECT 'الشعب', id FROM provinces WHERE name = 'بغداد'
-- ON CONFLICT DO NOTHING;

-- ───────────────────────────────────────────────────────────────
-- الخطوة 5: التحقق النهائي
-- ───────────────────────────────────────────────────────────────

-- 5.1 عدد المحافظات
SELECT 'إجمالي المحافظات' as البيان, COUNT(*) as العدد FROM provinces;

-- 5.2 عدد المناطق
SELECT 'إجمالي المناطق' as البيان, COUNT(*) as العدد FROM areas;

-- 5.3 عدد العملاء
SELECT 'إجمالي العملاء' as البيان, COUNT(*) as العدد FROM clients;

-- 5.4 عدد المناطق لكل محافظة
SELECT 
    p.name as المحافظة,
    COUNT(a.id) as عدد_المناطق
FROM provinces p
LEFT JOIN areas a ON p.id = a.province_id
GROUP BY p.id, p.name
ORDER BY p.name;

-- 5.5 عدد العملاء لكل منطقة
SELECT 
    p.name as المحافظة,
    a.name as المنطقة,
    COUNT(c.id) as عدد_العملاء
FROM provinces p
LEFT JOIN areas a ON p.id = a.province_id
LEFT JOIN clients c ON a.id = c.area_id
GROUP BY p.id, p.name, a.id, a.name
ORDER BY p.name, a.name;

-- ═══════════════════════════════════════════════════════════════
-- ملاحظات مهمة:
-- ═══════════════════════════════════════════════════════════════
-- 
-- 1. شغّل الخطوة 1 أولاً لفحص البيانات
-- 2. شغّل الخطوة 2 لفحص الأخطاء
-- 3. إذا وجدت أخطاء، قم بعمل نسخة احتياطية
-- 4. شغّل الخطوة 3 لإصلاح الأخطاء (بعد إزالة التعليقات)
-- 5. شغّل الخطوة 5 للتحقق النهائي
-- 
-- ═══════════════════════════════════════════════════════════════
