'use client';

import React, { useState, useMemo, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { PageHeader } from '../../components/layout/PageHeader';
import { ProductCard } from '../../components/marketplace/ProductCard';
import { SellerCard } from '../../components/marketplace/SellerCard';
import { EmptyState } from '../../components/ui/EmptyState';
import { Input } from '../../components/ui/Input';
import { IconSearch } from '../../components/ui/Icons';
import { MOCK_OFFERS, MOCK_SELLERS } from '../../data/mockData';
import { DRC_PROVINCES } from '../../constants/drc';

function SearchResultsContent() {
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get('q') || '';
  const initialProvince = searchParams.get('province') || 'all';

  const [query, setQuery] = useState(initialQuery);
  const [province, setProvince] = useState(initialProvince);
  const [activeTab, setActiveTab] = useState<'all' | 'offers' | 'sellers'>('all');

  const matchingOffers = useMemo(() => {
    return MOCK_OFFERS.filter((o) => {
      const q = query.toLowerCase().trim();
      const matchText =
        !q ||
        o.productName.toLowerCase().includes(q) ||
        o.categoryName.toLowerCase().includes(q) ||
        o.sellerName.toLowerCase().includes(q) ||
        o.originCity.toLowerCase().includes(q);

      const matchProv = province === 'all' || o.originProvince === province;

      return matchText && matchProv;
    });
  }, [query, province]);

  const matchingSellers = useMemo(() => {
    return MOCK_SELLERS.filter((s) => {
      const q = query.toLowerCase().trim();
      const matchText =
        !q ||
        s.businessName.toLowerCase().includes(q) ||
        s.city.toLowerCase().includes(q) ||
        s.specialties.some((spec) => spec.toLowerCase().includes(q));

      const matchProv = province === 'all' || s.province === province;

      return matchText && matchProv;
    });
  }, [query, province]);

  const totalResults = matchingOffers.length + matchingSellers.length;

  return (
    <div className="bg-stone-50 min-h-screen pb-20">
      <PageHeader
        title="Résultats de Recherche"
        subtitle={
          query
            ? `Résultats pour « ${query} » ${province !== 'all' ? `dans la province de ${province}` : 'à travers toute la RDC'}`
            : 'Explorez l\'intégralité des productions et vendeurs référencés'
        }
        breadcrumbs={[
          { label: 'Accueil', href: '/' },
          { label: 'Recherche' },
        ]}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        {/* Search & Province Form */}
        <div className="bg-white p-5 rounded-3xl border border-stone-200 mb-8 shadow-xs flex flex-col md:flex-row gap-4 items-center">
          <div className="flex-1 w-full">
            <Input
              placeholder="Nom de produit, variété, maïs, manioc, haricot, vendeur..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              leftIcon={<IconSearch className="w-5 h-5 text-stone-400" />}
            />
          </div>
          <div className="w-full md:w-64">
            <select
              value={province}
              onChange={(e) => setProvince(e.target.value)}
              className="w-full text-xs font-semibold text-stone-700 bg-stone-50 border border-stone-200 rounded-xl p-3 outline-none cursor-pointer"
            >
              <option value="all">Toutes provinces RDC (26)</option>
              {DRC_PROVINCES.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Tabs switcher */}
        <div className="flex items-center gap-2 border-b border-stone-200 pb-3 mb-8">
          <button
            type="button"
            onClick={() => setActiveTab('all')}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition ${activeTab === 'all'
                ? 'bg-emerald-800 text-white'
                : 'text-stone-600 hover:bg-stone-100'
              }`}
          >
            Tous les résultats ({totalResults})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('offers')}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition ${activeTab === 'offers'
                ? 'bg-emerald-800 text-white'
                : 'text-stone-600 hover:bg-stone-100'
              }`}
          >
            Offres Produits ({matchingOffers.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('sellers')}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition ${activeTab === 'sellers'
                ? 'bg-emerald-800 text-white'
                : 'text-stone-600 hover:bg-stone-100'
              }`}
          >
            Producteurs & Vendeurs ({matchingSellers.length})
          </button>
        </div>

        {totalResults === 0 ? (
          <EmptyState
            icon={<IconSearch className="w-7 h-7" aria-hidden="true" />}
            title="Aucun résultat correspondant"
            description={`Nous n'avons trouvé aucun produit ni vendeur correspondant à votre recherche. Vérifiez l'orthographe ou tentez d'élargir la province sélectionnée.`}
            actionText="Parcourir tout le catalogue"
            actionHref="/catalogue"
          />
        ) : (
          <div className="space-y-12">
            {/* Offers Section */}
            {(activeTab === 'all' || activeTab === 'offers') && matchingOffers.length > 0 && (
              <div>
                <h2 className="text-xl font-bold text-stone-900 mb-4 flex items-center justify-between">
                  <span>Offres de Produits Disponibles ({matchingOffers.length})</span>
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  {matchingOffers.map((offer) => (
                    <ProductCard key={offer.id} offer={offer} />
                  ))}
                </div>
              </div>
            )}

            {/* Sellers Section */}
            {(activeTab === 'all' || activeTab === 'sellers') && matchingSellers.length > 0 && (
              <div>
                <h2 className="text-xl font-bold text-stone-900 mb-4 flex items-center justify-between">
                  <span>Producteurs & Revendeurs Trouvés ({matchingSellers.length})</span>
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {matchingSellers.map((seller) => (
                    <SellerCard key={seller.id} seller={seller} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="p-12 text-center text-stone-500 font-bold">Chargement de la recherche...</div>}>
      <SearchResultsContent />
    </Suspense>
  );
}
