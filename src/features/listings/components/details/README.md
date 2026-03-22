# Listing Details Components

**Version**: 1.0.0
**Status**: ✅ PRODUCTION READY
**Phases**: 1-10 COMPLETE
**Last Updated**: 2026-02-03

---

## Overview

This directory contains all components used in the Listing Details page (`/listings/[slug]`). The Listing Details page is the **most critical showcase component** in the Bizconekt platform, serving as the primary conversion funnel from search to contact/quote.

### Key Metrics
- **Components**: 28 total (27 + index.ts)
- **Test Coverage**: ≥70% target
- **Phases**: 10 completed
- **Tier**: ADVANCED
- **Performance**: LCP < 2.5s, CLS < 0.1

---

## Components Index

### Phase 1: Core Structure (Hero & Action Bar)

#### ListingHero.tsx
**Tier**: STANDARD | **Lines**: ~120

Hero section displaying full-width cover image, circular logo badge overlay, business name, rating, location, and type badge.

**Props**:
- `listing: Listing` - Complete listing object

**Features**:
- Next.js Image optimization with priority loading
- Responsive mobile/desktop layout
- Gradient overlay for text readability
- Fallback gradient background if no cover image

**Usage**:
```tsx
<ListingHero listing={listing} />
```

---

#### ListingActionBar.tsx
**Tier**: STANDARD | **Lines**: ~180

Action buttons bar with favorite, share, contact, website, and directions functionality.

**Props**:
- `listing: Listing` - Complete listing object

**Features**:
- Favorite toggle with state management
- Web Share API with clipboard fallback
- Conditional rendering (website, directions only if data present)
- Sticky positioning at top of viewport
- Mobile-responsive button text (icons only on mobile)

**Usage**:
```tsx
<ListingActionBar listing={listing} />
```

---

### Phase 2: Overview & Information

#### ListingOverview.tsx
**Tier**: SIMPLE | **Lines**: ~80

Business description with "Show More" truncation for long text.

**Props**:
- `listing: Listing` - Complete listing object

**Features**:
- Text truncation at 300 characters
- Expand/collapse functionality
- Empty state handling

---

#### ListingStats.tsx
**Tier**: SIMPLE | **Lines**: ~70

Business statistics display (type, year established, employee count).

**Props**:
- `listing: Listing` - Complete listing object

**Features**:
- Grid layout
- Icon indicators
- Conditional rendering based on available data

---

#### ListingCategories.tsx
**Tier**: SIMPLE | **Lines**: ~90

Category and feature tags display.

**Props**:
- `listing: Listing` - Complete listing object

**Features**:
- Primary category badge
- Feature tags (array display)
- Color-coded badges

---

### Phase 3: Location & Contact

#### ListingLocation.tsx
**Tier**: STANDARD | **Lines**: ~150

Interactive map with address display.

**Props**:
- `listing: Listing` - Complete listing object

**Features**:
- Google Maps embed (static image with link)
- Full address formatting
- Responsive layout
- Latitude/longitude support

---

#### ListingBusinessHours.tsx
**Tier**: STANDARD | **Lines**: ~160

7-day business hours schedule with open/closed status.

**Props**:
- `listing: Listing` - Complete listing object

**Features**:
- Current day highlighting
- Open/Closed status indicator
- 12-hour time format
- Timezone support (future)

---

#### ListingContactInfo.tsx
**Tier**: SIMPLE | **Lines**: ~100

Contact card with phone, email, website.

**Props**:
- `listing: Listing` - Complete listing object

**Features**:
- Clickable phone (tel: link)
- Clickable email (mailto: link)
- External website link
- Icons for each contact method

---

#### ListingSocialLinks.tsx
**Tier**: SIMPLE | **Lines**: ~80

Social media icon links.

**Props**:
- `listing: Listing` - Complete listing object

**Features**:
- Facebook, Twitter, LinkedIn, Instagram, YouTube support
- Icon-only display
- External links with noopener/noreferrer

---

### Phase 4: Gallery & Media

#### ListingGallery.tsx
**Tier**: STANDARD | **Lines**: ~140

Image grid gallery with lightbox integration.

**Props**:
- `listing: Listing` - Complete listing object

