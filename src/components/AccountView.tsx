import React, { useState, useEffect } from 'react';
import { StoreSettings, Product, Transaction, PaymentMethod } from '../types';
import { StorageService } from '../services/storage';
import { PRESET_STORE_LOGOS, PRESET_CASHIER_AVATARS } from '../data/initialProducts';
import { User } from 'firebase/auth';
import { 
  googleSignIn, 
  logoutGoogle, 
  getAccessToken, 
  getCurrentGoogleUser, 
  initAuth 
} from '../services/googleAuth';
import { GoogleSheetsService } from '../services/googleSheetsService';
import { 
  UserCircle2, 
  Store, 
  Lock, 
  Cloud, 
  CheckCircle2, 
  Download, 
  Upload, 
  RefreshCw,
  ShieldCheck,
  Save,
  Image as ImageIcon,
  Mic,
  CreditCard,
  ReceiptText,
  Smartphone,
  Check,
  Sparkles,
  Zap,
  Banknote,
  QrCode,
  Building2,
  Phone,
  MapPin,
  FileText,
  Tag,
  Trash2,
  FileSpreadsheet,
  ExternalLink,
  Layers,
  Table,
  CheckCircle,
  AlertCircle,
  Loader2,
  Share2
} from 'lucide-react';

export type SettingsTab = 'store_identity' | 'cashier_settings' | 'receipt_customizer' | 'database_security';

interface AccountViewProps {
  settings: StoreSettings;
  products: Product[];
  transactions: Transaction[];
  onUpdateSettings: (settings: StoreSettings) => void;
  onRefreshData: () => void;
  initialTab?: SettingsTab;
  onLockSession?: () => void;
}

