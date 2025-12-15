import db from '../electron/database.js';

async function checkInventoryIntegrity() {
    console.log('🔍 فحص سلامة بيانات المخزون...\n');

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

    // 1. فحص القطع المصروفة أكثر من مرة (نفس الـ serial_number)
    console.log('📊 1. فحص القطع المصروفة أكثر من مرة:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    const duplicateDispatch = await db.query(`
        SELECT 
            serial_number,
            COUNT(*) as dispatch_count,
            STRING_AGG(DISTINCT status, ', ') as statuses
        FROM inventory_items
        WHERE status = 'dispatched'
        GROUP BY serial_number
        HAVING COUNT(*) > 1
    `);

    if (duplicateDispatch.success && duplicateDispatch.data.length > 0) {
        console.log('⚠️  وجدت قطع مصروفة أكثر من مرة:');
        duplicateDispatch.data.forEach(row => {
            console.log(`   - ${row.serial_number}: ${row.dispatch_count} مرات`);
        });
    } else {
        console.log('✅ لا توجد قطع مصروفة أكثر من مرة');
    }

    // 2. فحص المنتجات التي تظهر كمية متاحة لكن كل قطعها مصروفة
    console.log('\n📊 2. فحص المنتجات ذات الكميات الخاطئة:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    const productsCheck = await db.query(`
        SELECT 
            p.name as product_name,
            p.sku,
            COUNT(*) FILTER (WHERE i.status = 'in_stock') as in_stock_count,
            COUNT(*) FILTER (WHERE i.status = 'dispatched') as dispatched_count,
            COUNT(*) FILTER (WHERE i.status = 'scrapped') as scrapped_count,
            COUNT(*) as total_count
        FROM products p
        LEFT JOIN inventory_items i ON p.id = i.product_id
        GROUP BY p.id, p.name, p.sku
        HAVING COUNT(*) > 0
        ORDER BY p.name
    `);

    if (productsCheck.success) {
        console.log('\nملخص المنتجات:');
        console.log('─────────────────────────────────────────────────────────────');
        console.log('المنتج'.padEnd(40) + 'متاح'.padEnd(10) + 'مصروف'.padEnd(10) + 'متلف'.padEnd(10) + 'الإجمالي');
        console.log('─────────────────────────────────────────────────────────────');
        
        productsCheck.data.forEach(row => {
            const name = row.product_name.substring(0, 38).padEnd(40);
            const inStock = String(row.in_stock_count).padEnd(10);
            const dispatched = String(row.dispatched_count).padEnd(10);
            const scrapped = String(row.scrapped_count).padEnd(10);
            const total = String(row.total_count);
            
            console.log(`${name}${inStock}${dispatched}${scrapped}${total}`);
        });
    }

    // 3. فحص القطع التي لها dispatch_client_id لكن status ليس dispatched
    console.log('\n📊 3. فحص القطع ذات البيانات المتناقضة:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    const inconsistentData = await db.query(`
        SELECT 
            i.serial_number,
            p.name as product_name,
            i.status,
            i.dispatch_client_id,
            i.dispatch_date
        FROM inventory_items i
        JOIN products p ON i.product_id = p.id
        WHERE 
            (i.dispatch_client_id IS NOT NULL AND i.status != 'dispatched')
            OR (i.dispatch_client_id IS NULL AND i.status = 'dispatched')
    `);

    if (inconsistentData.success && inconsistentData.data.length > 0) {
        console.log('⚠️  وجدت قطع ذات بيانات متناقضة:');
        inconsistentData.data.forEach(row => {
            console.log(`   - ${row.product_name} (${row.serial_number})`);
            console.log(`     الحالة: ${row.status}, العميل: ${row.dispatch_client_id || 'لا يوجد'}`);
        });
    } else {
        console.log('✅ لا توجد قطع ذات بيانات متناقضة');
    }

    // 4. فحص ThinkCenterGen4 بالتحديد
    console.log('\n📊 4. فحص ThinkCenterGen4 بالتحديد:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    const thinkCenterCheck = await db.query(`
        SELECT 
            i.serial_number,
            i.status,
            i.dispatch_client_id,
            i.dispatch_date,
            c.name as client_name
        FROM inventory_items i
        JOIN products p ON i.product_id = p.id
        LEFT JOIN clients c ON i.dispatch_client_id = c.id
        WHERE p.name LIKE '%ThinkCenter%'
        ORDER BY i.status, i.dispatch_date DESC
    `);

    if (thinkCenterCheck.success && thinkCenterCheck.data.length > 0) {
        console.log('📦 قطع ThinkCenterGen4:');
        thinkCenterCheck.data.forEach(row => {
            const status = row.status === 'in_stock' ? '✅ متاح' : 
                          row.status === 'dispatched' ? '📤 مصروف' : '🗑️ متلف';
            console.log(`   ${status} - ${row.serial_number}`);
            if (row.dispatch_client_id) {
                console.log(`      → العميل: ${row.client_name || 'غير معروف'}`);
                console.log(`      → التاريخ: ${row.dispatch_date || 'غير محدد'}`);
            }
        });
    } else {
        console.log('❌ لم يتم العثور على قطع ThinkCenterGen4');
    }

    // 5. ملخص عام
    console.log('\n📊 5. الملخص العام:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    const summary = await db.query(`
        SELECT 
            status,
            COUNT(*) as count
        FROM inventory_items
        GROUP BY status
    `);

    if (summary.success) {
        console.log('إجمالي القطع حسب الحالة:');
        summary.data.forEach(row => {
            const statusName = row.status === 'in_stock' ? 'في المخزون' :
                              row.status === 'dispatched' ? 'مصروفة' : 'متلفة';
            console.log(`   ${statusName}: ${row.count}`);
        });
    }

    await db.disconnect();
    console.log('\n✅ اكتمل الفحص!');
}

checkInventoryIntegrity();
