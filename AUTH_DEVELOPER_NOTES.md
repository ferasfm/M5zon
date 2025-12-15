# ملاحظات المطورين - نظام المصادقة

## 🏗️ البنية المعمارية

### نمط التصميم
- **Context API** لإدارة الحالة العامة
- **Component-based** للمكونات القابلة لإعادة الاستخدام
- **Protected Routes** لحماية الصفحات
- **Role-based Access Control (RBAC)** للصلاحيات

### تدفق البيانات
```
User Login → AuthContext → PermissionsContext → Protected Components
```

## 🔧 كيفية الاستخدام في المكونات

### 1. استخدام AuthContext

```typescript
import { useAuth } from '../contexts/AuthContext';

const MyComponent = () => {
    const { user, isAuthenticated, login, logout } = useAuth();
    
    if (!isAuthenticated) {
        return <div>يرجى تسجيل الدخول</div>;
    }
    
    return (
        <div>
            <p>مرحباً {user.fullName}</p>
            <button onClick={logout}>تسجيل الخروج</button>
        </div>
    );
};
```

### 2. استخدام PermissionsContext

```typescript
import { usePermissions } from '../contexts/PermissionsContext';

const MyComponent = () => {
    const { canView, canCreate, canEdit, canDelete } = usePermissions();
    
    return (
        <div>
            {canView('products') && <ProductsList />}
            {canCreate('products') && <AddProductButton />}
            {canEdit('products') && <EditProductButton />}
            {canDelete('products') && <DeleteProductButton />}
        </div>
    );
};
```

### 3. حماية صفحة كاملة

```typescript
import ProtectedRoute from './components/ProtectedRoute';

const MyPage = () => {
    return (
        <ProtectedRoute page="products">
            <div>
                <h1>المنتجات</h1>
                {/* محتوى الصفحة */}
            </div>
        </ProtectedRoute>
    );
};
```

### 4. حماية عملية محددة

```typescript
import { usePermissions } from '../contexts/PermissionsContext';

const ProductActions = ({ productId }) => {
    const { canEdit, canDelete } = usePermissions();
    
    const handleEdit = () => {
        if (!canEdit('products')) {
            alert('ليس لديك صلاحية التعديل');
            return;
        }
        // تنفيذ التعديل
    };
    
    const handleDelete = () => {
        if (!canDelete('products')) {
            alert('ليس لديك صلاحية الحذف');
            return;
        }
        // تنفيذ الحذف
    };
    
    return (
        <div>
            {canEdit('products') && (
                <button onClick={handleEdit}>تعديل</button>
            )}
            {canDelete('products') && (
                <button onClick={handleDelete}>حذف</button>
            )}
        </div>
    );
};
```

## 🗄️ التعامل مع قاعدة البيانات

### إضافة مستخدم جديد

```typescript
const addUser = async (userData) => {
    const bcrypt = require('bcryptjs');
    const hashedPassword = await bcrypt.hash(userData.password, 10);
    
    const { data, error } = await supabase
        .from('users')
        .insert([{
            username: userData.username,
            password_hash: hashedPassword,
            full_name: userData.fullName,
            email: userData.email,
            role: userData.role,
            is_active: true,
            must_change_password: true,
            is_first_login: true
        }])
        .select()
        .single();
    
    if (error) throw error;
    return data;
};
```

### تعيين صلاحيات

```typescript
const setPermissions = async (userId, page, permissions) => {
    const { data, error } = await supabase
        .from('permissions')
        .upsert([{
            user_id: userId,
            page: page,
            can_view: permissions.canView,
            can_create: permissions.canCreate,
            can_edit: permissions.canEdit,
            can_delete: permissions.canDelete
        }], {
            onConflict: 'user_id,page'
        });
    
    if (error) throw error;
    return data;
};
```

### التحقق من الصلاحيات

```typescript
const checkPermission = async (userId, page, action) => {
    const { data, error } = await supabase
        .from('permissions')
        .select('*')
        .eq('user_id', userId)
        .eq('page', page)
        .single();
    
    if (error) return false;
    
    switch (action) {
        case 'view': return data.can_view;
        case 'create': return data.can_create;
        case 'edit': return data.can_edit;
        case 'delete': return data.can_delete;
        default: return false;
    }
};
```

## 🎨 إضافة صفحة جديدة محمية

### الخطوة 1: إضافة نوع الصفحة

في `types.ts`:
```typescript
export type Page = 'dashboard' | 'products' | ... | 'new_page';
```

### الخطوة 2: إنشاء المكون

```typescript
import React from 'react';
import ProtectedRoute from './ProtectedRoute';
import { usePermissions } from '../contexts/PermissionsContext';

const NewPage: React.FC = () => {
    const { canCreate, canEdit, canDelete } = usePermissions();
    
    return (
        <ProtectedRoute page="new_page">
            <div>
                <h1>الصفحة الجديدة</h1>
                {canCreate('new_page') && <button>إضافة</button>}
                {/* محتوى الصفحة */}
            </div>
        </ProtectedRoute>
    );
};

export default NewPage;
```

### الخطوة 3: إضافة إلى القائمة

في `Sidebar.tsx`:
```typescript
const navItems = [
    // ...
    { id: 'new_page', label: 'الصفحة الجديدة', icon: <Icons.NewIcon /> },
];
```

### الخطوة 4: إضافة إلى التوجيه

في `App.tsx`:
```typescript
case 'new_page':
    return (
        <ProtectedRoute page="new_page">
            <NewPage />
        </ProtectedRoute>
    );
```

### الخطوة 5: إضافة الصلاحيات الافتراضية

