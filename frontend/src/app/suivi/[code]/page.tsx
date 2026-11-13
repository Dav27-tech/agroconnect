'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { EmptyState } from '../../../components/ui/EmptyState';
import { IconCheck, IconTruck, IconLocation, IconShieldCheck, IconSearch } from '../../../components/ui/Icons';
import { DeliveryInfo } from '../../../types';
import { api } from '../../../services/api';

export default function TrackingPage() {
  const params = useParams();
  const rawCode = params?.code as string;
  const [code, setCode] = useState(rawCode || 'AGC-TRK-784910');
  const [delivery, setDelivery] = useState<DeliveryInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchCode, setSearchCode] = useState(code);

  useEffect(() => {
    async function fetchTracking() {
      setIsLoading(true);
      try {
        const data = await api.deliveries.track(code);
        setDelivery(data);
      } catch (err) {
        console.warn('Erreur suivi livraison :', err);
      } finally {
        setIsLoading(false);
      }
    }
    fetchTracking();
  }, [code]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchCode.trim()) {
      setCode(searchCode.trim());
    }
  };

  return (
    <div className="bg-stone-50 min-h-screen pb-20">
      <PageHeader
        title="Suivi de Livraison Logistique"
        subtitle="Traçabilité transparente des expéditions de récoltes et intrants à travers la République Démocratique du Congo."
        breadcrumbs={[
          { label: 'Accueil', href: '/' },
          { label: 'Suivi Logistique', href: '/mes-commandes' },
          { label: code },
        ]}
      />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-8">
        {/* Barre de recherche d'un code de suivi */}
        <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs">
          <form onSubmit={handleSearch} className="flex gap-3">
            <div className="flex-1">
              <Input
                placeholder="Entrez votre code de suivi (ex: AGC-TRK-784910)..."
                value={searchCode}
                onChange={(e) => setSearchCode(e.target.value)}
                leftIcon={<IconSearch className="w-4 h-4 text-stone-400" />}
              />
            </div>
            <Button type="submit" variant="primary" size="md">
              Rechercher
            </Button>
          </form>
        </div>

        {isLoading ? (
          <div className="bg-white p-8 rounded-3xl border border-stone-200 h-96 animate-pulse" />
        ) : delivery ? (
          <div className="space-y-6">
            {/* Carte Résumé Livraison */}
            <div className="bg-white p-6 sm:p-8 rounded-3xl border border-stone-200 shadow-xs space-y-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-stone-100 pb-5">
                <div>
                  <div className="flex items-center gap-3">
                    <span className="text-xl font-black text-stone-900">{delivery.trackingCode}</span>
                    <span className="text-xs font-bold px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                      {delivery.status}
                    </span>
                  </div>
                  <p className="text-xs text-stone-500 mt-1">
                    Sous-commande : <strong>{delivery.subOrderNumber || delivery.subOrderId}</strong> • Vendeur :{' '}
                    <strong>{delivery.sellerName || 'Partenaire Agricole'}</strong>
                  </p>
                </div>

                {delivery.courier && (
                  <div className="text-left sm:text-right bg-stone-50 p-3 rounded-xl border border-stone-200">
                    <p className="text-xs font-bold text-stone-900">{delivery.courier.companyName}</p>
                    <p className="text-[11px] text-stone-500">
                      {delivery.courier.vehicleType} ({delivery.courier.plateNumber})
                    </p>
                  </div>
                )}
              </div>

              {/* Trajet Origine -> Destination */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 bg-emerald-50/50 p-5 rounded-2xl border border-emerald-100 text-xs">
                <div>
                  <span className="font-bold uppercase tracking-wider text-emerald-800 flex items-center gap-1.5 mb-1">
                    <IconLocation className="w-4 h-4 text-emerald-700" />
                    <span>Lieu de Départ / Collecte</span>
                  </span>
                  <p className="font-bold text-stone-900">
                    {delivery.origin?.city}, {delivery.origin?.province}
                  </p>
                  <p className="text-stone-600 mt-0.5">{delivery.origin?.address}</p>
                </div>

                <div>
                  <span className="font-bold uppercase tracking-wider text-emerald-800 flex items-center gap-1.5 mb-1">
                    <IconTruck className="w-4 h-4 text-emerald-700" />
                    <span>Lieu de Destination</span>
                  </span>
                  <p className="font-bold text-stone-900">
                    {delivery.destination?.city}, {delivery.destination?.province}
                  </p>
                  <p className="text-stone-600 mt-0.5">{delivery.destination?.address}</p>
                </div>
              </div>

              {/* Chronologie des Jalons (Timeline) */}
              <div>
                <h3 className="text-sm font-bold text-stone-900 mb-4">
                  Historique des étapes de transport ({delivery.statusHistory?.length || 0})
                </h3>

                <div className="relative pl-6 border-l-2 border-emerald-800 space-y-6">
                  {delivery.statusHistory?.map((event, idx) => (
                    <div key={event.id || idx} className="relative">
                      {/* Pastille */}
                      <span className="absolute -left-[31px] top-0.5 w-4 h-4 rounded-full bg-emerald-800 ring-4 ring-emerald-100" />

                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black text-stone-900">{event.status}</span>
                          <span className="text-[10px] text-stone-400">
                            {new Date(event.createdAt).toLocaleString('fr-FR')}
                          </span>
                        </div>
                        {event.location && (
                          <p className="text-xs font-bold text-emerald-900 mt-0.5">
                            📍 Localisation : {event.location}
                          </p>
                        )}
                        <p className="text-xs text-stone-600 mt-1">{event.notes}</p>
                        {event.recordedBy && (
                          <p className="text-[10px] text-stone-400 mt-0.5">
                            Enregistré par : {event.recordedBy}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-4 bg-stone-100 rounded-2xl border border-stone-200 text-xs text-stone-600 flex items-center gap-2">
              <IconShieldCheck className="w-5 h-5 text-emerald-800 flex-shrink-0" />
              <span>
                Le suivi logistique AgroConnect est mis à jour en temps réel aux postes de contrôle et points relais provinciaux de la RDC.
              </span>
            </div>
          </div>
        ) : (
          <EmptyState
            title="Code de livraison introuvable"
            description={`Le numéro de suivi '${code}' ne correspond à aucune expédition active.`}
            actionText="Vérifier mes commandes"
            actionHref="/mes-commandes"
          />
        )}
      </div>
    </div>
  );
}

