import React, { useState, useMemo } from 'react';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid, 
  Cell 
} from 'recharts';
import { Transaction, DailySalesChartData } from '../types';
import { StorageService } from '../services/storage';
import { 
  TrendingUp, 
  ChevronDown, 
  ChevronUp, 
  DollarSign, 
  Calendar, 
  Sparkles,
  Award
} from 'lucide-react';

interface WeeklySalesDashboardProps {
  transactions: Transaction[];
}

export const WeeklySalesDashboard: React.FC<WeeklySalesDashboardProps> = ({ transactions }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const formatRp = (num: number) => 'Rp ' + num.toLocaleString('id-ID');

  const chartData: DailySalesChartData[] = useMemo(() => {
    return StorageService.getLast7DaysSales(transactions);
  }, [transactions]);

  // Aggregate stats
  const total7DaysOmset = useMemo(() => {
    return chartData.reduce((acc, it) => acc + it.omset, 0);
  }, [chartData]);

  const total7DaysTx = useMemo(() => {
    return chartData.reduce((acc, it) => acc + it.transaksiCount, 0);
  }, [chartData]);

  const avgDailyOmset = useMemo(() => {
    return Math.round(total7DaysOmset / 7);
  }, [total7DaysOmset]);

  const peakDay = useMemo(() => {
    return [...chartData].sort((a, b) => b.omset - a.omset)[0];
  }, [chartData]);

  // Custom Recharts Tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data: DailySalesChartData = payload[0].payload;
      return (
        <div className="bg-slate-900 text-white p-3 rounded-xl shadow-xl border border-slate-700 text-xs space-y-1 z-50 pointer-events-none">
          <div className="font-bold text-sky-400 flex items-center justify-between gap-4">
            <span>{data.dayName}</span>
            <span className="font-mono-num text-[11px] text-slate-300">{data.shortDate}</span>
          </div>
          <div className="pt-1 border-t border-slate-800 space-y-0.5">
            <div className="flex justify-between gap-4">
              <span className="text-slate-400">Total Omset:</span>
              <span className="font-bold font-mono-num text-white">{formatRp(data.omset)}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-slate-400">Jumlah Transaksi:</span>
              <span className="font-mono-num text-sky-300 font-semibold">{data.transaksiCount} struk</span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden mb-6 transition-all duration-200">
      {/* Header bar */}
      <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-sky-50 border border-sky-200 text-sky-700 flex items-center justify-center shadow-2xs">
            <TrendingUp className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-xs text-slate-900 tracking-tight">
                Grafik Omset Penjualan 7 Hari Terakhir
              </h3>
              <span className="text-[10px] text-sky-700 font-semibold bg-sky-50 border border-sky-100 px-2 py-0.5 rounded-full">
                Visual Dashboard
              </span>
            </div>
            <p className="text-[10px] text-slate-500">
              Perkembangan omset harian kasir toko frozen food secara real-time
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden sm:block text-right">
            <span className="text-[10px] text-slate-400 block">Total Omset 7 Hari</span>
            <span className="text-xs font-black text-slate-900 font-mono-num">
              {formatRp(total7DaysOmset)}
            </span>
          </div>

          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-lg transition-colors"
            title={isCollapsed ? 'Tampilkan Grafik' : 'Sembunyikan Grafik'}
          >
            {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Collapsible Content */}
      {!isCollapsed && (
        <div className="p-5 space-y-4">
          {/* Quick Metrics Strip */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
              <div className="text-[10px] text-slate-500 mb-0.5">Total Omset 7 Hari</div>
              <div className="text-sm font-black text-slate-900 font-mono-num">
                {formatRp(total7DaysOmset)}
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
              <div className="text-[10px] text-slate-500 mb-0.5">Rata-rata / Hari</div>
              <div className="text-sm font-bold text-slate-800 font-mono-num">
                {formatRp(avgDailyOmset)}
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
              <div className="text-[10px] text-slate-500 mb-0.5">Total Transaksi</div>
              <div className="text-sm font-black text-indigo-700 font-mono-num">
                {total7DaysTx} Struk
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
              <div className="text-[10px] text-slate-500 mb-0.5 flex items-center gap-1">
                <Award className="w-3 h-3 text-amber-500" />
                <span>Hari Tertinggi</span>
              </div>
              <div className="text-sm font-bold text-sky-900 font-mono-num truncate">
                {peakDay ? `${peakDay.dayName} (${formatRp(peakDay.omset)})` : '-'}
              </div>
            </div>
          </div>

          {/* Recharts Bar Chart Container */}
          <div className="w-full h-56 pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                margin={{ top: 12, right: 12, left: -10, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis
                  dataKey="shortDate"
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  axisLine={{ stroke: '#e2e8f0' }}
                  tickLine={false}
                />
                <YAxis
                  tickFormatter={val =>
                    val >= 1000000
                      ? `${(val / 1000000).toFixed(1)}jt`
                      : `${Math.round(val / 1000)}rb`
                  }
                  tick={{ fontSize: 10, fill: '#64748b' }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar
                  dataKey="omset"
                  radius={[6, 6, 0, 0]}
                  maxBarSize={48}
                  animationDuration={800}
                >
                  {chartData.map((entry, index) => {
                    const isToday = index === chartData.length - 1;
                    return (
                      <Cell
                        key={`cell-${index}`}
                        fill={isToday ? '#0284c7' : '#38bdf8'}
                        className="hover:opacity-85 transition-opacity cursor-pointer"
                      />
                    );
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Chart Legend / Note */}
          <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-100">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-sky-400" />
                <span>6 Hari Sebelumnya</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-sky-700" />
                <span className="font-semibold text-slate-700">Hari Ini</span>
              </span>
            </div>
            <span>Arahkan kursor / sentuh batang untuk melihat rincian omset &amp; laba</span>
          </div>
        </div>
      )}
    </div>
  );
};
