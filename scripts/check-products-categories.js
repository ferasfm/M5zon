// سكريبت للتحقق من حالة فئات المنتجات في قاعدة البيانات
const { Client } = require('pg');

async function checkProductsCategories() {
    const client = new Client({
        host: '172.10.0.16',
        port: 5432,
        database: 'postgres', // غيّر هذا إلى اسم قاعدة بياناتك
        user: 'postgres',
        password: 'P@$$w0rd@1234' // غيّر هذا إلى كلمة المرور
    });

    try {
        await client.connect();
        console.log('✅ تم الاتصال بقاعدة البيانات\n');

        // 1. عرض جميع الفئات
        console.log('📂 الفئات المتاحة:');
        console.log('='.repeat(60));
        const categoriesResult = await client.query('SELECT id, name FROM categories ORDER BY name');
        categoriesResult.rows.forEach(cat => {
            console.log(`  ${cat.name} (ID: ${cat.id.substring(0, 8)}...)`);
        });

        // 2. عرض المنتجات وفئاتها
        console.log('\n📦 المنتجات وفئاتها:');
        console.log('='.repeat(60));
        const productsResult = await client.query(`
            SELECT 
                p.id,
                p.name,
                p.sku,
                p.category as category_text,
                p.category_id,
                c.name as category_from_table
            FROM products p
            LEFT JOIN categories c ON p.category_id = c.id
            ORDER BY p.name
        `);

        productsResult.rows.forEach(prod => {
            const status = prod.category_id 
                ? (prod.category_text === prod.category_from_table ? '✅' : '⚠️')
                : '❌';
            
            console.log(`${status} ${prod.name}`);
            console.log(`   SKU: ${prod.sku}`);
            console.log(`   category (نص): "${prod.category_text || 'NULL'}"`);
            console.log(`   category_id: ${prod.category_id ? prod.category_id.substring(0, 8) + '...' : 'NULL'}`);
            console.log(`   الفئة من الجدول: "${prod.category_from_table || 'NULL'}"`);
            console.log('');
        });

        // 3. إحصائيات
        console.log('\n📊 الإحصائيات:');
        console.log('='.repeat(60));
        const statsResult = await client.query(`
            SELECT 
                COUNT(*) as total,
                COUNT(category_id) as with_category_id,
                COUNT(CASE WHEN category_id IS NULL AND category IS NOT NULL THEN 1 END) as old_products,
                COUNT(CASE WHEN category_id IS NULL AND category IS NULL THEN 1 END) as no_category
            FROM products
        `);
        
        const stats = statsResult.rows[0];
        console.log(`  إجمالي المنتجات: ${stats.total}`);
        console.log(`  منتجات لديها category_id: ${stats.with_category_id}`);
        console.log(`  منتجات قديمة (category فقط): ${stats.old_products}`);
        console.log(`  منتجات بدون فئة: ${stats.no_category}`);

    } catch (error) {
        console.error('❌ خطأ:', error.message);
    } finally {
        await client.end();
    }
}

checkProductsCategories();
