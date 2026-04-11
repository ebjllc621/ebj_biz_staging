/**
 * Variant 2.1.5 — Monolith Sunrise
 *
 * Warm cream-to-dawn aesthetic with a massive orange orb that
 * recurs as a narrative anchor across the page. Soft, optimistic,
 * Japanese-modern × Airbnb warmth. Fraunces serif typography.
 *
 * @tier SIMPLE (preview-only, no business logic)
 */
'use client';

import { useEffect } from 'react';
import nextDynamic from 'next/dynamic';
import { Star, Gift, Calendar, Clock, LayoutGrid, Sun, Sunrise } from 'lucide-react';

import SiteFooter from '@/components/SiteFooter';
import { ContentSlider } from '@features/homepage/components/ContentSlider';
import { CategoryIcon } from '@features/homepage/components/CategoryIcon';
import { ListingCard } from '@features/homepage/components/ListingCard';
import { OfferCard } from '@features/homepage/components/OfferCard';
import { EventCard } from '@features/homepage/components/EventCard';
import { TopRecommendersScroller } from '@features/homepage/components/TopRecommendersScroller';
import { useHomepageData } from '../_shared/useHomepageData';
import { PREVIEW_CONTENT, PREVIEW_CREATORS, PREVIEW_TOOLS } from '../_shared/previewData';

const FlashOffersSection = nextDynamic(
  () => import('@/features/offers/components/FlashOffersSection').then(m => ({ default: m.FlashOffersSection })),
  { ssr: false, loading: () => null }
);

const WhosHiringSection = nextDynamic(
  () => import('@features/jobs/components/WhosHiringSection').then(m => ({ default: m.WhosHiringSection })),
  { ssr: false, loading: () => null }
);

function Skeleton() {
  return (
    <div className="animate-pulse">
      <div className="h-6 w-32 bg-black/10 rounded mb-4" />
      <div className="flex gap-4 overflow-hidden">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex-shrink-0 w-56 h-72 bg-black/5 rounded-2xl" />
        ))}
      </div>
    </div>
  );
}

interface SunrisePlateProps {
  hour: string;
  label: string;
  headline: string;
  pitch: string;
  attribution?: string;
}

function SunrisePlate({ hour, label, headline, pitch, attribution }: SunrisePlateProps) {
  return (
    <div className="v215-sunrise">
      <div className="v215-sunrise-orb">
        <Sun className="w-6 h-6" />
      </div>
      <div className="v215-sunrise-meta">
        <div className="v215-sunrise-time">
          <span className="v215-sunrise-hour">{hour}</span>
          <span className="v215-sunrise-label">{label}</span>
        </div>
        <h3 className="v215-sunrise-headline">{headline}</h3>
        <p className="v215-sunrise-pitch">{pitch}</p>
        {attribution && <div className="v215-sunrise-attr">— {attribution}</div>}
      </div>
    </div>
  );
}

