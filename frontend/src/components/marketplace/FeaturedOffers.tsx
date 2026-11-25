'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { ProductCard } from './ProductCard';
import { IconChevronRight } from '../ui/Icons';
import { api } from '../../services/api';
import { SellerOfferItem } from '../../types';
import { useRealtime } from '../../context/RealtimeContext';

export function FeaturedOffers() {
  const socket = useRealtime();
  const [offers, setOffers] = useState<SellerOfferItem[]>([]);
  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);
  const carouselRef = useRef<HTMLDivElement>(null);

  const updateScrollControls = () => {
    const carousel = carouselRef.current;
    if (!carousel) return;
    setCanScrollPrev(carousel.scrollLeft > 2);
    setCanScrollNext(carousel.scrollLeft + carousel.clientWidth < carousel.scrollWidth - 2);
  };

  const scrollOffers = (direction: -1 | 1) => {
    const carousel = carouselRef.current;
    if (!carousel) return;
    carousel.scrollBy({
      left: direction * Math.max(260, carousel.clientWidth * 0.8),
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
    });
  };

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

  useEffect(() => {
    const carousel = carouselRef.current;
    if (!carousel) return;

    updateScrollControls();
    const resizeObserver = new ResizeObserver(updateScrollControls);
    resizeObserver.observe(carousel);

    return () => {
      resizeObserver.disconnect();
    };
  }, [offers.length]);

  return (
    <section className="py-16 sm:py-20 bg-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col justify-between gap-4 sm:mb-10 md:flex-row md:items-end">
          <div>
            <span className="ac-eyebrow">Offres à la une</span>
            <h2 className="text-3xl font-black text-stone-900 mt-3">
              Les offres mises en avant par les vendeurs
            </h2>
            <p className="text-sm text-stone-600 mt-2 max-w-2xl leading-relaxed">
              Découvrez les produits disponibles et commandez directement auprès des vendeurs. Tous les prix sont en CDF.
            </p>
          </div>
          {offers.length > 1 && (
            <div className="flex shrink-0 items-center gap-2 self-end md:self-auto">
              <button
                type="button"
                onClick={() => scrollOffers(-1)}
                disabled={!canScrollPrev}
                aria-label="Afficher les offres précédentes"
                className="flex h-10 w-10 items-center justify-center rounded-full border border-stone-200 bg-white text-stone-700 transition hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-900 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <IconChevronRight className="h-4 w-4 rotate-180" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => scrollOffers(1)}
                disabled={!canScrollNext}
                aria-label="Afficher les offres suivantes"
                className="flex h-10 w-10 items-center justify-center rounded-full border border-stone-200 bg-white text-stone-700 transition hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-900 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <IconChevronRight className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          )}
        </div>

        {offers.length > 0 ? (
          <div
            ref={carouselRef}
            onScroll={updateScrollControls}
            tabIndex={0}
            role="region"
            aria-roledescription="carrousel"
            aria-label="Offres mises en avant"
            className="flex snap-x snap-mandatory gap-4 overflow-x-auto overscroll-x-contain scroll-smooth pb-3 focus-visible:rounded-xl focus-visible:outline-2 focus-visible:outline-emerald-700 sm:gap-5"
          >
            {offers.map((offer) => (
              <div
                key={offer.id}
                className="snap-start transition-transform duration-300 hover:-translate-y-1"
                style={{ flex: '0 0 min(82vw, 21rem)' }}
              >
                <ProductCard offer={offer} />
              </div>
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
