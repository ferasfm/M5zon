import { useState, useMemo, useCallback, useEffect } from 'react';
import type React from 'react';
import { InventoryItem, Product, Supplier, Province, Area, Client, TransactionReason, Category, UseInventoryReturn, NewItem, PriceAgreement } from '../types';
import { useNotification } from '../contexts/NotificationContext';
import { useSupabase } from '../contexts/SupabaseContext';
import { appConfig as settings } from '../config';

export const useInventory = (): UseInventoryReturn | null => {
    const { supabase } = useSupabase();
    const notification = useNotification();

    const [products, setProducts] = useState<Product[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [provinces, setProvinces] = useState<Province[]>([]);
    const [areas, setAreas] = useState<Area[]>([]);
    const [clients, setClients] = useState<Client[]>([]);
    const [transactionReasons, setTransactionReasons] = useState<TransactionReason[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [loadingMessage, setLoadingMessage] = useState('جاري الاتصال بقاعدة البيانات...');

    const fetchData = useCallback(async () => {
        if (!supabase) return;

        setIsLoading(true);
        setLoadingMessage('جاري الاتصال بقاعدة البيانات...');

        const fetchTable = async (tableName: string, setter: React.Dispatch<any>) => {
            const { data, error } = await supabase.from(tableName).select('*');
            if (error) {
                notification?.addNotification(`Failed to fetch ${tableName}: ${error.message}`, 'error');
            } else {
                // Supabase returns dates as strings, convert them back to Date objects
                if (tableName === 'inventory_items' && data) {
                    const parsedData = data.map((item: any) => ({
                        ...item,
                        purchaseDate: new Date(item.purchase_date),
                        dispatchDate: item.dispatch_date ? new Date(item.dispatch_date) : undefined,
                        scrapDate: item.scrap_date ? new Date(item.scrap_date) : undefined,
                        warrantyEndDate: item.warranty_end_date ? new Date(item.warranty_end_date) : undefined,
                        productId: item.product_id,
                        costPrice: item.cost_price,
                        supplierId: item.supplier_id,
                        destinationClientId: item.destination_client_id,
                        dispatchClientId: item.dispatch_client_id,
                        purchaseReason: item.purchase_reason,
                        dispatchReason: item.dispatch_reason,
                        dispatchNotes: item.dispatch_notes,
                        dispatchReference: item.dispatch_reference,
                        scrapReason: item.scrap_reason,
                        scrapNotes: item.scrap_notes,
                        serialNumber: item.serial_number,
                        bundleGroupId: item.bundle_group_id,
                        bundleName: item.bundle_name
                    }));
                    setter(parsedData);
                } else if (tableName === 'suppliers' && data) {
                    const parsedData = data.map((supplier: any) => ({
                        ...supplier,
                        contactPerson: supplier.contact_person,
                        priceAgreements: supplier.price_agreements?.map((pa: any) => ({
                            ...pa,
                            startDate: new Date(pa.start_date)
                        })) || []
                    }));
                    setter(parsedData);
                } else if (tableName === 'products' && data) {
                    const parsedData = data.map((product: any) => ({
                        ...product,
                        hasWarranty: product.has_warranty,
                        standardCostPrice: product.standard_cost_price,
                        warrantyDurationValue: product.warranty_duration_value,
                        warrantyDurationUnit: product.warranty_duration_unit,
                        productType: product.product_type,
                        categoryId: product.category_id,
                        category: product.category
                    }));
                    setter(parsedData);
                } else if (tableName === 'provinces' && data) {
                    setter(data || []);
                } else if (tableName === 'areas' && data) {
                    const parsedData = data.map((area: any) => ({
                        ...area,
                        provinceId: area.province_id
                    }));
                    setter(parsedData);
                } else if (tableName === 'clients' && data) {
                    const parsedData = data.map((client: any) => ({
                        ...client,
                        areaId: client.area_id
                    }));
                    setter(parsedData);
                } else {
                    setter(data || []);
                }
            }
        };

        // Fetch transaction reasons
        const fetchReasons = async () => {
            const { data, error } = await supabase.from('transaction_reasons').select('*').order('display_order');
            if (error) {
                notification?.addNotification(`Failed to fetch transaction reasons: ${error.message}`, 'error');
            } else if (data) {
                const parsedData = data.map((reason: any) => ({
                    id: reason.id,
                    reasonText: reason.reason_text,
                    reasonType: reason.reason_type,
                    isActive: reason.is_active,
                    displayOrder: reason.display_order
                }));
                setTransactionReasons(parsedData);
            }
        };

        // Fetch categories
        const fetchCategories = async () => {
            const { data, error } = await supabase.from('categories').select('*').order('display_order');
            if (error) {
                notification?.addNotification(`Failed to fetch categories: ${error.message}`, 'error');
            } else if (data) {
                const parsedData = data.map((cat: any) => ({
                    id: cat.id,
                    name: cat.name,
                    description: cat.description,
                    color: cat.color,
                    icon: cat.icon,
                    isActive: cat.is_active,
                    displayOrder: cat.display_order
                }));
                setCategories(parsedData);
            }
        };

        try {
            // تحميل البيانات الأساسية أولاً (Priority Loading)
            // المرحلة 1: البيانات الأساسية (الأسرع والأهم)
            setLoadingMessage('جاري تحميل الإعدادات الأساسية...');
            await Promise.all([
                fetchCategories(),
                fetchTable('provinces', setProvinces),
            ]);

            // المرحلة 2: البيانات المتوسطة
            setLoadingMessage('جاري تحميل الموردين والمواقع...');
            await Promise.all([
                fetchTable('areas', setAreas),
                fetchTable('suppliers', setSuppliers),
                fetchReasons(),
            ]);

            // المرحلة 3: البيانات الثقيلة
            setLoadingMessage('جاري تحميل المنتجات...');
            await Promise.all([
                fetchTable('products', setProducts),
                fetchTable('clients', setClients),
            ]);

            // المرحلة 4: البيانات الأثقل (المخزون)
            setLoadingMessage('جاري تحميل المخزون...');
            await fetchTable('inventory_items', setInventoryItems);

            setLoadingMessage('تم التحميل بنجاح!');
            setIsLoading(false);
        } catch (error) {
            console.error('خطأ في تحميل البيانات:', error);
            setLoadingMessage('حدث خطأ في تحميل البيانات');
            setIsLoading(false);
        }
    }, [supabase, notification]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const wipeAllData = async () => {
        if (!supabase) {
            notification?.addNotification('لا يوجد اتصال بقاعدة البيانات', 'error');
            return;
        }

        const tables = ['inventory_items', 'products', 'suppliers', 'clients', 'areas', 'provinces'];

        try {
            console.log('🗑️ بدء عملية حذف جميع البيانات...');

            for (const table of tables) {
                console.log(`🗑️ حذف البيانات من جدول: ${table}`);

                // أولاً، جلب جميع الصفوف ثم حذفها
                const { data: allRows, error: fetchError } = await supabase
                    .from(table)
                    .select('id');

                if (fetchError) {
                    console.error(`❌ خطأ في جلب بيانات جدول ${table}:`, fetchError);
                    throw fetchError;
                }

                if (allRows && allRows.length > 0) {
                    const { error } = await supabase
                        .from(table)
                        .delete()
                        .in('id', allRows.map(row => row.id));

                    if (error) {
                        console.error(`❌ خطأ في حذف جدول ${table}:`, error);
                        throw error;
                    }

                    console.log(`✅ تم حذف ${allRows.length} صف من جدول ${table}`);
                } else {
                    console.log(`ℹ️ جدول ${table} فارغ بالفعل`);
                }

                console.log(`✅ تم حذف جدول ${table} بنجاح`);
            }

            console.log('✅ تم حذف جميع البيانات بنجاح');
            notification?.addNotification('تم حذف جميع البيانات بنجاح.', 'success');

            // إعادة تحميل البيانات
            await fetchData();

        } catch (error: any) {
            console.error('❌ فشل في حذف البيانات:', error);
            notification?.addNotification(`فشل حذف البيانات: ${error.message}`, 'error');
        }
    };

    // --- UTILITY GETTERS ---
    const getProductById = useCallback((productId: string) => products.find(p => p.id === productId), [products]);
    const getSupplierById = useCallback((supplierId: string) => suppliers.find(s => s.id === supplierId), [suppliers]);
    const getClientById = useCallback((clientId: string) => clients.find(c => c.id === clientId), [clients]);
    const findItemBySerial = useCallback((serial: string) => inventoryItems.find(i => i.serialNumber.toLowerCase() === serial.toLowerCase()), [inventoryItems]);

    const getClientFullNameById = useCallback((clientId: string) => {
        const client = clients.find(c => c.id === clientId);
        if (!client) return 'Unknown Client';
        const area = areas.find(a => a.id === client.areaId);
        if (!area) return client.name;
        const province = provinces.find(p => p.id === area.provinceId);
        return `${client.name} - ${area.name}, ${province?.name || 'Unknown Province'}`;
    }, [clients, areas, provinces]);

    const getItemLocationName = useCallback((item: InventoryItem): string => {
        const locationId = item.status === 'dispatched' ? item.dispatchClientId : item.destinationClientId;
        if (!locationId) return 'مستودع IT';
        return getClientFullNameById(locationId) || 'موقع غير معروف';
    }, [getClientFullNameById]);

    // --- PRODUCTS API ---
    const addProduct = async (productData: Omit<Product, 'id'>) => {
        console.log('➕ محاولة إضافة منتج:', productData);
        
        if (!supabase) {
            console.error('❌ لا يوجد اتصال بقاعدة البيانات');
            notification?.addNotification('لا يوجد اتصال بقاعدة البيانات', 'error');
            return;
        }
        
        // الحصول على اسم الفئة من معرف الفئة
        const selectedCategory = categories.find(c => c.id === productData.categoryId);
        const categoryName = selectedCategory?.name || productData.category || '';

        console.log('📂 الفئة المختارة:', { categoryId: productData.categoryId, categoryName });

        // تحويل أسماء الخصائص لتتوافق مع قاعدة البيانات
        const dbProductData = {
            ...productData,
            has_warranty: productData.hasWarranty,
            standard_cost_price: productData.standardCostPrice,
            warranty_duration_value: productData.warrantyDurationValue,
            warranty_duration_unit: productData.warrantyDurationUnit,
            product_type: productData.productType,
            // تحديث اسم الفئة من الفئات المتاحة
            category: categoryName,
            // تحويل string فارغ إلى null لحقول UUID
            category_id: productData.categoryId && productData.categoryId.trim() !== ''
                ? productData.categoryId
                : null
        };

        // حذف الخصائص القديمة
        delete dbProductData.hasWarranty;
        delete dbProductData.standardCostPrice;
        delete dbProductData.warrantyDurationValue;
        delete dbProductData.warrantyDurationUnit;
        delete dbProductData.productType;
        delete dbProductData.categoryId;

        console.log('💾 البيانات المرسلة لقاعدة البيانات:', dbProductData);
        console.log('📝 اسم المنتج المُرسل:', dbProductData.name);
        console.log('🔍 نوع supabase:', typeof supabase);
        console.log('🔍 supabase.from:', typeof supabase?.from);

        const { data, error } = await supabase.from('products').insert([dbProductData]).select();
        
        if (error) {
            console.error('❌ خطأ في إضافة المنتج:', error);
            notification?.addNotification(`فشل إضافة المنتج: ${error.message}`, 'error');
        } else if (data) {
            console.log('✅ البيانات المُرجعة من قاعدة البيانات:', data);
            console.log('📦 عدد الصفوف المُرجعة:', data.length);
            console.log('📝 data[0] كامل:', JSON.stringify(data[0], null, 2));
            console.log('📝 اسم المنتج المُرجع من data[0]:', data[0]?.name);
            console.log('📝 اسم المنتج الأصلي المُرسل:', dbProductData.name);
            
            if (!data[0]) {
                console.error('❌ لم يتم إرجاع أي بيانات من قاعدة البيانات!');
                notification?.addNotification('تم إضافة المنتج ولكن لم يتم إرجاع البيانات', 'error');
                return;
            }
            
            const parsedProduct = {
                ...data[0],
                hasWarranty: data[0].has_warranty,
                standardCostPrice: data[0].standard_cost_price,
                warrantyDurationValue: data[0].warranty_duration_value,
                warrantyDurationUnit: data[0].warranty_duration_unit,
                productType: data[0].product_type,
                categoryId: data[0].category_id,
                category: data[0].category
            };
            
            console.log('🔄 المنتج بعد التحويل:', parsedProduct);
            console.log('🔄 اسم المنتج بعد التحويل:', parsedProduct.name);
            
            setProducts(prev => [...prev, parsedProduct]);
            
            // استخدام الاسم من البيانات المُرجعة مباشرة
            const productName = data[0]?.name || dbProductData.name || 'المنتج';
            console.log('📢 الاسم الذي سيظهر في الإشعار:', productName);
            notification?.addNotification(`تمت إضافة المنتج "${productName}" بنجاح.`, 'success');
        }
    };
    const updateProduct = async (updatedProduct: Product) => {
        if (!supabase) return;

        // الحصول على اسم الفئة من معرف الفئة
        const selectedCategory = categories.find(c => c.id === updatedProduct.categoryId);
        const categoryName = selectedCategory?.name || updatedProduct.category || '';

        console.log('🔄 تحديث المنتج:', {
            productName: updatedProduct.name,
            categoryId: updatedProduct.categoryId,
            oldCategory: updatedProduct.category,
            newCategory: categoryName,
            selectedCategory: selectedCategory?.name
        });

        // تحويل أسماء الخصائص لتتوافق مع قاعدة البيانات
        const dbProductData = {
            ...updatedProduct,
            has_warranty: updatedProduct.hasWarranty,
            standard_cost_price: updatedProduct.standardCostPrice,
            warranty_duration_value: updatedProduct.warrantyDurationValue,
            warranty_duration_unit: updatedProduct.warrantyDurationUnit,
            product_type: updatedProduct.productType,
            // تحديث اسم الفئة من الفئات المتاحة
            category: categoryName,
            // تحويل string فارغ إلى null لحقول UUID
            category_id: updatedProduct.categoryId && updatedProduct.categoryId.trim() !== ''
                ? updatedProduct.categoryId
                : null
        };

        // حذف الخصائص القديمة
        delete dbProductData.hasWarranty;
        delete dbProductData.standardCostPrice;
        delete dbProductData.warrantyDurationValue;
        delete dbProductData.warrantyDurationUnit;
        delete dbProductData.productType;
        delete dbProductData.categoryId;

        const { data, error } = await supabase.from('products').update(dbProductData).eq('id', updatedProduct.id).select();
        if (error) {
            notification?.addNotification(`فشل تحديث المنتج: ${error.message}`, 'error');
        } else if (data) {
            const parsedProduct = {
                ...data[0],
                hasWarranty: data[0].has_warranty,
                standardCostPrice: data[0].standard_cost_price,
                warrantyDurationValue: data[0].warranty_duration_value,
                warrantyDurationUnit: data[0].warranty_duration_unit,
                productType: data[0].product_type,
                categoryId: data[0].category_id,
                category: data[0].category
            };
            setProducts(prev => prev.map(p => p.id === updatedProduct.id ? parsedProduct : p));
            notification?.addNotification(`تم تحديث المنتج "${updatedProduct.name}" بنجاح.`, 'success');
        }
    };
    const deleteProduct = async (productId: string) => {
        if (!supabase) return;
        if (inventoryItems.some(item => item.productId === productId)) {
            notification?.addNotification('لا يمكن حذف المنتج لأنه مرتبط بقطع في المخزون.', 'error');
            return;
        }
        const { error } = await supabase.from('products').delete().eq('id', productId);
        if (error) {
            notification?.addNotification(`فشل حذف المنتج: ${error.message}`, 'error');
        } else {
            setProducts(prev => prev.filter(p => p.id !== productId));
            notification?.addNotification('تم حذف المنتج بنجاح.', 'success');
        }
    };

    // --- INVENTORY ITEMS API ---
    const receiveItems = async (items: NewItem[]): Promise<boolean> => {
        if (!supabase) return false;

        for (const item of items) {
            if (findItemBySerial(item.serialNumber)) {
                notification?.addNotification(`خطأ: الرقم التسلسلي ${item.serialNumber} موجود بالفعل.`, 'error');
                return false;
            }
        }

        const itemsToInsert = items.map(item => {
            const product = getProductById(item.productId);
            let warrantyEndDate: Date | undefined = undefined;
            if (product?.hasWarranty && product.warrantyDurationValue) {
                const endDate = new Date(item.purchaseDate);
                const unit = product.warrantyDurationUnit || 'months';
                const duration = product.warrantyDurationValue;
                if (unit === 'days') endDate.setDate(endDate.getDate() + duration);
                if (unit === 'months') endDate.setMonth(endDate.getMonth() + duration);
                if (unit === 'years') endDate.setFullYear(endDate.getFullYear() + duration);
                warrantyEndDate = endDate;
            }
            // تحويل أسماء الأعمدة لتتوافق مع قاعدة البيانات
            const dbItem: any = {
                product_id: item.productId,
                serial_number: item.serialNumber,
                cost_price: item.costPrice,
                status: item.status,
                purchase_date: item.purchaseDate,
                supplier_id: item.supplierId,
                destination_client_id: item.destinationClientId,
                purchase_reason: item.purchaseReason,
                warranty_end_date: warrantyEndDate,
                bundle_group_id: item.bundleGroupId, // إضافة معرف الحزمة
                bundle_name: item.bundleName // إضافة اسم الحزمة
            };

            return dbItem;
        });

        const { data, error } = await supabase.from('inventory_items').insert(itemsToInsert).select();

        if (error) {
            notification?.addNotification(`فشل استلام القطع: ${error.message}`, 'error');
            return false;
        }
        if (data) {
            const parsedData = data.map((item: any) => ({
                ...item,
                purchaseDate: new Date(item.purchase_date),
                dispatchDate: item.dispatch_date ? new Date(item.dispatch_date) : undefined,
                scrapDate: item.scrap_date ? new Date(item.scrap_date) : undefined,
                warrantyEndDate: item.warranty_end_date ? new Date(item.warranty_end_date) : undefined,
                productId: item.product_id,
                costPrice: item.cost_price,
                supplierId: item.supplier_id,
                destinationClientId: item.destination_client_id,
                dispatchClientId: item.dispatch_client_id,
                purchaseReason: item.purchase_reason,
                dispatchReason: item.dispatch_reason,
                dispatchNotes: item.dispatch_notes,
                dispatchReference: item.dispatch_reference,
                scrapReason: item.scrap_reason,
                scrapNotes: item.scrap_notes,
                serialNumber: item.serial_number,
                bundleGroupId: item.bundle_group_id,
                bundleName: item.bundle_name
            }));
            setInventoryItems(prev => [...prev, ...parsedData]);
            return true;
        }
        return false;
    };

    const dispatchItems = async (itemIds: string[], dispatchClientId: string, dispatchDate: Date, reason: string, notes?: string, reference?: string) => {
        if (!supabase) return;
        
        // التحقق من أن جميع القطع متاحة في المخزون
        const itemsToDispatch = inventoryItems.filter(item => itemIds.includes(item.id));
        const unavailableItems = itemsToDispatch.filter(item => item.status !== 'in_stock');
        
        if (unavailableItems.length > 0) {
            const unavailableNames = unavailableItems.map(item => {
                const product = getProductById(item.productId);
                return `${product?.name || 'منتج'} (${item.serialNumber})`;
            }).join(', ');
            
            notification?.addNotification(
                `لا يمكن صرف القطع التالية لأنها غير متاحة في المخزون: ${unavailableNames}`,
                'error'
            );
            return;
        }
        
        const updates = {
            status: 'dispatched',
            dispatch_client_id: dispatchClientId,
            dispatch_date: dispatchDate,
            dispatch_reason: reason,
            dispatch_notes: notes,
            dispatch_reference: reference
        };
        const { data, error } = await supabase.from('inventory_items').update(updates).in('id', itemIds).select();
        if (error) {
            notification?.addNotification(`فشل صرف القطع: ${error.message}`, 'error');
        } else if (data) {
            setInventoryItems(prev => prev.map(item => {
                const updatedItem = data.find(d => d.id === item.id);
                if (!updatedItem) return item;
                return {
                    ...updatedItem,
                    purchaseDate: new Date(updatedItem.purchase_date),
                    dispatchDate: new Date(updatedItem.dispatch_date),
                    scrapDate: updatedItem.scrap_date ? new Date(updatedItem.scrap_date) : undefined,
                    warrantyEndDate: updatedItem.warranty_end_date ? new Date(updatedItem.warranty_end_date) : undefined,
                    productId: updatedItem.product_id,
                    costPrice: updatedItem.cost_price,
                    supplierId: updatedItem.supplier_id,
                    destinationClientId: updatedItem.destination_client_id,
                    dispatchClientId: updatedItem.dispatch_client_id,
                    purchaseReason: updatedItem.purchase_reason,
                    dispatchReason: updatedItem.dispatch_reason,
                    dispatchNotes: updatedItem.dispatch_notes,
                    dispatchReference: updatedItem.dispatch_reference,
                    scrapReason: updatedItem.scrap_reason,
                    scrapNotes: updatedItem.scrap_notes,
                    serialNumber: updatedItem.serial_number
                };
            }));
            notification?.addNotification(`تم صرف ${itemIds.length} قطعة بنجاح.`, 'success');
        }
    };

    const undoDispatch = async (itemIds: string[]): Promise<boolean> => {
        if (!supabase) return false;

        // التحقق من أن جميع القطع في حالة dispatched
        const itemsToUndo = inventoryItems.filter(item => itemIds.includes(item.id));
        const nonDispatchedItems = itemsToUndo.filter(item => item.status !== 'dispatched');

        if (nonDispatchedItems.length > 0) {
            notification?.addNotification('بعض القطع المحددة ليست في حالة "مصروفة". لا يمكن إلغاء التسليم.', 'error');
            return false;
        }

        const updates = {
            status: 'in_stock',
            dispatch_client_id: null,
            dispatch_date: null,
            dispatch_reason: null,
            dispatch_notes: null,
            dispatch_reference: null
        };

        const { data, error } = await supabase.from('inventory_items').update(updates).in('id', itemIds).select();

        if (error) {
            notification?.addNotification(`فشل إلغاء التسليم: ${error.message}`, 'error');
            return false;
        } else if (data) {
            setInventoryItems(prev => prev.map(item => {
                const updatedItem = data.find(d => d.id === item.id);
                if (!updatedItem) return item;
                return {
                    ...updatedItem,
                    purchaseDate: new Date(updatedItem.purchase_date),
                    dispatchDate: undefined,
                    scrapDate: updatedItem.scrap_date ? new Date(updatedItem.scrap_date) : undefined,
                    warrantyEndDate: updatedItem.warranty_end_date ? new Date(updatedItem.warranty_end_date) : undefined,
                    productId: updatedItem.product_id,
                    costPrice: updatedItem.cost_price,
                    supplierId: updatedItem.supplier_id,
                    destinationClientId: updatedItem.destination_client_id,
                    dispatchClientId: undefined,
                    purchaseReason: updatedItem.purchase_reason,
                    dispatchReason: undefined,
                    dispatchNotes: undefined,
                    dispatchReference: undefined,
                    scrapReason: updatedItem.scrap_reason,
                    scrapNotes: updatedItem.scrap_notes,
                    serialNumber: updatedItem.serial_number,
                    bundleGroupId: updatedItem.bundle_group_id,
                    bundleName: updatedItem.bundle_name
                };
            }));
            notification?.addNotification(`تم إلغاء تسليم ${itemIds.length} قطعة بنجاح وإرجاعها للمخزون.`, 'success');
            return true;
        }
        return false;
    };

    const editDispatch = async (itemIds: string[], updates: { dispatchClientId?: string; dispatchDate?: Date; dispatchReason?: string; dispatchNotes?: string; dispatchReference?: string }): Promise<boolean> => {
        if (!supabase) return false;

        // التحقق من أن جميع القطع في حالة dispatched
        const itemsToEdit = inventoryItems.filter(item => itemIds.includes(item.id));
        const nonDispatchedItems = itemsToEdit.filter(item => item.status !== 'dispatched');

        if (nonDispatchedItems.length > 0) {
            notification?.addNotification('بعض القطع المحددة ليست في حالة "مصروفة". لا يمكن تعديل التسليم.', 'error');
            return false;
        }

        // بناء كائن التحديثات فقط للحقول المحددة
        const dbUpdates: any = {};
        if (updates.dispatchClientId !== undefined) dbUpdates.dispatch_client_id = updates.dispatchClientId;
        if (updates.dispatchDate !== undefined) dbUpdates.dispatch_date = updates.dispatchDate;
        if (updates.dispatchReason !== undefined) dbUpdates.dispatch_reason = updates.dispatchReason;
        if (updates.dispatchNotes !== undefined) dbUpdates.dispatch_notes = updates.dispatchNotes;
        if (updates.dispatchReference !== undefined) dbUpdates.dispatch_reference = updates.dispatchReference;

        const { data, error } = await supabase.from('inventory_items').update(dbUpdates).in('id', itemIds).select();

        if (error) {
            notification?.addNotification(`فشل تعديل التسليم: ${error.message}`, 'error');
            return false;
        } else if (data) {
            setInventoryItems(prev => prev.map(item => {
                const updatedItem = data.find(d => d.id === item.id);
                if (!updatedItem) return item;
                return {
                    ...updatedItem,
                    purchaseDate: new Date(updatedItem.purchase_date),
                    dispatchDate: updatedItem.dispatch_date ? new Date(updatedItem.dispatch_date) : undefined,
                    scrapDate: updatedItem.scrap_date ? new Date(updatedItem.scrap_date) : undefined,
                    warrantyEndDate: updatedItem.warranty_end_date ? new Date(updatedItem.warranty_end_date) : undefined,
                    productId: updatedItem.product_id,
                    costPrice: updatedItem.cost_price,
                    supplierId: updatedItem.supplier_id,
                    destinationClientId: updatedItem.destination_client_id,
                    dispatchClientId: updatedItem.dispatch_client_id,
                    purchaseReason: updatedItem.purchase_reason,
                    dispatchReason: updatedItem.dispatch_reason,
                    dispatchNotes: updatedItem.dispatch_notes,
                    dispatchReference: updatedItem.dispatch_reference,
                    scrapReason: updatedItem.scrap_reason,
                    scrapNotes: updatedItem.scrap_notes,
                    serialNumber: updatedItem.serial_number,
                    bundleGroupId: updatedItem.bundle_group_id,
                    bundleName: updatedItem.bundle_name
                };
            }));
            notification?.addNotification(`تم تعديل بيانات تسليم ${itemIds.length} قطعة بنجاح.`, 'success');
            return true;
        }
        return false;
    };

    const scrapItems = async (itemIds: string[], reason: string, notes?: string) => {
        if (!supabase) return;
        const updates = {
            status: 'scrapped',
            scrap_date: new Date(),
            scrap_reason: reason,
            scrap_notes: notes
        };
        const { data, error } = await supabase.from('inventory_items').update(updates).in('id', itemIds).select();
        if (error) {
            notification?.addNotification(`فشل إتلاف القطع: ${error.message}`, 'error');
        } else if (data) {
            setInventoryItems(prev => prev.map(item => {
                const updatedItem = data.find(d => d.id === item.id);
                return updatedItem ? { ...updatedItem, purchaseDate: new Date(updatedItem.purchaseDate), scrapDate: new Date(updatedItem.scrapDate), warrantyEndDate: updatedItem.warrantyEndDate ? new Date(updatedItem.warrantyEndDate) : undefined } : item;
            }));
            notification?.addNotification(`تم إتلاف ${itemIds.length} قطعة بنجاح.`, 'success');
        }
    };

    // --- SUPPLIERS API ---
    const addSupplier = async (supplierData: Omit<Supplier, 'id' | 'priceAgreements'>) => {
        if (!supabase) return;
        // تحويل camelCase إلى snake_case لقاعدة البيانات
        const dbData = {
            name: supplierData.name,
            contact_person: supplierData.contactPerson,
            phone: supplierData.phone,
            email: supplierData.email,
            address: supplierData.address,
            price_agreements: []
        };
        const { data, error } = await supabase.from('suppliers').insert([dbData]).select();
        if (error) {
            notification?.addNotification(`فشل إضافة المورد: ${error.message}`, 'error');
        } else if (data) {
            // تحويل snake_case إلى camelCase للتطبيق
            const supplier = {
                ...data[0],
                contactPerson: data[0].contact_person,
                priceAgreements: data[0].price_agreements || []
            };
            setSuppliers(prev => [...prev, supplier]);
            notification?.addNotification('تمت إضافة المورد بنجاح.', 'success');
        }
    };
    const updateSupplier = async (updatedSupplier: Supplier) => {
        if (!supabase) return;
        // تحويل camelCase إلى snake_case
        const dbData = {
            name: updatedSupplier.name,
            contact_person: updatedSupplier.contactPerson,
            phone: updatedSupplier.phone,
            email: updatedSupplier.email,
            address: updatedSupplier.address,
            price_agreements: updatedSupplier.priceAgreements || []
        };
        const { data, error } = await supabase.from('suppliers').update(dbData).eq('id', updatedSupplier.id).select();
        if (error) {
            notification?.addNotification(`فشل تحديث المورد: ${error.message}`, 'error');
        } else if (data) {
            // تحويل snake_case إلى camelCase
            const supplier = {
                ...data[0],
                contactPerson: data[0].contact_person,
                priceAgreements: data[0].price_agreements || []
            };
            setSuppliers(prev => prev.map(s => s.id === updatedSupplier.id ? supplier : s));
            notification?.addNotification('تم تحديث المورد بنجاح.', 'success');
        }
    };
    const deleteSupplier = async (supplierId: string) => {
        if (!supabase) return;
        if (inventoryItems.some(item => item.supplierId === supplierId)) {
            notification?.addNotification('لا يمكن حذف المورد لأنه مرتبط بقطع في المخزون.', 'error');
            return;
        }
        const { error } = await supabase.from('suppliers').delete().eq('id', supplierId);
        if (error) {
            notification?.addNotification(`فشل حذف المورد: ${error.message}`, 'error');
        } else {
            setSuppliers(prev => prev.filter(s => s.id !== supplierId));
            notification?.addNotification('تم حذف المورد بنجاح.', 'success');
        }
    };
    const addPriceAgreement = async (supplierId: string, agreement: Omit<PriceAgreement, 'startDate'> & { startDate: string }) => {
        if (!supabase) return;
        const supplier = getSupplierById(supplierId);
        if (!supplier) return;

        const newAgreement = { ...agreement, startDate: new Date(agreement.startDate) };
        const existingAgreements = supplier.priceAgreements?.filter(pa => pa.productId !== agreement.productId) || [];
        const updatedAgreements = [...existingAgreements, newAgreement];

        const { error } = await supabase.from('suppliers').update({ price_agreements: updatedAgreements }).eq('id', supplierId);
        if (error) {
            notification?.addNotification(`فشل إضافة الاتفاقية: ${error.message}`, 'error');
        } else {
            setSuppliers(prev => prev.map(s => s.id === supplierId ? { ...s, priceAgreements: updatedAgreements } : s));
            notification?.addNotification('تمت إضافة اتفاقية السعر.', 'success');
        }
    };
    const removePriceAgreement = async (supplierId: string, productId: string) => {
        if (!supabase) return;
        const supplier = getSupplierById(supplierId);
        if (!supplier) return;

        const updatedAgreements = supplier.priceAgreements?.filter(pa => pa.productId !== productId);
        const { error } = await supabase.from('suppliers').update({ price_agreements: updatedAgreements }).eq('id', supplierId);
        if (error) {
            notification?.addNotification(`فشل إزالة الاتفاقية: ${error.message}`, 'error');
        } else {
            setSuppliers(prev => prev.map(s => s.id === supplierId ? { ...s, priceAgreements: updatedAgreements } : s));
            notification?.addNotification('تمت إزالة اتفاقية السعر.', 'success');
        }
    };

    // --- LOCATIONS API ---
    // The implementation for these requires more thought on cascade deletes, so we'll do simple operations for now.
    // Helper function to convert snake_case to camelCase for location data
    const convertLocationData = (data: any) => {
        if (Array.isArray(data)) {
            return data.map(item => convertLocationData(item));
        }
        return {
            ...data,
            provinceId: data.province_id,
            areaId: data.area_id,
        };
    };

    const createApi = <T extends { id: string }>(tableName: string, state: T[], setter: React.Dispatch<React.SetStateAction<T[]>>, dependencies?: { table: string, items: any[], field: string, errorMsg: string }) => ({
        add: async (itemData: Omit<T, 'id'>) => {
            if (!supabase) return;
            const { data, error } = await supabase.from(tableName).insert([itemData]).select();
            if (error) notification?.addNotification(`Failed to add: ${error.message}`, 'error');
            else if (data) {
                const convertedData = convertLocationData(data[0]);
                setter(prev => [...prev, convertedData]);
                notification?.addNotification(`تمت الإضافة بنجاح.`, 'success');
            }
        },
        update: async (item: T) => {
            if (!supabase) return;
            const { data, error } = await supabase.from(tableName).update(item).eq('id', item.id).select();
            if (error) notification?.addNotification(`Failed to update: ${error.message}`, 'error');
            else if (data) {
                const convertedData = convertLocationData(data[0]);
                setter(prev => prev.map(p => p.id === item.id ? convertedData : p));
                notification?.addNotification(`تم التحديث بنجاح.`, 'success');
            }
        },
        delete: async (id: string) => {
            if (!supabase) return;
            if (dependencies && dependencies.items.some(i => i[dependencies.field] === id)) {
                notification?.addNotification(dependencies.errorMsg, 'error');
                return;
            }
            const { error } = await supabase.from(tableName).delete().eq('id', id);
            if (error) notification?.addNotification(`Failed to delete: ${error.message}`, 'error');
            else {
                setter(prev => prev.filter(p => p.id !== id));
                notification?.addNotification(`تم الحذف بنجاح.`, 'success');
            }
        },
    });

    const provincesApi = {
        addProvince: (name: string) => createApi('provinces', provinces, setProvinces).add({ name }),
        updateProvince: (province: Province) => createApi('provinces', provinces, setProvinces).update(province),
        deleteProvince: (id: string) => createApi('provinces', provinces, setProvinces, { table: 'areas', items: areas, field: 'province_id', errorMsg: 'لا يمكن حذف المحافظة لأنها تحتوي على مناطق.' }).delete(id),
    };
    const areasApi = {
        addArea: async (name: string, provinceId: string) => {
            if (!supabase) return;
            const { data, error } = await supabase.from('areas').insert([{ name, province_id: provinceId }]).select();
            if (error) notification?.addNotification(`Failed to add: ${error.message}`, 'error');
            else if (data) {
                const convertedData = convertLocationData(data[0]);
                setAreas(prev => [...prev, convertedData]);
                notification?.addNotification(`تمت الإضافة بنجاح.`, 'success');
            }
        },
        updateArea: async (area: Area) => {
            if (!supabase) return;
            const { data, error } = await supabase.from('areas').update({ name: area.name, province_id: area.provinceId }).eq('id', area.id).select();
            if (error) notification?.addNotification(`Failed to update: ${error.message}`, 'error');
            else if (data) {
                const convertedData = convertLocationData(data[0]);
                setAreas(prev => prev.map(p => p.id === area.id ? convertedData : p));
                notification?.addNotification(`تم التحديث بنجاح.`, 'success');
            }
        },
        deleteArea: (id: string) => createApi('areas', areas, setAreas, { table: 'clients', items: clients, field: 'areaId', errorMsg: 'لا يمكن حذف المنطقة لأنها تحتوي على عملاء.' }).delete(id),
    };
    const clientsApi = {
        addClient: async (name: string, areaId: string) => {
            if (!supabase) return;
            const { data, error } = await supabase.from('clients').insert([{ name, area_id: areaId }]).select();
            if (error) notification?.addNotification(`Failed to add: ${error.message}`, 'error');
            else if (data) {
                const convertedData = convertLocationData(data[0]);
                setClients(prev => [...prev, convertedData]);
                notification?.addNotification(`تمت الإضافة بنجاح.`, 'success');
            }
        },
        updateClient: async (client: Client) => {
            if (!supabase) return;
            const { data, error } = await supabase.from('clients').update({ name: client.name, area_id: client.areaId }).eq('id', client.id).select();
            if (error) notification?.addNotification(`Failed to update: ${error.message}`, 'error');
            else if (data) {
                const convertedData = convertLocationData(data[0]);
                setClients(prev => prev.map(p => p.id === client.id ? convertedData : p));
                notification?.addNotification(`تم التحديث بنجاح.`, 'success');
            }
        },
        deleteClient: (id: string) => {
            if (inventoryItems.some(i => i.destinationClientId === id || i.dispatchClientId === id)) {
                notification?.addNotification('لا يمكن حذف العميل لأنه مرتبط بحركات مخزون.', 'error');
                return;
            }
            createApi('clients', clients, setClients).delete(id)
        },
        getClientById,
    };


    // --- DASHBOARD METRICS ---
    const getAggregatedInventoryValue = () => {
        return inventoryItems
            .filter(i => i.status === 'in_stock')
            .reduce((total, item) => total + Number(item.costPrice || 0), 0);
    };

    const getLowStockProducts = (threshold: number) => {
        const stockCounts = inventoryItems
            .filter(item => item.status === 'in_stock')
            .reduce((acc, item) => {
                acc[item.productId] = (acc[item.productId] || 0) + 1;
                return acc;
            }, {} as { [key: string]: number });

        return products
            .map(product => ({ product, quantity: stockCounts[product.id] || 0 }))
            .filter(({ quantity }) => quantity < threshold && quantity > 0)
            .sort((a, b) => a.quantity - b.quantity);
    };

    const getExpiringWarranties = (days: number) => {
        const now = new Date();
        const thresholdDate = new Date();
        thresholdDate.setDate(now.getDate() + days);

        return inventoryItems.filter(item =>
            item.warrantyEndDate &&
            item.warrantyEndDate > now &&
            item.warrantyEndDate <= thresholdDate
        ).sort((a, b) => a.warrantyEndDate!.getTime() - b.warrantyEndDate!.getTime());
    };

    const getScrappedValueLast30Days = () => {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        return inventoryItems.filter(item =>
            item.status === 'scrapped' &&
            item.scrapDate &&
            item.scrapDate >= thirtyDaysAgo
        ).reduce((total, item) => total + Number(item.costPrice || 0), 0);
    };

    // --- TRANSACTION REASONS API ---
    const addReason = async (reasonText: string, reasonType: 'purchase' | 'dispatch' | 'scrap' | 'both') => {
        if (!supabase) return;
        const maxOrder = transactionReasons.length > 0 ? Math.max(...transactionReasons.map(r => r.displayOrder)) : 0;
        const { data, error } = await supabase.from('transaction_reasons').insert({
            reason_text: reasonText,
            reason_type: reasonType,
            display_order: maxOrder + 1,
            is_active: true
        }).select();

        if (error) {
            notification?.addNotification(`فشل إضافة السبب: ${error.message}`, 'error');
        } else if (data && data[0]) {
            const newReason: TransactionReason = {
                id: data[0].id,
                reasonText: data[0].reason_text,
                reasonType: data[0].reason_type,
                isActive: data[0].is_active,
                displayOrder: data[0].display_order
            };
            setTransactionReasons(prev => [...prev, newReason]);
            notification?.addNotification('تم إضافة السبب بنجاح', 'success');
        }
    };

    const updateReason = async (reason: TransactionReason) => {
        if (!supabase) return;
        const { error } = await supabase.from('transaction_reasons').update({
            reason_text: reason.reasonText,
            reason_type: reason.reasonType,
            is_active: reason.isActive,
            display_order: reason.displayOrder
        }).eq('id', reason.id);

        if (error) {
            notification?.addNotification(`فشل تحديث السبب: ${error.message}`, 'error');
        } else {
            setTransactionReasons(prev => prev.map(r => r.id === reason.id ? reason : r));
            notification?.addNotification('تم تحديث السبب بنجاح', 'success');
        }
    };

    const deleteReason = async (id: string) => {
        if (!supabase) return;
        const { error } = await supabase.from('transaction_reasons').delete().eq('id', id);

        if (error) {
            notification?.addNotification(`فشل حذف السبب: ${error.message}`, 'error');
        } else {
            setTransactionReasons(prev => prev.filter(r => r.id !== id));
            notification?.addNotification('تم حذف السبب بنجاح', 'success');
        }
    };

    const getPurchaseReasons = useCallback(() => {
        return transactionReasons
            .filter(r => r.isActive && (r.reasonType === 'purchase' || r.reasonType === 'both'))
            .sort((a, b) => a.displayOrder - b.displayOrder);
    }, [transactionReasons]);

    const getDispatchReasons = useCallback(() => {
        return transactionReasons
            .filter(r => r.isActive && (r.reasonType === 'dispatch' || r.reasonType === 'both'))
            .sort((a, b) => a.displayOrder - b.displayOrder);
    }, [transactionReasons]);

    const getScrapReasons = useCallback(() => {
        return transactionReasons
            .filter(r => r.isActive && r.reasonType === 'scrap')
            .sort((a, b) => a.displayOrder - b.displayOrder);
    }, [transactionReasons]);

    const reasonsApi = useMemo(() => ({
        addReason,
        updateReason,
        deleteReason,
        getPurchaseReasons,
        getDispatchReasons,
        getScrapReasons
    }), [getPurchaseReasons, getDispatchReasons, getScrapReasons]);

    // --- CATEGORIES API ---
    const getCategoryById = useCallback((categoryId: string) => categories.find(c => c.id === categoryId), [categories]);

    const getActiveCategories = useCallback(() => {
        return categories.filter(c => c.isActive).sort((a, b) => a.displayOrder - b.displayOrder);
    }, [categories]);

    const addCategory = async (name: string, description?: string, color?: string, icon?: string) => {
        if (!supabase) return;
        const maxOrder = categories.length > 0 ? Math.max(...categories.map(c => c.displayOrder)) : 0;
        const { data, error } = await supabase.from('categories').insert({
            name,
            description,
            color: color || '#3B82F6',
            icon: icon || '📦',
            is_active: true,
            display_order: maxOrder + 1
        }).select();

        if (error) {
            notification?.addNotification(`فشل إضافة الفئة: ${error.message}`, 'error');
        } else if (data && data[0]) {
            const newCategory: Category = {
                id: data[0].id,
                name: data[0].name,
                description: data[0].description,
                color: data[0].color,
                icon: data[0].icon,
                isActive: data[0].is_active,
                displayOrder: data[0].display_order
            };
            setCategories(prev => [...prev, newCategory]);
            notification?.addNotification('تم إضافة الفئة بنجاح', 'success');
        }
    };

    const updateCategory = async (category: Category) => {
        if (!supabase) return;
        const { error } = await supabase.from('categories').update({
            name: category.name,
            description: category.description,
            color: category.color,
            icon: category.icon,
            is_active: category.isActive,
            display_order: category.displayOrder
        }).eq('id', category.id);

        if (error) {
            notification?.addNotification(`فشل تحديث الفئة: ${error.message}`, 'error');
        } else {
            setCategories(prev => prev.map(c => c.id === category.id ? category : c));
            notification?.addNotification('تم تحديث الفئة بنجاح', 'success');
        }
    };

    const deleteCategory = async (id: string) => {
        if (!supabase) return;
        // التحقق من وجود منتجات مرتبطة بهذه الفئة
        if (products.some(p => p.categoryId === id)) {
            notification?.addNotification('لا يمكن حذف الفئة لأنها مرتبطة بمنتجات. قم بتغيير فئة المنتجات أولاً.', 'error');
            return;
        }

        const { error } = await supabase.from('categories').delete().eq('id', id);

        if (error) {
            notification?.addNotification(`فشل حذف الفئة: ${error.message}`, 'error');
        } else {
            setCategories(prev => prev.filter(c => c.id !== id));
            notification?.addNotification('تم حذف الفئة بنجاح', 'success');
        }
    };

    // دالة لإصلاح المنتجات القديمة مباشرة من قاعدة البيانات
    const fixOldProductsCategories = async (): Promise<{ success: boolean; updated: number; errors: string[] }> => {
        if (!supabase) return { success: false, updated: 0, errors: ['لا يوجد اتصال بقاعدة البيانات'] };

        try {
            let updatedCount = 0;
            const errors: string[] = [];

            // جلب جميع المنتجات
            const { data: allProducts, error: fetchError } = await supabase
                .from('products')
                .select('*');

            if (fetchError) {
                return { success: false, updated: 0, errors: [fetchError.message] };
            }

            // تصفية المنتجات القديمة (بدون category_id ولكن لديها category)
            const oldProducts = allProducts?.filter(p => !p.category_id && p.category) || [];

            if (!oldProducts || oldProducts.length === 0) {
                return { success: true, updated: 0, errors: [] };
            }

            console.log(`🔍 تم إيجاد ${oldProducts.length} منتج قديم يحتاج إصلاح`);

            // معالجة كل منتج قديم
            for (const product of oldProducts) {
                const oldCategoryText = product.category?.toLowerCase() || '';
                
                // البحث عن فئة مطابقة
                const matchingCategory = categories.find(c => {
                    const catName = c.name.toLowerCase();
                    return catName === oldCategoryText ||
                           catName.includes(oldCategoryText) ||
                           oldCategoryText.includes(catName);
                });

                if (matchingCategory) {
                    // تحديث المنتج في قاعدة البيانات
                    const { error: updateError } = await supabase
                        .from('products')
                        .update({
                            category_id: matchingCategory.id,
                            category: matchingCategory.name,
                            updated_at: new Date().toISOString()
                        })
                        .eq('id', product.id);

                    if (updateError) {
                        errors.push(`فشل تحديث ${product.name}: ${updateError.message}`);
                    } else {
                        updatedCount++;
                        console.log(`✅ تم إصلاح: ${product.name} → ${matchingCategory.name}`);
                    }
                } else {
                    errors.push(`لم يتم إيجاد فئة مطابقة للمنتج: ${product.name} (${product.category})`);
                }
            }

            // إعادة تحميل المنتجات
            await fetchData();

            return { success: true, updated: updatedCount, errors };
        } catch (error: any) {
            return { success: false, updated: 0, errors: [error.message] };
        }
    };

    const categoriesApi = useMemo(() => ({
        addCategory,
        updateCategory,
        deleteCategory,
        getCategoryById,
        getActiveCategories,
        fixOldProductsCategories
    }), [getCategoryById, getActiveCategories]);

    if (!supabase) {
        console.error('❌❌❌ لا يوجد اتصال بقاعدة البيانات! useInventory يُرجع null');
        return null;
    }

    return useMemo(() => ({
        inventoryItems,
        products,
        categories,
        suppliers,
        provinces,
        areas,
        clients,
        transactionReasons,
        settings,
        isLoading,
        loadingMessage,
        wipeAllData,
        addProduct,
        updateProduct,
        deleteProduct,
        getProductById,
        receiveItems,
        dispatchItems,
        undoDispatch,
        editDispatch,
        scrapItems,
        findItemBySerial,
        getItemLocationName,
        addSupplier,
        updateSupplier,
        deleteSupplier,
        getSupplierById,
        addPriceAgreement,
        removePriceAgreement,
        getClientFullNameById,
        provincesApi,
        areasApi,
        clientsApi,
        reasonsApi,
        categoriesApi,
        getAggregatedInventoryValue,
        getLowStockProducts,
        getExpiringWarranties,
        getScrappedValueLast30Days,
    }), [inventoryItems, products, categories, suppliers, provinces, areas, clients, isLoading, loadingMessage, getProductById, findItemBySerial, getItemLocationName, getSupplierById, getClientById, getClientFullNameById, provincesApi, areasApi, clientsApi, categoriesApi]);
};
