'use client';

import React, { startTransition, useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '../../components/layout/PageHeader';
import { Button } from '../../components/ui/Button';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { CourierDelivery, DeliveryStatus, ManualCollectionMethod } from '../../types';
import { formatCdfPrice } from '../../utils/format';
import { IconCheck, IconPhone, IconTruck } from '../../components/ui/Icons';
import { useRealtime } from '../../context/RealtimeContext';

const statusLabels: Record<DeliveryStatus, string> = {
  PENDING: 'À affecter',
  ASSIGNED: 'À récupérer',
  PICKED_UP: 'Récupérée',
  IN_TRANSIT: 'En route',
  ARRIVED: 'Arrivée',
  DELIVERED: 'Livrée',
  FAILED: 'Incident',
  CANCELLED: 'Annulée',
};

function formatDate(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' });
}

export default function CourierDashboardPage() {
  const socket = useRealtime();
  const { user, isCourier, isLoading: isAuthLoading } = useAuth();
  const router = useRouter();
  const [deliveries, setDeliveries] = useState<CourierDelivery[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busyDeliveryId, setBusyDeliveryId] = useState<string | null>(null);
  const [methods, setMethods] = useState<Record<string, ManualCollectionMethod>>({});
  const [amounts, setAmounts] = useState<Record<string, string>>({});
  const [references, setReferences] = useState<Record<string, string>>({});

  const loadDeliveries = useCallback(async () => {
    setError('');
    try {
      const result = await api.deliveries.listMine();
      setDeliveries(result);
      setAmounts((current) => {
        const next = { ...current };
        result.forEach((delivery) => {
          if (next[delivery.id] === undefined) next[delivery.id] = String(delivery.amountDueCdf);
        });
        return next;
      });
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Impossible de charger les livraisons.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isAuthLoading && (!user || !isCourier)) {
      router.replace('/connexion?redirect=%2Flivreur');
      return;
    }
    if (isCourier) {
      startTransition(() => {
        void loadDeliveries();
      });
    }
  }, [isAuthLoading, isCourier, loadDeliveries, router, user]);

  useEffect(() => {
    if (!socket || !isCourier) return;
    const refreshDeliveries = () => {
      void loadDeliveries();
    };
    socket.on('delivery.updated', refreshDeliveries);
    return () => {
      socket.off('delivery.updated', refreshDeliveries);
    };
  }, [isCourier, loadDeliveries, socket]);

  const updateStatus = async (delivery: CourierDelivery, status: 'PICKED_UP' | 'IN_TRANSIT' | 'ARRIVED') => {
    setBusyDeliveryId(delivery.id);
    setError('');
    setNotice('');
    try {
      await api.deliveries.updateStatus(delivery.id, status);
      setNotice(`Étape mise à jour : ${statusLabels[status]}.`);
      await loadDeliveries();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : 'Impossible de mettre à jour cette livraison.');
    } finally {
      setBusyDeliveryId(null);
    }
  };

  const recordCollection = async (delivery: CourierDelivery) => {
    const amountCdf = Number(amounts[delivery.id]);
    setBusyDeliveryId(delivery.id);
    setError('');
    setNotice('');
    try {
      await api.deliveries.recordCollection(delivery.id, {
        method: methods[delivery.id] ?? 'CASH',
        amountCdf,
        reference: references[delivery.id]?.trim() || undefined,
      });
      setNotice('Livraison confirmée et montant collecté enregistré.');
      await loadDeliveries();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : 'Impossible d’enregistrer la collecte.');
    } finally {
      setBusyDeliveryId(null);
    }
  };

  if (isAuthLoading || (isCourier && isLoading)) {
    return <p className="p-12 text-center text-sm text-stone-500">Chargement de votre espace livreur…</p>;
  }
  if (!isCourier) return null;

  const activeCount = deliveries.filter((delivery) => !['DELIVERED', 'FAILED', 'CANCELLED'].includes(delivery.deliveryStatus)).length;
  const completedCount = deliveries.filter((delivery) => delivery.deliveryStatus === 'DELIVERED').length;
  const totalToCollect = deliveries
    .filter((delivery) => delivery.deliveryStatus !== 'DELIVERED')
    .reduce((sum, delivery) => sum + delivery.amountDueCdf, 0);

  return (
    <div className="min-h-screen bg-stone-50 pb-16">
      <PageHeader
        title="Espace livreur"
        subtitle="Gérez vos tournées, confirmez les livraisons et enregistrez les montants collectés."
        breadcrumbs={[{ label: 'Accueil', href: '/' }, { label: 'Espace livreur' }]}
        badge={
          <span className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-[11px] font-bold text-sky-900">
            <IconTruck className="h-4 w-4" aria-hidden="true" />
            {user?.fullName}
          </span>
        }
        actions={<Button variant="outline" size="sm" onClick={() => void loadDeliveries()} isLoading={isLoading}>Actualiser</Button>}
      />

      <main className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
        {error && <p role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</p>}
        {notice && <p role="status" className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">{notice}</p>}

        <section aria-label="Résumé des tournées" className="grid gap-3 sm:grid-cols-3">
          {[
            { label: 'Livraisons en cours', value: activeCount, detail: 'À traiter dans votre tournée' },
            { label: 'Livrées', value: completedCount, detail: 'Collecte confirmée' },
            { label: 'À collecter', value: formatCdfPrice(totalToCollect), detail: 'Montants des livraisons actives' },
          ].map((item) => (
            <article key={item.label} className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-wide text-stone-500">{item.label}</p>
              <p className="mt-2 text-2xl font-black text-stone-900">{item.value}</p>
              <p className="mt-1 text-xs text-stone-500">{item.detail}</p>
            </article>
          ))}
        </section>

        <section aria-labelledby="courier-deliveries-title" className="space-y-4">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 id="courier-deliveries-title" className="text-xl font-black text-stone-900">Mes livraisons</h2>
              <p className="mt-1 text-sm text-stone-500">Aucune géolocalisation : suivez les étapes et adresses indiquées ci-dessous.</p>
            </div>
            <span className="rounded-full bg-stone-200 px-3 py-1 text-xs font-bold text-stone-700">{deliveries.length}</span>
          </div>

          {deliveries.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-stone-300 bg-white px-6 py-14 text-center">
              <IconTruck className="mx-auto h-10 w-10 text-stone-300" aria-hidden="true" />
              <h3 className="mt-3 font-bold text-stone-900">Aucune livraison affectée</h3>
              <p className="mt-1 text-sm text-stone-500">Les nouvelles missions apparaîtront ici après affectation par l’administration.</p>
            </div>
          ) : deliveries.map((delivery) => {
            const nextStatus: Partial<Record<DeliveryStatus, 'PICKED_UP' | 'IN_TRANSIT' | 'ARRIVED'>> = {
              ASSIGNED: 'PICKED_UP',
              PICKED_UP: 'IN_TRANSIT',
              IN_TRANSIT: 'ARRIVED',
            };
            const next = nextStatus[delivery.deliveryStatus];
            const method = methods[delivery.id] ?? 'CASH';
            return (
              <article key={delivery.id} className="overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-sm">
                <header className="flex flex-col gap-3 border-b border-stone-100 bg-stone-50/80 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-bold text-stone-900">{delivery.orderNumber}</h3>
                      <span className="rounded-full bg-sky-100 px-2.5 py-1 text-[10px] font-bold text-sky-900">{statusLabels[delivery.deliveryStatus]}</span>
                    </div>
                    <p className="mt-1 text-xs text-stone-500">{delivery.subOrderNumber} · {delivery.sellerName}</p>
                  </div>
                  <div className="sm:text-right">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-stone-500">À collecter à la remise</p>
                    <p className="text-lg font-black text-emerald-900">{formatCdfPrice(delivery.amountDueCdf)}</p>
                  </div>
                </header>

                <div className="grid gap-5 p-5 sm:grid-cols-2 sm:p-6">
                  <div className="space-y-4">
                    <div className="rounded-2xl border border-stone-200 p-4">
                      <p className="text-[10px] font-bold uppercase tracking-wide text-stone-500">Retrait vendeur</p>
                      <p className="mt-1 font-bold text-stone-900">{delivery.sellerName}</p>
                      <p className="mt-1 text-sm text-stone-600">{delivery.pickupAddress}, {delivery.pickupCity}, {delivery.pickupProvince}</p>
                      <a href={`tel:${delivery.sellerPhone}`} className="mt-2 inline-flex items-center gap-1.5 text-xs font-bold text-emerald-800">
                        <IconPhone className="h-3.5 w-3.5" aria-hidden="true" />{delivery.sellerPhone}
                      </a>
                    </div>
                    <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4">
                      <p className="text-[10px] font-bold uppercase tracking-wide text-emerald-800">Destinataire</p>
                      <p className="mt-1 font-bold text-stone-900">{delivery.recipientName}</p>
                      <p className="mt-1 text-sm text-stone-700">{delivery.dropoffAddress}, {delivery.dropoffCity}, {delivery.dropoffProvince}</p>
                      <a href={`tel:${delivery.recipientPhone}`} className="mt-2 inline-flex items-center gap-1.5 text-xs font-bold text-emerald-900">
                        <IconPhone className="h-3.5 w-3.5" aria-hidden="true" />{delivery.recipientPhone}
                      </a>
                      {delivery.deliveryInstructions && <p className="mt-2 text-xs text-stone-600">Note : {delivery.deliveryInstructions}</p>}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="rounded-2xl border border-stone-200 p-4">
                      <p className="text-[10px] font-bold uppercase tracking-wide text-stone-500">Colis</p>
                      <ul className="mt-2 space-y-2">
                        {delivery.items.map((item, index) => (
                          <li key={`${item.productName}-${index}`} className="flex justify-between gap-3 text-sm text-stone-700">
                            <span>{item.productName}</span><span className="font-semibold">× {item.quantity}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {next && (
                      <Button
                        type="button"
                        variant="primary"
                        size="md"
                        className="w-full"
                        isLoading={busyDeliveryId === delivery.id}
                        onClick={() => void updateStatus(delivery, next)}
                      >
                        {next === 'PICKED_UP' ? 'Confirmer le retrait chez le vendeur' : next === 'IN_TRANSIT' ? 'Départ en livraison' : 'Confirmer mon arrivée'}
                      </Button>
                    )}

                    {delivery.deliveryStatus === 'ARRIVED' && (
                      <form
                        className="space-y-3 rounded-2xl border border-amber-200 bg-amber-50/70 p-4"
                        onSubmit={(event) => {
                          event.preventDefault();
                          void recordCollection(delivery);
                        }}
                      >
                        <div>
                          <h4 className="font-bold text-stone-900">Confirmer la collecte</h4>
                          <p className="mt-1 text-xs text-stone-600">Vérifiez le montant exact reçu avant de terminer la livraison.</p>
                        </div>
                        <label className="block text-xs font-bold text-stone-700">
                          Mode de règlement
                          <select
                            value={method}
                            onChange={(event) => setMethods((current) => ({ ...current, [delivery.id]: event.target.value as ManualCollectionMethod }))}
                            className="mt-1.5 w-full rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-sm"
                          >
                            <option value="CASH">Espèces</option>
                            <option value="MOBILE_MONEY_DIRECT">Mobile Money direct</option>
                          </select>
                        </label>
                        <label className="block text-xs font-bold text-stone-700">
                          Montant reçu (CDF)
                          <input
                            type="number"
                            min="0.01"
                            step="0.01"
                            required
                            value={amounts[delivery.id] ?? ''}
                            onChange={(event) => setAmounts((current) => ({ ...current, [delivery.id]: event.target.value }))}
                            className="mt-1.5 w-full rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-sm"
                          />
                        </label>
                        {method === 'MOBILE_MONEY_DIRECT' && (
                          <label className="block text-xs font-bold text-stone-700">
                            Référence (facultative)
                            <input
                              value={references[delivery.id] ?? ''}
                              onChange={(event) => setReferences((current) => ({ ...current, [delivery.id]: event.target.value }))}
                              className="mt-1.5 w-full rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-sm"
                            />
                          </label>
                        )}
                        <Button type="submit" variant="primary" size="md" className="w-full" isLoading={busyDeliveryId === delivery.id}>
                          <IconCheck className="h-4 w-4" aria-hidden="true" />
                          Confirmer la livraison et la collecte
                        </Button>
                      </form>
                    )}

                    {delivery.deliveryStatus === 'DELIVERED' && (
                      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                        <p className="flex items-center gap-2 text-sm font-bold text-emerald-900">
                          <IconCheck className="h-4 w-4" aria-hidden="true" /> Livraison confirmée
                        </p>
                        <p className="mt-1 text-xs text-emerald-800">
                          {delivery.collectionMethod === 'CASH' ? 'Espèces' : 'Mobile Money direct'} · {formatCdfPrice(delivery.collectedAmountCdf ?? delivery.amountDueCdf)}
                          {formatDate(delivery.collectedAt) ? ` · ${formatDate(delivery.collectedAt)}` : ''}
                        </p>
                        {delivery.platformDepositReceivedAt
                          ? <p className="mt-2 text-xs font-semibold text-emerald-800">Remise à AgroConnect confirmée.</p>
                          : <p className="mt-2 text-xs text-stone-600">Remettez le montant collecté à AgroConnect et attendez la confirmation de réception.</p>}
                      </div>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </section>
      </main>
    </div>
  );
}
