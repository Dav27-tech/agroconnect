'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { PageHeader } from '../../components/layout/PageHeader';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';
import {
  IconBasket,
  IconBuilding,
  IconLocation,
  IconMail,
  IconPhone,
  IconPlant,
  IconSearch,
  IconShieldCheck,
  IconShoppingBag,
  IconUser,
} from '../../components/ui/Icons';

const verificationLabels: Record<string, string> = {
  PENDING: 'En attente',
  UNDER_REVIEW: 'En cours',
  VERIFIED: 'Vérifié',
  REJECTED: 'Refusé',
};

const sellerTypeLabels: Record<string, string> = {
  FARMER: 'Agriculteur',
  RESELLER: 'Revendeur',
  SUPPLIER: 'Fournisseur',
};

function verificationBadgeClass(status: string) {
  if (status === 'VERIFIED') return 'bg-emerald-100 text-emerald-800';
  if (status === 'REJECTED') return 'bg-red-100 text-red-800';
  if (status === 'UNDER_REVIEW') return 'bg-sky-100 text-sky-800';
  return 'bg-amber-100 text-amber-900';
}

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
  isActive: boolean;
}

interface AdminStats {
  usersCount: number;
  activeSellersCount: number;
  catalogueProductsCount: number;
  activeOffersCount: number;
  parentOrdersCount: number;
  subOrdersCount: number;
}

