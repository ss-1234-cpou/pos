import React, { useState, useRef } from 'react';
import { Product, CartItem } from '../types';
import { 
  ScanLine, 
  Barcode, 
  ShoppingBag, 
  CheckCircle2, 
  AlertCircle, 
  Plus, 
  Minus, 
  ArrowRight,
  Trash2,
  RotateCcw,
  Camera
} from 'lucide-react';

interface BarcodeScannerViewProps {
  products: Product[];
  cart: CartItem[];
  onAddToCart: (product: Product, quantity?: number) => void;
  onUpdateQuantity: (productId: string, delta: number) => void;
  onRemoveFromCart: (productId: string) => void;
  onClearCart: () => void;
  onOpenPaymentModal: () => void;
  onQuickCheckout: (product: Product, quantity?: number) => void;
}

export const BarcodeScannerView: React.FC<BarcodeScannerViewProps> = ({
  products,
  cart,
  onAddToCart,
  onUpdateQuantity,
  onRemoveFromCart,
  onClearCart,
  onOpenPaymentModal,
  onQuickCheckout,
}) => {
  const [barcodeInput, setBarcodeInput] = useState('');
  const [scannedProduct, setScannedProduct] = useState<Product | null>(null);
  const [scanQty, setScanQty] = useState(1);
  const [recentScans, setRecentScans] = useState<{ product: Product; time: string; qty: number }[]>([]);
  const [scanFeedback, setScanFeedback] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const formatRp = (num: number) => 'Rp ' + num.toLocaleString('id-ID');

  const cartSubtotal = cart.reduce((acc, it) => acc + it.subtotal, 0);
  const cartTotalQty = cart.reduce((acc, it) => acc + it.quantity, 0);

  // Play scanner beep using Web Audio API
  const playScanBeep = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1800, audioCtx.currentTime);
      gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.12);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.12);
    } catch {
      // Audio fallback
    }
  };

  const handleScanCode = (code: string) => {
    const cleanCode = code.trim();
    if (!cleanCode) return;

    const found = products.find(
      p => p.barcode === cleanCode || p.sku.toLowerCase() === cleanCode.toLowerCase()
    );

    if (found) {
      playScanBeep();
      setScannedProduct(found);
      setScanQty(1);
      setScanFeedback(`Berhasil mendeteksi: ${found.name}`);
      setRecentScans(prev => [
        { product: found, time: new Date().toLocaleTimeString('id-ID'), qty: 1 },
        ...prev.slice(0, 6),
      ]);
      setBarcodeInput('');
    } else {
      setScanFeedback(`Barcode "${cleanCode}" tidak terdaftar di katalog toko.`);
    }

    setTimeout(() => setScanFeedback(null), 3500);
  };

  const handleAddCurrentToCart = () => {
    if (!scannedProduct) return;
    onAddToCart(scannedProduct, scanQty);
    setScanFeedback(`+${scanQty} ${scannedProduct.name} dimasukkan ke daftar belanja kasir!`);
    setTimeout(() => {
      setScanFeedback(null);
    }, 2500);
  };

  const handleInstantCheckout = () => {
    if (!scannedProduct) return;
    onQuickCheckout(scannedProduct, scanQty);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <ScanLine className="w-5 h-5 text-sky-600" />
            <h2 className="text-lg font-bold text-slate-900">Scan Barkode &amp; Kasir Transaksi</h2>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Pindai barcode pada kemasan makanan beku atau masukkan kode manual untuk transaksi kilat.
          </p>
        </div>

        {cart.length > 0 && (
          <button
            onClick={onOpenPaymentModal}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition-colors shadow-xs"
          >
            <ShoppingBag className="w-4 h-4" />
            <span>Bayar Keranjang ({cartTotalQty} item - {formatRp(cartSubtotal)})</span>
          </button>
        )}
      </div>

      {scanFeedback && (
        <div
          className={`p-3 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all ${
            scanFeedback.includes('tidak terdaftar')
              ? 'bg-rose-50 text-rose-800 border border-rose-200'
              : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
          }`}
        >
          {scanFeedback.includes('tidak terdaftar') ? (
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
          ) : (
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
          )}
          <span>{scanFeedback}</span>
        </div>
      )}

      {/* Main 2-Column Scanner Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Visual Scanner Viewfinder & Manual Input (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          {/* Animated Scanner Camera Box */}
          <div className="relative bg-slate-950 rounded-2xl p-6 overflow-hidden border border-slate-800 shadow-md text-center">
            <div className="absolute top-4 left-4 w-6 h-6 border-t-2 border-l-2 border-sky-400" />
            <div className="absolute top-4 right-4 w-6 h-6 border-t-2 border-r-2 border-sky-400" />
            <div className="absolute bottom-4 left-4 w-6 h-6 border-b-2 border-l-2 border-sky-400" />
            <div className="absolute bottom-4 right-4 w-6 h-6 border-b-2 border-r-2 border-sky-400" />

            <div className="absolute inset-x-8 top-1/2 h-0.5 bg-rose-500 shadow-[0_0_12px_#f43f5e] animate-pulse" />

            <div className="py-8 flex flex-col items-center justify-center space-y-3">
              <div className="w-14 h-14 rounded-full bg-slate-800/80 border border-slate-700 flex items-center justify-center text-sky-400">
                <Camera className="w-7 h-7 opacity-80" />
              </div>
              <p className="text-xs text-slate-300 font-medium max-w-xs">
                Arahkan barcode produk tepat ke garis sensor laser
              </p>
              <div className="text-[10px] text-slate-400 bg-slate-900 px-3 py-1 rounded-full border border-slate-800 font-mono-num">
                Sensor Standar 1D / EAN-13 Ready
              </div>
            </div>
          </div>

          {/* Manual Input Form */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
            <label className="block text-xs font-bold text-slate-800">
              Input Barcode / SKU Manual
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Barcode className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  ref={inputRef}
                  type="text"
                  placeholder="Ketik barcode (contoh: 899100100101)..."
                  value={barcodeInput}
                  onChange={e => setBarcodeInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      handleScanCode(barcodeInput);
                    }
                  }}
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-sky-500 font-mono-num"
                />
              </div>
              <button
                type="button"
                onClick={() => handleScanCode(barcodeInput)}
                className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold transition-colors shadow-xs"
              >
                Scan
              </button>
            </div>

            <div className="pt-2">
              <span className="text-[10px] text-slate-400 block mb-1.5 font-medium">
                Coba Cepat Barcode Sampel Toko:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {products.slice(0, 5).map(p => (
                  <button
                    key={p.id}
                    onClick={() => handleScanCode(p.barcode)}
                    className="px-2.5 py-1 bg-slate-100 hover:bg-sky-50 hover:text-sky-700 hover:border-sky-300 border border-slate-200 rounded-lg text-[10px] font-mono-num transition-all"
                  >
                    {p.name.split(' ')[0]} ({p.barcode})
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Scanned Product Preview & Active Cart (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          {/* Scanned Result Card */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-900">Hasil Pemindaian Produk</h3>
              {scannedProduct && (
                <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded">
                  Terdeteksi
                </span>
              )}
            </div>

            {scannedProduct ? (
              <div className="p-5 space-y-4">
                <div className="flex gap-3">
                  <div className="w-16 h-16 rounded-xl bg-slate-100 overflow-hidden shrink-0 border border-slate-200">
                    <img
                      src={scannedProduct.imageUrl}
                      alt={scannedProduct.name}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="text-[10px] text-slate-400 font-mono-num">
                      Barcode: {scannedProduct.barcode}
                    </div>
                    <h4 className="text-xs font-bold text-slate-900 leading-snug">
                      {scannedProduct.name}
                    </h4>
                    <div className="text-[11px] text-sky-800 font-medium">
                      {scannedProduct.freezerLocation.split(' ')[0]}
                    </div>
                    <div className="text-sm font-extrabold text-slate-900 font-mono-num mt-0.5">
                      {formatRp(scannedProduct.sellingPrice)}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-xs font-semibold text-slate-700">Kuantitas:</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setScanQty(Math.max(1, scanQty - 1))}
                      className="w-6 h-6 rounded-md bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-700"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="w-6 text-center font-bold font-mono-num text-xs text-slate-900">
                      {scanQty}
                    </span>
                    <button
                      onClick={() => setScanQty(scanQty + 1)}
                      className="w-6 h-6 rounded-md bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-700"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    onClick={handleAddCurrentToCart}
                    className="py-2.5 px-3 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5 shadow-xs"
                  >
                    <ShoppingBag className="w-3.5 h-3.5" />
                    <span>+ Masukkan</span>
                  </button>

                  <button
                    onClick={handleInstantCheckout}
                    className="py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5 shadow-xs"
                  >
                    <span>Bayar Langsung</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-6 text-center text-slate-400">
                <Barcode className="w-8 h-8 mx-auto mb-2 opacity-30 text-sky-600" />
                <p className="text-xs font-medium text-slate-700">Belum Ada Produk Ter-scan</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Scan barcode kemasan atau klik sampel di samping.
                </p>
              </div>
            )}
          </div>

          {/* Active Cart in Scanner View */}
          {cart.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShoppingBag className="w-4 h-4 text-sky-600" />
                  <h4 className="text-xs font-bold text-slate-900">
                    Daftar Belanja Kasir ({cartTotalQty})
                  </h4>
                </div>
                <button
                  onClick={onClearCart}
                  className="text-[10px] text-rose-600 hover:text-rose-700 font-medium flex items-center gap-1"
                >
                  <RotateCcw className="w-3 h-3" />
                  Kosongkan
                </button>
              </div>

              <div className="p-3 divide-y divide-slate-100 max-h-48 overflow-y-auto space-y-1.5 text-xs">
                {cart.map(item => (
                  <div key={item.product.id} className="pt-1.5 first:pt-0 flex items-center justify-between">
                    <div className="min-w-0 pr-2">
                      <div className="font-semibold text-slate-800 truncate">{item.product.name}</div>
                      <div className="text-[10px] text-slate-400 font-mono-num">
                        {item.quantity} x {formatRp(item.product.sellingPrice)} = {formatRp(item.subtotal)}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => onUpdateQuantity(item.product.id, -1)}
                        className="w-5 h-5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center"
                      >
                        <Minus className="w-2.5 h-2.5" />
                      </button>
                      <span className="w-5 text-center font-bold font-mono-num text-xs">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => onUpdateQuantity(item.product.id, 1)}
                        className="w-5 h-5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center"
                      >
                        <Plus className="w-2.5 h-2.5" />
                      </button>
                      <button
                        onClick={() => onRemoveFromCart(item.product.id)}
                        className="p-1 text-slate-400 hover:text-rose-600 ml-1"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-3 bg-slate-50 border-t border-slate-100 space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-600 font-medium">Total Tagihan:</span>
                  <span className="text-base font-black text-slate-900 font-mono-num">
                    {formatRp(cartSubtotal)}
                  </span>
                </div>

                <button
                  onClick={onOpenPaymentModal}
                  className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-xs transition-colors"
                >
                  <span>Proses Pembayaran ({cartTotalQty} item)</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
