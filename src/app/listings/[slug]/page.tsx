/**
 * Listing Details Page - Server Component
 *
 * @component Server Component (NO hooks, NO browser APIs)
 * @tier ADVANCED
 * @phase Phase 9 - Performance & SEO (Enhanced Metadata + Structured Data)
 * @generated DNA v11.4.0
 * @governance Build Map v2.1 ENHANCED
 * @authority .cursor/rules/admin-build-map-v2.1.mdc
 * @authority .cursor/rules/react18-nextjs14-governance.mdc
 *
 * Server Component wrapper with enhanced SEO metadata, structured data, and ErrorBoundary protection.
 * Wraps ListingDetailsClient for client-side interactivity.
 *
 * @see docs/pages/layouts/listings/details/MASTER_BRAIN_PLAN.md
 * @see docs/pages/layouts/listings/details/phases/PHASE_9_BRAIN_PLAN.md
 */

import type { Metadata, ResolvingMetadata } from 'next';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { ListingDetailsClient } from './ListingDetailsClient';
import { getListingService, getCategoryService } from '@core/services/ServiceRegistry';
import type { BusinessHour, SocialMedia } from '@core/services/ListingService';
import { ErrorService } from '@core/services/ErrorService';
import { getDatabaseService } from '@core/services/DatabaseService';
import { bigIntToNumber } from '@core/utils/bigint';

/** Category information for multi-category support */
interface CategoryInfo {
  id: number;
  name: string;
  slug: string;
}

interface ListingDetailsPageProps {
  params: Promise<{ slug: string }>;
}

/**
 * Generate dynamic SEO metadata for listing details page
 * Enhanced with actual listing data, structured data, OpenGraph, and Twitter Cards
 */
export async function generateMetadata(
  { params }: ListingDetailsPageProps,
  parent: ResolvingMetadata
): Promise<Metadata> {
  const { slug } = await params;

  try {
    // Fetch listing data server-side for SEO
    const listingService = getListingService();
    const listing = await listingService.getBySlug(slug);

    if (!listing) {
      return {
        title: 'Listing Not Found | Bizconekt',
        description: 'The requested business listing could not be found.',
        robots: { index: false, follow: false }
      };
    }

    // Generate meta description
    const metaDescription =
      listing.meta_description ||
      (listing.description ? listing.description.substring(0, 160) : null) ||
      listing.slogan ||
      `${listing.name} - Find contact information, hours, and more on Bizconekt.`;

    // Generate cover image URL
    const coverImage = listing.cover_image_url || listing.logo_url || 'https://bizconekt.com/images/default-listing.jpg';

    // Generate canonical URL
    const canonicalUrl = `https://bizconekt.com/listings/${listing.slug}`;

    // Resolve category names for SEO keywords (multi-category support)
    let categoryNames: string[] = [];
    const categoryService = getCategoryService();

    if (listing.active_categories && Array.isArray(listing.active_categories) && listing.active_categories.length > 0) {
      try {
        const categoryPromises = listing.active_categories.map(id => categoryService.getById(id));
        const resolvedCategories = await Promise.all(categoryPromises);
        categoryNames = resolvedCategories
          .filter((cat): cat is NonNullable<typeof cat> => cat !== null)
          .map(cat => cat.name);
      } catch (error) {
        ErrorService.capture('Failed to fetch categories for SEO:', error);
      }
    } else if (listing.category_id) {
      try {
        const category = await categoryService.getById(listing.category_id);
        if (category) {
          categoryNames = [category.name];
        }
      } catch (error) {
        ErrorService.capture('Failed to fetch category for SEO:', error);
      }
    }

    // Generate keywords (filter out null/undefined values) - includes all category names
    const keywords = [
      listing.name,
      listing.type,
      listing.city,
      listing.state,
      ...categoryNames, // Include all category names for SEO
      ...(listing.keywords || []),
      ...(listing.meta_keywords ? listing.meta_keywords.split(',').map((k: string) => k.trim()) : [])
    ].filter((k): k is string => Boolean(k));

    return {
      title: listing.meta_title || `${listing.name} | Bizconekt`,
      description: metaDescription,

      // OpenGraph (Facebook, LinkedIn, WhatsApp)
      openGraph: {
        type: 'website',
        title: listing.name,
        description: metaDescription,
        url: canonicalUrl,
        siteName: 'Bizconekt',
        locale: 'en_US',
        images: [
          {
            url: coverImage,
            width: 1200,
            height: 630,
            alt: `${listing.name} - ${listing.type || 'Business'}`
          }
        ]
      },

      // Twitter Card
      twitter: {
        card: 'summary_large_image',
        site: '@bizconekt',
        title: listing.name,
        description: metaDescription,
        images: [coverImage]
      },

      // Robots & Crawlers
      robots: {
        index: listing.status === 'active' && listing.approved === 'approved',
        follow: true,
        nocache: false,
        googleBot: {
          index: listing.status === 'active' && listing.approved === 'approved',
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

      // Authors
      authors: listing.contact_name ? [{ name: listing.contact_name }] : undefined,

      // Category
      category: listing.type || 'Business',

      // Keywords
      keywords: keywords,

      // Additional meta tags
      other: {
        'format-detection': 'telephone=yes',
        'rating': 'general',
        'revisit-after': '7 days'
      }
    };
  } catch (error) {
    ErrorService.capture('Error generating metadata:', error);
    return {
      title: 'Business Details - Bizconekt',
      description: 'View detailed business information, contact details, and more.'
    };
  }
}

/**
 * Error fallback component for listing details page
 */
function ListingDetailsPageError() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-md mx-auto text-center bg-red-50 border border-red-200 rounded-lg p-8">
        <h2 className="text-2xl font-bold text-red-800 mb-4">
          Unable to Load Listing
        </h2>
        <p className="text-red-700 mb-6">
          We encountered an error while loading this listing. Please try refreshing the page.
        </p>
        <a
          href="/listings"
          className="inline-block px-6 py-3 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
        >
          Back to Listings
        </a>
      </div>
    </div>
  );
}

