'use client';

import React, { useState, useEffect, useCallback, startTransition } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../context/AuthContext';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { DashboardBarChart } from '../../../components/dashboard/DashboardBarChart';
import { formatCdfPrice } from '../../../utils/format';
import {
  IconBasket,
  IconCheck,
  IconPlus,
  IconPlant,
  IconShieldCheck,
  IconShoppingBag,
  IconTrash,
} from '../../../components/ui/Icons';
import {
  SellerOfferItem,
  SubOrder,
  StockMovement,
  ProductCatalogItem,
  SubOrderStatus,
  StockMovementType,
} from '../../../types';
import { api } from '../../../services/api';
import { DRC_PROVINCES } from '../../../constants/drc';
import { useRealtime } from '../../../context/RealtimeContext';

const orderStatusLabels: Record<SubOrderStatus, string> = {
  PENDING: 'À confirmer',
  CONFIRMED: 'Confirmée',
  PREPARING: 'En préparation',
  READY_FOR_PICKUP: 'Prête à l’enlèvement',
  IN_DELIVERY: 'En cours d’acheminement',
  DELIVERED: 'Terminée',
  REJECTED: 'Refusée',
  CANCELLED: 'Annulée',
};

const orderStatusClasses: Record<SubOrderStatus, string> = {
  PENDING: 'bg-amber-100 text-amber-900',
  CONFIRMED: 'bg-sky-100 text-sky-800',
  PREPARING: 'bg-orange-100 text-orange-800',
  READY_FOR_PICKUP: 'bg-emerald-100 text-emerald-800',
  IN_DELIVERY: 'bg-blue-100 text-blue-800',
  DELIVERED: 'bg-stone-100 text-stone-700',
  REJECTED: 'bg-red-100 text-red-800',
  CANCELLED: 'bg-stone-100 text-stone-600',
};

const nextOrderActions: Partial<Record<SubOrderStatus, { status: SubOrderStatus; label: string }>> = {
  PENDING: { status: 'CONFIRMED', label: 'Confirmer la commande' },
  CONFIRMED: { status: 'PREPARING', label: 'Démarrer la préparation' },
  PREPARING: { status: 'READY_FOR_PICKUP', label: 'Marquer prête à l’enlèvement' },
};

const verificationLabels: Record<string, string> = {
  PENDING: 'Vérification en attente',
  UNDER_REVIEW: 'Profil en cours de vérification',
  VERIFIED: 'Profil vérifié',
  REJECTED: 'Profil refusé',
};

function formatOrderDate(value?: string | null): string | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? null
    : date.toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' });
}

