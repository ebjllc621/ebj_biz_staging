/**
 * useOfferTemplates - Hook Tests
 *
 * @tier STANDARD
 * @phase Phase 5 - Testing & Quality Assurance
 * @generated DNA v11.4.0
 * @governance Build Map v2.1 ENHANCED
 *
 * Tests template fetching, creation, update, deletion, and scheduling operations.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useOfferTemplates } from '../useOfferTemplates';
import type { OfferTemplate } from '@features/offers/types';

// Mock fetch
global.fetch = vi.fn();

const mockTemplates: OfferTemplate[] = [
  {
    id: 1,
    listing_id: 1,
    name: 'Template 1',
    template_data: {
      offer_type: 'discount',
      title: 'Test Offer',
    },
    recurrence_type: 'none',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  },
];

describe('useOfferTemplates', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('fetching templates', () => {
    it('fetches templates on mount when autoLoad is true', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ templates: mockTemplates }),
      });

      const { result } = renderHook(() =>
        useOfferTemplates({ listingId: 1, autoLoad: true })
      );

      await waitFor(() => {
        expect(result.current.templates).toEqual(mockTemplates);
      });
    });

    it('does not fetch on mount when autoLoad is false', () => {
      const { result } = renderHook(() =>
        useOfferTemplates({ listingId: 1, autoLoad: false })
      );

      expect(result.current.templates).toEqual([]);
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('sets loading state during fetch', async () => {
      (global.fetch as any).mockImplementationOnce(
        () => new Promise(() => {}) // Never resolves
      );

      const { result } = renderHook(() =>
        useOfferTemplates({ listingId: 1, autoLoad: false })
      );

      await act(async () => {
        result.current.fetchTemplates();
      });

      expect(result.current.loading).toBe(true);
    });

    it('handles fetch errors', async () => {
      (global.fetch as any).mockRejectedValueOnce(new Error('Fetch failed'));

      const { result } = renderHook(() =>
        useOfferTemplates({ listingId: 1, autoLoad: false })
      );

      await act(async () => {
        await result.current.fetchTemplates();
      });

      expect(result.current.error).toBe('Fetch failed');
      expect(result.current.templates).toEqual([]);
    });

    it('calls correct API endpoint', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ templates: mockTemplates }),
      });

      const { result } = renderHook(() =>
        useOfferTemplates({ listingId: 123, autoLoad: false })
      );

      await act(async () => {
        await result.current.fetchTemplates();
      });

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/listings/123/templates',
        expect.objectContaining({ credentials: 'include' })
      );
    });
  });

  describe('creating templates', () => {
    it('creates template successfully', async () => {
      (global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ template: mockTemplates[0] }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ templates: mockTemplates }),
        });

      const { result } = renderHook(() =>
        useOfferTemplates({ listingId: 1, autoLoad: false })
      );

      let createdTemplate;
      await act(async () => {
        createdTemplate = await result.current.createTemplate({
          name: 'New Template',
          template_data: { offer_type: 'discount' },
        });
      });

      expect(createdTemplate).toEqual(mockTemplates[0]);
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/listings/1/templates',
        expect.objectContaining({ method: 'POST' })
      );
    });

    it('handles creation errors', async () => {
      (global.fetch as any).mockRejectedValueOnce(new Error('Creation failed'));

      const { result } = renderHook(() =>
        useOfferTemplates({ listingId: 1, autoLoad: false })
      );

      let createdTemplate;
      await act(async () => {
        createdTemplate = await result.current.createTemplate({
          name: 'New Template',
        });
      });

      expect(createdTemplate).toBeNull();
      expect(result.current.error).toBe('Creation failed');
    });

    it('refetches templates after creation', async () => {
      (global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ template: mockTemplates[0] }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ templates: mockTemplates }),
        });

      const { result } = renderHook(() =>
        useOfferTemplates({ listingId: 1, autoLoad: false })
      );

      await act(async () => {
        await result.current.createTemplate({ name: 'New Template' });
      });

      expect(global.fetch).toHaveBeenCalledTimes(2);
    });
  });

  describe('updating templates', () => {
    it('updates template successfully', async () => {
      (global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ templates: mockTemplates }),
        });

      const { result } = renderHook(() =>
        useOfferTemplates({ listingId: 1, autoLoad: false })
      );

      let success;
      await act(async () => {
        success = await result.current.updateTemplate(1, { name: 'Updated' });
      });

      expect(success).toBe(true);
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/templates/1',
        expect.objectContaining({ method: 'PUT' })
      );
    });

    it('handles update errors', async () => {
      (global.fetch as any).mockRejectedValueOnce(new Error('Update failed'));

      const { result } = renderHook(() =>
        useOfferTemplates({ listingId: 1, autoLoad: false })
      );

      let success;
      await act(async () => {
        success = await result.current.updateTemplate(1, { name: 'Updated' });
      });

      expect(success).toBe(false);
      expect(result.current.error).toBe('Update failed');
    });
  });

  describe('deleting templates', () => {
    it('deletes template successfully', async () => {
      (global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ templates: [] }),
        });

      const { result } = renderHook(() =>
        useOfferTemplates({ listingId: 1, autoLoad: false })
      );

      let success;
      await act(async () => {
        success = await result.current.deleteTemplate(1);
      });

      expect(success).toBe(true);
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/templates/1',
        expect.objectContaining({ method: 'DELETE' })
      );
    });

    it('handles deletion errors', async () => {
      (global.fetch as any).mockRejectedValueOnce(new Error('Delete failed'));

      const { result } = renderHook(() =>
        useOfferTemplates({ listingId: 1, autoLoad: false })
      );

      let success;
      await act(async () => {
        success = await result.current.deleteTemplate(1);
      });

      expect(success).toBe(false);
      expect(result.current.error).toBe('Delete failed');
    });
  });

  describe('scheduling templates', () => {
    it('schedules template successfully', async () => {
      (global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ templates: mockTemplates }),
        });

      const { result } = renderHook(() =>
        useOfferTemplates({ listingId: 1, autoLoad: false })
      );

      let success;
      await act(async () => {
        success = await result.current.scheduleTemplate(1, {
          recurrence_pattern: 'daily',
          start_date: '2026-01-01',
        });
      });

      expect(success).toBe(true);
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/templates/1/schedule',
        expect.objectContaining({ method: 'POST' })
      );
    });

    it('handles scheduling errors', async () => {
      (global.fetch as any).mockRejectedValueOnce(new Error('Schedule failed'));

      const { result } = renderHook(() =>
        useOfferTemplates({ listingId: 1, autoLoad: false })
      );

      let success;
      await act(async () => {
        success = await result.current.scheduleTemplate(1, {
          recurrence_pattern: 'daily',
          start_date: '2026-01-01',
        });
      });

      expect(success).toBe(false);
      expect(result.current.error).toBe('Schedule failed');
    });

    it('includes optional end_date in schedule request', async () => {
      (global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ templates: mockTemplates }),
        });

      const { result } = renderHook(() =>
        useOfferTemplates({ listingId: 1, autoLoad: false })
      );

      await act(async () => {
        await result.current.scheduleTemplate(1, {
          recurrence_pattern: 'weekly',
          start_date: '2026-01-01',
          end_date: '2026-12-31',
        });
      });

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/templates/1/schedule',
        expect.objectContaining({
          body: JSON.stringify({
            recurrence_pattern: 'weekly',
            start_date: '2026-01-01',
            end_date: '2026-12-31',
          }),
        })
      );
    });
  });

  describe('interface validation', () => {
    it('returns all required properties', () => {
      const { result } = renderHook(() =>
        useOfferTemplates({ listingId: 1, autoLoad: false })
      );

      expect(result.current).toHaveProperty('templates');
      expect(result.current).toHaveProperty('loading');
      expect(result.current).toHaveProperty('error');
      expect(result.current).toHaveProperty('fetchTemplates');
      expect(result.current).toHaveProperty('createTemplate');
      expect(result.current).toHaveProperty('updateTemplate');
      expect(result.current).toHaveProperty('deleteTemplate');
      expect(result.current).toHaveProperty('scheduleTemplate');
    });

    it('has correct function types', () => {
      const { result } = renderHook(() =>
        useOfferTemplates({ listingId: 1, autoLoad: false })
      );

      expect(typeof result.current.fetchTemplates).toBe('function');
      expect(typeof result.current.createTemplate).toBe('function');
      expect(typeof result.current.updateTemplate).toBe('function');
      expect(typeof result.current.deleteTemplate).toBe('function');
      expect(typeof result.current.scheduleTemplate).toBe('function');
    });
  });
});
