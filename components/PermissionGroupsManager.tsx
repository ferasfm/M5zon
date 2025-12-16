import React, { useState, useEffect } from 'react';
import { useSupabase } from '../contexts/SupabaseContext';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from './ui/Card';
import { Button } from './ui/Button';
import { Icons } from './icons';
import { Modal } from './ui/Modal';

interface PermissionGroup {
    id: string;
    name: string;
    description: string;
    color: string;
    icon: string;
    isSystem: boolean;
    memberCount?: number;
}

interface Permission {
    key: string;
    label: string;
    category: string;
}

const AVAILABLE_PERMISSIONS: Permission[] = [
    // لوحة التحكم
    { key: 'dashboard.view', label: 'عرض لوحة التحكم', category: 'لوحة التحكم' },
    
    // المنتجات
    { key: 'products.view', label: 'عرض المنتجات', category: 'المنتجات' },
    { key: 'products.add', label: 'إضافة منتجات', category: 'المنتجات' },
    { key: 'products.edit', label: 'تعديل منتجات', category: 'المنتجات' },
    { key: 'products.delete', label: 'حذف منتجات', category: 'المنتجات' },
    
    // استلام البضاعة
    { key: 'receiving.view', label: 'عرض استلام البضاعة', category: 'الحركات' },
    { key: 'receiving.add', label: 'إضافة استلام بضاعة', category: 'الحركات' },
    
    // صرف البضاعة
    { key: 'dispatching.view', label: 'عرض صرف البضاعة', category: 'الحركات' },
    { key: 'dispatching.add', label: 'إضافة صرف بضاعة', category: 'الحركات' },
    { key: 'dispatching.edit', label: 'تعديل صرف بضاعة', category: 'الحركات' },
    { key: 'dispatching.delete', label: 'حذف صرف بضاعة', category: 'الحركات' },
    
    // إتلاف البضاعة
    { key: 'scrapping.view', label: 'عرض إتلاف البضاعة', category: 'الحركات' },
    { key: 'scrapping.add', label: 'إضافة إتلاف بضاعة', category: 'الحركات' },
    
    // الموردون
    { key: 'suppliers.view', label: 'عرض الموردين', category: 'الجهات' },
    { key: 'suppliers.add', label: 'إضافة موردين', category: 'الجهات' },
    { key: 'suppliers.edit', label: 'تعديل موردين', category: 'الجهات' },
    { key: 'suppliers.delete', label: 'حذف موردين', category: 'الجهات' },
    
    // المواقع والعملاء
    { key: 'locations.view', label: 'عرض المواقع والعملاء', category: 'الجهات' },
    { key: 'locations.add', label: 'إضافة مواقع وعملاء', category: 'الجهات' },
    { key: 'locations.edit', label: 'تعديل مواقع وعملاء', category: 'الجهات' },
    { key: 'locations.delete', label: 'حذف مواقع وعملاء', category: 'الجهات' },
    
    // التقارير
    { key: 'reports.view', label: 'عرض التقارير', category: 'التقارير' },
    { key: 'reports.export', label: 'تصدير التقارير', category: 'التقارير' },
    
    // الإعدادات
    { key: 'settings.view', label: 'عرض الإعدادات', category: 'الإعدادات' },
    { key: 'settings.edit', label: 'تعديل الإعدادات', category: 'الإعدادات' },
    
    // المستخدمين
    { key: 'users.view', label: 'عرض المستخدمين', category: 'إدارة النظام' },
    { key: 'users.add', label: 'إضافة مستخدمين', category: 'إدارة النظام' },
    { key: 'users.edit', label: 'تعديل مستخدمين', category: 'إدارة النظام' },
    { key: 'users.delete', label: 'حذف مستخدمين', category: 'إدارة النظام' },
    
    // المجموعات
    { key: 'groups.view', label: 'عرض المجموعات', category: 'إدارة النظام' },
    { key: 'groups.add', label: 'إضافة مجموعات', category: 'إدارة النظام' },
    { key: 'groups.edit', label: 'تعديل مجموعات', category: 'إدارة النظام' },
    { key: 'groups.delete', label: 'حذف مجموعات', category: 'إدارة النظام' },
    
    // الفئات
    { key: 'categories.view', label: 'عرض الفئات', category: 'الإعدادات' },
    { key: 'categories.add', label: 'إضافة فئات', category: 'الإعدادات' },
    { key: 'categories.edit', label: 'تعديل فئات', category: 'الإعدادات' },
    { key: 'categories.delete', label: 'حذف فئات', category: 'الإعدادات' },
    
    // البيانات
    { key: 'data.reset', label: 'إعادة تعيين البيانات', category: 'إدارة النظام' },
];

