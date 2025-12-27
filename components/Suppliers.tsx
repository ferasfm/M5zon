
import React, { useState, useMemo } from 'react';
import { UseInventoryReturn, Supplier } from '../types';
import { Card, CardContent, CardHeader, CardTitle } from './ui/Card';
import { Button } from './ui/Button';
import { Icons } from './icons';
import { Modal } from './ui/Modal';
import SupplierForm from './SupplierForm';
import SupplierProfile from './SupplierProfile';
import SupplierPriceAgreement from './SupplierPriceAgreement';
import { convertArabicInput } from '../utils/converters';

const Suppliers: React.FC<{ inventory: UseInventoryReturn }> = ({ inventory }) => {
    const { suppliers, addSupplier, updateSupplier, deleteSupplier } = inventory;

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
    const [viewingSupplierId, setViewingSupplierId] = useState<string | null>(null);
    const [viewingPriceAgreement, setViewingPriceAgreement] = useState<{ id: string; name: string } | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    const openModalForNew = () => {
        setEditingSupplier(null);
        setIsModalOpen(true);
    };

    const openModalForEdit = (supplier: Supplier) => {
        setEditingSupplier(supplier);
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setEditingSupplier(null);
    };

    const handleSubmit = (supplierData: Omit<Supplier, 'id' | 'priceAgreements'> | Supplier) => {
        if ('id' in supplierData) {
            updateSupplier(supplierData);
        } else {
            addSupplier(supplierData);
        }
        closeModal();
    };

    const filteredSuppliers = useMemo(() => {
        return suppliers.filter(s =>
            s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (s.contactPerson && s.contactPerson.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (s.phone && s.phone.includes(searchTerm))
        );
    }, [suppliers, searchTerm]);

    if (viewingPriceAgreement) {
        return (
            <div className="space-y-4">
                <Button onClick={() => setViewingPriceAgreement(null)} variant="secondary">
                    <Icons.ArrowLeft className="h-4 w-4 ml-2" />
                    العودة للموردين
                </Button>
                <SupplierPriceAgreement 
                    supplierId={viewingPriceAgreement.id} 
                    supplierName={viewingPriceAgreement.name}
                />
            </div>
        );
    }

    if (viewingSupplierId) {
        return <SupplierProfile supplierId={viewingSupplierId} onBack={() => setViewingSupplierId(null)} inventory={inventory} />;
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold text-dark">الموردون</h1>
                <Button onClick={openModalForNew}>
                    <Icons.PlusCircle className="h-4 w-4 ml-2" />
                    إضافة مورد جديد
                </Button>
            </div>
            
            <Card>
                <CardHeader>
                    <CardTitle>قائمة الموردين</CardTitle>
                    <div className="mt-4">
                        <input
                            type="text"
                            placeholder="بحث بالاسم، جهة الاتصال أو الهاتف..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full md:w-1/3"
                        />
                    </div>
                </CardHeader>
                <CardContent>
                    <table className="w-full text-sm text-right">
                        <thead className="text-xs text-slate-700 uppercase bg-slate-100">
                            <tr>
                                <th className="px-4 py-3">الاسم</th>
                                <th className="px-4 py-3">جهة الاتصال</th>
                                <th className="px-4 py-3">الهاتف</th>
                                <th className="px-4 py-3">البريد الإلكتروني</th>
                                <th className="px-4 py-3">إجراءات</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredSuppliers.map(supplier => (
                                <tr key={supplier.id} className="bg-white border-b border-slate-200 hover:bg-slate-50">
                                    <td className="px-4 py-3 font-medium">
                                        <button onClick={() => setViewingSupplierId(supplier.id)} className="text-primary hover:underline">{supplier.name}</button>
                                    </td>
                                    <td className="px-4 py-3">{supplier.contactPerson || '-'}</td>
                                    <td className="px-4 py-3">{supplier.phone || '-'}</td>
                                    <td className="px-4 py-3">{supplier.email || '-'}</td>
                                    <td className="px-4 py-3">
                                        <div className="flex gap-2">
                                            <Button 
                                                variant="ghost" 
                                                size="sm" 
                                                onClick={() => setViewingPriceAgreement({ id: supplier.id, name: supplier.name })}
                                                title="اتفاقية الأسعار"
                                            >
                                                <Icons.FileText className="h-4 w-4" />
                                            </Button>
                                            <Button variant="ghost" size="sm" onClick={() => openModalForEdit(supplier)}>
                                                <Icons.Edit className="h-4 w-4" />
                                            </Button>
                                            <Button variant="ghost" size="sm" className="text-danger hover:bg-red-50" onClick={() => deleteSupplier(supplier.id)}>
                                                <Icons.Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </CardContent>
            </Card>

            <Modal
                isOpen={isModalOpen}
                onClose={closeModal}
                title={editingSupplier ? `تعديل المورد: ${editingSupplier.name}` : 'إضافة مورد جديد'}
            >
                <SupplierForm
                    supplier={editingSupplier}
                    onSubmit={handleSubmit}
                    onCancel={closeModal}
                />
            </Modal>
        </div>
    );
};

export default Suppliers;
