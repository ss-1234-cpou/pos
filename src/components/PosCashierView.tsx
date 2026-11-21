import React, { useState, useMemo } from 'react';
import { Product, CartItem, ProductCategory, StoreSettings, Transaction } from '../types';
import { CATEGORY_LABELS } from '../data/initialProducts';
import { PaymentModal } from './PaymentModal';
import { WeeklySalesDashboard } from './WeeklySalesDashboard';
import { 
  Search, 
  Barcode, 
  Plus, 
  Minus, 
  Trash2, 
  ShoppingBag, 
  ArrowRight, 
  Snowflake, 
  RotateCcw,
  Sparkles,
  Tag
} from 'lucide-react';

interface PosCashierViewProps {
  products: Product[];
  transactions: Transaction[];
  settings: StoreSettings;
  cashierName: string;
  cart: CartItem[];
  onAddToCart: (product: Product, quantity?: number) => void;
  onUpdateQuantity: (productId: string, delta: number) => void;
  onRemoveFromCart: (productId: string) => void;
  onClearCart: () => void;
  onTransactionComplete: (tx: Transaction) => void;
  onNavigateToScan: () => void;
}

export const PosCashierView: React.FC<PosCashierViewProps> = ({
  products,
  transactions,
  settings,
  cashierName,
  cart,
  onAddToCart,
  onUpdateQuantity,
  onRemoveFromCart,
  onClearCart,
  onTransactionComplete,
  onNavigateToScan,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFreezer, setSelectedFreezer] = useState<string>('all');
  const [discountValue, setDiscountValue] = useState<number>(0);
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [scanMessage, setScanMessage] = useState<string | null>(null);

  const formatRp = (num: number) => 'Rp ' + num.toLocaleString('id-ID');

  // Extract unique freezers
  const uniqueFreezers = useMemo(() => {
    const set = new Set<string>();
    products.forEach(p => {
      if (p.freezerLocation) {
        const shortName = p.freezerLocation.split(' ')[0] || p.freezerLocation;
        set.add(shortName);
      }
    });
    return Array.from(set);
  }, [products]);

  // Filter products
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchesCategory = selectedCategory === 'all' || p.category === selectedCategory;
      const matchesFreezer = selectedFreezer === 'all' || p.freezerLocation.startsWith(selectedFreezer);
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = 
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.barcode.includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        p.freezerLocation.toLowerCase().includes(q);

      return matchesCategory && matchesFreezer && matchesSearch;
    });
  }, [products, selectedCategory, selectedFreezer, searchQuery]);

  // Cart Calculations
  const subtotal = useMemo(() => {
    return cart.reduce((acc, it) => acc + it.subtotal, 0);
  }, [cart]);

  const discountAmount = useMemo(() => {
    if (discountValue <= 0) return 0;
    return Math.min(subtotal, discountValue);
  }, [subtotal, discountValue]);

  const finalAmount = Math.max(0, subtotal - discountAmount);

  // Quick Barcode Scan Simulation
  const handleSimulateScan = () => {
    const available = products.filter(p => p.stock > 0);
    if (available.length === 0) return;
    const randomProduct = available[Math.floor(Math.random() * available.length)];
    onAddToCart(randomProduct);
    setScanMessage(`Scan Barcode Berhasil: ${randomProduct.name}`);
    setTimeout(() => setScanMessage(null), 3000);
  };

  const handlePaymentSuccess = (tx: Transaction) => {
    setIsPaymentOpen(false);
    onClearCart();
    setDiscountValue(0);
    onTransactionComplete(tx);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
      {/* Visual Dashboard: Grafik Batang Omset Penjualan 7 Hari Terakhir (Recharts) */}
      <WeeklySalesDashboard transactions={transactions} />

      {/* Search & Barcode Quick Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 mb-6 bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Cari nama produk frozen, SKU, atau ketik barcode..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-xs rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white transition-all font-medium"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-2.5 text-xs text-slate-400 hover:text-slate-600"
            >
              ✕
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={onNavigateToScan}
            className="py-2 px-3.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs whitespace-nowrap"
          >
            <Barcode className="w-4 h-4" />
            <span>Buka Scanner Barcode</span>
          </button>

          <button
            onClick={handleSimulateScan}
            className="py-2 px-3 bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap"
            title="Simulasi scanner barcode cepat"
          >
            <span>Scan Cepat</span>
          </button>
        </div>
      </div>

      {scanMessage && (
        <div className="mb-4 p-2.5 bg-emerald-50 text-emerald-800 rounded-xl text-xs font-medium border border-emerald-200 flex items-center gap-2 animate-fadeIn">
          <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{scanMessage}</span>
        </div>
      )}

      {/* Main 2-Column POS Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Categories + Product Catalog (8 cols) */}
        <div className="lg:col-span-8 space-y-4">
          {/* Category Tabs & Freezer Filter */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-2.5 rounded-2xl border border-slate-200 shadow-2xs">
            {/* Horizontal Category Tab List */}
            <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
              {Object.entries(CATEGORY_LABELS).map(([catKey, label]) => {
                const isActive = selectedCategory === catKey;
                return (
                  <button
                    key={catKey}
                    onClick={() => setSelectedCategory(catKey)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap shrink-0 transition-all ${
                      isActive
                        ? 'bg-slate-900 text-white font-bold shadow-xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>

            {/* Freezer Selector */}
            <div className="flex items-center gap-1.5 shrink-0 pl-2 sm:border-l border-slate-200">
              <Snowflake className="w-3.5 h-3.5 text-sky-600 shrink-0" />
              <select
                value={selectedFreezer}
                onChange={e => setSelectedFreezer(e.target.value)}
                className="text-xs py-1 px-2 rounded-lg border border-slate-200 bg-slate-50 text-slate-700 font-medium focus:outline-none focus:ring-1 focus:ring-sky-500"
              >
                <option value="all">Semua Freezer</option>
                {uniqueFreezers.map(fr => (
                  <option key={fr} value={fr}>
                    {fr}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Product Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3.5">
            {filteredProducts.map(product => {
              const inCartItem = cart.find(it => it.product.id === product.id);
              const inCartQty = inCartItem?.quantity || 0;

              return (
                <div
                  key={product.id}
                  onClick={() => onAddToCart(product)}
                  className={`group relative bg-white rounded-xl border transition-all duration-150 overflow-hidden flex flex-col ${
                    inCartQty > 0
                      ? 'border-sky-500 ring-2 ring-sky-500/20 shadow-xs cursor-pointer'
                      : 'border-slate-200 hover:border-sky-300 hover:shadow-sm cursor-pointer'
                  }`}
                >
                  {/* Product Image 4:3 */}
                  <div className="relative aspect-4/3 w-full bg-slate-100 overflow-hidden">
                    <img
                      src={product.imageUrl}
                      alt={product.name}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-300"
                      onError={e => {
                        (e.currentTarget as HTMLElement).style.display = 'none';
                      }}
                    />
                    
                    <div className="absolute inset-0 bg-linear-to-tr from-sky-100 to-slate-100 -z-10 flex items-center justify-center text-slate-400">
                      <Snowflake className="w-8 h-8 opacity-40 text-sky-600" />
                    </div>

                    {inCartQty > 0 && (
                      <div className="absolute top-2 right-2 bg-sky-600 text-white font-bold text-xs px-2 py-0.5 rounded-md shadow-xs font-mono-num">
                        {inCartQty} di troli
                      </div>
                    )}
                  </div>

                  {/* Product Details */}
                  <div className="p-3 flex-1 flex flex-col justify-between space-y-2">
                    <div>
                      <div className="flex items-center gap-1.5 text-[10px] text-slate-500 mb-1 truncate">
                        <span>{product.freezerLocation.split(' ')[0]}</span>
                        <span aria-hidden="true">·</span>
                        <span className="text-sky-700 font-medium">{product.temperatureTarget}</span>
                      </div>

                      <h4 className="text-xs font-bold text-slate-900 line-clamp-2 leading-snug">
                        {product.name}
                      </h4>
                    </div>

                    <div className="pt-2 border-t border-slate-100 flex items-end justify-between">
                      <div>
                        <div className="text-[10px] text-slate-400 font-mono-num">
                          {product.unit}
                        </div>
                        <div className="text-sm font-extrabold text-slate-900 font-mono-num">
                          {formatRp(product.sellingPrice)}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={e => {
                          e.stopPropagation();
                          onAddToCart(product);
                        }}
                        className="w-7 h-7 rounded-lg bg-sky-50 text-sky-700 hover:bg-sky-600 hover:text-white flex items-center justify-center transition-all"
                        title="Tambah ke Keranjang"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {filteredProducts.length === 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
              <Snowflake className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <h3 className="font-bold text-slate-700 text-sm">Produk Tidak Ditemukan</h3>
              <p className="text-xs text-slate-500 mt-1">
                Tidak ada produk dengan kata kunci "{searchQuery}".
              </p>
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('all');
                  setSelectedFreezer('all');
                }}
                className="mt-3 text-xs text-sky-600 font-semibold hover:underline"
              >
                Reset Semua Filter
              </button>
            </div>
          )}
        </div>

        {/* Right Column: Register / Cart Panel (4 cols) */}
        <div className="lg:col-span-4 sticky top-6">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
            {/* Cart Header */}
            <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-4 h-4 text-sky-600" />
                <h3 className="font-bold text-xs text-slate-900">
                  Keranjang Kasir ({cart.reduce((a, b) => a + b.quantity, 0)})
                </h3>
              </div>
              {cart.length > 0 && (
                <button
                  onClick={onClearCart}
                  className="text-[11px] text-rose-600 hover:text-rose-700 font-medium flex items-center gap-1 transition-colors"
                >
                  <RotateCcw className="w-3 h-3" />
                  Kosongkan
                </button>
              )}
            </div>

            {/* Cart Items List */}
            <div className="p-4 divide-y divide-slate-100 max-h-[380px] overflow-y-auto space-y-2">
              {cart.length === 0 ? (
                <div className="py-12 text-center text-slate-400">
                  <ShoppingBag className="w-8 h-8 mx-auto mb-2 opacity-30 text-sky-600" />
                  <p className="text-xs font-medium text-slate-600">Keranjang Masih Kosong</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Klik produk di sebelah kiri atau gunakan menu Scan Barkode untuk menambah belanjaan.
                  </p>
                </div>
              ) : (
                cart.map(item => (
                  <div key={item.product.id} className="pt-2 first:pt-0 flex items-center gap-2.5">
                    <div className="w-11 h-11 rounded-lg bg-slate-100 overflow-hidden shrink-0 border border-slate-200">
                      <img
                        src={item.product.imageUrl}
                        alt={item.product.name}
                        className="w-full h-full object-cover"
                      />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-bold text-slate-900 truncate">
                        {item.product.name}
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono-num flex items-center gap-1">
                        <span>{formatRp(item.product.sellingPrice)}</span>
                        <span>·</span>
                        <span className="text-sky-700">{item.product.freezerLocation.split(' ')[0]}</span>
                      </div>
                      <div className="text-xs font-bold text-sky-900 font-mono-num">
                        {formatRp(item.subtotal)}
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => onUpdateQuantity(item.product.id, -1)}
                        className="w-6 h-6 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition-colors"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="w-6 text-center text-xs font-bold font-mono-num text-slate-800">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => onUpdateQuantity(item.product.id, 1)}
                        className="w-6 h-6 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition-colors"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => onRemoveFromCart(item.product.id)}
                        className="w-6 h-6 rounded-md hover:bg-rose-50 text-slate-400 hover:text-rose-600 flex items-center justify-center ml-1 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Calculations & Discount Section */}
            {cart.length > 0 && (
              <div className="p-4 border-t border-slate-100 bg-slate-50 space-y-2 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <label className="text-[11px] font-medium text-slate-600 flex items-center gap-1">
                    <Tag className="w-3 h-3 text-sky-600" />
                    <span>Potongan / Diskon (Rp)</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={discountValue || ''}
                    onChange={e => setDiscountValue(Number(e.target.value) || 0)}
                    className="w-24 px-2 py-1 text-right text-xs rounded-md border border-slate-200 bg-white font-mono-num focus:outline-none focus:ring-1 focus:ring-sky-500"
                  />
                </div>

                <div className="flex justify-between text-slate-600 pt-1">
                  <span>Subtotal</span>
                  <span className="font-mono-num font-semibold">{formatRp(subtotal)}</span>
                </div>

                {discountAmount > 0 && (
                  <div className="flex justify-between text-rose-600 font-semibold">
                    <span>Diskon</span>
                    <span className="font-mono-num">-{formatRp(discountAmount)}</span>
                  </div>
                )}

                <div className="pt-2 border-t border-slate-200 flex justify-between items-center">
                  <span className="font-bold text-slate-800 text-sm">Total Bayar</span>
                  <span className="text-xl font-black text-sky-950 font-mono-num">
                    {formatRp(finalAmount)}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => setIsPaymentOpen(true)}
                  className="w-full mt-3 py-3 px-4 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white rounded-xl font-bold text-xs shadow-xs transition-all flex items-center justify-center gap-2"
                >
                  <span>Bayar Sekarang (F4)</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Payment Processing Modal */}
      <PaymentModal
        isOpen={isPaymentOpen}
        onClose={() => setIsPaymentOpen(false)}
        cartItems={cart}
        subtotal={subtotal}
        discountAmount={discountAmount}
        finalAmount={finalAmount}
        settings={settings}
        cashierName={cashierName}
        onSuccess={handlePaymentSuccess}
      />
    </div>
  );
};
