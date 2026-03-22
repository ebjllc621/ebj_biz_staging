/**
 * TemplateSelector - Dropdown for selecting connection request templates
 *
 * @component Client Component
 * @tier SIMPLE
 * @phase Connect Phase 5
 * @generated ComponentBuilder v3.0
 * @governance Build Map v2.1 ENHANCED
 * @authority .cursor/rules/admin-build-map-v2.1.mdc
 * @authority .cursor/rules/react18-nextjs14-governance.mdc
 *
 * Dropdown selector for connection request templates
 * Loads templates on mount, shows loading skeleton
 * Calls onSelect when template is chosen
 *
 * @see docs/pages/layouts/home/user/phases/troubleshooting/connect/fixes/connectP2/phases/PHASE_5_ADVANCED_FEATURES_BRAIN_PLAN.md
 */
'use client';

import { useState, useEffect } from 'react';
import { FileText, Loader2 } from 'lucide-react';
import type { ConnectionTemplate } from '../types';

interface TemplateSelectorProps {
  /** Callback when a template is selected */
  onSelect: (template: ConnectionTemplate) => void;
  /** Currently selected template ID */
  selectedTemplateId?: number;
}

/**
 * TemplateSelector component
 * SIMPLE tier - no ErrorBoundary required
 */
export function TemplateSelector({
  onSelect,
  selectedTemplateId
}: TemplateSelectorProps) {
  const [templates, setTemplates] = useState<ConnectionTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/users/connections/templates', {
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to fetch templates');
      }

      const data = await response.json();
      setTemplates(data.templates || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const handleTemplateChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const templateId = parseInt(e.target.value, 10);
    const template = templates.find(t => t.id === templateId);
    if (template) {
      onSelect(template);
    }
  };

  // Loading skeleton
  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-32 mb-2" />
        <div className="h-10 bg-gray-200 rounded" />
      </div>
    );
  }

  // No templates available - return null
  if (templates.length === 0) {
    return null;
  }

  // Error state (don't block the form, just show error)
  if (error) {
    return (
      <div className="text-sm text-red-600">
        Failed to load templates
      </div>
    );
  }

  return (
    <div>
      <label htmlFor="template-select" className="block text-sm font-medium text-gray-700 mb-2">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4" />
          <span>Use a Template (Optional)</span>
        </div>
      </label>
      <select
        id="template-select"
        value={selectedTemplateId || ''}
        onChange={handleTemplateChange}
        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#ed6437] focus:border-[#ed6437] bg-white"
      >
        <option value="">None - Write your own message</option>
        {templates.map((template) => (
          <option key={template.id} value={template.id}>
            {template.name}
            {template.is_default ? ' (Default)' : ''}
            {template.usage_count > 0 ? ` (Used ${template.usage_count}x)` : ''}
          </option>
        ))}
      </select>
      {selectedTemplateId && (
        <p className="text-xs text-gray-500 mt-1">
          Template selected. You can still edit the message below.
        </p>
      )}
    </div>
  );
}

export default TemplateSelector;
