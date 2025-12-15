import db from '../electron/database.js';

async function checkProductsTable() {
    console.log('🔍 فحص بنية جدول products...\n');

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

    // 1. فحص أعمدة الجدول
    console.log('📋 أعمدة جدول products:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    const columnsResult = await db.query(`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns
        WHERE table_name = 'products'
        ORDER BY ordinal_position
    `);

    if (columnsResult.success) {
        columnsResult.data.forEach(col => {
            console.log(`  ${col.column_name.padEnd(30)} ${col.data_type.padEnd(20)} ${col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'}`);
        });
    }

    // 2. فحص القيود (Constraints)
    console.log('\n🔒 القيود على الجدول:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    const constraintsResult = await db.query(`
        SELECT constraint_name, constraint_type
        FROM information_schema.table_constraints
        WHERE table_name = 'products'
    `);

    if (constraintsResult.success) {
        constraintsResult.data.forEach(con => {
            console.log(`  ${con.constraint_name.padEnd(40)} ${con.constraint_type}`);
        });
    }

    // 3. محاولة إضافة منتج تجريبي
    console.log('\n🧪 اختبار إضافة منتج تجريبي:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
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

    console.log('📝 البيانات المُرسلة:', JSON.stringify(testProduct, null, 2));

    const keys = Object.keys(testProduct);
    const values = Object.values(testProduct);
    const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
    
    const insertSql = `INSERT INTO products (${keys.join(', ')}) VALUES (${placeholders}) RETURNING *`;
    
    console.log('\n📊 SQL:', insertSql);
    console.log('📊 Values:', values);

    const insertResult = await db.query(insertSql, values);

    if (insertResult.success) {
        console.log('\n✅ تمت الإضافة بنجاح!');
        console.log('📦 البيانات المُرجعة:', JSON.stringify(insertResult.data[0], null, 2));
        
        // حذف المنتج التجريبي
        const deleteResult = await db.query('DELETE FROM products WHERE id = $1', [insertResult.data[0].id]);
        if (deleteResult.success) {
            console.log('\n🗑️ تم حذف المنتج التجريبي');
        }
    } else {
        console.error('\n❌ فشلت الإضافة:', insertResult.error);
    }

    await db.disconnect();
}

checkProductsTable();
