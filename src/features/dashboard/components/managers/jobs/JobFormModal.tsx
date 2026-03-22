/**
 * JobFormModal - Job creation/editing modal
 *
 * @component Client Component
 * @tier STANDARD
 * @phase Jobs Phase 1 - Core Job CRUD & Display
 */
'use client';

import { useState, useCallback, useEffect } from 'react';
import { BizModal } from '@/components/ui/BizModal';
import { EmploymentType, CompensationType, WorkLocationType, ApplicationMethod } from '@features/jobs/types';
import type { JobPostingTemplate } from '@features/jobs/types';
import MediaUploadSection from '@features/media/components/MediaUploadSection';
import type { MediaItem, MediaLimits } from '@features/media/types/shared-media';
import { JobTemplateSelector } from './templates/JobTemplateSelector';

interface JobFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (_data: Record<string, unknown>) => Promise<void>;
  isSubmitting: boolean;
  listingTier: string;
  listingId?: number;
  jobId?: number;
  initialData?: Partial<{
    id: number;
    title: string;
    employment_type: string;
    description: string;
    compensation_type: string;
    compensation_min: string;
    compensation_max: string;
    work_location_type: string;
    city: string;
    state: string;
    application_method: string;
    external_application_url: string;
    start_date: string;
    application_deadline: string;
    status: string;
  }>;
}

