/**
 * ContentShareButton - Pre-configured ShareEntityButton for content types
 *
 * Convenience wrapper for sharing content entities (article, newsletter, podcast, video).
 * Pre-configures ShareEntityButton with content-specific defaults.
 *
 * @tier SIMPLE
 * @phase Phase 8 - Content Types
 * @generated ComponentBuilder
 * @dna-version 11.4.0
 *
 * @example
 * ```tsx
 * import { ContentShareButton } from '@features/sharing/components';
 *
 * function ArticleFooter({ article }) {
 *   return (
 *     <ContentShareButton
 *       contentType="article"
 *       contentId={article.slug}
 *       title={article.title}
 *       description={article.excerpt}
 *       imageUrl={article.featured_image}
 *       variant="primary"
 *     />
 *   );
 * }
 *
 * // Newsletter share
 * <ContentShareButton
 *   contentType="newsletter"
 *   contentId={newsletter.id}
 *   title={newsletter.title}
 * />
 * ```
 */

'use client';

import { memo } from 'react';
import { ShareEntityButton } from './ShareEntityButton';
import type { ContentEntityType } from '@features/contacts/types/sharing';

interface ContentShareButtonProps {
  /** Content type (article, newsletter, podcast, video) */
  contentType: ContentEntityType;

  /** Content ID or slug */
  contentId: string;

  /** Optional size variant */
  size?: 'sm' | 'md' | 'lg';

  /** Optional class name */
  className?: string;

  /** Optional callback after successful share */
  onShareSuccess?: () => void;
}

/**
 * Pre-configured share button for content types
 * Wraps ShareEntityButton with content-specific defaults
 */
export const ContentShareButton = memo(function ContentShareButton({
  contentType,
  contentId,
  size = 'md',
  className = '',
  onShareSuccess
}: ContentShareButtonProps) {
  return (
    <ShareEntityButton
      entityType={contentType}
      entityId={contentId}
      size={size}
      variant="secondary"
      className={className}
      onShareSuccess={onShareSuccess}
    />
  );
});

export default ContentShareButton;