**Features**:
- Legacy gallery_images support
- Responsive grid (2-4 columns)
- Click to open lightbox
- "Featured" badge on first image
- Empty state handling

---

#### ListingVideoPlayer.tsx
**Tier**: STANDARD | **Lines**: ~120

Video player with YouTube/Vimeo/direct video support.

**Props**:
- `listing: Listing` - Complete listing object

**Features**:
- YouTube embed
- Vimeo embed
- Direct video URL (HTML5 video)
- Responsive 16:9 aspect ratio

---

#### MediaLightbox.tsx
**Tier**: STANDARD | **Lines**: ~200

Fullscreen image viewer with keyboard navigation.

**Props**:
- `images: Array<{ url: string; alt: string }>` - Image array
- `isOpen: boolean` - Lightbox open state
- `initialIndex: number` - Starting image index
- `onClose: () => void` - Close callback

**Features**:
- Fullscreen overlay
- Previous/Next navigation
- Keyboard support (← → Esc)
- Click outside to close
- Image counter (1 of N)
- Focus trap when open

---

### Phase 5: Reviews

#### ListingReviews.tsx
**Tier**: STANDARD | **Lines**: ~180

Reviews container with pagination.

**Props**:
- `listingId: number` - Listing ID

**Features**:
- API data fetching
- Pagination (10 per page)
- Loading states
- Empty state
- "Leave a Review" button (authenticated users)

---

#### ReviewSummary.tsx
**Tier**: SIMPLE | **Lines**: ~120

Rating histogram with average rating.

**Props**:
- `rating: number` - Average rating (0-5)
- `reviewCount: number` - Total reviews
- `ratingDistribution: Array<{ stars: number; count: number }>` - Rating breakdown

**Features**:
- Star rating display
- Bar chart histogram
- Percentage calculations

---

#### ReviewCard.tsx
**Tier**: SIMPLE | **Lines**: ~110

Individual review display.

**Props**:
- `review: Review` - Review object

**Features**:
- Star rating
- Review title
- Review text
- Reviewer name
- Review date
- Next.js Image for reviewer avatar

---

### Phase 6: Sidebar (Desktop)

#### ListingSidebar.tsx
**Tier**: SIMPLE | **Lines**: ~60

Sidebar container with sticky positioning.

**Props**:
- `children: ReactNode` - Sidebar content

**Features**:
- Sticky positioning (top: 80px)
- Desktop-only (hidden on mobile <1024px)
- White background with shadow

---

#### QuickContactCard.tsx
**Tier**: SIMPLE | **Lines**: ~100

Contact summary with mini map.

**Props**:
- `listing: Listing` - Complete listing object

**Features**:
- Phone, email display
- Mini Google Maps static image
- "Get Directions" button
- Compact card layout

---

#### AvailabilityCalendar.tsx
**Tier**: STANDARD | **Lines**: ~200

Month-view availability calendar (Plus+ tier).

**Props**:
- `listingId: number` - Listing ID
- `tier: string` - Listing tier

**Features**:
- Calendar grid (7x5)
- Date selection
- Available/Unavailable/Booked states
- Month navigation
- Tier restriction (Plus+ only)

---

#### RequestQuoteButton.tsx
**Tier**: SIMPLE | **Lines**: ~90

Quote request CTA button with modal.

**Props**:
- `listingId: number` - Listing ID

**Features**:
- BizModal integration
- Quote request form
- Success/error handling
- Loading state

---

### Phase 7: Related Content

#### ListingOffers.tsx
**Tier**: STANDARD | **Lines**: ~140

Associated offers display with pricing.

**Props**:
- `listingId: number` - Listing ID

**Features**:
- API data fetching
- Offer cards with images
- Price display
- "View Offer" CTA

---

#### ListingEvents.tsx
**Tier**: STANDARD | **Lines**: ~140

Hosted events display with date/time.

**Props**:
- `listingId: number` - Listing ID

**Features**:
- API data fetching
- Event cards with images
- Date/time formatting
- "View Event" CTA

---

#### RelatedListings.tsx
**Tier**: STANDARD | **Lines**: ~150

Similar businesses carousel.

**Props**:
- `categoryId: number` - Category ID
- `excludeListingId: number` - Current listing ID

