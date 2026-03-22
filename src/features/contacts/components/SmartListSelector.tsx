/**
 * SmartListSelector - Dropdown-based smart list selector
 *
 * @component Client Component
 * @tier SIMPLE
 * @phase Contacts Phase E (UI Enhancement)
 * @generated ComponentBuilder v3.0
 * @governance Build Map v2.1 ENHANCED
 * @authority .cursor/rules/admin-build-map-v2.1.mdc
 * @authority .cursor/rules/react18-nextjs14-governance.mdc
 *
 * Replaces SmartListPanel sidebar with a compact dropdown button.
 * Saves horizontal space especially on mobile devices.
 *
 * @see docs/pages/layouts/home/user/user_dash/contacts/SMART_LIST_UI_REFACTOR.md
 */
'use client';

import { useState, useEffect, useRef } from 'react';
import { List, Plus, AlertCircle, Clock, UserPlus, UserX, Star, Loader2, ChevronDown, Filter } from 'lucide-react';
import type { SmartList } from '../types';

interface SmartListSelectorProps {
  /** Currently selected smart list */
  selectedList: SmartList | null;
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
 * SmartListSelector component - Dropdown replacement for SmartListPanel
 */
export function SmartListSelector({
  selectedList,
  onSelectList,
  onCreateList
}: SmartListSelectorProps) {
  const [smartLists, setSmartLists] = useState<SmartList[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fetch smart lists
  useEffect(() => {
    fetchSmartLists();
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
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

  const handleSelectList = (list: SmartList | null) => {
    onSelectList(list);
    setIsOpen(false);
  };

  // Separate system and user lists
  const systemLists = smartLists.filter(l => l.is_system);
  const userLists = smartLists.filter(l => !l.is_system);

  // Determine button label
  const buttonLabel = selectedList ? selectedList.name : 'All Contacts';
  const hasActiveFilter = selectedList !== null;

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Dropdown Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`
          flex items-center gap-2 px-3 py-2 rounded-lg border transition-all
          ${hasActiveFilter
            ? 'bg-biz-orange/10 border-biz-orange text-biz-orange'
            : 'bg-white border-gray-300 text-gray-700 hover:border-gray-400'}
        `}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        <Filter className="w-4 h-4" />
        <span className="text-sm font-medium truncate max-w-[120px]">{buttonLabel}</span>
        <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="absolute left-0 top-full mt-2 w-72 bg-white rounded-xl border border-gray-200 shadow-lg z-50 overflow-hidden">
          {loading ? (
            <div className="p-4 flex items-center justify-center">
              <Loader2 className="w-5 h-5 text-gray-600 animate-spin" />
            </div>
          ) : error ? (
            <div className="p-4 text-sm text-red-600">{error}</div>
          ) : (
            <div className="max-h-80 overflow-y-auto">
              {/* All Contacts */}
              <button
                onClick={() => handleSelectList(null)}
                className={`
                  w-full flex items-center gap-3 px-4 py-3 text-left
                  transition-colors border-b border-gray-100
                  ${selectedList === null
                    ? 'bg-blue-50 text-blue-600'
                    : 'hover:bg-gray-50 text-gray-700'}
                `}
              >
                <List className="w-5 h-5 flex-shrink-0" />
                <span className="text-sm font-medium">All Contacts</span>
              </button>

              {/* System Lists (Quick Filters) */}
              {systemLists.length > 0 && (
                <div className="py-2">
                  <div className="px-4 py-1 text-xs font-semibold text-gray-500 uppercase">
                    Quick Filters
                  </div>
                  {systemLists.map((list) => {
                    const Icon = getIcon(list.icon);
                    const colors = getColorClasses(list.color);
                    const isSelected = selectedList?.id === list.id;

                    return (
                      <button
                        key={list.id}
                        onClick={() => handleSelectList(list)}
                        className={`
                          w-full flex items-center gap-3 px-4 py-2.5 text-left
                          transition-colors
                          ${isSelected
                            ? `${colors.bg} ${colors.text}`
                            : 'hover:bg-gray-50 text-gray-700'}
                        `}
                      >
                        <Icon className="w-5 h-5 flex-shrink-0" />
                        <span className="flex-1 text-sm font-medium">{list.name}</span>
                        <span className={`text-xs ${isSelected ? colors.text : 'text-gray-500'}`}>
                          {list.contact_count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* User Lists */}
              {userLists.length > 0 && (
                <div className="py-2 border-t border-gray-100">
                  <div className="px-4 py-1 text-xs font-semibold text-gray-500 uppercase">
                    My Lists
                  </div>
                  {userLists.map((list) => {
                    const Icon = getIcon(list.icon);
                    const colors = getColorClasses(list.color);
                    const isSelected = selectedList?.id === list.id;

                    return (
                      <button
                        key={list.id}
                        onClick={() => handleSelectList(list)}
                        className={`
                          w-full flex items-center gap-3 px-4 py-2.5 text-left
                          transition-colors
                          ${isSelected
                            ? `${colors.bg} ${colors.text}`
                            : 'hover:bg-gray-50 text-gray-700'}
                        `}
                      >
                        <Icon className="w-5 h-5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate">{list.name}</div>
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
              )}

              {/* Create New List Button */}
              <div className="p-2 border-t border-gray-100 bg-gray-50">
                <button
                  onClick={() => {
                    setIsOpen(false);
                    onCreateList();
                  }}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-biz-orange hover:bg-orange-50 rounded-lg transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Create Smart List
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default SmartListSelector;
