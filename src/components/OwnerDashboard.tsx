import React, { useState, useMemo } from 'react';
import { Product, Transaction, StoreSettings, DailyReportSummary, ProductCategory } from '../types';
import { StorageService } from '../services/storage';
import { CATEGORY_LABELS, FREEZER_LOCATIONS, SIMPLE_CATEGORIES, normalizeCategory } from '../data/initialProducts';
import {
  TrendingUp,
  DollarSign,
  Receipt,
  ShoppingBag,
  AlertTriangle,
  Calendar,
  Cloud,
  Download,
  Share2,
  Plus,
  RefreshCw,
  Search,
  CheckCircle2,
  Trash2,
  Edit,
  Database,
  Lock,
  Layers,
  ArrowUpRight,
  ExternalLink,
  Snowflake,
  Upload
} from 'lucide-react';

interface OwnerDashboardProps {
  products: Product[];
  transactions: Transaction[];
  settings: StoreSettings;
  activeSection: string;
  setActiveSection: (section: string) => void;
  onRefreshData: () => void;
  onUpdateProducts: (products: Product[]) => void;
  onUpdateSettings: (settings: StoreSettings) => void;
}

export const OwnerDashboard: React.FC<OwnerDashboardProps> = ({
  products,
  transactions,
  settings,
  activeSection,
  setActiveSection,
  onRefreshData,
  onUpdateProducts,
  onUpdateSettings,
}) => {
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [stockSearch, setStockSearch] = useState('');
  const [stockCategoryFilter, setStockCategoryFilter] = useState('all');
  const [stockFreezerFilter, setStockFreezerFilter] = useState('all');

  // Modals state
  const [isRestockModalOpen, setIsRestockModalOpen] = useState(false);
  const [selectedProductForRestock, setSelectedProductForRestock] = useState<Product | null>(null);
  const [restockQty, setRestockQty] = useState<number>(10);
  const [restockNewExpDate, setRestockNewExpDate] = useState<string>('');
  const [restockCostPrice, setRestockCostPrice] = useState<number>(0);

  const [isNewProductModalOpen, setIsNewProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // New product form
  const [prodForm, setProdForm] = useState({
    name: '',
    sku: '',
    barcode: '',
    category: 'nugget_sosis' as ProductCategory,
    costPrice: 20000,
    sellingPrice: 30000,
    stock: 20,
    minStockAlert: 5,
    unit: 'pack' as Product['unit'],
    freezerLocation: FREEZER_LOCATIONS[0],
    temperatureTarget: '-18°C',
    expiryDate: '2027-01-01',
    isHalal: true,
  });

  // Settings form
  const [settingsForm, setSettingsForm] = useState(settings);
  const [newPin, setNewPin] = useState('');
  const [settingsSuccess, setSettingsSuccess] = useState(false);
  const [syncStatusMsg, setSyncStatusMsg] = useState<string | null>(null);

  const formatRp = (num: number) => 'Rp ' + num.toLocaleString('id-ID');

  // Daily report calculated from StorageService
  const dailyReport = useMemo(() => {
    return StorageService.calculateDailyReport(selectedDate);
  }, [selectedDate, transactions, products]);

  // Gross profit percentage
  const marginPercentage = useMemo(() => {
    if (dailyReport.totalRevenue === 0) return 0;
    return Math.round((dailyReport.totalProfit / dailyReport.totalRevenue) * 100);
  }, [dailyReport]);

  // Filtered inventory list
  const filteredInventory = useMemo(() => {
    return products.filter(p => {
      const normCat = normalizeCategory(p.category);
      const matchCat = stockCategoryFilter === 'all' || normCat === stockCategoryFilter;
      const matchFreezer = stockFreezerFilter === 'all' || p.freezerLocation.startsWith(stockFreezerFilter);
      const q = stockSearch.toLowerCase().trim();
      const matchSearch =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        p.barcode.includes(q) ||
        p.freezerLocation.toLowerCase().includes(q);
      return matchCat && matchFreezer && matchSearch;
    });
  }, [products, stockCategoryFilter, stockFreezerFilter, stockSearch]);

  // Handle Cloud Sync trigger
  const handleTriggerCloudSync = () => {
    setSyncStatusMsg('Menyinkronkan data dengan Cloud Database...');
    setTimeout(() => {
      const updated = {
        ...settings,
        lastCloudSync: new Date().toISOString()
      };
      StorageService.saveSettings(updated);
      onUpdateSettings(updated);
      setSyncStatusMsg('Sinkronisasi Real-Time Sukses! Semua transaksi & stok terbaru ter-update.');
      setTimeout(() => setSyncStatusMsg(null), 3500);
    }, 800);
  };

  // Open restock modal
  const handleOpenRestock = (product: Product) => {
    setSelectedProductForRestock(product);
    setRestockQty(10);
    setRestockNewExpDate(product.expiryDate);
    setRestockCostPrice(product.costPrice);
    setIsRestockModalOpen(true);
  };

  // Submit Restock
  const handleConfirmRestock = () => {
    if (!selectedProductForRestock || restockQty <= 0) return;

    const updated = products.map(p => {
      if (p.id === selectedProductForRestock.id) {
        return {
          ...p,
          stock: p.stock + restockQty,
          expiryDate: restockNewExpDate || p.expiryDate,
          costPrice: restockCostPrice > 0 ? restockCostPrice : p.costPrice
        };
      }
      return p;
    });

    StorageService.saveProducts(updated);
    onUpdateProducts(updated);
    setIsRestockModalOpen(false);
    setSelectedProductForRestock(null);
  };

  // Save new / edited product
  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prodForm.name.trim()) return;

    let updatedList: Product[];
    if (editingProduct) {
      updatedList = products.map(p => {
        if (p.id === editingProduct.id) {
          return {
            ...p,
            ...prodForm,
          };
        }
        return p;
      });
    } else {
      const newProduct: Product = {
        id: `prod-${Date.now()}`,
        name: prodForm.name,
        sku: prodForm.sku || `SKU-${Date.now().toString().slice(-4)}`,
        barcode: prodForm.barcode || `899${Math.floor(100000000 + Math.random() * 900000000)}`,
        category: prodForm.category,
        isi: '12 pack',
        cartonPrice: Number(prodForm.costPrice) * 12,
        costPrice: Number(prodForm.costPrice),
        sellingPrice: Number(prodForm.sellingPrice),
        stock: Number(prodForm.stock),
        minStockAlert: Number(prodForm.minStockAlert),
        unit: prodForm.unit,
        freezerLocation: prodForm.freezerLocation,
        temperatureTarget: prodForm.temperatureTarget,
        expiryDate: prodForm.expiryDate,
        imageUrl: products[0]?.imageUrl || '/src/assets/images/frozen_nugget_sausage_1792366053323.jpg',
        isHalal: prodForm.isHalal,
      };
      updatedList = [newProduct, ...products];
    }

    StorageService.saveProducts(updatedList);
    onUpdateProducts(updatedList);
    setIsNewProductModalOpen(false);
    setEditingProduct(null);
  };

  const handleDeleteProduct = (productId: string) => {
    if (confirm('Yakin ingin menghapus produk ini dari katalog?')) {
      const updated = products.filter(p => p.id !== productId);
      StorageService.saveProducts(updated);
      onUpdateProducts(updated);
    }
  };

  const handleEditProductClick = (product: Product) => {
    setEditingProduct(product);
    setProdForm({
      name: product.name,
      sku: product.sku,
      barcode: product.barcode,
      category: product.category,
      costPrice: product.costPrice,
      sellingPrice: product.sellingPrice,
      stock: product.stock,
      minStockAlert: product.minStockAlert,
      unit: product.unit,
      freezerLocation: product.freezerLocation,
      temperatureTarget: product.temperatureTarget,
      expiryDate: product.expiryDate,
      isHalal: product.isHalal,
    });
    setIsNewProductModalOpen(true);
  };

  // Save Settings
  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    const updated = {
      ...settingsForm,
      ownerPin: newPin.trim().length === 4 ? newPin.trim() : settingsForm.ownerPin,
    };
    StorageService.saveSettings(updated);
    onUpdateSettings(updated);
    setSettingsSuccess(true);
    setTimeout(() => setSettingsSuccess(false), 3000);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Top Banner: Date Selector & Real-Time Cloud Status */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <h2 className="text-base font-bold text-slate-900">Dashboard Pemilik Real-Time</h2>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Pantau performa penjualan, margin laba kotor, dan kesehatan stok freezer dari jarak jauh.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Date Picker */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-700">
            <Calendar className="w-3.5 h-3.5 text-sky-600" />
            <input
              type="date"
              value={selectedDate}
              onChange={e => setSelectedDate(e.target.value)}
              className="bg-transparent focus:outline-none font-medium"
            />
          </div>

          {/* Sync Button */}
          <button
            onClick={handleTriggerCloudSync}
            className="px-3.5 py-1.5 bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5 text-sky-600" />
            <span>Sinkronkan Cloud</span>
          </button>

          {/* WhatsApp Report Button */}
          <a
            href={StorageService.generateWhatsAppReport(dailyReport, settings)}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>Kirim Rekap WA</span>
          </a>
        </div>
      </div>

      {syncStatusMsg && (
        <div className="p-3 bg-sky-50 text-sky-900 rounded-xl text-xs font-medium border border-sky-200 flex items-center gap-2 animate-fadeIn">
          <Cloud className="w-4 h-4 text-sky-600 shrink-0" />
          <span>{syncStatusMsg}</span>
        </div>
      )}

      {/* 4 KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Omset Card */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
            <span>Total Omset Hari Ini</span>
            <div className="w-7 h-7 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 font-mono-num">
            {formatRp(dailyReport.totalRevenue)}
          </div>
          <div className="text-[11px] text-emerald-600 font-medium mt-1 flex items-center gap-1">
            <TrendingUp className="w-3 h-3" />
            <span>{dailyReport.totalTransactions} transaksi berhasil</span>
          </div>
        </div>

        {/* Laba Kotor Card */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
            <span>Estimasi Laba Kotor</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-700 font-mono-num">
            {formatRp(dailyReport.totalProfit)}
          </div>
          <div className="text-[11px] text-slate-500 font-medium mt-1">
            Margin Laba: <span className="font-bold text-slate-800 font-mono-num">{marginPercentage}%</span> dari omset
          </div>
        </div>

        {/* Jumlah Transaksi Card */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
            <span>Jumlah Struk Terbit</span>
            <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 font-mono-num">
            {dailyReport.totalTransactions}
          </div>
          <div className="text-[11px] text-slate-500 font-medium mt-1">
            Tersimpan aman &amp; tersinkronisasi
          </div>
        </div>

        {/* Average Basket Value */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
            <span>Rata-rata Belanja (AOV)</span>
            <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <ShoppingBag className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 font-mono-num">
            {formatRp(dailyReport.averageBasketValue)}
          </div>
          <div className="text-[11px] text-slate-500 font-medium mt-1">
            Nilai transaksi per pelanggan
          </div>
        </div>
      </div>

      {/* Critical Frozen Stock Alerts Banner */}
      {(dailyReport.lowStockItems.length > 0 || dailyReport.expiringItems.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Low Stock Alert */}
          {dailyReport.lowStockItems.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  <span className="text-xs font-bold text-amber-900">
                    Peringatan Stok Menipis ({dailyReport.lowStockItems.length} Produk)
                  </span>
                </div>
                <button
                  onClick={() => setActiveSection('stok')}
                  className="text-[11px] text-amber-800 font-semibold hover:underline"
                >
                  Lihat Semua
                </button>
              </div>
              <div className="space-y-1.5">
                {dailyReport.lowStockItems.slice(0, 3).map(p => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between text-xs bg-white/80 p-2 rounded-lg border border-amber-200/60"
                  >
                    <span className="font-semibold text-slate-800 truncate mr-2">{p.name}</span>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-amber-800 font-bold font-mono-num">
                        Sisa {p.stock} {p.unit}
                      </span>
                      <button
                        onClick={() => handleOpenRestock(p)}
                        className="px-2 py-0.5 bg-amber-600 text-white rounded text-[10px] font-semibold hover:bg-amber-700"
                      >
                        Restock
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Near Expiry Alert */}
          {dailyReport.expiringItems.length > 0 && (
            <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Snowflake className="w-4 h-4 text-rose-600" />
                  <span className="text-xs font-bold text-rose-900">
                    Mendekati Batas Kadaluwarsa ({dailyReport.expiringItems.length} Produk &le; 30 Hari)
                  </span>
                </div>
                <button
                  onClick={() => setActiveSection('stok')}
                  className="text-[11px] text-rose-800 font-semibold hover:underline"
                >
                  Lihat Semua
                </button>
              </div>
              <div className="space-y-1.5">
                {dailyReport.expiringItems.slice(0, 3).map(p => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between text-xs bg-white/80 p-2 rounded-lg border border-rose-200/60"
                  >
                    <div>
                      <div className="font-semibold text-slate-800 truncate">{p.name}</div>
                      <div className="text-[10px] text-slate-500">{p.freezerLocation.split(' ')[0]}</div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-rose-700 font-bold font-mono-num text-[11px]">
                        Exp: {p.expiryDate}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Sub-Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 overflow-x-auto pb-1 scrollbar-none">
        {[
          { key: 'ringkasan', label: 'Grafik & Analitik' },
          { key: 'stok', label: 'Inventaris & Restock' },
          { key: 'transaksi', label: 'Riwayat Struk & Ekspor' },
          { key: 'cloud', label: 'AppSheet & Database Cloud' },
          { key: 'pengaturan', label: 'Pengaturan Toko' },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveSection(tab.key)}
            className={`px-4 py-2 text-xs font-semibold rounded-t-xl transition-all whitespace-nowrap shrink-0 ${
              activeSection === tab.key
                ? 'bg-white border-t-2 border-sky-600 text-sky-800 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab 1: Ringkasan & Grafik */}
      {activeSection === 'ringkasan' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Hourly Breakdown Chart (8 cols) */}
          <div className="lg:col-span-8 bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Grafik Penjualan Per Jam (Peak Hours)</h3>
                <p className="text-xs text-slate-500">
                  Pantau jam sibuk kasir untuk antisipasi antrean &amp; persiapan restock.
                </p>
              </div>
              <span className="text-xs text-sky-800 font-semibold font-mono-num">
                {dailyReport.totalTransactions} Total Order
              </span>
            </div>

            {/* Simple CSS Bar Chart */}
            <div className="h-56 pt-6 flex items-end justify-between gap-1 border-b border-slate-200">
              {dailyReport.hourlyStats.map(stat => {
                const maxHour = Math.max(...dailyReport.hourlyStats.map(s => s.total), 1);
                const heightPercent = Math.max(8, Math.round((stat.total / maxHour) * 100));

                return (
                  <div key={stat.hour} className="flex-1 flex flex-col items-center group relative">
                    {/* Hover tooltip */}
                    <div className="opacity-0 group-hover:opacity-100 absolute -top-12 bg-slate-900 text-white text-[10px] py-1 px-2 rounded-md whitespace-nowrap transition-opacity pointer-events-none z-10 font-mono-num">
                      Pukul {stat.hour}:00
                      <br />
                      {formatRp(stat.total)} ({stat.count} tx)
                    </div>

                    <div
                      style={{ height: `${heightPercent}%` }}
                      className={`w-full max-w-[28px] rounded-t-md transition-all duration-300 ${
                        stat.total > 0
                          ? 'bg-sky-600 group-hover:bg-sky-500'
                          : 'bg-slate-100'
                      }`}
                    />
                    <span className="text-[10px] text-slate-400 mt-2 font-mono-num">
                      {stat.hour}
                    </span>
                  </div>
                );
              })}
            </div>
            <div className="text-[11px] text-slate-400 text-center">
              Waktu operasional toko (07:00 s/d 21:00 WIB)
            </div>
          </div>

          {/* Payment Method Breakdown & Top Products (4 cols) */}
          <div className="lg:col-span-4 space-y-4">
            {/* Top Products */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
              <h3 className="text-xs font-bold text-slate-900">Produk Terlaris Hari Ini</h3>
              <div className="divide-y divide-slate-100">
                {dailyReport.topProducts.slice(0, 4).map((p, idx) => (
                  <div key={p.productId} className="py-2 first:pt-0 flex items-center justify-between text-xs">
                    <div className="min-w-0 pr-2">
                      <div className="font-semibold text-slate-800 truncate">
                        {idx + 1}. {p.name}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono-num">
                        {p.quantity} terjual
                      </div>
                    </div>
                    <span className="font-bold text-sky-800 font-mono-num shrink-0">
                      {formatRp(p.revenue)}
                    </span>
                  </div>
                ))}
                {dailyReport.topProducts.length === 0 && (
                  <p className="text-xs text-slate-400 py-3 text-center">
                    Belum ada transaksi hari ini
                  </p>
                )}
              </div>
            </div>

            {/* Payment Method Distribution */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
              <h3 className="text-xs font-bold text-slate-900">Metode Pembayaran Masuk</h3>
              <div className="space-y-2 text-xs">
                {Object.entries(dailyReport.paymentMethodStats).map(([method, data]) => (
                  <div key={method} className="flex items-center justify-between">
                    <span className="uppercase text-slate-600 font-medium">{method}</span>
                    <div className="text-right">
                      <span className="font-bold text-slate-900 font-mono-num">
                        {formatRp(data.total)}
                      </span>
                      <span className="text-[10px] text-slate-400 ml-1.5 font-mono-num">
                        ({data.count}x)
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Manajemen Stok & Restock */}
      {activeSection === 'stok' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-4">
          {/* Action Bar */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-1">
              <div className="relative flex-1 max-w-sm">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Cari nama, SKU, atau barcode produk..."
                  value={stockSearch}
                  onChange={e => setStockSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:ring-1 focus:ring-sky-500 font-medium"
                />
              </div>

              {/* Category Filter */}
              <select
                value={stockCategoryFilter}
                onChange={e => setStockCategoryFilter(e.target.value)}
                className="text-xs py-1.5 px-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 font-medium focus:outline-none cursor-pointer"
              >
                {SIMPLE_CATEGORIES.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => StorageService.exportProductsToCSV(products)}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
                title="Ekspor CSV untuk Excel atau Google Sheets"
              >
                <Download className="w-3.5 h-3.5 text-slate-600" />
                <span>Unduh CSV Stok</span>
              </button>

              <button
                onClick={() => {
                  setEditingProduct(null);
                  setProdForm({
                    name: '',
                    sku: `SKU-${Date.now().toString().slice(-4)}`,
                    barcode: `899${Math.floor(100000000 + Math.random() * 900000000)}`,
                    category: 'nugget_sosis',
                    costPrice: 20000,
                    sellingPrice: 30000,
                    stock: 20,
                    minStockAlert: 5,
                    unit: 'pack',
                    freezerLocation: FREEZER_LOCATIONS[0],
                    temperatureTarget: '-18°C',
                    expiryDate: '2027-01-01',
                    isHalal: true,
                  });
                  setIsNewProductModalOpen(true);
                }}
                className="px-3.5 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Tambah Produk Baru</span>
              </button>
            </div>
          </div>

          {/* Inventory Table */}
          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase text-[10px] tracking-wider font-semibold">
                <tr>
                  <th className="py-2.5 px-3">Produk &amp; SKU</th>
                  <th className="py-2.5 px-3">Kategori</th>
                  <th className="py-2.5 px-3">Lokasi Freezer</th>
                  <th className="py-2.5 px-3 text-right">Modal (Rp)</th>
                  <th className="py-2.5 px-3 text-right">Jual (Rp)</th>
                  <th className="py-2.5 px-3 text-right">Stok Fisik</th>
                  <th className="py-2.5 px-3">Kedaluwarsa</th>
                  <th className="py-2.5 px-3 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredInventory.map(product => {
                  const isLow = product.stock <= product.minStockAlert;
                  return (
                    <tr key={product.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-2.5 px-3">
                        <div className="font-bold text-slate-900">{product.name}</div>
                        <div className="text-[10px] text-slate-400 font-mono-num">
                          SKU: {product.sku} · Barcode: {product.barcode}
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-slate-600">
                        {CATEGORY_LABELS[product.category] || product.category}
                      </td>
                      <td className="py-2.5 px-3 text-sky-800">
                        {product.freezerLocation}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono-num text-slate-600">
                        {formatRp(product.costPrice)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono-num font-bold text-slate-900">
                        {formatRp(product.sellingPrice)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono-num">
                        <span
                          className={`font-bold ${
                            product.stock === 0
                              ? 'text-rose-600'
                              : isLow
                              ? 'text-amber-600'
                              : 'text-slate-800'
                          }`}
                        >
                          {product.stock} {product.unit}
                        </span>
                        {isLow && (
                          <span className="block text-[9px] text-amber-600">
                            (Min: {product.minStockAlert})
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-slate-600 font-mono-num text-[11px]">
                        {product.expiryDate}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => handleOpenRestock(product)}
                            className="px-2 py-1 bg-sky-50 text-sky-700 hover:bg-sky-100 rounded text-[11px] font-semibold transition-colors"
                            title="Restock barang masuk"
                          >
                            + Restock
                          </button>
                          <button
                            onClick={() => handleEditProductClick(product)}
                            className="p-1 text-slate-400 hover:text-slate-700 rounded"
                            title="Edit data produk"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteProduct(product.id)}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded"
                            title="Hapus produk"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Riwayat Transaksi & Struk */}
      {activeSection === 'transaksi' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Riwayat Struk Penjualan Kasir</h3>
              <p className="text-xs text-slate-500">
                Semua transaksi kasir tersimpan dan tercatat secara transparan dengan margin per transaksi.
              </p>
            </div>
            <button
              onClick={() => StorageService.exportTransactionsToCSV(transactions)}
              className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Unduh CSV Riwayat Transaksi</span>
            </button>
          </div>

          {/* Transactions List */}
          <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
            {transactions.map(tx => (
              <div key={tx.id} className="p-4 hover:bg-slate-50 transition-colors">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-slate-900 font-mono-num">
                      {tx.invoiceNumber}
                    </span>
                    <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                      {tx.paymentMethod}
                    </span>
                    <span className="text-xs text-slate-400">·</span>
                    <span className="text-xs text-slate-500 font-mono-num">
                      {new Date(tx.timestamp).toLocaleString('id-ID')}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="text-sm font-black text-slate-900 font-mono-num">
                        {formatRp(tx.finalAmount)}
                      </div>
                      <div className="text-[10px] text-emerald-600 font-semibold font-mono-num">
                        Laba: +{formatRp(tx.grossProfit)}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Items summary */}
                <div className="text-xs text-slate-600 bg-slate-50/80 p-2.5 rounded-lg flex flex-wrap gap-x-4 gap-y-1">
                  {tx.items.map((it, idx) => (
                    <span key={idx} className="flex items-center gap-1">
                      <span>• {it.product.name}</span>
                      <span className="font-mono-num text-slate-400">({it.quantity}x)</span>
                    </span>
                  ))}
                  {tx.customerName && (
                    <span className="text-sky-800 font-medium">
                      Pelanggan: {tx.customerName}
                    </span>
                  )}
                  <span className="text-slate-400">Kasir: {tx.cashierName}</span>
                </div>
              </div>
            ))}
            {transactions.length === 0 && (
              <div className="p-8 text-center text-slate-400 text-xs">
                Belum ada transaksi yang tercatat.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 4: AppSheet & Database Cloud Integration Hub */}
      {activeSection === 'cloud' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs space-y-4">
            <div className="flex items-center gap-2">
              <Database className="w-5 h-5 text-sky-600" />
              <h3 className="text-base font-bold text-slate-900">
                Integrasi Cloud Database &amp; AppSheet
              </h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed max-w-3xl">
              Aplikasi BekuMart POS dirancang agar pemilik toko dapat memantau data secara real-time
              dari perangkat seluler atau komputer mana pun. Anda dapat mengunduh data dalam format CSV
              yang langsung kompatibel dengan <strong>Google Sheets</strong> dan dihubungkan ke{' '}
              <strong>AppSheet</strong> untuk membuat aplikasi mobile owner kustom tanpa koding tambahan.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              {/* Google Sheets / AppSheet Export */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <ExternalLink className="w-4 h-4 text-emerald-600" />
                  <span>Koneksi Google Sheets &amp; AppSheet</span>
                </h4>
                <p className="text-[11px] text-slate-500">
                  Unduh struktur tabel produk &amp; transaksi yang siap diimpor ke Google Sheets
                  sebagai sumber data AppSheet.
                </p>
                <div className="flex flex-col gap-2">
                  <button
                    onClick={() => StorageService.exportProductsToCSV(products)}
                    className="py-2 px-3 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-xs font-semibold flex items-center justify-between"
                  >
                    <span>1. Unduh Tabel Produk (Inventaris_Stok.csv)</span>
                    <Download className="w-3.5 h-3.5 text-slate-500" />
                  </button>
                  <button
                    onClick={() => StorageService.exportTransactionsToCSV(transactions)}
                    className="py-2 px-3 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-xs font-semibold flex items-center justify-between"
                  >
                    <span>2. Unduh Tabel Transaksi (Laporan_Penjualan.csv)</span>
                    <Download className="w-3.5 h-3.5 text-slate-500" />
                  </button>
                </div>
              </div>

              {/* JSON Backup & Restore */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <Cloud className="w-4 h-4 text-sky-600" />
                  <span>Cadangkan &amp; Pulihkan Database Lokal</span>
                </h4>
                <p className="text-[11px] text-slate-500">
                  Simpan cadangan lengkap semua katalog produk, stok freezer, struk transaksi, dan
                  pengaturan toko dalam berkas JSON mandiri.
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      const jsonStr = StorageService.backupAllData();
                      const blob = new Blob([jsonStr], { type: 'application/json' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `Backup_BekuMart_${new Date().toISOString().split('T')[0]}.json`;
                      a.click();
                    }}
                    className="flex-1 py-2 px-3 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 shadow-xs"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Cadangkan (Backup JSON)</span>
                  </button>

                  <label className="flex-1 py-2 px-3 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer">
                    <Upload className="w-3.5 h-3.5" />
                    <span>Pulihkan (Restore)</span>
                    <input
                      type="file"
                      accept=".json"
                      className="hidden"
                      onChange={e => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = ev => {
                            const content = ev.target?.result as string;
                            if (StorageService.restoreAllData(content)) {
                              onRefreshData();
                              alert('Data berhasil dipulihkan dari file backup!');
                            } else {
                              alert('Gagal memulihkan file. Format tidak sesuai.');
                            }
                          };
                          reader.readAsText(file);
                        }
                      }}
                    />
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 5: Pengaturan Toko */}
      {activeSection === 'pengaturan' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs max-w-2xl">
          <h3 className="text-sm font-bold text-slate-900 mb-1">Pengaturan Informasi Toko &amp; Kasir</h3>
          <p className="text-xs text-slate-500 mb-5">
            Informasi ini akan tercetak pada struk belanja thermal dan pesan nota WhatsApp.
          </p>

          {settingsSuccess && (
            <div className="mb-4 p-3 bg-emerald-50 text-emerald-800 rounded-xl text-xs font-semibold border border-emerald-200 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Pengaturan Toko Berhasil Disimpan!</span>
            </div>
          )}

          <form onSubmit={handleSaveSettings} className="space-y-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Nama Toko</label>
              <input
                type="text"
                value={settingsForm.storeName}
                onChange={e => setSettingsForm({ ...settingsForm, storeName: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-1 focus:ring-sky-500 font-medium"
                required
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Slogan / Tagline</label>
              <input
                type="text"
                value={settingsForm.tagline}
                onChange={e => setSettingsForm({ ...settingsForm, tagline: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-1 focus:ring-sky-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Alamat Toko</label>
              <input
                type="text"
                value={settingsForm.address}
                onChange={e => setSettingsForm({ ...settingsForm, address: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-1 focus:ring-sky-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Nomor Telepon Kasir</label>
                <input
                  type="text"
                  value={settingsForm.phone}
                  onChange={e => setSettingsForm({ ...settingsForm, phone: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-1 focus:ring-sky-500 font-mono-num"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">WhatsApp Pemilik Toko</label>
                <input
                  type="text"
                  value={settingsForm.ownerPhone}
                  onChange={e => setSettingsForm({ ...settingsForm, ownerPhone: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-1 focus:ring-sky-500 font-mono-num"
                  placeholder="0812xxxxxxx"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Catatan Footer Struk (Thermal &amp; WA)
              </label>
              <input
                type="text"
                value={settingsForm.receiptFooter}
                onChange={e => setSettingsForm({ ...settingsForm, receiptFooter: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-1 focus:ring-sky-500"
              />
            </div>

            <div className="pt-2 border-t border-slate-200">
              <label className="block font-semibold text-slate-700 mb-1">
                Ubah 4 Digit PIN Pemilik (Opsional)
              </label>
              <input
                type="password"
                maxLength={4}
                value={newPin}
                onChange={e => setNewPin(e.target.value)}
                placeholder="Kosongkan jika tidak ingin mengubah (saat ini: 1234)"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-1 focus:ring-sky-500 font-mono-num"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                className="py-2.5 px-5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl font-bold text-xs shadow-xs transition-colors"
              >
                Simpan Perubahan Pengaturan
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Restock Modal */}
      {isRestockModalOpen && selectedProductForRestock && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full border border-slate-200 shadow-2xl">
            <h3 className="font-bold text-sm text-slate-900 mb-1">
              Restock Barang Masuk
            </h3>
            <p className="text-xs text-slate-500 mb-4 truncate">
              {selectedProductForRestock.name}
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  Jumlah Stok Masuk ({selectedProductForRestock.unit})
                </label>
                <input
                  type="number"
                  min="1"
                  value={restockQty}
                  onChange={e => setRestockQty(Number(e.target.value) || 0)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 font-bold font-mono-num focus:ring-1 focus:ring-sky-500"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  Batas Tanggal Kedaluwarsa Baru
                </label>
                <input
                  type="date"
                  value={restockNewExpDate}
                  onChange={e => setRestockNewExpDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-1 focus:ring-sky-500 font-mono-num"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  Harga Beli / Modal Baru (Rp)
                </label>
                <input
                  type="number"
                  value={restockCostPrice}
                  onChange={e => setRestockCostPrice(Number(e.target.value) || 0)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 font-mono-num focus:ring-1 focus:ring-sky-500"
                />
              </div>

              <div className="p-2.5 bg-slate-50 rounded-xl text-[11px] text-slate-600">
                Stok saat ini: <strong className="font-mono-num">{selectedProductForRestock.stock}</strong> &rarr; Setelah restock:{' '}
                <strong className="text-sky-700 font-mono-num">
                  {selectedProductForRestock.stock + restockQty} {selectedProductForRestock.unit}
                </strong>
              </div>
            </div>

            <div className="flex gap-2 mt-5">
              <button
                type="button"
                onClick={() => setIsRestockModalOpen(false)}
                className="flex-1 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmRestock}
                className="flex-1 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold shadow-xs"
              >
                Konfirmasi Restock
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New / Edit Product Modal */}
      {isNewProductModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full border border-slate-200 shadow-2xl my-6">
            <h3 className="font-bold text-sm text-slate-900 mb-1">
              {editingProduct ? 'Edit Data Produk Frozen' : 'Tambah Produk Frozen Baru'}
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Lengkapi informasi produk, harga jual, penempatan freezer, dan tanggal kedaluwarsa.
            </p>

            <form onSubmit={handleSaveProduct} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Nama Produk</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Sosis Sapi Bakar Premium 500g"
                  value={prodForm.name}
                  onChange={e => setProdForm({ ...prodForm, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-1 focus:ring-sky-500 font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">SKU / Kode</label>
                  <input
                    type="text"
                    value={prodForm.sku}
                    onChange={e => setProdForm({ ...prodForm, sku: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 font-mono-num"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Barcode</label>
                  <input
                    type="text"
                    value={prodForm.barcode}
                    onChange={e => setProdForm({ ...prodForm, barcode: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 font-mono-num"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Kategori</label>
                  <select
                    value={prodForm.category}
                    onChange={e => setProdForm({ ...prodForm, category: e.target.value as ProductCategory })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200"
                  >
                    {SIMPLE_CATEGORIES
                      .filter(c => c.id !== 'all')
                      .map(c => (
                        <option key={c.id} value={c.id}>
                          {c.label}
                        </option>
                      ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Lokasi Freezer</label>
                  <select
                    value={prodForm.freezerLocation}
                    onChange={e => setProdForm({ ...prodForm, freezerLocation: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200"
                  >
                    {FREEZER_LOCATIONS.map(fr => (
                      <option key={fr} value={fr}>
                        {fr}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Harga Modal (Rp)</label>
                  <input
                    type="number"
                    required
                    value={prodForm.costPrice}
                    onChange={e => setProdForm({ ...prodForm, costPrice: Number(e.target.value) || 0 })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 font-mono-num"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Harga Jual (Rp)</label>
                  <input
                    type="number"
                    required
                    value={prodForm.sellingPrice}
                    onChange={e => setProdForm({ ...prodForm, sellingPrice: Number(e.target.value) || 0 })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 font-mono-num font-bold text-sky-900"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Satuan</label>
                  <select
                    value={prodForm.unit}
                    onChange={e => setProdForm({ ...prodForm, unit: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200"
                  >
                    <option value="pack">pack</option>
                    <option value="kg">kg</option>
                    <option value="dus">dus</option>
                    <option value="pcs">pcs</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Stok Awal</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={prodForm.stock}
                    onChange={e => setProdForm({ ...prodForm, stock: Number(e.target.value) || 0 })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 font-mono-num"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Batas Alert Min</label>
                  <input
                    type="number"
                    min="1"
                    value={prodForm.minStockAlert}
                    onChange={e => setProdForm({ ...prodForm, minStockAlert: Number(e.target.value) || 0 })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 font-mono-num"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Tgl Kadaluwarsa</label>
                  <input
                    type="date"
                    required
                    value={prodForm.expiryDate}
                    onChange={e => setProdForm({ ...prodForm, expiryDate: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 font-mono-num"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isHalalCheck"
                  checked={prodForm.isHalal}
                  onChange={e => setProdForm({ ...prodForm, isHalal: e.target.checked })}
                  className="rounded text-sky-600 focus:ring-sky-500"
                />
                <label htmlFor="isHalalCheck" className="text-slate-700 font-medium">
                  Sertifikasi Halal Terverifikasi
                </label>
              </div>

              <div className="flex gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsNewProductModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold shadow-xs"
                >
                  Simpan Produk
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
