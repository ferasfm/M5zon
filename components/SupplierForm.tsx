
import React, { useState, useEffect } from 'react';
import { Supplier } from '../types';
import { Button } from './ui/Button';

interface SupplierFormProps {
    supplier: Supplier | null;
    onSubmit: (supplierData: Omit<Supplier, 'id' | 'priceAgreements'> | Supplier) => void;
    onCancel: () => void;
}

const SupplierForm: React.FC<SupplierFormProps> = ({ supplier, onSubmit, onCancel }) => {
    const [formData, setFormData] = useState({
        name: '',
        contactPerson: '',
        phone: '',
        email: '',
        address: ''
    });

    useEffect(() => {
        if (supplier) {
            setFormData({
                name: supplier.name,
                contactPerson: supplier.contactPerson || '',
                phone: supplier.phone || '',
                email: supplier.email || '',
                address: supplier.address || '',
            });
        } else {
            setFormData({ name: '', contactPerson: '', phone: '', email: '', address: '' });
        }
    }, [supplier]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (supplier) {
            onSubmit({ ...supplier, ...formData });
        } else {
            onSubmit(formData);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <label htmlFor="name" className="block text-sm font-medium text-slate-700 mb-1">اسم المورد*</label>
                <input type="text" name="name" id="name" value={formData.name} onChange={handleChange} required />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label htmlFor="contactPerson" className="block text-sm font-medium text-slate-700 mb-1">جهة الاتصال</label>
                    <input type="text" name="contactPerson" id="contactPerson" value={formData.contactPerson} onChange={handleChange} />
                </div>
                <div>
                    <label htmlFor="phone" className="block text-sm font-medium text-slate-700 mb-1">الهاتف</label>
                    <input type="tel" name="phone" id="phone" value={formData.phone} onChange={handleChange} />
                </div>
            </div>
            <div>
                <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1">البريد الإلكتروني</label>
                <input type="email" name="email" id="email" value={formData.email} onChange={handleChange} />
            </div>
            <div>
                <label htmlFor="address" className="block text-sm font-medium text-slate-700 mb-1">العنوان</label>
                <textarea name="address" id="address" value={formData.address} onChange={handleChange} rows={2}></textarea>
            </div>
            <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="secondary" onClick={onCancel}>إلغاء</Button>
                <Button type="submit">حفظ</Button>
            </div>
        </form>
    );
};

export default SupplierForm;
