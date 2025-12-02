
import React, { useState, useMemo } from 'react';
import { UseInventoryReturn, Product } from '../types';
import { Card, CardContent, CardHeader, CardTitle } from './ui/Card';
import { Button } from './ui/Button';
import { Icons } from './icons';
import { Modal } from './ui/Modal';
import ProductForm from './ProductForm';
import { convertArabicInput } from '../utils/converters';
import { formatCurrency } from '../utils/formatters';

const Products: React.FC<{ inventory: UseInventoryReturn }> = ({ inventory }) => {
    const { products, categories, addProduct, updateProduct, deleteProduct, inventoryItems, getProductById } = inventory;

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);
    const [productTypeForCreation, setProductTypeForCreation] = useState<'standard' | 'bundle'>('standard');
    const [searchTerm, setSearchTerm] = useState('');
    const [activeTab, setActiveTab] = useState<'standard' | 'bundle'>('standard');

    // دالة لحساب حالة الحزمة
    const getBundleStatus = (bundle: Product) => {
        if (!bundle.components || bundle.components.length === 0) {
            return { isComplete: true, missing: [] };
        }

        const missing: string[] = [];
        let isComplete = true;

        for (const component of bundle.components) {
            const availableItems = inventoryItems.filter(
                item => item.productId === component.productId && item.status === 'in_stock'
            );

            if (availableItems.length < component.quantity) {
                isComplete = false;
                const product = getProductById(component.productId);
                missing.push(`${product?.name || 'منتج'} (${availableItems.length}/${component.quantity})`);
            }
        }

        return { isComplete, missing };
    };

    const openModalForNew = (type: 'standard' | 'bundle') => {
        setEditingProduct(null);
        setProductTypeForCreation(type);
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

    // Separate products by type
    const standardProducts = useMemo(() => products.filter(p => p.productType === 'standard'), [products]);
    const bundleProducts = useMemo(() => products.filter(p => p.productType === 'bundle'), [products]);

    // Filter logic for standard products
    const filteredStandardProducts = useMemo(() => {
        if (!searchTerm) return standardProducts;
        return standardProducts.filter(p => 
            p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.category.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [standardProducts, searchTerm]);

    // Filter logic for bundle products
    const filteredBundleProducts = useMemo(() => {
        if (!searchTerm) return bundleProducts;
        return bundleProducts.filter(p => 
            p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.sku.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [bundleProducts, searchTerm]);

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold text-dark">المنتجات</h1>
                <div className="flex gap-2">
                    <Button onClick={() => openModalForNew('standard')}>
                        <Icons.PlusCircle className="h-4 w-4 ml-2" />
                        إضافة منتج عادي
                    </Button>
                     <Button onClick={() => openModalForNew('bundle')} variant="secondary">
                        <Icons.PlusCircle className="h-4 w-4 ml-2" />
                        إضافة حزمة
                    </Button>
                </div>
            </div>
            
             {/* Tabs Navigation */}
            <div className="border-b border-slate-200">
                <nav className="-mb-px flex gap-6" aria-label="Tabs">
                    <button
                        onClick={() => setActiveTab('standard')}
                        className={`shrink-0 border-b-2 px-1 pb-4 text-sm font-medium ${
                            activeTab === 'standard' 
                            ? 'border-primary text-primary' 
                            : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700'
                        }`}
                    >
                        المنتجات العادية ({standardProducts.length})
                    </button>
                    <button
                        onClick={() => setActiveTab('bundle')}
                        className={`shrink-0 border-b-2 px-1 pb-4 text-sm font-medium ${
                            activeTab === 'bundle' 
                            ? 'border-primary text-primary' 
                            : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700'
                        }`}
                    >
                        الحزم ({bundleProducts.length})
                    </button>
                </nav>
            </div>

            {/* Search Bar */}
             <div className="mt-4">
                <input
                    type="text"
                    placeholder={`بحث في ${activeTab === 'standard' ? 'المنتجات العادية' : 'الحزم'}...`}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full md:w-1/3"
                />
            </div>
            
            {/* Conditional Rendering based on Tab */}
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

            {activeTab === 'bundle' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredBundleProducts.map(bundle => {
                        const bundleStatus = getBundleStatus(bundle);
                        return (
                            <Card key={bundle.id} className="flex flex-col">
                                <CardHeader>
                                    <div className="flex justify-between items-start">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-1">
                                                <CardTitle>{bundle.name}</CardTitle>
                                                {bundleStatus.isComplete ? (
                                                    <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                                                        <Icons.CheckCircle className="h-3 w-3" />
                                                        كاملة
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                                                        <Icons.AlertTriangle className="h-3 w-3" />
                                                        ناقصة
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-xs text-slate-500 font-mono">باركود: {bundle.sku}</p>
                                        </div>
                                        <div className="flex gap-1 flex-shrink-0">
                                            <Button variant="ghost" size="sm" onClick={() => openModalForEdit(bundle)}>
                                                <Icons.Edit className="h-4 w-4" />
                                            </Button>
                                            <Button variant="ghost" size="sm" className="text-danger hover:bg-red-50" onClick={() => deleteProduct(bundle.id)}>
                                                <Icons.Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="flex-grow">
                                    <p className="text-lg font-bold text-primary mb-4">
                                        {formatCurrency(bundle.standardCostPrice)}
                                        <span className="text-xs font-normal text-slate-500"> / تكلفة الحزمة</span>
                                    </p>
                                    <h4 className="text-sm font-semibold text-slate-700 mb-2">المكونات:</h4>
                                    <ul className="space-y-2 text-sm text-slate-600">
                                        {bundle.components?.map(comp => {
                                            const componentProduct = getProductById(comp.productId);
                                            const availableItems = inventoryItems.filter(
                                                item => item.productId === comp.productId && item.status === 'in_stock'
                                            );
                                            const isComponentComplete = availableItems.length >= comp.quantity;
                                            
                                            return (
                                                <li 
                                                    key={comp.productId} 
                                                    className={`flex justify-between items-center p-2 rounded-md ${
                                                        isComponentComplete 
                                                            ? 'bg-green-50 border border-green-200' 
                                                            : 'bg-red-50 border border-red-200'
                                                    }`}
                                                >
                                                    <span className={isComponentComplete ? 'text-green-900' : 'text-red-900'}>
                                                        {componentProduct?.name || 'منتج غير معروف'}
                                                    </span>
                                                    <span className={`font-bold ${isComponentComplete ? 'text-green-700' : 'text-red-700'}`}>
                                                        {availableItems.length}/{comp.quantity}
                                                    </span>
                                                </li>
                                            );
                                        })}
                                    </ul>
                                    {!bundleStatus.isComplete && bundleStatus.missing.length > 0 && (
                                        <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded-md">
                                            <p className="text-xs font-semibold text-yellow-900 mb-1">منتجات ناقصة:</p>
                                            <p className="text-xs text-yellow-700">{bundleStatus.missing.join(', ')}</p>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        );
                    })}
                     {filteredBundleProducts.length === 0 && (
                        <div className="col-span-full text-center py-12 text-slate-500">
                            <p>لا توجد حزم تطابق بحثك.</p>
                        </div>
                    )}
                </div>
            )}


            <Modal
                isOpen={isModalOpen}
                onClose={closeModal}
                title={editingProduct ? `تعديل: ${editingProduct.name}` : `إضافة ${productTypeForCreation === 'bundle' ? 'حزمة' : 'منتج'} جديد`}
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
