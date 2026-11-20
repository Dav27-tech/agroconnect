'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ProductCard } from './ProductCard';
import { IconChevronRight } from '../ui/Icons';
import { api } from '../../services/api';
import { SellerOfferItem } from '../../types';
import { useRealtime } from '../../context/RealtimeContext';

export function FeaturedOffers() {
  const socket = useRealtime();
  const [offers, setOffers] = useState<SellerOfferItem[]>([]);

  useEffect(() => {
    let mounted = true;
    async function loadOffers() {
      try {
        const res = await api.offers.list({ featured: true });
        if (mounted && Array.isArray(res)) {
          setOffers(res);
        }
      } catch (err) {
        console.error('Erreur chargement offres vedettes:', err);
      }
    }
    loadOffers();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!socket) return;
    const refreshOffers = () => {
      void api.offers.list({ featured: true })
        .then((result) => setOffers(result))
        .catch((error) => console.error('Erreur de mise à jour des offres vedettes :', error));
    };
    socket.on('inventory.updated', refreshOffers);
    return () => {
      socket.off('inventory.updated', refreshOffers);
    };
  }, [socket]);

  return (
    <section className="py-16 sm:py-20 bg-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 sm:mb-12 gap-4">
          <div>
            <span className="ac-eyebrow">Offres à la une</span>
            <h2 className="text-3xl font-black text-stone-900 mt-3">
              Les offres mises en avant par les vendeurs
            </h2>
            <p className="text-sm text-stone-600 mt-2 max-w-2xl leading-relaxed">
              Découvrez les produits disponibles et commandez directement auprès des vendeurs. Tous les prix sont en CDF.
            </p>
          </div>
        </div>

        {offers.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
            {offers.map((offer) => (
              <ProductCard key={offer.id} offer={offer} />
            ))}
          </div>
        ) : (
          <p className="py-8 text-center text-sm text-stone-500">
            Les offres mises en avant apparaîtront ici.
          </p>
        )}

        <div className="mt-8 text-center">
          <Link
            href="/catalogue"
            className="inline-flex items-center gap-1 text-sm font-bold text-emerald-800 hover:text-emerald-700"
          >
            Voir le catalogue complet
            <IconChevronRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
