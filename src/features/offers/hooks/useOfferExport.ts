/**
 * useOfferExport Hook
 *
 * Handles CSV export of claims and analytics data with tier-based access
 *
 * @tier ADVANCED
 * @phase Phase 3 - Analytics Dashboard
 * @authority Phase 3 Brain Plan
 */

'use client';

import { useState } from 'react';
import { ExportFilters, CSVExportResult, ExportEligibility } from '@features/offers/types';

interface UseOfferExportReturn {
  isExporting: boolean;
  error: string | null;
  exportClaims: (offerId: number, filters?: ExportFilters) => Promise<void>;
  exportAnalytics: (offerId: number, filters?: ExportFilters) => Promise<void>;
  checkEligibility: (listingId: number) => Promise<ExportEligibility | null>;
}

/**
 * Handle CSV export of offer data
 *
 * @returns Export state and methods
 *
 * @example
 * ```tsx
 * const { isExporting, error, exportClaims, checkEligibility } = useOfferExport();
 *
 * const handleExport = async () => {
 *   const eligibility = await checkEligibility(listingId);
 *   if (eligibility?.canExport) {
 *     await exportClaims(offerId, { includeEmail: true });
 *   }
 * };
 * ```
 */
export function useOfferExport(): UseOfferExportReturn {
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const downloadCSV = (csv: string, filename: string) => {
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const exportClaims = async (offerId: number, filters?: ExportFilters): Promise<void> => {
    try {
      setIsExporting(true);
      setError(null);

      const params = new URLSearchParams();
      if (filters?.startDate) params.set('startDate', filters.startDate.toISOString());
      if (filters?.endDate) params.set('endDate', filters.endDate.toISOString());
      if (filters?.status) params.set('status', filters.status);
      if (filters?.includeEmail !== undefined) params.set('includeEmail', String(filters.includeEmail));

      const response = await fetch(
        `/api/offers/${offerId}/export/claims?${params}`,
        {
          credentials: 'include'
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to export claims');
      }

      const result = await response.json();
      const exportData = result.data as CSVExportResult;

      downloadCSV(exportData.csv, exportData.filename);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Export failed';
      setError(errorMessage);
      throw err;
    } finally {
      setIsExporting(false);
    }
  };

  const exportAnalytics = async (offerId: number, filters?: ExportFilters): Promise<void> => {
    try {
      setIsExporting(true);
      setError(null);

      const params = new URLSearchParams();
      if (filters?.startDate) params.set('startDate', filters.startDate.toISOString());
      if (filters?.endDate) params.set('endDate', filters.endDate.toISOString());

      const response = await fetch(
        `/api/offers/${offerId}/export/analytics?${params}`,
        {
          credentials: 'include'
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to export analytics');
      }

      const result = await response.json();
      const exportData = result.data as CSVExportResult;

      downloadCSV(exportData.csv, exportData.filename);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Export failed';
      setError(errorMessage);
      throw err;
    } finally {
      setIsExporting(false);
    }
  };

  const checkEligibility = async (listingId: number): Promise<ExportEligibility | null> => {
    try {
      setError(null);

      const response = await fetch(
        `/api/listings/${listingId}/offers/export-eligibility`,
        {
          credentials: 'include'
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to check eligibility');
      }

      const result = await response.json();
      return result.data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Eligibility check failed');
      return null;
    }
  };

  return {
    isExporting,
    error,
    exportClaims,
    exportAnalytics,
    checkEligibility
  };
}
