import React, { useState, useRef, useMemo, useEffect } from 'react';
import { Product, CartItem, PaymentMethod, StoreSettings, Transaction } from '../types';
import { StorageService } from '../services/storage';
import { 
  CreditCard, 
  Barcode, 
  Banknote, 
  QrCode, 
  Building2, 
  Printer, 
  ReceiptText,
  Check, 
  RotateCcw,
  Plus,
  Minus,
  Trash2,
  Copy,
  CheckCircle2,
  Sparkles,
  Zap,
  Mic,
  MicOff,
  Volume2,
  ShoppingBag,
  Pencil,
  Tag,
  Keyboard,
  HelpCircle,
  X,
  Camera
} from 'lucide-react';
import { ProductCatalogModal } from './ProductCatalogModal';
import { CameraBarcodeScannerModal } from './CameraBarcodeScannerModal';

interface FastPaymentViewProps {
  products: Product[];
  settings: StoreSettings;
  cashierName: string;
  cart: CartItem[];
  onAddToCart: (product: Product, quantity?: number) => void;
  onUpdateQuantity: (productId: string, delta: number) => void;
  onSetItemQuantity?: (productId: string, quantity: number) => void;
  onSetItemPrice?: (productId: string, price: number) => void;
  onSetItemUnit?: (productId: string, unit: string) => void;
  onSetItemNote?: (productId: string, note: string) => void;
  onRemoveFromCart: (productId: string) => void;
  onClearCart: () => void;
  onTransactionComplete: (tx: Transaction) => void;
}

