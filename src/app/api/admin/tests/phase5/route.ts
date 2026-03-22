/**
 * Admin TD Phase 5 Test Inventory API
 *
 * GET /api/admin/tests/phase5
 * Returns inventory of all TD Phase 5 test files.
 *
 * @authority .cursor/rules/admin-api-route-standard.mdc
 * @governance apiHandler wrapper, admin auth required
 * @phase Technical Debt Remediation - Phase 5
 */

import { apiHandler } from '@core/api/apiHandler';
import { createSuccessResponse } from '@core/api/responseHelpers';

export const dynamic = 'force-dynamic';

interface TestFile {
  id: string;
  name: string;
  path: string;
  testCount: number;
}

interface TestCategory {
  id: string;
  name: string;
  description: string;
  files: TestFile[];
}

/**
 * TD Phase 5 test file inventory
 * Source: docs/components/connections/userrecommendations/phases/TD_PHASE_5_BRAIN_PLAN.md
 */
const TEST_INVENTORY: TestCategory[] = [
  {
    id: 'p1-services',
    name: 'P1: Service Tests',
    description: 'RecommendationService business logic tests',
    files: [
      {
        id: 'service-skills-goals',
        name: 'RecommendationService.skills-goals.test.ts',
        path: 'src/features/connections/services/__tests__/RecommendationService.skills-goals.test.ts',
        testCount: 36
      },
      {
        id: 'service-interests-hobbies',
        name: 'RecommendationService.interests-hobbies.test.ts',
        path: 'src/features/connections/services/__tests__/RecommendationService.interests-hobbies.test.ts',
        testCount: 36
      },
      {
        id: 'service-education-hometown',
        name: 'RecommendationService.education-hometown-groups.test.ts',
        path: 'src/features/connections/services/__tests__/RecommendationService.education-hometown-groups.test.ts',
        testCount: 36
      }
    ]
  },
  {
    id: 'p2-hooks',
    name: 'P2: Hook Tests',
    description: 'Custom React hooks for sharing functionality',
    files: [
      {
        id: 'hook-inbox',
        name: 'useSharingInbox.test.ts',
        path: 'src/features/sharing/hooks/__tests__/useSharingInbox.test.ts',
        testCount: 35
      },
      {
        id: 'hook-offline',
        name: 'useOfflineRecommendationQueue.test.ts',
        path: 'src/features/sharing/hooks/__tests__/useOfflineRecommendationQueue.test.ts',
        testCount: 24
      }
    ]
  },
  {
    id: 'p3-components',
    name: 'P3: Component Tests',
    description: 'UI component rendering and interaction tests',
    files: [
      { id: 'comp-share-button', name: 'ShareEntityButton.test.tsx', path: 'src/features/sharing/components/__tests__/ShareEntityButton.test.tsx', testCount: 15 },
      { id: 'comp-entity-preview', name: 'EntityPreviewCard.test.tsx', path: 'src/features/sharing/components/__tests__/EntityPreviewCard.test.tsx', testCount: 15 },
      { id: 'comp-helpful-rating', name: 'HelpfulRatingButtons.test.tsx', path: 'src/features/sharing/components/__tests__/HelpfulRatingButtons.test.tsx', testCount: 15 },
      { id: 'comp-inbox-filters', name: 'RecommendationInboxFilters.test.tsx', path: 'src/features/sharing/components/__tests__/RecommendationInboxFilters.test.tsx', testCount: 15 },
      { id: 'comp-inbox-pagination', name: 'RecommendationInboxPagination.test.tsx', path: 'src/features/sharing/components/__tests__/RecommendationInboxPagination.test.tsx', testCount: 15 },
      { id: 'comp-thank-you', name: 'ThankYouModal.test.tsx', path: 'src/features/sharing/components/__tests__/ThankYouModal.test.tsx', testCount: 15 },
      { id: 'comp-sender-impact', name: 'SenderImpactCard.test.tsx', path: 'src/features/sharing/components/__tests__/SenderImpactCard.test.tsx', testCount: 15 },
      { id: 'comp-gamification', name: 'UnifiedGamificationCard.test.tsx', path: 'src/features/sharing/components/__tests__/UnifiedGamificationCard.test.tsx', testCount: 15 },
      { id: 'comp-content-share', name: 'ContentShareButton.test.tsx', path: 'src/features/sharing/components/__tests__/ContentShareButton.test.tsx', testCount: 15 },
      { id: 'comp-mobile-filters', name: 'MobileInboxFilters.test.tsx', path: 'src/features/sharing/components/__tests__/MobileInboxFilters.test.tsx', testCount: 15 },
      { id: 'comp-inbox-list', name: 'RecommendationInboxList.test.tsx', path: 'src/features/sharing/components/__tests__/RecommendationInboxList.test.tsx', testCount: 15 },
      { id: 'comp-share-modal', name: 'ShareEntityModal.test.tsx', path: 'src/features/sharing/components/__tests__/ShareEntityModal.test.tsx', testCount: 15 },
      { id: 'comp-inbox-item', name: 'RecommendationInboxItem.test.tsx', path: 'src/features/sharing/components/__tests__/RecommendationInboxItem.test.tsx', testCount: 15 },
      { id: 'comp-recipient-selector', name: 'RecommendationRecipientSelector.test.tsx', path: 'src/features/sharing/components/__tests__/RecommendationRecipientSelector.test.tsx', testCount: 15 },
      { id: 'comp-creator-impact', name: 'ContentCreatorImpactCard.test.tsx', path: 'src/features/sharing/components/__tests__/ContentCreatorImpactCard.test.tsx', testCount: 20 },
      { id: 'comp-mobile-share', name: 'MobileShareSheet.test.tsx', path: 'src/features/sharing/components/__tests__/MobileShareSheet.test.tsx', testCount: 15 },
      { id: 'comp-swipeable', name: 'SwipeableRecommendationCard.test.tsx', path: 'src/features/sharing/components/__tests__/SwipeableRecommendationCard.test.tsx', testCount: 15 },
      { id: 'comp-mobile-inbox', name: 'MobileRecommendationInbox.test.tsx', path: 'src/features/sharing/components/__tests__/MobileRecommendationInbox.test.tsx', testCount: 15 },
      { id: 'comp-mobile-recipient', name: 'MobileRecipientSelector.test.tsx', path: 'src/features/sharing/components/__tests__/MobileRecipientSelector.test.tsx', testCount: 15 }
    ]
  },
  {
    id: 'p4-api',
    name: 'P4: API Integration Tests',
    description: 'API route behavior simulation tests',
    files: [
      { id: 'api-recommendations', name: 'recommendations.test.ts', path: 'src/app/api/sharing/__tests__/recommendations.test.ts', testCount: 16 },
      { id: 'api-entity-preview', name: 'entity-preview.test.ts', path: 'src/app/api/sharing/__tests__/entity-preview.test.ts', testCount: 8 },
      { id: 'api-helpful', name: 'helpful.test.ts', path: 'src/app/api/sharing/__tests__/helpful.test.ts', testCount: 6 },
      { id: 'api-thank', name: 'thank.test.ts', path: 'src/app/api/sharing/__tests__/thank.test.ts', testCount: 6 },
      { id: 'api-counts', name: 'counts.test.ts', path: 'src/app/api/sharing/__tests__/counts.test.ts', testCount: 4 },
      { id: 'api-impact', name: 'impact.test.ts', path: 'src/app/api/sharing/__tests__/impact.test.ts', testCount: 5 }
    ]
  },
  {
    id: 'p5-e2e',
    name: 'P5: E2E Tests',
    description: 'End-to-end user journey tests with Playwright',
    files: [
      { id: 'e2e-recommendation-flow', name: 'recommendation-flow.spec.ts', path: 'e2e/sharing/recommendation-flow.spec.ts', testCount: 13 },
      { id: 'e2e-claim-listing', name: 'claim-listing.spec.ts', path: 'e2e/listings/claim-listing.spec.ts', testCount: 6 }
    ]
  }
];

