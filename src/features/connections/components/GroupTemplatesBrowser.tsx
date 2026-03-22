/**
 * GroupTemplatesBrowser Component
 * Browse and use group templates - own templates and public community templates
 *
 * GOVERNANCE COMPLIANCE:
 * - STANDARD tier component with ErrorBoundary
 * - Client Component ('use client')
 * - Tab-based layout with My Templates and Public Templates
 *
 * @tier STANDARD
 * @phase Connection Groups Feature - Phase 4B
 * @generated ComponentBuilder
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { GroupTemplateCard } from './GroupTemplateCard';
import { BookmarkPlus, Globe, Loader2, BookOpen } from 'lucide-react';
import type { GroupTemplate, ConnectionGroup } from '@features/connections/types/groups';

type TabId = 'my-templates' | 'public';

export interface GroupTemplatesBrowserProps {
  onCreateFromTemplate: (group: ConnectionGroup) => void;
}

function GroupTemplatesBrowserContent({ onCreateFromTemplate }: GroupTemplatesBrowserProps) {
  const [activeTab, setActiveTab] = useState<TabId>('my-templates');
  const [myTemplates, setMyTemplates] = useState<GroupTemplate[]>([]);
  const [publicTemplates, setPublicTemplates] = useState<GroupTemplate[]>([]);
  const [publicTotal, setPublicTotal] = useState(0);
  const [isLoadingMy, setIsLoadingMy] = useState(true);
  const [isLoadingPublic, setIsLoadingPublic] = useState(true);
  const [errorMy, setErrorMy] = useState<string | null>(null);
  const [errorPublic, setErrorPublic] = useState<string | null>(null);

  const loadMyTemplates = useCallback(async () => {
    setIsLoadingMy(true);
    setErrorMy(null);
    try {
      const response = await fetch('/api/users/connections/groups/templates', {
        credentials: 'include'
      });
      const result = await response.json();

      if (result.success && result.data) {
        setMyTemplates(result.data.templates || []);
      } else {
        throw new Error(result.error?.message || 'Failed to load templates');
      }
    } catch (err) {
      setErrorMy(err instanceof Error ? err.message : 'Failed to load templates');
    } finally {
      setIsLoadingMy(false);
    }
  }, []);

  const loadPublicTemplates = useCallback(async () => {
    setIsLoadingPublic(true);
    setErrorPublic(null);
    try {
      const response = await fetch('/api/users/connections/groups/templates/public', {
        credentials: 'include'
      });
      const result = await response.json();

      if (result.success && result.data) {
        setPublicTemplates(result.data.templates || []);
        setPublicTotal(result.data.total || 0);
      } else {
        throw new Error(result.error?.message || 'Failed to load public templates');
      }
    } catch (err) {
      setErrorPublic(err instanceof Error ? err.message : 'Failed to load public templates');
    } finally {
      setIsLoadingPublic(false);
    }
  }, []);

  useEffect(() => {
    void loadMyTemplates();
    void loadPublicTemplates();
  }, [loadMyTemplates, loadPublicTemplates]);

  const handleTemplateDeleted = (templateId: number) => {
    setMyTemplates((prev) => prev.filter((t) => t.id !== templateId));
  };

  const handleGroupCreated = (group: ConnectionGroup) => {
    onCreateFromTemplate(group);
  };

  const tabs: { id: TabId; label: string; icon: React.ElementType; count?: number }[] = [
    { id: 'my-templates', label: 'My Templates', icon: BookmarkPlus, count: myTemplates.length },
    { id: 'public', label: 'Public Templates', icon: Globe, count: publicTotal }
  ];

  return (
    <div className="bg-white rounded-lg shadow-sm overflow-hidden">
      {/* Tab Header */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
                {tab.count !== undefined && tab.count > 0 && (
                  <span className="px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded-full">
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="p-6">
        {activeTab === 'my-templates' && (
          <div>
            {isLoadingMy ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
              </div>
            ) : errorMy ? (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-600">{errorMy}</p>
                <button
                  onClick={() => void loadMyTemplates()}
                  className="mt-2 text-sm text-red-700 underline"
                >
                  Try again
                </button>
              </div>
            ) : myTemplates.length === 0 ? (
              <div className="text-center py-12">
                <BookmarkPlus className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">No templates yet</p>
                <p className="text-sm text-gray-400 mt-1">
                  Save a group as a template to reuse its settings
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {myTemplates.map((template) => (
                  <GroupTemplateCard
                    key={template.id}
                    template={template}
                    onUseTemplate={handleGroupCreated}
                    onDelete={handleTemplateDeleted}
                    showDelete
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'public' && (
          <div>
            {isLoadingPublic ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
              </div>
            ) : errorPublic ? (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-600">{errorPublic}</p>
                <button
                  onClick={() => void loadPublicTemplates()}
                  className="mt-2 text-sm text-red-700 underline"
                >
                  Try again
                </button>
              </div>
            ) : publicTemplates.length === 0 ? (
              <div className="text-center py-12">
                <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">No public templates yet</p>
                <p className="text-sm text-gray-400 mt-1">
                  Be the first to share a template with the community
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {publicTemplates.map((template) => (
                  <GroupTemplateCard
                    key={template.id}
                    template={template}
                    onUseTemplate={handleGroupCreated}
                    showDelete={false}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export function GroupTemplatesBrowser(props: GroupTemplatesBrowserProps) {
  return (
    <ErrorBoundary componentName="GroupTemplatesBrowser">
      <GroupTemplatesBrowserContent {...props} />
    </ErrorBoundary>
  );
}
