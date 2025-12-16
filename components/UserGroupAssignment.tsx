import React, { useState, useEffect } from 'react';
import { useSupabase } from '../contexts/SupabaseContext';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from './ui/Card';
import { Button } from './ui/Button';
import { Icons } from './icons';
import { Modal } from './ui/Modal';

interface User {
    id: string;
    username: string;
    email: string;
    fullName: string;
}

interface PermissionGroup {
    id: string;
    name: string;
    description: string;
    color: string;
    icon: string;
}

interface UserWithGroups extends User {
    groups: PermissionGroup[];
}

const UserGroupAssignment: React.FC = () => {
    const { supabase } = useSupabase();
    const { user: currentUser } = useAuth();
    const [users, setUsers] = useState<UserWithGroups[]>([]);
    const [groups, setGroups] = useState<PermissionGroup[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState<UserWithGroups | null>(null);
    const [selectedGroups, setSelectedGroups] = useState<Set<string>>(new Set());
    const [isSaving, setIsSaving] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setIsLoading(true);
        try {
            // Load groups
            const { data: groupsData, error: groupsError } = await supabase
                .from('permission_groups')
                .select('*')
                .order('name');

            if (groupsError) {
                console.error('Error loading groups:', groupsError);
            } else {
                setGroups(groupsData.map((g: any) => ({
                    id: g.id,
                    name: g.name,
                    description: g.description,
                    color: g.color,
                    icon: g.icon
                })));
            }

            // Load users
            const { data: usersData, error: usersError } = await supabase
                .from('users')
                .select('*')
                .order('username');

            if (usersError) {
                console.error('Error loading users:', usersError);
            } else {
                // Load groups for each user
                const usersWithGroups = await Promise.all(
                    usersData.map(async (u: any) => {
                        const { data: membershipData } = await supabase
                            .from('user_group_memberships')
                            .select(`
                                group_id,
                                permission_groups (
                                    id,
                                    name,
                                    description,
                                    color,
                                    icon
                                )
                            `)
                            .eq('user_id', u.id);

                        const userGroups = membershipData?.map((m: any) => ({
                            id: m.permission_groups.id,
                            name: m.permission_groups.name,
                            description: m.permission_groups.description,
                            color: m.permission_groups.color,
                            icon: m.permission_groups.icon
                        })) || [];

                        return {
                            id: u.id,
                            username: u.username,
                            email: u.email,
                            fullName: u.full_name || u.username,
                            groups: userGroups
                        };
                    })
                );
                setUsers(usersWithGroups);
            }
        } catch (error) {
            console.error('Error loading data:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const openModal = (user: UserWithGroups) => {
        setSelectedUser(user);
        setSelectedGroups(new Set(user.groups.map(g => g.id)));
        setIsModalOpen(true);
    };

    const handleGroupToggle = (groupId: string) => {
        const newGroups = new Set(selectedGroups);
        if (newGroups.has(groupId)) {
            newGroups.delete(groupId);
        } else {
            newGroups.add(groupId);
        }
        setSelectedGroups(newGroups);
    };

    const saveAssignments = async () => {
        if (!selectedUser) return;

        setIsSaving(true);
        try {
            // Delete all existing memberships for this user
            await supabase
                .from('user_group_memberships')
                .delete()
                .eq('user_id', selectedUser.id);

            // Insert new memberships
            const membershipsToInsert = Array.from(selectedGroups).map(groupId => ({
                user_id: selectedUser.id,
                group_id: groupId,
                assigned_by: currentUser?.id
            }));

            if (membershipsToInsert.length > 0) {
                const { error } = await supabase
                    .from('user_group_memberships')
                    .insert(membershipsToInsert);

                if (error) {
                    alert('فشل حفظ المجموعات: ' + error.message);
                    return;
                }
            }

            alert('تم حفظ المجموعات بنجاح');
            setIsModalOpen(false);
            loadData();

        } catch (error) {
            console.error('Error saving assignments:', error);
            alert('حدث خطأ أثناء الحفظ');
        } finally {
            setIsSaving(false);
        }
    };

    const filteredUsers = users.filter(u =>
        u.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.fullName.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Icons.RefreshCw className="w-12 h-12 text-blue-600 animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-dark">ربط المستخدمين بالمجموعات</h1>
                <p className="text-sm text-gray-600 mt-1">حدد المجموعات التي ينتمي إليها كل مستخدم</p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>قائمة المستخدمين ({users.length})</CardTitle>
                    <div className="mt-4">
                        <input
                            type="text"
                            placeholder="بحث بالاسم أو البريد الإلكتروني..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full md:w-1/3"
                        />
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {filteredUsers.map(user => (
                            <div
                                key={user.id}
                                className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg hover:shadow-md transition-shadow"
                            >
                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-2">
                                        <Icons.User className="w-5 h-5 text-gray-400" />
                                        <div>
                                            <h3 className="font-bold text-gray-800">{user.username}</h3>
                                            <p className="text-sm text-gray-500">{user.email}</p>
                                        </div>
                                    </div>
                                    <div className="flex flex-wrap gap-2 mt-2">
                                        {user.groups.length > 0 ? (
                                            user.groups.map(group => (
                                                <span
                                                    key={group.id}
                                                    className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium"
                                                    style={{
                                                        backgroundColor: group.color + '20',
                                                        color: group.color
                                                    }}
                                                >
                                                    <span>{group.icon}</span>
                                                    <span>{group.name}</span>
                                                </span>
                                            ))
                                        ) : (
                                            <span className="text-xs text-gray-400 italic">
                                                لا توجد مجموعات
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <Button
                                    onClick={() => openModal(user)}
                                    variant="secondary"
                                    className="mr-4"
                                >
                                    <Icons.Edit className="w-4 h-4 ml-2" />
                                    تعديل المجموعات
                                </Button>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

            {/* Modal for Group Assignment */}
            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={`تعديل مجموعات: ${selectedUser?.username}`}
            >
                <div className="p-6 space-y-4">
                    <p className="text-sm text-gray-600">
                        اختر المجموعات التي ينتمي إليها هذا المستخدم. سيحصل على جميع صلاحيات المجموعات المحددة.
                    </p>

                    <div className="space-y-3 max-h-[60vh] overflow-y-auto">
                        {groups.map(group => (
                            <label
                                key={group.id}
                                className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                            >
                                <input
                                    type="checkbox"
                                    checked={selectedGroups.has(group.id)}
                                    onChange={() => handleGroupToggle(group.id)}
                                    className="w-5 h-5"
                                />
                                <div
                                    className="w-10 h-10 rounded-lg flex items-center justify-center text-xl flex-shrink-0"
                                    style={{ backgroundColor: group.color + '20' }}
                                >
                                    {group.icon}
                                </div>
                                <div className="flex-1">
                                    <h4 className="font-bold text-gray-800">{group.name}</h4>
                                    <p className="text-xs text-gray-500">{group.description}</p>
                                </div>
                            </label>
                        ))}
                    </div>

                    <div className="flex gap-3 pt-4 border-t">
                        <Button onClick={saveAssignments} disabled={isSaving} className="flex-1">
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
                            variant="secondary"
                            onClick={() => setIsModalOpen(false)}
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

export default UserGroupAssignment;
