import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import bcrypt from 'bcryptjs';

interface User {
    id: string;
    username: string;
    fullName: string;
    email: string;
    role: string;
    isFirstLogin: boolean;
    mustChangePassword: boolean;
}

interface AuthContextType {
    user: User | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    login: (username: string, password: string) => Promise<{ success: boolean; error?: string; mustChangePassword?: boolean }>;
    logout: () => void;
    changePassword: (oldPassword: string, newPassword: string) => Promise<{ success: boolean; error?: string }>;
    resetPassword: (email: string) => Promise<{ success: boolean; token?: string; error?: string }>;
    confirmPasswordReset: (token: string, newPassword: string) => Promise<{ success: boolean; error?: string }>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{ children: ReactNode; supabase: any }> = ({ children, supabase }) => {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // التحقق من الجلسة المحفوظة
        const checkSession = async () => {
            // إذا لم يكن supabase جاهزاً، انتظر
            if (!supabase) {
                setIsLoading(false);
                return;
            }

            const savedUser = localStorage.getItem('currentUser');
            
            // إذا لم توجد جلسة محفوظة، اعرض صفحة تسجيل الدخول
            if (!savedUser) {
                setIsLoading(false);
                return;
            }

            try {
                const userData = JSON.parse(savedUser);
                
                // التحقق من صلاحية الجلسة من قاعدة البيانات
                const { data, error } = await supabase
                    .from('users')
                    .select('id, username, full_name, email, role, is_active, must_change_password, is_first_login')
                    .eq('id', userData.id)
                    .eq('is_active', true)
                    .single();
                
                if (data && !error) {
                    // الجلسة صالحة
                    setUser({
                        id: data.id,
                        username: data.username,
                        fullName: data.full_name,
                        email: data.email,
                        role: data.role,
                        isFirstLogin: data.is_first_login,
                        mustChangePassword: data.must_change_password
                    });
                } else {
                    // الجلسة غير صالحة - امسحها
                    console.log('جلسة غير صالحة، سيتم مسحها');
                    localStorage.removeItem('currentUser');
                    setUser(null);
                }
            } catch (error) {
                console.error('خطأ في التحقق من الجلسة:', error);
                localStorage.removeItem('currentUser');
                setUser(null);
            }
            
            setIsLoading(false);
        };
        
        checkSession();
    }, [supabase]);

    const login = async (username: string, password: string) => {
        try {
            // البحث عن المستخدم
            const { data: users, error } = await supabase
                .from('users')
                .select('*')
                .eq('username', username)
                .eq('is_active', true);

            if (error) {
                return { success: false, error: 'خطأ في الاتصال بقاعدة البيانات' };
            }

            if (!users || users.length === 0) {
                return { success: false, error: 'اسم المستخدم أو كلمة المرور غير صحيحة' };
            }

            const dbUser = users[0];

            // التحقق من قفل الحساب
            if (dbUser.locked_until && new Date(dbUser.locked_until) > new Date()) {
                const remainingMinutes = Math.ceil((new Date(dbUser.locked_until).getTime() - Date.now()) / 60000);
                return { 
                    success: false, 
                    error: `الحساب مقفل. حاول مرة أخرى بعد ${remainingMinutes} دقيقة` 
                };
            }

            // التحقق من كلمة المرور
            const isPasswordValid = await bcrypt.compare(password, dbUser.password_hash);

            if (!isPasswordValid) {
                // زيادة عدد المحاولات الفاشلة
                const failedAttempts = (dbUser.failed_login_attempts || 0) + 1;
                const updates: any = { failed_login_attempts: failedAttempts };

                // قفل الحساب بعد 5 محاولات
                if (failedAttempts >= 5) {
                    const lockUntil = new Date(Date.now() + 30 * 60 * 1000); // 30 دقيقة
                    updates.locked_until = lockUntil;
                }

                await supabase
                    .from('users')
                    .update(updates)
                    .eq('id', dbUser.id);

                if (failedAttempts >= 5) {
                    return { success: false, error: 'تم قفل الحساب لمدة 30 دقيقة بسبب المحاولات الفاشلة المتكررة' };
                }

                return { 
                    success: false, 
                    error: `كلمة المرور غير صحيحة. المحاولات المتبقية: ${5 - failedAttempts}` 
                };
            }

            // تسجيل دخول ناجح
            await supabase
                .from('users')
                .update({
                    last_login: new Date(),
                    failed_login_attempts: 0,
                    locked_until: null
                })
                .eq('id', dbUser.id);

            // تسجيل في audit log
            await supabase
                .from('audit_log')
                .insert({
                    user_id: dbUser.id,
                    username: dbUser.username,
                    action: 'login',
                    created_at: new Date()
                });

            const userData: User = {
                id: dbUser.id,
                username: dbUser.username,
                fullName: dbUser.full_name,
                email: dbUser.email,
                role: dbUser.role,
                isFirstLogin: dbUser.is_first_login,
                mustChangePassword: dbUser.must_change_password
            };

            setUser(userData);
            localStorage.setItem('currentUser', JSON.stringify(userData));

            return { 
                success: true, 
                mustChangePassword: dbUser.must_change_password || dbUser.is_first_login 
            };

        } catch (error: any) {
            console.error('Login error:', error);
            return { success: false, error: 'حدث خطأ أثناء تسجيل الدخول' };
        }
    };

    const logout = async () => {
        if (user) {
            // تسجيل في audit log
            await supabase
                .from('audit_log')
                .insert({
                    user_id: user.id,
                    username: user.username,
                    action: 'logout',
                    created_at: new Date()
                });
        }

        setUser(null);
        localStorage.removeItem('currentUser');
    };

    const changePassword = async (oldPassword: string, newPassword: string) => {
        if (!user) {
            return { success: false, error: 'يجب تسجيل الدخول أولاً' };
        }

        try {
            // التحقق من كلمة المرور القديمة
            const { data: users, error } = await supabase
                .from('users')
                .select('password_hash')
                .eq('id', user.id);

            if (error || !users || users.length === 0) {
                return { success: false, error: 'خطأ في التحقق من المستخدم' };
            }

            const isOldPasswordValid = await bcrypt.compare(oldPassword, users[0].password_hash);
            if (!isOldPasswordValid) {
                return { success: false, error: 'كلمة المرور القديمة غير صحيحة' };
            }

            // تشفير كلمة المرور الجديدة
            const newPasswordHash = await bcrypt.hash(newPassword, 10);

            // تحديث كلمة المرور
            const { error: updateError } = await supabase
                .from('users')
                .update({
                    password_hash: newPasswordHash,
                    must_change_password: false,
                    is_first_login: false,
                    updated_at: new Date()
                })
                .eq('id', user.id);

            if (updateError) {
                return { success: false, error: 'فشل تحديث كلمة المرور' };
            }

            // تسجيل في audit log
            await supabase
                .from('audit_log')
                .insert({
                    user_id: user.id,
                    username: user.username,
                    action: 'change_password',
                    created_at: new Date()
                });

            // تحديث بيانات المستخدم المحلية
            const updatedUser = { ...user, isFirstLogin: false, mustChangePassword: false };
            setUser(updatedUser);
            localStorage.setItem('currentUser', JSON.stringify(updatedUser));

            return { success: true };

        } catch (error: any) {
            console.error('Change password error:', error);
            return { success: false, error: 'حدث خطأ أثناء تغيير كلمة المرور' };
        }
    };

    const resetPassword = async (email: string) => {
        try {
            // البحث عن المستخدم
            const { data: users, error } = await supabase
                .from('users')
                .select('id, username, email')
                .eq('email', email)
                .eq('is_active', true);

            if (error || !users || users.length === 0) {
                return { success: false, error: 'البريد الإلكتروني غير مسجل' };
            }

            const dbUser = users[0];

            // إنشاء رمز إعادة التعيين
            const resetToken = Math.random().toString(36).substring(2, 15) + 
                              Math.random().toString(36).substring(2, 15);
            const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // ساعة واحدة

            // حفظ الرمز
            const { error: insertError } = await supabase
                .from('password_resets')
                .insert({
                    user_id: dbUser.id,
                    reset_token: resetToken,
                    expires_at: expiresAt
                });

            if (insertError) {
                return { success: false, error: 'فشل إنشاء رمز إعادة التعيين' };
            }

            // تسجيل في audit log
            await supabase
                .from('audit_log')
                .insert({
                    user_id: dbUser.id,
                    username: dbUser.username,
                    action: 'request_password_reset',
                    created_at: new Date()
                });

            return { success: true, token: resetToken };

        } catch (error: any) {
            console.error('Reset password error:', error);
            return { success: false, error: 'حدث خطأ أثناء إعادة تعيين كلمة المرور' };
        }
    };

    const confirmPasswordReset = async (token: string, newPassword: string) => {
        try {
            // التحقق من الرمز
            const { data: resets, error } = await supabase
                .from('password_resets')
                .select('*, users!inner(id, username)')
                .eq('reset_token', token)
                .eq('used', false)
                .gt('expires_at', new Date().toISOString());

            if (error || !resets || resets.length === 0) {
                return { success: false, error: 'الرمز غير صحيح أو منتهي الصلاحية' };
            }

            const reset = resets[0];

            // تشفير كلمة المرور الجديدة
            const newPasswordHash = await bcrypt.hash(newPassword, 10);

            // تحديث كلمة المرور
            const { error: updateError } = await supabase
                .from('users')
                .update({
                    password_hash: newPasswordHash,
                    updated_at: new Date()
                })
                .eq('id', reset.user_id);

            if (updateError) {
                return { success: false, error: 'فشل تحديث كلمة المرور' };
            }

            // تحديث حالة الرمز
            await supabase
                .from('password_resets')
                .update({
                    used: true,
                    used_at: new Date()
                })
                .eq('id', reset.id);

            // تسجيل في audit log
            await supabase
                .from('audit_log')
                .insert({
                    user_id: reset.user_id,
                    username: reset.users.username,
                    action: 'password_reset_completed',
                    created_at: new Date()
                });

            return { success: true };

        } catch (error: any) {
            console.error('Confirm password reset error:', error);
            return { success: false, error: 'حدث خطأ أثناء تأكيد إعادة التعيين' };
        }
    };

    const value = {
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
        changePassword,
        resetPassword,
        confirmPasswordReset
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within AuthProvider');
    }
    return context;
};
