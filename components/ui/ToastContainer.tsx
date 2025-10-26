import React from 'react';
import { useNotification } from '../../contexts/NotificationContext';
import { Icons } from '../icons';
import { Notification } from '../../types';

const Toast: React.FC<{ message: string; type: 'success' | 'error' | 'info'; onClose: () => void }> = ({ message, type, onClose }) => {
    const baseClasses = "flex items-center w-full max-w-xs p-4 space-x-4 text-gray-500 bg-white divide-x divide-gray-200 rounded-lg shadow-lg space-x-reverse";
    const iconClasses = {
        success: "w-8 h-8 text-green-500 bg-green-100 flex items-center justify-center rounded-lg",
        error: "w-8 h-8 text-red-500 bg-red-100 flex items-center justify-center rounded-lg",
        info: "w-8 h-8 text-blue-500 bg-blue-100 flex items-center justify-center rounded-lg",
    };
    const icons = {
        success: <Icons.CheckCircle className="w-5 h-5" />,
        error: <Icons.AlertTriangle className="w-5 h-5" />,
        info: <Icons.Info className="w-5 h-5" />,
    };

    return (
        <div className={baseClasses} role="alert">
            <div className={iconClasses[type]}>
                {icons[type]}
            </div>
            <div className="pr-4 text-sm font-normal">{message}</div>
            <button onClick={onClose} className="p-1.5 -mr-4 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-lg">
                <Icons.X className="w-4 h-4"/>
            </button>
        </div>
    );
};

const ToastContainer: React.FC = () => {
    const context = useNotification();

    if (!context) {
        return null;
    }
    
    const { notifications, removeNotification } = context;

    return (
        <div className="fixed top-5 left-5 z-[100] space-y-3">
            {notifications.map((notification: Notification) => (
                <Toast
                    key={notification.id}
                    message={notification.message}
                    type={notification.type}
                    onClose={() => removeNotification(notification.id)}
                />
            ))}
        </div>
    );
};

export default ToastContainer;