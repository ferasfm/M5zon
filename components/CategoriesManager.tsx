import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/Card';
import { Button } from './ui/Button';
import { Icons } from './icons';
import { Modal } from './ui/Modal';
import { UseInventoryReturn, Category } from '../types';

interface CategoriesManagerProps {
    inventory: UseInventoryReturn;
}

const CategoriesManager: React.FC<CategoriesManagerProps> = ({ inventory }) => {
    const { categories, categoriesApi } = inventory;
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingCategory, setEditingCategory] = useState<Category | null>(null);
    
    // حقول النموذج
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [color, setColor] = useState('#3B82F6');
    const [icon, setIcon] = useState('📦');

    const resetForm = () => {
        setName('');
        setDescription('');
        setColor('#3B82F6');
        setIcon('📦');
    };

    const handleAddCategory = async () => {
        if (!name.trim()) {
            alert('يرجى إدخال اسم الفئة');
            return;
        }

        try {
            await categoriesApi.addCategory(name, description, color, icon);
            setIsAddModalOpen(false);
            resetForm();
        } catch (error) {
            console.error('خطأ في إضافة الفئة:', error);
            alert('حدث خطأ أثناء إضافة الفئة');
        }
    };

    const handleEditCategory = async () => {
        if (!editingCategory || !name.trim()) {
            alert('يرجى إدخال اسم الفئة');
            return;
        }

        try {
            await categoriesApi.updateCategory({
                ...editingCategory,
                name,
                description,
                color,
                icon
            });
            setIsEditModalOpen(false);
            setEditingCategory(null);
            resetForm();
        } catch (error) {
            console.error('خطأ في تحديث الفئة:', error);
            alert('حدث خطأ أثناء تحديث الفئة');
        }
    };

    const handleDeleteCategory = async (categoryId: string) => {
        if (!confirm('هل أنت متأكد من حذف هذه الفئة؟ سيتم إلغاء ربطها بالمنتجات المرتبطة بها.')) {
            return;
        }

        try {
            await categoriesApi.deleteCategory(categoryId);
        } catch (error) {
            console.error('خطأ في حذف الفئة:', error);
            alert('حدث خطأ أثناء حذف الفئة');
        }
    };

    const openEditModal = (category: Category) => {
        setEditingCategory(category);
        setName(category.name);
        setDescription(category.description || '');
        setColor(category.color);
        setIcon(category.icon);
        setIsEditModalOpen(true);
    };

    const openAddModal = () => {
        resetForm();
        setIsAddModalOpen(true);
    };

    // الألوان المتاحة
    const availableColors = [
        { name: 'أزرق', value: '#3B82F6' },
        { name: 'بنفسجي', value: '#8B5CF6' },
        { name: 'سماوي', value: '#06B6D4' },
        { name: 'أخضر', value: '#10B981' },
        { name: 'أصفر', value: '#F59E0B' },
        { name: 'أحمر', value: '#EF4444' },
        { name: 'وردي', value: '#EC4899' },
        { name: 'رمادي', value: '#6B7280' },
    ];

    // الأيقونات المتاحة
    const availableIcons = ['📦', '💻', '📱', '🖥️', '🖨️', '⌨️', '🖱️', '🎧', '📷', '🎮', '⌚', '💡', '🔧', '🛠️', '📚', '🎨'];

    return (
        <Card>
            <CardHeader>
                <div className="flex justify-between items-center">
                    <CardTitle>إدارة الفئات</CardTitle>
                    <Button onClick={openAddModal}>
                        <Icons.Plus className="h-4 w-4 ml-2" />
                        إضافة فئة جديدة
                    </Button>
                </div>
            </CardHeader>
            <CardContent>
                <div className="space-y-3">
                    {categories.length === 0 ? (
                        <p className="text-center text-slate-500 py-8">لا توجد فئات. قم بإضافة فئة جديدة.</p>
                    ) : (
                        categories
                            .sort((a, b) => a.displayOrder - b.displayOrder)
                            .map((category) => (
                                <div
                                    key={category.id}
                                    className="flex items-center justify-between p-4 border border-slate-200 rounded-lg hover:bg-slate-50"
                                >
                                    <div className="flex items-center gap-4">
                                        <div
                                            className="w-12 h-12 rounded-lg flex items-center justify-center text-2xl"
                                            style={{ backgroundColor: category.color + '20' }}
                                        >
                                            {category.icon}
                                        </div>
                                        <div>
                                            <h4 className="font-semibold text-dark">{category.name}</h4>
                                            {category.description && (
                                                <p className="text-sm text-slate-600">{category.description}</p>
                                            )}
                                            <div className="flex items-center gap-2 mt-1">
                                                <span
                                                    className="inline-block w-3 h-3 rounded-full"
                                                    style={{ backgroundColor: category.color }}
                                                />
                                                <span className="text-xs text-slate-500">{category.color}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <Button
                                            variant="secondary"
                                            size="sm"
                                            onClick={() => openEditModal(category)}
                                        >
                                            <Icons.Edit className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            variant="danger"
                                            size="sm"
                                            onClick={() => handleDeleteCategory(category.id)}
                                        >
                                            <Icons.Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            ))
                    )}
                </div>
            </CardContent>

            {/* نموذج إضافة فئة */}
            <Modal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                title="إضافة فئة جديدة"
            >
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                            اسم الفئة *
                        </label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full p-2 border border-gray-300 rounded-md"
                            placeholder="مثال: إلكترونيات"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                            الوصف
                        </label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="w-full p-2 border border-gray-300 rounded-md"
                            rows={3}
                            placeholder="وصف مختصر للفئة"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                            اللون
                        </label>
                        <div className="grid grid-cols-4 gap-2">
                            {availableColors.map((c) => (
                                <button
                                    key={c.value}
                                    type="button"
                                    onClick={() => setColor(c.value)}
                                    className={`p-3 rounded-lg border-2 transition-all ${
                                        color === c.value ? 'border-slate-900 scale-105' : 'border-slate-200'
                                    }`}
                                    style={{ backgroundColor: c.value }}
                                    title={c.name}
                                />
                            ))}
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                            الأيقونة
                        </label>
                        <div className="grid grid-cols-8 gap-2">
                            {availableIcons.map((i) => (
                                <button
                                    key={i}
                                    type="button"
                                    onClick={() => setIcon(i)}
                                    className={`p-2 text-2xl rounded-lg border-2 transition-all ${
                                        icon === i ? 'border-primary bg-primary/10' : 'border-slate-200'
                                    }`}
                                >
                                    {i}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-4">
                        <Button variant="secondary" onClick={() => setIsAddModalOpen(false)}>
                            إلغاء
                        </Button>
                        <Button onClick={handleAddCategory}>
                            <Icons.Plus className="h-4 w-4 ml-2" />
                            إضافة الفئة
                        </Button>
                    </div>
                </div>
            </Modal>

            {/* نموذج تعديل فئة */}
            <Modal
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                title="تعديل الفئة"
            >
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                            اسم الفئة *
                        </label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full p-2 border border-gray-300 rounded-md"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                            الوصف
                        </label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="w-full p-2 border border-gray-300 rounded-md"
                            rows={3}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                            اللون
                        </label>
                        <div className="grid grid-cols-4 gap-2">
                            {availableColors.map((c) => (
                                <button
                                    key={c.value}
                                    type="button"
                                    onClick={() => setColor(c.value)}
                                    className={`p-3 rounded-lg border-2 transition-all ${
                                        color === c.value ? 'border-slate-900 scale-105' : 'border-slate-200'
                                    }`}
                                    style={{ backgroundColor: c.value }}
                                    title={c.name}
                                />
                            ))}
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                            الأيقونة
                        </label>
                        <div className="grid grid-cols-8 gap-2">
                            {availableIcons.map((i) => (
                                <button
                                    key={i}
                                    type="button"
                                    onClick={() => setIcon(i)}
                                    className={`p-2 text-2xl rounded-lg border-2 transition-all ${
                                        icon === i ? 'border-primary bg-primary/10' : 'border-slate-200'
                                    }`}
                                >
                                    {i}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-4">
                        <Button variant="secondary" onClick={() => setIsEditModalOpen(false)}>
                            إلغاء
                        </Button>
                        <Button onClick={handleEditCategory}>
                            <Icons.Save className="h-4 w-4 ml-2" />
                            حفظ التعديلات
                        </Button>
                    </div>
                </div>
            </Modal>
        </Card>
    );
};

export default CategoriesManager;
