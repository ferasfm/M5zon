import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/Card';
import { Button } from './ui/Button';
import { Icons } from './icons';
import { Modal } from './ui/Modal';
import { UseInventoryReturn, TransactionReason } from '../types';
import { useNotification } from '../contexts/NotificationContext';

interface ReasonsManagerProps {
    inventory: UseInventoryReturn;
}

const ReasonsManager: React.FC<ReasonsManagerProps> = ({ inventory }) => {
    const { transactionReasons, reasonsApi } = inventory;
    const notification = useNotification();
    
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingReason, setEditingReason] = useState<TransactionReason | null>(null);
    
    const [newReasonText, setNewReasonText] = useState('');
    const [newReasonType, setNewReasonType] = useState<'purchase' | 'dispatch' | 'scrap' | 'both'>('both');

    const handleAddReason = async () => {
        if (!newReasonText.trim()) {
            notification?.addNotification('الرجاء إدخال نص السبب', 'error');
            return;
        }
        
        await reasonsApi.addReason(newReasonText.trim(), newReasonType);
        setNewReasonText('');
        setNewReasonType('both');
        setIsAddModalOpen(false);
    };

    const handleEditReason = async () => {
        if (!editingReason) return;
        
        if (!editingReason.reasonText.trim()) {
            notification?.addNotification('الرجاء إدخال نص السبب', 'error');
            return;
        }
        
        await reasonsApi.updateReason(editingReason);
        setEditingReason(null);
        setIsEditModalOpen(false);
    };

    const handleDeleteReason = async (id: string) => {
        if (window.confirm('هل أنت متأكد من حذف هذا السبب؟')) {
            await reasonsApi.deleteReason(id);
        }
    };

    const handleToggleActive = async (reason: TransactionReason) => {
        await reasonsApi.updateReason({ ...reason, isActive: !reason.isActive });
    };

    const openEditModal = (reason: TransactionReason) => {
        setEditingReason({ ...reason });
        setIsEditModalOpen(true);
    };

    const purchaseReasons = transactionReasons.filter(r => r.reasonType === 'purchase' || r.reasonType === 'both');
    const dispatchReasons = transactionReasons.filter(r => r.reasonType === 'dispatch' || r.reasonType === 'both');
    const scrapReasons = transactionReasons.filter(r => r.reasonType === 'scrap');

    return (
        <>
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <CardTitle>إدارة أسباب الشراء والصرف</CardTitle>
                        <Button onClick={() => setIsAddModalOpen(true)}>
                            <Icons.PlusCircle className="h-4 w-4 ml-2" />
                            إضافة سبب جديد
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* أسباب الشراء */}
                        <div>
                            <h3 className="text-lg font-semibold mb-3 text-primary">أسباب الشراء</h3>
                            <div className="space-y-2">
                                {purchaseReasons.length === 0 ? (
                                    <p className="text-sm text-slate-500 text-center py-4">لا توجد أسباب شراء</p>
                                ) : (
                                    purchaseReasons.map(reason => (
                                        <div
                                            key={reason.id}
                                            className={`flex items-center justify-between p-3 rounded-md border ${
                                                reason.isActive ? 'bg-white border-slate-200' : 'bg-slate-50 border-slate-300 opacity-60'
                                            }`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <span className={`font-medium ${!reason.isActive && 'line-through text-slate-500'}`}>
                                                    {reason.reasonText}
                                                </span>
                                                {reason.reasonType === 'both' && (
                                                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                                                        شراء وصرف
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex gap-2">
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    onClick={() => handleToggleActive(reason)}
                                                    title={reason.isActive ? 'تعطيل' : 'تفعيل'}
                                                >
                                                    {reason.isActive ? (
                                                        <Icons.Eye className="h-4 w-4" />
                                                    ) : (
                                                        <Icons.EyeOff className="h-4 w-4" />
                                                    )}
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    onClick={() => openEditModal(reason)}
                                                >
                                                    <Icons.Edit className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    className="text-danger hover:bg-red-50"
                                                    onClick={() => handleDeleteReason(reason.id)}
                                                >
                                                    <Icons.Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                        {/* أسباب الصرف */}
                        <div>
                            <h3 className="text-lg font-semibold mb-3 text-secondary">أسباب الصرف</h3>
                            <div className="space-y-2">
                                {dispatchReasons.length === 0 ? (
                                    <p className="text-sm text-slate-500 text-center py-4">لا توجد أسباب صرف</p>
                                ) : (
                                    dispatchReasons.map(reason => (
                                        <div
                                            key={reason.id}
                                            className={`flex items-center justify-between p-3 rounded-md border ${
                                                reason.isActive ? 'bg-white border-slate-200' : 'bg-slate-50 border-slate-300 opacity-60'
                                            }`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <span className={`font-medium ${!reason.isActive && 'line-through text-slate-500'}`}>
                                                    {reason.reasonText}
                                                </span>
                                                {reason.reasonType === 'both' && (
                                                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                                                        شراء وصرف
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex gap-2">
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    onClick={() => handleToggleActive(reason)}
                                                    title={reason.isActive ? 'تعطيل' : 'تفعيل'}
                                                >
                                                    {reason.isActive ? (
                                                        <Icons.Eye className="h-4 w-4" />
                                                    ) : (
                                                        <Icons.EyeOff className="h-4 w-4" />
                                                    )}
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    onClick={() => openEditModal(reason)}
                                                >
                                                    <Icons.Edit className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    className="text-danger hover:bg-red-50"
                                                    onClick={() => handleDeleteReason(reason.id)}
                                                >
                                                    <Icons.Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                        {/* أسباب الإتلاف */}
                        <div>
                            <h3 className="text-lg font-semibold mb-3 text-danger">أسباب الإتلاف</h3>
                            <div className="space-y-2">
                                {scrapReasons.length === 0 ? (
                                    <p className="text-sm text-slate-500 text-center py-4">لا توجد أسباب إتلاف</p>
                                ) : (
                                    scrapReasons.map(reason => (
                                        <div
                                            key={reason.id}
                                            className={`flex items-center justify-between p-3 rounded-md border ${
                                                reason.isActive ? 'bg-white border-slate-200' : 'bg-slate-50 border-slate-300 opacity-60'
                                            }`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <span className={`font-medium ${!reason.isActive && 'line-through text-slate-500'}`}>
                                                    {reason.reasonText}
                                                </span>
                                            </div>
                                            <div className="flex gap-2">
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    onClick={() => handleToggleActive(reason)}
                                                    title={reason.isActive ? 'تعطيل' : 'تفعيل'}
                                                >
                                                    {reason.isActive ? (
                                                        <Icons.Eye className="h-4 w-4" />
                                                    ) : (
                                                        <Icons.EyeOff className="h-4 w-4" />
                                                    )}
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    onClick={() => openEditModal(reason)}
                                                >
                                                    <Icons.Edit className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    className="text-danger hover:bg-red-50"
                                                    onClick={() => handleDeleteReason(reason.id)}
                                                >
                                                    <Icons.Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Add Modal */}
            <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="إضافة سبب جديد">
                <div className="space-y-4">
                    <div>
                        <label htmlFor="reasonText" className="block text-sm font-medium text-slate-700 mb-1">
                            نص السبب*
                        </label>
                        <input
                            type="text"
                            id="reasonText"
                            value={newReasonText}
                            onChange={(e) => setNewReasonText(e.target.value)}
                            className="w-full"
                            placeholder="مثال: احتياج جديد"
                            autoFocus
                        />
                    </div>
                    <div>
                        <label htmlFor="reasonType" className="block text-sm font-medium text-slate-700 mb-1">
                            نوع السبب*
                        </label>
                        <select
                            id="reasonType"
                            value={newReasonType}
                            onChange={(e) => setNewReasonType(e.target.value as 'purchase' | 'dispatch' | 'scrap' | 'both')}
                            className="w-full"
                        >
                            <option value="both">شراء وصرف</option>
                            <option value="purchase">شراء فقط</option>
                            <option value="dispatch">صرف فقط</option>
                            <option value="scrap">إتلاف فقط</option>
                        </select>
                    </div>
                    <div className="flex justify-end gap-3 pt-4">
                        <Button variant="secondary" onClick={() => setIsAddModalOpen(false)}>
                            إلغاء
                        </Button>
                        <Button onClick={handleAddReason}>
                            <Icons.PlusCircle className="h-4 w-4 ml-2" />
                            إضافة
                        </Button>
                    </div>
                </div>
            </Modal>

            {/* Edit Modal */}
            <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="تعديل السبب">
                {editingReason && (
                    <div className="space-y-4">
                        <div>
                            <label htmlFor="editReasonText" className="block text-sm font-medium text-slate-700 mb-1">
                                نص السبب*
                            </label>
                            <input
                                type="text"
                                id="editReasonText"
                                value={editingReason.reasonText}
                                onChange={(e) => setEditingReason({ ...editingReason, reasonText: e.target.value })}
                                className="w-full"
                                autoFocus
                            />
                        </div>
                        <div>
                            <label htmlFor="editReasonType" className="block text-sm font-medium text-slate-700 mb-1">
                                نوع السبب*
                            </label>
                            <select
                                id="editReasonType"
                                value={editingReason.reasonType}
                                onChange={(e) => setEditingReason({ ...editingReason, reasonType: e.target.value as 'purchase' | 'dispatch' | 'scrap' | 'both' })}
                                className="w-full"
                            >
                                <option value="both">شراء وصرف</option>
                                <option value="purchase">شراء فقط</option>
                                <option value="dispatch">صرف فقط</option>
                                <option value="scrap">إتلاف فقط</option>
                            </select>
                        </div>
                        <div className="flex justify-end gap-3 pt-4">
                            <Button variant="secondary" onClick={() => setIsEditModalOpen(false)}>
                                إلغاء
                            </Button>
                            <Button onClick={handleEditReason}>
                                <Icons.Save className="h-4 w-4 ml-2" />
                                حفظ التعديلات
                            </Button>
                        </div>
                    </div>
                )}
            </Modal>
        </>
    );
};

export default ReasonsManager;