export default function Variant215Page() {
  const { data, isLoading, error, refetch } = useHomepageData();

  useEffect(() => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href =
      'https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,400;0,9..144,500;0,9..144,600;0,9..144,700;0,9..144,900;1,9..144,400&family=Space+Mono:wght@400;700&family=Inter:wght@400;500;600&display=swap';
    document.head.appendChild(link);
    return () => {
      document.head.removeChild(link);
    };
  }, []);

  return (
    <div className="v215-root">
      {/* ───── BG LAYERS ───── */}
      <div className="v215-bg">
        <div className="v215-bg-gradient" />
        <div className="v215-bg-texture" />
        <div className="v215-orb v215-orb-hero" />
        <div className="v215-orb v215-orb-2" />
        <div className="v215-orb v215-orb-3" />
        <div className="v215-orb v215-orb-4" />
      </div>

      {/* ───── NAV ───── */}
      <nav className="v215-nav">
        <div className="v215-nav-inner">
          <img
            src="/uploads/site/branding/namelogo-horizontal.png"
            alt="Bizconekt"
            className="v215-nav-logo"
          />
          <div className="v215-nav-links">
            <a href="/listings">Listings</a>
            <a href="/events">Events</a>
            <a href="/offers">Offers</a>
            <a href="/jobs">Jobs</a>
            <a href="/register" className="v215-nav-cta">
              Join Free <span className="v215-nav-arrow">↗</span>
            </a>
          </div>
        </div>
      </nav>

      {/* ───── HERO ───── */}
      <section className="v215-hero">
        <div className="v215-hero-inner">
          <div className="v215-hero-text-col">
            <div className="v215-eyebrow">
              <Sunrise className="w-4 h-4" />
              A warmer way to find local
            </div>
            <h1 className="v215-hero-title">
              Connect,
              <br />
              discover, <em>grow</em>
              <span className="v215-title-period">.</span>
            </h1>
            <p className="v215-hero-text">
              Bizconekt is a calmer local network. Less grid, more garden. Real businesses, real
              people, tended like a neighborhood — not harvested like a marketplace.
            </p>
            <div className="v215-hero-actions">
              <button className="v215-btn-primary">Join free today</button>
              <button className="v215-btn-ghost">
                Read our story <span>→</span>
              </button>
            </div>
          </div>

          <div className="v215-hero-orb-col">
            <div className="v215-hero-orb">
              <div className="v215-hero-orb-inner" />
              <div className="v215-hero-orb-ring" />
              <div className="v215-hero-orb-ring v215-hero-orb-ring-2" />
            </div>
            <div className="v215-hero-stats">
              <div className="v215-stat">
                <div className="v215-stat-value">
                  {data?.stats?.total_listings?.toLocaleString() ?? '500'}+
                </div>
                <div className="v215-stat-label">businesses tended</div>
              </div>
              <div className="v215-stat">
                <div className="v215-stat-value">
                  {data?.stats?.total_users?.toLocaleString() ?? '1.2K'}
                </div>
                <div className="v215-stat-label">neighbors connected</div>
              </div>
              <div className="v215-stat">
                <div className="v215-stat-value">{data?.stats?.total_events ?? '150'}+</div>
                <div className="v215-stat-label">gatherings planned</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ───── SEARCH ───── */}
      <section className="v215-search-section">
        <div className="v215-search-bar">
          <Sun className="w-5 h-5" />
          <input type="text" placeholder="What are you looking for?" />
          <button>
            Find <span>→</span>
          </button>
        </div>
      </section>

      {/* ───── FEATURES ───── */}
      <section className="v215-features">
        <div className="v215-section-label">
          <span className="v215-section-leaf" />
          The garden
        </div>
        <h2 className="v215-section-title">
          Four rooms, <em>one neighborhood.</em>
        </h2>
        <div className="v215-features-grid">
          {[
            ['01', 'Directory', 'A calmer way to find local businesses worth visiting.'],
            ['02', 'Events', 'Gatherings your neighbors are actually excited about.'],
            ['03', 'Offers', 'Honest deals from the shops around the corner.'],
            ['04', 'Network', 'A quiet Rolodex of trusted professionals nearby.'],
          ].map(([n, t, d]) => (
            <div key={n} className="v215-feature-cell">
              <div className="v215-feature-orb" />
              <div className="v215-feature-num">{n}</div>
              <h3>{t}</h3>
              <p>{d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ───── SCROLL ZONE ─── */}
      <section className="v215-scroll-zone">
        <div className="v215-scroll-inner">
          <SunrisePlate
            hour="05:47"
            label="FIRST LIGHT"
            headline="The day begins with what's open."
            pitch="Real listings, real offers, real events — tended every morning so you always find what's actually happening in the neighborhood."
          />

          <FlashOffersSection maxOffers={6} />

          {error && (
            <div className="v215-error">
              {error}
              <button onClick={refetch}>Try again</button>
            </div>
          )}

          <div className="v215-scroll-block">
            {isLoading ? (
              <Skeleton />
            ) : data?.categories && data.categories.length > 0 ? (
              <div className="v215-panel">
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
              </div>
            ) : null}

            {isLoading ? (
              <Skeleton />
            ) : data?.featured_listings && data.featured_listings.length > 0 ? (
              <div className="v215-panel">
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
              </div>
            ) : null}

            {isLoading ? (
              <Skeleton />
            ) : data?.active_offers && data.active_offers.length > 0 ? (
              <div className="v215-panel">
                <ContentSlider title="Offers" icon={Gift} moreLink="/offers">
                  {data.active_offers.map((offer, index) => (
                    <OfferCard key={offer.id} offer={offer} index={index} />
                  ))}
                </ContentSlider>
              </div>
            ) : null}

            {isLoading ? (
              <Skeleton />
            ) : data?.upcoming_events && data.upcoming_events.length > 0 ? (
              <div className="v215-panel">
                <ContentSlider title="Events" icon={Calendar} moreLink="/events">
                  {data.upcoming_events.map((event, index) => (
                    <EventCard key={event.id} event={event} index={index} />
                  ))}
                </ContentSlider>
              </div>
            ) : null}
          </div>

          <SunrisePlate
            hour="12:00"
            label="MID-DAY"
            headline="Trust is the quiet sun we share."
            pitch="The neighbors we rely on, surfaced by neighbors we rely on. Our Top Recommenders aren't ranked — they're remembered."
            attribution="From the Bizconekt garden"
          />

          <div className="v215-panel">
            <TopRecommendersScroller limit={10} />
          </div>

          <div className="v215-scroll-block">
            {isLoading ? (
              <Skeleton />
            ) : data?.latest_listings && data.latest_listings.length > 0 ? (
              <div className="v215-panel">
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
              </div>
            ) : null}
          </div>

          <SunrisePlate
            hour="13:45"
            label="AFTERNOON · THE LIBRARY"
            headline="Read, watch, listen — together."
            pitch="The network publishes too. Articles, videos, podcasts, guides, and newsletters written by the people in this garden, for the people in this garden."
            attribution="The Bizconekt Library"
          />

          {/* ─── CONTENT SCROLLER ─── */}
          <div className="v215-promo-block">
            <div className="v215-promo-head">
              <div className="v215-promo-kicker">
                <span className="v215-section-leaf" />
                Quiet reading, honest writing
              </div>
              <h3 className="v215-promo-title">Stories from <em>the neighborhood.</em></h3>
            </div>
            <div className="v215-scroller">
              {PREVIEW_CONTENT.map((item) => {
                const Icon = item.icon;
                return (
                  <article key={item.id} className="v215-content-card">
                    <div className="v215-content-icon">
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="v215-content-kind">{item.kind}</div>
                    <h4 className="v215-content-title">{item.title}</h4>
                    <div className="v215-content-byline">by {item.author}</div>
                    <div className="v215-content-meta">{item.meta}</div>
                  </article>
                );
              })}
            </div>
          </div>

          {/* ─── CREATORS SCROLLER ─── */}
          <div className="v215-promo-block">
            <div className="v215-promo-head">
              <div className="v215-promo-kicker">
                <span className="v215-section-leaf" />
                The people tending the garden
              </div>
              <h3 className="v215-promo-title">Meet <em>the makers.</em></h3>
            </div>
            <div className="v215-scroller">
              {PREVIEW_CREATORS.map((creator) => {
                const Icon = creator.icon;
                return (
                  <article key={creator.id} className="v215-creator-card">
                    <div className="v215-creator-avatar">
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="v215-creator-kind">{creator.kind}</div>
                    <h4 className="v215-creator-name">{creator.name}</h4>
                    <div className="v215-creator-handle">{creator.handle}</div>
                    <p className="v215-creator-bio">{creator.bio}</p>
                    <div className="v215-creator-footer">
                      <span>followers</span>
                      <strong>{creator.followers}</strong>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>

          <SunrisePlate
            hour="17:23"
            label="GOLDEN HOUR"
            headline="Careers, planted in the neighborhood."
            pitch="Local companies hiring right now. Roles that let you stay close to the people you care about — or let you grow into something new."
          />

          <WhosHiringSection maxJobs={4} />

          {/* ─── TOOLS SHOWCASE ─── */}
          <div className="v215-tools-block">
            <div className="v215-tools-orb" />
            <div className="v215-tools-head">
              <div className="v215-promo-kicker v215-promo-kicker-center">
                <span className="v215-section-leaf" />
                For those building
                <span className="v215-section-leaf" />
              </div>
              <h3 className="v215-promo-title v215-promo-title-center">
                Every tool a <em>listing needs.</em>
              </h3>
              <p className="v215-promo-deck">
                Twelve gentle instruments. Connection groups for sharing opportunities with the people you trust. Quote pools for honest bidding.
                Campaigns, analytics, a media gallery, even a newsletter — quiet, capable, all in one place.
              </p>
            </div>
            <div className="v215-tools-grid">
              {PREVIEW_TOOLS.map((tool) => {
                const Icon = tool.icon;
                return (
                  <div key={tool.id} className="v215-tool-cell">
                    <div className="v215-tool-orb" />
                    <div className="v215-tool-icon">
                      <Icon className="w-5 h-5" />
                    </div>
                    <h4 className="v215-tool-name">{tool.name}</h4>
                    <p className="v215-tool-pitch">{tool.pitch}</p>
                    <div className={`v215-tool-aud v215-tool-aud-${tool.audience}`}>
                      {tool.audience === 'discover' ? 'for browsing' : tool.audience === 'build' ? 'for building' : 'for both'}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <SunrisePlate
            hour="19:04"
            label="LAST LIGHT"
            headline="Tomorrow starts tonight."
            pitch="Two minutes to create an account. Tomorrow morning the garden is yours too."
          />
        </div>
      </section>

      {/* ───── CTA ───── */}
      <section className="v215-cta">
        <div className="v215-cta-orb" />
        <div className="v215-cta-inner">
          <div className="v215-cta-tag">
            <Sunrise className="w-3 h-3" />
            One warm invitation
          </div>
          <h2>
            Step into <em>the warm part</em> of the internet.
          </h2>
          <p>Free account. Two minutes. A calmer way to be online with the people near you.</p>
          <button className="v215-btn-primary v215-cta-btn">Create free account ↗</button>
        </div>
      </section>

      <SiteFooter />

      <style jsx global>{`
        .v215-root {
          --dawn-1: #fdf6e9;
          --dawn-2: #fbe8cf;
          --dawn-3: #f5c79b;
          --cream: #fffbf2;
          --ink: #2a1a10;
          --ink-2: #402a1c;
          --ink-light: #6a5441;
          --ink-mute: #96836e;
          --orange: #e8540f;
          --orange-soft: #ff7a3c;
          --orange-glow: rgba(232, 84, 15, 0.25);
          --peach: #f4a072;
          --terra: #b63c0c;
          --leaf: #6b8e4e;
          --line: rgba(42, 26, 16, 0.12);
          --line-strong: rgba(42, 26, 16, 0.3);

          font-family: 'Inter', sans-serif;
          background: var(--dawn-1);
          color: var(--ink);
          position: relative;
          overflow-x: hidden;
          -webkit-font-smoothing: antialiased;
        }

        /* ─── BG ─── */
        .v215-root .v215-bg {
          position: fixed;
          inset: 0;
          z-index: 0;
          pointer-events: none;
        }
        .v215-root .v215-bg-gradient {
          position: absolute;
          inset: 0;
          background:
            radial-gradient(ellipse 80% 60% at 50% 20%, var(--dawn-2) 0%, transparent 60%),
            linear-gradient(180deg, var(--dawn-1) 0%, var(--dawn-2) 40%, var(--dawn-1) 100%);
        }
        .v215-root .v215-bg-texture {
          position: absolute;
          inset: 0;
          opacity: 0.4;
          mix-blend-mode: multiply;
          background-image:
            radial-gradient(rgba(102, 72, 42, 0.08) 1px, transparent 1px),
            radial-gradient(rgba(102, 72, 42, 0.05) 0.5px, transparent 0.5px);
          background-size: 5px 5px, 11px 11px;
        }
        .v215-root .v215-orb {
          position: absolute;
          border-radius: 50%;
          background: radial-gradient(circle at 35% 35%, var(--orange-soft) 0%, var(--orange) 40%, var(--terra) 100%);
          box-shadow: 0 0 120px var(--orange-glow), inset -40px -40px 80px rgba(120, 30, 0, 0.4);
          filter: blur(0px);
        }
        .v215-root .v215-orb-hero {
          top: 10%;
          right: -8%;
          width: 720px;
          height: 720px;
          opacity: 0.92;
          animation: v215-rise 24s ease-in-out infinite;
        }
        .v215-root .v215-orb-2 {
          top: 38%;
          left: -6%;
          width: 220px;
          height: 220px;
          opacity: 0.3;
          animation: v215-rise 18s ease-in-out infinite;
          animation-delay: -6s;
        }
        .v215-root .v215-orb-3 {
          top: 60%;
          right: 5%;
          width: 160px;
          height: 160px;
          opacity: 0.35;
          animation: v215-rise 20s ease-in-out infinite;
          animation-delay: -12s;
        }
        .v215-root .v215-orb-4 {
          bottom: 6%;
          left: 30%;
          width: 280px;
          height: 280px;
          opacity: 0.25;
          animation: v215-rise 26s ease-in-out infinite;
          animation-delay: -18s;
        }
        @keyframes v215-rise {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-24px); }
        }

        /* ─── NAV ─── */
        .v215-root .v215-nav {
          position: sticky;
          top: 0;
          z-index: 50;
          background: rgba(253, 246, 233, 0.78);
          backdrop-filter: blur(14px);
          border-bottom: 1px solid var(--line);
        }
        .v215-root .v215-nav-inner {
          max-width: 1360px;
          margin: 0 auto;
          padding: 0 48px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          height: 80px;
        }
        .v215-root .v215-nav-logo {
          height: 30px;
          filter: brightness(0) saturate(100%) invert(12%) sepia(34%) saturate(1987%) hue-rotate(350deg) brightness(93%) contrast(91%);
        }
        .v215-root .v215-nav-links {
          display: flex;
          gap: 8px;
          align-items: center;
        }
        .v215-root .v215-nav-links a {
          font-family: 'Fraunces', serif;
          font-size: 16px;
          font-weight: 500;
          color: var(--ink);
          text-decoration: none;
          padding: 12px 20px;
          border-radius: 999px;
          transition: background 0.2s;
        }
        .v215-root .v215-nav-links a:hover {
          background: rgba(232, 84, 15, 0.08);
        }
        .v215-root .v215-nav-cta {
          background: var(--ink) !important;
          color: var(--cream) !important;
          padding: 12px 22px !important;
          display: inline-flex;
          align-items: center;
          gap: 8px;
        }
        .v215-root .v215-nav-cta:hover {
          background: var(--orange) !important;
        }
        .v215-root .v215-nav-arrow {
          display: inline-block;
          transition: transform 0.2s;
        }
        .v215-root .v215-nav-cta:hover .v215-nav-arrow {
          transform: translate(2px, -2px);
        }

        /* ─── HERO ─── */
        .v215-root .v215-hero {
          position: relative;
          z-index: 1;
          padding: 80px 0 140px;
        }
        .v215-root .v215-hero-inner {
          max-width: 1360px;
          margin: 0 auto;
          padding: 0 48px;
          display: grid;
          grid-template-columns: 1.2fr 1fr;
          gap: 80px;
          align-items: center;
        }
        .v215-root .v215-eyebrow {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          font-family: 'Fraunces', serif;
          font-style: italic;
          font-size: 15px;
          font-weight: 500;
          color: var(--terra);
          margin-bottom: 32px;
        }
        .v215-root .v215-eyebrow svg { color: var(--orange); }
        .v215-root .v215-hero-title {
          font-family: 'Fraunces', serif;
          font-size: 96px;
          line-height: 0.98;
          letter-spacing: -0.035em;
          color: var(--ink);
          margin: 0 0 32px;
          font-weight: 500;
        }
        .v215-root .v215-hero-title em {
          font-style: italic;
          font-weight: 400;
          color: var(--orange);
        }
        .v215-root .v215-title-period {
          color: var(--orange);
        }
        .v215-root .v215-hero-text {
          font-family: 'Fraunces', serif;
          font-size: 20px;
          line-height: 1.55;
          color: var(--ink-2);
          max-width: 540px;
          margin-bottom: 48px;
          font-weight: 400;
        }
        .v215-root .v215-hero-actions {
          display: flex;
          gap: 16px;
          align-items: center;
        }
        .v215-root .v215-btn-primary {
          font-family: 'Fraunces', serif;
          font-size: 17px;
          font-weight: 500;
          padding: 18px 34px;
          background: var(--ink);
          color: var(--cream);
          border: none;
          border-radius: 999px;
          cursor: pointer;
          transition: all 0.25s;
          box-shadow: 0 10px 30px rgba(42, 26, 16, 0.15);
        }
        .v215-root .v215-btn-primary:hover {
          background: var(--orange);
          transform: translateY(-2px);
          box-shadow: 0 14px 40px rgba(232, 84, 15, 0.35);
        }
        .v215-root .v215-btn-ghost {
          font-family: 'Fraunces', serif;
          font-style: italic;
          font-size: 17px;
          padding: 18px 20px;
          background: transparent;
          color: var(--ink);
          border: none;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }
        .v215-root .v215-btn-ghost:hover { color: var(--orange); }
        .v215-root .v215-btn-ghost span { transition: transform 0.2s; }
        .v215-root .v215-btn-ghost:hover span { transform: translateX(4px); }

        /* Hero orb */
        .v215-root .v215-hero-orb-col {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 56px;
        }
        .v215-root .v215-hero-orb {
          position: relative;
          width: 340px;
          height: 340px;
        }
        .v215-root .v215-hero-orb-inner {
          position: absolute;
          inset: 0;
          border-radius: 50%;
          background: radial-gradient(circle at 35% 35%, #ffa06a 0%, var(--orange) 40%, var(--terra) 100%);
          box-shadow:
            0 0 100px var(--orange-glow),
            0 0 200px rgba(232, 84, 15, 0.15),
            inset -40px -40px 80px rgba(120, 30, 0, 0.5);
        }
        .v215-root .v215-hero-orb-ring {
          position: absolute;
          inset: -40px;
          border-radius: 50%;
          border: 1px solid var(--line-strong);
          animation: v215-rotate 40s linear infinite;
        }
        .v215-root .v215-hero-orb-ring-2 {
          inset: -80px;
          border-color: var(--line);
          animation-duration: 60s;
          animation-direction: reverse;
        }
        @keyframes v215-rotate {
          from { transform: rotate(0); }
          to { transform: rotate(360deg); }
        }

        .v215-root .v215-hero-stats {
          display: flex;
          gap: 24px;
          flex-wrap: wrap;
          justify-content: center;
          max-width: 440px;
        }
        .v215-root .v215-stat {
          text-align: center;
        }
        .v215-root .v215-stat-value {
          font-family: 'Fraunces', serif;
          font-size: 36px;
          font-weight: 500;
          color: var(--ink);
          line-height: 1;
          margin-bottom: 6px;
        }
        .v215-root .v215-stat-label {
          font-family: 'Fraunces', serif;
          font-style: italic;
          font-size: 13px;
          color: var(--ink-mute);
        }

        /* ─── SEARCH ─── */
        .v215-root .v215-search-section {
          position: relative;
          z-index: 2;
          max-width: 740px;
          margin: -60px auto 0;
          padding: 0 48px;
        }
        .v215-root .v215-search-bar {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 8px 8px 8px 28px;
          background: var(--cream);
          border: 1px solid var(--line);
          border-radius: 999px;
          box-shadow: 0 24px 60px rgba(42, 26, 16, 0.12);
        }
        .v215-root .v215-search-bar svg { color: var(--orange); flex-shrink: 0; }
        .v215-root .v215-search-bar input {
          flex: 1;
          background: transparent;
          border: none;
          padding: 18px 0;
          font-family: 'Fraunces', serif;
          font-style: italic;
          font-size: 19px;
          color: var(--ink);
          outline: none;
        }
        .v215-root .v215-search-bar input::placeholder { color: var(--ink-mute); }
        .v215-root .v215-search-bar button {
          font-family: 'Fraunces', serif;
          font-size: 16px;
          font-weight: 500;
          padding: 14px 28px;
          background: var(--orange);
          color: var(--cream);
          border: none;
          border-radius: 999px;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 8px;
        }
        .v215-root .v215-search-bar button:hover { background: var(--terra); }

        /* ─── FEATURES ─── */
        .v215-root .v215-features {
          position: relative;
          z-index: 1;
          max-width: 1360px;
          margin: 0 auto;
          padding: 140px 48px 80px;
        }
        .v215-root .v215-section-label {
          display: flex;
          align-items: center;
          gap: 12px;
          justify-content: center;
          font-family: 'Fraunces', serif;
          font-style: italic;
          font-size: 16px;
          color: var(--leaf);
          margin-bottom: 12px;
        }
        .v215-root .v215-section-leaf {
          display: inline-block;
          width: 24px;
          height: 1px;
          background: var(--leaf);
        }
        .v215-root .v215-section-title {
          font-family: 'Fraunces', serif;
          font-size: 72px;
          line-height: 1;
          color: var(--ink);
          text-align: center;
          margin-bottom: 72px;
          letter-spacing: -0.025em;
          font-weight: 500;
        }
        .v215-root .v215-section-title em {
          font-style: italic;
          color: var(--orange);
          font-weight: 400;
        }
        .v215-root .v215-features-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 24px;
        }
        .v215-root .v215-feature-cell {
          position: relative;
          padding: 40px 32px 44px;
          background: var(--cream);
          border: 1px solid var(--line);
          border-radius: 28px;
          overflow: hidden;
          transition: all 0.3s;
        }
        .v215-root .v215-feature-cell:hover {
          transform: translateY(-6px);
          box-shadow: 0 24px 60px rgba(42, 26, 16, 0.1);
          border-color: var(--peach);
        }
        .v215-root .v215-feature-orb {
          position: absolute;
          top: -60px;
          right: -60px;
          width: 140px;
          height: 140px;
          border-radius: 50%;
          background: radial-gradient(circle at 35% 35%, var(--orange-soft) 0%, var(--orange) 100%);
          opacity: 0.1;
          transition: opacity 0.3s;
        }
        .v215-root .v215-feature-cell:hover .v215-feature-orb { opacity: 0.2; }
        .v215-root .v215-feature-num {
          font-family: 'Space Mono', monospace;
          font-size: 11px;
          color: var(--orange);
          letter-spacing: 0.2em;
          margin-bottom: 18px;
        }
        .v215-root .v215-feature-cell h3 {
          font-family: 'Fraunces', serif;
          font-size: 26px;
          color: var(--ink);
          margin-bottom: 10px;
          font-weight: 500;
          letter-spacing: -0.01em;
        }
        .v215-root .v215-feature-cell p {
          font-family: 'Fraunces', serif;
          font-style: italic;
          font-size: 15px;
          line-height: 1.55;
          color: var(--ink-light);
        }

        /* ─── SCROLL ZONE ─── */
        .v215-root .v215-scroll-zone {
          position: relative;
          z-index: 1;
          padding: 60px 0 120px;
        }
        .v215-root .v215-scroll-inner {
          max-width: 1360px;
          margin: 0 auto;
          padding: 0 48px;
        }
        .v215-root .v215-scroll-block {
          display: flex;
          flex-direction: column;
          gap: 32px;
          margin: 48px 0;
        }
        .v215-root .v215-panel {
          padding: 36px 32px 28px;
          background: var(--cream);
          border: 1px solid var(--line);
          border-radius: 28px;
          box-shadow: 0 14px 36px rgba(42, 26, 16, 0.06);
        }
        .v215-root .v215-panel h2 {
          font-family: 'Fraunces', serif;
          font-weight: 500;
          color: var(--ink);
        }
        .v215-root .v215-panel p { color: var(--ink-light); }

        /* Sunrise plates */
        .v215-root .v215-sunrise {
          position: relative;
          display: grid;
          grid-template-columns: auto 1fr;
          gap: 44px;
          align-items: center;
          padding: 48px 48px 48px 44px;
          margin: 56px 0;
          background: linear-gradient(135deg, var(--dawn-2) 0%, var(--dawn-3) 100%);
          border-radius: 36px;
          overflow: hidden;
        }
        .v215-root .v215-sunrise::before {
          content: '';
          position: absolute;
          top: -40%;
          right: -10%;
          width: 60%;
          height: 180%;
          background: radial-gradient(ellipse, rgba(255, 160, 106, 0.5) 0%, transparent 60%);
          pointer-events: none;
        }
        .v215-root .v215-sunrise-orb {
          position: relative;
          width: 110px;
          height: 110px;
          border-radius: 50%;
          background: radial-gradient(circle at 35% 35%, #ffb98a 0%, var(--orange) 50%, var(--terra) 100%);
          box-shadow: 0 0 60px var(--orange-glow), inset -12px -12px 28px rgba(120, 30, 0, 0.45);
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .v215-root .v215-sunrise-orb svg { color: var(--cream); }
        .v215-root .v215-sunrise-meta {
          position: relative;
          max-width: 760px;
        }
        .v215-root .v215-sunrise-time {
          display: flex;
          align-items: baseline;
          gap: 14px;
          margin-bottom: 12px;
        }
        .v215-root .v215-sunrise-hour {
          font-family: 'Fraunces', serif;
          font-size: 24px;
          color: var(--terra);
          letter-spacing: -0.01em;
          font-weight: 500;
        }
        .v215-root .v215-sunrise-label {
          font-family: 'Space Mono', monospace;
          font-size: 11px;
          letter-spacing: 0.2em;
          color: var(--ink-light);
        }
        .v215-root .v215-sunrise-headline {
          font-family: 'Fraunces', serif;
          font-size: 36px;
          line-height: 1.15;
          color: var(--ink);
          margin-bottom: 12px;
          font-weight: 500;
          letter-spacing: -0.015em;
        }
        .v215-root .v215-sunrise-pitch {
          font-family: 'Fraunces', serif;
          font-size: 17px;
          line-height: 1.55;
          color: var(--ink-2);
          font-style: italic;
        }
        .v215-root .v215-sunrise-attr {
          margin-top: 12px;
          font-family: 'Fraunces', serif;
          font-size: 13px;
          color: var(--terra);
          font-style: italic;
        }

        .v215-root .v215-error {
          background: var(--dawn-2);
          border: 1px solid var(--orange);
          color: var(--ink);
          padding: 18px;
          text-align: center;
          border-radius: 20px;
          font-family: 'Fraunces', serif;
          font-style: italic;
          margin-bottom: 24px;
        }
        .v215-root .v215-error button {
          background: none;
          border: none;
          color: var(--orange);
          font-family: inherit;
          font-weight: 600;
          cursor: pointer;
          margin-left: 8px;
          text-decoration: underline;
        }

        /* ─── CTA ─── */
        .v215-root .v215-cta {
          position: relative;
          z-index: 1;
          padding: 160px 48px;
          overflow: hidden;
        }
        .v215-root .v215-cta-orb {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 600px;
          height: 600px;
          border-radius: 50%;
          background: radial-gradient(circle at 40% 40%, #ffa06a 0%, var(--orange) 40%, transparent 70%);
          filter: blur(80px);
          opacity: 0.6;
          pointer-events: none;
        }
        .v215-root .v215-cta-inner {
          position: relative;
          max-width: 860px;
          margin: 0 auto;
          text-align: center;
        }
        .v215-root .v215-cta-tag {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          font-family: 'Fraunces', serif;
          font-style: italic;
          font-size: 15px;
          color: var(--terra);
          padding: 10px 20px;
          background: var(--cream);
          border: 1px solid var(--line);
          border-radius: 999px;
          margin-bottom: 32px;
          box-shadow: 0 8px 24px rgba(42, 26, 16, 0.08);
        }
        .v215-root .v215-cta h2 {
          font-family: 'Fraunces', serif;
          font-size: 88px;
          line-height: 1;
          color: var(--ink);
          margin-bottom: 24px;
          font-weight: 500;
          letter-spacing: -0.03em;
        }
        .v215-root .v215-cta h2 em {
          font-style: italic;
          color: var(--orange);
          font-weight: 400;
        }
        .v215-root .v215-cta p {
          font-family: 'Fraunces', serif;
          font-style: italic;
          font-size: 20px;
          color: var(--ink-2);
          margin-bottom: 44px;
        }
        .v215-root .v215-cta-btn {
          padding: 22px 44px;
          font-size: 18px;
        }

        /* ─── PROMO BLOCKS (Content, Creators) ─── */
        .v215-root .v215-promo-block {
          position: relative;
          padding: 48px 44px;
          margin: 56px 0;
          background: var(--cream);
          border: 1px solid var(--line);
          border-radius: 36px;
          box-shadow: 0 20px 50px rgba(42, 26, 16, 0.07);
        }
        .v215-root .v215-promo-head {
          margin-bottom: 32px;
          padding-bottom: 20px;
          border-bottom: 1px solid var(--line);
          max-width: 680px;
        }
        .v215-root .v215-promo-kicker {
          display: inline-flex;
          align-items: center;
          gap: 12px;
          font-family: 'Fraunces', serif;
          font-style: italic;
          font-size: 15px;
          color: var(--leaf);
          margin-bottom: 10px;
        }
        .v215-root .v215-promo-kicker-center { display: inline-flex; }
        .v215-root .v215-promo-title {
          font-family: 'Fraunces', serif;
          font-size: 44px;
          line-height: 1.05;
          color: var(--ink);
          margin: 0;
          font-weight: 500;
          letter-spacing: -0.02em;
        }
        .v215-root .v215-promo-title em {
          font-style: italic;
          color: var(--orange);
          font-weight: 400;
        }
        .v215-root .v215-promo-title-center { text-align: center; }
        .v215-root .v215-promo-deck {
          font-family: 'Fraunces', serif;
          font-style: italic;
          font-size: 18px;
          line-height: 1.55;
          color: var(--ink-2);
          max-width: 680px;
          margin: 20px auto 0;
          text-align: center;
        }

        .v215-root .v215-scroller {
          display: flex;
          gap: 22px;
          overflow-x: auto;
          padding: 4px 4px 20px;
          scrollbar-width: thin;
          scrollbar-color: var(--orange) var(--dawn-2);
        }
        .v215-root .v215-scroller::-webkit-scrollbar { height: 6px; }
        .v215-root .v215-scroller::-webkit-scrollbar-thumb {
          background: var(--orange);
          border-radius: 999px;
        }
        .v215-root .v215-scroller::-webkit-scrollbar-track {
          background: var(--dawn-2);
          border-radius: 999px;
        }

        /* Content card */
        .v215-root .v215-content-card {
          flex-shrink: 0;
          width: 280px;
          padding: 28px 26px;
          background: linear-gradient(180deg, var(--dawn-1) 0%, var(--cream) 100%);
          border: 1px solid var(--line);
          border-radius: 24px;
          cursor: pointer;
          transition: all 0.25s;
          position: relative;
        }
        .v215-root .v215-content-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 18px 40px rgba(232, 84, 15, 0.12);
          border-color: var(--peach);
        }
        .v215-root .v215-content-icon {
          width: 44px;
          height: 44px;
          border-radius: 50%;
          background: radial-gradient(circle at 35% 35%, var(--orange-soft) 0%, var(--orange) 100%);
          color: var(--cream);
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 16px;
          box-shadow: 0 0 24px var(--orange-glow);
        }
        .v215-root .v215-content-kind {
          font-family: 'Fraunces', serif;
          font-style: italic;
          font-size: 13px;
          color: var(--terra);
          margin-bottom: 10px;
        }
        .v215-root .v215-content-title {
          font-family: 'Fraunces', serif;
          font-size: 22px;
          line-height: 1.15;
          color: var(--ink);
          margin: 0 0 14px;
          font-weight: 500;
          letter-spacing: -0.01em;
          min-height: 78px;
        }
        .v215-root .v215-content-byline {
          font-family: 'Fraunces', serif;
          font-style: italic;
          font-size: 13px;
          color: var(--ink-light);
          margin-bottom: 4px;
        }
        .v215-root .v215-content-meta {
          font-family: 'Space Mono', monospace;
          font-size: 10px;
          letter-spacing: 0.08em;
          color: var(--ink-mute);
        }

        /* Creator card */
        .v215-root .v215-creator-card {
          flex-shrink: 0;
          width: 260px;
          padding: 32px 28px;
          background: linear-gradient(180deg, var(--dawn-1) 0%, var(--cream) 100%);
          border: 1px solid var(--line);
          border-radius: 28px;
          text-align: center;
          cursor: pointer;
          transition: all 0.25s;
        }
        .v215-root .v215-creator-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 18px 40px rgba(232, 84, 15, 0.12);
          border-color: var(--peach);
        }
        .v215-root .v215-creator-avatar {
          width: 64px;
          height: 64px;
          border-radius: 50%;
          background: radial-gradient(circle at 35% 35%, var(--orange-soft) 0%, var(--orange) 100%);
          color: var(--cream);
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 16px;
          box-shadow: 0 0 30px var(--orange-glow);
        }
        .v215-root .v215-creator-kind {
          font-family: 'Fraunces', serif;
          font-style: italic;
          font-size: 13px;
          color: var(--terra);
          margin-bottom: 10px;
        }
        .v215-root .v215-creator-name {
          font-family: 'Fraunces', serif;
          font-size: 24px;
          line-height: 1;
          color: var(--ink);
          margin: 0 0 4px;
          font-weight: 500;
          letter-spacing: -0.01em;
        }
        .v215-root .v215-creator-handle {
          font-family: 'Space Mono', monospace;
          font-size: 11px;
          color: var(--orange);
          margin-bottom: 12px;
        }
        .v215-root .v215-creator-bio {
          font-family: 'Fraunces', serif;
          font-style: italic;
          font-size: 13px;
          line-height: 1.5;
          color: var(--ink-light);
          margin-bottom: 18px;
          min-height: 40px;
        }
        .v215-root .v215-creator-footer {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
          padding-top: 14px;
          border-top: 1px solid var(--line);
          font-family: 'Fraunces', serif;
          font-style: italic;
          font-size: 13px;
          color: var(--ink-mute);
        }
        .v215-root .v215-creator-footer strong {
          font-family: 'Fraunces', serif;
          font-size: 22px;
          color: var(--orange);
          font-weight: 500;
          font-style: normal;
        }

        /* ─── TOOLS SHOWCASE ─── */
        .v215-root .v215-tools-block {
          position: relative;
          padding: 72px 48px;
          margin: 72px 0 40px;
          background: linear-gradient(180deg, var(--cream) 0%, var(--dawn-2) 100%);
          border: 1px solid var(--line);
          border-radius: 44px;
          overflow: hidden;
          box-shadow: 0 30px 80px rgba(42, 26, 16, 0.1);
        }
        .v215-root .v215-tools-orb {
          position: absolute;
          top: -120px;
          right: -120px;
          width: 500px;
          height: 500px;
          border-radius: 50%;
          background: radial-gradient(circle at 40% 40%, var(--orange-soft) 0%, var(--orange) 40%, transparent 70%);
          opacity: 0.15;
          filter: blur(60px);
          pointer-events: none;
        }
        .v215-root .v215-tools-head {
          position: relative;
          text-align: center;
          max-width: 720px;
          margin: 0 auto 56px;
        }
        .v215-root .v215-tools-grid {
          position: relative;
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 20px;
        }
        .v215-root .v215-tool-cell {
          position: relative;
          padding: 32px 26px 28px;
          background: var(--cream);
          border: 1px solid var(--line);
          border-radius: 24px;
          overflow: hidden;
          transition: all 0.3s;
        }
        .v215-root .v215-tool-cell:hover {
          transform: translateY(-6px);
          box-shadow: 0 24px 60px rgba(232, 84, 15, 0.14);
          border-color: var(--peach);
        }
        .v215-root .v215-tool-orb {
          position: absolute;
          top: -40px;
          right: -40px;
          width: 100px;
          height: 100px;
          border-radius: 50%;
          background: radial-gradient(circle at 35% 35%, var(--orange-soft) 0%, var(--orange) 100%);
          opacity: 0.1;
          transition: opacity 0.3s;
        }
        .v215-root .v215-tool-cell:hover .v215-tool-orb { opacity: 0.2; }
        .v215-root .v215-tool-icon {
          position: relative;
          width: 48px;
          height: 48px;
          border-radius: 16px;
          background: var(--dawn-1);
          color: var(--orange);
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 20px;
          border: 1px solid var(--line);
        }
        .v215-root .v215-tool-name {
          position: relative;
          font-family: 'Fraunces', serif;
          font-size: 22px;
          color: var(--ink);
          margin: 0 0 10px;
          font-weight: 500;
          letter-spacing: -0.01em;
          line-height: 1.1;
        }
        .v215-root .v215-tool-pitch {
          position: relative;
          font-family: 'Fraunces', serif;
          font-style: italic;
          font-size: 13px;
          line-height: 1.5;
          color: var(--ink-light);
          margin-bottom: 16px;
          min-height: 40px;
        }
        .v215-root .v215-tool-aud {
          position: relative;
          display: inline-block;
          font-family: 'Fraunces', serif;
          font-style: italic;
          font-size: 12px;
          padding: 4px 12px;
          border-radius: 999px;
          background: var(--dawn-1);
        }
        .v215-root .v215-tool-aud-discover {
          color: var(--leaf);
          background: rgba(107, 142, 78, 0.1);
        }
        .v215-root .v215-tool-aud-build {
          color: var(--terra);
          background: rgba(232, 84, 15, 0.1);
        }
        .v215-root .v215-tool-aud-both {
          color: var(--ink);
          background: rgba(42, 26, 16, 0.06);
        }

        @media (max-width: 900px) {
          .v215-root .v215-hero-inner { grid-template-columns: 1fr; gap: 56px; }
          .v215-root .v215-hero-title { font-size: 52px; }
          .v215-root .v215-hero-orb { width: 220px; height: 220px; }
          .v215-root .v215-hero-orb-ring { inset: -24px; }
          .v215-root .v215-hero-orb-ring-2 { inset: -48px; }
          .v215-root .v215-section-title { font-size: 44px; }
          .v215-root .v215-cta h2 { font-size: 48px; }
          .v215-root .v215-features-grid { grid-template-columns: 1fr 1fr; }
          .v215-root .v215-sunrise { grid-template-columns: 1fr; padding: 36px 28px; }
          .v215-root .v215-sunrise-orb { margin: 0 auto; }
          .v215-root .v215-sunrise-headline { font-size: 26px; }
          .v215-root .v215-orb-hero { width: 420px; height: 420px; }
          .v215-root .v215-nav-links a { display: none; }
          .v215-root .v215-nav-links .v215-nav-cta { display: inline-flex; }
          .v215-root .v215-promo-title { font-size: 32px; }
          .v215-root .v215-tools-grid { grid-template-columns: 1fr 1fr; }
          .v215-root .v215-promo-block,
          .v215-root .v215-tools-block { padding: 36px 24px; }
          .v215-root .v215-tools-block { padding: 48px 28px; }
        }
      `}</style>
    </div>
  );
}