export default function SellerDashboardPage() {
  const socket = useRealtime();
  const { user, isLoading: isAuthLoading, isSeller } = useAuth();
  const router = useRouter();
  const sellerId = user?.sellerId;
  const [sellerVerificationStatus, setSellerVerificationStatus] = useState<string>();
  const [activeTab, setActiveTab] = useState<
    'overview' | 'offers' | 'stock' | 'orders' | 'new-offer'
  >('overview');

  const [offers, setOffers] = useState<SellerOfferItem[]>([]);
  const [orders, setOrders] = useState<SubOrder[]>([]);
  const [ordersError, setOrdersError] = useState('');
  const [sellerFinancials, setSellerFinancials] = useState<Awaited<ReturnType<typeof api.finance.getSellerFinancials>> | null>(null);
  const [financialsError, setFinancialsError] = useState('');
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [catalogProducts, setCatalogProducts] = useState<ProductCatalogItem[]>([]);
  const [inventoryError, setInventoryError] = useState('');
  const [pageError, setPageError] = useState('');
  const [hasLoadedData, setHasLoadedData] = useState(false);
  const [profilePhone, setProfilePhone] = useState(user?.phoneNumber ?? '');
  const [isSavingPhone, setIsSavingPhone] = useState(false);

  const [notification, setNotification] = useState<string>('');
  const [notificationType, setNotificationType] = useState<'success' | 'error'>('success');
  const [updatingSubOrderId, setUpdatingSubOrderId] = useState<string | null>(null);
  const [confirmingPayoutId, setConfirmingPayoutId] = useState<string | null>(null);

  // Formulaire Mouvement de stock
  const [mvtOfferId, setMvtOfferId] = useState<string>('');
  const [mvtQuantity, setMvtQuantity] = useState<number>(0);
  const [mvtType, setMvtType] = useState<StockMovementType>('RESTOCK');
  const [mvtDirection, setMvtDirection] = useState<'IN' | 'OUT'>('IN');
  const [mvtNotes, setMvtNotes] = useState<string>('');
  const [isSubmittingMvt, setIsSubmittingMvt] = useState(false);

  // Formulaire Nouvelle Offre
  const [newProductName, setNewProductName] = useState('');
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newImageFile, setNewImageFile] = useState<File | null>(null);
  const [imageInputKey, setImageInputKey] = useState(0);
  const [newStock, setNewStock] = useState<number>(0);
  const [newUnit, setNewUnit] = useState<string>('');
  const [newRetailCdf, setNewRetailCdf] = useState<number>(0);
  const [newWholesaleCdf, setNewWholesaleCdf] = useState<number>(0);
  const [newWholesaleMinQty, setNewWholesaleMinQty] = useState<number>(0);
  const [newProvince, setNewProvince] = useState<string>('');
  const [newCity, setNewCity] = useState<string>('');
  const [newGrade, setNewGrade] = useState<string>('');
  const [newIsFeatured, setNewIsFeatured] = useState(false);
  const [isCreatingOffer, setIsCreatingOffer] = useState(false);
  const [updatingFeaturedId, setUpdatingFeaturedId] = useState<string | null>(null);
  const [isDeletingOfferId, setIsDeletingOfferId] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthLoading && (!user || !isSeller || !sellerId)) {
      router.replace('/connexion?redirect=%2Fvendeur%2Fdashboard');
    }
  }, [isAuthLoading, isSeller, router, sellerId, user]);

  // Chargement des données du vendeur
  const loadSellerData = useCallback(async () => {
    if (!sellerId) {
      return;
    }
    setPageError('');
    try {
      const [offersList, ordersList, invData, prods, sellerProfile] = await Promise.all([
        api.offers.list({ sellerId }),
        api.orders.getBySeller(sellerId)
          .then((result) => {
            setOrdersError('');
            return result;
          })
          .catch((error: unknown) => {
            setOrdersError(error instanceof Error ? error.message : 'Impossible de charger les commandes.');
            return [] as SubOrder[];
          }),
        api.inventory.getBySeller(sellerId).catch((error: unknown) => {
          setInventoryError(error instanceof Error ? error.message : 'Impossible de charger le stock.');
          return null;
        }),
        api.products.list(),
        api.sellers.getById(sellerId),
        api.finance.getSellerFinancials(sellerId)
          .then((result) => {
            setSellerFinancials(result);
            setFinancialsError('');
            return result;
          })
          .catch((error: unknown) => {
            setSellerFinancials(null);
            setFinancialsError(error instanceof Error ? error.message : 'Impossible de charger le relevé des règlements.');
            return null;
          }),
      ]);

      setOffers(offersList || []);
      setOrders(ordersList || []);
      if (invData) {
        setMovements(invData.movementsLog);
        setInventoryError('');
      }
      if (prods) setCatalogProducts(prods);
      if (sellerProfile) setSellerVerificationStatus(sellerProfile.verificationStatus);
      if (offersList?.length) {
        setMvtOfferId((current) => current || offersList[0]!.id);
      }
    } catch (error) {
      setPageError(error instanceof Error ? error.message : 'Impossible de charger les données vendeur.');
    } finally {
      setHasLoadedData(true);
    }
  }, [sellerId]);

  useEffect(() => {
    if (user?.phoneNumber) {
      startTransition(() => {
        setProfilePhone(user.phoneNumber);
      });
    }
  }, [user?.phoneNumber]);

  useEffect(() => {
    startTransition(() => {
      void loadSellerData();
    });
  }, [loadSellerData]);

  useEffect(() => {
    if (!socket || !sellerId) return;
    const refreshSellerData = () => {
      void loadSellerData();
    };
    socket.on('order.created', refreshSellerData);
    socket.on('order.updated', refreshSellerData);
    socket.on('delivery.updated', refreshSellerData);
    socket.on('inventory.updated', refreshSellerData);
    return () => {
      socket.off('order.created', refreshSellerData);
      socket.off('order.updated', refreshSellerData);
      socket.off('delivery.updated', refreshSellerData);
      socket.off('inventory.updated', refreshSellerData);
    };
  }, [loadSellerData, sellerId, socket]);

  const notify = (msg: string, type: 'success' | 'error' = 'success') => {
    setNotification(msg);
    setNotificationType(type);
    setTimeout(() => setNotification(''), 4000);
  };

  // Traiter un mouvement de stock
  const handleStockMovement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mvtOfferId) return;

    setIsSubmittingMvt(true);
    try {
      if (!Number.isFinite(mvtQuantity) || mvtQuantity <= 0) {
        notify('Saisissez une quantité supérieure à zéro.', 'error');
        return;
      }
      const change =
        mvtType === 'SPOILAGE_LOSS' || (mvtType === 'MANUAL_ADJUSTMENT' && mvtDirection === 'OUT')
          ? -Math.abs(mvtQuantity)
          : Math.abs(mvtQuantity);
      await api.inventory.recordMovement({
        offerId: mvtOfferId,
        quantityChange: change,
        movementType: mvtType,
        notes: mvtNotes,
      });

      notify('Mouvement de stock enregistré avec audit complet.');
      setMvtQuantity(0);
      setMvtNotes('');
      await loadSellerData();
    } catch (err) {
      notify(`Erreur : ${(err as Error).message}`, 'error');
    } finally {
      setIsSubmittingMvt(false);
    }
  };

  // Mettre à jour le statut d'une sous-commande
  const handleUpdateOrderStatus = async (subOrderId: string, newStatus: SubOrderStatus) => {
    setUpdatingSubOrderId(subOrderId);
    try {
      await api.orders.updateSubOrderStatus(subOrderId, newStatus);
      notify(`Commande mise à jour : ${orderStatusLabels[newStatus]}.`);
      await loadSellerData();
    } catch (err) {
      notify(`Erreur : ${(err as Error).message}`, 'error');
    } finally {
      setUpdatingSubOrderId(null);
    }
  };

  // Créer une nouvelle offre commerciale
  const handleCreateOffer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (sellerVerificationStatus !== 'VERIFIED') {
      notify('Votre profil vendeur doit être vérifié avant de publier une offre.', 'error');
      return;
    }
    if (!newImageFile) {
      notify('Sélectionnez une photo depuis votre appareil avant de publier.', 'error');
      return;
    }
    if (!newProvince || !DRC_PROVINCES.some((province) => province === newProvince)) {
      notify('Sélectionnez une province de récolte valide en RDC.', 'error');
      return;
    }
    if (!Number.isFinite(newRetailCdf) || newRetailCdf <= 0) {
      notify('Saisissez un prix de détail supérieur à zéro en CDF.', 'error');
      return;
    }
    const selectedProduct = catalogProducts.find(
      (product) => product.name.toLocaleLowerCase() === newProductName.trim().toLocaleLowerCase()
    );
    if (!newProductName.trim() || (!selectedProduct && !newCategoryName.trim())) {
      notify('Saisissez un nom de produit et sa catégorie pour créer une nouvelle fiche.', 'error');
      return;
    }
    setIsCreatingOffer(true);

    try {
      const imageUrl = newImageFile ? await api.offers.uploadImage(newImageFile) : undefined;
      await api.offers.create({
        productId: selectedProduct?.id,
        productName: selectedProduct ? undefined : newProductName.trim(),
        categoryName: selectedProduct ? undefined : newCategoryName.trim(),
        imageUrl,
        stockQuantity: newStock,
        unit: newUnit,
        retailPriceCdf: newRetailCdf,
        retailMinQuantity: 1,
        wholesalePriceCdf: newWholesaleCdf,
        wholesaleMinQuantity: newWholesaleMinQty,
        originProvince: newProvince,
        originCity: newCity,
        qualityGrade: newGrade,
        servicesOffered: [],
        isFeatured: newIsFeatured,
      });

      notify('Nouvelle offre publiée avec succès au catalogue AgroConnect.');
      setActiveTab('offers');
      setNewImageFile(null);
      setNewIsFeatured(false);
      setImageInputKey((current) => current + 1);
      await loadSellerData();
    } catch (err) {
      notify(`Erreur lors de la création de l'offre : ${(err as Error).message}`, 'error');
    } finally {
      setIsCreatingOffer(false);
    }
  };

  const handleSaveSellerPhone = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!sellerId) return;
    setIsSavingPhone(true);
    try {
      await api.sellers.updateProfile(sellerId, { phoneNumber: profilePhone.trim() });
      notify('Coordonnée de règlement externe mise à jour.');
    } catch (error) {
      notify(`Erreur : ${(error as Error).message}`, 'error');
    } finally {
      setIsSavingPhone(false);
    }
  };

  const handleConfirmPayout = async (subOrderId: string) => {
    setConfirmingPayoutId(subOrderId);
    try {
      await api.orders.confirmSellerPayout(subOrderId);
      notify('Réception du règlement confirmée.');
      await loadSellerData();
    } catch (error) {
      notify(`Confirmation impossible : ${(error as Error).message}`, 'error');
    } finally {
      setConfirmingPayoutId(null);
    }
  };

  const handleDeleteOffer = async (offer: SellerOfferItem) => {
    const confirmed = window.confirm(
      `Supprimer l’offre « ${offer.productName} » du catalogue ? Elle ne sera plus visible par les acheteurs.`
    );
    if (!confirmed) return;

    setIsDeletingOfferId(offer.id);
    try {
      await api.offers.remove(offer.id);
      setOffers((current) => current.filter((item) => item.id !== offer.id));
      if (mvtOfferId === offer.id) setMvtOfferId('');
      notify('Offre supprimée du catalogue.');
    } catch (error) {
      notify(`Erreur lors de la suppression : ${(error as Error).message}`, 'error');
    } finally {
      setIsDeletingOfferId(null);
    }
  };

  const handleToggleFeatured = async (offer: SellerOfferItem) => {
    setUpdatingFeaturedId(offer.id);
    try {
      await api.offers.update(offer.id, { isFeatured: !offer.isFeatured });
      notify(
        offer.isFeatured
          ? 'Mise en avant retirée de cette offre.'
          : 'Offre mise à la une, sans paiement en ligne.'
      );
      await loadSellerData();
    } catch (error) {
      notify(`Erreur lors de la mise à jour : ${(error as Error).message}`, 'error');
    } finally {
      setUpdatingFeaturedId(null);
    }
  };

  const availableOfferCount = offers.filter((offer) => offer.isAvailable && offer.stockQuantity > 0).length;
  const pendingOrderCount = orders.filter((order) => order.status === 'PENDING').length;
  const preparingOrderCount = orders.filter((order) => order.status === 'PREPARING').length;
  const readyOrderCount = orders.filter((order) => order.status === 'READY_FOR_PICKUP').length;
  const totalPayoutCdf = orders.reduce((sum, o) => sum + (o.payoutAmountCdf ?? 0), 0);
  const payoutRecords = sellerFinancials?.records ?? [];
  const payoutsAwaitingDeposit = payoutRecords.filter(
    (record) => record.payoutStatus === 'PENDING' && !record.platformDepositReceivedAt
  );
  const payoutsAwaitingConfirmation = payoutRecords.filter(
    (record) => record.payoutStatus === 'APPROVED' && record.platformDepositReceivedAt
  );
  const payoutsConfirmed = payoutRecords.filter((record) => record.payoutStatus === 'COMPLETED');
  const awaitingDepositCdf = payoutsAwaitingDeposit.reduce((sum, record) => sum + record.sellerEarningsCdf, 0);
  const awaitingConfirmationCdf = payoutsAwaitingConfirmation.reduce((sum, record) => sum + record.sellerEarningsCdf, 0);
  const confirmedPayoutCdf = payoutsConfirmed.reduce((sum, record) => sum + record.sellerEarningsCdf, 0);
  const activeOrders = orders.filter((order) => !['CANCELLED', 'REJECTED'].includes(order.status));
  const orderChartData = [
    { label: 'À confirmer', value: orders.filter((order) => order.status === 'PENDING').length, tone: 'amber' as const },
    {
      label: 'En préparation',
      value: orders.filter((order) => ['CONFIRMED', 'PREPARING'].includes(order.status)).length,
      tone: 'sky' as const,
    },
    {
      label: 'Prêtes ou en livraison',
      value: orders.filter((order) => ['READY_FOR_PICKUP', 'IN_DELIVERY'].includes(order.status)).length,
      tone: 'blue' as const,
    },
    { label: 'Livrées', value: orders.filter((order) => order.status === 'DELIVERED').length, tone: 'emerald' as const },
    {
      label: 'Annulées ou refusées',
      value: orders.filter((order) => ['CANCELLED', 'REJECTED'].includes(order.status)).length,
      tone: 'rose' as const,
    },
  ];
  const sellerFinanceChartData = [
    {
      label: 'Ventes brutes',
      value: activeOrders.reduce((sum, order) => sum + order.subtotalCdf, 0),
      tone: 'sky' as const,
    },
    {
      label: 'Commission AgroConnect',
      value: activeOrders.reduce((sum, order) => sum + order.commissionAmountCdf, 0),
      tone: 'amber' as const,
    },
    {
      label: 'Revenu net vendeur',
      value: activeOrders.reduce((sum, order) => sum + order.payoutAmountCdf, 0),
      tone: 'emerald' as const,
    },
  ];

  if (isAuthLoading || !user || !isSeller || !sellerId) {
    return (
      <main className="flex min-h-[60vh] items-center justify-center bg-stone-50 px-4">
        <div role="status" className="flex items-center gap-4 rounded-2xl border border-stone-200 bg-white px-6 py-5 shadow-sm">
          <span className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-100 border-t-emerald-800" />
          <span>
            <span className="block text-sm font-bold text-stone-900">Vérification de votre accès</span>
            <span className="mt-1 block text-xs text-stone-500">Ouverture de l’espace vendeur…</span>
          </span>
        </div>
      </main>
    );
  }

  if (!hasLoadedData) {
    return (
      <main className="min-h-screen bg-stone-50 px-4 py-16">
        <div className="mx-auto max-w-7xl animate-pulse space-y-6">
          <div className="h-28 rounded-3xl bg-white" />
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[1, 2, 3, 4].map((item) => <div key={item} className="h-36 rounded-2xl bg-white" />)}
          </div>
          <div className="h-20 rounded-2xl bg-white" />
        </div>
        <p role="status" className="mt-6 text-center text-xs font-medium text-stone-500">Chargement de vos offres et commandes…</p>
      </main>
    );
  }

  return (
    <div className="bg-stone-50 min-h-screen pb-20">
      <PageHeader
        title="Tableau de bord vendeur"
        subtitle="Suivez vos offres, vos stocks et les commandes reçues depuis un seul espace."
        breadcrumbs={[{ label: 'Accueil', href: '/' }, { label: 'Espace Vendeur' }]}
        badge={
          <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-bold ${
            sellerVerificationStatus === 'VERIFIED'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
              : sellerVerificationStatus === 'REJECTED'
                ? 'border-red-200 bg-red-50 text-red-800'
                : 'border-amber-200 bg-amber-50 text-amber-900'
          }`}>
            <IconShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
            {sellerVerificationStatus ? verificationLabels[sellerVerificationStatus] ?? sellerVerificationStatus : 'Profil vendeur'}
          </span>
        }
        actions={sellerVerificationStatus === 'VERIFIED' ? (
          <button
            type="button"
            onClick={() => setActiveTab('new-offer')}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-800 px-4 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-emerald-900"
          >
            <IconPlus className="h-4 w-4" aria-hidden="true" />
            Publier une offre
          </button>
        ) : undefined}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        {sellerVerificationStatus && sellerVerificationStatus !== 'VERIFIED' && (
          <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            {sellerVerificationStatus === 'REJECTED'
              ? 'Votre profil vendeur a été refusé. Contactez l’assistance pour obtenir plus d’informations.'
              : 'Votre profil vendeur est en cours de vérification. La publication d’offres sera disponible après validation.'}
          </div>
        )}
        {pageError && (
          <div role="alert" className="mb-6 flex items-start justify-between gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            <span>Erreur de chargement : {pageError}</span>
            <button type="button" onClick={() => void loadSellerData()} className="shrink-0 font-bold hover:underline">
              Réessayer
            </button>
          </div>
        )}
        {notification && (
          <div
            role={notificationType === 'error' ? 'alert' : 'status'}
            className={`mb-6 flex items-center justify-between rounded-2xl border p-4 text-xs font-bold ${
              notificationType === 'error'
                ? 'border-red-200 bg-red-50 text-red-800'
                : 'border-emerald-200 bg-emerald-50 text-emerald-900'
            }`}
          >
            <span>{notification}</span>
            <button type="button" onClick={() => setNotification('')} className="text-stone-400 hover:text-stone-700">
              Fermer
            </button>
          </div>
        )}

        <nav aria-label="Navigation vendeur" className="mb-8 grid grid-cols-2 gap-2 rounded-2xl border border-stone-200 bg-white p-2 shadow-sm sm:flex sm:flex-wrap">
          {[
            { id: 'overview', label: 'Vue d’ensemble', icon: <IconShieldCheck className="h-4 w-4" aria-hidden="true" /> },
            { id: 'offers', label: 'Mes offres', count: offers.length, icon: <IconPlant className="h-4 w-4" aria-hidden="true" /> },
            { id: 'stock', label: 'Stocks', icon: <IconBasket className="h-4 w-4" aria-hidden="true" /> },
            { id: 'orders', label: 'Commandes', count: orders.length, icon: <IconShoppingBag className="h-4 w-4" aria-hidden="true" /> },
            { id: 'new-offer', label: 'Publier une offre', icon: <IconPlus className="h-4 w-4" aria-hidden="true" />, isPrimary: true },
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                disabled={tab.id === 'new-offer' && sellerVerificationStatus !== 'VERIFIED'}
                aria-current={isActive ? 'page' : undefined}
                className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-xs font-bold transition disabled:cursor-not-allowed disabled:opacity-40 sm:px-4 ${
                  isActive
                    ? 'bg-emerald-800 text-white shadow-sm'
                    : tab.isPrimary
                      ? 'bg-emerald-50 text-emerald-900 hover:bg-emerald-100'
                      : 'text-stone-600 hover:bg-stone-100'
                }`}
              >
                {tab.icon}
                {tab.label}
                {tab.count !== undefined && (
                  <span className={`rounded-full px-1.5 py-0.5 text-[10px] ${isActive ? 'bg-white/15 text-white' : 'bg-stone-100 text-stone-600'}`}>
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {activeTab === 'overview' && (
          <div className="space-y-8">
            <div className="grid gap-5 lg:grid-cols-2">
              <section aria-labelledby="seller-settlement-title" className="rounded-3xl border border-emerald-200 bg-gradient-to-br from-emerald-950 to-emerald-800 p-5 text-white shadow-sm sm:p-7">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 id="seller-settlement-title" className="text-base font-bold">Règlement des ventes</h2>
                    <p className="mt-2 text-xs leading-relaxed text-emerald-100">
                      Le client règle le livreur. Après remise des fonds à AgroConnect, confirmez ici la réception de votre part.
                    </p>
                  </div>
                  <IconCheck className="h-6 w-6 shrink-0 text-emerald-200" aria-hidden="true" />
                </div>
                {financialsError ? (
                  <div role="alert" className="mt-5 rounded-2xl border border-white/20 bg-white/10 p-4 text-xs text-emerald-50">
                    <p>Impossible de charger le relevé des règlements : {financialsError}</p>
                    <button
                      type="button"
                      onClick={() => void loadSellerData()}
                      className="mt-2 font-bold underline underline-offset-2"
                    >
                      Réessayer
                    </button>
                  </div>
                ) : sellerFinancials ? (
                  <>
                    <div className="mt-6 grid gap-3 sm:grid-cols-3">
                      <div className="rounded-2xl border border-white/10 bg-white/10 p-4">
                        <p className="text-[10px] font-bold uppercase tracking-wide text-emerald-100">En attente du dépôt</p>
                        <p className="mt-1 text-lg font-black">{formatCdfPrice(awaitingDepositCdf)}</p>
                        <p className="mt-1 text-[10px] text-emerald-100">{payoutsAwaitingDeposit.length} règlement(s)</p>
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-white/10 p-4">
                        <p className="text-[10px] font-bold uppercase tracking-wide text-emerald-100">À confirmer</p>
                        <p className="mt-1 text-lg font-black">{formatCdfPrice(awaitingConfirmationCdf)}</p>
                        <p className="mt-1 text-[10px] text-emerald-100">{payoutsAwaitingConfirmation.length} règlement(s)</p>
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-white/10 p-4">
                        <p className="text-[10px] font-bold uppercase tracking-wide text-emerald-100">Déjà confirmé</p>
                        <p className="mt-1 text-lg font-black">{formatCdfPrice(confirmedPayoutCdf)}</p>
                        <p className="mt-1 text-[10px] text-emerald-100">{payoutsConfirmed.length} règlement(s)</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveTab('orders')}
                      className="mt-4 text-xs font-bold text-emerald-100 underline underline-offset-2 hover:text-white"
                    >
                      Voir les commandes et confirmer un règlement
                    </button>
                  </>
                ) : (
                  <p role="status" className="mt-5 text-xs text-emerald-100">Chargement du relevé des règlements…</p>
                )}
              </section>

              <section aria-labelledby="seller-phone-title" className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm sm:p-7">
                <h2 id="seller-phone-title" className="text-base font-bold text-stone-900">Coordonnée de règlement externe</h2>
                <p className="mt-1 text-xs leading-relaxed text-stone-500">
                  Utilisée par l’administration pour vous joindre au sujet de votre règlement, effectué hors de l’application.
                </p>
                <form onSubmit={(event) => void handleSaveSellerPhone(event)} className="mt-5 space-y-4">
                  <label className="block text-xs font-bold text-stone-700">
                    Téléphone de contact
                    <input
                      type="tel"
                      value={profilePhone}
                      onChange={(event) => setProfilePhone(event.target.value)}
                      required
                      pattern="(\+243|0)[0-9]{9}"
                      className="mt-1.5 w-full rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-sm"
                    />
                  </label>
                  <Button type="submit" variant="outline" size="sm" isLoading={isSavingPhone}>
                    Enregistrer le numéro
                  </Button>
                </form>
              </section>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {[
                {
                  label: 'Offres actives',
                  value: offers.length.toLocaleString('fr-FR'),
                  detail: 'Visibles au catalogue',
                  icon: <IconPlant className="h-5 w-5" aria-hidden="true" />,
                  tone: 'bg-emerald-50 text-emerald-800',
                },
                {
                  label: 'Offres en stock',
                  value: availableOfferCount.toLocaleString('fr-FR'),
                  detail: 'Offres disponibles à l’achat',
                  icon: <IconBasket className="h-5 w-5" aria-hidden="true" />,
                  tone: 'bg-sky-50 text-sky-800',
                },
                {
                  label: 'Commandes reçues',
                  value: orders.length.toLocaleString('fr-FR'),
                  detail: `${pendingOrderCount} à confirmer`,
                  icon: <IconShoppingBag className="h-5 w-5" aria-hidden="true" />,
                  tone: 'bg-amber-50 text-amber-800',
                },
                {
                  label: 'Montant net des commandes',
                  value: formatCdfPrice(totalPayoutCdf),
                  detail: 'Total des sous-commandes reçues',
                  icon: <IconCheck className="h-5 w-5" aria-hidden="true" />,
                  tone: 'bg-violet-50 text-violet-800',
                },
              ].map((metric) => (
                <article key={metric.label} className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-xs font-bold uppercase tracking-wide text-stone-500">{metric.label}</p>
                    <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${metric.tone}`}>
                      {metric.icon}
                    </span>
                  </div>
                  <p className="mt-3 truncate text-2xl font-black tracking-tight text-stone-900">{metric.value}</p>
                  <p className="mt-1 text-xs text-stone-500">{metric.detail}</p>
                </article>
              ))}
            </div>

            <section aria-label="Graphiques de performance vendeur" className="grid gap-5 xl:grid-cols-2">
              <DashboardBarChart
                title="État des commandes"
                description="Répartition de vos sous-commandes selon leur étape de traitement."
                data={orderChartData}
                emptyMessage="Les commandes reçues apparaîtront ici."
              />
              <DashboardBarChart
                title="Activité commerciale cumulée"
                description="Montants des commandes actives et répartition de la commission, en CDF."
                data={sellerFinanceChartData}
                formatValue={formatCdfPrice}
                emptyMessage="Les ventes apparaîtront ici après vos premières commandes."
              />
            </section>

            <div className="grid gap-6 lg:grid-cols-[1.35fr_0.85fr]">
              <section aria-labelledby="order-overview-title" className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm sm:p-7">
                <div className="mb-5 flex items-start justify-between gap-4">
                  <div>
                    <h2 id="order-overview-title" className="text-base font-bold text-stone-900">Suivi des commandes</h2>
                    <p className="mt-1 text-xs text-stone-500">Vue synthétique de vos sous-commandes.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab('orders')}
                    className="shrink-0 text-xs font-bold text-emerald-800 hover:underline"
                  >
                    Voir tout
                  </button>
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  {[
                    { label: 'À confirmer', value: pendingOrderCount, tone: 'border-amber-200 bg-amber-50 text-amber-900' },
                    { label: 'En préparation', value: preparingOrderCount, tone: 'border-orange-200 bg-orange-50 text-orange-900' },
                    { label: 'Prêtes à l’enlèvement', value: readyOrderCount, tone: 'border-emerald-200 bg-emerald-50 text-emerald-900' },
                  ].map((item) => (
                    <div key={item.label} className={`rounded-2xl border p-4 ${item.tone}`}>
                      <p className="text-2xl font-black">{item.value.toLocaleString('fr-FR')}</p>
                      <p className="mt-1 text-[11px] font-semibold">{item.label}</p>
                    </div>
                  ))}
                </div>
                <p className="mt-5 border-t border-stone-100 pt-4 text-xs leading-relaxed text-stone-500">
                  Mettez à jour le statut de chaque commande au fur et à mesure de sa préparation.
                </p>
              </section>

              <section aria-labelledby="quick-actions-title" className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm sm:p-7">
                <h2 id="quick-actions-title" className="text-base font-bold text-stone-900">Actions rapides</h2>
                <p className="mt-1 text-xs text-stone-500">Accédez directement aux tâches courantes.</p>
                <div className="mt-5 grid gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveTab('new-offer')}
                    disabled={sellerVerificationStatus !== 'VERIFIED'}
                    className="flex items-center justify-between gap-3 rounded-xl bg-emerald-800 px-4 py-3 text-left text-xs font-bold text-white transition hover:bg-emerald-900 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <span className="flex items-center gap-2"><IconPlus className="h-4 w-4" aria-hidden="true" />Publier une offre</span>
                    <span aria-hidden="true">→</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('stock')}
                    className="flex items-center justify-between gap-3 rounded-xl border border-stone-200 px-4 py-3 text-left text-xs font-bold text-stone-700 transition hover:bg-stone-50"
                  >
                    <span className="flex items-center gap-2"><IconBasket className="h-4 w-4 text-emerald-800" aria-hidden="true" />Gérer les stocks</span>
                    <span aria-hidden="true">→</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('orders')}
                    className="flex items-center justify-between gap-3 rounded-xl border border-stone-200 px-4 py-3 text-left text-xs font-bold text-stone-700 transition hover:bg-stone-50"
                  >
                    <span className="flex items-center gap-2"><IconShoppingBag className="h-4 w-4 text-emerald-800" aria-hidden="true" />Consulter les commandes</span>
                    <span aria-hidden="true">→</span>
                  </button>
                </div>
              </section>
            </div>
          </div>
        )}

        {/* TAB 2: MES OFFRES & TARIFS */}
        {activeTab === 'offers' && (
          <div className="space-y-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-bold text-stone-900">Mes offres</h2>
                <p className="mt-1 text-xs text-stone-500">{offers.length} offre(s) visible(s) au catalogue.</p>
              </div>
              <Button
                variant="primary"
                size="sm"
                leftIcon={<IconPlus className="w-4 h-4" />}
                onClick={() => setActiveTab('new-offer')}
                disabled={sellerVerificationStatus !== 'VERIFIED'}
              >
                Nouvelle Offre
              </Button>
            </div>

            {offers.length ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 2xl:grid-cols-3">
                {offers.map((offer) => (
                <article
                  key={offer.id}
                  className="flex h-full flex-col overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm"
                >
                  <div className="flex gap-3 p-4">
                    <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-emerald-50 text-emerald-700">
                      {offer.imageUrl ? (
                        <Image
                          src={offer.imageUrl}
                          alt={offer.productName}
                          fill
                          unoptimized
                          className="object-cover"
                          sizes="80px"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center">
                          <IconPlant className="h-8 w-8" aria-hidden="true" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="mb-1 flex flex-wrap items-center gap-1.5">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                            offer.isAvailable && offer.stockQuantity > 0
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {offer.isAvailable && offer.stockQuantity > 0 ? 'Disponible' : 'Rupture'}
                        </span>
                        {offer.isFeatured && (
                          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                            À la une
                          </span>
                        )}
                      </div>
                      <h4 className="line-clamp-2 text-sm font-bold text-stone-900">{offer.productName}</h4>
                      <p className="mt-1 truncate text-xs text-stone-500">
                        {offer.categoryName} · {offer.originProvince}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 border-y border-stone-100 bg-stone-50/70 px-4 py-3">
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-stone-500">Stock</p>
                      <p className="mt-0.5 text-xs font-bold text-stone-900">{offer.stockQuantity} {offer.unit}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-stone-500">Prix unitaire</p>
                      <p className="mt-0.5 text-xs font-bold text-stone-900">{formatCdfPrice(offer.retailPriceCdf)}</p>
                    </div>
                    {offer.wholesalePriceCdf && (
                      <div className="col-span-2 flex items-center justify-between gap-2">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-800">
                          Prix quantité · dès {offer.wholesaleMinQuantity}
                        </p>
                        <p className="text-xs font-bold text-emerald-800">{formatCdfPrice(offer.wholesalePriceCdf)}</p>
                      </div>
                    )}
                  </div>

                  <div className="mt-auto grid grid-cols-2 gap-2 p-4">
                    <button
                      type="button"
                      onClick={() => void handleToggleFeatured(offer)}
                      disabled={updatingFeaturedId === offer.id}
                      aria-pressed={Boolean(offer.isFeatured)}
                      className={`rounded-xl border px-2 py-2 text-xs font-bold transition disabled:cursor-not-allowed disabled:opacity-50 ${
                        offer.isFeatured
                          ? 'border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100'
                          : 'border-stone-200 bg-white text-stone-700 hover:bg-stone-50'
                      }`}
                    >
                      {updatingFeaturedId === offer.id
                        ? 'Mise à jour…'
                        : offer.isFeatured
                          ? 'Retirer de la une'
                          : 'Mettre à la une'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setMvtOfferId(offer.id);
                        setActiveTab('stock');
                      }}
                      className="rounded-xl bg-stone-100 px-2 py-2 text-xs font-bold text-stone-800 transition hover:bg-stone-200"
                    >
                      Ajuster le stock
                    </button>
                    <Link
                      href={`/produits/${offer.productId}`}
                      className="rounded-xl border border-emerald-200 px-2 py-2 text-center text-xs font-bold text-emerald-800 transition hover:bg-emerald-50"
                    >
                      Voir la fiche
                    </Link>
                    <button
                      type="button"
                      onClick={() => void handleDeleteOffer(offer)}
                      disabled={isDeletingOfferId === offer.id}
                      className="inline-flex items-center justify-center gap-1 rounded-xl border border-red-200 px-2 py-2 text-xs font-bold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <IconTrash className="h-4 w-4" aria-hidden="true" />
                      {isDeletingOfferId === offer.id ? 'Suppression…' : 'Supprimer'}
                    </button>
                  </div>
                </article>
                ))}
              </div>
            ) : (
              <div className="rounded-3xl border border-dashed border-stone-300 bg-white px-6 py-14 text-center shadow-sm">
                <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-800">
                  <IconPlant className="h-7 w-7" aria-hidden="true" />
                </span>
                <h3 className="mt-4 text-base font-bold text-stone-900">Aucune offre publiée</h3>
                <p className="mx-auto mt-1 max-w-md text-sm text-stone-500">
                  Publiez votre première récolte pour la rendre visible aux acheteurs du catalogue.
                </p>
                <Button
                  variant="primary"
                  size="sm"
                  leftIcon={<IconPlus className="h-4 w-4" aria-hidden="true" />}
                  onClick={() => setActiveTab('new-offer')}
                  disabled={sellerVerificationStatus !== 'VERIFIED'}
                  className="mt-5"
                >
                  Nouvelle offre
                </Button>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: STOCKS & MOUVEMENTS */}
        {activeTab === 'stock' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Formulaire d'enregistrement de mouvement */}
            <div className="lg:col-span-5 bg-white p-6 sm:p-8 rounded-3xl border border-stone-200 shadow-xs space-y-5">
              <h3 className="text-base font-bold text-stone-900 border-b border-stone-100 pb-3">
                Enregistrer un Mouvement de Stock
              </h3>

              <form onSubmit={handleStockMovement} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1.5">
                    Sélectionner l&apos;offre commerciale *
                  </label>
                  <select
                    value={mvtOfferId}
                    onChange={(e) => setMvtOfferId(e.target.value)}
                    className="w-full p-2.5 bg-stone-50 border border-stone-300 rounded-xl text-xs font-medium text-stone-800"
                    required
                    disabled={offers.length === 0}
                  >
                    {offers.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.productName} (Actuel : {o.stockQuantity} {o.unit})
                      </option>
                    ))}
                  </select>
                  {offers.length === 0 && (
                    <p className="mt-2 text-xs text-stone-500">Publiez d’abord une offre pour gérer son stock.</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1.5">
                    Type d&apos;opération *
                  </label>
                  <select
                    value={mvtType}
                    onChange={(e) => setMvtType(e.target.value as StockMovementType)}
                    className="w-full p-2.5 bg-stone-50 border border-stone-300 rounded-xl text-xs font-medium text-stone-800"
                  >
                    <option value="RESTOCK">Réapprovisionnement (+ stock)</option>
                    <option value="MANUAL_ADJUSTMENT">Ajustement d&apos;inventaire</option>
                    <option value="SPOILAGE_LOSS">Perte / Avarie constatée (- stock)</option>
                  </select>
                </div>

                {mvtType === 'MANUAL_ADJUSTMENT' && (
                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1.5">
                      Sens de l&apos;ajustement *
                    </label>
                    <select
                      value={mvtDirection}
                      onChange={(e) => setMvtDirection(e.target.value as 'IN' | 'OUT')}
                      className="w-full p-2.5 bg-stone-50 border border-stone-300 rounded-xl text-xs font-medium text-stone-800"
                    >
                      <option value="IN">Ajouter au stock</option>
                      <option value="OUT">Retirer du stock</option>
                    </select>
                  </div>
                )}

                <Input
                  label="Quantité concernée (unités) *"
                  type="number"
                  min={1}
                  step={1}
                  value={mvtQuantity}
                  onChange={(e) => setMvtQuantity(Number(e.target.value))}
                  required
                />

                <Input
                  label="Notes ou référence du bon d&apos;entrée"
                  value={mvtNotes}
                  onChange={(e) => setMvtNotes(e.target.value)}
                  placeholder="ex: Arrivage convoi du Kwilu par camionnette"
                />

                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  className="w-full cursor-pointer"
                  isLoading={isSubmittingMvt}
                  disabled={offers.length === 0 || isSubmittingMvt}
                >
                  Valider le Mouvement de Stock
                </Button>
              </form>
            </div>

            {/* Journal d'audit des mouvements */}
            <div className="min-w-0 lg:col-span-7 bg-white p-6 sm:p-8 rounded-3xl border border-stone-200 shadow-xs space-y-4">
              <h3 className="text-base font-bold text-stone-900 border-b border-stone-100 pb-3">
                Journal d&apos;Audit des Mouvements ({movements.length})
              </h3>

              {inventoryError && (
                <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">
                  Erreur de chargement du stock : {inventoryError}
                </p>
              )}

              <div className="min-w-0 divide-y divide-stone-100">
                {movements.length ? movements.map((m) => (
                  <div key={m.id} className="min-w-0 py-3 first:pt-0 text-xs space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-stone-900">
                        {m.movementType === 'ORDER_RESERVATION'
                          ? 'Réservation Commande'
                          : m.movementType === 'INITIAL_STOCK'
                          ? 'Stock Initial'
                          : m.movementType === 'RESTOCK'
                          ? 'Réapprovisionnement'
                          : m.movementType}
                      </span>
                      <span
                        className={`font-black ${
                          m.quantityChange > 0 ? 'text-emerald-700' : 'text-red-600'
                        }`}
                      >
                        {m.quantityChange > 0 ? `+${m.quantityChange}` : m.quantityChange}
                      </span>
                    </div>

                    <div className="flex flex-col gap-1 text-[11px] text-stone-500 sm:flex-row sm:items-center sm:justify-between">
                      <span className="min-w-0">
                        Avant : {m.previousStock} ; après : {m.newStock}
                      </span>
                      <span className="shrink-0 sm:text-right">{new Date(m.createdAt).toLocaleString('fr-FR')}</span>
                    </div>

                    {m.notes && <p className="text-stone-600 italic text-[11px]">{m.notes}</p>}
                  </div>
                )) : !inventoryError && (
                  <p className="py-6 text-center text-xs text-stone-500">Aucun mouvement de stock enregistré pour le moment.</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: COMMANDES REÇUES */}
        {activeTab === 'orders' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-bold text-stone-900">Commandes reçues</h2>
              <p className="mt-1 text-xs text-stone-500">
                {orders.length} sous-commande(s), dont {pendingOrderCount} à confirmer.
              </p>
            </div>

            {ordersError ? (
              <div role="alert" className="flex items-start justify-between gap-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
                <span>Impossible de charger les commandes : {ordersError}</span>
                <button
                  type="button"
                  onClick={() => void loadSellerData()}
                  className="shrink-0 font-bold hover:underline"
                >
                  Réessayer
                </button>
              </div>
            ) : orders.length > 0 ? (
              <div className="space-y-4">
                {orders.map((sub) => {
                  const nextAction = nextOrderActions[sub.status];
                  const receivedAt = formatOrderDate(sub.createdAt);
                  return (
                    <article
                      key={sub.id}
                      className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm"
                    >
                      <div className="flex flex-col gap-3 border-b border-stone-100 bg-stone-50/70 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-sm font-bold text-stone-900">{sub.subOrderNumber}</h3>
                            <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${orderStatusClasses[sub.status]}`}>
                              {orderStatusLabels[sub.status]}
                            </span>
                          </div>
                          <p className="mt-1 text-xs text-stone-500">
                            {receivedAt ? `Reçue le ${receivedAt}` : 'Date de réception indisponible'}
                          </p>
                        </div>
                        <div className="text-left sm:text-right">
                          <p className="text-[10px] font-bold uppercase tracking-wide text-stone-500">Montant de la commande</p>
                          <p className="mt-0.5 text-base font-black text-emerald-900">{formatCdfPrice(sub.subtotalCdf)}</p>
                        </div>
                      </div>

                      <div className="grid gap-5 px-5 py-5 sm:px-6 md:grid-cols-[1fr_auto] md:items-start">
                        <div className="min-w-0">
                          <p className="text-[10px] font-bold uppercase tracking-wide text-stone-500">Articles commandés</p>
                          {sub.items?.length ? (
                            <ul className="mt-2 space-y-1.5">
                              {sub.items.map((item) => (
                                <li key={item.id} className="flex flex-wrap items-center justify-between gap-2 text-sm text-stone-700">
                                  <span className="font-medium">{item.productName}</span>
                                  <span className="text-xs text-stone-500">Quantité : {item.quantity}</span>
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <p className="mt-2 text-xs text-stone-500">Le détail des articles n’est pas disponible.</p>
                          )}
                        </div>
                        <div className="rounded-xl border border-emerald-100 bg-emerald-50/70 px-4 py-3 md:min-w-52">
                          <p className="text-[10px] font-bold uppercase tracking-wide text-emerald-800">Net vendeur</p>
                          <p className="mt-1 text-base font-black text-emerald-900">{formatCdfPrice(sub.payoutAmountCdf)}</p>
                          <p className="mt-1 text-[10px] text-emerald-800">Après commission de {sub.commissionRate}%</p>
                        </div>
                      </div>

                      <footer className="flex flex-col gap-3 border-t border-stone-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                        <p className="text-xs font-medium text-stone-500">
                          {nextAction
                            ? 'Prochaine étape de préparation'
                            : sub.sellerPayoutStatus === 'COMPLETED'
                              ? `Règlement confirmé${formatOrderDate(sub.sellerConfirmedAt) ? ` le ${formatOrderDate(sub.sellerConfirmedAt)}` : ''}`
                              : sub.sellerPayoutStatus === 'APPROVED' && sub.platformDepositReceivedAt
                                ? 'AgroConnect a reçu les fonds. Confirmez uniquement après avoir reçu votre règlement hors application.'
                                : sub.status === 'DELIVERED'
                                  ? 'En attente de la remise du livreur à AgroConnect.'
                                  : 'Aucune action vendeur requise pour ce statut'}
                        </p>
                        {nextAction ? (
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => void handleUpdateOrderStatus(sub.id, nextAction.status)}
                            isLoading={updatingSubOrderId === sub.id}
                            disabled={updatingSubOrderId !== null && updatingSubOrderId !== sub.id}
                          >
                            {nextAction.label}
                          </Button>
                        ) : sub.sellerPayoutStatus === 'APPROVED' && sub.platformDepositReceivedAt ? (
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => void handleConfirmPayout(sub.id)}
                            isLoading={confirmingPayoutId === sub.id}
                            disabled={confirmingPayoutId !== null && confirmingPayoutId !== sub.id}
                          >
                            Confirmer le règlement reçu
                          </Button>
                        ) : null}
                      </footer>
                    </article>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-3xl border border-dashed border-stone-300 bg-white px-6 py-14 text-center shadow-sm">
                <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-stone-100 text-stone-500">
                  <IconShoppingBag className="h-7 w-7" aria-hidden="true" />
                </span>
                <h3 className="mt-4 text-base font-bold text-stone-900">Aucune commande reçue</h3>
                <p className="mt-1 text-sm text-stone-500">Les nouvelles sous-commandes apparaîtront ici.</p>
              </div>
            )}
          </div>
        )}

        {/* TAB 5: CRÉER UNE NOUVELLE OFFRE */}
        {activeTab === 'new-offer' && (
          <div className="max-w-2xl mx-auto bg-white p-8 rounded-3xl border border-stone-200 shadow-sm space-y-6">
            <h3 className="text-base font-bold text-stone-900 border-b border-stone-100 pb-3">
              Publier une Offre Commerciale au Catalogue
            </h3>

            <form onSubmit={handleCreateOffer} className="space-y-4">
              <div>
                <Input
                  label="Nom du produit *"
                  placeholder="Ex. Manioc doux"
                  list="catalog-products"
                  value={newProductName}
                  onChange={(e) => setNewProductName(e.target.value)}
                  helperText="Choisissez une suggestion ou écrivez un nouveau produit."
                  required
                />
                <datalist id="catalog-products">
                  {catalogProducts.map((p) => (
                    <option key={p.id} value={p.name} />
                  ))}
                </datalist>
              </div>

              {!catalogProducts.some((product) => product.name.toLocaleLowerCase() === newProductName.trim().toLocaleLowerCase()) && (
                <Input
                  label="Catégorie du produit *"
                  placeholder="Ex. Tubercules et racines"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  required
                />
              )}

              <div>
                <label htmlFor="offer-image" className="mb-1.5 block text-xs font-bold text-stone-700">
                  Photo du produit *
                </label>
                <input
                  key={imageInputKey}
                  id="offer-image"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  required
                  onChange={(event) => setNewImageFile(event.target.files?.[0] ?? null)}
                  className="w-full rounded-xl border border-stone-300 bg-white p-2.5 text-xs text-stone-700"
                />
                <p className="mt-1 text-[11px] text-stone-500">JPEG, PNG ou WebP, 5 Mo maximum.</p>
              </div>
              <label className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-3 text-xs text-amber-950">
                <input
                  type="checkbox"
                  checked={newIsFeatured}
                  onChange={(event) => setNewIsFeatured(event.target.checked)}
                  className="mt-0.5 h-4 w-4 accent-amber-700"
                />
                <span>
                  <span className="block font-bold">Mettre cette offre à la une</span>
                  <span className="mt-1 block leading-relaxed">
                    Option gratuite pour le moment : aucun paiement en ligne n’est demandé.
                  </span>
                </span>
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Stock physique initial *"
                  type="number"
                  min={1}
                  value={newStock}
                  onChange={(e) => setNewStock(Number(e.target.value))}
                  required
                />
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1.5">Unité de mesure *</label>
                  <select
                    value={newUnit}
                    onChange={(e) => setNewUnit(e.target.value)}
                    required
                    className="w-full p-2.5 bg-stone-50 border border-stone-300 rounded-xl text-xs font-medium text-stone-800"
                  >
                    <option value="">Sélectionner une unité</option>
                    <option value="KG">Kilogramme</option>
                    <option value="SAC_25KG">Sac 25 kg</option>
                    <option value="SAC_50KG">Sac 50 kg</option>
                    <option value="SAC_100KG">Sac 100 kg</option>
                    <option value="BOTTE">Botte</option>
                    <option value="TONNE">Tonne</option>
                    <option value="PIECE">Pièce</option>
                    <option value="LITRE">Litre</option>
                    <option value="BIDON_20L">Bidon 20 L</option>
                    <option value="CARTON">Carton</option>
                    <option value="CASIER">Casier</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Prix unitaire (CDF) *"
                  type="number"
                min={1}
                  value={newRetailCdf}
                  onChange={(e) => setNewRetailCdf(Number(e.target.value))}
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Prix par quantité (CDF)"
                  type="number"
                  value={newWholesaleCdf}
                  onChange={(e) => setNewWholesaleCdf(Number(e.target.value))}
                />
                <Input
                  label="Quantité minimale à ce prix"
                  type="number"
                  min={2}
                  value={newWholesaleMinQty}
                  onChange={(e) => setNewWholesaleMinQty(Number(e.target.value))}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1.5">
                    Province de Récolte *
                  </label>
                  <select
                    value={newProvince}
                    onChange={(e) => setNewProvince(e.target.value)}
                    required
                    className="w-full p-2.5 bg-stone-50 border border-stone-300 rounded-xl text-xs font-medium text-stone-800"
                  >
                    <option value="">Sélectionner une province</option>
                    {DRC_PROVINCES.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </div>
                <Input
                  label="Ville ou Territoire *"
                  value={newCity}
                  onChange={(e) => setNewCity(e.target.value)}
                  required
                />
              </div>

              <Input
                label="Qualité / Label"
                value={newGrade}
                onChange={(e) => setNewGrade(e.target.value)}
                placeholder="ex: Grade 1, Extra Frais, Séché au Soleil"
              />

              <Button
                type="submit"
                variant="primary"
                size="lg"
                className="w-full cursor-pointer shadow-md"
                disabled={sellerVerificationStatus !== 'VERIFIED'}
                isLoading={isCreatingOffer}
              >
                {sellerVerificationStatus !== 'VERIFIED'
                  ? 'Profil en attente de vérification'
                  : 'Publier l’offre au catalogue'}
              </Button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}