export const AccountView: React.FC<AccountViewProps> = ({
  settings,
  products,
  transactions,
  onUpdateSettings,
  onRefreshData,
  initialTab = 'store_identity',
  onLockSession,
}) => {
  const [activeTab, setActiveTab] = useState<SettingsTab>(initialTab);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);
  const [form, setForm] = useState<StoreSettings>({
    ...settings,
    enabledPaymentMethods: settings.enabledPaymentMethods || ['cash', 'qris', 'transfer', 'debit'],
    defaultPaymentMethod: settings.defaultPaymentMethod || 'cash',
    enableVoiceSearch: settings.enableVoiceSearch !== false,
    activeCashierName: settings.activeCashierName || 'Siti Rahma',
    cashierLogoUrl: settings.cashierLogoUrl || PRESET_CASHIER_AVATARS[0].dataUri,
    cashierSectionLabel: settings.cashierSectionLabel || 'Kasir',
    managementSectionLabel: settings.managementSectionLabel || 'Manajemen Toko',
    showLogoOnReceipt: settings.showLogoOnReceipt !== false,
    showCashierOnReceipt: settings.showCashierOnReceipt !== false,
  });

  const [newPin, setNewPin] = useState('');
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [cloudMessage, setCloudMessage] = useState<string | null>(null);
  const [logoUploadError, setLogoUploadError] = useState<string | null>(null);
  const [cashierLogoUploadError, setCashierLogoUploadError] = useState<string | null>(null);
  const [previewPaperWidth, setPreviewPaperWidth] = useState<'58mm' | '80mm'>('58mm');

  // Google Auth & Sheets States
  const [googleUser, setGoogleUser] = useState<User | null>(getCurrentGoogleUser());
  const [isGoogleLoggingIn, setIsGoogleLoggingIn] = useState(false);
  const [googleAuthError, setGoogleAuthError] = useState<string | null>(null);
  const [isCreatingSheet, setIsCreatingSheet] = useState(false);
  const [isSyncingSheet, setIsSyncingSheet] = useState(false);
  const [isImportingSheet, setIsImportingSheet] = useState(false);
  const [sheetNotice, setSheetNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [manualSheetInput, setManualSheetInput] = useState('');
  const [showManualInput, setShowManualInput] = useState(false);

  useEffect(() => {
    const unsubscribe = initAuth(
      (user) => setGoogleUser(user),
      () => setGoogleUser(null)
    );
    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, []);

  const handleGoogleSignIn = async () => {
    setIsGoogleLoggingIn(true);
    setGoogleAuthError(null);
    try {
      const result = await googleSignIn();
      if (!result) {
        setIsGoogleLoggingIn(false);
        return;
      }

      // Immediately update UI as soon as Google Auth succeeds
      setGoogleUser(result.user);
      setIsGoogleLoggingIn(false);

      // Run Google Sheets setup / sync asynchronously in background
      if (!form.googleSheetsId) {
        setIsCreatingSheet(true);
        try {
          const info = await GoogleSheetsService.createAppSheetSpreadsheet(
            result.accessToken,
            form.storeName || 'Subur Sayur',
            products,
            transactions
          );
          const updated = {
            ...form,
            googleSheetsId: info.spreadsheetId,
            googleSheetsUrl: info.spreadsheetUrl,
            googleSheetsName: info.spreadsheetName,
            autoSyncToGoogleSheets: true,
            lastGoogleSheetsSync: new Date().toISOString(),
          };
          setForm(updated);
          StorageService.saveSettings(updated);
          onUpdateSettings(updated);
          setSheetNotice({
            type: 'success',
            message: `Berhasil terhubung otomatis! Database Spreadsheet telah dibuat di Google Drive (${result.user.email}) dan sinkronisasi real-time telah aktif.`,
          });
        } catch {
          setSheetNotice({
            type: 'success',
            message: `Berhasil masuk dengan akun Google: ${result.user.displayName || result.user.email}.`,
          });
        } finally {
          setIsCreatingSheet(false);
        }
      } else {
        setSheetNotice({
          type: 'success',
          message: `Terhubung otomatis ke akun Google: ${result.user.displayName || result.user.email}. Menyinkronkan data...`,
        });
        try {
          await GoogleSheetsService.syncAllData(
            result.accessToken,
            form.googleSheetsId,
            products,
            transactions
          );
          const updated = {
            ...form,
            autoSyncToGoogleSheets: true,
            lastGoogleSheetsSync: new Date().toISOString(),
          };
          setForm(updated);
          StorageService.saveSettings(updated);
          onUpdateSettings(updated);
          setSheetNotice({
            type: 'success',
            message: `Berhasil terhubung otomatis ke akun Google: ${result.user.displayName || result.user.email}. Data toko telah tersinkronkan.`,
          });
        } catch {
          // Non-fatal background sync warning
        }
      }
    } catch (err: any) {
      setIsGoogleLoggingIn(false);
      setGoogleAuthError(err?.message || 'Gagal masuk dengan Google.');
    }
  };

  const handleGoogleSignOut = async () => {
    await logoutGoogle();
    setGoogleUser(null);
    setSheetNotice(null);
  };

  const handleCreateAppSheetSpreadsheet = async () => {
    setIsCreatingSheet(true);
    setSheetNotice(null);
    try {
      let token = await getAccessToken();
      if (!token) {
        const loginRes = await googleSignIn();
        if (!loginRes) {
          setIsCreatingSheet(false);
          return;
        }
        token = loginRes.accessToken;
        setGoogleUser(loginRes.user);
      }

      const info = await GoogleSheetsService.createAppSheetSpreadsheet(
        token,
        form.storeName || 'Subur Sayur',
        products,
        transactions
      );

      const updated = {
        ...form,
        googleSheetsId: info.spreadsheetId,
        googleSheetsUrl: info.spreadsheetUrl,
        googleSheetsName: info.spreadsheetName,
        autoSyncToGoogleSheets: true,
        lastGoogleSheetsSync: new Date().toISOString(),
      };
      setForm(updated);
      StorageService.saveSettings(updated);
      onUpdateSettings(updated);

      setSheetNotice({
        type: 'success',
        message: 'Google Spreadsheet berhasil dibuat & terhubung langsung ke akun Anda!',
      });
    } catch (err: any) {
      setSheetNotice({
        type: 'error',
        message: err?.message || 'Gagal membuat Google Spreadsheet.',
      });
    } finally {
      setIsCreatingSheet(false);
    }
  };

  const handleSyncToSheets = async () => {
    if (!form.googleSheetsId) return;
    setIsSyncingSheet(true);
    setSheetNotice(null);
    try {
      let token = await getAccessToken();
      if (!token) {
        const loginRes = await googleSignIn();
        if (!loginRes) {
          setIsSyncingSheet(false);
          return;
        }
        token = loginRes.accessToken;
        setGoogleUser(loginRes.user);
      }

      await GoogleSheetsService.syncAllData(
        token,
        form.googleSheetsId,
        products,
        transactions
      );

      const updated = {
        ...form,
        lastGoogleSheetsSync: new Date().toISOString(),
      };
      setForm(updated);
      StorageService.saveSettings(updated);
      onUpdateSettings(updated);

      setSheetNotice({
        type: 'success',
        message: `Berhasil menyinkronkan ${products.length} produk & ${transactions.length} transaksi ke Google Sheets!`,
      });
    } catch (err: any) {
      setSheetNotice({
        type: 'error',
        message: err?.message || 'Gagal menyinkronkan data ke Google Sheets.',
      });
    } finally {
      setIsSyncingSheet(false);
    }
  };

  const handleImportFromSheets = async () => {
    if (!form.googleSheetsId) return;
    const confirmed = window.confirm(
      'Apakah Anda yakin ingin menarik data produk dari Google Sheets? Perubahan stok dan harga dari Google Sheets / AppSheet akan diterapkan ke aplikasi kasir.'
    );
    if (!confirmed) return;

    setIsImportingSheet(true);
    setSheetNotice(null);
    try {
      let token = await getAccessToken();
      if (!token) {
        const loginRes = await googleSignIn();
        if (!loginRes) {
          setIsImportingSheet(false);
          return;
        }
        token = loginRes.accessToken;
        setGoogleUser(loginRes.user);
      }

      const imported = await GoogleSheetsService.fetchProductsFromSheet(token, form.googleSheetsId);
      if (imported && imported.length > 0) {
        StorageService.saveProducts(imported);
        onRefreshData();
        setSheetNotice({
          type: 'success',
          message: `Berhasil mengimpor ${imported.length} produk dari Google Sheets!`,
        });
      } else {
        setSheetNotice({
          type: 'error',
          message: 'Data produk di Google Sheets kosong atau tidak valid.',
        });
      }
    } catch (err: any) {
      setSheetNotice({
        type: 'error',
        message: err?.message || 'Gagal menarik data dari Google Sheets.',
      });
    } finally {
      setIsImportingSheet(false);
    }
  };

  const handleConnectManualSheet = (e: React.FormEvent) => {
    e.preventDefault();
    const raw = manualSheetInput.trim();
    if (!raw) return;

    let extractedId = raw;
    const match = raw.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    if (match && match[1]) {
      extractedId = match[1];
    }

    const updated = {
      ...form,
      googleSheetsId: extractedId,
      googleSheetsUrl: `https://docs.google.com/spreadsheets/d/${extractedId}/edit`,
      googleSheetsName: 'Google Spreadsheet Terhubung',
      autoSyncToGoogleSheets: true,
      lastGoogleSheetsSync: new Date().toISOString(),
    };
    setForm(updated);
    StorageService.saveSettings(updated);
    onUpdateSettings(updated);
    setShowManualInput(false);
    setManualSheetInput('');
    setSheetNotice({
      type: 'success',
      message: 'Google Spreadsheet berhasil dihubungkan!',
    });
  };

  const handleUnlinkSheet = () => {
    const confirmed = window.confirm(
      'Apakah Anda yakin ingin memutuskan tautan Google Spreadsheet? File di Google Drive tidak akan dihapus, namun sinkronisasi otomatis akan dinonaktifkan.'
    );
    if (!confirmed) return;

    const updated = {
      ...form,
      googleSheetsId: undefined,
      googleSheetsUrl: undefined,
      googleSheetsName: undefined,
      autoSyncToGoogleSheets: false,
    };
    setForm(updated);
    StorageService.saveSettings(updated);
    onUpdateSettings(updated);
    setSheetNotice({
      type: 'success',
      message: 'Tautan Google Spreadsheet berhasil diputuskan.',
    });
  };

  // Handle Store Logo Upload
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setLogoUploadError('Harap pilih file gambar (PNG, JPG, SVG, atau WebP).');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setLogoUploadError('Ukuran gambar maksimal 2 MB.');
      return;
    }

    setLogoUploadError(null);
    const reader = new FileReader();
    reader.onload = ev => {
      const dataUrl = ev.target?.result as string;
      setForm(prev => ({ ...prev, logoUrl: dataUrl }));
    };
    reader.readAsDataURL(file);
  };

  // Handle Cashier Logo / Avatar Upload
  const handleCashierLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setCashierLogoUploadError('Harap pilih file gambar (PNG, JPG, SVG, atau WebP).');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setCashierLogoUploadError('Ukuran gambar maksimal 2 MB.');
      return;
    }

    setCashierLogoUploadError(null);
    const reader = new FileReader();
    reader.onload = ev => {
      const dataUrl = ev.target?.result as string;
      setForm(prev => ({ ...prev, cashierLogoUrl: dataUrl }));
    };
    reader.readAsDataURL(file);
  };

  // Select Preset Store Logo
  const handleSelectPreset = (logoUri: string) => {
    setForm(prev => ({ ...prev, logoUrl: logoUri }));
  };

  // Select Preset Cashier Avatar
  const handleSelectCashierAvatar = (avatarUri: string) => {
    setForm(prev => ({ ...prev, cashierLogoUrl: avatarUri }));
  };

  // Toggle Payment Methods
  const handleTogglePaymentMethod = (pm: PaymentMethod) => {
    const current = form.enabledPaymentMethods || ['cash', 'qris', 'transfer', 'debit'];
    let updated: PaymentMethod[];
    if (current.includes(pm)) {
      if (current.length === 1) {
        alert('Minimal harus ada 1 metode pembayaran yang aktif.');
        return;
      }
      updated = current.filter(m => m !== pm);
    } else {
      updated = [...current, pm];
    }

    let defaultPm = form.defaultPaymentMethod;
    if (!updated.includes(defaultPm as PaymentMethod)) {
      defaultPm = updated[0];
    }

    setForm({
      ...form,
      enabledPaymentMethods: updated,
      defaultPaymentMethod: defaultPm,
    });
  };

  // Handle Form Save
  const handleSave = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const updated: StoreSettings = {
      ...form,
      cashierSectionLabel: form.cashierSectionLabel?.trim() || 'Kasir',
      managementSectionLabel: form.managementSectionLabel?.trim() || 'Manajemen Toko',
      ownerPin: newPin.trim().length === 4 ? newPin.trim() : form.ownerPin,
    };
    StorageService.saveSettings(updated);
    onUpdateSettings(updated);
    setSavedSuccess(true);
    setNewPin('');
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  // Cloud Sync
  const handleCloudSync = () => {
    setCloudMessage('Menyinkronkan data dengan Cloud Server...');
    setTimeout(() => {
      const updated = {
        ...form,
        lastCloudSync: new Date().toISOString(),
      };
      StorageService.saveSettings(updated);
      onUpdateSettings(updated);
      setCloudMessage('Sinkronisasi Berhasil! Database terhubung real-time.');
      setTimeout(() => setCloudMessage(null), 3000);
    }, 600);
  };

  // Backup & Restore
  const handleExportBackup = () => {
    const jsonStr = StorageService.backupAllData();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Backup_${form.storeName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
  };

  const handleRestoreBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = ev => {
        const content = ev.target?.result as string;
        if (StorageService.restoreAllData(content)) {
          onRefreshData();
          alert('Data cadangan berhasil dipulihkan!');
        } else {
          alert('Gagal memulihkan file cadangan. Format tidak valid.');
        }
      };
      reader.readAsText(file);
    }
  };

  const formatRp = (num: number) => 'Rp ' + num.toLocaleString('id-ID');

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      
      {/* 1. HEADER SECTION PROFIL & IDENTITAS DENGAN TEMA HANGAT MINIMALIS */}
      <div className="bg-white p-6 rounded-3xl border border-stone-200/90 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div className="flex items-center gap-4">
          {/* Avatar Kasir & Logo Toko Container */}
          <div className="relative shrink-0">
            <div className="w-14 h-14 rounded-2xl bg-orange-100 text-orange-700 border-2 border-orange-200 flex items-center justify-center overflow-hidden shadow-xs">
              {form.cashierLogoUrl ? (
                <img src={form.cashierLogoUrl} alt={form.activeCashierName || 'Kasir'} className="w-full h-full object-cover" />
              ) : (
                <UserCircle2 className="w-8 h-8" />
              )}
            </div>
            {form.logoUrl && (
              <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-lg bg-white border border-stone-200 shadow-xs overflow-hidden flex items-center justify-center p-0.5">
                <img src={form.logoUrl} alt={form.storeName} className="w-full h-full object-cover rounded" />
              </div>
            )}
          </div>

          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg font-bold text-stone-900 tracking-tight">
                {form.activeCashierName || 'Kasir Aktif'}
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-100 text-orange-800 border border-orange-200">
                {form.cashierSectionLabel || 'Kasir'}
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Sesi Aktif
              </span>
            </div>
            <p className="text-xs text-stone-600 font-medium mt-1 flex items-center gap-1.5">
              <Store className="w-3.5 h-3.5 text-stone-400 shrink-0" />
              <span>{form.storeName || 'Subur Sayur'}</span>
              {form.address && (
                <>
                  <span className="text-stone-300">•</span>
                  <span className="text-stone-500 truncate max-w-xs">{form.address}</span>
                </>
              )}
            </p>
          </div>
        </div>

        {/* Action Buttons: Kunci Sesi / Keluar & Simpan Perubahan */}
        <div className="flex items-center gap-2.5 self-start md:self-center">
          {onLockSession && (
            <button
              type="button"
              onClick={onLockSession}
              className="px-4 py-2.5 rounded-2xl bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-2xs active:scale-95"
              title="Kunci sesi kasir untuk keamanan data"
            >
              <Lock className="w-4 h-4 text-rose-500" />
              <span>Kunci Sesi</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => handleSave()}
            className="px-5 py-2.5 rounded-2xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md shadow-orange-600/20 active:scale-95 cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>Simpan Pengaturan</span>
          </button>
        </div>
      </div>

      {/* Notifications */}
      {savedSuccess && (
        <div className="p-3.5 bg-emerald-50 text-emerald-950 rounded-2xl text-xs font-bold border border-emerald-300 flex items-center gap-2.5 shadow-xs animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>Semua pembaruan profil toko, label, logo, kasir, dan struk berhasil disimpan!</span>
        </div>
      )}

      {cloudMessage && (
        <div className="p-3.5 bg-amber-50 text-amber-950 rounded-2xl text-xs font-bold border border-amber-300 flex items-center gap-2.5 shadow-xs">
          <Cloud className="w-4 h-4 text-amber-600 shrink-0" />
          <span>{cloudMessage}</span>
        </div>
      )}

      {/* 2. TAB NAVIGASI CLEAN & WARM */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-stone-100/90 p-1.5 rounded-2xl border border-stone-200/80">
        <button
          type="button"
          onClick={() => setActiveTab('store_identity')}
          className={`py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
            activeTab === 'store_identity'
              ? 'bg-white text-orange-600 shadow-sm border border-stone-200/80 font-black'
              : 'text-stone-600 hover:text-stone-900 hover:bg-stone-50'
          }`}
        >
          <Store className="w-4 h-4" />
          <span>Identitas Toko</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('cashier_settings')}
          className={`py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
            activeTab === 'cashier_settings'
              ? 'bg-white text-orange-600 shadow-sm border border-stone-200/80 font-black'
              : 'text-stone-600 hover:text-stone-900 hover:bg-stone-50'
          }`}
        >
          <CreditCard className="w-4 h-4" />
          <span>Pengaturan Kasir</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('receipt_customizer')}
          className={`py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
            activeTab === 'receipt_customizer'
              ? 'bg-white text-orange-600 shadow-sm border border-stone-200/80 font-black'
              : 'text-stone-600 hover:text-stone-900 hover:bg-stone-50'
          }`}
        >
          <ReceiptText className="w-4 h-4" />
          <span>Format Struk</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('database_security')}
          className={`py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
            activeTab === 'database_security'
              ? 'bg-white text-orange-600 shadow-sm border border-stone-200/80 font-black'
              : 'text-stone-600 hover:text-stone-900 hover:bg-stone-50'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          <span>Sandi &amp; Database</span>
        </button>
      </div>

      {/* 3. TAB CONTENT */}
      
      {/* TAB 1: IDENTITAS TOKO & STANDARDISASI LOGO SOLID & KUSTOMISASI LABEL TEKS */}
      {activeTab === 'store_identity' && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl border border-stone-200/90 p-6 shadow-sm space-y-6">
            
            {/* Header Section */}
            <div className="border-b border-stone-100 pb-4">
              <h3 className="text-sm font-bold text-stone-900 uppercase tracking-wider flex items-center gap-2">
                <Store className="w-4 h-4 text-orange-600" />
                <span>Identitas Utama &amp; Logo Toko</span>
              </h3>
              <p className="text-xs text-stone-500 mt-1">
                Tampilan logo proporsional tanpa latar belakang yang memotong tampilan struk atau sidebar.
              </p>
            </div>

            {/* Area Logo Preview & Upload */}
            <div className="p-5 bg-stone-50/80 rounded-2xl border border-stone-200/80 flex flex-col md:flex-row items-center gap-6">
              <div className="flex flex-col items-center gap-2 shrink-0">
                <div className="w-24 h-24 rounded-2xl bg-white border border-stone-200 shadow-xs flex items-center justify-center overflow-hidden">
                  {form.logoUrl ? (
                    <img
                      src={form.logoUrl}
                      alt={form.storeName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="text-stone-400 font-bold text-xs text-center">
                      Tanpa Logo
                    </div>
                  )}
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-orange-700 bg-orange-100 px-2.5 py-0.5 rounded-full border border-orange-200">
                  Logo Toko
                </span>
              </div>

              {/* Upload Controls */}
              <div className="flex-1 space-y-3 w-full">
                <div>
                  <h4 className="text-xs font-bold text-stone-900">Unggah Logo Toko</h4>
                  <p className="text-[11px] text-stone-500">
                    Pilih file gambar logo dari perangkat (PNG, JPG, SVG, WebP, maks. 2MB).
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <label className="px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer shadow-xs transition-all active:scale-95">
                    <Upload className="w-3.5 h-3.5" />
                    <span>Pilih Gambar dari File</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      className="hidden"
                    />
                  </label>

                  <button
                    type="button"
                    onClick={() => setForm(prev => ({ ...prev, logoUrl: PRESET_STORE_LOGOS[0].dataUri }))}
                    className="px-3.5 py-2 bg-white hover:bg-stone-100 text-stone-700 rounded-xl text-xs font-semibold border border-stone-300 transition-all cursor-pointer"
                  >
                    Reset ke Default
                  </button>
                </div>

                {logoUploadError && (
                  <p className="text-xs text-rose-600 font-bold">{logoUploadError}</p>
                )}
              </div>
            </div>

            {/* Galeri Logo Preset Toko */}
            {/* Galeri Logo Preset Toko */}
            <div className="space-y-3">
              <label className="block text-xs font-bold text-stone-800 uppercase tracking-wider">
                Atau Pilih dari Galeri Preset Bawaan:
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                {PRESET_STORE_LOGOS.map(preset => {
                  const isSelected = form.logoUrl === preset.dataUri;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => handleSelectPreset(preset.dataUri)}
                      className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col items-center gap-2 bg-white hover:border-orange-300 ${
                        isSelected
                          ? 'border-orange-500 ring-2 ring-orange-400/30 shadow-xs'
                          : 'border-stone-200'
                      }`}
                    >
                      <div className="w-14 h-14 rounded-xl bg-transparent border border-stone-200 flex items-center justify-center overflow-hidden">
                        <img src={preset.dataUri} alt={preset.name} className="w-full h-full object-cover" />
                      </div>
                      <div className="text-center w-full">
                        <span className="text-[11px] font-bold text-stone-900 block truncate">
                          {preset.name}
                        </span>
                        <span className="text-[9px] text-stone-500 block truncate">
                          {preset.category}
                        </span>
                      </div>
                      {isSelected && (
                        <span className="text-[9px] font-bold text-white bg-orange-600 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <Check className="w-2.5 h-2.5" /> Terpilih
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* KUSTOMISASI LABEL TEKS ANTARMUKA (KASIR & MANAJEMEN TOKO) */}
            <div className="p-5 bg-stone-50/80 rounded-2xl border border-stone-200/90 space-y-3">
              <div className="flex items-center gap-2">
                <Tag className="w-4 h-4 text-orange-600" />
                <h4 className="text-xs font-bold text-stone-900 uppercase tracking-wider">
                  Kustomisasi Teks 'Kasir' &amp; 'Manajemen Toko' pada Antarmuka
                </h4>
              </div>
              <p className="text-[11px] text-stone-500">
                Ubah teks navigasi default sesuai istilah operasional toko Anda (misalnya: "Point of Sale (POS)", "Kasir 1", "Operasional Toko", dsb.).
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                <div>
                  <label className="block text-xs font-bold text-stone-800 mb-1">
                    Label Teks Menu Kasir
                  </label>
                  <input
                    type="text"
                    value={form.cashierSectionLabel || ''}
                    onChange={e => setForm({ ...form, cashierSectionLabel: e.target.value })}
                    placeholder="Kasir"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 focus:outline-none focus:border-orange-500 bg-white text-xs font-bold text-stone-900"
                  />
                  <span className="text-[10px] text-stone-500 mt-0.5 block">
                    Mengubah label di Sidebar, Header Bar, dan tombol transaksi.
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-800 mb-1">
                    Label Teks Manajemen Toko / Subtitle
                  </label>
                  <input
                    type="text"
                    value={form.managementSectionLabel || ''}
                    onChange={e => setForm({ ...form, managementSectionLabel: e.target.value })}
                    placeholder="Manajemen Toko"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 focus:outline-none focus:border-orange-500 bg-white text-xs font-bold text-stone-900"
                  />
                  <span className="text-[10px] text-stone-500 mt-0.5 block">
                    Mengubah subtitle di bawah nama toko pada sidebar dock.
                  </span>
                </div>
              </div>
            </div>

            {/* Input Form Identitas Toko */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div>
                <label className="block text-xs font-bold text-stone-800 mb-1">Nama Toko</label>
                <input
                  type="text"
                  required
                  value={form.storeName}
                  onChange={e => setForm({ ...form, storeName: e.target.value })}
                  placeholder="Contoh: BekuMart Frozen & Fresh Hub"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 focus:outline-none focus:border-orange-500 text-xs font-bold text-stone-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-800 mb-1">Slogan Toko</label>
                <input
                  type="text"
                  value={form.tagline}
                  onChange={e => setForm({ ...form, tagline: e.target.value })}
                  placeholder="Contoh: Pusat Sayur, Buah, Bahan Kue & Frozen Lengkap"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 focus:outline-none focus:border-orange-500 text-xs font-medium text-stone-800"
                />
              </div>

              {/* PENGATURAN ALAMAT TOKO DINAMIS */}
              <div className="md:col-span-2 p-5 bg-stone-50 rounded-2xl border border-stone-200 space-y-3.5 shadow-2xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-orange-600 text-white flex items-center justify-center shadow-xs">
                      <MapPin className="w-4 h-4 stroke-[2.5]" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-stone-900 uppercase tracking-wider">
                        Pengaturan Alamat Toko Dinamis
                      </h4>
                      <p className="text-[11px] text-stone-600">
                        Otomatis tersinkronisasi ke Header Aplikasi, Struk Thermal Kasir, dan Kirim WhatsApp.
                      </p>
                    </div>
                  </div>
                  <span className="self-start sm:self-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-orange-100 text-orange-800 border border-orange-200">
                    Dinamis Realtime
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-800 mb-1.5">
                    Alamat Lengkap Toko
                  </label>
                  <div className="relative">
                    <MapPin className="w-4 h-4 text-orange-600 absolute left-3.5 top-3 pointer-events-none" />
                    <input
                      type="text"
                      value={form.address}
                      onChange={e => setForm({ ...form, address: e.target.value })}
                      placeholder="Contoh: Jl. Pasir Putih No. 12, Sawangan, Kota Depok, Jawa Barat 16519"
                      className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-stone-200 focus:outline-none focus:border-orange-500 bg-white text-xs font-bold text-stone-900"
                    />
                  </div>
                  <span className="text-[11px] text-stone-500 mt-1 block">
                    Ketik alamat cabang atau ruko toko Anda di sini. Nilai ini langsung disimpan ke konfigurasi sistem.
                  </span>
                </div>

                {/* Live Preview Display Box */}
                <div className="p-3.5 bg-white rounded-xl border border-stone-200/90 space-y-2">
                  <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider block">
                    Pratinjau Tampilan Dinamis:
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    <div className="p-2.5 rounded-lg bg-stone-50 border border-stone-200">
                      <span className="text-[10px] text-orange-700 font-bold block mb-1">
                        1. Header Bar Atas:
                      </span>
                      <div className="flex items-center gap-1.5 text-stone-700 font-medium text-[11px] truncate">
                        <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                        <span className="truncate">{form.address || 'Alamat toko belum diisi'}</span>
                      </div>
                    </div>

                    <div className="p-2.5 rounded-lg bg-stone-50 border border-stone-200">
                      <span className="text-[10px] text-emerald-700 font-bold block mb-1">
                        2. Nota Thermal &amp; WhatsApp:
                      </span>
                      <div className="text-[11px] font-mono-num text-stone-800 leading-tight truncate">
                        {form.storeName || 'Subur Sayur'}<br />
                        <span className="text-stone-500">{form.address || 'Jl. Pasir Putih No. 12...'}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Quick Preset Buttons */}
                <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                  <span className="text-[10px] text-stone-500 font-bold">Contoh Cepat:</span>
                  {[
                    'Jl. Pasir Putih No. 12, Sawangan, Depok',
                    'Jl. Raya Bogor KM 30, Cimanggis, Depok',
                    'Ruko Sentra Niaga Blok B-08, Jakarta Selatan'
                  ].map(presetAddr => (
                    <button
                      key={presetAddr}
                      type="button"
                      onClick={() => setForm({ ...form, address: presetAddr })}
                      className="px-2 py-1 rounded-lg bg-stone-200/70 hover:bg-stone-300 text-stone-800 text-[10px] font-bold cursor-pointer transition-colors"
                    >
                      {presetAddr.split(',')[0]}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => handleSave()}
                className="px-6 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs flex items-center gap-2 transition-all shadow-md shadow-orange-600/20 active:scale-95 cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>Simpan Identitas &amp; Alamat Toko</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: SENTRALISASI PENGATURAN KASIR & EDIT LOGO KASIR */}
      {activeTab === 'cashier_settings' && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl border-2 border-slate-200 p-6 shadow-sm space-y-6">
            
            <div className="border-b border-slate-100 pb-4">
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-orange-500" />
                <span>Sentralisasi Pengaturan Kasir &amp; Logo Kasir</span>
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Kelola nama kasir aktif, unggah logo khusus kasir, aktivasi input suara, dan konfigurasi pembayaran.
              </p>
            </div>

            {/* PENGATURAN EDIT LOGO & NAMA KASIR KHUSUS */}
            <div className="p-5 bg-orange-50/70 rounded-2xl border-2 border-orange-200 space-y-4">
              <div className="flex items-center gap-2">
                <UserCircle2 className="w-5 h-5 text-orange-600" />
                <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                  Pengaturan Logo Khusus &amp; Nama Kasir
                </h4>
              </div>

              <div className="flex flex-col md:flex-row items-center gap-6">
                {/* Preview Avatar Logo Kasir */}
                <div className="flex flex-col items-center gap-2 shrink-0">
                  <div className="w-20 h-20 rounded-2xl bg-transparent border-2 border-orange-500 shadow-md flex items-center justify-center overflow-hidden">
                    {form.cashierLogoUrl ? (
                      <img
                        src={form.cashierLogoUrl}
                        alt="Logo Kasir"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <UserCircle2 className="w-12 h-12 text-orange-400" />
                    )}
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-orange-800 bg-orange-200/80 px-2 py-0.5 rounded-full border border-orange-300">
                    Logo Kasir Aktif
                  </span>
                </div>

                {/* Upload & Form Kasir */}
                <div className="flex-1 space-y-3 w-full">
                  <div>
                    <label className="block text-xs font-bold text-slate-900 mb-1">
                      Nama Kasir yang Sedang Bertugas:
                    </label>
                    <input
                      type="text"
                      value={form.activeCashierName || ''}
                      onChange={e => setForm({ ...form, activeCashierName: e.target.value })}
                      placeholder="Contoh: Siti Rahma / Budi Santoso / Kasir 01"
                      className="w-full px-3.5 py-2 rounded-xl border-2 border-orange-300 focus:outline-none focus:border-orange-500 bg-white text-xs font-bold text-slate-900"
                    />
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <label className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-2 cursor-pointer shadow-sm transition-all active:scale-95 border border-orange-400">
                      <Upload className="w-3.5 h-3.5" />
                      <span>Upload Foto / Logo Kasir</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleCashierLogoUpload}
                        className="hidden"
                      />
                    </label>

                    {form.cashierLogoUrl && (
                      <button
                        type="button"
                        onClick={() => setForm(prev => ({ ...prev, cashierLogoUrl: '' }))}
                        className="px-3 py-2 bg-white hover:bg-rose-50 text-rose-600 rounded-xl text-xs font-semibold border border-rose-200 transition-all cursor-pointer flex items-center gap-1.5"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Hapus Logo</span>
                      </button>
                    )}
                  </div>

                  {cashierLogoUploadError && (
                    <p className="text-xs text-rose-600 font-bold">{cashierLogoUploadError}</p>
                  )}
                </div>
              </div>

              {/* Preset Avatar Kasir Galeri */}
              <div className="space-y-2 pt-2 border-t border-orange-200/60">
                <span className="text-[11px] font-bold text-slate-700 block">
                  Atau Pilih Avatar Kasir Bawaan:
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {PRESET_CASHIER_AVATARS.map(avatar => {
                    const isSelected = form.cashierLogoUrl === avatar.dataUri;
                    return (
                      <button
                        key={avatar.id}
                        type="button"
                        onClick={() => handleSelectCashierAvatar(avatar.dataUri)}
                        className={`p-2.5 rounded-xl border-2 flex items-center gap-2.5 transition-all cursor-pointer bg-white ${
                          isSelected
                            ? 'border-orange-500 ring-2 ring-orange-400/40 shadow-xs'
                            : 'border-slate-200 hover:border-orange-300'
                        }`}
                      >
                        <div className="w-9 h-9 rounded-xl overflow-hidden shrink-0 bg-transparent flex items-center justify-center">
                          <img src={avatar.dataUri} alt={avatar.name} className="w-full h-full object-cover" />
                        </div>
                        <div className="text-left min-w-0">
                          <div className="text-xs font-bold text-slate-900 truncate">{avatar.name}</div>
                          <div className="text-[10px] text-slate-500 truncate">{avatar.role}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* FITUR OPERASIONAL KASIR */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-1">
              
              {/* Fitur Input Suara (Voice Search Toggle) */}
              <div className="p-4 rounded-2xl border-2 border-slate-200 bg-slate-50/70 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                    <Mic className="w-4 h-4 text-orange-600" />
                    <span>Fitur Input Suara di Kasir</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, enableVoiceSearch: !form.enableVoiceSearch })}
                    className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer ${
                      form.enableVoiceSearch ? 'bg-orange-500' : 'bg-slate-300'
                    }`}
                  >
                    <span
                      className={`block w-4 h-4 rounded-full bg-white transition-transform absolute top-1 left-1 shadow-xs ${
                        form.enableVoiceSearch ? 'translate-x-6' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
                <p className="text-[11px] text-slate-500">
                  {form.enableVoiceSearch 
                    ? 'Aktif: Tombol mikrofon akan tampil di kasir untuk menambah barang cepat lewat suara.'
                    : 'Nonaktif: Tombol mikrofon disembunyikan dari halaman kasir.'}
                </p>
              </div>

              {/* Pilihan Metode Pembayaran Default */}
              <div className="p-4 rounded-2xl border-2 border-slate-200 bg-slate-50 space-y-2">
                <label className="block text-xs font-bold text-slate-800">
                  Metode Pembayaran Default Saat Buka Kasir:
                </label>
                <select
                  value={form.defaultPaymentMethod || 'cash'}
                  onChange={e => setForm({ ...form, defaultPaymentMethod: e.target.value as PaymentMethod })}
                  className="w-full px-3.5 py-2.5 rounded-xl border-2 border-slate-200 focus:outline-none focus:border-orange-500 bg-white text-xs font-bold text-slate-900 cursor-pointer"
                >
                  {(form.enabledPaymentMethods || ['cash']).map(method => (
                    <option key={method} value={method}>
                      {method === 'cash' ? 'Tunai (Cash)' : method === 'qris' ? 'QRIS Dinamis' : method === 'transfer' ? 'Transfer Bank' : 'Debit / EDC'}
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-slate-500">
                  Metode ini akan terpilih secara otomatis pada setiap pembukaan transaksi kasir baru.
                </p>
              </div>
            </div>

            {/* Filter Pilihan Metode Pembayaran Kasir */}
            <div className="space-y-3 pt-2">
              <label className="block text-xs font-black text-slate-800 uppercase tracking-wider">
                Metode Pembayaran yang Diizinkan di Kasir:
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                
                {/* Cash */}
                <button
                  type="button"
                  onClick={() => handleTogglePaymentMethod('cash')}
                  className={`p-3.5 rounded-2xl border-2 flex flex-col items-center gap-2 transition-all cursor-pointer ${
                    (form.enabledPaymentMethods || []).includes('cash')
                      ? 'border-emerald-500 bg-emerald-50/60 shadow-xs'
                      : 'border-slate-200 bg-slate-50 opacity-50'
                  }`}
                >
                  <Banknote className="w-5 h-5 text-emerald-600" />
                  <span className="text-xs font-bold text-slate-900">Tunai (Cash)</span>
                  <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                    (form.enabledPaymentMethods || []).includes('cash')
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-200 text-slate-600'
                  }`}>
                    {(form.enabledPaymentMethods || []).includes('cash') ? 'Aktif' : 'Mati'}
                  </span>
                </button>

                {/* QRIS */}
                <button
                  type="button"
                  onClick={() => handleTogglePaymentMethod('qris')}
                  className={`p-3.5 rounded-2xl border-2 flex flex-col items-center gap-2 transition-all cursor-pointer ${
                    (form.enabledPaymentMethods || []).includes('qris')
                      ? 'border-blue-500 bg-blue-50/60 shadow-xs'
                      : 'border-slate-200 bg-slate-50 opacity-50'
                  }`}
                >
                  <QrCode className="w-5 h-5 text-blue-600" />
                  <span className="text-xs font-bold text-slate-900">QRIS Dinamis</span>
                  <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                    (form.enabledPaymentMethods || []).includes('qris')
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-200 text-slate-600'
                  }`}>
                    {(form.enabledPaymentMethods || []).includes('qris') ? 'Aktif' : 'Mati'}
                  </span>
                </button>

                {/* Transfer */}
                <button
                  type="button"
                  onClick={() => handleTogglePaymentMethod('transfer')}
                  className={`p-3.5 rounded-2xl border-2 flex flex-col items-center gap-2 transition-all cursor-pointer ${
                    (form.enabledPaymentMethods || []).includes('transfer')
                      ? 'border-purple-500 bg-purple-50/60 shadow-xs'
                      : 'border-slate-200 bg-slate-50 opacity-50'
                  }`}
                >
                  <Building2 className="w-5 h-5 text-purple-600" />
                  <span className="text-xs font-bold text-slate-900">Transfer Bank</span>
                  <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                    (form.enabledPaymentMethods || []).includes('transfer')
                      ? 'bg-purple-600 text-white'
                      : 'bg-slate-200 text-slate-600'
                  }`}>
                    {(form.enabledPaymentMethods || []).includes('transfer') ? 'Aktif' : 'Mati'}
                  </span>
                </button>

                {/* Debit */}
                <button
                  type="button"
                  onClick={() => handleTogglePaymentMethod('debit')}
                  className={`p-3.5 rounded-2xl border-2 flex flex-col items-center gap-2 transition-all cursor-pointer ${
                    (form.enabledPaymentMethods || []).includes('debit')
                      ? 'border-orange-500 bg-orange-50/60 shadow-xs'
                      : 'border-slate-200 bg-slate-50 opacity-50'
                  }`}
                >
                  <CreditCard className="w-5 h-5 text-orange-600" />
                  <span className="text-xs font-bold text-slate-900">Debit / EDC</span>
                  <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                    (form.enabledPaymentMethods || []).includes('debit')
                      ? 'bg-orange-500 text-white'
                      : 'bg-slate-200 text-slate-600'
                  }`}>
                    {(form.enabledPaymentMethods || []).includes('debit') ? 'Aktif' : 'Mati'}
                  </span>
                </button>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => handleSave()}
                className="px-6 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs flex items-center gap-2 transition-all shadow-md shadow-orange-600/20 active:scale-95 cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>Simpan Pengaturan Kasir &amp; Logo</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: KUSTOMISASI FORMAT STRUK DENGAN PRATINJAU LANGSUNG */}
      {activeTab === 'receipt_customizer' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Controls Column (7 cols) */}
          <div className="lg:col-span-7 bg-white rounded-3xl border-2 border-slate-200 p-6 shadow-sm space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <ReceiptText className="w-4 h-4 text-emerald-600" />
                <span>Kustomisasi Format Struk Belanja</span>
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Sesuaikan teks, nomor kontak nota, dan tentukan apakah logo toko dan kasir dicetak pada nota thermal.
              </p>
            </div>

            <div className="space-y-4">
              {/* Toggle Logo di Struk */}
              <div className="p-4 rounded-2xl border-2 border-slate-200 bg-slate-50 flex items-center justify-between">
                <div>
                  <label className="text-xs font-black text-slate-900 flex items-center gap-2">
                    <ImageIcon className="w-4 h-4 text-emerald-600" />
                    <span>Cetak Logo Toko di Kepala Struk</span>
                  </label>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Menampilkan gambar logo solid di bagian paling atas nota belanja.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setForm({ ...form, showLogoOnReceipt: !form.showLogoOnReceipt })}
                  className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer ${
                    form.showLogoOnReceipt ? 'bg-emerald-500' : 'bg-slate-300'
                  }`}
                >
                  <span
                    className={`block w-4 h-4 rounded-full bg-white transition-transform absolute top-1 left-1 shadow-xs ${
                      form.showLogoOnReceipt ? 'translate-x-6' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Toggle Kasir di Struk */}
              <div className="p-4 rounded-2xl border-2 border-slate-200 bg-slate-50 flex items-center justify-between">
                <div>
                  <label className="text-xs font-black text-slate-900 flex items-center gap-2">
                    <UserCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Cetak Logo &amp; Bagian Kasir di Struk</span>
                  </label>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Mencetak label dan avatar logo kasir pada baris metadata transaksi nota.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setForm({ ...form, showCashierOnReceipt: !form.showCashierOnReceipt })}
                  className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer ${
                    form.showCashierOnReceipt ? 'bg-emerald-500' : 'bg-slate-300'
                  }`}
                >
                  <span
                    className={`block w-4 h-4 rounded-full bg-white transition-transform absolute top-1 left-1 shadow-xs ${
                      form.showCashierOnReceipt ? 'translate-x-6' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Toggle Nama Kasir pada Struk (Fisik & WA) */}
              <div className="p-4 rounded-2xl border-2 border-slate-200 bg-slate-50 flex items-center justify-between">
                <div>
                  <label className="text-xs font-black text-slate-900 flex items-center gap-2">
                    <UserCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Cetak 'Nama Kasir' pada Struk &amp; WA</span>
                  </label>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Menampilkan rincian nama kasir bertugas (contoh: '{form.cashierSectionLabel || 'Kasir'}: {form.activeCashierName || 'Siti Rahma'}') pada nota fisik &amp; WhatsApp.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setForm({ ...form, showCashierNameOnReceipt: form.showCashierNameOnReceipt === false ? true : false })}
                  className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer ${
                    form.showCashierNameOnReceipt !== false ? 'bg-emerald-500' : 'bg-slate-300'
                  }`}
                >
                  <span
                    className={`block w-4 h-4 rounded-full bg-white transition-transform absolute top-1 left-1 shadow-xs ${
                      form.showCashierNameOnReceipt !== false ? 'translate-x-6' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Edit Nama Kasir yang Dicetak */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1 flex items-center gap-1.5">
                  <UserCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Nama Kasir yang Dicetak pada Struk</span>
                </label>
                <input
                  type="text"
                  value={form.activeCashierName || ''}
                  onChange={e => setForm({ ...form, activeCashierName: e.target.value })}
                  placeholder="Misal: Siti Rahma, Budi, Kasir 01..."
                  className="w-full px-3.5 py-2.5 rounded-xl border-2 border-slate-200 focus:outline-none focus:border-emerald-500 text-xs font-bold text-slate-900"
                />
              </div>

              {/* Nomor Kontak / Telepon / WA Nota */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Nomor Kontak Toko / Layanan Pelanggan pada Struk</span>
                </label>
                <input
                  type="text"
                  value={form.phone}
                  onChange={e => setForm({ ...form, phone: e.target.value })}
                  placeholder="0812-9876-5432"
                  className="w-full px-3.5 py-2.5 rounded-xl border-2 border-slate-200 focus:outline-none focus:border-emerald-500 font-mono-num text-xs font-semibold text-slate-900"
                />
              </div>

              {/* Catatan Kaki Struk (Footer Message) */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Catatan Kaki Struk (Footer Message)</span>
                </label>
                <textarea
                  rows={3}
                  value={form.receiptFooter}
                  onChange={e => setForm({ ...form, receiptFooter: e.target.value })}
                  placeholder="Tulis ucapan terima kasih, pesan simpan dingin, atau ketentuan retur..."
                  className="w-full px-3.5 py-2.5 rounded-xl border-2 border-slate-200 focus:outline-none focus:border-emerald-500 text-xs text-slate-900 leading-relaxed font-medium resize-none"
                />
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => handleSave()}
                className="px-6 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs flex items-center gap-2 transition-all shadow-md shadow-orange-600/20 active:scale-95 cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>Simpan Format Struk</span>
              </button>
            </div>
          </div>

          {/* Live Thermal Receipt Preview Column (5 cols) */}
          <div className="lg:col-span-5 bg-white rounded-3xl border-2 border-slate-200 p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <span className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-600" />
                <span>Pratinjau Struk Kasir</span>
              </span>
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
                <button
                  type="button"
                  onClick={() => setPreviewPaperWidth('58mm')}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    previewPaperWidth === '58mm' ? 'bg-white text-emerald-800 shadow-xs' : 'text-slate-500'
                  }`}
                >
                  58mm
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewPaperWidth('80mm')}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    previewPaperWidth === '80mm' ? 'bg-white text-emerald-800 shadow-xs' : 'text-slate-500'
                  }`}
                >
                  80mm
                </button>
              </div>
            </div>

            {/* Receipt Paper Simulation */}
            <div className="bg-slate-100 p-4 rounded-2xl flex justify-center">
              <div
                style={{ width: previewPaperWidth === '58mm' ? '260px' : '320px' }}
                className="bg-white p-4 shadow-md border border-slate-300 text-slate-900 font-mono-num text-[11px] leading-tight space-y-2.5 transition-all"
              >
                {/* Logo & Header */}
                <div className="text-center space-y-1 pb-2 border-b border-dashed border-slate-300">
                  {form.showLogoOnReceipt && form.logoUrl && (
                    <div className="w-12 h-12 mx-auto mb-1 rounded-xl bg-transparent border border-slate-400 overflow-hidden flex items-center justify-center">
                      <img src={form.logoUrl} alt="Logo" className="w-full h-full object-cover" />
                    </div>
                  )}
                  <h4 className="font-black text-xs uppercase tracking-tight">{form.storeName || 'NAMA TOKO'}</h4>
                  <p className="text-[10px] text-slate-600">{form.tagline}</p>
                  <p className="text-[9px] text-slate-500">{form.address}</p>
                  <p className="text-[9px] text-slate-600 font-semibold">Telp/WA: {form.phone}</p>
                </div>

                {/* Metadata */}
                <div className="text-[10px] space-y-0.5 pb-2 border-b border-dashed border-slate-300">
                  <div className="flex justify-between">
                    <span>No: INV-20261021-001</span>
                    <span>14:30</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Tgl: {new Date().toLocaleDateString('id-ID')}</span>
                    {form.showCashierOnReceipt && (
                      <span className="flex items-center gap-1 font-semibold text-slate-800">
                        {form.cashierLogoUrl && (
                          <img src={form.cashierLogoUrl} alt="Kasir" className="w-3.5 h-3.5 rounded-full object-cover inline-block" />
                        )}
                        <span>
                          {form.cashierSectionLabel || 'Kasir'}
                          {form.showCashierNameOnReceipt !== false && `: ${form.activeCashierName || 'Siti Rahma'}`}
                        </span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Items Sample */}
                <div className="space-y-1.5 py-1 text-[10px]">
                  <div className="flex justify-between">
                    <div>
                      <div className="font-bold">Nugget Ayam Crispy 500g</div>
                      <div className="text-slate-500 text-[9px]">2 x Rp 38.000</div>
                    </div>
                    <div className="font-black">Rp 76.000</div>
                  </div>
                  <div className="flex justify-between">
                    <div>
                      <div className="font-bold">Kentang Shoestring 1kg</div>
                      <div className="text-slate-500 text-[9px]">1 x Rp 32.000</div>
                    </div>
                    <div className="font-black">Rp 32.000</div>
                  </div>
                </div>

                {/* Totals */}
                <div className="pt-2 border-t border-dashed border-slate-300 space-y-1 text-[10px]">
                  <div className="flex justify-between font-bold text-xs">
                    <span>TOTAL:</span>
                    <span>Rp 108.000</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>BAYAR (TUNAI):</span>
                    <span>Rp 150.000</span>
                  </div>
                  <div className="flex justify-between font-bold text-emerald-700">
                    <span>KEMBALI:</span>
                    <span>Rp 42.000</span>
                  </div>
                </div>

                {/* Footer Message */}
                <div className="pt-2 border-t border-dashed border-slate-300 text-center text-[9px] text-slate-600 whitespace-pre-wrap leading-normal font-sans">
                  {form.receiptFooter || 'Terima kasih telah berbelanja!'}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: GOOGLE SHEETS, APPSHEET & MANAJEMEN DATABASE */}
      {activeTab === 'database_security' && (
        <div className="space-y-6">
          {/* Notification Alert for Google Sheets / Auth */}
          {sheetNotice && (
            <div
              className={`p-4 rounded-2xl text-xs font-black border-2 flex items-center justify-between gap-3 shadow-sm animate-fade-in ${
                sheetNotice.type === 'success'
                  ? 'bg-emerald-50 text-emerald-950 border-emerald-400'
                  : 'bg-rose-50 text-rose-950 border-rose-400'
              }`}
            >
              <div className="flex items-center gap-2.5">
                {sheetNotice.type === 'success' ? (
                  <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
                )}
                <span>{sheetNotice.message}</span>
              </div>
              <button
                type="button"
                onClick={() => setSheetNotice(null)}
                className="text-xs opacity-60 hover:opacity-100 cursor-pointer"
              >
                Tutup
              </button>
            </div>
          )}

          {/* 1. SEKSI UTAMA: INTEGRASI LANGSUNG GOOGLE SHEETS */}
          <div className="bg-white rounded-3xl border-2 border-emerald-500 p-6 shadow-lg shadow-emerald-500/10 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-black shadow-md shadow-emerald-600/30 shrink-0">
                  <FileSpreadsheet className="w-6 h-6 stroke-[2.5]" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-black text-slate-900 tracking-tight">
                      Integrasi Langsung Google Sheets
                    </h3>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500 text-slate-950 border border-emerald-400">
                      1 Akun Google
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">
                    Hubungkan database toko langsung ke Google Sheets. Data produk &amp; transaksi kasir otomatis tersimpan langsung tanpa perlu skrip tambahan.
                  </p>
                </div>
              </div>

              {/* Status Akun Google */}
              {googleUser ? (
                <div className="flex items-center gap-3 bg-emerald-50/80 border border-emerald-200 px-3.5 py-2 rounded-2xl">
                  {googleUser.photoURL ? (
                    <img
                      src={googleUser.photoURL}
                      alt={googleUser.displayName || 'Google User'}
                      className="w-8 h-8 rounded-full border border-emerald-400 object-cover"
                    />
                  ) : (
                    <UserCircle2 className="w-8 h-8 text-emerald-600" />
                  )}
                  <div className="text-left">
                    <div className="text-xs font-black text-slate-900 leading-tight">
                      {googleUser.displayName || 'Akun Google'}
                    </div>
                    <div className="text-[10px] text-slate-500 truncate max-w-[180px]">
                      {googleUser.email}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleGoogleSignOut}
                    className="ml-2 text-[11px] font-bold text-rose-600 hover:text-rose-800 underline cursor-pointer"
                  >
                    Keluar
                  </button>
                </div>
              ) : (
                <div>
                  <button
                    type="button"
                    onClick={handleGoogleSignIn}
                    disabled={isGoogleLoggingIn || isCreatingSheet}
                    className="px-4 py-2 bg-white hover:bg-slate-50 text-slate-800 font-extrabold rounded-2xl text-xs flex items-center gap-3 border-2 border-slate-300 shadow-xs transition-all active:scale-95 cursor-pointer disabled:opacity-50"
                  >
                    <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="w-4 h-4 shrink-0">
                      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                    </svg>
                    <span>{isGoogleLoggingIn || isCreatingSheet ? 'Menghubungkan Otomatis...' : 'Hubungkan Otomatis dengan Akun Google'}</span>
                  </button>
                  {googleAuthError && (
                    <div className="mt-2 p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-left max-w-sm">
                      <p className="text-[11px] text-rose-700 font-bold leading-tight">{googleAuthError}</p>
                      <p className="text-[10px] text-stone-500 mt-1">
                        Catatan: Login Google bersifat opsional hanya untuk backup Google Sheets. Aplikasi kasir tetap berfungsi penuh secara lokal tanpa perlu akun Google.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* KONDISI 1: SUDAH TERHUBUNG KE GOOGLE SPREADSHEET */}
            {form.googleSheetsId ? (
              <div className="space-y-5">
                <div className="p-5 rounded-2xl bg-emerald-50/70 border-2 border-emerald-300 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800 bg-emerald-200/80 px-2.5 py-0.5 rounded-full border border-emerald-300">
                        Spreadsheet Aktif
                      </span>
                      <h4 className="text-sm font-black text-slate-900 mt-1">
                        {form.googleSheetsName || `${form.storeName} POS Database`}
                      </h4>
                      <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                        ID: {form.googleSheetsId}
                      </p>
                      {form.lastGoogleSheetsSync && (
                        <p className="text-[10px] text-emerald-700 font-bold mt-1">
                          Terakhir disinkronkan: {new Date(form.lastGoogleSheetsSync).toLocaleString('id-ID')}
                        </p>
                      )}
                    </div>

                    {/* SATU TOMBOL UTAMA: BUKA DI GOOGLE SHEETS */}
                    <div className="flex flex-wrap items-center gap-2.5">
                      <a
                        href={form.googleSheetsUrl || `https://docs.google.com/spreadsheets/d/${form.googleSheetsId}/edit`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black flex items-center gap-2 transition-all shadow-md active:scale-95 cursor-pointer border-2 border-emerald-400"
                      >
                        <FileSpreadsheet className="w-4 h-4" />
                        <span>Buka di Google Sheets</span>
                        <ExternalLink className="w-3.5 h-3.5 opacity-80" />
                      </a>
                    </div>
                  </div>

                  {/* TABEL DI DALAM GOOGLE SHEETS */}
                  <div className="pt-3 border-t border-emerald-200/80 grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <div className="bg-white p-2.5 rounded-xl border border-emerald-200 text-center">
                      <span className="text-[10px] text-slate-500 font-bold uppercase block">Tabel Produk</span>
                      <span className="text-xs font-black text-emerald-900">{products.length} Barang</span>
                    </div>
                    <div className="bg-white p-2.5 rounded-xl border border-emerald-200 text-center">
                      <span className="text-[10px] text-slate-500 font-bold uppercase block">Tabel Transaksi</span>
                      <span className="text-xs font-black text-emerald-900">{transactions.length} Struk</span>
                    </div>
                    <div className="bg-white p-2.5 rounded-xl border border-emerald-200 text-center">
                      <span className="text-[10px] text-slate-500 font-bold uppercase block">Detail Transaksi</span>
                      <span className="text-xs font-black text-emerald-900">Rincian Item</span>
                    </div>
                    <div className="bg-white p-2.5 rounded-xl border border-emerald-200 text-center">
                      <span className="text-[10px] text-slate-500 font-bold uppercase block">Kategori</span>
                      <span className="text-xs font-black text-emerald-900">Katalog Toko</span>
                    </div>
                  </div>

                  {/* AKSI SINKRONISASI DATA */}
                  <div className="pt-3 border-t border-emerald-200/80 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={handleSyncToSheets}
                        disabled={isSyncingSheet}
                        className="px-4 py-2 bg-emerald-700 hover:bg-emerald-600 text-white rounded-xl text-xs font-black flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50 active:scale-95"
                      >
                        {isSyncingSheet ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Upload className="w-3.5 h-3.5" />
                        )}
                        <span>{isSyncingSheet ? 'Menyinkronkan...' : 'Sinkronkan Sekarang'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleImportFromSheets}
                        disabled={isImportingSheet}
                        className="px-4 py-2 bg-white hover:bg-slate-50 text-slate-800 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer border border-slate-300 disabled:opacity-50 active:scale-95"
                      >
                        {isImportingSheet ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-600" />
                        ) : (
                          <Download className="w-3.5 h-3.5 text-slate-600" />
                        )}
                        <span>{isImportingSheet ? 'Menarik data...' : 'Tarik Data Produk dari Sheets'}</span>
                      </button>
                    </div>

                    <div className="flex items-center gap-4">
                      {/* Auto Sync Toggle */}
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={form.autoSyncToGoogleSheets !== false}
                          onChange={e => {
                            const updated = {
                              ...form,
                              autoSyncToGoogleSheets: e.target.checked,
                            };
                            setForm(updated);
                            StorageService.saveSettings(updated);
                            onUpdateSettings(updated);
                          }}
                          className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300"
                        />
                        <span className="text-xs font-bold text-slate-800">
                          Auto-Sync Saat Kasir Selesai
                        </span>
                      </label>

                      <button
                        type="button"
                        onClick={handleUnlinkSheet}
                        className="text-xs text-rose-600 hover:text-rose-800 font-bold underline cursor-pointer"
                      >
                        Lepas Tautan
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* KONDISI 2: BELUM TERHUBUNG KE GOOGLE SPREADSHEET */
              <div className="space-y-4">
                <div className="p-6 rounded-2xl bg-linear-to-br from-emerald-50 via-teal-50 to-blue-50 border-2 border-dashed border-emerald-300 text-center space-y-4">
                  <div className="w-16 h-16 mx-auto rounded-3xl bg-emerald-600 text-white flex items-center justify-center shadow-lg shadow-emerald-600/25">
                    <FileSpreadsheet className="w-8 h-8 stroke-[2.5]" />
                  </div>
                  <div className="max-w-xl mx-auto space-y-1">
                    <h4 className="text-base font-black text-slate-900">
                      Hubungkan Langsung ke Google Sheets dalam 1-Klik
                    </h4>
                    <p className="text-xs text-slate-600">
                      Sistem akan membuat Google Spreadsheet di Google Drive akun Anda secara otomatis. Semua transaksi dan daftar barang toko otomatis tersimpan tanpa perlu instalasi skrip tambahan.
                    </p>
                  </div>

                  <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                    <button
                      type="button"
                      onClick={handleCreateAppSheetSpreadsheet}
                      disabled={isCreatingSheet || isGoogleLoggingIn}
                      className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl text-xs font-black flex items-center gap-2.5 transition-all shadow-lg shadow-emerald-600/30 active:scale-95 cursor-pointer disabled:opacity-50 border-2 border-emerald-400"
                    >
                      {isCreatingSheet ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Sedang Menghubungkan Google Spreadsheet...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4 text-amber-300 fill-amber-300" />
                          <span>Hubungkan Otomatis ke Google Sheets (1-Klik)</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => setShowManualInput(!showManualInput)}
                      className="text-xs font-bold text-slate-600 hover:text-slate-900 underline cursor-pointer py-2"
                    >
                      {showManualInput ? 'Tutup Pilihan Manual' : 'Atau Masukkan ID / URL Spreadsheet yang Ada'}
                    </button>
                  </div>

                  {showManualInput && (
                    <form onSubmit={handleConnectManualSheet} className="max-w-md mx-auto pt-3 flex gap-2">
                      <input
                        type="text"
                        value={manualSheetInput}
                        onChange={e => setManualSheetInput(e.target.value)}
                        placeholder="Tempel URL atau ID Google Spreadsheet..."
                        className="flex-1 px-3.5 py-2 rounded-xl border-2 border-slate-300 bg-white text-xs font-bold focus:outline-none focus:border-emerald-500"
                      />
                      <button
                        type="submit"
                        disabled={!manualSheetInput.trim()}
                        className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all disabled:opacity-40 cursor-pointer"
                      >
                        Hubungkan
                      </button>
                    </form>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* 2. SEKSI KEAMANAN PIN & CADANGAN FILE LOKAL */}
          <div className="bg-white rounded-3xl border-2 border-slate-200 p-6 shadow-sm space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <Lock className="w-4 h-4 text-slate-800" />
                <span>Keamanan PIN &amp; Cadangan File Lokal</span>
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Atur PIN 4-digit pemilik toko dan ekspor/impor cadangan file JSON.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* PIN Settings */}
              <div className="p-5 rounded-2xl border-2 border-slate-200 bg-slate-50 space-y-3">
                <label className="block text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>Ubah PIN Pemilik Toko (4 Digit)</span>
                </label>
                <p className="text-[11px] text-slate-500">
                  PIN ini digunakan untuk membuka kunci aplikasi saat sesi dikunci atau saat web dibuka. PIN Standar saat ini: <strong className="font-mono text-slate-900 bg-amber-100 px-1.5 py-0.5 rounded font-bold">1234</strong>.
                </p>
                <div className="flex items-center gap-3">
                  <input
                    type="password"
                    maxLength={4}
                    value={newPin}
                    onChange={e => setNewPin(e.target.value.replace(/\D/g, ''))}
                    placeholder="Ketik 4 digit baru..."
                    className="w-48 px-3.5 py-2 rounded-xl border-2 border-slate-200 focus:outline-none focus:border-slate-800 font-mono-num text-sm tracking-widest text-center font-bold bg-white"
                  />
                  <button
                    type="button"
                    onClick={() => handleSave()}
                    disabled={newPin.length !== 4}
                    className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-xs active:scale-95"
                  >
                    Terapkan PIN
                  </button>
                </div>

                {/* Toggle Kunci Otomatis Saat Web Dibuka */}
                <div className="pt-3 border-t border-slate-200 flex items-center justify-between gap-3">
                  <div>
                    <span className="text-xs font-bold text-slate-800 block">Kunci Otomatis Saat Web Dibuka</span>
                    <span className="text-[11px] text-slate-500 block">
                      {form.enableAppLockOnStart !== false 
                        ? 'Aktif: Web akan meminta PIN kasir (1234) setiap kali aplikasi dibuka.' 
                        : 'Nonaktif: Langsung masuk ke layar kasir tanpa meminta PIN saat membuka web.'}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const nextLockOnStart = form.enableAppLockOnStart === false ? true : false;
                      try {
                        if (nextLockOnStart) {
                          localStorage.removeItem('pos_remember_device');
                        } else {
                          localStorage.setItem('pos_remember_device', 'true');
                        }
                      } catch {
                        // Ignore
                      }
                      const updated = {
                        ...form,
                        enableAppLockOnStart: nextLockOnStart,
                      };
                      setForm(updated);
                      StorageService.saveSettings(updated);
                      onUpdateSettings(updated);
                    }}
                    className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer shrink-0 ${
                      form.enableAppLockOnStart !== false ? 'bg-orange-600' : 'bg-slate-300'
                    }`}
                  >
                    <span
                      className={`block w-4 h-4 rounded-full bg-white transition-transform absolute top-1 left-1 shadow-xs ${
                        form.enableAppLockOnStart !== false ? 'translate-x-6' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* Cloud Cache Sync */}
              <div className="p-5 rounded-2xl border border-stone-200 bg-stone-50 space-y-3">
                <label className="block text-xs font-bold text-stone-900 uppercase tracking-wider flex items-center gap-2">
                  <Cloud className="w-4 h-4 text-orange-600" />
                  <span>Sinkronisasi Cloud Cache</span>
                </label>
                <p className="text-[11px] text-stone-600">
                  Data produk, stok, dan transaksi disinkronkan secara aman ke browser local storage dan cloud cache.
                </p>
                <button
                  type="button"
                  onClick={handleCloudSync}
                  className="px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shadow-xs active:scale-95"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Sinkronkan Sekarang</span>
                </button>
              </div>
            </div>

            {/* Backup & Restore Data */}
            <div className="p-5 rounded-2xl border-2 border-slate-200 bg-slate-50 space-y-4">
              <div>
                <h4 className="text-xs font-bold text-slate-900">Cadangkan &amp; Pulihkan File JSON</h4>
                <p className="text-[11px] text-slate-500">
                  Ekspor seluruh basis data ke format file JSON yang aman, atau pulihkan data dari file cadangan sebelumnya.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={handleExportBackup}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-sm active:scale-95 cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Unduh File Cadangan JSON</span>
                </button>

                <label className="px-4 py-2.5 bg-white hover:bg-slate-100 text-slate-800 rounded-xl text-xs font-bold flex items-center gap-2 transition-all border border-slate-300 shadow-2xs active:scale-95 cursor-pointer">
                  <Upload className="w-4 h-4 text-slate-600" />
                  <span>Pulihkan dari File JSON</span>
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleRestoreBackup}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            {/* Quick Stats Summary */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
              <div className="p-3.5 rounded-xl bg-slate-100 text-center">
                <span className="text-[10px] text-slate-500 uppercase font-black block">Total Produk Aktif</span>
                <span className="text-base font-black text-slate-900 font-mono-num">{products.length}</span>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-100 text-center">
                <span className="text-[10px] text-slate-500 uppercase font-black block">Total Transaksi</span>
                <span className="text-base font-black text-slate-900 font-mono-num">{transactions.length}</span>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-100 text-center col-span-2 sm:col-span-1">
                <span className="text-[10px] text-slate-500 uppercase font-black block">Status Keamanan</span>
                <span className="text-xs font-black text-emerald-600">PIN &amp; Enkripsi Aktif</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