/**
 * Fetch listing data server-side for optimal LCP
 * Eliminates client-side fetch delay
 *
 * Returns categories array from active_categories (multi-category support).
 * Falls back to category_id (single category) if active_categories is null/empty.
 */
async function getListingData(slug: string) {
  try {
    const listingService = getListingService();
    const listing = await listingService.getBySlug(slug);

    if (!listing) {
      return { listing: null, categories: [], categoryName: null, categorySlug: null };
    }

    let categories: CategoryInfo[] = [];
    const categoryService = getCategoryService();

    // Prefer active_categories array if populated
    if (listing.active_categories && Array.isArray(listing.active_categories) && listing.active_categories.length > 0) {
      try {
        // Resolve all category IDs to full category info
        const categoryPromises = listing.active_categories.map(id => categoryService.getById(id));
        const resolvedCategories = await Promise.all(categoryPromises);
        categories = resolvedCategories
          .filter((cat): cat is NonNullable<typeof cat> => cat !== null)
          .map(cat => ({
            id: cat.id,
            name: cat.name,
            slug: cat.slug
          }));
      } catch (error) {
        ErrorService.capture('Failed to fetch active_categories:', error);
      }
    }

    // Fallback to category_id if no active_categories
    if (categories.length === 0 && listing.category_id) {
      try {
        const category = await categoryService.getById(listing.category_id);
        if (category) {
          categories = [{
            id: category.id,
            name: category.name,
            slug: category.slug
          }];
        }
      } catch (error) {
        ErrorService.capture('Failed to fetch category:', error);
      }
    }

    // Legacy fields for backwards compatibility
    const categoryName = categories[0]?.name || null;
    const categorySlug = categories[0]?.slug || null;

    return { listing, categories, categoryName, categorySlug };
  } catch (error) {
    ErrorService.capture('Error fetching listing data:', error);
    return { listing: null, categories: [], categoryName: null, categorySlug: null };
  }
}

