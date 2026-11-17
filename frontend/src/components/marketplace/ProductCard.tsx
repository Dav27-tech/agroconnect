'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { formatCdfPrice, translateSellerType } from '../../utils/format';
import { SellerOfferItem } from '../../types';
import { Button } from '../ui/Button';
import { IconLocation, IconPlant } from '../ui/Icons';

export interface ProductCardProps {
  offer: SellerOfferItem;
}

export function ProductCard({ offer }: ProductCardProps) {
  const sellerInfo = translateSellerType(offer.sellerType);

  const retailPrice = formatCdfPrice(offer.retailPriceCdf);
  const wholesalePrice = offer.wholesalePriceCdf ? formatCdfPrice(offer.wholesalePriceCdf) : null;

  return (
    <div className="bg-white rounded-2xl border border-stone-200 p-4 flex flex-col justify-between hover:shadow-xl hover:border-emerald-300 transition duration-200 group">
      <div>
        {/* Photo Réelle */}
        <div className="relative w-full h-48 rounded-xl overflow-hidden mb-3.5 bg-stone-100">
          {offer.imageUrl ? (
            <Image
              src={offer.imageUrl}
              alt={offer.productName}
              fill
              unoptimized
              className="object-cover group-hover:scale-105 transition duration-300"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-emerald-50 text-emerald-700">
              <IconPlant className="w-12 h-12" aria-hidden="true" />
            </div>
          )}

          {/* Badge Vendeur en superposition */}
          <div className="absolute top-2.5 left-2.5">
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-md border backdrop-blur-md shadow-xs ${sellerInfo.badgeClass}`}
            >
              {sellerInfo.label}
            </span>
          </div>

          {/* Badge Province RDC */}
          <div className="absolute bottom-2.5 left-2.5 bg-stone-900/80 backdrop-blur-md text-white text-[10px] font-bold px-2 py-1 rounded-md inline-flex items-center gap-1">
            <IconLocation className="w-3 h-3" aria-hidden="true" />
            {offer.originProvince}
          </div>
        </div>

        {/* Category & Title */}
        <div className="flex items-center justify-between text-[11px] text-stone-500 font-medium mb-1">
          <span>{offer.categoryName}</span>
          <span className="text-emerald-700 font-semibold">{offer.qualityGrade}</span>
        </div>

        <Link href={`/produits/${offer.productId}`}>
          <h3 className="text-base font-bold text-stone-900 group-hover:text-emerald-800 transition line-clamp-1 mb-1">
            {offer.productName}
          </h3>
        </Link>

        {/* Seller Info Link */}
        <Link
          href={`/vendeurs/${offer.sellerId}`}
          className="text-xs text-stone-600 hover:text-emerald-800 transition block mb-3 font-medium truncate"
        >
          {offer.sellerName} • <span className="text-stone-400">{offer.originCity}</span>
        </Link>

        {/* Stock physique unique partagé */}
        <div className="bg-stone-50 rounded-lg p-2 mb-3.5 border border-stone-100 flex items-center justify-between text-xs">
          <span className="text-stone-500 font-medium">Stock réel :</span>
          <span className="font-bold text-emerald-800">
            {offer.stockQuantity} {offer.unit}s
          </span>
        </div>

        {/* Prix Détail & Gros */}
        <div className="space-y-1.5 mb-4">
          <div className="flex items-baseline justify-between border-b border-stone-100 pb-1.5">
            <span className="text-[11px] text-stone-500 font-medium">
              Détail (dès {offer.retailMinQuantity}) :
            </span>
            <div className="text-right">
              <span className="text-base font-black text-stone-900">{retailPrice}</span>
            </div>
          </div>

          {wholesalePrice && offer.wholesaleMinQuantity && (
            <div className="flex items-baseline justify-between pt-0.5">
              <span className="text-[11px] text-emerald-800 font-bold">
                Gros (dès {offer.wholesaleMinQuantity}) :
              </span>
              <div className="text-right">
                <span className="text-sm font-extrabold text-emerald-800">{wholesalePrice}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-2 pt-2 border-t border-stone-100">
        <Link href={`/produits/${offer.productId}`} className="flex-1">
          <Button variant="primary" size="sm" className="w-full">
            Voir l&apos;offre
          </Button>
        </Link>
        <Link href={`/vendeurs/${offer.sellerId}`}>
          <Button variant="outline" size="sm" title="Voir le vendeur">
            Boutique
          </Button>
        </Link>
      </div>
    </div>
  );
}
