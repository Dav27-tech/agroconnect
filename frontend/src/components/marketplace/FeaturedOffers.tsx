'use client';

import React from 'react';
import { useCurrency } from '../../context/CurrencyContext';
import { formatDualPrice, translateSellerType } from '../../utils/format';
import { SellerOfferItem } from '../../types';

export function FeaturedOffers() {
  const { currency } = useCurrency();

  const offers: SellerOfferItem[] = [
    {
      id: 'off-manioc-kikwit-01',
      sellerId: 'seller-kikwit-01',
      sellerName: 'Coopérative Agricole du Kwilu (COOPAK)',
      sellerType: 'FARMER',
      productId: 'prod-manioc-doux',
      productName: 'Manioc Frais Doux',
      categoryName: 'Tubercules & Racines',
      unit: 'Sac de 50kg',
      stockQuantity: 450,
      isAvailable: true,
      retailPriceCdf: 35000,
      retailPriceUsd: 12.28,
      retailMinQuantity: 1,
      wholesalePriceCdf: 28500,
      wholesalePriceUsd: 10.0,
      wholesaleMinQuantity: 10,
      servicesOffered: ['Tri manuel', 'Conditionnement sac étanche'],
      qualityGrade: 'Grade 1 Frais',
      originProvince: 'Kwilu',
      originCity: 'Kikwit',
    },
    {
      id: 'off-manioc-kin-reseller',
      sellerId: 'seller-kin-02',
      sellerName: 'AgroDistrib Kinshasa Express',
      sellerType: 'RESELLER',
      productId: 'prod-manioc-doux',
      productName: 'Manioc Frais Lavé & Épluché',
      categoryName: 'Tubercules & Racines',
      unit: 'Sac de 50kg',
      stockQuantity: 85,
      isAvailable: true,
      retailPriceCdf: 42000,
      retailPriceUsd: 14.73,
      retailMinQuantity: 1,
      wholesalePriceCdf: 36000,
      wholesalePriceUsd: 12.63,
      wholesaleMinQuantity: 5,
      servicesOffered: ['Livraison Express Kinshasa', 'Lavage & Épluchage', 'Garantie fraîcheur 48h'],
      qualityGrade: 'Prêt à la transformation',
      originProvince: 'Kinshasa',
      originCity: 'Kinshasa (Marché de la Liberté)',
    },
    {
      id: 'off-mais-katanga-01',
      sellerId: 'seller-katanga-03',
      sellerName: 'Intrants du Sud (Katanga Agro-Tech)',
      sellerType: 'SUPPLIER',
      productId: 'prod-mais-grain-jaune',
      productName: 'Maïs Grain Jaune Séché',
      categoryName: 'Céréales & Grains',
      unit: 'Sac de 100kg',
      stockQuantity: 1200,
      isAvailable: true,
      retailPriceCdf: 110000,
      retailPriceUsd: 38.6,
      retailMinQuantity: 1,
      wholesalePriceCdf: 95000,
      wholesalePriceUsd: 33.33,
      wholesaleMinQuantity: 20,
      servicesOffered: ['Contrôle d\'humidité certifié', 'Aide au chargement'],
      qualityGrade: 'Standard Minoterie',
      originProvince: 'Haut-Katanga',
      originCity: 'Lubumbashi',
    },
    {
      id: 'off-pondu-kikwit-01',
      sellerId: 'seller-kikwit-01',
      sellerName: 'Coopérative Agricole du Kwilu (COOPAK)',
      sellerType: 'FARMER',
      productId: 'prod-pondu-frais',
      productName: 'Feuilles de Manioc (Pondu Frais)',
      categoryName: 'Légumes & Maraîchage',
      unit: 'Grande Botte',
      stockQuantity: 600,
      isAvailable: true,
      retailPriceCdf: 3000,
      retailPriceUsd: 1.05,
      retailMinQuantity: 3,
      wholesalePriceCdf: 2200,
      wholesalePriceUsd: 0.77,
      wholesaleMinQuantity: 30,
      servicesOffered: ['Cueillette le matin'],
      qualityGrade: 'Extra Tendre',
      originProvince: 'Kwilu',
      originCity: 'Kikwit',
    },
  ];

  return (
    <section className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-4">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-orange-700 bg-orange-50 px-3 py-1 rounded-full border border-orange-200">
              Offres Vendeurs en Direct
            </span>
            <h2 className="text-3xl font-black text-stone-900 mt-3">
              Productions disponibles en temps réel
            </h2>
            <p className="text-sm text-stone-600 mt-1 max-w-2xl">
              Stock physique certifié disponible. Comparez les conditions de vente (détail vs gros) et commandez en FC ou en USD.
            </p>
          </div>
          <div className="text-xs text-stone-500 bg-stone-50 px-3.5 py-2 rounded-xl border border-stone-200 self-start md:self-auto">
            Affichage actif : <strong className="text-emerald-800">{currency === 'CDF' ? 'Francs Congolais (FC)' : 'Dollars Américains ($)'}</strong>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {offers.map((offer) => {
            const sellerInfo = translateSellerType(offer.sellerType);
            const retailPrices = formatDualPrice(offer.retailPriceCdf, offer.retailPriceUsd, currency);
            const wholesalePrices = offer.wholesalePriceCdf && offer.wholesalePriceUsd
              ? formatDualPrice(offer.wholesalePriceCdf, offer.wholesalePriceUsd, currency)
              : null;

            return (
              <div
                key={offer.id}
                className="bg-white rounded-2xl border border-stone-200 p-5 flex flex-col justify-between hover:shadow-lg transition"
              >
                <div>
                  {/* Top Tag & Province */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${sellerInfo.badgeClass}`}>
                      {sellerInfo.label}
                    </span>
                    <span className="text-[11px] font-semibold text-stone-500 flex items-center gap-1">
                      📍 {offer.originProvince}
                    </span>
                  </div>

                  {/* Product Title & Common Catalogue reference */}
                  <h3 className="text-base font-bold text-stone-900 leading-snug mb-1">
                    {offer.productName}
                  </h3>
                  <p className="text-xs text-stone-500 mb-3 font-medium">
                    {offer.sellerName} • {offer.originCity}
                  </p>

                  {/* Stock physique unique partagé */}
                  <div className="bg-stone-50 rounded-lg p-2.5 mb-4 border border-stone-100 flex items-center justify-between text-xs">
                    <span className="text-stone-500 font-medium">Stock disponible :</span>
                    <span className="font-bold text-emerald-800">
                      {offer.stockQuantity} {offer.unit}s
                    </span>
                  </div>

                  {/* Prix Détail & Gros */}
                  <div className="space-y-2.5 mb-5">
                    {/* Détail */}
                    <div className="flex items-baseline justify-between border-b border-stone-100 pb-2">
                      <div>
                        <span className="text-[11px] text-stone-500 block font-medium">Prix Détail (Min. {offer.retailMinQuantity}) :</span>
                      </div>
                      <div className="text-right">
                        <span className="text-base font-black text-stone-900">{retailPrices.primary}</span>
                        <span className="text-[10px] text-stone-400 block">{retailPrices.secondary}</span>
                      </div>
                    </div>

                    {/* Gros */}
                    {wholesalePrices && offer.wholesaleMinQuantity && (
                      <div className="flex items-baseline justify-between pt-1">
                        <div>
                          <span className="text-[11px] text-emerald-800 block font-semibold">
                            Prix de Gros (Dès {offer.wholesaleMinQuantity}) :
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-sm font-extrabold text-emerald-800">{wholesalePrices.primary}</span>
                          <span className="text-[10px] text-stone-400 block">{wholesalePrices.secondary}</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Services additionnels */}
                  {offer.servicesOffered.length > 0 && (
                    <div className="mb-4">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block mb-1">
                        Services inclus :
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {offer.servicesOffered.map((s) => (
                          <span
                            key={s}
                            className="text-[10px] bg-stone-100 text-stone-600 px-2 py-0.5 rounded font-medium"
                          >
                            ✓ {s}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Card CTA */}
                <button
                  type="button"
                  className="w-full bg-emerald-800 hover:bg-emerald-700 text-white font-bold text-xs py-2.5 rounded-xl transition shadow-xs mt-2"
                >
                  Ajouter au panier
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