export default function AdminPage() {
  const { isAdmin, isLoading: isAuthLoading } = useAuth();
  const [profiles, setProfiles] = useState<SellerReview[]>([]);
  const [sellers, setSellers] = useState<SellerReview[]>([]);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [statusFilter, setStatusFilter] = useState<'PENDING' | 'UNDER_REVIEW' | 'VERIFIED' | 'REJECTED'>('PENDING');
  const [sellerStatusFilter, setSellerStatusFilter] = useState<'ALL' | 'ACTIVE' | 'DISABLED'>('ALL');
  const [sellerSearch, setSellerSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [updatingSellerId, setUpdatingSellerId] = useState<string | null>(null);
  const [reviewingSellerId, setReviewingSellerId] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (isAuthLoading || !isAdmin) return;
    let mounted = true;

    Promise.all([
      api.admin.getStats(),
      api.admin.listSellerProfiles(statusFilter),
      api.admin.listSellerProfiles('ALL'),
    ])
      .then(([platformStats, sellerProfiles, allSellers]) => {
        if (!mounted) return;
        setStats(platformStats);
        setProfiles(sellerProfiles);
        setSellers(allSellers);
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
    setIsLoading(true);
    setErrorMessage('');
    setMessage('');
    try {
      const [platformStats, sellerProfiles, allSellers] = await Promise.all([
        api.admin.getStats(),
        api.admin.listSellerProfiles(statusFilter),
        api.admin.listSellerProfiles('ALL'),
      ]);
      setStats(platformStats);
      setProfiles(sellerProfiles);
      setSellers(allSellers);
    } catch (error) {
      setErrorMessage((error as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const reviewSeller = async (sellerId: string, status: 'VERIFIED' | 'REJECTED') => {
    setReviewingSellerId(sellerId);
    setErrorMessage('');
    setMessage('');
    try {
      await api.admin.updateSellerVerification(sellerId, status);
      setProfiles((current) => current.filter((profile) => profile.id !== sellerId));
      setSellers((current) => current.map((seller) => (
        seller.id === sellerId ? { ...seller, verificationStatus: status } : seller
      )));
      setMessage(status === 'VERIFIED' ? 'Profil vendeur validé.' : 'Profil vendeur refusé.');
    } catch (error) {
      setErrorMessage((error as Error).message);
    } finally {
      setReviewingSellerId(null);
    }
  };

  const toggleSellerStatus = async (seller: SellerReview) => {
    const isActive = !seller.isActive;
    setUpdatingSellerId(seller.id);
    setErrorMessage('');
    setMessage('');
    try {
      await api.admin.updateSellerActiveStatus(seller.id, isActive);
      setSellers((current) => current.map((item) => item.id === seller.id ? { ...item, isActive } : item));
      setStats((current) => current ? {
        ...current,
        activeSellersCount: current.activeSellersCount + (isActive ? 1 : -1),
      } : current);
      setMessage(isActive ? 'Compte vendeur réactivé.' : 'Compte vendeur désactivé.');
    } catch (error) {
      setErrorMessage((error as Error).message);
    } finally {
      setUpdatingSellerId(null);
    }
  };

  const filteredSellers = sellers.filter((seller) => {
    if (sellerStatusFilter === 'ACTIVE' && !seller.isActive) return false;
    if (sellerStatusFilter === 'DISABLED' && seller.isActive) return false;
    const query = sellerSearch.trim().toLocaleLowerCase();
    return !query || [
      seller.businessName,
      seller.fullName,
      seller.email,
      seller.phoneNumber,
      seller.city,
      seller.province,
    ].some((value) => value?.toLocaleLowerCase().includes(query));
  });

  if (isAuthLoading || (isAdmin && isLoading)) {
    return (
      <main className="flex min-h-[60vh] items-center justify-center bg-stone-50 px-4">
        <div role="status" className="flex items-center gap-4 rounded-2xl border border-stone-200 bg-white px-6 py-5 shadow-sm">
          <span className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-100 border-t-emerald-800" />
          <span>
            <span className="block text-sm font-bold text-stone-900">Ouverture de la console</span>
            <span className="mt-1 block text-xs text-stone-500">Chargement des données de la plateforme…</span>
          </span>
        </div>
      </main>
    );
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
        title="Console d’administration"
        subtitle="Pilotez les vendeurs et suivez l’activité du marché AgroConnect."
        breadcrumbs={[{ label: 'Accueil', href: '/' }, { label: 'Administration' }]}
        badge={
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-bold text-emerald-800">
            <IconShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
            Accès sécurisé
          </span>
        }
        actions={
          <Button variant="outline" size="sm" onClick={() => void refreshProfiles()} isLoading={isLoading}>
            Actualiser
          </Button>
        }
      />

      <main className="mx-auto max-w-7xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
        {(message || errorMessage) && (
          <p role={errorMessage ? 'alert' : 'status'} className={`rounded-xl border p-4 text-sm font-medium ${errorMessage ? 'border-red-200 bg-red-50 text-red-800' : 'border-emerald-200 bg-emerald-50 text-emerald-800'}`}>
            {errorMessage || message}
          </p>
        )}

        <section aria-label="Résumé de la plateforme" className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {[
            {
              label: 'Comptes utilisateurs',
              value: stats?.usersCount ?? 0,
              detail: 'Comptes enregistrés',
              icon: <IconUser className="h-5 w-5" aria-hidden="true" />,
              iconClass: 'bg-sky-50 text-sky-700',
            },
            {
              label: 'Vendeurs actifs',
              value: stats?.activeSellersCount ?? 0,
              detail: `${sellers.length.toLocaleString('fr-FR')} profils au total`,
              icon: <IconPlant className="h-5 w-5" aria-hidden="true" />,
              iconClass: 'bg-emerald-50 text-emerald-800',
            },
            {
              label: 'Offres au catalogue',
              value: stats?.activeOffersCount ?? 0,
              detail: `${(stats?.catalogueProductsCount ?? 0).toLocaleString('fr-FR')} produits référencés`,
              icon: <IconBasket className="h-5 w-5" aria-hidden="true" />,
              iconClass: 'bg-amber-50 text-amber-800',
            },
            {
              label: 'Commandes',
              value: stats?.parentOrdersCount ?? 0,
              detail: `${(stats?.subOrdersCount ?? 0).toLocaleString('fr-FR')} sous-commandes`,
              icon: <IconShoppingBag className="h-5 w-5" aria-hidden="true" />,
              iconClass: 'bg-violet-50 text-violet-700',
            },
          ].map((item) => (
            <article key={item.label} className="min-w-0 rounded-2xl border border-stone-200 bg-white p-3 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md sm:p-4">
              <div className="flex items-start justify-between gap-2">
                <p className="min-w-0 text-[10px] font-bold uppercase leading-tight tracking-wide text-stone-500 sm:text-[11px]">{item.label}</p>
                <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${item.iconClass}`}>
                  {item.icon}
                </span>
              </div>
              <p className="mt-2 text-2xl font-black tracking-tight text-stone-900 sm:text-3xl">{item.value.toLocaleString('fr-FR')}</p>
              <p className="mt-1 min-h-8 text-[11px] leading-4 text-stone-500">{item.detail}</p>
            </article>
          ))}
        </section>

        <section aria-labelledby="seller-management-title" className="overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-sm">
          <div className="bg-gradient-to-r from-emerald-950 via-emerald-900 to-teal-800 px-6 py-7 text-white sm:px-8">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div className="flex items-start gap-4">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/15 bg-white/10">
                  <IconBuilding className="h-6 w-6" aria-hidden="true" />
                </span>
                <div>
                  <h2 id="seller-management-title" className="text-xl font-bold">Répertoire des vendeurs</h2>
                  <p className="mt-1 max-w-xl text-sm text-emerald-100">
                    Recherchez les comptes, vérifiez leur statut et gérez leur accès à la plateforme.
                  </p>
                </div>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <label className="relative">
                  <span className="sr-only">Rechercher un vendeur</span>
                  <IconSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" aria-hidden="true" />
                  <input
                    type="search"
                    value={sellerSearch}
                    onChange={(event) => setSellerSearch(event.target.value)}
                    placeholder="Nom, ville, email..."
                    className="w-full rounded-xl border border-white/20 bg-white px-9 py-2.5 text-sm text-stone-900 outline-none ring-emerald-300 placeholder:text-stone-400 focus:ring-2 sm:w-64"
                  />
                </label>
                <label>
                  <span className="sr-only">Filtrer les vendeurs</span>
                  <select
                    value={sellerStatusFilter}
                    onChange={(event) => setSellerStatusFilter(event.target.value as typeof sellerStatusFilter)}
                    className="w-full rounded-xl border border-white/20 bg-white px-3 py-2.5 text-sm font-medium text-stone-900 outline-none focus:ring-2 focus:ring-emerald-300 sm:w-auto"
                  >
                    <option value="ALL">Tous les comptes</option>
                    <option value="ACTIVE">Actifs</option>
                    <option value="DISABLED">Désactivés</option>
                  </select>
                </label>
              </div>
            </div>
            <p className="mt-5 text-xs font-medium text-emerald-100">
              {filteredSellers.length.toLocaleString('fr-FR')} résultat(s) sur {sellers.length.toLocaleString('fr-FR')} vendeur(s)
            </p>
          </div>

          <div className="space-y-3 p-4 sm:p-6">
            {filteredSellers.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-stone-300 bg-stone-50 px-6 py-12 text-center">
                <IconPlant className="mx-auto h-8 w-8 text-stone-300" aria-hidden="true" />
                <p className="mt-3 text-sm font-semibold text-stone-700">Aucun vendeur trouvé</p>
                <p className="mt-1 text-xs text-stone-500">Modifiez le filtre ou le terme de recherche.</p>
                {(sellerSearch || sellerStatusFilter !== 'ALL') && (
                  <button
                    type="button"
                    onClick={() => {
                      setSellerSearch('');
                      setSellerStatusFilter('ALL');
                    }}
                    className="mt-4 text-xs font-bold text-emerald-800 hover:underline"
                  >
                    Réinitialiser les filtres
                  </button>
                )}
              </div>
            ) : (
              filteredSellers.map((seller) => (
                <article key={seller.id} className="flex flex-col gap-5 rounded-2xl border border-stone-200 bg-white p-4 transition hover:border-emerald-200 hover:shadow-sm sm:p-5 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex min-w-0 items-start gap-4">
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-800">
                      <IconPlant className="h-6 w-6" aria-hidden="true" />
                    </span>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-sm font-bold text-stone-900">{seller.businessName}</h3>
                        <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${seller.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>
                          {seller.isActive ? 'Compte actif' : 'Accès suspendu'}
                        </span>
                        <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${verificationBadgeClass(seller.verificationStatus)}`}>
                          {verificationLabels[seller.verificationStatus] ?? seller.verificationStatus}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-stone-600">{seller.fullName} · {sellerTypeLabels[seller.sellerType] ?? seller.sellerType}</p>
                      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs text-stone-500">
                        <span className="inline-flex items-center gap-1.5">
                          <IconLocation className="h-3.5 w-3.5 text-stone-400" aria-hidden="true" />
                          {seller.city}, {seller.province}
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                          <IconPhone className="h-3.5 w-3.5 text-stone-400" aria-hidden="true" />
                          {seller.phoneNumber}
                        </span>
                        {seller.email && (
                          <span className="inline-flex items-center gap-1.5">
                            <IconMail className="h-3.5 w-3.5 text-stone-400" aria-hidden="true" />
                            {seller.email}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center lg:justify-end">
                    <button
                      type="button"
                      onClick={() => void toggleSellerStatus(seller)}
                      disabled={updatingSellerId === seller.id}
                      className={`inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition disabled:cursor-wait disabled:opacity-60 sm:w-auto ${seller.isActive ? 'border border-red-200 bg-white text-red-700 hover:bg-red-50' : 'bg-emerald-800 text-white hover:bg-emerald-700'}`}
                    >
                      <IconShieldCheck className="h-4 w-4" aria-hidden="true" />
                      {updatingSellerId === seller.id ? 'Mise à jour…' : seller.isActive ? 'Désactiver le compte' : 'Réactiver le compte'}
                    </button>
                  </div>
                </article>
              ))
            )}
          </div>
        </section>

        <section aria-labelledby="seller-reviews-title" className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm sm:p-7">
          <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-800">
                  <IconShieldCheck className="h-5 w-5" aria-hidden="true" />
                </span>
                <h2 id="seller-reviews-title" className="text-xl font-bold text-stone-900">Vérification des profils</h2>
              </div>
              <p className="mt-2 text-sm text-stone-500">
                {profiles.length.toLocaleString('fr-FR')} dossier(s) · {verificationLabels[statusFilter]}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={statusFilter}
                onChange={(event) => {
                  setIsLoading(true);
                  setErrorMessage('');
                  setStatusFilter(event.target.value as typeof statusFilter);
                }}
                className="rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm text-stone-800"
              >
                <option value="PENDING">En attente</option>
                <option value="UNDER_REVIEW">En cours</option>
                <option value="VERIFIED">Vérifiés</option>
                <option value="REJECTED">Refusés</option>
              </select>
              <Button variant="outline" size="sm" onClick={() => void refreshProfiles()}>Actualiser</Button>
            </div>
          </div>

          {profiles.length === 0 ? (
            <p className="rounded-2xl bg-stone-50 py-8 text-center text-sm text-stone-500">Aucun profil dans ce statut.</p>
          ) : (
            <div className="grid gap-3">
              {profiles.map((profile) => (
                <article key={profile.id} className="grid gap-4 rounded-2xl border border-stone-200 bg-stone-50/60 p-4 sm:grid-cols-[1fr_auto] sm:items-center sm:p-5">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-bold text-stone-900">{profile.businessName}</h3>
                      <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${verificationBadgeClass(profile.verificationStatus)}`}>
                        {verificationLabels[profile.verificationStatus] ?? profile.verificationStatus}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-stone-600">{profile.fullName} · {sellerTypeLabels[profile.sellerType] ?? profile.sellerType}</p>
                    <p className="mt-2 text-xs text-stone-500">
                      {profile.city}, {profile.province} · {profile.phoneNumber}
                      {profile.email ? ` · ${profile.email}` : ''}
                    </p>
                    {profile.address && <p className="mt-1 text-xs text-stone-500">{profile.address}</p>}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => void reviewSeller(profile.id, 'REJECTED')}
                      disabled={reviewingSellerId === profile.id}
                    >
                      {reviewingSellerId === profile.id ? 'Traitement…' : 'Refuser'}
                    </Button>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => void reviewSeller(profile.id, 'VERIFIED')}
                      disabled={reviewingSellerId === profile.id}
                    >
                      {reviewingSellerId === profile.id ? 'Traitement…' : 'Valider le profil'}
                    </Button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

      </main>
    </div>
  );
}