export const FastPaymentView: React.FC<FastPaymentViewProps> = ({
  products,
  settings,
  cashierName,
  cart,
  onAddToCart,
  onUpdateQuantity,
  onSetItemQuantity,
  onSetItemPrice,
  onSetItemUnit,
  onSetItemNote,
  onRemoveFromCart,
  onClearCart,
  onTransactionComplete,
}) => {
  const enabledMethods: PaymentMethod[] = settings.enabledPaymentMethods && settings.enabledPaymentMethods.length > 0 
    ? settings.enabledPaymentMethods 
    : ['cash', 'qris', 'transfer', 'debit'];

  const initialMethod = (settings.defaultPaymentMethod && enabledMethods.includes(settings.defaultPaymentMethod))
    ? settings.defaultPaymentMethod
    : enabledMethods[0] || 'cash';

  const [barcodeInput, setBarcodeInput] = useState('');
  const [method, setMethod] = useState<PaymentMethod>(initialMethod);
  const [cashGiven, setCashGiven] = useState<number>(0);
  const [manualAmount, setManualAmount] = useState<number>(0);
  const [copiedBank, setCopiedBank] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);

  // Manual Product Catalog Modal State
  const [isCatalogOpen, setIsCatalogOpen] = useState(false);
  // Shortcuts Help Modal State
  const [isShortcutsHelpOpen, setIsShortcutsHelpOpen] = useState(false);
  // Camera Barcode Scanner Modal State
  const [isCameraScannerOpen, setIsCameraScannerOpen] = useState(false);

  // Custom Item Price Editing State
  const [editingPriceItemId, setEditingPriceItemId] = useState<string | null>(null);
  const [editingPriceInput, setEditingPriceInput] = useState<string>('');

  const saveCustomPrice = (productId: string) => {
    const cleanNum = parseInt(editingPriceInput.replace(/\D/g, ''), 10);
    if (!isNaN(cleanNum) && cleanNum >= 0 && onSetItemPrice) {
      onSetItemPrice(productId, cleanNum);
      setNotification('Harga satuan khusus diperbarui');
      setTimeout(() => setNotification(null), 1500);
    }
    setEditingPriceItemId(null);
  };

  // Sync method if default or enabled methods change
  useEffect(() => {
    if (!enabledMethods.includes(method)) {
      setMethod(enabledMethods[0] || 'cash');
    }
  }, [settings.enabledPaymentMethods, settings.defaultPaymentMethod]);

  // Voice Search / Input State
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  const barcodeInputRef = useRef<HTMLInputElement>(null);

  const formatRp = (num: number) => 'Rp ' + num.toLocaleString('id-ID');

  // Voice command handler (Bahasa Indonesia)
  const handleVoiceCommand = (transcript: string) => {
    const clean = transcript.toLowerCase().trim();

    // Pattern 1: "tambah (nama) harga (nominal)" misal "tambah es batu harga 5000"
    const priceMatch = clean.match(/(?:tambah\s+)?(.+?)\s+(?:se)?harga\s+(\d+(?:\.\d+)?|\d+rb|\d+k)/i);
    if (priceMatch) {
      const rawName = priceMatch[1].trim();
      let priceStr = priceMatch[2].replace(/\./g, '').toLowerCase();
      if (priceStr.endsWith('rb') || priceStr.endsWith('k')) {
        priceStr = priceStr.replace(/(rb|k)/, '000');
      }
      const nominal = parseInt(priceStr) || 0;
      if (nominal > 0) {
        const productMatch = products.find(p => p.name.toLowerCase().includes(rawName));
        if (productMatch) {
          onAddToCart(productMatch, 1);
          playBeep();
          setNotification(`+1 ${productMatch.name} (Suara: ${formatRp(nominal)})`);
        } else {
          const customProduct: Product = {
            id: `voice-${Date.now()}`,
            name: rawName.charAt(0).toUpperCase() + rawName.slice(1),
            sku: 'SUARA',
            barcode: '000000',
            category: 'bumbu_saus',
            isi: '1 pack',
            costPrice: Math.round(nominal * 0.75),
            cartonPrice: nominal,
            sellingPrice: nominal,
            stock: 999,
            minStockAlert: 1,
            unit: 'pack',
            freezerLocation: 'Kasir',
            temperatureTarget: 'Suhu Ruang',
            expiryDate: new Date().toISOString().split('T')[0],
            imageUrl: '',
            isHalal: true,
          };
          onAddToCart(customProduct, 1);
          playBeep();
          setNotification(`+1 ${customProduct.name} (${formatRp(nominal)})`);
        }
        setTimeout(() => setNotification(null), 2500);
        return;
      }
    }

    // Pattern 2: "tambah (nama) sebanyak (jumlah)" misal "tambah sosis sapi sebanyak 2"
    const qtyMatch = clean.match(/(?:tambah\s+)?(.+?)\s+(?:sebanyak\s+|sejumlah\s+)?(\d+)(?:\s*(?:pcs|pack|buah|dus|biji|item))?$/i);
    if (qtyMatch) {
      const rawName = qtyMatch[1].trim();
      const qty = parseInt(qtyMatch[2]) || 1;
      const productMatch = products.find(
        p => p.name.toLowerCase().includes(rawName) || rawName.includes(p.name.toLowerCase().split(' ')[0])
      );
      if (productMatch) {
        onAddToCart(productMatch, qty);
        playBeep();
        setNotification(`+${qty} ${productMatch.name} (Suara)`);
        setTimeout(() => setNotification(null), 2500);
        return;
      }
    }

    // Pattern 3: direct item name or "tambah [nama]"
    let directName = clean.replace(/^tambah\s+/, '').trim();
    const directMatch = products.find(
      p =>
        p.name.toLowerCase().includes(directName) ||
        directName.includes(p.name.toLowerCase()) ||
        p.name
          .toLowerCase()
          .split(' ')
          .some(w => w.length > 3 && directName.includes(w))
    );

    if (directMatch) {
      onAddToCart(directMatch, 1);
      playBeep();
      setNotification(`+1 ${directMatch.name} (Suara)`);
      setTimeout(() => setNotification(null), 2500);
      return;
    }

    setNotification(`Perintah suara "${transcript}" tidak cocok`);
    setTimeout(() => setNotification(null), 3000);
  };

  const startListening = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Browser Anda belum mendukung Web Speech Recognition. Gunakan Google Chrome atau Microsoft Edge.');
      return;
    }

    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'id-ID';
      recognition.continuous = false;
      recognition.interimResults = false;

      recognition.onstart = () => {
        setIsListening(true);
        setNotification('Mendengarkan suara kasir... Silakan ucapkan barang/jumlah.');
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setIsListening(false);
        handleVoiceCommand(transcript);
      };

      recognition.onerror = (event: any) => {
        setIsListening(false);
        if (event.error !== 'no-speech') {
          setNotification(`Gagal mengenali suara: ${event.error}`);
          setTimeout(() => setNotification(null), 2500);
        }
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err: any) {
      setIsListening(false);
      console.error(err);
    }
  };

  // Audio feedback
  const playBeep = () => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1750, ctx.currentTime);
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.08);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.08);
    } catch {}
  };

  const playSuccessChime = () => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const now = ctx.currentTime;
      [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.1, now + i * 0.05);
        gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.05 + 0.12);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + i * 0.05);
        osc.stop(now + i * 0.05 + 0.12);
      });
    } catch {}
  };

  // Auto-focus barcode input on load
  useEffect(() => {
    barcodeInputRef.current?.focus();
  }, []);

  // Calculate totals
  const cartSubtotal = useMemo(() => {
    return cart.reduce((acc, it) => acc + it.subtotal, 0);
  }, [cart]);

  const finalAmount = cart.length > 0 ? cartSubtotal : manualAmount;
  const totalItemsCount = cart.reduce((acc, it) => acc + it.quantity, 0);

  // Cash change logic
  const effectiveCashGiven = cashGiven > 0 ? cashGiven : (method === 'cash' ? finalAmount : finalAmount);
  const changeAmount = Math.max(0, effectiveCashGiven - finalAmount);
  const isCashInsufficient = method === 'cash' && effectiveCashGiven < finalAmount && finalAmount > 0;

  // Barcode / SKU scan submit
  const handleBarcodeSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const query = barcodeInput.trim();
    if (!query) return;

    const match = products.find(
      p => p.barcode === query || p.sku.toLowerCase() === query.toLowerCase() || p.name.toLowerCase().includes(query.toLowerCase())
    );

    if (match) {
      playBeep();
      onAddToCart(match, 1);
      setManualAmount(0);
      setNotification(`+1 ${match.name}`);
      setBarcodeInput('');
    } else {
      setNotification(`Produk "${query}" tidak ditemukan`);
    }

    setTimeout(() => setNotification(null), 1800);
    barcodeInputRef.current?.focus();
  };

  const handleQuickAdd = (p: Product) => {
    playBeep();
    onAddToCart(p, 1);
    setManualAmount(0);
    setNotification(`+1 ${p.name}`);
    setTimeout(() => setNotification(null), 1500);
  };

  const handleCopyAccount = () => {
    navigator.clipboard.writeText('88301928331');
    setCopiedBank(true);
    setTimeout(() => setCopiedBank(false), 2000);
  };

  // Langsung ke Cetak Struk & Pembayaran
  const handleProcessPayment = () => {
    if (finalAmount <= 0) return;
    if (method === 'cash' && effectiveCashGiven < finalAmount) return;

    playSuccessChime();

    const todayStr = new Date().toISOString().split('T')[0].replace(/-/g, '');
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const invoiceNumber = `INV/${todayStr}/${randomSuffix}`;

    let transactionItems: CartItem[] = cart;
    if (cart.length === 0 && manualAmount > 0) {
      transactionItems = [
        {
          product: {
            id: 'manual-item',
            name: 'Belanja Kasir Umum',
            sku: 'KASIR',
            barcode: '000000',
            category: 'frozen_lainnya',
            isi: '1 pack',
            cartonPrice: manualAmount,
            costPrice: Math.round(manualAmount * 0.75),
            sellingPrice: manualAmount,
            stock: 999,
            minStockAlert: 1,
            unit: 'pack',
            freezerLocation: 'Kasir',
            temperatureTarget: '-18°C',
            expiryDate: new Date().toISOString().split('T')[0],
            isHalal: true,
            imageUrl: products[0]?.imageUrl || '',
          },
          quantity: 1,
          discountPercent: 0,
          subtotal: manualAmount,
        },
      ];
    }

    const totalCost = transactionItems.reduce((acc, it) => acc + (it.product.costPrice * it.quantity), 0);
    const grossProfit = finalAmount - totalCost;

    const newTx: Transaction = {
      id: `tx-${Date.now()}`,
      invoiceNumber,
      timestamp: new Date().toISOString(),
      items: transactionItems,
      totalItemsCount: transactionItems.reduce((acc, it) => acc + it.quantity, 0),
      subtotal: finalAmount,
      discountAmount: 0,
      taxAmount: 0,
      finalAmount,
      totalCost,
      grossProfit,
      paymentMethod: method,
      cashGiven: method === 'cash' ? effectiveCashGiven : finalAmount,
      changeAmount: method === 'cash' ? changeAmount : 0,
      cashierName: settings.activeCashierName || cashierName,
      syncedToCloud: true,
    };

    StorageService.saveTransaction(newTx);
    onClearCart();
    setManualAmount(0);
    setCashGiven(0);

    // Langsung trigger print dan buka nota
    try {
      window.print();
    } catch {}

    onTransactionComplete(newTx);
  };

  // Keyboard Shortcuts (F1: Bayar, F2: Hapus Keranjang, F3: Katalog, F4: Scan Barcode, ?: Bantuan, Esc: Tutup)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // F1: Bayar & Cetak Struk
      if (e.key === 'F1') {
        e.preventDefault();
        if (finalAmount > 0 && !isCashInsufficient) {
          handleProcessPayment();
        } else if (finalAmount > 0 && isCashInsufficient) {
          setNotification('Uang tunai yang diterima masih kurang!');
          setTimeout(() => setNotification(null), 2000);
        } else {
          setNotification('Keranjang belanja masih kosong!');
          setTimeout(() => setNotification(null), 1500);
        }
      }
      // F2: Hapus / Kosongkan Keranjang
      else if (e.key === 'F2') {
        e.preventDefault();
        if (cart.length > 0) {
          if (window.confirm('Kosongkan semua barang di keranjang belanja? [F2]')) {
            onClearCart();
            setNotification('Keranjang belanja telah dikosongkan [F2]');
            setTimeout(() => setNotification(null), 1500);
          }
        } else {
          setNotification('Keranjang belanja sudah kosong');
          setTimeout(() => setNotification(null), 1200);
        }
      }
      // F3: Buka / Tutup Katalog Produk Manual
      else if (e.key === 'F3') {
        e.preventDefault();
        setIsCatalogOpen(prev => !prev);
      }
      // F4: Fokus ke Scan Barcode / Input Barcode
      else if (e.key === 'F4') {
        e.preventDefault();
        barcodeInputRef.current?.focus();
        barcodeInputRef.current?.select();
      }
      // F5: Buka / Tutup Pemindai Barcode Kamera
      else if (e.key === 'F5') {
        e.preventDefault();
        setIsCameraScannerOpen(prev => !prev);
      }
      // ? : Buka / Tutup Bantuan Pintasan Keyboard
      else if (e.key === '?' || (e.key === '/' && e.shiftKey)) {
        const activeEl = document.activeElement;
        const isInput = activeEl?.tagName === 'INPUT' || activeEl?.tagName === 'TEXTAREA';
        if (!isInput) {
          e.preventDefault();
          setIsShortcutsHelpOpen(prev => !prev);
        }
      }
      // Escape : Tutup Modal Bantuan, Kamera, atau Katalog
      else if (e.key === 'Escape') {
        if (isCameraScannerOpen) {
          e.preventDefault();
          setIsCameraScannerOpen(false);
        } else if (isShortcutsHelpOpen) {
          e.preventDefault();
          setIsShortcutsHelpOpen(false);
        } else if (isCatalogOpen) {
          e.preventDefault();
          setIsCatalogOpen(false);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [finalAmount, isCashInsufficient, effectiveCashGiven, changeAmount, cart, onClearCart, isShortcutsHelpOpen, isCatalogOpen, isCameraScannerOpen]);

  // Smart suggestions for cash
  const smartCashSuggestions = useMemo(() => {
    if (finalAmount <= 0) return [50000, 100000];
    const options: number[] = [];
    const next10k = Math.ceil(finalAmount / 10000) * 10000;
    if (next10k > finalAmount) options.push(next10k);
    const next50k = Math.ceil(finalAmount / 50000) * 50000;
    if (next50k > finalAmount && !options.includes(next50k)) options.push(next50k);
    const next100k = Math.ceil(finalAmount / 100000) * 100000;
    if (next100k > finalAmount && !options.includes(next100k)) options.push(next100k);
    if (!options.includes(50000) && finalAmount < 50000) options.push(50000);
    if (!options.includes(100000) && finalAmount < 100000) options.push(100000);
    if (!options.includes(200000) && finalAmount < 200000) options.push(200000);
    return options.slice(0, 3);
  }, [finalAmount]);

  return (
    <div className="max-w-7xl mx-auto px-4 py-2.5 h-[calc(100vh-4.75rem)] flex flex-col gap-2 overflow-hidden">
      
      {/* 1. TOP BAR: BARCODE QUICK SCAN, KATALOG MANUAL, SUARA & TOMBOL BANTUAN PINTASAN '?' */}
      <div className="bg-white px-3.5 py-2 rounded-2xl border border-stone-200/90 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 shrink-0">
        <div className="flex items-center gap-2 flex-1 min-w-[280px]">
          {/* Barcode / SKU Scan Input */}
          <form onSubmit={handleBarcodeSubmit} className="relative flex-1">
            <Barcode className="w-4 h-4 text-orange-600 absolute left-3 top-2.5" />
            <input
              ref={barcodeInputRef}
              type="text"
              placeholder="Scan barcode / ketik SKU (Tekan F4)..."
              value={barcodeInput}
              onChange={e => setBarcodeInput(e.target.value)}
              className="w-full pl-9 pr-22 py-1.5 text-xs font-mono-num font-semibold rounded-xl border border-stone-200 bg-stone-50/70 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 shadow-inner text-stone-900 placeholder:text-stone-400"
            />
            <div className="absolute right-1 top-1 flex items-center gap-1">
              <span className="hidden md:inline-block text-[10px] font-mono font-bold text-stone-400 bg-stone-200/60 px-1 py-0.5 rounded border border-stone-300/60" title="Pintasan F4 untuk fokus barcode">
                F4
              </span>
              <button
                type="submit"
                className="px-2.5 py-1 bg-orange-600 hover:bg-orange-500 text-white rounded-lg text-[11px] font-bold transition-all shadow-xs cursor-pointer active:scale-95"
              >
                Scan
              </button>
            </div>
          </form>

          {/* Tombol Pemindai Barcode Kamera F5 */}
          <button
            type="button"
            onClick={() => setIsCameraScannerOpen(true)}
            title="Scan Barcode Menggunakan Kamera Perangkat (F5)"
            className="px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer bg-orange-600 hover:bg-orange-500 text-white shrink-0 active:scale-95 border border-orange-500"
          >
            <Camera className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Kamera Scan</span>
            <kbd className="hidden md:inline-block text-[10px] bg-orange-700 text-orange-200 px-1 rounded font-mono font-bold border border-orange-600">F5</kbd>
          </button>

          {/* Tombol Katalog Manual F3 */}
          <button
            type="button"
            onClick={() => setIsCatalogOpen(true)}
            title="Buka Katalog & Pencarian Produk Manual (F3)"
            className="px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer bg-stone-900 hover:bg-stone-800 text-white shrink-0 active:scale-95 border border-stone-800"
          >
            <ShoppingBag className="w-3.5 h-3.5 text-orange-400" />
            <span>Katalog</span>
            <kbd className="hidden sm:inline-block text-[10px] bg-stone-800 text-orange-300 px-1 rounded font-mono font-bold border border-stone-700">F3</kbd>
          </button>

          {/* Tombol Suara */}
          {settings.enableVoiceSearch !== false && (
            <button
              type="button"
              onClick={startListening}
              title={isListening ? 'Klik untuk berhenti mendengar' : 'Telusuri dengan Suara (Contoh: "tambah sosis sapi 2")'}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer shrink-0 border ${
                isListening
                  ? 'bg-orange-500 hover:bg-orange-400 text-white border-orange-400 ring-2 ring-orange-300 animate-pulse'
                  : 'bg-stone-100 hover:bg-stone-200 text-stone-800 border-stone-200 active:scale-95'
              }`}
            >
              {isListening ? <MicOff className="w-3.5 h-3.5 text-white" /> : <Mic className="w-3.5 h-3.5 text-orange-600" />}
              <span className="hidden sm:inline">{isListening ? 'Mendengar...' : 'Suara'}</span>
            </button>
          )}
        </div>

        {/* Right Action: Tombol '?' Bantuan Pintasan */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setIsShortcutsHelpOpen(true)}
            title="Buka Daftar Pintasan Keyboard (?)"
            className="px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-2xs cursor-pointer bg-amber-50 hover:bg-amber-100/80 text-amber-900 border border-amber-200/90 active:scale-95"
          >
            <HelpCircle className="w-3.5 h-3.5 text-amber-600" />
            <span className="hidden sm:inline">Bantuan Pintasan</span>
            <span className="w-5 h-5 rounded-md bg-white border border-amber-300 text-amber-900 font-mono font-black text-[11px] flex items-center justify-center shadow-2xs">
              ?
            </span>
          </button>
        </div>
      </div>

      {/* Floating Instant Toast Notification */}
      {notification && (
        <div className="px-3.5 py-2 bg-gradient-to-r from-orange-600 to-amber-600 text-white rounded-xl text-xs font-bold flex items-center gap-2 animate-fadeIn shadow-md border border-orange-400/40 shrink-0">
          <CheckCircle2 className="w-3.5 h-3.5 text-amber-200 shrink-0" />
          <span className="truncate">{notification}</span>
        </div>
      )}

      {/* 2-COLUMN PARALLEL FIT-TO-SCREEN CONTAINER (NO SCROLLING NEEDED) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 flex-1 min-h-0 overflow-hidden">
        
        {/* KOLOM KIRI: RINCIAN BARANG BELANJAAN & TOTAL TAGIHAN (7 COLS) */}
        <div className="lg:col-span-7 flex flex-col h-full bg-white rounded-3xl border border-stone-200/90 shadow-xs p-4 overflow-hidden">
          {/* Header Rincian */}
          <div className="flex items-center justify-between border-b border-stone-100 pb-2.5 mb-2 shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-orange-100 text-orange-700 flex items-center justify-center font-bold">
                <ReceiptText className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-black text-stone-900 tracking-tight">
                Rincian Barang Belanjaan
              </h3>
              <span className="px-2 py-0.5 rounded-full bg-orange-50 border border-orange-200 text-orange-800 text-[10px] font-black">
                {totalItemsCount} item
              </span>
            </div>

            {cart.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  if (window.confirm('Kosongkan semua barang di keranjang belanja? [F2]')) {
                    onClearCart();
                    setNotification('Keranjang belanja telah dikosongkan [F2]');
                    setTimeout(() => setNotification(null), 1500);
                  }
                }}
                className="text-xs text-rose-600 hover:text-rose-700 flex items-center gap-1.5 font-bold cursor-pointer transition-colors px-2.5 py-1 rounded-xl hover:bg-rose-50 border border-transparent hover:border-rose-200"
                title="Hapus semua barang dari transaksi (F2)"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Kosongkan</span>
                <kbd className="text-[10px] bg-rose-100 text-rose-800 px-1 rounded font-mono font-bold">F2</kbd>
              </button>
            )}
          </div>

          {/* Scrollable Cart Items Area */}
          <div className="flex-1 overflow-y-auto pr-1 min-h-0 space-y-2.5">
            {cart.length > 0 ? (
              <div className="space-y-2">
                {cart.map(item => {
                  const effectivePrice = item.customPrice !== undefined ? item.customPrice : item.product.sellingPrice;
                  const isEditingThisPrice = editingPriceItemId === item.product.id;

                  return (
                    <div 
                      key={item.product.id} 
                      className="p-2.5 rounded-2xl bg-stone-50/70 hover:bg-stone-100/70 border border-stone-200/80 transition-all flex flex-col gap-2 group"
                    >
                      {/* Baris 1: Nama Produk, SKU & Subtotal Total */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 truncate flex-1 min-w-0">
                          <span className="font-bold text-stone-900 text-xs sm:text-sm truncate">
                            {item.product.name}
                          </span>
                          <span className="text-[10px] text-stone-400 font-mono-num shrink-0 hidden sm:inline">
                            {item.product.sku}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <span className="font-black font-mono-num text-stone-900 text-xs sm:text-sm">
                            {formatRp(item.subtotal)}
                          </span>
                          <button
                            type="button"
                            onClick={() => onRemoveFromCart(item.product.id)}
                            className="p-1 text-stone-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                            title="Hapus barang"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Baris 2: Unified Interactive Cluster (HARGA, BERAT/JUMLAH, DAN KOLOM CATATAN MANUAL BERDAMPINGAN) */}
                      <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-stone-200/60 text-xs">
                        <div className="flex items-center gap-1.5 flex-1 min-w-0 flex-wrap">
                          {/* 1. Bagian Edit Harga Satuan */}
                          {isEditingThisPrice ? (
                            <div className="flex items-center gap-1 bg-white border-2 border-orange-500 rounded-xl px-1.5 py-0.5 shadow-2xs">
                              <span className="text-[10px] text-stone-400 font-bold pl-0.5">Rp</span>
                              <input
                                type="text"
                                value={editingPriceInput}
                                onChange={e => setEditingPriceInput(e.target.value.replace(/\D/g, ''))}
                                className="w-20 px-1 py-0.5 text-xs font-bold text-stone-900 focus:outline-none"
                                placeholder="Harga"
                                autoFocus
                                onKeyDown={e => {
                                  if (e.key === 'Enter') saveCustomPrice(item.product.id);
                                  else if (e.key === 'Escape') setEditingPriceItemId(null);
                                }}
                              />
                              <button
                                type="button"
                                onClick={() => saveCustomPrice(item.product.id)}
                                className="px-1.5 py-0.5 bg-orange-600 hover:bg-orange-500 text-white rounded text-[10px] font-bold cursor-pointer"
                              >
                                OK
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingPriceItemId(null)}
                                className="px-1 py-0.5 text-stone-400 hover:text-stone-600 text-[10px] cursor-pointer"
                              >
                                ✕
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                setEditingPriceItemId(item.product.id);
                                setEditingPriceInput(String(effectivePrice));
                              }}
                              className="flex items-center gap-1 bg-white hover:bg-orange-50 border border-stone-200 hover:border-orange-300 px-2 py-1 rounded-xl cursor-pointer transition-all shadow-2xs group/price shrink-0"
                              title="Klik untuk ubah harga satuan khusus transaksi ini"
                            >
                              <span className="text-[10px] text-stone-400 font-medium">Harga:</span>
                              <span className={`font-bold font-mono-num ${item.customPrice !== undefined ? 'text-orange-700' : 'text-stone-800'}`}>
                                {formatRp(effectivePrice)}
                              </span>
                              <Pencil className="w-3 h-3 text-stone-400 group-hover/price:text-orange-600 transition-colors" />
                              {item.customPrice !== undefined && item.customPrice !== item.product.sellingPrice && (
                                <span className="text-[9px] bg-orange-100 text-orange-800 font-bold px-1 rounded">
                                  Khusus
                                </span>
                              )}
                            </button>
                          )}

                          {/* Simbol Pengali */}
                          <span className="text-stone-400 font-bold shrink-0">×</span>

                          {/* 2. Bagian Input Berat/Jumlah TEPAT DI SAMPING HARGA */}
                          <div className="flex items-center gap-0.5 bg-white p-0.5 rounded-xl border border-stone-200 shadow-2xs shrink-0">
                            <button
                              type="button"
                              onClick={() => {
                                if (item.quantity <= 1 && item.quantity > 0.25 && onSetItemQuantity) {
                                  onSetItemQuantity(item.product.id, Math.max(0.1, Number((item.quantity - 0.25).toFixed(2))));
                                } else {
                                  onUpdateQuantity(item.product.id, -1);
                                }
                              }}
                              className="w-6 h-6 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 flex items-center justify-center font-bold text-xs active:scale-90 cursor-pointer"
                              title="Kurang jumlah/berat"
                            >
                              <Minus className="w-3 h-3" />
                            </button>

                            <input
                              type="number"
                              step="any"
                              min="0.01"
                              value={item.quantity}
                              onChange={e => {
                                const val = parseFloat(e.target.value);
                                if (!isNaN(val) && val > 0 && onSetItemQuantity) {
                                  onSetItemQuantity(item.product.id, val);
                                }
                              }}
                              className="w-13 text-center font-black font-mono-num text-xs text-stone-900 bg-transparent px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-orange-500"
                              title="Ketik jumlah atau berat barang (contoh: 0.5 kg, 0.25, atau 2)"
                            />

                            <button
                              type="button"
                              onClick={() => {
                                if (item.quantity < 1 && onSetItemQuantity) {
                                  onSetItemQuantity(item.product.id, Number((item.quantity + 0.25).toFixed(2)));
                                } else {
                                  onUpdateQuantity(item.product.id, 1);
                                }
                              }}
                              className="w-6 h-6 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 flex items-center justify-center font-bold text-xs active:scale-90 cursor-pointer"
                              title="Tambah jumlah/berat"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>

                          {/* 3. Kolom Catatan Manual Kasir TEPAT DI SAMPING EDIT HARGA & JUMLAH (MENGGANTIKAN SATUAN KAKU) */}
                          <div className="flex-1 min-w-[140px] flex items-center gap-1.5 bg-white border border-stone-200 focus-within:border-orange-500 focus-within:ring-1 focus-within:ring-orange-500/20 rounded-xl px-2 py-1 shadow-2xs transition-all">
                            <Tag className="w-3 h-3 text-stone-400 shrink-0" />
                            <input
                              type="text"
                              value={item.note || ''}
                              onChange={e => onSetItemNote && onSetItemNote(item.product.id, e.target.value)}
                              placeholder="Catatan / keterangan (mis: 1/2 kg, manis, dus)..."
                              className="w-full text-xs font-semibold text-stone-900 bg-transparent placeholder:text-stone-400 focus:outline-none"
                              title="Ketik catatan manual, ukuran, jenis, atau detail spesifik barang untuk transaksi ini"
                            />
                            {item.note && (
                              <button
                                type="button"
                                onClick={() => onSetItemNote && onSetItemNote(item.product.id, '')}
                                className="text-[10px] text-stone-400 hover:text-stone-600 px-0.5 cursor-pointer"
                                title="Hapus catatan"
                              >
                                ✕
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Indikator Kemasan Asli Toko */}
                        {item.product.isi && (
                          <span className="text-[10px] text-stone-400 font-medium hidden lg:inline shrink-0">
                            Isi: {item.product.isi}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center py-10 text-center space-y-3.5 px-4">
                <div className="w-14 h-14 rounded-2xl bg-stone-100 text-stone-400 flex items-center justify-center shadow-inner">
                  <ReceiptText className="w-7 h-7 text-stone-400" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-bold text-stone-800">Keranjang Belanja Masih Kosong</p>
                  <p className="text-xs text-stone-400 max-w-sm">
                    Scan barcode barang (F4) atau klik tombol katalog produk untuk menambahkan item belanja.
                  </p>
                </div>
                <div className="pt-1 flex items-center justify-center gap-2.5 flex-wrap">
                  <button
                    type="button"
                    onClick={() => setIsCameraScannerOpen(true)}
                    className="px-4 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs flex items-center gap-2 transition-all shadow-md shadow-orange-600/20 active:scale-95 cursor-pointer"
                  >
                    <Camera className="w-4 h-4 text-orange-200" />
                    <span>Scan Kamera Barcode</span>
                    <kbd className="bg-orange-700 text-orange-100 text-[10px] px-1.5 py-0.5 rounded font-mono font-bold">F5</kbd>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsCatalogOpen(true)}
                    className="px-4 py-2.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs flex items-center gap-2 transition-all shadow-xs active:scale-95 cursor-pointer"
                  >
                    <ShoppingBag className="w-4 h-4 text-orange-400" />
                    <span>Buka Katalog Produk</span>
                    <kbd className="bg-stone-800 text-orange-200 text-[10px] px-1.5 py-0.5 rounded font-mono font-bold">F3</kbd>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* TOTAL TAGIHAN ANCHOR BANNER (ALWAYS VISIBLE AT BOTTOM OF LEFT COLUMN) */}
          <div className="mt-3 pt-3 border-t border-stone-100 shrink-0">
            <div className="bg-gradient-to-br from-stone-950 via-stone-900 to-stone-950 text-white rounded-2xl p-4 shadow-lg border border-stone-800 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-extrabold uppercase tracking-widest text-amber-300 flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-amber-300" />
                  <span>TOTAL TAGIHAN</span>
                </span>
                <span className="text-xs text-stone-400 font-bold block mt-0.5">
                  {cart.length > 0 ? `${totalItemsCount} barang belanja` : (manualAmount > 0 ? 'Nominal Manual' : 'Belum ada tagihan')}
                </span>
              </div>
              <div className="text-3xl sm:text-4xl font-black font-mono-num text-amber-400 tracking-tight drop-shadow-sm">
                {formatRp(finalAmount)}
              </div>
            </div>
          </div>
        </div>

        {/* KOLOM KANAN: METODE PEMBAYARAN, INPUT UANG, KEMBALIAN & BAYAR STRUK (5 COLS) */}
        <div className="lg:col-span-5 flex flex-col h-full bg-white rounded-3xl border border-stone-200/90 shadow-xs p-4 overflow-hidden justify-between">
          
          <div className="space-y-3 flex-1 flex flex-col min-h-0 overflow-y-auto pr-0.5">
            {/* Header Metode Pembayaran */}
            <div>
              <label className="block text-xs font-black text-stone-800 uppercase tracking-wider mb-2">
                Pilih Metode Pembayaran:
              </label>
              <div className={`grid gap-1.5 ${
                enabledMethods.length === 1 
                  ? 'grid-cols-1' 
                  : enabledMethods.length === 2 
                    ? 'grid-cols-2' 
                    : enabledMethods.length === 3 
                      ? 'grid-cols-3' 
                      : 'grid-cols-4'
              }`}>
                {enabledMethods.includes('cash') && (
                  <button
                    type="button"
                    onClick={() => setMethod('cash')}
                    className={`py-2 px-1 rounded-xl border flex flex-col items-center justify-center gap-1 text-xs font-extrabold transition-all cursor-pointer active:scale-95 ${
                      method === 'cash'
                        ? 'border-orange-500 bg-gradient-to-r from-orange-600 to-amber-600 text-white shadow-md shadow-orange-500/20 scale-102'
                        : 'border-stone-200 text-stone-700 hover:bg-stone-50'
                    }`}
                  >
                    <Banknote className="w-4 h-4" />
                    <span>Tunai</span>
                  </button>
                )}

                {enabledMethods.includes('qris') && (
                  <button
                    type="button"
                    onClick={() => setMethod('qris')}
                    className={`py-2 px-1 rounded-xl border flex flex-col items-center justify-center gap-1 text-xs font-extrabold transition-all cursor-pointer active:scale-95 ${
                      method === 'qris'
                        ? 'border-orange-500 bg-gradient-to-r from-orange-600 to-amber-600 text-white shadow-md shadow-orange-500/20 scale-102'
                        : 'border-stone-200 text-stone-700 hover:bg-stone-50'
                    }`}
                  >
                    <QrCode className="w-4 h-4" />
                    <span>QRIS</span>
                  </button>
                )}

                {enabledMethods.includes('transfer') && (
                  <button
                    type="button"
                    onClick={() => setMethod('transfer')}
                    className={`py-2 px-1 rounded-xl border flex flex-col items-center justify-center gap-1 text-xs font-extrabold transition-all cursor-pointer active:scale-95 ${
                      method === 'transfer'
                        ? 'border-orange-500 bg-gradient-to-r from-orange-600 to-amber-600 text-white shadow-md shadow-orange-500/20 scale-102'
                        : 'border-stone-200 text-stone-700 hover:bg-stone-50'
                    }`}
                  >
                    <Building2 className="w-4 h-4" />
                    <span>Transfer</span>
                  </button>
                )}

                {enabledMethods.includes('debit') && (
                  <button
                    type="button"
                    onClick={() => setMethod('debit')}
                    className={`py-2 px-1 rounded-xl border flex flex-col items-center justify-center gap-1 text-xs font-extrabold transition-all cursor-pointer active:scale-95 ${
                      method === 'debit'
                        ? 'border-orange-500 bg-gradient-to-r from-orange-600 to-amber-600 text-white shadow-md shadow-orange-500/20 scale-102'
                        : 'border-stone-200 text-stone-700 hover:bg-stone-50'
                    }`}
                  >
                    <CreditCard className="w-4 h-4" />
                    <span>Debit</span>
                  </button>
                )}
              </div>
            </div>

            {/* DETAIL & KONTROL METODE PEMBAYARAN */}
            {method === 'cash' && (
              <div className="p-3.5 bg-stone-50 rounded-2xl border border-stone-200 space-y-3">
                {/* Input Uang Diterima */}
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs font-black text-stone-800 shrink-0">Uang Diterima:</span>
                  <div className="relative flex-1 max-w-[200px]">
                    <span className="absolute left-3 top-2 text-stone-400 font-bold text-xs">Rp</span>
                    <input
                      type="number"
                      value={cashGiven || ''}
                      placeholder={finalAmount > 0 ? finalAmount.toString() : '0'}
                      onChange={e => setCashGiven(Number(e.target.value) || 0)}
                      className="w-full pl-9 pr-3 py-1.5 text-base font-black font-mono-num rounded-xl border border-stone-300 bg-white text-right focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 shadow-inner text-stone-900"
                    />
                  </div>
                </div>

                {/* Quick cash denomination buttons */}
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => setCashGiven(finalAmount)}
                    className="flex-1 min-w-[100px] py-1.5 px-3 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-black flex items-center justify-center gap-1 transition-all shadow-xs active:scale-95 cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>UANG PAS</span>
                  </button>
                  {smartCashSuggestions.map(amt => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setCashGiven(amt)}
                      className="py-1.5 px-3 bg-white hover:bg-stone-100 border border-stone-300 rounded-xl text-xs font-black font-mono-num text-stone-800 transition-all active:scale-95 shadow-2xs cursor-pointer"
                    >
                      {amt.toLocaleString('id-ID')}
                    </button>
                  ))}
                </div>

                {/* Live Uang Kembalian / Kurang Bayar */}
                <div className={`p-3 rounded-xl flex items-center justify-between border shadow-inner transition-all ${
                  isCashInsufficient
                    ? 'bg-rose-50 border-rose-200 text-rose-900'
                    : 'bg-emerald-50 border-emerald-300 text-emerald-950'
                }`}>
                  <span className="text-xs font-black uppercase tracking-wider">
                    {isCashInsufficient ? 'Kurang Bayar:' : 'Uang Kembalian:'}
                  </span>
                  <span className="text-xl sm:text-2xl font-black font-mono-num">
                    {isCashInsufficient
                      ? `Kurang ${formatRp(finalAmount - effectiveCashGiven)}`
                      : formatRp(changeAmount)}
                  </span>
                </div>
              </div>
            )}

            {method === 'qris' && (
              <div className="p-3.5 bg-orange-50/50 rounded-2xl border border-orange-200 text-center space-y-2">
                <div className="w-20 h-20 bg-white mx-auto p-1.5 border border-stone-200 rounded-xl shadow-xs flex items-center justify-center">
                  <div className="w-full h-full bg-stone-900 rounded-lg p-1 flex flex-col justify-between">
                    <div className="flex justify-between">
                      <div className="w-3 h-3 bg-white rounded-xs" />
                      <div className="w-3 h-3 bg-white rounded-xs" />
                    </div>
                    <div className="text-[7px] text-white font-mono font-bold text-center">QRIS READY</div>
                    <div className="flex justify-between">
                      <div className="w-3 h-3 bg-white rounded-xs" />
                      <div className="w-2.5 h-2.5 bg-orange-400 rounded-full" />
                    </div>
                  </div>
                </div>
                <div className="text-xs font-black text-stone-900">QRIS Toko ({formatRp(finalAmount)})</div>
                <div className="text-[10px] text-stone-500">Scan via BCA, GoPay, OVO, Dana, ShopeePay, atau Livin'.</div>
              </div>
            )}

            {method === 'transfer' && (
              <div className="p-3.5 bg-stone-50 rounded-2xl border border-stone-200 text-xs flex items-center justify-between">
                <div>
                  <span className="font-black text-stone-900 font-mono-num text-sm">BCA: 8830-1928-331</span>
                  <div className="text-[10px] text-stone-500">a.n. PT BekuMart Kuliner Sejahtera</div>
                </div>
                <button
                  type="button"
                  onClick={handleCopyAccount}
                  className="px-3 py-1.5 bg-white hover:bg-stone-100 border border-stone-300 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all shadow-xs cursor-pointer active:scale-95 text-stone-800"
                >
                  {copiedBank ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-orange-600" />}
                  <span>{copiedBank ? 'Tersalin' : 'Salin Rekening'}</span>
                </button>
              </div>
            )}

            {method === 'debit' && (
              <div className="p-3.5 bg-amber-50/70 rounded-2xl border border-amber-200 text-xs text-stone-700 flex items-center gap-2.5">
                <CheckCircle2 className="w-5 h-5 text-amber-600 shrink-0" />
                <span className="font-semibold">Terminal Mesin EDC Siap Menerima Kartu Debit/Kredit</span>
              </div>
            )}
          </div>

          {/* TOMBOL UTAMA: BAYAR & CETAK STRUK (STICKY AT BOTTOM OF RIGHT COLUMN) */}
          <div className="pt-3 border-t border-stone-100 shrink-0">
            <button
              type="button"
              onClick={handleProcessPayment}
              disabled={finalAmount <= 0 || isCashInsufficient}
              className={`w-full py-3.5 px-4 rounded-2xl text-base font-black text-white shadow-lg transition-all flex items-center justify-center gap-2.5 active:scale-98 ${
                finalAmount <= 0 || isCashInsufficient
                  ? 'bg-stone-200 text-stone-400 cursor-not-allowed shadow-none'
                  : 'bg-gradient-to-r from-orange-600 via-amber-600 to-orange-500 hover:from-orange-500 hover:to-amber-500 cursor-pointer shadow-orange-600/25 hover:scale-101'
              }`}
            >
              <Printer className="w-5 h-5 text-white" />
              <span>Bayar &amp; Cetak Struk {finalAmount > 0 ? `(${formatRp(finalAmount)})` : ''}</span>
              <kbd className="text-xs bg-white/25 text-white px-2 py-0.5 rounded-lg font-mono font-black border border-white/40 shadow-xs">
                F1
              </kbd>
            </button>
          </div>

        </div>

      </div>

      {/* Interactive Manual Product Catalog Modal */}
      <ProductCatalogModal
        isOpen={isCatalogOpen}
        onClose={() => setIsCatalogOpen(false)}
        products={products}
        onSelectProduct={(p, q) => {
          playBeep();
          onAddToCart(p, q || 1);
          setNotification(`+${q || 1} ${p.name}`);
          setTimeout(() => setNotification(null), 1500);
        }}
      />

      {/* Device Camera Barcode Scanner Modal */}
      <CameraBarcodeScannerModal
        isOpen={isCameraScannerOpen}
        onClose={() => setIsCameraScannerOpen(false)}
        products={products}
        onProductScanned={(p, q) => {
          onAddToCart(p, q || 1);
          setNotification(`+${q || 1} ${p.name}`);
          setTimeout(() => setNotification(null), 1500);
        }}
      />

      {/* Modal Bantuan Pintasan Keyboard (Shortcuts Help) */}
      {isShortcutsHelpOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/60 backdrop-blur-xs animate-fadeIn"
          onClick={() => setIsShortcutsHelpOpen(false)}
        >
          <div 
            className="w-full max-w-lg bg-white rounded-3xl border border-stone-200 shadow-2xl overflow-hidden flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-5 border-b border-stone-100 flex items-center justify-between bg-stone-50/70">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-orange-100 text-orange-700 flex items-center justify-center shadow-xs">
                  <Keyboard className="w-5 h-5 stroke-[2.2]" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-stone-900 tracking-tight">
                      Bantuan Pintasan Keyboard
                    </h3>
                    <span className="w-5 h-5 rounded-full bg-orange-600 text-white font-mono font-black text-xs flex items-center justify-center">
                      ?
                    </span>
                  </div>
                  <p className="text-xs text-stone-500 font-medium mt-0.5">
                    Daftar tombol cepat operasional kasir tanpa perlu klik mouse
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsShortcutsHelpOpen(false)}
                className="w-8 h-8 rounded-xl bg-white hover:bg-stone-100 text-stone-400 hover:text-stone-700 flex items-center justify-center transition-colors cursor-pointer border border-stone-200"
                title="Tutup (Esc)"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body - List of Shortcuts */}
            <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {/* Shortcut 1: F1 */}
                <div className="p-3.5 rounded-2xl bg-orange-50/70 border border-orange-200/80 flex items-start gap-3 shadow-2xs">
                  <kbd className="px-2.5 py-1.5 rounded-xl bg-orange-600 text-white font-mono font-black text-xs shadow-xs border border-orange-500 shrink-0">
                    F1
                  </kbd>
                  <div>
                    <h4 className="text-xs font-bold text-stone-900">Bayar Transaksi</h4>
                    <p className="text-[11px] text-stone-600 mt-0.5 leading-relaxed">
                      Memproses pembayaran dan langsung mencetak struk kasir / kirim WA.
                    </p>
                  </div>
                </div>

                {/* Shortcut 2: F2 */}
                <div className="p-3.5 rounded-2xl bg-rose-50/70 border border-rose-200/80 flex items-start gap-3 shadow-2xs">
                  <kbd className="px-2.5 py-1.5 rounded-xl bg-rose-600 text-white font-mono font-black text-xs shadow-xs border border-rose-500 shrink-0">
                    F2
                  </kbd>
                  <div>
                    <h4 className="text-xs font-bold text-stone-900">Kosongkan Keranjang</h4>
                    <p className="text-[11px] text-stone-600 mt-0.5 leading-relaxed">
                      Menghapus semua barang belanjaan sekaligus jika transaksi dibatalkan.
                    </p>
                  </div>
                </div>

                {/* Shortcut 3: F3 */}
                <div className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200 flex items-start gap-3 shadow-2xs">
                  <kbd className="px-2.5 py-1.5 rounded-xl bg-stone-900 text-white font-mono font-black text-xs shadow-xs border border-stone-800 shrink-0">
                    F3
                  </kbd>
                  <div>
                    <h4 className="text-xs font-bold text-stone-900">Katalog Produk Manual</h4>
                    <p className="text-[11px] text-stone-600 mt-0.5 leading-relaxed">
                      Membuka jendela pencarian produk manual dengan kotak kategori.
                    </p>
                  </div>
                </div>

                {/* Shortcut 4: F4 */}
                <div className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200 flex items-start gap-3 shadow-2xs">
                  <kbd className="px-2.5 py-1.5 rounded-xl bg-stone-800 text-white font-mono font-black text-xs shadow-xs border border-stone-700 shrink-0">
                    F4
                  </kbd>
                  <div>
                    <h4 className="text-xs font-bold text-stone-900">Fokus Scan Barcode</h4>
                    <p className="text-[11px] text-stone-600 mt-0.5 leading-relaxed">
                      Mengarahkan kursor langsung ke kolom scan barcode/SKU secara instan.
                    </p>
                  </div>
                </div>

                {/* Shortcut 5: F5 */}
                <div className="p-3.5 rounded-2xl bg-orange-50/70 border border-orange-200/80 flex items-start gap-3 shadow-2xs">
                  <kbd className="px-2.5 py-1.5 rounded-xl bg-orange-600 text-white font-mono font-black text-xs shadow-xs border border-orange-500 shrink-0">
                    F5
                  </kbd>
                  <div>
                    <h4 className="text-xs font-bold text-stone-900">Scan Barcode Kamera</h4>
                    <p className="text-[11px] text-stone-600 mt-0.5 leading-relaxed">
                      Membuka pemindai kamera perangkat untuk membaca barcode produk langsung.
                    </p>
                  </div>
                </div>

                {/* Shortcut 6: Esc */}
                <div className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200 flex items-start gap-3 shadow-2xs">
                  <kbd className="px-2.5 py-1.5 rounded-xl bg-stone-200 text-stone-800 font-mono font-black text-xs shadow-xs border border-stone-300 shrink-0">
                    Esc
                  </kbd>
                  <div>
                    <h4 className="text-xs font-bold text-stone-900">Tutup Modal / Jendela</h4>
                    <p className="text-[11px] text-stone-600 mt-0.5 leading-relaxed">
                      Menutup modal bantuan pintasan atau modal katalog yang sedang aktif.
                    </p>
                  </div>
                </div>

                {/* Shortcut 7: ? */}
                <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200/80 flex items-start gap-3 shadow-2xs">
                  <kbd className="px-2.5 py-1.5 rounded-xl bg-amber-500 text-stone-950 font-mono font-black text-xs shadow-xs border border-amber-400 shrink-0">
                    ?
                  </kbd>
                  <div>
                    <h4 className="text-xs font-bold text-stone-900">Bantuan Pintasan</h4>
                    <p className="text-[11px] text-stone-600 mt-0.5 leading-relaxed">
                      Menampilkan kembali jendela panduan daftar tombol pintasan ini.
                    </p>
                  </div>
                </div>
              </div>

              {/* Tips Efisiensi Kasir */}
              <div className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200/90 text-xs text-stone-600 space-y-1.5">
                <span className="font-bold text-stone-900 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-orange-600" />
                  Tips Operasional Cepat:
                </span>
                <ul className="list-disc pl-4 space-y-1 text-[11px] text-stone-600 leading-relaxed">
                  <li>Alat scanner barcode otomatis mengirim tombol <strong>Enter</strong> setelah membaca kode barang.</li>
                  <li>Jumlah barang dapat diedit desimal langsung (contoh: <code>0.5</code> untuk setengah kilo).</li>
                  <li>Kasir dapat mengetikkan catatan manual khusus tepat di samping kolom harga satuan.</li>
                </ul>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-stone-100 bg-stone-50/50 flex items-center justify-between">
              <span className="text-[11px] text-stone-500 font-medium">
                Tekan tombol <kbd className="font-mono bg-white px-1.5 py-0.5 rounded border border-stone-300 text-stone-700 font-bold">Esc</kbd> untuk menutup
              </span>
              <button
                type="button"
                onClick={() => setIsShortcutsHelpOpen(false)}
                className="px-5 py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-bold transition-all cursor-pointer active:scale-95 shadow-xs"
              >
                Mengerti
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