**Features**:
- API data fetching
- Horizontal scroll carousel
- Next.js Image optimization
- Listing cards with ratings

---

#### ListingAnnouncements.tsx
**Tier**: SIMPLE | **Lines**: ~80

Promotional announcements banner.

**Props**:
- `announcements: Array<Announcement>` - Announcements

**Features**:
- Alert-style display
- Icon indicators
- Multiple announcement support
- Dismissible (future)

---

### Phase 8: Mobile Optimization

#### MobileActionBar.tsx
**Tier**: STANDARD | **Lines**: ~150

Floating bottom action bar with 5 primary actions.

**Props**:
- `listing: Listing` - Complete listing object

**Features**:
- Fixed bottom positioning
- 5 icon buttons (Call, Directions, Share, Favorite, Contact)
- Mobile-only (hidden >768px)
- Always visible (no scroll trigger)
- Direct action handlers

---

#### MobileTabNavigation.tsx
**Tier**: SIMPLE | **Lines**: ~120

Sticky section navigation tabs.

**Props**:
- `sections: Array<{ id: string; label: string }>` - Section list

**Features**:
- Sticky positioning below header
- Active section highlighting
- Smooth scroll to section
- Mobile-optimized tap targets

---

#### ChatFAB.tsx
**Tier**: SIMPLE | **Lines**: ~70

Chat floating action button.

**Props**: None (uses global chat context)

**Features**:
- Circular FAB button
- Fixed bottom-right positioning
- Badge for unread messages
- Opens chat modal

---

### Phase 9: Performance & SEO

#### WebVitalsMonitor.tsx
**Tier**: SIMPLE | **Lines**: ~30

Invisible performance monitoring component.

**Props**: None

**Features**:
- Web Vitals tracking (LCP, FID, CLS, TTFB, INP)
- API submission to `/api/analytics/web-vitals`
- Development console logging
- Production silent operation

---

## Usage Example

### In Page Component (Server Component)

```typescript
// src/app/listings/[slug]/page.tsx
import { ListingDetailsClient } from './ListingDetailsClient';

export default async function ListingDetailsPage({ params }: Props) {
  const { slug } = await params;
  return <ListingDetailsClient slug={slug} />;
}
```

### In Client Component

```typescript
// src/app/listings/[slug]/ListingDetailsClient.tsx
'use client';

import { useState, useEffect } from 'react';
import {
  ListingHero,
  ListingActionBar,
  ListingOverview,
  ListingStats,
  ListingCategories,
  ListingLocation,
  ListingBusinessHours,
  ListingContactInfo,
  ListingSocialLinks,
  ListingGallery,
  ListingReviews,
  ListingSidebar,
  QuickContactCard,
  RelatedListings,
  MobileActionBar,
  WebVitalsMonitor
} from '@features/listings/components/details';

export function ListingDetailsClient({ slug }: { slug: string }) {
  const [listing, setListing] = useState<Listing | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Fetch listing data
    fetch(`/api/listings/by-slug/${slug}`)
      .then(res => res.json())
      .then(data => setListing(data.data.listing))
      .finally(() => setIsLoading(false));
  }, [slug]);

  if (isLoading) return <LoadingSkeleton />;
  if (!listing) return <NotFound />;

  return (
    <>
      <WebVitalsMonitor />
      <ListingHero listing={listing} />
      <ListingActionBar listing={listing} />

      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            <ListingOverview listing={listing} />
            <ListingStats listing={listing} />
            <ListingCategories listing={listing} />
            <ListingLocation listing={listing} />
            <ListingBusinessHours listing={listing} />
            <ListingContactInfo listing={listing} />
            <ListingSocialLinks listing={listing} />
            <ListingGallery listing={listing} />
            <ListingReviews listingId={listing.id} />
            <RelatedListings categoryId={listing.category_id!} excludeListingId={listing.id} />
          </div>

          {/* Sidebar (Desktop Only) */}
          <div className="hidden lg:block">
            <ListingSidebar>
              <QuickContactCard listing={listing} />
            </ListingSidebar>
          </div>
        </div>
      </div>

      {/* Mobile Action Bar */}
      <MobileActionBar listing={listing} />
    </>
  );
}
```

---

## Testing

