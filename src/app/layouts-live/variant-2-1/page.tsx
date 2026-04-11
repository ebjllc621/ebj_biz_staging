/**
 * Variant 2.1 — Bold Geometry Live
 *
 * Live React preview that ports variant-2.html's Bold Geometry styling
 * and injects the real production homepage scrollers plus SiteFooter.
 *
 * Chrome is bypassed by ClientLayout for /layouts-live/* routes.
 *
 * @tier SIMPLE (preview-only, no business logic)
 */
'use client';

import { useEffect, useState, useCallback } from 'react';
import nextDynamic from 'next/dynamic';
import { Star, Gift, Calendar, Clock, LayoutGrid } from 'lucide-react';

import SiteFooter from '@/components/SiteFooter';
import { ContentSlider } from '@features/homepage/components/ContentSlider';
import { CategoryIcon } from '@features/homepage/components/CategoryIcon';
import { ListingCard } from '@features/homepage/components/ListingCard';
import { OfferCard } from '@features/homepage/components/OfferCard';
import { EventCard } from '@features/homepage/components/EventCard';
import { TopRecommendersScroller } from '@features/homepage/components/TopRecommendersScroller';
import type { PublicHomeData } from '@features/homepage/types';

const FlashOffersSection = nextDynamic(
  () => import('@/features/offers/components/FlashOffersSection').then(m => ({ default: m.FlashOffersSection })),
  { ssr: false, loading: () => null }
);

const WhosHiringSection = nextDynamic(
  () => import('@features/jobs/components/WhosHiringSection').then(m => ({ default: m.WhosHiringSection })),
  { ssr: false, loading: () => null }
);

function SectionSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="h-6 w-32 bg-gray-200 rounded mb-4" />
      <div className="flex gap-4 overflow-hidden">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex-shrink-0 w-72 h-48 bg-gray-200 rounded-xl" />
        ))}
      </div>
    </div>
  );
}

