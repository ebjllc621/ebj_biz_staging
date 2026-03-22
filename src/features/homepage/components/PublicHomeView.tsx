/**
 * PublicHomeView - Marketing Homepage for Public/Unauthenticated Users
 *
 * @tier STANDARD
 * @generated DNA v11.0.1
 * @dna-version 11.0.1
 */
'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, Building2, Calendar, Gift, Users, CheckCircle, Star, LayoutGrid, Clock } from 'lucide-react';

import type { Route } from 'next';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import BizButton from '@/components/BizButton/BizButton';
import { LoginModal, RegisterModal, RegistrationSuccessModal } from '@features/auth/components';

import dynamic from 'next/dynamic';

import { SearchBar } from './SearchBar';
import { ContentSlider } from './ContentSlider';
import { CategoryIcon } from './CategoryIcon';
import { ListingCard } from './ListingCard';
import { OfferCard } from './OfferCard';
import { EventCard } from './EventCard';
import { TopRecommendersScroller } from './TopRecommendersScroller';
import { PublicHomeData } from '../types';

const FlashOffersSection = dynamic(
  () => import('@/features/offers/components/FlashOffersSection').then(m => ({ default: m.FlashOffersSection })),
  { ssr: false, loading: () => null }
);

const WhosHiringSection = dynamic(
  () => import('@features/jobs/components/WhosHiringSection').then(m => ({ default: m.WhosHiringSection })),
  { ssr: false, loading: () => null }
);

interface PublicHomeViewProps {
  /** Initial data from server (for hydration) */
  initialData?: PublicHomeData | null;
}

/**
 * Loading skeleton for content sections
 */
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

/**
 * PublicHomeView component
 * Displays marketing homepage content for visitors
 */
