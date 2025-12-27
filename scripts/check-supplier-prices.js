import pkg from 'pg';
const { Client } = pkg;

const client = new Client({
    host: '172.10.0.16',
    port: 5432,
    database: 'm5zon_local',
    user: 'postgres',
    password: 'P@$$w0rd@1234'
});

async function checkPrices() {
    try {
        await client.connect();
        console.log('✅ متصل\n');

        // فحص الأسعار
        const { rows } = await client.query(`
            SELECT 
                p.name as product_name,
                sp.price,
                sp.is_preferred,
                s.name as supplier_name
            FROM supplier_products sp
            JOIN products p ON sp.product_id = p.id
            JOIN suppliers s ON sp.supplier_id = s.id
            LIMIT 5
        `);

        console.log('📊 عينة من الأسعار:\n');
        rows.forEach(row => {
            console.log(`المنتج: ${row.product_name}`);
            console.log(`المورد: ${row.supplier_name}`);
            console.log(`السعر: ${row.price} (نوع: ${typeof row.price})`);
            console.log(`مفضل: ${row.is_preferred}`);
            console.log('---');
        });

    } catch (error) {
        console.error('❌ خطأ:', error.message);
    } finally {
        await client.end();
    }
}

checkPrices();
