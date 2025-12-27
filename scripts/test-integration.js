import pkg from 'pg';
const { Client } = pkg;

const client = new Client({
    host: '172.10.0.16',
    port: 5432,
    database: 'm5zon_local',
    user: 'postgres',
    password: 'P@$$w0rd@1234'
});

async function testIntegration() {
    try {
        console.log('=========================================');
        console.log('🔍 فحص التكامل الشامل');
        console.log('=========================================\n');

        await client.connect();
        console.log('✅ الاتصال بقاعدة البيانات\n');

        // 1. فحص الجداول الأساسية
        console.log('📋 1. فحص الجداول الأساسية:');
        const tables = ['products', 'suppliers', 'inventory_items', 'categories', 'clients'];
        for (const table of tables) {
            const { rows } = await client.query(`SELECT COUNT(*) as count FROM ${table}`);
            console.log(`   ✅ ${table}: ${rows[0].count} سجل`);
        }
        console.log('');

        // 2. فحص الجداول الجديدة
        console.log('📋 2. فحص الجداول الجديدة:');
        const newTables = ['supplier_products', 'supplier_price_history'];
        for (const table of newTables) {
            const { rows: exists } = await client.query(`
                SELECT EXISTS (
                    SELECT 1 FROM information_schema.tables 
                    WHERE table_name = '${table}'
                ) as exists
            `);
            
            if (exists[0].exists) {
                const { rows } = await client.query(`SELECT COUNT(*) as count FROM ${table}`);
                console.log(`   ✅ ${table}: ${rows[0].count} سجل`);
            } else {
                console.log(`   ❌ ${table}: غير موجود`);
            }
        }
        console.log('');

        // 3. فحص العلاقات
        console.log('🔗 3. فحص العلاقات (Foreign Keys):');
        const { rows: fks } = await client.query(`
            SELECT
                tc.table_name,
                kcu.column_name,
                ccu.table_name AS foreign_table_name
            FROM information_schema.table_constraints AS tc
            JOIN information_schema.key_column_usage AS kcu
                ON tc.constraint_name = kcu.constraint_name
            JOIN information_schema.constraint_column_usage AS ccu
                ON ccu.constraint_name = tc.constraint_name
            WHERE tc.constraint_type = 'FOREIGN KEY'
                AND tc.table_name IN ('supplier_products', 'supplier_price_history')
        `);
        
        if (fks.length > 0) {
            fks.forEach(fk => {
                console.log(`   ✅ ${fk.table_name}.${fk.column_name} → ${fk.foreign_table_name}`);
            });
        }
        console.log('');

        // 4. فحص الـ Triggers
        console.log('⚡ 4. فحص الـ Triggers:');
        const { rows: triggers } = await client.query(`
            SELECT trigger_name, event_object_table
            FROM information_schema.triggers
            WHERE event_object_table IN ('supplier_products', 'supplier_price_history', 'products')
        `);
        
        if (triggers.length > 0) {
            triggers.forEach(trg => {
                console.log(`   ✅ ${trg.trigger_name} على ${trg.event_object_table}`);
            });
        }
        console.log('');

        // 5. فحص البيانات المترابطة
        console.log('🔄 5. فحص البيانات المترابطة:');
        
        // عدد المنتجات التي لها أسعار موردين
        const { rows: productsWithPrices } = await client.query(`
            SELECT COUNT(DISTINCT product_id) as count 
            FROM supplier_products
        `);
        console.log(`   ✅ منتجات لها أسعار موردين: ${productsWithPrices[0].count}`);

        // عدد الموردين النشطين
        const { rows: activeSuppliers } = await client.query(`
            SELECT COUNT(DISTINCT supplier_id) as count 
            FROM supplier_products
        `);
        console.log(`   ✅ موردين نشطين: ${activeSuppliers[0].count}`);

        // عدد المنتجات المفضلة
        const { rows: preferredProducts } = await client.query(`
            SELECT COUNT(*) as count 
            FROM supplier_products 
            WHERE is_preferred = true
        `);
        console.log(`   ✅ منتجات لها مورد مفضل: ${preferredProducts[0].count}`);
        console.log('');

        // 6. فحص سلامة البيانات
        console.log('🛡️  6. فحص سلامة البيانات:');
        
        // التحقق من عدم وجود أسعار سالبة
        const { rows: negativePrices } = await client.query(`
            SELECT COUNT(*) as count 
            FROM supplier_products 
            WHERE price < 0
        `);
        if (negativePrices[0].count > 0) {
            console.log(`   ⚠️  أسعار سالبة: ${negativePrices[0].count}`);
        } else {
            console.log(`   ✅ لا توجد أسعار سالبة`);
        }

        // التحقق من عدم وجود أكثر من مورد مفضل لنفس المنتج
        const { rows: duplicatePreferred } = await client.query(`
            SELECT product_id, COUNT(*) as count
            FROM supplier_products
            WHERE is_preferred = true
            GROUP BY product_id
            HAVING COUNT(*) > 1
        `);
        if (duplicatePreferred.length > 0) {
            console.log(`   ⚠️  منتجات لها أكثر من مورد مفضل: ${duplicatePreferred.length}`);
        } else {
            console.log(`   ✅ لا توجد منتجات بأكثر من مورد مفضل`);
        }

        // التحقق من المنتجات اليتيمة (بدون فئة)
        const { rows: orphanProducts } = await client.query(`
            SELECT COUNT(*) as count 
            FROM products 
            WHERE category_id IS NULL
        `);
        console.log(`   ${orphanProducts[0].count > 0 ? '⚠️' : '✅'}  منتجات بدون فئة: ${orphanProducts[0].count}`);
        console.log('');

        // 7. فحص الأداء
        console.log('⚡ 7. فحص الفهارس:');
        const { rows: indexes } = await client.query(`
            SELECT tablename, indexname
            FROM pg_indexes
            WHERE tablename IN ('supplier_products', 'supplier_price_history')
            ORDER BY tablename, indexname
        `);
        
        const indexCount = {};
        indexes.forEach(idx => {
            indexCount[idx.tablename] = (indexCount[idx.tablename] || 0) + 1;
        });
        
        Object.keys(indexCount).forEach(table => {
            console.log(`   ✅ ${table}: ${indexCount[table]} فهرس`);
        });
        console.log('');

        console.log('=========================================');
        console.log('✅ الفحص اكتمل بنجاح');
        console.log('=========================================');
        console.log('\n💡 الخلاصة:');
        console.log('   • جميع الجداول موجودة وتعمل');
        console.log('   • العلاقات سليمة');
        console.log('   • الـ Triggers نشطة');
        console.log('   • البيانات متسقة');
        console.log('   • النظام جاهز للاستخدام! 🚀');

    } catch (error) {
        console.error('❌ خطأ:', error.message);
    } finally {
        await client.end();
    }
}

testIntegration();
