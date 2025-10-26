import React from 'react';
import { UseInventoryReturn, InventoryItem, Client } from '../types';

interface DeliveryNoteProps {
    client: Client | undefined;
    date: string;
    reference: string;
    items: InventoryItem[];
    inventory: UseInventoryReturn;
}

const DeliveryNote: React.FC<DeliveryNoteProps> = ({ client, date, reference, items, inventory }) => {
    const { getProductById, getClientFullNameById } = inventory;

    return (
        <div className="p-8 bg-white text-dark font-sans text-sm" dir="rtl">
            <header className="flex justify-between items-center border-b pb-4 mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-primary">سند تسليم بضاعة</h1>
                    <p>Delivery Note</p>
                </div>
                <div className="text-left">
                    <h2 className="font-bold text-lg">نظام المخزون الاحترافي</h2>
                    <p className="text-slate-500">تاريخ الطباعة: {new Date().toLocaleString('ar-EG')}</p>
                </div>
            </header>

            <section className="grid grid-cols-2 gap-6 mb-8">
                <div className="bg-slate-50 p-4 rounded-md">
                    <h3 className="font-bold text-slate-600 border-b pb-1 mb-2">تفاصيل العميل</h3>
                    <p><span className="font-semibold">العميل / الموقع:</span> {client ? getClientFullNameById(client.id) : 'غير محدد'}</p>
                </div>
                 <div className="bg-slate-50 p-4 rounded-md">
                    <h3 className="font-bold text-slate-600 border-b pb-1 mb-2">تفاصيل التسليم</h3>
                    <p><span className="font-semibold">تاريخ التسليم:</span> {new Date(date).toLocaleDateString('ar-EG')}</p>
                    <p><span className="font-semibold">رقم المرجع:</span> {reference || 'لا يوجد'}</p>
                </div>
            </section>

            <section>
                 <table className="w-full text-right border-collapse">
                    <thead className="bg-slate-100">
                        <tr>
                            <th className="border p-2 font-semibold">م.</th>
                            <th className="border p-2 font-semibold">اسم المنتج</th>
                            <th className="border p-2 font-semibold">بار كود القطعة (Serial Number)</th>
                        </tr>
                    </thead>
                    <tbody>
                        {items.map((item, index) => {
                            const product = getProductById(item.productId);
                            return (
                                <tr key={item.id} className="hover:bg-slate-50">
                                    <td className="border p-2">{index + 1}</td>
                                    <td className="border p-2">{product?.name || 'منتج غير معروف'}</td>
                                    <td className="border p-2 font-mono">{item.serialNumber}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </section>

            <footer className="mt-20 pt-8 grid grid-cols-2 gap-8 text-center">
                <div>
                    <p className="font-semibold">.................................................</p>
                    <p className="mt-2">توقيع المستلم</p>
                    <p className="text-xs text-slate-500">(Receiver's Signature)</p>
                </div>
                 <div>
                    <p className="font-semibold">.................................................</p>
                    <p className="mt-2">توقيع المسلّم</p>
                    <p className="text-xs text-slate-500">(Giver's Signature)</p>
                </div>
            </footer>
        </div>
    );
};

export default DeliveryNote;