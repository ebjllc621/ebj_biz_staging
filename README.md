# Bizconekt

A comprehensive B2B platform for business networking, service discovery, listings management, job placement, content creation, and affiliate marketing.

**Build:** v5.0 | **Stack:** Next.js 14 (App Router), React 18, MariaDB 10.11, Tailwind CSS 3.4

---

## Table of Contents

- [Tech Stack](#tech-stack)
- [Features](#features)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [API Overview](#api-overview)
- [Database](#database)
- [Authentication & Security](#authentication--security)
- [Third-Party Integrations](#third-party-integrations)
- [Testing](#testing)
- [Deployment](#deployment)
- [Scripts Reference](#scripts-reference)

---

## Tech Stack

| Layer            | Technology                                      |
| ---------------- | ----------------------------------------------- |
| Framework        | Next.js 14 (App Router, Turbopack in dev)       |
| UI               | React 18, Tailwind CSS, Lucide icons            |
| Database         | MariaDB 10.11 (production), SQLite (dev)        |
| ORM / Query      | Raw SQL with connection pooling                 |
| Auth             | Session-based (httpOnly cookies), bcrypt, MFA   |
| Payments         | Stripe (subscriptions, invoices, webhooks)      |
| Media            | Cloudinary (CDN), Sharp (server-side processing)|
| Email            | Mailgun (primary), SendGrid, AWS SES            |
| Maps             | Mapbox GL, Google Maps (static)                 |
| Rich Text        | TipTap editor                                   |
| Validation       | Zod schemas                                     |
| Caching          | Redis                                           |
| Process Manager  | PM2                                             |
| Testing          | Vitest, Playwright, Testing Library             |
| Node.js          | >= 18.18                                        |

---

## Features

### 1. Listings & Service Discovery

- Create, edit, publish, and manage business listings
- Category-based organization and search
- Listing claim & verification system
- Templates, duplicate detection, featured listings
- Google Business import

### 2. Job Board

- Job posting, search, and applications
- Applicant tracking and job alerts
- Job referrals, insights, and analytics
- Job seeker profiles and templates

### 3. Events Management

- Event creation, publishing, and registration/ticketing
- Event types and tier-specific features
- Event reviews and analytics

### 4. Offers & Promotions

- Flash offers and location-based deals
- QR code generation for redemption
- Nearby offers discovery
- Offer reviews and verification

### 5. Content Platform

- Articles, guides, videos, podcasts, newsletters
- Creator profiles (podcasters, internet personalities, affiliate marketers)
- Content following, comments, and interaction tracking
- Newsletter subscription and distribution

### 6. Social Networking (BizWire)

- User profiles with follow/follower system
- Connection management with groups and templates
- Referral system and user discovery

### 7. Billing & Subscriptions

- Stripe-powered payment processing
- Tiered subscriptions (Basic, Advanced, Enterprise) with monthly/annual billing
- Payment methods, invoices, statements, and refund management
- Campaign banks for prepaid credits and discount codes

### 8. Reviews & Ratings

- User-submitted reviews with moderation
- External review aggregation (Google, Yelp, etc.)
- Post-visit review triggers and rating aggregation

### 9. Messaging & Notifications

- Direct messaging with conversation history
- In-app and email notifications with digest support
- Notification preferences and milestone alerts

### 10. Media Management

- Image upload and optimization via Cloudinary
- Server-side processing with Sharp
- Gallery/album management with entity relationships

### 11. Analytics & Performance

- Page view, funnel, and conversion tracking
- Traffic source analysis and web vitals monitoring
- Lighthouse CI performance reports
- Real-time analytics dashboard

### 12. Admin Dashboard

- User management and listing moderation
- Content approval workflows
- Analytics, reporting, and system health monitoring
- Error logs, activity auditing, and feature flag management
- Cron job management

### 13. SEO

- Dynamic sitemap generation
- Schema.org structured data
- OpenGraph previews for shared links

### 14. Affiliate Marketing

- Affiliate marketer profiles and campaign tracking
- Commission management and analytics

### 15. Quotes & Lead Capture

- Quote request and response management
- Lead capture and quote pool management

---

## Project Structure

```text
src/
├── app/                        # Next.js App Router
│   ├── api/                    # 737+ API route handlers
│   ├── (user)/                 # User layout group
│   ├── admin/                  # Admin dashboard pages
│   ├── auth/                   # Login, register, verify-email
│   ├── dashboard/              # User dashboard
│   ├── listings/               # Listings browse & detail
│   ├── jobs/                   # Job board
│   ├── events/                 # Events
│   ├── offers/                 # Offers & promotions
│   ├── content/                # Articles, videos, guides, podcasts
│   ├── profile/                # User profiles
│   ├── account/                # Account settings
│   ├── notifications/          # Notification center
│   └── messages/               # Messaging
│
├── components/                 # Reusable React components
│   ├── ui/                     # Base UI primitives
│   ├── common/                 # Shared components
│   ├── auth/                   # Auth modals & forms
│   ├── admin/                  # Admin-specific components
│   ├── listings/               # Listing cards, forms, gallery
│   ├── billing/                # Subscription & payment UI
│   ├── reviews/                # Review display & submission
│   ├── editors/                # TipTap rich text editor
│   └── analytics/              # Charts & metrics
│
├── core/                       # Core business logic
│   ├── services/               # 77 service classes (~2MB)
│   ├── api/                    # API handler utilities
│   ├── middleware/              # CSRF & rate limiting
│   ├── hooks/                  # React custom hooks
│   ├── utils/                  # Utility functions
│   ├── types/                  # TypeScript type definitions
│   ├── errors/                 # Custom error classes
│   ├── constants/              # App constants
│   ├── context/                # React Context providers
│   ├── config/                 # Configuration
│   ├── registry/               # Service registry (DI)
│   └── cache/                  # Caching layer
│
├── features/                   # Feature modules (27 domains)
│   ├── auth/                   # Authentication
│   ├── session/                # Session management
│   ├── listings/               # Listings
│   ├── jobs/                   # Job board
│   ├── events/                 # Events
│   ├── offers/                 # Offers
│   ├── content/                # Content management
│   ├── billing/                # Billing
│   ├── subscription/           # Subscriptions
│   ├── notifications/          # Notifications
│   ├── messaging/              # Direct messaging
│   ├── media/                  # Media management
│   ├── mail/                   # Email system
│   ├── rbac/                   # Role-based access control
│   ├── admin/                  # Admin features
│   ├── connections/            # User connections
│   ├── reviews/                # Reviews & ratings
│   ├── memberships/            # Membership tiers
│   ├── bizwire/                # Social networking
│   ├── sharing/                # Content sharing
│   ├── quotes/                 # Quote management
│   ├── dashboard/              # Dashboard features
│   ├── contacts/               # Contact management
│   └── homepage/               # Homepage
│
├── lib/                        # Shared libraries
│   ├── db/                     # Database client
│   ├── security/               # Security helpers
│   ├── validation/             # Input validation
│   ├── crypto/                 # Cryptographic utilities
│   └── rate/                   # Rate limiting
│
├── hooks/                      # Global React hooks
├── styles/                     # Global CSS
└── types/                      # Global TypeScript types

public/                         # Static assets
migrations/                     # SQL migration scripts
tools/                          # Dev tools & DNA system
scripts/                        # Build & deployment scripts
```

---

## Getting Started

### Prerequisites

- Node.js >= 18.18
- MariaDB 10.11 (or SQLite for local dev)
- Redis (for caching and rate limiting)

### Installation

```bash
npm install
```

### Environment

Copy `.env.example` (or reference `.env.production`) and configure:

- Database connection (MariaDB host, port, credentials)
- Session & auth secrets
- Cloudinary credentials
- Mailgun API key & domain
- Stripe secret key & webhook secret
- Mapbox / Google Maps API keys

### Development

```bash
npm run dev          # Start dev server with Turbopack (port 3000)
```

### Build

```bash
npm run build        # Production build (standalone output)
```

---

## API Overview

The platform exposes **737+ API endpoints** organized by domain:

| Domain          | Base Path               | Key Operations                                      |
| --------------- | ----------------------- | --------------------------------------------------- |
| Auth            | `/api/auth/`            | Login, register, logout, verify, MFA, CSRF          |
| Listings        | `/api/listings/`        | CRUD, search, claim, templates, Google import        |
| Jobs            | `/api/jobs/`            | CRUD, search, applications, alerts, referrals       |
| Events          | `/api/events/`          | CRUD, registration, types, tier features, reviews    |
| Offers          | `/api/offers/`          | CRUD, flash, nearby, QR codes, verification         |
| Content         | `/api/content/`         | Articles, videos, podcasts, guides, newsletters     |
| Billing         | `/api/billing/`         | Subscribe, upgrade, cancel, payments, refunds       |
| Users           | `/api/users/`           | Profiles, settings, follows, connections            |
| Messages        | `/api/messages/`        | Conversations, send/receive messages                |
| Notifications   | `/api/notifications/`   | In-app, email, digests, preferences                 |
| Media           | `/api/media/`           | Upload, Cloudinary integration, galleries           |
| Reviews         | `/api/reviews/`         | Submit, moderate, external aggregation              |
| Analytics       | `/api/analytics/`       | Page views, funnels, traffic, web vitals            |
| Admin           | `/api/admin/`           | 50+ endpoints for moderation, analytics, health     |
| Webhooks        | `/api/webhooks/stripe`  | Stripe event handling                               |
| SEO             | `/api/seo/`             | Sitemap, schema.org generation                      |
| Health          | `/api/health`           | Health and readiness checks                         |

---

## Database

- **Engine:** MariaDB 10.11 (production), SQLite (development)
- **Schema:** 203 tables defined in `/migrations/000_full_schema.sql`
- **Connection pooling:** Up to 150 connections, 200 queue limit

### Key Table Groups

| Group                | Tables | Examples                                                       |
| -------------------- | ------ | -------------------------------------------------------------- |
| Users & Auth         | 10+    | `users`, `user_settings`, `user_roles`, `email_verifications`  |
| Listings & Content   | 30+    | `listings`, `categories`, `content_articles`, `content_videos` |
| Billing              | 8+     | `billing_transactions`, `campaign_banks`, `discount_codes`     |
| Social & Connections | 15+    | `connection_groups`, `users_follows`, `users_connections`      |
| Analytics            | 15+    | `analytics_page_views`, `analytics_conversions`                |
| Admin & Governance   | 10+    | `admin_activity`, `error_logs`, `feature_flags`, `alerts`      |

---

## Authentication & Security

- **Session-based auth** with httpOnly cookies and secure token generation
- **Password hashing** with bcrypt + pepper
- **MFA support** via TOTP with recovery codes
- **CSRF protection** on all state-changing endpoints (`withCsrf` wrapper)
- **Rate limiting** (Redis-backed) on auth and sensitive endpoints
- **RBAC** with admin, moderator, and user roles
- **PII protection** - IP addresses hashed before logging
- **Input sanitization** with DOMPurify (XSS prevention)
- **Zod validation** on all API inputs

---

## Third-Party Integrations

| Service       | Purpose                                  |
| ------------- | ---------------------------------------- |
| Stripe        | Payments, subscriptions, invoices        |
| Cloudinary    | Image storage, CDN, transformations      |
| Mailgun       | Transactional & marketing emails         |
| SendGrid      | Alternative email provider               |
| AWS SES       | Email sending (optional)                 |
| Mapbox        | Interactive maps & location services     |
| Google Maps   | Static maps & geocoding                  |
| Redis         | Caching & rate limiting                  |
| Lighthouse CI | Performance monitoring & web vitals      |

---

## Testing

```bash
npm run test                        # Vitest unit/integration tests
npm run test:integration            # Jest integration suite
npm run test:integration:vitest     # Vitest integration suite
npm run test:auth                   # Auth-specific tests
npm run test:billing                # Billing service tests
```

- **Unit & Integration:** Vitest with Testing Library
- **E2E:** Playwright with axe-core accessibility testing
- **Performance:** Lighthouse CI for public, dashboard, and admin pages

---

## Deployment

### Production (PM2)

```bash
npm run build            # Build standalone output
npm run pm2:start        # Start with PM2
npm run pm2:stop         # Stop
npm run pm2:restart      # Restart
npm run pm2:logs         # View logs
```

**PM2 Configuration** (`ecosystem.config.js`):

- App name: `bizconekt`
- Port: 3000
- Memory limit: 1GB
- Max restarts: 10, restart delay: 5s
- Standalone Next.js output (self-contained)

---

## Scripts Reference

| Script                    | Description                              |
| ------------------------- | ---------------------------------------- |
| `npm run dev`             | Dev server with Turbopack                |
| `npm run build`           | Production build                         |
| `npm start`               | Start production server                  |
| `npm run lint`            | ESLint                                   |
| `npm run typecheck`       | TypeScript type checking                 |
| `npm run test`            | Run Vitest tests                         |
| `npm run analyze`         | Bundle analyzer                          |
| `npm run governance:all`  | All governance checks                    |
| `npm run validate:tiers`  | Tier validation                          |
| `npm run health:check`    | Health checks                            |
| `npm run docs:generate`   | TypeDoc generation                       |
| `npm run audit:repo`      | Repository audit                         |
| `npm run audit:db`        | Database inventory                       |
| `npm run lighthouse:all`  | All Lighthouse performance tests         |

---

## Architecture Highlights

- **Service-based architecture** with 77 service classes and a singleton registry (DI)
- **27 feature modules** organized by domain with co-located components, hooks, and types
- **600+ pages** served via Next.js App Router
- **Enterprise patterns:** RBAC, CSRF protection, rate limiting, comprehensive audit logging, health monitoring, feature flags
- **Accessibility:** WCAG 2.1 AA compliant color palette, axe-core E2E testing
