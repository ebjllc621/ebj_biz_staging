/**
 * Variant 2.1.4 — Neon Topography
 *
 * Midnight-navy cartographic aesthetic: glowing orange/teal contour
 * lines, pulsing map pins, "elevation marker" section breaks with
 * GPS coordinate stylings.
 *
 * @tier SIMPLE (preview-only, no business logic)
 */
'use client';

import { useEffect } from 'react';
import nextDynamic from 'next/dynamic';
import { Star, Gift, Calendar, Clock, LayoutGrid, MapPin, Navigation } from 'lucide-react';

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

interface ElevationProps {
  coord: string;
  elevation: string;
  label: string;
  headline: string;
  pitch: string;
  pins: { label: string; count: string }[];
}

function Elevation({ coord, elevation, label, headline, pitch, pins }: ElevationProps) {
  return (
    <div className="v214-elevation">
      <div className="v214-elev-gridline" />
      <div className="v214-elev-header">
        <div className="v214-elev-coord">
          <Navigation className="w-3 h-3" />
          {coord}
        </div>
        <div className="v214-elev-label">{label}</div>
        <div className="v214-elev-elev">ELEV {elevation}</div>
      </div>
      <div className="v214-elev-body">
        <div>
          <h3 className="v214-elev-headline">{headline}</h3>
          <p className="v214-elev-pitch">{pitch}</p>
        </div>
        <div className="v214-elev-pins">
          {pins.map((pin, i) => (
            <div key={i} className="v214-elev-pin">
              <MapPin className="w-4 h-4" />
              <div>
                <div className="v214-elev-pin-count">{pin.count}</div>
                <div className="v214-elev-pin-label">{pin.label}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function Variant214Page() {
  const { data, isLoading, error, refetch } = useHomepageData();

  useEffect(() => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href =
      'https://fonts.googleapis.com/css2?family=Big+Shoulders+Display:wght@400;700;800;900&family=Space+Mono:wght@400;700&family=Inter:wght@400;500;600&display=swap';
    document.head.appendChild(link);
    return () => {
      document.head.removeChild(link);
    };
  }, []);

  return (
    <div className="v214-root">
      {/* ───── BG LAYERS ───── */}
      <div className="v214-bg">
        {/* Contour lines SVG */}
        <svg className="v214-contour" viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <filter id="v214-blur" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="0.5" />
            </filter>
          </defs>
          <g stroke="rgba(255,138,76,0.5)" strokeWidth="1" fill="none" filter="url(#v214-blur)">
            <path d="M -50 150 Q 200 100, 400 180 T 800 160 T 1200 220 T 1500 170" />
            <path d="M -50 200 Q 220 160, 420 240 T 820 220 T 1220 280 T 1500 230" />
            <path d="M -50 250 Q 240 220, 440 300 T 840 280 T 1240 340 T 1500 290" />
            <path d="M -50 300 Q 260 280, 460 360 T 860 340 T 1260 400 T 1500 350" />
          </g>
          <g stroke="rgba(45,212,191,0.45)" strokeWidth="1" fill="none" filter="url(#v214-blur)">
            <path d="M -50 480 Q 180 440, 360 520 T 720 500 T 1080 560 T 1500 510" />
            <path d="M -50 540 Q 200 500, 380 580 T 740 560 T 1100 620 T 1500 570" />
            <path d="M -50 600 Q 220 560, 400 640 T 760 620 T 1120 680 T 1500 630" />
            <path d="M -50 660 Q 240 620, 420 700 T 780 680 T 1140 740 T 1500 690" />
          </g>
          <g stroke="rgba(255,138,76,0.35)" strokeWidth="1" fill="none" filter="url(#v214-blur)">
            <path d="M -50 800 Q 200 760, 400 840 T 800 820 T 1200 880 T 1500 830" />
            <path d="M -50 860 Q 220 820, 420 900 T 820 880 T 1220 940 T 1500 890" />
          </g>
        </svg>
        {/* Pulsing pin dots */}
        <div className="v214-pin v214-pin-1" />
        <div className="v214-pin v214-pin-2" />
        <div className="v214-pin v214-pin-3" />
        <div className="v214-pin v214-pin-4" />
        <div className="v214-pin v214-pin-5" />
        <div className="v214-bg-vignette" />
      </div>

      {/* ───── NAV ───── */}
      <nav className="v214-nav">
        <div className="v214-nav-inner">
          <img
            src="/uploads/site/branding/namelogo-horizontal.png"
            alt="Bizconekt"
            className="v214-nav-logo"
          />
          <div className="v214-nav-coord">
            <Navigation className="w-3 h-3" />
            47.23°N · 122.15°W
          </div>
          <div className="v214-nav-links">
            <a href="/listings">Listings</a>
            <a href="/events">Events</a>
            <a href="/offers">Offers</a>
            <a href="/jobs">Jobs</a>
            <a href="/register" className="v214-nav-cta">Join Free</a>
          </div>
        </div>
      </nav>

      {/* ───── HERO ───── */}
      <section className="v214-hero">
        <div className="v214-hero-inner">
          <div className="v214-hero-frame">
            <div className="v214-hero-corner v214-hero-corner-tl">
              <span>N 47.232°</span>
            </div>
            <div className="v214-hero-corner v214-hero-corner-tr">
              <span>W 122.154°</span>
            </div>
            <div className="v214-hero-corner v214-hero-corner-bl">
              <span>ELEV 324m</span>
            </div>
            <div className="v214-hero-corner v214-hero-corner-br">
              <span>GRID 47-12</span>
            </div>

            <div className="v214-eyebrow">
              <MapPin className="w-3 h-3" />
              LOCAL ECONOMY · ACTIVE LAYER
            </div>
            <h1 className="v214-hero-title">
              Every business
              <br />
              <span className="v214-accent">plotted.</span>
            </h1>
            <p className="v214-hero-text">
              A night-drive through the local economy. Bizconekt maps the network as glowing
              topography — every listing a coordinate, every opportunity an elevation change.
            </p>
            <div className="v214-hero-actions">
              <button className="v214-btn-primary">Join the Map</button>
              <button className="v214-btn-ghost">View Coordinates</button>
            </div>
          </div>

          {/* Map chip stats */}
          <div className="v214-chips">
            <div className="v214-chip">
              <MapPin className="w-3 h-3" />
              <div className="v214-chip-value">{data?.stats?.total_listings?.toLocaleString() ?? '500'}+</div>
              <div className="v214-chip-label">plotted businesses</div>
            </div>
            <div className="v214-chip">
              <MapPin className="w-3 h-3" />
              <div className="v214-chip-value">{data?.stats?.total_users?.toLocaleString() ?? '1.2K'}</div>
              <div className="v214-chip-label">active members</div>
            </div>
            <div className="v214-chip">
              <MapPin className="w-3 h-3" />
              <div className="v214-chip-value">{data?.stats?.total_events ?? '150'}+</div>
              <div className="v214-chip-label">upcoming events</div>
            </div>
            <div className="v214-chip">
              <MapPin className="w-3 h-3" />
              <div className="v214-chip-value">{data?.stats?.total_reviews ?? '890'}+</div>
              <div className="v214-chip-label">reviews logged</div>
            </div>
          </div>
        </div>
      </section>

      {/* ───── SEARCH ───── */}
      <section className="v214-search-section">
        <div className="v214-search-bar">
          <Navigation className="w-4 h-4" />
          <input type="text" placeholder="Navigate the network..." />
          <button>Locate →</button>
        </div>
      </section>

      {/* ───── FEATURES ───── */}
      <section className="v214-features">
        <div className="v214-section-label">
          <span className="v214-section-dot" />
          LAYERS ON THE MAP
          <span className="v214-section-dot" />
        </div>
        <h2 className="v214-section-title">Four layers. One grid.</h2>
        <div className="v214-features-grid">
          {[
            ['01', 'Directory', '47°', 'Business coordinates plotted and verified.'],
            ['02', 'Events', '32°', 'Networking vectors drawn across the region.'],
            ['03', 'Offers', '18°', 'Flash promotions charted in real time.'],
            ['04', 'Pro Network', '54°', 'Member bylines connecting the grid.'],
          ].map(([n, t, deg, d]) => (
            <div key={n} className="v214-feature-cell">
              <div className="v214-feature-top">
                <span className="v214-feature-num">{n}</span>
                <span className="v214-feature-deg">{deg}</span>
              </div>
              <div className="v214-feature-contour" />
              <h3>{t}</h3>
              <p>{d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ───── SCROLL ZONE ───── */}
      <section className="v214-scroll-zone">
        <div className="v214-scroll-inner">
          <Elevation
            coord="N 47.232° · W 122.154°"
            elevation="00m"
            label="ORIGIN"
            headline="Entering the live map."
            pitch="Every listing, offer and event below is plotted from live platform data. The map redraws in real time."
            pins={[
              { label: 'data points', count: '1.2K' },
              { label: 'contours', count: '47' },
              { label: 'refresh', count: 'live' },
            ]}
          />

          <FlashOffersSection maxOffers={6} />

          {error && (
            <div className="v214-error">
              {error}
              <button onClick={refetch}>Reconnect</button>
            </div>
          )}

          <div className="v214-scroll-block">
            {isLoading ? (
              <Skeleton />
            ) : data?.categories && data.categories.length > 0 ? (
              <div className="v214-panel">
                <div className="v214-panel-coord">47.24°N · 122.12°W</div>
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
              <div className="v214-panel">
                <div className="v214-panel-coord">47.25°N · 122.11°W</div>
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
              <div className="v214-panel">
                <div className="v214-panel-coord">47.26°N · 122.10°W</div>
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
              <div className="v214-panel">
                <div className="v214-panel-coord">47.27°N · 122.09°W</div>
                <ContentSlider title="Events" icon={Calendar} moreLink="/events">
                  {data.upcoming_events.map((event, index) => (
                    <EventCard key={event.id} event={event} index={index} />
                  ))}
                </ContentSlider>
              </div>
            ) : null}
          </div>

          <Elevation
            coord="N 47.262° · W 122.098°"
            elevation="180m"
            label="RIDGE CROSSING"
            headline="Trust plotted in three dimensions."
            pitch="The people other members trust most. Surface the voices the community has already validated — the real map of word-of-mouth."
            pins={[
              { label: 'amplifiers', count: '10' },
              { label: 'avg trust', count: '4.9★' },
              { label: 'fresh signal', count: '24h' },
            ]}
          />

          <div className="v214-panel">
            <div className="v214-panel-coord">47.28°N · 122.08°W</div>
            <TopRecommendersScroller limit={10} />
          </div>

          <div className="v214-scroll-block">
            {isLoading ? (
              <Skeleton />
            ) : data?.latest_listings && data.latest_listings.length > 0 ? (
              <div className="v214-panel">
                <div className="v214-panel-coord">47.29°N · 122.07°W</div>
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

          <Elevation
            coord="N 47.278° · W 122.085°"
            elevation="210m"
            label="PUBLICATION LAYER"
            headline="Every route has a reader and a writer."
            pitch="The map publishes too. Articles, videos, podcasts, guides, and newsletters — plotted alongside the businesses they cover."
            pins={[
              { label: 'formats', count: '5' },
              { label: 'creators', count: '120+' },
              { label: 'fresh', count: 'live' },
            ]}
          />

          {/* ─── CONTENT SCROLLER ─── */}
          <div className="v214-promo-block">
            <div className="v214-promo-head">
              <div className="v214-elev-coord">
                <Navigation className="w-3 h-3" />
                N 47.278° · LAYER · CONTENT
              </div>
              <h3 className="v214-promo-title">Read. Watch. Listen.</h3>
              <p className="v214-promo-sub">Published by members, indexed on the map, always fresh.</p>
            </div>
            <div className="v214-scroller">
              {PREVIEW_CONTENT.map((item, idx) => {
                const Icon = item.icon;
                return (
                  <article key={item.id} className="v214-content-card">
                    <div className="v214-content-top">
                      <div className="v214-content-kind">
                        <Icon className="w-3 h-3" />
                        {item.kind}
                      </div>
                      <div className="v214-content-gps">PT.{String(idx + 1).padStart(2, '0')}</div>
                    </div>
                    <div className="v214-content-contour" />
                    <h4 className="v214-content-title">{item.title}</h4>
                    <div className="v214-content-meta">
                      <span>{item.author}</span>
                      <span className="v214-content-dot" />
                      <span>{item.meta}</span>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>

          {/* ─── CREATORS SCROLLER ─── */}
          <div className="v214-promo-block">
            <div className="v214-promo-head">
              <div className="v214-elev-coord">
                <Navigation className="w-3 h-3" />
                N 47.285° · LAYER · CREATORS
              </div>
              <h3 className="v214-promo-title">The makers on the map.</h3>
              <p className="v214-promo-sub">Podcasters, writers, video creators, affiliate marketers — plot a point and follow them.</p>
            </div>
            <div className="v214-scroller">
              {PREVIEW_CREATORS.map((creator) => {
                const Icon = creator.icon;
                return (
                  <article key={creator.id} className="v214-creator-card">
                    <div className="v214-creator-head">
                      <div className="v214-creator-avatar">
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="v214-creator-pin">
                        <MapPin className="w-3 h-3" />
                      </div>
                    </div>
                    <div className="v214-creator-kind">{creator.kind}</div>
                    <h4 className="v214-creator-name">{creator.name}</h4>
                    <div className="v214-creator-handle">{creator.handle}</div>
                    <p className="v214-creator-bio">{creator.bio}</p>
                    <div className="v214-creator-footer">
                      <span>FOLLOWERS</span>
                      <strong>{creator.followers}</strong>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>

          <Elevation
            coord="N 47.291° · W 122.064°"
            elevation="324m"
            label="SUMMIT · HIRING"
            headline="Careers plotted on the high ground."
            pitch="Local companies hiring right now. See the open roles mapped across the region — direct, verified, always live."
            pins={[
              { label: 'open roles', count: '34' },
              { label: 'hiring now', count: '12' },
              { label: 'coverage', count: '100%' },
            ]}
          />

          <WhosHiringSection maxJobs={4} />

          {/* ─── TOOLS SHOWCASE ─── */}
          <div className="v214-tools-block">
            <div className="v214-tools-gridline" />
            <div className="v214-tools-head">
              <div className="v214-elev-coord">
                <Navigation className="w-3 h-3" />
                N 47.300° · CONTROL PANEL · TOOLKIT
              </div>
              <h3 className="v214-promo-title">Every tool a listing needs.</h3>
              <p className="v214-promo-sub">
                Twelve instruments wired to the map. Connection groups. Quote pools. Campaigns. Analytics.
                Everything a listing member plots without leaving the dashboard.
              </p>
            </div>
            <div className="v214-tools-grid-inner">
              {PREVIEW_TOOLS.map((tool, idx) => {
                const Icon = tool.icon;
                return (
                  <div key={tool.id} className="v214-tool-cell">
                    <div className="v214-tool-num">TX.{String(idx + 1).padStart(2, '0')}</div>
                    <div className="v214-tool-icon">
                      <Icon className="w-5 h-5" />
                    </div>
                    <h4 className="v214-tool-name">{tool.name}</h4>
                    <p className="v214-tool-pitch">{tool.pitch}</p>
                    <div className={`v214-tool-aud v214-tool-aud-${tool.audience}`}>
                      {tool.audience === 'discover' ? '◇ DISCOVER' : tool.audience === 'build' ? '◆ BUILD' : '◆◇ BOTH'}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* ───── CTA ───── */}
      <section className="v214-cta">
        <div className="v214-cta-glow" />
        <div className="v214-cta-inner">
          <div className="v214-eyebrow v214-eyebrow-center">
            <Navigation className="w-3 h-3" />
            FINAL COORDINATE
          </div>
          <h2>Drop a pin.</h2>
          <p>Create a free account. Plot your position on the map.</p>
          <button className="v214-btn-primary v214-cta-btn">Create Free Account →</button>
        </div>
      </section>

      <SiteFooter />

      <style jsx global>{`
        .v214-root {
          --midnight: #040812;
          --navy: #0a1427;
          --navy-2: #0f1d38;
          --orange: #ff8a4c;
          --orange-glow: rgba(255, 138, 76, 0.55);
          --teal: #2dd4bf;
          --teal-glow: rgba(45, 212, 191, 0.55);
          --cream: #f4f1e8;
          --text: rgba(244, 241, 232, 0.8);
          --text-dim: rgba(244, 241, 232, 0.5);
          --line: rgba(255, 138, 76, 0.22);

          font-family: 'Inter', sans-serif;
          background: var(--midnight);
          color: var(--cream);
          position: relative;
          overflow-x: hidden;
          -webkit-font-smoothing: antialiased;
        }

        /* ─── BG ─── */
        .v214-root .v214-bg {
          position: fixed;
          inset: 0;
          z-index: 0;
          pointer-events: none;
        }
        .v214-root .v214-contour {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          filter: drop-shadow(0 0 12px var(--orange-glow));
        }
        .v214-root .v214-pin {
          position: absolute;
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: var(--orange);
          box-shadow: 0 0 18px var(--orange-glow);
          animation: v214-pulse 3s ease-in-out infinite;
        }
        .v214-root .v214-pin::after {
          content: '';
          position: absolute;
          inset: -8px;
          border: 1px solid var(--orange);
          border-radius: 50%;
          opacity: 0.4;
          animation: v214-ping 3s ease-out infinite;
        }
        .v214-root .v214-pin-1 { top: 18%; left: 12%; }
        .v214-root .v214-pin-2 { top: 32%; left: 72%; background: var(--teal); box-shadow: 0 0 18px var(--teal-glow); animation-delay: -0.8s; }
        .v214-root .v214-pin-2::after { border-color: var(--teal); }
        .v214-root .v214-pin-3 { top: 58%; left: 28%; animation-delay: -1.4s; }
        .v214-root .v214-pin-4 { top: 64%; left: 84%; background: var(--teal); box-shadow: 0 0 18px var(--teal-glow); animation-delay: -2s; }
        .v214-root .v214-pin-4::after { border-color: var(--teal); }
        .v214-root .v214-pin-5 { top: 82%; left: 48%; animation-delay: -2.4s; }
        @keyframes v214-pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.7; transform: scale(1.3); }
        }
        @keyframes v214-ping {
          0% { transform: scale(1); opacity: 0.6; }
          100% { transform: scale(2.8); opacity: 0; }
        }
        .v214-root .v214-bg-vignette {
          position: absolute;
          inset: 0;
          background: radial-gradient(ellipse at center, transparent 40%, rgba(4, 8, 18, 0.75) 100%);
        }

        /* ─── NAV ─── */
        .v214-root .v214-nav {
          position: sticky;
          top: 0;
          z-index: 50;
          background: rgba(4, 8, 18, 0.85);
          backdrop-filter: blur(12px);
          border-bottom: 1px solid var(--line);
        }
        .v214-root .v214-nav-inner {
          max-width: 1360px;
          margin: 0 auto;
          padding: 0 40px;
          display: flex;
          align-items: center;
          gap: 28px;
          height: 72px;
        }
        .v214-root .v214-nav-logo {
          height: 28px;
          filter: brightness(0) invert(1);
        }
        .v214-root .v214-nav-coord {
          font-family: 'Space Mono', monospace;
          font-size: 10px;
          letter-spacing: 0.15em;
          color: var(--orange);
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 6px 12px;
          border: 1px solid var(--line);
          background: rgba(255, 138, 76, 0.05);
        }
        .v214-root .v214-nav-links {
          display: flex;
          margin-left: auto;
          gap: 2px;
          align-items: center;
          height: 100%;
        }
        .v214-root .v214-nav-links a {
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: var(--text);
          text-decoration: none;
          padding: 0 18px;
          height: 100%;
          display: flex;
          align-items: center;
          transition: color 0.2s;
        }
        .v214-root .v214-nav-links a:hover { color: var(--orange); }
        .v214-root .v214-nav-cta {
          background: var(--orange) !important;
          color: var(--midnight) !important;
          padding: 10px 20px !important;
          height: auto !important;
          box-shadow: 0 0 20px var(--orange-glow);
          font-weight: 800 !important;
        }

        /* ─── HERO ─── */
        .v214-root .v214-hero {
          position: relative;
          z-index: 1;
          padding: 120px 0 140px;
        }
        .v214-root .v214-hero-inner {
          max-width: 1360px;
          margin: 0 auto;
          padding: 0 40px;
        }
        .v214-root .v214-hero-frame {
          position: relative;
          padding: 72px 60px;
          border: 1px solid var(--line);
          background: rgba(10, 20, 39, 0.35);
          backdrop-filter: blur(6px);
          max-width: 920px;
        }
        .v214-root .v214-hero-corner {
          position: absolute;
          font-family: 'Space Mono', monospace;
          font-size: 10px;
          color: var(--orange);
          letter-spacing: 0.12em;
          padding: 6px 10px;
          background: var(--midnight);
          border: 1px solid var(--line);
        }
        .v214-root .v214-hero-corner-tl { top: -12px; left: 40px; }
        .v214-root .v214-hero-corner-tr { top: -12px; right: 40px; }
        .v214-root .v214-hero-corner-bl { bottom: -12px; left: 40px; }
        .v214-root .v214-hero-corner-br { bottom: -12px; right: 40px; }

        .v214-root .v214-eyebrow {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          font-family: 'Space Mono', monospace;
          font-size: 11px;
          letter-spacing: 0.22em;
          text-transform: uppercase;
          color: var(--teal);
          margin-bottom: 36px;
        }
        .v214-root .v214-eyebrow-center { justify-content: center; margin-bottom: 20px; }

        .v214-root .v214-hero-title {
          font-family: 'Big Shoulders Display', 'Poppins', sans-serif;
          font-size: 128px;
          font-weight: 900;
          line-height: 0.88;
          letter-spacing: -0.02em;
          color: var(--cream);
          margin: 0 0 36px;
          text-shadow: 0 0 60px rgba(255, 138, 76, 0.25);
        }
        .v214-root .v214-accent {
          color: var(--orange);
          text-shadow: 0 0 40px var(--orange-glow);
        }
        .v214-root .v214-hero-text {
          font-size: 17px;
          line-height: 1.7;
          color: var(--text);
          max-width: 560px;
          margin-bottom: 44px;
        }
        .v214-root .v214-hero-actions {
          display: flex;
          gap: 18px;
        }
        .v214-root .v214-btn-primary {
          font-family: 'Big Shoulders Display', sans-serif;
          font-size: 14px;
          font-weight: 800;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          padding: 18px 36px;
          background: var(--orange);
          color: var(--midnight);
          border: none;
          cursor: pointer;
          box-shadow: 0 0 40px var(--orange-glow);
          transition: all 0.25s;
        }
        .v214-root .v214-btn-primary:hover {
          box-shadow: 0 0 60px var(--orange-glow);
          transform: translateY(-2px);
        }
        .v214-root .v214-btn-ghost {
          font-family: 'Space Mono', monospace;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          padding: 18px 28px;
          background: transparent;
          color: var(--cream);
          border: 1px solid var(--line);
          cursor: pointer;
          transition: all 0.2s;
        }
        .v214-root .v214-btn-ghost:hover {
          border-color: var(--teal);
          color: var(--teal);
        }

        /* Chips */
        .v214-root .v214-chips {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 16px;
          margin-top: 60px;
          max-width: 920px;
        }
        .v214-root .v214-chip {
          padding: 24px 22px;
          background: rgba(10, 20, 39, 0.6);
          border: 1px solid var(--line);
          backdrop-filter: blur(6px);
          position: relative;
        }
        .v214-root .v214-chip svg {
          color: var(--teal);
          margin-bottom: 12px;
        }
        .v214-root .v214-chip-value {
          font-family: 'Big Shoulders Display', sans-serif;
          font-size: 32px;
          font-weight: 800;
          color: var(--cream);
          line-height: 1;
          margin-bottom: 6px;
        }
        .v214-root .v214-chip-label {
          font-family: 'Space Mono', monospace;
          font-size: 10px;
          letter-spacing: 0.15em;
          text-transform: uppercase;
          color: var(--text-dim);
        }

        /* ─── SEARCH ─── */
        .v214-root .v214-search-section {
          position: relative;
          z-index: 1;
          max-width: 780px;
          margin: 0 auto 80px;
          padding: 0 40px;
        }
        .v214-root .v214-search-bar {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 6px 6px 6px 24px;
          background: rgba(10, 20, 39, 0.85);
          border: 1px solid var(--orange);
          backdrop-filter: blur(12px);
          box-shadow: 0 0 50px var(--orange-glow), 0 20px 60px rgba(0, 0, 0, 0.5);
        }
        .v214-root .v214-search-bar svg { color: var(--orange); }
        .v214-root .v214-search-bar input {
          flex: 1;
          background: transparent;
          border: none;
          padding: 18px 0;
          font-family: 'Inter', sans-serif;
          font-size: 15px;
          color: var(--cream);
          outline: none;
        }
        .v214-root .v214-search-bar input::placeholder { color: var(--text-dim); }
        .v214-root .v214-search-bar button {
          font-family: 'Big Shoulders Display', sans-serif;
          font-size: 13px;
          font-weight: 800;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          padding: 16px 26px;
          background: var(--orange);
          color: var(--midnight);
          border: none;
          cursor: pointer;
        }

        /* ─── FEATURES ─── */
        .v214-root .v214-features {
          position: relative;
          z-index: 1;
          max-width: 1360px;
          margin: 0 auto;
          padding: 100px 40px;
        }
        .v214-root .v214-section-label {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 14px;
          font-family: 'Space Mono', monospace;
          font-size: 11px;
          letter-spacing: 0.24em;
          text-transform: uppercase;
          color: var(--teal);
          margin-bottom: 16px;
        }
        .v214-root .v214-section-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: var(--teal);
          box-shadow: 0 0 12px var(--teal-glow);
        }
        .v214-root .v214-section-title {
          font-family: 'Big Shoulders Display', sans-serif;
          font-size: 84px;
          font-weight: 800;
          color: var(--cream);
          text-align: center;
          margin-bottom: 72px;
          letter-spacing: -0.02em;
        }
        .v214-root .v214-features-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 0;
          border: 1px solid var(--line);
        }
        .v214-root .v214-feature-cell {
          padding: 40px 32px;
          border-right: 1px solid var(--line);
          background: rgba(10, 20, 39, 0.4);
          backdrop-filter: blur(6px);
          transition: background 0.3s;
        }
        .v214-root .v214-feature-cell:last-child { border-right: none; }
        .v214-root .v214-feature-cell:hover {
          background: rgba(255, 138, 76, 0.08);
        }
        .v214-root .v214-feature-top {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-family: 'Space Mono', monospace;
          font-size: 11px;
          margin-bottom: 16px;
        }
        .v214-root .v214-feature-num { color: var(--orange); letter-spacing: 0.2em; }
        .v214-root .v214-feature-deg { color: var(--teal); }
        .v214-root .v214-feature-contour {
          height: 24px;
          margin-bottom: 16px;
          background-image:
            linear-gradient(90deg, transparent, var(--orange-glow), transparent),
            linear-gradient(90deg, transparent 30%, var(--teal-glow) 50%, transparent 70%);
          background-size: 100% 1px, 100% 1px;
          background-repeat: no-repeat;
          background-position: 0 8px, 0 16px;
        }
        .v214-root .v214-feature-cell h3 {
          font-family: 'Big Shoulders Display', sans-serif;
          font-size: 28px;
          font-weight: 800;
          color: var(--cream);
          margin-bottom: 10px;
          letter-spacing: -0.01em;
        }
        .v214-root .v214-feature-cell p {
          font-size: 13px;
          line-height: 1.65;
          color: var(--text);
        }

        /* ─── SCROLL ZONE ─── */
        .v214-root .v214-scroll-zone {
          position: relative;
          z-index: 1;
          padding: 60px 0 120px;
        }
        .v214-root .v214-scroll-inner {
          max-width: 1360px;
          margin: 0 auto;
          padding: 0 40px;
        }
        .v214-root .v214-scroll-block {
          display: flex;
          flex-direction: column;
          gap: 28px;
          margin: 40px 0;
        }
        .v214-root .v214-panel {
          position: relative;
          padding: 40px 32px 28px;
          background: rgba(10, 20, 39, 0.5);
          border: 1px solid var(--line);
          backdrop-filter: blur(8px);
        }
        .v214-root .v214-panel::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 2px;
          background: linear-gradient(90deg, transparent, var(--orange), var(--teal), transparent);
        }
        .v214-root .v214-panel-coord {
          position: absolute;
          top: -11px;
          right: 24px;
          font-family: 'Space Mono', monospace;
          font-size: 10px;
          letter-spacing: 0.15em;
          color: var(--orange);
          background: var(--midnight);
          padding: 2px 10px;
          border: 1px solid var(--line);
        }
        .v214-root .v214-panel h2,
        .v214-root .v214-panel h3 { color: var(--cream); }
        .v214-root .v214-panel p,
        .v214-root .v214-panel span { color: var(--text); }

        /* Elevation breaks */
        .v214-root .v214-elevation {
          position: relative;
          padding: 44px 40px;
          background: linear-gradient(135deg, rgba(10, 20, 39, 0.85) 0%, rgba(15, 29, 56, 0.6) 100%);
          border: 1px solid var(--line);
          backdrop-filter: blur(10px);
          margin: 48px 0;
          overflow: hidden;
        }
        .v214-root .v214-elev-gridline {
          position: absolute;
          inset: 0;
          background-image:
            linear-gradient(var(--line) 1px, transparent 1px),
            linear-gradient(90deg, var(--line) 1px, transparent 1px);
          background-size: 32px 32px;
          opacity: 0.35;
          pointer-events: none;
        }
        .v214-root .v214-elev-header {
          position: relative;
          display: flex;
          align-items: center;
          gap: 16px;
          margin-bottom: 24px;
          padding-bottom: 20px;
          border-bottom: 1px solid var(--line);
        }
        .v214-root .v214-elev-coord {
          display: flex;
          align-items: center;
          gap: 8px;
          font-family: 'Space Mono', monospace;
          font-size: 11px;
          letter-spacing: 0.14em;
          color: var(--teal);
        }
        .v214-root .v214-elev-label {
          font-family: 'Big Shoulders Display', sans-serif;
          font-size: 14px;
          font-weight: 800;
          letter-spacing: 0.2em;
          color: var(--orange);
          padding: 4px 10px;
          border: 1px solid var(--orange);
        }
        .v214-root .v214-elev-elev {
          margin-left: auto;
          font-family: 'Space Mono', monospace;
          font-size: 11px;
          letter-spacing: 0.15em;
          color: var(--text-dim);
        }
        .v214-root .v214-elev-body {
          position: relative;
          display: grid;
          grid-template-columns: 1.5fr 1fr;
          gap: 40px;
          align-items: center;
        }
        .v214-root .v214-elev-headline {
          font-family: 'Big Shoulders Display', sans-serif;
          font-size: 34px;
          font-weight: 700;
          line-height: 1.1;
          color: var(--cream);
          margin-bottom: 12px;
          letter-spacing: -0.01em;
        }
        .v214-root .v214-elev-pitch {
          font-size: 14px;
          line-height: 1.65;
          color: var(--text);
        }
        .v214-root .v214-elev-pins {
          display: grid;
          grid-template-columns: 1fr;
          gap: 14px;
        }
        .v214-root .v214-elev-pin {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 12px 16px;
          background: rgba(4, 8, 18, 0.6);
          border: 1px solid var(--line);
        }
        .v214-root .v214-elev-pin svg {
          color: var(--orange);
          flex-shrink: 0;
        }
        .v214-root .v214-elev-pin-count {
          font-family: 'Big Shoulders Display', sans-serif;
          font-size: 22px;
          font-weight: 800;
          color: var(--cream);
          line-height: 1;
        }
        .v214-root .v214-elev-pin-label {
          font-family: 'Space Mono', monospace;
          font-size: 10px;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: var(--text-dim);
          margin-top: 3px;
        }

        .v214-root .v214-error {
          background: rgba(255, 138, 76, 0.1);
          border: 1px solid var(--orange);
          color: var(--cream);
          padding: 18px;
          text-align: center;
          margin-bottom: 24px;
        }
        .v214-root .v214-error button {
          background: none;
          border: none;
          color: var(--orange);
          text-decoration: underline;
          cursor: pointer;
          margin-left: 8px;
        }

        /* ─── CTA ─── */
        .v214-root .v214-cta {
          position: relative;
          z-index: 1;
          padding: 140px 40px;
          overflow: hidden;
        }
        .v214-root .v214-cta-glow {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 900px;
          height: 600px;
          background: radial-gradient(ellipse, var(--orange-glow) 0%, transparent 60%);
          filter: blur(100px);
          pointer-events: none;
        }
        .v214-root .v214-cta-inner {
          position: relative;
          max-width: 780px;
          margin: 0 auto;
          text-align: center;
        }
        .v214-root .v214-cta h2 {
          font-family: 'Big Shoulders Display', sans-serif;
          font-size: 120px;
          font-weight: 900;
          color: var(--cream);
          line-height: 0.92;
          margin-bottom: 20px;
          letter-spacing: -0.03em;
          text-shadow: 0 0 60px var(--orange-glow);
        }
        .v214-root .v214-cta p {
          font-size: 18px;
          color: var(--text);
          margin-bottom: 44px;
        }
        .v214-root .v214-cta-btn {
          padding: 22px 46px;
          font-size: 14px;
        }

        /* ─── PROMO BLOCKS (Content, Creators) ─── */
        .v214-root .v214-promo-block {
          position: relative;
          padding: 44px 40px;
          margin: 56px 0;
          background: linear-gradient(135deg, rgba(10, 20, 39, 0.75) 0%, rgba(15, 29, 56, 0.5) 100%);
          border: 1px solid var(--line);
          backdrop-filter: blur(10px);
          overflow: hidden;
        }
        .v214-root .v214-promo-block::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 2px;
          background: linear-gradient(90deg, transparent, var(--orange), var(--teal), transparent);
        }
        .v214-root .v214-promo-head {
          margin-bottom: 32px;
          padding-bottom: 24px;
          border-bottom: 1px solid var(--line);
        }
        .v214-root .v214-promo-title {
          font-family: 'Big Shoulders Display', sans-serif;
          font-size: 38px;
          font-weight: 800;
          line-height: 1;
          color: var(--cream);
          margin: 12px 0 10px;
          letter-spacing: -0.01em;
        }
        .v214-root .v214-promo-sub {
          font-size: 14px;
          line-height: 1.65;
          color: var(--text);
          max-width: 620px;
        }

        .v214-root .v214-scroller {
          display: flex;
          gap: 18px;
          overflow-x: auto;
          padding: 4px 4px 20px;
          scrollbar-width: thin;
          scrollbar-color: var(--orange) rgba(4, 8, 18, 0.6);
        }
        .v214-root .v214-scroller::-webkit-scrollbar { height: 6px; }
        .v214-root .v214-scroller::-webkit-scrollbar-thumb { background: var(--orange); }
        .v214-root .v214-scroller::-webkit-scrollbar-track { background: rgba(4, 8, 18, 0.6); }

        /* Content card */
        .v214-root .v214-content-card {
          position: relative;
          flex-shrink: 0;
          width: 290px;
          padding: 24px 22px;
          background: rgba(4, 8, 18, 0.7);
          border: 1px solid var(--line);
          cursor: pointer;
          transition: all 0.3s;
        }
        .v214-root .v214-content-card:hover {
          border-color: var(--orange);
          box-shadow: 0 0 30px var(--orange-glow);
        }
        .v214-root .v214-content-top {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 10px;
        }
        .v214-root .v214-content-kind {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-family: 'Space Mono', monospace;
          font-size: 10px;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: var(--teal);
          padding: 4px 8px;
          border: 1px solid rgba(45, 212, 191, 0.3);
        }
        .v214-root .v214-content-gps {
          font-family: 'Space Mono', monospace;
          font-size: 10px;
          color: var(--orange);
          letter-spacing: 0.15em;
        }
        .v214-root .v214-content-contour {
          height: 12px;
          margin: 12px 0 16px;
          background-image:
            linear-gradient(90deg, transparent, var(--orange-glow), transparent),
            linear-gradient(90deg, transparent 20%, var(--teal-glow) 50%, transparent 80%);
          background-size: 100% 1px, 100% 1px;
          background-repeat: no-repeat;
          background-position: 0 4px, 0 10px;
        }
        .v214-root .v214-content-title {
          font-family: 'Big Shoulders Display', sans-serif;
          font-size: 22px;
          font-weight: 700;
          line-height: 1.1;
          color: var(--cream);
          margin: 0 0 14px;
          letter-spacing: -0.01em;
          min-height: 72px;
        }
        .v214-root .v214-content-meta {
          display: flex;
          align-items: center;
          gap: 8px;
          font-family: 'Space Mono', monospace;
          font-size: 10px;
          color: var(--text-dim);
          letter-spacing: 0.06em;
        }
        .v214-root .v214-content-dot {
          width: 4px;
          height: 4px;
          border-radius: 50%;
          background: var(--orange);
          box-shadow: 0 0 8px var(--orange-glow);
        }

        /* Creator card */
        .v214-root .v214-creator-card {
          position: relative;
          flex-shrink: 0;
          width: 270px;
          padding: 28px 24px;
          background: rgba(4, 8, 18, 0.7);
          border: 1px solid var(--line);
          cursor: pointer;
          transition: all 0.3s;
        }
        .v214-root .v214-creator-card:hover {
          border-color: var(--teal);
          box-shadow: 0 0 30px var(--teal-glow);
        }
        .v214-root .v214-creator-head {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 18px;
        }
        .v214-root .v214-creator-avatar {
          width: 52px;
          height: 52px;
          background: linear-gradient(135deg, var(--orange) 0%, var(--teal) 100%);
          color: var(--midnight);
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 0 24px var(--orange-glow);
        }
        .v214-root .v214-creator-pin {
          color: var(--orange);
          padding: 6px;
          border: 1px solid var(--line);
        }
        .v214-root .v214-creator-kind {
          font-family: 'Space Mono', monospace;
          font-size: 10px;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: var(--teal);
          margin-bottom: 8px;
        }
        .v214-root .v214-creator-name {
          font-family: 'Big Shoulders Display', sans-serif;
          font-size: 26px;
          font-weight: 800;
          line-height: 1;
          color: var(--cream);
          margin: 0 0 4px;
          letter-spacing: -0.01em;
        }
        .v214-root .v214-creator-handle {
          font-family: 'Space Mono', monospace;
          font-size: 11px;
          color: var(--orange);
          margin-bottom: 14px;
        }
        .v214-root .v214-creator-bio {
          font-size: 12px;
          line-height: 1.55;
          color: var(--text);
          margin-bottom: 16px;
          min-height: 36px;
        }
        .v214-root .v214-creator-footer {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
          padding-top: 14px;
          border-top: 1px solid var(--line);
          font-family: 'Space Mono', monospace;
          font-size: 10px;
          letter-spacing: 0.15em;
          color: var(--text-dim);
        }
        .v214-root .v214-creator-footer strong {
          font-family: 'Big Shoulders Display', sans-serif;
          font-size: 22px;
          color: var(--teal);
          letter-spacing: 0;
        }

        /* ─── TOOLS SHOWCASE ─── */
        .v214-root .v214-tools-block {
          position: relative;
          padding: 56px 44px;
          margin: 56px 0 32px;
          background: rgba(10, 20, 39, 0.75);
          border: 1px solid var(--line);
          backdrop-filter: blur(12px);
          overflow: hidden;
        }
        .v214-root .v214-tools-block::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 2px;
          background: linear-gradient(90deg, transparent, var(--orange), var(--teal), var(--orange), transparent);
        }
        .v214-root .v214-tools-gridline {
          position: absolute;
          inset: 0;
          background-image:
            linear-gradient(var(--line) 1px, transparent 1px),
            linear-gradient(90deg, var(--line) 1px, transparent 1px);
          background-size: 40px 40px;
          opacity: 0.4;
          pointer-events: none;
        }
        .v214-root .v214-tools-head {
          position: relative;
          text-align: center;
          max-width: 720px;
          margin: 0 auto 48px;
          padding-bottom: 32px;
          border-bottom: 1px solid var(--line);
        }
        .v214-root .v214-tools-head .v214-elev-coord {
          margin: 0 auto 12px;
        }
        .v214-root .v214-tools-grid-inner {
          position: relative;
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 0;
        }
        .v214-root .v214-tool-cell {
          position: relative;
          padding: 28px 22px 26px;
          border: 1px solid var(--line);
          margin: -0.5px;
          background: rgba(4, 8, 18, 0.6);
          transition: all 0.3s;
        }
        .v214-root .v214-tool-cell:hover {
          background: rgba(255, 138, 76, 0.06);
          border-color: var(--orange);
          z-index: 2;
        }
        .v214-root .v214-tool-num {
          font-family: 'Space Mono', monospace;
          font-size: 10px;
          letter-spacing: 0.18em;
          color: var(--orange);
          margin-bottom: 16px;
        }
        .v214-root .v214-tool-icon {
          width: 42px;
          height: 42px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--teal);
          margin-bottom: 18px;
          border: 1px solid var(--line);
          background: rgba(4, 8, 18, 0.8);
        }
        .v214-root .v214-tool-cell:hover .v214-tool-icon {
          color: var(--orange);
          border-color: var(--orange);
        }
        .v214-root .v214-tool-name {
          font-family: 'Big Shoulders Display', sans-serif;
          font-size: 20px;
          font-weight: 800;
          color: var(--cream);
          margin: 0 0 8px;
          letter-spacing: -0.01em;
          line-height: 1.1;
        }
        .v214-root .v214-tool-pitch {
          font-size: 12px;
          line-height: 1.55;
          color: var(--text);
          margin-bottom: 14px;
          min-height: 38px;
        }
        .v214-root .v214-tool-aud {
          font-family: 'Space Mono', monospace;
          font-size: 9px;
          letter-spacing: 0.15em;
          padding: 3px 8px;
          display: inline-block;
          border: 1px solid currentColor;
        }
        .v214-root .v214-tool-aud-discover { color: var(--teal); }
        .v214-root .v214-tool-aud-build { color: var(--orange); }
        .v214-root .v214-tool-aud-both { color: var(--cream); }

        @media (max-width: 900px) {
          .v214-root .v214-hero-title { font-size: 64px; }
          .v214-root .v214-section-title { font-size: 44px; }
          .v214-root .v214-cta h2 { font-size: 56px; }
          .v214-root .v214-features-grid { grid-template-columns: 1fr 1fr; }
          .v214-root .v214-feature-cell:nth-child(2) { border-right: none; }
          .v214-root .v214-chips { grid-template-columns: 1fr 1fr; }
          .v214-root .v214-elev-body { grid-template-columns: 1fr; gap: 24px; }
          .v214-root .v214-hero-frame { padding: 44px 32px; }
          .v214-root .v214-hero-corner { display: none; }
          .v214-root .v214-nav-links a { display: none; }
          .v214-root .v214-nav-links .v214-nav-cta { display: flex; }
          .v214-root .v214-nav-coord { display: none; }
          .v214-root .v214-promo-title { font-size: 28px; }
          .v214-root .v214-tools-grid-inner { grid-template-columns: 1fr 1fr; }
          .v214-root .v214-promo-block,
          .v214-root .v214-tools-block { padding: 32px 24px; }
        }
      `}</style>
    </div>
  );
}
