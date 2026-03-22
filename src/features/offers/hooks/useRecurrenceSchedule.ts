/**
 * useRecurrenceSchedule - Hook for offer recurrence scheduling
 *
 * @hook Client Hook
 * @tier SIMPLE
 * @phase Phase 4.5 - Deferred Items
 * @generated DNA v11.4.0
 */

'use client';

import { useState, useCallback } from 'react';
// Local type for simple recurrence pattern strings
type SimpleRecurrencePattern = 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'custom';

interface ScheduleData {
  recurrence_pattern: SimpleRecurrencePattern;
  start_date: string;
  end_date?: string;
  specific_days?: number[]; // 0-6 for Sunday-Saturday
  specific_dates?: number[]; // 1-31 for day of month
}

interface UseRecurrenceScheduleOptions {
  templateId: number;
}

interface UseRecurrenceScheduleReturn {
  scheduling: boolean;
  error: string | null;
  scheduleTemplate: (data: ScheduleData) => Promise<boolean>;
  cancelSchedule: () => Promise<boolean>;
  getNextOccurrence: (data: ScheduleData) => Date | null;
}

export function useRecurrenceSchedule({
  templateId,
}: UseRecurrenceScheduleOptions): UseRecurrenceScheduleReturn {
  const [scheduling, setScheduling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const scheduleTemplate = useCallback(async (data: ScheduleData): Promise<boolean> => {
    setScheduling(true);
    setError(null);

    try {
      const response = await fetch(`/api/templates/${templateId}/schedule`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || 'Failed to schedule template');
      }

      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      return false;
    } finally {
      setScheduling(false);
    }
  }, [templateId]);

  const cancelSchedule = useCallback(async (): Promise<boolean> => {
    setScheduling(true);
    setError(null);

    try {
      const response = await fetch(`/api/templates/${templateId}/schedule`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to cancel schedule');
      }

      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      return false;
    } finally {
      setScheduling(false);
    }
  }, [templateId]);

  const getNextOccurrence = useCallback((data: ScheduleData): Date | null => {
    const now = new Date();
    const startDate = new Date(data.start_date);

    // If start date is in the future, that's the next occurrence
    if (startDate > now) {
      return startDate;
    }

    // Calculate next occurrence based on pattern
    switch (data.recurrence_pattern) {
      case 'daily': {
        const next = new Date(now);
        next.setDate(next.getDate() + 1);
        next.setHours(startDate.getHours(), startDate.getMinutes(), 0, 0);
        return next;
      }

      case 'weekly': {
        const next = new Date(now);
        const targetDay = startDate.getDay();
        const daysUntil = (targetDay - now.getDay() + 7) % 7 || 7;
        next.setDate(next.getDate() + daysUntil);
        next.setHours(startDate.getHours(), startDate.getMinutes(), 0, 0);
        return next;
      }

      case 'biweekly': {
        const next = new Date(now);
        const targetDay = startDate.getDay();
        const daysUntil = (targetDay - now.getDay() + 7) % 7 || 14;
        next.setDate(next.getDate() + daysUntil);
        next.setHours(startDate.getHours(), startDate.getMinutes(), 0, 0);
        return next;
      }

      case 'monthly': {
        const next = new Date(now);
        next.setMonth(next.getMonth() + 1);
        next.setDate(startDate.getDate());
        next.setHours(startDate.getHours(), startDate.getMinutes(), 0, 0);
        return next;
      }

      case 'custom': {
        // For custom, find next matching day
        if (data.specific_days && data.specific_days.length > 0) {
          const next = new Date(now);
          for (let i = 1; i <= 7; i++) {
            next.setDate(now.getDate() + i);
            if (data.specific_days.includes(next.getDay())) {
              next.setHours(startDate.getHours(), startDate.getMinutes(), 0, 0);
              return next;
            }
          }
        }
        return null;
      }

      default:
        return null;
    }
  }, []);

  return {
    scheduling,
    error,
    scheduleTemplate,
    cancelSchedule,
    getNextOccurrence,
  };
}
