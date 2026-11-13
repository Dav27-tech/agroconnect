'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useParams } from 'next/navigation';
import { useCurrency } from '../../../context/CurrencyContext';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { EmptyState } from '../../../components/ui/EmptyState';
import { formatDualPrice, translateSellerType } from '../../../utils/format';
import { IconShieldCheck, IconLocation, IconTruck, IconPlant } from '../../../components/ui/Icons';
import { MOCK_PRODUCTS, MOCK_OFFERS, MOCK_CATEGORIES } from '../../../data/mockData';

export default function ProductDetailPage() {
  const params = useParams();
  const slug = params?.slug as string;
  const { currency } = useCurrency();

  // Find product by id or slug
  const product = useMemo(() => {
    return (
      MOCK_PRODUCTS.find((p) => p.slug === slug || p.id === slug) ||
      MOCK_PRODUCTS[0] // Fallback
    );
  }, [slug]);

  // Find all seller offers for this product
  const productOffers = useMemo(() => {
    const list = MOCK_OFFERS.filter(
      (o) => o.productId === product.id || o.productId === product.slug
    );
    return list.length > 0 ? list : [MOCK_OFFERS[0]];
  }, [product]);

  // Selected active offer (defaults to first offer)
  const [selectedOfferId, setSelectedOfferId] = useState<string>(productOffers[0]?.id || '');
  const activeOffer = useMemo(() => {
    return productOffers.find((o) => o.id === selectedOfferId) || productOffers[0]!;
  }, [productOffers, selectedOfferId]);

  // Quantity input state
  const [quantity, setQuantity] = useState<number>(activeOffer.retailMinQuantity || 1);
  const [addedToCart, setAddedToCart] = useState<boolean>(false);

  // Check if wholesale pricing applies
  const isWholesale = Boolean(
    activeOffer.wholesaleMinQuantity && quantity >= activeOffer.wholesaleMinQuantity
  );

  const unitPriceCdf = isWholesale && activeOffer.wholesalePriceCdf
    ? activeOffer.wholesalePriceCdf
    : activeOffer.retailPriceCdf;

  const unitPriceUsd = isWholesale && activeOffer.wholesalePriceUsd
    ? activeOffer.wholesalePriceUsd
    : activeOffer.retailPriceUsd;

  const totalCdf = unitPriceCdf * quantity;
  const totalUsd = unitPriceUsd * quantity;

  const dualUnitPrices = formatDualPrice(unitPriceCdf, unitPriceUsd, currency);
  const dualTotalPrices = formatDualPrice(totalCdf, totalUsd, currency);

  const sellerInfo = translateSellerType(activeOffer.sellerType);

  const handleAddToCart = () => {
    setAddedToCart(true);
    setTimeout(() => setAddedToCart(false), 3000);
  };

  // Category info
  const category = useMemo(() => {
    return MOCK_CATEGORIES.find((c) => c.id === product?.categoryId);
  }, [product]);

  if (!product) {
    return (
      <EmptyState
        title="Produit introuvable"
        description="Le produit agricole demandé n'existe pas ou n'est plus référencé au catalogue."
        actionText="Retourner au catalogue"
        actionHref="/catalogue"
      />
    );
  }

  return (
    <div className="bg-stone-50 min-h-screen pb-20">
      <PageHeader
        title={product.name}
        subtitle={`${category?.name || product.categoryName || 'Filière Agricole'} • Nom scientifique : ${product.scientificName || 'Plantae'}`}
        breadcrumbs={[
          { label: 'Accueil', href: '/' },
          { label: 'Catalogue', href: '/catalogue' },
          { label: product.name },
        ]}
        badge={
          <span className="text-xs bg-emerald-100 text-emerald-800 font-bold px-2.5 py-1 rounded-md border border-emerald-200">
            {productOffers.length} vendeur{productOffers.length > 1 ? 's' : ''} disponible{productOffers.length > 1 ? 's' : ''}
          </span>
        }
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          {/* Main Visual & Info Area */}
          <div className="lg:col-span-7 space-y-8">
            {/* Image Gallery */}
            <div className="bg-white p-4 rounded-3xl border border-stone-200 overflow-hidden shadow-xs">
              <div className="relative w-full h-80 sm:h-96 rounded-2xl overflow-hidden bg-stone-100">
                {activeOffer.imageUrl ? (
                  <Image
                    src={activeOffer.imageUrl}
                    alt={activeOffer.productName}
                    fill
                    className="object-cover"
                    priority
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-emerald-50 text-emerald-700">
                    <IconPlant className="w-16 h-16" aria-hidden="true" />
                  </div>
                )}
                <div className="absolute top-4 left-4 flex flex-col gap-2">
                  <span className={`text-xs font-bold px-3 py-1 rounded-md border backdrop-blur-md shadow-xs ${sellerInfo.badgeClass}`}>
                    {sellerInfo.label}
                  </span>
                  <span className="text-xs bg-stone-900/80 backdrop-blur-md text-white font-bold px-3 py-1 rounded-md inline-flex items-center gap-1">
                  <IconLocation className="w-3.5 h-3.5" aria-hidden="true" />
                  {activeOffer.originProvince} ({activeOffer.originCity})
                  </span>
                </div>
              </div>
            </div>

            {/* Product Specifications & Description */}
            <div className="bg-white p-6 sm:p-8 rounded-3xl border border-stone-200 shadow-xs">
              <h2 className="text-xl font-bold text-stone-900 mb-4">
                Description & Caractéristiques du Produit
              </h2>
              <p className="text-sm text-stone-600 leading-relaxed mb-6 font-normal">
                {product.description}
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-6 border-t border-stone-100 text-xs">
                <div className="p-3 bg-stone-50 rounded-xl">
                  <span className="text-stone-400 block mb-1">Unité standard</span>
                  <strong className="text-stone-800 text-sm">{product.standardUnit}</strong>
                </div>
                <div className="p-3 bg-stone-50 rounded-xl">
                  <span className="text-stone-400 block mb-1">Qualité de ce lot</span>
                  <strong className="text-emerald-800 text-sm">{activeOffer.qualityGrade}</strong>
                </div>
                <div className="p-3 bg-stone-50 rounded-xl">
                  <span className="text-stone-400 block mb-1">Bassin de récolte</span>
                  <strong className="text-stone-800 text-sm">{activeOffer.originProvince}</strong>
                </div>
              </div>
            </div>

            {/* Multi-Seller Comparison Section */}
            <div className="bg-white p-6 sm:p-8 rounded-3xl border border-stone-200 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-xl font-bold text-stone-900">
                    Offres Disponibles pour ce Produit ({productOffers.length})
                  </h2>
                  <p className="text-xs text-stone-500">
                    Sélectionnez le vendeur de votre choix selon son prix, sa localisation et ses services.
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                {productOffers.map((offer) => {
                  const sInfo = translateSellerType(offer.sellerType);
                  const isSelected = offer.id === activeOffer.id;
                  const dualR = formatDualPrice(offer.retailPriceCdf, offer.retailPriceUsd, currency);
                  const dualW = offer.wholesalePriceCdf && offer.wholesalePriceUsd
                    ? formatDualPrice(offer.wholesalePriceCdf, offer.wholesalePriceUsd, currency)
                    : null;

                  return (
                    <div
                      key={offer.id}
                      onClick={() => setSelectedOfferId(offer.id)}
                      className={`p-5 rounded-2xl border transition cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                        isSelected
                          ? 'border-emerald-600 bg-emerald-50/40 ring-2 ring-emerald-600/20'
                          : 'border-stone-200 hover:border-stone-300 bg-white'
                      }`}
                    >
                      <div>
                        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${sInfo.badgeClass}`}>
                            {sInfo.label}
                          </span>
                          <span className="text-xs font-bold text-stone-900">
                            {offer.sellerName}
                          </span>
                          <span className="text-xs text-stone-500 inline-flex items-center gap-1">
                            <IconLocation className="w-3.5 h-3.5" aria-hidden="true" />
                            {offer.originProvince} ({offer.originCity})
                          </span>
                        </div>
                        <p className="text-xs text-stone-500 mb-2">
                          Stock certifié : <strong className="text-emerald-800">{offer.stockQuantity} {offer.unit}s</strong>
                        </p>
                        {offer.servicesOffered.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {offer.servicesOffered.map((srv) => (
                              <span key={srv} className="text-[10px] bg-stone-100 text-stone-600 px-1.5 py-0.5 rounded font-medium">
                                ✓ {srv}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="text-left sm:text-right shrink-0">
                        <span className="text-[11px] text-stone-500 block">Détail :</span>
                        <span className="text-lg font-black text-stone-900">{dualR.primary}</span>
                        {dualW && (
                          <span className="text-xs font-bold text-emerald-800 block">
                            Gros : {dualW.primary}
                          </span>
                        )}
                        <Button
                          variant={isSelected ? 'primary' : 'outline'}
                          size="sm"
                          className="mt-2 w-full sm:w-auto"
                        >
                          {isSelected ? 'Offre sélectionnée' : 'Sélectionner'}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right Checkout & Calculator Card */}
          <div className="lg:col-span-5">
            <div className="bg-white p-6 sm:p-8 rounded-3xl border border-stone-200 sticky top-28 shadow-lg">
              <span className="text-xs font-bold uppercase tracking-wider text-orange-700 bg-orange-50 px-3 py-1 rounded-full border border-orange-200 mb-4 inline-block">
                Calculateur de Commande
              </span>

              <h2 className="text-xl font-bold text-stone-900 mb-1">
                Acheter auprès de : {activeOffer.sellerName}
              </h2>
              <p className="text-xs text-stone-500 mb-6 flex items-center gap-1">
                <IconLocation className="w-3.5 h-3.5 text-stone-400" />
                Départ : {activeOffer.originCity}, {activeOffer.originProvince}
              </p>

              {/* Price Tier Callout */}
              <div className="bg-stone-50 p-4 rounded-2xl border border-stone-200/80 mb-6 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-stone-500 font-medium">Tarif appliqué :</span>
                  <Badge variant={isWholesale ? 'green' : 'stone'}>
                    {isWholesale ? 'Tarif de Gros Appliqué' : 'Tarif au Détail'}
                  </Badge>
                </div>
                <div className="flex items-baseline justify-between">
                  <span className="text-xs text-stone-600">Prix unitaire par {activeOffer.unit} :</span>
                  <div className="text-right">
                    <span className="text-2xl font-black text-stone-900">{dualUnitPrices.primary}</span>
                    <span className="text-xs text-stone-400 block">{dualUnitPrices.secondary}</span>
                  </div>
                </div>
                {activeOffer.wholesaleMinQuantity && !isWholesale && (
                  <p className="text-[11px] text-amber-800 bg-amber-50 p-2 rounded-lg border border-amber-200">
                    Astuce grossiste : Commandez <strong>{activeOffer.wholesaleMinQuantity} {activeOffer.unit}s</strong> ou plus pour débloquer le prix de gros à{' '}
                    <strong>
                      {currency === 'CDF'
                        ? `${activeOffer.wholesalePriceCdf?.toLocaleString('fr-FR')} FC`
                        : `${activeOffer.wholesalePriceUsd?.toFixed(2)} $`}
                    </strong>
                    .
                  </p>
                )}
              </div>

              {/* Quantity Selector */}
              <div className="mb-6">
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-2">
                  Quantité ({activeOffer.unit}s)
                </label>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => Math.max(activeOffer.retailMinQuantity, q - 1))}
                    className="w-11 h-11 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 font-black text-lg flex items-center justify-center transition"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    min={activeOffer.retailMinQuantity}
                    max={activeOffer.stockQuantity}
                    value={quantity}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      if (val >= 1 && val <= activeOffer.stockQuantity) {
                        setQuantity(val);
                      }
                    }}
                    className="w-24 text-center font-black text-lg p-2.5 bg-stone-50 border border-stone-200 rounded-xl outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => Math.min(activeOffer.stockQuantity, q + 1))}
                    className="w-11 h-11 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 font-black text-lg flex items-center justify-center transition"
                  >
                    +
                  </button>
                  <span className="text-xs text-stone-500 font-medium">
                    Max : {activeOffer.stockQuantity} {activeOffer.unit}s
                  </span>
                </div>
              </div>

              {/* Total Summary */}
              <div className="border-t border-stone-200 pt-5 mb-6 space-y-2">
                <div className="flex justify-between items-baseline">
                  <span className="text-sm font-bold text-stone-800">Sous-total :</span>
                  <div className="text-right">
                    <span className="text-2xl font-black text-emerald-800">{dualTotalPrices.primary}</span>
                    <span className="text-xs text-stone-400 block">{dualTotalPrices.secondary}</span>
                  </div>
                </div>
                <p className="text-[11px] text-stone-400">
                  Frais de livraison calculés à l&apos;étape de livraison selon votre commune/ville en RDC.
                </p>
              </div>

              {/* Cart Buttons */}
              <div className="space-y-3">
                <Button
                  variant="accent"
                  size="lg"
                  className="w-full shadow-md"
                  onClick={handleAddToCart}
                >
                  {addedToCart ? '✓ Ajouté au panier !' : 'Ajouter au Panier'}
                </Button>
                <Link href={`/vendeurs/${activeOffer.sellerId}`} className="block">
                  <Button variant="outline" size="md" className="w-full">
                    Visiter la boutique de {activeOffer.sellerName}
                  </Button>
                </Link>
              </div>

              {/* Trust Box */}
              <div className="mt-6 pt-6 border-t border-stone-100 text-xs text-stone-500 space-y-2.5">
                <div className="flex items-center gap-2">
                  <IconShieldCheck className="w-4 h-4 text-emerald-700 shrink-0" />
                  <span>Paiement sécurisé par Mobile Money (M-Pesa, Orange, Airtel, Afrimoney)</span>
                </div>
                <div className="flex items-center gap-2">
                  <IconTruck className="w-4 h-4 text-emerald-700 shrink-0" />
                  <span>Suivi d&apos;acheminement avec numéro de bordereau horodaté</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
