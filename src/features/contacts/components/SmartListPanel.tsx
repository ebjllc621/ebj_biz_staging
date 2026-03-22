/**
 * SmartListPanel - Smart list sidebar panel
 *
 * @component Client Component
 * @tier STANDARD
 * @phase Contacts Phase E
 * @generated ComponentBuilder v3.0
 * @governance Build Map v2.1 ENHANCED
 * @authority .cursor/rules/admin-build-map-v2.1.mdc
 * @authority .cursor/rules/react18-nextjs14-governance.mdc
 *
 * Displays sidebar panel with smart lists (system + user-created)
 * Allows creating new smart lists and selecting active list
 *
 * @see docs/pages/layouts/home/user/user_dash/contacts/phases/PHASE_E_ADVANCED_FEATURES_BRAIN_PLAN.md
 */
'use client';

import { useState, useEffect } from 'react';
import { List, Plus, AlertCircle, Clock, UserPlus, UserX, Star, Loader2 } from 'lucide-react';
import type { SmartList } from '../types';

interface SmartListPanelProps {
  /** Currently selected smart list ID (0 for system lists) */
  selectedListId: number | null;
  /** Callback when smart list is selected */
  onSelectList: (list: SmartList | null) => void;
  /** Callback to open create smart list modal */
  onCreateList: () => void;
}

/**
 * Get Lucide icon component by name
 */
function getIcon(iconName: string): any {
  const icons: Record<string, any> = {
    List,
    AlertCircle,
    Clock,
    UserPlus,
    UserX,
    Star
  };
  return icons[iconName] ?? List;
}

/**
 * Get Tailwind color classes by color name
 */
function getColorClasses(color: string): { bg: string; text: string; border: string } {
  const defaultColor = { bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-200' };
  const colors: Record<string, { bg: string; text: string; border: string }> = {
    red: { bg: 'bg-red-50', text: 'text-red-600', border: 'border-red-200' },
    orange: { bg: 'bg-orange-50', text: 'text-orange-600', border: 'border-orange-200' },
    yellow: { bg: 'bg-yellow-50', text: 'text-yellow-600', border: 'border-yellow-200' },
    green: { bg: 'bg-green-50', text: 'text-green-600', border: 'border-green-200' },
    blue: defaultColor,
    purple: { bg: 'bg-purple-50', text: 'text-purple-600', border: 'border-purple-200' },
    gray: { bg: 'bg-gray-50', text: 'text-gray-600', border: 'border-gray-200' }
  };
  return colors[color] || defaultColor;
}

/**
 * SmartListPanel component
 */
export function SmartListPanel({
  selectedListId,
  onSelectList,
  onCreateList
}: SmartListPanelProps) {
  const [smartLists, setSmartLists] = useState<SmartList[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch smart lists
  useEffect(() => {
    fetchSmartLists();
  }, []);

  const fetchSmartLists = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/contacts/smart-lists', {
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to fetch smart lists');
      }

      const data = await response.json();
      setSmartLists(data.smart_lists || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectList = (list: SmartList) => {
    onSelectList(list);
  };

  const handleClearSelection = () => {
    onSelectList(null);
  };

  // Separate system and user lists
  const systemLists = smartLists.filter(l => l.is_system);
  const userLists = smartLists.filter(l => !l.is_system);

  if (loading) {
    return (
      <div className="w-64 border-r border-gray-200 bg-gray-50 p-4">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 text-gray-600 animate-spin" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-64 border-r border-gray-200 bg-gray-50 p-4">
        <div className="text-sm text-red-600">{error}</div>
      </div>
    );
  }

  return (
    <div className="w-64 border-r border-gray-200 bg-gray-50 p-4 overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900">Smart Lists</h3>
        <button
          onClick={onCreateList}
          className="p-1 rounded-md hover:bg-gray-200 transition-colors"
          aria-label="Create smart list"
        >
          <Plus className="w-5 h-5 text-gray-600" />
        </button>
      </div>

      {/* All Contacts */}
      <button
        onClick={handleClearSelection}
        className={`
          w-full flex items-center gap-3 px-3 py-2 rounded-md mb-2
          transition-colors
          ${selectedListId === null ? 'bg-blue-50 text-blue-600' : 'hover:bg-gray-100 text-gray-700'}
        `}
      >
        <List className="w-5 h-5" />
        <span className="text-sm font-medium">All Contacts</span>
      </button>

      {/* System Lists */}
      {systemLists.length > 0 && (
        <div className="mb-4">
          <div className="text-xs font-semibold text-gray-500 uppercase mb-2 px-3">
            Quick Filters
          </div>
          <div className="space-y-1">
            {systemLists.map((list) => {
              const Icon = getIcon(list.icon);
              const colors = getColorClasses(list.color);
              const isSelected = selectedListId === list.id;

              return (
                <button
                  key={list.id}
                  onClick={() => handleSelectList(list)}
                  className={`
                    w-full flex items-center gap-3 px-3 py-2 rounded-md
                    transition-colors
                    ${isSelected ? `${colors.bg} ${colors.text} border ${colors.border}` : 'hover:bg-gray-100 text-gray-700'}
                  `}
                >
                  <Icon className="w-5 h-5 flex-shrink-0" />
                  <div className="flex-1 text-left">
                    <div className="text-sm font-medium">{list.name}</div>
                  </div>
                  <span className={`text-xs ${isSelected ? colors.text : 'text-gray-500'}`}>
                    {list.contact_count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* User Lists */}
      {userLists.length > 0 && (
        <div>
          <div className="text-xs font-semibold text-gray-500 uppercase mb-2 px-3">
            My Lists
          </div>
          <div className="space-y-1">
            {userLists.map((list) => {
              const Icon = getIcon(list.icon);
              const colors = getColorClasses(list.color);
              const isSelected = selectedListId === list.id;

              return (
                <button
                  key={list.id}
                  onClick={() => handleSelectList(list)}
                  className={`
                    w-full flex items-center gap-3 px-3 py-2 rounded-md
                    transition-colors
                    ${isSelected ? `${colors.bg} ${colors.text} border ${colors.border}` : 'hover:bg-gray-100 text-gray-700'}
                  `}
                >
                  <Icon className="w-5 h-5 flex-shrink-0" />
                  <div className="flex-1 text-left">
                    <div className="text-sm font-medium">{list.name}</div>
                    {list.description && (
                      <div className="text-xs text-gray-500 truncate">{list.description}</div>
                    )}
                  </div>
                  <span className={`text-xs ${isSelected ? colors.text : 'text-gray-500'}`}>
                    {list.contact_count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Empty state for user lists */}
      {userLists.length === 0 && (
        <div className="mt-4 p-3 bg-gray-100 rounded-md">
          <p className="text-xs text-gray-600 text-center">
            No custom lists yet. Create one to organize your contacts.
          </p>
        </div>
      )}
    </div>
  );
}

export default SmartListPanel;