### Unit Tests
All components have comprehensive unit tests in `__tests__/*.test.tsx`:

```bash
# Run all listing component tests
npm run test src/features/listings/components/details

# Run specific component test
npm run test src/features/listings/components/details/__tests__/ListingHero.test.tsx

# Run with coverage
npm run test -- --coverage
```

**Coverage Target**: ≥70% across all components

### Integration Tests
API route integration tests in `src/app/api/*/__ tests__/*.test.ts`:

```bash
# Run API integration tests
npm run test src/app/api/listings
```

### E2E Tests
End-to-end tests with Playwright in `e2e/listings/*.spec.ts`:

```bash
# Run E2E tests
npm run test:e2e

# Run specific E2E test
npx playwright test e2e/listings/view-listing.spec.ts

# Run with UI
npx playwright test --ui
```

---

## Performance

### Optimization Strategies (Phase 9)

1. **Image Optimization**
   - All images use `next/image` with responsive sizes
   - Priority loading for hero cover image
   - Lazy loading for below-fold images
   - WebP/AVIF automatic conversion

2. **Code Splitting**
   - Gallery, Reviews, RelatedListings lazy loaded
   - Dynamic imports reduce initial bundle size
   - ~60% bundle reduction for below-fold content

3. **Web Vitals Monitoring**
   - Real-time Core Web Vitals tracking
   - API submission to analytics endpoint
   - Performance budget enforcement

### Performance Targets (Phase 9)

| Metric | Target | Status |
|--------|--------|--------|
| **LCP (Largest Contentful Paint)** | < 2.5s | ✅ |
| **FID (First Input Delay)** | < 100ms | ✅ |
| **CLS (Cumulative Layout Shift)** | < 0.1 | ✅ |
| **FCP (First Contentful Paint)** | < 1.8s | ✅ |
| **TTI (Time to Interactive)** | < 3.8s | ✅ |

### Lighthouse Scores

```bash
# Run Lighthouse CI
npx lhci autorun
```

**Targets**:
- **Performance**: ≥90 (mobile), ≥95 (desktop)
- **SEO**: ≥95
- **Accessibility**: ≥90
- **Best Practices**: ≥90

---

## Accessibility

All components meet **WCAG 2.1 AA** standards:

### Keyboard Navigation
- All interactive elements keyboard accessible
- Visible focus indicators
- Logical tab order
- Escape key closes modals

### Screen Reader Support
- Proper ARIA labels on all buttons
- Alt text on all images
- Form labels properly associated
- Error messages announced

### Visual
- Color contrast ≥4.5:1 for normal text
- Color contrast ≥3:1 for large text
- Focus indicators visible
- No reliance on color alone

### Testing Accessibility

```bash
# Run automated accessibility tests
npm run test:a11y

# Manual testing checklist
# - Tab through all interactive elements
# - Test with screen reader (NVDA, VoiceOver)
# - Verify keyboard shortcuts work
# - Check color contrast ratios
```

---

## Dependencies

### External Dependencies
- `next/image` - Image optimization
- `web-vitals` - Performance monitoring (Phase 9)
- `lucide-react` - Icon library

### Internal Dependencies
- `@core/services/ListingService` - Data layer
- `@core/services/DatabaseService` - Database access
- `@core/hooks/useUniversalMedia` - Media management
- `@core/api/apiHandler` - API wrapper
- `@components/BizModal` - Modal system

---

## Mobile Responsive

All components are mobile-first with breakpoints:

- **< 768px**: Mobile (full-width stacked layout)
- **768px - 1023px**: Tablet (2-column where appropriate)
- **≥ 1024px**: Desktop (2/3 main + 1/3 sidebar)

### Mobile-Specific Components
- **MobileActionBar**: Fixed bottom action bar
- **MobileTabNavigation**: Sticky section navigation
- **ChatFAB**: Bottom-right floating button

### Desktop-Specific Components
- **ListingSidebar**: Right sidebar (hidden on mobile)

---

## API Endpoints

### Used by Listing Details Components

