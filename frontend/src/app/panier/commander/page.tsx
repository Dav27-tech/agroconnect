'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCart } from '../../../context/CartContext';
import { useAuth } from '../../../context/AuthContext';
import { useCurrency } from '../../../context/CurrencyContext';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { DRC_PROVINCES, DRC_MOBILE_MONEY_PROVIDERS } from '../../../constants/drc';
import { formatDualPrice } from '../../../utils/format';
import { IconCheck, IconShieldCheck, IconPhone, IconTruck } from '../../../components/ui/Icons';
import { ParentOrder, SupportedCurrency } from '../../../types';
import { api } from '../../../services/api';

export default function CheckoutPage() {
  const router = useRouter();
  const { items, calculation, clearCart } = useCart();
  const { user } = useAuth();
  const { currency, setCurrency, exchangeRate } = useCurrency();

  const [province, setProvince] = useState<string>('Kinshasa');
  const [city, setCity] = useState<string>('Kinshasa');
  const [commune, setCommune] = useState<string>('Gombe');
  const [address, setAddress] = useState<string>('Avenue de la Paix n° 14');
  const [recipientName, setRecipientName] = useState<string>(user?.fullName || 'Patrick Mwamba');
  const [recipientPhone, setRecipientPhone] = useState<string>(user?.phoneNumber || '+243810001122');
  const [instructions, setInstructions] = useState<string>('Entrepôt AgroCommerce, livraison de jour');
  const [provider, setProvider] = useState<string>('ORANGE_MONEY');

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [confirmedOrder, setConfirmedOrder] = useState<ParentOrder | null>(null);

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

  const totals = calculation?.totals || { totalCdf: 124000, totalUsd: 43.51 };
  const dualTotals = formatDualPrice(totals.totalCdf, totals.totalUsd, currency);

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
        currency,
        deliveryProvince: province,
        deliveryCity: city,
        deliveryCommune: commune,
        deliveryAddress: address,
        recipientName,
        recipientPhone,
        deliveryInstructions: instructions,
      };

      const order = await api.orders.create(payload);
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
        {confirmedOrder ? (
          /* Confirmation State */
          <div className="max-w-3xl mx-auto bg-white p-8 sm:p-10 rounded-3xl border border-stone-200 shadow-md space-y-6">
            <div className="text-center space-y-3">
              <span className="w-16 h-16 mx-auto rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center">
                <IconCheck className="w-9 h-9" />
              </span>
              <h2 className="text-2xl font-black text-emerald-950">
                Commande Confirmée avec Succès !
              </h2>
              <p className="text-xs text-stone-600 max-w-lg mx-auto">
                Votre commande globale <strong>{confirmedOrder.orderNumber}</strong> a été transmise aux vendeurs concernés.
                Chaque vendeur prépare sa propre sous-commande de manière indépendante.
              </p>
            </div>

            <div className="bg-stone-50 p-5 rounded-2xl border border-stone-200 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-stone-500">Numéro de Commande Parent :</span>
                <span className="font-bold text-stone-900">{confirmedOrder.orderNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500">Taux de Change Figé (Snapshot) :</span>
                <span className="font-bold text-emerald-800">1 USD = {confirmedOrder.exchangeRateSnapshot} CDF</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500">Montant Total Facturé :</span>
                <span className="font-black text-stone-900">
                  {confirmedOrder.currency === 'CDF'
                    ? `${confirmedOrder.totalAmountCdf.toLocaleString('fr-FR')} FC`
                    : `${confirmedOrder.totalAmountUsd.toLocaleString('fr-FR')} $`}
                </span>
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
                      <Link href={`/suivi/${sub.deliveryId || 'AGC-TRK-784910'}`}>
                        <Button variant="outline" size="sm" leftIcon={<IconTruck className="w-3.5 h-3.5" />}>
                          Suivre la livraison
                        </Button>
                      </Link>
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
                      className="w-full px-3.5 py-2.5 bg-white border border-stone-300 rounded-xl text-xs font-medium text-stone-800 focus:outline-none focus:ring-2 focus:ring-emerald-700"
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

              {/* Devise et Paiement */}
              <div className="bg-white p-6 sm:p-8 rounded-3xl border border-stone-200 shadow-xs space-y-5">
                <h3 className="text-base font-black text-stone-900 border-b border-stone-100 pb-3 flex items-center gap-2">
                  <IconShieldCheck className="w-5 h-5 text-emerald-800" />
                  <span>2. Devise & Moyen de Paiement</span>
                </h3>

                {/* Choix de la Devise de Règlement */}
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-2">
                    Devise de paiement appliquée :
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setCurrency('CDF')}
                      className={`p-3 rounded-xl border text-left cursor-pointer transition ${
                        currency === 'CDF'
                          ? 'border-emerald-800 bg-emerald-50 ring-2 ring-emerald-800/20'
                          : 'border-stone-200 hover:border-stone-300'
                      }`}
                    >
                      <p className="text-xs font-bold text-stone-900">Franc Congolais (CDF / FC)</p>
                      <p className="text-[10px] text-stone-500 mt-0.5">Monnaie nationale officielle</p>
                    </button>

                    <button
                      type="button"
                      onClick={() => setCurrency('USD')}
                      className={`p-3 rounded-xl border text-left cursor-pointer transition ${
                        currency === 'USD'
                          ? 'border-emerald-800 bg-emerald-50 ring-2 ring-emerald-800/20'
                          : 'border-stone-200 hover:border-stone-300'
                      }`}
                    >
                      <p className="text-xs font-bold text-stone-900">Dollar Américain (USD / $)</p>
                      <p className="text-[10px] text-stone-500 mt-0.5">Taux : 1 $ = {exchangeRate} FC</p>
                    </button>
                  </div>
                </div>

                {/* Opérateurs Mobile Money */}
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-2">
                    Opérateur Mobile Money ou Banque :
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    {DRC_MOBILE_MONEY_PROVIDERS.map((p) => {
                      const isSelected = provider === p.id;
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => setProvider(p.id)}
                          className={`p-3 rounded-xl border text-center transition cursor-pointer ${
                            isSelected
                              ? 'border-emerald-800 bg-emerald-50 ring-2 ring-emerald-800/20'
                              : 'border-stone-200 hover:border-stone-300'
                          }`}
                        >
                          <p className="text-xs font-bold text-stone-900 leading-tight">{p.name}</p>
                          <span className="text-[10px] text-stone-500">{p.prefix.join(', ')}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
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

                  <div className="flex justify-between text-stone-600">
                    <span>Taux garanti appliqué :</span>
                    <span className="font-semibold text-stone-700">1 USD = {exchangeRate} CDF</span>
                  </div>

                  <div className="pt-4 border-t border-stone-100 flex items-baseline justify-between">
                    <span className="text-sm font-black text-stone-900">Total à régler :</span>
                    <div className="text-right">
                      <p className="text-xl font-black text-emerald-900">{dualTotals.primary}</p>
                      <p className="text-xs text-stone-500">{dualTotals.secondary}</p>
                    </div>
                  </div>
                </div>

                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  className="w-full cursor-pointer shadow-md"
                  isLoading={isLoading}
                >
                  Confirmer et Payer ({dualTotals.primary})
                </Button>

                <div className="p-3 bg-stone-50 rounded-2xl border border-stone-200 text-[11px] text-stone-600 space-y-1">
                  <p className="font-bold text-stone-800">Règle de transaction AgroConnect :</p>
                  <p>
                    Le taux de change sera figé de manière immuable au moment de la validation.
                    Paiement vérifié sur les serveurs sécurisés backend d&apos;AgroConnect.
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

