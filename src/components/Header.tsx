import React from 'react';
import { Lock, Store, Cloud, Check } from 'lucide-react';

interface HeaderProps {
  currentMode: 'cashier' | 'owner';
  onSwitchMode: (mode: 'cashier' | 'owner') => void;
  onOpenOwnerPin: () => void;
  activeSection: string;
  setActiveSection: (section: string) => void;
  storeName: string;
  lastSyncTime?: string;
}

export const Header: React.FC<HeaderProps> = ({
  currentMode,
  onSwitchMode,
  onOpenOwnerPin,
  activeSection,
  setActiveSection,
  storeName,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-xs border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between gap-8 h-16">
        {/* Zone 1: Brand wordmark */}
        <div className="flex items-center gap-2.5 whitespace-nowrap shrink-0">
          <div className="w-8 h-8 rounded-lg bg-sky-600 text-white flex items-center justify-center font-bold text-base shadow-xs">
            ❄️
          </div>
          <span className="text-lg font-bold tracking-tight text-slate-900">
            {storeName}
          </span>
        </div>

        {/* Zone 2: 4-5 single-line navigation links */}
        <nav className="hidden md:flex items-center gap-6 text-xs font-medium text-slate-600">
          <button
            onClick={() => {
              if (currentMode === 'owner') onSwitchMode('cashier');
              setActiveSection('pos');
            }}
            className={`transition-colors whitespace-nowrap shrink-0 pb-0.5 border-b-2 ${
              currentMode === 'cashier' && activeSection === 'pos'
                ? 'border-sky-600 text-sky-800 font-bold'
                : 'border-transparent hover:text-slate-900'
            }`}
          >
            Kasir POS
          </button>

          <button
            onClick={() => {
              if (currentMode === 'cashier') onOpenOwnerPin();
              else setActiveSection('stok');
            }}
            className={`transition-colors whitespace-nowrap shrink-0 pb-0.5 border-b-2 ${
              currentMode === 'owner' && activeSection === 'stok'
                ? 'border-sky-600 text-sky-800 font-bold'
                : 'border-transparent hover:text-slate-900'
            }`}
          >
            Manajemen Stok
          </button>

          <button
            onClick={() => {
              if (currentMode === 'cashier') onOpenOwnerPin();
              else setActiveSection('ringkasan');
            }}
            className={`transition-colors whitespace-nowrap shrink-0 pb-0.5 border-b-2 ${
              currentMode === 'owner' && activeSection === 'ringkasan'
                ? 'border-sky-600 text-sky-800 font-bold'
                : 'border-transparent hover:text-slate-900'
            }`}
          >
            Laporan Omset Harian
          </button>

          <button
            onClick={() => {
              if (currentMode === 'cashier') onOpenOwnerPin();
              else setActiveSection('transaksi');
            }}
            className={`transition-colors whitespace-nowrap shrink-0 pb-0.5 border-b-2 ${
              currentMode === 'owner' && activeSection === 'transaksi'
                ? 'border-sky-600 text-sky-800 font-bold'
                : 'border-transparent hover:text-slate-900'
            }`}
          >
            Riwayat Struk
          </button>

          <button
            onClick={() => {
              if (currentMode === 'cashier') onOpenOwnerPin();
              else setActiveSection('cloud');
            }}
            className={`transition-colors whitespace-nowrap shrink-0 pb-0.5 border-b-2 ${
              currentMode === 'owner' && activeSection === 'cloud'
                ? 'border-sky-600 text-sky-800 font-bold'
                : 'border-transparent hover:text-slate-900'
            }`}
          >
            Cloud &amp; AppSheet
          </button>
        </nav>

        {/* Zone 3: 1 primary action */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="hidden lg:flex items-center gap-1.5 text-[11px] text-slate-500 font-medium">
            <Cloud className="w-3.5 h-3.5 text-sky-600" />
            <span className="flex items-center gap-1">
              Sync Real-Time <Check className="w-3 h-3 text-emerald-600" />
            </span>
          </div>

          {currentMode === 'cashier' ? (
            <button
              onClick={onOpenOwnerPin}
              className="px-3.5 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition-all shadow-xs whitespace-nowrap shrink-0 flex items-center gap-1.5 active:scale-98"
            >
              <Lock className="w-3.5 h-3.5 text-sky-400" />
              <span>Mode Pemilik</span>
            </button>
          ) : (
            <button
              onClick={() => onSwitchMode('cashier')}
              className="px-3.5 py-2 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-700 rounded-xl transition-all shadow-xs whitespace-nowrap shrink-0 flex items-center gap-1.5 active:scale-98"
            >
              <Store className="w-3.5 h-3.5" />
              <span>Buka Kasir POS</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
