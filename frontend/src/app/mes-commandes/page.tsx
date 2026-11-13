'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { PageHeader } from '../../components/layout/PageHeader';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';
import { useAuth } from '../../context/AuthContext';
import { useCurrency } from '../../context/CurrencyContext';
import { formatDualPrice } from '../../utils/format';
import { IconCheck, IconTruck } from '../../components/ui/Icons';
import { ParentOrder } from '../../types';
import { api } from '../../services/api';

export default function MyOrdersPage() {
  const { user, isAuthenticated } = useAuth();
  const { currency } = useCurrency();
  const [orders, setOrders] = useState<ParentOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadOrders() {
      setIsLoading(true);
      try {
        // Chargement de la commande de démo ou des commandes réelles
        const demoOrder = await api.orders.getById('ord-demo-202611-001');
        if (demoOrder) {
          setOrders([demoOrder]);
        }
      } catch {
        // Repli démo
        setOrders([
          {
            id: 'ord-demo-202611-001',
            orderNumber: 'AGC-ORD-202611-1001',
            buyerId: user?.id || 'usr-buyer-patrick',
            status: 'CONFIRMED',
            currency: 'CDF',
            exchangeRateSnapshot: 2850,
            totalItemsCdf: 1970000,
            totalItemsUsd: 691.23,
            deliveryFeeCdf: 30000,
            deliveryFeeUsd: 10.53,
            totalAmountCdf: 2000000,
            totalAmountUsd: 701.75,
            deliveryProvince: 'Kinshasa',
            deliveryCity: 'Kinshasa',
            deliveryAddress: 'Avenue Colonel Mondjiba n° 34, Gombe',
            recipientName: 'Patrick Mwamba',
            recipientPhone: '+243890001122',
            createdAt: '2026-11-13T10:00:00.000Z',
            subOrders: [
              {
                id: 'sub-demo-001-A',
                subOrderNumber: 'AGC-ORD-202611-1001-A',
                parentOrderId: 'ord-demo-202611-001',
                sellerId: 'seller-coopak-kikwit',
                sellerName: 'Coopérative Agricole du Kwilu (COOPAK)',
                status: 'PREPARING',
                subtotalCdf: 1760000,
                subtotalUsd: 617.54,
                commissionRate: 5.0,
                commissionAmountCdf: 88000,
                commissionAmountUsd: 30.88,
                payoutAmountCdf: 1672000,
                payoutAmountUsd: 586.67,
                deliveryId: 'del-demo-001-A',
              },
              {
                id: 'sub-demo-001-B',
                subOrderNumber: 'AGC-ORD-202611-1001-B',
                parentOrderId: 'ord-demo-202611-001',
                sellerId: 'seller-agrodistrib-kin',
                sellerName: 'AgroDistrib Kinshasa Express',
                status: 'PREPARING',
                subtotalCdf: 210000,
                subtotalUsd: 73.68,
                commissionRate: 5.0,
                commissionAmountCdf: 10500,
                commissionAmountUsd: 3.68,
                payoutAmountCdf: 199500,
                payoutAmountUsd: 70.0,
                deliveryId: 'del-demo-001-B',
              },
            ],
          },
        ]);
      } finally {
        setIsLoading(false);
      }
    }

    loadOrders();
  }, [user]);

  return (
    <div className="bg-stone-50 min-h-screen pb-20">
      <PageHeader
        title="Mes Commandes & Suivis"
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
              const orderDual = formatDualPrice(order.totalAmountCdf, order.totalAmountUsd, currency);
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
                        Date : {new Date(order.createdAt).toLocaleDateString('fr-FR')} • Taux figé :{' '}
                        <strong>1 USD = {order.exchangeRateSnapshot} CDF</strong>
                      </p>
                    </div>

                    <div className="text-right">
                      <p className="text-lg font-black text-emerald-900">{orderDual.primary}</p>
                      <p className="text-xs text-stone-500">{orderDual.secondary}</p>
                    </div>
                  </div>

                  {/* Sous-commandes vendeurs */}
                  <div className="p-6 space-y-4">
                    <p className="text-xs font-bold uppercase tracking-wider text-stone-500">
                      Sous-commandes spécifiques par vendeur ({order.subOrders?.length || 0}) :
                    </p>

                    <div className="space-y-3">
                      {order.subOrders?.map((sub) => {
                        const subDual = formatDualPrice(sub.subtotalCdf, sub.subtotalUsd, currency);
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
                              <span className="text-xs font-bold text-stone-800">{subDual.primary}</span>
                              <Link href={`/suivi/${sub.deliveryId || 'AGC-TRK-784910'}`}>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  leftIcon={<IconTruck className="w-3.5 h-3.5" />}
                                  className="cursor-pointer"
                                >
                                  Suivre le colis
                                </Button>
                              </Link>
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

