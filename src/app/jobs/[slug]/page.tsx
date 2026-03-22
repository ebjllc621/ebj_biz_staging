/**
 * Job Detail Page - Server Component
 *
 * @component Server Component (NO hooks, NO browser APIs)
 * @tier ADVANCED
 * @phase Jobs Phase R2 - Detail Page Remediation
 * @generated DNA v11.4.0
 * @governance Build Map v2.1 ENHANCED
 *
 * Server Component wrapper with SEO metadata, JSON-LD structured data, and ErrorBoundary protection.
 * Wraps JobDetailClient for client-side interactivity.
 */

import type { Metadata, ResolvingMetadata } from 'next';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { JobDetailClient } from './JobDetailClient';
import { getJobService, getListingService, getSEOService } from '@core/services/ServiceRegistry';
import { ErrorService } from '@core/services/ErrorService';

interface JobDetailPageProps {
  params: Promise<{ slug: string }>;
}

/**
 * Generate dynamic SEO metadata for job detail page
 * Enhanced with job title, company, location, OpenGraph, and Twitter Cards
 */
export async function generateMetadata(
  { params }: JobDetailPageProps,
  parent: ResolvingMetadata
): Promise<Metadata> {
  const { slug } = await params;

  try {
    const jobService = getJobService();
    const job = await jobService.getBySlug(slug);

    if (!job) {
      return {
        title: 'Job Not Found | Bizconekt',
        description: 'The requested job posting could not be found.',
        robots: { index: false, follow: false }
      };
    }

    // Generate meta description
    const companyName = job.listing_name || 'Local Business';
    const locationText = job.city && job.state ? `${job.city}, ${job.state}` : 'Local';
    const metaDescription = `${job.title} at ${companyName} in ${locationText}. ${job.description?.substring(0, 100)}...`;

    // Compensation text for SEO
    const compensationText = job.compensation_min && job.compensation_max
      ? `$${job.compensation_min.toLocaleString()} - $${job.compensation_max.toLocaleString()}`
      : '';

    // Generate canonical URL
    const canonicalUrl = `https://bizconekt.com/jobs/${job.slug}`;

    // Cover image (job or listing)
    const coverImage = job.listing_logo || 'https://bizconekt.com/images/default-job.jpg';

    return {
      title: `${job.title} at ${companyName} | Bizconekt Jobs`,
      description: metaDescription,

      // OpenGraph (Facebook, LinkedIn, WhatsApp)
      openGraph: {
        type: 'website',
        title: `${job.title} - ${companyName}`,
        description: metaDescription,
        url: canonicalUrl,
        siteName: 'Bizconekt',
        locale: 'en_US',
        images: [
          {
            url: coverImage,
            width: 1200,
            height: 630,
            alt: `${job.title} at ${companyName}`
          }
        ]
      },

      // Twitter Card
      twitter: {
        card: 'summary_large_image',
        site: '@bizconekt',
        title: `${job.title} - ${companyName}`,
        description: metaDescription,
        images: [coverImage]
      },

      // Robots & Crawlers
      robots: {
        index: job.status === 'active',
        follow: true,
        nocache: false,
        googleBot: {
          index: job.status === 'active',
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
        job.title,
        job.employment_type,
        companyName,
        job.city,
        job.state,
        'jobs',
        'careers',
        'employment'
      ].filter(Boolean) as string[],

      // Category
      category: 'Jobs'
    };
  } catch (error) {
    ErrorService.capture('Error generating job metadata:', error);
    return {
      title: 'Job Details - Bizconekt',
      description: 'View detailed job information, requirements, and apply.'
    };
  }
}

/**
 * Error fallback component for job details page
 */
function JobDetailPageError() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-md mx-auto text-center bg-red-50 border border-red-200 rounded-lg p-8">
        <h2 className="text-2xl font-bold text-red-800 mb-4">
          Unable to Load Job
        </h2>
        <p className="text-red-700 mb-6">
          We encountered an error while loading this job posting. Please try refreshing the page.
        </p>
        <a
          href="/jobs"
          className="inline-block px-6 py-3 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
        >
          Back to Jobs
        </a>
      </div>
    </div>
  );
}

/**
 * Fetch job and listing data server-side for optimal LCP
 */
async function getJobData(slug: string) {
  try {
    const jobService = getJobService();
    const job = await jobService.getBySlug(slug);

    if (!job) {
      return { job: null, listing: null };
    }

    // Fetch listing if job has business_id
    let listing = null;
    if (job.business_id) {
      const listingService = getListingService();
      listing = await listingService.getById(job.business_id);
    }

    return { job, listing };
  } catch (error) {
    ErrorService.capture('Error fetching job data:', error);
    return { job: null, listing: null };
  }
}

/**
 * Generate Schema.org JobPosting structured data
 * Only for Preferred/Premium tier listings
 */
async function generateStructuredData(jobId: number, listingTier?: string) {
  // Only generate for Preferred/Premium tiers
  if (listingTier !== 'preferred' && listingTier !== 'premium') {
    return null;
  }

  try {
    const seoService = getSEOService();
    return await seoService.generateJobPostingSchema(jobId);
  } catch (error) {
    ErrorService.capture('Error generating job structured data:', error);
    return null;
  }
}

/**
 * Job Detail Page - Server Component
 */
export default async function JobDetailPage({ params }: JobDetailPageProps) {
  const { slug } = await params;

  // Fetch data server-side for optimal LCP
  const { job, listing } = await getJobData(slug);

  // Generate structured data for SEO (Preferred/Premium only)
  const structuredData = job
    ? await generateStructuredData(job.id, listing?.tier)
    : null;

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
        fallback={<JobDetailPageError />}
        isolate={true}
        componentName="JobDetailPage"
      >
        <JobDetailClient
          slug={slug}
          initialJob={job}
          initialListing={listing}
        />
      </ErrorBoundary>
    </>
  );
}
