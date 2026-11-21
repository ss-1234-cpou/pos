import React, { useState, useMemo, useEffect } from 'react';
import { Product, ProductCategory } from '../types';
import { normalizeCategory, CATEGORY_LABELS } from '../data/initialProducts';
import { StorageService } from '../services/storage';
import { 
  Package, 
  Search, 
  Plus, 
  Edit, 
  Pencil,
  Trash2, 
  Download, 
  RotateCcw,
  X,
  Check,
  Layers,
  Filter,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  LayoutGrid,
  List
} from 'lucide-react';
import { getCategoryIcon, getCategoryColor } from './ProductCatalogModal';

interface ProductListViewProps {
  products: Product[];
  onUpdateProducts: (products: Product[]) => void;
}

const DEFAULT_CATEGORY_IDS = new Set([
  'sayur',
  'buah',
  'bahan_kue',
  'plastik',
  'bumbu_saus',
  'frozen_food'
]);

type SortField = 'name' | 'costPrice' | 'cartonPrice' | 'sellingPrice' | 'default';
type SortOrder = 'asc' | 'desc';

export const ProductListView: React.FC<ProductListViewProps> = ({
  products,
  onUpdateProducts,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  
  // View Mode: 'grid' (Visual Cards) or 'table' (Compact Table)
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  // Sorting State
  const [sortField, setSortField] = useState<SortField>('default');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(15);

  // Categories State loaded from StorageService
  const [categories, setCategories] = useState<{ id: string; label: string }[]>(() =>
    StorageService.getCategories()
  );

  // Inline Category Addition in Filter Bar
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategoryInput, setNewCategoryInput] = useState('');

  // Inline Category Renaming / Editing in Filter Bar
  const [isEditingCategory, setIsEditingCategory] = useState(false);
  const [editingCategoryInput, setEditingCategoryInput] = useState('');

  // Category Manager Pop-up Modal States
  const [isCategoryManagerOpen, setIsCategoryManagerOpen] = useState(false);
  const [editingCatIdInModal, setEditingCatIdInModal] = useState<string | null>(null);
  const [editingCatNameInModal, setEditingCatNameInModal] = useState('');
  const [modalNewCatInput, setModalNewCatInput] = useState('');

  // Category Addition in Modal Form
  const [isFormAddingCat, setIsFormAddingCat] = useState(false);
  const [formNewCatInput, setFormNewCatInput] = useState('');

  // Form State (Simple: nama, kategori, isi, harga beli, harga karton, harga jual)
  const [form, setForm] = useState<{
    name: string;
    category: ProductCategory;
    isi: string;
    costPrice: number;
    cartonPrice: number;
    sellingPrice: number;
  }>({
    name: '',
    category: 'sayur',
    isi: '12 pack',
    costPrice: 15000,
    cartonPrice: 180000,
    sellingPrice: 20000,
  });

  // Listen to categories changed event
  useEffect(() => {
    const handleCatsChanged = () => {
      setCategories(StorageService.getCategories());
    };
    window.addEventListener('bekumart_categories_changed', handleCatsChanged);
    return () => window.removeEventListener('bekumart_categories_changed', handleCatsChanged);
  }, []);

  const formatRp = (num: number) => 'Rp ' + (num || 0).toLocaleString('id-ID');

  // Dynamic category counts
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: products.length };
    categories.forEach(c => {
      counts[c.id] = 0;
    });
    products.forEach(p => {
      const norm = normalizeCategory(p.category);
      const matched = categories.find(c => c.id === norm || c.id === p.category || c.label.toLowerCase() === p.category.toLowerCase());
      const catKey = matched ? matched.id : norm;
      counts[catKey] = (counts[catKey] || 0) + 1;
    });
    return counts;
  }, [products, categories]);

  // Filtered & Sorted products list
  const processedProducts = useMemo(() => {
    // 1. Filter
    const filtered = products.filter(p => {
      const normCat = normalizeCategory(p.category);
      const matched = categories.find(c => c.id === normCat || c.id === p.category || c.label.toLowerCase() === p.category.toLowerCase());
      const catKey = matched ? matched.id : normCat;
      const matchCat = selectedCategory === 'all' || catKey === selectedCategory || normCat === selectedCategory || p.category === selectedCategory;
      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        p.name.toLowerCase().includes(q) ||
        (p.isi && p.isi.toLowerCase().includes(q)) ||
        (p.sku && p.sku.toLowerCase().includes(q)) ||
        (p.barcode && p.barcode.includes(q));
      return matchCat && matchSearch;
    });

    // 2. Sort
    if (sortField === 'default') {
      return filtered;
    }

    return [...filtered].sort((a, b) => {
      let comparison = 0;
      if (sortField === 'name') {
        comparison = a.name.localeCompare(b.name, 'id');
      } else if (sortField === 'costPrice') {
        comparison = a.costPrice - b.costPrice;
      } else if (sortField === 'cartonPrice') {
        const cpA = a.cartonPrice || (a.costPrice * (parseInt(a.isi) || 12));
        const cpB = b.cartonPrice || (b.costPrice * (parseInt(b.isi) || 12));
        comparison = cpA - cpB;
      } else if (sortField === 'sellingPrice') {
        comparison = a.sellingPrice - b.sellingPrice;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });
  }, [products, selectedCategory, searchQuery, sortField, sortOrder]);

  // Pagination calculation
  const totalPages = Math.max(1, Math.ceil(processedProducts.length / itemsPerPage));
  const paginatedProducts = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return processedProducts.slice(startIndex, startIndex + itemsPerPage);
  }, [processedProducts, currentPage, itemsPerPage]);

  // Sort toggle handler
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      if (sortOrder === 'asc') {
        setSortOrder('desc');
      } else {
        setSortField('default');
        setSortOrder('asc');
      }
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  // Reset page when category or search changes
  const handleCategoryChange = (catId: string) => {
    setSelectedCategory(catId);
    setCurrentPage(1);
    setIsAddingCategory(false);
    setIsEditingCategory(false);
  };

  const handleSearchChange = (val: string) => {
    setSearchQuery(val);
    setCurrentPage(1);
  };

  // Add new category from Filter Bar
  const handleSaveNewCategory = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newCategoryInput.trim();
    if (!trimmed) return;

    try {
      const newCat = StorageService.addCategory(trimmed);
      setCategories(StorageService.getCategories());
      setSelectedCategory(newCat.id);
      setCurrentPage(1);
      setIsAddingCategory(false);
      setNewCategoryInput('');
    } catch (err: any) {
      alert(err.message || 'Gagal menambahkan kategori');
    }
  };

  // Edit / Rename selected category
  const handleSaveEditCategory = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = editingCategoryInput.trim();
    if (!trimmed) return;

    try {
      const res = StorageService.updateCategory(selectedCategory, trimmed);
      setCategories(res.categories);
      onUpdateProducts(StorageService.getProducts());
      setIsEditingCategory(false);
      setEditingCategoryInput('');
    } catch (err: any) {
      alert(err.message || 'Gagal memperbarui nama kategori');
    }
  };

  // Category Pop-up Modal Handlers
  const handleStartEditInModal = (cat: { id: string; label: string }) => {
    setEditingCatIdInModal(cat.id);
    setEditingCatNameInModal(cat.label);
  };

  const handleSaveEditInModal = (catId: string) => {
    const trimmed = editingCatNameInModal.trim();
    if (!trimmed) return;
    try {
      const res = StorageService.updateCategory(catId, trimmed);
      setCategories(res.categories);
      onUpdateProducts(StorageService.getProducts());
      setEditingCatIdInModal(null);
      setEditingCatNameInModal('');
    } catch (err: any) {
      alert(err.message || 'Gagal mengubah nama kategori');
    }
  };

  const handleAddNewCatInModal = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = modalNewCatInput.trim();
    if (!trimmed) return;
    try {
      const newCat = StorageService.addCategory(trimmed);
      setCategories(StorageService.getCategories());
      setSelectedCategory(newCat.id);
      setModalNewCatInput('');
    } catch (err: any) {
      alert(err.message || 'Gagal menambahkan kategori');
    }
  };

  // Delete category if custom & empty
  const handleDeleteCategory = (catId: string, catLabel: string) => {
    if (confirm(`Hapus kategori "${catLabel}"?`)) {
      StorageService.deleteCategory(catId);
      setCategories(StorageService.getCategories());
      if (selectedCategory === catId) {
        setSelectedCategory('all');
      }
      setIsEditingCategory(false);
    }
  };

  // Add new category from Modal Form
  const handleSaveFormNewCat = () => {
    const trimmed = formNewCatInput.trim();
    if (!trimmed) return;

    try {
      const newCat = StorageService.addCategory(trimmed);
      setCategories(StorageService.getCategories());
      setForm(prev => ({ ...prev, category: newCat.id }));
      setIsFormAddingCat(false);
      setFormNewCatInput('');
    } catch (err: any) {
      alert(err.message || 'Gagal menambahkan kategori');
    }
  };

  // Auto-calculate Carton Price when Cost Price or Isi changes
  const handleCostPriceChange = (val: number) => {
    const numIsi = parseInt(form.isi) || 12;
    setForm(prev => ({
      ...prev,
      costPrice: val,
      cartonPrice: val * numIsi,
    }));
  };

  const handleIsiChange = (val: string) => {
    const numIsi = parseInt(val) || 12;
    setForm(prev => ({
      ...prev,
      isi: val,
      cartonPrice: prev.costPrice * numIsi,
    }));
  };

  const handleOpenAdd = () => {
    setEditingProduct(null);
    setForm({
      name: '',
      category: categories[0]?.id || 'sayur',
      isi: '12 pack',
      costPrice: 15000,
      cartonPrice: 180000,
      sellingPrice: 20000,
    });
    setIsFormAddingCat(false);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (p: Product) => {
    setEditingProduct(p);
    const isi = p.isi || '12 pack';
    const numIsi = parseInt(isi) || 12;
    const cartonPrice = p.cartonPrice || (p.costPrice * numIsi);
    setForm({
      name: p.name,
      category: normalizeCategory(p.category),
      isi,
      costPrice: p.costPrice,
      cartonPrice,
      sellingPrice: p.sellingPrice,
    });
    setIsFormAddingCat(false);
    setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('Hapus produk ini dari daftar?')) {
      const updated = products.filter(p => p.id !== id);
      StorageService.saveProducts(updated);
      onUpdateProducts(updated);
    }
  };

  const handleResetCatalog = () => {
    if (confirm('Kembalikan ke daftar produk bawaan lengkap?')) {
      const fresh = StorageService.resetToDefaultProducts();
      onUpdateProducts(fresh);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;

    let updated: Product[];
    if (editingProduct) {
      updated = products.map(p => {
        if (p.id === editingProduct.id) {
          return {
            ...p,
            name: form.name.trim(),
            category: form.category,
            isi: form.isi.trim() || '12 pack',
            costPrice: Number(form.costPrice) || 0,
            cartonPrice: Number(form.cartonPrice) || (Number(form.costPrice) * (parseInt(form.isi) || 12)),
            sellingPrice: Number(form.sellingPrice) || 0,
          };
        }
        return p;
      });
    } else {
      const randNum = Math.floor(1000 + Math.random() * 9000);
      const newP: Product = {
        id: `prod-${Date.now()}`,
        name: form.name.trim(),
        sku: `SKU-${randNum}`,
        barcode: `899${Math.floor(100000000 + Math.random() * 900000000)}`,
        category: form.category,
        isi: form.isi.trim() || '12 pack',
        costPrice: Number(form.costPrice) || 0,
        cartonPrice: Number(form.cartonPrice) || (Number(form.costPrice) * (parseInt(form.isi) || 12)),
        sellingPrice: Number(form.sellingPrice) || 0,
        stock: 50,
        minStockAlert: 10,
        unit: 'pack',
        freezerLocation: 'Toko',
        temperatureTarget: 'Suhu Ruang',
        expiryDate: '2027-01-01',
        imageUrl: '',
        isHalal: true,
      };
      updated = [newP, ...products];
    }

    StorageService.saveProducts(updated);
    onUpdateProducts(updated);
    setIsModalOpen(false);
    setEditingProduct(null);
  };

  // Helper render sort icon
  const renderSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="w-3 h-3 text-slate-300 group-hover:text-slate-400" />;
    }
    return sortOrder === 'asc' ? (
      <ArrowUp className="w-3 h-3 text-orange-600" />
    ) : (
      <ArrowDown className="w-3 h-3 text-orange-600" />
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-5 space-y-4">
      
      {/* 1. TOP HEADER & ACTIONS */}
      <div className="bg-white px-5 py-4 rounded-3xl border border-stone-200/90 shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-2xl bg-orange-600 text-white flex items-center justify-center shrink-0 shadow-xs">
            <Package className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-black text-stone-900 tracking-tight">Daftar Produk &amp; Harga</h2>
              <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-stone-100 text-stone-700 font-mono-num border border-stone-200">
                {products.length} produk
              </span>
            </div>
            <p className="text-xs text-stone-500">
              Katalog lengkap: nama barang, kategori, kemasan/isi, harga modal, harga karton, dan harga jual.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-center">
          <button
            onClick={handleResetCatalog}
            title="Kembalikan ke data bawaan lengkap"
            className="px-3 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Reset</span>
          </button>

          <button
            onClick={() => StorageService.exportProductsToCSV(products)}
            title="Download CSV"
            className="px-3 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden md:inline">CSV</span>
          </button>

          <button
            onClick={handleOpenAdd}
            className="px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-xl text-xs font-black flex items-center gap-1.5 shadow-md shadow-orange-600/20 transition-all cursor-pointer active:scale-95"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Tambah Produk</span>
          </button>
        </div>
      </div>

      {/* 2. DAFTAR KATEGORI BERBASIS CARD GRID (KOTAK-KOTAK MODERN) */}
      <div className="bg-white rounded-3xl border border-stone-200/90 p-5 shadow-sm space-y-4">
        {/* Header Kategori Toolbar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-orange-600 text-white flex items-center justify-center font-bold shadow-xs">
              <Layers className="w-4 h-4 stroke-[2.5]" />
            </div>
            <div>
              <h3 className="text-sm font-black text-stone-900 tracking-tight">Kategori Produk</h3>
              <p className="text-xs text-stone-500 font-medium">
                Pilih kotak kategori untuk memfilter barang secara cepat
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Tombol Kelola Semua Kategori */}
            <button
              type="button"
              onClick={() => setIsCategoryManagerOpen(true)}
              className="px-3.5 py-2 text-xs font-bold text-stone-800 bg-stone-100 hover:bg-stone-200/80 border border-stone-200 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs active:scale-95"
              title="Buka panel kelola, edit, dan tambah kategori"
            >
              <Layers className="w-3.5 h-3.5 text-orange-600" />
              <span>Kelola Kategori</span>
            </button>

            {/* Tombol Tambah Kategori */}
            {!isAddingCategory ? (
              <button
                type="button"
                onClick={() => setIsAddingCategory(true)}
                className="px-3.5 py-2 text-xs font-black text-white bg-orange-600 hover:bg-orange-500 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer shadow-xs active:scale-95"
                title="Tambah Kategori Baru"
              >
                <Plus className="w-3.5 h-3.5 stroke-[3]" />
                <span>+ Kategori Baru</span>
              </button>
            ) : null}
          </div>
        </div>

        {/* Card Form: Tambah Kategori Baru (Muncul jika tombol tambah ditekan) */}
        {isAddingCategory && (
          <form
            onSubmit={handleSaveNewCategory}
            className="p-3 bg-gradient-to-r from-orange-50 to-amber-50 rounded-2xl border-2 border-orange-300 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 animate-fadeIn"
          >
            <div className="flex items-center gap-2 flex-1">
              <div className="w-8 h-8 rounded-xl bg-orange-500 text-white flex items-center justify-center font-bold shrink-0">
                <Plus className="w-4 h-4 stroke-[3]" />
              </div>
              <input
                autoFocus
                type="text"
                placeholder="Ketik nama kategori baru (contoh: Minuman Dingin, Snack, Daging Segar)..."
                value={newCategoryInput}
                onChange={e => setNewCategoryInput(e.target.value)}
                className="flex-1 px-3.5 py-2 text-xs sm:text-sm rounded-xl bg-white border border-orange-300 font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500 shadow-inner"
              />
            </div>
            <div className="flex items-center gap-2 justify-end">
              <button
                type="submit"
                className="px-4 py-2 bg-orange-500 hover:bg-orange-400 text-slate-950 rounded-xl text-xs font-black shadow-xs cursor-pointer active:scale-95 transition-all border border-orange-300 flex items-center gap-1"
              >
                <Check className="w-3.5 h-3.5 stroke-[3]" />
                <span>Simpan Kategori</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsAddingCategory(false);
                  setNewCategoryInput('');
                }}
                className="px-3 py-2 text-slate-600 hover:bg-white/80 rounded-xl text-xs font-bold cursor-pointer transition-colors"
              >
                Batal
              </button>
            </div>
          </form>
        )}

        {/* Card Form: Edit Nama Kategori yang Sedang Dipilih */}
        {selectedCategory !== 'all' && isEditingCategory && (
          <form
            onSubmit={handleSaveEditCategory}
            className="p-3 bg-emerald-50 rounded-2xl border-2 border-emerald-400 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 animate-fadeIn"
          >
            <div className="flex items-center gap-2 flex-1">
              <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold shrink-0">
                <Pencil className="w-4 h-4" />
              </div>
              <input
                autoFocus
                type="text"
                placeholder="Ubah nama kategori..."
                value={editingCategoryInput}
                onChange={e => setEditingCategoryInput(e.target.value)}
                className="flex-1 px-3.5 py-2 text-xs sm:text-sm rounded-xl bg-white border border-emerald-400 font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-inner"
              />
            </div>
            <div className="flex items-center gap-2 justify-end">
              <button
                type="submit"
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black shadow-xs cursor-pointer active:scale-95 transition-all flex items-center gap-1"
              >
                <Check className="w-3.5 h-3.5 stroke-[3]" />
                <span>Simpan Perubahan</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsEditingCategory(false);
                  setEditingCategoryInput('');
                }}
                className="px-3 py-2 text-slate-600 hover:bg-white/80 rounded-xl text-xs font-bold cursor-pointer transition-colors"
              >
                Batal
              </button>
            </div>
          </form>
        )}

        {/* Kotak-kotak Grid Kategori (Card Grid Modern dengan Ikon Visual) */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-2.5">
          {/* Card: Semua Kategori */}
          <button
            type="button"
            onClick={() => handleCategoryChange('all')}
            className={`p-3 rounded-2xl border-2 text-left transition-all cursor-pointer flex flex-col justify-between gap-2 shadow-2xs hover:shadow-md active:scale-95 ${
              selectedCategory === 'all'
                ? 'bg-orange-600 text-white border-orange-600 ring-2 ring-orange-400/40'
                : 'bg-white hover:bg-stone-50 border-stone-200 text-stone-800'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold ${
                selectedCategory === 'all' ? 'bg-white/20 text-white' : 'bg-orange-50 text-orange-600'
              }`}>
                <Layers className="w-4 h-4 stroke-[2.5]" />
              </div>
              <span className={`text-[10px] font-mono-num font-black px-2 py-0.5 rounded-full ${
                selectedCategory === 'all' ? 'bg-white/20 text-white' : 'bg-stone-100 text-stone-600'
              }`}>
                {products.length}
              </span>
            </div>
            <div>
              <span className="text-xs font-black block leading-tight truncate">Semua Produk</span>
              <span className={`text-[10px] font-medium block mt-0.5 ${
                selectedCategory === 'all' ? 'text-orange-100' : 'text-stone-400'
              }`}>
                Seluruh katalog
              </span>
            </div>
          </button>

          {/* Cards: Setiap Kategori Produk */}
          {categories.map(cat => {
            const isSelected = selectedCategory === cat.id;
            const count = categoryCounts[cat.id] || 0;

            return (
              <div
                key={cat.id}
                onClick={() => handleCategoryChange(cat.id)}
                className={`group relative p-3 rounded-2xl border-2 text-left transition-all cursor-pointer flex flex-col justify-between gap-2 shadow-2xs hover:shadow-md active:scale-95 ${
                  isSelected
                    ? 'bg-orange-600 text-white border-orange-600 ring-2 ring-orange-400/40'
                    : 'bg-white hover:bg-stone-50 border-stone-200 text-stone-800'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold ${
                    isSelected ? 'bg-white/20 text-white' : getCategoryColor(cat.id)
                  }`}>
                    {getCategoryIcon(cat.id, 'w-4 h-4')}
                  </div>
                  <span className={`text-[10px] font-mono-num font-black px-2 py-0.5 rounded-full ${
                    isSelected ? 'bg-white/20 text-white' : 'bg-stone-100 text-stone-600'
                  }`}>
                    {count}
                  </span>
                </div>

                <div>
                  <span className="text-xs font-black block leading-tight truncate">
                    {cat.label}
                  </span>
                  <span className={`text-[10px] font-medium block mt-0.5 ${
                    isSelected ? 'text-orange-100' : 'text-stone-400'
                  }`}>
                    {count} item
                  </span>
                </div>

                {/* Quick edit shortcut button when hovering over selected card */}
                {isSelected && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingCategoryInput(cat.label);
                      setIsEditingCategory(true);
                      setIsAddingCategory(false);
                    }}
                    title="Ubah nama kategori ini"
                    className="absolute top-2 right-2 p-1 rounded-lg bg-white/20 hover:bg-white/30 text-white cursor-pointer transition-colors"
                  >
                    <Pencil className="w-3 h-3" />
                  </button>
                )}
              </div>
            );
          })}

          {/* Card: Tombol "+ Tambah Kategori" Cepat di dalam Grid */}
          <button
            type="button"
            onClick={() => setIsAddingCategory(true)}
            className="p-3 rounded-2xl border-2 border-dashed border-orange-300 hover:border-orange-500 bg-orange-50/50 hover:bg-orange-50 text-left transition-all cursor-pointer flex flex-col justify-between gap-2 shadow-2xs hover:shadow-sm active:scale-95 group"
          >
            <div className="w-8 h-8 rounded-xl bg-orange-500 text-white flex items-center justify-center font-bold group-hover:scale-105 transition-transform">
              <Plus className="w-4 h-4 stroke-[3]" />
            </div>
            <div>
              <span className="text-xs font-black text-orange-950 block leading-tight">
                + Tambah Kategori
              </span>
              <span className="text-[10px] text-orange-700/80 font-medium block mt-0.5">
                Kategori baru
              </span>
            </div>
          </button>
        </div>

        {/* 3. Kolom Pencarian Barang Berbasis Card Modern */}
        <div className="pt-1">
          <div className="relative">
            <Search className="w-4 h-4 text-stone-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none stroke-[2.5]" />
            <input
              type="text"
              placeholder="Pencarian cepat nama barang, sayur, buah, atau SKU..."
              value={searchQuery}
              onChange={e => handleSearchChange(e.target.value)}
              className="w-full pl-11 pr-10 py-3 text-xs sm:text-sm rounded-2xl bg-stone-50 hover:bg-white focus:bg-white border-2 border-stone-200 focus:border-orange-500 focus:outline-none font-bold text-stone-900 placeholder:text-stone-400 shadow-inner transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => handleSearchChange('')}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 p-1 rounded-lg cursor-pointer transition-colors"
                title="Hapus pencarian"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 3. BAGIAN DAFTAR PRODUK (RAPI, MODERN & SIMPLE) */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
        
        {/* Table Toolbar Header */}
        <div className="px-4 py-2.5 bg-slate-50/60 border-b border-slate-200/80 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-700">
              {selectedCategory === 'all'
                ? 'Semua Produk'
                : categories.find(c => c.id === selectedCategory)?.label || selectedCategory}
            </span>
            <span className="text-[11px] font-mono-num font-bold text-slate-400">
              ({processedProducts.length} produk)
            </span>
            {searchQuery && (
              <span className="text-[11px] bg-sky-50 text-sky-700 px-2 py-0.5 rounded font-medium">
                Pencarian: "{searchQuery}"
              </span>
            )}
          </div>

          {/* Controls: View Mode Toggle & Quick page size */}
          <div className="flex items-center gap-3">
            {/* View Mode Switcher */}
            <div className="flex items-center bg-stone-200/80 p-0.5 rounded-xl border border-stone-300/80 text-[11px]">
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                  viewMode === 'grid'
                    ? 'bg-white text-orange-700 shadow-xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
                title="Tampilan Kartu Grid Modern"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Grid Visual</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                  viewMode === 'table'
                    ? 'bg-white text-orange-700 shadow-xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
                title="Tampilan Tabel Ringkas"
              >
                <List className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Tabel</span>
              </button>
            </div>

            {/* Quick page size */}
            <div className="flex items-center gap-1.5 text-[11px]">
              <span className="hidden sm:inline text-stone-400 font-medium">Tampilkan:</span>
              {[15, 30, 50].map(size => (
                <button
                  key={size}
                  type="button"
                  onClick={() => {
                    setItemsPerPage(size);
                    setCurrentPage(1);
                  }}
                  className={`px-2 py-0.5 rounded-md font-mono-num font-bold transition-colors cursor-pointer ${
                    itemsPerPage === size
                      ? 'bg-stone-900 text-white'
                      : 'text-stone-600 hover:bg-stone-200'
                  }`}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* View Mode 1: Modern Grid Cards */}
        {viewMode === 'grid' ? (
          <div className="p-4 bg-[#FAF7F2]">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {paginatedProducts.map(p => {
                const isOutOfStock = p.stock <= 0;
                const isLowStock = p.stock > 0 && p.stock <= (p.minStockAlert || 3);
                const margin = p.sellingPrice - p.costPrice;
                const marginPct = p.costPrice > 0 ? Math.round((margin / p.costPrice) * 100) : 0;
                const isi = p.isi || '12 pack';
                const numIsi = parseInt(isi) || 12;
                const cartonPrice = p.cartonPrice || (p.costPrice * numIsi);

                return (
                  <div
                    key={p.id}
                    className="group bg-white border border-stone-200/90 hover:border-orange-400 rounded-3xl p-4 shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between"
                  >
                    <div>
                      {/* Product Visual Banner & Badges */}
                      <div className="relative w-full h-36 mb-3 rounded-2xl bg-stone-100 overflow-hidden flex items-center justify-center border border-stone-200/60">
                        {p.imageUrl ? (
                          <img
                            src={p.imageUrl}
                            alt={p.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            loading="lazy"
                          />
                        ) : (
                          <div className="flex flex-col items-center justify-center text-slate-400">
                            {getCategoryIcon(p.category, 'w-10 h-10 text-slate-300 mb-1 stroke-[1.5]')}
                            <span className="text-[10px] text-slate-400 font-medium capitalize">
                              {p.category}
                            </span>
                          </div>
                        )}

                        {/* Category Pill with Icon */}
                        <div className={`absolute top-2 left-2 flex items-center gap-1.5 text-[10px] font-bold px-2 py-0.5 rounded-lg border shadow-xs ${getCategoryColor(p.category)}`}>
                          {getCategoryIcon(p.category, 'w-3 h-3')}
                          <span>{CATEGORY_LABELS[normalizeCategory(p.category)] || p.category}</span>
                        </div>

                        {/* Stock Badge */}
                        <span
                          className={`absolute bottom-2 right-2 text-[10px] font-black px-2 py-0.5 rounded-lg shadow-xs ${
                            isOutOfStock
                              ? 'bg-rose-500 text-white'
                              : isLowStock
                              ? 'bg-amber-500 text-white'
                              : 'bg-emerald-600/95 text-white'
                          }`}
                        >
                          Stok: {p.stock}
                        </span>
                      </div>

                      {/* Title & SKU */}
                      <h3 className="font-black text-sm text-stone-900 group-hover:text-orange-600 transition-colors line-clamp-2 leading-snug min-h-[2.5rem]">
                        {p.name}
                      </h3>
                      <div className="flex items-center gap-2 text-[11px] text-stone-400 font-mono-num mt-1 mb-3">
                        <span>SKU: {p.sku}</span>
                        <span>•</span>
                        <span>{isi}</span>
                      </div>

                      {/* Price Matrix Strip */}
                      <div className="bg-stone-50 rounded-2xl p-3 border border-stone-200/70 space-y-1.5 text-xs font-mono-num mb-3">
                        <div className="flex items-center justify-between text-stone-500">
                          <span className="text-[11px]">Harga Modal:</span>
                          <span className="font-semibold text-stone-700">{formatRp(p.costPrice)}</span>
                        </div>
                        <div className="flex items-center justify-between text-stone-500">
                          <span className="text-[11px]">Per Karton:</span>
                          <span className="font-semibold text-stone-700">{formatRp(cartonPrice)}</span>
                        </div>
                        <div className="flex items-center justify-between pt-1.5 border-t border-stone-200">
                          <span className="font-bold text-stone-900 text-xs">Harga Jual:</span>
                          <span className="font-black text-orange-600 text-sm">{formatRp(p.sellingPrice)}</span>
                        </div>
                      </div>

                      {/* Margin & Laba */}
                      <div className="flex items-center justify-between text-[11px] text-stone-500 px-0.5 mb-2">
                        <span>Estimasi Laba:</span>
                        <span className="font-bold text-emerald-700 font-mono-num">
                          +{formatRp(margin)} ({marginPct}%)
                        </span>
                      </div>
                    </div>

                    {/* Quick Action Footer */}
                    <div className="pt-2.5 border-t border-stone-100 flex items-center justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(p)}
                        className="px-3.5 py-1.5 rounded-xl bg-stone-100 hover:bg-orange-50 text-stone-700 hover:text-orange-700 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs active:scale-95"
                      >
                        <Edit className="w-3.5 h-3.5" />
                        <span>Edit</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(p.id)}
                        className="p-1.5 rounded-xl bg-stone-100 hover:bg-rose-50 text-stone-400 hover:text-rose-600 transition-all cursor-pointer shadow-2xs active:scale-95"
                        title="Hapus Produk"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          /* View Mode 2: Clean Modern Table (Minimalis & Simpel) */
          <div className="overflow-x-auto">
            <table className="w-full text-left whitespace-nowrap">
              <thead className="bg-stone-50/90 border-b border-stone-200 text-stone-500 uppercase text-[11px] tracking-wider font-bold select-none">
                <tr>
                  <th className="py-3.5 px-4 w-12 text-center text-stone-400">#</th>
                  
                  {/* Nama Produk (Sortable) */}
                  <th 
                    onClick={() => handleSort('name')}
                    className="py-3.5 px-4 text-stone-700 font-bold cursor-pointer hover:text-orange-600 transition-colors group"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Nama Produk &amp; SKU</span>
                      {renderSortIcon('name')}
                    </div>
                  </th>

                  {/* Kategori */}
                  <th className="py-3.5 px-4 text-stone-700 font-bold">Kategori</th>

                  {/* Isi Kemasan */}
                  <th className="py-3.5 px-4 text-stone-700 font-bold">Isi Kemasan</th>

                  {/* Harga Beli / Modal (Sortable) */}
                  <th 
                    onClick={() => handleSort('costPrice')}
                    className="py-3.5 px-4 text-right text-stone-700 font-bold cursor-pointer hover:text-orange-600 transition-colors group"
                  >
                    <div className="flex items-center justify-end gap-1.5">
                      <span>Harga Modal</span>
                      {renderSortIcon('costPrice')}
                    </div>
                  </th>

                  {/* Harga Karton (Sortable) */}
                  <th 
                    onClick={() => handleSort('cartonPrice')}
                    className="py-3.5 px-4 text-right text-stone-700 font-bold cursor-pointer hover:text-orange-600 transition-colors group"
                  >
                    <div className="flex items-center justify-end gap-1.5">
                      <span>Harga Karton</span>
                      {renderSortIcon('cartonPrice')}
                    </div>
                  </th>

                  {/* Harga Jual (Sortable) */}
                  <th 
                    onClick={() => handleSort('sellingPrice')}
                    className="py-3.5 px-4 text-right text-stone-900 font-black cursor-pointer hover:text-orange-600 transition-colors group"
                  >
                    <div className="flex items-center justify-end gap-1.5">
                      <span>Harga Jual</span>
                      {renderSortIcon('sellingPrice')}
                    </div>
                  </th>

                  <th className="py-3.5 px-4 text-center text-stone-500 font-bold w-24">Aksi</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-stone-100 text-stone-700">
                {paginatedProducts.map((p, idx) => {
                  const normCat = normalizeCategory(p.category);
                  const matchedCat = categories.find(c => c.id === normCat || c.id === p.category || c.label.toLowerCase() === p.category.toLowerCase());
                  const catLabel = matchedCat ? matchedCat.label : (CATEGORY_LABELS[normCat] || p.category);

                  const isi = p.isi || '12 pack';
                  const numIsi = parseInt(isi) || 12;
                  const cartonPrice = p.cartonPrice || (p.costPrice * numIsi);
                  const rowNumber = (currentPage - 1) * itemsPerPage + idx + 1;
                  const margin = p.sellingPrice - p.costPrice;
                  const marginPct = p.costPrice > 0 ? Math.round((margin / p.costPrice) * 100) : 0;

                  return (
                    <tr 
                      key={p.id} 
                      className="hover:bg-orange-50/30 transition-colors duration-150 group"
                    >
                      {/* # Nomor */}
                      <td className="py-3.5 px-4 text-center text-stone-400 font-mono-num text-xs">
                        {rowNumber}
                      </td>

                      {/* Nama Produk & SKU Modern */}
                      <td className="py-3.5 px-4 max-w-xs truncate" title={p.name}>
                        <div className="font-bold text-stone-900 text-xs sm:text-sm group-hover:text-orange-600 transition-colors truncate">
                          {p.name}
                        </div>
                        <div className="text-[11px] text-stone-400 font-mono-num flex items-center gap-1.5 mt-0.5">
                          <span>{p.sku}</span>
                          {p.stock !== undefined && (
                            <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                              p.stock <= 0 ? 'text-rose-600 bg-rose-50' : 'text-stone-500'
                            }`}>
                              Stok: {p.stock}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Kategori Badge Minimalis dengan Ikon */}
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold border ${getCategoryColor(normCat)}`}>
                          {getCategoryIcon(normCat, 'w-3.5 h-3.5')}
                          <span>{catLabel}</span>
                        </span>
                      </td>

                      {/* Isi Kemasan */}
                      <td className="py-3.5 px-4 text-xs font-medium text-stone-600">
                        {isi}
                      </td>

                      {/* Harga Beli / Modal */}
                      <td className="py-3.5 px-4 text-right font-mono-num tabular-nums text-xs text-stone-500">
                        {formatRp(p.costPrice)}
                      </td>

                      {/* Harga Karton */}
                      <td className="py-3.5 px-4 text-right font-mono-num tabular-nums text-xs font-semibold text-stone-700">
                        {formatRp(cartonPrice)}
                      </td>

                      {/* Harga Jual Bersih & Terang */}
                      <td className="py-3.5 px-4 text-right font-mono-num tabular-nums">
                        <div className="flex items-center justify-end gap-1.5">
                          <span className="text-sm font-black text-orange-600">
                            {formatRp(p.sellingPrice)}
                          </span>
                          {marginPct > 0 && (
                            <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded-md border border-emerald-200">
                              +{marginPct}%
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Aksi Minimalis */}
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleOpenEdit(p)}
                            className="p-1.5 text-stone-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors cursor-pointer"
                            title="Edit Produk"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(p.id)}
                            className="p-1.5 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="Hapus Produk"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Empty state */}
        {processedProducts.length === 0 && (
          <div className="py-12 px-4 text-center space-y-3">
            <div className="w-10 h-10 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
              <Search className="w-5 h-5" />
            </div>
            <div className="text-xs text-slate-600 font-medium">
              Tidak ada produk yang cocok dengan kriteria filter saat ini.
            </div>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="px-3 py-1 bg-sky-50 hover:bg-sky-100 text-sky-700 rounded-lg text-xs font-bold transition-colors cursor-pointer"
              >
                Hapus Pencarian
              </button>
            )}
          </div>
        )}

        {/* 4. MODERN PAGINATION FOOTER */}
        {processedProducts.length > 0 && (
          <div className="px-4 py-3 bg-slate-50/70 border-t border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
            <div className="text-center sm:text-left">
              Menampilkan <span className="font-bold text-slate-800 font-mono-num">{paginatedProducts.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0}</span> - <span className="font-bold text-slate-800 font-mono-num">{Math.min(currentPage * itemsPerPage, processedProducts.length)}</span> dari <span className="font-bold text-slate-800 font-mono-num">{processedProducts.length}</span> produk
            </div>

            {totalPages > 1 && (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors"
                  title="Sebelumnya"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                
                {/* Page number buttons */}
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter(pNum => {
                    // Show current page, first, last, and immediate neighbors
                    return pNum === 1 || pNum === totalPages || Math.abs(pNum - currentPage) <= 1;
                  })
                  .map((pNum, i, arr) => {
                    const prev = arr[i - 1];
                    const showEllipsis = prev && pNum - prev > 1;
                    return (
                      <React.Fragment key={pNum}>
                        {showEllipsis && <span className="px-1 text-slate-400">...</span>}
                        <button
                          type="button"
                          onClick={() => setCurrentPage(pNum)}
                          className={`min-w-7 h-7 px-2 rounded-lg font-mono-num text-xs font-bold transition-colors cursor-pointer ${
                            currentPage === pNum
                              ? 'bg-slate-900 text-white shadow-2xs'
                              : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          {pNum}
                        </button>
                      </React.Fragment>
                    );
                  })}

                <button
                  type="button"
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors"
                  title="Berikutnya"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 5. SIMPLE MODAL FORM */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl p-5 max-w-sm w-full border border-slate-200 shadow-xl space-y-4">
            
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="font-extrabold text-sm text-slate-900 tracking-tight">
                {editingProduct ? 'Edit Produk' : 'Tambah Produk Baru'}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3 text-xs">
              
              {/* Nama Produk */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">Nama Produk</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Wortel Manis Berastagi 1kg"
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-200 font-medium text-slate-800 focus:ring-1 focus:ring-sky-500 focus:outline-none"
                />
              </div>

              {/* Kategori + Opsi Tambah Kategori */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block font-bold text-slate-700">Kategori</label>
                  {!isFormAddingCat && (
                    <button
                      type="button"
                      onClick={() => setIsFormAddingCat(true)}
                      className="text-[11px] font-bold text-sky-600 hover:text-sky-700 cursor-pointer"
                    >
                      + Tambah Kategori
                    </button>
                  )}
                </div>

                {isFormAddingCat ? (
                  <div className="flex items-center gap-1 mb-1.5">
                    <input
                      type="text"
                      autoFocus
                      placeholder="Nama kategori baru..."
                      value={formNewCatInput}
                      onChange={e => setFormNewCatInput(e.target.value)}
                      className="flex-1 px-2.5 py-1.5 rounded-lg border border-sky-300 font-medium text-slate-800 text-xs focus:outline-none focus:ring-1 focus:ring-sky-500"
                    />
                    <button
                      type="button"
                      onClick={handleSaveFormNewCat}
                      className="px-2.5 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-bold cursor-pointer"
                    >
                      Simpan
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsFormAddingCat(false);
                        setFormNewCatInput('');
                      }}
                      className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-xs cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <select
                    value={form.category}
                    onChange={e => setForm({ ...form, category: e.target.value })}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-200 font-medium text-slate-800 focus:ring-1 focus:ring-sky-500 focus:outline-none bg-white cursor-pointer"
                  >
                    {categories.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Isi */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">Isi (Kemasan / Karton)</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: 12 pack, 24 pcs, 10 kg"
                  value={form.isi}
                  onChange={e => handleIsiChange(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-200 font-medium text-slate-800 focus:ring-1 focus:ring-sky-500 focus:outline-none"
                />
              </div>

              {/* Harga Beli */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">Harga Beli (Modal Rp)</label>
                <input
                  type="number"
                  min="0"
                  required
                  value={form.costPrice || ''}
                  onChange={e => handleCostPriceChange(Number(e.target.value))}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-200 font-mono-num text-slate-800 focus:ring-1 focus:ring-sky-500 focus:outline-none"
                />
              </div>

              {/* Harga Per Karton */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">Harga Per Karton (Rp)</label>
                <input
                  type="number"
                  min="0"
                  required
                  value={form.cartonPrice || ''}
                  onChange={e => setForm({ ...form, cartonPrice: Number(e.target.value) })}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-200 font-mono-num text-slate-800 focus:ring-1 focus:ring-sky-500 focus:outline-none"
                />
              </div>

              {/* Harga Jual */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">Harga Jual (Rp)</label>
                <input
                  type="number"
                  min="0"
                  required
                  value={form.sellingPrice || ''}
                  onChange={e => setForm({ ...form, sellingPrice: Number(e.target.value) })}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-200 font-mono-num font-bold text-emerald-700 focus:ring-1 focus:ring-sky-500 focus:outline-none"
                />
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 font-semibold hover:bg-slate-50 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-bold shadow-xs cursor-pointer"
                >
                  Simpan Produk
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* 5. POP-UP MODAL KELOLA & EDIT SEMUA KATEGORI (BERBASIS CARD GRID MODERN) */}
      {isCategoryManagerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-3 sm:p-5 animate-fadeIn">
          <div className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl border-2 border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="p-5 sm:p-6 bg-linear-to-r from-blue-600 via-indigo-600 to-blue-700 text-white flex items-center justify-between border-b border-blue-500 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-white/20 text-white flex items-center justify-center font-black shadow-xs">
                  <Layers className="w-5 h-5 stroke-[2.5]" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black tracking-tight">
                    Kelola, Tambah &amp; Edit Kategori Produk
                  </h3>
                  <p className="text-xs text-blue-100">
                    Tampilan kartu kotak modern dengan ikon visual untuk setiap kategori toko.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsCategoryManagerOpen(false);
                  setEditingCatIdInModal(null);
                }}
                className="p-2 rounded-xl text-white/80 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content - Scrollable Card Grid */}
            <div className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1 min-h-0 bg-slate-50/50">
              
              {/* Card Form: Tambah Kategori Baru */}
              <div className="p-4 bg-white rounded-2xl border-2 border-orange-300 shadow-sm space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-xl bg-orange-500 text-white flex items-center justify-center font-bold">
                    <Plus className="w-4 h-4 stroke-[3]" />
                  </div>
                  <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                    Tambah Kategori Baru ke Toko
                  </h4>
                </div>

                <form onSubmit={handleAddNewCatInModal} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                  <input
                    type="text"
                    placeholder="Contoh: Daging Sapi, Minuman Kemasan, Makanan Siap Saji..."
                    value={modalNewCatInput}
                    onChange={e => setModalNewCatInput(e.target.value)}
                    className="flex-1 px-4 py-2.5 text-xs sm:text-sm font-bold text-slate-900 bg-orange-50/40 border-2 border-orange-200 rounded-xl focus:bg-white focus:outline-none focus:border-orange-500 shadow-inner"
                  />
                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-orange-500 hover:bg-orange-400 text-slate-950 rounded-xl text-xs font-black shadow-md cursor-pointer active:scale-95 transition-all border border-orange-300 flex items-center justify-center gap-1.5 shrink-0"
                  >
                    <Plus className="w-4 h-4 stroke-[3]" />
                    <span>Simpan Kategori Baru</span>
                  </button>
                </form>
              </div>

              {/* Grid Kotak-Kotak Semua Kategori */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <span>Daftar Kartu Kategori Aktif</span>
                    <span className="text-[10px] font-mono-num bg-slate-200 text-slate-700 px-2 py-0.5 rounded-full">
                      {categories.length} Kategori
                    </span>
                  </h4>
                  <span className="text-[11px] text-slate-400">
                    Klik Edit pada kartu untuk ubah nama
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
                  {categories.map(cat => {
                    const count = categoryCounts[cat.id] || 0;
                    const isEditing = editingCatIdInModal === cat.id;
                    const isDefault = DEFAULT_CATEGORY_IDS.has(cat.id);

                    return (
                      <div
                        key={cat.id}
                        className={`p-4 rounded-2xl border-2 transition-all flex flex-col justify-between gap-3 shadow-xs hover:shadow-md ${
                          isEditing
                            ? 'bg-emerald-50/80 border-emerald-400 ring-2 ring-emerald-400/20'
                            : 'bg-white hover:bg-slate-50/90 border-slate-200/90'
                        }`}
                      >
                        {isEditing ? (
                          /* Mode Edit di dalam Kartu */
                          <div className="space-y-3">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold">
                                <Pencil className="w-3.5 h-3.5" />
                              </div>
                              <span className="text-xs font-black text-emerald-950">Edit Nama Kategori</span>
                            </div>

                            <input
                              autoFocus
                              type="text"
                              value={editingCatNameInModal}
                              onChange={e => setEditingCatNameInModal(e.target.value)}
                              className="w-full px-3 py-2 text-xs font-bold text-slate-900 bg-white border-2 border-emerald-400 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-inner"
                            />

                            <div className="flex items-center gap-1.5 justify-end">
                              <button
                                type="button"
                                onClick={() => handleSaveEditInModal(cat.id)}
                                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black shadow-xs cursor-pointer active:scale-95 flex items-center gap-1"
                              >
                                <Check className="w-3.5 h-3.5 stroke-[3]" />
                                <span>Simpan</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingCatIdInModal(null)}
                                className="px-2.5 py-1.5 text-slate-500 hover:bg-slate-200 rounded-xl text-xs font-bold cursor-pointer"
                              >
                                Batal
                              </button>
                            </div>
                          </div>
                        ) : (
                          /* Mode Tampilan Normal Kartu Kategori */
                          <>
                            <div>
                              <div className="flex items-center justify-between mb-2">
                                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold shadow-2xs ${getCategoryColor(cat.id)}`}>
                                  {getCategoryIcon(cat.id, 'w-5 h-5')}
                                </div>
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                  isDefault
                                    ? 'bg-slate-100 text-slate-600 border border-slate-200'
                                    : 'bg-purple-100 text-purple-700 border border-purple-200'
                                }`}>
                                  {isDefault ? 'Bawaan' : 'Kustom'}
                                </span>
                              </div>

                              <h5 className="font-black text-slate-900 text-sm tracking-tight truncate">
                                {cat.label}
                              </h5>
                              <span className="text-xs text-slate-500 font-mono-num font-semibold mt-0.5 block">
                                {count} produk terdaftar
                              </span>
                            </div>

                            {/* Tombol Aksi di Bawah Kartu */}
                            <div className="flex items-center gap-1.5 pt-2 border-t border-slate-100 justify-end">
                              <button
                                type="button"
                                onClick={() => handleStartEditInModal(cat)}
                                className="px-3 py-1.5 text-xs font-black text-slate-800 bg-slate-100 hover:bg-emerald-100 hover:text-emerald-900 rounded-xl flex items-center gap-1 transition-all cursor-pointer shadow-2xs active:scale-95"
                                title="Ubah nama kategori"
                              >
                                <Pencil className="w-3 h-3 text-slate-500" />
                                <span>Edit</span>
                              </button>

                              {!isDefault && count === 0 && (
                                <button
                                  type="button"
                                  onClick={() => handleDeleteCategory(cat.id, cat.label)}
                                  className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-xl cursor-pointer transition-colors"
                                  title="Hapus Kategori Kosong Ini"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>

            {/* Modal Footer */}
            <div className="p-4 sm:p-5 bg-white border-t border-slate-200 flex items-center justify-between gap-3 shrink-0">
              <span className="text-xs text-slate-400 hidden sm:inline">
                Perubahan nama kategori akan langsung otomatis diperbarui di seluruh produk.
              </span>
              <button
                type="button"
                onClick={() => {
                  setIsCategoryManagerOpen(false);
                  setEditingCatIdInModal(null);
                }}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black shadow-md cursor-pointer transition-all ml-auto active:scale-95"
              >
                Selesai
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};

