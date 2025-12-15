import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from './AuthContext';

interface Permission {
    page: string;
    canView: boolean;
    canAdd: boolean;
    canEdit: boolean;
    canDelete: boolean;
}

interface PermissionsContextType {
    permissions: Permission[];
    isLoading: boolean;
    canView: (page: string) => boolean;
    canAdd: (page: string) => boolean;
    canEdit: (page: string) => boolean;
    canDelete: (page: string) => boolean;
    hasAnyPermission: (page: string) => boolean;
}

const PermissionsContext = createContext<PermissionsContextType | null>(null);

export const PermissionsProvider: React.FC<{ children: ReactNode; supabase: any }> = ({ children, supabase }) => {
    const { user, isAuthenticated } = useAuth();
    const [permissions, setPermissions] = useState<Permission[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (isAuthenticated && user) {
            loadPermissions();
        } else {
            setPermissions([]);
            setIsLoading(false);
        }
    }, [user, isAuthenticated]);

    const loadPermissions = async () => {
        if (!user) return;

        try {
            const { data, error } = await supabase
                .from('permissions')
                .select('*')
                .eq('role', user.role);

            if (error) {
                console.error('Error loading permissions:', error);
                setPermissions([]);
            } else {
                const perms = data.map((p: any) => ({
                    page: p.page,
                    canView: p.can_view,
                    canAdd: p.can_add,
                    canEdit: p.can_edit,
                    canDelete: p.can_delete
                }));
                setPermissions(perms);
            }
        } catch (error) {
            console.error('Error loading permissions:', error);
            setPermissions([]);
        } finally {
            setIsLoading(false);
        }
    };

    const getPermission = (page: string): Permission | undefined => {
        return permissions.find(p => p.page === page);
    };

    const canView = (page: string): boolean => {
        const perm = getPermission(page);
        return perm?.canView || false;
    };

    const canAdd = (page: string): boolean => {
        const perm = getPermission(page);
        return perm?.canAdd || false;
    };

    const canEdit = (page: string): boolean => {
        const perm = getPermission(page);
        return perm?.canEdit || false;
    };

    const canDelete = (page: string): boolean => {
        const perm = getPermission(page);
        return perm?.canDelete || false;
    };

    const hasAnyPermission = (page: string): boolean => {
        const perm = getPermission(page);
        return perm ? (perm.canView || perm.canAdd || perm.canEdit || perm.canDelete) : false;
    };

    const value = {
        permissions,
        isLoading,
        canView,
        canAdd,
        canEdit,
        canDelete,
        hasAnyPermission
    };

    return <PermissionsContext.Provider value={value}>{children}</PermissionsContext.Provider>;
};

export const usePermissions = () => {
    const context = useContext(PermissionsContext);
    if (!context) {
        throw new Error('usePermissions must be used within PermissionsProvider');
    }
    return context;
};