في قاعدة البيانات:
```sql
INSERT INTO permissions (user_id, page, can_view, can_create, can_edit, can_delete)
SELECT id, 'new_page', true, true, true, true
FROM users
WHERE role = 'admin';
```

## 🔐 أفضل الممارسات الأمنية

### 1. تشفير كلمات المرور
```typescript
// ✅ صحيح
const hashedPassword = await bcrypt.hash(password, 10);

// ❌ خطأ
const password = userData.password; // لا تخزن كلمات المرور بشكل نصي
```

### 2. التحقق من الصلاحيات
```typescript
// ✅ صحيح - التحقق قبل العملية
if (!canDelete('products')) {
    throw new Error('ليس لديك صلاحية');
}
await deleteProduct(id);

// ❌ خطأ - عدم التحقق
await deleteProduct(id); // خطر أمني
```

### 3. تنظيف البيانات المدخلة
```typescript
// ✅ صحيح
const username = userData.username.trim().toLowerCase();

// ❌ خطأ
const username = userData.username; // قد يحتوي على مسافات أو أحرف خاصة
```

### 4. معالجة الأخطاء
```typescript
// ✅ صحيح
try {
    await login(username, password);
} catch (error) {
    console.error('خطأ في تسجيل الدخول:', error);
    setError('خطأ في اسم المستخدم أو كلمة المرور');
}

// ❌ خطأ
await login(username, password); // قد يتسبب في توقف التطبيق
```

## 🧪 الاختبار

### اختبار المصادقة

```typescript
describe('AuthContext', () => {
    it('should login successfully', async () => {
        const { result } = renderHook(() => useAuth());
        await act(async () => {
            await result.current.login('admin', 'admin123');
        });
        expect(result.current.isAuthenticated).toBe(true);
    });
    
    it('should fail with wrong password', async () => {
        const { result } = renderHook(() => useAuth());
        await expect(
            result.current.login('admin', 'wrong')
        ).rejects.toThrow();
    });
});
```

### اختبار الصلاحيات

```typescript
describe('PermissionsContext', () => {
    it('should allow admin to view all pages', () => {
        const { result } = renderHook(() => usePermissions(), {
            wrapper: ({ children }) => (
                <AuthProvider>
                    <PermissionsProvider>{children}</PermissionsProvider>
                </AuthProvider>
            )
        });
        
        expect(result.current.canView('products')).toBe(true);
        expect(result.current.canView('users')).toBe(true);
    });
});
```

## 🐛 تصحيح الأخطاء

### تفعيل وضع التصحيح

في `AuthContext.tsx`:
```typescript
const DEBUG = true; // تفعيل وضع التصحيح

if (DEBUG) {
    console.log('Login attempt:', { username, timestamp: new Date() });
}
```

### سجل الأحداث

```typescript
const logEvent = (event: string, data: any) => {
    console.log(`[${new Date().toISOString()}] ${event}:`, data);
};

// الاستخدام
logEvent('USER_LOGIN', { username: user.username });
logEvent('PERMISSION_CHECK', { page, action, result });
```

## 📊 مراقبة الأداء

### قياس وقت التحميل

```typescript
const startTime = performance.now();
await loadPermissions();
const endTime = performance.now();
console.log(`Permissions loaded in ${endTime - startTime}ms`);
```

### تحسين الأداء

```typescript
// ✅ تخزين مؤقت للصلاحيات
const [permissionsCache, setPermissionsCache] = useState({});

const canView = (page: string) => {
    if (permissionsCache[page]) {
        return permissionsCache[page].can_view;
    }
    // تحميل من قاعدة البيانات
};

// ❌ طلب متكرر لقاعدة البيانات
const canView = async (page: string) => {
    const { data } = await supabase.from('permissions')...
};
```

## 🔄 التحديثات المستقبلية

### إضافة ميزة جديدة

1. خطط للميزة
2. صمم قاعدة البيانات
3. أنشئ المكونات
4. اختبر الميزة
5. وثّق الميزة
6. نشر التحديث

### مثال: إضافة المصادقة الثنائية

```typescript
// 1. إضافة حقل في قاعدة البيانات
ALTER TABLE users ADD COLUMN two_factor_enabled BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN two_factor_secret VARCHAR(255);

// 2. إنشاء مكون
const TwoFactorSetup = () => {
    // تنفيذ المكون
};

// 3. تحديث AuthContext
const verifyTwoFactor = async (code: string) => {
    // التحقق من الرمز
};
```

## 📚 موارد إضافية

### المكتبات المستخدمة
- **bcryptjs** - تشفير كلمات المرور
- **React Context API** - إدارة الحالة
- **Supabase** - قاعدة البيانات

### روابط مفيدة
- [React Context API](https://react.dev/reference/react/useContext)
- [bcrypt Documentation](https://www.npmjs.com/package/bcryptjs)
- [Supabase Auth](https://supabase.com/docs/guides/auth)

## 💡 نصائح للمطورين

1. **اقرأ الكود أولاً** - افهم البنية قبل التعديل
2. **اختبر دائماً** - اختبر كل تغيير قبل النشر
3. **وثّق التغييرات** - اكتب تعليقات واضحة
4. **راجع الأمان** - تحقق من الثغرات الأمنية
5. **استخدم Git** - احفظ نسخة احتياطية من الكود

## 🤝 المساهمة

عند إضافة ميزات جديدة:
1. أنشئ فرع جديد
2. اكتب الكود
3. اختبر التغييرات
4. وثّق الميزة
5. أنشئ Pull Request

---

**ملاحظة:** هذا الملف للمطورين فقط. للمستخدمين النهائيين، راجع `QUICK_START_AUTH.md`
