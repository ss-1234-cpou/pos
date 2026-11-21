import { Product, Transaction, StoreSettings, DailyReportSummary, PaymentMethod, DailySalesChartData } from '../types';
import { INITIAL_PRODUCTS, INITIAL_SETTINGS, normalizeCategory, DEFAULT_CATEGORIES } from '../data/initialProducts';

const STORAGE_KEYS = {
  PRODUCTS: 'bekumart_products_v1',
  TRANSACTIONS: 'bekumart_transactions_v1',
  SETTINGS: 'bekumart_settings_v1',
  CATEGORIES: 'bekumart_categories_v1',
};

// Seed realistic transactions for the past 7 days
function generateInitialTransactions(products: Product[]): Transaction[] {
  const today = new Date();
  const allTx: Transaction[] = [];

  const daysConfig = [
    { daysAgo: 6, orders: [
      { hoursOffset: 9, items: [{ pIdx: 0, qty: 3 }, { pIdx: 4, qty: 2 }], method: 'cash' as PaymentMethod, customer: 'Resto Sederhana' },
      { hoursOffset: 14, items: [{ pIdx: 2, qty: 2 }, { pIdx: 8, qty: 2 }], method: 'qris' as PaymentMethod, customer: 'Bu Maya' }
    ]},
    { daysAgo: 5, orders: [
      { hoursOffset: 10, items: [{ pIdx: 1, qty: 4 }, { pIdx: 6, qty: 2 }], method: 'transfer' as PaymentMethod, customer: 'Katering Berkah' },
      { hoursOffset: 16, items: [{ pIdx: 7, qty: 2 }, { pIdx: 9, qty: 1 }], method: 'qris' as PaymentMethod, customer: 'Pak Rudi' }
    ]},
    { daysAgo: 4, orders: [
      { hoursOffset: 11, items: [{ pIdx: 2, qty: 3 }, { pIdx: 4, qty: 3 }], method: 'cash' as PaymentMethod, customer: 'Ibu Ratna' },
      { hoursOffset: 15, items: [{ pIdx: 0, qty: 2 }, { pIdx: 10, qty: 4 }], method: 'qris' as PaymentMethod, customer: 'Dimas' },
      { hoursOffset: 18, items: [{ pIdx: 6, qty: 2 }], method: 'transfer' as PaymentMethod, customer: 'Warung Pojok' }
    ]},
    { daysAgo: 3, orders: [
      { hoursOffset: 9, items: [{ pIdx: 3, qty: 2 }, { pIdx: 8, qty: 3 }], method: 'transfer' as PaymentMethod, customer: 'Resto Dapur Mama' },
      { hoursOffset: 13, items: [{ pIdx: 5, qty: 2 }, { pIdx: 1, qty: 2 }], method: 'cash' as PaymentMethod, customer: 'Pak Joko' },
      { hoursOffset: 17, items: [{ pIdx: 0, qty: 2 }, { pIdx: 7, qty: 1 }], method: 'qris' as PaymentMethod, customer: 'Bu Siska' }
    ]},
    { daysAgo: 2, orders: [
      { hoursOffset: 10, items: [{ pIdx: 2, qty: 2 }, { pIdx: 4, qty: 4 }], method: 'qris' as PaymentMethod, customer: 'Keluarga Wijaya' },
      { hoursOffset: 14, items: [{ pIdx: 6, qty: 3 }, { pIdx: 8, qty: 2 }], method: 'cash' as PaymentMethod, customer: 'Pak Darman' },
      { hoursOffset: 19, items: [{ pIdx: 0, qty: 3 }, { pIdx: 10, qty: 2 }], method: 'qris' as PaymentMethod, customer: 'Andi' }
    ]},
    { daysAgo: 1, orders: [
      { hoursOffset: 10, items: [{ pIdx: 0, qty: 4 }, { pIdx: 1, qty: 3 }], method: 'transfer' as PaymentMethod, customer: 'Depot Makan Sehat' },
      { hoursOffset: 12, items: [{ pIdx: 2, qty: 2 }, { pIdx: 7, qty: 2 }], method: 'cash' as PaymentMethod, customer: 'Bu Wati' },
      { hoursOffset: 16, items: [{ pIdx: 4, qty: 3 }, { pIdx: 9, qty: 2 }], method: 'qris' as PaymentMethod, customer: 'Pak Hendra' },
      { hoursOffset: 20, items: [{ pIdx: 8, qty: 2 }, { pIdx: 11, qty: 2 }], method: 'debit' as PaymentMethod, customer: 'Mbak Cindy' }
    ]},
    { daysAgo: 0, orders: [
      { hoursOffset: 9, items: [{ pIdx: 0, qty: 2 }, { pIdx: 1, qty: 1 }], method: 'qris' as PaymentMethod, customer: 'Ibu Anita' },
      { hoursOffset: 11, items: [{ pIdx: 2, qty: 1 }, { pIdx: 4, qty: 2 }], method: 'cash' as PaymentMethod, customer: 'Pak Hendra' },
      { hoursOffset: 14, items: [{ pIdx: 6, qty: 2 }, { pIdx: 8, qty: 1 }], method: 'transfer' as PaymentMethod, customer: 'Resto Dapur Mama' },
      { hoursOffset: 16, items: [{ pIdx: 0, qty: 1 }, { pIdx: 4, qty: 1 }, { pIdx: 10, qty: 2 }], method: 'qris' as PaymentMethod, customer: 'Mbak Cindy' }
    ]}
  ];

  let orderCount = 1;
  daysConfig.forEach(day => {
    const targetDate = new Date(today);
    targetDate.setDate(today.getDate() - day.daysAgo);
    const dateStr = targetDate.toISOString().split('T')[0];

    day.orders.forEach(order => {
      const orderDate = new Date(targetDate);
      orderDate.setHours(order.hoursOffset, Math.floor(Math.random() * 50), 0);

      const cartItems = order.items.map(it => {
        const product = products[it.pIdx] || products[0];
        const subtotal = product.sellingPrice * it.qty;
        return {
          product,
          quantity: it.qty,
          discountPercent: 0,
          subtotal
        };
      });

      const subtotal = cartItems.reduce((acc, it) => acc + it.subtotal, 0);
      const totalCost = cartItems.reduce((acc, it) => acc + (it.product.costPrice * it.quantity), 0);
      const finalAmount = subtotal;
      const grossProfit = finalAmount - totalCost;
      const cashGiven = order.method === 'cash' ? Math.ceil(finalAmount / 50000) * 50000 : finalAmount;
      const changeAmount = cashGiven - finalAmount;

      allTx.push({
        id: `tx-${targetDate.getTime()}-${orderCount}`,
        invoiceNumber: `INV/${dateStr.replace(/-/g, '')}/${String(orderCount).padStart(4, '0')}`,
        timestamp: orderDate.toISOString(),
        items: cartItems,
        totalItemsCount: cartItems.reduce((acc, it) => acc + it.quantity, 0),
        subtotal,
        discountAmount: 0,
        taxAmount: 0,
        finalAmount,
        totalCost,
        grossProfit,
        paymentMethod: order.method,
        cashGiven,
        changeAmount,
        cashierName: orderCount % 2 === 0 ? 'Siti Rahma' : 'Budi Santoso',
        customerName: order.customer,
        syncedToCloud: true
      });

      orderCount++;
    });
  });

  return allTx.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

export const StorageService = {
  getProducts(): Product[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.PRODUCTS);
      if (!data) {
        localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(INITIAL_PRODUCTS));
        return INITIAL_PRODUCTS;
      }
      const existing: Product[] = JSON.parse(data);
      // Auto-merge newly added initial products (sayuran, buah, bahan kue, plastik, saus, bumbu)
      const existingIds = new Set(existing.map(p => p.id));
      const missingInitial = INITIAL_PRODUCTS.filter(p => !existingIds.has(p.id));
      const initialMap = new Map(INITIAL_PRODUCTS.map(ip => [ip.id, ip]));
      let hasMissingFields = false;
      const enriched = (missingInitial.length > 0 ? [...existing, ...missingInitial] : existing).map(p => {
        const ip = initialMap.get(p.id);
        const isi = p.isi || ip?.isi || '12 pack';
        const numIsi = parseInt(isi) || 12;
        const cartonPrice = p.cartonPrice || ip?.cartonPrice || (p.costPrice * numIsi);
        const normalizedCat = normalizeCategory(p.category);
        if (!p.isi || !p.cartonPrice || p.category !== normalizedCat) {
          hasMissingFields = true;
          return { ...p, isi, cartonPrice, category: normalizedCat };
        }
        return p;
      });

      if (missingInitial.length > 0 || hasMissingFields) {
        localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(enriched));
        return enriched;
      }
      return existing;
    } catch {
      return INITIAL_PRODUCTS;
    }
  },

  resetToDefaultProducts(): Product[] {
    localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(INITIAL_PRODUCTS));
    window.dispatchEvent(new Event('bekumart_data_changed'));
    return INITIAL_PRODUCTS;
  },

  saveProducts(products: Product[]): void {
    localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));
    window.dispatchEvent(new Event('bekumart_data_changed'));
  },

  getCategories(): { id: string; label: string }[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.CATEGORIES);
      let list: { id: string; label: string }[] = data ? JSON.parse(data) : [...DEFAULT_CATEGORIES];
      if (!Array.isArray(list) || list.length === 0) {
        list = [...DEFAULT_CATEGORIES];
      }
      // Ensure all DEFAULT_CATEGORIES exist
      const existingIds = new Set(list.map(c => c.id));
      DEFAULT_CATEGORIES.forEach(d => {
        if (!existingIds.has(d.id)) {
          list.push(d);
          existingIds.add(d.id);
        }
      });
      return list;
    } catch {
      return [...DEFAULT_CATEGORIES];
    }
  },

  saveCategories(categories: { id: string; label: string }[]): void {
    try {
      localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(categories));
      window.dispatchEvent(new Event('bekumart_categories_changed'));
    } catch (e) {
      console.error(e);
    }
  },

  addCategory(name: string): { id: string; label: string } {
    const trimmed = name.trim();
    if (!trimmed) {
      throw new Error('Nama kategori tidak boleh kosong');
    }
    const id = trimmed.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || `cat_${Date.now()}`;
    const current = this.getCategories();
    const existing = current.find(c => c.id === id || c.label.toLowerCase() === trimmed.toLowerCase());
    if (existing) {
      return existing;
    }
    const newCat = { id, label: trimmed };
    const updated = [...current, newCat];
    this.saveCategories(updated);
    return newCat;
  },

  deleteCategory(id: string): void {
    const current = this.getCategories();
    const updated = current.filter(c => c.id !== id);
    this.saveCategories(updated);
  },

  updateCategory(id: string, newLabel: string): { categories: { id: string; label: string }[]; updatedProductsCount: number } {
    const trimmed = newLabel.trim();
    if (!trimmed) {
      throw new Error('Nama kategori tidak boleh kosong');
    }
    const current = this.getCategories();
    const targetCat = current.find(c => c.id === id);
    if (!targetCat) {
      throw new Error('Kategori tidak ditemukan');
    }
    const oldLabel = targetCat.label;
    
    // Update category label in storage
    const updatedCategories = current.map(c => c.id === id ? { ...c, label: trimmed } : c);
    this.saveCategories(updatedCategories);

    // Update all products linked to this category so they stay synced
    const products = this.getProducts();
    let updatedProductsCount = 0;
    const updatedProducts = products.map(p => {
      const norm = normalizeCategory(p.category);
      if (
        p.category === id ||
        p.category === oldLabel ||
        p.category.toLowerCase() === oldLabel.toLowerCase() ||
        norm === id
      ) {
        updatedProductsCount++;
        return { ...p, category: id };
      }
      return p;
    });

    if (updatedProductsCount > 0) {
      this.saveProducts(updatedProducts);
    }

    return { categories: updatedCategories, updatedProductsCount };
  },

  getTransactions(): Transaction[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.TRANSACTIONS);
      if (!data) {
        const initialProducts = this.getProducts();
        const initialTx = generateInitialTransactions(initialProducts);
        localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(initialTx));
        return initialTx;
      }
      return JSON.parse(data);
    } catch {
      return [];
    }
  },

  getLast7DaysSales(customTransactions?: Transaction[]): DailySalesChartData[] {
    const transactions = customTransactions || this.getTransactions();
    const result: DailySalesChartData[] = [];
    const today = new Date();

    const dayNames = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const dateKey = d.toISOString().split('T')[0];
      const dayName = i === 0 ? 'Hari Ini' : dayNames[d.getDay()];
      const shortDate = `${d.getDate()} ${monthNames[d.getMonth()]}`;

      const dayTx = transactions.filter(t => t.timestamp.startsWith(dateKey));
      const omset = dayTx.reduce((sum, t) => sum + t.finalAmount, 0);
      const laba = dayTx.reduce((sum, t) => sum + t.grossProfit, 0);
      const transaksiCount = dayTx.length;

      result.push({
        dateKey,
        dayName,
        shortDate,
        omset,
        laba,
        transaksiCount
      });
    }

    return result;
  },

  saveTransaction(newTx: Transaction): Product[] {
    const transactions = this.getTransactions();
    const updatedTransactions = [newTx, ...transactions];
    localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(updatedTransactions));

    // Deduct stock automatically
    const products = this.getProducts();
    const updatedProducts = products.map(product => {
      const purchased = newTx.items.find(item => item.product.id === product.id);
      if (purchased) {
        const remainingStock = Math.max(0, product.stock - purchased.quantity);
        return {
          ...product,
          stock: remainingStock
        };
      }
      return product;
    });

    this.saveProducts(updatedProducts);
    window.dispatchEvent(new Event('bekumart_data_changed'));
    return updatedProducts;
  },

  getSettings(): StoreSettings {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      if (!data) {
        localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(INITIAL_SETTINGS));
        return INITIAL_SETTINGS;
      }
      const parsed = JSON.parse(data);
      return {
        ...INITIAL_SETTINGS,
        ...parsed,
        logoUrl: parsed.logoUrl || INITIAL_SETTINGS.logoUrl,
        enabledPaymentMethods: parsed.enabledPaymentMethods || INITIAL_SETTINGS.enabledPaymentMethods,
      };
    } catch {
      return INITIAL_SETTINGS;
    }
  },

  saveSettings(settings: StoreSettings): void {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
    window.dispatchEvent(new Event('bekumart_data_changed'));
  },

  calculateDailyReport(targetDateStr?: string): DailyReportSummary {
    const dateStr = targetDateStr || new Date().toISOString().split('T')[0];
    const transactions = this.getTransactions();
    const products = this.getProducts();

    const filtered = transactions.filter(tx => tx.timestamp.startsWith(dateStr));

    const totalRevenue = filtered.reduce((acc, tx) => acc + tx.finalAmount, 0);
    const totalProfit = filtered.reduce((acc, tx) => acc + tx.grossProfit, 0);
    const totalTransactions = filtered.length;
    const averageBasketValue = totalTransactions > 0 ? Math.round(totalRevenue / totalTransactions) : 0;

    const paymentMethodStats: Record<PaymentMethod, { count: number; total: number }> = {
      cash: { count: 0, total: 0 },
      qris: { count: 0, total: 0 },
      transfer: { count: 0, total: 0 },
      debit: { count: 0, total: 0 }
    };

    filtered.forEach(tx => {
      const m = tx.paymentMethod;
      if (paymentMethodStats[m]) {
        paymentMethodStats[m].count += 1;
        paymentMethodStats[m].total += tx.finalAmount;
      }
    });

    // Hourly stats (07:00 to 22:00)
    const hourlyMap: Record<number, { total: number; count: number }> = {};
    for (let h = 7; h <= 21; h++) {
      hourlyMap[h] = { total: 0, count: 0 };
    }

    filtered.forEach(tx => {
      const h = new Date(tx.timestamp).getHours();
      if (!hourlyMap[h]) {
        hourlyMap[h] = { total: 0, count: 0 };
      }
      hourlyMap[h].total += tx.finalAmount;
      hourlyMap[h].count += 1;
    });

    const hourlyStats = Object.keys(hourlyMap).map(k => ({
      hour: Number(k),
      total: hourlyMap[Number(k)].total,
      count: hourlyMap[Number(k)].count
    })).sort((a, b) => a.hour - b.hour);

    // Top selling products
    const productSoldMap: Record<string, { name: string; quantity: number; revenue: number }> = {};
    filtered.forEach(tx => {
      tx.items.forEach(item => {
        if (!productSoldMap[item.product.id]) {
          productSoldMap[item.product.id] = {
            name: item.product.name,
            quantity: 0,
            revenue: 0
          };
        }
        productSoldMap[item.product.id].quantity += item.quantity;
        productSoldMap[item.product.id].revenue += item.subtotal;
      });
    });

    const topProducts = Object.keys(productSoldMap)
      .map(id => ({
        productId: id,
        name: productSoldMap[id].name,
        quantity: productSoldMap[id].quantity,
        revenue: productSoldMap[id].revenue
      }))
      .sort((a, b) => b.quantity - a.quantity);

    // Low stock & Near expiry
    const today = new Date();
    const thirtyDaysFromNow = new Date(today.getTime() + 30 * 24 * 3600 * 1000);

    const lowStockItems = products.filter(p => p.stock <= p.minStockAlert);
    const expiringItems = products.filter(p => {
      const expDate = new Date(p.expiryDate);
      return expDate <= thirtyDaysFromNow;
    });

    return {
      date: dateStr,
      totalRevenue,
      totalProfit,
      totalTransactions,
      averageBasketValue,
      paymentMethodStats,
      hourlyStats,
      topProducts,
      lowStockItems,
      expiringItems
    };
  },

  // Export transactions to CSV
  exportTransactionsToCSV(transactions: Transaction[]): void {
    const headers = [
      'No Invoice',
      'Waktu',
      'Kasir',
      'Pelanggan',
      'Metode Bayar',
      'Jumlah Item',
      'Total Belanja (Rp)',
      'Total Modal (Rp)',
      'Laba Kotor (Rp)',
      'Rincian Produk'
    ];

    const rows = transactions.map(tx => {
      const itemsDetail = tx.items.map(it => `${it.product.name} (${it.quantity}x)`).join('; ');
      return [
        tx.invoiceNumber,
        new Date(tx.timestamp).toLocaleString('id-ID'),
        tx.cashierName,
        tx.customerName || '-',
        tx.paymentMethod.toUpperCase(),
        tx.totalItemsCount,
        tx.finalAmount,
        tx.totalCost,
        tx.grossProfit,
        `"${itemsDetail.replace(/"/g, '""')}"`
      ];
    });

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [
      headers.join(','),
      ...rows.map(e => e.join(','))
    ].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Laporan_Transaksi_BekuMart_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  },

  // Export inventory to CSV (Google Sheets / AppSheet ready)
  exportProductsToCSV(products: Product[]): void {
    const headers = [
      'Product ID',
      'Nama Produk',
      'Kategori',
      'Isi (Kemasan/Karton)',
      'Harga Beli (Rp)',
      'Harga Per Karton (Rp)',
      'Harga Jual (Rp)',
      'SKU',
      'Barcode'
    ];

    const rows = products.map(p => {
      const isi = p.isi || '12 pack';
      const numIsi = parseInt(isi) || 12;
      const cartonPrice = p.cartonPrice || (p.costPrice * numIsi);
      return [
        p.id,
        `"${p.name.replace(/"/g, '""')}"`,
        p.category,
        `"${isi}"`,
        p.costPrice,
        cartonPrice,
        p.sellingPrice,
        p.sku,
        p.barcode
      ];
    });

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [
      headers.join(','),
      ...rows.map(e => e.join(','))
    ].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Inventaris_Stok_BekuMart_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  },

  // Generate WhatsApp report link
  generateWhatsAppReport(summary: DailyReportSummary, settings: StoreSettings): string {
    const formatRp = (num: number) => 'Rp ' + num.toLocaleString('id-ID');
    const todayStr = new Date().toLocaleDateString('id-ID', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    const lines = [
      `*🧊 LAPORAN PENJUALAN HARIAN ${settings.storeName.toUpperCase()}*`,
      `📅 *Tanggal:* ${todayStr}`,
      `🕒 *Waktu Laporan:* ${new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB`,
      `---------------------------------------`,
      `💰 *Total Omset:* ${formatRp(summary.totalRevenue)}`,
      `🛒 *Total Transaksi:* ${summary.totalTransactions} struk`,
      `🏷️ *Rata-rata Belanja (AOV):* ${formatRp(summary.averageBasketValue)}`,
      `---------------------------------------`,
      `*💳 METODE PEMBAYARAN:*`,
      `• Tunai: ${formatRp(summary.paymentMethodStats.cash.total)} (${summary.paymentMethodStats.cash.count}x)`,
      `• QRIS: ${formatRp(summary.paymentMethodStats.qris.total)} (${summary.paymentMethodStats.qris.count}x)`,
      `• Transfer: ${formatRp(summary.paymentMethodStats.transfer.total)} (${summary.paymentMethodStats.transfer.count}x)`,
      `• Debit: ${formatRp(summary.paymentMethodStats.debit.total)} (${summary.paymentMethodStats.debit.count}x)`,
      `---------------------------------------`,
      `*🏆 TOP 3 PRODUK TERLARIS HARI INI:*`,
      ...summary.topProducts.slice(0, 3).map((p, i) => `${i + 1}. ${p.name} - ${p.quantity} terjual (${formatRp(p.revenue)})`),
      `---------------------------------------`,
      `*⚠️ PERINGATAN STOK & FREEZER:*`,
      `• Stok Menipis: ${summary.lowStockItems.length} produk`,
      `• Mendekati Expired (<= 30 hari): ${summary.expiringItems.length} produk`,
      `---------------------------------------`,
      `_Laporan otomatis dikirim dari BekuMart POS Cloud System_`
    ];

    const cleanPhone = settings.ownerPhone.replace(/[^0-9]/g, '');
    const formattedPhone = cleanPhone.startsWith('0') ? '62' + cleanPhone.slice(1) : cleanPhone;
    const textEncoded = encodeURIComponent(lines.join('\n'));
    return `https://wa.me/${formattedPhone}?text=${textEncoded}`;
  },

  // Backup and restore functions
  backupAllData(): string {
    const payload = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      products: this.getProducts(),
      transactions: this.getTransactions(),
      settings: this.getSettings()
    };
    return JSON.stringify(payload, null, 2);
  },

  restoreAllData(jsonString: string): boolean {
    try {
      const data = JSON.parse(jsonString);
      if (data.products && Array.isArray(data.products)) {
        localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(data.products));
      }
      if (data.transactions && Array.isArray(data.transactions)) {
        localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(data.transactions));
      }
      if (data.settings && typeof data.settings === 'object') {
        localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(data.settings));
      }
      window.dispatchEvent(new Event('bekumart_data_changed'));
      return true;
    } catch {
      return false;
    }
  },

  resetToDefault(): void {
    localStorage.removeItem(STORAGE_KEYS.PRODUCTS);
    localStorage.removeItem(STORAGE_KEYS.TRANSACTIONS);
    localStorage.removeItem(STORAGE_KEYS.SETTINGS);
    window.dispatchEvent(new Event('bekumart_data_changed'));
  }
};
