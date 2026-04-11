/**
 * Variant 2.1.1 — Isometric Blueprint
 *
 * Bold Geometry evolved into an engineering-drawing aesthetic.
 * Drifting CSS isometric wireframes, orange blueprint grid,
 * dimension-callout section breaks.
 *
 * @tier SIMPLE (preview-only, no business logic)
 */
'use client';

import { useEffect } from 'react';
import nextDynamic from 'next/dynamic';
import { Star, Gift, Calendar, Clock, LayoutGrid } from 'lucide-react';

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
      <div className="h-6 w-32 bg-white/10 rounded mb-4" />
      <div className="flex gap-4 overflow-hidden">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex-shrink-0 w-56 h-72 bg-white/5 rounded-xl" />
        ))}
      </div>
    </div>
  );
}

interface SpecPlateProps {
  number: string;
  section: string;
  headline: string;
  pitch: string;
}

function SpecPlate({ number, section, headline, pitch }: SpecPlateProps) {
  return (
    <div className="v211-spec-plate">
      <div className="v211-spec-plate-number">{number}</div>
      <div className="v211-spec-plate-rule" />
      <div className="v211-spec-plate-meta">
        <div className="v211-spec-plate-section">{section}</div>
        <h3 className="v211-spec-plate-headline">{headline}</h3>
        <p className="v211-spec-plate-pitch">{pitch}</p>
      </div>
      <div className="v211-spec-plate-dim">
        <span>⊢</span>
        <span>DIM · {number}.00</span>
        <span>⊣</span>
      </div>
    </div>
  );
}

