'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useCart } from '../../context/CartContext';
import { useCurrency } from '../../context/CurrencyContext';
import { PageHeader } from '../../components/layout/PageHeader';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';
import { formatDualPrice } from '../../utils/format';
import { IconTrash, IconShoppingBag, IconShieldCheck, IconTruck } from '../../components/ui/Icons';

export default function CartPage() {
  const { items, calculation, isLoadingCalculation, updateQuantity, removeFromCart, clearCart } = useCart();
  const { currency, exchangeRate } = useCurrency();

  if (items.length === 0) {
    return (
      <div className="bg-stone-50 min-h-screen pb-20">
        <PageHeader
          title="Mon Panier Multi-Vendeurs"
          subtitle="Gérez vos commandes auprès des producteurs et distributeurs agricoles de la RDC."
          breadcrumbs={[{ label: 'Accueil', href: '/' }, { label: 'Panier' }]}
        />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-12">
          <EmptyState
            title="Votre panier est vide"
            description="Vous n'avez pas encore sélectionné de produit agricole. Parcourez le catalogue pour découvrir les récoltes et intrants de nos terroirs."
            actionText="Découvrir le Catalogue"
            actionHref="/catalogue"
          />
        </div>
      </div>
    );
  }

  const totals = calculation?.totals || {
    totalCdf: items.reduce(
      (sum, i) =>
        sum +
        (i.saleType === 'WHOLESALE' && i.offer.wholesalePriceCdf
          ? i.offer.wholesalePriceCdf
          : i.offer.retailPriceCdf) *
          i.quantity,
      0
    ),
    totalUsd: items.reduce(
      (sum, i) =>
        sum +
        (i.saleType === 'WHOLESALE' && i.offer.wholesalePriceUsd
          ? i.offer.wholesalePriceUsd
          : i.offer.retailPriceUsd) *
          i.quantity,
      0
    ),
  };

  const dualTotals = formatDualPrice(totals.totalCdf, totals.totalUsd, currency);

  return (
    <div className="bg-stone-50 min-h-screen pb-20">
      <PageHeader
        title="Mon Panier Multi-Vendeurs"
        subtitle={`Vos achats regroupés auprès de ${
          calculation?.distinctSellersCount || new Set(items.map((i) => i.offer.sellerId)).size
        } vendeur(s) distinct(s).`}
        breadcrumbs={[{ label: 'Accueil', href: '/' }, { label: 'Panier' }]}
        badge={
          <span className="text-xs bg-emerald-100 text-emerald-800 font-bold px-3 py-1 rounded-full border border-emerald-200">
            {calculation?.totalItemsCount || items.reduce((s, i) => s + i.quantity, 0)} article(s)
          </span>
        }
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        {calculation?.hasStockShortage && (
          <div className="mb-6 p-4 bg-orange-50 border border-orange-200 rounded-2xl text-xs text-orange-950 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-bold text-orange-700">⚠️ Attention :</span>
              <span>Certains articles demandent une quantité supérieure au stock actuellement disponible chez le vendeur.</span>
            </div>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="text-xs font-bold text-orange-800 underline cursor-pointer"
            >
              Actualiser
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Items grouped by seller */}
          <div className="lg:col-span-8 space-y-6">
            {calculation?.sellerGroups && calculation.sellerGroups.length > 0 ? (
              calculation.sellerGroups.map((group) => {
                const groupDual = formatDualPrice(group.sellerSubtotalCdf, group.sellerSubtotalUsd, currency);
                return (
                  <div
                    key={group.sellerId}
                    className="bg-white rounded-3xl border border-stone-200 overflow-hidden shadow-xs"
                  >
                    {/* Header Vendeur */}
                    <div className="bg-stone-100/70 px-6 py-3.5 border-b border-stone-200 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-stone-500">
                          Sous-commande Vendeur :
                        </span>
                        <Link
                          href={`/vendeurs/${group.sellerId}`}
                          className="text-sm font-black text-emerald-900 hover:underline"
                        >
                          {group.sellerName}
                        </Link>
                      </div>
                      <span className="text-xs font-bold text-stone-700">
                        Sous-total : {groupDual.primary}
                      </span>
                    </div>

                    {/* Articles du groupe */}
                    <div className="divide-y divide-stone-100 p-6 space-y-4">
                      {group.items.map((item) => {
                        const itemDual = formatDualPrice(item.subtotalCdf, item.subtotalUsd, currency);
                        const unitDual = formatDualPrice(item.unitPriceCdf, item.unitPriceUsd, currency);
                        return (
                          <div
                            key={`${item.offerId}-${item.saleType}`}
                            className="pt-4 first:pt-0 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                          >
                            <div className="flex-1">
                              <h4 className="text-sm font-bold text-stone-900">{item.productName}</h4>
                              <p className="text-xs text-stone-500">
                                Unité : {item.unit} • Tarif :{' '}
                                <span className="font-semibold text-emerald-800">
                                  {item.saleType === 'WHOLESALE' ? 'En gros' : 'Au détail'}
                                </span>{' '}
                                ({unitDual.primary} / unité)
                              </p>
                              {!item.isStockSufficient && (
                                <p className="text-[11px] text-red-600 font-bold mt-1">
                                  Stock insuffisant (disponible : {item.availableStock})
                                </p>
                              )}
                            </div>

                            {/* Quantité & Action */}
                            <div className="flex items-center gap-4">
                              <div className="flex items-center border border-stone-300 rounded-xl overflow-hidden bg-white">
                                <button
                                  type="button"
                                  onClick={() => updateQuantity(item.offerId, item.quantity - 1, item.saleType)}
                                  className="px-3 py-1.5 text-xs font-bold hover:bg-stone-100 text-stone-700 cursor-pointer"
                                >
                                  -
                                </button>
                                <span className="px-3 py-1.5 text-xs font-bold text-stone-900 bg-stone-50 min-w-[32px] text-center">
                                  {item.quantity}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => updateQuantity(item.offerId, item.quantity + 1, item.saleType)}
                                  className="px-3 py-1.5 text-xs font-bold hover:bg-stone-100 text-stone-700 cursor-pointer"
                                >
                                  +
                                </button>
                              </div>

                              <div className="text-right min-w-[100px]">
                                <p className="text-sm font-bold text-stone-900">{itemDual.primary}</p>
                                <p className="text-[10px] text-stone-500">{itemDual.secondary}</p>
                              </div>

                              <button
                                type="button"
                                onClick={() => removeFromCart(item.offerId, item.saleType)}
                                className="p-2 text-stone-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition cursor-pointer"
                                title="Supprimer l'article"
                              >
                                <IconTrash className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })
            ) : (
              /* Fallback si le calcul backend est en chargement */
              <div className="bg-white rounded-3xl border border-stone-200 p-6 space-y-4 shadow-xs">
                {items.map((item) => (
                  <div
                    key={`${item.offerId}-${item.saleType}`}
                    className="flex items-center justify-between py-3 border-b border-stone-100"
                  >
                    <div>
                      <p className="text-sm font-bold text-stone-900">{item.offer.productName}</p>
                      <p className="text-xs text-stone-500">Vendeur : {item.offer.sellerName}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-bold">Qté : {item.quantity}</span>
                      <button
                        type="button"
                        onClick={() => removeFromCart(item.offerId, item.saleType)}
                        className="text-stone-400 hover:text-red-600 p-1"
                      >
                        <IconTrash className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-center justify-between pt-2">
              <Link href="/catalogue" className="text-xs font-bold text-emerald-800 hover:underline">
                ← Continuer mes achats au catalogue
              </Link>
              <button
                type="button"
                onClick={clearCart}
                className="text-xs font-bold text-stone-500 hover:text-red-600 cursor-pointer"
              >
                Vider le panier
              </button>
            </div>
          </div>

          {/* Checkout Summary Sidebar */}
          <div className="lg:col-span-4">
            <div className="bg-white rounded-3xl border border-stone-200 p-6 sm:p-8 shadow-sm space-y-6 sticky top-28">
              <h3 className="text-base font-black text-stone-900 border-b border-stone-100 pb-3">
                Récapitulatif de Commande
              </h3>

              <div className="space-y-3 text-xs">
                <div className="flex justify-between text-stone-600">
                  <span>Articles sélectionnés :</span>
                  <span className="font-bold text-stone-900">
                    {calculation?.totalItemsCount || items.reduce((s, i) => s + i.quantity, 0)} unité(s)
                  </span>
                </div>

                <div className="flex justify-between text-stone-600">
                  <span>Sous-commandes générées :</span>
                  <span className="font-bold text-emerald-800">
                    {calculation?.distinctSellersCount || new Set(items.map((i) => i.offer.sellerId)).size}{' '}
                    vendeur(s)
                  </span>
                </div>

                <div className="flex justify-between text-stone-600">
                  <span>Taux indicatif appliqué :</span>
                  <span className="font-semibold text-stone-700">
                    1 $ = {(calculation?.exchangeRateSnapshot || exchangeRate).toLocaleString('fr-FR')} FC
                  </span>
                </div>

                <div className="pt-4 border-t border-stone-100 flex items-baseline justify-between">
                  <span className="text-sm font-black text-stone-900">Total à payer :</span>
                  <div className="text-right">
                    <p className="text-xl font-black text-emerald-900">{dualTotals.primary}</p>
                    <p className="text-xs text-stone-500">{dualTotals.secondary}</p>
                  </div>
                </div>
              </div>

              <Link href="/panier/commander" className="block">
                <Button
                  variant="primary"
                  size="lg"
                  className="w-full cursor-pointer shadow-md"
                  disabled={Boolean(calculation?.hasStockShortage) || isLoadingCalculation}
                  isLoading={isLoadingCalculation}
                >
                  Valider et Commander
                </Button>
              </Link>

              <div className="p-3 bg-stone-50 rounded-2xl border border-stone-200 space-y-2 text-[11px] text-stone-600">
                <div className="flex items-center gap-1.5 font-bold text-emerald-800">
                  <IconShieldCheck className="w-4 h-4 text-emerald-700" />
                  <span>Règle d&apos;intermédiation AgroConnect</span>
                </div>
                <p>
                  AgroConnect ne stocke aucun produit. Chaque vendeur gère et prépare sa propre sous-commande.
                  Paiement sécurisé par Mobile Money avec vérification backend.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

