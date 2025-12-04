
import React, { useState, useMemo } from 'react';
import { UseInventoryReturn, Product } from '../types';
import { Card, CardContent, CardHeader, CardTitle } from './ui/Card';
import { Button } from './ui/Button';
import { Icons } from './icons';
import { Modal } from './ui/Modal';
import ProductForm from './ProductForm';
import { convertArabicInput } from '../utils/converters';
import { formatCurrency } from '../utils/currencyHelper';

const Products: React.FC<{ inventory: UseInventoryReturn }> = ({ inventory }) => {
    const { products, categories, addProduct, updateProduct, deleteProduct, inventoryItems, getProductById } = inventory;

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);
    const [productTypeForCreation, setProductTypeForCreation] = useState<'standard' | 'bundle'>('standard');
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [activeTab, setActiveTab] = useState<'standard' | 'bundle'>('standard');

    const openModalForNew = () => {
        setEditingProduct(null);
        setProductTypeForCreation(activeTab);
        setIsModalOpen(true);
    };

    const openModalForEdit = (product: Product) => {
        setEditingProduct(product);
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setEditingProduct(null);
    };

    const handleSubmit = (productData: Omit<Product, 'id'> | Product) => {
        if ('id' in productData) {
            updateProduct(productData);
        } else {
            addProduct(productData);
        }
        closeModal();
    };

    const getStockCount = (productId: string) => {
        return inventoryItems.filter(item => item.productId === productId && item.status === 'in_stock').length;
    };

    // Filter logic for standard products
    const filteredStandardProducts = useMemo(() => {
        // تصفية صارمة: فقط المنتجات العادية (استبعاد الحزم والمنتجات غير المحددة)
        const standardProducts = products.filter(p =>
            p.productType === 'standard' ||
            (!p.productType && (!p.components || p.components.length === 0))
        );

        console.log('📦 إجمالي المنتجات:', products.length);
        console.log('✅ المنتجات العادية:', standardProducts.length);
        console.log('🔍 المنتجات المصفاة:', standardProducts.map(p => ({ name: p.name, type: p.productType })));

        return standardProducts.filter(p => {
            const matchesSearch = !searchTerm || (
                p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                p.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (p.category && p.category.toLowerCase().includes(searchTerm.toLowerCase()))
            );
            const matchesCategory = selectedCategory === 'all' || p.categoryId === selectedCategory;
            return matchesSearch && matchesCategory;
        });
    }, [products, searchTerm, selectedCategory]);

    // Filter logic for bundle products
    const filteredBundleProducts = useMemo(() => {
        // تصفية صارمة: فقط الحزم (التي لها مكونات)
        const bundleProducts = products.filter(p =>
            p.productType === 'bundle' ||
            (p.components && p.components.length > 0)
        );

        return bundleProducts.filter(p => {
            const matchesSearch = !searchTerm || (
                p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                p.sku.toLowerCase().includes(searchTerm.toLowerCase())
            );
            return matchesSearch;
        });
    }, [products, searchTerm]);

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold text-dark">المنتجات</h1>
                <Button onClick={openModalForNew}>
                    <Icons.PlusCircle className="h-4 w-4 ml-2" />
                    {activeTab === 'standard' ? 'إضافة منتج جديد' : 'إضافة حزمة جديدة'}
                </Button>
            </div>

            {/* Tabs */}
            <div className="border-b border-slate-200">
                <nav className="-mb-px flex gap-6" aria-label="Tabs">
                    <button
                        onClick={() => setActiveTab('standard')}
                        className={`shrink-0 border-b-2 px-1 pb-4 text-sm font-medium ${activeTab === 'standard'
                                ? 'border-primary text-primary'
                                : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700'
                            }`}
                    >
                        📦 المنتجات العادية
                    </button>
                    <button
                        onClick={() => setActiveTab('bundle')}
                        className={`shrink-0 border-b-2 px-1 pb-4 text-sm font-medium ${activeTab === 'bundle'
                                ? 'border-primary text-primary'
                                : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700'
                            }`}
                    >
                        📦 الحزم والمجموعات
                    </button>
                </nav>
            </div>

            {/* Search and Filter */}
            <div className="mt-4 flex flex-col md:flex-row gap-4">
                <input
                    type="text"
                    placeholder="بحث في المنتجات..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full md:w-1/3 p-2 border border-gray-300 rounded-md"
                />

                {activeTab === 'standard' && (
                    <select
                        value={selectedCategory}
                        onChange={(e) => setSelectedCategory(e.target.value)}
                        className="w-full md:w-1/4 p-2 border border-gray-300 rounded-md"
                    >
                        <option value="all">جميع الفئات</option>
                        {categories.map(category => (
                            <option key={category.id} value={category.id}>
                                {category.name}
                            </option>
                        ))}
                    </select>
                )}
            </div>

            {/* Standard Products Tab */}
            {activeTab === 'standard' && (
                <Card>
                    <CardHeader>
                        <CardTitle>قائمة المنتجات العادية</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <table className="w-full text-sm text-right">
                            <thead className="text-xs text-slate-700 uppercase bg-slate-100">
                                <tr>
                                    <th className="px-4 py-3">الاسم</th>
                                    <th className="px-4 py-3">بار كود المنتج</th>
                                    <th className="px-4 py-3">الفئة</th>
                                    <th className="px-4 py-3">التكلفة</th>
                                    <th className="px-4 py-3">المخزون الحالي</th>
                                    <th className="px-4 py-3">إجراءات</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredStandardProducts.map(product => (
                                    <tr key={product.id} className="bg-white border-b border-slate-200 hover:bg-slate-50">
                                        <td className="px-4 py-3 font-medium">{product.name}</td>
                                        <td className="px-4 py-3 font-mono">{product.sku}</td>
                                        <td className="px-4 py-3">
                                            {(() => {
                                                const category = categories.find(c => c.id === product.categoryId);
                                                if (category) {
                                                    return (
                                                        <span
                                                            className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium"
                                                            style={{
                                                                backgroundColor: category.color + '20',
                                                                color: category.color
                                                            }}
                                                        >
                                                            <span>{category.icon}</span>
                                                            <span>{category.name}</span>
                                                        </span>
                                                    );
                                                }
                                                return <span className="text-slate-400">{product.category || 'غير محدد'}</span>;
                                            })()}
                                        </td>
                                        <td className="px-4 py-3">{formatCurrency(product.standardCostPrice)}</td>
                                        <td className="px-4 py-3 font-bold">{getStockCount(product.id)}</td>
                                        <td className="px-4 py-3">
                                            <div className="flex gap-2">
                                                <Button variant="ghost" size="sm" onClick={() => openModalForEdit(product)}>
                                                    <Icons.Edit className="h-4 w-4" />
                                                </Button>
                                                <Button variant="ghost" size="sm" className="text-danger hover:bg-red-50" onClick={() => deleteProduct(product.id)}>
                                                    <Icons.Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {filteredStandardProducts.length === 0 && (
                            <div className="col-span-full text-center py-12 text-slate-500">
                                <p>لا توجد منتجات تطابق بحثك.</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* Bundle Products Tab */}
            {activeTab === 'bundle' && (
                <Card>
                    <CardHeader>
                        <CardTitle>قائمة الحزم والمجموعات</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <table className="w-full text-sm text-right">
                            <thead className="text-xs text-slate-700 uppercase bg-slate-100">
                                <tr>
                                    <th className="px-4 py-3">اسم الحزمة</th>
                                    <th className="px-4 py-3">بار كود</th>
                                    <th className="px-4 py-3">المكونات</th>
                                    <th className="px-4 py-3">التكلفة الإجمالية</th>
                                    <th className="px-4 py-3">المخزون الحالي</th>
                                    <th className="px-4 py-3">إجراءات</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredBundleProducts.map(bundle => (
                                    <tr key={bundle.id} className="bg-white border-b border-slate-200 hover:bg-slate-50">
                                        <td className="px-4 py-3 font-medium">{bundle.name}</td>
                                        <td className="px-4 py-3 font-mono">{bundle.sku}</td>
                                        <td className="px-4 py-3">
                                            {bundle.components && bundle.components.length > 0 ? (
                                                <div className="text-xs space-y-1">
                                                    {bundle.components.map((comp, idx) => {
                                                        const product = getProductById(comp.productId);
                                                        return (
                                                            <div key={idx} className="text-slate-600">
                                                                • {product?.name || 'منتج محذوف'} × {comp.quantity}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            ) : (
                                                <span className="text-slate-400">لا توجد مكونات</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3">{formatCurrency(bundle.standardCostPrice)}</td>
                                        <td className="px-4 py-3 font-bold">{getStockCount(bundle.id)}</td>
                                        <td className="px-4 py-3">
                                            <div className="flex gap-2">
                                                <Button variant="ghost" size="sm" onClick={() => openModalForEdit(bundle)}>
                                                    <Icons.Edit className="h-4 w-4" />
                                                </Button>
                                                <Button variant="ghost" size="sm" className="text-danger hover:bg-red-50" onClick={() => deleteProduct(bundle.id)}>
                                                    <Icons.Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {filteredBundleProducts.length === 0 && (
                            <div className="col-span-full text-center py-12 text-slate-500">
                                <p>لا توجد حزم. قم بإضافة حزمة جديدة.</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            <Modal
                isOpen={isModalOpen}
                onClose={closeModal}
                title={editingProduct ? `تعديل: ${editingProduct.name}` : 'إضافة منتج جديد'}
            >
                <ProductForm
                    product={editingProduct}
                    productTypeForCreation={productTypeForCreation}
                    products={products}
                    categories={categories}
                    onSubmit={handleSubmit}
                    onCancel={closeModal}
                />
            </Modal>
        </div>
    );
};

export default Products;
