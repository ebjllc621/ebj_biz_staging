/**
 * useOfferTemplates - Hook for managing offer templates
 *
 * @hook Client Hook
 * @tier STANDARD
 * @phase Phase 4.5 - Deferred Items
 * @generated DNA v11.4.0
 */

'use client';

import { useState, useCallback, useEffect } from 'react';
import type { OfferTemplate } from '@features/offers/types';

interface UseOfferTemplatesOptions {
  listingId: number;
  autoLoad?: boolean;
}

interface UseOfferTemplatesReturn {
  templates: OfferTemplate[];
  loading: boolean;
  error: string | null;
  fetchTemplates: () => Promise<void>;
  createTemplate: (data: Partial<OfferTemplate>) => Promise<OfferTemplate | null>;
  updateTemplate: (id: number, data: Partial<OfferTemplate>) => Promise<boolean>;
  deleteTemplate: (id: number) => Promise<boolean>;
  scheduleTemplate: (id: number, scheduleData: {
    recurrence_pattern: string;
    start_date: string;
    end_date?: string;
  }) => Promise<boolean>;
}

export function useOfferTemplates({
  listingId,
  autoLoad = true,
}: UseOfferTemplatesOptions): UseOfferTemplatesReturn {
  const [templates, setTemplates] = useState<OfferTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/listings/${listingId}/templates`, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch templates');
      }

      const data = await response.json();
      setTemplates(data.templates || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [listingId]);

  const createTemplate = useCallback(async (
    data: Partial<OfferTemplate>
  ): Promise<OfferTemplate | null> => {
    try {
      const response = await fetch(`/api/listings/${listingId}/templates`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error('Failed to create template');
      }

      const result = await response.json();
      await fetchTemplates();
      return result.template;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      return null;
    }
  }, [listingId, fetchTemplates]);

  const updateTemplate = useCallback(async (
    id: number,
    data: Partial<OfferTemplate>
  ): Promise<boolean> => {
    try {
      const response = await fetch(`/api/templates/${id}`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error('Failed to update template');
      }

      await fetchTemplates();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      return false;
    }
  }, [fetchTemplates]);

  const deleteTemplate = useCallback(async (id: number): Promise<boolean> => {
    try {
      const response = await fetch(`/api/templates/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to delete template');
      }

      await fetchTemplates();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      return false;
    }
  }, [fetchTemplates]);

  const scheduleTemplate = useCallback(async (
    id: number,
    scheduleData: {
      recurrence_pattern: string;
      start_date: string;
      end_date?: string;
    }
  ): Promise<boolean> => {
    try {
      const response = await fetch(`/api/templates/${id}/schedule`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(scheduleData),
      });

      if (!response.ok) {
        throw new Error('Failed to schedule template');
      }

      await fetchTemplates();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      return false;
    }
  }, [fetchTemplates]);

  useEffect(() => {
    if (autoLoad && listingId) {
      fetchTemplates();
    }
  }, [autoLoad, listingId, fetchTemplates]);

  return {
    templates,
    loading,
    error,
    fetchTemplates,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    scheduleTemplate,
  };
}
