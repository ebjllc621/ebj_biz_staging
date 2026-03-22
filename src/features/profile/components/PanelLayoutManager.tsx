/**
 * PanelLayoutManager - Profile Panel Layout Orchestrator
 *
 * Manages drag-and-drop reordering and visibility toggling of profile panels
 *
 * @tier ENTERPRISE
 * @phase Phase 6
 * @generated DNA v11.4.0
 */

'use client';

import { useState, useCallback } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy
} from '@dnd-kit/sortable';
import { PanelManagementBar } from './PanelManagementBar';
import { DraggablePanelWrapper } from './DraggablePanelWrapper';
import { SharedConnectionsSection } from './SharedConnectionsSection';
import { AssociatedListingsPanel } from './AssociatedListingsPanel';
import { UserContentPanel } from './UserContentPanel';
import { UserSentRecommendationsScroller } from './UserSentRecommendationsScroller';
import {
  ProfileLayout,
  PanelConfig,
  PanelId,
  DEFAULT_PROFILE_LAYOUT,
  mergeWithDefaultLayout
} from '../types/profile-layout';
import { fetchWithCsrf } from '@core/utils/csrf';

// ============================================================================
// TYPE DEFINITIONS & CONSTANTS
// ============================================================================

export interface PanelLayoutManagerProps {
  /** Username for panel components */
  username: string;
  /** Initial layout from server */
  initialLayout?: ProfileLayout | null;
  /** Whether to show management controls */
  showControls: boolean;
  /** Whether in edit view mode */
  isEditView: boolean;
  /** Whether shared connections should be shown (based on view mode) */
  showSharedConnections: boolean;
}

// Panel components map (recommendations handled separately due to different props)
const PANEL_COMPONENTS: Partial<Record<PanelId, React.ComponentType<{ username: string; variant?: 'embedded' | 'panel' }>>> = {
  'shared-connections': SharedConnectionsSection,
  'listings': AssociatedListingsPanel as React.ComponentType<{ username: string; variant?: 'embedded' | 'panel' }>,
  'content': UserContentPanel as React.ComponentType<{ username: string; variant?: 'embedded' | 'panel' }>
};

// ============================================================================
// PANELLAYOUTMANAGER COMPONENT
// ============================================================================

/**
 * PanelLayoutManager - Main orchestrator for panel layout management
 *
 * Handles drag-and-drop reordering, visibility toggling, and layout persistence
 *
 * @example
 * ```tsx
 * <PanelLayoutManager
 *   username="johndoe"
 *   initialLayout={profileLayout}
 *   showControls={canEdit}
 *   isEditView={isEditView}
 *   showSharedConnections={showSharedConnections}
 * />
 * ```
 */
export function PanelLayoutManager({
  username,
  initialLayout,
  showControls,
  isEditView,
  showSharedConnections
}: PanelLayoutManagerProps) {
  const [layout, setLayout] = useState<ProfileLayout>(() =>
    mergeWithDefaultLayout(initialLayout)
  );
  const [isEditing, setIsEditing] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8
      }
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates
    })
  );

  // Get sorted panels
  const sortedPanels = [...layout.panels].sort((a, b) => a.order - b.order);

  // Save layout to server
  const saveLayout = useCallback(async (newLayout: ProfileLayout) => {
    try {
      const response = await fetchWithCsrf('/api/users/profile/layout', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ layout: newLayout })
      });

      if (!response.ok) {
        console.error('Failed to save layout');
      }
    } catch (error) {
      console.error('Error saving layout:', error);
    }
  }, []);

  // Handle drag end
  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) return;

    const oldIndex = sortedPanels.findIndex(p => p.id === active.id);
    const newIndex = sortedPanels.findIndex(p => p.id === over.id);

    if (oldIndex === -1 || newIndex === -1) return;

    const reorderedPanels = arrayMove(sortedPanels, oldIndex, newIndex).map((panel, idx) => ({
      ...panel,
      order: idx
    }));

    const newLayout: ProfileLayout = {
      ...layout,
      panels: reorderedPanels,
      updatedAt: new Date().toISOString()
    };

    setLayout(newLayout);
    saveLayout(newLayout);
  }, [sortedPanels, layout, saveLayout]);

  // Toggle panel visibility
  const togglePanelVisibility = useCallback((panelId: PanelId) => {
    const newPanels = layout.panels.map(panel =>
      panel.id === panelId ? { ...panel, visible: !panel.visible } : panel
    );

    const newLayout: ProfileLayout = {
      ...layout,
      panels: newPanels,
      updatedAt: new Date().toISOString()
    };

    setLayout(newLayout);
    saveLayout(newLayout);
  }, [layout, saveLayout]);

  // Reset to default
  const handleResetLayout = useCallback(async () => {
    setIsResetting(true);
    try {
      const response = await fetchWithCsrf('/api/users/profile/layout', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reset: true })
      });

      if (response.ok) {
        const result = await response.json();
        setLayout(result.data?.layout || DEFAULT_PROFILE_LAYOUT);
      }
    } catch (error) {
      console.error('Error resetting layout:', error);
    } finally {
      setIsResetting(false);
    }
  }, []);

  // Toggle editing mode
  const handleToggleEditing = useCallback(() => {
    setIsEditing(prev => !prev);
  }, []);

  // Render panel by ID
  const renderPanel = (panelId: PanelId) => {
    // Special handling for recommendations (different prop interface)
    if (panelId === 'recommendations') {
      return <UserSentRecommendationsScroller username={username} isEditView={isEditView} />;
    }

    const PanelComponent = PANEL_COMPONENTS[panelId];
    if (!PanelComponent) return null;

    // Special handling for shared connections
    if (panelId === 'shared-connections') {
      return <PanelComponent username={username} variant="panel" />;
    }

    return <PanelComponent username={username} />;
  };

  // Check if panel should render based on conditions
  const shouldRenderPanel = (panelId: PanelId, isVisible: boolean): boolean => {
    // Shared connections has additional visibility logic
    if (panelId === 'shared-connections') {
      return showSharedConnections && (isEditing || isVisible);
    }

    return isEditing || isVisible;
  };

  return (
    <>
      {/* Panel Management Bar - Only in Edit View when showControls is true */}
      {showControls && isEditView && (
        <PanelManagementBar
          isEditing={isEditing}
          onToggleEditing={handleToggleEditing}
          onResetLayout={handleResetLayout}
          isResetting={isResetting}
        />
      )}

      {/* DnD Context wraps all draggable panels */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={sortedPanels.map(p => p.id)}
          strategy={verticalListSortingStrategy}
          disabled={!isEditing}
        >
          {sortedPanels.map(panel => {
            const isVisible = panel.visible;

            // Skip rendering if panel shouldn't be shown
            if (!shouldRenderPanel(panel.id, isVisible)) {
              return null;
            }

            return (
              <DraggablePanelWrapper
                key={panel.id}
                panelId={panel.id}
                isEditing={isEditing}
                isVisible={isVisible}
                onToggleVisibility={() => togglePanelVisibility(panel.id)}
              >
                {renderPanel(panel.id)}
              </DraggablePanelWrapper>
            );
          })}
        </SortableContext>
      </DndContext>
    </>
  );
}

export default PanelLayoutManager;
