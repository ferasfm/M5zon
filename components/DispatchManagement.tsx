import React, { useState, useMemo } from 'react';
import { UseInventoryReturn, InventoryItem } from '../types';
import { Card, CardContent, CardHeader, CardTitle } from './ui/Card';
import { Button } from './ui/Button';
import { Icons } from './icons';
import { Modal } from './ui/Modal';
import { useNotification } from '../contexts/NotificationContext';
import { formatDate } from '../utils/formatters';

const DispatchManagement: React.FC<{ inventory: UseInventoryReturn }> = ({ inventory }) => {
    const notification = useNotification();
    const { inventoryItems, getProductById, getClientFullNameById, undoDispatch, editDispatch, reasonsApi, provinces, areas, clients } = inventory;
    
    const [searchTerm, setSearchTerm] = useState('');
    const [filterProvinceId, setFilterProvinceId] = useState('');
    const [filterAreaId, setFilterAreaId] = useState('');
    const [selectedClient, setSelectedClient] = useState('');
    const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isUndoModalOpen, setIsUndoModalOpen] = useState(false);
    
    // بيانات التعديل
    const [editProvinceId, setEditProvinceId] = useState('');
    const [editAreaId, setEditAreaId] = useState('');
    const [editClientId, setEditClientId] = useState('');
    const [editDate, setEditDate] = useState('');
    const [editReason, setEditReason] = useState('');
    const [editNotes, setEditNotes] = useState('');
    const [editReference, setEditReference] = useState('');

    const dispatchReasons = reasonsApi.getDispatchReasons();

    // القطع المصروفة فقط
    const dispatchedItems = useMemo(() => {
        return inventoryItems.filter(item => item.status === 'dispatched');
    }, [inventoryItems]);

    // تصفية القطع حسب البحث والمحافظة والمنطقة والعميل
    const filteredItems = useMemo(() => {
        return dispatchedItems.filter(item => {
            const product = getProductById(item.productId);
            
            // تصفية البحث
            const matchesSearch = !searchTerm || 
                item.serialNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                product?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                item.dispatchReference?.toLowerCase().includes(searchTerm.toLowerCase());
            
            // تصفية حسب العميل
            if (selectedClient) {
                return matchesSearch && item.dispatchClientId === selectedClient;
            }
            
            // تصفية حسب المنطقة (إذا لم يتم اختيار عميل محدد)
            if (filterAreaId) {
                const itemClient = clients.find(c => c.id === item.dispatchClientId);
                return matchesSearch && itemClient?.areaId === filterAreaId;
            }
            
            // تصفية حسب المحافظة (إذا لم يتم اختيار منطقة أو عميل)
            if (filterProvinceId) {
                const itemClient = clients.find(c => c.id === item.dispatchClientId);
                const itemArea = areas.find(a => a.id === itemClient?.areaId);
                return matchesSearch && itemArea?.provinceId === filterProvinceId;
            }
            
            // إذا لم يتم اختيار أي تصفية، عرض الكل
            return matchesSearch;
        });
    }, [dispatchedItems, searchTerm, selectedClient, filterProvinceId, filterAreaId, getProductById, clients, areas]);

    // تجميع القطع حسب رقم المرجع والعميل والتاريخ
    const groupedDispatches = useMemo(() => {
        const groups = new Map<string, InventoryItem[]>();
        
        filteredItems.forEach(item => {
            const key = `${item.dispatchClientId}_${item.dispatchDate?.toISOString()}_${item.dispatchReference || 'no-ref'}`;
            if (!groups.has(key)) {
                groups.set(key, []);
            }
            groups.get(key)!.push(item);
        });
        
        return Array.from(groups.values()).sort((a, b) => {
            const dateA = a[0].dispatchDate?.getTime() || 0;
            const dateB = b[0].dispatchDate?.getTime() || 0;
            return dateB - dateA; // الأحدث أولاً
        });
    }, [filteredItems]);

    const handleSelectAll = (items: InventoryItem[]) => {
        const newSelected = new Set(selectedItems);
        const allSelected = items.every(item => newSelected.has(item.id));
        
        if (allSelected) {
            items.forEach(item => newSelected.delete(item.id));
        } else {
            items.forEach(item => newSelected.add(item.id));
        }
        
        setSelectedItems(newSelected);
    };

    const handleSelectItem = (itemId: string) => {
        const newSelected = new Set(selectedItems);
        if (newSelected.has(itemId)) {
            newSelected.delete(itemId);
        } else {
            newSelected.add(itemId);
        }
        setSelectedItems(newSelected);
    };

    const openEditModal = () => {
        if (selectedItems.size === 0) {
            notification?.addNotification('الرجاء اختيار قطع للتعديل', 'error');
            return;
        }
        
        // تعبئة البيانات الحالية من أول قطعة محددة
        const firstItem = inventoryItems.find(item => selectedItems.has(item.id));
        if (firstItem) {
            setEditClientId(firstItem.dispatchClientId || '');
            setEditDate(firstItem.dispatchDate ? firstItem.dispatchDate.toISOString().split('T')[0] : '');
            setEditReason(firstItem.dispatchReason || '');
            setEditNotes(firstItem.dispatchNotes || '');
            setEditReference(firstItem.dispatchReference || '');
            
            // تحديد المحافظة والمنطقة
            if (firstItem.dispatchClientId) {
                const client = clients.find(c => c.id === firstItem.dispatchClientId);
                if (client) {
                    const area = areas.find(a => a.id === client.areaId);
                    if (area) {
                        setEditProvinceId(area.provinceId);
                        setEditAreaId(area.id);
                    }
                }
            }
        }
        
        setIsEditModalOpen(true);
    };

    const handleEdit = async () => {
        if (selectedItems.size === 0) return;
        
        const updates: any = {};
        if (editClientId) updates.dispatchClientId = editClientId;
        if (editDate) updates.dispatchDate = new Date(editDate);
        if (editReason) updates.dispatchReason = editReason;
        if (editNotes !== undefined) updates.dispatchNotes = editNotes;
        if (editReference !== undefined) updates.dispatchReference = editReference;
        
        const success = await editDispatch(Array.from(selectedItems), updates);
        
        if (success) {
            setIsEditModalOpen(false);
            setSelectedItems(new Set());
            resetEditForm();
        }
    };

    const handleUndo = async () => {
        if (selectedItems.size === 0) return;
        
        const success = await undoDispatch(Array.from(selectedItems));
        
        if (success) {
            setIsUndoModalOpen(false);
            setSelectedItems(new Set());
        }
    };

    const resetEditForm = () => {
        setEditProvinceId('');
        setEditAreaId('');
        setEditClientId('');
        setEditDate('');
        setEditReason('');
        setEditNotes('');
        setEditReference('');
    };

    const filteredAreas = useMemo(() => {
        if (!editProvinceId) return [];
        return areas.filter(area => area.provinceId === editProvinceId);
    }, [areas, editProvinceId]);

    const filteredClients = useMemo(() => {
        if (!editAreaId) return [];
        return clients.filter(client => client.areaId === editAreaId);
    }, [clients, editAreaId]);

    // تصفية للبحث
    const filterAreas = useMemo(() => {
        if (!filterProvinceId) return [];
        return areas.filter(area => area.provinceId === filterProvinceId);
    }, [areas, filterProvinceId]);

    const filterClients = useMemo(() => {
        if (!filterAreaId) return [];
        return clients.filter(client => client.areaId === filterAreaId)
            .sort((a, b) => a.name.localeCompare(b.name));
    }, [clients, filterAreaId]);

    return (
        <>
            <div className="space-y-6">
                <div className="flex justify-between items-center">
                    <h1 className="text-3xl font-bold text-dark">إدارة التسليمات</h1>
                    <div className="flex gap-2">
                        <Button 
                            onClick={openEditModal}
                            disabled={selectedItems.size === 0}
                            variant="secondary"
                        >
                            <Icons.Edit className="h-5 w-5 ml-2" />
                            تعديل ({selectedItems.size})
                        </Button>
                        <Button 
                            onClick={() => setIsUndoModalOpen(true)}
                            disabled={selectedItems.size === 0}
                            variant="ghost"
                            className="text-danger hover:bg-red-50"
                        >
                            <Icons.Undo className="h-5 w-5 ml-2" />
                            إلغاء التسليم ({selectedItems.size})
                        </Button>
                    </div>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>البحث والتصفية</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    بحث (رقم تسلسلي، منتج، مرجع)
                                </label>
                                <input
                                    type="text"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    placeholder="ابحث هنا..."
                                    className="w-full"
                                />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">
                                        المحافظة
                                    </label>
                                    <select
                                        value={filterProvinceId}
                                        onChange={(e) => {
                                            setFilterProvinceId(e.target.value);
                                            setFilterAreaId('');
                                            setSelectedClient('');
                                        }}
                                        className="w-full"
                                    >
                                        <option value="">-- جميع المحافظات --</option>
                                        {provinces.map(p => (
                                            <option key={p.id} value={p.id}>{p.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">
                                        المنطقة
                                    </label>
                                    <select
                                        value={filterAreaId}
                                        onChange={(e) => {
                                            setFilterAreaId(e.target.value);
                                            setSelectedClient('');
                                        }}
                                        disabled={!filterProvinceId}
                                        className="w-full disabled:bg-gray-100 disabled:cursor-not-allowed"
                                    >
                                        <option value="">-- جميع المناطق --</option>
                                        {filterAreas.map(a => (
                                            <option key={a.id} value={a.id}>{a.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">
                                        العميل
                                    </label>
                                    <select
                                        value={selectedClient}
                                        onChange={(e) => setSelectedClient(e.target.value)}
                                        disabled={!filterAreaId}
                                        className="w-full disabled:bg-gray-100 disabled:cursor-not-allowed"
                                    >
                                        <option value="">-- جميع العملاء --</option>
                                        {filterClients.map(c => (
                                            <option key={c.id} value={c.id}>{c.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>التسليمات ({groupedDispatches.length} تسليم)</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {groupedDispatches.length === 0 ? (
                            <p className="text-center text-slate-500 py-8">لا توجد تسليمات</p>
                        ) : (
                            <div className="space-y-4">
                                {groupedDispatches.map((group, idx) => {
                                    const firstItem = group[0];
                                    const allSelected = group.every(item => selectedItems.has(item.id));
                                    const someSelected = group.some(item => selectedItems.has(item.id));
                                    
                                    return (
                                        <div key={idx} className="border rounded-lg p-4 bg-slate-50">
                                            <div className="flex justify-between items-start mb-3">
                                                <div className="flex items-start gap-3">
                                                    <input
                                                        type="checkbox"
                                                        checked={allSelected}
                                                        ref={input => {
                                                            if (input) input.indeterminate = someSelected && !allSelected;
                                                        }}
                                                        onChange={() => handleSelectAll(group)}
                                                        className="mt-1"
                                                    />
                                                    <div>
                                                        <h3 className="font-bold text-lg">
                                                            {getClientFullNameById(firstItem.dispatchClientId || '')}
                                                        </h3>
                                                        <div className="text-sm text-slate-600 space-y-1">
                                                            <p>📅 التاريخ: {formatDate(firstItem.dispatchDate!)}</p>
                                                            {firstItem.dispatchReference && (
                                                                <p>📄 المرجع: {firstItem.dispatchReference}</p>
                                                            )}
                                                            {firstItem.dispatchReason && (
                                                                <p>📝 السبب: {firstItem.dispatchReason}</p>
                                                            )}
                                                            {firstItem.dispatchNotes && (
                                                                <p>💬 ملاحظات: {firstItem.dispatchNotes}</p>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                                <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                                                    {group.length} قطعة
                                                </span>
                                            </div>
                                            
                                            <div className="mt-3 border-t pt-3">
                                                <table className="w-full text-sm">
                                                    <thead className="text-xs text-slate-700 uppercase bg-white">
                                                        <tr>
                                                            <th className="px-3 py-2 text-right">✓</th>
                                                            <th className="px-3 py-2 text-right">المنتج</th>
                                                            <th className="px-3 py-2 text-right">الرقم التسلسلي</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {group.map(item => {
                                                            const product = getProductById(item.productId);
                                                            return (
                                                                <tr key={item.id} className="border-t">
                                                                    <td className="px-3 py-2">
                                                                        <input
                                                                            type="checkbox"
                                                                            checked={selectedItems.has(item.id)}
                                                                            onChange={() => handleSelectItem(item.id)}
                                                                        />
                                                                    </td>
                                                                    <td className="px-3 py-2">{product?.name}</td>
                                                                    <td className="px-3 py-2 font-mono text-xs">{item.serialNumber}</td>
                                                                </tr>
                                                            );
                                                        })}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Modal تعديل التسليم */}
            <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="تعديل بيانات التسليم">
                <div className="space-y-4 p-6">
                    <p className="text-sm text-slate-600">
                        سيتم تعديل {selectedItems.size} قطعة. اترك الحقول فارغة إذا كنت لا تريد تعديلها.
                    </p>
                    
                    <div className="grid grid-cols-3 gap-3">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">المحافظة</label>
                            <select
                                value={editProvinceId}
                                onChange={(e) => {
                                    setEditProvinceId(e.target.value);
                                    setEditAreaId('');
                                    setEditClientId('');
                                }}
                                className="w-full"
                            >
                                <option value="">-- اختر --</option>
                                {provinces.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">المنطقة</label>
                            <select
                                value={editAreaId}
                                onChange={(e) => {
                                    setEditAreaId(e.target.value);
                                    setEditClientId('');
                                }}
                                disabled={!editProvinceId}
                                className="w-full disabled:bg-gray-100"
                            >
                                <option value="">-- اختر --</option>
                                {filteredAreas.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">العميل</label>
                            <select
                                value={editClientId}
                                onChange={(e) => setEditClientId(e.target.value)}
                                disabled={!editAreaId}
                                className="w-full disabled:bg-gray-100"
                            >
                                <option value="">-- اختر --</option>
                                {filteredClients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">تاريخ التسليم</label>
                        <input
                            type="date"
                            value={editDate}
                            onChange={(e) => setEditDate(e.target.value)}
                            className="w-full"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">سبب التسليم</label>
                        <select
                            value={editReason}
                            onChange={(e) => setEditReason(e.target.value)}
                            className="w-full"
                        >
                            <option value="">-- اختر السبب --</option>
                            {dispatchReasons.map(reason => (
                                <option key={reason.id} value={reason.reasonText}>{reason.reasonText}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">رقم المرجع</label>
                        <input
                            type="text"
                            value={editReference}
                            onChange={(e) => setEditReference(e.target.value)}
                            className="w-full"
                            placeholder="رقم الفاتورة أو الطلب"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">ملاحظات</label>
                        <textarea
                            value={editNotes}
                            onChange={(e) => setEditNotes(e.target.value)}
                            rows={3}
                            className="w-full"
                            placeholder="ملاحظات إضافية..."
                        />
                    </div>

                    <div className="flex gap-3 pt-4">
                        <Button onClick={handleEdit} className="flex-1">
                            <Icons.Check className="h-5 w-5 ml-2" />
                            حفظ التعديلات
                        </Button>
                        <Button onClick={() => setIsEditModalOpen(false)} variant="secondary" className="flex-1">
                            إلغاء
                        </Button>
                    </div>
                </div>
            </Modal>

            {/* Modal إلغاء التسليم */}
            <Modal isOpen={isUndoModalOpen} onClose={() => setIsUndoModalOpen(false)} title="تأكيد إلغاء التسليم">
                <div className="space-y-4 p-6">
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                        <p className="text-yellow-800 font-medium">⚠️ تحذير</p>
                        <p className="text-sm text-yellow-700 mt-2">
                            سيتم إلغاء تسليم {selectedItems.size} قطعة وإرجاعها إلى المخزون.
                            سيتم حذف جميع بيانات التسليم (العميل، التاريخ، السبب، المرجع).
                        </p>
                    </div>

                    <div className="flex gap-3 pt-4">
                        <Button onClick={handleUndo} variant="ghost" className="flex-1 text-danger hover:bg-red-50">
                            <Icons.Undo className="h-5 w-5 ml-2" />
                            تأكيد الإلغاء
                        </Button>
                        <Button onClick={() => setIsUndoModalOpen(false)} variant="secondary" className="flex-1">
                            إلغاء
                        </Button>
                    </div>
                </div>
            </Modal>
        </>
    );
};

export default DispatchManagement;
