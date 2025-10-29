import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { Button } from '../ui/Button';
import { Icons } from '../icons';
import { Modal } from '../ui/Modal';

interface Connection {
    id: string;
    name: string;
    displayName: string;
    isActive: boolean;
    lastConnected: Date;
    health: 'healthy' | 'warning' | 'error';
}

interface ConnectionListManagerProps {
    connections: Connection[];
    onAddConnection: (connection: Omit<Connection, 'id' | 'lastConnected' | 'health'>) => void;
    onEditConnection: (id: string, connection: Partial<Connection>) => void;
    onDeleteConnection: (id: string) => void;
    onSwitchConnection: (id: string) => void;
}

const ConnectionListManager: React.FC<ConnectionListManagerProps> = ({
    connections,
    onAddConnection,
    onEditConnection,
    onDeleteConnection,
    onSwitchConnection
}) => {
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingConnection, setEditingConnection] = useState<Connection | null>(null);
    const [newConnection, setNewConnection] = useState({
        name: '',
        displayName: '',
        url: '',
        key: '',
        isActive: false
    });

    const getHealthIcon = (health: string) => {
        switch (health) {
            case 'healthy': return <Icons.CheckCircle className="h-4 w-4 text-green-500" />;
            case 'warning': return <Icons.AlertTriangle className="h-4 w-4 text-yellow-500" />;
            case 'error': return <Icons.XCircle className="h-4 w-4 text-red-500" />;
            default: return <Icons.Circle className="h-4 w-4 text-gray-500" />;
        }
    };

    const handleAddConnection = () => {
        if (newConnection.name && newConnection.displayName) {
            onAddConnection({
                name: newConnection.name,
                displayName: newConnection.displayName,
                isActive: false
            });
            setNewConnection({ name: '', displayName: '', url: '', key: '', isActive: false });
            setIsAddModalOpen(false);
        }
    };

    const handleEditConnection = () => {
        if (editingConnection) {
            onEditConnection(editingConnection.id, {
                name: editingConnection.name,
                displayName: editingConnection.displayName
            });
            setIsEditModalOpen(false);
            setEditingConnection(null);
        }
    };

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <CardTitle className="flex items-center">
                            <Icons.Server className="h-5 w-5 ml-2" />
                            الاتصالات المحفوظة
                        </CardTitle>
                        <Button onClick={() => setIsAddModalOpen(true)}>
                            <Icons.Plus className="h-4 w-4 ml-2" />
                            إضافة اتصال
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="space-y-3">
                        {connections.map((connection) => (
                            <div
                                key={connection.id}
                                className={`p-4 border rounded-lg ${
                                    connection.isActive 
                                        ? 'border-blue-300 bg-blue-50' 
                                        : 'border-gray-200 bg-white'
                                }`}
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-3 space-x-reverse">
                                        {getHealthIcon(connection.health)}
                                        <div>
                                            <h3 className="font-medium">{connection.displayName}</h3>
                                            <p className="text-sm text-gray-600">{connection.name}</p>
                                            <p className="text-xs text-gray-500">
                                                آخر اتصال: {connection.lastConnected.toLocaleString('ar-SA')}
                                            </p>
                                        </div>
                                        {connection.isActive && (
                                            <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                                                نشط
                                            </span>
                                        )}
                                    </div>
                                    
                                    <div className="flex items-center space-x-2 space-x-reverse">
                                        {!connection.isActive && (
                                            <Button
                                                size="sm"
                                                onClick={() => onSwitchConnection(connection.id)}
                                            >
                                                تفعيل
                                            </Button>
                                        )}
                                        
                                        <Button
                                            size="sm"
                                            variant="secondary"
                                            onClick={() => {
                                                setEditingConnection(connection);
                                                setIsEditModalOpen(true);
                                            }}
                                        >
                                            <Icons.Edit className="h-4 w-4" />
                                        </Button>
                                        
                                        {!connection.isActive && (
                                            <Button
                                                size="sm"
                                                variant="danger"
                                                onClick={() => {
                                                    if (confirm('هل أنت متأكد من حذف هذا الاتصال؟')) {
                                                        onDeleteConnection(connection.id);
                                                    }
                                                }}
                                            >
                                                <Icons.Trash2 className="h-4 w-4" />
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                        
                        {connections.length === 0 && (
                            <div className="text-center py-8 text-gray-500">
                                <Icons.Database className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                                <p>لا توجد اتصالات محفوظة</p>
                                <p className="text-sm">انقر على "إضافة اتصال" لإنشاء اتصال جديد</p>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* نموذج إضافة اتصال */}
            <Modal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                title="إضافة اتصال جديد"
            >
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-2">اسم الاتصال</label>
                        <input
                            type="text"
                            value={newConnection.name}
                            onChange={(e) => setNewConnection({ ...newConnection, name: e.target.value })}
                            className="w-full p-2 border border-gray-300 rounded-md"
                            placeholder="مثال: production-db"
                        />
                    </div>
                    
                    <div>
                        <label className="block text-sm font-medium mb-2">الاسم المعروض</label>
                        <input
                            type="text"
                            value={newConnection.displayName}
                            onChange={(e) => setNewConnection({ ...newConnection, displayName: e.target.value })}
                            className="w-full p-2 border border-gray-300 rounded-md"
                            placeholder="مثال: قاعدة بيانات الإنتاج"
                        />
                    </div>
                    
                    <div>
                        <label className="block text-sm font-medium mb-2">رابط قاعدة البيانات</label>
                        <input
                            type="url"
                            value={newConnection.url}
                            onChange={(e) => setNewConnection({ ...newConnection, url: e.target.value })}
                            className="w-full p-2 border border-gray-300 rounded-md"
                            placeholder="https://your-project.supabase.co"
                        />
                    </div>
                    
                    <div>
                        <label className="block text-sm font-medium mb-2">مفتاح API</label>
                        <input
                            type="password"
                            value={newConnection.key}
                            onChange={(e) => setNewConnection({ ...newConnection, key: e.target.value })}
                            className="w-full p-2 border border-gray-300 rounded-md"
                            placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                        />
                    </div>
                    
                    <div className="flex justify-end space-x-3 space-x-reverse pt-4">
                        <Button variant="secondary" onClick={() => setIsAddModalOpen(false)}>
                            إلغاء
                        </Button>
                        <Button onClick={handleAddConnection}>
                            إضافة الاتصال
                        </Button>
                    </div>
                </div>
            </Modal>

            {/* نموذج تعديل اتصال */}
            <Modal
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                title="تعديل الاتصال"
            >
                {editingConnection && (
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium mb-2">اسم الاتصال</label>
                            <input
                                type="text"
                                value={editingConnection.name}
                                onChange={(e) => setEditingConnection({ 
                                    ...editingConnection, 
                                    name: e.target.value 
                                })}
                                className="w-full p-2 border border-gray-300 rounded-md"
                            />
                        </div>
                        
                        <div>
                            <label className="block text-sm font-medium mb-2">الاسم المعروض</label>
                            <input
                                type="text"
                                value={editingConnection.displayName}
                                onChange={(e) => setEditingConnection({ 
                                    ...editingConnection, 
                                    displayName: e.target.value 
                                })}
                                className="w-full p-2 border border-gray-300 rounded-md"
                            />
                        </div>
                        
                        <div className="flex justify-end space-x-3 space-x-reverse pt-4">
                            <Button variant="secondary" onClick={() => setIsEditModalOpen(false)}>
                                إلغاء
                            </Button>
                            <Button onClick={handleEditConnection}>
                                حفظ التغييرات
                            </Button>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
};

export default ConnectionListManager;