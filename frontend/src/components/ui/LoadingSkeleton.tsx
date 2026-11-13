import React from 'react';

export function ProductCardSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-stone-200 p-5 flex flex-col justify-between animate-pulse">
      <div>
        <div className="w-full h-44 bg-stone-200 rounded-xl mb-4" />
        <div className="h-4 bg-stone-200 rounded w-1/3 mb-2" />
        <div className="h-5 bg-stone-200 rounded w-3/4 mb-4" />
        <div className="h-10 bg-stone-100 rounded-lg mb-4" />
      </div>
      <div className="h-10 bg-stone-200 rounded-xl w-full" />
    </div>
  );
}

export function SellerCardSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-stone-200 p-6 animate-pulse">
      <div className="flex items-center gap-4 mb-4">
        <div className="w-14 h-14 bg-stone-200 rounded-full" />
        <div className="flex-1 space-y-2">
          <div className="h-5 bg-stone-200 rounded w-1/2" />
          <div className="h-3 bg-stone-200 rounded w-1/3" />
        </div>
      </div>
      <div className="space-y-2 mb-4">
        <div className="h-3 bg-stone-200 rounded w-full" />
        <div className="h-3 bg-stone-200 rounded w-5/6" />
      </div>
      <div className="h-9 bg-stone-200 rounded-xl w-full" />
    </div>
  );
}

