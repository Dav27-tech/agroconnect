'use client';

import React, { Suspense, startTransition, useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { PageHeader } from '../../components/layout/PageHeader';
import { ProductCard } from '../../components/marketplace/ProductCard';
import { EmptyState } from '../../components/ui/EmptyState';
import { Input } from '../../components/ui/Input';
import { IconSearch } from '../../components/ui/Icons';
import { DRC_PROVINCES } from '../../constants/drc';
import { SellerOfferItem, Category } from '../../types';
import { api } from '../../services/api';

function normalizeSearchText(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase()
    .trim();
}

function CatalogueContent() {
  const searchParams = useSearchParams();
  const categorySlug = searchParams.get('category');
  const initialSearchQuery = searchParams.get('search') || searchParams.get('q') || '';
  const [categories, setCategories] = useState<Category[]>([]);
  const [offers, setOffers] = useState<SellerOfferItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const offersPerPage = 9;

  const [searchQuery, setSearchQuery] = useState(initialSearchQuery);
  const [selectedCategoryOverride, setSelectedCategoryOverride] = useState<string | null>(null);
  const selectedCategory = selectedCategoryOverride
    ?? categories.find((category) => category.slug === categorySlug)?.name
    ?? 'all';
  const [selectedProvince, setSelectedProvince] = useState<string>(searchParams.get('province') || 'all');
  const [selectedSellerType, setSelectedSellerType] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('featured');

  useEffect(() => {
    const nextSearchQuery = searchParams.get('search') || searchParams.get('q') || '';
    const nextProvince = searchParams.get('province') || 'all';
    startTransition(() => {
      setSearchQuery(nextSearchQuery);
      setSelectedProvince(nextProvince);
      setCurrentPage(1);
    });
  }, [searchParams]);

  // Chargement des données réelles depuis le backend
  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      try {
        const [cats, offs] = await Promise.all([
          api.categories.list(),
          api.offers.list(),
        ]);
        setCategories(cats);
        setOffers(offs);
      } catch (err) {
        console.error('Erreur chargement du catalogue :', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  // Filtrage combiné
  const filteredOffers = useMemo(() => {
    return offers
      .filter((offer) => {
        // Recherche textuelle
        if (searchQuery.trim()) {
          const queryTerms = normalizeSearchText(searchQuery).split(/\s+/);
          const searchableText = [
            offer.productName,
            offer.categoryName,
            offer.sellerName,
            offer.originCity,
            offer.originProvince,
          ].map((value) => normalizeSearchText(value || '')).join(' ');
          if (!queryTerms.every((term) => searchableText.includes(term))) {
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

  const totalPages = Math.ceil(filteredOffers.length / offersPerPage);
  const safeCurrentPage = Math.min(currentPage, Math.max(totalPages, 1));
  const visibleOffers = filteredOffers.slice(
    (safeCurrentPage - 1) * offersPerPage,
    safeCurrentPage * offersPerPage
  );
  const firstVisibleOffer = filteredOffers.length ? (safeCurrentPage - 1) * offersPerPage + 1 : 0;
  const lastVisibleOffer = Math.min(safeCurrentPage * offersPerPage, filteredOffers.length);

  const resetFilters = () => {
    setSearchQuery('');
    setSelectedCategoryOverride('all');
    setSelectedProvince('all');
    setSelectedSellerType('all');
    setSortBy('featured');
    setCurrentPage(1);
  };

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
        <section
          aria-label="Recherche et filtres du catalogue"
          className="mb-8 rounded-2xl border border-stone-200 bg-white p-4 shadow-sm sm:p-6"
        >
          <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-stone-900">Trouvez votre produit</h2>
              <p className="mt-1 text-xs text-stone-500">
                Recherchez par produit, vendeur ou localité.
              </p>
            </div>
            <span
              aria-live="polite"
              className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-900"
            >
              {isLoading
                ? 'Chargement des offres…'
                : `${filteredOffers.length} offre${filteredOffers.length > 1 ? 's' : ''}`}
            </span>
          </div>
          <div className="grid grid-cols-1 items-end gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <div className="min-w-0 lg:col-span-2">
              <Input
                aria-label="Rechercher un produit"
                label="Recherche"
                placeholder="Ex. maïs, tomates, Bukavu"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="h-12"
                leftIcon={<IconSearch className="h-4 w-4" />}
              />
            </div>
            <label className="block min-w-0 text-[11px] font-bold uppercase tracking-wide text-stone-600">
              Catégorie
              <select
                aria-label="Catégorie"
                value={selectedCategory}
                onChange={(e) => {
                  setSelectedCategoryOverride(e.target.value);
                  setCurrentPage(1);
                }}
                className="mt-1.5 h-12 w-full rounded-xl border border-stone-300 bg-white px-3 text-sm font-medium normal-case tracking-normal text-stone-800 outline-none transition focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/20"
              >
                <option value="all">Toutes les catégories</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.name}>{category.name}</option>
                ))}
              </select>
            </label>
            <label className="block min-w-0 text-[11px] font-bold uppercase tracking-wide text-stone-600">
              Province
              <select
                aria-label="Province"
                value={selectedProvince}
                onChange={(e) => {
                  setSelectedProvince(e.target.value);
                  setCurrentPage(1);
                }}
                className="mt-1.5 h-12 w-full rounded-xl border border-stone-300 bg-white px-3 text-sm font-medium normal-case tracking-normal text-stone-800 outline-none transition focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/20"
              >
                <option value="all">Toutes les provinces</option>
                {DRC_PROVINCES.map((province) => (
                  <option key={province} value={province}>{province}</option>
                ))}
              </select>
            </label>
            <label className="block min-w-0 text-[11px] font-bold uppercase tracking-wide text-stone-600">
              Trier par
              <select
                aria-label="Trier par"
                value={sortBy}
                onChange={(e) => {
                  setSortBy(e.target.value);
                  setCurrentPage(1);
                }}
                className="mt-1.5 h-12 w-full rounded-xl border border-stone-300 bg-white px-3 text-sm font-medium normal-case tracking-normal text-stone-800 outline-none transition focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/20"
              >
                <option value="featured">Pertinence</option>
                <option value="price-asc">Prix croissant</option>
                <option value="price-desc">Prix décroissant</option>
                <option value="stock-desc">Stock disponible</option>
              </select>
            </label>
          </div>
        </section>

        <div>
          {isLoading ? (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: offersPerPage }, (_, idx) => (
                <div key={idx} className="bg-white rounded-2xl p-4 border border-stone-200 h-80 animate-pulse" />
              ))}
            </div>
          ) : filteredOffers.length > 0 ? (
            <div>
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {visibleOffers.map((offer) => (
                  <ProductCard key={offer.id} offer={offer} />
                ))}
              </div>
              {totalPages > 1 && (
                <nav
                  aria-label="Pagination des offres"
                  className="mt-8 flex flex-col items-center justify-between gap-4 border-t border-stone-200 pt-6 sm:flex-row"
                >
                  <p aria-live="polite" className="text-sm text-stone-600">
                    Affichage {firstVisibleOffer}–{lastVisibleOffer} sur {filteredOffers.length} offres
                  </p>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                      disabled={safeCurrentPage === 1}
                      className="rounded-xl border border-stone-300 bg-white px-4 py-2 text-sm font-semibold text-stone-700 transition hover:border-emerald-700 hover:text-emerald-800 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Précédent
                    </button>
                    <span className="min-w-20 text-center text-sm font-semibold text-stone-700">
                      Page {safeCurrentPage} sur {totalPages}
                    </span>
                    <button
                      type="button"
                      onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                      disabled={safeCurrentPage === totalPages}
                      className="rounded-xl border border-emerald-800 bg-emerald-800 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Suivant
                    </button>
                  </div>
                </nav>
              )}
            </div>
          ) : (
            <EmptyState
              title="Aucune offre trouvée"
              description="Aucun produit ne correspond à ces critères. Essayez un autre terme ou élargissez les filtres."
              actionText="Réinitialiser les filtres"
              onAction={resetFilters}
            />
          )}
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
