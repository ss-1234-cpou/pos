import React, { useState } from 'react';
import { CartItem, PaymentMethod, StoreSettings, Transaction } from '../types';
import { StorageService } from '../services/storage';
import { 
  X, 
  Banknote, 
  QrCode, 
  Building2, 
  CreditCard, 
  CheckCircle2, 
  Copy, 
  Check, 
  Smartphone,
  AlertCircle
} from 'lucide-react';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  cartItems: CartItem[];
  subtotal: number;
  discountAmount: number;
  finalAmount: number;
  settings: StoreSettings;
  cashierName: string;
  onSuccess: (transaction: Transaction) => void;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  isOpen,
  onClose,
  cartItems,
  subtotal,
  discountAmount,
  finalAmount,
  settings,
  cashierName,
  onSuccess,
}) => {
  const [method, setMethod] = useState<PaymentMethod>('cash');
  const [cashGiven, setCashGiven] = useState<number>(finalAmount);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [copiedBank, setCopiedBank] = useState(false);
  const [qrisScanned, setQrisScanned] = useState(false);

  if (!isOpen) return null;

  const formatRp = (num: number) => 'Rp ' + num.toLocaleString('id-ID');
  const changeAmount = Math.max(0, cashGiven - finalAmount);
  const isCashInsufficient = method === 'cash' && cashGiven < finalAmount;

  const handleQuickCash = (amount: number) => {
    setCashGiven(amount);
  };

  const handleCopyAccount = (accNumber: string) => {
    navigator.clipboard.writeText(accNumber);
    setCopiedBank(true);
    setTimeout(() => setCopiedBank(false), 2000);
  };

  const handleCompleteTransaction = () => {
    if (isCashInsufficient) return;

    const totalCost = cartItems.reduce(
      (acc, it) => acc + it.product.costPrice * it.quantity,
      0
    );
    const grossProfit = finalAmount - totalCost;

    const todayStr = new Date().toISOString().split('T')[0].replace(/-/g, '');
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const invoiceNumber = `INV/${todayStr}/${randomSuffix}`;

    const newTx: Transaction = {
      id: `tx-${Date.now()}`,
      invoiceNumber,
      timestamp: new Date().toISOString(),
      items: cartItems,
      totalItemsCount: cartItems.reduce((acc, it) => acc + it.quantity, 0),
      subtotal,
      discountAmount,
      taxAmount: 0,
      finalAmount,
      totalCost,
      grossProfit,
      paymentMethod: method,
      cashGiven: method === 'cash' ? cashGiven : finalAmount,
      changeAmount: method === 'cash' ? changeAmount : 0,
      cashierName,
      customerName: customerName.trim() || undefined,
      customerPhone: customerPhone.trim() || undefined,
      notes: notes.trim() || undefined,
      syncedToCloud: true,
    };

    StorageService.saveTransaction(newTx);
    onSuccess(newTx);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-4">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
          <div>
            <h3 className="font-bold text-slate-900 text-base">Proses Pembayaran Kasir</h3>
            <p className="text-xs text-slate-500">Pilih metode bayar dan input nominal yang diterima</p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-200/50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Bill Summary Banner */}
        <div className="px-6 py-4 bg-sky-50 border-b border-sky-100 flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-sky-800">Total Tagihan Belanja</span>
            <div className="text-2xl font-extrabold text-sky-950 font-mono-num">
              {formatRp(finalAmount)}
            </div>
          </div>
          <div className="text-right text-xs text-slate-600">
            <span>{cartItems.reduce((a, b) => a + b.quantity, 0)} item barang</span>
            {discountAmount > 0 && (
              <span className="block text-rose-600 font-semibold">
                Hemat {formatRp(discountAmount)}
              </span>
            )}
          </div>
        </div>

        {/* Payment Method Selector */}
        <div className="p-6 space-y-5">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-2">
              Pilih Metode Pembayaran
            </label>
            <div className="grid grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => setMethod('cash')}
                className={`py-3 px-2 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition-all text-xs font-medium ${
                  method === 'cash'
                    ? 'border-sky-600 bg-sky-50 text-sky-800 font-bold shadow-xs'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Banknote className="w-5 h-5" />
                <span>Tunai</span>
              </button>

              <button
                type="button"
                onClick={() => setMethod('qris')}
                className={`py-3 px-2 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition-all text-xs font-medium ${
                  method === 'qris'
                    ? 'border-sky-600 bg-sky-50 text-sky-800 font-bold shadow-xs'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <QrCode className="w-5 h-5" />
                <span>QRIS</span>
              </button>

              <button
                type="button"
                onClick={() => setMethod('transfer')}
                className={`py-3 px-2 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition-all text-xs font-medium ${
                  method === 'transfer'
                    ? 'border-sky-600 bg-sky-50 text-sky-800 font-bold shadow-xs'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Building2 className="w-5 h-5" />
                <span>Transfer</span>
              </button>

              <button
                type="button"
                onClick={() => setMethod('debit')}
                className={`py-3 px-2 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition-all text-xs font-medium ${
                  method === 'debit'
                    ? 'border-sky-600 bg-sky-50 text-sky-800 font-bold shadow-xs'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <CreditCard className="w-5 h-5" />
                <span>Debit/EDC</span>
              </button>
            </div>
          </div>

          {/* Method Content */}
          {method === 'cash' && (
            <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-700">
                  Uang Tunai Diterima (Rp)
                </label>
                <span className="text-[11px] text-slate-500">Klik tombol cepat atau ketik</span>
              </div>

              <div className="relative">
                <span className="absolute left-3 top-2.5 text-slate-400 font-bold text-sm">Rp</span>
                <input
                  type="number"
                  value={cashGiven || ''}
                  onChange={e => setCashGiven(Number(e.target.value) || 0)}
                  className="w-full pl-10 pr-3 py-2 text-lg font-bold font-mono-num rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white"
                  placeholder="0"
                />
              </div>

              {/* Quick Cash Buttons */}
              <div className="grid grid-cols-4 gap-1.5 pt-1">
                <button
                  type="button"
                  onClick={() => handleQuickCash(finalAmount)}
                  className="py-1.5 text-xs font-semibold bg-white border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-100 transition-colors shadow-2xs"
                >
                  Uang Pas
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickCash(50000)}
                  className="py-1.5 text-xs font-medium bg-white border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-100 transition-colors font-mono-num"
                >
                  50.000
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickCash(100000)}
                  className="py-1.5 text-xs font-medium bg-white border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-100 transition-colors font-mono-num"
                >
                  100.000
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickCash(200000)}
                  className="py-1.5 text-xs font-medium bg-white border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-100 transition-colors font-mono-num"
                >
                  200.000
                </button>
              </div>

              {/* Kembalian Visual Box */}
              <div className="mt-2 pt-2 border-t border-slate-200 flex items-center justify-between">
                <span className="text-xs font-medium text-slate-600">Uang Kembalian:</span>
                <span
                  className={`text-lg font-extrabold font-mono-num ${
                    isCashInsufficient ? 'text-rose-600' : 'text-emerald-600'
                  }`}
                >
                  {isCashInsufficient
                    ? `Kurang ${formatRp(finalAmount - cashGiven)}`
                    : formatRp(changeAmount)}
                </span>
              </div>
            </div>
          )}

          {method === 'qris' && (
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-center space-y-3">
              <div className="flex items-center justify-center gap-2 text-xs font-semibold text-slate-700">
                <QrCode className="w-4 h-4 text-sky-600" />
                <span>QRIS Dinamis Toko BekuMart</span>
              </div>

              {/* QR Code Graphic */}
              <div className="w-44 h-44 bg-white p-3 mx-auto rounded-xl border border-slate-300 shadow-xs flex flex-col items-center justify-center relative">
                <div className="w-full h-full bg-slate-900 rounded-lg p-2 flex flex-col justify-between">
                  <div className="flex justify-between">
                    <div className="w-7 h-7 bg-white rounded-xs p-1">
                      <div className="w-full h-full bg-slate-900 rounded-2xs" />
                    </div>
                    <div className="w-7 h-7 bg-white rounded-xs p-1">
                      <div className="w-full h-full bg-slate-900 rounded-2xs" />
                    </div>
                  </div>
                  <div className="text-[9px] text-white font-mono tracking-widest text-center py-1">
                    BEKUMART-QRIS
                  </div>
                  <div className="flex justify-between items-end">
                    <div className="w-7 h-7 bg-white rounded-xs p-1">
                      <div className="w-full h-full bg-slate-900 rounded-2xs" />
                    </div>
                    <div className="w-5 h-5 bg-sky-400 rounded-full flex items-center justify-center text-[8px] font-bold text-white">
                      ❄️
                    </div>
                  </div>
                </div>
              </div>

              <div className="text-xs text-slate-600">
                Tunjukkan QRIS ke pelanggan untuk di-scan dengan GoPay, OVO, Dana, BCA, atau Livin'.
              </div>

              <button
                type="button"
                onClick={() => setQrisScanned(true)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  qrisScanned
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                    : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-300'
                }`}
              >
                {qrisScanned ? '✓ Pembayaran QRIS Terverifikasi' : 'Simulasi Pembayaran Pelanggan Berhasil'}
              </button>
            </div>
          )}

          {method === 'transfer' && (
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
              <span className="text-xs font-semibold text-slate-700 block">
                Rekening Resmi Toko Frozen:
              </span>
              <div className="bg-white p-3 rounded-lg border border-slate-200 flex items-center justify-between">
                <div>
                  <div className="font-bold text-xs text-slate-900">BCA: 8830-1928-331</div>
                  <div className="text-[11px] text-slate-500">a.n. PT BekuMart Kuliner Sejahtera</div>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopyAccount('88301928331')}
                  className="px-2.5 py-1 text-xs font-medium rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center gap-1 transition-colors"
                >
                  {copiedBank ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedBank ? 'Tersalin' : 'Salin'}</span>
                </button>
              </div>
              <div className="text-[11px] text-slate-500">
                Pastikan nama pengirim dan bukti transfer telah dicek di m-banking kasir.
              </div>
            </div>
          )}

          {method === 'debit' && (
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
              <div className="text-xs font-semibold text-slate-700">Kartu Debit / Mesin EDC</div>
              <p className="text-xs text-slate-600">
                Gesek atau masukkan kartu debit/kredit pelanggan pada mesin EDC kasir.
              </p>
              <div className="bg-emerald-50 text-emerald-800 text-xs p-2.5 rounded-lg border border-emerald-200 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>Mesin EDC Siap Menerima Kartu GPN, Visa, &amp; Mastercard</span>
              </div>
            </div>
          )}

          {/* Optional Customer Info */}
          <div className="grid grid-cols-2 gap-3 pt-1 border-t border-slate-100">
            <div>
              <label className="block text-[11px] font-medium text-slate-600 mb-1">
                Nama Pelanggan (Opsional)
              </label>
              <input
                type="text"
                placeholder="Contoh: Ibu Rina"
                value={customerName}
                onChange={e => setCustomerName(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-sky-500"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-slate-600 mb-1 flex items-center gap-1">
                <Smartphone className="w-3 h-3 text-emerald-600" />
                <span>Nomor WhatsApp Nota</span>
              </label>
              <input
                type="tel"
                placeholder="0812xxxxxxx"
                value={customerPhone}
                onChange={e => setCustomerPhone(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-sky-500 font-mono-num"
              />
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:text-slate-800 rounded-xl hover:bg-slate-200 transition-colors"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleCompleteTransaction}
            disabled={isCashInsufficient}
            className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold text-white shadow-xs transition-all flex items-center justify-center gap-2 ${
              isCashInsufficient
                ? 'bg-slate-300 cursor-not-allowed text-slate-500'
                : 'bg-emerald-600 hover:bg-emerald-700 active:scale-98'
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Selesaikan Transaksi ({formatRp(finalAmount)})</span>
          </button>
        </div>
      </div>
    </div>
  );
};
