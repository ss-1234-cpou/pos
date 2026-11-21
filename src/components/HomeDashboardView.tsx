import React, { useMemo, useState } from 'react';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid, 
  Cell,
  ReferenceLine,
  LabelList
} from 'recharts';
import { Transaction, StoreSettings, DailySalesChartData } from '../types';
import { StorageService } from '../services/storage';
import { 
  TrendingUp, 
  ReceiptText, 
  Package, 
  Share2, 
  ArrowRight, 
  Wallet, 
  QrCode, 
  Building2, 
  CreditCard,
  Calendar,
  Clock,
  Sparkles,
  Award,
  ChevronRight,
  UserCircle2,
  ShoppingBag,
  BarChart3,
  Flame,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import { MainNavMenu } from './Sidebar';

interface HomeDashboardViewProps {
  transactions: Transaction[];
  settings: StoreSettings;
  onNavigateMenu: (menu: MainNavMenu) => void;
  onUpdateSettings?: (settings: StoreSettings) => void;
}

export const HomeDashboardView: React.FC<HomeDashboardViewProps> = ({
  transactions,
  settings,
  onNavigateMenu,
}) => {
  const formatRp = (num: number) => 'Rp ' + num.toLocaleString('id-ID');

  // Metric selector for the 7-day BarChart
  const [chartMetric, setChartMetric] = useState<'omset' | 'transaksi' | 'laba'>('omset');

  // Greeting based on time of day
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour >= 4 && hour < 11) return 'Selamat Pagi';
    if (hour >= 11 && hour < 15) return 'Selamat Siang';
    if (hour >= 15 && hour < 18) return 'Selamat Sore';
    return 'Selamat Malam';
  }, []);

  // Today ISO & formatted string (contoh: 30 Okt 2026)
  const todayStr = new Date().toISOString().split('T')[0];
  const activeDateFormatted = useMemo(() => {
    return new Date().toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  }, []);

  // Status waktu pembaruan terakhir (contoh: "Diperbarui 07:11 WIB")
  const [refreshKey] = useState(0);
  const lastUpdateTime = useMemo(() => {
    if (transactions.length > 0) {
      const latestTx = [...transactions].sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      )[0];
      const d = new Date(latestTx.timestamp);
      const hh = String(d.getHours()).padStart(2, '0');
      const mm = String(d.getMinutes()).padStart(2, '0');
      return `Diperbarui ${hh}:${mm} WIB`;
    }
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    return `Diperbarui ${hh}:${mm} WIB`;
  }, [transactions, refreshKey]);

  // Calculate today's report
  const todayReport = useMemo(() => {
    return StorageService.calculateDailyReport(todayStr);
  }, [todayStr, transactions]);

  // Calculate Penjualan Minggu Ini (dari Senin minggu berjalan s/d hari ini)
  const { thisWeekSales, thisWeekCount } = useMemo(() => {
    const now = new Date();
    const currentDay = now.getDay(); // 0 is Sunday
    const distanceToMonday = (currentDay + 6) % 7;
    const monday = new Date(now);
    monday.setDate(now.getDate() - distanceToMonday);
    monday.setHours(0, 0, 0, 0);

    const weekTxs = transactions.filter(tx => new Date(tx.timestamp) >= monday);
    const sum = weekTxs.reduce((acc, tx) => acc + (tx.finalAmount || 0), 0);
    return { thisWeekSales: sum, thisWeekCount: weekTxs.length };
  }, [transactions]);

  // Calculate Penjualan Bulan Ini (dari tgl 1 bulan berjalan s/d hari ini)
  const { thisMonthSales, thisMonthCount } = useMemo(() => {
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    firstDayOfMonth.setHours(0, 0, 0, 0);

    const monthTxs = transactions.filter(tx => new Date(tx.timestamp) >= firstDayOfMonth);
    const sum = monthTxs.reduce((acc, tx) => acc + (tx.finalAmount || 0), 0);
    return { thisMonthSales: sum, thisMonthCount: monthTxs.length };
  }, [transactions]);

  // 7 days data for Recharts
  const chartData: DailySalesChartData[] = useMemo(() => {
    return StorageService.getLast7DaysSales(transactions);
  }, [transactions]);

  // Total 7 days metrics
  const total7DaysOmset = useMemo(() => {
    return chartData.reduce((acc, it) => acc + it.omset, 0);
  }, [chartData]);

  const total7DaysTransaksi = useMemo(() => {
    return chartData.reduce((acc, it) => acc + it.transaksiCount, 0);
  }, [chartData]);

  const total7DaysLaba = useMemo(() => {
    return chartData.reduce((acc, it) => acc + it.laba, 0);
  }, [chartData]);

  // Averages
  const avgDailyOmset = useMemo(() => {
    return Math.round(total7DaysOmset / 7);
  }, [total7DaysOmset]);

  const avgDailyTransaksi = useMemo(() => {
    return Math.round((total7DaysTransaksi / 7) * 10) / 10;
  }, [total7DaysTransaksi]);

  const avgDailyLaba = useMemo(() => {
    return Math.round(total7DaysLaba / 7);
  }, [total7DaysLaba]);

  // Peak day based on current active metric
  const peakDay = useMemo(() => {
    return [...chartData].sort((a, b) => {
      if (chartMetric === 'transaksi') return b.transaksiCount - a.transaksiCount;
      if (chartMetric === 'laba') return b.laba - a.laba;
      return b.omset - a.omset;
    })[0];
  }, [chartData, chartMetric]);

  // Growth rate today vs yesterday
  const growthRate = useMemo(() => {
    if (chartData.length < 2) return null;
    const today = chartData[chartData.length - 1];
    const yesterday = chartData[chartData.length - 2];
    const valToday = chartMetric === 'transaksi' ? today.transaksiCount : chartMetric === 'laba' ? today.laba : today.omset;
    const valYest = chartMetric === 'transaksi' ? yesterday.transaksiCount : chartMetric === 'laba' ? yesterday.laba : yesterday.omset;
    if (valYest === 0) return valToday > 0 ? 100 : 0;
    return Math.round(((valToday - valYest) / valYest) * 100);
  }, [chartData, chartMetric]);

  // Active reference line value
  const activeReferenceValue = useMemo(() => {
    if (chartMetric === 'transaksi') return avgDailyTransaksi;
    if (chartMetric === 'laba') return avgDailyLaba;
    return avgDailyOmset;
  }, [chartMetric, avgDailyTransaksi, avgDailyLaba, avgDailyOmset]);

  const formatMetricVal = (val: number) => {
    if (chartMetric === 'transaksi') return `${val} transaksi`;
    return formatRp(val);
  };

  // Custom Recharts Tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data: DailySalesChartData = payload[0].payload;
      const marginPercent = data.omset > 0 ? Math.round((data.laba / data.omset) * 100) : 0;
      const aov = data.transaksiCount > 0 ? Math.round(data.omset / data.transaksiCount) : 0;

      return (
        <div className="bg-stone-950/95 backdrop-blur-md text-white p-4 rounded-2xl shadow-2xl border border-orange-500/40 text-xs space-y-2 z-50 pointer-events-none animate-fadeIn min-w-[220px]">
          <div className="font-extrabold text-orange-300 flex items-center justify-between gap-4 border-b border-stone-800 pb-2">
            <span className="text-sm font-black">{data.dayName}</span>
            <span className="font-mono-num text-[11px] text-stone-300 bg-stone-900 px-2 py-0.5 rounded border border-stone-700">
              {data.shortDate}
            </span>
          </div>
          <div className="space-y-1.5 pt-0.5">
            <div className="flex justify-between items-center gap-4">
              <span className="text-stone-400 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-orange-500" />
                <span>Total Omset:</span>
              </span>
              <span className="font-black font-mono-num text-amber-300 text-sm">
                {formatRp(data.omset)}
              </span>
            </div>
            <div className="flex justify-between items-center gap-4">
              <span className="text-stone-400 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <span>Estimasi Laba:</span>
              </span>
              <span className="font-bold font-mono-num text-emerald-400">
                {formatRp(data.laba)} <span className="text-[10px] text-stone-400 font-normal">({marginPercent}%)</span>
              </span>
            </div>
            <div className="flex justify-between items-center gap-4">
              <span className="text-stone-400 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-blue-400" />
                <span>Total Struk:</span>
              </span>
              <span className="font-mono-num text-stone-200 font-bold">
                {data.transaksiCount} transaksi
              </span>
            </div>
            <div className="flex justify-between items-center gap-4 pt-1.5 border-t border-stone-800 text-[11px]">
              <span className="text-stone-500">Rata-rata/Struk:</span>
              <span className="font-mono-num text-stone-300 font-medium">{formatRp(aov)}</span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  const cashierName = settings.activeCashierName || 'Kasir';

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-8 py-6 space-y-6 animate-fadeIn">
      
      {/* 1. BAGIAN SAPAAN (HEADER): RAMAH & BERSIH DI ATAS LATAR BELAKANG HANGAT */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-orange-50/60 border border-orange-200/60 rounded-3xl p-5 sm:p-6 shadow-2xs">
        <div className="flex items-center gap-4">
          {/* Avatar Kasir Aktif */}
          <div className="w-13 h-13 rounded-2xl bg-orange-600 text-white flex items-center justify-center font-bold shadow-md shadow-orange-600/20 overflow-hidden shrink-0 border-2 border-white">
            {settings.cashierLogoUrl ? (
              <img src={settings.cashierLogoUrl} alt={cashierName} className="w-full h-full object-cover" />
            ) : (
              <UserCircle2 className="w-8 h-8" />
            )}
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-stone-900 tracking-tight">
                {greeting}, {cashierName}
              </h1>
              <span className="inline-block animate-pulse">👋</span>
            </div>
            <p className="text-xs sm:text-sm text-stone-600 font-medium mt-0.5">
              Semangat melayani di <strong className="text-orange-700 font-bold">{settings.storeName}</strong>. Berikut rekap penjualan toko Anda:
            </p>
          </div>
        </div>

        {/* Status Mode Kasir */}
        <div className="flex items-center gap-2 self-start sm:self-center">
          <button
            type="button"
            onClick={() => onNavigateMenu('payment')}
            className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-2xl text-xs font-bold flex items-center gap-2 transition-all shadow-md shadow-orange-600/20 active:scale-95 cursor-pointer"
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>Mulai Transaksi</span>
          </button>
        </div>
      </div>

      {/* 2. KARTU RINGKASAN UTAMA (MAIN SUMMARY CARD) */}
      <div className="bg-white rounded-3xl border border-stone-200/90 shadow-sm hover:shadow-md transition-all p-6 sm:p-8 space-y-6">
        
        {/* Baris Atas Kartu: Tanggal Aktif, Waktu Update & Tautan 'Detail >' */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-100 pb-4">
          <div className="flex items-center gap-2.5">
            <span className="flex items-center gap-1.5 text-xs font-extrabold text-stone-800 bg-stone-100 px-3 py-1.5 rounded-xl border border-stone-200">
              <Calendar className="w-3.5 h-3.5 text-orange-600" />
              <span>{activeDateFormatted}</span>
            </span>
            <span className="text-[11px] font-bold text-orange-700 bg-orange-50 px-2.5 py-1 rounded-lg border border-orange-200/80">
              Hari Ini
            </span>
          </div>

          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1 text-[11px] font-medium text-stone-500">
              <Clock className="w-3.5 h-3.5 text-stone-400" />
              <span>{lastUpdateTime}</span>
            </span>

            {/* Tautan / Tombol 'Detail >' */}
            <button
              type="button"
              onClick={() => onNavigateMenu('history')}
              className="text-xs font-black text-orange-600 hover:text-orange-700 flex items-center gap-1 hover:gap-1.5 transition-all cursor-pointer py-1 px-2 rounded-lg hover:bg-orange-50"
              title="Lihat rincian transaksi lengkap di History Penjualan"
            >
              <span>Detail</span>
              <ChevronRight className="w-4 h-4 stroke-[3]" />
            </button>
          </div>
        </div>

        {/* Bagian Tengah: Total Nominal Penjualan Hari Ini */}
        <div className="space-y-2">
          <div className="text-xs font-bold uppercase tracking-wider text-stone-500 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-orange-500" />
            <span>Ringkasan Transaksi Hari Ini</span>
          </div>

          <div className="flex flex-col md:flex-row md:items-baseline justify-between gap-4">
            <div>
              <div className="text-4xl sm:text-5xl lg:text-6xl font-black font-mono-num tracking-tight text-stone-900">
                {formatRp(todayReport.totalRevenue)}
              </div>
              <div className="flex flex-wrap items-center gap-2.5 text-xs text-stone-600 mt-2 font-medium">
                <span className="px-3 py-1 rounded-xl bg-orange-50 text-orange-800 font-bold border border-orange-200">
                  {todayReport.totalTransactions} Struk Selesai
                </span>
                <span aria-hidden="true" className="text-stone-300">•</span>
                <span>
                  Rata-rata: <strong className="font-bold text-stone-800 font-mono-num">{formatRp(todayReport.averageBasketValue)}</strong> / transaksi
                </span>
                {todayReport.totalRevenue > 0 && (
                  <>
                    <span aria-hidden="true" className="text-stone-300">•</span>
                    <span className="text-emerald-700 font-bold">
                      Estimasi Laba: {formatRp(todayReport.totalProfit)}
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* Tombol Bagikan Rekap WA */}
            <div className="self-start md:self-center shrink-0">
              <a
                href={StorageService.generateWhatsAppReport(todayReport, settings)}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2.5 rounded-2xl bg-stone-100 hover:bg-stone-200 text-stone-800 font-bold text-xs border border-stone-200 flex items-center gap-2 transition-all shadow-2xs active:scale-95 cursor-pointer"
                title="Kirim laporan penjualan harian langsung ke WhatsApp pemilik toko"
              >
                <Share2 className="w-3.5 h-3.5 text-emerald-600 stroke-[2.5]" />
                <span>Kirim Rekap WA</span>
              </a>
            </div>
          </div>
        </div>

        {/* 3. RINGKASAN PERIODE (MINGGUAN & BULANAN): GARIS PEMISAH TIPIS & REKAP RINGKAS */}
        <div className="border-t border-stone-100 pt-5 mt-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            {/* Rekap Penjualan Minggu Ini */}
            <div className="p-4 rounded-2xl bg-[#FAF7F2] border border-stone-200/80 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-stone-500 uppercase tracking-wider block mb-1">
                  Penjualan Minggu Ini
                </span>
                <div className="text-xl sm:text-2xl font-black font-mono-num text-stone-900">
                  {formatRp(thisWeekSales)}
                </div>
                <span className="text-[11px] text-stone-500 font-medium">
                  {thisWeekCount} Transaksi tercatat minggu ini
                </span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-orange-100 text-orange-700 flex items-center justify-center font-bold shrink-0">
                <TrendingUp className="w-5 h-5 stroke-[2.5]" />
              </div>
            </div>

            {/* Rekap Penjualan Bulan Ini */}
            <div className="p-4 rounded-2xl bg-[#FAF7F2] border border-stone-200/80 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-stone-500 uppercase tracking-wider block mb-1">
                  Penjualan Bulan Ini
                </span>
                <div className="text-xl sm:text-2xl font-black font-mono-num text-stone-900">
                  {formatRp(thisMonthSales)}
                </div>
                <span className="text-[11px] text-stone-500 font-medium">
                  {thisMonthCount} Transaksi tercatat bulan ini
                </span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold shrink-0">
                <ReceiptText className="w-5 h-5 stroke-[2.5]" />
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* 4. GRAFIK BATANG RECHARTS: TREN PENJUALAN 7 HARI TERAKHIR (SUPER INFORMATIF) */}
      <div className="bg-white rounded-3xl border border-stone-200/90 shadow-sm p-6 sm:p-7 space-y-5 hover:shadow-md transition-all duration-300">
        
        {/* Header Grafik & Switcher Metrik Interaktif */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-stone-100 pb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-orange-100 text-orange-700 flex items-center justify-center font-bold shadow-xs shrink-0">
              <BarChart3 className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-base sm:text-lg text-stone-900 tracking-tight">
                  Grafik Batang Tren Penjualan 7 Hari Terakhir
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-orange-100 text-orange-800 border border-orange-200">
                  Recharts Visual
                </span>
              </div>
              <p className="text-xs text-stone-500 mt-0.5">
                Visualisasi komparasi harian omset, jumlah transaksi, dan laba kotor toko.
              </p>
            </div>
          </div>

          {/* Metric Selector Tabs */}
          <div className="flex items-center gap-1.5 bg-stone-100/90 p-1 rounded-2xl border border-stone-200/80 self-start lg:self-center">
            <button
              type="button"
              onClick={() => setChartMetric('omset')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                chartMetric === 'omset'
                  ? 'bg-white text-orange-700 shadow-xs border border-orange-200'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              Total Omset (Rp)
            </button>
            <button
              type="button"
              onClick={() => setChartMetric('transaksi')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                chartMetric === 'transaksi'
                  ? 'bg-white text-orange-700 shadow-xs border border-orange-200'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              Jumlah Transaksi
            </button>
            <button
              type="button"
              onClick={() => setChartMetric('laba')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                chartMetric === 'laba'
                  ? 'bg-white text-orange-700 shadow-xs border border-orange-200'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              Estimasi Laba
            </button>
          </div>
        </div>

        {/* 4 Kartu Metrik Ringkas Informatif di Atas Grafik */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-[#FAF7F2] p-3.5 rounded-2xl border border-stone-200/80">
            <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500 block">Total 7 Hari</span>
            <div className="text-base sm:text-lg font-black font-mono-num text-stone-900 mt-0.5">
              {chartMetric === 'transaksi' 
                ? `${total7DaysTransaksi} Transaksi` 
                : formatRp(chartMetric === 'laba' ? total7DaysLaba : total7DaysOmset)}
            </div>
          </div>

          <div className="bg-[#FAF7F2] p-3.5 rounded-2xl border border-stone-200/80">
            <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500 block">Rata-rata Harian</span>
            <div className="text-base sm:text-lg font-black font-mono-num text-orange-700 mt-0.5">
              {chartMetric === 'transaksi' 
                ? `${avgDailyTransaksi} / hari` 
                : `${formatRp(chartMetric === 'laba' ? avgDailyLaba : avgDailyOmset)}/hr`}
            </div>
          </div>

          <div className="bg-[#FAF7F2] p-3.5 rounded-2xl border border-stone-200/80">
            <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500 block">Hari Tertinggi</span>
            <div className="text-base sm:text-lg font-black font-mono-num text-amber-700 mt-0.5 truncate">
              {peakDay ? `${peakDay.dayName} (${chartMetric === 'transaksi' ? `${peakDay.transaksiCount}x` : formatRp(chartMetric === 'laba' ? peakDay.laba : peakDay.omset)})` : '-'}
            </div>
          </div>

          <div className="bg-[#FAF7F2] p-3.5 rounded-2xl border border-stone-200/80">
            <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500 block">Hari Ini vs Kemarin</span>
            <div className={`text-base sm:text-lg font-black font-mono-num mt-0.5 flex items-center gap-1 ${
              (growthRate || 0) >= 0 ? 'text-emerald-700' : 'text-rose-600'
            }`}>
              {(growthRate || 0) >= 0 ? <ArrowUpRight className="w-4 h-4 stroke-[2.5]" /> : <ArrowDownRight className="w-4 h-4 stroke-[2.5]" />}
              <span>{growthRate !== null ? `${growthRate >= 0 ? '+' : ''}${growthRate}%` : 'Stabil'}</span>
            </div>
          </div>
        </div>

        {/* Recharts Bar Chart Area */}
        <div className="w-full h-72 pt-3">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 24, right: 16, left: -8, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f5f5f4" />
              <XAxis
                dataKey="shortDate"
                tick={{ fontSize: 11, fill: '#78716c', fontWeight: 600 }}
                axisLine={{ stroke: '#e7e5e4' }}
                tickLine={false}
              />
              <YAxis
                tickFormatter={val => {
                  if (chartMetric === 'transaksi') return `${val}`;
                  if (val >= 1000000) return `${(val / 1000000).toFixed(1)}jt`;
                  return `${Math.round(val / 1000)}rb`;
                }}
                tick={{ fontSize: 10, fill: '#78716c', fontWeight: 600 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<CustomTooltip />} />
              <ReferenceLine
                y={activeReferenceValue}
                stroke="#f97316"
                strokeDasharray="4 4"
                strokeWidth={1.5}
                label={{
                  value: `Rata-rata: ${formatMetricVal(activeReferenceValue)}`,
                  position: 'insideTopRight',
                  fill: '#ea580c',
                  fontSize: 10,
                  fontWeight: 700,
                }}
              />
              <Bar
                dataKey={chartMetric === 'transaksi' ? 'transaksiCount' : chartMetric === 'laba' ? 'laba' : 'omset'}
                radius={[8, 8, 0, 0]}
                maxBarSize={52}
                animationDuration={900}
              >
                <LabelList
                  dataKey={chartMetric === 'transaksi' ? 'transaksiCount' : chartMetric === 'laba' ? 'laba' : 'omset'}
                  position="top"
                  formatter={(val: any) => {
                    const num = Number(val);
                    if (!num || num === 0) return '';
                    if (chartMetric === 'transaksi') return `${num}x`;
                    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}jt`;
                    return `${Math.round(num / 1000)}rb`;
                  }}
                  style={{ fontSize: 10, fill: '#78716c', fontWeight: 700 }}
                />
                {chartData.map((entry, index) => {
                  const isToday = index === chartData.length - 1;
                  const isPeak = entry.dateKey === peakDay?.dateKey;
                  let fill = '#fb923c'; // warm terracotta standard
                  if (isToday) {
                    fill = '#ea580c'; // prominent terracotta/orange for today
                  } else if (isPeak) {
                    fill = '#f59e0b'; // golden amber for peak day
                  }
                  return (
                    <Cell
                      key={`cell-${index}`}
                      fill={fill}
                      className="hover:opacity-85 transition-opacity cursor-pointer"
                    />
                  );
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Chart Legend & Insights */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between text-xs text-stone-500 pt-3 border-t border-stone-100 gap-3">
          <div className="flex flex-wrap items-center gap-4">
            <span className="flex items-center gap-1.5 font-semibold text-stone-600">
              <span className="w-3 h-3 rounded-md bg-orange-400 shadow-xs" />
              <span>Hari Sebelumnya</span>
            </span>
            <span className="flex items-center gap-1.5 font-bold text-amber-600">
              <span className="w-3 h-3 rounded-md bg-amber-500 shadow-xs" />
              <span>Hari Puncak Tertinggi</span>
            </span>
            <span className="flex items-center gap-1.5 font-bold text-orange-700">
              <span className="w-3 h-3 rounded-md bg-orange-600 shadow-xs" />
              <span>Hari Ini (Aktif)</span>
            </span>
          </div>

          <div className="text-stone-500 text-[11px] font-medium flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />
            <span>Garis oranye putus-putus menunjukkan ambang rata-rata 7 hari</span>
          </div>
        </div>

      </div>

      {/* 5. METODE PEMBAYARAN & PRODUK TERLARIS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Metode Pembayaran Masuk Hari Ini */}
        <div className="bg-white rounded-3xl border border-stone-200/90 shadow-sm p-6 space-y-4 hover:shadow-md transition-all duration-300">
          <div className="flex items-center justify-between border-b border-stone-100 pb-3">
            <h4 className="text-xs font-black text-stone-900 uppercase tracking-wider flex items-center gap-2">
              <div className="w-7 h-7 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center font-bold">
                <Wallet className="w-4 h-4" />
              </div>
              <span>Metode Pembayaran Hari Ini</span>
            </h4>
            <span className="text-xs font-bold text-orange-700 font-mono-num bg-orange-50 border border-orange-200 px-3 py-0.5 rounded-full">
              {todayReport.totalTransactions} Transaksi
            </span>
          </div>

          <div className="space-y-2.5 text-xs">
            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-stone-50 border border-stone-200/80">
              <span className="flex items-center gap-3 text-stone-800 font-bold">
                <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                  <Wallet className="w-4 h-4" />
                </div>
                <span>Tunai (Cash)</span>
              </span>
              <div className="text-right">
                <span className="font-black text-stone-900 font-mono-num text-sm">
                  {formatRp(todayReport.paymentMethodStats.cash.total)}
                </span>
                <span className="text-[11px] text-emerald-700 font-bold ml-1.5 font-mono-num">
                  ({todayReport.paymentMethodStats.cash.count}x)
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-orange-50/60 border border-orange-200/70">
              <span className="flex items-center gap-3 text-stone-800 font-bold">
                <div className="w-8 h-8 rounded-xl bg-orange-600 text-white flex items-center justify-center shadow-xs">
                  <QrCode className="w-4 h-4" />
                </div>
                <span>QRIS Dinamis</span>
              </span>
              <div className="text-right">
                <span className="font-black text-stone-900 font-mono-num text-sm">
                  {formatRp(todayReport.paymentMethodStats.qris.total)}
                </span>
                <span className="text-[11px] text-orange-700 font-bold ml-1.5 font-mono-num">
                  ({todayReport.paymentMethodStats.qris.count}x)
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-stone-50 border border-stone-200/80">
              <span className="flex items-center gap-3 text-stone-800 font-bold">
                <div className="w-8 h-8 rounded-xl bg-stone-800 text-white flex items-center justify-center shadow-xs">
                  <Building2 className="w-4 h-4" />
                </div>
                <span>Transfer Bank</span>
              </span>
              <div className="text-right">
                <span className="font-black text-stone-900 font-mono-num text-sm">
                  {formatRp(todayReport.paymentMethodStats.transfer.total)}
                </span>
                <span className="text-[11px] text-stone-600 font-bold ml-1.5 font-mono-num">
                  ({todayReport.paymentMethodStats.transfer.count}x)
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-amber-50/60 border border-amber-200/70">
              <span className="flex items-center gap-3 text-stone-800 font-bold">
                <div className="w-8 h-8 rounded-xl bg-amber-600 text-white flex items-center justify-center shadow-xs">
                  <CreditCard className="w-4 h-4" />
                </div>
                <span>Debit / EDC</span>
              </span>
              <div className="text-right">
                <span className="font-black text-stone-900 font-mono-num text-sm">
                  {formatRp(todayReport.paymentMethodStats.debit.total)}
                </span>
                <span className="text-[11px] text-amber-800 font-bold ml-1.5 font-mono-num">
                  ({todayReport.paymentMethodStats.debit.count}x)
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Produk Terlaris Hari Ini */}
        <div className="bg-white rounded-3xl border border-stone-200/90 shadow-sm p-6 space-y-4 hover:shadow-md transition-all duration-300">
          <div className="flex items-center justify-between border-b border-stone-100 pb-3">
            <h4 className="text-xs font-black text-stone-900 uppercase tracking-wider flex items-center gap-2">
              <div className="w-7 h-7 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
                <Award className="w-4 h-4" />
              </div>
              <span>Produk Terlaris Hari Ini</span>
            </h4>
            <button
              onClick={() => onNavigateMenu('products')}
              className="text-xs text-orange-600 font-bold hover:text-orange-700 transition-colors cursor-pointer"
            >
              Lihat Semua →
            </button>
          </div>

          <div className="divide-y divide-stone-100 text-xs">
            {todayReport.topProducts.slice(0, 4).map((p, idx) => (
              <div key={p.productId} className="py-3 first:pt-1 flex items-center justify-between hover:bg-stone-50 rounded-xl px-2 transition-colors">
                <div className="min-w-0 pr-2 flex items-center gap-3">
                  <span className={`w-6 h-6 rounded-lg flex items-center justify-center text-[11px] font-black shrink-0 ${
                    idx === 0 ? 'bg-amber-400 text-stone-950 shadow-xs' :
                    idx === 1 ? 'bg-stone-200 text-stone-800' :
                    idx === 2 ? 'bg-orange-500 text-white' :
                    'bg-stone-100 text-stone-600'
                  }`}>
                    {idx + 1}
                  </span>
                  <div>
                    <div className="font-bold text-stone-900 truncate">
                      {p.name}
                    </div>
                    <div className="text-[11px] text-stone-500 font-mono-num">
                      Terjual {p.quantity} bungkus/satuan
                    </div>
                  </div>
                </div>
                <div className="font-black text-stone-900 font-mono-num shrink-0 text-right">
                  {formatRp(p.revenue)}
                </div>
              </div>
            ))}
            {todayReport.topProducts.length === 0 && (
              <div className="py-10 text-center text-stone-400 text-xs font-medium">
                Belum ada produk yang terjual hari ini.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 6. PINTASAN MENU CEPAT */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
        <button
          onClick={() => onNavigateMenu('payment')}
          className="p-5 rounded-3xl bg-white hover:bg-orange-50/50 border border-stone-200/90 hover:border-orange-400 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-200 text-left flex items-center justify-between group cursor-pointer"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-orange-600 to-amber-600 text-white flex items-center justify-center shadow-md shadow-orange-600/20 group-hover:scale-105 transition-transform">
              <CreditCard className="w-6 h-6" />
            </div>
            <div>
              <div className="text-sm font-black text-stone-900">Pembayaran Kasir</div>
              <div className="text-xs text-stone-500">Scan barcode &amp; cetak struk</div>
            </div>
          </div>
          <ArrowRight className="w-5 h-5 text-stone-400 group-hover:text-orange-600 group-hover:translate-x-1 transition-all" />
        </button>

        <button
          onClick={() => onNavigateMenu('history')}
          className="p-5 rounded-3xl bg-white hover:bg-stone-50 border border-stone-200/90 hover:border-stone-400 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-200 text-left flex items-center justify-between group cursor-pointer"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-stone-800 to-stone-950 text-white flex items-center justify-center shadow-md shadow-stone-900/20 group-hover:scale-105 transition-transform">
              <ReceiptText className="w-6 h-6" />
            </div>
            <div>
              <div className="text-sm font-black text-stone-900">History Penjualan</div>
              <div className="text-xs text-stone-500">Cek rekap struk &amp; CSV</div>
            </div>
          </div>
          <ArrowRight className="w-5 h-5 text-stone-400 group-hover:text-stone-900 group-hover:translate-x-1 transition-all" />
        </button>

        <button
          onClick={() => onNavigateMenu('products')}
          className="p-5 rounded-3xl bg-white hover:bg-amber-50/50 border border-stone-200/90 hover:border-amber-400 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-200 text-left flex items-center justify-between group cursor-pointer"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-600 to-orange-500 text-white flex items-center justify-center shadow-md shadow-amber-600/20 group-hover:scale-105 transition-transform">
              <Package className="w-6 h-6" />
            </div>
            <div>
              <div className="text-sm font-black text-stone-900">Daftar Produk</div>
              <div className="text-xs text-stone-500">Katalog sayur &amp; freezer</div>
            </div>
          </div>
          <ArrowRight className="w-5 h-5 text-stone-400 group-hover:text-amber-600 group-hover:translate-x-1 transition-all" />
        </button>
      </div>

    </div>
  );
};