/**
 * Generate structured data (JSON-LD) for listing
 * Includes multi-category support for enhanced SEO
 */
async function generateStructuredData(slug: string) {
  try {
    const listingService = getListingService();
    const listing = await listingService.getBySlug(slug);
    if (!listing) return null;

    // Resolve category names for structured data (multi-category support)
    let categoryNames: string[] = [];
    const categoryService = getCategoryService();

    if (listing.active_categories && Array.isArray(listing.active_categories) && listing.active_categories.length > 0) {
      try {
        const categoryPromises = listing.active_categories.map(id => categoryService.getById(id));
        const resolvedCategories = await Promise.all(categoryPromises);
        categoryNames = resolvedCategories
          .filter((cat): cat is NonNullable<typeof cat> => cat !== null)
          .map(cat => cat.name);
      } catch (error) {
        ErrorService.capture('Failed to fetch categories for structured data:', error);
      }
    } else if (listing.category_id) {
      try {
        const category = await categoryService.getById(listing.category_id);
        if (category) {
          categoryNames = [category.name];
        }
      } catch (error) {
        ErrorService.capture('Failed to fetch category for structured data:', error);
      }
    }

    // Build Schema.org LocalBusiness structured data
    const structuredData = {
      '@context': 'https://schema.org',
      '@type': 'LocalBusiness',
      '@id': `https://bizconekt.com/listings/${listing.slug}`,
      name: listing.name,
      description: listing.description || listing.slogan || undefined,
      // Include all category names in knowsAbout for multi-category SEO
      knowsAbout: categoryNames.length > 0 ? categoryNames : undefined,
      image: [
        listing.logo_url,
        listing.cover_image_url,
        ...(listing.gallery_images || []).slice(0, 5)
      ].filter(Boolean),
      url: listing.website || `https://bizconekt.com/listings/${listing.slug}`,
      telephone: listing.phone || undefined,
      email: listing.email || undefined,
      address: listing.address ? {
        '@type': 'PostalAddress',
        streetAddress: listing.address,
        addressLocality: listing.city || undefined,
        addressRegion: listing.state || undefined,
        postalCode: listing.zip_code || undefined,
        addressCountry: listing.country || 'US'
      } : undefined,
      geo: listing.latitude && listing.longitude ? {
        '@type': 'GeoCoordinates',
        latitude: listing.latitude,
        longitude: listing.longitude
      } : undefined,
      openingHoursSpecification: listing.business_hours?.map((hour: BusinessHour) => ({
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: hour.day,
        opens: hour.open,
        closes: hour.close
      })),
      priceRange: listing.tier === 'premium' ? '$$$$' : listing.tier === 'preferred' ? '$$$' : listing.tier === 'plus' ? '$$' : '$',
      paymentAccepted: listing.payment_methods?.join(', '),
      logo: listing.logo_url || undefined,
      sameAs: listing.social_media ? [
        listing.social_media.facebook,
        listing.social_media.instagram,
        listing.social_media.twitter,
        listing.social_media.linkedin,
        listing.social_media.youtube
      ].filter((url): url is string => Boolean(url)) : undefined
    };

    // Enrich with sub-entity structured data (graceful degradation)
    const db = getDatabaseService();
    const [eventsResult, offersResult, jobsResult] = await Promise.allSettled([
      db.query<{ id: number; title: string; start_date: string; end_date: string }>(
        `SELECT id, title, start_date, end_date FROM events
         WHERE listing_id = ? AND status = 'active'
         ORDER BY start_date ASC LIMIT 5`,
        [listing.id]
      ),
      db.query<{ id: number; title: string; slug: string; sale_price: number | null; original_price: number | null }>(
        `SELECT id, title, slug, sale_price, original_price FROM offers
         WHERE listing_id = ? AND status = 'active'
         ORDER BY created_at DESC LIMIT 5`,
        [listing.id]
      ),
      db.query<{ id: number; title: string; employment_type: string | null }>(
        `SELECT id, title, employment_type FROM job_postings
         WHERE business_id = ? AND status = 'active'
         ORDER BY created_at DESC LIMIT 5`,
        [listing.id]
      ),
    ]);

    // Attach Schema.org Event nodes
    if (eventsResult.status === 'fulfilled' && eventsResult.value.rows.length > 0) {
      (structuredData as Record<string, unknown>).event = eventsResult.value.rows.map(ev => ({
        '@type': 'Event',
        name: ev.title,
        startDate: ev.start_date,
        endDate: ev.end_date,
        location: {
          '@type': 'Place',
          name: listing.name,
          address: listing.address || undefined,
        },
      }));
    }

    // Attach Schema.org Offer nodes
    if (offersResult.status === 'fulfilled' && offersResult.value.rows.length > 0) {
      (structuredData as Record<string, unknown>).hasOfferCatalog = {
        '@type': 'OfferCatalog',
        name: `${listing.name} Deals`,
        itemListElement: offersResult.value.rows.map(offer => ({
          '@type': 'Offer',
          name: offer.title,
          url: `https://bizconekt.com/offers/${offer.slug}`,
          price: offer.sale_price ?? offer.original_price ?? undefined,
          priceCurrency: 'USD',
        })),
      };
    }

    // Attach Schema.org JobPosting count (HiringOrganization hasJobPosting not in schema,
    // but we note availability via numberOfEmployees or a custom marker)
    if (jobsResult.status === 'fulfilled' && jobsResult.value.rows.length > 0) {
      (structuredData as Record<string, unknown>).hiringOrganization = {
        '@type': 'Organization',
        name: listing.name,
        numberOfOpenPositions: bigIntToNumber(jobsResult.value.rows.length),
      };
    }

    // Aggregate review data for AggregateRating (schema.org)
    try {
      const reviewResult = await db.query<{ avgRating: number; reviewCount: bigint | number }>(
        `SELECT AVG(rating) as avgRating, COUNT(*) as reviewCount
         FROM reviews WHERE listing_id = ? AND status = 'approved'`,
        [listing.id]
      );
      const reviewCount = bigIntToNumber(reviewResult.rows[0]?.reviewCount ?? 0);
      if (reviewCount > 0) {
        (structuredData as Record<string, unknown>).aggregateRating = {
          '@type': 'AggregateRating',
          ratingValue: parseFloat(String(reviewResult.rows[0]?.avgRating || 0)).toFixed(1),
          reviewCount: reviewCount,
          bestRating: 5,
          worstRating: 1
        };
      }
    } catch {
      // Graceful degradation — aggregateRating is optional
    }

    // Remove undefined fields
    return JSON.parse(JSON.stringify(structuredData));
  } catch (error) {
    ErrorService.capture('Error generating structured data:', error);
    return null;
  }
}

/**
 * Listing Details Page - Server Component
 *
 * Wraps content in ErrorBoundary for error handling.
 * Renders ListingDetailsClient with slug parameter.
 * Injects Schema.org JSON-LD structured data.
 */
export default async function ListingDetailsPage({ params }: ListingDetailsPageProps) {
  const { slug } = await params;

  // Fetch data server-side for optimal LCP (Phase 11)
  const { listing, categories, categoryName, categorySlug } = await getListingData(slug);

  // Generate structured data for SEO
  const structuredData = listing ? await generateStructuredData(slug) : null;

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
        fallback={<ListingDetailsPageError />}
        isolate={true}
        componentName="ListingDetailsPage"
      >
        <ListingDetailsClient
          slug={slug}
          initialListing={listing}
          initialCategories={categories}
          initialCategoryName={categoryName}
          initialCategorySlug={categorySlug}
        />
      </ErrorBoundary>
    </>
  );
}
