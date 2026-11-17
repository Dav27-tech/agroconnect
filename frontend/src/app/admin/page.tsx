'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { PageHeader } from '../../components/layout/PageHeader';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { EmptyState } from '../../components/ui/EmptyState';

interface SellerReview {
  id: string;
  fullName: string;
  phoneNumber: string;
  email?: string | null;
  sellerType: string;
  businessName: string;
  province: string;
  city: string;
  address?: string | null;
  verificationStatus: string;
}

export default function AdminPage() {
  const { isAdmin, isLoading: isAuthLoading } = useAuth();
  const [profiles, setProfiles] = useState<SellerReview[]>([]);
  const [statusFilter, setStatusFilter] = useState<'PENDING' | 'UNDER_REVIEW' | 'VERIFIED' | 'REJECTED'>('PENDING');
  const [rate, setRate] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingRate, setIsSavingRate] = useState(false);
  const [message, setMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (isAuthLoading || !isAdmin) return;
    let mounted = true;

    Promise.all([api.admin.getStats(), api.admin.getExchangeRate(), api.admin.listSellerProfiles(statusFilter)])
      .then(([stats, rateData, sellerProfiles]) => {
        if (!mounted) return;
        setProfiles(sellerProfiles);
        setRate(rateData.activeRate?.rate != null ? String(rateData.activeRate.rate) : '');
        if (stats.activeExchangeRate != null) setRate(String(stats.activeExchangeRate));
      })
      .catch((error) => {
        if (mounted) setErrorMessage((error as Error).message);
      })
      .finally(() => {
        if (mounted) setIsLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [isAdmin, isAuthLoading, statusFilter]);

  const refreshProfiles = async () => {
    try {
      const sellerProfiles = await api.admin.listSellerProfiles(statusFilter);
      setProfiles(sellerProfiles);
    } catch (error) {
      setErrorMessage((error as Error).message);
    }
  };

  const reviewSeller = async (sellerId: string, status: 'VERIFIED' | 'REJECTED') => {
    setErrorMessage('');
    setMessage('');
    try {
      await api.admin.updateSellerVerification(sellerId, status);
      setProfiles((current) => current.filter((profile) => profile.id !== sellerId));
      setMessage(status === 'VERIFIED' ? 'Profil vendeur validé.' : 'Profil vendeur refusé.');
    } catch (error) {
      setErrorMessage((error as Error).message);
    }
  };

  const saveRate = async (event: React.FormEvent) => {
    event.preventDefault();
    const parsedRate = Number(rate);
    if (!Number.isFinite(parsedRate) || parsedRate <= 0) {
      setErrorMessage('Saisissez un taux supérieur à zéro.');
      return;
    }

    setIsSavingRate(true);
    setErrorMessage('');
    setMessage('');
    try {
      await api.admin.updateExchangeRate(parsedRate, 'Taux configuré depuis le panneau administrateur');
      setMessage('Taux mis à jour. Il s’appliquera aux prochaines commandes.');
    } catch (error) {
      setErrorMessage((error as Error).message);
    } finally {
      setIsSavingRate(false);
    }
  };

  if (isAuthLoading || isLoading) {
    return <p className="p-12 text-center text-sm text-stone-500">Chargement de l’administration...</p>;
  }

  if (!isAdmin) {
    return (
      <EmptyState
        title="Accès administrateur requis"
        description="Connectez-vous avec un compte administrateur pour gérer les profils vendeurs et les paramètres de la plateforme."
        actionText="Connexion"
        actionHref="/connexion"
      />
    );
  }

  return (
    <div className="min-h-screen bg-stone-50 pb-16">
      <PageHeader
        title="Administration"
        subtitle="Validation des vendeurs et paramètres de la plateforme."
        breadcrumbs={[{ label: 'Accueil', href: '/' }, { label: 'Administration' }]}
      />

      <main className="mx-auto max-w-7xl space-y-10 px-4 py-8 sm:px-6 lg:px-8">
        {(message || errorMessage) && (
          <p role="status" className={`rounded-lg border p-3 text-sm ${errorMessage ? 'border-red-200 bg-red-50 text-red-800' : 'border-emerald-200 bg-emerald-50 text-emerald-800'}`}>
            {errorMessage || message}
          </p>
        )}

        <section aria-labelledby="seller-reviews-title" className="border-b border-stone-200 pb-10">
          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <h2 id="seller-reviews-title" className="text-xl font-bold text-stone-900">Profils vendeurs</h2>
              <p className="mt-1 text-sm text-stone-500">{profiles.length} profil(s) dans le statut sélectionné</p>
            </div>
            <div className="flex items-center gap-2">
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)}
                className="rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm text-stone-800"
              >
                <option value="PENDING">En attente</option>
                <option value="UNDER_REVIEW">En cours</option>
                <option value="VERIFIED">Validés</option>
                <option value="REJECTED">Refusés</option>
              </select>
              <Button variant="outline" size="sm" onClick={refreshProfiles}>Actualiser</Button>
            </div>
          </div>

          {profiles.length === 0 ? (
            <p className="py-8 text-center text-sm text-stone-500">Aucun profil en attente.</p>
          ) : (
            <div className="divide-y divide-stone-200">
              {profiles.map((profile) => (
                <article key={profile.id} className="grid gap-4 py-5 sm:grid-cols-[1fr_auto] sm:items-center">
                  <div>
                    <h3 className="font-semibold text-stone-900">{profile.businessName}</h3>
                    <p className="mt-1 text-sm text-stone-600">{profile.fullName} · {profile.sellerType}</p>
                    <p className="text-sm text-stone-500">{profile.city}, {profile.province} · {profile.phoneNumber}</p>
                    {profile.email && <p className="text-sm text-stone-500">{profile.email}</p>}
                    {profile.address && <p className="text-sm text-stone-500">{profile.address}</p>}
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => reviewSeller(profile.id, 'REJECTED')}>Refuser</Button>
                    <Button variant="primary" size="sm" onClick={() => reviewSeller(profile.id, 'VERIFIED')}>Valider</Button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <section aria-labelledby="exchange-rate-title" className="max-w-xl">
          <h2 id="exchange-rate-title" className="text-xl font-bold text-stone-900">Taux de conversion</h2>
          <p className="mb-4 mt-1 text-sm text-stone-500">Le nouveau taux sera appliqué aux prochaines transactions.</p>
          <form onSubmit={saveRate} className="flex items-end gap-3">
            <Input
              label="Taux en CDF *"
              type="number"
              min="0.01"
              step="0.01"
              value={rate}
              onChange={(event) => setRate(event.target.value)}
              required
            />
            <Button type="submit" variant="primary" isLoading={isSavingRate}>Enregistrer</Button>
          </form>
        </section>
      </main>
    </div>
  );
}
