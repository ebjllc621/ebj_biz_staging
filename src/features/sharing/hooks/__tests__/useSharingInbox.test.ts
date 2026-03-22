/**
 * Unit tests for useSharingInbox hook
 *
 * Tests 8 core behaviors:
 * 1. fetchRecommendations - initial fetch, filtering, pagination
 * 2. fetchCounts - tab badge counts
 * 3. markAsViewed - viewing recommendation
 * 4. toggleSaved - save/unsave with optimistic updates
 * 5. hideRecommendation - soft delete
 * 6. setTab - tab state changes and page reset
 * 7. setEntityTypeFilter - filter state changes
 * 8. markHelpful/sendThankYou - Phase 4 feedback methods
 *
 * @phase Technical Debt Remediation - Phase 5 (P2: Hook Tests)
 * @coverage 80%+ target
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useSharingInbox } from '../useSharingInbox';
import type { SharingWithPreview, InboxCounts } from '@features/contacts/types/sharing';

// Mock fetch for GET requests and fetchWithCsrf for mutations
const mockFetchResponse = vi.fn();

// Mock global fetch
vi.stubGlobal('fetch', vi.fn((url: string) => mockFetchResponse(url)));

// Mock fetchWithCsrf for mutations (PATCH, DELETE, POST)
vi.mock('@core/utils/csrf', () => ({
  fetchWithCsrf: vi.fn((url: string, options?: RequestInit) => mockFetchResponse(url, options))
}));

// Mock ErrorService
vi.mock('@core/services/ErrorService', () => ({
  ErrorService: {
    capture: vi.fn()
  }
}));

// Sample test data
const createMockRecommendation = (overrides: Partial<SharingWithPreview> = {}): SharingWithPreview => ({
  id: 1,
  sender_user_id: 100,
  recipient_user_id: 200,
  entity_type: 'listing',
  entity_id: '456',
  status: 'pending',
  referral_code: 'TEST123',
  reward_status: 'pending',
  reward_points: 5,
  created_at: new Date('2026-02-21T10:00:00Z'),
  updated_at: new Date('2026-02-21T10:00:00Z'),
  viewed_at: null,
  is_saved: false,
  is_helpful: null,
  helpful_at: null,
  thank_message: null,
  thanked_at: null,
  entity_preview: {
    id: '456',
    name: 'Test Listing',
    type: 'listing'
  },
  sender_name: 'John Doe',
  sender_avatar: '/avatars/john.jpg',
  ...overrides
});

const createMockCounts = (overrides: Partial<InboxCounts> = {}): InboxCounts => ({
  total: 10,
  received: 5,
  sent: 3,
  saved: 2,
  unread: 4,
  ...overrides
});

describe('useSharingInbox', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default successful fetch response
    mockFetchResponse.mockImplementation((url: string) => {
      if (url.includes('/counts')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ data: createMockCounts() })
        });
      }
      // Default recommendations response
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          data: {
            recommendations: [createMockRecommendation()],
            total: 1,
            total_pages: 1
          }
        })
      });
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ============================================================================
  // Behavior 1: fetchRecommendations
  // ============================================================================
  describe('Behavior 1: fetchRecommendations', () => {
    it('fetches recommendations on mount', async () => {
      const { result } = renderHook(() => useSharingInbox());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.recommendations).toHaveLength(1);
      expect(result.current.total).toBe(1);
      expect(result.current.totalPages).toBe(1);
    });

    it('handles initial options correctly', async () => {
      const { result } = renderHook(() => useSharingInbox({
        initialTab: 'sent',
        initialPage: 2,
        pageSize: 10
      }));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.activeTab).toBe('sent');
      expect(result.current.page).toBe(2);
      expect(result.current.pageSize).toBe(10);
    });

    it('constructs correct API params for received tab', async () => {
      renderHook(() => useSharingInbox({ initialTab: 'received' }));

      await waitFor(() => {
        expect(mockFetchResponse).toHaveBeenCalled();
      });

      const callUrl = mockFetchResponse.mock.calls.find(
        (call: unknown[]) => typeof call[0] === 'string' && call[0].includes('/api/sharing/recommendations?')
      )?.[0] as string;
      expect(callUrl).toContain('type=received');
    });

    it('constructs correct API params for sent tab', async () => {
      renderHook(() => useSharingInbox({ initialTab: 'sent' }));

      await waitFor(() => {
        expect(mockFetchResponse).toHaveBeenCalled();
      });

      const callUrl = mockFetchResponse.mock.calls.find(
        (call: unknown[]) => typeof call[0] === 'string' && call[0].includes('/api/sharing/recommendations?')
      )?.[0] as string;
      expect(callUrl).toContain('type=sent');
    });

    it('constructs correct API params for saved tab', async () => {
      renderHook(() => useSharingInbox({ initialTab: 'saved' }));

      await waitFor(() => {
        expect(mockFetchResponse).toHaveBeenCalled();
      });

      const callUrl = mockFetchResponse.mock.calls.find(
        (call: unknown[]) => typeof call[0] === 'string' && call[0].includes('/api/sharing/recommendations?')
      )?.[0] as string;
      expect(callUrl).toContain('type=received');
      expect(callUrl).toContain('status=saved');
    });

    it('includes entity_type filter when not "all"', async () => {
      const { result } = renderHook(() => useSharingInbox());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Change entity type filter
      act(() => {
        result.current.setEntityTypeFilter('event');
      });

      await waitFor(() => {
        const callUrl = mockFetchResponse.mock.calls.find(
          (call: unknown[]) => typeof call[0] === 'string' && call[0].includes('entity_type=event')
        )?.[0] as string;
        expect(callUrl).toContain('entity_type=event');
      });
    });

    it('handles fetch error gracefully', async () => {
      mockFetchResponse.mockImplementation((url: string) => {
        if (url.includes('/counts')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ data: createMockCounts() })
          });
        }
        return Promise.resolve({
          ok: false,
          status: 500
        });
      });

      const { result } = renderHook(() => useSharingInbox());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBe('Failed to fetch recommendations');
      expect(result.current.recommendations).toHaveLength(0);
    });

    it('parses dates correctly in response', async () => {
      mockFetchResponse.mockImplementation((url: string) => {
        if (url.includes('/counts')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ data: createMockCounts() })
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            data: {
              recommendations: [{
                ...createMockRecommendation(),
                created_at: '2026-02-21T10:00:00Z',
                viewed_at: '2026-02-21T11:00:00Z'
              }],
              total: 1,
              total_pages: 1
            }
          })
        });
      });

      const { result } = renderHook(() => useSharingInbox());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.recommendations[0].created_at).toBeInstanceOf(Date);
      expect(result.current.recommendations[0].viewed_at).toBeInstanceOf(Date);
    });
  });

  // ============================================================================
  // Behavior 2: fetchCounts
  // ============================================================================
  describe('Behavior 2: fetchCounts', () => {
    it('fetches counts on mount', async () => {
      const { result } = renderHook(() => useSharingInbox());

      await waitFor(() => {
        expect(result.current.counts).not.toBeNull();
      });

      expect(result.current.counts?.total).toBe(10);
      expect(result.current.counts?.unread).toBe(4);
    });

    it('handles counts fetch failure silently', async () => {
      mockFetchResponse.mockImplementation((url: string) => {
        if (url.includes('/counts')) {
          return Promise.resolve({
            ok: false,
            status: 500
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            data: {
              recommendations: [],
              total: 0,
              total_pages: 1
            }
          })
        });
      });

      const { result } = renderHook(() => useSharingInbox());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Counts should remain null on failure
      expect(result.current.counts).toBeNull();
      // No error set for counts failure
      expect(result.current.error).toBeNull();
    });
  });

  // ============================================================================
  // Behavior 3: markAsViewed
  // ============================================================================
  describe('Behavior 3: markAsViewed', () => {
    it('marks recommendation as viewed with optimistic update', async () => {
      const { result } = renderHook(() => useSharingInbox());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Ensure we have a recommendation to mark
      expect(result.current.recommendations).toHaveLength(1);
      expect(result.current.recommendations[0].viewed_at).toBeNull();

      await act(async () => {
        await result.current.markAsViewed(1);
      });

      // Check optimistic update
      expect(result.current.recommendations[0].viewed_at).toBeInstanceOf(Date);
    });

    it('decrements unread count on view', async () => {
      const { result } = renderHook(() => useSharingInbox());

      await waitFor(() => {
        expect(result.current.counts).not.toBeNull();
      });

      const initialUnread = result.current.counts?.unread ?? 0;

      await act(async () => {
        await result.current.markAsViewed(1);
      });

      expect(result.current.counts?.unread).toBe(Math.max(0, initialUnread - 1));
    });

    it('throws error on API failure', async () => {
      mockFetchResponse.mockImplementation((url: string, options?: RequestInit) => {
        if (url.includes('/counts')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ data: createMockCounts() })
          });
        }
        if (options?.method === 'PATCH') {
          return Promise.resolve({
            ok: false,
            status: 400
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            data: {
              recommendations: [createMockRecommendation()],
              total: 1,
              total_pages: 1
            }
          })
        });
      });

      const { result } = renderHook(() => useSharingInbox());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await expect(
        act(async () => {
          await result.current.markAsViewed(1);
        })
      ).rejects.toThrow('Failed to mark as viewed');
    });
  });

  // ============================================================================
  // Behavior 4: toggleSaved
  // ============================================================================
  describe('Behavior 4: toggleSaved', () => {
    it('toggles saved status with optimistic update', async () => {
      mockFetchResponse.mockImplementation((url: string, options?: RequestInit) => {
        if (url.includes('/counts')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ data: createMockCounts() })
          });
        }
        if (options?.method === 'PATCH') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ data: { is_saved: true } })
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            data: {
              recommendations: [createMockRecommendation({ is_saved: false })],
              total: 1,
              total_pages: 1
            }
          })
        });
      });

      const { result } = renderHook(() => useSharingInbox());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.recommendations[0].is_saved).toBe(false);

      await act(async () => {
        await result.current.toggleSaved(1);
      });

      expect(result.current.recommendations[0].is_saved).toBe(true);
    });

    it('updates saved count on toggle', async () => {
      mockFetchResponse.mockImplementation((url: string, options?: RequestInit) => {
        if (url.includes('/counts')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ data: createMockCounts({ saved: 2 }) })
          });
        }
        if (options?.method === 'PATCH') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ data: { is_saved: true } })
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            data: {
              recommendations: [createMockRecommendation()],
              total: 1,
              total_pages: 1
            }
          })
        });
      });

      const { result } = renderHook(() => useSharingInbox());

      await waitFor(() => {
        expect(result.current.counts).not.toBeNull();
      });

      const initialSaved = result.current.counts?.saved ?? 0;

      await act(async () => {
        await result.current.toggleSaved(1);
      });

      expect(result.current.counts?.saved).toBe(initialSaved + 1);
    });

    it('removes from list when unsaved in saved tab', async () => {
      mockFetchResponse.mockImplementation((url: string, options?: RequestInit) => {
        if (url.includes('/counts')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ data: createMockCounts() })
          });
        }
        if (options?.method === 'PATCH') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ data: { is_saved: false } })
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            data: {
              recommendations: [createMockRecommendation({ is_saved: true })],
              total: 1,
              total_pages: 1
            }
          })
        });
      });

      const { result } = renderHook(() => useSharingInbox({ initialTab: 'saved' }));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.recommendations).toHaveLength(1);

      await act(async () => {
        await result.current.toggleSaved(1);
      });

      // Item should be removed from list when unsaved in saved tab
      expect(result.current.recommendations).toHaveLength(0);
      expect(result.current.total).toBe(0);
    });
  });

  // ============================================================================
  // Behavior 5: hideRecommendation
  // ============================================================================
  describe('Behavior 5: hideRecommendation', () => {
    it('removes recommendation from list', async () => {
      mockFetchResponse.mockImplementation((url: string, options?: RequestInit) => {
        if (url.includes('/counts')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ data: createMockCounts() })
          });
        }
        if (options?.method === 'DELETE') {
          return Promise.resolve({ ok: true });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            data: {
              recommendations: [createMockRecommendation()],
              total: 1,
              total_pages: 1
            }
          })
        });
      });

      const { result } = renderHook(() => useSharingInbox());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.recommendations).toHaveLength(1);

      await act(async () => {
        await result.current.hideRecommendation(1);
      });

      expect(result.current.recommendations).toHaveLength(0);
      expect(result.current.total).toBe(0);
    });

    it('refreshes counts after hiding', async () => {
      let countsFetchCount = 0;

      mockFetchResponse.mockImplementation((url: string, options?: RequestInit) => {
        if (url.includes('/counts')) {
          countsFetchCount++;
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ data: createMockCounts() })
          });
        }
        if (options?.method === 'DELETE') {
          return Promise.resolve({ ok: true });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            data: {
              recommendations: [createMockRecommendation()],
              total: 1,
              total_pages: 1
            }
          })
        });
      });

      const { result } = renderHook(() => useSharingInbox());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const initialCountsFetch = countsFetchCount;

      await act(async () => {
        await result.current.hideRecommendation(1);
      });

      // Counts should be re-fetched after hide
      expect(countsFetchCount).toBeGreaterThan(initialCountsFetch);
    });

    it('throws error on API failure', async () => {
      mockFetchResponse.mockImplementation((url: string, options?: RequestInit) => {
        if (url.includes('/counts')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ data: createMockCounts() })
          });
        }
        if (options?.method === 'DELETE') {
          return Promise.resolve({
            ok: false,
            status: 403
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            data: {
              recommendations: [createMockRecommendation()],
              total: 1,
              total_pages: 1
            }
          })
        });
      });

      const { result } = renderHook(() => useSharingInbox());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await expect(
        act(async () => {
          await result.current.hideRecommendation(1);
        })
      ).rejects.toThrow('Failed to hide recommendation');
    });
  });

  // ============================================================================
  // Behavior 6: setTab
  // ============================================================================
  describe('Behavior 6: setTab', () => {
    it('changes active tab state', async () => {
      const { result } = renderHook(() => useSharingInbox({ initialTab: 'received' }));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.activeTab).toBe('received');

      act(() => {
        result.current.setTab('sent');
      });

      expect(result.current.activeTab).toBe('sent');
    });

    it('resets page to 1 on tab change', async () => {
      const { result } = renderHook(() => useSharingInbox({ initialPage: 3 }));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.page).toBe(3);

      act(() => {
        result.current.setTab('sent');
      });

      expect(result.current.page).toBe(1);
    });

    it('triggers new fetch on tab change', async () => {
      const { result } = renderHook(() => useSharingInbox());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const fetchCallsBefore = mockFetchResponse.mock.calls.length;

      act(() => {
        result.current.setTab('sent');
      });

      await waitFor(() => {
        expect(mockFetchResponse.mock.calls.length).toBeGreaterThan(fetchCallsBefore);
      });
    });
  });

  // ============================================================================
  // Behavior 7: setEntityTypeFilter
  // ============================================================================
  describe('Behavior 7: setEntityTypeFilter', () => {
    it('changes entity type filter state', async () => {
      const { result } = renderHook(() => useSharingInbox());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.entityTypeFilter).toBe('all');

      act(() => {
        result.current.setEntityTypeFilter('event');
      });

      expect(result.current.entityTypeFilter).toBe('event');
    });

    it('resets page to 1 on filter change', async () => {
      const { result } = renderHook(() => useSharingInbox({ initialPage: 5 }));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.page).toBe(5);

      act(() => {
        result.current.setEntityTypeFilter('listing');
      });

      expect(result.current.page).toBe(1);
    });

    it('triggers new fetch on filter change', async () => {
      const { result } = renderHook(() => useSharingInbox());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const fetchCallsBefore = mockFetchResponse.mock.calls.length;

      act(() => {
        result.current.setEntityTypeFilter('user');
      });

      await waitFor(() => {
        expect(mockFetchResponse.mock.calls.length).toBeGreaterThan(fetchCallsBefore);
      });
    });
  });

  // ============================================================================
  // Behavior 8: markHelpful / sendThankYou (Phase 4 Feedback)
  // ============================================================================
  describe('Behavior 8: markHelpful and sendThankYou', () => {
    describe('markHelpful', () => {
      it('marks recommendation as helpful with optimistic update', async () => {
        mockFetchResponse.mockImplementation((url: string, options?: RequestInit) => {
          if (url.includes('/counts')) {
            return Promise.resolve({
              ok: true,
              json: () => Promise.resolve({ data: createMockCounts() })
            });
          }
          if (url.includes('/helpful') && options?.method === 'POST') {
            return Promise.resolve({ ok: true });
          }
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              data: {
                recommendations: [createMockRecommendation({ is_helpful: null })],
                total: 1,
                total_pages: 1
              }
            })
          });
        });

        const { result } = renderHook(() => useSharingInbox());

        await waitFor(() => {
          expect(result.current.isLoading).toBe(false);
        });

        expect(result.current.recommendations[0].is_helpful).toBeNull();

        await act(async () => {
          await result.current.markHelpful(1, true);
        });

        expect(result.current.recommendations[0].is_helpful).toBe(true);
      });

      it('marks recommendation as not helpful', async () => {
        mockFetchResponse.mockImplementation((url: string, options?: RequestInit) => {
          if (url.includes('/counts')) {
            return Promise.resolve({
              ok: true,
              json: () => Promise.resolve({ data: createMockCounts() })
            });
          }
          if (url.includes('/helpful') && options?.method === 'POST') {
            return Promise.resolve({ ok: true });
          }
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              data: {
                recommendations: [createMockRecommendation({ is_helpful: null })],
                total: 1,
                total_pages: 1
              }
            })
          });
        });

        const { result } = renderHook(() => useSharingInbox());

        await waitFor(() => {
          expect(result.current.isLoading).toBe(false);
        });

        await act(async () => {
          await result.current.markHelpful(1, false);
        });

        expect(result.current.recommendations[0].is_helpful).toBe(false);
      });

      it('throws error on API failure', async () => {
        mockFetchResponse.mockImplementation((url: string, options?: RequestInit) => {
          if (url.includes('/counts')) {
            return Promise.resolve({
              ok: true,
              json: () => Promise.resolve({ data: createMockCounts() })
            });
          }
          if (url.includes('/helpful') && options?.method === 'POST') {
            return Promise.resolve({
              ok: false,
              status: 400
            });
          }
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              data: {
                recommendations: [createMockRecommendation()],
                total: 1,
                total_pages: 1
              }
            })
          });
        });

        const { result } = renderHook(() => useSharingInbox());

        await waitFor(() => {
          expect(result.current.isLoading).toBe(false);
        });

        await expect(
          act(async () => {
            await result.current.markHelpful(1, true);
          })
        ).rejects.toThrow('Failed to mark as helpful');
      });
    });

    describe('sendThankYou', () => {
      it('sends thank you with optimistic update', async () => {
        mockFetchResponse.mockImplementation((url: string, options?: RequestInit) => {
          if (url.includes('/counts')) {
            return Promise.resolve({
              ok: true,
              json: () => Promise.resolve({ data: createMockCounts() })
            });
          }
          if (url.includes('/thank') && options?.method === 'POST') {
            return Promise.resolve({ ok: true });
          }
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              data: {
                recommendations: [createMockRecommendation({ thanked_at: null })],
                total: 1,
                total_pages: 1
              }
            })
          });
        });

        const { result } = renderHook(() => useSharingInbox());

        await waitFor(() => {
          expect(result.current.isLoading).toBe(false);
        });

        expect(result.current.recommendations[0].thanked_at).toBeNull();

        await act(async () => {
          await result.current.sendThankYou(1, 'Thanks for the recommendation!');
        });

        expect(result.current.recommendations[0].thanked_at).toBeInstanceOf(Date);
      });

      it('throws error on API failure', async () => {
        mockFetchResponse.mockImplementation((url: string, options?: RequestInit) => {
          if (url.includes('/counts')) {
            return Promise.resolve({
              ok: true,
              json: () => Promise.resolve({ data: createMockCounts() })
            });
          }
          if (url.includes('/thank') && options?.method === 'POST') {
            return Promise.resolve({
              ok: false,
              status: 400
            });
          }
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              data: {
                recommendations: [createMockRecommendation()],
                total: 1,
                total_pages: 1
              }
            })
          });
        });

        const { result } = renderHook(() => useSharingInbox());

        await waitFor(() => {
          expect(result.current.isLoading).toBe(false);
        });

        await expect(
          act(async () => {
            await result.current.sendThankYou(1, 'Thanks!');
          })
        ).rejects.toThrow('Failed to send thank you');
      });
    });
  });

  // ============================================================================
  // Additional Integration Tests
  // ============================================================================
  describe('Integration: refresh', () => {
    it('refreshes both recommendations and counts', async () => {
      const { result } = renderHook(() => useSharingInbox());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const fetchCallsBefore = mockFetchResponse.mock.calls.length;

      await act(async () => {
        await result.current.refresh();
      });

      // Should have fetched both recommendations and counts
      expect(mockFetchResponse.mock.calls.length).toBeGreaterThanOrEqual(fetchCallsBefore + 2);
    });
  });

  describe('Integration: setPage', () => {
    it('changes page and triggers fetch', async () => {
      const { result } = renderHook(() => useSharingInbox());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      act(() => {
        result.current.setPage(2);
      });

      expect(result.current.page).toBe(2);

      await waitFor(() => {
        const callUrl = mockFetchResponse.mock.calls.find(
          (call: unknown[]) => typeof call[0] === 'string' && call[0].includes('page=2')
        )?.[0] as string;
        expect(callUrl).toContain('page=2');
      });
    });
  });
});
