import { Product, Transaction, CategoryItem } from '../types';

export interface AppSheetSpreadsheetInfo {
  spreadsheetId: string;
  spreadsheetUrl: string;
  spreadsheetName: string;
  createdTime: string;
}

export class GoogleSheetsService {
  /**
   * Helper to execute Google Sheets API fetch calls with Bearer Token
   */
  private static async request(endpoint: string, accessToken: string, options: RequestInit = {}) {
    const response = await fetch(endpoint, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
        ...(options.headers || {}),
      },
    });

    if (!response.ok) {
      const errText = await response.text();
      let message = response.statusText;
      try {
        const parsed = JSON.parse(errText);
        if (parsed.error?.message) {
          message = parsed.error.message;
        }
      } catch {
        message = errText || response.statusText;
      }
      throw new Error(`Google Sheets API Error (${response.status}): ${message}`);
    }

    return response.json();
  }

  /**
   * Formats products into sheet rows
   */
  private static formatProductRows(products: Product[]): (string | number)[][] {
    return products.map(p => [
      p.id,
      p.name,
      p.category,
      p.sellingPrice,
      p.costPrice || 0,
      p.stock,
      p.unit,
      p.barcode || '',
      p.isi || '',
      p.freezerLocation || '',
      p.temperatureTarget || '',
      p.expiryDate || '',
      p.isHalal ? 'Ya' : 'Tidak',
      new Date().toISOString(),
    ]);
  }

  /**
   * Formats transactions into master rows
   */
  private static formatTransactionRows(transactions: Transaction[]): (string | number)[][] {
    return transactions.map(t => [
      t.id,
      t.invoiceNumber,
      t.timestamp,
      t.cashierName || 'Kasir',
      t.paymentMethod.toUpperCase(),
      t.finalAmount,
      t.totalItemsCount,
      t.cashGiven || t.finalAmount,
      t.changeAmount || 0,
      t.customerName || 'Umum',
      t.notes || '',
      'BERHASIL',
    ]);
  }

  /**
   * Formats transaction item details
   */
  private static formatDetailRows(transactions: Transaction[]): (string | number)[][] {
    const rows: (string | number)[][] = [];
    transactions.forEach(t => {
      t.items.forEach(it => {
        rows.push([
          t.id,
          t.invoiceNumber,
          it.product.id,
          it.product.name,
          it.quantity,
          it.product.sellingPrice,
          it.discountPercent || 0,
          it.subtotal,
        ]);
      });
    });
    return rows;
  }

  /**
   * Formats categories into sheet rows
   */
  private static formatCategoryRows(products: Product[]): (string | number)[][] {
    const counts: Record<string, number> = {};
    products.forEach(p => {
      const cat = p.category || 'Umum';
      counts[cat] = (counts[cat] || 0) + 1;
    });

    return Object.entries(counts).map(([catName, count]) => [
      catName,
      count,
    ]);
  }

  /**
   * Creates a dedicated spreadsheet with 4 normalized sheets ready for AppSheet:
   * 1. Produk
   * 2. Transaksi
   * 3. Detail_Transaksi
   * 4. Kategori
   */
  static async createAppSheetSpreadsheet(
    accessToken: string,
    storeName: string,
    products: Product[],
    transactions: Transaction[]
  ): Promise<AppSheetSpreadsheetInfo> {
    const title = `${storeName} - AppSheet POS Database`;

    const createPayload = {
      properties: {
        title,
      },
      sheets: [
        {
          properties: {
            title: 'Produk',
            gridProperties: {
              frozenRowCount: 1,
            },
          },
        },
        {
          properties: {
            title: 'Transaksi',
            gridProperties: {
              frozenRowCount: 1,
            },
          },
        },
        {
          properties: {
            title: 'Detail_Transaksi',
            gridProperties: {
              frozenRowCount: 1,
            },
          },
        },
        {
          properties: {
            title: 'Kategori',
            gridProperties: {
              frozenRowCount: 1,
            },
          },
        },
      ],
    };

    const created = await this.request(
      'https://sheets.googleapis.com/v4/spreadsheets',
      accessToken,
      {
        method: 'POST',
        body: JSON.stringify(createPayload),
      }
    );

    const spreadsheetId = created.spreadsheetId;
    const spreadsheetUrl = created.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;

    // Populate Initial Data
    await this.syncAllData(accessToken, spreadsheetId, products, transactions);

    return {
      spreadsheetId,
      spreadsheetUrl,
      spreadsheetName: title,
      createdTime: new Date().toISOString(),
    };
  }

  /**
   * Syncs all products, transactions, and categories to the spreadsheet
   */
  static async syncAllData(
    accessToken: string,
    spreadsheetId: string,
    products: Product[],
    transactions: Transaction[]
  ): Promise<void> {
    // 1. Clear existing contents to overwrite fresh data
    const clearEndpoint = (range: string) =>
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}:clear`;

    try {
      await Promise.all([
        this.request(clearEndpoint('Produk!A1:Z5000'), accessToken, { method: 'POST' }),
        this.request(clearEndpoint('Transaksi!A1:Z5000'), accessToken, { method: 'POST' }),
        this.request(clearEndpoint('Detail_Transaksi!A1:Z5000'), accessToken, { method: 'POST' }),
        this.request(clearEndpoint('Kategori!A1:Z5000'), accessToken, { method: 'POST' }),
      ]);
    } catch (err) {
      console.warn('Clear step warning (might be new sheet):', err);
    }

    // 2. Prepare headers + data rows
    const productHeaders = [
      'ID_Produk',
      'Nama_Produk',
      'Kategori',
      'Harga_Jual',
      'Harga_Modal',
      'Stok',
      'Satuan',
      'Barcode',
      'Isi_Kemasan',
      'Lokasi_Freezer',
      'Suhu_Target',
      'Kedaluwarsa',
      'Status_Halal',
      'Update_Terakhir',
    ];

    const transactionHeaders = [
      'ID_Transaksi',
      'No_Invoice',
      'Waktu_Transaksi',
      'Nama_Kasir',
      'Metode_Bayar',
      'Total_Belanja',
      'Jumlah_Item',
      'Tunai_Diterima',
      'Kembalian',
      'Pelanggan',
      'Catatan',
      'Status',
    ];

    const detailHeaders = [
      'ID_Transaksi',
      'No_Invoice',
      'ID_Produk',
      'Nama_Produk',
      'Kuantitas',
      'Harga_Satuan',
      'Diskon_Persen',
      'Subtotal',
    ];

    const categoryHeaders = ['Nama_Kategori', 'Total_Produk'];

    const batchData = [
      {
        range: 'Produk!A1:N',
        values: [productHeaders, ...this.formatProductRows(products)],
      },
      {
        range: 'Transaksi!A1:L',
        values: [transactionHeaders, ...this.formatTransactionRows(transactions)],
      },
      {
        range: 'Detail_Transaksi!A1:H',
        values: [detailHeaders, ...this.formatDetailRows(transactions)],
      },
      {
        range: 'Kategori!A1:B',
        values: [categoryHeaders, ...this.formatCategoryRows(products)],
      },
    ];

    await this.request(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`,
      accessToken,
      {
        method: 'POST',
        body: JSON.stringify({
          valueInputOption: 'USER_ENTERED',
          data: batchData,
        }),
      }
    );
  }

  /**
   * Appends a new completed transaction directly to the Transaksi and Detail_Transaksi sheets
   */
  static async appendTransaction(
    accessToken: string,
    spreadsheetId: string,
    transaction: Transaction
  ): Promise<void> {
    const txRow = [
      transaction.id,
      transaction.invoiceNumber,
      transaction.timestamp,
      transaction.cashierName || 'Kasir',
      transaction.paymentMethod.toUpperCase(),
      transaction.finalAmount,
      transaction.totalItemsCount,
      transaction.cashGiven || transaction.finalAmount,
      transaction.changeAmount || 0,
      transaction.customerName || 'Umum',
      transaction.notes || '',
      'BERHASIL',
    ];

    const detailRows = transaction.items.map(it => [
      transaction.id,
      transaction.invoiceNumber,
      it.product.id,
      it.product.name,
      it.quantity,
      it.product.sellingPrice,
      it.discountPercent || 0,
      it.subtotal,
    ]);

    // Append to Transaksi
    await this.request(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent('Transaksi!A:L')}:append?valueInputOption=USER_ENTERED`,
      accessToken,
      {
        method: 'POST',
        body: JSON.stringify({
          values: [txRow],
        }),
      }
    );

    // Append to Detail_Transaksi
    if (detailRows.length > 0) {
      await this.request(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent('Detail_Transaksi!A:H')}:append?valueInputOption=USER_ENTERED`,
        accessToken,
        {
          method: 'POST',
          body: JSON.stringify({
            values: detailRows,
          }),
        }
      );
    }
  }

  /**
   * Fetches products from Google Sheet (Two-way sync)
   */
  static async fetchProductsFromSheet(
    accessToken: string,
    spreadsheetId: string
  ): Promise<Product[]> {
    const data = await this.request(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent('Produk!A2:N')}`,
      accessToken
    );

    const rows: (string | number)[][] = data.values || [];
    return rows.map((row, idx) => ({
      id: String(row[0] || `prod-${Date.now()}-${idx}`),
      name: String(row[1] || 'Produk Tanpa Nama'),
      category: String(row[2] || 'Umum'),
      sellingPrice: Number(row[3]) || 0,
      costPrice: Number(row[4]) || 0,
      stock: Number(row[5]) || 0,
      unit: (row[6] as any) || 'pack',
      barcode: String(row[7] || ''),
      isi: String(row[8] || '1 pack'),
      cartonPrice: (Number(row[3]) || 0) * 10,
      sku: `SKU-${idx + 1}`,
      minStockAlert: 5,
      freezerLocation: String(row[9] || 'Freezer 01'),
      temperatureTarget: String(row[10] || '-18°C'),
      expiryDate: String(row[11] || '2027-12-31'),
      imageUrl: '',
      isHalal: String(row[12]).toLowerCase() === 'ya',
    }));
  }

  /**
   * Returns direct URL to create an AppSheet app from the Google Sheet
   */
  static getAppSheetCreateUrl(spreadsheetId: string): string {
    return `https://www.appsheet.com/Template/App/new?dataSourceId=google&sheetId=${encodeURIComponent(spreadsheetId)}`;
  }
}
