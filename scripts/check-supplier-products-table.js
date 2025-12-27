import pkg from 'pg';
const { Client } = pkg;

const client = new Client({
    host: '172.10.0.16',
    port: 5432,
    database: 'm5zon_local',
    user: 'postgres',
    password: 'P@$$w0rd@1234'
});

async function checkSupplierProductsTable() {
    try {
        console.log('=========================================');
        console.log('🔍 فحص جدول أسعار الموردين');
        console.log('=========================================\n');

        await client.connect();
        console.log('✅ تم الاتصال بقاعدة البيانات\n');

        // 1. التحقق من وجود الجدول
        console.log('📋 1. التحقق من وجود الجدول:');
        const tableCheck = await client.query(`
            SELECT EXISTS (
                SELECT 1 FROM information_schema.tables 
                WHERE table_name = 'supplier_products'
            ) as exists
        `);
        
        if (tableCheck.rows[0].exists) {
            console.log('   ✅ الجدول موجود\n');
        } else {
            console.log('   ❌ الجدول غير موجود\n');
            await client.end();
            return;
        }

        // 2. عدد السجلات
        console.log('📊 2. عدد الأسعار المسجلة:');
        const countResult = await client.query('SELECT COUNT(*) as total FROM supplier_products');
        console.log(`   إجمالي الأسعار: ${countResult.rows[0].total}\n`);

        // 3. هيكل الجدول
        console.log('🏗️  3. هيكل الجدول:');
        const columnsResult = await client.query(`
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns
            WHERE table_name = 'supplier_products'
            ORDER BY ordinal_position
        `);
        console.log('   الأعمدة:');
        columnsResult.rows.forEach(col => {
            console.log(`   - ${col.column_name} (${col.data_type}) ${col.is_nullable === 'NO' ? '- مطلوب' : ''}`);
        });
        console.log('');

        // 4. الفهارس
        console.log('📑 4. الفهارس:');
        const indexesResult = await client.query(`
            SELECT indexname, indexdef
            FROM pg_indexes
            WHERE tablename = 'supplier_products'
        `);
        if (indexesResult.rows.length > 0) {
            indexesResult.rows.forEach(idx => {
                console.log(`   ✅ ${idx.indexname}`);
            });
        } else {
            console.log('   ⚠️  لا توجد فهارس');
        }
        console.log('');

        // 5. الـ Triggers
        console.log('⚡ 5. الـ Triggers:');
        const triggersResult = await client.query(`
            SELECT trigger_name, event_manipulation, action_statement
            FROM information_schema.triggers
            WHERE event_object_table = 'supplier_products'
        `);
        if (triggersResult.rows.length > 0) {
            triggersResult.rows.forEach(trg => {
                console.log(`   ✅ ${trg.trigger_name} (${trg.event_manipulation})`);
            });
        } else {
            console.log('   ⚠️  لا توجد triggers');
        }
        console.log('');

        // 6. أمثلة على البيانات
        if (parseInt(countResult.rows[0].total) > 0) {
            console.log('📝 6. أمثلة على الأسعار (أول 5 سجلات):');
            const samplesResult = await client.query(`
                SELECT 
                    p.name as product_name,
                    s.name as supplier_name,
                    sp.price,
                    sp.is_preferred
                FROM supplier_products sp
                JOIN products p ON sp.product_id = p.id
                JOIN suppliers s ON sp.supplier_id = s.id
                ORDER BY sp.created_at DESC
                LIMIT 5
            `);
            
            samplesResult.rows.forEach((row, index) => {
                console.log(`   ${index + 1}. ${row.product_name}`);
                console.log(`      المورد: ${row.supplier_name}`);
                console.log(`      السعر: ${row.price}`);
                console.log(`      مفضل: ${row.is_preferred ? '⭐ نعم' : 'لا'}`);
                console.log('');
            });
        } else {
            console.log('📝 6. لا توجد بيانات في الجدول بعد\n');
        }

        // 7. التحقق من العلاقات
        console.log('🔗 7. التحقق من العلاقات (Foreign Keys):');
        const fkResult = await client.query(`
            SELECT
                tc.constraint_name,
                kcu.column_name,
                ccu.table_name AS foreign_table_name,
                ccu.column_name AS foreign_column_name
            FROM information_schema.table_constraints AS tc
            JOIN information_schema.key_column_usage AS kcu
                ON tc.constraint_name = kcu.constraint_name
            JOIN information_schema.constraint_column_usage AS ccu
                ON ccu.constraint_name = tc.constraint_name
            WHERE tc.constraint_type = 'FOREIGN KEY'
                AND tc.table_name = 'supplier_products'
        `);
        
        if (fkResult.rows.length > 0) {
            fkResult.rows.forEach(fk => {
                console.log(`   ✅ ${fk.column_name} → ${fk.foreign_table_name}.${fk.foreign_column_name}`);
            });
        } else {
            console.log('   ⚠️  لا توجد علاقات');
        }
        console.log('');

        console.log('=========================================');
        console.log('✅ الفحص اكتمل بنجاح');
        console.log('=========================================');

    } catch (error) {
        console.error('❌ خطأ:', error.message);
        if (error.code === 'ECONNREFUSED') {
            console.error('\n💡 تأكد من:');
            console.error('   - تشغيل PostgreSQL على 172.10.0.16');
            console.error('   - فتح المنفذ 5432');
        } else if (error.code === '28P01') {
            console.error('\n💡 كلمة المرور غير صحيحة');
        }
    } finally {
        await client.end();
    }
}

checkSupplierProductsTable();
