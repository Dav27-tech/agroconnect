'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useParams } from 'next/navigation';
import { useCart } from '../../../context/CartContext';
import { useAuth } from '../../../context/AuthContext';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { EmptyState } from '../../../components/ui/EmptyState';
import { formatCdfPrice, translateSellerType } from '../../../utils/format';
import {
  IconCheck,
  IconLocation,
  IconPlant,
  IconShieldCheck,
  IconShoppingBag,
} from '../../../components/ui/Icons';
import { api } from '../../../services/api';
import { ProductCatalogItem, SellerOfferItem } from '../../../types';
import { useRealtime } from '../../../context/RealtimeContext';

export default function ProductDetailPage() {
  const socket = useRealtime();
  const params = useParams();
  const slug = params?.slug as string;

  const [product, setProduct] = useState<ProductCatalogItem | null>(null);
  const [productOffers, setProductOffers] = useState<SellerOfferItem[]>([]);
  const [selectedOfferId, setSelectedOfferId] = useState('');
  const [loadedSlug, setLoadedSlug] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [addedToCart, setAddedToCart] = useState(false);

  useEffect(() => {
    let mounted = true;
    api.products
      .getBySlug(slug)
      .then((result) => {
        if (!mounted) return;
        const firstOffer = result.offers[0];
        setProduct(result);
        setProductOffers(result.offers);
        setSelectedOfferId(firstOffer?.id || '');
        setQuantity(firstOffer ? Math.max(1, firstOffer.retailMinQuantity) : 1);
        setLoadedSlug(slug);
      })
      .catch((error) => {
        console.error('Erreur de chargement du produit:', error);
        if (mounted) {
          setProduct(null);
          setProductOffers([]);
          setSelectedOfferId('');
          setLoadedSlug(slug);
        }
      });
    return () => {
      mounted = false;
    };
  }, [slug]);

  useEffect(() => {
    if (!socket) return;
    const handleInventoryUpdate = (event: { offers: Array<{ offerId: string; stockQuantity: number; isAvailable: boolean }> }) => {
      setProductOffers((current) => current.map((offer) => {
        const update = event.offers.find((item) => item.offerId === offer.id);
        return update
          ? { ...offer, stockQuantity: update.stockQuantity, isAvailable: update.isAvailable }
          : offer;
      }));
    };
    socket.on('inventory.updated', handleInventoryUpdate);
    return () => {
      socket.off('inventory.updated', handleInventoryUpdate);
    };
  }, [socket]);

  const activeOffer = productOffers.find((offer) => offer.id === selectedOfferId) || productOffers[0];
  const isLoading = loadedSlug !== slug;
  const minimumQuantity = activeOffer ? Math.max(1, activeOffer.retailMinQuantity) : 1;
  const hasStock = Boolean(
    activeOffer &&
      activeOffer.isAvailable &&
      activeOffer.stockQuantity >= minimumQuantity
  );
  const isQuantityValid = Boolean(
    hasStock &&
      Number.isInteger(quantity) &&
      quantity >= minimumQuantity &&
      quantity <= (activeOffer?.stockQuantity ?? 0)
  );
  const isWholesale = Boolean(
    activeOffer?.wholesaleMinQuantity && quantity >= activeOffer.wholesaleMinQuantity
  );
  const unitPriceCdf = activeOffer
    ? isWholesale && activeOffer.wholesalePriceCdf
      ? activeOffer.wholesalePriceCdf
      : activeOffer.retailPriceCdf
    : 0;
  const totalCdf = unitPriceCdf * quantity;
  const sellerInfo = activeOffer ? translateSellerType(activeOffer.sellerType) : null;

  const { addToCart } = useCart();
  const { user, isAdmin, isLoading: isAuthLoading } = useAuth();
  const isOwnOffer = Boolean(user?.sellerId && activeOffer?.sellerId === user.sellerId);
  const availableOffersCount = productOffers.filter(
    (offer) => offer.isAvailable && offer.stockQuantity >= Math.max(1, offer.retailMinQuantity)
  ).length;

  const selectOffer = (offer: SellerOfferItem) => {
    setSelectedOfferId(offer.id);
    const minQuantity = Math.max(1, offer.retailMinQuantity);
    setQuantity(
      offer.stockQuantity >= minQuantity
        ? Math.min(Math.max(quantity, minQuantity), offer.stockQuantity)
        : minQuantity
    );
    setAddedToCart(false);
  };

  const handleAddToCart = () => {
    if (!activeOffer || !isQuantityValid || isAdmin || isOwnOffer) return;
    addToCart(activeOffer, quantity, isWholesale ? 'WHOLESALE' : 'RETAIL');
    setAddedToCart(true);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-stone-50 pb-16">
        <PageHeader title="Chargement du produit" subtitle="Nous préparons les informations de l’offre." />
        <div className="mx-auto grid max-w-7xl animate-pulse gap-6 px-4 py-8 sm:px-6 lg:grid-cols-12 lg:px-8">
          <div className="h-80 rounded-3xl bg-stone-200 sm:h-[28rem] lg:col-span-7" />
          <div className="space-y-4 rounded-3xl border border-stone-200 bg-white p-6 lg:col-span-5">
            <div className="h-5 w-1/3 rounded bg-stone-200" />
            <div className="h-8 w-3/4 rounded bg-stone-200" />
            <div className="h-28 rounded-2xl bg-stone-100" />
            <div className="h-12 rounded-xl bg-stone-200" />
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-stone-50 px-4 py-10">
        <EmptyState
          title="Produit introuvable"
          description="Ce produit n’existe pas ou n’est plus référencé au catalogue."
          actionText="Retourner au catalogue"
          actionHref="/catalogue"
        />
      </div>
    );
  }

  if (!activeOffer || !sellerInfo) {
    return (
      <div className="min-h-screen bg-stone-50 px-4 py-10">
        <EmptyState
          title="Aucune offre disponible"
          description="Ce produit est référencé, mais aucun vendeur ne propose actuellement d’offre."
          actionText="Retourner au catalogue"
          actionHref="/catalogue"
        />
      </div>
    );
  }

  const categoryName = product.categoryName || 'Produit agricole';

  return (
    <div className="min-h-screen bg-stone-50 pb-16">
      <PageHeader
        title={product.name}
        subtitle={
          product.scientificName
            ? `${categoryName} · ${product.scientificName}`
            : categoryName
        }
        breadcrumbs={[
          { label: 'Accueil', href: '/' },
          { label: 'Catalogue', href: '/catalogue' },
          { label: product.name },
        ]}
        badge={
          <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-800">
            {availableOffersCount} offre{availableOffersCount > 1 ? 's' : ''} disponible
            {availableOffersCount > 1 ? 's' : ''}
          </span>
        }
      />

      <main className="mx-auto max-w-7xl px-4 pt-6 sm:px-6 sm:pt-8 lg:px-8">
        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12 lg:gap-8">
          <div className="space-y-6 lg:col-span-7">
            <section className="overflow-hidden rounded-3xl border border-stone-200 bg-white p-3 shadow-sm sm:p-4">
              <div className="relative h-72 overflow-hidden rounded-2xl bg-emerald-50 sm:h-[28rem]">
                {activeOffer.imageUrl ? (
                  <Image
                    src={activeOffer.imageUrl}
                    alt={`Photo de ${product.name}`}
                    fill
                    unoptimized
                    priority
                    sizes="(max-width: 1024px) 100vw, 58vw"
                    className="object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-emerald-800">
                    <IconPlant className="h-20 w-20" aria-hidden="true" />
                  </div>
                )}
                <div className="absolute inset-x-0 bottom-0 flex flex-wrap items-end justify-between gap-3 bg-gradient-to-t from-stone-950/75 via-stone-950/30 to-transparent p-5 pt-20 text-white sm:p-6 sm:pt-24">
                  <div>
                    <span
                      className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold backdrop-blur ${sellerInfo.badgeClass}`}
                    >
                      {sellerInfo.label}
                    </span>
                    <p className="mt-2 text-sm font-bold">{activeOffer.sellerName}</p>
                  </div>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-stone-950/50 px-3 py-2 text-xs font-semibold backdrop-blur">
                    <IconLocation className="h-4 w-4" aria-hidden="true" />
                    {activeOffer.originCity}, {activeOffer.originProvince}
                  </span>
                </div>
              </div>
            </section>

            <section className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm sm:p-7">
              <div className="mb-5">
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-emerald-800">
                  À propos du produit
                </p>
                <h2 className="mt-1 text-xl font-extrabold text-stone-900">
                  Description et caractéristiques
                </h2>
              </div>
              <p className="text-sm leading-7 text-stone-600">
                {product.description || 'Aucune description détaillée n’a été fournie pour ce produit.'}
              </p>
              <dl className="mt-6 grid grid-cols-1 gap-3 border-t border-stone-100 pt-5 sm:grid-cols-3">
                <div className="rounded-2xl bg-stone-50 p-4">
                  <dt className="text-xs text-stone-500">Unité standard</dt>
                  <dd className="mt-1 text-sm font-bold text-stone-900">{product.standardUnit}</dd>
                </div>
                <div className="rounded-2xl bg-stone-50 p-4">
                  <dt className="text-xs text-stone-500">Qualité de cette offre</dt>
                  <dd className="mt-1 text-sm font-bold text-stone-900">
                    {activeOffer.qualityGrade || 'Non précisée'}
                  </dd>
                </div>
                <div className="rounded-2xl bg-stone-50 p-4">
                  <dt className="text-xs text-stone-500">Origine</dt>
                  <dd className="mt-1 text-sm font-bold text-stone-900">
                    {activeOffer.originProvince}
                  </dd>
                </div>
              </dl>
            </section>

            <section className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm sm:p-7">
              <div className="mb-5">
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-emerald-800">
                  Comparez les vendeurs
                </p>
                <h2 className="mt-1 text-xl font-extrabold text-stone-900">
                  Offres pour ce produit
                </h2>
                <p className="mt-1 text-sm leading-relaxed text-stone-500">
                  Choisissez une offre selon le prix, le stock et la localisation.
                </p>
              </div>

              <div className="space-y-3">
                {productOffers.map((offer) => {
                  const offerSellerInfo = translateSellerType(offer.sellerType);
                  const isSelected = offer.id === activeOffer.id;
                  const offerMinimum = Math.max(1, offer.retailMinQuantity);
                  const canBuyOffer = offer.isAvailable && offer.stockQuantity >= offerMinimum;

                  return (
                    <button
                      key={offer.id}
                      type="button"
                      onClick={() => selectOffer(offer)}
                      aria-pressed={isSelected}
                      className={`w-full rounded-2xl border p-4 text-left transition focus:outline-none focus:ring-2 focus:ring-emerald-700 focus:ring-offset-2 sm:p-5 ${
                        isSelected
                          ? 'border-emerald-700 bg-emerald-50/60 shadow-sm'
                          : 'border-stone-200 bg-white hover:border-emerald-300 hover:bg-stone-50'
                      }`}
                    >
                      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${offerSellerInfo.badgeClass}`}
                            >
                              {offerSellerInfo.label}
                            </span>
                            <span className="text-sm font-extrabold text-stone-900">
                              {offer.sellerName}
                            </span>
                            {isSelected && (
                              <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-800">
                                <IconCheck className="h-4 w-4" aria-hidden="true" />
                                Sélectionnée
                              </span>
                            )}
                          </div>
                          <p className="mt-2 inline-flex items-center gap-1.5 text-xs text-stone-500">
                            <IconLocation className="h-4 w-4" aria-hidden="true" />
                            {offer.originCity}, {offer.originProvince}
                          </p>
                          <p className={`mt-1 text-xs font-semibold ${canBuyOffer ? 'text-emerald-800' : 'text-red-700'}`}>
                            {canBuyOffer
                              ? `${offer.stockQuantity} ${offer.unit} en stock`
                              : 'Indisponible pour le moment'}
                          </p>
                          {offer.servicesOffered?.length > 0 && (
                            <div className="mt-3 flex flex-wrap gap-1.5">
                              {offer.servicesOffered.map((service) => (
                                <span
                                  key={service}
                                  className="inline-flex items-center gap-1 rounded-full bg-stone-100 px-2.5 py-1 text-[11px] font-medium text-stone-600"
                                >
                                  <IconCheck className="h-3 w-3 text-emerald-700" aria-hidden="true" />
                                  {service}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="shrink-0 border-t border-stone-100 pt-3 sm:border-0 sm:pt-0 sm:text-right">
                          <p className="text-xs text-stone-500">Prix unitaire</p>
                          <p className="text-lg font-black text-stone-900">
                            {formatCdfPrice(offer.retailPriceCdf)}
                          </p>
                          {offer.wholesalePriceCdf && (
                            <p className="mt-1 text-xs font-semibold text-emerald-800">
                              Dès {offer.wholesaleMinQuantity} {offer.unit} :{' '}
                              {formatCdfPrice(offer.wholesalePriceCdf)}
                            </p>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>
          </div>

          <aside className="lg:col-span-5" aria-label="Calcul du prix et ajout au panier">
            <div className="space-y-5 rounded-3xl border border-stone-200 bg-white p-5 shadow-sm sm:p-7 lg:sticky lg:top-28">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-emerald-800">
                  Offre sélectionnée
                </p>
                <h2 className="mt-1 text-xl font-extrabold text-stone-900">
                  {activeOffer.sellerName}
                </h2>
                <p className="mt-1 inline-flex items-center gap-1.5 text-sm text-stone-500">
                  <IconLocation className="h-4 w-4" aria-hidden="true" />
                  {activeOffer.originCity}, {activeOffer.originProvince}
                </p>
              </div>

              <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-stone-700">Prix de l’offre</span>
                  <Badge variant={isWholesale ? 'green' : 'stone'}>
                    {isWholesale ? 'Prix quantité' : 'Prix unitaire'}
                  </Badge>
                </div>
                <p className="mt-3 text-2xl font-black tracking-tight text-stone-900">
                  {formatCdfPrice(unitPriceCdf)}
                  <span className="ml-1 text-sm font-semibold text-stone-500">/ {activeOffer.unit}</span>
                </p>
                {activeOffer.wholesaleMinQuantity && activeOffer.wholesalePriceCdf && !isWholesale && (
                  <p className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs leading-relaxed text-emerald-950">
                    À partir de <strong>{activeOffer.wholesaleMinQuantity} {activeOffer.unit}</strong>,
                    le prix passe à <strong>{formatCdfPrice(activeOffer.wholesalePriceCdf)}</strong> par unité.
                  </p>
                )}
              </div>

              {isAuthLoading ? (
                <p
                  className="rounded-xl border border-stone-200 bg-stone-50 p-4 text-sm text-stone-600"
                  role="status"
                >
                  Vérification de votre session…
                </p>
              ) : isAdmin ? (
                <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-relaxed text-amber-950">
                  Le compte administrateur peut consulter les offres, mais ne peut pas ajouter au panier ni commander.
                </p>
              ) : isOwnOffer ? (
                <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-relaxed text-amber-950">
                  Vous ne pouvez pas acheter votre propre marchandise.
                </p>
              ) : (
                <>
                  {!hasStock && (
                    <p
                      className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm leading-relaxed text-red-900"
                      role="status"
                    >
                      Cette offre est indisponible ou son stock ne permet pas la quantité minimale requise.
                    </p>
                  )}

                  <div>
                    <label
                      htmlFor="product-quantity"
                      className="mb-2 block text-sm font-bold text-stone-800"
                    >
                      Quantité ({activeOffer.unit})
                    </label>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() =>
                          setQuantity((current) => Math.max(minimumQuantity, current - 1))
                        }
                        disabled={!hasStock || quantity <= minimumQuantity}
                        aria-label="Réduire la quantité"
                        className="h-11 w-11 rounded-xl border border-stone-200 bg-white text-lg font-bold text-stone-800 transition hover:bg-stone-100 disabled:cursor-not-allowed disabled:opacity-40 focus:outline-none focus:ring-2 focus:ring-emerald-700"
                      >
                        −
                      </button>
                      <input
                        id="product-quantity"
                        type="number"
                        min={minimumQuantity}
                        max={activeOffer.stockQuantity}
                        step={1}
                        inputMode="numeric"
                        value={quantity || ''}
                        disabled={!hasStock}
                        onChange={(event) => {
                          const nextQuantity = Number(event.target.value);
                          setQuantity(Number.isFinite(nextQuantity) ? nextQuantity : 0);
                          setAddedToCart(false);
                        }}
                        onBlur={() => {
                          if (hasStock) {
                            setQuantity(
                              Math.min(
                                Math.max(quantity || minimumQuantity, minimumQuantity),
                                activeOffer.stockQuantity
                              )
                            );
                          }
                        }}
                        aria-describedby="quantity-guidance"
                        className="h-11 w-24 rounded-xl border border-stone-200 bg-white text-center text-base font-extrabold text-stone-900 outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/20 disabled:bg-stone-100"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setQuantity((current) => Math.min(activeOffer.stockQuantity, current + 1))
                        }
                        disabled={!hasStock || quantity >= activeOffer.stockQuantity}
                        aria-label="Augmenter la quantité"
                        className="h-11 w-11 rounded-xl border border-stone-200 bg-white text-lg font-bold text-stone-800 transition hover:bg-stone-100 disabled:cursor-not-allowed disabled:opacity-40 focus:outline-none focus:ring-2 focus:ring-emerald-700"
                      >
                        +
                      </button>
                      <p id="quantity-guidance" className="text-xs leading-relaxed text-stone-500">
                        Minimum : {minimumQuantity} · Stock : {activeOffer.stockQuantity}
                      </p>
                    </div>
                    {!isQuantityValid && hasStock && (
                      <p className="mt-2 text-xs font-medium text-red-700" role="alert">
                        Saisissez une quantité entière comprise entre {minimumQuantity} et{' '}
                        {activeOffer.stockQuantity}.
                      </p>
                    )}
                  </div>

                  <div className="rounded-2xl bg-emerald-50 p-4">
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="text-sm font-semibold text-emerald-950">Sous-total</span>
                      <span className="text-xl font-black text-emerald-900">
                        {isQuantityValid ? formatCdfPrice(totalCdf) : '—'}
                      </span>
                    </div>
                    <p className="mt-1 text-right text-xs text-emerald-800">
                      {quantity} {activeOffer.unit} · montant en CDF
                    </p>
                  </div>

                  <div className="space-y-3">
                    <Button
                      variant="primary"
                      size="lg"
                      className="w-full"
                      leftIcon={<IconShoppingBag className="h-5 w-5" aria-hidden="true" />}
                      onClick={handleAddToCart}
                      disabled={!isQuantityValid}
                    >
                      Ajouter au panier
                    </Button>
                    {addedToCart && (
                      <div
                        role="status"
                        aria-live="polite"
                        className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-950"
                      >
                        <span className="inline-flex items-center gap-2 font-semibold">
                          <IconCheck className="h-4 w-4 text-emerald-700" aria-hidden="true" />
                          Produit ajouté au panier
                        </span>
                        <Link
                          href="/panier"
                          className="font-bold text-emerald-900 underline underline-offset-2 focus:outline-none focus:ring-2 focus:ring-emerald-700"
                        >
                          Voir le panier
                        </Link>
                      </div>
                    )}
                    <Link
                      href={`/vendeurs/${activeOffer.sellerId}`}
                      className="inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-stone-300 bg-white px-4 py-3 text-sm font-bold text-stone-800 transition hover:bg-stone-50 focus:outline-none focus:ring-2 focus:ring-stone-500 focus:ring-offset-2"
                    >
                      Voir la boutique du vendeur
                    </Link>
                  </div>
                </>
              )}

              <div className="flex items-start gap-3 border-t border-stone-100 pt-5 text-xs leading-relaxed text-stone-600">
                <IconShieldCheck
                  className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700"
                  aria-hidden="true"
                />
                <p>
                  Le règlement se fait en CDF directement au livreur lors de la remise. AgroConnect ne demande aucun PIN ni paiement en ligne.
                </p>
              </div>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}
