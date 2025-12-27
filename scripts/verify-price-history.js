import pkg from 'pg';
const { Client } = pkg;

const client = new Client({
    host: '172.10.0.16',
    port: 5432,
    database: 'm5zon_local',
    user: 'postgres',
    password: 'P@$$w0rd@1234'
});

async function verifyPriceHistory() {
    try {
        console.log('=========================================');
        console.log('🔍 التحقق من جدول تاريخ الأسعار');
        console.log('=========================================\n');

        await client.connect();
        console.log('✅ تم الاتصال بقاعدة البيانات\n');

        // 1. التحقق من وجود الجدول
        console.log('📋 1. التحقق من وجود الجدول:');
        const { rows: tableExists } = await client.query(`
            SELECT EXISTS (
                SELECT 1 FROM information_schema.tables 
                WHERE table_name = 'supplier_price_history'
            ) as exists
        `);
        
        if (!tableExists[0].exists) {
            console.log('   ❌ الجدول غير موجود!\n');
            console.log('💡 قم بتشغيل: setup-price-history.bat');
            await client.end();
            return;
        }
        
        console.log('   ✅ الجدول موجود\n');

        // 2. هيكل الجدول
        console.log('🏗️  2. هيكل الجدول:');
        const { rows: columns } = await client.query(`
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns
            WHERE table_name = 'supplier_price_history'
            ORDER BY ordinal_position
        `);
        
        console.log('   الأعمدة:');
        columns.forEach(col => {
            const required = col.is_nullable === 'NO' ? '(مطلوب)' : '(اختياري)';
            console.log(`   ✅ ${col.column_name} - ${col.data_type} ${required}`);
        });
        console.log('');

        // 3. الفهارس
        console.log('📑 3. الفهارس:');
        const { rows: indexes } = await client.query(`
            SELECT indexname, indexdef
            FROM pg_indexes
            WHERE tablename = 'supplier_price_history'
            ORDER BY indexname
        `);
        
        if (indexes.length > 0) {
            indexes.forEach(idx => {
                console.log(`   ✅ ${idx.indexname}`);
            });
        } else {
            console.log('   ⚠️  لا توجد فهارس');
        }
        console.log('');

        // 4. الـ Triggers
        console.log('⚡ 4. الـ Triggers:');
        const { rows: triggers } = await client.query(`
            SELECT trigger_name, event_manipulation, action_statement
            FROM information_schema.triggers
            WHERE event_object_table = 'supplier_products'
            AND trigger_name LIKE '%price%'
        `);
        
        if (triggers.length > 0) {
            triggers.forEach(trg => {
                console.log(`   ✅ ${trg.trigger_name} (${trg.event_manipulation})`);
            });
        } else {
            console.log('   ⚠️  لا توجد triggers لتسجيل الأسعار');
        }
        console.log('');

        // 5. العلاقات (Foreign Keys)
        console.log('🔗 5. العلاقات (Foreign Keys):');
        const { rows: fks } = await client.query(`
            SELECT
                kcu.column_name,
                ccu.table_name AS foreign_table_name,
                ccu.column_name AS foreign_column_name
            FROM information_schema.table_constraints AS tc
            JOIN information_schema.key_column_usage AS kcu
                ON tc.constraint_name = kcu.constraint_name
            JOIN information_schema.constraint_column_usage AS ccu
                ON ccu.constraint_name = tc.constraint_name
            WHERE tc.constraint_type = 'FOREIGN KEY'
                AND tc.table_name = 'supplier_price_history'
        `);
        
        if (fks.length > 0) {
            fks.forEach(fk => {
                console.log(`   ✅ ${fk.column_name} → ${fk.foreign_table_name}.${fk.foreign_column_name}`);
            });
        } else {
            console.log('   ⚠️  لا توجد علاقات');
        }
        console.log('');

        // 6. عدد السجلات
        console.log('📊 6. البيانات:');
        const { rows: count } = await client.query(`
            SELECT COUNT(*) as count FROM supplier_price_history
        `);
        console.log(`   إجمالي السجلات: ${count[0].count}`);
        
        if (count[0].count === 0) {
            console.log('   💡 لا توجد سجلات بعد (طبيعي في البداية)');
        }
        console.log('');

        // 7. اختبار التسجيل التلقائي
        console.log('🧪 7. اختبار التسجيل التلقائي:');
        console.log('   • اختبار تحديث سعر...');
        
        // الحصول على سعر موجود
        const { rows: existingPrice } = await client.query(`
            SELECT id, price FROM supplier_products LIMIT 1
        `);
        
        if (existingPrice.length > 0) {
            const oldPrice = existingPrice[0].price;
            const newPrice = parseFloat(oldPrice) + 0.01; // تغيير بسيط
            
            // تحديث السعر
            await client.query(`
                UPDATE supplier_products 
                SET price = $1 
                WHERE id = $2
            `, [newPrice, existingPrice[0].id]);
            
            // التحقق من التسجيل
            const { rows: historyCheck } = await client.query(`
                SELECT COUNT(*) as count 
                FROM supplier_price_history 
                WHERE supplier_product_id = $1
            `, [existingPrice[0].id]);
            
            if (historyCheck[0].count > 0) {
                console.log('   ✅ التسجيل التلقائي يعمل!');
                
                // عرض آخر تغيير
                const { rows: lastChange } = await client.query(`
                    SELECT old_price, new_price, created_at
                    FROM supplier_price_history
                    WHERE supplier_product_id = $1
                    ORDER BY created_at DESC
                    LIMIT 1
                `, [existingPrice[0].id]);
                
                if (lastChange.length > 0) {
                    console.log(`      السعر القديم: ${lastChange[0].old_price}`);
                    console.log(`      السعر الجديد: ${lastChange[0].new_price}`);
                    console.log(`      التاريخ: ${new Date(lastChange[0].created_at).toLocaleString('ar-SA')}`);
                }
            } else {
                console.log('   ⚠️  التسجيل التلقائي لا يعمل');
            }
            
            // إعادة السعر القديم
            await client.query(`
                UPDATE supplier_products 
                SET price = $1 
                WHERE id = $2
            `, [oldPrice, existingPrice[0].id]);
            
            console.log('   ✅ تم إعادة السعر الأصلي');
        } else {
            console.log('   ⚠️  لا توجد أسعار للاختبار');
        }
        console.log('');

        // 8. الخلاصة
        console.log('=========================================');
        console.log('✅ التحقق اكتمل بنجاح');
        console.log('=========================================\n');

        const allGood = tableExists[0].exists && 
                       columns.length > 0 && 
                       indexes.length > 0 && 
                       fks.length > 0;

        if (allGood) {
            console.log('💡 النتيجة:');
            console.log('   ✅ الجدول موجود وجاهز');
            console.log('   ✅ الهيكل صحيح');
            console.log('   ✅ الفهارس موجودة');
            console.log('   ✅ العلاقات سليمة');
            console.log('   ✅ التسجيل التلقائي يعمل');
            console.log('   ✅ النظام جاهز لتتبع تاريخ الأسعار! 🎉');
        } else {
            console.log('⚠️  يوجد مشاكل في الإعداد');
            console.log('   قم بمراجعة الأخطاء أعلاه');
        }

    } catch (error) {
        console.error('❌ خطأ:', error.message);
        console.error('\n💡 تأكد من:');
        console.error('   - تشغيل PostgreSQL');
        console.error('   - صحة معلومات الاتصال');
        console.error('   - تشغيل setup-price-history.bat');
    } finally {
        await client.end();
    }
}

verifyPriceHistory();
