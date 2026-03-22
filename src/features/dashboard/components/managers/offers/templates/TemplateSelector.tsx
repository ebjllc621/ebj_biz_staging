/**
 * TemplateSelector - Dropdown to select offer template
 *
 * @component Client Component
 * @tier STANDARD
 * @phase Phase 4.5 - Deferred Items
 * @generated DNA v11.4.0
 */

'use client';

import { useState, useEffect } from 'react';
import { FileText, ChevronDown, Loader2 } from 'lucide-react';
import type { OfferTemplate } from '@features/offers/types';

interface TemplateSelectorProps {
  listingId: number;
  onSelect: (template: OfferTemplate) => void;
  disabled?: boolean;
}

export function TemplateSelector({ listingId, onSelect, disabled }: TemplateSelectorProps) {
  const [templates, setTemplates] = useState<OfferTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<OfferTemplate | null>(null);

  useEffect(() => {
    if (listingId) {
      fetchTemplates();
    }
  }, [listingId]);

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/listings/${listingId}/templates`, {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        setTemplates(data.templates || []);
      }
    } catch (error) {
      console.error('Failed to fetch templates:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (template: OfferTemplate) => {
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

  if (templates.length === 0) {
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
          {selectedTemplate ? selectedTemplate.name : 'Load from template'}
        </span>
        <ChevronDown className="w-4 h-4 text-gray-400" />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute top-full left-0 mt-1 w-64 bg-white rounded-lg shadow-lg border border-gray-200 z-20">
            <div className="py-1 max-h-60 overflow-y-auto">
              {templates.map((template) => (
                <button
                  key={template.id}
                  type="button"
                  onClick={() => handleSelect(template)}
                  className="w-full px-4 py-2 text-left hover:bg-gray-100 flex items-start gap-3"
                >
                  <FileText className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="font-medium text-gray-900 truncate">{template.name}</p>
                    <p className="text-xs text-gray-500">
                      {template.template_data.offer_type} •
                      {template.recurrence_type !== 'none' && ` ${template.recurrence_type}`}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
