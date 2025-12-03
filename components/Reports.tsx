import React, { useMemo, useState, useRef, useEffect, ReactNode } from 'react';
import { UseInventoryReturn, InventoryItem } from '../types';
import { Card, CardContent, CardHeader, CardTitle } from './ui/Card';
import { Button } from './ui/Button';
import { Icons } from './icons';
import { Modal } from './ui/Modal';
import { useSettings } from '../contexts/SettingsContext';
import { formatCurrency, formatDate, formatDateTime } from '../utils/formatters';

// New type for aggregated receiving report rows
interface AggregatedReceiveRow {
    key: string;
    productId: string;
    productName: string;
    productSku: string;
    destinationClientId: string;
    clientName: string;
    purchaseReason: string;
    supplierId?: string;
    supplierName?: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    purchaseDate: Date; // Keep the earliest date for sorting
    notes?: string; // ملاحظات المنتج
}

// New type for aggregated dispatch report rows
interface AggregatedDispatchRow {
    key: string;
    productId: string;
    productName: string;
    productSku: string;
    dispatchClientId: string;
    clientName: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    dispatchDate: Date;
}

type ReceiveReportColumnKey = 'date' | 'product' | 'serial' | 'client' | 'supplier' | 'reason' | 'cost' | 'quantity' | 'totalPrice' | 'notes';

interface ReceiveColumnConfig {
    key: ReceiveReportColumnKey;
    label: string;
    visible: boolean;
}

type DispatchReportColumnKey = 'date' | 'product' | 'client' | 'cost' | 'quantity' | 'totalPrice';

interface DispatchColumnConfig {
    key: DispatchReportColumnKey;
    label: string;
    visible: boolean;
}

const initialReceiveColumns: ReceiveColumnConfig[] = [
    { key: 'product', label: 'المنتج', visible: true },
    { key: 'quantity', label: 'الكمية', visible: true },
    { key: 'cost', label: 'سعر مفرد', visible: true },
    { key: 'totalPrice', label: 'سعر مجموع', visible: true },
    { key: 'reason', label: 'سبب الشراء', visible: true },
    { key: 'client', label: 'العميل / الموقع', visible: true },
    { key: 'notes', label: 'ملاحظات', visible: true },
    { key: 'supplier', label: 'المورد', visible: true },
    { key: 'date', label: 'تاريخ الاستلام', visible: true },
    { key: 'serial', label: 'بار كود القطعة', visible: false }, // Hidden by default
];

const initialDispatchColumns: DispatchColumnConfig[] = [
    { key: 'product', label: 'المنتج', visible: true },
    { key: 'quantity', label: 'الكمية', visible: true },
    { key: 'cost', label: 'سعر مفرد', visible: true },
    { key: 'totalPrice', label: 'سعر مجموع', visible: true },
    { key: 'client', label: 'العميل / الموقع', visible: true },
    { key: 'date', label: 'تاريخ الصرف', visible: true },
];

const itemStatuses: { [key: string]: string } = {
    'all': 'الكل',
    'in_stock': 'في المخزون',
    'dispatched': 'تم صرفه',
    'scrapped': 'تالف',
    'damaged_on_arrival': 'تالف عند الاستلام'
};


