'use client';

import React from 'react';
import { CurrencyProvider } from '../context/CurrencyContext';
import { Navbar } from '../components/layout/Navbar';
import { Footer } from '../components/layout/Footer';
import { Hero } from '../components/marketplace/Hero';
import { RoleHighlights } from '../components/marketplace/RoleHighlights';
import { CategoriesSection } from '../components/marketplace/CategoriesSection';
import { FeaturedOffers } from '../components/marketplace/FeaturedOffers';
import { HowItWorks } from '../components/marketplace/HowItWorks';
import { DrcTrustBanner } from '../components/marketplace/DrcTrustBanner';

export default function HomePage() {
  return (
    <CurrencyProvider>
      <div className="min-h-screen flex flex-col bg-white text-stone-900 selection:bg-emerald-100 selection:text-emerald-900">
        <Navbar />
        <main className="flex-1">
          <Hero />
          <RoleHighlights />
          <CategoriesSection />
          <FeaturedOffers />
          <HowItWorks />
          <DrcTrustBanner />
        </main>
        <Footer />
      </div>
    </CurrencyProvider>
  );
}
