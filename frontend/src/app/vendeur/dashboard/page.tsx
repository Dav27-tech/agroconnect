'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '../../../context/AuthContext';
import { useCurrency } from '../../../context/CurrencyContext';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { formatDualPrice } from '../../../utils/format';
import {
  IconPlant,
  IconShoppingBag,
  IconTruck,
  IconCheck,
  IconPlus,
  IconShieldCheck,
} from '../../../components/ui/Icons';
import {
  SellerOfferItem,
  SubOrder,
  StockMovement,
  SellerService,
  ProductCatalogItem,
  SaleType,
  SubOrderStatus,
  StockMovementType,
} from '../../../types';
import { api } from '../../../services/api';
import { DRC_PROVINCES } from '../../../constants/drc';

export default function SellerDashboardPage() {
  const { user, isAuthenticated, isSeller } = useAuth();
  const { currency, exchangeRate } = useCurrency();

  const sellerId = user?.sellerId || 'seller-coopak-kikwit';
  const [activeTab, setActiveTab] = useState<
    'overview' | 'offers' | 'stock' | 'orders' | 'services' | 'new-offer'
  >('overview');

  const [offers, setOffers] = useState<SellerOfferItem[]>([]);
  const [orders, setOrders] = useState<SubOrder[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [services, setServices] = useState<SellerService[]>([]);
  const [catalogProducts, setCatalogProducts] = useState<ProductCatalogItem[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [notification, setNotification] = useState<string>('');

  // Formulaire Mouvement de stock
  const [mvtOfferId, setMvtOfferId] = useState<string>('');
  const [mvtQuantity, setMvtQuantity] = useState<number>(10);
  const [mvtType, setMvtType] = useState<StockMovementType>('RESTOCK');
  const [mvtNotes, setMvtNotes] = useState<string>('Arrivage de récolte au dépôt');
  const [isSubmittingMvt, setIsSubmittingMvt] = useState(false);

  // Formulaire Nouvelle Offre
  const [newProductId, setNewProductId] = useState<string>('prod-manioc-doux');
  const [newStock, setNewStock] = useState<number>(100);
  const [newUnit, setNewUnit] = useState<string>('Sac de 50kg');
  const [newRetailCdf, setNewRetailCdf] = useState<number>(45000);
  const [newRetailUsd, setNewRetailUsd] = useState<number>(15.78);
  const [newWholesaleCdf, setNewWholesaleCdf] = useState<number>(40000);
  const [newWholesaleUsd, setNewWholesaleUsd] = useState<number>(14.03);
  const [newWholesaleMinQty, setNewWholesaleMinQty] = useState<number>(5);
  const [newProvince, setNewProvince] = useState<string>('Kwilu');
  const [newCity, setNewCity] = useState<string>('Kikwit');
  const [newGrade, setNewGrade] = useState<string>('Grade 1 Extra');
  const [isCreatingOffer, setIsCreatingOffer] = useState(false);

  // Chargement des données du vendeur
  const loadSellerData = async () => {
    setIsLoading(true);
    try {
      const [offersList, ordersList, invData, srvData, prods] = await Promise.all([
        api.offers.list({ sellerId }),
        api.orders.getBySeller(sellerId).catch(() => []),
        api.inventory.getBySeller(sellerId).catch(() => null),
        api.sellerServices.list(sellerId).catch(() => null),
        api.products.list(),
      ]);

      setOffers(offersList || []);
      setOrders(ordersList || []);
      if (invData?.movementsLog) setMovements(invData.movementsLog);
      if (srvData?.sellerServices) setServices(srvData.sellerServices);
      if (prods) setCatalogProducts(prods);
      if (offersList && offersList.length > 0 && !mvtOfferId) {
        setMvtOfferId(offersList[0]!.id);
      }
    } catch (err) {
      console.warn('Erreur chargement données vendeur :', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSellerData();
  }, [sellerId]);

  const notify = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(''), 4000);
  };

  // Traiter un mouvement de stock
  const handleStockMovement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mvtOfferId) return;

    setIsSubmittingMvt(true);
    try {
      const change = mvtType === 'SPOILAGE_LOSS' ? -Math.abs(mvtQuantity) : Math.abs(mvtQuantity);
      await api.inventory.recordMovement({
        offerId: mvtOfferId,
        quantityChange: change,
        movementType: mvtType,
        notes: mvtNotes,
      });

      notify('Mouvement de stock enregistré avec audit complet.');
      await loadSellerData();
    } catch (err) {
      notify(`Erreur : ${(err as Error).message}`);
    } finally {
      setIsSubmittingMvt(false);
    }
  };

  // Mettre à jour le statut d'une sous-commande
  const handleUpdateOrderStatus = async (subOrderId: string, newStatus: SubOrderStatus) => {
    try {
      await api.orders.updateSubOrderStatus(subOrderId, newStatus);
      notify(`Statut de la sous-commande mis à jour vers ${newStatus}.`);
      await loadSellerData();
    } catch (err) {
      notify(`Erreur : ${(err as Error).message}`);
    }
  };

  // Créer une nouvelle offre commerciale
  const handleCreateOffer = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreatingOffer(true);

    try {
      const prod = catalogProducts.find((p) => p.id === newProductId);
      await api.offers.create({
        productId: newProductId,
        productName: prod?.name || 'Produit Agricole',
        categoryName: prod?.categoryName || 'Filière Agricole',
        stockQuantity: newStock,
        unit: newUnit,
        retailPriceCdf: newRetailCdf,
        retailPriceUsd: newRetailUsd,
        retailMinQuantity: 1,
        wholesalePriceCdf: newWholesaleCdf,
        wholesalePriceUsd: newWholesaleUsd,
        wholesaleMinQuantity: newWholesaleMinQty,
        originProvince: newProvince,
        originCity: newCity,
        qualityGrade: newGrade,
        servicesOffered: ['Tri calibré au champ'],
      });

      notify('Nouvelle offre publiée avec succès au catalogue AgroConnect.');
      setActiveTab('offers');
      await loadSellerData();
    } catch (err) {
      notify(`Erreur lors de la création de l'offre : ${(err as Error).message}`);
    } finally {
      setIsCreatingOffer(false);
    }
  };

  const totalStockUnits = offers.reduce((sum, o) => sum + o.stockQuantity, 0);
  const totalSalesCdf = orders.reduce((sum, o) => sum + o.subtotalCdf, 0);
  const totalPayoutCdf = orders.reduce((sum, o) => sum + (o.payoutAmountCdf || o.subtotalCdf * 0.95), 0);

  return (
    <div className="bg-stone-50 min-h-screen pb-20">
      <PageHeader
        title="Espace de Gestion Vendeur"
        subtitle="Gérez vos offres commerciales, vos stocks partagés, vos sous-commandes et vos reversements."
        breadcrumbs={[{ label: 'Accueil', href: '/' }, { label: 'Espace Vendeur' }]}
        badge={
          <span className="text-xs bg-emerald-100 text-emerald-800 font-bold px-3 py-1 rounded-full border border-emerald-200">
            {user?.fullName || 'Coopérative COOPAK'} (Agréé RDC)
          </span>
        }
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        {notification && (
          <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-900 font-bold flex items-center justify-between">
            <span>✅ {notification}</span>
            <button type="button" onClick={() => setNotification('')} className="text-stone-400 hover:text-stone-700">
              ✕
            </button>
          </div>
        )}

        {/* Navigation par Onglets */}
        <div className="flex flex-wrap gap-2 mb-8 bg-white p-2 rounded-2xl border border-stone-200 shadow-xs">
          {[
            { id: 'overview', label: '📊 Vue d\'ensemble' },
            { id: 'offers', label: `🌾 Mes Offres (${offers.length})` },
            { id: 'stock', label: '📦 Stocks & Mouvements' },
            { id: 'orders', label: `📦 Commandes Reçues (${orders.length})` },
            { id: 'services', label: `🛠️ Services (${services.length})` },
            { id: 'new-offer', label: '➕ Publier une Offre' },
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                  isActive
                    ? 'bg-emerald-800 text-white shadow-xs'
                    : 'text-stone-600 hover:bg-stone-100'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* TAB 1: OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="space-y-8">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              <div className="bg-white p-6 rounded-3xl border border-stone-200 shadow-xs">
                <span className="text-xs font-bold uppercase tracking-wider text-stone-500">
                  Offres Actives
                </span>
                <p className="text-3xl font-black text-emerald-900 mt-2">{offers.length}</p>
                <p className="text-xs text-stone-500 mt-1">Au catalogue AgroConnect RDC</p>
              </div>

              <div className="bg-white p-6 rounded-3xl border border-stone-200 shadow-xs">
                <span className="text-xs font-bold uppercase tracking-wider text-stone-500">
                  Stock Total Disponible
                </span>
                <p className="text-3xl font-black text-stone-900 mt-2">{totalStockUnits}</p>
                <p className="text-xs text-stone-500 mt-1">Unités physiques partagées</p>
              </div>

              <div className="bg-white p-6 rounded-3xl border border-stone-200 shadow-xs">
                <span className="text-xs font-bold uppercase tracking-wider text-stone-500">
                  Sous-Commandes
                </span>
                <p className="text-3xl font-black text-orange-600 mt-2">{orders.length}</p>
                <p className="text-xs text-stone-500 mt-1">Attribuées à votre profil</p>
              </div>

              <div className="bg-white p-6 rounded-3xl border border-stone-200 shadow-xs">
                <span className="text-xs font-bold uppercase tracking-wider text-stone-500">
                  Rémunération Nette
                </span>
                <p className="text-2xl font-black text-emerald-800 mt-2">
                  {totalPayoutCdf.toLocaleString('fr-FR')} FC
                </p>
                <p className="text-xs text-stone-500 mt-1">Après commission de 5.0%</p>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white p-6 rounded-3xl border border-stone-200 shadow-xs space-y-4">
              <h3 className="text-sm font-bold text-stone-900">Rappels des règles d&apos;exploitation :</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-stone-600">
                <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200">
                  <p className="font-bold text-emerald-900">1. Propriété de l&apos;inventaire</p>
                  <p className="mt-1">
                    AgroConnect n&apos;achète ni ne possède vos récoltes. Vous définissez librement vos
                    prix et restez maître de votre stock physique.
                  </p>
                </div>
                <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200">
                  <p className="font-bold text-emerald-900">2. Stock unique partagé</p>
                  <p className="mt-1">
                    Vos ventes au détail et en gros déduisent du même inventaire afin de garantir qu&apos;aucune
                    sur-vente ne survienne.
                  </p>
                </div>
                <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200">
                  <p className="font-bold text-emerald-900">3. Commission d&apos;intermédiation</p>
                  <p className="mt-1">
                    AgroConnect perçoit une commission standard de 5% sur vos ventes finalisées pour
                    l&apos;infrastructure et la sécurité des paiements.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: MES OFFRES & TARIFS */}
        {activeTab === 'offers' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-base font-bold text-stone-900">
                Vos offres commerciales en ligne ({offers.length})
              </h3>
              <Button
                variant="primary"
                size="sm"
                leftIcon={<IconPlus className="w-4 h-4" />}
                onClick={() => setActiveTab('new-offer')}
              >
                Nouvelle Offre
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {offers.map((offer) => (
                <div
                  key={offer.id}
                  className="bg-white rounded-3xl border border-stone-200 p-6 shadow-xs space-y-4"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="text-base font-bold text-stone-900">{offer.productName}</h4>
                      <p className="text-xs text-stone-500">
                        {offer.categoryName} • {offer.originProvince}
                      </p>
                    </div>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        offer.isAvailable && offer.stockQuantity > 0
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {offer.isAvailable && offer.stockQuantity > 0 ? 'Disponible' : 'Rupture'}
                    </span>
                  </div>

                  {/* Stock partagé */}
                  <div className="bg-stone-50 p-3 rounded-2xl border border-stone-200 text-xs flex justify-between items-center">
                    <span className="text-stone-600 font-medium">Stock partagé :</span>
                    <span className="font-black text-stone-900">
                      {offer.stockQuantity} {offer.unit}
                    </span>
                  </div>

                  {/* Prix Détail & Gros */}
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-stone-500">Prix Détail :</span>
                      <span className="font-bold text-stone-900">
                        {offer.retailPriceCdf.toLocaleString('fr-FR')} FC ({offer.retailPriceUsd} $)
                      </span>
                    </div>
                    {offer.wholesalePriceCdf && (
                      <div className="flex justify-between">
                        <span className="text-stone-500">
                          Prix Gros (min. {offer.wholesaleMinQuantity}) :
                        </span>
                        <span className="font-bold text-emerald-800">
                          {offer.wholesalePriceCdf.toLocaleString('fr-FR')} FC ({offer.wholesalePriceUsd} $)
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="pt-2 border-t border-stone-100 flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setMvtOfferId(offer.id);
                        setActiveTab('stock');
                      }}
                      className="flex-1 text-center py-2 text-xs font-bold bg-stone-100 hover:bg-stone-200 rounded-xl text-stone-800 cursor-pointer"
                    >
                      Ajuster le Stock
                    </button>
                    <Link
                      href={`/produits/${offer.productId}`}
                      className="px-3 py-2 text-xs font-bold text-emerald-800 hover:underline"
                    >
                      Voir fiche
                    </Link>
                  </div>
                </div>
              ))}
            </div>
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
                  >
                    {offers.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.productName} (Actuel : {o.stockQuantity} {o.unit})
                      </option>
                    ))}
                  </select>
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
                    <option value="RESTOCK">➕ Réapprovisionnement (+ stock)</option>
                    <option value="MANUAL_ADJUSTMENT">⚙️ Ajustement d&apos;inventaire</option>
                    <option value="SPOILAGE_LOSS">⚠️ Perte / Avarie constatée (- stock)</option>
                  </select>
                </div>

                <Input
                  label="Quantité concernée (unités) *"
                  type="number"
                  min={1}
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
                >
                  Valider le Mouvement de Stock
                </Button>
              </form>
            </div>

            {/* Journal d'audit des mouvements */}
            <div className="lg:col-span-7 bg-white p-6 sm:p-8 rounded-3xl border border-stone-200 shadow-xs space-y-4">
              <h3 className="text-base font-bold text-stone-900 border-b border-stone-100 pb-3">
                Journal d&apos;Audit des Mouvements ({movements.length})
              </h3>

              <div className="divide-y divide-stone-100 max-h-[500px] overflow-y-auto space-y-3">
                {movements.map((m) => (
                  <div key={m.id} className="pt-3 first:pt-0 text-xs space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-stone-900">
                        {m.movementType === 'ORDER_RESERVATION'
                          ? '🛒 Réservation Commande'
                          : m.movementType === 'INITIAL_STOCK'
                          ? '🌾 Stock Initial'
                          : m.movementType === 'RESTOCK'
                          ? '➕ Réapprovisionnement'
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

                    <div className="flex justify-between text-stone-500 text-[11px]">
                      <span>
                        Avant : {m.previousStock} ➔ Après : {m.newStock}
                      </span>
                      <span>{new Date(m.createdAt).toLocaleDateString('fr-FR')}</span>
                    </div>

                    {m.notes && <p className="text-stone-600 italic text-[11px]">{m.notes}</p>}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: COMMANDES REÇUES */}
        {activeTab === 'orders' && (
          <div className="space-y-6">
            <h3 className="text-base font-bold text-stone-900">
              Sous-commandes attribuées à votre exploitation ({orders.length})
            </h3>

            {orders.length > 0 ? (
              <div className="space-y-4">
                {orders.map((sub) => {
                  const subDual = formatDualPrice(sub.subtotalCdf, sub.subtotalUsd, currency);
                  return (
                    <div
                      key={sub.id}
                      className="bg-white p-6 rounded-3xl border border-stone-200 shadow-xs space-y-4"
                    >
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-stone-100 pb-4">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-black text-stone-900">{sub.subOrderNumber}</span>
                            <span className="text-xs font-bold px-2.5 py-0.5 rounded bg-amber-100 text-amber-800">
                              {sub.status}
                            </span>
                          </div>
                          <p className="text-xs text-stone-500 mt-0.5">
                            Part nette vendeur :{' '}
                            <strong>{sub.payoutAmountCdf?.toLocaleString('fr-FR')} FC</strong> (Commission
                            AgroConnect : {sub.commissionRate}%)
                          </p>
                        </div>

                        <div className="text-right">
                          <p className="text-base font-bold text-emerald-900">{subDual.primary}</p>
                          <p className="text-xs text-stone-500">{subDual.secondary}</p>
                        </div>
                      </div>

                      {/* Mise à jour du statut de préparation par le vendeur */}
                      <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                        <span className="text-xs text-stone-600 font-semibold">
                          Changer le statut de préparation :
                        </span>
                        <div className="flex gap-2">
                          {sub.status !== 'CONFIRMED' && (
                            <button
                              type="button"
                              onClick={() => handleUpdateOrderStatus(sub.id, 'CONFIRMED')}
                              className="px-3 py-1 text-xs font-bold rounded-lg border border-stone-300 hover:bg-stone-100 cursor-pointer"
                            >
                              Confirmer
                            </button>
                          )}
                          {sub.status !== 'PREPARING' && (
                            <button
                              type="button"
                              onClick={() => handleUpdateOrderStatus(sub.id, 'PREPARING')}
                              className="px-3 py-1 text-xs font-bold rounded-lg bg-amber-500 text-white cursor-pointer"
                            >
                              En Préparation
                            </button>
                          )}
                          {sub.status !== 'READY_FOR_PICKUP' && (
                            <button
                              type="button"
                              onClick={() => handleUpdateOrderStatus(sub.id, 'READY_FOR_PICKUP')}
                              className="px-3 py-1 text-xs font-bold rounded-lg bg-emerald-800 text-white cursor-pointer"
                            >
                              Prêt pour Enlèvement
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="bg-white p-8 rounded-3xl border border-stone-200 text-center text-xs text-stone-500">
                Aucune commande client en attente de préparation pour le moment.
              </div>
            )}
          </div>
        )}

        {/* TAB 5: SERVICES VENDEUR */}
        {activeTab === 'services' && (
          <div className="space-y-6">
            <h3 className="text-base font-bold text-stone-900">Services à Valeur Ajoutée Proposés</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {services.map((srv) => (
                <div key={srv.id} className="bg-white p-6 rounded-3xl border border-stone-200 shadow-xs space-y-2">
                  <div className="flex justify-between items-start">
                    <h4 className="text-sm font-bold text-stone-900">{srv.title}</h4>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                      Actif
                    </span>
                  </div>
                  <p className="text-xs text-stone-600">{srv.description}</p>
                  <p className="text-xs font-bold text-emerald-900 pt-2 border-t border-stone-100">
                    Supplément : {srv.extraFeeCdf.toLocaleString('fr-FR')} FC ({srv.extraFeeUsd} $)
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 6: CRÉER UNE NOUVELLE OFFRE */}
        {activeTab === 'new-offer' && (
          <div className="max-w-2xl mx-auto bg-white p-8 rounded-3xl border border-stone-200 shadow-sm space-y-6">
            <h3 className="text-base font-bold text-stone-900 border-b border-stone-100 pb-3">
              Publier une Offre Commerciale au Catalogue
            </h3>

            <form onSubmit={handleCreateOffer} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1.5">
                  Produit Agricole du Catalogue *
                </label>
                <select
                  value={newProductId}
                  onChange={(e) => setNewProductId(e.target.value)}
                  className="w-full p-2.5 bg-stone-50 border border-stone-300 rounded-xl text-xs font-medium text-stone-800"
                  required
                >
                  {catalogProducts.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.standardUnit})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Stock physique initial *"
                  type="number"
                  min={1}
                  value={newStock}
                  onChange={(e) => setNewStock(Number(e.target.value))}
                  required
                />
                <Input
                  label="Unité de mesure *"
                  value={newUnit}
                  onChange={(e) => setNewUnit(e.target.value)}
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Prix au Détail (CDF / FC) *"
                  type="number"
                  value={newRetailCdf}
                  onChange={(e) => {
                    const cdf = Number(e.target.value);
                    setNewRetailCdf(cdf);
                    setNewRetailUsd(Number((cdf / exchangeRate).toFixed(2)));
                  }}
                  required
                />
                <Input
                  label="Prix au Détail (USD / $) *"
                  type="number"
                  step="0.01"
                  value={newRetailUsd}
                  onChange={(e) => setNewRetailUsd(Number(e.target.value))}
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Prix en Gros (CDF / FC)"
                  type="number"
                  value={newWholesaleCdf}
                  onChange={(e) => {
                    const cdf = Number(e.target.value);
                    setNewWholesaleCdf(cdf);
                    setNewWholesaleUsd(Number((cdf / exchangeRate).toFixed(2)));
                  }}
                />
                <Input
                  label="Quantité Minimale Vente en Gros"
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
                    className="w-full p-2.5 bg-stone-50 border border-stone-300 rounded-xl text-xs font-medium text-stone-800"
                  >
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
                isLoading={isCreatingOffer}
              >
                Publier l&apos;Offre sur AgroConnect
              </Button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}

