'use client';

import React, { useEffect, useState } from 'react';
import { PageHeader } from '../../components/layout/PageHeader';
import { EmptyState } from '../../components/ui/EmptyState';
import { useAuth } from '../../context/AuthContext';
import { formatCdfPrice } from '../../utils/format';
import { ParentOrder } from '../../types';
import { api } from '../../services/api';

export default function MyOrdersPage() {
  const { isAuthenticated, isAdmin, isLoading: isAuthLoading } = useAuth();
  const [orders, setOrders] = useState<ParentOrder[]>([]);
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
              return (
                <div
                  key={order.id}
                  className="bg-white rounded-3xl border border-stone-200 overflow-hidden shadow-xs"
                >
                  {/* En-tête de la commande parent */}
                  <div className="bg-stone-100/70 p-6 border-b border-stone-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-3">
                        <span className="text-base font-black text-stone-900">{order.orderNumber}</span>
                        <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                          {order.status}
                        </span>
                      </div>
                      <p className="text-xs text-stone-500 mt-1">
                        Date : {new Date(order.createdAt).toLocaleDateString('fr-FR')}
                      </p>
                    </div>

                    <div className="text-right">
                      <p className="text-lg font-black text-emerald-900">{formatCdfPrice(order.totalAmountCdf)}</p>
                    </div>
                  </div>

                  {/* Sous-commandes vendeurs */}
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

