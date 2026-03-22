/**
 * useContactMatching - Contact-to-User Matching Hook
 *
 * Manages contact matching state and operations.
 * Provides batch matching on mount and single-contact matching.
 *
 * @tier SIMPLE
 * @phase Contacts Enhancement Phase 5
 * @generated ComponentBuilder
 * @dna-version 11.4.0
 * @reference src/features/connections/hooks/useRecommendations.ts - Hook pattern
 */

'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import type { Contact } from '../types';
import type { ContactMatchResult } from '../types/matching';

interface UseContactMatchingOptions {
  /** Contacts to match */
  contacts: Contact[];
  /** Whether to auto-match on mount */
  autoMatch?: boolean;
}

interface UseContactMatchingReturn {
  /** Map of contactId -> match result */
  matchResults: Map<number, ContactMatchResult>;
  /** Whether batch matching is in progress */
  isMatching: boolean;
  /** Error from matching operation */
  error: string | null;
  /** Number of contacts matched */
  matchedCount: number;
  /** Trigger batch matching manually */
  triggerBatchMatch: () => Promise<void>;
  /** Match a single contact */
  matchSingleContact: (contactId: number) => Promise<ContactMatchResult | null>;
  /** Get match result for a contact */
  getMatchResult: (contactId: number) => ContactMatchResult | null;
}

export function useContactMatching({
  contacts,
  autoMatch = true
}: UseContactMatchingOptions): UseContactMatchingReturn {
  const [matchResults, setMatchResults] = useState<Map<number, ContactMatchResult>>(
    new Map()
  );
  const [isMatching, setIsMatching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filter to only manual contacts for matching
  const manualContacts = useMemo(
    () => contacts.filter(c => !c.is_connected),
    [contacts]
  );

  /**
   * Fetch batch match results from API
   */
  const triggerBatchMatch = useCallback(async () => {
    if (manualContacts.length === 0) return;

    setIsMatching(true);
    setError(null);

    try {
      const contactIds = manualContacts.map(c => c.id);

      const response = await fetch('/api/contacts/match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ contactIds })
      });

      if (!response.ok) {
        throw new Error('Failed to match contacts');
      }

      const data = await response.json();
      const results = data.data?.results || {};

      // Convert results object to Map
      const resultsMap = new Map<number, ContactMatchResult>();
      for (const [contactIdStr, result] of Object.entries(results)) {
        const contactId = parseInt(contactIdStr, 10);
        resultsMap.set(contactId, result as ContactMatchResult);
      }

      setMatchResults(resultsMap);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Matching failed');
    } finally {
      setIsMatching(false);
    }
  }, [manualContacts]);

  /**
   * Match a single contact
   */
  const matchSingleContact = useCallback(
    async (contactId: number): Promise<ContactMatchResult | null> => {
      try {
        const response = await fetch(`/api/contacts/${contactId}/match`, {
          method: 'GET',
          credentials: 'include'
        });

        if (!response.ok) {
          throw new Error('Failed to match contact');
        }

        const data = await response.json();
        const result = data.data as ContactMatchResult;

        // Update results map
        setMatchResults(prev => {
          const updated = new Map(prev);
          updated.set(contactId, result);
          return updated;
        });

        return result;
      } catch (err) {
        console.error('Match single contact error:', err);
        return null;
      }
    },
    []
  );

  /**
   * Get match result for a contact
   */
  const getMatchResult = useCallback(
    (contactId: number): ContactMatchResult | null => {
      return matchResults.get(contactId) || null;
    },
    [matchResults]
  );

  /**
   * Count matched contacts
   */
  const matchedCount = useMemo(() => {
    let count = 0;
    matchResults.forEach(result => {
      if (result.isMatched) count++;
    });
    return count;
  }, [matchResults]);

  /**
   * Auto-match on mount if enabled
   */
  useEffect(() => {
    if (autoMatch && manualContacts.length > 0 && matchResults.size === 0) {
      triggerBatchMatch();
    }
  }, [autoMatch, manualContacts.length, matchResults.size, triggerBatchMatch]);

  return {
    matchResults,
    isMatching,
    error,
    matchedCount,
    triggerBatchMatch,
    matchSingleContact,
    getMatchResult
  };
}