const PermissionGroupsManager: React.FC = () => {
    const { supabase } = useSupabase();
    const { user: currentUser } = useAuth();
    const [groups, setGroups] = useState<PermissionGroup[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isPermissionsModalOpen, setIsPermissionsModalOpen] = useState(false);
    const [editingGroup, setEditingGroup] = useState<PermissionGroup | null>(null);
    const [selectedGroupForPermissions, setSelectedGroupForPermissions] = useState<PermissionGroup | null>(null);
    const [groupPermissions, setGroupPermissions] = useState<Set<string>>(new Set());
    
    // Form state
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        color: '#3B82F6',
        icon: '👥'
    });
    const [formError, setFormError] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        loadGroups();
    }, []);

    const loadGroups = async () => {
        setIsLoading(true);
        try {
            const { data, error } = await supabase
                .from('permission_groups')
                .select('*')
                .order('created_at', { ascending: true });

            if (error) {
                console.error('Error loading groups:', error);
            } else {
                // Get member counts
                const groupsWithCounts = await Promise.all(
                    data.map(async (g: any) => {
                        const { count } = await supabase
                            .from('user_group_memberships')
                            .select('*', { count: 'exact', head: true })
                            .eq('group_id', g.id);
                        
                        return {
                            id: g.id,
                            name: g.name,
                            description: g.description,
                            color: g.color,
                            icon: g.icon,
                            isSystem: g.is_system,
                            memberCount: count || 0
                        };
                    })
                );
                setGroups(groupsWithCounts);
            }
        } catch (error) {
            console.error('Error loading groups:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const openModalForNew = () => {
        setEditingGroup(null);
        setFormData({
            name: '',
            description: '',
            color: '#3B82F6',
            icon: '👥'
        });
        setFormError('');
        setIsModalOpen(true);
    };

    const openModalForEdit = (group: PermissionGroup) => {
        if (group.isSystem) {
            alert('لا يمكن تعديل المجموعات الافتراضية');
            return;
        }
        setEditingGroup(group);
        setFormData({
            name: group.name,
            description: group.description,
            color: group.color,
            icon: group.icon
        });
        setFormError('');
        setIsModalOpen(true);
    };

    const openPermissionsModal = async (group: PermissionGroup) => {
        setSelectedGroupForPermissions(group);
        
        // Load group permissions
        const { data, error } = await supabase
            .from('group_permissions')
            .select('permission_key')
            .eq('group_id', group.id)
            .eq('enabled', true);

        if (!error && data) {
            setGroupPermissions(new Set(data.map(p => p.permission_key)));
        }
        
        setIsPermissionsModalOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setFormError('');

        if (!formData.name) {
            setFormError('الرجاء إدخال اسم المجموعة');
            return;
        }

        setIsSaving(true);

        try {
            if (editingGroup) {
                // Update existing group
                const { error } = await supabase
                    .from('permission_groups')
                    .update({
                        name: formData.name,
                        description: formData.description,
                        color: formData.color,
                        icon: formData.icon,
                        updated_at: new Date()
                    })
                    .eq('id', editingGroup.id);

                if (error) {
                    setFormError(error.message);
                    return;
                }
            } else {
                // Create new group
                const { error } = await supabase
                    .from('permission_groups')
                    .insert({
                        name: formData.name,
                        description: formData.description,
                        color: formData.color,
                        icon: formData.icon,
                        is_system: false,
                        created_by: currentUser?.id
                    });

                if (error) {
                    if (error.message.includes('duplicate') || error.message.includes('unique')) {
                        setFormError('اسم المجموعة مستخدم بالفعل');
                    } else {
                        setFormError(error.message);
                    }
                    return;
                }
            }

            setIsModalOpen(false);
            loadGroups();

        } catch (error: any) {
            console.error('Error saving group:', error);
            setFormError('حدث خطأ أثناء الحفظ');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (group: PermissionGroup) => {
        if (group.isSystem) {
            alert('لا يمكن حذف المجموعات الافتراضية');
            return;
        }

        if (!confirm(`هل أنت متأكد من حذف المجموعة "${group.name}"؟\nسيتم إزالة جميع المستخدمين من هذه المجموعة.`)) {
            return;
        }

        try {
            const { error } = await supabase
                .from('permission_groups')
                .delete()
                .eq('id', group.id);

            if (error) {
                alert('فشل حذف المجموعة: ' + error.message);
                return;
            }

            loadGroups();

        } catch (error) {
            console.error('Error deleting group:', error);
            alert('حدث خطأ أثناء الحذف');
        }
    };

    const handlePermissionToggle = (permissionKey: string) => {
        const newPermissions = new Set(groupPermissions);
        if (newPermissions.has(permissionKey)) {
            newPermissions.delete(permissionKey);
        } else {
            newPermissions.add(permissionKey);
        }
        setGroupPermissions(newPermissions);
    };

    const savePermissions = async () => {
        if (!selectedGroupForPermissions) return;

        setIsSaving(true);
        try {
            // Delete all existing permissions for this group
            await supabase
                .from('group_permissions')
                .delete()
                .eq('group_id', selectedGroupForPermissions.id);

            // Insert new permissions
            const permissionsToInsert = Array.from(groupPermissions).map(key => ({
                group_id: selectedGroupForPermissions.id,
                permission_key: key,
                enabled: true
            }));

            if (permissionsToInsert.length > 0) {
                const { error } = await supabase
                    .from('group_permissions')
                    .insert(permissionsToInsert);

                if (error) {
                    alert('فشل حفظ الصلاحيات: ' + error.message);
                    return;
                }
            }

            alert('تم حفظ الصلاحيات بنجاح');
            setIsPermissionsModalOpen(false);

        } catch (error) {
            console.error('Error saving permissions:', error);
            alert('حدث خطأ أثناء الحفظ');
        } finally {
            setIsSaving(false);
        }
    };

    // Group permissions by category
    const permissionsByCategory = AVAILABLE_PERMISSIONS.reduce((acc, perm) => {
        if (!acc[perm.category]) {
            acc[perm.category] = [];
        }
        acc[perm.category].push(perm);
        return acc;
    }, {} as Record<string, Permission[]>);

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
                <div>
                    <h1 className="text-3xl font-bold text-dark">إدارة المجموعات والصلاحيات</h1>
                    <p className="text-sm text-gray-600 mt-1">أنشئ مجموعات مخصصة وحدد صلاحياتها</p>
                </div>
                <Button onClick={openModalForNew}>
                    <Icons.Plus className="h-4 w-4 ml-2" />
                    إضافة مجموعة جديدة
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {groups.map(group => (
                    <Card key={group.id} className="hover:shadow-lg transition-shadow">
                        <CardContent className="p-6">
                            <div className="flex items-start justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <div 
                                        className="w-12 h-12 rounded-lg flex items-center justify-center text-2xl"
                                        style={{ backgroundColor: group.color + '20' }}
                                    >
                                        {group.icon}
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-lg">{group.name}</h3>
                                        {group.isSystem && (
                                            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                                                افتراضية
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                            
                            <p className="text-sm text-gray-600 mb-4 min-h-[40px]">
                                {group.description}
                            </p>
                            
                            <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
                                <Icons.User className="w-4 h-4" />
                                <span>{group.memberCount} مستخدم</span>
                            </div>
                            
                            <div className="flex gap-2">
                                <Button
                                    onClick={() => openPermissionsModal(group)}
                                    variant="secondary"
                                    className="flex-1 text-sm"
                                >
                                    <Icons.Shield className="w-4 h-4 ml-1" />
                                    الصلاحيات
                                </Button>
                                {!group.isSystem && (
                                    <>
                                        <button
                                            onClick={() => openModalForEdit(group)}
                                            className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                                            title="تعديل"
                                        >
                                            <Icons.Edit className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(group)}
                                            className="p-2 text-red-600 hover:bg-red-50 rounded"
                                            title="حذف"
                                        >
                                            <Icons.Trash2 className="w-4 h-4" />
                                        </button>
                                    </>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Modal for Add/Edit Group */}
            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={editingGroup ? 'تعديل مجموعة' : 'إضافة مجموعة جديدة'}
            >
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {formError && (
                        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                            {formError}
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            اسم المجموعة *
                        </label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className="w-full"
                            required
                            placeholder="مثال: محاسبين، مندوبين مبيعات"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            الوصف
                        </label>
                        <textarea
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            className="w-full"
                            rows={3}
                            placeholder="وصف مختصر للمجموعة وصلاحياتها"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                اللون
                            </label>
                            <input
                                type="color"
                                value={formData.color}
                                onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                                className="w-full h-10 rounded border border-gray-300"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                الأيقونة
                            </label>
                            <input
                                type="text"
                                value={formData.icon}
                                onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                                className="w-full text-center text-2xl"
                                placeholder="👥"
                                maxLength={2}
                            />
                        </div>
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

            {/* Modal for Permissions */}
            <Modal
                isOpen={isPermissionsModalOpen}
                onClose={() => setIsPermissionsModalOpen(false)}
                title={`صلاحيات: ${selectedGroupForPermissions?.name}`}
            >
                <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
                    {Object.entries(permissionsByCategory).map(([category, permissions]) => (
                        <div key={category} className="space-y-3">
                            <h3 className="font-bold text-lg text-gray-800 border-b pb-2">
                                {category}
                            </h3>
                            <div className="space-y-2">
                                {permissions.map(perm => (
                                    <label
                                        key={perm.key}
                                        className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded cursor-pointer"
                                    >
                                        <input
                                            type="checkbox"
                                            checked={groupPermissions.has(perm.key)}
                                            onChange={() => handlePermissionToggle(perm.key)}
                                            className="w-5 h-5"
                                        />
                                        <span className="text-sm text-gray-700">{perm.label}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    ))}

                    <div className="flex gap-3 pt-4 border-t sticky bottom-0 bg-white">
                        <Button onClick={savePermissions} disabled={isSaving} className="flex-1">
                            {isSaving ? (
                                <>
                                    <Icons.RefreshCw className="w-4 h-4 ml-2 animate-spin" />
                                    جاري الحفظ...
                                </>
                            ) : (
                                <>
                                    <Icons.Check className="w-4 h-4 ml-2" />
                                    حفظ الصلاحيات
                                </>
                            )}
                        </Button>
                        <Button
                            variant="secondary"
                            onClick={() => setIsPermissionsModalOpen(false)}
                            disabled={isSaving}
                        >
                            إلغاء
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default PermissionGroupsManager;
