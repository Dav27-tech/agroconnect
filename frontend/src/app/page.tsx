import React from 'react';
import { Hero } from '../components/marketplace/Hero';
import { RoleHighlights } from '../components/marketplace/RoleHighlights';
import { CategoriesSection } from '../components/marketplace/CategoriesSection';
import { FeaturedOffers } from '../components/marketplace/FeaturedOffers';
import { HowItWorks } from '../components/marketplace/HowItWorks';
import { DrcTrustBanner } from '../components/marketplace/DrcTrustBanner';

export default function HomePage() {
  return (
    <>
      <Hero />
      <RoleHighlights />
      <CategoriesSection />
      <FeaturedOffers />
      <HowItWorks />
      <DrcTrustBanner />
    </>
  );
}