export const GET = apiHandler(
  async () => {
    // Calculate summary statistics
    const summary = {
      totalCategories: TEST_INVENTORY.length,
      totalFiles: TEST_INVENTORY.reduce((sum, cat) => sum + cat.files.length, 0),
      totalTests: TEST_INVENTORY.reduce(
        (sum, cat) => sum + cat.files.reduce((s, f) => s + f.testCount, 0),
        0
      ),
      breakdown: {
        services: TEST_INVENTORY.find(c => c.id === 'p1-services')?.files.reduce((s, f) => s + f.testCount, 0) || 0,
        hooks: TEST_INVENTORY.find(c => c.id === 'p2-hooks')?.files.reduce((s, f) => s + f.testCount, 0) || 0,
        components: TEST_INVENTORY.find(c => c.id === 'p3-components')?.files.reduce((s, f) => s + f.testCount, 0) || 0,
        api: TEST_INVENTORY.find(c => c.id === 'p4-api')?.files.reduce((s, f) => s + f.testCount, 0) || 0,
        e2e: TEST_INVENTORY.find(c => c.id === 'p5-e2e')?.files.reduce((s, f) => s + f.testCount, 0) || 0
      }
    };

    return createSuccessResponse({
      categories: TEST_INVENTORY,
      summary,
      phase: 'Technical Debt Remediation - Phase 5',
      documentation: 'docs/components/connections/userrecommendations/phases/TD_PHASE_5_BRAIN_PLAN.md'
    });
  },
  {
    requireAuth: true,
  }
);
