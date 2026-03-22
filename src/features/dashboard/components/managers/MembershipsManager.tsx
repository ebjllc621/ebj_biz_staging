/**
 * MembershipsManager - Listing Memberships & Accolades Management
 *
 * @description Manage memberships, certifications, accolades, and awards for a listing.
 *   Inline add/edit form (same pattern as MembershipsSection in user profile).
 *   Supports logo via file upload OR URL paste — whichever the user needs.
 *   Data is saved to listing_memberships table and displayed on the public listing page.
 *
 * @component Client Component
 * @tier STANDARD
 * @authority CLAUDE.md - API Standards, Build Map v2.1
 *
 * @reference src/features/profile/components/MembershipsSection.tsx
 *   - Inline add/edit form pattern with cancel/save buttons
 * @reference src/features/listings/components/details/ListingMemberships.tsx
 *   - Public display component that consumes /api/listings/[id]/memberships
 * @reference src/features/dashboard/components/managers/OffersManager.tsx
 *   - File upload pattern: POST /api/media/upload, response = data.file.url
 */
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Plus, X, Edit2, Award, Loader2, AlertCircle, CheckCircle, Upload, Link, Image as ImageIcon } from 'lucide-react';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { useListingContext } from '@features/dashboard/context/ListingContext';
import { fetchCsrfToken, fetchWithCsrf } from '@core/utils/csrf';

// ============================================================================
// TYPES
// ============================================================================

type MembershipType = 'membership' | 'certification' | 'accolade' | 'award';

interface Membership {
  id: number;
  listing_id: number;
  name: string;
  type: MembershipType;
  issuer: string | null;
  issuer_url: string | null;
  issued_date: string | null;
  expiry_date: string | null;
  verified: boolean;
  logo_url: string | null;
  display_order: number;
}

interface MembershipFormData {
  name: string;
  type: MembershipType;
  issuer: string;
  issuer_url: string;
  issued_date: string;
  expiry_date: string;
  logo_url: string;
}

const INITIAL_FORM: MembershipFormData = {
  name: '',
  type: 'membership',
  issuer: '',
  issuer_url: '',
  issued_date: '',
  expiry_date: '',
  logo_url: '',
};

const TYPE_LABELS: Record<MembershipType, string> = {
  membership: 'Membership',
  certification: 'Certification',
  accolade: 'Accolade',
  award: 'Award',
};

const TYPE_COLORS: Record<MembershipType, string> = {
  membership: 'bg-blue-100 text-blue-700',
  certification: 'bg-green-100 text-green-700',
  accolade: 'bg-purple-100 text-purple-700',
  award: 'bg-yellow-100 text-yellow-700',
};

const MAX_MEMBERSHIPS = 20;

// ============================================================================
// LOGO UPLOAD WIDGET
// ============================================================================

interface LogoUploadWidgetProps {
  value: string;
  onChange: (url: string) => void;
  listingId: number;
  disabled?: boolean;
}

