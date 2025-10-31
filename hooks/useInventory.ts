import { useState, useMemo, useCallback, useEffect } from 'react';
import type React from 'react';
import { InventoryItem, Product, Supplier, Province, Area, Client, UseInventoryReturn, NewItem, PriceAgreement } from '../types';
import { useNotification } from '../contexts/NotificationContext';
import { useSupabase } from '../contexts/SupabaseContext';
import { appConfig as settings } from '../config';

export const useInventory = (): UseInventoryReturn | null => {
    const { supabase } = useSupabase();
    const notification = useNotification();

    const [products, setProducts] = useState<Product[]>([]);
    const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [provinces, setProvinces] = useState<Province[]>([]);
    const [areas, setAreas] = useState<Area[]>([]);
    const [clients, setClients] = useState<Client[]>([]);

    const fetchData = useCallback(async () => {
        if (!supabase) return;
        
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
                        dispatchReason: item.dispatch_reason,
                        dispatchNotes: item.dispatch_notes,
                        dispatchReference: item.dispatch_reference,
                        scrapReason: item.scrap_reason,
                        scrapNotes: item.scrap_notes,
                        serialNumber: item.serial_number
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
                        productType: product.product_type
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

        await Promise.all([
            fetchTable('products', setProducts),
            fetchTable('inventory_items', setInventoryItems),
            fetchTable('suppliers', setSuppliers),
            fetchTable('provinces', setProvinces),
            fetchTable('areas', setAreas),
            fetchTable('clients', setClients),
        ]);
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
                
                if (error) {
                    console.error(`❌ خطأ في حذف جدول ${table}:`, error);
                    throw error;
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
        if (!locationId) return 'مستودع';
        return getClientFullNameById(locationId) || 'موقع غير معروف';
    }, [getClientFullNameById]);

    // --- PRODUCTS API ---
    const addProduct = async (productData: Omit<Product, 'id'>) => {
        if (!supabase) return;
        // تحويل أسماء الخصائص لتتوافق مع قاعدة البيانات
        const dbProductData = {
            ...productData,
            has_warranty: productData.hasWarranty,
            standard_cost_price: productData.standardCostPrice,
            warranty_duration_value: productData.warrantyDurationValue,
            warranty_duration_unit: productData.warrantyDurationUnit,
            product_type: productData.productType
        };

        // حذف الخصائص القديمة
        delete dbProductData.hasWarranty;
        delete dbProductData.standardCostPrice;
        delete dbProductData.warrantyDurationValue;
        delete dbProductData.warrantyDurationUnit;
        delete dbProductData.productType;

        const { data, error } = await supabase.from('products').insert([dbProductData]).select();
        if (error) {
            notification?.addNotification(`فشل إضافة المنتج: ${error.message}`, 'error');
        } else if (data) {
            setProducts(prev => [...prev, data[0]]);
            notification?.addNotification(`تمت إضافة المنتج "${data[0].name}" بنجاح.`, 'success');
        }
    };
    const updateProduct = async (updatedProduct: Product) => {
        if (!supabase) return;

        // تحويل أسماء الخصائص لتتوافق مع قاعدة البيانات
        const dbProductData = {
            ...updatedProduct,
            has_warranty: updatedProduct.hasWarranty,
            standard_cost_price: updatedProduct.standardCostPrice,
            warranty_duration_value: updatedProduct.warrantyDurationValue,
            warranty_duration_unit: updatedProduct.warrantyDurationUnit,
            product_type: updatedProduct.productType
        };

        // حذف الخصائص القديمة
        delete dbProductData.hasWarranty;
        delete dbProductData.standardCostPrice;
        delete dbProductData.warrantyDurationValue;
        delete dbProductData.warrantyDurationUnit;
        delete dbProductData.productType;

        const { data, error } = await supabase.from('products').update(dbProductData).eq('id', updatedProduct.id).select();
        if (error) {
            notification?.addNotification(`فشل تحديث المنتج: ${error.message}`, 'error');
        } else if(data) {
            setProducts(prev => prev.map(p => p.id === updatedProduct.id ? data[0] : p));
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
            const dbItem = {
                ...item,
                warranty_end_date: warrantyEndDate,
                product_id: item.productId,
                cost_price: item.costPrice,
                supplier_id: item.supplierId,
                destination_client_id: item.destinationClientId
            };

            // حذف الخصائص القديمة
            delete dbItem.productId;
            delete dbItem.costPrice;
            delete dbItem.supplierId;
            delete dbItem.destinationClientId;

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
                purchaseDate: new Date(item.purchaseDate),
                warrantyEndDate: item.warrantyEndDate ? new Date(item.warrantyEndDate) : undefined,
            }));
            setInventoryItems(prev => [...prev, ...parsedData]);
            return true;
        }
        return false;
    };
    
    const dispatchItems = async (itemIds: string[], dispatchClientId: string, dispatchDate: Date, reason: string, notes?: string, reference?: string) => {
        if (!supabase) return;
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
                return updatedItem ? {...updatedItem, purchaseDate: new Date(updatedItem.purchaseDate), dispatchDate: new Date(updatedItem.dispatchDate), warrantyEndDate: updatedItem.warrantyEndDate ? new Date(updatedItem.warrantyEndDate) : undefined } : item;
            }));
            notification?.addNotification(`تم صرف ${itemIds.length} قطعة بنجاح.`, 'success');
        }
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
                return updatedItem ? {...updatedItem, purchaseDate: new Date(updatedItem.purchaseDate), scrapDate: new Date(updatedItem.scrapDate), warrantyEndDate: updatedItem.warrantyEndDate ? new Date(updatedItem.warrantyEndDate) : undefined} : item;
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

    const createApi = <T extends {id: string}>(tableName: string, state: T[], setter: React.Dispatch<React.SetStateAction<T[]>>, dependencies?: {table: string, items: any[], field: string, errorMsg: string}) => ({
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
        addProvince: (name: string) => createApi('provinces', provinces, setProvinces).add({name}),
        updateProvince: (province: Province) => createApi('provinces', provinces, setProvinces).update(province),
        deleteProvince: (id: string) => createApi('provinces', provinces, setProvinces, {table: 'areas', items: areas, field: 'province_id', errorMsg: 'لا يمكن حذف المحافظة لأنها تحتوي على مناطق.'}).delete(id),
    };
    const areasApi = {
        addArea: (name: string, provinceId: string) => createApi('areas', areas, setAreas).add({name, province_id: provinceId}),
        updateArea: (area: Area) => createApi('areas', areas, setAreas).update(area),
        deleteArea: (id: string) => createApi('areas', areas, setAreas, {table: 'clients', items: clients, field: 'area_id', errorMsg: 'لا يمكن حذف المنطقة لأنها تحتوي على عملاء.'}).delete(id),
    };
    const clientsApi = {
        addClient: (name: string, areaId: string) => createApi('clients', clients, setClients).add({name, area_id: areaId}),
        updateClient: (client: Client) => createApi('clients', clients, setClients).update(client),
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
            .reduce((total, item) => total + item.costPrice, 0);
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
            .sort((a,b) => a.quantity - b.quantity);
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
        ).reduce((total, item) => total + item.costPrice, 0);
    };

    if (!supabase) return null;

    return useMemo(() => ({
        inventoryItems,
        products,
        suppliers,
        provinces,
        areas,
        clients,
        settings,
        wipeAllData,
        addProduct,
        updateProduct,
        deleteProduct,
        getProductById,
        receiveItems,
        dispatchItems,
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
        getAggregatedInventoryValue,
        getLowStockProducts,
        getExpiringWarranties,
        getScrappedValueLast30Days,
    }), [inventoryItems, products, suppliers, provinces, areas, clients, getProductById, findItemBySerial, getItemLocationName, getSupplierById, getClientById, getClientFullNameById, provincesApi, areasApi, clientsApi]);
};
