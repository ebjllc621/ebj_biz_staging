'use client';

/**
 * Employer Branding Dashboard Page
 *
 * Business dashboard page for managing "Work With Us" branding section
 *
 * @authority docs/pages/layouts/job_ops/build/phases/PHASE_4_BRAIN_PLAN.md
 * @phase Jobs Phase 4 - Platform Growth & Future Features
 */

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useAuth } from '@core/hooks/useAuth';
import { EmployerBrandingEditor } from '@features/jobs/components/EmployerBrandingEditor';
import { EmployerBrandingSection } from '@features/jobs/components/EmployerBrandingSection';
import { fetchWithCsrf } from '@core/utils/csrf';
import type { EmployerBranding } from '@features/jobs/types';

export default function EmployerBrandingPage() {
  const params = useParams();
  const listingId = parseInt(params.listingId as string, 10);
  const { user, loading: authLoading } = useAuth();

  const [branding, setBranding] = useState<EmployerBranding | null>(null);
  const [loading, setLoading] = useState(true);
  const [showEditor, setShowEditor] = useState(false);

  useEffect(() => {
    async function fetchBranding() {
      if (!listingId) return;
      try {
        const response = await fetchWithCsrf(`/api/listings/${listingId}/jobs/branding`);
        const result = await response.json();
        if (result.data?.branding) {
          setBranding(result.data.branding);
        }
      } catch {
        // No branding exists yet
      } finally {
        setLoading(false);
      }
    }
    fetchBranding();
  }, [listingId]);

  if (authLoading || loading) {
    return (
      <div className="container mx-auto py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center py-12">
          <h2 className="text-xl font-semibold text-gray-600">Please log in to manage employer branding</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Employer Branding</h1>
          <p className="text-gray-600 mt-2">
            Create a &quot;Work With Us&quot; section to attract top talent
          </p>
        </div>
        <button
          onClick={() => setShowEditor(true)}
          className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
        >
          {branding ? 'Edit Branding' : 'Create Branding'}
        </button>
      </div>

      {/* Preview Section */}
      {branding ? (
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-4">Preview</h2>
          <div className="border rounded-lg p-4 bg-gray-50">
            <EmployerBrandingSection listingId={listingId} />
          </div>
        </div>
      ) : (
        <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-12 text-center">
          <h3 className="text-lg font-medium text-gray-700 mb-2">No Branding Created Yet</h3>
          <p className="text-gray-500 mb-4">
            Create an employer branding section to showcase your company culture and attract candidates
          </p>
          <button
            onClick={() => setShowEditor(true)}
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
          >
            Create Branding
          </button>
        </div>
      )}

      {/* Editor Modal */}
      <EmployerBrandingEditor
        isOpen={showEditor}
        onClose={() => setShowEditor(false)}
        listingId={listingId}
        initialBranding={branding || undefined}
        onSave={(saved) => {
          setBranding(saved);
          setShowEditor(false);
        }}
      />
    </div>
  );
}