export function PublicHomeView({ initialData }: PublicHomeViewProps) {
  const [data, setData] = useState<PublicHomeData | null>(initialData ?? null);
  const [isLoading, setIsLoading] = useState(!initialData);
  const [error, setError] = useState<string | null>(null);

  // Auth modal state management (same pattern as AuthButtons)
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState('');

  // Modal handlers
  const handleOpenLogin = useCallback(() => setShowLoginModal(true), []);
  const handleOpenRegister = useCallback(() => setShowRegisterModal(true), []);
  const handleCloseLogin = useCallback(() => setShowLoginModal(false), []);
  const handleCloseRegister = useCallback(() => setShowRegisterModal(false), []);
  const handleCloseSuccess = useCallback(() => {
    setShowSuccessModal(false);
    setRegisteredEmail('');
  }, []);

  const handleSwitchToRegister = useCallback(() => {
    setShowLoginModal(false);
    setShowRegisterModal(true);
  }, []);

  const handleSwitchToLogin = useCallback(() => {
    setShowRegisterModal(false);
    setShowLoginModal(true);
  }, []);

  const handleRegistrationSuccess = useCallback((email: string) => {
    setShowRegisterModal(false);
    setRegisteredEmail(email);
    setShowSuccessModal(true);
  }, []);

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch('/api/homepage/public', {
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to load homepage data');
      }

      const result = await response.json();
      setData(result.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!initialData) {
      fetchData();
    }
  }, [initialData, fetchData]);

  // Feature list for benefits section
  const features = [
    {
      icon: Building2,
      title: 'Business Directory',
      description: 'Discover local businesses and services in your area',
      color: 'bg-blue-500'
    },
    {
      icon: Calendar,
      title: 'Events & Networking',
      description: 'Find professional events and networking opportunities',
      color: 'bg-green-500'
    },
    {
      icon: Gift,
      title: 'Special Offers',
      description: 'Access exclusive deals and promotional offers',
      color: 'bg-purple-500'
    },
    {
      icon: Users,
      title: 'Professional Network',
      description: 'Connect with other business professionals',
      color: 'bg-orange-500'
    }
  ];

  const benefits = [
    'Connect with local businesses and professionals',
    'Access exclusive deals and special offers',
    'Stay updated with community events',
    'Build your professional network',
    'Discover new opportunities in your area',
    'Get verified reviews and ratings'
  ];

  return (
    <ErrorBoundary componentName="PublicHomeView">
      <div className="min-h-screen bg-gray-50">
        {/* Hero Section */}
        <div className="relative bg-gradient-to-br from-biz-navy via-blue-800 to-purple-800 text-white overflow-hidden">
          <div className="absolute inset-0 bg-black/20" />
          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-[15px]">
            <div className="text-center">
              {/* Headline */}
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6">
                Connect, Discover,{' '}
                <span className="text-biz-orange">Grow</span>
              </h1>

              {/* Subheadline */}
              <p className="text-lg md:text-xl text-gray-200 mb-6 max-w-3xl mx-auto">
                Your gateway to the local business community. Find services, connect with professionals, and discover opportunities that matter to you.
              </p>

              {/* Bizconekt Logo */}
              <div className="flex justify-center mb-8">
                <Image
                  src="/uploads/site/branding/namelogo-horizontal.png"
                  alt="Bizconekt"
                  width={405}
                  height={81}
                  className="h-auto w-auto"
                  priority
                />
              </div>

              {/* Search Bar */}
              <div className="mb-10">
                <SearchBar placeholder="What are you looking for?" />
              </div>

              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                <BizButton
                  variant="primary"
                  onClick={handleOpenRegister}
                  className="bg-biz-orange hover:bg-biz-orange/90 text-white px-8 py-3 text-base font-semibold flex items-center gap-2"
                >
                  Join Bizconekt Today
                  <ArrowRight className="w-5 h-5" />
                </BizButton>

                <Link href={'/listings' as Route}>
                  <BizButton
                    variant="secondary"
                    className="bg-[#002641] border-[#002641] text-white px-8 py-3 text-base font-semibold hover:bg-[#002641]/90"
                  >
                    Explore Listings
                  </BizButton>
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Flash Offers Section */}
        <FlashOffersSection maxOffers={6} />

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-12">
          {error && (
            <div className="bg-red-50 text-red-700 p-4 rounded-lg text-center">
              {error}
              <button onClick={fetchData} className="ml-2 underline">
                Try again
              </button>
            </div>
          )}

          {/* Categories Section */}
          {isLoading ? (
            <SectionSkeleton />
          ) : data?.categories && data.categories.length > 0 ? (
            <ContentSlider title="Browse by Category" icon={LayoutGrid} moreLink="/categories" moreLinkText="See All">
              {data.categories.map((category, index) => (
                <CategoryIcon key={category.id} category={category} index={index} />
              ))}
            </ContentSlider>
          ) : null}

          {/* Featured Listings Section */}
          {isLoading ? (
            <SectionSkeleton />
          ) : data?.featured_listings && data.featured_listings.length > 0 ? (
            <ContentSlider title="Featured Listings" icon={Star} moreLink="/listings?featured=true">
              {data.featured_listings.map((listing, index) => (
                <ListingCard
                  key={listing.id}
                  listing={listing}
                  index={index}
                  subCounts={{ jobCount: listing.job_count, eventCount: listing.event_count, offerCount: listing.offer_count }}
                />
              ))}
            </ContentSlider>
          ) : null}

          {/* Active Offers Section */}
          {isLoading ? (
            <SectionSkeleton />
          ) : data?.active_offers && data.active_offers.length > 0 ? (
            <ContentSlider title="Offers" icon={Gift} moreLink="/offers">
              {data.active_offers.map((offer, index) => (
                <OfferCard key={offer.id} offer={offer} index={index} />
              ))}
            </ContentSlider>
          ) : null}

          {/* Upcoming Events Section */}
          {isLoading ? (
            <SectionSkeleton />
          ) : data?.upcoming_events && data.upcoming_events.length > 0 ? (
            <ContentSlider title="Events" icon={Calendar} moreLink="/events">
              {data.upcoming_events.map((event, index) => (
                <EventCard key={event.id} event={event} index={index} />
              ))}
            </ContentSlider>
          ) : null}

          {/* Top Recommenders Section - Community's Most Helpful Sharers */}
          <TopRecommendersScroller limit={10} />

          {/* Latest Listings Section */}
          {isLoading ? (
            <SectionSkeleton />
          ) : data?.latest_listings && data.latest_listings.length > 0 ? (
            <ContentSlider title="Latest Listings" icon={Clock} moreLink="/listings">
              {data.latest_listings.map((listing, index) => (
                <ListingCard
                  key={listing.id}
                  listing={listing}
                  index={index}
                  subCounts={{ jobCount: listing.job_count, eventCount: listing.event_count, offerCount: listing.offer_count }}
                />
              ))}
            </ContentSlider>
          ) : null}
        </div>

        {/* Who's Hiring Section */}
        <WhosHiringSection maxJobs={4} />

        {/* Features Section */}
        <div className="py-16 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-biz-navy mb-4">
                Everything You Need to Grow Your Network
              </h2>
              <p className="text-lg text-gray-600 max-w-3xl mx-auto">
                Bizconekt provides all the tools and connections you need to succeed in today's business landscape.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              {features.map((feature, index) => (
                <div key={index} className="text-center group cursor-pointer">
                  <div className={`${feature.color} w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform`}>
                    <feature.icon className="h-8 w-8 text-white" />
                  </div>
                  <h3 className="text-lg font-semibold text-biz-navy mb-2">{feature.title}</h3>
                  <p className="text-gray-600">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Benefits Section */}
        <div className="py-16 bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="text-3xl font-bold text-biz-navy mb-6">
                  Why Choose Bizconekt?
                </h2>
                <p className="text-lg text-gray-600 mb-8">
                  Join thousands of professionals who trust Bizconekt to grow their business connections and discover new opportunities.
                </p>

                <div className="space-y-4">
                  {benefits.map((benefit, index) => (
                    <div key={index} className="flex items-start space-x-3">
                      <CheckCircle className="h-6 w-6 text-green-500 flex-shrink-0 mt-0.5" />
                      <span className="text-gray-700">{benefit}</span>
                    </div>
                  ))}
                </div>

                <div className="mt-8">
                  <BizButton
                    variant="primary"
                    onClick={handleOpenRegister}
                    className="bg-biz-navy hover:bg-biz-navy/90 text-white flex items-center gap-2"
                  >
                    Get Started Free
                    <ArrowRight className="w-5 h-5" />
                  </BizButton>
                </div>
              </div>

              {/* Stats Card */}
              <div className="bg-white rounded-2xl shadow-xl p-8">
                <div className="text-center">
                  <div className="grid grid-cols-2 gap-6 mb-8">
                    <div>
                      <div className="text-3xl font-bold text-biz-navy mb-2">
                        {data?.stats?.total_listings?.toLocaleString() ?? '0'}+
                      </div>
                      <div className="text-gray-600">Active Businesses</div>
                    </div>
                    <div>
                      <div className="text-3xl font-bold text-biz-orange mb-2">
                        {data?.stats?.total_users?.toLocaleString() ?? '0'}+
                      </div>
                      <div className="text-gray-600">Members</div>
                    </div>
                    <div>
                      <div className="text-3xl font-bold text-green-600 mb-2">
                        {data?.stats?.total_events ?? '0'}+
                      </div>
                      <div className="text-gray-600">Upcoming Events</div>
                    </div>
                    <div>
                      <div className="text-3xl font-bold text-purple-600 mb-2">
                        {data?.stats?.total_reviews ?? '0'}+
                      </div>
                      <div className="text-gray-600">Reviews</div>
                    </div>
                  </div>

                  <div className="flex items-center justify-center space-x-1 mb-4">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} className="h-5 w-5 text-yellow-400 fill-current" />
                    ))}
                    <span className="ml-2 text-gray-600 font-medium">4.9/5 Rating</span>
                  </div>

                  <p className="text-gray-600 italic">
                    "Bizconekt has transformed how we connect with our community. The platform is intuitive and the networking opportunities are endless."
                  </p>
                  <p className="text-sm text-gray-500 mt-2">- Local Business Owner</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Final CTA Section */}
        <div className="py-16 bg-gradient-to-r from-[#002641] to-[#ed6437]">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-3xl font-bold text-white mb-4">
              Ready to Join the Community?
            </h2>
            <p className="text-xl text-white/90 mb-8">
              Start connecting with local businesses and professionals today. It's free to join and takes less than 2 minutes.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <BizButton
                variant="primary"
                onClick={handleOpenRegister}
                className="bg-white text-[#002641] hover:bg-gray-100 px-8 py-3 text-lg font-semibold flex items-center gap-2"
              >
                Create Free Account
                <ArrowRight className="w-5 h-5" />
              </BizButton>

              <BizButton
                variant="secondary"
                onClick={handleOpenLogin}
                className="bg-white/20 border-2 border-white text-white px-8 py-3 text-lg font-semibold hover:bg-white/30"
              >
                Sign In
              </BizButton>
            </div>
          </div>
        </div>

        {/* Auth Modals */}
        <LoginModal
          isOpen={showLoginModal}
          onClose={handleCloseLogin}
          onSwitchToRegister={handleSwitchToRegister}
        />

        <RegisterModal
          isOpen={showRegisterModal}
          onClose={handleCloseRegister}
          onSwitchToLogin={handleSwitchToLogin}
          onRegistrationSuccess={handleRegistrationSuccess}
        />

        <RegistrationSuccessModal
          isOpen={showSuccessModal}
          onClose={handleCloseSuccess}
          email={registeredEmail}
        />
      </div>
    </ErrorBoundary>
  );
}

export default PublicHomeView;
