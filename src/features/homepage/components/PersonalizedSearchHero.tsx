/**
 * PersonalizedSearchHero - Redesigned hero section for authenticated homepage
 *
 * @tier STANDARD
 * @generated DNA v11.4.0
 * @dna-version 11.4.0
 * @authority docs/pages/layouts/home/user/phases/PHASE_3_BRAIN_PLAN.md
 *
 * GOVERNANCE COMPLIANCE:
 * - Client component ('use client' directive)
 * - ErrorBoundary wrapper (STANDARD tier requirement)
 * - Path aliases (@/features/, @/components/)
 * - Lucide React icons only
 * - Type-safe routing with Route type
 *
 * Features:
 * - Time-based personalized greeting
 * - Search bar with "What can we help you find?" prompt
 * - View Dashboard button with notification badge
 * - View Profile button with notification badge
 * - Gradient background matching brand colors
 *
 * Integration Points:
 * - Uses SearchBar from existing homepage components
 * - Uses HomepageActionButton with NotificationBadge
 * - Notification counts from /api/dashboard/notifications/summary
 */

'use client';

import { LayoutDashboard, User } from 'lucide-react';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { SearchBar } from './SearchBar';
import { HomepageActionButton } from './HomepageActionButton';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface PersonalizedSearchHeroProps {
  /** User information */
  user: {
    id: string;
    name: string | null;
    email: string;
    username?: string;
  };
  /** Dashboard notification count */
  dashboardNotifications: number;
  /** Profile notification count */
  profileNotifications: number;
  /** Loading state for notifications */
  isLoadingNotifications?: boolean;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get time-based greeting
 * @returns "Good morning", "Good afternoon", or "Good evening"
 */
function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

// ============================================================================
// PERSONALIZEDSEARCHHERO CONTENT
// ============================================================================

function PersonalizedSearchHeroContent({
  user,
  dashboardNotifications,
  profileNotifications,
  isLoadingNotifications = false
}: PersonalizedSearchHeroProps) {
  const displayName = user.name ?? 'User';
  const firstName = displayName.split(' ')[0] ?? displayName;

  // Profile link - use username if available, otherwise /profile
  const profileHref = user.username ? `/profile/${user.username}` : '/profile';

  return (
    <div className="relative bg-gradient-to-br from-blue-900 via-blue-800 to-purple-800 text-white overflow-hidden">
      {/* Overlay for depth */}
      <div className="absolute inset-0 bg-black/10" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
        <div className="text-center">
          {/* Personalized Greeting */}
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
            {getGreeting()}, {firstName}!
          </h1>

          {/* Search Prompt */}
          <p className="text-lg md:text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
            What can we help you find today?
          </p>

          {/* Search Bar */}
          <div className="max-w-2xl mx-auto mb-10">
            <SearchBar placeholder="Search businesses, events, offers..." />
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            {/* View Dashboard Button */}
            <HomepageActionButton
              label="View Dashboard"
              href="/dashboard"
              variant="primary"
              icon={LayoutDashboard}
              notificationCount={isLoadingNotifications ? 0 : dashboardNotifications}
            />

            {/* View Profile Button */}
            <HomepageActionButton
              label="View Profile"
              href={profileHref}
              variant="secondary"
              icon={User}
              notificationCount={isLoadingNotifications ? 0 : profileNotifications}
            />
          </div>

          {/* Loading indicator for badges */}
          {isLoadingNotifications && (
            <p className="text-blue-200 text-sm mt-4 animate-pulse">
              Loading notifications...
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// PERSONALIZEDSEARCHHERO COMPONENT (WITH ERRORBOUNDARY)
// ============================================================================

/**
 * PersonalizedSearchHero - Wrapped with ErrorBoundary (STANDARD tier requirement)
 *
 * @example
 * ```tsx
 * <PersonalizedSearchHero
 *   user={{ id: '1', name: 'John Doe', email: 'john@example.com', username: 'johndoe' }}
 *   dashboardNotifications={5}
 *   profileNotifications={2}
 *   isLoadingNotifications={false}
 * />
 * ```
 */
export function PersonalizedSearchHero(props: PersonalizedSearchHeroProps) {
  return (
    <ErrorBoundary componentName="PersonalizedSearchHero">
      <PersonalizedSearchHeroContent {...props} />
    </ErrorBoundary>
  );
}

export default PersonalizedSearchHero;
