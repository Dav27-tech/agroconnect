'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { MockSeller } from '../../data/mockData';
import { SellerProfile } from '../../types';
import { translateSellerType } from '../../utils/format';
import { Button } from '../ui/Button';
import { IconShieldCheck, IconStar, IconLocation } from '../ui/Icons';

export interface SellerCardProps {
  seller: MockSeller | SellerProfile;
}

export function SellerCard({ seller }: SellerCardProps) {
  const sellerInfo = translateSellerType(seller.sellerType);
  const coverUrl = (seller as MockSeller).coverUrl || 'https://images.unsplash.com/photo-1500937386664-56d1dfef3854?auto=format&fit=crop&q=80&w=800';
  const avatarUrl = (seller as MockSeller).avatarUrl || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=300';
  const rating = seller.rating ?? 4.8;
  const reviewsCount = seller.reviewsCount ?? 12;
  const totalSales = (seller as MockSeller).totalSales ?? 150;
  const specialties = (seller as MockSeller).specialties || ['Productions locales', 'Vente directe'];

  return (
    <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden hover:shadow-lg hover:border-emerald-300 transition duration-200 flex flex-col justify-between">
      <div>
        {/* Cover image */}
        <div className="relative h-24 w-full bg-emerald-900/10">
          <Image
            src={coverUrl}
            alt={seller.businessName}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 33vw"
          />
          <div className="absolute top-2.5 right-2.5">
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border shadow-xs ${sellerInfo.badgeClass}`}>
              {sellerInfo.label}
            </span>
          </div>
        </div>

        {/* Avatar & Header */}
        <div className="px-5 pt-0 pb-4">
          <div className="relative -mt-10 mb-3 flex items-end justify-between">
            <div className="relative w-16 h-16 rounded-2xl overflow-hidden border-2 border-white shadow-md bg-stone-100">
              <Image
                src={avatarUrl}
                alt={seller.businessName}
                fill
                className="object-cover"
              />
            </div>
            {seller.verificationStatus === 'VERIFIED' && (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                <IconShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
                Vérifié
              </span>
            )}
          </div>

          <Link href={`/vendeurs/${seller.id}`}>
            <h3 className="text-base font-bold text-stone-900 hover:text-emerald-800 transition line-clamp-1 mb-1">
              {seller.businessName}
            </h3>
          </Link>

          <p className="text-xs text-stone-500 flex items-center gap-1 mb-2">
            <IconLocation className="w-3.5 h-3.5 text-stone-400" />
            <span>{seller.city}, {seller.province}</span>
          </p>

          <p className="text-xs text-stone-600 line-clamp-2 mb-4 leading-relaxed font-normal">
            {seller.description}
          </p>

          {/* Rating & Sales */}
          <div className="flex items-center justify-between text-xs py-2 px-3 bg-stone-50 rounded-xl border border-stone-100 mb-4">
            <div className="flex items-center gap-1">
              <IconStar className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
              <strong className="text-stone-900">{rating}</strong>
              <span className="text-stone-400">({reviewsCount} avis)</span>
            </div>
            <div className="text-stone-500 font-medium">
              <strong className="text-stone-800">{totalSales}</strong> expéditions
            </div>
          </div>

          {/* Specialties */}
          <div className="flex flex-wrap gap-1 mb-2">
            {specialties.map((spec) => (
              <span
                key={spec}
                className="text-[10px] bg-stone-100 text-stone-600 px-2 py-0.5 rounded font-medium"
              >
                {spec}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="p-5 pt-0">
        <Link href={`/vendeurs/${seller.id}`} className="block">
          <Button variant="outline" size="sm" className="w-full">
            Accéder à la boutique
          </Button>
        </Link>
      </div>
    </div>
  );
}

