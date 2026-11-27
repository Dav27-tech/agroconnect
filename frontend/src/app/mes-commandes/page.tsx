'use client';

import React, { useEffect, useState } from 'react';
import { PageHeader } from '../../components/layout/PageHeader';
import { EmptyState } from '../../components/ui/EmptyState';
import { useAuth } from '../../context/AuthContext';
import { formatCdfPrice } from '../../utils/format';
import { ParentOrder, ParentOrderStatus, SubOrderStatus } from '../../types';
import { api } from '../../services/api';
import { useRealtime } from '../../context/RealtimeContext';

const parentOrderStatusLabels: Record<ParentOrderStatus, string> = {
  PENDING: 'En attente',
  CONFIRMED: 'Confirmée',
  PROCESSING: 'En préparation',
  PARTIALLY_DELIVERED: 'Partiellement livrée',
  DELIVERED: 'Livrée',
  CANCELLED: 'Annulée',
};

const parentOrderStatusClasses: Record<ParentOrderStatus, string> = {
  PENDING: 'border-amber-200 bg-amber-50 text-amber-800',
  CONFIRMED: 'border-sky-200 bg-sky-50 text-sky-800',
  PROCESSING: 'border-blue-200 bg-blue-50 text-blue-800',
  PARTIALLY_DELIVERED: 'border-orange-200 bg-orange-50 text-orange-800',
  DELIVERED: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  CANCELLED: 'border-red-200 bg-red-50 text-red-800',
};

const subOrderStatusLabels: Record<SubOrderStatus, string> = {
  PENDING: 'À confirmer',
  CONFIRMED: 'Confirmée',
  PREPARING: 'En préparation',
  READY_FOR_PICKUP: 'Prête à l’enlèvement',
  IN_DELIVERY: 'En livraison',
  DELIVERED: 'Livrée',
  REJECTED: 'Refusée',
  CANCELLED: 'Annulée',
};

function formatReceiptDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? 'Date indisponible'
    : date.toLocaleString('fr-FR', { dateStyle: 'long', timeStyle: 'short' });
}

