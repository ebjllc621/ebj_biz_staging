/**
 * Variant 2.1.3 — Editorial Brutalism
 *
 * Cream canvas with exposed 12-column grid, oversized faded numerals
 * as backdrop decor, Instrument Serif masthead typography,
 * pull-quote section breaks with issue numbers.
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
      <div className="h-6 w-32 bg-black/10 rounded mb-4" />
      <div className="flex gap-4 overflow-hidden">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex-shrink-0 w-56 h-72 bg-black/5" />
        ))}
      </div>
    </div>
  );
}

interface PullQuoteProps {
  volume: string;
  issue: string;
  quote: string;
  attribution: string;
}

function PullQuote({ volume, issue, quote, attribution }: PullQuoteProps) {
  return (
    <div className="v213-pull">
      <div className="v213-pull-masthead">
        <div className="v213-pull-vol">
          <span>VOL</span> {volume}
        </div>
        <div className="v213-pull-rule" />
        <div className="v213-pull-issue">
          <span>ISSUE</span> {issue}
        </div>
      </div>
      <blockquote className="v213-pull-quote">
        <span className="v213-pull-mark">&ldquo;</span>
        {quote}
        <span className="v213-pull-mark v213-pull-mark-end">&rdquo;</span>
      </blockquote>
      <div className="v213-pull-attr">— {attribution}</div>
    </div>
  );
}

export default function Variant213Page() {
  const { data, isLoading, error, refetch } = useHomepageData();

  useEffect(() => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href =
      'https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Space+Mono:wght@400;700&family=Inter:wght@400;500;600&display=swap';
    document.head.appendChild(link);
    return () => {
      document.head.removeChild(link);
    };
  }, []);

  return (
    <div className="v213-root">
      {/* ───── GLOBAL BG ───── */}
      <div className="v213-bg">
        <div className="v213-bg-columns">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="v213-bg-column" />
          ))}
        </div>
        <div className="v213-bg-grain" />
      </div>

      {/* ───── MASTHEAD NAV ───── */}
      <nav className="v213-nav">
        <div className="v213-nav-rule v213-nav-rule-top" />
        <div className="v213-nav-rule v213-nav-rule-under" />
        <div className="v213-nav-inner">
          <div className="v213-nav-date">
            <div>MONDAY</div>
            <div className="v213-nav-date-num">NO. 2.1.3</div>
          </div>
          <div className="v213-nav-title">
            <img src="/uploads/site/branding/namelogo-horizontal.png" alt="Bizconekt" />
            <div className="v213-nav-tagline">THE LOCAL BUSINESS JOURNAL</div>
          </div>
          <div className="v213-nav-links">
            <a href="/listings">Listings</a>
            <a href="/events">Events</a>
            <a href="/offers">Offers</a>
            <a href="/jobs">Jobs</a>
            <a href="/register" className="v213-nav-cta">Subscribe</a>
          </div>
        </div>
      </nav>

      {/* ───── HERO ───── */}
      <section className="v213-hero">
        <div className="v213-hero-number">01</div>
        <div className="v213-hero-inner">
          <div className="v213-hero-label">
            <span>FEATURED</span>
            <span className="v213-hero-rule" />
            <span>VOL 02 · ISSUE 01</span>
          </div>
          <h1 className="v213-hero-title">
            Connect.
            <br />
            Discover.
            <br />
            <em>Grow.</em>
          </h1>
          <div className="v213-hero-body">
            <div className="v213-hero-deck">
              The local economy, laid out as an editorial. Every business a story, every offer a
              dispatch, every event a byline. Read the grid.
            </div>
            <div className="v213-hero-meta">
              <div className="v213-meta-row">
                <span>Businesses</span>
                <span className="v213-meta-dots" />
                <span className="v213-meta-num">{data?.stats?.total_listings?.toLocaleString() ?? '500'}+</span>
              </div>
              <div className="v213-meta-row">
                <span>Members</span>
                <span className="v213-meta-dots" />
                <span className="v213-meta-num">{data?.stats?.total_users?.toLocaleString() ?? '1.2K'}</span>
              </div>
              <div className="v213-meta-row">
                <span>Events</span>
                <span className="v213-meta-dots" />
                <span className="v213-meta-num">{data?.stats?.total_events ?? '150'}+</span>
              </div>
              <div className="v213-meta-row">
                <span>Reviews</span>
                <span className="v213-meta-dots" />
                <span className="v213-meta-num">{data?.stats?.total_reviews ?? '890'}+</span>
              </div>
            </div>
          </div>
          <div className="v213-hero-actions">
            <button className="v213-btn-primary">Join Bizconekt</button>
            <button className="v213-btn-ghost">Explore Listings →</button>
          </div>
        </div>
      </section>

      {/* ───── SEARCH ───── */}
      <section className="v213-search-section">
        <div className="v213-search-bar">
          <span>Search the paper.</span>
          <input type="text" placeholder="businesses, events, offers..." />
          <button>Query →</button>
        </div>
      </section>

      {/* ───── FEATURES ───── */}
      <section className="v213-features">
        <div className="v213-features-number">02</div>
        <div className="v213-section-label">
          <span className="v213-section-rule" />
          THE PLATFORM
        </div>
        <h2 className="v213-section-title">
          Built <em>for</em> business.
        </h2>
        <div className="v213-features-grid">
          {[
            ['I', 'Directory', 'Local businesses, laid out as editorial entries.'],
            ['II', 'Events', 'Networking coordinates, printed in advance.'],
            ['III', 'Offers', 'Dispatches of value from the neighborhood.'],
            ['IV', 'Pro Network', 'Bylines that connect across the city.'],
          ].map(([n, t, d]) => (
            <div key={n} className="v213-feature-cell">
              <div className="v213-feature-num">{n}</div>
              <h3>{t}</h3>
              <p>{d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ───── SCROLL ZONE ───── */}
      <section className="v213-scroll-zone">
        <div className="v213-scroll-number v213-scroll-number-3">03</div>
        <div className="v213-scroll-inner">
          <div className="v213-section-label v213-section-label-dark">
            <span className="v213-section-rule" />
            THE FEED
          </div>
          <h2 className="v213-section-title v213-section-title-md">
            Fresh <em>dispatches.</em>
          </h2>

          <FlashOffersSection maxOffers={6} />

          {error && (
            <div className="v213-error">
              {error}
              <button onClick={refetch}>Retry</button>
            </div>
          )}

          <div className="v213-scroll-block">
            {isLoading ? (
              <Skeleton />
            ) : data?.categories && data.categories.length > 0 ? (
              <div className="v213-panel">
                <div className="v213-panel-label">§ 01</div>
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
              <div className="v213-panel">
                <div className="v213-panel-label">§ 02</div>
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
          </div>
        </div>

        <div className="v213-pull-wrap">
          <PullQuote
            volume="02"
            issue="03"
            quote="The best local economy is one you can read like a weekend paper — one column at a time."
            attribution="Editor's note"
          />
        </div>

        <div className="v213-scroll-inner">
          <div className="v213-scroll-block">
            {isLoading ? (
              <Skeleton />
            ) : data?.active_offers && data.active_offers.length > 0 ? (
              <div className="v213-panel">
                <div className="v213-panel-label">§ 03</div>
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
              <div className="v213-panel">
                <div className="v213-panel-label">§ 04</div>
                <ContentSlider title="Events" icon={Calendar} moreLink="/events">
                  {data.upcoming_events.map((event, index) => (
                    <EventCard key={event.id} event={event} index={index} />
                  ))}
                </ContentSlider>
              </div>
            ) : null}
          </div>

          <div className="v213-panel">
            <div className="v213-panel-label">§ 05</div>
            <TopRecommendersScroller limit={10} />
          </div>
        </div>

        <div className="v213-pull-wrap">
          <PullQuote
            volume="02"
            issue="06"
            quote="Every recommendation is a signature. We publish only the ones the community has co-signed."
            attribution="The Community Desk"
          />
        </div>

        <div className="v213-scroll-inner">
          <div className="v213-scroll-block">
            {isLoading ? (
              <Skeleton />
            ) : data?.latest_listings && data.latest_listings.length > 0 ? (
              <div className="v213-panel">
                <div className="v213-panel-label">§ 06</div>
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

          <WhosHiringSection maxJobs={4} />
        </div>

        {/* ─── CONTENT SECTION ─── */}
        <div className="v213-scroll-inner">
          <div className="v213-section-label v213-section-label-dark">
            <span className="v213-section-rule" />
            THE LIBRARY
          </div>
          <h2 className="v213-section-title v213-section-title-md">
            Read. Watch. <em>Listen.</em>
          </h2>
          <p className="v213-promo-deck">
            The network publishes, too. Articles, videos, podcasts, guides, and newsletters — dispatched by members who read the city like a beat.
          </p>
          <div className="v213-promo-scroller">
            {PREVIEW_CONTENT.map((item) => {
              const Icon = item.icon;
              return (
                <article key={item.id} className="v213-content-card">
                  <div className="v213-content-kind">
                    <Icon className="w-3 h-3" />
                    <span>{item.kind}</span>
                  </div>
                  <h4 className="v213-content-title">{item.title}</h4>
                  <div className="v213-content-rule" />
                  <div className="v213-content-byline">
                    By <span className="v213-content-author">{item.author}</span>
                  </div>
                  <div className="v213-content-meta">{item.meta}</div>
                </article>
              );
            })}
          </div>
        </div>

        <div className="v213-pull-wrap">
          <PullQuote
            volume="02"
            issue="07"
            quote="A good local network has bylines, not just listings. We publish both."
            attribution="The Editorial Desk"
          />
        </div>

        {/* ─── CREATORS SECTION ─── */}
        <div className="v213-scroll-inner">
          <div className="v213-section-label v213-section-label-dark">
            <span className="v213-section-rule" />
            CONTRIBUTORS
          </div>
          <h2 className="v213-section-title v213-section-title-md">
            Meet <em>the makers.</em>
          </h2>
          <p className="v213-promo-deck">
            Podcasters, writers, video creators, and affiliate marketers — the people authoring the newsroom you just walked into.
          </p>
          <div className="v213-promo-scroller">
            {PREVIEW_CREATORS.map((creator) => {
              const Icon = creator.icon;
              return (
                <article key={creator.id} className="v213-creator-card">
                  <div className="v213-creator-head">
                    <div className="v213-creator-avatar">
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="v213-creator-kind">{creator.kind}</div>
                  </div>
                  <h4 className="v213-creator-name">{creator.name}</h4>
                  <div className="v213-creator-handle">{creator.handle}</div>
                  <p className="v213-creator-bio">{creator.bio}</p>
                  <div className="v213-creator-rule" />
                  <div className="v213-creator-stats">
                    <span>Followers</span>
                    <strong>{creator.followers}</strong>
                  </div>
                </article>
              );
            })}
          </div>
        </div>

        {/* ─── TOOLS SECTION ─── */}
        <div className="v213-scroll-inner">
          <div className="v213-section-label v213-section-label-dark">
            <span className="v213-section-rule" />
            THE DESK · OPERATOR TOOLKIT
          </div>
          <h2 className="v213-section-title v213-section-title-md">
            Every tool a <em>listing</em> needs.
          </h2>
          <p className="v213-promo-deck">
            Twelve instruments in the newsroom. Connection groups. Quote pools. Campaigns. Analytics. Everything a listing member runs — without leaving the page.
          </p>
          <div className="v213-tools-grid">
            {PREVIEW_TOOLS.map((tool, idx) => {
              const Icon = tool.icon;
              const roman = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'][idx];
              return (
                <div key={tool.id} className="v213-tool-cell">
                  <div className="v213-tool-top">
                    <div className="v213-tool-roman">{roman}</div>
                    <div className="v213-tool-icon">
                      <Icon className="w-4 h-4" />
                    </div>
                  </div>
                  <h4 className="v213-tool-name">{tool.name}</h4>
                  <p className="v213-tool-pitch">{tool.pitch}</p>
                  <div className={`v213-tool-aud v213-tool-aud-${tool.audience}`}>
                    § {tool.audience === 'discover' ? 'DISCOVER' : tool.audience === 'build' ? 'BUILD' : 'BOTH'}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="v213-pull-wrap">
          <PullQuote
            volume="02"
            issue="09"
            quote="Want to be in the next issue? Step onto the page. Two minutes, free, forever."
            attribution="The Masthead"
          />
        </div>
      </section>

      {/* ───── CTA ───── */}
      <section className="v213-cta">
        <div className="v213-cta-number">07</div>
        <div className="v213-cta-inner">
          <div className="v213-section-label v213-section-label-center">
            <span className="v213-section-rule" />
            CLOSING NOTE
            <span className="v213-section-rule" />
          </div>
          <h2>
            Be in the <em>next issue.</em>
          </h2>
          <p>Two minutes. Free forever. Your name on the page tomorrow morning.</p>
          <button className="v213-btn-primary v213-cta-btn">Subscribe Free →</button>
        </div>
      </section>

      <SiteFooter />

      <style jsx global>{`
        .v213-root {
          --paper: #f4f1e8;
          --paper-2: #ebe7d9;
          --ink: #0a0a0a;
          --ink-2: #1a1a1a;
          --ink-light: #3a3a3a;
          --ink-mute: #6b6b6b;
          --accent: #d04520;
          --accent-soft: #e86a42;
          --rule: rgba(10, 10, 10, 0.22);
          --rule-strong: rgba(10, 10, 10, 0.55);

          font-family: 'Inter', sans-serif;
          background: var(--paper);
          color: var(--ink);
          position: relative;
          overflow-x: hidden;
          -webkit-font-smoothing: antialiased;
        }

        /* ─── BG ─── */
        .v213-root .v213-bg {
          position: fixed;
          inset: 0;
          z-index: 0;
          pointer-events: none;
        }
        .v213-root .v213-bg-columns {
          display: grid;
          grid-template-columns: repeat(12, 1fr);
          max-width: 1440px;
          margin: 0 auto;
          height: 100%;
          padding: 0 40px;
          gap: 24px;
        }
        .v213-root .v213-bg-column {
          border-left: 1px dashed rgba(10, 10, 10, 0.06);
          border-right: 1px dashed rgba(10, 10, 10, 0.06);
          height: 100%;
        }
        .v213-root .v213-bg-grain {
          position: absolute;
          inset: 0;
          opacity: 0.12;
          mix-blend-mode: multiply;
          background-image:
            radial-gradient(rgba(10, 10, 10, 0.4) 1px, transparent 1px),
            radial-gradient(rgba(10, 10, 10, 0.3) 0.5px, transparent 0.5px);
          background-size: 3px 3px, 7px 7px;
          background-position: 0 0, 1.5px 1.5px;
        }

        /* ─── NAV / MASTHEAD ─── */
        .v213-root .v213-nav {
          position: relative;
          z-index: 10;
          padding: 24px 0 0;
        }
        .v213-root .v213-nav-rule {
          height: 4px;
          background: var(--ink);
          max-width: 1440px;
          margin: 0 auto;
        }
        .v213-root .v213-nav-rule-top {
          height: 2px;
        }
        .v213-root .v213-nav-rule-under {
          height: 1px;
          margin-top: 4px;
        }
        .v213-root .v213-nav-inner {
          max-width: 1440px;
          margin: 0 auto;
          padding: 28px 40px 28px;
          display: grid;
          grid-template-columns: 180px 1fr auto;
          gap: 40px;
          align-items: center;
        }
        .v213-root .v213-nav-date {
          font-family: 'Space Mono', monospace;
          font-size: 10px;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: var(--ink-light);
          line-height: 1.4;
        }
        .v213-root .v213-nav-date-num {
          color: var(--accent);
          margin-top: 2px;
        }
        .v213-root .v213-nav-title {
          text-align: center;
        }
        .v213-root .v213-nav-title img {
          height: 36px;
          filter: brightness(0);
        }
        .v213-root .v213-nav-tagline {
          font-family: 'Instrument Serif', serif;
          font-style: italic;
          font-size: 14px;
          color: var(--ink-light);
          margin-top: 6px;
          letter-spacing: 0.02em;
        }
        .v213-root .v213-nav-links {
          display: flex;
          gap: 4px;
          align-items: center;
        }
        .v213-root .v213-nav-links a {
          font-family: 'Space Mono', monospace;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          color: var(--ink);
          text-decoration: none;
          padding: 10px 14px;
          border-bottom: 2px solid transparent;
          transition: border-color 0.2s;
        }
        .v213-root .v213-nav-links a:hover {
          border-bottom-color: var(--accent);
        }
        .v213-root .v213-nav-cta {
          background: var(--ink) !important;
          color: var(--paper) !important;
          padding: 10px 18px !important;
          border: none !important;
        }
        .v213-root .v213-nav-cta:hover {
          background: var(--accent) !important;
        }

        /* ─── HERO ─── */
        .v213-root .v213-hero {
          position: relative;
          z-index: 1;
          max-width: 1440px;
          margin: 0 auto;
          padding: 80px 40px 100px;
        }
        .v213-root .v213-hero-number {
          position: absolute;
          top: 40px;
          right: 40px;
          font-family: 'Instrument Serif', serif;
          font-size: 420px;
          line-height: 0.75;
          color: rgba(10, 10, 10, 0.04);
          pointer-events: none;
          user-select: none;
        }
        .v213-root .v213-hero-inner {
          position: relative;
          max-width: 1000px;
        }
        .v213-root .v213-hero-label {
          display: flex;
          align-items: center;
          gap: 16px;
          font-family: 'Space Mono', monospace;
          font-size: 11px;
          letter-spacing: 0.22em;
          text-transform: uppercase;
          color: var(--accent);
          margin-bottom: 32px;
        }
        .v213-root .v213-hero-rule {
          flex-grow: 0;
          width: 48px;
          height: 1px;
          background: var(--accent);
          display: inline-block;
        }
        .v213-root .v213-hero-title {
          font-family: 'Instrument Serif', serif;
          font-size: 148px;
          line-height: 0.92;
          letter-spacing: -0.03em;
          color: var(--ink);
          margin: 0 0 48px;
          font-weight: 400;
        }
        .v213-root .v213-hero-title em {
          font-style: italic;
          color: var(--accent);
        }
        .v213-root .v213-hero-body {
          display: grid;
          grid-template-columns: 1.4fr 1fr;
          gap: 56px;
          padding: 32px 0;
          border-top: 1px solid var(--rule);
          border-bottom: 1px solid var(--rule);
          margin-bottom: 44px;
        }
        .v213-root .v213-hero-deck {
          font-family: 'Instrument Serif', serif;
          font-size: 24px;
          line-height: 1.35;
          color: var(--ink-2);
          font-style: italic;
        }
        .v213-root .v213-hero-meta {
          display: flex;
          flex-direction: column;
          gap: 14px;
          padding-left: 32px;
          border-left: 1px solid var(--rule);
        }
        .v213-root .v213-meta-row {
          display: flex;
          align-items: baseline;
          font-family: 'Space Mono', monospace;
          font-size: 11px;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: var(--ink-light);
        }
        .v213-root .v213-meta-dots {
          flex: 1;
          margin: 0 10px;
          border-bottom: 1.5px dotted var(--rule-strong);
          position: relative;
          top: -3px;
        }
        .v213-root .v213-meta-num {
          font-family: 'Instrument Serif', serif;
          font-size: 20px;
          color: var(--ink);
          letter-spacing: 0;
          text-transform: none;
        }
        .v213-root .v213-hero-actions {
          display: flex;
          gap: 20px;
          align-items: center;
        }
        .v213-root .v213-btn-primary {
          font-family: 'Space Mono', monospace;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          padding: 20px 32px;
          background: var(--ink);
          color: var(--paper);
          border: none;
          cursor: pointer;
          transition: background 0.2s;
        }
        .v213-root .v213-btn-primary:hover { background: var(--accent); }
        .v213-root .v213-btn-ghost {
          font-family: 'Instrument Serif', serif;
          font-style: italic;
          font-size: 18px;
          padding: 20px 24px;
          background: transparent;
          color: var(--ink);
          border: none;
          cursor: pointer;
          text-decoration: underline;
          text-decoration-color: var(--accent);
          text-decoration-thickness: 1px;
          text-underline-offset: 6px;
        }

        /* ─── SEARCH ─── */
        .v213-root .v213-search-section {
          position: relative;
          z-index: 1;
          max-width: 1000px;
          margin: 0 auto 60px;
          padding: 0 40px;
        }
        .v213-root .v213-search-bar {
          display: flex;
          align-items: center;
          gap: 20px;
          padding: 22px 28px;
          background: var(--ink);
          color: var(--paper);
        }
        .v213-root .v213-search-bar span {
          font-family: 'Instrument Serif', serif;
          font-style: italic;
          font-size: 18px;
          color: var(--paper);
          opacity: 0.8;
          white-space: nowrap;
        }
        .v213-root .v213-search-bar input {
          flex: 1;
          background: transparent;
          border: none;
          border-bottom: 1px solid rgba(244, 241, 232, 0.3);
          padding: 12px 0;
          font-family: 'Instrument Serif', serif;
          font-style: italic;
          font-size: 20px;
          color: var(--paper);
          outline: none;
        }
        .v213-root .v213-search-bar input::placeholder { color: rgba(244, 241, 232, 0.4); }
        .v213-root .v213-search-bar button {
          font-family: 'Space Mono', monospace;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          padding: 14px 22px;
          background: var(--accent);
          color: var(--paper);
          border: none;
          cursor: pointer;
        }

        /* ─── FEATURES ─── */
        .v213-root .v213-features {
          position: relative;
          z-index: 1;
          max-width: 1440px;
          margin: 0 auto;
          padding: 100px 40px;
        }
        .v213-root .v213-features-number {
          position: absolute;
          top: 60px;
          left: 40px;
          font-family: 'Instrument Serif', serif;
          font-size: 360px;
          line-height: 0.75;
          color: rgba(10, 10, 10, 0.04);
          pointer-events: none;
          user-select: none;
        }
        .v213-root .v213-section-label {
          position: relative;
          display: flex;
          align-items: center;
          gap: 14px;
          font-family: 'Space Mono', monospace;
          font-size: 11px;
          letter-spacing: 0.22em;
          text-transform: uppercase;
          color: var(--accent);
          margin-bottom: 16px;
        }
        .v213-root .v213-section-label-center { justify-content: center; }
        .v213-root .v213-section-label-dark { color: var(--ink); }
        .v213-root .v213-section-rule {
          display: inline-block;
          width: 40px;
          height: 1px;
          background: var(--accent);
        }
        .v213-root .v213-section-title {
          position: relative;
          font-family: 'Instrument Serif', serif;
          font-size: 88px;
          line-height: 0.95;
          color: var(--ink);
          margin-bottom: 64px;
          font-weight: 400;
          letter-spacing: -0.02em;
        }
        .v213-root .v213-section-title-md {
          font-size: 64px;
        }
        .v213-root .v213-section-title em {
          font-style: italic;
          color: var(--accent);
        }
        .v213-root .v213-features-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 0;
          border-top: 1px solid var(--ink);
          border-bottom: 1px solid var(--ink);
        }
        .v213-root .v213-feature-cell {
          position: relative;
          padding: 36px 28px 40px;
          border-right: 1px solid var(--rule-strong);
          transition: background 0.2s;
        }
        .v213-root .v213-feature-cell:last-child { border-right: none; }
        .v213-root .v213-feature-cell:hover {
          background: var(--paper-2);
        }
        .v213-root .v213-feature-num {
          font-family: 'Instrument Serif', serif;
          font-size: 44px;
          line-height: 1;
          color: var(--accent);
          margin-bottom: 20px;
        }
        .v213-root .v213-feature-cell h3 {
          font-family: 'Instrument Serif', serif;
          font-size: 28px;
          line-height: 1.1;
          color: var(--ink);
          margin-bottom: 12px;
          font-weight: 400;
        }
        .v213-root .v213-feature-cell p {
          font-family: 'Instrument Serif', serif;
          font-style: italic;
          font-size: 15px;
          line-height: 1.55;
          color: var(--ink-light);
        }

        /* ─── SCROLL ZONE ─── */
        .v213-root .v213-scroll-zone {
          position: relative;
          z-index: 1;
          padding: 60px 0 100px;
        }
        .v213-root .v213-scroll-number {
          position: absolute;
          font-family: 'Instrument Serif', serif;
          font-size: 400px;
          line-height: 0.75;
          color: rgba(10, 10, 10, 0.04);
          pointer-events: none;
          user-select: none;
        }
        .v213-root .v213-scroll-number-3 {
          top: 0;
          right: 40px;
        }
        .v213-root .v213-scroll-inner {
          max-width: 1440px;
          margin: 0 auto;
          padding: 0 40px;
          position: relative;
        }
        .v213-root .v213-scroll-block {
          display: flex;
          flex-direction: column;
          gap: 40px;
          margin: 40px 0;
        }
        .v213-root .v213-panel {
          position: relative;
          padding: 36px 0 20px;
          border-top: 1px solid var(--ink);
          border-bottom: 1px solid var(--rule);
        }
        .v213-root .v213-panel-label {
          position: absolute;
          top: -14px;
          left: 0;
          background: var(--paper);
          padding: 6px 14px 6px 0;
          font-family: 'Space Mono', monospace;
          font-size: 10px;
          letter-spacing: 0.22em;
          color: var(--accent);
        }

        /* Pull quotes */
        .v213-root .v213-pull-wrap {
          max-width: 1440px;
          margin: 80px auto;
          padding: 0 40px;
        }
        .v213-root .v213-pull {
          position: relative;
          padding: 72px 60px;
          border-top: 2px solid var(--ink);
          border-bottom: 2px solid var(--ink);
          max-width: 1080px;
          margin: 0 auto;
          text-align: center;
        }
        .v213-root .v213-pull-masthead {
          display: flex;
          align-items: center;
          gap: 16px;
          justify-content: center;
          margin-bottom: 32px;
        }
        .v213-root .v213-pull-vol,
        .v213-root .v213-pull-issue {
          font-family: 'Space Mono', monospace;
          font-size: 11px;
          letter-spacing: 0.2em;
          color: var(--ink);
        }
        .v213-root .v213-pull-vol span,
        .v213-root .v213-pull-issue span {
          color: var(--accent);
          margin-right: 4px;
        }
        .v213-root .v213-pull-rule {
          width: 60px;
          height: 1px;
          background: var(--ink);
        }
        .v213-root .v213-pull-quote {
          font-family: 'Instrument Serif', serif;
          font-size: 56px;
          line-height: 1.1;
          color: var(--ink);
          font-style: italic;
          margin: 0 0 24px;
          letter-spacing: -0.015em;
          position: relative;
        }
        .v213-root .v213-pull-mark {
          font-family: 'Instrument Serif', serif;
          font-size: 72px;
          color: var(--accent);
          vertical-align: -0.2em;
          margin-right: 6px;
        }
        .v213-root .v213-pull-mark-end {
          margin-left: 6px;
          margin-right: 0;
        }
        .v213-root .v213-pull-attr {
          font-family: 'Space Mono', monospace;
          font-size: 11px;
          letter-spacing: 0.18em;
          color: var(--ink-mute);
          text-transform: uppercase;
        }

        .v213-root .v213-error {
          background: var(--paper-2);
          border: 2px solid var(--ink);
          color: var(--ink);
          padding: 18px;
          text-align: center;
          margin-bottom: 24px;
          font-family: 'Instrument Serif', serif;
          font-style: italic;
        }
        .v213-root .v213-error button {
          background: none;
          border: none;
          color: var(--accent);
          font-weight: 600;
          cursor: pointer;
          margin-left: 8px;
          text-decoration: underline;
        }

        /* ─── CTA ─── */
        .v213-root .v213-cta {
          position: relative;
          z-index: 1;
          max-width: 1440px;
          margin: 0 auto;
          padding: 140px 40px 140px;
        }
        .v213-root .v213-cta-number {
          position: absolute;
          top: 40px;
          left: 50%;
          transform: translateX(-50%);
          font-family: 'Instrument Serif', serif;
          font-size: 520px;
          line-height: 0.75;
          color: rgba(10, 10, 10, 0.04);
          pointer-events: none;
          user-select: none;
        }
        .v213-root .v213-cta-inner {
          position: relative;
          max-width: 840px;
          margin: 0 auto;
          text-align: center;
        }
        .v213-root .v213-cta h2 {
          font-family: 'Instrument Serif', serif;
          font-size: 112px;
          line-height: 1;
          color: var(--ink);
          margin: 20px 0;
          font-weight: 400;
          letter-spacing: -0.02em;
        }
        .v213-root .v213-cta h2 em {
          font-style: italic;
          color: var(--accent);
        }
        .v213-root .v213-cta p {
          font-family: 'Instrument Serif', serif;
          font-style: italic;
          font-size: 22px;
          color: var(--ink-light);
          margin-bottom: 44px;
        }
        .v213-root .v213-cta-btn {
          padding: 24px 44px;
          font-size: 12px;
        }

        /* ─── PROMO SECTIONS (Content, Creators, Tools) ─── */
        .v213-root .v213-promo-deck {
          font-family: 'Instrument Serif', serif;
          font-style: italic;
          font-size: 20px;
          line-height: 1.45;
          color: var(--ink-2);
          max-width: 760px;
          margin-bottom: 48px;
        }
        .v213-root .v213-promo-scroller {
          display: flex;
          gap: 0;
          overflow-x: auto;
          padding: 0 0 24px;
          scrollbar-width: thin;
          scrollbar-color: var(--ink) var(--paper-2);
          border-top: 2px solid var(--ink);
          border-bottom: 1px solid var(--rule);
        }
        .v213-root .v213-promo-scroller::-webkit-scrollbar { height: 6px; }
        .v213-root .v213-promo-scroller::-webkit-scrollbar-thumb { background: var(--ink); }
        .v213-root .v213-promo-scroller::-webkit-scrollbar-track { background: var(--paper-2); }

        /* Content card (newspaper clipping) */
        .v213-root .v213-content-card {
          flex-shrink: 0;
          width: 300px;
          padding: 32px 28px;
          border-right: 1px solid var(--rule-strong);
          background: var(--paper);
          transition: background 0.2s;
          cursor: pointer;
          position: relative;
        }
        .v213-root .v213-content-card:hover { background: var(--paper-2); }
        .v213-root .v213-content-kind {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          font-family: 'Space Mono', monospace;
          font-size: 10px;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          color: var(--accent);
          margin-bottom: 18px;
          padding-bottom: 12px;
          border-bottom: 1px solid var(--rule);
        }
        .v213-root .v213-content-title {
          font-family: 'Instrument Serif', serif;
          font-size: 26px;
          line-height: 1.1;
          color: var(--ink);
          margin: 0 0 16px;
          font-weight: 400;
          letter-spacing: -0.01em;
          min-height: 86px;
        }
        .v213-root .v213-content-rule {
          width: 40px;
          height: 1px;
          background: var(--accent);
          margin-bottom: 12px;
        }
        .v213-root .v213-content-byline {
          font-family: 'Instrument Serif', serif;
          font-style: italic;
          font-size: 14px;
          color: var(--ink-light);
          margin-bottom: 4px;
        }
        .v213-root .v213-content-author {
          color: var(--ink);
          font-style: italic;
        }
        .v213-root .v213-content-meta {
          font-family: 'Space Mono', monospace;
          font-size: 10px;
          letter-spacing: 0.1em;
          color: var(--ink-mute);
        }

        /* Creator card */
        .v213-root .v213-creator-card {
          flex-shrink: 0;
          width: 280px;
          padding: 32px 28px;
          border-right: 1px solid var(--rule-strong);
          background: var(--paper);
          transition: background 0.2s;
          cursor: pointer;
        }
        .v213-root .v213-creator-card:hover { background: var(--paper-2); }
        .v213-root .v213-creator-head {
          display: flex;
          align-items: center;
          gap: 16px;
          margin-bottom: 20px;
        }
        .v213-root .v213-creator-avatar {
          width: 48px;
          height: 48px;
          background: var(--ink);
          color: var(--paper);
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .v213-root .v213-creator-kind {
          font-family: 'Space Mono', monospace;
          font-size: 10px;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: var(--accent);
        }
        .v213-root .v213-creator-name {
          font-family: 'Instrument Serif', serif;
          font-size: 28px;
          line-height: 1;
          color: var(--ink);
          margin: 0 0 4px;
          font-weight: 400;
          letter-spacing: -0.01em;
        }
        .v213-root .v213-creator-handle {
          font-family: 'Space Mono', monospace;
          font-size: 11px;
          color: var(--accent);
          margin-bottom: 12px;
        }
        .v213-root .v213-creator-bio {
          font-family: 'Instrument Serif', serif;
          font-style: italic;
          font-size: 15px;
          line-height: 1.45;
          color: var(--ink-light);
          margin-bottom: 20px;
          min-height: 44px;
        }
        .v213-root .v213-creator-rule {
          width: 100%;
          height: 1px;
          background: var(--rule);
          margin-bottom: 12px;
        }
        .v213-root .v213-creator-stats {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
          font-family: 'Space Mono', monospace;
          font-size: 10px;
          letter-spacing: 0.15em;
          text-transform: uppercase;
          color: var(--ink-light);
        }
        .v213-root .v213-creator-stats strong {
          font-family: 'Instrument Serif', serif;
          font-size: 22px;
          color: var(--accent);
          font-weight: 400;
          letter-spacing: 0;
          text-transform: none;
        }

        /* Tools grid */
        .v213-root .v213-tools-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 0;
          border-top: 2px solid var(--ink);
          border-bottom: 2px solid var(--ink);
        }
        .v213-root .v213-tool-cell {
          padding: 32px 28px 28px;
          border-right: 1px solid var(--rule-strong);
          border-bottom: 1px solid var(--rule);
          transition: background 0.2s;
          background: var(--paper);
        }
        .v213-root .v213-tool-cell:nth-child(4n) { border-right: none; }
        .v213-root .v213-tool-cell:hover { background: var(--paper-2); }
        .v213-root .v213-tool-top {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 18px;
          padding-bottom: 14px;
          border-bottom: 1px solid var(--rule);
        }
        .v213-root .v213-tool-roman {
          font-family: 'Instrument Serif', serif;
          font-size: 26px;
          color: var(--accent);
        }
        .v213-root .v213-tool-icon {
          color: var(--ink);
        }
        .v213-root .v213-tool-name {
          font-family: 'Instrument Serif', serif;
          font-size: 22px;
          color: var(--ink);
          line-height: 1.1;
          margin: 0 0 10px;
          font-weight: 400;
          letter-spacing: -0.01em;
        }
        .v213-root .v213-tool-pitch {
          font-family: 'Instrument Serif', serif;
          font-style: italic;
          font-size: 14px;
          line-height: 1.5;
          color: var(--ink-light);
          margin-bottom: 16px;
          min-height: 44px;
        }
        .v213-root .v213-tool-aud {
          font-family: 'Space Mono', monospace;
          font-size: 10px;
          letter-spacing: 0.18em;
          padding: 4px 0;
        }
        .v213-root .v213-tool-aud-discover { color: var(--ink-light); }
        .v213-root .v213-tool-aud-build { color: var(--accent); }
        .v213-root .v213-tool-aud-both { color: var(--ink); }

        @media (max-width: 900px) {
          .v213-root .v213-hero-title { font-size: 72px; }
          .v213-root .v213-hero-body { grid-template-columns: 1fr; gap: 32px; }
          .v213-root .v213-hero-meta { padding-left: 0; border-left: none; border-top: 1px solid var(--rule); padding-top: 24px; }
          .v213-root .v213-hero-number,
          .v213-root .v213-features-number,
          .v213-root .v213-scroll-number,
          .v213-root .v213-cta-number { display: none; }
          .v213-root .v213-section-title { font-size: 48px; }
          .v213-root .v213-section-title-md { font-size: 36px; }
          .v213-root .v213-features-grid { grid-template-columns: 1fr 1fr; }
          .v213-root .v213-feature-cell:nth-child(2) { border-right: none; }
          .v213-root .v213-pull-quote { font-size: 32px; }
          .v213-root .v213-cta h2 { font-size: 56px; }
          .v213-root .v213-nav-inner { grid-template-columns: 1fr; text-align: center; gap: 16px; }
          .v213-root .v213-nav-links { justify-content: center; flex-wrap: wrap; }
          .v213-root .v213-nav-date { text-align: center; }
          .v213-root .v213-search-bar { flex-wrap: wrap; }
          .v213-root .v213-promo-deck { font-size: 16px; }
          .v213-root .v213-tools-grid { grid-template-columns: 1fr 1fr; }
          .v213-root .v213-tool-cell:nth-child(2n) { border-right: none; }
          .v213-root .v213-tool-cell:nth-child(4n) { border-right: 1px solid var(--rule-strong); }
        }
      `}</style>
    </div>
  );
}
