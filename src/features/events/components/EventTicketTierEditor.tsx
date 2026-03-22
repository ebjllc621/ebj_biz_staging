/**
 * EventTicketTierEditor - Multi-tier ticket management for EventFormModal
 *
 * @component Client Component
 * @tier STANDARD
 * @phase Phase 5A - Native Ticketing
 * @governance Build Map v2.1 ENHANCED
 */
'use client';

import { useState, useEffect } from 'react';
import { Plus, Trash2, Loader2 } from 'lucide-react';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';

export interface TicketTierFormData {
  id?: number;
  ticket_name: string;
  ticket_price: number;
  quantity_total: number;
}

interface EventTicketTierEditorProps {
  eventId?: number;
  maxTiers: number;
  tiers: TicketTierFormData[];
  onChange: (_tiers: TicketTierFormData[]) => void;
  disabled?: boolean;
}

function EventTicketTierEditorInner({
  eventId,
  maxTiers,
  tiers,
  onChange,
  disabled = false,
}: EventTicketTierEditorProps) {
  const [isLoadingExisting, setIsLoadingExisting] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Load existing tiers for edit mode
  useEffect(() => {
    if (!eventId || tiers.length > 0) return;

    const fetchExistingTiers = async () => {
      try {
        setIsLoadingExisting(true);
        setLoadError(null);
        const res = await fetch(`/api/events/${eventId}/tickets`, {
          credentials: 'include',
        });
        if (!res.ok) return;
        const data = await res.json();
        const existingTiers = (data.data?.tickets || []).map((t: {
          id: number;
          ticket_name: string;
          ticket_price: number;
          quantity_total: number;
        }) => ({
          id: t.id,
          ticket_name: t.ticket_name,
          ticket_price: t.ticket_price,
          quantity_total: t.quantity_total,
        }));
        if (existingTiers.length > 0) {
          onChange(existingTiers);
        }
      } catch (err) {
        setLoadError(err instanceof Error ? err.message : 'Failed to load existing tiers');
      } finally {
        setIsLoadingExisting(false);
      }
    };

    fetchExistingTiers();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]);

  const handleAddTier = () => {
    if (tiers.length >= maxTiers) return;
    onChange([
      ...tiers,
      { ticket_name: '', ticket_price: 0, quantity_total: 50 },
    ]);
  };

  const handleRemoveTier = (index: number) => {
    onChange(tiers.filter((_, i) => i !== index));
  };

  const handleTierChange = (index: number, field: keyof TicketTierFormData, value: string | number) => {
    const updated = [...tiers];
    const current = updated[index];
    if (!current) return;
    updated[index] = {
      ...current,
      [field]: field === 'ticket_name' ? value : Number(value),
    };
    onChange(updated);
  };

  if (isLoadingExisting) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-500 py-2">
        <Loader2 className="w-4 h-4 animate-spin" />
        Loading existing ticket tiers...
      </div>
    );
  }

  if (loadError) {
    return (
      <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">{loadError}</p>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-gray-700">
          Ticket Tiers ({tiers.length}/{maxTiers})
        </p>
        {tiers.length < maxTiers && (
          <button
            type="button"
            onClick={handleAddTier}
            disabled={disabled}
            className="inline-flex items-center gap-1 text-sm text-[#ed6437] hover:text-[#d55a30] font-medium disabled:opacity-50"
          >
            <Plus className="w-4 h-4" />
            Add Tier
          </button>
        )}
      </div>

      {tiers.length === 0 && (
        <div className="text-center py-4 bg-gray-50 rounded-lg border border-dashed border-gray-300">
          <p className="text-sm text-gray-500">No ticket tiers yet.</p>
          <button
            type="button"
            onClick={handleAddTier}
            disabled={disabled}
            className="mt-2 text-sm text-[#ed6437] hover:text-[#d55a30] font-medium"
          >
            Add your first ticket tier
          </button>
        </div>
      )}

      {tiers.map((tier, index) => (
        <div
          key={tier.id ?? `new-${index}`}
          className="p-3 border border-gray-200 rounded-lg bg-white space-y-3"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase">
              Tier {index + 1} {tier.id ? `(#${tier.id})` : '(new)'}
            </span>
            <button
              type="button"
              onClick={() => handleRemoveTier(index)}
              disabled={disabled}
              className="text-gray-400 hover:text-red-500 transition-colors disabled:opacity-50"
              title="Remove tier"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Tier Name
              </label>
              <input
                type="text"
                value={tier.ticket_name}
                onChange={(e) => handleTierChange(index, 'ticket_name', e.target.value)}
                disabled={disabled}
                className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#ed6437] focus:border-transparent"
                placeholder="e.g., General Admission"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Price ($)
              </label>
              <input
                type="number"
                value={tier.ticket_price}
                onChange={(e) => handleTierChange(index, 'ticket_price', e.target.value)}
                disabled={disabled}
                className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#ed6437] focus:border-transparent"
                placeholder="0.00"
                step="0.01"
                min="0"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Quantity
              </label>
              <input
                type="number"
                value={tier.quantity_total}
                onChange={(e) => handleTierChange(index, 'quantity_total', e.target.value)}
                disabled={disabled}
                className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#ed6437] focus:border-transparent"
                placeholder="50"
                min="1"
              />
            </div>
          </div>
        </div>
      ))}

      {tiers.length >= maxTiers && (
        <p className="text-xs text-gray-500 text-center">
          Maximum of {maxTiers} ticket tiers reached for your plan.
        </p>
      )}
    </div>
  );
}

export function EventTicketTierEditor(props: EventTicketTierEditorProps) {
  return (
    <ErrorBoundary componentName="EventTicketTierEditor">
      <EventTicketTierEditorInner {...props} />
    </ErrorBoundary>
  );
}

export default EventTicketTierEditor;
