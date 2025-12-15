import db from '../electron/database.js';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function setupAuthSystem() {
    console.log('🔐 إعداد نظام المصادقة والصلاحيات...\n');

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

    try {
        // 1. إنشاء جدول المستخدمين
        console.log('📊 1. إنشاء جدول المستخدمين...');
        const usersTableSql = fs.readFileSync(
            path.join(__dirname, '../supabase/create_users_table.sql'),
            'utf8'
        );
        await db.query(usersTableSql);
        console.log('✅ تم إنشاء جدول users\n');

        // 2. إنشاء جدول الصلاحيات
        console.log('📊 2. إنشاء جدول الصلاحيات...');
        const permissionsTableSql = fs.readFileSync(
            path.join(__dirname, '../supabase/create_permissions_table.sql'),
            'utf8'
        );
        await db.query(permissionsTableSql);
        console.log('✅ تم إنشاء جدول permissions\n');

        // 3. إنشاء جدول إعادة تعيين كلمة المرور
        console.log('📊 3. إنشاء جدول إعادة تعيين كلمة المرور...');
        const resetTableSql = fs.readFileSync(
            path.join(__dirname, '../supabase/create_password_resets_table.sql'),
            'utf8'
        );
        await db.query(resetTableSql);
        console.log('✅ تم إنشاء جدول password_resets\n');

        // 4. إنشاء جدول سجل التدقيق
        console.log('📊 4. إنشاء جدول سجل التدقيق...');
        const auditTableSql = fs.readFileSync(
            path.join(__dirname, '../supabase/create_audit_log_table.sql'),
            'utf8'
        );
        await db.query(auditTableSql);
        console.log('✅ تم إنشاء جدول audit_log\n');

        // 5. إدراج الصلاحيات الافتراضية
        console.log('📊 5. إدراج الصلاحيات الافتراضية...');
        const permissionsSql = fs.readFileSync(
            path.join(__dirname, '../supabase/insert_default_permissions.sql'),
            'utf8'
        );
        await db.query(permissionsSql);
        console.log('✅ تم إدراج الصلاحيات الافتراضية\n');

        // 6. التحقق من وجود مستخدم admin
        console.log('📊 6. التحقق من وجود مستخدم admin...');
        const checkAdmin = await db.query('SELECT id FROM users WHERE username = $1', ['admin']);
        
        if (checkAdmin.success && checkAdmin.data.length === 0) {
            // إنشاء مستخدم admin
            console.log('👤 إنشاء مستخدم admin...');
            const passwordHash = await bcrypt.hash('admin', 10);
            
            const insertAdmin = await db.query(`
                INSERT INTO users (username, email, password_hash, role, must_change_password, is_first_login)
                VALUES ($1, $2, $3, $4, $5, $6)
                RETURNING id, username, email
            `, ['admin', 'it@alhuda.ps', passwordHash, 'admin', true, true]);

            if (insertAdmin.success) {
                console.log('✅ تم إنشاء مستخدم admin بنجاح');
                console.log('   Username: admin');
                console.log('   Password: admin (يجب تغييره عند أول دخول)');
                console.log('   Email: it@alhuda.ps\n');
            }
        } else {
            console.log('ℹ️  مستخدم admin موجود بالفعل\n');
        }

        // 7. عرض ملخص
        console.log('═'.repeat(60));
        console.log('📋 ملخص النظام:');
        console.log('═'.repeat(60));

        const usersCount = await db.query('SELECT COUNT(*) as count FROM users');
        const permissionsCount = await db.query('SELECT COUNT(*) as count FROM permissions');

        console.log(`👥 عدد المستخدمين: ${usersCount.data[0].count}`);
        console.log(`🔐 عدد الصلاحيات: ${permissionsCount.data[0].count}`);
        
        console.log('\n✅ تم إعداد نظام المصادقة والصلاحيات بنجاح!');

    } catch (error) {
        console.error('❌ حدث خطأ:', error);
    }

    await db.disconnect();
}

setupAuthSystem();