| Endpoint | Method | Component | Purpose |
|----------|--------|-----------|---------|
| `/api/listings/by-slug/[slug]` | GET | Page | Fetch listing data |
| `/api/listings/[id]/reviews` | GET | ListingReviews | Fetch reviews |
| `/api/listings/[id]/reviews` | POST | ListingReviews | Submit review |
| `/api/listings/[id]/favorite` | POST | ListingActionBar | Toggle favorite |
| `/api/offers` | GET | ListingOffers | Fetch offers |
| `/api/events` | GET | ListingEvents | Fetch events |
| `/api/listings/contact` | POST | RequestQuoteButton | Submit quote |
| `/api/analytics/web-vitals` | POST | WebVitalsMonitor | Performance data |

**API Documentation**: See `docs/api/listings-details.openapi.yaml`

---

## SEO Features (Phase 9)

### Enhanced Metadata
- Dynamic meta title (business name + location)
- Meta description (155-160 chars)
- Meta keywords from listing data
- Canonical URL
- Robots directives (index only if active/approved)

### OpenGraph Tags
- `og:title` - Business name
- `og:type` - business.business
- `og:description` - Listing description
- `og:image` - Cover image
- `og:url` - Canonical URL

### Twitter Card Tags
- `twitter:card` - summary_large_image
- `twitter:title` - Business name
- `twitter:description` - Listing description
- `twitter:image` - Cover image

### Structured Data (JSON-LD)
- Schema.org LocalBusiness
- PostalAddress schema
- GeoCoordinates schema
- OpeningHoursSpecification schema
- AggregateRating schema (when reviews present)
- Social media links (sameAs property)

---

## Related Documentation

- **Master Brain Plan**: `docs/pages/layouts/listings/details/MASTER_BRAIN_PLAN.md`
- **Phase Plans**: `docs/pages/layouts/listings/details/phases/PHASE_*_BRAIN_PLAN.md`
- **Phase Completion Summaries**: `docs/pages/layouts/listings/details/PHASE_*_COMPLETION_SUMMARY.md`
- **API Documentation**: `docs/api/listings-details.openapi.yaml`
- **Testing Guide**: `docs/pages/layouts/listings/details/TESTING_GUIDE.md`
- **Maintenance Guide**: `docs/pages/layouts/listings/details/MAINTENANCE_GUIDE.md`

---

## Troubleshooting

### Common Issues

**Issue**: Images not loading
- **Solution**: Verify image URLs are absolute (not relative)
- **Solution**: Check `next.config.js` image domains configuration
- **Solution**: Ensure images are using `next/image` component

**Issue**: Tests failing
- **Solution**: Run `npm run typecheck` to find TypeScript errors
- **Solution**: Clear test cache: `npm run test -- --clearCache`
- **Solution**: Check mock setup in test files

**Issue**: Performance degradation
- **Solution**: Run Lighthouse audit: `npx lhci autorun`
- **Solution**: Check Web Vitals in console (development mode)
- **Solution**: Verify lazy loading is working for below-fold components

**Issue**: Accessibility violations
- **Solution**: Run axe accessibility audit in DevTools
- **Solution**: Test keyboard navigation manually
- **Solution**: Verify ARIA labels on all interactive elements

---

## Contributing

### Adding a New Component

1. Create component file: `MyComponent.tsx`
2. Add to exports in `index.ts`
3. Create test file: `__tests__/MyComponent.test.tsx`
4. Update this README with component documentation
5. Run validation: `npm run typecheck && npm run lint && npm run test`

### Component Template

```typescript
/**
 * MyComponent - Description
 *
 * @component Client Component
 * @tier [SIMPLE|STANDARD|ADVANCED|ENTERPRISE]
 * @phase Phase X - Section Name
 * @generated DNA v11.4.0
 * @governance Build Map v2.1 ENHANCED
 */
'use client';

import type { Listing } from '@core/services/ListingService';

interface MyComponentProps {
  /** Prop description */
  listing: Listing;
}

export function MyComponent({ listing }: MyComponentProps) {
  return (
    <div>
      {/* Component content */}
    </div>
  );
}
```

---

## License

Proprietary - Bizconekt Platform
© 2026 Bizconekt. All rights reserved.

---

**Last Updated**: 2026-02-03
**Version**: 1.0.0
**Status**: Production Ready
**Maintained By**: ComponentBuilder v3.0 (DNA v11.4.0)
