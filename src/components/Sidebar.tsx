import React, { useState } from 'react';
import { 
  Home, 
  ReceiptText, 
  Package, 
  UserCircle2, 
  Cloud, 
  Check, 
  X,
  Store,
  CreditCard,
  ChevronRight,
  Pencil
} from 'lucide-react';

export type MainNavMenu = 'home' | 'history' | 'payment' | 'products' | 'account';

interface SidebarProps {
  activeMenu: MainNavMenu;
  onChangeMenu: (menu: MainNavMenu) => void;
  cartCount: number;
  storeName: string;
  logoUrl?: string;
  cashierLabel?: string;
  managementLabel?: string;
  isMobileOpen: boolean;
  setIsMobileOpen: (open: boolean) => void;
  activeCashierName?: string;
  cashierLogoUrl?: string;
  onOpenCashierSettings?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeMenu,
  onChangeMenu,
  storeName,
  logoUrl,
  cashierLabel,
  managementLabel,
  isMobileOpen,
  setIsMobileOpen,
  activeCashierName,
  cashierLogoUrl,
  onOpenCashierSettings,
}) => {
  const [isHovered, setIsHovered] = useState(false);

  const menuItems: { id: MainNavMenu; label: string; icon: React.ReactNode; color: string }[] = [
    {
      id: 'home',
      label: 'Home',
      icon: <Home className="w-5 h-5" />,
      color: 'from-orange-600 to-amber-600',
    },
    {
      id: 'history',
      label: 'History Penjualan',
      icon: <ReceiptText className="w-5 h-5" />,
      color: 'from-amber-600 to-orange-700',
    },
    {
      id: 'payment',
      label: cashierLabel || 'Kasir',
      icon: <CreditCard className="w-5 h-5" />,
      color: 'from-orange-500 to-amber-500',
    },
    {
      id: 'products',
      label: 'Daftar Produk',
      icon: <Package className="w-5 h-5" />,
      color: 'from-orange-600 to-amber-600',
    },
    {
      id: 'account',
      label: 'Akun',
      icon: <UserCircle2 className="w-5 h-5" />,
      color: 'from-stone-700 to-stone-800',
    },
  ];

  const handleSelect = (id: MainNavMenu) => {
    onChangeMenu(id);
    setIsMobileOpen(false);
  };

  // On desktop: expanded if hovered, collapsed to logo-only if not hovered
  // On mobile: drawer is controlled by isMobileOpen
  const isExpanded = isMobileOpen || isHovered;

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div
          onClick={() => setIsMobileOpen(false)}
          className="fixed inset-0 z-40 bg-stone-950/60 backdrop-blur-xs md:hidden transition-opacity"
        />
      )}

      {/* Modern Collapsible Sidebar / Dock */}
      <aside
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={`fixed top-0 bottom-0 left-0 z-50 bg-gradient-to-b from-stone-950 via-stone-900 to-stone-950 text-white flex flex-col justify-between transition-all duration-300 ease-in-out border-r border-stone-800/80 shadow-2xl ${
          isMobileOpen 
            ? 'w-64 translate-x-0' 
            : isHovered 
              ? 'w-64 translate-x-0 shadow-orange-500/10' 
              : 'w-20 -translate-x-full md:translate-x-0'
        }`}
      >
        {/* Top Brand Area with Full Frame Store Logo */}
        <div>
          <div className="h-18 px-3.5 flex items-center justify-between border-b border-slate-800 relative bg-slate-900/90">
            <div className="flex items-center gap-3 min-w-0">
              {/* Full Frame Transparent Store Logo */}
              {logoUrl ? (
                <div className="w-11 h-11 rounded-2xl bg-transparent border-2 border-blue-500 shrink-0 shadow-md flex items-center justify-center overflow-hidden">
                  <img src={logoUrl} alt={storeName} className="w-full h-full object-cover" />
                </div>
              ) : (
                <div className="w-11 h-11 rounded-2xl bg-blue-600 text-white border-2 border-blue-400 flex items-center justify-center font-black shadow-md shrink-0">
                  <Store className="w-6 h-6 text-white" />
                </div>
              )}

              {/* Text: visible when hovered/expanded */}
              <div
                className={`transition-all duration-300 overflow-hidden whitespace-nowrap ${
                  isExpanded ? 'opacity-100 max-w-xs translate-x-0' : 'opacity-0 max-w-0 -translate-x-2'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <h1 className="font-black text-sm tracking-tight text-white truncate max-w-[150px]">
                    {storeName}
                  </h1>
                </div>
                <p className="text-[10px] font-bold text-blue-300 truncate max-w-[160px]">
                  {managementLabel || 'Manajemen Toko'}
                </p>
              </div>
            </div>

            {/* Mobile Close Button */}
            {isMobileOpen && (
              <button
                onClick={() => setIsMobileOpen(false)}
                className="md:hidden text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* 5 Menu Navigation Items */}
          <nav className="p-3 space-y-2 mt-2">
            {/* Category tag visible only when expanded */}
            <div
              className={`text-[10px] font-bold tracking-wider text-slate-400 uppercase px-3 py-1 transition-all duration-200 overflow-hidden whitespace-nowrap ${
                isExpanded ? 'opacity-100 max-h-6' : 'opacity-0 max-h-0'
              }`}
            >
              Menu Utama
            </div>

            {menuItems.map(item => {
              const isActive = activeMenu === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleSelect(item.id)}
                  title={!isExpanded ? item.label : undefined}
                  className={`w-full relative flex items-center rounded-2xl transition-all duration-200 group active:scale-97 ${
                    isExpanded ? 'px-3.5 py-3 justify-between' : 'p-3 justify-center'
                  } ${
                    isActive
                      ? `bg-linear-to-r ${item.color} text-white shadow-lg shadow-sky-500/25 font-bold`
                      : 'text-slate-300 hover:text-white hover:bg-white/10 hover:shadow-xs'
                  }`}
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    {/* Icon container */}
                    <div
                      className={`transition-transform duration-200 ${
                        isActive ? 'scale-110 text-white' : 'text-slate-400 group-hover:text-white group-hover:scale-110'
                      }`}
                    >
                      {item.icon}
                    </div>

                    {/* Label: Shown only on hover / expanded */}
                    <span
                      className={`text-xs font-semibold whitespace-nowrap transition-all duration-300 overflow-hidden ${
                        isExpanded ? 'opacity-100 max-w-xs translate-x-0' : 'opacity-0 max-w-0 -translate-x-2'
                      }`}
                    >
                      {item.label}
                    </span>
                  </div>

                  {/* Arrow when expanded */}
                  {isExpanded && (
                    <ChevronRight
                      className={`w-3.5 h-3.5 transition-transform shrink-0 ${
                        isActive ? 'text-white translate-x-0.5' : 'text-slate-500 opacity-0 group-hover:opacity-100'
                      }`}
                    />
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom Status & Cloud Indicator */}
        <div className="p-3 border-t border-slate-800/60 space-y-2">
          {/* Cloud Indicator Box */}
          <div
            className={`rounded-2xl transition-all duration-300 overflow-hidden ${
              isExpanded 
                ? 'p-3 bg-white/5 border border-white/10' 
                : 'p-2 flex justify-center bg-white/5 border border-white/5'
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                <span
                  className={`text-[11px] font-medium text-slate-300 whitespace-nowrap transition-all duration-200 ${
                    isExpanded ? 'opacity-100 max-w-xs' : 'opacity-0 max-w-0'
                  }`}
                >
                  Cloud Synced
                </span>
              </div>
              {isExpanded && (
                <span className="text-[10px] text-sky-400 font-bold bg-sky-500/20 px-2 py-0.5 rounded-full">
                  Real-Time
                </span>
              )}
            </div>
          </div>

          {/* User profile avatar / cashier dock with direct Edit in Cashier Settings */}
          <div
            className={`group/cashier relative flex items-center rounded-2xl p-1.5 transition-all bg-white/5 hover:bg-white/10 border border-white/5 hover:border-orange-500/40 ${
              isExpanded ? 'gap-2.5 px-2.5 py-2' : 'justify-center'
            }`}
          >
            {/* Avatar / Logo Kasir with direct click action */}
            <button
              type="button"
              onClick={() => {
                onOpenCashierSettings?.();
                if (isMobileOpen) setIsMobileOpen(false);
              }}
              title={`Edit ${activeCashierName || 'Kasir'} di Pengaturan (Ganti Gambar & Nama)`}
              className="relative rounded-xl overflow-hidden focus:outline-none focus:ring-2 focus:ring-orange-400 group-hover/cashier:ring-2 group-hover/cashier:ring-orange-400/60 transition-all cursor-pointer shrink-0"
            >
              {cashierLogoUrl ? (
                <div className="w-8 h-8 rounded-xl overflow-hidden border border-orange-400/50 bg-slate-800">
                  <img
                    src={cashierLogoUrl}
                    alt={activeCashierName || 'Kasir'}
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <div className="w-8 h-8 rounded-xl bg-linear-to-tr from-amber-400 to-orange-500 text-slate-950 flex items-center justify-center text-xs font-black shadow-md">
                  {activeCashierName ? activeCashierName.charAt(0).toUpperCase() : 'K'}
                </div>
              )}
              {/* Online indicator */}
              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-slate-900" />
            </button>

            {isExpanded && (
              <div 
                onClick={() => {
                  onOpenCashierSettings?.();
                  if (isMobileOpen) setIsMobileOpen(false);
                }}
                className="min-w-0 flex-1 overflow-hidden whitespace-nowrap cursor-pointer"
                title="Klik untuk buka Pengaturan Kasir"
              >
                <div className="text-xs font-black text-white truncate hover:text-orange-300 transition-colors">
                  {activeCashierName || 'Kasir Toko'}
                </div>
                <div className="text-[10px] text-emerald-400 font-semibold truncate flex items-center gap-1">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Online (Kasir Aktif)</span>
                </div>
              </div>
            )}

            {isExpanded && (
              <button
                type="button"
                onClick={() => {
                  onOpenCashierSettings?.();
                  if (isMobileOpen) setIsMobileOpen(false);
                }}
                title="Edit di Pengaturan Kasir (Ganti Gambar / Nama)"
                className="p-1.5 rounded-lg bg-orange-500/20 hover:bg-orange-500 text-orange-400 hover:text-slate-950 transition-all cursor-pointer border border-orange-500/30 active:scale-95 flex items-center justify-center shrink-0"
              >
                <Pencil className="w-3.5 h-3.5 stroke-[2.5]" />
              </button>
            )}
          </div>
        </div>
      </aside>
    </>
  );
};
