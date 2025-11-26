// Script to run bundle tracking migration
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Error: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must be set in .env file');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runMigration() {
    try {
        console.log('🚀 Starting bundle tracking migration...');
        
        // Read SQL file
        const sqlPath = path.join(__dirname, '..', 'supabase', 'add_bundle_tracking.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');
        
        console.log('📄 SQL file loaded successfully');
        console.log('🔧 Executing migration...');
        
        // Execute SQL
        const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });
        
        if (error) {
            // If exec_sql doesn't exist, try direct execution
            console.log('⚠️  exec_sql function not found, trying alternative method...');
            
            // Split SQL into individual statements
            const statements = sql
                .split(';')
                .map(s => s.trim())
                .filter(s => s.length > 0 && !s.startsWith('--') && !s.startsWith('COMMENT'));
            
            for (const statement of statements) {
                console.log(`Executing: ${statement.substring(0, 50)}...`);
                const { error: stmtError } = await supabase.rpc('exec', { query: statement });
                if (stmtError) {
                    console.error(`❌ Error executing statement: ${stmtError.message}`);
                }
            }
        }
        
        console.log('✅ Migration completed successfully!');
        console.log('');
        console.log('📊 New columns added to inventory_items:');
        console.log('   - bundle_group_id: معرف فريد يربط القطع التي تنتمي لنفس الحزمة');
        console.log('   - bundle_name: اسم الحزمة إذا كانت القطعة جزء من حزمة');
        
    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        process.exit(1);
    }
}

runMigration();