function OrderReceipt({ order, onPrint }: { order: ParentOrder; onPrint: () => void }) {
  const deliveryAddress = [
    order.deliveryAddress,
    order.deliveryCommune,
    order.deliveryCity,
    order.deliveryProvince,
  ].filter(Boolean).join(', ');
  const itemCount = order.subOrders.reduce((count, sub) => count + (sub.items?.length ?? 0), 0);

  return (
    <article className="order-receipt mx-auto w-full max-w-3xl overflow-hidden rounded-2xl border border-stone-200 border-t-4 border-t-emerald-800 bg-white">
      <header className="flex flex-col gap-4 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-7">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-emerald-800">AgroConnect RDC</p>
          <h2 className="mt-1 text-xl font-black tracking-tight text-stone-950">Facture / reçu de commande</h2>
        </div>
        <button
          type="button"
          onClick={onPrint}
          className="receipt-print-hidden inline-flex min-h-10 items-center justify-center gap-2 self-start rounded-xl bg-emerald-900 px-4 py-2 text-xs font-bold text-white transition hover:bg-emerald-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:ring-offset-2 sm:self-auto"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M6 9V3h12v6M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2M6 14h12v7H6z" />
          </svg>
          Imprimer / enregistrer
        </button>
      </header>

      <div className="grid gap-3 border-y border-stone-200 bg-stone-50/70 px-5 py-4 text-xs sm:grid-cols-3 sm:px-7">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wide text-stone-500">Commande</p>
          <p className="mt-1 break-all font-mono font-bold text-stone-900">{order.orderNumber}</p>
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wide text-stone-500">Date</p>
          <p className="mt-1 font-medium text-stone-800">{formatReceiptDate(order.createdAt)}</p>
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wide text-stone-500">Statut</p>
          <span className={`mt-1 inline-flex rounded-full border px-2.5 py-1 text-[10px] font-bold ${parentOrderStatusClasses[order.status]}`}>
            {parentOrderStatusLabels[order.status]}
          </span>
        </div>
      </div>

      <div className="space-y-5 px-5 py-5 sm:px-7 sm:py-6">
        <section className="grid gap-3 text-xs sm:grid-cols-2" aria-label="Informations de livraison">
          <div>
            <p className="font-bold text-stone-800">{order.recipientName || 'Destinataire non renseigné'}</p>
            <p className="mt-1 text-stone-600">{order.recipientPhone || 'Téléphone non renseigné'}</p>
          </div>
          <div className="sm:text-right">
            <p className="font-semibold text-stone-800">{deliveryAddress || 'Adresse non renseignée'}</p>
            {order.deliveryInstructions && <p className="mt-1 text-stone-500">Note : {order.deliveryInstructions}</p>}
          </div>
        </section>

        <section aria-label={`Articles commandés, ${itemCount} article(s)`}>
          <div className="mb-2 flex items-center justify-between border-b border-stone-200 pb-2">
            <h3 className="text-xs font-bold uppercase tracking-wide text-stone-600">Articles</h3>
            <span className="text-[10px] font-semibold text-stone-500">{itemCount} article(s)</span>
          </div>
          <div className="divide-y divide-stone-100">
            {order.subOrders.map((sub) => (
              <section key={sub.id} className="py-3 first:pt-2">
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs font-bold text-stone-900">{sub.sellerName}</p>
                  <span className="rounded-full bg-stone-100 px-2 py-1 text-[10px] font-semibold text-stone-600">
                    {subOrderStatusLabels[sub.status]}
                  </span>
                </div>
                {sub.items?.map((item) => (
                  <div key={item.id} className="flex items-start justify-between gap-4 py-1.5 text-xs">
                    <div className="min-w-0">
                      <p className="font-medium text-stone-800">{item.productName}</p>
                      <p className="mt-0.5 text-[10px] text-stone-500">
                        {item.quantity} × {formatCdfPrice(item.unitPriceCdf)}
                        {' · '}
                        {item.saleType === 'WHOLESALE' ? 'Gros' : 'Détail'}
                      </p>
                    </div>
                    <p className="shrink-0 font-semibold tabular-nums text-stone-900">{formatCdfPrice(item.subtotalCdf)}</p>
                  </div>
                ))}
              </section>
            ))}
          </div>
        </section>

        <section className="ml-auto w-full max-w-sm border-t border-stone-200 pt-3" aria-label="Total de la commande">
          <div className="flex justify-between gap-4 py-1 text-xs text-stone-600">
            <span>Articles</span>
            <span className="font-medium tabular-nums text-stone-900">{formatCdfPrice(order.totalItemsCdf)}</span>
          </div>
          {order.vatAmountCdf > 0 && (
            <div className="flex justify-between gap-4 py-1 text-xs text-stone-600">
              <span>TVA ({order.vatRatePercent} %)</span>
              <span className="font-medium tabular-nums text-stone-900">{formatCdfPrice(order.vatAmountCdf)}</span>
            </div>
          )}
          <div className="flex justify-between gap-4 py-1 text-xs text-stone-600">
            <span>Livraison</span>
            <span className="font-medium tabular-nums text-stone-900">{formatCdfPrice(order.deliveryFeeCdf)}</span>
          </div>
          <div className="mt-2 flex items-center justify-between gap-4 border-t border-dashed border-stone-300 pt-3">
            <span className="text-sm font-bold text-stone-900">Total à régler au livreur</span>
            <span className="text-lg font-black tabular-nums text-emerald-900">{formatCdfPrice(order.totalAmountCdf)}</span>
          </div>
        </section>

        <p className="border-t border-stone-100 pt-3 text-[10px] leading-5 text-stone-500">
          Le total inclut la TVA affichée ci-dessus. Paiement en CDF auprès du livreur à la livraison. AgroConnect n’encaisse pas de paiement en ligne; ce document confirme la commande, pas le paiement.
        </p>
      </div>
    </article>
  );
}

