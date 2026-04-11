/**
 * Variant 2.1.2 — Aurora Circuit
 *
 * Animated aurora gradient mesh drifting behind the page, hex circuit
 * traces, glowing hexagonal stat cards, glass-morphism scroller panels,
 * "signal transmission" marquee section breaks.
 *
 * @tier SIMPLE (preview-only, no business logic)
 */
'use client';

import { useEffect } from 'react';
import nextDynamic from 'next/dynamic';
import { Star, Gift, Calendar, Clock, LayoutGrid, Activity, Zap, Radio } from 'lucide-react';

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

interface TransmissionProps {
  label: string;
  message: string;
  stats: { value: string; label: string }[];
}

function Transmission({ label, message, stats }: TransmissionProps) {
  return (
    <div className="v212-transmission">
      <div className="v212-trans-header">
        <span className="v212-trans-dot" />
        <span className="v212-trans-label">{label}</span>
        <span className="v212-trans-rule" />
      </div>
      <div className="v212-trans-body">
        <p className="v212-trans-message">{message}</p>
        <div className="v212-trans-stats">
          {stats.map((s, i) => (
            <div key={i} className="v212-trans-stat">
              <div className="v212-trans-stat-value">{s.value}</div>
              <div className="v212-trans-stat-label">{s.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function Variant212Page() {
  const { data, isLoading, error, refetch } = useHomepageData();

  useEffect(() => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href =
      'https://fonts.googleapis.com/css2?family=Unbounded:wght@400;500;700;900&family=Space+Mono:wght@400;700&family=Poppins:wght@400;500;600;700&display=swap';
    document.head.appendChild(link);
    return () => {
      document.head.removeChild(link);
    };
  }, []);

  return (
    <div className="v212-root">
      {/* ───── BG LAYERS ───── */}
      <div className="v212-bg">
        <div className="v212-aurora v212-aurora-1" />
        <div className="v212-aurora v212-aurora-2" />
        <div className="v212-aurora v212-aurora-3" />
        <svg className="v212-circuit" viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="v212-hex" width="60" height="52" patternUnits="userSpaceOnUse">
              <polygon points="30,0 58,15 58,45 30,60 2,45 2,15" fill="none" stroke="rgba(13,115,119,0.4)" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#v212-hex)" />
          <g stroke="rgba(237,100,55,0.5)" strokeWidth="1" fill="none">
            <path d="M0 220 L 320 220 L 360 260 L 720 260 L 760 220 L 1120 220 L 1160 180 L 1440 180" />
            <path d="M0 480 L 200 480 L 260 540 L 600 540 L 660 480 L 1000 480 L 1080 540 L 1440 540" />
            <path d="M0 700 L 280 700 L 320 660 L 680 660 L 720 700 L 1080 700 L 1120 740 L 1440 740" />
          </g>
        </svg>
        <div className="v212-noise" />
      </div>

      {/* ───── NAV ───── */}
      <nav className="v212-nav">
        <div className="v212-nav-inner">
          <img
            src="/uploads/site/branding/namelogo-horizontal.png"
            alt="Bizconekt"
            className="v212-nav-logo"
          />
          <div className="v212-nav-signal">
            <span className="v212-signal-dot" />
            <span>CH · 02.12</span>
          </div>
          <div className="v212-nav-links">
            <a href="/listings">Listings</a>
            <a href="/events">Events</a>
            <a href="/offers">Offers</a>
            <a href="/jobs">Jobs</a>
            <a href="/register" className="v212-nav-cta">Enter Network</a>
          </div>
        </div>
      </nav>

      {/* ───── HERO ───── */}
      <section className="v212-hero">
        <div className="v212-hero-inner">
          <div className="v212-eyebrow">
            <Radio className="w-3 h-3" />
            LIVE · AURORA FEED · 02.12
          </div>
          <h1 className="v212-hero-title">
            <span className="v212-title-line">Signal</span>
            <span className="v212-title-line">is everything.</span>
          </h1>
          <p className="v212-hero-text">
            Bizconekt broadcasts the local economy as a living grid — every business, every offer,
            every event pulsing in real time across the network.
          </p>
          <div className="v212-hero-actions">
            <button className="v212-btn-primary">
              Join Network
              <span className="v212-btn-arrow">→</span>
            </button>
            <button className="v212-btn-ghost">Explore Listings</button>
          </div>

          {/* Hexagonal stat cluster */}
          <div className="v212-hex-cluster">
            <div className="v212-hex v212-hex-1">
              <Activity className="w-4 h-4" />
              <div className="v212-hex-value">{data?.stats?.total_listings?.toLocaleString() ?? '500'}+</div>
              <div className="v212-hex-label">Businesses</div>
            </div>
            <div className="v212-hex v212-hex-2">
              <Zap className="w-4 h-4" />
              <div className="v212-hex-value">{data?.stats?.total_users?.toLocaleString() ?? '1.2K'}</div>
              <div className="v212-hex-label">Members</div>
            </div>
            <div className="v212-hex v212-hex-3">
              <Calendar className="w-4 h-4" />
              <div className="v212-hex-value">{data?.stats?.total_events ?? '150'}+</div>
              <div className="v212-hex-label">Events</div>
            </div>
          </div>
        </div>
      </section>

      {/* ───── SEARCH ───── */}
      <section className="v212-search-section">
        <div className="v212-search-bar">
          <span className="v212-search-glyph">⬡</span>
          <input type="text" placeholder="Scan the network..." />
          <button>Transmit →</button>
        </div>
      </section>

      {/* ───── FEATURES ───── */}
      <section className="v212-features">
        <div className="v212-section-label">
          <span className="v212-section-dot" />
          NETWORK CAPABILITIES
        </div>
        <h2 className="v212-section-title">Built on live signal</h2>
        <div className="v212-features-grid">
          {[
            ['01', 'Business Directory', 'Every listing actively broadcasting'],
            ['02', 'Events', 'Real-time networking coordinates'],
            ['03', 'Offers', 'Flash promotions wired to the grid'],
            ['04', 'Pro Network', 'Cross-connection at light speed'],
          ].map(([n, t, d]) => (
            <div key={n} className="v212-feature-cell">
              <div className="v212-feature-glow" />
              <div className="v212-feature-num">{n}</div>
              <h3>{t}</h3>
              <p>{d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ───── LIVE SCROLLERS ───── */}
      <section className="v212-scroll-zone">
        <div className="v212-scroll-inner">
          <Transmission
            label="INCOMING BROADCAST ▸ 00"
            message="Live feed active. Real listings, real offers, real events — broadcasting directly from platform data."
            stats={[
              { value: '47', label: 'New / week' },
              { value: '2.3h', label: 'Avg response' },
              { value: '98%', label: 'Uptime' },
            ]}
          />

          <FlashOffersSection maxOffers={6} />

          {error && (
            <div className="v212-error">
              {error}
              <button onClick={refetch}>Reconnect</button>
            </div>
          )}

          <div className="v212-scroll-block">
            {isLoading ? (
              <Skeleton />
            ) : data?.categories && data.categories.length > 0 ? (
              <div className="v212-panel">
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
              <div className="v212-panel">
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
              <div className="v212-panel">
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
              <div className="v212-panel">
                <ContentSlider title="Events" icon={Calendar} moreLink="/events">
                  {data.upcoming_events.map((event, index) => (
                    <EventCard key={event.id} event={event} index={index} />
                  ))}
                </ContentSlider>
              </div>
            ) : null}
          </div>

          <Transmission
            label="CROSS-CHANNEL ▸ 03"
            message="Top Recommenders amplify the signals the community already trusts — real humans, real word of mouth, measured."
            stats={[
              { value: '10', label: 'Amplifiers' },
              { value: '4.9★', label: 'Avg trust' },
              { value: '24h', label: 'Fresh signal' },
            ]}
          />

          <div className="v212-panel">
            <TopRecommendersScroller limit={10} />
          </div>

          <div className="v212-scroll-block">
            {isLoading ? (
              <Skeleton />
            ) : data?.latest_listings && data.latest_listings.length > 0 ? (
              <div className="v212-panel">
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

          <Transmission
            label="BROADCAST ▸ 04 ▸ CONTENT & CREATORS"
            message="Two signals, one frequency. Visitors tune in to read, watch and listen. Creators tune in to publish and be found."
            stats={[
              { value: '5', label: 'Content formats' },
              { value: '5', label: 'Creator kinds' },
              { value: '1', label: 'Network' },
            ]}
          />

          {/* ─── CONTENT SCROLLER ─── */}
          <div className="v212-promo-block">
            <div className="v212-promo-header">
              <div className="v212-promo-kicker">
                <span className="v212-signal-dot" />
                CH · 04.1 · CONTENT HUB
              </div>
              <h3 className="v212-promo-title">Read. Watch. Listen.</h3>
              <p className="v212-promo-sub">A live hub of articles, videos, podcasts, guides, and newsletters — all published by members of the network you just landed on.</p>
            </div>
            <div className="v212-scroller">
              {PREVIEW_CONTENT.map((item) => {
                const Icon = item.icon;
                return (
                  <article key={item.id} className="v212-content-card">
                    <div className="v212-content-kind">
                      <Icon className="w-3 h-3" />
                      {item.kind.toUpperCase()}
                    </div>
                    <h4 className="v212-content-title">{item.title}</h4>
                    <div className="v212-content-meta">
                      <span>{item.author}</span>
                      <span className="v212-content-dot">·</span>
                      <span>{item.meta}</span>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>

          {/* ─── CREATORS SCROLLER ─── */}
          <div className="v212-promo-block">
            <div className="v212-promo-header">
              <div className="v212-promo-kicker">
                <span className="v212-signal-dot" />
                CH · 04.2 · CREATOR NETWORK
              </div>
              <h3 className="v212-promo-title">Meet the makers.</h3>
              <p className="v212-promo-sub">Podcasters. Writers. Video creators. Affiliate marketers. Follow them here — or collaborate through connection groups and quote requests.</p>
            </div>
            <div className="v212-scroller">
              {PREVIEW_CREATORS.map((creator) => {
                const Icon = creator.icon;
                return (
                  <article key={creator.id} className="v212-creator-card">
                    <div className="v212-creator-avatar">
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="v212-creator-kind">{creator.kind}</div>
                    <h4 className="v212-creator-name">{creator.name}</h4>
                    <div className="v212-creator-handle">{creator.handle}</div>
                    <p className="v212-creator-bio">{creator.bio}</p>
                    <div className="v212-creator-footer">
                      <span>Followers</span>
                      <strong>{creator.followers}</strong>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>

          <Transmission
            label="ENERGY TRANSFER ▸ 05"
            message="Hiring pulses through the network. Local companies, live openings, zero middlemen."
            stats={[
              { value: '34', label: 'Open roles' },
              { value: '12', label: 'Hiring now' },
              { value: '∞', label: 'Network reach' },
            ]}
          />

          <WhosHiringSection maxJobs={4} />

          {/* ─── TOOLS SHOWCASE ─── */}
          <div className="v212-tools-block">
            <div className="v212-tools-header">
              <div className="v212-promo-kicker">
                <span className="v212-signal-dot" />
                CH · 06 · OPERATOR TOOLKIT
              </div>
              <h3 className="v212-promo-title">Every tool a listing needs.</h3>
              <p className="v212-promo-sub">
                12 instruments wired into the network. Connection groups, quote pools, campaigns, analytics — everything a listing member runs
                without leaving the feed.
              </p>
            </div>
            <div className="v212-tools-grid">
              {PREVIEW_TOOLS.map((tool) => {
                const Icon = tool.icon;
                return (
                  <div key={tool.id} className="v212-tool-cell">
                    <div className="v212-tool-icon">
                      <Icon className="w-5 h-5" />
                    </div>
                    <h4 className="v212-tool-name">{tool.name}</h4>
                    <p className="v212-tool-pitch">{tool.pitch}</p>
                    <div className={`v212-tool-aud v212-tool-aud-${tool.audience}`}>
                      {tool.audience === 'discover' ? 'DISCOVER' : tool.audience === 'build' ? 'BUILD' : 'BOTH'}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* ───── CTA ───── */}
      <section className="v212-cta">
        <div className="v212-cta-glow" />
        <div className="v212-cta-inner">
          <div className="v212-cta-tag">
            <span className="v212-signal-dot" />
            ONE-TIME TRANSMISSION
          </div>
          <h2>Enter the network.</h2>
          <p>Free account. Two minutes. A live feed of your local economy.</p>
          <button className="v212-btn-primary v212-cta-btn">
            Create Free Account <span className="v212-btn-arrow">→</span>
          </button>
        </div>
      </section>

      <SiteFooter />

      <style jsx global>{`
        .v212-root {
          --navy: #05101f;
          --navy-2: #0a1a30;
          --navy-3: #102540;
          --orange: #ff7a3d;
          --orange-glow: rgba(255, 122, 61, 0.55);
          --teal: #2dd4bf;
          --teal-glow: rgba(45, 212, 191, 0.55);
          --violet: #8b5cf6;
          --cream: #f6f4ec;
          --text: rgba(246, 244, 236, 0.82);
          --text-dim: rgba(246, 244, 236, 0.5);
          --glass-bg: rgba(16, 37, 64, 0.45);
          --glass-border: rgba(255, 255, 255, 0.08);

          font-family: 'Poppins', sans-serif;
          background: var(--navy);
          color: var(--cream);
          position: relative;
          overflow-x: hidden;
          -webkit-font-smoothing: antialiased;
        }

        /* ─── BG LAYERS ─── */
        .v212-root .v212-bg {
          position: fixed;
          inset: 0;
          z-index: 0;
          pointer-events: none;
          overflow: hidden;
        }
        .v212-root .v212-aurora {
          position: absolute;
          width: 900px;
          height: 900px;
          border-radius: 50%;
          filter: blur(120px);
          opacity: 0.4;
          animation: v212-float 30s ease-in-out infinite;
        }
        .v212-root .v212-aurora-1 {
          top: -20%;
          left: -10%;
          background: radial-gradient(circle, var(--orange) 0%, transparent 60%);
          animation-delay: 0s;
        }
        .v212-root .v212-aurora-2 {
          top: 30%;
          right: -15%;
          background: radial-gradient(circle, var(--teal) 0%, transparent 60%);
          animation-delay: -10s;
          opacity: 0.35;
        }
        .v212-root .v212-aurora-3 {
          bottom: -20%;
          left: 20%;
          background: radial-gradient(circle, var(--violet) 0%, transparent 60%);
          animation-delay: -20s;
          opacity: 0.25;
        }
        @keyframes v212-float {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(40px, -30px) scale(1.08); }
          66% { transform: translate(-20px, 40px) scale(0.95); }
        }
        .v212-root .v212-circuit {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          opacity: 0.45;
        }
        .v212-root .v212-noise {
          position: absolute;
          inset: 0;
          opacity: 0.08;
          background-image: radial-gradient(rgba(255, 255, 255, 0.3) 1px, transparent 1px);
          background-size: 4px 4px;
          mix-blend-mode: overlay;
        }

        /* ─── NAV ─── */
        .v212-root .v212-nav {
          position: sticky;
          top: 0;
          z-index: 50;
          background: rgba(5, 16, 31, 0.7);
          backdrop-filter: blur(14px);
          border-bottom: 1px solid var(--glass-border);
        }
        .v212-root .v212-nav-inner {
          max-width: 1380px;
          margin: 0 auto;
          padding: 0 40px;
          display: flex;
          align-items: center;
          gap: 28px;
          height: 72px;
        }
        .v212-root .v212-nav-logo {
          height: 28px;
          filter: brightness(0) invert(1);
        }
        .v212-root .v212-nav-signal {
          font-family: 'Space Mono', monospace;
          font-size: 10px;
          color: var(--teal);
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 6px 14px;
          border: 1px solid var(--glass-border);
          border-radius: 999px;
          background: var(--glass-bg);
        }
        .v212-root .v212-signal-dot,
        .v212-root .v212-nav-signal .v212-signal-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: var(--teal);
          box-shadow: 0 0 12px var(--teal-glow);
          animation: v212-pulse 2s ease-in-out infinite;
        }
        @keyframes v212-pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.6; transform: scale(1.2); }
        }
        .v212-root .v212-nav-links {
          display: flex;
          gap: 4px;
          align-items: center;
          margin-left: auto;
        }
        .v212-root .v212-nav-links a {
          font-size: 12px;
          font-weight: 600;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: var(--text);
          text-decoration: none;
          padding: 10px 18px;
          border-radius: 999px;
          transition: all 0.2s;
        }
        .v212-root .v212-nav-links a:hover {
          background: var(--glass-bg);
          color: var(--cream);
        }
        .v212-root .v212-nav-cta {
          background: linear-gradient(135deg, var(--orange) 0%, #ff9d5c 100%) !important;
          color: var(--navy) !important;
          box-shadow: 0 0 24px var(--orange-glow);
        }
        .v212-root .v212-nav-cta:hover {
          box-shadow: 0 0 36px var(--orange-glow);
        }

        /* ─── HERO ─── */
        .v212-root .v212-hero {
          position: relative;
          z-index: 1;
          padding: 140px 0 160px;
        }
        .v212-root .v212-hero-inner {
          max-width: 1380px;
          margin: 0 auto;
          padding: 0 40px;
          text-align: center;
        }
        .v212-root .v212-eyebrow {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          font-family: 'Space Mono', monospace;
          font-size: 11px;
          letter-spacing: 0.24em;
          text-transform: uppercase;
          color: var(--teal);
          padding: 10px 20px;
          border: 1px solid var(--glass-border);
          border-radius: 999px;
          background: var(--glass-bg);
          margin-bottom: 40px;
        }
        .v212-root .v212-hero-title {
          font-family: 'Unbounded', 'Poppins', sans-serif;
          font-size: 108px;
          font-weight: 900;
          line-height: 0.92;
          letter-spacing: -0.03em;
          margin: 0 0 32px;
          background: linear-gradient(180deg, var(--cream) 0%, var(--cream) 60%, rgba(246, 244, 236, 0.35) 100%);
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
          text-shadow: 0 0 80px rgba(255, 122, 61, 0.15);
        }
        .v212-root .v212-title-line {
          display: block;
        }
        .v212-root .v212-title-line:last-child {
          background: linear-gradient(90deg, var(--orange) 0%, var(--teal) 100%);
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        .v212-root .v212-hero-text {
          font-size: 18px;
          line-height: 1.65;
          color: var(--text);
          max-width: 620px;
          margin: 0 auto 44px;
        }
        .v212-root .v212-hero-actions {
          display: flex;
          gap: 18px;
          justify-content: center;
          margin-bottom: 80px;
        }
        .v212-root .v212-btn-primary {
          font-family: 'Unbounded', 'Poppins', sans-serif;
          font-size: 13px;
          font-weight: 700;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          padding: 18px 34px;
          border: none;
          background: linear-gradient(135deg, var(--orange) 0%, #ff9d5c 100%);
          color: var(--navy);
          cursor: pointer;
          border-radius: 999px;
          box-shadow: 0 0 40px var(--orange-glow);
          display: inline-flex;
          align-items: center;
          gap: 10px;
          transition: all 0.25s;
        }
        .v212-root .v212-btn-primary:hover {
          box-shadow: 0 0 60px var(--orange-glow);
          transform: translateY(-2px);
        }
        .v212-root .v212-btn-arrow {
          transition: transform 0.25s;
        }
        .v212-root .v212-btn-primary:hover .v212-btn-arrow {
          transform: translateX(4px);
        }
        .v212-root .v212-btn-ghost {
          font-family: 'Space Mono', monospace;
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          padding: 18px 28px;
          background: var(--glass-bg);
          color: var(--cream);
          border: 1px solid var(--glass-border);
          border-radius: 999px;
          cursor: pointer;
          transition: all 0.2s;
        }
        .v212-root .v212-btn-ghost:hover {
          border-color: var(--teal);
          color: var(--teal);
        }

        /* Hex cluster */
        .v212-root .v212-hex-cluster {
          display: flex;
          gap: 24px;
          justify-content: center;
          flex-wrap: wrap;
        }
        .v212-root .v212-hex {
          position: relative;
          width: 180px;
          padding: 24px 20px 22px;
          background: var(--glass-bg);
          border: 1px solid var(--glass-border);
          backdrop-filter: blur(12px);
          clip-path: polygon(50% 0, 100% 25%, 100% 75%, 50% 100%, 0 75%, 0 25%);
          text-align: center;
        }
        .v212-root .v212-hex-1 { box-shadow: inset 0 0 40px var(--orange-glow); }
        .v212-root .v212-hex-2 { box-shadow: inset 0 0 40px var(--teal-glow); }
        .v212-root .v212-hex-3 { box-shadow: inset 0 0 40px rgba(139, 92, 246, 0.45); }
        .v212-root .v212-hex svg {
          margin: 0 auto 8px;
          color: var(--orange);
        }
        .v212-root .v212-hex-2 svg { color: var(--teal); }
        .v212-root .v212-hex-3 svg { color: var(--violet); }
        .v212-root .v212-hex-value {
          font-family: 'Unbounded', sans-serif;
          font-size: 30px;
          font-weight: 700;
          color: var(--cream);
          line-height: 1;
          margin-bottom: 4px;
        }
        .v212-root .v212-hex-label {
          font-family: 'Space Mono', monospace;
          font-size: 10px;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          color: var(--text-dim);
        }

        /* ─── SEARCH ─── */
        .v212-root .v212-search-section {
          position: relative;
          z-index: 2;
          max-width: 760px;
          margin: -60px auto 0;
          padding: 0 40px;
        }
        .v212-root .v212-search-bar {
          display: flex;
          align-items: center;
          background: var(--glass-bg);
          border: 1px solid var(--glass-border);
          backdrop-filter: blur(16px);
          border-radius: 999px;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5), 0 0 60px rgba(255, 122, 61, 0.12);
          padding: 6px 6px 6px 28px;
        }
        .v212-root .v212-search-glyph {
          font-family: 'Unbounded', sans-serif;
          color: var(--teal);
          margin-right: 16px;
          font-size: 20px;
        }
        .v212-root .v212-search-bar input {
          flex: 1;
          border: none;
          background: transparent;
          padding: 18px 0;
          font-family: 'Poppins', sans-serif;
          font-size: 15px;
          color: var(--cream);
          outline: none;
        }
        .v212-root .v212-search-bar input::placeholder { color: var(--text-dim); }
        .v212-root .v212-search-bar button {
          font-family: 'Unbounded', sans-serif;
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          padding: 14px 28px;
          background: linear-gradient(135deg, var(--orange) 0%, #ff9d5c 100%);
          color: var(--navy);
          border: none;
          border-radius: 999px;
          cursor: pointer;
          box-shadow: 0 0 30px var(--orange-glow);
        }

        /* ─── FEATURES ─── */
        .v212-root .v212-features {
          position: relative;
          z-index: 1;
          max-width: 1380px;
          margin: 0 auto;
          padding: 140px 40px 100px;
        }
        .v212-root .v212-section-label {
          display: flex;
          align-items: center;
          gap: 12px;
          justify-content: center;
          font-family: 'Space Mono', monospace;
          font-size: 11px;
          letter-spacing: 0.24em;
          text-transform: uppercase;
          color: var(--teal);
          margin-bottom: 16px;
        }
        .v212-root .v212-section-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: var(--teal);
          box-shadow: 0 0 12px var(--teal-glow);
        }
        .v212-root .v212-section-title {
          font-family: 'Unbounded', sans-serif;
          font-size: 56px;
          font-weight: 700;
          color: var(--cream);
          text-align: center;
          margin-bottom: 72px;
          letter-spacing: -0.02em;
        }
        .v212-root .v212-features-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 20px;
        }
        .v212-root .v212-feature-cell {
          position: relative;
          padding: 36px 28px 40px;
          background: var(--glass-bg);
          border: 1px solid var(--glass-border);
          backdrop-filter: blur(10px);
          border-radius: 20px;
          overflow: hidden;
          transition: all 0.3s;
        }
        .v212-root .v212-feature-glow {
          position: absolute;
          inset: -2px;
          background: linear-gradient(135deg, var(--orange), var(--teal), var(--violet));
          opacity: 0;
          transition: opacity 0.3s;
          z-index: -1;
          filter: blur(12px);
        }
        .v212-root .v212-feature-cell:hover {
          transform: translateY(-6px);
          border-color: rgba(255, 255, 255, 0.15);
        }
        .v212-root .v212-feature-cell:hover .v212-feature-glow {
          opacity: 0.6;
        }
        .v212-root .v212-feature-num {
          font-family: 'Unbounded', sans-serif;
          font-size: 14px;
          font-weight: 700;
          color: var(--orange);
          margin-bottom: 24px;
        }
        .v212-root .v212-feature-cell h3 {
          font-family: 'Unbounded', sans-serif;
          font-size: 18px;
          font-weight: 700;
          color: var(--cream);
          margin-bottom: 10px;
          letter-spacing: -0.01em;
        }
        .v212-root .v212-feature-cell p {
          font-size: 13px;
          line-height: 1.6;
          color: var(--text);
        }

        /* ─── SCROLL ZONE ─── */
        .v212-root .v212-scroll-zone {
          position: relative;
          z-index: 1;
          padding: 60px 0 100px;
        }
        .v212-root .v212-scroll-inner {
          max-width: 1380px;
          margin: 0 auto;
          padding: 0 40px;
        }
        .v212-root .v212-scroll-block {
          display: flex;
          flex-direction: column;
          gap: 28px;
          margin: 40px 0;
        }

        /* Glass panel wrapper */
        .v212-root .v212-panel {
          position: relative;
          padding: 32px 28px;
          background: var(--glass-bg);
          border: 1px solid var(--glass-border);
          backdrop-filter: blur(12px);
          border-radius: 24px;
          box-shadow: 0 30px 80px rgba(0, 0, 0, 0.3);
        }
        .v212-root .v212-panel::before {
          content: '';
          position: absolute;
          inset: 0;
          border-radius: 24px;
          padding: 1px;
          background: linear-gradient(135deg, var(--orange-glow), transparent 40%, transparent 60%, var(--teal-glow));
          mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
          -webkit-mask-composite: xor;
          mask-composite: exclude;
          pointer-events: none;
        }
        .v212-root .v212-panel h2 { color: var(--cream); }
        .v212-root .v212-panel p,
        .v212-root .v212-panel span { color: var(--text); }

        /* Transmission breaks */
        .v212-root .v212-transmission {
          position: relative;
          padding: 32px 40px;
          background: linear-gradient(90deg, rgba(255, 122, 61, 0.12) 0%, rgba(45, 212, 191, 0.12) 100%);
          border: 1px solid var(--glass-border);
          backdrop-filter: blur(10px);
          border-radius: 20px;
          margin: 48px 0;
          overflow: hidden;
        }
        .v212-root .v212-transmission::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 1px;
          background: linear-gradient(90deg, transparent, var(--orange), var(--teal), transparent);
        }
        .v212-root .v212-trans-header {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 20px;
        }
        .v212-root .v212-trans-dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background: var(--orange);
          box-shadow: 0 0 16px var(--orange-glow);
          animation: v212-pulse 1.6s ease-in-out infinite;
        }
        .v212-root .v212-trans-label {
          font-family: 'Space Mono', monospace;
          font-size: 11px;
          letter-spacing: 0.2em;
          color: var(--orange);
        }
        .v212-root .v212-trans-rule {
          flex: 1;
          height: 1px;
          background: linear-gradient(90deg, var(--orange-glow), transparent);
        }
        .v212-root .v212-trans-body {
          display: grid;
          grid-template-columns: 1.5fr 1fr;
          gap: 40px;
          align-items: center;
        }
        .v212-root .v212-trans-message {
          font-family: 'Unbounded', sans-serif;
          font-size: 22px;
          line-height: 1.35;
          color: var(--cream);
          font-weight: 500;
          letter-spacing: -0.01em;
        }
        .v212-root .v212-trans-stats {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 20px;
        }
        .v212-root .v212-trans-stat {
          text-align: right;
        }
        .v212-root .v212-trans-stat-value {
          font-family: 'Unbounded', sans-serif;
          font-size: 32px;
          font-weight: 700;
          color: var(--teal);
          line-height: 1;
          margin-bottom: 4px;
        }
        .v212-root .v212-trans-stat-label {
          font-family: 'Space Mono', monospace;
          font-size: 10px;
          letter-spacing: 0.15em;
          text-transform: uppercase;
          color: var(--text-dim);
        }

        .v212-root .v212-error {
          background: rgba(255, 122, 61, 0.1);
          border: 1px solid var(--orange);
          color: var(--cream);
          padding: 18px;
          text-align: center;
          border-radius: 14px;
          margin-bottom: 24px;
        }
        .v212-root .v212-error button {
          background: none;
          border: none;
          color: var(--orange);
          text-decoration: underline;
          cursor: pointer;
          margin-left: 8px;
        }

        /* ─── CTA ─── */
        .v212-root .v212-cta {
          position: relative;
          z-index: 1;
          padding: 140px 40px;
          overflow: hidden;
        }
        .v212-root .v212-cta-glow {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 1000px;
          height: 600px;
          background: radial-gradient(ellipse, var(--orange-glow) 0%, transparent 60%);
          filter: blur(100px);
          opacity: 0.5;
          pointer-events: none;
        }
        .v212-root .v212-cta-inner {
          position: relative;
          max-width: 780px;
          margin: 0 auto;
          text-align: center;
        }
        .v212-root .v212-cta-tag {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          font-family: 'Space Mono', monospace;
          font-size: 11px;
          letter-spacing: 0.24em;
          color: var(--teal);
          padding: 10px 20px;
          border: 1px solid var(--glass-border);
          background: var(--glass-bg);
          border-radius: 999px;
          margin-bottom: 28px;
        }
        .v212-root .v212-cta h2 {
          font-family: 'Unbounded', sans-serif;
          font-size: 72px;
          font-weight: 900;
          color: var(--cream);
          line-height: 1;
          margin-bottom: 20px;
          letter-spacing: -0.03em;
          background: linear-gradient(135deg, var(--cream) 0%, var(--orange) 100%);
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        .v212-root .v212-cta p {
          font-size: 18px;
          color: var(--text);
          margin-bottom: 40px;
        }
        .v212-root .v212-cta-btn {
          padding: 22px 42px;
          font-size: 14px;
        }

        /* ─── PROMO BLOCKS (Content, Creators) ─── */
        .v212-root .v212-promo-block {
          position: relative;
          padding: 40px 36px;
          margin: 48px 0;
          background: linear-gradient(135deg, rgba(16, 37, 64, 0.5) 0%, rgba(5, 16, 31, 0.6) 100%);
          border: 1px solid var(--glass-border);
          backdrop-filter: blur(12px);
          border-radius: 28px;
          box-shadow: 0 30px 80px rgba(0, 0, 0, 0.35);
          overflow: hidden;
        }
        .v212-root .v212-promo-block::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 2px;
          background: linear-gradient(90deg, transparent, var(--orange), var(--teal), var(--violet), transparent);
        }
        .v212-root .v212-promo-header {
          max-width: 680px;
          margin-bottom: 32px;
        }
        .v212-root .v212-promo-kicker {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          font-family: 'Space Mono', monospace;
          font-size: 11px;
          letter-spacing: 0.22em;
          color: var(--teal);
          padding: 8px 14px;
          border: 1px solid var(--glass-border);
          border-radius: 999px;
          background: var(--glass-bg);
          margin-bottom: 16px;
        }
        .v212-root .v212-promo-title {
          font-family: 'Unbounded', sans-serif;
          font-size: 36px;
          font-weight: 700;
          line-height: 1.05;
          color: var(--cream);
          margin: 0 0 12px;
          letter-spacing: -0.02em;
          background: linear-gradient(135deg, var(--cream) 0%, var(--orange) 100%);
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        .v212-root .v212-promo-sub {
          font-size: 15px;
          line-height: 1.65;
          color: var(--text);
        }

        .v212-root .v212-scroller {
          display: flex;
          gap: 18px;
          overflow-x: auto;
          padding: 4px 4px 20px;
          scrollbar-width: thin;
          scrollbar-color: var(--orange) transparent;
        }
        .v212-root .v212-scroller::-webkit-scrollbar { height: 6px; }
        .v212-root .v212-scroller::-webkit-scrollbar-thumb {
          background: linear-gradient(90deg, var(--orange), var(--teal));
          border-radius: 999px;
        }

        /* Content card */
        .v212-root .v212-content-card {
          position: relative;
          flex-shrink: 0;
          width: 280px;
          padding: 24px 22px;
          background: var(--glass-bg);
          border: 1px solid var(--glass-border);
          backdrop-filter: blur(8px);
          border-radius: 18px;
          cursor: pointer;
          transition: all 0.3s;
        }
        .v212-root .v212-content-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 20px 40px rgba(255, 122, 61, 0.18);
          border-color: var(--orange);
        }
        .v212-root .v212-content-kind {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-family: 'Space Mono', monospace;
          font-size: 10px;
          letter-spacing: 0.15em;
          color: var(--teal);
          padding: 5px 10px;
          border: 1px solid var(--teal-glow);
          border-radius: 999px;
          background: rgba(45, 212, 191, 0.08);
          margin-bottom: 18px;
        }
        .v212-root .v212-content-title {
          font-family: 'Unbounded', sans-serif;
          font-size: 17px;
          font-weight: 600;
          line-height: 1.3;
          color: var(--cream);
          margin: 0 0 16px;
          letter-spacing: -0.01em;
          min-height: 86px;
        }
        .v212-root .v212-content-meta {
          font-family: 'Space Mono', monospace;
          font-size: 10px;
          color: var(--text-dim);
          display: flex;
          gap: 6px;
          align-items: center;
        }
        .v212-root .v212-content-dot { color: var(--orange); }

        /* Creator card */
        .v212-root .v212-creator-card {
          position: relative;
          flex-shrink: 0;
          width: 260px;
          padding: 28px 24px;
          background: var(--glass-bg);
          border: 1px solid var(--glass-border);
          backdrop-filter: blur(8px);
          border-radius: 24px;
          text-align: center;
          cursor: pointer;
          transition: all 0.3s;
        }
        .v212-root .v212-creator-card:hover {
          transform: translateY(-4px);
          border-color: var(--teal);
          box-shadow: 0 20px 40px rgba(45, 212, 191, 0.2);
        }
        .v212-root .v212-creator-avatar {
          width: 64px;
          height: 64px;
          border-radius: 50%;
          background: linear-gradient(135deg, var(--orange) 0%, var(--violet) 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 16px;
          color: var(--cream);
          box-shadow: 0 0 30px var(--orange-glow);
        }
        .v212-root .v212-creator-kind {
          display: inline-block;
          font-family: 'Space Mono', monospace;
          font-size: 9px;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: var(--teal);
          padding: 3px 10px;
          border: 1px solid var(--teal-glow);
          border-radius: 999px;
          margin-bottom: 12px;
        }
        .v212-root .v212-creator-name {
          font-family: 'Unbounded', sans-serif;
          font-size: 20px;
          font-weight: 700;
          color: var(--cream);
          margin: 0 0 4px;
          letter-spacing: -0.01em;
        }
        .v212-root .v212-creator-handle {
          font-family: 'Space Mono', monospace;
          font-size: 11px;
          color: var(--orange);
          margin-bottom: 14px;
        }
        .v212-root .v212-creator-bio {
          font-size: 12px;
          line-height: 1.55;
          color: var(--text);
          margin-bottom: 18px;
          min-height: 36px;
        }
        .v212-root .v212-creator-footer {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
          padding-top: 14px;
          border-top: 1px solid var(--glass-border);
        }
        .v212-root .v212-creator-footer span {
          font-family: 'Space Mono', monospace;
          font-size: 10px;
          letter-spacing: 0.15em;
          text-transform: uppercase;
          color: var(--text-dim);
        }
        .v212-root .v212-creator-footer strong {
          font-family: 'Unbounded', sans-serif;
          font-size: 18px;
          color: var(--teal);
        }

        /* ─── TOOLS SHOWCASE ─── */
        .v212-root .v212-tools-block {
          position: relative;
          padding: 56px 40px;
          margin: 56px 0 32px;
          background: linear-gradient(135deg, rgba(139, 92, 246, 0.06) 0%, rgba(45, 212, 191, 0.06) 100%);
          border: 1px solid var(--glass-border);
          backdrop-filter: blur(16px);
          border-radius: 32px;
          overflow: hidden;
        }
        .v212-root .v212-tools-block::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 2px;
          background: linear-gradient(90deg, transparent, var(--orange), var(--teal), var(--violet), transparent);
        }
        .v212-root .v212-tools-block::after {
          content: '';
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 700px;
          height: 300px;
          background: radial-gradient(ellipse, var(--orange-glow) 0%, transparent 60%);
          filter: blur(80px);
          opacity: 0.3;
          pointer-events: none;
        }
        .v212-root .v212-tools-header {
          position: relative;
          text-align: center;
          max-width: 700px;
          margin: 0 auto 48px;
        }
        .v212-root .v212-tools-header .v212-promo-kicker {
          margin-bottom: 20px;
        }
        .v212-root .v212-tools-grid {
          position: relative;
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 16px;
        }
        .v212-root .v212-tool-cell {
          position: relative;
          padding: 26px 22px 24px;
          background: var(--glass-bg);
          border: 1px solid var(--glass-border);
          backdrop-filter: blur(10px);
          border-radius: 18px;
          transition: all 0.3s;
          overflow: hidden;
        }
        .v212-root .v212-tool-cell:hover {
          transform: translateY(-4px);
          border-color: var(--orange);
          box-shadow: 0 20px 40px rgba(255, 122, 61, 0.18);
        }
        .v212-root .v212-tool-icon {
          width: 42px;
          height: 42px;
          border-radius: 12px;
          background: linear-gradient(135deg, rgba(255, 122, 61, 0.15), rgba(45, 212, 191, 0.15));
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--orange);
          margin-bottom: 18px;
          border: 1px solid var(--glass-border);
        }
        .v212-root .v212-tool-name {
          font-family: 'Unbounded', sans-serif;
          font-size: 16px;
          font-weight: 700;
          color: var(--cream);
          margin: 0 0 8px;
          letter-spacing: -0.01em;
        }
        .v212-root .v212-tool-pitch {
          font-size: 12px;
          line-height: 1.55;
          color: var(--text);
          margin-bottom: 16px;
          min-height: 38px;
        }
        .v212-root .v212-tool-aud {
          display: inline-block;
          font-family: 'Space Mono', monospace;
          font-size: 9px;
          font-weight: 700;
          letter-spacing: 0.18em;
          padding: 4px 10px;
          border-radius: 999px;
        }
        .v212-root .v212-tool-aud-discover {
          color: var(--teal);
          background: rgba(45, 212, 191, 0.1);
          border: 1px solid var(--teal-glow);
        }
        .v212-root .v212-tool-aud-build {
          color: var(--orange);
          background: rgba(255, 122, 61, 0.1);
          border: 1px solid var(--orange-glow);
        }
        .v212-root .v212-tool-aud-both {
          color: var(--violet);
          background: rgba(139, 92, 246, 0.1);
          border: 1px solid rgba(139, 92, 246, 0.4);
        }

        @media (max-width: 900px) {
          .v212-root .v212-hero-title { font-size: 56px; }
          .v212-root .v212-section-title { font-size: 36px; }
          .v212-root .v212-cta h2 { font-size: 44px; }
          .v212-root .v212-features-grid { grid-template-columns: 1fr 1fr; }
          .v212-root .v212-trans-body { grid-template-columns: 1fr; gap: 24px; }
          .v212-root .v212-trans-stats { grid-template-columns: repeat(3, 1fr); }
          .v212-root .v212-trans-stat { text-align: center; }
          .v212-root .v212-trans-message { font-size: 18px; }
          .v212-root .v212-nav-links a { display: none; }
          .v212-root .v212-nav-links .v212-nav-cta { display: inline-flex; }
          .v212-root .v212-nav-signal { display: none; }
          .v212-root .v212-hex-cluster { gap: 12px; }
          .v212-root .v212-hex { width: 140px; }
          .v212-root .v212-promo-title { font-size: 26px; }
          .v212-root .v212-tools-grid { grid-template-columns: 1fr 1fr; }
          .v212-root .v212-promo-block,
          .v212-root .v212-tools-block { padding: 32px 24px; }
        }
      `}</style>
    </div>
  );
}
