import React, { useState, useMemo } from 'react';
import { Transaction, StoreSettings, DailyReportSummary } from '../types';
import { StorageService } from '../services/storage';
import { 
  ReceiptText, 
  Calendar, 
  Download, 
  Share2, 
  Search, 
  DollarSign, 
  TrendingUp, 
  ShoppingBag, 
  Clock, 
  Printer,
  FileSpreadsheet
} from 'lucide-react';

interface HistorySalesViewProps {
  transactions: Transaction[];
  settings: StoreSettings;
  onOpenReceipt: (tx: Transaction) => void;
}

export const HistorySalesView: React.FC<HistorySalesViewProps> = ({
  transactions,
  settings,
  onOpenReceipt,
}) => {
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [searchInvoice, setSearchInvoice] = useState('');

  const formatRp = (num: number) => 'Rp ' + num.toLocaleString('id-ID');

  const dailyReport: DailyReportSummary = useMemo(() => {
    return StorageService.calculateDailyReport(selectedDate);
  }, [selectedDate, transactions]);

  const filteredTransactions = useMemo(() => {
    return transactions.filter(tx => {
      const matchDate = tx.timestamp.startsWith(selectedDate);
      const q = searchInvoice.toLowerCase().trim();
      const matchSearch =
        !q ||
        tx.invoiceNumber.toLowerCase().includes(q) ||
        (tx.customerName && tx.customerName.toLowerCase().includes(q)) ||
        tx.items.some(it => it.product.name.toLowerCase().includes(q));
      return matchDate && matchSearch;
    });
  }, [transactions, selectedDate, searchInvoice]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-orange-600 text-white flex items-center justify-center shadow-xs">
              <ReceiptText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-stone-900">History Penjualan &amp; Laporan</h2>
              <p className="text-xs text-stone-500">
                Pantau omset harian, jam sibuk, dan kelola arsip struk transaksi kasir.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Date Picker */}
          <div className="flex items-center gap-2 bg-white border border-stone-200/90 rounded-2xl px-3.5 py-2 text-xs text-stone-700 shadow-xs">
            <Calendar className="w-4 h-4 text-orange-600" />
            <input
              type="date"
              value={selectedDate}
              onChange={e => setSelectedDate(e.target.value)}
              className="bg-transparent focus:outline-none font-bold text-stone-900 cursor-pointer"
            />
          </div>

          <button
            onClick={() => StorageService.exportTransactionsToCSV(transactions)}
            className="px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-2xl text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Unduh CSV</span>
          </button>

          <a
            href={StorageService.generateWhatsAppReport(dailyReport, settings)}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
          >
            <Share2 className="w-4 h-4" />
            <span>Kirim Rekap WA</span>
          </a>
        </div>
      </div>

      {/* 4 Distinct Warm KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Total Omset: Terracotta Accent */}
        <div className="bg-gradient-to-br from-orange-600 to-amber-700 text-white p-5 rounded-3xl border border-orange-500 shadow-xl shadow-orange-600/15 hover:-translate-y-0.5 transition-all duration-200">
          <div className="flex items-center justify-between text-xs font-bold text-orange-100 mb-1">
            <span>Total Omset</span>
            <div className="w-8 h-8 rounded-xl bg-white/20 text-white flex items-center justify-center shadow-xs">
              <DollarSign className="w-4 h-4 stroke-[2.5]" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-white font-mono-num mt-1">
            {formatRp(dailyReport.totalRevenue)}
          </div>
          <div className="text-[11px] text-orange-100 font-medium mt-0.5 font-mono-num">
            {dailyReport.totalTransactions} transaksi berhasil
          </div>
        </div>

        {/* 2. Struk Terbit: Warm Stone */}
        <div className="bg-stone-900 text-white p-5 rounded-3xl border border-stone-800 shadow-xl shadow-stone-900/15 hover:-translate-y-0.5 transition-all duration-200">
          <div className="flex items-center justify-between text-xs font-bold text-stone-300 mb-1">
            <span>Struk Kasir</span>
            <div className="w-8 h-8 rounded-xl bg-white/10 text-white flex items-center justify-center shadow-xs">
              <ReceiptText className="w-4 h-4 stroke-[2.5]" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-white font-mono-num mt-1">
            {dailyReport.totalTransactions} struk
          </div>
          <div className="text-[11px] text-stone-400 font-medium mt-0.5">
            Selesai dilayani kasir
          </div>
        </div>

        {/* 3. Rata-rata Belanja: Warm Amber */}
        <div className="bg-gradient-to-br from-amber-500 to-orange-500 text-stone-950 p-5 rounded-3xl border border-amber-400 shadow-xl shadow-amber-500/15 hover:-translate-y-0.5 transition-all duration-200">
          <div className="flex items-center justify-between text-xs font-black text-stone-950 mb-1">
            <span>Rata-rata Belanja</span>
            <div className="w-8 h-8 rounded-xl bg-stone-950/15 text-stone-950 flex items-center justify-center shadow-xs">
              <ShoppingBag className="w-4 h-4 stroke-[2.5]" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-stone-950 font-mono-num mt-1">
            {formatRp(dailyReport.averageBasketValue)}
          </div>
          <div className="text-[11px] text-stone-900/80 font-bold mt-0.5">
            Nilai transaksi rata-rata
          </div>
        </div>

        {/* 4. Metode Terfavorit: Warm White Card */}
        <div className="bg-white text-stone-900 p-5 rounded-3xl border border-stone-200/90 shadow-sm hover:-translate-y-0.5 transition-all duration-200">
          <div className="flex items-center justify-between text-xs font-bold text-stone-500 mb-1">
            <span>Metode Favorit</span>
            <div className="w-8 h-8 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center shadow-xs">
              <TrendingUp className="w-4 h-4 stroke-[2.5]" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-orange-600 uppercase mt-1">
            {Object.entries(dailyReport.paymentMethodStats).sort((a, b) => b[1].count - a[1].count)[0]?.[0] || 'Tunai'}
          </div>
          <div className="text-[11px] text-stone-500 font-medium mt-0.5">
            Paling sering digunakan
          </div>
        </div>
      </div>

      {/* Hourly Sales Chart & Top Selling Box */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Hourly Chart (7 cols) */}
        <div className="lg:col-span-7 bg-white p-6 rounded-3xl border border-stone-200/90 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-stone-100 pb-3">
            <h3 className="text-xs font-black text-stone-900 flex items-center gap-2 uppercase tracking-wider">
              <Clock className="w-4 h-4 text-orange-600" />
              <span>Jam Sibuk Transaksi Toko (Peak Hours)</span>
            </h3>
            <span className="text-[11px] text-stone-500 font-mono-num font-bold">07:00 - 21:00</span>
          </div>

          <div className="h-44 pt-4 flex items-end justify-between gap-1.5 border-b border-stone-200/80">
            {dailyReport.hourlyStats.map(stat => {
              const maxHour = Math.max(...dailyReport.hourlyStats.map(s => s.total), 1);
              const heightPercent = Math.max(8, Math.round((stat.total / maxHour) * 100));

              return (
                <div key={stat.hour} className="flex-1 flex flex-col items-center group relative">
                  <div className="opacity-0 group-hover:opacity-100 absolute -top-10 bg-stone-900 text-white text-[10px] py-1 px-2 rounded-lg whitespace-nowrap transition-opacity pointer-events-none z-10 font-mono-num shadow-lg">
                    {formatRp(stat.total)} ({stat.count}x)
                  </div>
                  <div
                    style={{ height: `${heightPercent}%` }}
                    className={`w-full max-w-[24px] rounded-t-lg transition-all ${
                      stat.total > 0 ? 'bg-orange-600 group-hover:bg-orange-500' : 'bg-stone-100'
                    }`}
                  />
                  <span className="text-[10px] text-stone-400 mt-1 font-mono-num font-medium">
                    {stat.hour}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Top 3 Selling & Payment Breakdown (5 cols) */}
        <div className="lg:col-span-5 bg-white p-6 rounded-3xl border border-stone-200/90 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-stone-100 pb-3">
            <h3 className="text-xs font-black text-stone-900 uppercase tracking-wider">
              Produk Terlaris Hari Ini
            </h3>
            <span className="text-[11px] text-orange-700 font-bold bg-orange-50 px-2.5 py-0.5 rounded-full">
              Top Penjualan
            </span>
          </div>
          <div className="divide-y divide-stone-100 text-xs">
            {dailyReport.topProducts.slice(0, 3).map((p, idx) => (
              <div key={p.productId} className="py-2.5 first:pt-0 flex items-center justify-between">
                <span className="font-bold text-stone-800 truncate mr-2">
                  {idx + 1}. {p.name} <span className="text-stone-400 font-normal">({p.quantity}x)</span>
                </span>
                <span className="font-black text-stone-900 font-mono-num shrink-0">
                  {formatRp(p.revenue)}
                </span>
              </div>
            ))}
            {dailyReport.topProducts.length === 0 && (
              <div className="py-6 text-center text-stone-400 text-xs">
                Belum ada transaksi pada tanggal ini.
              </div>
            )}
          </div>

          <div className="pt-3 border-t border-stone-100 flex items-center justify-between text-[11px] text-stone-600 font-medium">
            <span>Tunai: <strong className="text-stone-900 font-bold">{formatRp(dailyReport.paymentMethodStats.cash.total)}</strong></span>
            <span>QRIS: <strong className="text-stone-900 font-bold">{formatRp(dailyReport.paymentMethodStats.qris.total)}</strong></span>
            <span>Transfer: <strong className="text-stone-900 font-bold">{formatRp(dailyReport.paymentMethodStats.transfer.total)}</strong></span>
          </div>
        </div>
      </div>

      {/* Filter by Invoice Search */}
      <div className="bg-white p-4 rounded-3xl border border-stone-200/90 shadow-sm flex items-center gap-3">
        <Search className="w-4 h-4 text-stone-400 shrink-0" />
        <input
          type="text"
          placeholder="Cari nomor struk invoice, nama kasir, atau nama pembeli..."
          value={searchInvoice}
          onChange={e => setSearchInvoice(e.target.value)}
          className="w-full text-xs sm:text-sm bg-transparent focus:outline-none font-semibold text-stone-900 placeholder:text-stone-400"
        />
        {searchInvoice && (
          <button
            onClick={() => setSearchInvoice('')}
            className="text-xs text-stone-400 hover:text-stone-600 px-2 py-1 rounded-lg"
          >
            ✕
          </button>
        )}
      </div>

      {/* Transactions List */}
      <div className="bg-white rounded-3xl border border-stone-200/90 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-stone-100 bg-stone-50/80 flex items-center justify-between">
          <h3 className="text-xs font-black text-stone-900 uppercase tracking-wider">
            Daftar Struk Transaksi ({filteredTransactions.length})
          </h3>
          <span className="text-xs text-stone-500 font-mono-num font-semibold">
            Tanggal: {selectedDate}
          </span>
        </div>

        <div className="divide-y divide-stone-100">
          {filteredTransactions.map(tx => (
            <div key={tx.id} className="p-5 hover:bg-stone-50/80 transition-colors">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <span className="font-black text-xs sm:text-sm text-stone-900 font-mono-num">
                    {tx.invoiceNumber}
                  </span>
                  <span className={`text-[10px] uppercase font-bold px-2.5 py-0.5 rounded-full border ${
                    tx.paymentMethod === 'cash'
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                      : tx.paymentMethod === 'qris'
                      ? 'bg-orange-50 text-orange-800 border-orange-200'
                      : tx.paymentMethod === 'transfer'
                      ? 'bg-stone-100 text-stone-800 border-stone-300'
                      : 'bg-amber-50 text-amber-800 border-amber-200'
                  }`}>
                    {tx.paymentMethod}
                  </span>
                  <span className="text-stone-300">·</span>
                  <span className="text-xs text-stone-500 font-mono-num font-medium">
                    {new Date(tx.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB
                  </span>
                  <span className="text-stone-300">·</span>
                  <span className="text-xs text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-md">
                    Lunas
                  </span>
                </div>

                <div className="flex items-center gap-4 self-end sm:self-center">
                  <div className="text-right">
                    <div className="text-base sm:text-lg font-black text-stone-900 font-mono-num">
                      {formatRp(tx.finalAmount)}
                    </div>
                    <div className="text-[11px] text-stone-500 font-medium font-mono-num">
                      {tx.totalItemsCount} item produk
                    </div>
                  </div>

                  <button
                    onClick={() => onOpenReceipt(tx)}
                    className="p-2 rounded-xl border border-stone-200 hover:bg-orange-50 hover:border-orange-300 hover:text-orange-600 text-stone-700 transition-colors cursor-pointer"
                    title="Cetak Ulang Struk"
                  >
                    <Printer className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Items in this receipt */}
              <div className="text-xs text-stone-600 bg-stone-50 p-3 rounded-2xl flex flex-wrap gap-x-4 gap-y-1.5 border border-stone-200/60">
                {tx.items.map((it, idx) => (
                  <span key={idx} className="flex items-center gap-1 font-medium">
                    <span>• {it.product.name}</span>
                    <span className="font-mono-num text-stone-400">
                      ({it.quantity}x{it.note ? ` · ${it.note}` : ''})
                    </span>
                  </span>
                ))}
                {tx.customerName && (
                  <span className="text-orange-800 font-bold">
                    Pelanggan: {tx.customerName}
                  </span>
                )}
                <span className="text-stone-400 font-mono-num">Kasir: {tx.cashierName}</span>
              </div>
            </div>
          ))}

          {filteredTransactions.length === 0 && (
            <div className="p-12 text-center text-stone-400 text-xs font-medium">
              Tidak ada data transaksi yang tercatat pada tanggal {selectedDate}.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