const Reports: React.FC<{ inventory: UseInventoryReturn }> = ({ inventory }) => {
    const { inventoryItems, getProductById, categories, suppliers, clients, provinces, areas, getSupplierById, getClientFullNameById, getItemLocationName } = inventory;
    const { getSetting } = useSettings();
    const [companyName, setCompanyName] = useState('نظام إدارة المخزون');

    // Active tab state
    const [activeTab, setActiveTab] = useState<'inventory' | 'receive' | 'dispatch'>('inventory');

    // State for inventory report
    const [invSelectedCategory, setInvSelectedCategory] = useState<string>('all');
    const [invSelectedStatus, setInvSelectedStatus] = useState<string>('in_stock');
    const [invSelectedProvinceId, setInvSelectedProvinceId] = useState<string>('all');
    const [invSelectedAreaId, setInvSelectedAreaId] = useState<string>('all');
    const [invSelectedClient, setInvSelectedClient] = useState<string>('all');
    const [invReportData, setInvReportData] = useState<InventoryItem[] | null>(null);
    const [isInvPrintPreviewOpen, setIsInvPrintPreviewOpen] = useState(false);
    const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

    // State for receiving report
    const [receiveSelectedSupplier, setReceiveSelectedSupplier] = useState<string>('all');
    const [receiveSelectedProvinceId, setReceiveSelectedProvinceId] = useState<string>('all');
    const [receiveSelectedAreaId, setReceiveSelectedAreaId] = useState<string>('all');
    const [receiveSelectedClient, setReceiveSelectedClient] = useState<string>('all');
    const [receiveStartDate, setReceiveStartDate] = useState<string>('');
    const [receiveEndDate, setReceiveEndDate] = useState<string>('');
    const [receiveReportData, setReceiveReportData] = useState<AggregatedReceiveRow[] | null>(null);
    const [receiveColumns, setReceiveColumns] = useState<ReceiveColumnConfig[]>(initialReceiveColumns);
    const [isReceiveColumnModalOpen, setIsReceiveColumnModalOpen] = useState(false);
    const [receiveSortConfig, setReceiveSortConfig] = useState<{ key: ReceiveReportColumnKey, direction: 'asc' | 'desc' } | null>(null);
    const [isActionsMenuOpen, setIsActionsMenuOpen] = useState(false);
    const [isPrintPreviewOpen, setIsPrintPreviewOpen] = useState(false);
    const actionsMenuRef = useRef<HTMLDivElement>(null);
    const [productNotes, setProductNotes] = useState<Record<string, string>>({});

    // State for dispatch report
    const [dispatchSelectedProvinceId, setDispatchSelectedProvinceId] = useState<string>('all');
    const [dispatchSelectedAreaId, setDispatchSelectedAreaId] = useState<string>('all');
    const [dispatchSelectedClient, setDispatchSelectedClient] = useState<string>('all');
    const [dispatchStartDate, setDispatchStartDate] = useState<string>('');
    const [dispatchEndDate, setDispatchEndDate] = useState<string>('');
    const [dispatchReportData, setDispatchReportData] = useState<AggregatedDispatchRow[] | null>(null);
    const [dispatchColumns, setDispatchColumns] = useState<DispatchColumnConfig[]>(initialDispatchColumns);
    const [isDispatchColumnModalOpen, setIsDispatchColumnModalOpen] = useState(false);
    const [dispatchSortConfig, setDispatchSortConfig] = useState<{ key: DispatchReportColumnKey, direction: 'asc' | 'desc' } | null>(null);
    const [isDispatchActionsMenuOpen, setIsDispatchActionsMenuOpen] = useState(false);
    const [isDispatchPrintPreviewOpen, setIsDispatchPrintPreviewOpen] = useState(false);
    const dispatchActionsMenuRef = useRef<HTMLDivElement>(null);

    // تصفية المناطق حسب المحافظة - تقرير المخزون
    const invFilteredAreas = useMemo(() => {
        if (invSelectedProvinceId === 'all') return [];
        return areas.filter(area => area.provinceId === invSelectedProvinceId);
    }, [areas, invSelectedProvinceId]);

    // تصفية العملاء حسب المنطقة - تقرير المخزون
    const invFilteredClients = useMemo(() => {
        if (invSelectedAreaId === 'all') return [];
        return clients.filter(client => client.areaId === invSelectedAreaId)
            .sort((a, b) => a.name.localeCompare(b.name));
    }, [clients, invSelectedAreaId]);

    // تصفية المناطق حسب المحافظة - تقرير الاستلام
    const receiveFilteredAreas = useMemo(() => {
        if (receiveSelectedProvinceId === 'all') return [];
        return areas.filter(area => area.provinceId === receiveSelectedProvinceId);
    }, [areas, receiveSelectedProvinceId]);

    // تصفية العملاء حسب المنطقة - تقرير الاستلام
    const receiveFilteredClients = useMemo(() => {
        if (receiveSelectedAreaId === 'all') return [];
        return clients.filter(client => client.areaId === receiveSelectedAreaId)
            .sort((a, b) => a.name.localeCompare(b.name));
    }, [clients, receiveSelectedAreaId]);

    // تصفية المناطق حسب المحافظة - تقرير الصرف
    const dispatchFilteredAreas = useMemo(() => {
        if (dispatchSelectedProvinceId === 'all') return [];
        return areas.filter(area => area.provinceId === dispatchSelectedProvinceId);
    }, [areas, dispatchSelectedProvinceId]);

    // تصفية العملاء حسب المنطقة - تقرير الصرف
    const dispatchFilteredClients = useMemo(() => {
        if (dispatchSelectedAreaId === 'all') return [];
        return clients.filter(client => client.areaId === dispatchSelectedAreaId)
            .sort((a, b) => a.name.localeCompare(b.name));
    }, [clients, dispatchSelectedAreaId]);

    // معالجة تغيير المحافظة - تقرير المخزون
    const handleInvProvinceChange = (provinceId: string) => {
        setInvSelectedProvinceId(provinceId);
        setInvSelectedAreaId('all');
        setInvSelectedClient('all');
    };

    // معالجة تغيير المنطقة - تقرير المخزون
    const handleInvAreaChange = (areaId: string) => {
        setInvSelectedAreaId(areaId);
        setInvSelectedClient('all');
    };

    // معالجة تغيير المحافظة - تقرير الاستلام
    const handleReceiveProvinceChange = (provinceId: string) => {
        setReceiveSelectedProvinceId(provinceId);
        setReceiveSelectedAreaId('all');
        setReceiveSelectedClient('all');
    };

    // معالجة تغيير المنطقة - تقرير الاستلام
    const handleReceiveAreaChange = (areaId: string) => {
        setReceiveSelectedAreaId(areaId);
        setReceiveSelectedClient('all');
    };

    // معالجة تغيير المحافظة - تقرير الصرف
    const handleDispatchProvinceChange = (provinceId: string) => {
        setDispatchSelectedProvinceId(provinceId);
        setDispatchSelectedAreaId('all');
        setDispatchSelectedClient('all');
    };

    // معالجة تغيير المنطقة - تقرير الصرف
    const handleDispatchAreaChange = (areaId: string) => {
        setDispatchSelectedAreaId(areaId);
        setDispatchSelectedClient('all');
    };

    const activeCategories = useMemo(() => {
        return categories.filter(c => c.isActive).sort((a, b) => a.displayOrder - b.displayOrder);
    }, [categories]);

    const getItemLocationId = (item: InventoryItem): string | undefined => {
        return item.status === 'dispatched' ? item.dispatchClientId : item.destinationClientId;
    }

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (actionsMenuRef.current && !actionsMenuRef.current.contains(event.target as Node)) {
                setIsActionsMenuOpen(false);
            }
            if (dispatchActionsMenuRef.current && !dispatchActionsMenuRef.current.contains(event.target as Node)) {
                setIsDispatchActionsMenuOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // جلب اسم الشركة من الإعدادات
    useEffect(() => {
        const fetchCompanyName = async () => {
            const name = await getSetting('company_name', 'نظام إدارة المخزون');
            setCompanyName(name);
        };
        fetchCompanyName();
    }, [getSetting]);

    const toggleGroupExpansion = (groupKey: string) => {
        setExpandedGroups(prev => {
            const newSet = new Set(prev);
            if (newSet.has(groupKey)) {
                newSet.delete(groupKey);
            } else {
                newSet.add(groupKey);
            }
            return newSet;
        });
    };

    const handleGenerateInventoryReport = () => {
        let filteredItems = inventoryItems.filter(item => {
            if (invSelectedStatus !== 'all' && item.status !== invSelectedStatus) return false;

            const product = getProductById(item.productId);
            if (invSelectedCategory !== 'all' && product?.categoryId !== invSelectedCategory) return false;

            // تصفية حسب الموقع (محافظة/منطقة/عميل)
            const itemLocationId = getItemLocationId(item);

            // إذا تم اختيار عميل محدد
            if (invSelectedClient !== 'all') {
                if (itemLocationId !== invSelectedClient) return false;
            }
            // إذا تم اختيار منطقة (بدون عميل محدد)
            else if (invSelectedAreaId !== 'all') {
                const itemClient = clients.find(c => c.id === itemLocationId);
                if (itemClient?.areaId !== invSelectedAreaId) return false;
            }
            // إذا تم اختيار محافظة (بدون منطقة أو عميل)
            else if (invSelectedProvinceId !== 'all') {
                const itemClient = clients.find(c => c.id === itemLocationId);
                const itemArea = areas.find(a => a.id === itemClient?.areaId);
                if (itemArea?.provinceId !== invSelectedProvinceId) return false;
            }

            return true;
        });
        // ترتيب من الأحدث إلى الأقدم حسب تاريخ الشراء
        setInvReportData(filteredItems.sort((a, b) => {
            const dateA = a.purchaseDate ? new Date(a.purchaseDate).getTime() : 0;
            const dateB = b.purchaseDate ? new Date(b.purchaseDate).getTime() : 0;
            return dateB - dateA; // من الأحدث إلى الأقدم
        }));
        // إعادة تعيين الصفوف الموسعة
        setExpandedGroups(new Set());
    };

    // تجميع البيانات حسب المنتج والموقع والحالة
    const groupedInventoryData = useMemo(() => {
        if (!invReportData) return null;

        const grouped = invReportData.reduce((acc, item) => {
            const product = getProductById(item.productId);
            const location = getItemLocationName(item);
            const key = `${item.productId}-${location}-${item.status}`;

            if (!acc[key]) {
                acc[key] = {
                    key,
                    productId: item.productId,
                    productName: product?.name || 'منتج غير معروف',
                    productSku: product?.sku || '-',
                    location,
                    status: item.status,
                    quantity: 0,
                    totalCost: 0,
                    items: []
                };
            }

            acc[key].quantity += 1;
            acc[key].totalCost += Number(item.costPrice || 0);
            acc[key].items.push(item);

            return acc;
        }, {} as Record<string, {
            key: string;
            productId: string;
            productName: string;
            productSku: string;
            location: string;
            status: string;
            quantity: number;
            totalCost: number;
            items: InventoryItem[];
        }>);

        return Object.values(grouped);
    }, [invReportData, getProductById, getItemLocationName]);

    const handleExportInventoryReport = () => {
        if (!invReportData) return;

        const headers = ['المنتج', 'باركود المنتج', 'باركود القطعة', 'الحالة', 'الموقع الحالي', 'سبب الشراء', 'تاريخ الشراء', 'تكلفة الشراء'].join(',');
        const csvRows = invReportData.map(item => {
            const product = getProductById(item.productId);
            const row = [
                product?.name || 'N/A',
                product?.sku || 'N/A',
                item.serialNumber,
                itemStatuses[item.status] || item.status,
                getItemLocationName(item),
                item.purchaseReason || '-',
                new Date(item.purchaseDate).toLocaleDateString('en-CA'),
                item.costPrice
            ];
            return row.map(val => `"${String(val).replace(/"/g, '""')}"`).join(',');
        });

        const grandTotal = invReportData.reduce((acc, row) => acc + Number(row.costPrice || 0), 0);
        const summary = `\n\n,,,,,,"الإجمالي",${grandTotal}`;

        const csvContent = [headers, ...csvRows, summary].join('\n');
        const blob = new Blob([`\uFEFF${csvContent}`], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `inventory_report_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleGenerateReceiveReport = () => {
        let filteredItems = inventoryItems.filter(item => {
            if (!item.purchaseDate) return false;
            const purchaseDate = new Date(item.purchaseDate);

            if (receiveStartDate && purchaseDate < new Date(receiveStartDate)) return false;
            if (receiveEndDate) {
                const end = new Date(receiveEndDate);
                end.setHours(23, 59, 59, 999);
                if (purchaseDate > end) return false;
            }
            if (receiveSelectedSupplier !== 'all' && item.supplierId !== receiveSelectedSupplier) return false;

            // تصفية حسب الموقع (محافظة/منطقة/عميل)
            // إذا تم اختيار عميل محدد
            if (receiveSelectedClient !== 'all') {
                if (item.destinationClientId !== receiveSelectedClient) return false;
            }
            // إذا تم اختيار منطقة (بدون عميل محدد)
            else if (receiveSelectedAreaId !== 'all') {
                const itemClient = clients.find(c => c.id === item.destinationClientId);
                if (itemClient?.areaId !== receiveSelectedAreaId) return false;
            }
            // إذا تم اختيار محافظة (بدون منطقة أو عميل)
            else if (receiveSelectedProvinceId !== 'all') {
                const itemClient = clients.find(c => c.id === item.destinationClientId);
                const itemArea = areas.find(a => a.id === itemClient?.areaId);
                if (itemArea?.provinceId !== receiveSelectedProvinceId) return false;
            }

            return true;
        });

        // FIX: Explicitly type the accumulator in the reduce function to prevent TypeScript from inferring it as `any` or `unknown`.
        // دعم الحزم: تجميع حسب bundleGroupId إذا كانت القطعة جزء من حزمة
        const aggregated = Object.values(filteredItems.reduce((acc: Record<string, AggregatedReceiveRow>, item) => {
            let key: string;
            let productName: string;
            let productSku: string;
            let unitPrice: number;

            if (item.bundleGroupId) {
                // هذه قطعة من حزمة - نجمعها حسب الحزمة
                key = `bundle-${item.bundleGroupId}`;
                productName = item.bundleName || 'حزمة';
                productSku = 'حزمة';
                unitPrice = 0; // سيتم حسابه لاحقاً
            } else {
                // منتج عادي - نستخدم المنطق القديم
                key = `${item.productId}-${item.destinationClientId}-${item.purchaseReason}-${item.costPrice}`;
                const product = getProductById(item.productId);
                productName = product?.name || 'N/A';
                productSku = product?.sku || 'N/A';
                unitPrice = item.costPrice;
            }

            if (!acc[key]) {
                const supplier = item.supplierId ? getSupplierById(item.supplierId) : null;
                acc[key] = {
                    key: key,
                    productId: item.bundleGroupId ? 'bundle' : item.productId,
                    productName: productName,
                    productSku: productSku,
                    destinationClientId: item.destinationClientId!,
                    clientName: getClientFullNameById(item.destinationClientId!),
                    purchaseReason: item.purchaseReason || 'N/A',
                    supplierId: item.supplierId,
                    supplierName: supplier?.name || 'N/A',
                    quantity: item.bundleGroupId ? 1 : 0, // الحزمة تعتبر وحدة واحدة
                    unitPrice: unitPrice,
                    totalPrice: 0,
                    purchaseDate: item.purchaseDate,
                    notes: '' // ملاحظات فارغة في البداية
                };
            }

            // للمنتجات العادية، نزيد العدد
            if (!item.bundleGroupId) {
                acc[key].quantity += 1;
            }

            // إضافة التكلفة
            acc[key].totalPrice += Number(item.costPrice || 0);

            // للحزم، نحدث سعر الوحدة ليكون التكلفة الإجمالية
            if (item.bundleGroupId) {
                acc[key].unitPrice = acc[key].totalPrice;
            }

            if (item.purchaseDate < acc[key].purchaseDate) {
                acc[key].purchaseDate = item.purchaseDate;
            }
            return acc;
        }, {}));

        // ترتيب من الأحدث إلى الأقدم
        const sortedAggregated = aggregated.sort((a, b) => b.purchaseDate.getTime() - a.purchaseDate.getTime());
        setReceiveReportData(sortedAggregated);
    };

    const handleGenerateDispatchReport = () => {
        let filteredItems = inventoryItems.filter(item => {
            if (item.status !== 'dispatched') return false;
            if (!item.dispatchDate) return false;
            const dispatchDate = new Date(item.dispatchDate);

            if (dispatchStartDate && dispatchDate < new Date(dispatchStartDate)) return false;
            if (dispatchEndDate) {
                const end = new Date(dispatchEndDate);
                end.setHours(23, 59, 59, 999);
                if (dispatchDate > end) return false;
            }

            // تصفية حسب الموقع (محافظة/منطقة/عميل)
            // إذا تم اختيار عميل محدد
            if (dispatchSelectedClient !== 'all') {
                if (item.dispatchClientId !== dispatchSelectedClient) return false;
            }
            // إذا تم اختيار منطقة (بدون عميل محدد)
            else if (dispatchSelectedAreaId !== 'all') {
                const itemClient = clients.find(c => c.id === item.dispatchClientId);
                if (itemClient?.areaId !== dispatchSelectedAreaId) return false;
            }
            // إذا تم اختيار محافظة (بدون منطقة أو عميل)
            else if (dispatchSelectedProvinceId !== 'all') {
                const itemClient = clients.find(c => c.id === item.dispatchClientId);
                const itemArea = areas.find(a => a.id === itemClient?.areaId);
                if (itemArea?.provinceId !== dispatchSelectedProvinceId) return false;
            }

            return true;
        });

        // دعم الحزم: تجميع حسب bundleGroupId إذا كانت القطعة جزء من حزمة
        const aggregated = Object.values(filteredItems.reduce((acc: Record<string, AggregatedDispatchRow>, item) => {
            let key: string;
            let productName: string;
            let productSku: string;
            let unitPrice: number;

            if (item.bundleGroupId) {
                // هذه قطعة من حزمة - نجمعها حسب الحزمة
                key = `bundle-${item.bundleGroupId}`;
                productName = item.bundleName || 'حزمة';
                productSku = 'حزمة';
                unitPrice = 0; // سيتم حسابه لاحقاً
            } else {
                // منتج عادي - نستخدم المنطق القديم
                key = `${item.productId}-${item.dispatchClientId}-${item.costPrice}`;
                const product = getProductById(item.productId);
                productName = product?.name || 'N/A';
                productSku = product?.sku || 'N/A';
                unitPrice = item.costPrice;
            }

            if (!acc[key]) {
                acc[key] = {
                    key: key,
                    productId: item.bundleGroupId ? 'bundle' : item.productId,
                    productName: productName,
                    productSku: productSku,
                    dispatchClientId: item.dispatchClientId!,
                    clientName: getClientFullNameById(item.dispatchClientId!),
                    quantity: item.bundleGroupId ? 1 : 0, // الحزمة تعتبر وحدة واحدة
                    unitPrice: unitPrice,
                    totalPrice: 0,
                    dispatchDate: item.dispatchDate
                };
            }

            // للمنتجات العادية، نزيد العدد
            if (!item.bundleGroupId) {
                acc[key].quantity += 1;
            }

            // إضافة التكلفة
            acc[key].totalPrice += Number(item.costPrice || 0);

            // للحزم، نحدث سعر الوحدة ليكون التكلفة الإجمالية
            if (item.bundleGroupId) {
                acc[key].unitPrice = acc[key].totalPrice;
            }

            if (item.dispatchDate < acc[key].dispatchDate) {
                acc[key].dispatchDate = item.dispatchDate;
            }
            return acc;
        }, {}));

        // ترتيب من الأحدث إلى الأقدم
        const sortedAggregated = aggregated.sort((a, b) => b.dispatchDate.getTime() - a.dispatchDate.getTime());
        setDispatchReportData(sortedAggregated);
    };

    const sortedReceiveData = useMemo(() => {
        if (!receiveReportData) return null;
        let sorted = [...receiveReportData];
        if (receiveSortConfig) {
            sorted.sort((a, b) => {
                let aValue: any, bValue: any;
                switch (receiveSortConfig.key) {
                    case 'product': aValue = a.productName; bValue = b.productName; break;
                    case 'quantity': aValue = a.quantity; bValue = b.quantity; break;
                    case 'cost': aValue = a.unitPrice; bValue = b.unitPrice; break;
                    case 'totalPrice': aValue = a.totalPrice; bValue = b.totalPrice; break;
                    case 'reason': aValue = a.purchaseReason; bValue = b.purchaseReason; break;
                    case 'client': aValue = a.clientName; bValue = b.clientName; break;
                    case 'supplier': aValue = a.supplierName; bValue = b.supplierName; break;
                    case 'date': aValue = a.purchaseDate; bValue = b.purchaseDate; break;
                    case 'notes': aValue = a.notes || ''; bValue = b.notes || ''; break;
                    default: return 0;
                }
                if (aValue < bValue) return receiveSortConfig.direction === 'asc' ? -1 : 1;
                if (aValue > bValue) return receiveSortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }
        return sorted;
    }, [receiveReportData, receiveSortConfig]);

    const requestReceiveSort = (key: ReceiveReportColumnKey) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (receiveSortConfig && receiveSortConfig.key === key && receiveSortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setReceiveSortConfig({ key, direction });
    };

    const handleNoteChange = (rowKey: string, note: string) => {
        setProductNotes(prev => ({
            ...prev,
            [rowKey]: note
        }));

        // تحديث البيانات مباشرة
        if (receiveReportData) {
            setReceiveReportData(prev =>
                prev ? prev.map(row =>
                    row.key === rowKey ? { ...row, notes: note } : row
                ) : null
            );
        }
    };

    const sortedDispatchData = useMemo(() => {
        if (!dispatchReportData) return null;
        let sorted = [...dispatchReportData];
        if (dispatchSortConfig) {
            sorted.sort((a, b) => {
                let aValue: any, bValue: any;
                switch (dispatchSortConfig.key) {
                    case 'product': aValue = a.productName; bValue = b.productName; break;
                    case 'quantity': aValue = a.quantity; bValue = b.quantity; break;
                    case 'cost': aValue = a.unitPrice; bValue = b.unitPrice; break;
                    case 'totalPrice': aValue = a.totalPrice; bValue = b.totalPrice; break;
                    case 'client': aValue = a.clientName; bValue = b.clientName; break;
                    case 'date': aValue = a.dispatchDate; bValue = b.dispatchDate; break;
                    default: return 0;
                }
                if (aValue < bValue) return dispatchSortConfig.direction === 'asc' ? -1 : 1;
                if (aValue > bValue) return dispatchSortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }
        return sorted;
    }, [dispatchReportData, dispatchSortConfig]);

    const requestDispatchSort = (key: DispatchReportColumnKey) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (dispatchSortConfig && dispatchSortConfig.key === key && dispatchSortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setDispatchSortConfig({ key, direction });
    };

    const handleReceiveColumnMove = (index: number, direction: 'up' | 'down') => {
        const newColumns = [...receiveColumns];
        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        if (targetIndex < 0 || targetIndex >= newColumns.length) return;
        [newColumns[index], newColumns[targetIndex]] = [newColumns[targetIndex], newColumns[index]];
        setReceiveColumns(newColumns);
    };

    const handleDispatchColumnMove = (index: number, direction: 'up' | 'down') => {
        const newColumns = [...dispatchColumns];
        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        if (targetIndex < 0 || targetIndex >= newColumns.length) return;
        [newColumns[index], newColumns[targetIndex]] = [newColumns[targetIndex], newColumns[index]];
        setDispatchColumns(newColumns);
    };

    const handleExportReceiveReport = () => {
        if (!sortedReceiveData) return;

        const visibleCols = receiveColumns.filter(c => c.visible);
        const headers = visibleCols.map(c => c.label).join(',');

        const csvRows = sortedReceiveData.map(row => {
            return visibleCols.map(col => {
                let value;
                switch (col.key) {
                    case 'product': value = row.productName; break;
                    case 'quantity': value = row.quantity; break;
                    case 'cost': value = row.unitPrice; break;
                    case 'totalPrice': value = row.totalPrice; break;
                    case 'reason': value = row.purchaseReason; break;
                    case 'client': value = row.clientName; break;
                    case 'supplier': value = row.supplierName; break;
                    case 'date': value = new Date(row.purchaseDate).toLocaleDateString('en-CA'); break;
                    case 'serial': value = "N/A"; break;
                    default: value = '';
                }
                const strValue = String(value);
                if (strValue.includes(',')) return `"${strValue}"`;
                return strValue;
            }).join(',');
        });

        const grandTotal = sortedReceiveData.reduce((acc, row) => acc + Number(row.totalPrice || 0), 0);

        const summaryHeaders = Array(Math.max(0, visibleCols.length - 2)).fill('').join(',');
        const summary = `\n\n${summaryHeaders},"الإجمالي",${grandTotal}`;

        const csvContent = [headers, ...csvRows, summary].join('\n');
        const blob = new Blob([`\uFEFF${csvContent}`], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `receive_report_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleExportDispatchReport = () => {
        if (!sortedDispatchData) return;

        const visibleCols = dispatchColumns.filter(c => c.visible);
        const headers = visibleCols.map(c => c.label).join(',');

        const csvRows = sortedDispatchData.map(row => {
            return visibleCols.map(col => {
                let value;
                switch (col.key) {
                    case 'product': value = row.productName; break;
                    case 'quantity': value = row.quantity; break;
                    case 'cost': value = row.unitPrice; break;
                    case 'totalPrice': value = row.totalPrice; break;
                    case 'client': value = row.clientName; break;
                    case 'date': value = new Date(row.dispatchDate).toLocaleDateString('en-CA'); break;
                    default: value = '';
                }
                const strValue = String(value);
                if (strValue.includes(',')) return `"${strValue}"`;
                return strValue;
            }).join(',');
        });

        const grandTotal = sortedDispatchData.reduce((acc, row) => acc + Number(row.totalPrice || 0), 0);

        const summaryHeaders = Array(Math.max(0, visibleCols.length - 2)).fill('').join(',');
        const summary = `\n\n${summaryHeaders},"الإجمالي",${grandTotal}`;

        const csvContent = [headers, ...csvRows, summary].join('\n');
        const blob = new Blob([`\uFEFF${csvContent}`], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `dispatch_report_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handlePrint = () => {
        setIsActionsMenuOpen(false);
        setIsPrintPreviewOpen(true);
    };

    const handlePrintAction = () => {
        // الحصول على المحتوى المراد طباعته
        const printArea = document.querySelector('.print-area');
        if (!printArea) {
            console.error('Print area not found');
            return;
        }

        // إنشاء نافذة طباعة جديدة
        const printContent = `
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <title>تقرير</title>
    <link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700&display=swap" rel="stylesheet">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: 'Tajawal', Arial, sans-serif; 
            direction: rtl; 
            padding: 20px;
            background: white;
            font-size: 12px;
        }
        h1, h2, h3 { margin-bottom: 10px; }
        h1 { font-size: 24px; font-weight: bold; text-align: center; }
        h2 { font-size: 20px; font-weight: bold; text-align: center; }
        h3 { font-size: 14px; font-weight: bold; }
        p { margin: 5px 0; }
        table { 
            width: 100%; 
            border-collapse: collapse; 
            margin: 20px 0;
        }
        th, td { 
            border: 1px solid #333; 
            padding: 8px; 
            text-align: right; 
            font-size: 11px;
        }
        th { 
            background-color: #f0f0f0; 
            font-weight: bold;
        }
        .text-center { text-align: center; }
        .font-bold { font-weight: bold; }
        .mb-2 { margin-bottom: 10px; }
        .mb-4 { margin-bottom: 20px; }
        .mb-8 { margin-bottom: 30px; }
        .mt-4 { margin-top: 20px; }
        .mt-20 { margin-top: 80px; }
        .p-4 { padding: 15px; }
        .bg-slate-50 { background-color: #f8f9fa; }
        .rounded-md { border-radius: 5px; }
        .border { border: 1px solid #ddd; }
        .text-slate-500 { color: #666; }
        .text-xs { font-size: 10px; }
        @media print {
            @page { size: A4; margin: 10mm; }
            body { padding: 0; }
        }
    </style>
</head>
<body>
    ${printArea.innerHTML}
</body>
</html>
        `;

        const printWindow = window.open('', '_blank');
        if (printWindow) {
            printWindow.document.write(printContent);
            printWindow.document.close();

            printWindow.onload = () => {
                printWindow.focus();
                setTimeout(() => {
                    printWindow.print();
                    printWindow.close();
                }, 250);
            };
        }

        // إغلاق النوافذ المنبثقة
        setIsPrintPreviewOpen(false);
        setIsInvPrintPreviewOpen(false);
        setIsDispatchPrintPreviewOpen(false);
    };

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold text-dark">التقارير</h1>

            {/* Tabs Navigation */}
            <div className="border-b border-slate-200">
                <nav className="-mb-px flex gap-6" aria-label="Tabs">
                    <button
                        onClick={() => setActiveTab('inventory')}
                        className={`shrink-0 border-b-2 px-1 pb-4 text-sm font-medium ${activeTab === 'inventory'
                                ? 'border-primary text-primary'
                                : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700'
                            }`}
                    >
                        📊 تقرير المخزون الشامل
                    </button>
                    <button
                        onClick={() => setActiveTab('receive')}
                        className={`shrink-0 border-b-2 px-1 pb-4 text-sm font-medium ${activeTab === 'receive'
                                ? 'border-primary text-primary'
                                : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700'
                            }`}
                    >
                        📥 تقرير استلام البضاعة
                    </button>
                    <button
                        onClick={() => setActiveTab('dispatch')}
                        className={`shrink-0 border-b-2 px-1 pb-4 text-sm font-medium ${activeTab === 'dispatch'
                                ? 'border-primary text-primary'
                                : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700'
                            }`}
                    >
                        📤 تقرير صرف البضاعة
                    </button>
                </nav>
            </div>

            {/* Inventory Report Tab */}
            {activeTab === 'inventory' && (
                <Card>
                    <CardHeader>
                        <CardTitle>تقرير المخزون الشامل</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end p-4 border rounded-md bg-slate-50">
                            <div>
                                <label className="text-sm">فئة المنتج</label>
                                <select value={invSelectedCategory} onChange={e => setInvSelectedCategory(e.target.value)}>
                                    <option value="all">الكل</option>
                                    {activeCategories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="text-sm">حالة القطعة</label>
                                <select value={invSelectedStatus} onChange={e => setInvSelectedStatus(e.target.value)}>
                                    {Object.entries(itemStatuses).map(([key, value]) => <option key={key} value={key}>{value}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="text-sm">المحافظة</label>
                                <select value={invSelectedProvinceId} onChange={e => handleInvProvinceChange(e.target.value)}>
                                    <option value="all">الكل</option>
                                    {provinces.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="text-sm">المنطقة</label>
                                <select
                                    value={invSelectedAreaId}
                                    onChange={e => handleInvAreaChange(e.target.value)}
                                    disabled={invSelectedProvinceId === 'all'}
                                    className="disabled:bg-gray-100 disabled:cursor-not-allowed"
                                >
                                    <option value="all">الكل</option>
                                    {invFilteredAreas.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="text-sm">العميل</label>
                                <select
                                    value={invSelectedClient}
                                    onChange={e => setInvSelectedClient(e.target.value)}
                                    disabled={invSelectedAreaId === 'all'}
                                    className="disabled:bg-gray-100 disabled:cursor-not-allowed"
                                >
                                    <option value="all">الكل</option>
                                    {invFilteredClients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                            </div>
                            <Button onClick={handleGenerateInventoryReport} className="w-full">
                                <Icons.SearchCheck className="h-4 w-4 ml-2" />
                                إنشاء التقرير
                            </Button>
                        </div>
                        {invReportData && (
                            <div className="mt-6">
                                <div className="flex justify-end gap-2 mb-4">
                                    <Button variant="secondary" onClick={handleExportInventoryReport}>
                                        <Icons.Download className="h-4 w-4 ml-2" />
                                        تصدير CSV
                                    </Button>
                                    <Button onClick={() => setIsInvPrintPreviewOpen(true)}>
                                        <Icons.Printer className="h-4 w-4 ml-2" />
                                        طباعة
                                    </Button>
                                </div>
                                <table className="w-full text-sm text-right">
                                    <thead className="text-xs text-slate-700 uppercase bg-slate-100">
                                        <tr>
                                            <th className="px-4 py-3 w-12"></th>
                                            <th className="px-4 py-3">المنتج</th>
                                            <th className="px-4 py-3">الكمية</th>
                                            <th className="px-4 py-3">الحالة</th>
                                            <th className="px-4 py-3">الموقع الحالي</th>
                                            <th className="px-4 py-3">التكلفة الإجمالية</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {groupedInventoryData && groupedInventoryData.map(group => {
                                            const isExpanded = expandedGroups.has(group.key);
                                            return (
                                                <React.Fragment key={group.key}>
                                                    {/* الصف المجمع */}
                                                    <tr
                                                        className="bg-white border-b hover:bg-slate-50 cursor-pointer"
                                                        onClick={() => toggleGroupExpansion(group.key)}
                                                    >
                                                        <td className="px-4 py-3 text-center">
                                                            {isExpanded ? (
                                                                <Icons.ChevronDown className="h-4 w-4 inline" />
                                                            ) : (
                                                                <Icons.ChevronRight className="h-4 w-4 inline" />
                                                            )}
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            <span className="font-semibold">{group.productName}</span>
                                                            <span className="block text-xs font-mono text-slate-400">{group.productSku}</span>
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            <span className="inline-flex items-center px-2 py-1 rounded-full bg-blue-100 text-blue-800 font-semibold">
                                                                {group.quantity} قطعة
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-3">{itemStatuses[group.status]}</td>
                                                        <td className="px-4 py-3">{group.location}</td>
                                                        <td className="px-4 py-3 font-semibold">{formatCurrency(group.totalCost)}</td>
                                                    </tr>

                                                    {/* الصفوف التفصيلية */}
                                                    {isExpanded && group.items.map(item => (
                                                        <tr key={item.id} className="bg-slate-50 border-b">
                                                            <td className="px-4 py-2"></td>
                                                            <td className="px-4 py-2 text-xs text-slate-600">
                                                                <Icons.CornerDownRight className="h-3 w-3 inline ml-1" />
                                                                باركود: {item.serialNumber}
                                                            </td>
                                                            <td className="px-4 py-2 text-xs text-slate-600">1</td>
                                                            <td className="px-4 py-2 text-xs text-slate-600">{itemStatuses[item.status]}</td>
                                                            <td className="px-4 py-2 text-xs text-slate-600">
                                                                {item.purchaseReason || '-'}
                                                            </td>
                                                            <td className="px-4 py-2 text-xs text-slate-600">{formatCurrency(item.costPrice)}</td>
                                                        </tr>
                                                    ))}
                                                </React.Fragment>
                                            );
                                        })}
                                    </tbody>
                                    <tfoot>
                                        <tr className="bg-slate-100 font-bold text-base">
                                            <td colSpan={5} className="px-4 py-3 text-left">الإجمالي</td>
                                            <td className="px-4 py-3">
                                                {formatCurrency(invReportData.reduce((acc, row) => acc + row.costPrice, 0))}
                                            </td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* Receive Report Tab */}
            {activeTab === 'receive' && (
                <Card>
                    <CardHeader>
                        <CardTitle>تقرير استلام بضاعة</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4 p-4 border rounded-md bg-slate-50">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="text-sm">المورد</label>
                                    <select value={receiveSelectedSupplier} onChange={e => setReceiveSelectedSupplier(e.target.value)}>
                                        <option value="all">الكل</option>
                                        {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="text-sm font-medium mb-2 block">العميل/الموقع</label>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                    <div>
                                        <select value={receiveSelectedProvinceId} onChange={e => handleReceiveProvinceChange(e.target.value)}>
                                            <option value="all">كل المحافظات</option>
                                            {provinces.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <select
                                            value={receiveSelectedAreaId}
                                            onChange={e => handleReceiveAreaChange(e.target.value)}
                                            disabled={receiveSelectedProvinceId === 'all'}
                                            className="disabled:bg-gray-100 disabled:cursor-not-allowed"
                                        >
                                            <option value="all">كل المناطق</option>
                                            {receiveFilteredAreas.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <select
                                            value={receiveSelectedClient}
                                            onChange={e => setReceiveSelectedClient(e.target.value)}
                                            disabled={receiveSelectedAreaId === 'all'}
                                            className="disabled:bg-gray-100 disabled:cursor-not-allowed"
                                        >
                                            <option value="all">كل العملاء</option>
                                            {receiveFilteredClients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                        </select>
                                    </div>
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="text-sm">من تاريخ</label>
                                    <input type="date" value={receiveStartDate} onChange={e => setReceiveStartDate(e.target.value)} />
                                </div>
                                <div>
                                    <label className="text-sm">إلى تاريخ</label>
                                    <input type="date" value={receiveEndDate} onChange={e => setReceiveEndDate(e.target.value)} />
                                </div>
                            </div>
                            <Button onClick={handleGenerateReceiveReport} className="w-full">
                                <Icons.SearchCheck className="h-4 w-4 ml-2" />
                                إنشاء التقرير
                            </Button>
                        </div>

                        {receiveReportData && (
                            <div className="mt-6">
                                <div className="flex justify-end mb-4">
                                    <div className="relative" ref={actionsMenuRef}>
                                        <Button variant="secondary" onClick={() => setIsActionsMenuOpen(prev => !prev)}>
                                            <Icons.List className="h-4 w-4 ml-2" />
                                            إجراءات
                                        </Button>
                                        {isActionsMenuOpen && (
                                            <div className="absolute left-0 mt-2 w-48 bg-white rounded-md shadow-lg border z-10">
                                                <button onClick={() => { setIsReceiveColumnModalOpen(true); setIsActionsMenuOpen(false); }} className="w-full text-right block px-4 py-2 text-sm text-slate-700 hover:bg-slate-100">تخصيص الأعمدة</button>
                                                <button onClick={handlePrint} className="w-full text-right block px-4 py-2 text-sm text-slate-700 hover:bg-slate-100">طباعة</button>
                                                <button onClick={handleExportReceiveReport} className="w-full text-right block px-4 py-2 text-sm text-slate-700 hover:bg-slate-100">تصدير CSV</button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <table className="w-full text-sm text-right">
                                    <thead className="text-xs text-slate-700 uppercase bg-slate-100">
                                        <tr>
                                            {receiveColumns.filter(c => c.visible).map(col => (
                                                <th key={col.key} className="px-4 py-3 cursor-pointer" onClick={() => requestReceiveSort(col.key)}>
                                                    {col.label}
                                                    {receiveSortConfig?.key === col.key && (receiveSortConfig.direction === 'asc' ? ' ▲' : ' ▼')}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {sortedReceiveData && sortedReceiveData.map(row => (
                                            <tr key={row.key} className="bg-white border-b hover:bg-slate-50">
                                                {receiveColumns.filter(c => c.visible).map(col => (
                                                    <td key={col.key} className="px-4 py-3 align-top">
                                                        {/* FIX: Add type assertion to the object literal to help TypeScript infer the correct type and avoid 'unknown' type errors. */}
                                                        {
                                                            ({
                                                                product: <div><span className="font-semibold">{row.productName}</span><span className="block text-xs font-mono text-slate-400">{row.productSku}</span></div>,
                                                                quantity: row.quantity,
                                                                cost: formatCurrency(row.unitPrice),
                                                                totalPrice: formatCurrency(row.totalPrice),
                                                                reason: row.purchaseReason,
                                                                client: row.clientName,
                                                                supplier: row.supplierName,
                                                                date: formatDate(row.purchaseDate),
                                                                serial: "N/A",
                                                                notes: (
                                                                    <textarea
                                                                        value={row.notes || ''}
                                                                        onChange={(e) => handleNoteChange(row.key, e.target.value)}
                                                                        placeholder="أضف ملاحظة..."
                                                                        className="w-full min-h-[60px] p-2 text-sm border rounded resize-y"
                                                                        rows={2}
                                                                    />
                                                                )
                                                            } as Record<ReceiveReportColumnKey, ReactNode>)[col.key]
                                                        }
                                                    </td>
                                                ))}
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot>
                                        <tr className="bg-slate-100 font-bold text-base">
                                            <td colSpan={Math.max(1, receiveColumns.filter(c => c.visible).length - 1)} className="px-4 py-3 text-left">الإجمالي</td>
                                            <td className="px-4 py-3">
                                                {sortedReceiveData &&
                                                    formatCurrency(sortedReceiveData.reduce((acc, row) => acc + row.totalPrice, 0))
                                                }
                                            </td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* Dispatch Report Tab */}
            {activeTab === 'dispatch' && (
                <Card>
                    <CardHeader>
                        <CardTitle>تقرير صرف بضاعة</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4 p-4 border rounded-md bg-slate-50">
                            <div>
                                <label className="text-sm font-medium mb-2 block">العميل/الموقع</label>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                    <div>
                                        <select value={dispatchSelectedProvinceId} onChange={e => handleDispatchProvinceChange(e.target.value)}>
                                            <option value="all">كل المحافظات</option>
                                            {provinces.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <select
                                            value={dispatchSelectedAreaId}
                                            onChange={e => handleDispatchAreaChange(e.target.value)}
                                            disabled={dispatchSelectedProvinceId === 'all'}
                                            className="disabled:bg-gray-100 disabled:cursor-not-allowed"
                                        >
                                            <option value="all">كل المناطق</option>
                                            {dispatchFilteredAreas.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <select
                                            value={dispatchSelectedClient}
                                            onChange={e => setDispatchSelectedClient(e.target.value)}
                                            disabled={dispatchSelectedAreaId === 'all'}
                                            className="disabled:bg-gray-100 disabled:cursor-not-allowed"
                                        >
                                            <option value="all">كل العملاء</option>
                                            {dispatchFilteredClients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                        </select>
                                    </div>
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="text-sm">من تاريخ</label>
                                    <input type="date" value={dispatchStartDate} onChange={e => setDispatchStartDate(e.target.value)} />
                                </div>
                                <div>
                                    <label className="text-sm">إلى تاريخ</label>
                                    <input type="date" value={dispatchEndDate} onChange={e => setDispatchEndDate(e.target.value)} />
                                </div>
                            </div>
                            <Button onClick={handleGenerateDispatchReport} className="w-full">
                                <Icons.SearchCheck className="h-4 w-4 ml-2" />
                                إنشاء التقرير
                            </Button>
                        </div>

                        {dispatchReportData && (
                            <div className="mt-6">
                                <div className="flex justify-end mb-4">
                                    <div className="relative" ref={dispatchActionsMenuRef}>
                                        <Button variant="secondary" onClick={() => setIsDispatchActionsMenuOpen(prev => !prev)}>
                                            <Icons.List className="h-4 w-4 ml-2" />
                                            إجراءات
                                        </Button>
                                        {isDispatchActionsMenuOpen && (
                                            <div className="absolute left-0 mt-2 w-48 bg-white rounded-md shadow-lg border z-10">
                                                <button onClick={() => { setIsDispatchColumnModalOpen(true); setIsDispatchActionsMenuOpen(false); }} className="w-full text-right block px-4 py-2 text-sm text-slate-700 hover:bg-slate-100">تخصيص الأعمدة</button>
                                                <button onClick={() => { setIsDispatchPrintPreviewOpen(true); setIsDispatchActionsMenuOpen(false); }} className="w-full text-right block px-4 py-2 text-sm text-slate-700 hover:bg-slate-100">طباعة</button>
                                                <button onClick={handleExportDispatchReport} className="w-full text-right block px-4 py-2 text-sm text-slate-700 hover:bg-slate-100">تصدير CSV</button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <table className="w-full text-sm text-right">
                                    <thead className="text-xs text-slate-700 uppercase bg-slate-100">
                                        <tr>
                                            {dispatchColumns.filter(c => c.visible).map(col => (
                                                <th key={col.key} className="px-4 py-3 cursor-pointer" onClick={() => requestDispatchSort(col.key)}>
                                                    {col.label}
                                                    {dispatchSortConfig?.key === col.key && (dispatchSortConfig.direction === 'asc' ? ' ▲' : ' ▼')}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {sortedDispatchData && sortedDispatchData.map(row => (
                                            <tr key={row.key} className="bg-white border-b hover:bg-slate-50">
                                                {dispatchColumns.filter(c => c.visible).map(col => (
                                                    <td key={col.key} className="px-4 py-3 align-top">
                                                        {
                                                            ({
                                                                product: <div><span className="font-semibold">{row.productName}</span><span className="block text-xs font-mono text-slate-400">{row.productSku}</span></div>,
                                                                quantity: row.quantity,
                                                                cost: formatCurrency(row.unitPrice),
                                                                totalPrice: formatCurrency(row.totalPrice),
                                                                client: row.clientName,
                                                                date: formatDate(row.dispatchDate),
                                                            } as Record<DispatchReportColumnKey, ReactNode>)[col.key]
                                                        }
                                                    </td>
                                                ))}
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot>
                                        <tr className="bg-slate-100 font-bold text-base">
                                            <td colSpan={Math.max(1, dispatchColumns.filter(c => c.visible).length - 1)} className="px-4 py-3 text-left">الإجمالي</td>
                                            <td className="px-4 py-3">
                                                {sortedDispatchData &&
                                                    formatCurrency(sortedDispatchData.reduce((acc, row) => acc + row.totalPrice, 0))}
                                            </td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* Modals for Receive Report */}
            <Modal isOpen={isReceiveColumnModalOpen} onClose={() => setIsReceiveColumnModalOpen(false)} title="تخصيص أعمدة التقرير">
                <div className="space-y-2">
                    <p className="text-sm text-slate-600">اختر الأعمدة التي تريد إظهارها وأعد ترتيبها حسب الأولوية.</p>
                    {receiveColumns.map((col, index) => (
                        <div key={col.key} className="flex items-center justify-between p-2 hover:bg-slate-100 rounded-md">
                            <label className="flex items-center gap-3">
                                <input
                                    type="checkbox"
                                    checked={col.visible}
                                    onChange={() => setReceiveColumns(prev => prev.map(c => c.key === col.key ? { ...c, visible: !c.visible } : c))}
                                />
                                {col.label}
                            </label>
                            <div className="flex gap-1">
                                <button onClick={() => handleReceiveColumnMove(index, 'up')} disabled={index === 0} className="p-1 disabled:opacity-30">▲</button>
                                <button onClick={() => handleReceiveColumnMove(index, 'down')} disabled={index === receiveColumns.length - 1} className="p-1 disabled:opacity-30">▼</button>
                            </div>
                        </div>
                    ))}
                </div>
                <div className="flex justify-end pt-4">
                    <Button onClick={() => setIsReceiveColumnModalOpen(false)}>تم</Button>
                </div>
            </Modal>


            <Modal isOpen={isDispatchColumnModalOpen} onClose={() => setIsDispatchColumnModalOpen(false)} title="تخصيص أعمدة تقرير الصرف">
                <div className="space-y-2">
                    <p className="text-sm text-slate-600">اختر الأعمدة التي تريد إظهارها وأعد ترتيبها حسب الأولوية.</p>
                    {dispatchColumns.map((col, index) => (
                        <div key={col.key} className="flex items-center justify-between p-2 hover:bg-slate-100 rounded-md">
                            <label className="flex items-center gap-3">
                                <input
                                    type="checkbox"
                                    checked={col.visible}
                                    onChange={() => setDispatchColumns(prev => prev.map(c => c.key === col.key ? { ...c, visible: !c.visible } : c))}
                                />
                                {col.label}
                            </label>
                            <div className="flex gap-1">
                                <button onClick={() => handleDispatchColumnMove(index, 'up')} disabled={index === 0} className="p-1 disabled:opacity-30">▲</button>
                                <button onClick={() => handleDispatchColumnMove(index, 'down')} disabled={index === dispatchColumns.length - 1} className="p-1 disabled:opacity-30">▼</button>
                            </div>
                        </div>
                    ))}
                </div>
                <div className="flex justify-end pt-4">
                    <Button onClick={() => setIsDispatchColumnModalOpen(false)}>تم</Button>
                </div>
            </Modal>

            <Modal isOpen={isDispatchPrintPreviewOpen} onClose={() => setIsDispatchPrintPreviewOpen(false)} title="معاينة طباعة تقرير الصرف">
                <div className="flex flex-col h-[75vh]">
                    <div className="flex-grow overflow-y-auto pr-4 -mr-4">
                        <div className="print-area">
                            <div className="mb-8">
                                <h1 className="text-3xl font-bold text-center mb-2">{companyName}</h1>
                                <h2 className="text-2xl font-bold text-center">تقرير صرف بضاعة</h2>
                                <p className="text-center text-slate-500">تاريخ الطباعة: {formatDateTime(new Date())}</p>
                                <div className="mt-4 text-sm p-4 bg-slate-50 rounded-md border">
                                    <h3 className="font-bold mb-2">معايير البحث:</h3>
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-1">
                                        <div><strong>العميل:</strong> {dispatchSelectedClient === 'all' ? 'الكل' : getClientFullNameById(dispatchSelectedClient)}</div>
                                        <div><strong>من تاريخ:</strong> {dispatchStartDate || 'البداية'}</div>
                                        <div><strong>إلى تاريخ:</strong> {dispatchEndDate || 'النهاية'}</div>
                                    </div>
                                </div>
                            </div>

                            {sortedDispatchData && sortedDispatchData.length > 0 ? (
                                <table className="w-full text-sm text-right">
                                    <thead className="text-xs text-slate-700 uppercase bg-slate-100">
                                        <tr>
                                            {dispatchColumns.filter(c => c.visible).map(col => (
                                                <th key={col.key} className="px-4 py-3">{col.label}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {sortedDispatchData.map(row => (
                                            <tr key={row.key} className="bg-white border-b">
                                                {dispatchColumns.filter(c => c.visible).map(col => (
                                                    <td key={col.key} className="px-4 py-3 align-top">
                                                        {
                                                            ({
                                                                product: <div><span className="font-semibold">{row.productName}</span><span className="block text-xs font-mono text-slate-400">{row.productSku}</span></div>,
                                                                quantity: row.quantity,
                                                                cost: formatCurrency(row.unitPrice),
                                                                totalPrice: formatCurrency(row.totalPrice),
                                                                client: row.clientName,
                                                                date: formatDate(row.dispatchDate),
                                                            } as Record<DispatchReportColumnKey, ReactNode>)[col.key]
                                                        }
                                                    </td>
                                                ))}
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot>
                                        <tr className="bg-slate-100 font-bold text-base">
                                            <td colSpan={Math.max(1, dispatchColumns.filter(c => c.visible).length - 1)} className="px-4 py-3 text-left">الإجمالي</td>
                                            <td className="px-4 py-3">
                                                {
                                                    formatCurrency(sortedDispatchData.reduce((acc, row) => acc + row.totalPrice, 0))
                                                }
                                            </td>
                                        </tr>
                                    </tfoot>
                                </table>
                            ) : (
                                <p className="text-center text-slate-500 py-8">لا توجد بيانات لعرضها.</p>
                            )}

                            <div className="print-footer text-center text-xs text-slate-500 mt-20">
                                <p>هذا التقرير تم إنشاؤه بواسطة {companyName}.</p>
                                <p>صفحة <span className="page-number"></span></p>
                            </div>
                        </div>
                    </div>
                    <div className="flex-shrink-0 flex justify-end gap-2 mt-6 pt-4 border-t no-print">
                        <Button variant="secondary" onClick={() => setIsDispatchPrintPreviewOpen(false)}>إغلاق</Button>
                        <Button onClick={handlePrintAction}>
                            <Icons.Printer className="h-4 w-4 ml-2" />
                            طباعة الآن
                        </Button>
                    </div>
                </div>
            </Modal>

            <Modal isOpen={isInvPrintPreviewOpen} onClose={() => setIsInvPrintPreviewOpen(false)} title="معاينة طباعة تقرير المخزون">
                <div className="flex flex-col h-[75vh]">
                    <div className="flex-grow overflow-y-auto pr-4 -mr-4">
                        <div className="print-area">
                            <div className="mb-8">
                                <h1 className="text-3xl font-bold text-center mb-2">{companyName}</h1>
                                <h2 className="text-2xl font-bold text-center">تقرير المخزون الشامل</h2>
                                <p className="text-center text-slate-500">تاريخ الطباعة: {formatDateTime(new Date())}</p>
                                <div className="mt-4 text-sm p-4 bg-slate-50 rounded-md border">
                                    <h3 className="font-bold mb-2">معايير البحث:</h3>
                                    <div className="grid grid-cols-3 gap-x-4 gap-y-1">
                                        <div><strong>الفئة:</strong> {invSelectedCategory === 'all' ? 'الكل' : categories.find(c => c.id === invSelectedCategory)?.name || 'غير محدد'}</div>
                                        <div><strong>الحالة:</strong> {itemStatuses[invSelectedStatus]}</div>
                                        <div><strong>الموقع:</strong> {invSelectedClient === 'all' ? 'الكل' : getClientFullNameById(invSelectedClient)}</div>
                                    </div>
                                </div>
                            </div>
                            {invReportData && invReportData.length > 0 ? (
                                <table className="w-full text-sm text-right">
                                    <thead className="text-xs text-slate-700 uppercase bg-slate-100">
                                        <tr>
                                            <th className="px-4 py-3">المنتج</th>
                                            <th className="px-4 py-3">باركود القطعة</th>
                                            <th className="px-4 py-3">الموقع الحالي</th>
                                            <th className="px-4 py-3">سبب الشراء</th>
                                            <th className="px-4 py-3">تكلفة الشراء</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {invReportData.map(item => {
                                            const product = getProductById(item.productId);
                                            return (
                                                <tr key={item.id} className="bg-white border-b">
                                                    <td className="px-4 py-3 align-top">{product?.name}</td>
                                                    <td className="px-4 py-3 font-mono align-top">{item.serialNumber}</td>
                                                    <td className="px-4 py-3 align-top">{getItemLocationName(item)}</td>
                                                    <td className="px-4 py-3 align-top">{item.purchaseReason || '-'}</td>
                                                    <td className="px-4 py-3 align-top">{formatCurrency(item.costPrice)}</td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                    <tfoot>
                                        <tr className="bg-slate-100 font-bold text-base">
                                            <td colSpan={4} className="px-4 py-3 text-left">الإجمالي</td>
                                            <td className="px-4 py-3">
                                                {formatCurrency(invReportData.reduce((acc, row) => acc + row.costPrice, 0))}
                                            </td>
                                        </tr>
                                    </tfoot>
                                </table>
                            ) : <p className="text-center text-slate-500 py-8">لا توجد بيانات لعرضها.</p>}
                            <div className="print-footer text-center text-xs text-slate-500 mt-20">
                                <p>هذا التقرير تم إنشاؤه بواسطة {companyName}.</p>
                                <p>صفحة <span className="page-number"></span></p>
                            </div>
                        </div>
                    </div>
                    <div className="flex-shrink-0 flex justify-end gap-2 mt-6 pt-4 border-t no-print">
                        <Button variant="secondary" onClick={() => setIsInvPrintPreviewOpen(false)}>إغلاق</Button>
                        <Button onClick={handlePrintAction}>
                            <Icons.Printer className="h-4 w-4 ml-2" />
                            طباعة الآن
                        </Button>
                    </div>
                </div>
            </Modal>

            <Modal isOpen={isPrintPreviewOpen} onClose={() => setIsPrintPreviewOpen(false)} title="معاينة طباعة تقرير الاستلام">
                <div className="flex flex-col h-[75vh]">
                    <div className="flex-grow overflow-y-auto pr-4 -mr-4">
                        <div className="print-area">
                            <div className="mb-8">
                                <h1 className="text-3xl font-bold text-center mb-2">{companyName}</h1>
                                <h2 className="text-2xl font-bold text-center">تقرير استلام بضاعة</h2>
                                <p className="text-center text-slate-500">تاريخ الطباعة: {formatDateTime(new Date())}</p>
                                <div className="mt-4 text-sm p-4 bg-slate-50 rounded-md border">
                                    <h3 className="font-bold mb-2">معايير البحث:</h3>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-1">
                                        <div><strong>المورد:</strong> {receiveSelectedSupplier === 'all' ? 'الكل' : getSupplierById(receiveSelectedSupplier)?.name}</div>
                                        <div><strong>العميل:</strong> {receiveSelectedClient === 'all' ? 'الكل' : getClientFullNameById(receiveSelectedClient)}</div>
                                        <div><strong>من تاريخ:</strong> {receiveStartDate || 'البداية'}</div>
                                        <div><strong>إلى تاريخ:</strong> {receiveEndDate || 'النهاية'}</div>
                                    </div>
                                </div>
                            </div>

                            {sortedReceiveData && sortedReceiveData.length > 0 ? (
                                <table className="w-full text-sm text-right">
                                    <thead className="text-xs text-slate-700 uppercase bg-slate-100">
                                        <tr>
                                            {receiveColumns.filter(c => c.visible).map(col => (
                                                <th key={col.key} className="px-4 py-3">{col.label}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {sortedReceiveData.map(row => (
                                            <tr key={row.key} className="bg-white border-b">
                                                {receiveColumns.filter(c => c.visible).map(col => (
                                                    <td key={col.key} className="px-4 py-3 align-top">
                                                        {
                                                            ({
                                                                product: <div><span className="font-semibold">{row.productName}</span><span className="block text-xs font-mono text-slate-400">{row.productSku}</span></div>,
                                                                quantity: row.quantity,
                                                                cost: formatCurrency(row.unitPrice),
                                                                totalPrice: formatCurrency(row.totalPrice),
                                                                reason: row.purchaseReason,
                                                                client: row.clientName,
                                                                supplier: row.supplierName,
                                                                date: formatDate(row.purchaseDate),
                                                                serial: "N/A",
                                                                notes: row.notes ? <div className="text-sm whitespace-pre-wrap">{row.notes}</div> : <span className="text-slate-400">-</span>
                                                            } as Record<ReceiveReportColumnKey, ReactNode>)[col.key]
                                                        }
                                                    </td>
                                                ))}
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot>
                                        <tr className="bg-slate-100 font-bold text-base">
                                            <td colSpan={Math.max(1, receiveColumns.filter(c => c.visible).length - 1)} className="px-4 py-3 text-left">الإجمالي</td>
                                            <td className="px-4 py-3">
                                                {
                                                    formatCurrency(sortedReceiveData.reduce((acc, row) => acc + row.totalPrice, 0))
                                                }
                                            </td>
                                        </tr>
                                    </tfoot>
                                </table>
                            ) : (
                                <p className="text-center text-slate-500 py-8">لا توجد بيانات لعرضها.</p>
                            )}

                            <div className="print-footer text-center text-xs text-slate-500 mt-20">
                                <p>هذا التقرير تم إنشاؤه بواسطة {companyName}.</p>
                                <p>صفحة <span className="page-number"></span></p>
                            </div>
                        </div>
                    </div>
                    <div className="flex-shrink-0 flex justify-end gap-2 mt-6 pt-4 border-t no-print">
                        <Button variant="secondary" onClick={() => setIsPrintPreviewOpen(false)}>إغلاق</Button>
                        <Button onClick={handlePrintAction}>
                            <Icons.Printer className="h-4 w-4 ml-2" />
                            طباعة الآن
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default Reports;