import React, { createContext, useState, useContext, ReactNode, useCallback, useMemo } from 'react';
import { Notification, NotificationType, NotificationContextType } from '../types';

const NotificationContext = createContext<NotificationContextType | null>(null);

export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [notifications, setNotifications] = useState<Notification[]>([]);

    const removeNotification = useCallback((id: number) => {
        setNotifications(prev => prev.filter(n => n.id !== id));
    }, []);

    const addNotification = useCallback((message: string, type: NotificationType) => {
        const id = Date.now();
        setNotifications(prev => [...prev, { id, message, type }]);
        setTimeout(() => {
            removeNotification(id);
        }, 5000); // Auto-dismiss after 5 seconds
    }, [removeNotification]);

    const value = useMemo(() => ({
        notifications,
        addNotification,
        removeNotification
    }), [notifications, addNotification, removeNotification]);

    return (
        <NotificationContext.Provider value={value}>
            {children}
        </NotificationContext.Provider>
    );
};

export const useNotification = (): NotificationContextType | null => {
    const context = useContext(NotificationContext);
    if (context === null) {
        // This can happen if the component is not wrapped in NotificationProvider.
        // It's not a critical error for this app, so we can return null and handle it.
        console.warn("useNotification must be used within a NotificationProvider");
    }
    return context;
};