export default function Variant21LivePage() {
  const [data, setData] = useState<PublicHomeData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Inject Google Fonts (Poppins + Space Mono) on mount to match variant-2.html verbatim
  useEffect(() => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href =
      'https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800;900&family=Space+Mono:wght@400;700&display=swap';
    document.head.appendChild(link);
    return () => {
      document.head.removeChild(link);
    };
  }, []);

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await fetch('/api/homepage/public', { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to load homepage data');
      const result = await response.json();
      setData(result.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return (
    <div className="v21-root">
      {/* ────────── NAV ────────── */}
      <nav className="v21-nav">
        <div className="v21-nav-inner">
          <img
            src="/uploads/site/branding/namelogo-horizontal.png"
            alt="Bizconekt"
            className="v21-nav-logo"
          />
          <div className="v21-nav-links">
            <a href="/listings">Listings</a>
            <a href="/events">Events</a>
            <a href="/offers">Offers</a>
            <a href="/jobs">Jobs</a>
            <a href="/register" className="v21-nav-cta">Join Free</a>
          </div>
        </div>
      </nav>

      {/* ────────── HERO ────────── */}
      <section className="v21-hero">
        <div className="v21-hero-bg" />
        <div className="v21-hero-inner">
          <div className="v21-hero-grid">
            <div>
              <div className="v21-hero-eyebrow">Business Network</div>
              <h1>
                Connect.
                <br />
                Discover.
                <br />
                <span className="v21-accent">Grow.</span>
              </h1>
              <p className="v21-hero-text">
                Your gateway to the local business community. Find services, connect with
                professionals, and discover opportunities.
              </p>
              <div className="v21-hero-actions">
                <button className="v21-btn-geo v21-btn-geo-primary">Join Bizconekt &rarr;</button>
                <button className="v21-btn-geo-secondary">Explore Listings</button>
              </div>
            </div>
            <div className="v21-hero-right">
              <div className="v21-geo-container">
                <div className="v21-geo-card">
                  <div className="v21-geo-number">
                    {data?.stats?.total_listings?.toLocaleString() ?? '500'}+
                  </div>
                  <div className="v21-geo-label">Businesses</div>
                </div>
                <div className="v21-geo-card">
                  <div className="v21-geo-number">
                    {data?.stats?.total_users?.toLocaleString() ?? '1.2K'}
                  </div>
                  <div className="v21-geo-label">Members</div>
                </div>
                <div className="v21-geo-card">
                  <div className="v21-geo-number">{data?.stats?.total_events ?? '150'}+</div>
                  <div className="v21-geo-label">Events</div>
                </div>
                <div className="v21-geo-card">
                  <div className="v21-geo-number">4.9★</div>
                  <div className="v21-geo-label">Rating</div>
                </div>
              </div>
              <div className="v21-hero-logo-float">
                <img src="/uploads/site/branding/logo-icon.png" alt="B" />
              </div>
            </div>
          </div>
        </div>
      </section>
      <div className="v21-angle-divider" />

      {/* ────────── SEARCH ────────── */}
      <section className="v21-search-section">
        <div className="v21-search-bar">
          <input type="text" placeholder="Search businesses, events, offers..." />
          <button>Search</button>
        </div>
      </section>

      {/* ────────── FEATURES ────────── */}
      <section className="v21-features">
        <div className="v21-section-label">Platform</div>
        <h2 className="v21-section-title">Built for Business</h2>
        <div className="v21-features-grid">
          <div className="v21-feature-cell">
            <div className="v21-feature-num">01</div>
            <h3>Business Directory</h3>
            <p>Discover local businesses and services in your area</p>
          </div>
          <div className="v21-feature-cell">
            <div className="v21-feature-num">02</div>
            <h3>Events &amp; Networking</h3>
            <p>Find professional events and networking opportunities</p>
          </div>
          <div className="v21-feature-cell">
            <div className="v21-feature-num">03</div>
            <h3>Special Offers</h3>
            <p>Access exclusive deals and promotional offers</p>
          </div>
          <div className="v21-feature-cell">
            <div className="v21-feature-num">04</div>
            <h3>Pro Network</h3>
            <p>Connect with other business professionals</p>
          </div>
        </div>
      </section>

      {/* ────────── LIVE PRODUCTION SCROLLERS ────────── */}
      <section className="v21-scrollers-section">
        <div className="v21-scrollers-inner">
          {/* Flash Offers */}
          <FlashOffersSection maxOffers={6} />

          {error && (
            <div className="bg-red-50 text-red-700 p-4 rounded-lg text-center mb-8">
              {error}
              <button onClick={fetchData} className="ml-2 underline">
                Try again
              </button>
            </div>
          )}

          <div className="space-y-12 py-8">
            {/* Categories */}
            {isLoading ? (
              <SectionSkeleton />
            ) : data?.categories && data.categories.length > 0 ? (
              <ContentSlider
                title="Browse by Category"
                icon={LayoutGrid}
                moreLink="/categories"
                moreLinkText="See All"
              >
                {data.categories.map((category, index) => (
                  <CategoryIcon key={category.id} category={category} index={index} />
                ))}
              </ContentSlider>
            ) : null}

            {/* Featured Listings */}
            {isLoading ? (
              <SectionSkeleton />
            ) : data?.featured_listings && data.featured_listings.length > 0 ? (
              <ContentSlider title="Featured Listings" icon={Star} moreLink="/listings?featured=true">
                {data.featured_listings.map((listing, index) => (
                  <ListingCard
                    key={listing.id}
                    listing={listing}
                    index={index}
                    subCounts={{
                      jobCount: listing.job_count,
                      eventCount: listing.event_count,
                      offerCount: listing.offer_count,
                    }}
                  />
                ))}
              </ContentSlider>
            ) : null}

            {/* Active Offers */}
            {isLoading ? (
              <SectionSkeleton />
            ) : data?.active_offers && data.active_offers.length > 0 ? (
              <ContentSlider title="Offers" icon={Gift} moreLink="/offers">
                {data.active_offers.map((offer, index) => (
                  <OfferCard key={offer.id} offer={offer} index={index} />
                ))}
              </ContentSlider>
            ) : null}

            {/* Upcoming Events */}
            {isLoading ? (
              <SectionSkeleton />
            ) : data?.upcoming_events && data.upcoming_events.length > 0 ? (
              <ContentSlider title="Events" icon={Calendar} moreLink="/events">
                {data.upcoming_events.map((event, index) => (
                  <EventCard key={event.id} event={event} index={index} />
                ))}
              </ContentSlider>
            ) : null}

            {/* Top Recommenders */}
            <TopRecommendersScroller limit={10} />

            {/* Latest Listings */}
            {isLoading ? (
              <SectionSkeleton />
            ) : data?.latest_listings && data.latest_listings.length > 0 ? (
              <ContentSlider title="Latest Listings" icon={Clock} moreLink="/listings">
                {data.latest_listings.map((listing, index) => (
                  <ListingCard
                    key={listing.id}
                    listing={listing}
                    index={index}
                    subCounts={{
                      jobCount: listing.job_count,
                      eventCount: listing.event_count,
                      offerCount: listing.offer_count,
                    }}
                  />
                ))}
              </ContentSlider>
            ) : null}
          </div>

          {/* Who's Hiring */}
          <WhosHiringSection maxJobs={4} />
        </div>
      </section>

      {/* ────────── CTA ────────── */}
      <section className="v21-cta">
        <h2>Ready to Join?</h2>
        <p>Start connecting with local businesses today. Free to join.</p>
        <button className="v21-btn-geo v21-btn-geo-primary">Create Free Account &rarr;</button>
      </section>

      {/* ────────── PRODUCTION FOOTER ────────── */}
      <SiteFooter />

      <style jsx global>{`
        .v21-root {
          --navy: #002641;
          --navy-mid: #003a5c;
          --orange: #ed6437;
          --orange-dark: #d54a1f;
          --teal: #0d7377;
          --cream: #f7f5ef;
          --warm-gray: #e0ddd3;
          --text-primary: #0f1a24;
          --text-secondary: #4a5568;
          --v21-white: #ffffff;

          font-family: 'Poppins', sans-serif;
          background: var(--cream);
          color: var(--text-primary);
          -webkit-font-smoothing: antialiased;
          overflow-x: hidden;
        }

        /* ─── NAV ─── */
        .v21-root .v21-nav {
          background: var(--navy);
          padding: 0;
          position: sticky;
          top: 0;
          z-index: 50;
        }
        .v21-root .v21-nav-inner {
          max-width: 1280px;
          margin: 0 auto;
          padding: 0 32px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          height: 64px;
        }
        .v21-root .v21-nav-logo {
          height: 30px;
          filter: brightness(0) invert(1);
        }
        .v21-root .v21-nav-links {
          display: flex;
          gap: 0;
          align-items: center;
          height: 100%;
        }
        .v21-root .v21-nav-links a {
          font-size: 13px;
          font-weight: 600;
          color: rgba(255, 255, 255, 0.7);
          text-decoration: none;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          padding: 0 20px;
          height: 100%;
          display: flex;
          align-items: center;
          border-bottom: 3px solid transparent;
          transition: all 0.2s;
        }
        .v21-root .v21-nav-links a:hover {
          color: #fff;
          border-bottom-color: var(--orange);
        }
        .v21-root .v21-nav-cta {
          background: var(--orange) !important;
          color: var(--v21-white) !important;
          border-radius: 4px;
          height: auto !important;
          padding: 10px 24px !important;
          border: none !important;
        }
        .v21-root .v21-nav-cta:hover {
          background: var(--orange-dark) !important;
        }

        /* ─── HERO ─── */
        .v21-root .v21-hero {
          background: var(--navy);
          position: relative;
          overflow: hidden;
        }
        .v21-root .v21-hero-bg {
          position: absolute;
          inset: 0;
          opacity: 0.08;
          background:
            linear-gradient(45deg, transparent 48%, var(--orange) 48%, var(--orange) 52%, transparent 52%),
            linear-gradient(-45deg, transparent 48%, var(--teal) 48%, var(--teal) 52%, transparent 52%);
          background-size: 60px 60px;
        }
        .v21-root .v21-hero-inner {
          max-width: 1280px;
          margin: 0 auto;
          padding: 100px 32px 120px;
          position: relative;
          z-index: 1;
        }
        .v21-root .v21-hero-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 80px;
          align-items: center;
        }
        .v21-root .v21-hero-eyebrow {
          font-family: 'Space Mono', monospace;
          font-size: 12px;
          color: var(--orange);
          letter-spacing: 0.2em;
          text-transform: uppercase;
          margin-bottom: 24px;
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .v21-root .v21-hero-eyebrow::before {
          content: '';
          display: block;
          width: 40px;
          height: 2px;
          background: var(--orange);
        }
        .v21-root .v21-hero h1 {
          font-size: 60px;
          font-weight: 900;
          line-height: 1.05;
          color: var(--v21-white);
          margin-bottom: 28px;
        }
        .v21-root .v21-hero h1 .v21-accent {
          color: var(--orange);
          position: relative;
          display: inline-block;
        }
        .v21-root .v21-hero h1 .v21-accent::after {
          content: '';
          position: absolute;
          bottom: 4px;
          left: 0;
          right: 0;
          height: 4px;
          background: var(--orange);
          border-radius: 2px;
        }
        .v21-root .v21-hero-text {
          font-size: 17px;
          color: rgba(255, 255, 255, 0.6);
          line-height: 1.7;
          margin-bottom: 40px;
          max-width: 460px;
        }
        .v21-root .v21-hero-actions {
          display: flex;
          gap: 16px;
        }
        .v21-root .v21-btn-geo {
          font-family: 'Poppins', sans-serif;
          font-size: 14px;
          font-weight: 700;
          padding: 16px 36px;
          border: none;
          cursor: pointer;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          transition: all 0.2s;
          clip-path: polygon(0 0, calc(100% - 12px) 0, 100% 100%, 12px 100%);
        }
        .v21-root .v21-btn-geo-primary {
          background: var(--orange);
          color: var(--v21-white);
        }
        .v21-root .v21-btn-geo-primary:hover {
          background: var(--orange-dark);
        }
        .v21-root .v21-btn-geo-secondary {
          background: transparent;
          color: var(--v21-white);
          border: 2px solid rgba(255, 255, 255, 0.3);
          clip-path: none;
          font-family: 'Poppins', sans-serif;
          font-size: 14px;
          font-weight: 700;
          padding: 16px 36px;
          cursor: pointer;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          transition: all 0.2s;
        }
        .v21-root .v21-btn-geo-secondary:hover {
          border-color: var(--v21-white);
        }

        /* Hero right — geometric stats */
        .v21-root .v21-hero-right {
          position: relative;
        }
        .v21-root .v21-geo-container {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }
        .v21-root .v21-geo-card {
          background: rgba(255, 255, 255, 0.05);
          backdrop-filter: blur(4px);
          border: 1px solid rgba(255, 255, 255, 0.1);
          padding: 32px 24px;
          text-align: center;
          position: relative;
          overflow: hidden;
        }
        .v21-root .v21-geo-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 3px;
        }
        .v21-root .v21-geo-card:nth-child(1)::before {
          background: var(--orange);
        }
        .v21-root .v21-geo-card:nth-child(2)::before {
          background: var(--teal);
        }
        .v21-root .v21-geo-card:nth-child(3)::before {
          background: #6a9bcc;
        }
        .v21-root .v21-geo-card:nth-child(4)::before {
          background: #788c5d;
        }
        .v21-root .v21-geo-card:nth-child(1) {
          clip-path: polygon(0 0, 100% 0, 100% calc(100% - 16px), calc(100% - 16px) 100%, 0 100%);
        }
        .v21-root .v21-geo-card:nth-child(2) {
          clip-path: polygon(16px 0, 100% 0, 100% 100%, 0 100%, 0 16px);
        }
        .v21-root .v21-geo-card:nth-child(3) {
          clip-path: polygon(0 0, 100% 0, 100% 100%, 16px 100%, 0 calc(100% - 16px));
        }
        .v21-root .v21-geo-card:nth-child(4) {
          clip-path: polygon(0 0, calc(100% - 16px) 0, 100% 16px, 100% 100%, 0 100%);
        }
        .v21-root .v21-geo-number {
          font-size: 36px;
          font-weight: 800;
          color: var(--v21-white);
          margin-bottom: 4px;
        }
        .v21-root .v21-geo-label {
          font-size: 12px;
          font-weight: 500;
          color: rgba(255, 255, 255, 0.5);
          text-transform: uppercase;
          letter-spacing: 0.08em;
        }
        .v21-root .v21-hero-logo-float {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 64px;
          height: 64px;
          background: var(--navy);
          border: 2px solid rgba(255, 255, 255, 0.15);
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 2;
        }
        .v21-root .v21-hero-logo-float img {
          width: 36px;
          height: 36px;
        }

        /* ─── ANGULAR DIVIDER ─── */
        .v21-root .v21-angle-divider {
          height: 60px;
          background: var(--navy);
          clip-path: polygon(0 0, 100% 0, 100% 0%, 0 100%);
        }

        /* ─── SEARCH ─── */
        .v21-root .v21-search-section {
          max-width: 800px;
          margin: -30px auto 0;
          padding: 0 32px;
          position: relative;
          z-index: 10;
        }
        .v21-root .v21-search-bar {
          display: flex;
          background: var(--v21-white);
          border-radius: 0;
          box-shadow: 0 16px 48px rgba(0, 38, 65, 0.12);
          overflow: hidden;
          clip-path: polygon(
            0 0,
            calc(100% - 8px) 0,
            100% 8px,
            100% 100%,
            8px 100%,
            0 calc(100% - 8px)
          );
        }
        .v21-root .v21-search-bar input {
          flex: 1;
          border: none;
          padding: 20px 28px;
          font-family: 'Poppins', sans-serif;
          font-size: 15px;
          outline: none;
          color: var(--text-primary);
        }
        .v21-root .v21-search-bar input::placeholder {
          color: #aaa;
        }
        .v21-root .v21-search-bar button {
          background: var(--orange);
          color: var(--v21-white);
          border: none;
          padding: 0 32px;
          font-family: 'Poppins', sans-serif;
          font-weight: 700;
          font-size: 13px;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          cursor: pointer;
          transition: background 0.2s;
        }
        .v21-root .v21-search-bar button:hover {
          background: var(--orange-dark);
        }

        /* ─── FEATURES ─── */
        .v21-root .v21-features {
          max-width: 1280px;
          margin: 0 auto;
          padding: 100px 32px 80px;
        }
        .v21-root .v21-section-label {
          font-family: 'Space Mono', monospace;
          font-size: 12px;
          color: var(--orange);
          letter-spacing: 0.2em;
          text-transform: uppercase;
          text-align: center;
          margin-bottom: 12px;
        }
        .v21-root .v21-section-title {
          font-size: 40px;
          font-weight: 800;
          color: var(--navy);
          text-align: center;
          margin-bottom: 56px;
        }
        .v21-root .v21-features-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 0;
        }
        .v21-root .v21-feature-cell {
          padding: 40px 28px;
          border: 1px solid var(--warm-gray);
          margin: -0.5px;
          position: relative;
          transition: all 0.25s;
          background: var(--cream);
        }
        .v21-root .v21-feature-cell:hover {
          background: var(--v21-white);
          z-index: 2;
          box-shadow: 0 8px 32px rgba(0, 38, 65, 0.08);
        }
        .v21-root .v21-feature-num {
          font-family: 'Space Mono', monospace;
          font-size: 48px;
          font-weight: 700;
          color: var(--warm-gray);
          margin-bottom: 16px;
          line-height: 1;
        }
        .v21-root .v21-feature-cell:hover .v21-feature-num {
          color: var(--orange);
        }
        .v21-root .v21-feature-cell h3 {
          font-size: 17px;
          font-weight: 700;
          color: var(--navy);
          margin-bottom: 8px;
        }
        .v21-root .v21-feature-cell p {
          font-size: 13px;
          color: var(--text-secondary);
          line-height: 1.6;
        }

        /* ─── LIVE SCROLLERS SECTION ─── */
        .v21-root .v21-scrollers-section {
          background: var(--cream);
          padding: 40px 0 80px;
          position: relative;
        }
        .v21-root .v21-scrollers-inner {
          max-width: 1280px;
          margin: 0 auto;
          padding: 0 32px;
        }

        /* ─── CTA ─── */
        .v21-root .v21-cta {
          padding: 100px 32px;
          text-align: center;
          position: relative;
        }
        .v21-root .v21-cta::before {
          content: '';
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%) rotate(45deg);
          width: 300px;
          height: 300px;
          border: 2px solid var(--warm-gray);
          opacity: 0.5;
        }
        .v21-root .v21-cta h2 {
          font-size: 44px;
          font-weight: 900;
          color: var(--navy);
          margin-bottom: 16px;
          position: relative;
          z-index: 1;
        }
        .v21-root .v21-cta p {
          font-size: 17px;
          color: var(--text-secondary);
          margin-bottom: 36px;
          position: relative;
          z-index: 1;
        }
        .v21-root .v21-cta .v21-btn-geo {
          position: relative;
          z-index: 1;
        }

        @media (max-width: 768px) {
          .v21-root .v21-hero-grid {
            grid-template-columns: 1fr;
            gap: 48px;
          }
          .v21-root .v21-hero h1 {
            font-size: 36px;
          }
          .v21-root .v21-features-grid {
            grid-template-columns: 1fr 1fr;
          }
          .v21-root .v21-geo-container {
            grid-template-columns: 1fr 1fr;
          }
          .v21-root .v21-nav-links {
            display: none;
          }
        }
      `}</style>
    </div>
  );
}