export default function MyOrdersPage() {
  const socket = useRealtime();
  const { isAuthenticated, isAdmin, isLoading: isAuthLoading } = useAuth();
  const [orders, setOrders] = useState<ParentOrder[]>([]);
  const [orderDetails, setOrderDetails] = useState<Record<string, ParentOrder>>({});
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [loadingDetails, setLoadingDetails] = useState<Record<string, boolean>>({});
  const [detailsErrors, setDetailsErrors] = useState<Record<string, string>>({});
  const [isOrdersLoading, setIsOrdersLoading] = useState(true);
  const isLoading = isAuthLoading || (isAuthenticated && isOrdersLoading);

  useEffect(() => {
    if (isAuthLoading || !isAuthenticated) return;

    let mounted = true;
    api.orders.getMine().then((result) => {
      if (mounted) setOrders(result);
    }).catch((error) => {
      console.error('Erreur de chargement des commandes:', error);
    }).finally(() => {
      if (mounted) setIsOrdersLoading(false);
    });
    return () => {
      mounted = false;
    };
  }, [isAuthenticated, isAuthLoading]);

  useEffect(() => {
    if (!socket || !isAuthenticated) return;
    const refreshOrders = () => {
      void api.orders.getMine()
        .then(setOrders)
        .catch((error) => console.error('Erreur de mise à jour des commandes :', error));
      if (expandedOrderId) {
        void api.orders.getById(expandedOrderId)
          .then((details) => setOrderDetails((current) => ({ ...current, [expandedOrderId]: details })))
          .catch((error) => console.error('Erreur de mise à jour des détails de commande :', error));
      }
    };
    socket.on('order.created', refreshOrders);
    socket.on('order.updated', refreshOrders);
    return () => {
      socket.off('order.created', refreshOrders);
      socket.off('order.updated', refreshOrders);
    };
  }, [expandedOrderId, isAuthenticated, socket]);

  const loadOrderDetails = async (orderId: string) => {
    setLoadingDetails((current) => ({ ...current, [orderId]: true }));
    setDetailsErrors((current) => ({ ...current, [orderId]: '' }));
    try {
      const details = await api.orders.getById(orderId);
      setOrderDetails((current) => ({ ...current, [orderId]: details }));
    } catch (error) {
      setDetailsErrors((current) => ({
        ...current,
        [orderId]: error instanceof Error ? error.message : 'Impossible de charger les détails de cette commande.',
      }));
    } finally {
      setLoadingDetails((current) => ({ ...current, [orderId]: false }));
    }
  };

  const toggleOrderDetails = (order: ParentOrder) => {
    if (expandedOrderId === order.id) {
      setExpandedOrderId(null);
      return;
    }
    setExpandedOrderId(order.id);
    if (!orderDetails[order.id]) void loadOrderDetails(order.id);
  };

  const printReceipt = () => {
    const cleanup = () => document.body.classList.remove('printing-order-receipt');
    document.body.classList.add('printing-order-receipt');
    window.addEventListener('afterprint', cleanup, { once: true });
    window.print();
  };

  if (!isAuthLoading && !isAuthenticated) {
    return (
      <EmptyState
        title="Connectez-vous pour voir vos commandes"
        description="Votre historique de commandes est réservé à votre compte acheteur."
        actionText="Se connecter"
        actionHref="/connexion?redirect=%2Fmes-commandes"
      />
    );
  }

  if (!isAuthLoading && isAdmin) {
    return (
      <EmptyState
        title="Espace acheteur uniquement"
        description="Les comptes administrateur ne disposent pas d’historique de commandes acheteur."
        actionText="Retour à l’administration"
        actionHref="/admin"
      />
    );
  }

  return (
    <div className="bg-stone-50 min-h-screen pb-20">
      <PageHeader
        title="Mes Commandes"
        subtitle="Historique de vos commandes passées auprès des producteurs et distributeurs de la RDC."
        breadcrumbs={[
          { label: 'Accueil', href: '/' },
          { label: 'Mes Commandes' },
        ]}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2].map((i) => (
              <div key={i} className="bg-white rounded-3xl p-6 border border-stone-200 h-48 animate-pulse" />
            ))}
          </div>
        ) : orders.length > 0 ? (
          <div className="space-y-6">
            {orders.map((order) => {
              const isExpanded = expandedOrderId === order.id;
              const details = orderDetails[order.id];
              return (
                <div
                  key={order.id}
                  className="bg-white rounded-3xl border border-stone-200 overflow-hidden shadow-xs"
                >
                  <div className="border-b border-stone-200 bg-stone-100/70">
                    <button
                      type="button"
                      onClick={() => toggleOrderDetails(order)}
                      aria-expanded={isExpanded}
                      aria-controls={`order-details-${order.id}`}
                      className="flex w-full flex-col items-start justify-between gap-4 p-5 text-left transition hover:bg-stone-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-emerald-700 sm:flex-row sm:items-center sm:p-6"
                    >
                      <span>
                        <span className="flex flex-wrap items-center gap-3">
                          <span className="text-base font-black text-stone-900">{order.orderNumber}</span>
                          <span className={`rounded-full border px-2.5 py-0.5 text-xs font-bold ${parentOrderStatusClasses[order.status]}`}>
                            {parentOrderStatusLabels[order.status]}
                          </span>
                        </span>
                        <span className="mt-1 block text-xs text-stone-500">
                          Date : {new Date(order.createdAt).toLocaleDateString('fr-FR')}
                        </span>
                      </span>

                      <span className="flex w-full items-center justify-between gap-4 sm:w-auto sm:justify-end">
                        <span className="text-lg font-black text-emerald-900">{formatCdfPrice(order.totalAmountCdf)}</span>
                        <span className="text-xs font-bold text-emerald-800">
                          {isExpanded ? 'Masquer les détails' : 'Voir les détails'}
                          <span className="ml-2 inline-block text-base" aria-hidden="true">{isExpanded ? '−' : '+'}</span>
                        </span>
                      </span>
                    </button>
                  </div>

                  {isExpanded && (
                    <div id={`order-details-${order.id}`} className="space-y-5 border-b border-stone-200 bg-white p-5 sm:p-6">
                      {loadingDetails[order.id] ? (
                        <p role="status" className="py-5 text-center text-sm text-stone-500">
                          Chargement des détails de la commande…
                        </p>
                      ) : detailsErrors[order.id] ? (
                        <div role="alert" className="flex flex-col gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 sm:flex-row sm:items-center sm:justify-between">
                          <span>{detailsErrors[order.id]}</span>
                          <button
                            type="button"
                            onClick={() => void loadOrderDetails(order.id)}
                            className="shrink-0 font-bold underline"
                          >
                            Réessayer
                          </button>
                        </div>
                      ) : details ? (
                        <OrderReceipt order={details} onPrint={printReceipt} />
                      ) : null}
                    </div>
                  )}

                  {!isExpanded && (
                    <div className="p-6 space-y-4">
                      <p className="text-xs font-bold uppercase tracking-wider text-stone-500">
                        Sous-commandes spécifiques par vendeur ({order.subOrders?.length || 0}) :
                      </p>

                      <div className="space-y-3">
                        {order.subOrders?.map((sub) => {
                          return (
                            <div
                              key={sub.id}
                              className="p-4 rounded-2xl border border-stone-200 bg-stone-50/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                            >
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-black text-stone-900">{sub.subOrderNumber}</span>
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-800">
                                    {sub.status}
                                  </span>
                                </div>
                                <p className="text-xs text-stone-600 mt-0.5 font-medium">
                                  Vendeur : {sub.sellerName}
                                </p>
                              </div>

                              <div className="flex items-center gap-4">
                                <span className="text-xs font-bold text-stone-800">{formatCdfPrice(sub.subtotalCdf)}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <EmptyState
            title="Aucune commande enregistrée"
            description="Vous n'avez pas encore passé de commande sur AgroConnect. Découvrez les récoltes locales et commandez en direct."
            actionText="Découvrir le Catalogue"
            actionHref="/catalogue"
          />
        )}
      </div>
    </div>
  );
}

