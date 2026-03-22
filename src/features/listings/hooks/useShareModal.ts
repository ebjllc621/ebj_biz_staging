'use client';

import { useState, useCallback } from 'react';

export interface ListingShareData {
  id: number;
  slug: string;
  name: string;
  description?: string | null;
  image?: string | null;
}

export function useShareModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [listing, setListing] = useState<ListingShareData | null>(null);
  const [context, setContext] = useState<'post-publish' | 'share'>('share');

  const openShareModal = useCallback((
    listingData: ListingShareData,
    ctx: 'post-publish' | 'share' = 'share'
  ) => {
    setListing(listingData);
    setContext(ctx);
    setIsOpen(true);
  }, []);

  const closeShareModal = useCallback(() => {
    setIsOpen(false);
    setListing(null);
  }, []);

  return { isOpen, listing, context, openShareModal, closeShareModal };
}
