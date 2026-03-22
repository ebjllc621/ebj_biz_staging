'use client';

import { Eye, Pencil } from 'lucide-react';
import { ListingViewMode } from '@features/listings/types/listing-section-layout';

export interface ListingViewModeToggleProps {
  viewMode: ListingViewMode;
  onViewModeChange: (mode: ListingViewMode) => void;
  isOwner: boolean;
  isAdmin?: boolean;
  listingName?: string;
}

export function ListingViewModeToggle({
  viewMode,
  onViewModeChange,
  isOwner,
  isAdmin = false,
  listingName = 'listing'
}: ListingViewModeToggleProps) {
  const isEditView = viewMode === 'edit';
  const isPublishedView = viewMode === 'published';

  const getContextMessage = (): string => {
    if (isPublishedView) {
      if (isAdmin && !isOwner) {
        return `Viewing as a public visitor would see ${listingName}.`;
      }
      return `This is how ${listingName} appears to public visitors.`;
    }
    if (isAdmin && !isOwner) {
      return 'You are viewing with admin editing capabilities.';
    }
    return `You can edit ${listingName} in this view.`;
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
            <Eye className="w-4 h-4" />
            <span>Viewing listing as:</span>
          </div>
          <div className="flex items-center gap-1 p-1 rounded-lg bg-gray-100">
            <button
              onClick={() => onViewModeChange('edit')}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all
                ${isEditView ? 'bg-[#022641] text-white shadow-sm' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200'}`}
              aria-pressed={isEditView}
            >
              <Pencil className="w-4 h-4" />
              <span>Edit View</span>
            </button>
            <button
              onClick={() => onViewModeChange('published')}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all
                ${isPublishedView ? 'bg-[#022641] text-white shadow-sm' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200'}`}
              aria-pressed={isPublishedView}
            >
              <Eye className="w-4 h-4" />
              <span>Published View</span>
            </button>
          </div>
        </div>
        <p className="text-sm text-gray-600 italic">{getContextMessage()}</p>
      </div>
    </div>
  );
}
