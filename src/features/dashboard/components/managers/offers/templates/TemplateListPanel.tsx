/**
 * TemplateListPanel - Panel showing list of saved templates
 *
 * @component Client Component
 * @tier STANDARD
 * @phase Phase 4.5 - Deferred Items
 * @generated DNA v11.4.0
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  FileText,
  Trash2,
  Calendar,
  MoreVertical,
  Loader2,
  RefreshCw,
  Edit,
} from 'lucide-react';
import type { OfferTemplate } from '@features/offers/types';

interface TemplateListPanelProps {
  listingId: number;
  onSelect?: (template: OfferTemplate) => void;
  onSchedule?: (template: OfferTemplate) => void;
}

export function TemplateListPanel({
  listingId,
  onSelect,
  onSchedule,
}: TemplateListPanelProps) {
  const [templates, setTemplates] = useState<OfferTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);

  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/listings/${listingId}/templates`, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch templates');
      }

      const data = await response.json();
      setTemplates(data.templates || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [listingId]);

  useEffect(() => {
    if (listingId) {
      fetchTemplates();
    }
  }, [listingId, fetchTemplates]);

  const handleDelete = async (templateId: number) => {
    setDeletingId(templateId);
    setOpenMenuId(null);

    try {
      const response = await fetch(`/api/templates/${templateId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to delete template');
      }

      setTemplates((prev) => prev.filter((t) => t.id !== templateId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete');
    } finally {
      setDeletingId(null);
    }
  };

  const getRecurrenceLabel = (type: string, days?: number[] | null): string => {
    if (type === 'none') return 'One-time';
    if (type === 'daily') return 'Daily';
    if (type === 'weekly') {
      if (days && days.length > 0) {
        const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        return `Weekly (${days.map((d) => dayNames[d]).join(', ')})`;
      }
      return 'Weekly';
    }
    if (type === 'monthly') return 'Monthly';
    if (type === 'yearly') return 'Yearly';
    return type;
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Loader2 className="w-8 h-8 text-purple-600 animate-spin mb-4" />
        <p className="text-gray-600">Loading templates...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600 mb-4">{error}</p>
        <button
          onClick={fetchTemplates}
          className="inline-flex items-center gap-2 px-4 py-2 text-purple-600 hover:bg-purple-50 rounded-lg"
        >
          <RefreshCw className="w-4 h-4" />
          Try Again
        </button>
      </div>
    );
  }

  if (templates.length === 0) {
    return (
      <div className="text-center py-12">
        <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-700 mb-2">No Templates Yet</h3>
        <p className="text-gray-500 text-sm">
          Save an offer as a template to reuse it later.
        </p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-gray-200">
      {templates.map((template) => (
        <div
          key={template.id}
          className={`p-4 hover:bg-gray-50 transition-colors ${
            deletingId === template.id ? 'opacity-50' : ''
          }`}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3 flex-1 min-w-0">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <FileText className="w-5 h-5 text-purple-600" />
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="font-medium text-gray-900 truncate">{template.name}</h4>
                <p className="text-sm text-gray-500">
                  {template.template_data.offer_type} • {getRecurrenceLabel(template.recurrence_type, template.recurrence_days)}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  Created {new Date(template.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>

            <div className="relative">
              <button
                onClick={() => setOpenMenuId(openMenuId === template.id ? null : template.id)}
                className="p-2 hover:bg-gray-200 rounded-lg"
                disabled={deletingId === template.id}
              >
                <MoreVertical className="w-4 h-4 text-gray-500" />
              </button>

              {openMenuId === template.id && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setOpenMenuId(null)}
                  />
                  <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-20 py-1">
                    {onSelect && (
                      <button
                        onClick={() => {
                          setOpenMenuId(null);
                          onSelect(template);
                        }}
                        className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2"
                      >
                        <Edit className="w-4 h-4" />
                        Use Template
                      </button>
                    )}
                    {onSchedule && template.recurrence_type !== 'none' && (
                      <button
                        onClick={() => {
                          setOpenMenuId(null);
                          onSchedule(template);
                        }}
                        className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2"
                      >
                        <Calendar className="w-4 h-4" />
                        Schedule
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(template.id)}
                      className="w-full px-4 py-2 text-left text-sm hover:bg-red-50 text-red-600 flex items-center gap-2"
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
