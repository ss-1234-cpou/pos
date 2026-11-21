import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Product, Transaction, StoreSettings, CartItem } from './types';
import { StorageService } from './services/storage';
import { Sidebar, MainNavMenu } from './components/Sidebar';
import { HomeDashboardView } from './components/HomeDashboardView';
import { HistorySalesView } from './components/HistorySalesView';
import { FastPaymentView } from './components/FastPaymentView';
import { ProductListView } from './components/ProductListView';
import { AccountView, SettingsTab } from './components/AccountView';
import { ThermalReceiptModal } from './components/ThermalReceiptModal';
import { AppLockScreen } from './components/AppLockScreen';
import { Menu, Cloud, Check, UserCircle2, Store, FileSpreadsheet, Lock, MapPin, Sparkles } from 'lucide-react';
import { getAccessToken, initAuth, googleSignIn, getCurrentGoogleUser } from './services/googleAuth';
import type { User } from 'firebase/auth';
import { GoogleSheetsService } from './services/googleSheetsService';

export default function App() {
  const [activeMenu, setActiveMenu] = useState<MainNavMenu>('home');
  const [accountInitialTab, setAccountInitialTab] = useState<SettingsTab>('store_identity');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [completedTxForReceipt, setCompletedTxForReceipt] = useState<Transaction | null>(null);

  // App Lock State (PIN Security)
  const [isAppLocked, setIsAppLocked] = useState<boolean>(() => {
    try {
      const savedSettings = StorageService.getSettings();
      if (savedSettings.enableAppLockOnStart === false) {
        return false;
      }
      if (localStorage.getItem('pos_remember_device') === 'true') {
        return false;
      }
      return sessionStorage.getItem('pos_unlocked') !== 'true';
    } catch {
      return false;
    }
  });

  const handleUnlockApp = (rememberDevice?: boolean) => {
    try {
      sessionStorage.setItem('pos_unlocked', 'true');
      if (rememberDevice) {
        localStorage.setItem('pos_remember_device', 'true');
      } else {
        localStorage.removeItem('pos_remember_device');
      }
    } catch {
      // Ignore storage errors
    }
    setIsAppLocked(false);
  };

  const handleLockApp = () => {
    try {
      sessionStorage.removeItem('pos_unlocked');
      localStorage.removeItem('pos_remember_device');
    } catch {
      // Ignore storage errors
    }
    setIsAppLocked(true);
  };

  const [products, setProducts] = useState<Product[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [settings, setSettings] = useState<StoreSettings>(StorageService.getSettings());
  const [cart, setCart] = useState<CartItem[]>([]);

  // Google Account & Sheets Auto-Connection
  const [googleUser, setGoogleUser] = useState<User | null>(getCurrentGoogleUser());
  const [isAutoConnectingGoogle, setIsAutoConnectingGoogle] = useState(false);
  const [googleConnectNotice, setGoogleConnectNotice] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = initAuth(
      (user) => setGoogleUser(user),
      () => setGoogleUser(null)
    );
    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, []);

  const syncGoogleSheetsInBackground = useCallback(
    async (user: User, accessToken: string) => {
      if (!accessToken) return;
      if (!settings.googleSheetsId) {
        try {
          const info = await GoogleSheetsService.createAppSheetSpreadsheet(
            accessToken,
            settings.storeName || 'Subur Sayur',
            products,
            transactions
          );
          const updated: StoreSettings = {
            ...settings,
            googleSheetsId: info.spreadsheetId,
            googleSheetsUrl: info.spreadsheetUrl,
            googleSheetsName: info.spreadsheetName,
            autoSyncToGoogleSheets: true,
            lastGoogleSheetsSync: new Date().toISOString(),
          };
          setSettings(updated);
          StorageService.saveSettings(updated);
          setGoogleConnectNotice(
            `Akun Google (${user.email}) & Spreadsheet berhasil terhubung otomatis!`
          );
        } catch {
          setGoogleConnectNotice(`Berhasil terhubung ke akun Google: ${user.email}`);
        }
      } else {
        try {
          await GoogleSheetsService.syncAllData(
            accessToken,
            settings.googleSheetsId,
            products,
            transactions
          );
          const updated = {
            ...settings,
            autoSyncToGoogleSheets: true,
            lastGoogleSheetsSync: new Date().toISOString(),
          };
          setSettings(updated);
          StorageService.saveSettings(updated);
          setGoogleConnectNotice(
            `Akun Google (${user.email}) aktif & data tersinkronisasi otomatis!`
          );
        } catch {
          setGoogleConnectNotice(`Berhasil terhubung ke akun Google: ${user.email}`);
        }
      }
      setTimeout(() => setGoogleConnectNotice(null), 5000);
    },
    [settings, products, transactions]
  );

  const handleAutoConnectGoogle = async () => {
    setIsAutoConnectingGoogle(true);
    setGoogleConnectNotice(null);
    try {
      const result = await googleSignIn();
      if (!result) {
        // User closed the login popup calmly without completing sign-in
        setIsAutoConnectingGoogle(false);
        setGoogleConnectNotice('Login Google dibatalkan. Klik Hubungkan Google kapan saja untuk melanjutkan.');
        setTimeout(() => setGoogleConnectNotice(null), 4000);
        return;
      }

      // Immediately reflect connected user in UI before background Sheets sync
      setGoogleUser(result.user);
      setIsAutoConnectingGoogle(false);
      setGoogleConnectNotice(
        `Terhubung ke ${result.user.email}! Menyinkronkan Google Sheets...`
      );

      void syncGoogleSheetsInBackground(result.user, result.accessToken);
    } catch (err: any) {
      setIsAutoConnectingGoogle(false);
      setGoogleConnectNotice(err?.message || 'Gagal menghubungkan akun Google.');
      setTimeout(() => setGoogleConnectNotice(null), 5000);
    }
  };

  const handleOpenCashierSettings = () => {
    setAccountInitialTab('cashier_settings');
    setActiveMenu('account');
  };

  const loadData = useCallback(() => {
    setProducts(StorageService.getProducts());
    setTransactions(StorageService.getTransactions());
    setSettings(StorageService.getSettings());
  }, []);

  useEffect(() => {
    loadData();

    const handleDataChange = () => {
      loadData();
    };

    window.addEventListener('bekumart_data_changed', handleDataChange);
    window.addEventListener('storage', handleDataChange);

    return () => {
      window.removeEventListener('bekumart_data_changed', handleDataChange);
      window.removeEventListener('storage', handleDataChange);
    };
  }, [loadData]);

  // Cart Handlers with custom price & flexible quantity/weight support
  const handleAddToCart = (product: Product, quantity = 1) => {
    setCart(prev => {
      const existing = prev.find(it => it.product.id === product.id);
      if (existing) {
        const nextQty = Math.round((existing.quantity + quantity) * 100) / 100;
        const unitPrice = existing.customPrice !== undefined ? existing.customPrice : existing.product.sellingPrice;
        return prev.map(it => {
          if (it.product.id === product.id) {
            return {
              ...it,
              quantity: nextQty,
              subtotal: Math.round(nextQty * unitPrice),
            };
          }
          return it;
        });
      } else {
        return [
          ...prev,
          {
            product,
            quantity,
            discountPercent: 0,
            subtotal: Math.round(product.sellingPrice * quantity),
          },
        ];
      }
    });
  };

  const handleUpdateQuantity = (productId: string, delta: number) => {
    setCart(prev =>
      prev
        .map(it => {
          if (it.product.id === productId) {
            const nextQty = Math.round((it.quantity + delta) * 100) / 100;
            if (nextQty <= 0) return null;
            const unitPrice = it.customPrice !== undefined ? it.customPrice : it.product.sellingPrice;
            return {
              ...it,
              quantity: nextQty,
              subtotal: Math.round(nextQty * unitPrice),
            };
          }
          return it;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const handleSetItemQuantity = (productId: string, quantity: number) => {
    setCart(prev =>
      prev
        .map(it => {
          if (it.product.id === productId) {
            if (quantity <= 0) return null;
            const validQty = Math.round(quantity * 100) / 100;
            const unitPrice = it.customPrice !== undefined ? it.customPrice : it.product.sellingPrice;
            return {
              ...it,
              quantity: validQty,
              subtotal: Math.round(validQty * unitPrice),
            };
          }
          return it;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const handleSetItemPrice = (productId: string, customPrice: number) => {
    setCart(prev =>
      prev.map(it => {
        if (it.product.id === productId) {
          const price = Math.max(0, customPrice);
          return {
            ...it,
            customPrice: price,
            subtotal: Math.round(it.quantity * price),
          };
        }
        return it;
      })
    );
  };

  const handleSetItemUnit = (productId: string, customUnit: string) => {
    setCart(prev =>
      prev.map(it => {
        if (it.product.id === productId) {
          return {
            ...it,
            customUnit: customUnit.trim(),
          };
        }
        return it;
      })
    );
  };

  const handleSetItemNote = (productId: string, note: string) => {
    setCart(prev =>
      prev.map(it => {
        if (it.product.id === productId) {
          return {
            ...it,
            note,
          };
        }
        return it;
      })
    );
  };

  const handleRemoveFromCart = (productId: string) => {
    setCart(prev => prev.filter(it => it.product.id !== productId));
  };

  const handleClearCart = () => {
    setCart([]);
  };

  const handleTransactionComplete = async (tx: Transaction) => {
    setCompletedTxForReceipt(tx);
    loadData();

    // Background auto-sync to Google Sheets if enabled & connected
    if (settings.autoSyncToGoogleSheets && settings.googleSheetsId) {
      try {
        const token = await getAccessToken();
        if (token) {
          GoogleSheetsService.appendTransaction(token, settings.googleSheetsId, tx)
            .then(() => {
              const updated = {
                ...settings,
                lastGoogleSheetsSync: new Date().toISOString(),
              };
              setSettings(updated);
              StorageService.saveSettings(updated);
            })
            .catch(err => console.warn('Auto-sync to Google Sheets warning:', err));
        }
      } catch (err) {
        console.warn('Could not auto-sync transaction to Sheets:', err);
      }
    }
  };

  const handleUpdateSettings = (newSettings: StoreSettings) => {
    setSettings(newSettings);
    StorageService.saveSettings(newSettings);
  };

  const cartTotalItemsCount = cart.reduce((acc, it) => acc + it.quantity, 0);

  return (
    <div className="min-h-screen bg-[#FAF7F2] text-stone-900 flex flex-col md:flex-row font-sans selection:bg-orange-500 selection:text-white">
      {/* 5-Menu Sidebar on the Left (Dock Rail on Hover) */}
      <Sidebar
        activeMenu={activeMenu}
        onChangeMenu={(menu) => {
          if (menu === 'account') {
            setAccountInitialTab('store_identity');
          }
          setActiveMenu(menu);
        }}
        cartCount={cartTotalItemsCount}
        storeName={settings.storeName}
        logoUrl={settings.logoUrl}
        cashierLabel={settings.cashierSectionLabel}
        managementLabel={settings.managementSectionLabel}
        isMobileOpen={isMobileSidebarOpen}
        setIsMobileOpen={setIsMobileSidebarOpen}
        activeCashierName={settings.activeCashierName}
        cashierLogoUrl={settings.cashierLogoUrl}
        onOpenCashierSettings={handleOpenCashierSettings}
      />

      {/* Main Content Area (Offset by 80px / 20 on desktop for icon rail) */}
      <div className="flex-1 md:ml-20 flex flex-col min-w-0 transition-all duration-300">
        {/* Top Header Bar - Warm & Minimalist */}
        <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-stone-200/90 h-16 px-4 sm:px-8 flex items-center justify-between gap-4 shadow-2xs">
          <div className="flex items-center gap-3.5">
            <button
              onClick={() => setIsMobileSidebarOpen(true)}
              className="md:hidden p-2 rounded-xl text-stone-600 hover:bg-orange-50 hover:text-orange-600 transition-colors"
            >
              <Menu className="w-5 h-5 text-orange-600" />
            </button>

            <div className="flex items-center gap-3">
              <div>
                <div className="flex items-center gap-1.5 text-xs text-stone-500 font-semibold">
                  <span className="text-orange-600 font-extrabold">{settings.storeName}</span>
                  <span>/</span>
                  <span className="capitalize text-stone-900 font-bold">
                    {activeMenu === 'home' && 'Beranda'}
                    {activeMenu === 'history' && 'History Penjualan'}
                    {activeMenu === 'payment' && `${settings.cashierSectionLabel || 'Kasir'} & Pembayaran`}
                    {activeMenu === 'products' && 'Daftar Produk'}
                    {activeMenu === 'account' && 'Pengaturan Akun & Toko'}
                  </span>
                </div>
                <h2 className="text-sm font-black text-stone-900 hidden sm:block tracking-tight">
                  {activeMenu === 'home' && 'Ringkasan Omset Harian & Grafik Visual'}
                  {activeMenu === 'history' && 'Riwayat Transaksi & Laporan Omset Harian'}
                  {activeMenu === 'payment' && `Rincian Transaksi & Cetak Struk ${settings.cashierSectionLabel || 'Kasir'}`}
                  {activeMenu === 'products' && 'Katalog & Daftar Produk Toko'}
                  {activeMenu === 'account' && 'Sentralisasi Identitas Toko, Logo, Kasir & Struk'}
                </h2>
              </div>
            </div>
          </div>

          {/* Clean Top Right - Google Auto-Connect, Dynamic Store Address & Lock Session */}
          <div className="flex items-center gap-2">
            {/* Google Account Auto-Connection Pill or Button */}
            {googleUser ? (
              <button
                type="button"
                onClick={() => {
                  setAccountInitialTab('database_security');
                  setActiveMenu('account');
                }}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold transition-all cursor-pointer shadow-2xs"
                title={`Google Terhubung: ${googleUser.email}. Klik untuk buka pengaturan Google Sheets.`}
              >
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="hidden lg:inline truncate max-w-[130px] font-medium">{googleUser.email}</span>
                <span className="lg:hidden text-[11px]">Google Aktif</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleAutoConnectGoogle}
                disabled={isAutoConnectingGoogle}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-orange-50 text-stone-800 hover:text-orange-700 border border-stone-300 hover:border-orange-400 text-xs font-bold transition-all shadow-2xs active:scale-95 cursor-pointer disabled:opacity-50"
                title="Hubungkan akun Google otomatis untuk sinkronisasi Google Sheets"
              >
                <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="w-3.5 h-3.5 shrink-0">
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                </svg>
                <span className="hidden sm:inline">{isAutoConnectingGoogle ? 'Menghubungkan...' : 'Hubungkan Google Otomatis'}</span>
                <span className="sm:hidden">{isAutoConnectingGoogle ? 'Proses...' : 'Google'}</span>
              </button>
            )}

            {settings.address && (
              <button
                type="button"
                onClick={() => {
                  setAccountInitialTab('store_identity');
                  setActiveMenu('account');
                }}
                className="hidden xl:flex items-center gap-1.5 text-[11px] text-stone-700 bg-stone-100 hover:bg-orange-50 hover:text-orange-700 hover:border-orange-200 px-3 py-1.5 rounded-xl border border-stone-200/90 max-w-[220px] transition-all cursor-pointer shadow-2xs"
                title={`Alamat Toko: ${settings.address} (Klik untuk ubah di pengaturan)`}
              >
                <MapPin className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                <span className="truncate font-semibold">{settings.address}</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleLockApp}
              title="Kunci Sesi Kasir (Amankan Data Toko)"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-stone-100 hover:bg-orange-50 text-stone-700 hover:text-orange-700 hover:border-orange-200 border border-stone-200/90 text-xs font-bold transition-all shadow-2xs active:scale-95 cursor-pointer"
            >
              <Lock className="w-3.5 h-3.5 text-stone-500" />
              <span className="hidden sm:inline">Kunci Sesi</span>
            </button>
          </div>
        </header>

        {/* Google Auto-Connect Notification Banner */}
        {googleConnectNotice && (
          <div className="bg-orange-50 border-b border-orange-200 px-6 py-2.5 text-xs font-bold text-orange-950 flex items-center justify-between shadow-2xs animate-fade-in">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-orange-600 shrink-0" />
              <span>{googleConnectNotice}</span>
            </div>
            <button
              type="button"
              onClick={() => setGoogleConnectNotice(null)}
              className="text-orange-600 hover:text-orange-900 font-extrabold text-xs ml-4 cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}

        {/* Dynamic View based on Active Menu */}
        <main className="flex-1 pb-12">
          {/* Menu 1: Home (Simple, Modern, Focused Hero Total Hari Ini & Recharts Graphics) */}
          {activeMenu === 'home' && (
            <HomeDashboardView
              transactions={transactions}
              settings={settings}
              onNavigateMenu={setActiveMenu}
              onUpdateSettings={handleUpdateSettings}
            />
          )}

          {/* Menu 2: History Penjualan */}
          {activeMenu === 'history' && (
            <HistorySalesView
              transactions={transactions}
              settings={settings}
              onOpenReceipt={tx => setCompletedTxForReceipt(tx)}
            />
          )}

          {/* Menu 3: Pembayaran (Fast POS Payment System) */}
          {activeMenu === 'payment' && (
            <FastPaymentView
              products={products}
              settings={settings}
              cashierName="Kasir Toko (Siti Rahma)"
              cart={cart}
              onAddToCart={handleAddToCart}
              onUpdateQuantity={handleUpdateQuantity}
              onSetItemQuantity={handleSetItemQuantity}
              onSetItemPrice={handleSetItemPrice}
              onSetItemUnit={handleSetItemUnit}
              onSetItemNote={handleSetItemNote}
              onRemoveFromCart={handleRemoveFromCart}
              onClearCart={handleClearCart}
              onTransactionComplete={handleTransactionComplete}
            />
          )}

          {/* Menu 4: Daftar Produk */}
          {activeMenu === 'products' && (
            <ProductListView
              products={products}
              onUpdateProducts={setProducts}
            />
          )}

          {/* Menu 5: Akun */}
          {activeMenu === 'account' && (
            <AccountView
              settings={settings}
              products={products}
              transactions={transactions}
              onUpdateSettings={setSettings}
              onRefreshData={loadData}
              initialTab={accountInitialTab}
              onLockSession={handleLockApp}
            />
          )}
        </main>

        {/* Footer */}
        <footer className="border-t border-slate-200 bg-white py-3.5 px-6 text-center text-xs text-slate-400">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
            <span>© 2026 {settings.storeName} · Sistem Kasir POS Frozen Food</span>
            <span className="text-[11px] text-slate-400">
              Terhubung Langsung Cloud Google Sheets
            </span>
          </div>
        </footer>
      </div>

      {/* Thermal Receipt Print & WhatsApp Share Modal */}
      <ThermalReceiptModal
        transaction={completedTxForReceipt}
        settings={settings}
        onClose={() => setCompletedTxForReceipt(null)}
      />

      {/* App Lock Screen (PIN Security) */}
      {isAppLocked && (
        <AppLockScreen
          settings={settings}
          onUnlock={handleUnlockApp}
          onGoogleLoginSuccess={(user, token) => {
            setGoogleUser(user);
            void syncGoogleSheetsInBackground(user, token);
          }}
        />
      )}
    </div>
  );
}
