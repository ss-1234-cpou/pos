export type ProductCategory = 
  | 'sayur'
  | 'buah'
  | 'bahan_kue'
  | 'plastik'
  | 'bumbu_saus'
  | 'frozen_food'
  | string;

export interface CategoryItem {
  id: string;
  label: string;
}

export interface Product {
  id: string;
  name: string;
  sku: string;
  barcode: string;
  category: ProductCategory;
  costPrice: number;      // Harga modal / beli
  sellingPrice: number;   // Harga jual
  stock: number;          // Stok fisik
  minStockAlert: number;  // Ambang peringatan stok tipis
  isi: string;            // Isi kemasan / per karton, misal: "12 pack", "24 pcs", "10 kg"
  cartonPrice: number;    // Harga per karton / dus
  unit: 'pack' | 'kg' | 'dus' | 'pcs' | 'roll' | 'botol';
  freezerLocation: string; // Misal: Freezer A-01, Freezer B-02
  temperatureTarget: string; // Misal: -18°C
  expiryDate: string;     // Format: YYYY-MM-DD
  imageUrl: string;
  isHalal: boolean;
  weightGrams?: number;
  description?: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
  discountPercent: number;
  customPrice?: number;
  customUnit?: string;
  note?: string; // Kolom Catatan Manual kasir (spesifikasi, ukuran, detail)
  subtotal: number;
}

export type PaymentMethod = 'cash' | 'qris' | 'transfer' | 'debit';

export interface Transaction {
  id: string;
  invoiceNumber: string;
  timestamp: string;      // ISO String
  items: CartItem[];
  totalItemsCount: number;
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  finalAmount: number;
  totalCost: number;      // Total harga modal barang terjual
  grossProfit: number;    // Laba kotor (finalAmount - totalCost)
  paymentMethod: PaymentMethod;
  cashGiven?: number;
  changeAmount?: number;
  cashierName: string;
  customerName?: string;
  customerPhone?: string;
  notes?: string;
  syncedToCloud: boolean;
}

export interface DailySalesChartData {
  dateKey: string;
  dayName: string;
  shortDate: string;
  omset: number;
  laba: number;
  transaksiCount: number;
}

export interface StoreSettings {
  storeName: string;
  tagline: string;
  address: string;
  phone: string;
  ownerPhone: string;
  ownerPin: string;
  appLockPin?: string;
  enableAppLockOnStart?: boolean;
  receiptFooter: string;
  taxPercentage: number;
  enableTax: boolean;
  cloudSyncEnabled: boolean;
  lastCloudSync?: string;
  logoUrl?: string;
  activeCashierName?: string;
  cashierLogoUrl?: string;
  cashierSectionLabel?: string;
  managementSectionLabel?: string;
  enableVoiceSearch?: boolean;
  enabledPaymentMethods?: PaymentMethod[];
  defaultPaymentMethod?: PaymentMethod;
  showLogoOnReceipt?: boolean;
  showCashierOnReceipt?: boolean;
  showCashierNameOnReceipt?: boolean;
  googleSheetsId?: string;
  googleSheetsUrl?: string;
  googleSheetsName?: string;
  autoSyncToGoogleSheets?: boolean;
  lastGoogleSheetsSync?: string;
  autoConnectGoogle?: boolean;
}

export interface DailyReportSummary {
  date: string;
  totalRevenue: number;
  totalProfit: number;
  totalTransactions: number;
  averageBasketValue: number;
  paymentMethodStats: Record<PaymentMethod, { count: number; total: number }>;
  hourlyStats: { hour: number; total: number; count: number }[];
  topProducts: { productId: string; name: string; quantity: number; revenue: number }[];
  lowStockItems: Product[];
  expiringItems: Product[];
}
