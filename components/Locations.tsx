import React, { useState, useMemo, useEffect } from 'react';
import { UseInventoryReturn, Province, Area, Client } from '../types';
import { Card, CardContent, CardHeader, CardTitle } from './ui/Card';
import { Button } from './ui/Button';
import { Icons } from './icons';
import { Modal } from './ui/Modal';

const Locations: React.FC<{ inventory: UseInventoryReturn }> = ({ inventory }) => {
    // FIX: Correctly destructured nested API functions from the `inventory` object to match the `UseInventoryReturn` type definition, resolving multiple "property does not exist" errors.
    const { 
        provinces, provincesApi: { addProvince, updateProvince, deleteProvince },
        areas, areasApi: { addArea, updateArea, deleteArea },
        clients, clientsApi: { addClient, updateClient, deleteClient },
    } = inventory;

    // State for managing UI selections
    const [selectedProvinceId, setSelectedProvinceId] = useState<string | null>(null);
    const [selectedAreaId, setSelectedAreaId] = useState<string | null>(null);

    // State for modals and forms
    const [modal, setModal] = useState<'province' | 'area' | 'client' | null>(null);
    const [editingItem, setEditingItem] = useState<Province | Area | Client | null>(null);
    const [formData, setFormData] = useState({ name: '', provinceId: '', areaId: '' });

    useEffect(() => {
        // If no province is selected and the province list is loaded, select the first one.
        if (!selectedProvinceId && provinces.length > 0) {
            setSelectedProvinceId(provinces[0].id);
        }
    }, [provinces, selectedProvinceId]);

    // Memoized lists for performance
    const filteredAreas = useMemo(() => {
        if (!selectedProvinceId) return [];
        return areas.filter(a => a.provinceId === selectedProvinceId);
    }, [selectedProvinceId, areas]);

    // FIX: Moved side-effects from useMemo to useEffect to prevent unexpected re-renders and bugs.
    // This effect ensures that an area is always selected if available for the chosen province.
    useEffect(() => {
        const currentAreaIsValid = filteredAreas.some(a => a.id === selectedAreaId);
        if (filteredAreas.length > 0 && !currentAreaIsValid) {
            setSelectedAreaId(filteredAreas[0].id);
        } else if (filteredAreas.length === 0 && selectedAreaId !== null) {
            setSelectedAreaId(null);
        }
    }, [filteredAreas, selectedAreaId]);

    const filteredClients = useMemo(() => {
        if (!selectedAreaId) return [];
        return clients.filter(c => c.areaId === selectedAreaId);
    }, [selectedAreaId, clients]);
    
    // Handlers for selecting items
    const handleProvinceSelect = (id: string) => {
        setSelectedProvinceId(id);
        setSelectedAreaId(null); // Reset area when province changes
    };

    const openModal = (type: 'province' | 'area' | 'client', item: Province | Area | Client | null = null) => {
        setEditingItem(item);
        setModal(type);
        if (item) {
            if ('provinceId' in item) { // Area
                setFormData({ name: item.name, provinceId: item.provinceId, areaId: '' });
            } else if ('areaId' in item) { // Client
                 setFormData({ name: item.name, provinceId: '', areaId: item.areaId });
            } else { // Province
                 setFormData({ name: item.name, provinceId: '', areaId: '' });
            }
        } else {
            // Pre-fill IDs for adding new items based on current selection
            setFormData({ name: '', provinceId: selectedProvinceId || '', areaId: selectedAreaId || '' });
        }
    };
    
    const closeModal = () => {
        setModal(null);
        setEditingItem(null);
    };

    const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleFormSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!modal || !formData.name) return;

        if (editingItem) { // Update
            switch(modal) {
                case 'province': updateProvince({ ...editingItem as Province, name: formData.name }); break;
                case 'area': updateArea({ ...editingItem as Area, name: formData.name, provinceId: formData.provinceId }); break;
                case 'client': updateClient({ ...editingItem as Client, name: formData.name, areaId: formData.areaId }); break;
            }
        } else { // Add
             switch(modal) {
                case 'province': addProvince(formData.name); break;
                case 'area': addArea(formData.name, formData.provinceId); break;
                case 'client': addClient(formData.name, formData.areaId); break;
            }
        }
        closeModal();
    };

    const getModalTitle = () => {
        if (!modal) return '';
        const action = editingItem ? 'تعديل' : 'إضافة';
        const entity = { province: 'محافظة', area: 'منطقة', client: 'عميل / موقع' }[modal];
        return `${action} ${entity} جديد${editingItem ? '' : 'ة'}`;
    };

    const ListItem: React.FC<{item: {id: string, name: string}; onSelect: (id: string) => void; isSelected: boolean; onEdit: () => void; onDelete: () => void;}> = 
        ({ item, onSelect, isSelected, onEdit, onDelete }) => (
        <li 
            className={`flex justify-between items-center p-2 rounded-md cursor-pointer transition-colors ${isSelected ? 'bg-primary text-white' : 'hover:bg-slate-100'}`}
            onClick={() => onSelect(item.id)}
        >
            <span className="font-medium">{item.name}</span>
            <div className={`flex gap-1 ${isSelected ? 'text-white' : 'text-slate-600'}`}>
                <button onClick={(e) => {e.stopPropagation(); onEdit();}} className="p-1 hover:bg-black/10 rounded"><Icons.Edit className="h-4 w-4"/></button>
                <button onClick={(e) => {e.stopPropagation(); onDelete();}} className="p-1 hover:bg-black/10 rounded"><Icons.Trash2 className="h-4 w-4"/></button>
            </div>
        </li>
    );

    // Get the correct list of areas for the client modal
    // For new clients, it shows areas in the selected province
    // For editing clients, it shows areas in the client's current province to avoid confusion
    const areasForClientModal = useMemo(() => {
        if (modal === 'client' && editingItem && 'areaId' in editingItem) {
             const clientArea = areas.find(a => a.id === editingItem.areaId);
             if (clientArea) {
                 return areas.filter(a => a.provinceId === clientArea.provinceId);
             }
        }
        return filteredAreas;
    }, [modal, editingItem, areas, filteredAreas]);

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold text-dark">المواقع والعملاء</h1>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                {/* Provinces */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle>المحافظات</CardTitle>
                        <Button size="sm" variant="ghost" onClick={() => openModal('province')}><Icons.PlusCircle className="h-4 w-4 ml-1"/> إضافة</Button>
                    </CardHeader>
                    <CardContent>
                        <ul className="space-y-2">
                            {provinces.map(p => (
                                <ListItem 
                                    key={p.id}
                                    item={p}
                                    onSelect={handleProvinceSelect}
                                    isSelected={selectedProvinceId === p.id}
                                    onEdit={() => openModal('province', p)}
                                    onDelete={() => deleteProvince(p.id)}
                                />
                            ))}
                        </ul>
                    </CardContent>
                </Card>

                {/* Areas */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle>المناطق</CardTitle>
                        <Button size="sm" variant="ghost" onClick={() => openModal('area')} disabled={!selectedProvinceId}><Icons.PlusCircle className="h-4 w-4 ml-1"/> إضافة</Button>
                    </CardHeader>
                    <CardContent>
                         {selectedProvinceId ? (
                            <ul className="space-y-2">
                                {filteredAreas.map(a => (
                                    <ListItem 
                                        key={a.id}
                                        item={a}
                                        onSelect={setSelectedAreaId}
                                        isSelected={selectedAreaId === a.id}
                                        onEdit={() => openModal('area', a)}
                                        onDelete={() => deleteArea(a.id)}
                                    />
                                ))}
                                {filteredAreas.length === 0 && (
                                    <p className="text-center text-sm text-slate-500 py-4">لا توجد مناطق مضافة لهذه المحافظة.</p>
                                )}
                            </ul>
                         ) : <p className="text-center text-sm text-slate-500 py-4">اختر محافظة لعرض مناطقها.</p>}
                    </CardContent>
                </Card>

                {/* Clients */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle>العملاء / المواقع</CardTitle>
                        <Button size="sm" variant="ghost" onClick={() => openModal('client')} disabled={!selectedAreaId}><Icons.PlusCircle className="h-4 w-4 ml-1"/> إضافة</Button>
                    </CardHeader>
                    <CardContent>
                         {selectedAreaId ? (
                            <ul className="space-y-2">
                                {filteredClients.map(c => (
                                    <li key={c.id} className="flex justify-between items-center p-2 rounded-md hover:bg-slate-100">
                                        <span className="font-medium">{c.name}</span>
                                        <div className="flex gap-1 text-slate-600">
                                            <button onClick={() => openModal('client', c)} className="p-1 hover:bg-slate-200 rounded"><Icons.Edit className="h-4 w-4"/></button>
                                            <button onClick={() => deleteClient(c.id)} className="p-1 hover:bg-slate-200 rounded"><Icons.Trash2 className="h-4 w-4"/></button>
                                        </div>
                                    </li>
                                ))}
                                {filteredClients.length === 0 && (
                                     <p className="text-center text-sm text-slate-500 py-4">لا يوجد عملاء مضافون لهذه المنطقة.</p>
                                )}
                            </ul>
                         ) : <p className="text-center text-sm text-slate-500 py-4">اختر منطقة لعرض عملائها.</p>}
                    </CardContent>
                </Card>
            </div>
            
            <Modal isOpen={!!modal} onClose={closeModal} title={getModalTitle()}>
                <form onSubmit={handleFormSubmit} className="space-y-4">
                    <div>
                        <label htmlFor="name" className="block text-sm font-medium text-slate-700 mb-1">الاسم</label>
                        <input type="text" name="name" id="name" value={formData.name} onChange={handleFormChange} required className="w-full" autoFocus />
                    </div>
                    {modal === 'area' && (
                        <div>
                             <label htmlFor="provinceId" className="block text-sm font-medium text-slate-700 mb-1">المحافظة</label>
                             <select name="provinceId" id="provinceId" value={formData.provinceId} onChange={handleFormChange} required className="w-full" disabled={!!editingItem}>
                                {provinces.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                             </select>
                        </div>
                    )}
                    {modal === 'client' && (
                         <div>
                             <label htmlFor="areaId" className="block text-sm font-medium text-slate-700 mb-1">المنطقة</label>
                             <select name="areaId" id="areaId" value={formData.areaId} onChange={handleFormChange} required className="w-full">
                                {areasForClientModal.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                             </select>
                        </div>
                    )}
                    <div className="flex justify-end gap-3 pt-4">
                        <Button type="button" variant="secondary" onClick={closeModal}>إلغاء</Button>
                        <Button type="submit">حفظ</Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default Locations;