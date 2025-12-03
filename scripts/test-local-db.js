import { createRequire } from 'module';
import path from 'path';
import { fileURLToPath } from 'url';

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import db from '../electron/database.js';

async function testConnection() {
    console.log('🔄 Testing connection to Local Database...');

    const config = {
        host: '172.10.0.16',
        port: 5432,
        database: 'm5zon_local',
        user: 'postgres',
        password: 'P@$$w0rd@1234'
    };

    console.log(`📡 Connecting to ${config.host}:${config.port}/${config.database} as ${config.user}...`);

    const connectResult = await db.connect(config);

    if (connectResult.success) {
        console.log('✅ Connection Successful!');

        console.log('🔍 Running test query: SELECT NOW()...');
        const queryResult = await db.query('SELECT NOW() as current_time');

        if (queryResult.success) {
            console.log('✅ Query Successful!');
            console.log('🕒 Server Time:', queryResult.data[0].current_time);

            console.log('🔍 Checking tables...');
            const tablesResult = await db.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'");
            if (tablesResult.success) {
                console.log('📂 Tables found:', tablesResult.data.map(t => t.table_name).join(', '));
            }
        } else {
            console.error('❌ Query Failed:', queryResult.error);
        }

        await db.disconnect();
        console.log('🔌 Disconnected.');
    } else {
        console.error('❌ Connection Failed:', connectResult.error);
        console.log('\n💡 Troubleshooting Tips:');
        console.log('1. Check if PostgreSQL service is running.');
        console.log('2. Verify the IP address (172.10.0.16) is correct.');
        console.log('3. Check if firewall is allowing port 5432.');
        console.log('4. Verify pg_hba.conf allows connections from this host.');
    }
}

testConnection();
