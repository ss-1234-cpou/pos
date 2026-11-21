import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Product } from '../types';
import { normalizeCategory, CATEGORY_LABELS } from '../data/initialProducts';
import { 
  Search, 
  X, 
  Plus, 
  Snowflake, 
  Package, 
  Sparkles, 
  Cake, 
  Apple, 
  Salad, 
  Check, 
  ShoppingBag,
  SlidersHorizontal,
  Layers
} from 'lucide-react';

interface ProductCatalogModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  onSelectProduct: (product: Product, quantity?: number) => void;
}

export const getCategoryIcon = (catId: string, className = "w-4 h-4") => {
  const norm = normalizeCategory(catId);
  switch (norm) {
    case 'sayur':
      return <Salad className={className} />;
    case 'buah':
      return <Apple className={className} />;
    case 'bahan_kue':
      return <Cake className={className} />;
    case 'plastik':
      return <Package className={className} />;
    case 'bumbu_saus':
      return <Sparkles className={className} />;
    case 'frozen_food':
    default:
      return <Snowflake className={className} />;
  }
};

export const getCategoryColor = (catId: string) => {
  const norm = normalizeCategory(catId);
  switch (norm) {
    case 'sayur':
      return 'bg-emerald-50 text-emerald-800 border-emerald-200';
    case 'buah':
      return 'bg-amber-50 text-amber-800 border-amber-200';
    case 'bahan_kue':
      return 'bg-orange-50 text-orange-800 border-orange-200';
    case 'plastik':
      return 'bg-stone-100 text-stone-800 border-stone-200';
    case 'bumbu_saus':
      return 'bg-rose-50 text-rose-800 border-rose-200';
    case 'frozen_food':
    default:
      return 'bg-amber-50 text-amber-900 border-amber-200';
  }
};

