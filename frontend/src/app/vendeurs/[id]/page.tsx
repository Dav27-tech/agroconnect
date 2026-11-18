'use client';

import React, { useMemo, useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { PageHeader } from '../../../components/layout/PageHeader';
import { ProductCard } from '../../../components/marketplace/ProductCard';
import { EmptyState } from '../../../components/ui/EmptyState';
import { translateSellerType } from '../../../utils/format';
import { IconPlant, IconShieldCheck, IconLocation, IconPhone, IconBuilding } from '../../../components/ui/Icons';
import { api } from '../../../services/api';
import { SellerOfferItem, SellerProfile } from '../../../types';

export default function SellerProfilePage() {
  const params = useParams();
  const sellerId = params?.id as string;

  const [seller, setSeller] = useState<SellerProfile | null>(null);
  const [offers, setOffers] = useState<SellerOfferItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function fetchSellerData() {
      try {
        const [sellerRes, offersRes] = await Promise.all([
          api.sellers.getById(sellerId),
          api.offers.list({ sellerId }),
        ]);
        if (mounted) {
          setSeller(sellerRes);
          setOffers(offersRes);
        }
      } catch (err) {
        console.error('Erreur chargement vendeur:', err);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    fetchSellerData();
    return () => {
      mounted = false;
    };
  }, [sellerId]);

  const sellerOffers = useMemo(() => {
    return offers.filter((o) => o.sellerId === seller?.id || o.sellerId === sellerId);
  }, [offers, seller, sellerId]);

  if (loading) {
    return <p className="p-12 text-center text-sm text-stone-500">Chargement du vendeur...</p>;
  }

  if (!seller) {
    return (
      <EmptyState
        title="Vendeur introuvable"
        description="Le profil de ce producteur ou revendeur n'existe pas."
        actionText="Retourner au catalogue"
        actionHref="/catalogue"
      />
    );
  }

  const sellerInfo = translateSellerType(seller.sellerType);

  return (
    <div className="bg-stone-50 min-h-screen pb-20">
      <PageHeader
        title={seller.businessName}
        subtitle={`${seller.city}, Province du ${seller.province}`}
        breadcrumbs={[
          { label: 'Accueil', href: '/' },
          { label: 'Vendeurs', href: '/#vendeurs' },
          { label: seller.businessName },
        ]}
      />

      {/* Seller Hero Cover */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        <div className="bg-white rounded-3xl border border-stone-200 overflow-hidden shadow-xs mb-10">
          <div className="h-24 w-full bg-emerald-900" />

          {/* Profile Header Details */}
          <div className="px-6 sm:px-10 pb-8 pt-0">
            <div className="relative -mt-16 sm:-mt-20 mb-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
              <div className="flex items-end gap-5">
                <div className="relative w-28 h-28 sm:w-36 sm:h-36 rounded-3xl overflow-hidden border-4 border-white shadow-lg bg-emerald-50 text-emerald-800 flex items-center justify-center shrink-0">
                  <IconPlant className="w-12 h-12" aria-hidden="true" />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className={`text-xs font-bold px-2.5 py-0.5 rounded-md border ${sellerInfo.badgeClass}`}>
                      {sellerInfo.label}
                    </span>
                    {seller.verificationStatus === 'VERIFIED' && (
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-md border border-emerald-200">
                        <IconShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
                        Identité & Registre Vérifiés
                      </span>
                    )}
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-black text-stone-900">
                    {seller.businessName}
                  </h1>
                  <p className="text-xs sm:text-sm text-stone-500 flex items-center gap-1 mt-1 font-medium">
                    <IconLocation className="w-4 h-4 text-stone-400" />
                    <span>{seller.address || seller.city}, {seller.city} ({seller.province}, RDC)</span>
                  </p>
                </div>
              </div>

              <p className="text-sm font-semibold text-stone-700 self-start sm:self-auto">
                {sellerOffers.length} offre{sellerOffers.length === 1 ? '' : 's'} active{sellerOffers.length === 1 ? '' : 's'}
              </p>
            </div>

            {/* Seller Story / Description */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pt-6 border-t border-stone-100">
              <div className="lg:col-span-2">
                <h3 className="text-sm font-bold text-stone-900 uppercase tracking-wider mb-2">
                  À Propos de cette Exploitation / Entreprise
                </h3>
                <p className="text-sm text-stone-600 leading-relaxed font-normal mb-6">
                  {seller.description}
                </p>

                {seller.services && seller.services.length > 0 && (
                  <div>
                    <h4 className="text-xs font-bold text-stone-700 uppercase tracking-wider mb-2">Services</h4>
                    <ul className="space-y-1 text-sm text-stone-600">
                      {seller.services.map((service) => <li key={service.id}>{service.title}</li>)}
                    </ul>
                  </div>
                )}
              </div>

              {/* Direct Inquiries & Contact Note */}
              <div className="bg-stone-50 p-5 rounded-2xl border border-stone-200/80 space-y-3 text-xs">
                <h4 className="font-bold text-stone-900 text-sm">Informations Commerciales</h4>
                {seller.phone && (
                  <div className="flex items-center gap-2 text-stone-600">
                    <IconPhone className="w-4 h-4 text-emerald-800" />
                    <span>Support commande : {seller.phone}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-stone-600">
                  <IconBuilding className="w-4 h-4 text-emerald-800" />
                  <span>Localisation dépôt : {seller.city}</span>
                </div>
                <p className="text-[11px] text-stone-400 pt-2 border-t border-stone-200 leading-relaxed">
                  Toutes les commandes passées auprès de ce vendeur bénéficient de la protection d&apos;intermédiation AgroConnect et du paiement sécurisé Mobile Money.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Seller's Products / Offers List */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-black text-stone-900">
                Offres Actives de {seller.businessName} ({sellerOffers.length})
              </h2>
              <p className="text-xs text-stone-500">
                Stocks réels disponibles à l&apos;expédition depuis {seller.city} ({seller.province}).
              </p>
            </div>
          </div>

          {sellerOffers.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {sellerOffers.map((offer) => (
                <ProductCard key={offer.id} offer={offer} />
              ))}
            </div>
          ) : (
            <EmptyState
              title="Aucune offre publiée"
              description="Ce vendeur n'a pas d'offre active pour le moment."
              actionText="Voir tout le catalogue"
              actionHref="/catalogue"
            />
          )}
        </div>
      </div>
    </div>
  );
}