export default function Variant211Page() {
  const { data, isLoading, error, refetch } = useHomepageData();

  useEffect(() => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href =
      'https://fonts.googleapis.com/css2?family=Krona+One&family=Space+Mono:wght@400;700&family=Poppins:wght@400;500;600;700;800;900&display=swap';
    document.head.appendChild(link);
    return () => {
      document.head.removeChild(link);
    };
  }, []);

  return (
    <div className="v211-root">
      {/* ───── GLOBAL BACKGROUND LAYERS ───── */}
      <div className="v211-bg">
        <div className="v211-bg-grid" />
        <div className="v211-bg-noise" />
        <div className="v211-iso v211-iso-1">
          <div className="v211-iso-top" />
          <div className="v211-iso-left" />
          <div className="v211-iso-right" />
        </div>
        <div className="v211-iso v211-iso-2">
          <div className="v211-iso-top" />
          <div className="v211-iso-left" />
          <div className="v211-iso-right" />
        </div>
        <div className="v211-iso v211-iso-3">
          <div className="v211-iso-top" />
          <div className="v211-iso-left" />
          <div className="v211-iso-right" />
        </div>
      </div>

      {/* ───── NAV ───── */}
      <nav className="v211-nav">
        <div className="v211-nav-inner">
          <img
            src="/uploads/site/branding/namelogo-horizontal.png"
            alt="Bizconekt"
            className="v211-nav-logo"
          />
          <div className="v211-nav-tag">BLUEPRINT · REV 2.1.1</div>
          <div className="v211-nav-links">
            <a href="/listings">Listings</a>
            <a href="/events">Events</a>
            <a href="/offers">Offers</a>
            <a href="/jobs">Jobs</a>
            <a href="/register" className="v211-nav-cta">Join Free</a>
          </div>
        </div>
      </nav>

      {/* ───── HERO ───── */}
      <section className="v211-hero">
        <div className="v211-hero-inner">
          <div className="v211-hero-coord v211-hero-coord-tl">A–01 ▸ ORIGIN</div>
          <div className="v211-hero-coord v211-hero-coord-tr">SCALE 1 : 1</div>
          <div className="v211-hero-coord v211-hero-coord-bl">SHEET 01 / 01</div>
          <div className="v211-hero-coord v211-hero-coord-br">DWG · BIZ / 2.1.1</div>

          <div className="v211-hero-grid">
            <div>
              <div className="v211-eyebrow">
                <span className="v211-eyebrow-bar" />
                NETWORK SCHEMATIC
              </div>
              <h1 className="v211-hero-title">
                Connect.
                <br />
                Discover.
                <br />
                <span className="v211-accent">Grow.</span>
              </h1>
              <p className="v211-hero-text">
                Every business a measured coordinate. Every opportunity a plotted vector.
                Bizconekt renders the local economy as an engineering drawing.
              </p>
              <div className="v211-hero-actions">
                <button className="v211-btn-primary">Join Bizconekt →</button>
                <button className="v211-btn-ghost">View Blueprint</button>
              </div>
            </div>

            <div className="v211-hero-right">
              <div className="v211-stat-plate">
                <div className="v211-stat-corner v211-stat-corner-tl" />
                <div className="v211-stat-corner v211-stat-corner-tr" />
                <div className="v211-stat-corner v211-stat-corner-bl" />
                <div className="v211-stat-corner v211-stat-corner-br" />
                <div className="v211-stat-grid">
                  <div className="v211-stat-cell">
                    <div className="v211-stat-label">Businesses</div>
                    <div className="v211-stat-value">
                      {data?.stats?.total_listings?.toLocaleString() ?? '500'}
                      <span>+</span>
                    </div>
                    <div className="v211-stat-tick">├─ A.01</div>
                  </div>
                  <div className="v211-stat-cell">
                    <div className="v211-stat-label">Members</div>
                    <div className="v211-stat-value">
                      {data?.stats?.total_users?.toLocaleString() ?? '1.2K'}
                    </div>
                    <div className="v211-stat-tick">├─ A.02</div>
                  </div>
                  <div className="v211-stat-cell">
                    <div className="v211-stat-label">Events</div>
                    <div className="v211-stat-value">
                      {data?.stats?.total_events ?? '150'}
                      <span>+</span>
                    </div>
                    <div className="v211-stat-tick">├─ A.03</div>
                  </div>
                  <div className="v211-stat-cell">
                    <div className="v211-stat-label">Reviews</div>
                    <div className="v211-stat-value">
                      {data?.stats?.total_reviews ?? '890'}
                      <span>+</span>
                    </div>
                    <div className="v211-stat-tick">├─ A.04</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ───── SEARCH ───── */}
      <section className="v211-search-section">
        <div className="v211-search-bar">
          <div className="v211-search-label">QUERY</div>
          <input type="text" placeholder="Search businesses, events, offers..." />
          <button>Execute</button>
        </div>
      </section>

      {/* ───── FEATURES ───── */}
      <section className="v211-features">
        <div className="v211-section-label">
          <span className="v211-eyebrow-bar" />
          CAPABILITIES REGISTER
        </div>
        <h2 className="v211-section-title">Built for Business</h2>
        <div className="v211-features-grid">
          {[
            ['01', 'Directory', 'Local business schematic with live verification'],
            ['02', 'Events', 'Plotted networking vectors across the network'],
            ['03', 'Offers', 'Measurable promotional instruments'],
            ['04', 'Pro Network', 'Cross-referenced professional connections'],
          ].map(([num, title, desc]) => (
            <div key={num} className="v211-feature-cell">
              <div className="v211-feature-num">{num}</div>
              <div className="v211-feature-tick" />
              <h3>{title}</h3>
              <p>{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ───── LIVE SCROLLER BLOCK ───── */}
      <section className="v211-scroll-zone">
        <div className="v211-scroll-inner">
          <SpecPlate
            number="00"
            section="FIELD SURVEY · ENTRY POINT"
            headline="The local economy, measured end-to-end."
            pitch="Real listings. Real offers. Real events. Every card below is plotted from live platform data."
          />

          <FlashOffersSection maxOffers={6} />

          {error && (
            <div className="v211-error">
              {error}
              <button onClick={refetch}>Retry</button>
            </div>
          )}

          <div className="v211-scroll-block">
            {isLoading ? (
              <Skeleton />
            ) : data?.categories && data.categories.length > 0 ? (
              <div className="v211-panel">
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
              <div className="v211-panel">
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
              <div className="v211-panel">
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
              <div className="v211-panel">
                <ContentSlider title="Events" icon={Calendar} moreLink="/events">
                  {data.upcoming_events.map((event, index) => (
                    <EventCard key={event.id} event={event} index={index} />
                  ))}
                </ContentSlider>
              </div>
            ) : null}
          </div>

          <SpecPlate
            number="03"
            section="CROSS-REFERENCE · COMMUNITY LAYER"
            headline="Trust, plotted in three dimensions."
            pitch="Members recommend what works. Our Top Recommenders surface the voices the community already trusts."
          />

          <div className="v211-panel">
            <TopRecommendersScroller limit={10} />
          </div>

          <div className="v211-scroll-block">
            {isLoading ? (
              <Skeleton />
            ) : data?.latest_listings && data.latest_listings.length > 0 ? (
              <div className="v211-panel">
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

          <SpecPlate
            number="04"
            section="KNOWLEDGE LAYER · CONTENT & CREATORS"
            headline="Two doors into the network."
            pitch="Browsers read, watch and listen. Builders publish, host and connect. Both walk in through the same front door."
          />

          {/* ─── CONTENT SCROLLER ─── */}
          <div className="v211-promo-block">
            <div className="v211-promo-header">
              <div>
                <div className="v211-promo-kicker">▸ PUBLICATION 04 · CONTENT HUB</div>
                <h3 className="v211-promo-title">Read. Watch. Listen. Learn.</h3>
                <p className="v211-promo-sub">Articles, videos, podcasts, guides, and newsletters — published by the community, for the community.</p>
              </div>
              <div className="v211-promo-count">
                <span>06</span>
                <div className="v211-promo-count-label">FORMATS<br/>ONE HUB</div>
              </div>
            </div>
            <div className="v211-scroller">
              {PREVIEW_CONTENT.map((item) => {
                const Icon = item.icon;
                return (
                  <article key={item.id} className="v211-content-card">
                    <div className="v211-content-card-top">
                      <div className="v211-content-kind">
                        <Icon className="w-3 h-3" />
                        {item.kind.toUpperCase()}
                      </div>
                      <div className="v211-content-tick">├─</div>
                    </div>
                    <h4 className="v211-content-title">{item.title}</h4>
                    <div className="v211-content-meta">
                      <span>{item.author}</span>
                      <span>·</span>
                      <span>{item.meta}</span>
                    </div>
                    <div className="v211-content-corner v211-content-corner-tl" />
                    <div className="v211-content-corner v211-content-corner-br" />
                  </article>
                );
              })}
            </div>
          </div>

          {/* ─── CREATORS SCROLLER ─── */}
          <div className="v211-promo-block">
            <div className="v211-promo-header">
              <div>
                <div className="v211-promo-kicker">▸ PUBLICATION 05 · CREATOR NETWORK</div>
                <h3 className="v211-promo-title">Meet the makers.</h3>
                <p className="v211-promo-sub">Podcasters, writers, video creators, and affiliate marketers building audiences — and businesses — on top of Bizconekt.</p>
              </div>
              <div className="v211-promo-count">
                <span>05</span>
                <div className="v211-promo-count-label">CREATOR<br/>TYPES</div>
              </div>
            </div>
            <div className="v211-scroller">
              {PREVIEW_CREATORS.map((creator) => {
                const Icon = creator.icon;
                return (
                  <article key={creator.id} className="v211-creator-card">
                    <div className="v211-creator-top">
                      <div className="v211-creator-avatar">
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="v211-creator-kind">{creator.kind.toUpperCase()}</div>
                    </div>
                    <h4 className="v211-creator-name">{creator.name}</h4>
                    <div className="v211-creator-handle">{creator.handle}</div>
                    <p className="v211-creator-bio">{creator.bio}</p>
                    <div className="v211-creator-footer">
                      <span>FOLLOWERS</span>
                      <strong>{creator.followers}</strong>
                    </div>
                    <div className="v211-content-corner v211-content-corner-tl" />
                    <div className="v211-content-corner v211-content-corner-br" />
                  </article>
                );
              })}
            </div>
          </div>

          <SpecPlate
            number="05"
            section="OPPORTUNITY FIELD · HIRING"
            headline="Where careers get engineered."
            pitch="Local businesses need people. See the hiring grid, plotted by company and role."
          />

          <WhosHiringSection maxJobs={4} />

          {/* ─── TOOLS SHOWCASE ─── */}
          <div className="v211-tools-block">
            <div className="v211-tools-header">
              <div className="v211-promo-kicker">▸ PUBLICATION 06 · OPERATOR TOOLKIT</div>
              <h3 className="v211-promo-title">Every tool a listing needs.</h3>
              <p className="v211-promo-sub">
                12 instruments calibrated for listing members — from connection groups and quote pools to campaigns and analytics.
                Free members get <em>Discover</em> tools; paid tiers unlock <em>Build</em>.
              </p>
            </div>
            <div className="v211-tools-grid">
              {PREVIEW_TOOLS.map((tool, idx) => {
                const Icon = tool.icon;
                return (
                  <div key={tool.id} className="v211-tool-cell">
                    <div className="v211-tool-num">T.{String(idx + 1).padStart(2, '0')}</div>
                    <div className="v211-tool-icon">
                      <Icon className="w-5 h-5" />
                    </div>
                    <h4 className="v211-tool-name">{tool.name}</h4>
                    <p className="v211-tool-pitch">{tool.pitch}</p>
                    <div className={`v211-tool-aud v211-tool-aud-${tool.audience}`}>
                      {tool.audience === 'discover' ? '◇ DISCOVER' : tool.audience === 'build' ? '◆ BUILD' : '◆◇ BOTH'}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <SpecPlate
            number="06"
            section="FINAL ASSEMBLY · JOIN"
            headline="Step onto the grid."
            pitch="Create a free account and start plotting your coordinates in the local economy."
          />
        </div>
      </section>

      {/* ───── CTA ───── */}
      <section className="v211-cta">
        <div className="v211-cta-inner">
          <div className="v211-cta-tick">└─ FINAL ASSEMBLY</div>
          <h2>Ready to build?</h2>
          <p>Create a free account and start plotting your position.</p>
          <button className="v211-btn-primary v211-cta-btn">Create Free Account →</button>
        </div>
      </section>

      <SiteFooter />

      <style jsx global>{`
        .v211-root {
          --navy: #001a2c;
          --navy-2: #002641;
          --navy-3: #003a5c;
          --orange: #ed6437;
          --orange-soft: #f28a5c;
          --teal: #0d7377;
          --cream: #f7f5ef;
          --line: rgba(237, 100, 55, 0.22);
          --line-strong: rgba(237, 100, 55, 0.45);
          --text-on-dark: rgba(247, 245, 239, 0.78);
          --text-on-dark-dim: rgba(247, 245, 239, 0.42);

          font-family: 'Poppins', sans-serif;
          background: var(--navy);
          color: var(--cream);
          position: relative;
          overflow-x: hidden;
          -webkit-font-smoothing: antialiased;
        }

        /* ─── BG LAYERS ─── */
        .v211-root .v211-bg {
          position: fixed;
          inset: 0;
          z-index: 0;
          pointer-events: none;
        }
        .v211-root .v211-bg-grid {
          position: absolute;
          inset: 0;
          background-image:
            linear-gradient(var(--line) 1px, transparent 1px),
            linear-gradient(90deg, var(--line) 1px, transparent 1px);
          background-size: 40px 40px;
          background-position: -1px -1px;
          mask-image: radial-gradient(circle at 50% 40%, #000 55%, transparent 95%);
        }
        .v211-root .v211-bg-noise {
          position: absolute;
          inset: 0;
          opacity: 0.05;
          mix-blend-mode: overlay;
          background-image: radial-gradient(rgba(255, 255, 255, 0.25) 1px, transparent 1px);
          background-size: 3px 3px;
        }

        /* Isometric drifting shapes */
        .v211-root .v211-iso {
          position: absolute;
          width: 160px;
          height: 160px;
          transform-style: preserve-3d;
          opacity: 0.08;
          animation: v211-drift 24s ease-in-out infinite;
        }
        .v211-root .v211-iso-1 { top: 12%; left: 6%; animation-delay: 0s; }
        .v211-root .v211-iso-2 { top: 48%; right: 8%; width: 220px; height: 220px; animation-delay: -8s; opacity: 0.06; }
        .v211-root .v211-iso-3 { bottom: 14%; left: 18%; width: 120px; height: 120px; animation-delay: -16s; opacity: 0.1; }

        .v211-root .v211-iso-top,
        .v211-root .v211-iso-left,
        .v211-root .v211-iso-right {
          position: absolute;
          border: 1.5px solid var(--orange);
          background: transparent;
        }
        .v211-root .v211-iso-top {
          width: 100%;
          height: 100%;
          transform: rotate(45deg) skew(-15deg, -15deg);
          border-color: var(--orange);
        }
        .v211-root .v211-iso-left {
          width: 70%;
          height: 100%;
          left: 0;
          top: 35%;
          transform: skewY(30deg);
          border-color: var(--teal);
        }
        .v211-root .v211-iso-right {
          width: 70%;
          height: 100%;
          right: 0;
          top: 35%;
          transform: skewY(-30deg);
          border-color: var(--orange-soft);
        }
        @keyframes v211-drift {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          50% { transform: translateY(-20px) rotate(4deg); }
        }

        /* ─── NAV ─── */
        .v211-root .v211-nav {
          position: sticky;
          top: 0;
          z-index: 50;
          background: rgba(0, 26, 44, 0.88);
          backdrop-filter: blur(10px);
          border-bottom: 1px solid var(--line);
        }
        .v211-root .v211-nav-inner {
          max-width: 1320px;
          margin: 0 auto;
          padding: 0 40px;
          display: flex;
          align-items: center;
          gap: 32px;
          height: 68px;
        }
        .v211-root .v211-nav-logo {
          height: 28px;
          filter: brightness(0) invert(1);
        }
        .v211-root .v211-nav-tag {
          font-family: 'Space Mono', monospace;
          font-size: 10px;
          letter-spacing: 0.2em;
          color: var(--orange);
          padding: 5px 10px;
          border: 1px solid var(--line-strong);
        }
        .v211-root .v211-nav-links {
          display: flex;
          margin-left: auto;
          align-items: center;
          height: 100%;
        }
        .v211-root .v211-nav-links a {
          font-size: 12px;
          font-weight: 600;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: var(--text-on-dark);
          text-decoration: none;
          padding: 0 20px;
          height: 100%;
          display: flex;
          align-items: center;
          border-bottom: 2px solid transparent;
          transition: all 0.2s;
        }
        .v211-root .v211-nav-links a:hover {
          color: var(--cream);
          border-bottom-color: var(--orange);
        }
        .v211-root .v211-nav-cta {
          background: var(--orange) !important;
          color: var(--cream) !important;
          padding: 10px 22px !important;
          height: auto !important;
          border-bottom: none !important;
          clip-path: polygon(0 0, calc(100% - 8px) 0, 100% 100%, 8px 100%);
        }
        .v211-root .v211-nav-cta:hover {
          background: #ff7549 !important;
        }

        /* ─── HERO ─── */
        .v211-root .v211-hero {
          position: relative;
          z-index: 1;
          padding: 100px 0 140px;
        }
        .v211-root .v211-hero-inner {
          max-width: 1320px;
          margin: 0 auto;
          padding: 0 40px;
          position: relative;
        }
        .v211-root .v211-hero-coord {
          position: absolute;
          font-family: 'Space Mono', monospace;
          font-size: 11px;
          color: var(--text-on-dark-dim);
          letter-spacing: 0.15em;
          padding: 6px 10px;
          border: 1px solid var(--line);
        }
        .v211-root .v211-hero-coord-tl { top: -40px; left: 40px; }
        .v211-root .v211-hero-coord-tr { top: -40px; right: 40px; }
        .v211-root .v211-hero-coord-bl { bottom: -40px; left: 40px; }
        .v211-root .v211-hero-coord-br { bottom: -40px; right: 40px; }

        .v211-root .v211-hero-grid {
          display: grid;
          grid-template-columns: 1.1fr 1fr;
          gap: 80px;
          align-items: center;
        }
        .v211-root .v211-eyebrow {
          font-family: 'Space Mono', monospace;
          font-size: 11px;
          letter-spacing: 0.24em;
          text-transform: uppercase;
          color: var(--orange);
          display: flex;
          align-items: center;
          gap: 14px;
          margin-bottom: 32px;
        }
        .v211-root .v211-eyebrow-bar {
          display: block;
          width: 48px;
          height: 2px;
          background: var(--orange);
        }
        .v211-root .v211-hero-title {
          font-family: 'Krona One', 'Poppins', sans-serif;
          font-size: 76px;
          line-height: 0.96;
          letter-spacing: -0.02em;
          color: var(--cream);
          margin: 0 0 32px;
          font-weight: 400;
        }
        .v211-root .v211-accent {
          position: relative;
          color: var(--orange);
        }
        .v211-root .v211-accent::after {
          content: '';
          position: absolute;
          left: 0;
          right: 0;
          bottom: 10px;
          height: 6px;
          background: var(--orange);
          opacity: 0.25;
        }
        .v211-root .v211-hero-text {
          font-size: 16px;
          line-height: 1.75;
          color: var(--text-on-dark);
          max-width: 520px;
          margin-bottom: 44px;
        }
        .v211-root .v211-hero-actions {
          display: flex;
          gap: 18px;
        }
        .v211-root .v211-btn-primary {
          font-family: 'Poppins', sans-serif;
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          padding: 18px 38px;
          border: none;
          background: var(--orange);
          color: var(--cream);
          cursor: pointer;
          clip-path: polygon(0 0, calc(100% - 14px) 0, 100% 100%, 14px 100%);
          transition: background 0.2s;
        }
        .v211-root .v211-btn-primary:hover { background: #ff7549; }
        .v211-root .v211-btn-ghost {
          font-family: 'Space Mono', monospace;
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          padding: 18px 30px;
          background: transparent;
          color: var(--cream);
          border: 1px solid var(--line-strong);
          cursor: pointer;
          transition: all 0.2s;
        }
        .v211-root .v211-btn-ghost:hover { border-color: var(--orange); color: var(--orange); }

        /* Stat plate */
        .v211-root .v211-hero-right { position: relative; }
        .v211-root .v211-stat-plate {
          position: relative;
          padding: 40px;
          background: rgba(0, 58, 92, 0.25);
          border: 1px solid var(--line);
        }
        .v211-root .v211-stat-corner {
          position: absolute;
          width: 14px;
          height: 14px;
          border: 2px solid var(--orange);
        }
        .v211-root .v211-stat-corner-tl { top: -1px; left: -1px; border-right: none; border-bottom: none; }
        .v211-root .v211-stat-corner-tr { top: -1px; right: -1px; border-left: none; border-bottom: none; }
        .v211-root .v211-stat-corner-bl { bottom: -1px; left: -1px; border-right: none; border-top: none; }
        .v211-root .v211-stat-corner-br { bottom: -1px; right: -1px; border-left: none; border-top: none; }
        .v211-root .v211-stat-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 28px 40px;
        }
        .v211-root .v211-stat-label {
          font-family: 'Space Mono', monospace;
          font-size: 10px;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          color: var(--text-on-dark-dim);
          margin-bottom: 6px;
        }
        .v211-root .v211-stat-value {
          font-family: 'Krona One', sans-serif;
          font-size: 38px;
          line-height: 1;
          color: var(--cream);
          display: flex;
          align-items: baseline;
          gap: 2px;
        }
        .v211-root .v211-stat-value span {
          font-size: 22px;
          color: var(--orange);
        }
        .v211-root .v211-stat-tick {
          font-family: 'Space Mono', monospace;
          font-size: 9px;
          color: var(--orange);
          margin-top: 4px;
          letter-spacing: 0.15em;
        }

        /* ─── SEARCH ─── */
        .v211-root .v211-search-section {
          position: relative;
          z-index: 2;
          max-width: 840px;
          margin: -50px auto 0;
          padding: 0 40px;
        }
        .v211-root .v211-search-bar {
          display: flex;
          align-items: center;
          background: var(--cream);
          border: 1px solid var(--navy);
          box-shadow: 12px 12px 0 var(--orange);
        }
        .v211-root .v211-search-label {
          font-family: 'Space Mono', monospace;
          font-size: 10px;
          letter-spacing: 0.2em;
          color: var(--navy);
          padding: 0 18px;
          border-right: 1px solid rgba(0, 38, 65, 0.25);
          align-self: stretch;
          display: flex;
          align-items: center;
        }
        .v211-root .v211-search-bar input {
          flex: 1;
          border: none;
          padding: 22px 24px;
          font-family: 'Poppins', sans-serif;
          font-size: 15px;
          color: var(--navy);
          outline: none;
          background: transparent;
        }
        .v211-root .v211-search-bar button {
          font-family: 'Space Mono', monospace;
          font-size: 11px;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          padding: 0 32px;
          align-self: stretch;
          background: var(--navy);
          color: var(--cream);
          border: none;
          cursor: pointer;
        }
        .v211-root .v211-search-bar button:hover { background: var(--orange); }

        /* ─── FEATURES ─── */
        .v211-root .v211-features {
          position: relative;
          z-index: 1;
          max-width: 1320px;
          margin: 0 auto;
          padding: 120px 40px 80px;
        }
        .v211-root .v211-section-label {
          display: flex;
          align-items: center;
          gap: 14px;
          font-family: 'Space Mono', monospace;
          font-size: 11px;
          letter-spacing: 0.24em;
          text-transform: uppercase;
          color: var(--orange);
          justify-content: center;
          margin-bottom: 14px;
        }
        .v211-root .v211-section-title {
          font-family: 'Krona One', sans-serif;
          font-size: 52px;
          line-height: 1;
          color: var(--cream);
          text-align: center;
          margin-bottom: 64px;
          font-weight: 400;
        }
        .v211-root .v211-features-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 0;
        }
        .v211-root .v211-feature-cell {
          position: relative;
          padding: 44px 32px 44px;
          border: 1px solid var(--line);
          margin: -0.5px;
          background: rgba(0, 26, 44, 0.5);
          backdrop-filter: blur(4px);
          transition: all 0.3s;
        }
        .v211-root .v211-feature-cell:hover {
          background: rgba(237, 100, 55, 0.07);
          border-color: var(--orange);
          z-index: 2;
        }
        .v211-root .v211-feature-num {
          font-family: 'Space Mono', monospace;
          font-size: 12px;
          color: var(--orange);
          letter-spacing: 0.2em;
          margin-bottom: 16px;
        }
        .v211-root .v211-feature-tick {
          width: 32px;
          height: 2px;
          background: var(--orange);
          margin-bottom: 20px;
        }
        .v211-root .v211-feature-cell h3 {
          font-family: 'Krona One', sans-serif;
          font-size: 20px;
          color: var(--cream);
          margin-bottom: 12px;
          font-weight: 400;
        }
        .v211-root .v211-feature-cell p {
          font-size: 13px;
          line-height: 1.7;
          color: var(--text-on-dark);
        }

        /* ─── SCROLL ZONE ─── */
        .v211-root .v211-scroll-zone {
          position: relative;
          z-index: 1;
          padding: 80px 0 100px;
        }
        .v211-root .v211-scroll-inner {
          max-width: 1320px;
          margin: 0 auto;
          padding: 0 40px;
        }
        .v211-root .v211-scroll-block {
          display: flex;
          flex-direction: column;
          gap: 32px;
          margin: 48px 0;
        }

        /* Panel wrapper around each ContentSlider */
        .v211-root .v211-panel {
          position: relative;
          padding: 32px 28px;
          background: rgba(0, 26, 44, 0.55);
          border: 1px solid var(--line);
          backdrop-filter: blur(6px);
        }
        .v211-root .v211-panel::before,
        .v211-root .v211-panel::after {
          content: '';
          position: absolute;
          width: 16px;
          height: 16px;
          border: 2px solid var(--orange);
          pointer-events: none;
        }
        .v211-root .v211-panel::before {
          top: -1px;
          left: -1px;
          border-right: none;
          border-bottom: none;
        }
        .v211-root .v211-panel::after {
          bottom: -1px;
          right: -1px;
          border-left: none;
          border-top: none;
        }
        .v211-root .v211-panel h2 {
          color: var(--cream);
        }
        .v211-root .v211-panel p,
        .v211-root .v211-panel span {
          color: var(--text-on-dark);
        }

        /* Spec plate section breaks */
        .v211-root .v211-spec-plate {
          display: grid;
          grid-template-columns: auto 1fr auto;
          gap: 32px;
          align-items: center;
          padding: 36px 40px;
          margin: 40px 0;
          background: rgba(247, 245, 239, 0.03);
          border: 1px solid var(--line);
          position: relative;
        }
        .v211-root .v211-spec-plate::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          width: 6px;
          height: 100%;
          background: var(--orange);
        }
        .v211-root .v211-spec-plate-number {
          font-family: 'Krona One', sans-serif;
          font-size: 88px;
          line-height: 0.85;
          color: var(--orange);
        }
        .v211-root .v211-spec-plate-rule {
          width: 2px;
          height: 80px;
          background: var(--line);
        }
        .v211-root .v211-spec-plate-meta {
          max-width: 640px;
        }
        .v211-root .v211-spec-plate-section {
          font-family: 'Space Mono', monospace;
          font-size: 11px;
          letter-spacing: 0.2em;
          color: var(--orange);
          margin-bottom: 10px;
        }
        .v211-root .v211-spec-plate-headline {
          font-family: 'Krona One', sans-serif;
          font-size: 28px;
          line-height: 1.2;
          color: var(--cream);
          margin-bottom: 12px;
          font-weight: 400;
        }
        .v211-root .v211-spec-plate-pitch {
          font-size: 14px;
          color: var(--text-on-dark);
          line-height: 1.65;
        }
        .v211-root .v211-spec-plate-dim {
          font-family: 'Space Mono', monospace;
          font-size: 10px;
          color: var(--orange);
          letter-spacing: 0.15em;
          display: flex;
          align-items: center;
          gap: 6px;
          writing-mode: vertical-rl;
          transform: rotate(180deg);
        }

        .v211-root .v211-error {
          background: rgba(237, 100, 55, 0.1);
          border: 1px solid var(--orange);
          color: var(--cream);
          padding: 16px;
          text-align: center;
          margin-bottom: 24px;
        }
        .v211-root .v211-error button {
          background: none;
          border: none;
          color: var(--orange);
          text-decoration: underline;
          cursor: pointer;
          margin-left: 8px;
        }

        /* ─── CTA ─── */
        .v211-root .v211-cta {
          position: relative;
          z-index: 1;
          padding: 120px 40px;
        }
        .v211-root .v211-cta-inner {
          max-width: 760px;
          margin: 0 auto;
          text-align: center;
          position: relative;
        }
        .v211-root .v211-cta-tick {
          font-family: 'Space Mono', monospace;
          font-size: 11px;
          letter-spacing: 0.2em;
          color: var(--orange);
          margin-bottom: 24px;
        }
        .v211-root .v211-cta h2 {
          font-family: 'Krona One', sans-serif;
          font-size: 64px;
          line-height: 1;
          color: var(--cream);
          margin-bottom: 20px;
          font-weight: 400;
        }
        .v211-root .v211-cta p {
          font-size: 17px;
          color: var(--text-on-dark);
          margin-bottom: 40px;
        }
        .v211-root .v211-cta-btn {
          padding: 22px 48px;
          font-size: 13px;
        }

        /* ─── PROMO BLOCKS (Content, Creators) ─── */
        .v211-root .v211-promo-block {
          position: relative;
          padding: 44px 40px;
          margin: 40px 0;
          background: rgba(0, 26, 44, 0.55);
          border: 1px solid var(--line);
          backdrop-filter: blur(6px);
        }
        .v211-root .v211-promo-block::before,
        .v211-root .v211-promo-block::after {
          content: '';
          position: absolute;
          width: 18px;
          height: 18px;
          border: 2px solid var(--orange);
          pointer-events: none;
        }
        .v211-root .v211-promo-block::before {
          top: -1px;
          left: -1px;
          border-right: none;
          border-bottom: none;
        }
        .v211-root .v211-promo-block::after {
          bottom: -1px;
          right: -1px;
          border-left: none;
          border-top: none;
        }
        .v211-root .v211-promo-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 40px;
          margin-bottom: 32px;
          padding-bottom: 24px;
          border-bottom: 1px solid var(--line);
        }
        .v211-root .v211-promo-kicker {
          font-family: 'Space Mono', monospace;
          font-size: 10px;
          letter-spacing: 0.22em;
          color: var(--orange);
          margin-bottom: 10px;
        }
        .v211-root .v211-promo-title {
          font-family: 'Krona One', sans-serif;
          font-size: 32px;
          line-height: 1.1;
          color: var(--cream);
          margin: 0 0 10px;
          font-weight: 400;
        }
        .v211-root .v211-promo-sub {
          font-size: 14px;
          line-height: 1.65;
          color: var(--text-on-dark);
          max-width: 680px;
        }
        .v211-root .v211-promo-sub em {
          font-family: 'Space Mono', monospace;
          font-style: normal;
          color: var(--orange);
          font-size: 12px;
          letter-spacing: 0.1em;
        }
        .v211-root .v211-promo-count {
          flex-shrink: 0;
          display: flex;
          align-items: center;
          gap: 14px;
          font-family: 'Krona One', sans-serif;
        }
        .v211-root .v211-promo-count > span {
          font-size: 72px;
          line-height: 0.85;
          color: var(--orange);
        }
        .v211-root .v211-promo-count-label {
          font-family: 'Space Mono', monospace;
          font-size: 10px;
          letter-spacing: 0.18em;
          color: var(--text-on-dark-dim);
          line-height: 1.45;
        }

        .v211-root .v211-scroller {
          display: flex;
          gap: 20px;
          overflow-x: auto;
          padding: 4px 4px 20px;
          scrollbar-width: thin;
          scrollbar-color: var(--orange) rgba(0, 26, 44, 0.6);
        }
        .v211-root .v211-scroller::-webkit-scrollbar {
          height: 6px;
        }
        .v211-root .v211-scroller::-webkit-scrollbar-track {
          background: rgba(0, 26, 44, 0.6);
        }
        .v211-root .v211-scroller::-webkit-scrollbar-thumb {
          background: var(--orange);
        }

        /* Content card */
        .v211-root .v211-content-card {
          position: relative;
          flex-shrink: 0;
          width: 280px;
          padding: 24px 22px;
          background: rgba(247, 245, 239, 0.04);
          border: 1px solid var(--line);
          transition: all 0.25s;
          cursor: pointer;
        }
        .v211-root .v211-content-card:hover {
          background: rgba(237, 100, 55, 0.08);
          border-color: var(--orange);
        }
        .v211-root .v211-content-card-top {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }
        .v211-root .v211-content-kind {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-family: 'Space Mono', monospace;
          font-size: 10px;
          letter-spacing: 0.18em;
          color: var(--orange);
          padding: 4px 8px;
          border: 1px solid var(--orange);
        }
        .v211-root .v211-content-tick {
          font-family: 'Space Mono', monospace;
          font-size: 12px;
          color: var(--orange);
        }
        .v211-root .v211-content-title {
          font-family: 'Krona One', sans-serif;
          font-size: 17px;
          line-height: 1.25;
          color: var(--cream);
          margin: 0 0 14px;
          font-weight: 400;
          min-height: 84px;
        }
        .v211-root .v211-content-meta {
          font-family: 'Space Mono', monospace;
          font-size: 10px;
          letter-spacing: 0.08em;
          color: var(--text-on-dark-dim);
          display: flex;
          gap: 8px;
        }
        .v211-root .v211-content-corner {
          position: absolute;
          width: 10px;
          height: 10px;
          border: 1.5px solid var(--orange);
          pointer-events: none;
        }
        .v211-root .v211-content-corner-tl {
          top: -1px;
          left: -1px;
          border-right: none;
          border-bottom: none;
        }
        .v211-root .v211-content-corner-br {
          bottom: -1px;
          right: -1px;
          border-left: none;
          border-top: none;
        }

        /* Creator card */
        .v211-root .v211-creator-card {
          position: relative;
          flex-shrink: 0;
          width: 260px;
          padding: 28px 24px;
          background: rgba(247, 245, 239, 0.04);
          border: 1px solid var(--line);
          transition: all 0.25s;
          cursor: pointer;
        }
        .v211-root .v211-creator-card:hover {
          background: rgba(237, 100, 55, 0.08);
          border-color: var(--orange);
        }
        .v211-root .v211-creator-top {
          display: flex;
          align-items: center;
          gap: 14px;
          margin-bottom: 18px;
        }
        .v211-root .v211-creator-avatar {
          width: 44px;
          height: 44px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--navy);
          border: 1px solid var(--orange);
          color: var(--orange);
        }
        .v211-root .v211-creator-kind {
          font-family: 'Space Mono', monospace;
          font-size: 9px;
          letter-spacing: 0.2em;
          color: var(--orange);
        }
        .v211-root .v211-creator-name {
          font-family: 'Krona One', sans-serif;
          font-size: 18px;
          color: var(--cream);
          margin: 0 0 4px;
          font-weight: 400;
        }
        .v211-root .v211-creator-handle {
          font-family: 'Space Mono', monospace;
          font-size: 11px;
          color: var(--orange);
          margin-bottom: 12px;
        }
        .v211-root .v211-creator-bio {
          font-size: 12px;
          line-height: 1.55;
          color: var(--text-on-dark);
          margin-bottom: 18px;
          min-height: 36px;
        }
        .v211-root .v211-creator-footer {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
          padding-top: 14px;
          border-top: 1px solid var(--line);
          font-family: 'Space Mono', monospace;
          font-size: 10px;
          letter-spacing: 0.15em;
        }
        .v211-root .v211-creator-footer span { color: var(--text-on-dark-dim); }
        .v211-root .v211-creator-footer strong {
          font-family: 'Krona One', sans-serif;
          font-size: 18px;
          color: var(--orange);
          font-weight: 400;
        }

        /* ─── TOOLS SHOWCASE ─── */
        .v211-root .v211-tools-block {
          position: relative;
          padding: 52px 40px;
          margin: 56px 0 40px;
          background: rgba(0, 26, 44, 0.7);
          border: 1px solid var(--line);
          backdrop-filter: blur(8px);
        }
        .v211-root .v211-tools-block::before,
        .v211-root .v211-tools-block::after {
          content: '';
          position: absolute;
          width: 22px;
          height: 22px;
          border: 2px solid var(--orange);
          pointer-events: none;
        }
        .v211-root .v211-tools-block::before {
          top: -1px;
          left: -1px;
          border-right: none;
          border-bottom: none;
        }
        .v211-root .v211-tools-block::after {
          bottom: -1px;
          right: -1px;
          border-left: none;
          border-top: none;
        }
        .v211-root .v211-tools-header {
          text-align: center;
          max-width: 720px;
          margin: 0 auto 48px;
          padding-bottom: 32px;
          border-bottom: 1px solid var(--line);
        }
        .v211-root .v211-tools-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 0;
        }
        .v211-root .v211-tool-cell {
          position: relative;
          padding: 28px 22px 24px;
          border: 1px solid var(--line);
          margin: -0.5px;
          transition: all 0.3s;
        }
        .v211-root .v211-tool-cell:hover {
          background: rgba(237, 100, 55, 0.06);
          border-color: var(--orange);
          z-index: 2;
        }
        .v211-root .v211-tool-num {
          font-family: 'Space Mono', monospace;
          font-size: 10px;
          letter-spacing: 0.18em;
          color: var(--orange);
          margin-bottom: 16px;
        }
        .v211-root .v211-tool-icon {
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--cream);
          margin-bottom: 18px;
          border: 1px solid var(--line);
        }
        .v211-root .v211-tool-cell:hover .v211-tool-icon {
          color: var(--orange);
          border-color: var(--orange);
        }
        .v211-root .v211-tool-name {
          font-family: 'Krona One', sans-serif;
          font-size: 15px;
          line-height: 1.2;
          color: var(--cream);
          margin: 0 0 10px;
          font-weight: 400;
        }
        .v211-root .v211-tool-pitch {
          font-size: 12px;
          line-height: 1.55;
          color: var(--text-on-dark);
          margin-bottom: 16px;
          min-height: 38px;
        }
        .v211-root .v211-tool-aud {
          font-family: 'Space Mono', monospace;
          font-size: 9px;
          letter-spacing: 0.15em;
          padding: 4px 8px;
          display: inline-block;
          border: 1px solid currentColor;
        }
        .v211-root .v211-tool-aud-discover { color: #6a9bcc; }
        .v211-root .v211-tool-aud-build { color: var(--orange); }
        .v211-root .v211-tool-aud-both { color: var(--teal); }

        @media (max-width: 900px) {
          .v211-root .v211-hero-grid { grid-template-columns: 1fr; gap: 56px; }
          .v211-root .v211-hero-title { font-size: 44px; }
          .v211-root .v211-section-title { font-size: 34px; }
          .v211-root .v211-features-grid { grid-template-columns: 1fr 1fr; }
          .v211-root .v211-spec-plate { grid-template-columns: 1fr; }
          .v211-root .v211-spec-plate-dim { display: none; }
          .v211-root .v211-spec-plate-rule { display: none; }
          .v211-root .v211-spec-plate-number { font-size: 56px; }
          .v211-root .v211-hero-coord { display: none; }
          .v211-root .v211-nav-links a { display: none; }
          .v211-root .v211-nav-links .v211-nav-cta { display: flex; }
          .v211-root .v211-nav-tag { display: none; }
          .v211-root .v211-promo-header { flex-direction: column; gap: 20px; }
          .v211-root .v211-promo-title { font-size: 24px; }
          .v211-root .v211-promo-count > span { font-size: 48px; }
          .v211-root .v211-tools-grid { grid-template-columns: 1fr 1fr; }
          .v211-root .v211-promo-block,
          .v211-root .v211-tools-block { padding: 32px 24px; }
        }
      `}</style>
    </div>
  );
}
