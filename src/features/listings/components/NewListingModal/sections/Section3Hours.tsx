/**
 * Section3Hours - Hours of Operation Configuration
 *
 * @authority CLAUDE.md - Build Map v2.1 compliance
 * @tier STANDARD - Form section component
 * @phase Phase 4 - Hours of Operation
 *
 * FEATURES:
 * - Hours status radio selector (timetable/24-7/closed)
 * - Timezone dropdown with US timezones
 * - BusinessHoursTable integration (visible only when timetable selected)
 * - "Set All Open" / "Set All Closed" buttons
 */

'use client';

import { useCallback } from 'react';
import type { ListingFormData, BusinessHours } from '../../../types/listing-form.types';
import { US_TIMEZONES } from '../constants';
import { BusinessHoursTable } from '../components/BusinessHoursTable';

// ============================================================================
// TYPES
// ============================================================================

interface Section3HoursProps {
  /** Complete form data */
  formData: ListingFormData;
  /** Update single field callback */
  onUpdateField: <K extends keyof ListingFormData>(field: K, value: ListingFormData[K]) => void;
  /** Update multiple fields callback */
  onUpdateSection: (data: Partial<ListingFormData>) => void;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function Section3Hours({
  formData,
  onUpdateField,
  onUpdateSection,
}: Section3HoursProps) {
  // Handle hours status change
  const handleStatusChange = useCallback((status: 'timetable' | '24/7' | 'closed') => {
    onUpdateField('hoursStatus', status);
  }, [onUpdateField]);

  // Handle timezone change
  const handleTimezoneChange = useCallback((timezone: string) => {
    onUpdateField('timezone', timezone);
  }, [onUpdateField]);

  // Handle business hours table change
  const handleBusinessHoursChange = useCallback((hours: BusinessHours[]) => {
    onUpdateField('businessHours', hours);
  }, [onUpdateField]);

  return (
    <div className="space-y-6">
      {/* Hours Status Selector */}
      <div>
        <label className="block text-sm font-semibold text-[#022641] mb-3">
          Hours Status <span className="text-red-500">*</span>
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Timetable Option */}
          <button
            type="button"
            onClick={() => handleStatusChange('timetable')}
            className={`p-4 border-2 rounded-lg text-left transition-all ${
              formData.hoursStatus === 'timetable'
                ? 'border-[#ed6437] bg-[#ed6437]/5'
                : 'border-[#8d918d]/30 hover:border-[#8d918d]/50'
            }`}
            aria-pressed={formData.hoursStatus === 'timetable'}
          >
            <div className="flex items-start gap-3">
              <div className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                formData.hoursStatus === 'timetable' ? 'border-[#ed6437]' : 'border-[#8d918d]/50'
              }`}>
                {formData.hoursStatus === 'timetable' && (
                  <div className="w-3 h-3 rounded-full bg-[#ed6437]" />
                )}
              </div>
              <div>
                <div className="font-semibold text-[#022641] mb-1">Timetable</div>
                <div className="text-sm text-[#8d918d]">Set specific hours for each day</div>
              </div>
            </div>
          </button>

          {/* 24/7 Option */}
          <button
            type="button"
            onClick={() => handleStatusChange('24/7')}
            className={`p-4 border-2 rounded-lg text-left transition-all ${
              formData.hoursStatus === '24/7'
                ? 'border-[#ed6437] bg-[#ed6437]/5'
                : 'border-[#8d918d]/30 hover:border-[#8d918d]/50'
            }`}
            aria-pressed={formData.hoursStatus === '24/7'}
          >
            <div className="flex items-start gap-3">
              <div className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                formData.hoursStatus === '24/7' ? 'border-[#ed6437]' : 'border-[#8d918d]/50'
              }`}>
                {formData.hoursStatus === '24/7' && (
                  <div className="w-3 h-3 rounded-full bg-[#ed6437]" />
                )}
              </div>
              <div>
                <div className="font-semibold text-[#022641] mb-1">24/7</div>
                <div className="text-sm text-[#8d918d]">Open 24 hours, 7 days a week</div>
              </div>
            </div>
          </button>

          {/* Closed Option */}
          <button
            type="button"
            onClick={() => handleStatusChange('closed')}
            className={`p-4 border-2 rounded-lg text-left transition-all ${
              formData.hoursStatus === 'closed'
                ? 'border-[#ed6437] bg-[#ed6437]/5'
                : 'border-[#8d918d]/30 hover:border-[#8d918d]/50'
            }`}
            aria-pressed={formData.hoursStatus === 'closed'}
          >
            <div className="flex items-start gap-3">
              <div className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                formData.hoursStatus === 'closed' ? 'border-[#ed6437]' : 'border-[#8d918d]/50'
              }`}>
                {formData.hoursStatus === 'closed' && (
                  <div className="w-3 h-3 rounded-full bg-[#ed6437]" />
                )}
              </div>
              <div>
                <div className="font-semibold text-[#022641] mb-1">Closed</div>
                <div className="text-sm text-[#8d918d]">Currently not operating</div>
              </div>
            </div>
          </button>
        </div>
      </div>

      {/* Timezone Selector */}
      <div>
        <label htmlFor="timezone" className="block text-sm font-semibold text-[#022641] mb-2">
          Timezone <span className="text-red-500">*</span>
        </label>
        <select
          id="timezone"
          value={formData.timezone}
          onChange={(e) => handleTimezoneChange(e.target.value)}
          className="w-full px-4 py-2.5 border border-[#8d918d]/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ed6437] focus:border-transparent"
          aria-label="Select timezone"
        >
          {US_TIMEZONES.map((tz) => (
            <option key={tz.value} value={tz.value}>
              {tz.label}
            </option>
          ))}
        </select>
        <p className="mt-1.5 text-xs text-[#8d918d]">
          Select the timezone for your business location
        </p>
      </div>

      {/* Business Hours Table (Only visible for timetable) */}
      {formData.hoursStatus === 'timetable' && (
        <div>
          <label className="block text-sm font-semibold text-[#022641] mb-3">
            Weekly Schedule
          </label>
          <BusinessHoursTable
            businessHours={formData.businessHours}
            onChange={handleBusinessHoursChange}
          />
        </div>
      )}

      {/* Status Message for 24/7 and Closed */}
      {formData.hoursStatus === '24/7' && (
        <div className="p-4 bg-[#22c55e]/10 border border-[#22c55e]/30 rounded-lg">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-[#22c55e] mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <div>
              <div className="text-sm font-semibold text-[#022641] mb-1">Open 24/7</div>
              <div className="text-sm text-[#8d918d]">
                Your listing will display as open 24 hours a day, 7 days a week.
              </div>
            </div>
          </div>
        </div>
      )}

      {formData.hoursStatus === 'closed' && (
        <div className="p-4 bg-[#8d918d]/10 border border-[#8d918d]/30 rounded-lg">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-[#8d918d] mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <div>
              <div className="text-sm font-semibold text-[#022641] mb-1">Temporarily Closed</div>
              <div className="text-sm text-[#8d918d]">
                Your listing will display as temporarily closed. Update when you resume operations.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
