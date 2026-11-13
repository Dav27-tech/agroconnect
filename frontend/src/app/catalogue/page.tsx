'use client';

import React, { Suspense, useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { PageHeader } from '../../components/layout/PageHeader';
import { ProductCard } from '../../components/marketplace/ProductCard';
import { EmptyState } from '../../components/ui/EmptyState';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { IconCategory, IconSearch, IconFilter } from '../../components/ui/Icons';
import { MOCK_OFFERS, MOCK_CATEGORIES } from '../../data/mockData';
import { DRC_PROVINCES } from '../../constants/drc';
import { SellerType, SellerOfferItem, Category } from '../../types';
import { api } from '../../services/api';

function CatalogueContent() {
  const searchParams = useSearchParams();
  const categorySlug = searchParams.get('category');
  const [categories, setCategories] = useState<Category[]>(MOCK_CATEGORIES);
  const [offers, setOffers] = useState<SellerOfferItem[]>(MOCK_OFFERS);
  const [isLoading, setIsLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedProvince, setSelectedProvince] = useState<string>('all');
  const [selectedSellerType, setSelectedSellerType] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('featured');
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  // Chargement des données réelles depuis le backend
  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      try {
        const [cats, offs] = await Promise.all([
          api.categories.list(),
          api.offers.list(),
        ]);
        if (cats && cats.length > 0) setCategories(cats);
        if (offs && offs.length > 0) setOffers(offs);
      } catch (err) {
        console.warn('Utilisation des données locales de catalogue :', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  useEffect(() => {
    if (categorySlug && categories.length > 0) {
      const match = categories.find((c) => c.slug === categorySlug);
      if (match) setSelectedCategory(match.name);
    }
  }, [categorySlug, categories]);

  // Filtrage combiné
  const filteredOffers = useMemo(() => {
    return offers
      .filter((offer) => {
        // Recherche textuelle
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchesName = offer.productName?.toLowerCase().includes(q);
          const matchesCategory = offer.categoryName?.toLowerCase().includes(q);
          const matchesSeller = offer.sellerName?.toLowerCase().includes(q);
          const matchesCity = offer.originCity?.toLowerCase().includes(q);
          if (!matchesName && !matchesCategory && !matchesSeller && !matchesCity) {
            return false;
          }
        }

        // Catégorie
        if (selectedCategory !== 'all') {
          const cat = categories.find((c) => c.slug === selectedCategory || c.name === selectedCategory);
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
      })
      .sort((a, b) => {
        if (sortBy === 'price-asc') return a.retailPriceCdf - b.retailPriceCdf;
        if (sortBy === 'price-desc') return b.retailPriceCdf - a.retailPriceCdf;
        if (sortBy === 'stock-desc') return b.stockQuantity - a.stockQuantity;
        return 0;
      });
  }, [offers, searchQuery, selectedCategory, selectedProvince, selectedSellerType, sortBy, categories]);

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
              <span className="text-xs text-stone-500 whitespace-nowrap">Trier par :</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="text-xs bg-white border border-stone-300 rounded-lg px-2.5 py-1.5 text-stone-800 font-medium focus:outline-none focus:ring-1 focus:ring-emerald-700"
              >
                <option value="featured">Pertinence AgroConnect</option>
                <option value="price-asc">Prix le plus bas (CDF)</option>
                <option value="price-desc">Prix le plus haut (CDF)</option>
                <option value="stock-desc">Stock disponible</option>
              </select>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar Filters (Desktop & Mobile Dropdown) */}
          <aside className={`lg:block ${showMobileFilters ? 'block mb-6' : 'hidden'}`}>
            <div className="bg-white p-6 rounded-2xl border border-stone-200 space-y-6 shadow-xs">
              <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                <h3 className="text-sm font-bold text-stone-900 flex items-center gap-2">
                  <IconFilter className="w-4 h-4 text-emerald-800" />
                  <span>Filtrer les offres</span>
                </h3>
                {hasActiveFilters && (
                  <button
                    type="button"
                    onClick={resetFilters}
                    className="text-[11px] text-orange-600 font-bold hover:underline cursor-pointer"
                  >
                    Réinitialiser
                  </button>
                )}
              </div>

              {/* Catégories / Filières */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-500 mb-2.5">
                  Filières Agricoles
                </label>
                <div className="space-y-1">
                  <button
                    type="button"
                    onClick={() => setSelectedCategory('all')}
                    className={`w-full text-left px-3 py-2 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center justify-between ${
                      selectedCategory === 'all'
                        ? 'bg-emerald-800 text-white'
                        : 'text-stone-700 hover:bg-stone-100'
                    }`}
                  >
                    <span>Toutes les filières</span>
                    <span className="text-[10px] opacity-80">{offers.length}</span>
                  </button>
                  {categories.map((cat) => {
                    const isSelected = selectedCategory === cat.name || selectedCategory === cat.slug;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setSelectedCategory(cat.name)}
                        className={`w-full text-left px-3 py-2 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center justify-between ${
                          isSelected
                            ? 'bg-emerald-800 text-white'
                            : 'text-stone-700 hover:bg-stone-100'
                        }`}
                      >
                        <span className="truncate">{cat.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Province d'Origine (RDC) */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-500 mb-2">
                  Province de production (RDC)
                </label>
                <select
                  value={selectedProvince}
                  onChange={(e) => setSelectedProvince(e.target.value)}
                  className="w-full text-xs bg-stone-50 border border-stone-200 rounded-lg p-2 text-stone-800 focus:outline-none focus:ring-1 focus:ring-emerald-700"
                >
                  <option value="all">Toutes les 26 provinces</option>
                  {DRC_PROVINCES.map((prov) => (
                    <option key={prov} value={prov}>
                      {prov}
                    </option>
                  ))}
                </select>
              </div>

              {/* Type d'Acteur / Vendeur */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-500 mb-2">
                  Profil du Vendeur
                </label>
                <div className="space-y-1.5">
                  {[
                    { value: 'all', label: 'Tous les acteurs' },
                    { value: 'FARMER', label: 'Agriculteurs & Coopératives' },
                    { value: 'RESELLER', label: 'Revendeurs & Grossistes' },
                    { value: 'SUPPLIER', label: 'Fournisseurs d\'Intrants' },
                  ].map((role) => (
                    <label key={role.value} className="flex items-center gap-2 text-xs text-stone-700 cursor-pointer">
                      <input
                        type="radio"
                        name="sellerType"
                        value={role.value}
                        checked={selectedSellerType === role.value}
                        onChange={(e) => setSelectedSellerType(e.target.value)}
                        className="text-emerald-800 focus:ring-emerald-700"
                      />
                      <span>{role.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </aside>

          {/* Product Grid Area */}
          <div className="lg:col-span-3">
            {isLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3, 4, 5, 6].map((idx) => (
                  <div key={idx} className="bg-white rounded-2xl p-4 border border-stone-200 h-80 animate-pulse" />
                ))}
              </div>
            ) : filteredOffers.length > 0 ? (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs text-stone-500 font-semibold">
                    {filteredOffers.length} offre{filteredOffers.length > 1 ? 's' : ''} agricole
                    {filteredOffers.length > 1 ? 's' : ''} répertoriée{filteredOffers.length > 1 ? 's' : ''}
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredOffers.map((offer) => (
                    <ProductCard key={offer.id} offer={offer} />
                  ))}
                </div>
              </div>
            ) : (
              <EmptyState
                title="Aucune offre trouvée"
                description="Aucun produit agricole ne correspond à vos critères de recherche actuels dans les 26 provinces de la RDC."
                actionText="Réinitialiser les filtres"
                onAction={resetFilters}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CataloguePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-stone-50 flex items-center justify-center p-8">
          <div className="text-center space-y-2">
            <span className="inline-block w-8 h-8 border-4 border-emerald-800 border-t-transparent rounded-full animate-spin" />
            <p className="text-xs text-stone-600 font-medium">Chargement du catalogue AgroConnect...</p>
          </div>
        </div>
      }
    >
      <CatalogueContent />
    </Suspense>
  );
}
