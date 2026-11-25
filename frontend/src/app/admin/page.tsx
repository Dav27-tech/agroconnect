'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useRealtime } from '../../context/RealtimeContext';
import { api } from '../../services/api';
import { PageHeader } from '../../components/layout/PageHeader';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';
import { DashboardBarChart } from '../../components/dashboard/DashboardBarChart';
import { formatCdfPrice } from '../../utils/format';
import { CourierAccount, DeliveryOperation } from '../../types';
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
  IconTruck,
  IconUser,
  IconCheck,
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
  const socket = useRealtime();
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
  const [commissionRatePercent, setCommissionRatePercent] = useState('10');
  const [couriers, setCouriers] = useState<CourierAccount[]>([]);
  const [deliveries, setDeliveries] = useState<DeliveryOperation[]>([]);
  const [financeSummary, setFinanceSummary] = useState<Awaited<ReturnType<typeof api.finance.getPlatformSummary>> | null>(null);
  const [newCourier, setNewCourier] = useState({
    fullName: '',
    email: '',
    phoneNumber: '',
    password: '',
    companyName: '',
    vehicleType: '',
    plateNumber: '',
    operatingArea: '',
  });
  const [selectedCourierByDelivery, setSelectedCourierByDelivery] = useState<Record<string, string>>({});
  const [isSavingCommission, setIsSavingCommission] = useState(false);
  const [isCreatingCourier, setIsCreatingCourier] = useState(false);
  const [updatingCourierId, setUpdatingCourierId] = useState<string | null>(null);
  const [assigningDeliveryId, setAssigningDeliveryId] = useState<string | null>(null);
  const [confirmingDepositId, setConfirmingDepositId] = useState<string | null>(null);

  const refreshProfiles = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage('');
    setMessage('');
    try {
      const [platformStats, sellerProfiles, allSellers, commissionSettings, courierList, deliveryList, summary] = await Promise.all([
        api.admin.getStats(),
        api.admin.listSellerProfiles(statusFilter),
        api.admin.listSellerProfiles('ALL'),
        api.admin.getCommissionSettings(),
        api.admin.listCouriers(),
        api.deliveries.listOperations(),
        api.finance.getPlatformSummary(),
      ]);
      setStats(platformStats);
      setProfiles(sellerProfiles);
      setSellers(allSellers);
      setCommissionRatePercent(String(commissionSettings.commissionRatePercent));
      setCouriers(courierList);
      setDeliveries(deliveryList);
      setFinanceSummary(summary);
    } catch (error) {
      setErrorMessage((error as Error).message);
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    if (isAuthLoading || !isAdmin) return;
    void Promise.resolve().then(refreshProfiles);
  }, [isAdmin, isAuthLoading, refreshProfiles]);

  useEffect(() => {
    if (!socket || !isAdmin) return;
    const refreshAdminData = () => {
      void refreshProfiles();
    };
    socket.on('order.created', refreshAdminData);
    socket.on('order.updated', refreshAdminData);
    socket.on('delivery.updated', refreshAdminData);
    return () => {
      socket.off('order.created', refreshAdminData);
      socket.off('order.updated', refreshAdminData);
      socket.off('delivery.updated', refreshAdminData);
    };
  }, [isAdmin, refreshProfiles, socket]);

  const saveCommissionSettings = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSavingCommission(true);
    setErrorMessage('');
    setMessage('');
    try {
      const settings = await api.admin.updateCommissionSettings(Number(commissionRatePercent));
      setCommissionRatePercent(String(settings.commissionRatePercent));
      setMessage('Taux de commission mis à jour pour les nouvelles commandes.');
    } catch (error) {
      setErrorMessage((error as Error).message);
    } finally {
      setIsSavingCommission(false);
    }
  };

  const createCourier = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsCreatingCourier(true);
    setErrorMessage('');
    setMessage('');
    try {
      const created = await api.admin.createCourier(newCourier);
      setCouriers((current) => [...current, created].sort((a, b) => a.fullName.localeCompare(b.fullName)));
      setNewCourier({ fullName: '', email: '', phoneNumber: '', password: '', companyName: '', vehicleType: '', plateNumber: '', operatingArea: '' });
      setMessage('Compte livreur créé et prêt à recevoir des affectations.');
    } catch (error) {
      setErrorMessage((error as Error).message);
    } finally {
      setIsCreatingCourier(false);
    }
  };

  const toggleCourierAvailability = async (courier: CourierAccount) => {
    setUpdatingCourierId(courier.id);
    setErrorMessage('');
    setMessage('');
    try {
      const updated = await api.admin.updateCourierAvailability(courier.id, !courier.isAvailable);
      setCouriers((current) => current.map((item) => item.id === courier.id ? { ...item, isAvailable: updated.isAvailable } : item));
      setMessage(updated.isAvailable ? 'Livreur disponible pour les affectations.' : 'Livreur marqué indisponible.');
    } catch (error) {
      setErrorMessage((error as Error).message);
    } finally {
      setUpdatingCourierId(null);
    }
  };

  const assignCourier = async (delivery: DeliveryOperation) => {
    const personnelId = selectedCourierByDelivery[delivery.id];
    if (!personnelId) {
      setErrorMessage('Sélectionnez un livreur disponible avant l’affectation.');
      return;
    }
    setAssigningDeliveryId(delivery.id);
    setErrorMessage('');
    setMessage('');
    try {
      await api.deliveries.assign(delivery.id, personnelId);
      setMessage(`Livreur affecté à la commande ${delivery.orderNumber}.`);
      await refreshProfiles();
    } catch (error) {
      setErrorMessage((error as Error).message);
    } finally {
      setAssigningDeliveryId(null);
    }
  };

  const confirmPlatformDeposit = async (delivery: DeliveryOperation) => {
    if (delivery.collectedAmountCdf === null || delivery.collectedAmountCdf === undefined) {
      setErrorMessage('Aucun montant de collecte n’est enregistré pour cette livraison.');
      return;
    }
    setConfirmingDepositId(delivery.id);
    setErrorMessage('');
    setMessage('');
    try {
      await api.deliveries.confirmPlatformDeposit(delivery.id, delivery.collectedAmountCdf);
      setMessage(`Remise de ${formatCdfPrice(delivery.collectedAmountCdf)} confirmée pour ${delivery.orderNumber}.`);
      await refreshProfiles();
    } catch (error) {
      setErrorMessage((error as Error).message);
    } finally {
      setConfirmingDepositId(null);
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
  const deliveryChartData = [
    { label: 'À affecter', value: deliveries.filter((delivery) => delivery.deliveryStatus === 'PENDING').length, tone: 'amber' as const },
    { label: 'Affectées', value: deliveries.filter((delivery) => delivery.deliveryStatus === 'ASSIGNED').length, tone: 'sky' as const },
    {
      label: 'En cours',
      value: deliveries.filter((delivery) => ['PICKED_UP', 'IN_TRANSIT', 'ARRIVED'].includes(delivery.deliveryStatus)).length,
      tone: 'blue' as const,
    },
    { label: 'Livrées', value: deliveries.filter((delivery) => delivery.deliveryStatus === 'DELIVERED').length, tone: 'emerald' as const },
    {
      label: 'Incidents',
      value: deliveries.filter((delivery) => ['FAILED', 'CANCELLED'].includes(delivery.deliveryStatus)).length,
      tone: 'rose' as const,
    },
  ];
  const financeChartData = financeSummary ? [
    { label: 'Volume brut', value: financeSummary.grossMarketplaceVolumeCdf, tone: 'sky' as const },
    { label: 'Commission AgroConnect', value: financeSummary.agroConnectCommissionCdf, tone: 'emerald' as const },
    { label: 'Revenus vendeurs', value: financeSummary.sellerEarningsCdf, tone: 'violet' as const },
  ] : [];

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

        <section aria-label="Graphiques de performance" className="grid gap-5 xl:grid-cols-2">
          <DashboardBarChart
            title="État des livraisons"
            description="Répartition des missions selon leur statut actuel."
            data={deliveryChartData}
            emptyMessage="Les livraisons apparaîtront ici dès les premières commandes."
          />
          <DashboardBarChart
            title="Volume financier cumulé"
            description="Répartition des montants des commandes et des revenus associés, en CDF."
            data={financeChartData}
            formatValue={formatCdfPrice}
            emptyMessage="Les données financières ne sont pas disponibles pour le moment."
          />
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

        <section aria-label="Suivi financier des commandes" className="space-y-4">
          <div>
            <h2 className="text-xl font-black text-stone-900">Collectes & règlements</h2>
            <p className="mt-1 text-sm text-stone-500">Les montants sont collectés par les livreurs et rapprochés manuellement à leur remise à AgroConnect.</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {[
              { label: 'Volume des commandes', value: financeSummary?.grossMarketplaceVolumeCdf ?? 0, tone: 'bg-sky-50 text-sky-900' },
              { label: 'Commission AgroConnect', value: financeSummary?.agroConnectCommissionCdf ?? 0, tone: 'bg-emerald-50 text-emerald-900' },
              { label: 'Fonds reçus', value: financeSummary?.platformReceivedCdf ?? 0, tone: 'bg-violet-50 text-violet-900' },
              { label: 'À remettre à AgroConnect', value: financeSummary?.awaitingPlatformDepositCdf ?? 0, tone: 'bg-amber-50 text-amber-900' },
            ].map((item) => (
              <article key={item.label} className={`rounded-2xl border border-stone-200 p-4 ${item.tone}`}>
                <p className="text-[10px] font-bold uppercase tracking-wide">{item.label}</p>
                <p className="mt-2 text-xl font-black">{formatCdfPrice(item.value)}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
          <div className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm sm:p-7">
            <h2 className="text-lg font-bold text-stone-900">Commission des nouvelles commandes</h2>
            <p className="mt-1 text-sm text-stone-500">Le taux initial est de 10 %. Une modification s’applique uniquement aux commandes créées ensuite.</p>
            <form onSubmit={(event) => void saveCommissionSettings(event)} className="mt-5 space-y-4">
              <label className="block text-xs font-bold text-stone-700">
                Taux de commission (%)
                <input
                  type="number"
                  min="0"
                  max="99.99"
                  step="0.01"
                  required
                  value={commissionRatePercent}
                  onChange={(event) => setCommissionRatePercent(event.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-sm font-medium"
                />
              </label>
              <Button type="submit" variant="primary" size="sm" isLoading={isSavingCommission}>Enregistrer le taux</Button>
            </form>
          </div>

          <div className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm sm:p-7">
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-50 text-sky-800">
                <IconTruck className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <h2 className="text-lg font-bold text-stone-900">Créer un compte livreur</h2>
                <p className="mt-1 text-sm text-stone-500">Les comptes sont créés et gérés par l’administration.</p>
              </div>
            </div>
            <form onSubmit={(event) => void createCourier(event)} className="mt-5 grid gap-3 sm:grid-cols-2">
              <label className="text-xs font-bold text-stone-700">
                Nom complet *
                <input required minLength={2} value={newCourier.fullName} onChange={(event) => setNewCourier({ ...newCourier, fullName: event.target.value })} className="mt-1.5 w-full rounded-xl border border-stone-300 px-3 py-2.5 text-sm" />
              </label>
              <label className="text-xs font-bold text-stone-700">
                Email de connexion *
                <input type="email" required value={newCourier.email} onChange={(event) => setNewCourier({ ...newCourier, email: event.target.value })} className="mt-1.5 w-full rounded-xl border border-stone-300 px-3 py-2.5 text-sm" />
              </label>
              <label className="text-xs font-bold text-stone-700">
                Téléphone RDC *
                <input type="tel" required pattern="(\+243|0)[0-9]{9}" placeholder="+243..." value={newCourier.phoneNumber} onChange={(event) => setNewCourier({ ...newCourier, phoneNumber: event.target.value })} className="mt-1.5 w-full rounded-xl border border-stone-300 px-3 py-2.5 text-sm" />
              </label>
              <label className="text-xs font-bold text-stone-700">
                Mot de passe provisoire *
                <input type="password" required minLength={8} autoComplete="new-password" value={newCourier.password} onChange={(event) => setNewCourier({ ...newCourier, password: event.target.value })} className="mt-1.5 w-full rounded-xl border border-stone-300 px-3 py-2.5 text-sm" />
              </label>
              <label className="text-xs font-bold text-stone-700 sm:col-span-2">
                Zone d’activité *
                <input required minLength={2} placeholder="Ex. Kinshasa · Gombe, Limete" value={newCourier.operatingArea} onChange={(event) => setNewCourier({ ...newCourier, operatingArea: event.target.value })} className="mt-1.5 w-full rounded-xl border border-stone-300 px-3 py-2.5 text-sm" />
              </label>
              <label className="text-xs font-bold text-stone-700">
                Organisation (facultatif)
                <input value={newCourier.companyName} onChange={(event) => setNewCourier({ ...newCourier, companyName: event.target.value })} className="mt-1.5 w-full rounded-xl border border-stone-300 px-3 py-2.5 text-sm" />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="text-xs font-bold text-stone-700">
                  Véhicule
                  <input value={newCourier.vehicleType} onChange={(event) => setNewCourier({ ...newCourier, vehicleType: event.target.value })} className="mt-1.5 w-full rounded-xl border border-stone-300 px-3 py-2.5 text-sm" />
                </label>
                <label className="text-xs font-bold text-stone-700">
                  Plaque
                  <input value={newCourier.plateNumber} onChange={(event) => setNewCourier({ ...newCourier, plateNumber: event.target.value })} className="mt-1.5 w-full rounded-xl border border-stone-300 px-3 py-2.5 text-sm" />
                </label>
              </div>
              <div className="sm:col-span-2">
                <Button type="submit" variant="primary" size="sm" isLoading={isCreatingCourier}>Créer le compte livreur</Button>
              </div>
            </form>
          </div>
        </section>

        <section aria-labelledby="courier-list-title" className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm sm:p-7">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 id="courier-list-title" className="text-lg font-bold text-stone-900">Livreurs gérés</h2>
              <p className="mt-1 text-sm text-stone-500">{couriers.length} compte(s) · disponibilité modifiable à tout moment</p>
            </div>
            <IconTruck className="h-6 w-6 text-sky-800" aria-hidden="true" />
          </div>
          {couriers.length ? (
            <div className="grid gap-3 md:grid-cols-2">
              {couriers.map((courier) => (
                <article key={courier.id} className="flex flex-col gap-3 rounded-2xl border border-stone-200 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-bold text-stone-900">{courier.fullName}</p>
                    <p className="mt-1 text-xs text-stone-500">{courier.email} · {courier.phoneNumber}</p>
                    <p className="mt-1 text-xs text-stone-500">{courier.operatingArea}{courier.vehicleType ? ` · ${courier.vehicleType}` : ''}{courier.plateNumber ? ` · ${courier.plateNumber}` : ''}</p>
                    <p className="mt-2 text-[11px] font-semibold text-stone-600">{courier.activeDeliveriesCount} livraison(s) active(s)</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void toggleCourierAvailability(courier)}
                    disabled={updatingCourierId === courier.id || !courier.isActive}
                    className={`rounded-xl px-3 py-2 text-xs font-bold disabled:opacity-50 ${courier.isAvailable ? 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'}`}
                  >
                    {updatingCourierId === courier.id ? 'Mise à jour…' : courier.isAvailable ? 'Disponible · suspendre' : 'Indisponible · activer'}
                  </button>
                </article>
              ))}
            </div>
          ) : <p className="rounded-xl bg-stone-50 p-5 text-sm text-stone-500">Aucun compte livreur. Créez-en un ci-dessus.</p>}
        </section>

        <section aria-labelledby="delivery-operations-title" className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm sm:p-7">
          <div className="mb-5">
            <h2 id="delivery-operations-title" className="text-xl font-bold text-stone-900">Dispatch & remise des fonds</h2>
            <p className="mt-1 text-sm text-stone-500">Affectez les commandes prêtes, puis rapprochez le montant exact remis par le livreur.</p>
          </div>
          {deliveries.length ? (
            <div className="space-y-3">
              {deliveries.map((delivery) => {
                const canAssign = delivery.orderStatus === 'READY_FOR_PICKUP' && delivery.deliveryStatus === 'PENDING';
                const needsDeposit = delivery.deliveryStatus === 'DELIVERED' && !delivery.platformDepositReceivedAt;
                return (
                  <article key={delivery.id} className="rounded-2xl border border-stone-200 p-4 sm:p-5">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-bold text-stone-900">{delivery.orderNumber} · {delivery.subOrderNumber}</h3>
                          <span className="rounded-full bg-stone-100 px-2.5 py-1 text-[10px] font-bold text-stone-700">{delivery.orderStatus.replace(/_/g, ' ')}</span>
                          <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${delivery.deliveryStatus === 'DELIVERED' ? 'bg-emerald-100 text-emerald-800' : 'bg-sky-100 text-sky-900'}`}>{delivery.deliveryStatus.replace(/_/g, ' ')}</span>
                        </div>
                        <p className="mt-1 text-xs text-stone-600">{delivery.sellerName} → {delivery.recipientName} · {delivery.dropoffCity}</p>
                        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-stone-500">
                          <span>Total à collecter : <strong className="text-stone-800">{formatCdfPrice(delivery.amountDueCdf)}</strong></span>
                          <span>Commission : {formatCdfPrice(delivery.commissionAmountCdf)} ({delivery.commissionRate} %)</span>
                          <span>Net vendeur : {formatCdfPrice(delivery.sellerEarningsCdf)}</span>
                          {delivery.courierName && <span>Livreur : {delivery.courierName} · {delivery.courierPhone}</span>}
                          {delivery.collectedAmountCdf !== null && delivery.collectedAmountCdf !== undefined && (
                            <span>Collecté : {formatCdfPrice(delivery.collectedAmountCdf)} ({delivery.collectionMethod === 'CASH' ? 'espèces' : 'Mobile Money direct'})</span>
                          )}
                        </div>
                      </div>
                      {canAssign ? (
                        <div className="flex w-full flex-col gap-2 sm:flex-row lg:w-auto">
                          <select
                            aria-label={`Livreur pour ${delivery.orderNumber}`}
                            value={selectedCourierByDelivery[delivery.id] ?? ''}
                            onChange={(event) => setSelectedCourierByDelivery((current) => ({ ...current, [delivery.id]: event.target.value }))}
                            className="min-w-52 rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-xs"
                          >
                            <option value="">Choisir un livreur disponible</option>
                            {couriers.filter((courier) => courier.isActive && courier.isAvailable && courier.status === 'VERIFIED').map((courier) => (
                              <option key={courier.id} value={courier.id}>{courier.fullName} · {courier.operatingArea}</option>
                            ))}
                          </select>
                          <Button variant="primary" size="sm" isLoading={assigningDeliveryId === delivery.id} onClick={() => void assignCourier(delivery)}>
                            Affecter
                          </Button>
                        </div>
                      ) : needsDeposit ? (
                        <Button variant="primary" size="sm" isLoading={confirmingDepositId === delivery.id} onClick={() => void confirmPlatformDeposit(delivery)}>
                          Confirmer la remise
                        </Button>
                      ) : delivery.platformDepositReceivedAt ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-800">
                          <IconCheck className="h-4 w-4" aria-hidden="true" /> Fonds reçus · {formatCdfPrice(delivery.platformDepositAmountCdf ?? 0)}
                        </span>
                      ) : null}
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <p className="rounded-2xl border border-dashed border-stone-300 bg-stone-50 p-8 text-center text-sm text-stone-500">Aucune commande à affecter ou à rapprocher.</p>
          )}
        </section>

      </main>
    </div>
  );
}
