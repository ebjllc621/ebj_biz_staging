/**
 * JobTemplateSelector - Template selection dropdown for job creation
 *
 * @component Client Component
 * @tier SIMPLE
 * @phase Jobs Phase 4 - Template Integration & Cross-Feature Linking
 */
'use client';

import { useState, useEffect } from 'react';
import { FileText, ChevronDown, Loader2 } from 'lucide-react';
import type { JobPostingTemplate } from '@features/jobs/types';

interface JobTemplateSelectorProps {
  listingId: number;
  onSelect: (template: JobPostingTemplate) => void;
  disabled?: boolean;
}

export function JobTemplateSelector({ listingId, onSelect, disabled }: JobTemplateSelectorProps) {
  const [systemTemplates, setSystemTemplates] = useState<JobPostingTemplate[]>([]);
  const [businessTemplates, setBusinessTemplates] = useState<JobPostingTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<JobPostingTemplate | null>(null);

  useEffect(() => {
    if (listingId) {
      fetchTemplates();
    }
  }, [listingId]);

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/jobs/templates?business_id=${listingId}`, {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        setSystemTemplates(data.data?.system_templates || []);
        setBusinessTemplates(data.data?.business_templates || []);
      }
    } catch (error) {
      console.error('Failed to fetch job templates:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (template: JobPostingTemplate) => {
    setSelectedTemplate(template);
    setIsOpen(false);
    onSelect(template);
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-gray-500">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span>Loading templates...</span>
      </div>
    );
  }

  if (systemTemplates.length === 0 && businessTemplates.length === 0) {
    return null;
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled}
        className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <FileText className="w-4 h-4 text-gray-500" />
        <span className="text-gray-700">
          {selectedTemplate ? selectedTemplate.template_name : 'Load from template'}
        </span>
        <ChevronDown className="w-4 h-4 text-gray-400" />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
          <div className="absolute top-full left-0 mt-1 w-72 bg-white rounded-lg shadow-lg border border-gray-200 z-20">
            <div className="py-1 max-h-64 overflow-y-auto">
              {systemTemplates.length > 0 && (
                <>
                  <div className="px-3 py-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wider bg-gray-50 border-b border-gray-100">
                    System Templates
                  </div>
                  {systemTemplates.map((template) => (
                    <button
                      key={template.id}
                      type="button"
                      onClick={() => handleSelect(template)}
                      className="w-full px-4 py-2 text-left hover:bg-gray-100 flex items-start gap-3"
                    >
                      <FileText className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="font-medium text-gray-900 truncate">{template.template_name}</p>
                        <p className="text-xs text-gray-500">
                          {template.template_category} &bull; {template.employment_type || 'Any type'}
                        </p>
                      </div>
                    </button>
                  ))}
                </>
              )}

              {businessTemplates.length > 0 && (
                <>
                  <div className="px-3 py-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wider bg-gray-50 border-b border-gray-100">
                    My Templates
                  </div>
                  {businessTemplates.map((template) => (
                    <button
                      key={template.id}
                      type="button"
                      onClick={() => handleSelect(template)}
                      className="w-full px-4 py-2 text-left hover:bg-gray-100 flex items-start gap-3"
                    >
                      <FileText className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="font-medium text-gray-900 truncate">{template.template_name}</p>
                        <p className="text-xs text-gray-500">
                          {template.template_category} &bull; {template.employment_type || 'Any type'}
                        </p>
                      </div>
                    </button>
                  ))}
                </>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
