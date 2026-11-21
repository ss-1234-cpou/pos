import React, { useState, useEffect } from 'react';
import { Transaction, StoreSettings } from '../types';
import { Printer, Share2, CheckCircle2, X } from 'lucide-react';

interface ThermalReceiptModalProps {
  transaction: Transaction | null;
  settings: StoreSettings;
  onClose: () => void;
}

export const ThermalReceiptModal: React.FC<ThermalReceiptModalProps> = ({
  transaction,
  settings,
  onClose,
}) => {
  const [targetPhone, setTargetPhone] = useState(transaction?.customerPhone || '');
  const [receiptWidth, setReceiptWidth] = useState<'58mm' | '80mm'>('58mm');

  // Auto-print immediately when receipt modal opens
  useEffect(() => {
    if (transaction) {
      const timer = setTimeout(() => {
        try {
          window.print();
        } catch {}
      }, 250);
      return () => clearTimeout(timer);
    }
  }, [transaction]);

  if (!transaction) return null;

  const formatRp = (num: number) => 'Rp ' + num.toLocaleString('id-ID');

  const handlePrint = () => {
    try {
      window.print();
    } catch {}
  };

  const handleSendWhatsApp = () => {
    const cleanPhone = (targetPhone || settings.phone).replace(/[^0-9]/g, '');
    const phoneWithCountry = cleanPhone.startsWith('0') ? '62' + cleanPhone.slice(1) : cleanPhone;

    const itemsSummary = transaction.items
      .map(
        it => {
          const price = it.customPrice !== undefined ? it.customPrice : it.product.sellingPrice;
          const noteStr = it.note ? `\n    _Catatan: ${it.note}_` : '';
          return `• ${it.product.name}\n  ${it.quantity}x @ ${formatRp(price)} = ${formatRp(it.subtotal)}${noteStr}`;
        }
      )
      .join('\n');

    const message = [
      `*🧾 NOTA ELEKTRONIK ${settings.storeName.toUpperCase()}*`,
      `📍 ${settings.address}`,
      `📞 Telp/WA: ${settings.phone}`,
      `---------------------------------`,
      `No. Invoice: *${transaction.invoiceNumber}*`,
      `Waktu: ${new Date(transaction.timestamp).toLocaleString('id-ID')}`,
      settings.showCashierNameOnReceipt !== false && (transaction.cashierName || settings.activeCashierName)
        ? `${settings.cashierSectionLabel || 'Kasir'}: ${transaction.cashierName || settings.activeCashierName}`
        : null,
      `Pelanggan: ${transaction.customerName || 'Umum'}`,
      `---------------------------------`,
      `*RINCIAN BELANJA:*`,
      itemsSummary,
      `---------------------------------`,
      `Subtotal: ${formatRp(transaction.subtotal)}`,
      transaction.discountAmount > 0 ? `Diskon: -${formatRp(transaction.discountAmount)}` : null,
      `*TOTAL AKHIR: ${formatRp(transaction.finalAmount)}*`,
      `Metode: ${transaction.paymentMethod.toUpperCase()}`,
      transaction.cashGiven ? `Bayar: ${formatRp(transaction.cashGiven)}` : null,
      transaction.changeAmount ? `Kembalian: ${formatRp(transaction.changeAmount)}` : null,
      `---------------------------------`,
      `❄️ *PENTING:* Segera simpan di freezer suhu -18°C agar kualitas beku tetap terjaga prima.`,
      `_${settings.receiptFooter}_`
    ]
      .filter(Boolean)
      .join('\n');

    const url = `https://wa.me/${phoneWithCountry}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-2 sm:p-4 overflow-hidden">
      <div className="relative w-full max-w-sm sm:max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] sm:max-h-[90vh]">
        {/* Top Header Bar: Status, Thermal Format Selector & Close */}
        <div className="flex items-center justify-between px-3.5 py-2 sm:py-2.5 border-b border-slate-100 bg-slate-50 shrink-0">
          <div className="flex items-center gap-1.5 min-w-0">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <h3 className="font-bold text-slate-800 text-xs sm:text-sm truncate">Pembayaran Berhasil!</h3>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <div className="flex items-center bg-slate-200/70 p-0.5 rounded-lg text-[11px]">
              <button
                type="button"
                onClick={() => setReceiptWidth('58mm')}
                className={`px-2 py-0.5 rounded-md font-semibold transition-all ${
                  receiptWidth === '58mm' ? 'bg-white shadow-xs text-sky-700' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                58mm
              </button>
              <button
                type="button"
                onClick={() => setReceiptWidth('80mm')}
                className={`px-2 py-0.5 rounded-md font-semibold transition-all ${
                  receiptWidth === '80mm' ? 'bg-white shadow-xs text-sky-700' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                80mm
              </button>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="text-slate-400 hover:text-slate-700 p-1 rounded-md hover:bg-slate-200/50 transition-colors"
              title="Tutup"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Thermal Receipt Visual Preview with Internal Scroll */}
        <div className="flex-1 min-h-0 overflow-y-auto p-2 sm:p-3 bg-slate-100 flex justify-center">
          <div
            id="thermal-receipt-area"
            style={{ width: receiptWidth === '58mm' ? '280px' : '340px' }}
            className="bg-white p-3 shadow-xs border border-slate-200 text-slate-900 font-mono-num text-[11px] leading-tight transition-all duration-200 my-auto sm:my-0 self-start"
          >
            {/* Store Info with Standardized Solid Full Frame Logo */}
            <div className="text-center pb-1.5 border-b border-dashed border-slate-300">
              {settings.showLogoOnReceipt !== false && settings.logoUrl && (
                <div className="w-9 h-9 mx-auto mb-1 rounded-lg bg-transparent border border-slate-300 overflow-hidden shadow-xs flex items-center justify-center">
                  <img src={settings.logoUrl} alt="Logo Toko" className="w-full h-full object-cover" />
                </div>
              )}
              <h2 className="font-bold text-xs tracking-tight">{settings.storeName}</h2>
              {settings.tagline && <p className="text-[9.5px] text-slate-600 mt-0.5">{settings.tagline}</p>}
              <p className="text-[9.5px] text-slate-500 mt-0.5">{settings.address}</p>
              <p className="text-[9.5px] text-slate-500">WA: {settings.phone}</p>
            </div>

            {/* Invoice Meta */}
            <div className="py-1.5 border-b border-dashed border-slate-300 text-[9.5px] space-y-0.5">
              <div className="flex justify-between">
                <span>No: {transaction.invoiceNumber}</span>
                <span>{new Date(transaction.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Tgl: {new Date(transaction.timestamp).toLocaleDateString('id-ID')}</span>
                {settings.showCashierOnReceipt !== false && (
                  <span className="flex items-center gap-1">
                    {settings.cashierLogoUrl && (
                      <img src={settings.cashierLogoUrl} alt="Kasir" className="w-3 h-3 rounded-full object-cover inline-block" />
                    )}
                    <span>
                      {settings.cashierSectionLabel || 'Kasir'}
                      {settings.showCashierNameOnReceipt !== false && `: ${transaction.cashierName || settings.activeCashierName || ''}`}
                    </span>
                  </span>
                )}
              </div>
              {transaction.customerName && (
                <div className="flex justify-between">
                  <span>Plg: {transaction.customerName}</span>
                  {transaction.customerPhone && <span>{transaction.customerPhone}</span>}
                </div>
              )}
            </div>

            {/* Purchased Items */}
            <div className="py-1.5 border-b border-dashed border-slate-300 space-y-1">
              {transaction.items.map((item, idx) => {
                const price = item.customPrice !== undefined ? item.customPrice : item.product.sellingPrice;

                return (
                  <div key={idx} className="space-y-0.5">
                    <div className="font-semibold text-slate-900 text-[10.5px] truncate">
                      {item.product.name}
                    </div>
                    {item.note && (
                      <div className="text-[9.5px] text-slate-500 font-medium italic pl-1">
                        • {item.note}
                      </div>
                    )}
                    <div className="flex justify-between text-[10px] text-slate-600">
                      <span>
                        {item.quantity}x @ {formatRp(price)}
                      </span>
                      <span className="font-semibold text-slate-900">{formatRp(item.subtotal)}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Calculations */}
            <div className="py-1.5 border-b border-dashed border-slate-300 space-y-0.5 text-[10.5px]">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal ({transaction.totalItemsCount} item)</span>
                <span>{formatRp(transaction.subtotal)}</span>
              </div>
              {transaction.discountAmount > 0 && (
                <div className="flex justify-between text-rose-600 font-semibold">
                  <span>Diskon</span>
                  <span>-{formatRp(transaction.discountAmount)}</span>
                </div>
              )}
              <div className="flex justify-between text-[11px] font-bold pt-1 border-t border-slate-200 text-slate-900">
                <span>TOTAL AKHIR</span>
                <span className="text-xs font-bold text-slate-900">{formatRp(transaction.finalAmount)}</span>
              </div>
              <div className="flex justify-between text-slate-600 pt-0.5 text-[10px]">
                <span>Metode Bayar</span>
                <span className="uppercase font-semibold">{transaction.paymentMethod}</span>
              </div>
              {transaction.cashGiven !== undefined && transaction.cashGiven > 0 && (
                <div className="flex justify-between text-slate-600 text-[10px]">
                  <span>Uang Diterima</span>
                  <span>{formatRp(transaction.cashGiven)}</span>
                </div>
              )}
              {transaction.changeAmount !== undefined && transaction.changeAmount >= 0 && (
                <div className="flex justify-between text-slate-900 font-bold text-[10px]">
                  <span>Kembalian</span>
                  <span>{formatRp(transaction.changeAmount)}</span>
                </div>
              )}
            </div>

            {/* Frozen Notice & Footer */}
            <div className="pt-1.5 text-center text-[9px] text-slate-500 space-y-0.5">
              <p className="font-bold text-sky-800 text-[9.5px]">❄️ SIMPAN DI FREEZER -18°C ❄️</p>
              {settings.receiptFooter && <p>{settings.receiptFooter}</p>}
              <p className="text-[8.5px] text-slate-400">Terima kasih atas kunjungan Anda</p>
            </div>
          </div>
        </div>

        {/* WhatsApp Send Box - Compact 1-line dock */}
        <div className="px-3.5 py-1.5 sm:py-2 border-t border-slate-100 bg-slate-50 shrink-0">
          <div className="flex items-center gap-1.5">
            <input
              type="tel"
              placeholder="Kirim WA (cth: 0812xxxxxxx)"
              value={targetPhone}
              onChange={e => setTargetPhone(e.target.value)}
              className="flex-1 px-2.5 py-1 text-xs rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-1 focus:ring-sky-500 font-mono-num placeholder:text-slate-400"
            />
            <button
              type="button"
              onClick={handleSendWhatsApp}
              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors whitespace-nowrap active:scale-95 shrink-0"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Kirim WA</span>
            </button>
          </div>
        </div>

        {/* Actions Footer - Always Pinned in the Same Frame */}
        <div className="px-3.5 py-2 sm:py-2.5 border-t border-slate-200 flex items-center justify-between gap-2 bg-white shrink-0">
          <button
            type="button"
            onClick={handlePrint}
            className="flex-1 py-2 px-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-xs active:scale-95 whitespace-nowrap"
          >
            <Printer className="w-3.5 h-3.5 shrink-0" />
            <span>Cetak Ulang Struk</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center transition-all shadow-xs active:scale-95 whitespace-nowrap"
          >
            <span>Selesai / Transaksi Baru</span>
          </button>
        </div>
      </div>
    </div>
  );
};