export const ProductCatalogModal: React.FC<ProductCatalogModalProps> = ({
  isOpen,
  onClose,
  products,
  onSelectProduct,
}) => {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [addedItemNotice, setAddedItemNotice] = useState<string | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Auto-focus search input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    } else {
      setSearch('');
      setSelectedCategory('all');
    }
  }, [isOpen]);

  // Keyboard shortcut Esc to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isOpen && e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const formatRp = (num: number) => 'Rp ' + (num || 0).toLocaleString('id-ID');

  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach(p => {
      set.add(normalizeCategory(p.category));
    });
    return ['all', ...Array.from(set)];
  }, [products]);

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchCat = selectedCategory === 'all' || normalizeCategory(p.category) === selectedCategory;
      const q = search.toLowerCase().trim();
      const matchSearch =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        p.barcode.includes(q) ||
        (p.isi && p.isi.toLowerCase().includes(q));
      return matchCat && matchSearch;
    });
  }, [products, selectedCategory, search]);

  const handlePick = (p: Product) => {
    onSelectProduct(p, 1);
    setAddedItemNotice(`+1 ${p.name}`);
    setTimeout(() => {
      setAddedItemNotice(null);
    }, 1200);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-2 sm:p-4 overflow-hidden animate-fadeIn">
      <div className="relative w-full max-w-4xl max-h-[92vh] bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-stone-200 bg-stone-50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-orange-600 text-white flex items-center justify-center shadow-xs">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-extrabold text-stone-900 text-base leading-tight">
                Katalog &amp; Pencarian Produk Manual
              </h2>
              <p className="text-xs text-stone-500">
                Pilih atau cari produk untuk langsung ditambahkan ke keranjang kasir
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {addedItemNotice && (
              <span className="hidden sm:inline-flex items-center gap-1.5 text-xs font-bold text-emerald-800 bg-emerald-100 px-3.5 py-1 rounded-full animate-pulse border border-emerald-300">
                <Check className="w-3.5 h-3.5" />
                {addedItemNotice}
              </span>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-stone-400 hover:text-stone-700 hover:bg-stone-200/60 transition-colors cursor-pointer"
              title="Tutup (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Search & Category Filter Bar */}
        <div className="p-4 border-b border-stone-200 bg-white space-y-3 shrink-0">
          {/* Search Input */}
          <div className="relative">
            <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Ketik nama sayur, buah, frozen food, atau kode SKU..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-9 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs sm:text-sm font-semibold text-stone-900 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 focus:bg-white transition-all shadow-inner"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Category Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
            {categories.map(cat => {
              const isSelected = selectedCategory === cat;
              const label = CATEGORY_LABELS[cat] || cat;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl font-bold whitespace-nowrap transition-all active:scale-95 cursor-pointer ${
                    isSelected
                      ? 'bg-orange-600 text-white shadow-xs'
                      : 'bg-stone-100 text-stone-600 hover:bg-stone-200 hover:text-stone-900'
                  }`}
                >
                  {cat !== 'all' && getCategoryIcon(cat, 'w-3.5 h-3.5')}
                  <span>{label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Product Cards Grid Area */}
        <div className="flex-1 min-h-0 overflow-y-auto p-4 bg-[#FAF7F2]">
          {filteredProducts.length === 0 ? (
            <div className="py-16 text-center text-stone-400">
              <Package className="w-12 h-12 mx-auto mb-2 text-stone-300 stroke-[1.5]" />
              <p className="text-sm font-bold text-stone-700">Tidak ada produk ditemukan</p>
              <p className="text-xs text-stone-400 mt-1">Coba kata kunci pencarian atau kategori lain</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {filteredProducts.map(p => {
                const isOutOfStock = p.stock <= 0;
                const isLowStock = p.stock > 0 && p.stock <= (p.minStockAlert || 3);

                return (
                  <div
                    key={p.id}
                    onClick={() => handlePick(p)}
                    className="group relative bg-white border border-stone-200 hover:border-orange-500 rounded-2xl p-3 shadow-xs hover:shadow-md transition-all cursor-pointer flex flex-col justify-between active:scale-98"
                  >
                    <div>
                      {/* Product Visual Area */}
                      <div className="relative w-full h-24 mb-2 rounded-xl bg-stone-100 overflow-hidden flex items-center justify-center border border-stone-200/60">
                        {p.imageUrl ? (
                          <img
                            src={p.imageUrl}
                            alt={p.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            loading="lazy"
                          />
                        ) : (
                          <div className="flex flex-col items-center justify-center text-slate-400">
                            {getCategoryIcon(p.category, 'w-8 h-8 text-slate-400 mb-1')}
                            <span className="text-[10px] text-slate-400 font-medium capitalize">
                              {p.category}
                            </span>
                          </div>
                        )}

                        {/* Category Badge */}
                        <span className={`absolute top-1.5 left-1.5 text-[9px] font-bold px-1.5 py-0.5 rounded-md border ${getCategoryColor(p.category)}`}>
                          {CATEGORY_LABELS[normalizeCategory(p.category)] || p.category}
                        </span>

                        {/* Stock Tag */}
                        <span
                          className={`absolute bottom-1.5 right-1.5 text-[9px] font-bold px-1.5 py-0.5 rounded-md ${
                            isOutOfStock
                              ? 'bg-rose-500 text-white'
                              : isLowStock
                              ? 'bg-amber-500 text-white'
                              : 'bg-emerald-600/90 text-white'
                          }`}
                        >
                          Stok: {p.stock}
                        </span>
                      </div>

                      {/* Product Name */}
                      <h3 className="font-extrabold text-xs text-stone-900 group-hover:text-orange-600 line-clamp-2 transition-colors mb-1 leading-snug">
                        {p.name}
                      </h3>

                      {/* SKU & Unit */}
                      <div className="flex items-center gap-1.5 text-[10px] text-stone-400 font-mono-num mb-2">
                        <span>{p.sku}</span>
                        {p.isi && <span>• {p.isi}</span>}
                      </div>
                    </div>

                    {/* Price & Add Button */}
                    <div className="pt-2 border-t border-stone-100 flex items-center justify-between gap-1.5">
                      <div className="truncate">
                        <span className="text-[10px] text-stone-400 block leading-none">Harga</span>
                        <span className="text-xs sm:text-sm font-black text-stone-900 font-mono-num truncate block">
                          {formatRp(p.sellingPrice)}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={e => {
                          e.stopPropagation();
                          handlePick(p);
                        }}
                        className="px-3 py-1.5 rounded-xl bg-orange-50 text-orange-700 hover:bg-orange-600 hover:text-white flex items-center gap-1 transition-all shadow-2xs active:scale-95 shrink-0 text-xs font-black cursor-pointer border border-orange-200"
                        title="Tambah ke Keranjang"
                      >
                        <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                        <span>+ Tambah</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer Bar */}
        <div className="px-5 py-3.5 border-t border-stone-200 bg-white flex items-center justify-between text-xs text-stone-500 shrink-0">
          <span>Menampilkan <b>{filteredProducts.length}</b> produk katalog</span>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs transition-all shadow-xs active:scale-95 cursor-pointer"
          >
            Selesai Memilih
          </button>
        </div>
      </div>
    </div>
  );
};
