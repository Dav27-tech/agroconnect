'use client';

import React, { useEffect, useState } from 'react';
import { PageHeader } from '../../components/layout/PageHeader';
import { EmptyState } from '../../components/ui/EmptyState';
import { useAuth } from '../../context/AuthContext';
import { formatCdfPrice } from '../../utils/format';
import { ParentOrder } from '../../types';
import { api } from '../../services/api';
import { useRealtime } from '../../context/RealtimeContext';

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
                          <span className="rounded-full border border-emerald-200 bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800">
                            {order.status.replace(/_/g, ' ')}
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
                        <>
                          <div className="grid gap-3 rounded-2xl bg-stone-50 p-4 sm:grid-cols-2">
                            <div>
                              <p className="text-[10px] font-bold uppercase tracking-wide text-stone-500">Destinataire</p>
                              <p className="mt-1 text-sm font-semibold text-stone-900">{details.recipientName}</p>
                              <p className="text-xs text-stone-600">{details.recipientPhone}</p>
                            </div>
                            <div>
                              <p className="text-[10px] font-bold uppercase tracking-wide text-stone-500">Adresse de livraison</p>
                              <p className="mt-1 text-sm font-semibold text-stone-900">
                                {[details.deliveryAddress, details.deliveryCommune, details.deliveryCity, details.deliveryProvince]
                                  .filter(Boolean)
                                  .join(', ')}
                              </p>
                              {details.deliveryInstructions && (
                                <p className="mt-1 text-xs text-stone-600">Instruction : {details.deliveryInstructions}</p>
                              )}
                            </div>
                          </div>

                          <div className="space-y-3">
                            <h3 className="text-xs font-bold uppercase tracking-wide text-stone-500">
                              Articles commandés ({details.subOrders.reduce((count, sub) => count + (sub.items?.length ?? 0), 0)})
                            </h3>
                            {details.subOrders.map((sub) => (
                              <section key={sub.id} className="rounded-2xl border border-stone-200 p-4">
                                <div className="flex flex-col gap-2 border-b border-stone-100 pb-3 sm:flex-row sm:items-center sm:justify-between">
                                  <div>
                                    <p className="text-sm font-bold text-stone-900">{sub.sellerName}</p>
                                    <p className="text-[11px] text-stone-500">{sub.subOrderNumber}</p>
                                  </div>
                                  <div className="flex items-center justify-between gap-3 sm:justify-end">
                                    <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-bold text-amber-800">
                                      {sub.status.replace(/_/g, ' ')}
                                    </span>
                                    <span className="text-sm font-black text-stone-900">{formatCdfPrice(sub.subtotalCdf)}</span>
                                  </div>
                                </div>

                                <div className="mt-3 divide-y divide-stone-100">
                                  {sub.items?.map((item) => (
                                    <div key={item.id} className="flex flex-col gap-1 py-3 first:pt-0 sm:flex-row sm:items-center sm:justify-between">
                                      <div>
                                        <p className="text-sm font-semibold text-stone-800">{item.productName}</p>
                                        <p className="text-xs text-stone-500">
                                          {item.quantity} × {formatCdfPrice(item.unitPriceCdf)}
                                          {' · '}
                                          {item.saleType === 'WHOLESALE' ? 'Gros' : 'Détail'}
                                        </p>
                                      </div>
                                      <p className="text-sm font-bold text-stone-900">{formatCdfPrice(item.subtotalCdf)}</p>
                                    </div>
                                  ))}
                                </div>
                                {sub.deliveryStatus && (
                                  <p className="mt-2 border-t border-stone-100 pt-3 text-xs text-stone-500">
                                    Livraison : <span className="font-semibold text-stone-700">{sub.deliveryStatus.replace(/_/g, ' ')}</span>
                                    {sub.collectedAmountCdf !== null && sub.collectedAmountCdf !== undefined && (
                                      <span> · Montant remis au livreur : {formatCdfPrice(sub.collectedAmountCdf)}</span>
                                    )}
                                  </p>
                                )}
                              </section>
                            ))}
                          </div>
                        </>
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

