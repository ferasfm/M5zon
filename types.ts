// types.ts

export interface ProductComponent {
  productId: string;
  quantity: number;
}

export interface Product {
  id: string;
  name: string;
  sku: string;
  category: string;
  standardCostPrice: number;
  hasWarranty: boolean;
  warrantyDurationValue?: number;
  warrantyDurationUnit?: 'days' | 'months' | 'years';
  productType: 'standard' | 'bundle';
  components?: ProductComponent[];
}

export interface InventoryItem {
  id: string;
  productId: string;
  serialNumber: string;
  costPrice: number;
  status: 'in_stock' | 'dispatched' | 'scrapped' | 'damaged_on_arrival';
  purchaseDate: Date;
  dispatchDate?: Date;
  scrapDate?: Date;
  supplierId?: string;
  destinationClientId?: string; // Where it was sent upon purchase
  dispatchClientId?: string; // Where it was dispatched to from stock
  purchaseReason?: string;
  dispatchReason?: string;
  scrapReason?: string;
  dispatchNotes?: string;
  scrapNotes?: string;
  dispatchReference?: string;
  warrantyEndDate?: Date;
}

export type NewItem = Omit<InventoryItem, 'id' | 'dispatchDate' | 'scrapDate' | 'dispatchClientId' | 'dispatchReason' | 'scrapReason' | 'dispatchNotes' | 'scrapNotes' | 'dispatchReference' | 'warrantyEndDate'>;

export interface PriceAgreement {
  productId: string;
  price: number;
  startDate: Date;
}

export interface Supplier {
  id: string;
  name: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  address?: string;
  priceAgreements?: PriceAgreement[];
}

export interface Province {
    id: string;
    name: string;
}

export interface Area {
    id: string;
    name: string;
    provinceId: string;
}

export interface Client {
    id: string;
    name: string;
    areaId: string;
}

export interface TransactionReason {
    id: string;
    reasonText: string;
    reasonType: 'purchase' | 'dispatch' | 'scrap' | 'both';
    isActive: boolean;
    displayOrder: number;
}

export type Page = 'dashboard' | 'products' | 'inventory' | 'receiving' | 'dispatching' | 'scrapping' | 'suppliers' | 'locations' | 'reports' | 'print_templates' | 'settings';

export interface AppSettings {
  lowStockThreshold: number;
  warrantyDaysThreshold: number;
}

export interface UseInventoryReturn {
  // Data
  inventoryItems: InventoryItem[];
  products: Product[];
  suppliers: Supplier[];
  provinces: Province[];
  areas: Area[];
  clients: Client[];
  transactionReasons: TransactionReason[];
  settings: AppSettings;

  // Settings
  wipeAllData: () => void;
  
  // Products
  addProduct: (productData: Omit<Product, 'id'>) => void;
  updateProduct: (product: Product) => void;
  deleteProduct: (productId: string) => void;
  getProductById: (productId: string) => Product | undefined;

  // Inventory Items
  receiveItems: (items: NewItem[]) => Promise<boolean>;
  dispatchItems: (itemIds: string[], dispatchClientId: string, dispatchDate: Date, reason: string, notes?: string, reference?: string) => void;
  scrapItems: (itemIds: string[], reason: string, notes?: string) => void;
  findItemBySerial: (serial: string) => InventoryItem | undefined;
  getItemLocationName: (item: InventoryItem) => string;

  // Suppliers
  addSupplier: (supplierData: Omit<Supplier, 'id' | 'priceAgreements'>) => void;
  updateSupplier: (supplier: Supplier) => void;
  deleteSupplier: (supplierId: string) => void;
  getSupplierById: (supplierId: string) => Supplier | undefined;
  addPriceAgreement: (supplierId: string, agreement: Omit<PriceAgreement, 'startDate'> & { startDate: string }) => void;
  removePriceAgreement: (supplierId: string, productId: string) => void;

  // Locations (Provinces, Areas, Clients)
  getClientFullNameById: (id: string) => string;
  provincesApi: {
    addProvince: (name: string) => void;
    updateProvince: (province: Province) => void;
    deleteProvince: (id: string) => void;
  };
  areasApi: {
    addArea: (name: string, provinceId: string) => void;
    updateArea: (area: Area) => void;
    deleteArea: (id: string) => void;
  };
  clientsApi: {
    addClient: (name: string, areaId: string) => void;
    updateClient: (client: Client) => void;
    deleteClient: (id: string) => void;
    getClientById: (id: string) => Client | undefined;
  };
  
  // Transaction Reasons
  reasonsApi: {
    addReason: (reasonText: string, reasonType: 'purchase' | 'dispatch' | 'scrap' | 'both') => Promise<void>;
    updateReason: (reason: TransactionReason) => Promise<void>;
    deleteReason: (id: string) => Promise<void>;
    getPurchaseReasons: () => TransactionReason[];
    getDispatchReasons: () => TransactionReason[];
    getScrapReasons: () => TransactionReason[];
  };
  
  // Dashboard Metrics
  getAggregatedInventoryValue: () => number;
  getLowStockProducts: (threshold: number) => { product: Product; quantity: number }[];
  getExpiringWarranties: (days: number) => InventoryItem[];
  getScrappedValueLast30Days: () => number;
}

export type NotificationType = 'success' | 'error' | 'info';

export interface Notification {
  id: number;
  message: string;
  type: NotificationType;
}

export interface NotificationContextType {
  notifications: Notification[];
  addNotification: (message: string, type: NotificationType) => void;
  removeNotification: (id: number) => void;
}