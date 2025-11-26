// Simple script to add bundle tracking columns using Supabase client
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ خطأ: يجب تعيين VITE_SUPABASE_URL و VITE_SUPABASE_ANON_KEY في ملف .env');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function addBundleColumns() {
    console.log('🚀 بدء إضافة أعمدة تتبع الحزم...');
    console.log('');
    
    try {
        // Test connection first
        const { data: testData, error: testError } = await supabase
            .from('inventory_items')
            .select('id')
            .limit(1);
        
        if (testError) {
            console.error('❌ خطأ في الاتصال بقاعدة البيانات:', testError.message);
            process.exit(1);
        }
        
        console.log('✅ الاتصال بقاعدة البيانات ناجح');
        console.log('');
        console.log('⚠️  ملاحظة: يجب تشغيل SQL التالي يدوياً في Supabase Dashboard:');
        console.log('');
        console.log('-- إضافة أعمدة تتبع الحزم');
        console.log('ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS bundle_group_id TEXT;');
        console.log('ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS bundle_name TEXT;');
        console.log('');
        console.log('-- إضافة فهرس للأداء');
        console.log('CREATE INDEX IF NOT EXISTS idx_inventory_items_bundle_group');
        console.log('ON inventory_items(bundle_group_id)');
        console.log('WHERE bundle_group_id IS NOT NULL;');
        console.log('');
        console.log('📋 الخطوات:');
        console.log('1. افتح Supabase Dashboard');
        console.log('2. اذهب إلى SQL Editor');
        console.log('3. انسخ والصق الأوامر أعلاه');
        console.log('4. اضغط Run');
        console.log('');
        console.log('أو يمكنك تشغيل الملف: supabase/add_bundle_tracking.sql');
        
    } catch (error) {
        console.error('❌ خطأ:', error.message);
        process.exit(1);
    }
}

addBundleColumns();
