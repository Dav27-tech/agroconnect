'use client';

import React, { useRef, useState } from 'react';
import Link from 'next/link';
import { useCart } from '../../../context/CartContext';
import { useAuth } from '../../../context/AuthContext';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { EmptyState } from '../../../components/ui/EmptyState';
import { DRC_PROVINCES } from '../../../constants/drc';
import { formatCdfPrice } from '../../../utils/format';
import { IconCheck, IconShieldCheck, IconPhone, IconTruck } from '../../../components/ui/Icons';
import { ParentOrder } from '../../../types';
import { api } from '../../../services/api';

export default function CheckoutPage() {
  const { items, isCartHydrated, calculation, clearCart } = useCart();
  const { user, isAdmin, isLoading: isAuthLoading } = useAuth();

  const [province, setProvince] = useState<string>('');
  const [city, setCity] = useState<string>('');
  const [commune, setCommune] = useState<string>('');
  const [address, setAddress] = useState<string>('');
  const [recipientName, setRecipientName] = useState<string>(user?.fullName || '');
  const [recipientPhone, setRecipientPhone] = useState<string>(user?.phoneNumber || '');
  const [instructions, setInstructions] = useState<string>('');

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [confirmedOrder, setConfirmedOrder] = useState<ParentOrder | null>(null);
  const orderIdempotencyKey = useRef<string | null>(null);

  if (!isCartHydrated || isAuthLoading) {
    return <p className="p-12 text-center text-sm text-stone-500">Chargement du panier...</p>;
  }

  if (isAdmin) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16">
        <EmptyState
          title="Commande réservée aux acheteurs"
          description="Un compte administrateur ne peut pas passer de commande."
          actionText="Retour à l’administration"
          actionHref="/admin"
        />
      </div>
    );
  }

  if (user?.sellerId && items.some((item) => item.offer.sellerId === user.sellerId)) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16">
        <EmptyState
          title="Offre personnelle dans le panier"
          description="Vous ne pouvez pas commander vos propres marchandises. Retirez cette offre du panier pour continuer."
          actionText="Modifier le panier"
          actionHref="/panier"
        />
      </div>
    );
  }

  if (items.length === 0 && !confirmedOrder) {
    return (
      <div className="bg-stone-50 min-h-screen pb-20">
        <PageHeader title="Validation de Commande" breadcrumbs={[{ label: 'Panier', href: '/panier' }, { label: 'Commander' }]} />
        <div className="max-w-2xl mx-auto px-4 pt-16 text-center">
          <p className="text-sm text-stone-600 mb-4">Votre panier est vide.</p>
          <Link href="/catalogue">
            <Button variant="primary">Retourner au Catalogue</Button>
          </Link>
        </div>
      </div>
    );
  }

  const totalCdf = formatCdfPrice(calculation?.totals.totalCdf ?? 0);

  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage('');

    try {
      const payload = {
        items: items.map((i) => ({
          offerId: i.offerId,
          quantity: i.quantity,
          saleType: i.saleType,
        })),
        currency: 'CDF' as const,
        deliveryProvince: province,
        deliveryCity: city,
        deliveryCommune: commune,
        deliveryAddress: address,
        recipientName,
        recipientPhone,
        deliveryInstructions: instructions,
      };

      orderIdempotencyKey.current ??= crypto.randomUUID();
      const order = await api.orders.create(payload, orderIdempotencyKey.current);
      setConfirmedOrder(order);
        clearCart();
    } catch (err) {
      setErrorMessage((err as Error).message || 'Erreur lors de la création de la commande');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-stone-50 min-h-screen pb-20">
      <PageHeader
        title="Finaliser ma Commande"
        subtitle="Renseignez vos coordonnées de livraison en RDC et validez votre commande multi-vendeurs."
        breadcrumbs={[
          { label: 'Accueil', href: '/' },
          { label: 'Panier', href: '/panier' },
          { label: 'Commander' },
        ]}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        {!user ? (
          <div className="mx-auto max-w-2xl space-y-5 rounded-3xl border border-stone-200 bg-white p-8 text-center shadow-sm">
            <h2 className="text-xl font-black text-stone-900">Créez un compte pour commander</h2>
            <p className="text-sm leading-relaxed text-stone-600">
              Votre panier reste enregistré dans cette session. Inscrivez-vous ou connectez-vous avec votre adresse
              email pour renseigner vos coordonnées et confirmer la commande.
            </p>
            <div className="flex flex-col justify-center gap-3 sm:flex-row">
              <Link href="/inscription?redirect=%2Fpanier%2Fcommander">
                <Button variant="primary">Créer mon compte</Button>
              </Link>
              <Link href="/connexion?redirect=%2Fpanier%2Fcommander">
                <Button variant="outline">J&apos;ai déjà un compte</Button>
              </Link>
            </div>
          </div>
        ) : confirmedOrder ? (
          /* Confirmation State */
          <div className="max-w-3xl mx-auto bg-white p-8 sm:p-10 rounded-3xl border border-stone-200 shadow-md space-y-6">
            <div className="text-center space-y-3">
              <span className="w-16 h-16 mx-auto rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center">
                <IconCheck className="w-9 h-9" />
              </span>
              <h2 className="text-2xl font-black text-emerald-950">Commande enregistrée</h2>
              <p className="text-xs text-stone-600 max-w-lg mx-auto">
                Votre commande <strong>{confirmedOrder.orderNumber}</strong> est enregistrée avec le statut en attente.
                Aucun paiement n&apos;a été demandé ni confirmé; les paiements ne sont pas connectés dans cette version.
              </p>
            </div>

            <div className="bg-stone-50 p-5 rounded-2xl border border-stone-200 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-stone-500">Numéro de commande :</span>
                <span className="font-bold text-stone-900">{confirmedOrder.orderNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500">Total de la commande :</span>
                <span className="font-black text-stone-900">{formatCdfPrice(confirmedOrder.totalAmountCdf)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500">Destination :</span>
                <span className="font-medium text-stone-800">
                  {confirmedOrder.deliveryAddress}, {confirmedOrder.deliveryCity} ({confirmedOrder.deliveryProvince})
                </span>
              </div>
            </div>

            {/* Liste des sous-commandes vendeurs créées */}
            <div>
              <h3 className="text-sm font-bold text-stone-900 mb-3">
                Sous-commandes par vendeur ({confirmedOrder.subOrders?.length || 0}) :
              </h3>
              <div className="space-y-3">
                {confirmedOrder.subOrders?.map((sub) => (
                  <div
                    key={sub.id}
                    className="p-4 rounded-xl border border-stone-200 bg-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-stone-900">{sub.subOrderNumber}</span>
                        <span className="text-[10px] font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded">
                          {sub.status}
                        </span>
                      </div>
                      <p className="text-xs text-stone-600 mt-0.5">Vendeur : {sub.sellerName}</p>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-xs font-bold text-stone-900">
                        {sub.subtotalCdf.toLocaleString('fr-FR')} FC
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-4 flex flex-col sm:flex-row gap-3">
              <Link href="/mes-commandes" className="flex-1">
                <Button variant="primary" size="md" className="w-full">
                  Voir mon Historique de Commandes
                </Button>
              </Link>
              <Link href="/catalogue" className="flex-1">
                <Button variant="outline" size="md" className="w-full">
                  Retourner au Catalogue
                </Button>
              </Link>
            </div>
          </div>
        ) : (
          /* Formulaire de validation */
          <form onSubmit={handleSubmitOrder} className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-7 space-y-6">
              {errorMessage && (
                <div className="p-3 text-xs bg-red-50 text-red-700 border border-red-200 rounded-xl font-medium">
                  {errorMessage}
                </div>
              )}

              {/* Coordonnées de livraison */}
              <div className="bg-white p-6 sm:p-8 rounded-3xl border border-stone-200 shadow-xs space-y-5">
                <h3 className="text-base font-black text-stone-900 border-b border-stone-100 pb-3 flex items-center gap-2">
                  <IconTruck className="w-5 h-5 text-emerald-800" />
                  <span>1. Adresse de Livraison en RDC</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1.5">
                      Province de destination (RDC) *
                    </label>
                    <select
                      value={province}
                      onChange={(e) => setProvince(e.target.value)}
                      required
                      className="w-full px-3.5 py-2.5 bg-white border border-stone-300 rounded-xl text-xs font-medium text-stone-800 focus:outline-none focus:ring-2 focus:ring-emerald-700"
                    >
                      <option value="">Choisir une province</option>
                      {DRC_PROVINCES.map((p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))}
                    </select>
                  </div>

                  <Input
                    label="Ville ou Territoire *"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    required
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Commune ou Quartier"
                    value={commune}
                    onChange={(e) => setCommune(e.target.value)}
                  />

                  <Input
                    label="Adresse précise / Repère *"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    required
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Nom du Destinataire *"
                    value={recipientName}
                    onChange={(e) => setRecipientName(e.target.value)}
                    required
                  />

                  <Input
                    label="Téléphone du Destinataire (+243) *"
                    value={recipientPhone}
                    onChange={(e) => setRecipientPhone(e.target.value)}
                    required
                    leftIcon={<IconPhone className="w-4 h-4 text-stone-400" />}
                  />
                </div>

                <Input
                  label="Instructions particulières de livraison"
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  placeholder="ex: Livrer avant midi, accès cour arrière..."
                />
              </div>

              {/* Paiement */}
              <div className="bg-white p-6 sm:p-8 rounded-3xl border border-stone-200 shadow-xs space-y-5">
                <h3 className="text-base font-black text-stone-900 border-b border-stone-100 pb-3 flex items-center gap-2">
                  <IconShieldCheck className="w-5 h-5 text-emerald-800" />
                  <span>2. Paiement en CDF</span>
                </h3>
                <p className="text-xs text-stone-600">Tous les montants de cette commande sont exprimés en Francs Congolais (CDF).</p>

                <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
                  Le paiement n&apos;est pas disponible dans cette version. La création de commande ne déclenche aucun débit.
                </p>
              </div>
            </div>

            {/* Sidebar Résumé */}
            <div className="lg:col-span-5">
              <div className="bg-white p-6 sm:p-8 rounded-3xl border border-stone-200 shadow-sm space-y-6 sticky top-28">
                <h3 className="text-base font-black text-stone-900 border-b border-stone-100 pb-3">
                  Commande Multi-Vendeurs
                </h3>

                <div className="space-y-3 text-xs">
                  <div className="flex justify-between text-stone-600">
                    <span>Nombre d&apos;articles :</span>
                    <span className="font-bold text-stone-900">
                      {calculation?.totalItemsCount || items.reduce((s, i) => s + i.quantity, 0)} unité(s)
                    </span>
                  </div>

                  <div className="flex justify-between text-stone-600">
                    <span>Vendeurs distincts :</span>
                    <span className="font-bold text-emerald-800">
                      {calculation?.distinctSellersCount || new Set(items.map((i) => i.offer.sellerId)).size}{' '}
                      vendeur(s)
                    </span>
                  </div>

                  <div className="pt-4 border-t border-stone-100 flex items-baseline justify-between">
                    <span className="text-sm font-black text-stone-900">Total à régler :</span>
                    <p className="text-xl font-black text-emerald-900">{totalCdf}</p>
                  </div>
                </div>

                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  className="w-full cursor-pointer shadow-md"
                  isLoading={isLoading}
                >
                  Créer la commande ({totalCdf})
                </Button>

                <div className="p-3 bg-stone-50 rounded-2xl border border-stone-200 text-[11px] text-stone-600 space-y-1">
                  <p className="font-bold text-stone-800">Règle de transaction AgroConnect :</p>
                  <p>
                    Aucun paiement n&apos;est exécuté ni confirmé dans cette version.
                  </p>
                </div>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

