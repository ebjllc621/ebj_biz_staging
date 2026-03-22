/**
 * ContentRecommendButton - Pre-configured RecommendButton for content types
 *
 * Convenience wrapper for recommending content entities (article, newsletter, podcast, video).
 * Pre-configures RecommendButton with content-specific defaults.
 *
 * @tier SIMPLE
 * @phase Phase 12 - Recommend Button Deployment
 * @generated ComponentBuilder
 * @dna-version 11.4.0
 *
 * @example
 * ```tsx
 * import { ContentRecommendButton } from '@features/sharing/components';
 *
 * function ArticleFooter({ article }) {
 *   return (
 *     <ContentRecommendButton
 *       contentType="article"
 *       contentId={article.slug}
 *       variant="primary"
 *     />
 *   );
 * }
 *
 * // Newsletter recommendation
 * <ContentRecommendButton
 *   contentType="newsletter"
 *   contentId={newsletter.id}
 * />
 * ```
 */

'use client';

import { memo } from 'react';
import { RecommendButton } from './RecommendButton';
import type { ContentEntityType } from '@features/contacts/types/sharing';

interface ContentRecommendButtonProps {
  /** Content type (article, newsletter, podcast, video) */
  contentType: ContentEntityType;

  /** Content ID or slug */
  contentId: string;

  /** Optional size variant */
  size?: 'sm' | 'md' | 'lg';

  /** Optional class name */
  className?: string;

  /** Optional callback after successful recommendation */
  onRecommendSuccess?: () => void;
}

/**
 * Pre-configured recommend button for content types
 * Wraps RecommendButton with content-specific defaults
 */
export const ContentRecommendButton = memo(function ContentRecommendButton({
  contentType,
  contentId,
  size = 'md',
  className = '',
  onRecommendSuccess
}: ContentRecommendButtonProps) {
  return (
    <RecommendButton
      entityType={contentType}
      entityId={contentId}
      size={size}
      variant="secondary"
      className={className}
      onRecommendSuccess={onRecommendSuccess}
    />
  );
});

/**
 * @deprecated Use ContentRecommendButton instead. This alias exists for backward compatibility.
 */
export const ContentShareButton = ContentRecommendButton;

export default ContentRecommendButton;