function LogoUploadWidget({ value, onChange, listingId, disabled }: LogoUploadWidgetProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [urlInput, setUrlInput] = useState(value);

  // Keep URL input in sync with external value changes (e.g. when editing)
  useEffect(() => {
    setUrlInput(value);
  }, [value]);

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Client-side validation
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml'];
    if (!allowedTypes.includes(file.type)) {
      setUploadError('Only JPG, PNG, WebP, GIF, or SVG images are allowed');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setUploadError('Image must be under 5 MB');
      return;
    }

    setIsUploading(true);
    setUploadError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('entityType', 'listings');
      formData.append('entityId', String(listingId));
      formData.append('mediaType', 'gallery');

      const response = await fetchWithCsrf('/api/media/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const result = await response.json() as { error?: { message?: string } };
        throw new Error(result.error?.message ?? 'Upload failed');
      }

      const result = await response.json() as { data?: { file?: { url?: string } } };
      const uploadedUrl = result.data?.file?.url;
      if (!uploadedUrl) throw new Error('No URL returned from upload');

      onChange(uploadedUrl);
      setUrlInput(uploadedUrl);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setIsUploading(false);
      // Reset file input so same file can be re-selected
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }, [listingId, onChange]);

  const handleUrlCommit = useCallback(() => {
    onChange(urlInput.trim());
  }, [urlInput, onChange]);

  const handleClearLogo = useCallback(() => {
    onChange('');
    setUrlInput('');
    setUploadError(null);
  }, [onChange]);

  return (
    <div className="space-y-2">
      <label className="block text-xs font-medium text-gray-700">
        Logo / Badge / Certificate Image
        <span className="text-gray-400 font-normal ml-1">(optional)</span>
      </label>

      {/* Preview */}
      {value && (
        <div className="flex items-center gap-3 p-2 bg-gray-50 border border-gray-200 rounded-lg">
          <img
            src={value}
            alt="Logo preview"
            className="w-14 h-14 object-contain rounded border border-gray-200 bg-white p-1"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
          <div className="flex-1 min-w-0">
            <p className="text-xs text-gray-500 truncate">{value}</p>
          </div>
          <button
            type="button"
            onClick={handleClearLogo}
            disabled={disabled}
            className="p-1 text-gray-400 hover:text-red-600 transition-colors flex-shrink-0"
            aria-label="Remove logo"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Two input modes side-by-side */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">

        {/* URL paste */}
        <div>
          <div className="flex items-center gap-1 mb-1">
            <Link className="w-3 h-3 text-gray-400" />
            <span className="text-xs text-gray-500">Paste image URL</span>
          </div>
          <div className="flex gap-1">
            <input
              type="url"
              value={urlInput}
              onChange={e => setUrlInput(e.target.value)}
              onBlur={handleUrlCommit}
              onKeyDown={e => e.key === 'Enter' && handleUrlCommit()}
              placeholder="https://example.com/logo.png"
              disabled={disabled || isUploading}
              className="flex-1 min-w-0 rounded-lg border border-gray-300 px-2 py-1.5 text-xs
                         focus:outline-none focus:border-[#ed6437] focus:ring-1 focus:ring-orange-200
                         disabled:bg-gray-100 transition shadow-sm"
            />
            {urlInput !== value && urlInput.trim() && (
              <button
                type="button"
                onClick={handleUrlCommit}
                disabled={disabled}
                className="px-2 py-1.5 bg-[#022641] text-white text-xs rounded-lg hover:bg-[#033a5c] transition-colors"
              >
                Set
              </button>
            )}
          </div>
        </div>

        {/* File upload */}
        <div>
          <div className="flex items-center gap-1 mb-1">
            <Upload className="w-3 h-3 text-gray-400" />
            <span className="text-xs text-gray-500">Or upload a file</span>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml"
            className="hidden"
            onChange={handleFileChange}
            disabled={disabled || isUploading}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled || isUploading}
            className="w-full flex items-center justify-center gap-2 px-3 py-1.5 text-xs
                       border border-dashed border-gray-300 rounded-lg text-gray-500
                       hover:border-[#ed6437] hover:text-[#ed6437] transition-colors
                       disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isUploading ? (
              <>
                <Loader2 className="w-3 h-3 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <ImageIcon className="w-3 h-3" />
                Choose image (JPG, PNG, SVG...)
              </>
            )}
          </button>
        </div>
      </div>

      {uploadError && (
        <p className="text-xs text-red-600 flex items-center gap-1">
          <AlertCircle className="w-3 h-3" />
          {uploadError}
        </p>
      )}
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT CONTENT
// ============================================================================

function MembershipsManagerContent() {
  const { selectedListingId } = useListingContext();

  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<MembershipFormData>(INITIAL_FORM);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // ── Fetch memberships ──────────────────────────────────────────────────────

  const fetchMemberships = useCallback(async () => {
    if (!selectedListingId) return;
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/listings/${selectedListingId}/memberships`, {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch memberships');
      const result = await response.json() as { success: boolean; data: { memberships: Membership[] } };
      if (result.success) {
        setMemberships(result.data.memberships);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load memberships');
    } finally {
      setIsLoading(false);
    }
  }, [selectedListingId]);

  useEffect(() => {
    fetchMemberships();
  }, [fetchMemberships]);

  // ── Form helpers ──────────────────────────────────────────────────────────

  const resetForm = useCallback(() => {
    setFormData(INITIAL_FORM);
    setEditingId(null);
    setShowForm(false);
    setFormError(null);
  }, []);

  const handleEdit = useCallback((m: Membership) => {
    setFormData({
      name: m.name,
      type: m.type,
      issuer: m.issuer ?? '',
      issuer_url: m.issuer_url ?? '',
      issued_date: m.issued_date ?? '',
      expiry_date: m.expiry_date ?? '',
      logo_url: m.logo_url ?? '',
    });
    setEditingId(m.id);
    setShowForm(true);
    setFormError(null);
  }, []);

  // ── Submit (create or update) ──────────────────────────────────────────────

  const handleSubmit = useCallback(async () => {
    if (!selectedListingId) return;

    const name = formData.name.trim();
    if (!name) {
      setFormError('Name is required');
      return;
    }

    setIsSubmitting(true);
    setFormError(null);

    try {
      const csrfToken = await fetchCsrfToken();
      if (!csrfToken) throw new Error('CSRF token unavailable');

      const isEditing = editingId !== null;
      const url = isEditing
        ? `/api/listings/${selectedListingId}/memberships/${editingId}`
        : `/api/listings/${selectedListingId}/memberships`;

      const response = await fetch(url, {
        method: isEditing ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken,
        },
        credentials: 'include',
        body: JSON.stringify({
          name,
          type: formData.type,
          issuer: formData.issuer.trim() || undefined,
          issuer_url: formData.issuer_url.trim() || undefined,
          issued_date: formData.issued_date || undefined,
          expiry_date: formData.expiry_date || undefined,
          logo_url: formData.logo_url.trim() || undefined,
        }),
      });

      if (!response.ok) {
        const result = await response.json() as { error?: { message?: string } };
        throw new Error(result.error?.message ?? 'Failed to save membership');
      }

      await fetchMemberships();
      resetForm();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to save membership');
    } finally {
      setIsSubmitting(false);
    }
  }, [selectedListingId, formData, editingId, fetchMemberships, resetForm]);

  // ── Delete ──────────────────────────────────────────────────────────────

  const handleDelete = useCallback(async (membershipId: number) => {
    if (!selectedListingId) return;

    try {
      const csrfToken = await fetchCsrfToken();
      if (!csrfToken) throw new Error('CSRF token unavailable');

      const response = await fetch(
        `/api/listings/${selectedListingId}/memberships/${membershipId}`,
        {
          method: 'DELETE',
          headers: { 'X-CSRF-Token': csrfToken },
          credentials: 'include',
        }
      );

      if (!response.ok) {
        const result = await response.json() as { error?: { message?: string } };
        setError(result.error?.message ?? 'Failed to delete membership');
        return;
      }

      setMemberships(prev => prev.filter(m => m.id !== membershipId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete membership');
    }
  }, [selectedListingId]);

  // ── Render ─────────────────────────────────────────────────────────────────

  if (!selectedListingId) {
    return <p className="text-gray-500 text-sm py-4">No listing selected.</p>;
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 text-[#ed6437] animate-spin" />
      </div>
    );
  }

  const canAddMore = memberships.length < MAX_MEMBERSHIPS;

  return (
    <div className="space-y-6">

      {/* Section header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Award className="w-5 h-5 text-[#022641]" />
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Memberships & Accolades</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              Certifications, awards, and professional memberships shown on your listing
            </p>
          </div>
        </div>
        {!showForm && canAddMore && (
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-[#ed6437] text-white text-sm rounded-lg
                       hover:bg-[#d55a31] transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Entry
          </button>
        )}
      </div>

      {/* Global error */}
      {error && (
        <div className="bg-red-50 text-red-700 p-4 rounded-lg flex items-center gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
          <button
            onClick={() => setError(null)}
            className="ml-auto text-sm hover:underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Add / Edit inline form */}
      {showForm && (
        <div className="p-5 bg-gray-50 border border-gray-200 rounded-lg space-y-4">
          <h3 className="text-sm font-semibold text-[#022641]">
            {editingId ? 'Edit Entry' : 'Add New Entry'}
          </h3>

          {/* Row 1: Name + Type */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., Better Business Bureau Member"
                maxLength={255}
                disabled={isSubmitting}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm
                           focus:outline-none focus:border-[#ed6437] focus:ring-2 focus:ring-orange-200
                           disabled:bg-gray-100 transition shadow-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Type</label>
              <select
                value={formData.type}
                onChange={e => setFormData(prev => ({ ...prev, type: e.target.value as MembershipType }))}
                disabled={isSubmitting}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm
                           focus:outline-none focus:border-[#ed6437] focus:ring-2 focus:ring-orange-200
                           disabled:bg-gray-100 transition shadow-sm bg-white"
              >
                {Object.entries(TYPE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Row 2: Issuer + URL */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Issuing Organization
              </label>
              <input
                type="text"
                value={formData.issuer}
                onChange={e => setFormData(prev => ({ ...prev, issuer: e.target.value }))}
                placeholder="e.g., American Chamber of Commerce"
                maxLength={255}
                disabled={isSubmitting}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm
                           focus:outline-none focus:border-[#ed6437] focus:ring-2 focus:ring-orange-200
                           disabled:bg-gray-100 transition shadow-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Organization URL
              </label>
              <input
                type="url"
                value={formData.issuer_url}
                onChange={e => setFormData(prev => ({ ...prev, issuer_url: e.target.value }))}
                placeholder="https://example.com"
                disabled={isSubmitting}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm
                           focus:outline-none focus:border-[#ed6437] focus:ring-2 focus:ring-orange-200
                           disabled:bg-gray-100 transition shadow-sm"
              />
            </div>
          </div>

          {/* Row 3: Dates */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Issue Date <span className="text-gray-400">(optional)</span>
              </label>
              <input
                type="date"
                value={formData.issued_date}
                onChange={e => setFormData(prev => ({ ...prev, issued_date: e.target.value }))}
                disabled={isSubmitting}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm
                           focus:outline-none focus:border-[#ed6437] focus:ring-2 focus:ring-orange-200
                           disabled:bg-gray-100 transition shadow-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Expiry Date <span className="text-gray-400">(optional — leave blank if none)</span>
              </label>
              <input
                type="date"
                value={formData.expiry_date}
                onChange={e => setFormData(prev => ({ ...prev, expiry_date: e.target.value }))}
                disabled={isSubmitting}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm
                           focus:outline-none focus:border-[#ed6437] focus:ring-2 focus:ring-orange-200
                           disabled:bg-gray-100 transition shadow-sm"
              />
            </div>
          </div>

          {/* Row 4: Logo / Image */}
          <div className="border-t border-gray-200 pt-4">
            <LogoUploadWidget
              value={formData.logo_url}
              onChange={url => setFormData(prev => ({ ...prev, logo_url: url }))}
              listingId={selectedListingId}
              disabled={isSubmitting}
            />
          </div>

          {/* Form error */}
          {formError && (
            <p className="text-xs text-red-600 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              {formError}
            </p>
          )}

          {/* Form actions */}
          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={resetForm}
              disabled={isSubmitting}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting || !formData.name.trim()}
              className="px-5 py-2 bg-[#022641] text-white text-sm rounded-lg
                         hover:bg-[#033a5c] transition-colors disabled:opacity-50
                         flex items-center gap-2"
            >
              {isSubmitting && <Loader2 className="w-3 h-3 animate-spin" />}
              {editingId ? 'Update' : 'Add'} Entry
            </button>
          </div>
        </div>
      )}

      {/* Memberships list */}
      {memberships.length === 0 && !showForm ? (
        <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-lg">
          <Award className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 text-sm mb-4">
            No memberships or accolades added yet.
          </p>
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#ed6437] text-white text-sm rounded-lg
                       hover:bg-[#d55a31] transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add First Entry
          </button>
        </div>
      ) : (
        memberships.length > 0 && (
          <div className="space-y-3">
            {memberships.map(membership => (
              <div
                key={membership.id}
                className="p-4 bg-white border border-gray-200 rounded-lg flex items-start gap-4 hover:border-gray-300 transition-colors"
              >
                {/* Logo thumbnail */}
                {membership.logo_url ? (
                  <img
                    src={membership.logo_url}
                    alt={`${membership.name} logo`}
                    className="w-12 h-12 object-contain rounded border border-gray-200 bg-white p-1 flex-shrink-0"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                ) : (
                  <div className="w-12 h-12 rounded bg-gray-100 flex items-center justify-center flex-shrink-0">
                    <Award className="w-6 h-6 text-gray-300" />
                  </div>
                )}

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-[#022641] text-sm">{membership.name}</span>
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${TYPE_COLORS[membership.type]}`}>
                      {TYPE_LABELS[membership.type]}
                    </span>
                    {membership.verified && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                        <CheckCircle className="w-3 h-3" />
                        Verified
                      </span>
                    )}
                  </div>

                  {membership.issuer && (
                    <div className="mt-1 text-xs text-gray-500">
                      {membership.issuer_url ? (
                        <a
                          href={membership.issuer_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[#ed6437] hover:underline"
                        >
                          {membership.issuer}
                        </a>
                      ) : (
                        membership.issuer
                      )}
                    </div>
                  )}

                  {(membership.issued_date || membership.expiry_date) && (
                    <div className="mt-1 text-xs text-gray-400 flex gap-3">
                      {membership.issued_date && (
                        <span>Issued: {new Date(membership.issued_date).toLocaleDateString()}</span>
                      )}
                      {membership.expiry_date && (
                        <span>Expires: {new Date(membership.expiry_date).toLocaleDateString()}</span>
                      )}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => handleEdit(membership)}
                    disabled={isSubmitting}
                    aria-label={`Edit ${membership.name}`}
                    className="p-1.5 text-gray-400 hover:text-[#022641] transition-colors rounded"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(membership.id)}
                    disabled={isSubmitting}
                    aria-label={`Delete ${membership.name}`}
                    className="p-1.5 text-gray-400 hover:text-red-600 transition-colors rounded"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* Count footer */}
      {memberships.length > 0 && (
        <p className="text-xs text-gray-400 text-right">
          {memberships.length} of {MAX_MEMBERSHIPS} entries used
        </p>
      )}
    </div>
  );
}

// ============================================================================
// EXPORTED COMPONENT (with ErrorBoundary)
// ============================================================================

export function MembershipsManager() {
  return (
    <ErrorBoundary componentName="MembershipsManager">
      <MembershipsManagerContent />
    </ErrorBoundary>
  );
}

export default MembershipsManager;
