import React, { useState, useEffect, useMemo } from 'react';
import { useSupabase } from '../contexts/SupabaseContext';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from './ui/Card';
import { Button } from './ui/Button';
import { Icons } from './icons';
import { Modal } from './ui/Modal';
import bcrypt from 'bcryptjs';
import { formatDate } from '../utils/formatters';

interface User {
    id: string;
    username: string;
    email: string;
    role: string;
    isActive: boolean;
    createdAt: string;
    lastLogin: string | null;
    failedLoginAttempts: number;
}

const UsersManagement: React.FC = () => {
    const { supabase } = useSupabase();
    const { user: currentUser } = useAuth();
    const [users, setUsers] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    
    // Form state
    const [formData, setFormData] = useState({
        username: '',
        email: '',
        password: '',
        role: 'user',
        isActive: true
    });
    const [formError, setFormError] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        loadUsers();
    }, []);

    const loadUsers = async () => {
        setIsLoading(true);
        try {
            const { data, error } = await supabase
                .from('users')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) {
                console.error('Error loading users:', error);
            } else {
                const mappedUsers = data.map((u: any) => ({
                    id: u.id,
                    username: u.username,
                    email: u.email,
                    role: u.role,
                    isActive: u.is_active,
                    createdAt: u.created_at,
                    lastLogin: u.last_login,
                    failedLoginAttempts: u.failed_login_attempts || 0
                }));
                setUsers(mappedUsers);
            }
        } catch (error) {
            console.error('Error loading users:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const filteredUsers = useMemo(() => {
        return users.filter(u =>
            u.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
            u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
            u.role.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [users, searchTerm]);

    const openModalForNew = () => {
        setEditingUser(null);
        setFormData({
            username: '',
            email: '',
            password: '',
            role: 'user',
            isActive: true
        });
        setFormError('');
        setIsModalOpen(true);
    };

    const openModalForEdit = (user: User) => {
        setEditingUser(user);
        setFormData({
            username: user.username,
            email: user.email,
            password: '',
            role: user.role,
            isActive: user.isActive
        });
        setFormError('');
        setIsModalOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setFormError('');

        // Validation
        if (!formData.username || !formData.email) {
            setFormError('الرجاء ملء جميع الحقول المطلوبة');
            return;
        }

        if (!editingUser && !formData.password) {
            setFormError('كلمة المرور مطلوبة للمستخدمين الجدد');
            return;
        }

        if (formData.password && formData.password.length < 6) {
            setFormError('كلمة المرور يجب أن تكون 6 أحرف على الأقل');
            return;
        }

        // Email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(formData.email)) {
            setFormError('صيغة البريد الإلكتروني غير صحيحة');
            return;
        }

        setIsSaving(true);

        try {
            if (editingUser) {
                // Update existing user
                const updates: any = {
                    username: formData.username,
                    email: formData.email,
                    role: formData.role,
                    is_active: formData.isActive,
                    updated_at: new Date()
                };

                // Update password if provided
                if (formData.password) {
                    const passwordHash = await bcrypt.hash(formData.password, 10);
                    updates.password_hash = passwordHash;
                    updates.must_change_password = true;
                }

                const { error } = await supabase
                    .from('users')
                    .update(updates)
                    .eq('id', editingUser.id);

                if (error) {
                    setFormError(error.message);
                    return;
                }

                // Audit log
                await supabase.from('audit_log').insert({
                    user_id: currentUser?.id,
                    username: currentUser?.username,
                    action: 'update_user',
                    table_name: 'users',
                    record_id: editingUser.id,
                    new_values: updates
                });

            } else {
                // Create new user
                const passwordHash = await bcrypt.hash(formData.password, 10);

                const { error } = await supabase
                    .from('users')
                    .insert({
                        username: formData.username,
                        email: formData.email,
                        password_hash: passwordHash,
                        role: formData.role,
                        is_active: formData.isActive,
                        must_change_password: true,
                        created_by: currentUser?.id
                    });

                if (error) {
                    if (error.message.includes('duplicate') || error.message.includes('unique')) {
                        setFormError('اسم المستخدم أو البريد الإلكتروني مستخدم بالفعل');
                    } else {
                        setFormError(error.message);
                    }
                    return;
                }

                // Audit log
                await supabase.from('audit_log').insert({
                    user_id: currentUser?.id,
                    username: currentUser?.username,
                    action: 'create_user',
                    table_name: 'users',
                    new_values: { username: formData.username, email: formData.email, role: formData.role }
                });
            }

            setIsModalOpen(false);
            loadUsers();

        } catch (error: any) {
            console.error('Error saving user:', error);
            setFormError('حدث خطأ أثناء الحفظ');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (user: User) => {
        if (user.id === currentUser?.id) {
            alert('لا يمكنك حذف حسابك الخاص');
            return;
        }

        if (user.username === 'admin') {
            alert('لا يمكن حذف حساب المدير الرئيسي');
            return;
        }

        if (!confirm(`هل أنت متأكد من حذف المستخدم "${user.username}"؟`)) {
            return;
        }

        try {
            const { error } = await supabase
                .from('users')
                .delete()
                .eq('id', user.id);

            if (error) {
                alert('فشل حذف المستخدم: ' + error.message);
                return;
            }

            // Audit log
            await supabase.from('audit_log').insert({
                user_id: currentUser?.id,
                username: currentUser?.username,
                action: 'delete_user',
                table_name: 'users',
                record_id: user.id,
                old_values: { username: user.username, email: user.email }
            });

            loadUsers();

        } catch (error) {
            console.error('Error deleting user:', error);
            alert('حدث خطأ أثناء الحذف');
        }
    };

    const handleResetPassword = async (user: User) => {
        const newPassword = prompt(`أدخل كلمة المرور الجديدة للمستخدم "${user.username}":`);
        
        if (!newPassword) return;

        if (newPassword.length < 6) {
            alert('كلمة المرور يجب أن تكون 6 أحرف على الأقل');
            return;
        }

        try {
            const passwordHash = await bcrypt.hash(newPassword, 10);

            const { error } = await supabase
                .from('users')
                .update({
                    password_hash: passwordHash,
                    must_change_password: true,
                    failed_login_attempts: 0,
                    locked_until: null
                })
                .eq('id', user.id);

            if (error) {
                alert('فشل إعادة تعيين كلمة المرور: ' + error.message);
                return;
            }

            // Audit log
            await supabase.from('audit_log').insert({
                user_id: currentUser?.id,
                username: currentUser?.username,
                action: 'reset_user_password',
                table_name: 'users',
                record_id: user.id
            });

            alert('تم إعادة تعيين كلمة المرور بنجاح');

        } catch (error) {
            console.error('Error resetting password:', error);
            alert('حدث خطأ أثناء إعادة التعيين');
        }
    };

    const getRoleBadgeColor = (role: string) => {
        switch (role) {
            case 'admin': return 'bg-red-100 text-red-800';
            case 'manager': return 'bg-blue-100 text-blue-800';
            case 'user': return 'bg-green-100 text-green-800';
            case 'viewer': return 'bg-gray-100 text-gray-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const getRoleLabel = (role: string) => {
        switch (role) {
            case 'admin': return 'مدير';
            case 'manager': return 'مشرف';
            case 'user': return 'مستخدم';
            case 'viewer': return 'مشاهد';
            default: return role;
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Icons.RefreshCw className="w-12 h-12 text-blue-600 animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold text-dark">إدارة المستخدمين</h1>
                <Button onClick={openModalForNew}>
                    <Icons.UserPlus className="h-4 w-4 ml-2" />
                    إضافة مستخدم جديد
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>قائمة المستخدمين ({users.length})</CardTitle>
                    <div className="mt-4">
                        <input
                            type="text"
                            placeholder="بحث بالاسم، البريد الإلكتروني أو الدور..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full md:w-1/3"
                        />
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-right">
                            <thead className="text-xs text-slate-700 uppercase bg-slate-100">
                                <tr>
                                    <th className="px-4 py-3">اسم المستخدم</th>
                                    <th className="px-4 py-3">البريد الإلكتروني</th>
                                    <th className="px-4 py-3">الدور</th>
                                    <th className="px-4 py-3">الحالة</th>
                                    <th className="px-4 py-3">آخر دخول</th>
                                    <th className="px-4 py-3">إجراءات</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredUsers.map(user => (
                                    <tr key={user.id} className="bg-white border-b border-slate-200 hover:bg-slate-50">
                                        <td className="px-4 py-3 font-medium">
                                            <div className="flex items-center gap-2">
                                                <Icons.User className="w-4 h-4 text-gray-400" />
                                                {user.username}
                                                {user.id === currentUser?.id && (
                                                    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded">أنت</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">{user.email}</td>
                                        <td className="px-4 py-3">
                                            <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getRoleBadgeColor(user.role)}`}>
                                                {getRoleLabel(user.role)}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            {user.isActive ? (
                                                <span className="text-green-600 flex items-center gap-1">
                                                    <Icons.CheckCircle className="w-4 h-4" />
                                                    نشط
                                                </span>
                                            ) : (
                                                <span className="text-red-600 flex items-center gap-1">
                                                    <Icons.XCircle className="w-4 h-4" />
                                                    معطل
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-xs text-gray-600">
                                            {user.lastLogin ? formatDate(new Date(user.lastLogin)) : 'لم يسجل دخول'}
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => openModalForEdit(user)}
                                                    className="text-blue-600 hover:text-blue-800"
                                                    title="تعديل"
                                                >
                                                    <Icons.Edit className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleResetPassword(user)}
                                                    className="text-yellow-600 hover:text-yellow-800"
                                                    title="إعادة تعيين كلمة المرور"
                                                >
                                                    <Icons.Key className="w-4 h-4" />
                                                </button>
                                                {user.username !== 'admin' && user.id !== currentUser?.id && (
                                                    <button
                                                        onClick={() => handleDelete(user)}
                                                        className="text-red-600 hover:text-red-800"
                                                        title="حذف"
                                                    >
                                                        <Icons.Trash2 className="w-4 h-4" />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>

            {/* Modal */}
            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={editingUser ? 'تعديل مستخدم' : 'إضافة مستخدم جديد'}
            >
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {formError && (
                        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                            {formError}
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            اسم المستخدم *
                        </label>
                        <input
                            type="text"
                            value={formData.username}
                            onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                            className="w-full"
                            required
                            disabled={editingUser?.username === 'admin'}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            البريد الإلكتروني *
                        </label>
                        <input
                            type="email"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            className="w-full"
                            required
                            disabled={editingUser?.email === 'it@alhuda.ps'}
                        />
                        {editingUser?.email === 'it@alhuda.ps' && (
                            <p className="text-xs text-gray-500 mt-1">البريد الإلكتروني للمدير الرئيسي لا يمكن تغييره</p>
                        )}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            كلمة المرور {editingUser ? '(اتركها فارغة إذا لم ترد التغيير)' : '*'}
                        </label>
                        <input
                            type="password"
                            value={formData.password}
                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            className="w-full"
                            placeholder="6 أحرف على الأقل"
                            required={!editingUser}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            الدور *
                        </label>
                        <select
                            value={formData.role}
                            onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                            className="w-full"
                            required
                            disabled={editingUser?.username === 'admin'}
                        >
                            <option value="admin">مدير (Admin)</option>
                            <option value="manager">مشرف (Manager)</option>
                            <option value="user">مستخدم (User)</option>
                            <option value="viewer">مشاهد (Viewer)</option>
                        </select>
                    </div>

                    <div className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            id="isActive"
                            checked={formData.isActive}
                            onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                            disabled={editingUser?.username === 'admin'}
                        />
                        <label htmlFor="isActive" className="text-sm text-gray-700">
                            الحساب نشط
                        </label>
                    </div>

                    <div className="flex gap-3 pt-4">
                        <Button type="submit" disabled={isSaving} className="flex-1">
                            {isSaving ? (
                                <>
                                    <Icons.RefreshCw className="w-4 h-4 ml-2 animate-spin" />
                                    جاري الحفظ...
                                </>
                            ) : (
                                <>
                                    <Icons.Check className="w-4 h-4 ml-2" />
                                    حفظ
                                </>
                            )}
                        </Button>
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={() => setIsModalOpen(false)}
                            disabled={isSaving}
                        >
                            إلغاء
                        </Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default UsersManagement;
