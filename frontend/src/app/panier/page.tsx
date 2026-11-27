'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useCart } from '../../context/CartContext';
import { PageHeader } from '../../components/layout/PageHeader';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';
import { formatCdfPrice } from '../../utils/format';
import { IconAlert, IconPlant, IconShieldCheck, IconTrash } from '../../components/ui/Icons';
import { useAuth } from '../../context/AuthContext';

export default function CartPage() {
  const {
    items,
    isCartHydrated,
    calculation,
    isLoadingCalculation,
    updateQuantity,
    removeFromCart,
    clearCart,
    refreshCalculation,
  } = useCart();
  const { user, isAdmin, isLoading: isAuthLoading } = useAuth();

  if (!isCartHydrated || isAuthLoading) {
    return (
      <div className="min-h-[55vh] bg-stone-50 px-4 py-20" role="status" aria-live="polite">
        <div className="mx-auto max-w-sm text-center">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-emerald-100 border-t-emerald-700" />
          <p className="text-sm font-semibold text-stone-700">Préparation de votre panier…</p>
        </div>
      </div>
    );
  }

  if (isAdmin) {
    return (
      <div className="min-h-screen bg-stone-50 px-4 py-10">
        <EmptyState
          title="Espace réservé aux acheteurs"
          description="Un compte administrateur peut consulter les offres, mais ne peut pas passer de commande."
          actionText="Retour à l’administration"
          actionHref="/admin"
        />
      </div>
    );
  }

  const itemCount = calculation?.totalItemsCount ?? items.reduce((sum, item) => sum + item.quantity, 0);
  const sellerCount =
    calculation?.distinctSellersCount ?? new Set(items.map((item) => item.offer.sellerId)).size;

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-stone-50 pb-20">
        <PageHeader
          title="Votre panier"
          subtitle="Retrouvez ici les produits que vous avez sélectionnés auprès des vendeurs agricoles."
          breadcrumbs={[{ label: 'Accueil', href: '/' }, { label: 'Panier' }]}
        />
        <div className="mx-auto max-w-4xl px-4 pt-8 sm:px-6 sm:pt-12">
          <EmptyState
            title="Votre panier est vide"
            description="Parcourez le catalogue et ajoutez les produits qui vous intéressent. Vous pourrez ensuite vérifier votre commande avant de confirmer le règlement à la livraison."
            actionText="Découvrir le catalogue"
            actionHref="/catalogue"
          />
        </div>
      </div>
    );
  }

  const hasOwnOffer = Boolean(
    user?.sellerId && items.some((item) => item.offer.sellerId === user.sellerId)
  );
  const hasCalculationError = !calculation && !isLoadingCalculation;
  const canCheckout =
    Boolean(calculation) &&
    !calculation?.hasStockShortage &&
    !hasOwnOffer &&
    !isLoadingCalculation;

  return (
    <div className="min-h-screen bg-stone-50 pb-16">
      <PageHeader
        title="Votre panier"
        subtitle="Vérifiez vos articles et les sous-totaux de chaque vendeur avant de continuer."
        breadcrumbs={[{ label: 'Accueil', href: '/' }, { label: 'Panier' }]}
        badge={
          <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-800">
            {itemCount} {itemCount > 1 ? 'articles' : 'article'}
          </span>
        }
      />

      <main className="mx-auto max-w-7xl px-4 pt-6 sm:px-6 sm:pt-8 lg:px-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-stone-200 bg-white px-4 py-3.5 shadow-sm sm:px-5">
          <div>
            <p className="text-sm font-bold text-stone-900">
              {sellerCount} {sellerCount > 1 ? 'vendeurs' : 'vendeur'}
            </p>
            <p className="mt-0.5 text-xs text-stone-500">
              Chaque vendeur prépare sa propre sous-commande.
            </p>
          </div>
          <Link
            href="/catalogue"
            className="text-sm font-bold text-emerald-800 underline-offset-4 hover:underline focus:outline-none focus:ring-2 focus:ring-emerald-700 focus:ring-offset-2"
          >
            Continuer mes achats
          </Link>
        </div>

        {hasOwnOffer && (
          <div
            role="alert"
            className="mb-5 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950"
          >
            <IconAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" aria-hidden="true" />
            <p>Retirez vos propres offres du panier avant de poursuivre la commande.</p>
          </div>
        )}

        {calculation?.hasStockShortage && (
          <div
            role="alert"
            className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-orange-200 bg-orange-50 p-4 text-sm text-orange-950"
          >
            <div className="flex items-start gap-2">
              <IconAlert className="mt-0.5 h-5 w-5 shrink-0 text-orange-700" aria-hidden="true" />
              <p>Un ou plusieurs articles dépassent le stock disponible. Ajustez les quantités pour continuer.</p>
            </div>
            <button
              type="button"
              onClick={() => void refreshCalculation()}
              className="rounded-lg px-2 py-1 text-sm font-bold text-orange-900 underline underline-offset-2 focus:outline-none focus:ring-2 focus:ring-orange-700"
            >
              Vérifier à nouveau
            </button>
          </div>
        )}

        {hasCalculationError && (
          <div
            role="alert"
            className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-900"
          >
            <p>Le total n’a pas pu être vérifié. Réessayez avant de valider votre commande.</p>
            <button
              type="button"
              onClick={() => void refreshCalculation()}
              className="rounded-lg px-2 py-1 font-bold underline underline-offset-2 focus:outline-none focus:ring-2 focus:ring-red-700"
            >
              Réessayer
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12 lg:gap-8">
          <section className="space-y-5 lg:col-span-8" aria-label="Articles du panier">
            {calculation?.sellerGroups.length ? (
              calculation.sellerGroups.map((group) => (
                <section
                  key={group.sellerId}
                  className="overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-sm"
                  aria-label={`Articles de ${group.sellerName}`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-200 bg-stone-50 px-4 py-4 sm:px-6">
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-stone-500">
                        Vendu par
                      </p>
                      <Link
                        href={`/vendeurs/${group.sellerId}`}
                        className="mt-1 inline-block text-sm font-extrabold text-emerald-900 hover:underline focus:outline-none focus:ring-2 focus:ring-emerald-700"
                      >
                        {group.sellerName}
                      </Link>
                    </div>
                    <div className="text-right">
                      <p className="text-[11px] font-medium text-stone-500">Sous-total vendeur</p>
                      <p className="mt-1 text-sm font-extrabold text-stone-900">
                        {formatCdfPrice(group.sellerSubtotalCdf)}
                      </p>
                    </div>
                  </div>

                  <div className="divide-y divide-stone-100 px-4 sm:px-6">
                    {group.items.map((item) => {
                      const storedItem = items.find(
                        (candidate) =>
                          candidate.offerId === item.offerId && candidate.saleType === item.saleType
                      );
                      const imageUrl = storedItem?.offer.imageUrl;

                      return (
                        <article
                          key={`${item.offerId}-${item.saleType}`}
                          className="flex flex-col gap-4 py-5 sm:flex-row sm:items-center"
                        >
                          <div className="flex min-w-0 flex-1 items-center gap-4">
                            <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl bg-emerald-50 sm:h-24 sm:w-24">
                              {imageUrl ? (
                                <Image
                                  src={imageUrl}
                                  alt={item.productName}
                                  fill
                                  unoptimized
                                  sizes="96px"
                                  className="object-cover"
                                />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center text-emerald-800">
                                  <IconPlant className="h-8 w-8" aria-hidden="true" />
                                </div>
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <h2 className="truncate text-sm font-extrabold text-stone-900 sm:text-base">
                                {item.productName}
                              </h2>
                              <p className="mt-1 text-xs text-stone-500">
                                {item.saleType === 'WHOLESALE' ? 'Tarif quantité' : 'Tarif unitaire'}
                                <span aria-hidden="true"> · </span>
                                {formatCdfPrice(item.unitPriceCdf)} / {item.unit}
                              </p>
                              {!item.isStockSufficient && (
                                <p className="mt-2 text-xs font-bold text-red-700">
                                  Stock insuffisant : {item.availableStock} {item.unit} disponibles
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center justify-between gap-3 sm:justify-end">
                            <div
                              className="inline-flex items-center rounded-xl border border-stone-200 bg-white"
                              aria-label={`Quantité de ${item.productName}`}
                            >
                              <button
                                type="button"
                                onClick={() =>
                                  updateQuantity(item.offerId, item.quantity - 1, item.saleType)
                                }
                                disabled={item.quantity <= 1}
                                aria-label={`Réduire la quantité de ${item.productName}`}
                                className="h-10 w-10 rounded-l-xl text-lg font-semibold text-stone-700 transition hover:bg-stone-100 disabled:cursor-not-allowed disabled:opacity-40 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-emerald-700"
                              >
                                −
                              </button>
                              <span className="min-w-10 px-2 text-center text-sm font-bold text-stone-900">
                                {item.quantity}
                              </span>
                              <button
                                type="button"
                                onClick={() =>
                                  updateQuantity(item.offerId, item.quantity + 1, item.saleType)
                                }
                                disabled={item.quantity >= item.availableStock}
                                aria-label={`Augmenter la quantité de ${item.productName}`}
                                className="h-10 w-10 rounded-r-xl text-lg font-semibold text-stone-700 transition hover:bg-stone-100 disabled:cursor-not-allowed disabled:opacity-40 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-emerald-700"
                              >
                                +
                              </button>
                            </div>

                            <p className="min-w-28 text-right text-sm font-extrabold text-stone-900">
                              {formatCdfPrice(item.subtotalCdf)}
                            </p>

                            <button
                              type="button"
                              onClick={() => removeFromCart(item.offerId, item.saleType)}
                              aria-label={`Retirer ${item.productName} du panier`}
                              title="Retirer cet article"
                              className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-stone-500 transition hover:bg-red-50 hover:text-red-700 focus:outline-none focus:ring-2 focus:ring-red-600"
                            >
                              <IconTrash className="h-4 w-4" aria-hidden="true" />
                            </button>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                </section>
              ))
            ) : (
              <section className="space-y-3 rounded-3xl border border-stone-200 bg-white p-4 shadow-sm sm:p-6">
                {items.map((item) => (
                  <article
                    key={`${item.offerId}-${item.saleType}`}
                    className="flex items-center gap-4 border-b border-stone-100 py-3 last:border-0"
                  >
                    <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-emerald-50">
                      {item.offer.imageUrl ? (
                        <Image
                          src={item.offer.imageUrl}
                          alt={item.offer.productName}
                          fill
                          unoptimized
                          sizes="64px"
                          className="object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-emerald-800">
                          <IconPlant className="h-7 w-7" aria-hidden="true" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-stone-900">{item.offer.productName}</p>
                      <p className="mt-1 text-xs text-stone-500">
                        {item.offer.sellerName} · Quantité : {item.quantity}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeFromCart(item.offerId, item.saleType)}
                      aria-label={`Retirer ${item.offer.productName} du panier`}
                      className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-stone-500 hover:bg-red-50 hover:text-red-700 focus:outline-none focus:ring-2 focus:ring-red-600"
                    >
                      <IconTrash className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </article>
                ))}
              </section>
            )}

            <div className="flex justify-end">
              <button
                type="button"
                onClick={clearCart}
                className="rounded-lg px-3 py-2 text-sm font-semibold text-stone-500 transition hover:bg-red-50 hover:text-red-700 focus:outline-none focus:ring-2 focus:ring-red-600"
              >
                Vider le panier
              </button>
            </div>
          </section>

          <aside className="lg:col-span-4" aria-label="Récapitulatif de commande">
            <div className="space-y-5 rounded-3xl border border-stone-200 bg-white p-5 shadow-sm sm:p-6 lg:sticky lg:top-28">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-emerald-800">
                  Votre commande
                </p>
                <h2 className="mt-1 text-lg font-extrabold text-stone-900">Récapitulatif</h2>
              </div>

              <dl className="space-y-3 border-y border-stone-100 py-4 text-sm">
                <div className="flex justify-between gap-4 text-stone-600">
                  <dt>Articles</dt>
                  <dd className="font-semibold text-stone-900">{itemCount} unité(s)</dd>
                </div>
                <div className="flex justify-between gap-4 text-stone-600">
                  <dt>Vendeurs</dt>
                  <dd className="font-semibold text-stone-900">{sellerCount}</dd>
                </div>
                <div className="flex justify-between gap-4 text-stone-600">
                  <dt>Sous-total des articles</dt>
                  <dd className="font-semibold text-stone-900">
                    {calculation ? formatCdfPrice(calculation.totals.totalCdf) : '—'}
                  </dd>
                </div>
                <div className="flex justify-between gap-4 text-stone-600">
                  <dt>TVA ({calculation?.vatRatePercent ?? 16} %)</dt>
                  <dd className="font-semibold text-stone-900">
                    {calculation ? formatCdfPrice(calculation.totals.vatAmountCdf) : '—'}
                  </dd>
                </div>
                <div className="flex items-baseline justify-between gap-4 pt-1">
                  <dt className="font-bold text-stone-900">Total à payer</dt>
                  <dd className="text-right text-lg font-black text-emerald-900">
                    {calculation
                      ? formatCdfPrice(calculation.totals.totalWithVatCdf)
                      : isLoadingCalculation
                        ? 'Calcul…'
                        : '—'}
                  </dd>
                </div>
              </dl>

              {canCheckout ? (
                <Link
                  href="/panier/commander"
                  className="inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-emerald-800 px-6 py-3.5 text-base font-bold text-white shadow-sm transition hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-700 focus:ring-offset-2"
                >
                  Continuer la commande
                </Link>
              ) : (
                <Button
                  variant="primary"
                  size="lg"
                  className="w-full"
                  disabled
                  isLoading={isLoadingCalculation}
                >
                  {hasOwnOffer
                    ? 'Retirez votre offre'
                    : calculation?.hasStockShortage
                      ? 'Corrigez les quantités'
                      : hasCalculationError
                        ? 'Total à vérifier'
                        : 'Calcul du total…'}
                </Button>
              )}
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}
