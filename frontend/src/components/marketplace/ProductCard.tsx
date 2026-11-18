'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { formatCdfPrice, translateSellerType } from '../../utils/format';
import { SellerOfferItem } from '../../types';
import { IconLocation, IconPlant } from '../ui/Icons';

export interface ProductCardProps {
  offer: SellerOfferItem;
}

export function ProductCard({ offer }: ProductCardProps) {
  const sellerInfo = translateSellerType(offer.sellerType);

  const retailPrice = formatCdfPrice(offer.retailPriceCdf);
  const wholesalePrice = offer.wholesalePriceCdf ? formatCdfPrice(offer.wholesalePriceCdf) : null;

  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-2xl border border-stone-200 bg-white transition duration-200 hover:border-emerald-300 hover:shadow-lg">
      <Link
        href={`/produits/${offer.productId}`}
        className="relative block h-40 overflow-hidden bg-stone-100 sm:h-44"
      >
        {offer.imageUrl ? (
          <Image
            src={offer.imageUrl}
            alt={offer.productName}
            fill
            unoptimized
            className="object-cover transition duration-300 group-hover:scale-105"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 33vw, 25vw"
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-emerald-50 text-emerald-700">
            <IconPlant className="h-10 w-10" aria-hidden="true" />
          </div>
        )}
        <span
          className={`absolute left-3 top-3 rounded-md border px-2 py-1 text-[10px] font-bold shadow-sm backdrop-blur-md ${sellerInfo.badgeClass}`}
        >
          {sellerInfo.label}
        </span>
        {offer.isFeatured && (
          <span className="absolute right-3 top-3 rounded-md bg-amber-400 px-2 py-1 text-[10px] font-bold text-amber-950">
            À la une
          </span>
        )}
        <span className="absolute bottom-3 left-3 inline-flex items-center gap-1 rounded-md bg-stone-900/80 px-2 py-1 text-[10px] font-bold text-white backdrop-blur-md">
          <IconLocation className="h-3 w-3" aria-hidden="true" />
          {offer.originProvince}
        </span>
      </Link>

      <div className="flex flex-1 flex-col p-4">
        <div className="mb-1 flex items-center justify-between gap-2 text-[11px] font-medium text-stone-500">
          <span className="truncate">{offer.categoryName}</span>
          {offer.qualityGrade && <span className="shrink-0 text-emerald-700">{offer.qualityGrade}</span>}
        </div>

        <Link href={`/produits/${offer.productId}`} className="mb-1">
          <h3 className="min-h-12 line-clamp-2 text-base font-bold text-stone-900 transition group-hover:text-emerald-800">
            {offer.productName}
          </h3>
        </Link>

        <Link
          href={`/vendeurs/${offer.sellerId}`}
          className="mb-3 block truncate text-xs font-medium text-stone-600 transition hover:text-emerald-800"
        >
          {offer.sellerName}
          {offer.originCity ? <span className="text-stone-400"> · {offer.originCity}</span> : null}
        </Link>

        <div className="mt-auto">
          <div className="mb-3 flex items-center justify-between rounded-lg bg-stone-50 px-3 py-2 text-xs">
            <span className="font-medium text-stone-500">
              {offer.isAvailable && offer.stockQuantity > 0 ? 'Disponible' : 'Stock épuisé'}
            </span>
            <span className={`font-bold ${offer.isAvailable && offer.stockQuantity > 0 ? 'text-emerald-800' : 'text-stone-500'}`}>
              {offer.stockQuantity} {offer.unit}
            </span>
          </div>

          <div className="mb-3 space-y-1.5 border-t border-stone-100 pt-3">
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-[11px] font-medium text-stone-500">Prix unitaire</span>
              <span className="text-sm font-black text-stone-900">{retailPrice}</span>
            </div>
            {wholesalePrice && offer.wholesaleMinQuantity && (
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-[11px] font-medium text-emerald-800">
                  Prix quantité · dès {offer.wholesaleMinQuantity}
                </span>
                <span className="text-xs font-bold text-emerald-800">{wholesalePrice}</span>
              </div>
            )}
          </div>

          <div className="border-t border-stone-100 pt-3">
            <Link
              href={`/produits/${offer.productId}`}
              className="flex w-full items-center justify-center rounded-xl bg-emerald-800 px-3 py-2 text-xs font-bold text-white transition hover:bg-emerald-700"
            >
              Voir le produit
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}
