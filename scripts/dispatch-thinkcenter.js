import db from '../electron/database.js';

async function dispatchThinkCenter() {
    console.log('🔄 صرف كمبيوتر ThinkCenterGen4...\n');

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

    // 1. البحث عن القطعة المتاحة
    console.log('🔍 البحث عن القطعة المتاحة...');
    const findResult = await db.query(`
        SELECT i.id, i.serial_number, p.name
        FROM inventory_items i
        JOIN products p ON i.product_id = p.id
        WHERE p.name LIKE '%ThinkCenter%' 
        AND i.status = 'in_stock'
    `);

    if (!findResult.success || findResult.data.length === 0) {
        console.log('✅ لا توجد قطع متاحة - العدد بالفعل 0');
        await db.disconnect();
        return;
    }

    const item = findResult.data[0];
    console.log(`📦 وجدت: ${item.name} - ${item.serial_number}`);
    console.log(`   ID: ${item.id}\n`);

    // 2. الحصول على عميل "ريو" (نفس العميل السابق)
    console.log('🔍 البحث عن العميل...');
    const clientResult = await db.query(`
        SELECT id, name FROM clients WHERE name LIKE '%ريو%' LIMIT 1
    `);

    let clientId;
    if (clientResult.success && clientResult.data.length > 0) {
        clientId = clientResult.data[0].id;
        console.log(`✅ العميل: ${clientResult.data[0].name}\n`);
    } else {
        console.log('⚠️  لم يتم العثور على عميل "ريو"، سيتم استخدام أول عميل متاح...');
        const anyClient = await db.query(`SELECT id, name FROM clients LIMIT 1`);
        if (anyClient.success && anyClient.data.length > 0) {
            clientId = anyClient.data[0].id;
            console.log(`✅ العميل: ${anyClient.data[0].name}\n`);
        } else {
            console.error('❌ لا يوجد عملاء في النظام!');
            await db.disconnect();
            return;
        }
    }

    // 3. صرف القطعة
    console.log('📤 صرف القطعة...');
    const dispatchResult = await db.query(`
        UPDATE inventory_items
        SET 
            status = $1,
            dispatch_client_id = $2,
            dispatch_date = $3,
            dispatch_reason = $4,
            dispatch_notes = $5
        WHERE id = $6
        RETURNING *
    `, [
        'dispatched',
        clientId,
        new Date(),
        'صرف إداري',
        'تم الصرف لتصحيح المخزون',
        item.id
    ]);

    if (dispatchResult.success) {
        console.log('✅ تم صرف القطعة بنجاح!\n');
        
        // 4. التحقق من النتيجة
        console.log('🔍 التحقق من المخزون الحالي...');
        const verifyResult = await db.query(`
            SELECT 
                COUNT(*) FILTER (WHERE status = 'in_stock') as available,
                COUNT(*) FILTER (WHERE status = 'dispatched') as dispatched,
                COUNT(*) as total
            FROM inventory_items i
            JOIN products p ON i.product_id = p.id
            WHERE p.name LIKE '%ThinkCenter%'
        `);

        if (verifyResult.success && verifyResult.data.length > 0) {
            const stats = verifyResult.data[0];
            console.log('📊 الإحصائيات الجديدة:');
            console.log(`   متاح: ${stats.available}`);
            console.log(`   مصروف: ${stats.dispatched}`);
            console.log(`   الإجمالي: ${stats.total}`);
        }
    } else {
        console.error('❌ فشل الصرف:', dispatchResult.error);
    }

    await db.disconnect();
    console.log('\n✅ تم الانتهاء!');
}

dispatchThinkCenter();
