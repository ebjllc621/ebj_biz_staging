/**
 * Offer Detail Page - Server Component
 *
 * @component Server Component (NO hooks, NO browser APIs)
 * @tier ADVANCED
 * @phase Offers Phase 1 - Core CRUD & Display
 * @generated DNA v11.4.0
 * @governance Build Map v2.1 ENHANCED
 * @authority docs/pages/layouts/offers/build/phases/PHASE_1_CORE_CRUD_BRAIN_PLAN.md
 *
 * Server Component wrapper with SEO metadata, JSON-LD structured data, and ErrorBoundary protection.
 * Wraps OfferDetailClient for client-side interactivity (claim flow, share, etc.).
 */

import type { Metadata, ResolvingMetadata } from 'next';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { OfferDetailClient } from './OfferDetailClient';
import { getOfferService, getListingService, getSEOService } from '@core/services/ServiceRegistry';
import { ErrorService } from '@core/services/ErrorService';

interface OfferDetailPageProps {
  params: Promise<{ slug: string }>;
}

/**
 * Generate dynamic SEO metadata for offer detail page
 * Enhanced with offer title, business, savings, OpenGraph, and Twitter Cards
 */
export async function generateMetadata(
  { params }: OfferDetailPageProps,
  _parent: ResolvingMetadata
): Promise<Metadata> {
  const { slug } = await params;

  try {
    const offerService = getOfferService();
    const offer = await offerService.getOfferWithListing(slug);

    if (!offer) {
      return {
        title: 'Offer Not Found | Bizconekt',
        description: 'The requested offer could not be found.',
        robots: { index: false, follow: false }
      };
    }

    // Generate meta description
    const businessName = offer.listing_name || 'Local Business';
    const locationText = offer.city && offer.state ? `${offer.city}, ${offer.state}` : 'Local';

    // Calculate savings text
    let savingsText = '';
    if (offer.discount_percentage) {
      savingsText = `Save ${offer.discount_percentage}%`;
    } else if (offer.original_price && offer.sale_price) {
      const savings = offer.original_price - offer.sale_price;
      savingsText = `Save $${savings.toFixed(2)}`;
    }

    const metaDescription = `${savingsText} on ${offer.title} at ${businessName} in ${locationText}. ${offer.description?.substring(0, 100) || 'Limited time offer!'}`;

    // Generate canonical URL
    const canonicalUrl = `https://bizconekt.com/offers/${offer.slug}`;

    // Cover image (offer or listing)
    const coverImage = offer.image || offer.listing_logo || 'https://bizconekt.com/images/default-offer.jpg';

    return {
      title: `${offer.title} - ${savingsText} | ${businessName} | Bizconekt Offers`,
      description: metaDescription,

      // OpenGraph (Facebook, LinkedIn, WhatsApp)
      openGraph: {
        type: 'website',
        title: `${offer.title} - ${savingsText}`,
        description: metaDescription,
        url: canonicalUrl,
        siteName: 'Bizconekt',
        locale: 'en_US',
        images: [
          {
            url: coverImage,
            width: 1200,
            height: 630,
            alt: `${offer.title} at ${businessName}`
          }
        ]
      },

      // Twitter Card
      twitter: {
        card: 'summary_large_image',
        site: '@bizconekt',
        title: `${offer.title} - ${savingsText}`,
        description: metaDescription,
        images: [coverImage]
      },

      // Robots & Crawlers
      robots: {
        index: offer.status === 'active',
        follow: true,
        nocache: false,
        googleBot: {
          index: offer.status === 'active',
          follow: true,
          'max-video-preview': -1,
          'max-image-preview': 'large',
          'max-snippet': -1
        }
      },

      // Canonical URL
      alternates: {
        canonical: canonicalUrl,
        languages: {
          'en-US': canonicalUrl
        }
      },

      // Keywords
      keywords: [
        offer.title,
        offer.offer_type,
        businessName,
        offer.city,
        offer.state,
        'offers',
        'deals',
        'discounts',
        'savings'
      ].filter(Boolean) as string[],

      // Category
      category: 'Offers'
    };
  } catch (error) {
    ErrorService.capture('Error generating offer metadata:', error);
    return {
      title: 'Offer Details - Bizconekt',
      description: 'View detailed offer information and claim your discount.'
    };
  }
}

/**
 * Error fallback component for offer details page
 */
function OfferDetailPageError() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-md mx-auto text-center bg-red-50 border border-red-200 rounded-lg p-8">
        <h2 className="text-2xl font-bold text-red-800 mb-4">
          Unable to Load Offer
        </h2>
        <p className="text-red-700 mb-6">
          We encountered an error while loading this offer. Please try refreshing the page.
        </p>
        <a
          href="/offers"
          className="inline-block px-6 py-3 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
        >
          Back to Offers
        </a>
      </div>
    </div>
  );
}

/**
 * Fetch offer and listing data server-side for optimal LCP
 */
async function getOfferData(slug: string) {
  try {
    const offerService = getOfferService();
    const offer = await offerService.getOfferWithListing(slug);

    if (!offer) {
      return { offer: null, listing: null };
    }

    // Fetch full listing details
    let listing = null;
    if (offer.listing_id) {
      const listingService = getListingService();
      listing = await listingService.getById(offer.listing_id);
    }

    return { offer, listing };
  } catch (error) {
    ErrorService.capture('Error fetching offer data:', error);
    return { offer: null, listing: null };
  }
}

/**
 * Generate Schema.org Product + Offer structured data
 * For all tiers (Phase 1 requirement)
 */
async function generateStructuredData(offer: Awaited<ReturnType<typeof getOfferData>>['offer']) {
  if (!offer) return null;

  try {
    const structuredData = {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: offer.title,
      description: offer.description || offer.title,
      image: offer.image || undefined,
      brand: {
        '@type': 'Organization',
        name: offer.listing_name
      },
      offers: {
        '@type': 'Offer',
        price: offer.sale_price || offer.original_price || 0,
        priceCurrency: 'USD',
        availability: offer.status === 'active' && (offer.quantity_remaining === null || offer.quantity_remaining > 0)
          ? 'https://schema.org/InStock'
          : 'https://schema.org/OutOfStock',
        validFrom: offer.start_date.toISOString(),
        validThrough: offer.end_date.toISOString(),
        url: `https://bizconekt.com/offers/${offer.slug}`,
        seller: {
          '@type': 'Organization',
          name: offer.listing_name
        }
      }
    };

    return structuredData;
  } catch (error) {
    ErrorService.capture('Error generating offer structured data:', error);
    return null;
  }
}

/**
 * Offer Detail Page - Server Component
 */
export default async function OfferDetailPage({ params }: OfferDetailPageProps) {
  const { slug } = await params;

  // Fetch data server-side for optimal LCP
  const { offer, listing } = await getOfferData(slug);

  // Generate structured data for SEO
  const structuredData = await generateStructuredData(offer);

  return (
    <>
      {/* Schema.org JSON-LD Structured Data */}
      {structuredData && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
      )}

      <ErrorBoundary
        fallback={<OfferDetailPageError />}
        isolate={true}
        componentName="OfferDetailPage"
      >
        <OfferDetailClient
          slug={slug}
          initialOffer={offer}
          initialListing={listing}
        />
      </ErrorBoundary>
    </>
  );
}