export function JobFormModal({
  isOpen,
  onClose,
  onSubmit,
  isSubmitting,
  listingTier,
  listingId,
  jobId,
  initialData
}: JobFormModalProps) {
  const [formData, setFormData] = useState({
    title: initialData?.title || '',
    employment_type: initialData?.employment_type || EmploymentType.FULL_TIME,
    description: initialData?.description || '',
    compensation_type: initialData?.compensation_type || CompensationType.HOURLY,
    compensation_min: initialData?.compensation_min || '',
    compensation_max: initialData?.compensation_max || '',
    work_location_type: initialData?.work_location_type || WorkLocationType.ONSITE,
    city: initialData?.city || '',
    state: initialData?.state || '',
    application_method: initialData?.application_method || ApplicationMethod.EXTERNAL,
    external_application_url: initialData?.external_application_url || '',
    start_date: initialData?.start_date || '',
    application_deadline: initialData?.application_deadline || '',
    status: initialData?.status || 'draft'
  });

  // Agency posting state
  const [isAgencyPosting, setIsAgencyPosting] = useState(false);
  const [agencyBusinessId, setAgencyBusinessId] = useState<number | null>(null);
  const [agencyBusinessName, setAgencyBusinessName] = useState('');
  const [agencySearchResults, setAgencySearchResults] = useState<{ id: number; name: string }[]>([]);
  const [agencySearchQuery, setAgencySearchQuery] = useState('');
  const [agencySearchLoading, setAgencySearchLoading] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [mediaLimits, setMediaLimits] = useState<MediaLimits>({
    images: { current: 0, limit: 0, unlimited: false },
    videos: { current: 0, limit: 0, unlimited: false },
  });

  const canUseNativeApplication = listingTier === 'preferred' || listingTier === 'premium';

  // Load existing media in edit mode
  useEffect(() => {
    if (!jobId || !isOpen) return;
    const loadMedia = async () => {
      try {
        const response = await fetch(`/api/jobs/${jobId}/media`, {
          credentials: 'include'
        });
        if (response.ok) {
          const result = await response.json();
          if (result.success && result.data) {
            setMediaItems((result.data.media || []).map((m: Record<string, unknown>) => ({
              id: m.id as number,
              media_type: m.media_type as 'image' | 'video',
              file_url: m.file_url as string,
              alt_text: (m.alt_text as string) ?? null,
              sort_order: (m.sort_order as number) ?? 0,
              embed_url: (m.embed_url as string) ?? null,
              platform: (m.platform as string) ?? null,
              source: (m.source as string) ?? null,
            })));
            if (result.data.limits) {
              setMediaLimits(result.data.limits);
            }
          }
        }
      } catch {
        // Non-blocking
      }
    };
    loadMedia();
  }, [jobId, isOpen]);

  // Set default media limits in create mode based on tier
  useEffect(() => {
    if (jobId || !listingTier) return;
    const imageLimitsByTier: Record<string, number> = {
      essentials: 0, plus: 2, preferred: 10, premium: -1
    };
    const videoLimitsByTier: Record<string, number> = {
      essentials: 0, plus: 1, preferred: 5, premium: -1
    };
    const imgLimit = imageLimitsByTier[listingTier] ?? 0;
    const vidLimit = videoLimitsByTier[listingTier] ?? 0;
    setMediaLimits({
      images: { current: 0, limit: imgLimit === -1 ? 999 : imgLimit, unlimited: imgLimit === -1 },
      videos: { current: 0, limit: vidLimit === -1 ? 999 : vidLimit, unlimited: vidLimit === -1 },
    });
  }, [jobId, listingTier]);

  // Reset media state when modal opens in create mode
  useEffect(() => {
    if (isOpen && !jobId) {
      setMediaItems([]);
    }
  }, [isOpen, jobId]);

  const handleMediaChange = useCallback((updatedMedia: MediaItem[]) => {
    setMediaItems(updatedMedia);
  }, []);

  // Agency business search
  const searchAgencyBusinesses = useCallback(async (query: string) => {
    if (query.length < 2) {
      setAgencySearchResults([]);
      return;
    }
    setAgencySearchLoading(true);
    try {
      const response = await fetch(`/api/listings/search?q=${encodeURIComponent(query)}&status=active&limit=10`, {
        credentials: 'include',
      });
      if (response.ok) {
        const result = await response.json();
        const listings = result.data?.listings || result.data?.items || [];
        setAgencySearchResults(
          listings.map((l: { id: number; name: string }) => ({ id: l.id, name: l.name }))
        );
      }
    } catch {
      // Non-blocking
    } finally {
      setAgencySearchLoading(false);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!formData.title.trim()) {
      setError('Job title is required');
      return;
    }

    if (!formData.description.trim()) {
      setError('Job description is required');
      return;
    }

    if (formData.application_method === ApplicationMethod.EXTERNAL && !formData.external_application_url.trim()) {
      setError('External application URL is required');
      return;
    }

    if (!formData.application_deadline) {
      setError('Application deadline is required');
      return;
    }

    try {
      const submitData: Record<string, unknown> = {
        title: formData.title.trim(),
        employment_type: formData.employment_type,
        description: formData.description.trim(),
        compensation_type: formData.compensation_type,
        work_location_type: formData.work_location_type,
        application_method: formData.application_method
      };

      if (formData.compensation_min) {
        submitData.compensation_min = parseFloat(formData.compensation_min);
      }

      if (formData.compensation_max) {
        submitData.compensation_max = parseFloat(formData.compensation_max);
      }

      if (formData.city) submitData.city = formData.city.trim();
      if (formData.state) submitData.state = formData.state.trim();
      if (formData.external_application_url) submitData.external_application_url = formData.external_application_url.trim();
      if (formData.start_date) submitData.start_date = formData.start_date;
      if (formData.application_deadline) submitData.application_deadline = formData.application_deadline;
      if (formData.status) submitData.status = formData.status;

      // Agency posting
      if (isAgencyPosting && agencyBusinessId) {
        submitData.agency_posting_for_business_id = agencyBusinessId;
      }

      if (!jobId) {
        submitData._pendingMedia = mediaItems;
      }

      await onSubmit(submitData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save job');
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setError(null);
  };

  const handleTemplateSelect = (template: JobPostingTemplate) => {
    setFormData((prev) => ({
      ...prev,
      ...(template.employment_type != null ? { employment_type: template.employment_type } : {}),
      ...(template.description_template != null ? { description: template.description_template } : {}),
      ...(template.compensation_type != null ? { compensation_type: template.compensation_type } : {}),
    }));
    setError(null);
  };

  return (
    <BizModal
      isOpen={isOpen}
      onClose={onClose}
      title={initialData ? 'Edit Job' : 'Post New Job'}
      size="large"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Error Display */}
        {error && (
          <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        {/* Template Selector (Create mode only) */}
        {!initialData && listingId && (
          <div className="pb-4 border-b border-gray-200">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Start from Template
            </label>
            <JobTemplateSelector
              listingId={listingId}
              onSelect={handleTemplateSelect}
              disabled={isSubmitting}
            />
            <p className="text-xs text-gray-500 mt-1">Template will pre-fill fields below. You can edit any field.</p>
          </div>
        )}

        {/* Agency Posting Toggle (Create mode only) */}
        {!initialData && (
          <div className="pb-4 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <input
                id="agency_posting_toggle"
                type="checkbox"
                checked={isAgencyPosting}
                onChange={(e) => {
                  setIsAgencyPosting(e.target.checked);
                  if (!e.target.checked) {
                    setAgencyBusinessId(null);
                    setAgencyBusinessName('');
                    setAgencySearchQuery('');
                    setAgencySearchResults([]);
                  }
                }}
                disabled={isSubmitting}
                className="h-4 w-4 text-[#ed6437] border-gray-300 rounded"
              />
              <label htmlFor="agency_posting_toggle" className="text-sm font-medium text-gray-700">
                Agency Posting — Post this job on behalf of another business
              </label>
            </div>

            {isAgencyPosting && (
              <div className="mt-3">
                {agencyBusinessId ? (
                  <div className="flex items-center gap-2 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                    <span className="text-sm text-orange-800 font-medium">
                      Posting as agency for: {agencyBusinessName}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setAgencyBusinessId(null);
                        setAgencyBusinessName('');
                        setAgencySearchQuery('');
                      }}
                      className="ml-auto text-xs text-orange-600 hover:text-orange-800 underline"
                    >
                      Change
                    </button>
                  </div>
                ) : (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Search for Business
                    </label>
                    <input
                      type="text"
                      value={agencySearchQuery}
                      onChange={(e) => {
                        setAgencySearchQuery(e.target.value);
                        searchAgencyBusinesses(e.target.value);
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#ed6437] focus:border-[#ed6437]"
                      placeholder="Search active businesses..."
                    />
                    {agencySearchLoading && (
                      <p className="text-xs text-gray-500 mt-1">Searching...</p>
                    )}
                    {agencySearchResults.length > 0 && (
                      <div className="mt-1 border border-gray-200 rounded-lg max-h-40 overflow-y-auto">
                        {agencySearchResults.map((biz) => (
                          <button
                            key={biz.id}
                            type="button"
                            onClick={() => {
                              setAgencyBusinessId(biz.id);
                              setAgencyBusinessName(biz.name);
                              setAgencySearchResults([]);
                              setAgencySearchQuery('');
                            }}
                            className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 border-b last:border-b-0"
                          >
                            {biz.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Job Title */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Job Title <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={formData.title}
            onChange={(e) => handleChange('title', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#ed6437] focus:border-[#ed6437]"
            placeholder="e.g. Senior Software Engineer"
            required
          />
        </div>

        {/* Employment Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Employment Type <span className="text-red-500">*</span>
          </label>
          <select
            value={formData.employment_type}
            onChange={(e) => handleChange('employment_type', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#ed6437] focus:border-[#ed6437]"
            required
          >
            <option value={EmploymentType.FULL_TIME}>Full Time</option>
            <option value={EmploymentType.PART_TIME}>Part Time</option>
            <option value={EmploymentType.CONTRACT}>Contract</option>
            <option value={EmploymentType.INTERNSHIP}>Internship</option>
            <option value={EmploymentType.SEASONAL}>Seasonal</option>
            <option value={EmploymentType.TEMPORARY}>Temporary</option>
            <option value={EmploymentType.GIG}>Gig</option>
          </select>
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Job Description <span className="text-red-500">*</span>
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => handleChange('description', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#ed6437] focus:border-[#ed6437]"
            rows={6}
            placeholder="Describe the job responsibilities, requirements, and qualifications..."
            required
          />
        </div>

        {/* Compensation Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Compensation Type <span className="text-red-500">*</span>
          </label>
          <select
            value={formData.compensation_type}
            onChange={(e) => handleChange('compensation_type', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#ed6437] focus:border-[#ed6437]"
            required
          >
            <option value={CompensationType.HOURLY}>Hourly</option>
            <option value={CompensationType.SALARY}>Salary</option>
            <option value={CompensationType.COMMISSION}>Commission</option>
            <option value={CompensationType.TIPS_HOURLY}>Tips + Hourly</option>
            <option value={CompensationType.STIPEND}>Stipend</option>
            <option value={CompensationType.UNPAID}>Unpaid</option>
            <option value={CompensationType.COMPETITIVE}>Competitive</option>
          </select>
        </div>

        {/* Compensation Range */}
        {formData.compensation_type !== CompensationType.UNPAID && formData.compensation_type !== CompensationType.COMPETITIVE && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Min Compensation
              </label>
              <input
                type="number"
                value={formData.compensation_min}
                onChange={(e) => handleChange('compensation_min', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#ed6437] focus:border-[#ed6437]"
                placeholder="0"
                min="0"
                step="0.01"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Max Compensation
              </label>
              <input
                type="number"
                value={formData.compensation_max}
                onChange={(e) => handleChange('compensation_max', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#ed6437] focus:border-[#ed6437]"
                placeholder="0"
                min="0"
                step="0.01"
              />
            </div>
          </div>
        )}

        {/* Work Location Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Work Location Type <span className="text-red-500">*</span>
          </label>
          <select
            value={formData.work_location_type}
            onChange={(e) => handleChange('work_location_type', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#ed6437] focus:border-[#ed6437]"
            required
          >
            <option value={WorkLocationType.ONSITE}>On-site</option>
            <option value={WorkLocationType.REMOTE}>Remote</option>
            <option value={WorkLocationType.HYBRID}>Hybrid</option>
          </select>
        </div>

        {/* Location */}
        {formData.work_location_type !== WorkLocationType.REMOTE && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                City
              </label>
              <input
                type="text"
                value={formData.city}
                onChange={(e) => handleChange('city', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#ed6437] focus:border-[#ed6437]"
                placeholder="e.g. Austin"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                State
              </label>
              <input
                type="text"
                value={formData.state}
                onChange={(e) => handleChange('state', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#ed6437] focus:border-[#ed6437]"
                placeholder="e.g. TX"
                maxLength={2}
              />
            </div>
          </div>
        )}

        {/* Application Method */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Application Method <span className="text-red-500">*</span>
          </label>
          <select
            value={formData.application_method}
            onChange={(e) => handleChange('application_method', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#ed6437] focus:border-[#ed6437]"
            required
          >
            <option value={ApplicationMethod.EXTERNAL}>External Link</option>
            <option value={ApplicationMethod.NATIVE} disabled={!canUseNativeApplication}>
              Native Application {!canUseNativeApplication && '(Preferred/Premium only)'}
            </option>
          </select>
        </div>

        {/* External Application URL */}
        {formData.application_method === ApplicationMethod.EXTERNAL && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Application URL <span className="text-red-500">*</span>
            </label>
            <input
              type="url"
              value={formData.external_application_url}
              onChange={(e) => handleChange('external_application_url', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#ed6437] focus:border-[#ed6437]"
              placeholder="https://example.com/apply"
              required
            />
          </div>
        )}

        {/* Dates */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Start Date
            </label>
            <input
              type="date"
              value={formData.start_date}
              onChange={(e) => handleChange('start_date', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#ed6437] focus:border-[#ed6437]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Application Deadline <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={formData.application_deadline}
              onChange={(e) => handleChange('application_deadline', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#ed6437] focus:border-[#ed6437]"
              required
            />
          </div>
        </div>

        {/* Status (Edit mode only) */}
        {initialData && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              value={formData.status}
              onChange={(e) => handleChange('status', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#ed6437] focus:border-[#ed6437]"
            >
              <option value="draft">Draft</option>
              <option value="active">Active</option>
              <option value="paused">Paused (Hidden from search)</option>
              <option value="filled">Filled</option>
              <option value="archived">Archived (Reusable template)</option>
            </select>
            <p className="text-xs text-gray-500 mt-1">
              {formData.status === 'paused' && 'Job is temporarily hidden from search results'}
              {formData.status === 'filled' && 'All positions have been filled'}
              {formData.status === 'archived' && 'Job is archived and can be reused later'}
            </p>
          </div>
        )}

        {/* Media Upload Section */}
        <div className="pt-4 border-t border-gray-200">
          <MediaUploadSection
            entityType="jobs"
            entityId={jobId ?? null}
            media={mediaItems}
            limits={mediaLimits}
            onMediaChange={handleMediaChange}
            cropperContext="job_banner"
            disabled={isSubmitting}
            label="Job Media"
          />
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-4 py-2 bg-[#ed6437] text-white rounded-lg hover:bg-[#d55a31] transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {isSubmitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Saving...
              </>
            ) : (
              initialData ? 'Update Job' : 'Post Job'
            )}
          </button>
        </div>
      </form>
    </BizModal>
  );
}

export default JobFormModal;
