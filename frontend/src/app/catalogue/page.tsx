'use client';

import React, { useState, useMemo } from 'react';
import { PageHeader } from '../../components/layout/PageHeader';
import { ProductCard } from '../../components/marketplace/ProductCard';
import { EmptyState } from '../../components/ui/EmptyState';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { IconSearch, IconFilter } from '../../components/ui/Icons';
import { MOCK_OFFERS, MOCK_CATEGORIES } from '../../data/mockData';
import { DRC_PROVINCES } from '../../constants/drc';
import { SellerType } from '../../types';

export default function CataloguePage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedProvince, setSelectedProvince] = useState<string>('all');
  const [selectedSellerType, setSelectedSellerType] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('featured');
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  // Filtrage combiné
  const filteredOffers = useMemo(() => {
    return MOCK_OFFERS.filter((offer) => {
      // Recherche textuelle
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = offer.productName.toLowerCase().includes(q);
        const matchesCategory = offer.categoryName.toLowerCase().includes(q);
        const matchesSeller = offer.sellerName.toLowerCase().includes(q);
        const matchesCity = offer.originCity.toLowerCase().includes(q);
        if (!matchesName && !matchesCategory && !matchesSeller && !matchesCity) {
          return false;
        }
      }

      // Catégorie
      if (selectedCategory !== 'all') {
        const cat = MOCK_CATEGORIES.find((c) => c.slug === selectedCategory || c.name === selectedCategory);
        if (cat && offer.categoryName !== cat.name) {
          return false;
        }
      }

      // Province RDC
      if (selectedProvince !== 'all' && offer.originProvince !== selectedProvince) {
        return false;
      }

      // Type de vendeur
      if (selectedSellerType !== 'all' && offer.sellerType !== selectedSellerType) {
        return false;
      }

      return true;
    }).sort((a, b) => {
      if (sortBy === 'price-asc') return a.retailPriceCdf - b.retailPriceCdf;
      if (sortBy === 'price-desc') return b.retailPriceCdf - a.retailPriceCdf;
      if (sortBy === 'stock-desc') return b.stockQuantity - a.stockQuantity;
      return 0; // Default
    });
  }, [searchQuery, selectedCategory, selectedProvince, selectedSellerType, sortBy]);

  const resetFilters = () => {
    setSearchQuery('');
    setSelectedCategory('all');
    setSelectedProvince('all');
    setSelectedSellerType('all');
    setSortBy('featured');
  };

  const hasActiveFilters =
    searchQuery !== '' ||
    selectedCategory !== 'all' ||
    selectedProvince !== 'all' ||
    selectedSellerType !== 'all' ||
    sortBy !== 'featured';

  return (
    <div className="bg-stone-50 min-h-screen pb-20">
      <PageHeader
        title="Catalogue des Produits Agricoles"
        subtitle="Découvrez et comparez les récoltes et intrants proposés en direct par les producteurs et revendeurs agréés de la RDC."
        breadcrumbs={[
          { label: 'Accueil', href: '/' },
          { label: 'Catalogue' },
        ]}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        {/* Top Controls Bar */}
        <div className="bg-white p-4 rounded-2xl border border-stone-200 mb-8 flex flex-col md:flex-row items-center justify-between gap-4 shadow-xs">
          {/* Quick Search Input */}
          <div className="w-full md:w-96">
            <Input
              placeholder="Rechercher manioc, maïs, haricot..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              leftIcon={<IconSearch className="w-4 h-4" />}
            />
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end">
            {/* Mobile Filter Toggle */}
            <Button
              variant="outline"
              size="sm"
              className="lg:hidden"
              leftIcon={<IconFilter className="w-4 h-4" />}
              onClick={() => setShowMobileFilters(!showMobileFilters)}
            >
              Filtres
            </Button>

            {/* Tri */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-stone-500 font-medium hidden sm:inline">Trier par :</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="text-xs font-bold text-stone-700 bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 outline-none cursor-pointer"
              >
                <option value="featured">Pertinence AgroConnect</option>
                <option value="price-asc">Prix croissant (CDF)</option>
                <option value="price-desc">Prix décroissant (CDF)</option>
                <option value="stock-desc">Stock disponible le plus élevé</option>
              </select>
            </div>
          </div>
        </div>

        {/* Layout with Sidebar & Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Filter Sidebar (Desktop & Mobile Drawer) */}
          <aside
            className={`lg:col-span-1 bg-white p-6 rounded-2xl border border-stone-200 h-fit space-y-6 ${
              showMobileFilters ? 'block' : 'hidden lg:block'
            }`}
          >
            <div className="flex items-center justify-between pb-4 border-b border-stone-100">
              <h2 className="text-sm font-bold text-stone-900 uppercase tracking-wider flex items-center gap-2">
                <IconFilter className="w-4 h-4 text-emerald-800" />
                Filtres Avancés
              </h2>
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={resetFilters}
                  className="text-xs font-semibold text-orange-600 hover:text-orange-700"
                >
                  Réinitialiser
                </button>
              )}
            </div>

            {/* Catégories */}
            <div>
              <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-2.5">
                Filière Agricole
              </label>
              <div className="space-y-1.5 text-xs">
                <button
                  type="button"
                  onClick={() => setSelectedCategory('all')}
                  className={`w-full text-left px-2.5 py-1.5 rounded-lg font-medium transition ${
                    selectedCategory === 'all'
                      ? 'bg-emerald-800 text-white font-bold'
                      : 'text-stone-600 hover:bg-stone-50'
                  }`}
                >
                  Toutes les filières ({MOCK_OFFERS.length})
                </button>
                {MOCK_CATEGORIES.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setSelectedCategory(cat.name)}
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg font-medium transition flex items-center justify-between ${
                      selectedCategory === cat.name
                        ? 'bg-emerald-800 text-white font-bold'
                        : 'text-stone-600 hover:bg-stone-50'
                    }`}
                  >
                    <span>{cat.icon} {cat.name}</span>
                    <span className="text-[10px] opacity-75">{cat.itemCount}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Province RDC */}
            <div>
              <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-2">
                Province d&apos;Origine (RDC)
              </label>
              <select
                value={selectedProvince}
                onChange={(e) => setSelectedProvince(e.target.value)}
                className="w-full text-xs font-semibold text-stone-700 bg-stone-50 border border-stone-200 rounded-xl p-2.5 outline-none cursor-pointer"
              >
                <option value="all">Toutes les 26 provinces</option>
                {DRC_PROVINCES.map((prov) => (
                  <option key={prov} value={prov}>
                    {prov}
                  </option>
                ))}
              </select>
            </div>

            {/* Type de Vendeur */}
            <div>
              <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-2">
                Type de Vendeur
              </label>
              <div className="space-y-1.5 text-xs">
                {[
                  { value: 'all', label: 'Tous les vendeurs' },
                  { value: 'FARMER', label: 'Producteurs Agricoles Directs' },
                  { value: 'RESELLER', label: 'Revendeurs & Grossistes Agréés' },
                  { value: 'SUPPLIER', label: 'Fournisseurs d\'Intrants' },
                ].map((t) => (
                  <label
                    key={t.value}
                    className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-stone-50 cursor-pointer text-stone-700"
                  >
                    <input
                      type="radio"
                      name="sellerType"
                      checked={selectedSellerType === t.value}
                      onChange={() => setSelectedSellerType(t.value as SellerType | 'all')}
                      className="text-emerald-800 focus:ring-emerald-800"
                    />
                    <span className={selectedSellerType === t.value ? 'font-bold text-stone-900' : ''}>
                      {t.label}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Rappel Intermédiaire */}
            <div className="pt-4 border-t border-stone-100 text-[11px] text-stone-500 leading-relaxed bg-stone-50 p-3 rounded-xl border border-stone-200/60">
              <strong className="text-emerald-800 font-bold block mb-1">Stock Garanti en RDC</strong>
              Toutes les offres listées représentent des lots physiques existants avec prix fixés directement par chaque vendeur.
            </div>
          </aside>

          {/* Product Grid Area */}
          <main className="lg:col-span-3">
            {/* Active Filters Badges */}
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs text-stone-500">
                Affichage de <strong className="text-stone-900 font-bold">{filteredOffers.length}</strong> offre{filteredOffers.length > 1 ? 's' : ''} disponible{filteredOffers.length > 1 ? 's' : ''}
              </span>
            </div>

            {filteredOffers.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                {filteredOffers.map((offer) => (
                  <ProductCard key={offer.id} offer={offer} />
                ))}
              </div>
            ) : (
              <EmptyState
                icon="🔍"
                title="Aucune offre trouvée"
                description="Aucun produit agricole ne correspond à vos critères de recherche actuels. Essayez de réinitialiser vos filtres ou d'élargir la province sélectionnée."
                actionText="Réinitialiser tous les filtres"
                onAction={resetFilters}
              />
            )}
          </main>
        </div>
      </div>
    </div>
  );
}

