import db from '../electron/database.js';

async function verifyDataConsistency() {
    console.log('🔍 التحقق من تطابق البيانات بين التطبيق وقاعدة البيانات...\n');

    const config = {
        host: '172.10.0.16',
        port: 5432,
        database: 'm5zon_local',
        user: 'postgres',
        password: 'P@$$w0rd@1234'
    };

    const connectResult = await db.connect(config);
    if (!connectResult.success) {
        console.error('❌ فشل الاتصال:', connectResult.error);
        return;
    }

    console.log('✅ تم الاتصال بنجاح\n');

    let hasIssues = false;

    // 1. التحقق من تطابق الكميات المتاحة
    console.log('📊 1. التحقق من الكميات المتاحة لكل منتج:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    const stockCheck = await db.query(`
        SELECT 
            p.id,
            p.name,
            p.sku,
            COUNT(*) FILTER (WHERE i.status = 'in_stock') as db_available,
            COUNT(*) FILTER (WHERE i.status = 'dispatched') as db_dispatched,
            COUNT(*) FILTER (WHERE i.status = 'scrapped') as db_scrapped,
            COUNT(*) as db_total
        FROM products p
        LEFT JOIN inventory_items i ON p.id = i.product_id
        GROUP BY p.id, p.name, p.sku
        ORDER BY p.name
    `);

    if (stockCheck.success) {
        console.log('المنتج'.padEnd(40) + 'متاح'.padEnd(10) + 'مصروف'.padEnd(10) + 'متلف'.padEnd(10) + 'الإجمالي');
        console.log('─'.repeat(80));
        
        stockCheck.data.forEach(row => {
            const name = row.name.substring(0, 38).padEnd(40);
            const available = String(row.db_available).padEnd(10);
            const dispatched = String(row.db_dispatched).padEnd(10);
            const scrapped = String(row.db_scrapped).padEnd(10);
            const total = String(row.db_total);
            
            console.log(`${name}${available}${dispatched}${scrapped}${total}`);
        });
    }

    // 2. التحقق من القطع ذات الحالات غير الصحيحة
    console.log('\n📊 2. فحص القطع ذات البيانات المتناقضة:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    const inconsistentCheck = await db.query(`
        SELECT 
            i.serial_number,
            p.name as product_name,
            i.status,
            CASE 
                WHEN i.dispatch_client_id IS NOT NULL THEN 'نعم'
                ELSE 'لا'
            END as has_client,
            CASE 
                WHEN i.dispatch_date IS NOT NULL THEN 'نعم'
                ELSE 'لا'
            END as has_date
        FROM inventory_items i
        JOIN products p ON i.product_id = p.id
        WHERE 
            -- حالة dispatched لكن بدون عميل أو تاريخ
            (i.status = 'dispatched' AND (i.dispatch_client_id IS NULL OR i.dispatch_date IS NULL))
            OR
            -- حالة in_stock لكن لديها عميل وتاريخ صرف
            (i.status = 'in_stock' AND i.dispatch_client_id IS NOT NULL AND i.dispatch_date IS NOT NULL)
            OR
            -- حالة scrapped لكن لديها بيانات صرف
            (i.status = 'scrapped' AND (i.dispatch_client_id IS NOT NULL OR i.dispatch_date IS NOT NULL))
    `);

    if (inconsistentCheck.success) {
        if (inconsistentCheck.data.length > 0) {
            hasIssues = true;
            console.log('⚠️  وجدت قطع ذات بيانات متناقضة:');
            inconsistentCheck.data.forEach(row => {
                console.log(`   ❌ ${row.product_name} (${row.serial_number})`);
                console.log(`      الحالة: ${row.status}`);
                console.log(`      لديه عميل: ${row.has_client}, لديه تاريخ: ${row.has_date}`);
            });
        } else {
            console.log('✅ لا توجد قطع ذات بيانات متناقضة');
        }
    }

    // 3. التحقق من القطع المكررة (نفس الرقم التسلسلي)
    console.log('\n📊 3. فحص الأرقام التسلسلية المكررة:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    const duplicateSerials = await db.query(`
        SELECT 
            serial_number,
            COUNT(*) as count,
            STRING_AGG(DISTINCT status, ', ') as statuses
        FROM inventory_items
        GROUP BY serial_number
        HAVING COUNT(*) > 1
    `);

    if (duplicateSerials.success) {
        if (duplicateSerials.data.length > 0) {
            hasIssues = true;
            console.log('⚠️  وجدت أرقام تسلسلية مكررة:');
            duplicateSerials.data.forEach(row => {
                console.log(`   ❌ ${row.serial_number}: ${row.count} مرات (الحالات: ${row.statuses})`);
            });
        } else {
            console.log('✅ لا توجد أرقام تسلسلية مكررة');
        }
    }

    // 4. التحقق من المنتجات بدون قطع
    console.log('\n📊 4. فحص المنتجات بدون قطع في المخزون:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    const productsWithoutItems = await db.query(`
        SELECT 
            p.name,
            p.sku,
            p.product_type
        FROM products p
        LEFT JOIN inventory_items i ON p.id = i.product_id
        WHERE i.id IS NULL
        AND p.product_type = 'standard'
        ORDER BY p.name
    `);

    if (productsWithoutItems.success) {
        if (productsWithoutItems.data.length > 0) {
            console.log('ℹ️  منتجات بدون قطع (هذا طبيعي للمنتجات الجديدة):');
            productsWithoutItems.data.forEach(row => {
                console.log(`   📦 ${row.name} (${row.sku})`);
            });
        } else {
            console.log('✅ جميع المنتجات لديها قطع');
        }
    }

    // 5. التحقق من الحزم
    console.log('\n📊 5. فحص الحزم (Bundles):');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    const bundleCheck = await db.query(`
        SELECT 
            bundle_group_id,
            bundle_name,
            COUNT(*) as items_count,
            STRING_AGG(DISTINCT status, ', ') as statuses
        FROM inventory_items
        WHERE bundle_group_id IS NOT NULL
        GROUP BY bundle_group_id, bundle_name
        ORDER BY bundle_name
    `);

    if (bundleCheck.success) {
        if (bundleCheck.data.length > 0) {
            console.log('📦 الحزم الموجودة:');
            bundleCheck.data.forEach(row => {
                console.log(`   ${row.bundle_name || 'حزمة'}: ${row.items_count} قطعة (${row.statuses})`);
            });
        } else {
            console.log('ℹ️  لا توجد حزم في النظام');
        }
    }

    // 6. التحقق من العملاء المحذوفين
    console.log('\n📊 6. فحص القطع المرتبطة بعملاء محذوفين:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    const orphanedClients = await db.query(`
        SELECT 
            i.serial_number,
            p.name as product_name,
            i.dispatch_client_id,
            i.destination_client_id
        FROM inventory_items i
        JOIN products p ON i.product_id = p.id
        WHERE 
            (i.dispatch_client_id IS NOT NULL AND NOT EXISTS (
                SELECT 1 FROM clients c WHERE c.id = i.dispatch_client_id
            ))
            OR
            (i.destination_client_id IS NOT NULL AND NOT EXISTS (
                SELECT 1 FROM clients c WHERE c.id = i.destination_client_id
            ))
    `);

    if (orphanedClients.success) {
        if (orphanedClients.data.length > 0) {
            hasIssues = true;
            console.log('⚠️  وجدت قطع مرتبطة بعملاء محذوفين:');
            orphanedClients.data.forEach(row => {
                console.log(`   ❌ ${row.product_name} (${row.serial_number})`);
            });
        } else {
            console.log('✅ جميع القطع مرتبطة بعملاء موجودين');
        }
    }

    // 7. التحقق من الموردين المحذوفين
    console.log('\n📊 7. فحص القطع المرتبطة بموردين محذوفين:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    const orphanedSuppliers = await db.query(`
        SELECT 
            i.serial_number,
            p.name as product_name,
            i.supplier_id
        FROM inventory_items i
        JOIN products p ON i.product_id = p.id
        WHERE i.supplier_id IS NOT NULL 
        AND NOT EXISTS (
            SELECT 1 FROM suppliers s WHERE s.id = i.supplier_id
        )
    `);

    if (orphanedSuppliers.success) {
        if (orphanedSuppliers.data.length > 0) {
            hasIssues = true;
            console.log('⚠️  وجدت قطع مرتبطة بموردين محذوفين:');
            orphanedSuppliers.data.forEach(row => {
                console.log(`   ❌ ${row.product_name} (${row.serial_number})`);
            });
        } else {
            console.log('✅ جميع القطع مرتبطة بموردين موجودين');
        }
    }

    // الملخص النهائي
    console.log('\n' + '═'.repeat(80));
    console.log('📋 الملخص النهائي:');
    console.log('═'.repeat(80));
    
    if (hasIssues) {
        console.log('⚠️  تم العثور على مشاكل في البيانات - يُنصح بمراجعتها وإصلاحها');
    } else {
        console.log('✅ البيانات متطابقة ومتسقة - لا توجد مشاكل!');
    }

    await db.disconnect();
    console.log('\n✅ اكتمل الفحص!');
}

verifyDataConsistency();
