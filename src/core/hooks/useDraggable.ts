/**
 * useDraggable - Hook for making elements draggable via mouse/touch
 *
 * @tier STANDARD
 * @authority CLAUDE.md - Core hooks location
 * @pattern React 18 hooks with proper cleanup
 *
 * Provides drag-and-drop positioning for modals and floating elements.
 * Tracks mouse/touch position and calculates element offset.
 *
 * @example
 * ```tsx
 * const { position, isDragging, handlers, resetPosition } = useDraggable();
 *
 * <div
 *   style={{ transform: `translate(${position.x}px, ${position.y}px)` }}
 * >
 *   <div {...handlers}>Drag Handle</div>
 *   <div>Content</div>
 * </div>
 * ```
 */

'use client';

import { useState, useCallback, useRef, useEffect } from 'react';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface DragPosition {
  x: number;
  y: number;
}

export interface UseDraggableOptions {
  /** Initial position offset */
  initialPosition?: DragPosition;
  /** Whether dragging is enabled */
  enabled?: boolean;
  /** Callback when drag starts */
  onDragStart?: () => void;
  /** Callback when drag ends */
  onDragEnd?: (position: DragPosition) => void;
  /** Constrain to viewport bounds */
  constrainToViewport?: boolean;
}

export interface UseDraggableReturn {
  /** Current position offset */
  position: DragPosition;
  /** Whether currently dragging */
  isDragging: boolean;
  /** Event handlers to spread on drag handle element */
  handlers: {
    onMouseDown: (e: React.MouseEvent) => void;
    onTouchStart: (e: React.TouchEvent) => void;
  };
  /** Reset position to initial/zero */
  resetPosition: () => void;
}

// ============================================================================
// HOOK IMPLEMENTATION
// ============================================================================

/**
 * useDraggable - Makes elements draggable via mouse or touch
 *
 * @param options - Configuration options
 * @returns Position state, drag status, and event handlers
 */
export function useDraggable(options: UseDraggableOptions = {}): UseDraggableReturn {
  const {
    initialPosition = { x: 0, y: 0 },
    enabled = true,
    onDragStart,
    onDragEnd,
    constrainToViewport = false,
  } = options;

  const [position, setPosition] = useState<DragPosition>(initialPosition);
  const [isDragging, setIsDragging] = useState(false);

  // Track drag start point and initial position
  const dragStartRef = useRef<{ mouseX: number; mouseY: number; posX: number; posY: number } | null>(null);

  // Capture initial position in ref to ensure stable resetPosition identity
  // This prevents infinite re-render loops when resetPosition is used in useEffect dependencies
  const initialPositionRef = useRef<DragPosition>(initialPosition);

  // Reset position to initial - uses ref to maintain stable function identity
  const resetPosition = useCallback(() => {
    setPosition(initialPositionRef.current);
  }, []);

  // Handle mouse/touch move
  const handleMove = useCallback(
    (clientX: number, clientY: number) => {
      if (!dragStartRef.current) return;

      const { mouseX, mouseY, posX, posY } = dragStartRef.current;
      let newX = posX + (clientX - mouseX);
      let newY = posY + (clientY - mouseY);

      // Constrain to viewport if enabled
      if (constrainToViewport && typeof window !== 'undefined') {
        const maxX = window.innerWidth / 2;
        const maxY = window.innerHeight / 2;
        newX = Math.max(-maxX, Math.min(maxX, newX));
        newY = Math.max(-maxY, Math.min(maxY, newY));
      }

      setPosition({ x: newX, y: newY });
    },
    [constrainToViewport]
  );

  // Handle drag end
  const handleEnd = useCallback(() => {
    if (isDragging) {
      setIsDragging(false);
      onDragEnd?.(position);
    }
    dragStartRef.current = null;
  }, [isDragging, onDragEnd, position]);

  // Mouse event handlers
  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      handleMove(e.clientX, e.clientY);
    };

    const handleMouseUp = () => {
      handleEnd();
    };

    // Add listeners to window for capturing moves outside element
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, handleMove, handleEnd]);

  // Touch event handlers
  useEffect(() => {
    if (!isDragging) return;

    const handleTouchMove = (e: TouchEvent) => {
      const touch = e.touches[0];
      if (e.touches.length === 1 && touch) {
        handleMove(touch.clientX, touch.clientY);
      }
    };

    const handleTouchEnd = () => {
      handleEnd();
    };

    window.addEventListener('touchmove', handleTouchMove, { passive: true });
    window.addEventListener('touchend', handleTouchEnd);

    return () => {
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isDragging, handleMove, handleEnd]);

  // Start drag on mouse down
  const onMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (!enabled) return;

      // Only respond to left click
      if (e.button !== 0) return;

      // Don't start drag if clicking on interactive elements
      const target = e.target as HTMLElement;
      if (target.closest('button, a, input, select, textarea, [role="button"]')) {
        return;
      }

      e.preventDefault();
      dragStartRef.current = {
        mouseX: e.clientX,
        mouseY: e.clientY,
        posX: position.x,
        posY: position.y,
      };
      setIsDragging(true);
      onDragStart?.();
    },
    [enabled, position.x, position.y, onDragStart]
  );

  // Start drag on touch start
  const onTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (!enabled) return;
      if (e.touches.length !== 1) return;

      // Don't start drag if touching interactive elements
      const target = e.target as HTMLElement;
      if (target.closest('button, a, input, select, textarea, [role="button"]')) {
        return;
      }

      const touch = e.touches[0];
      if (!touch) return;

      dragStartRef.current = {
        mouseX: touch.clientX,
        mouseY: touch.clientY,
        posX: position.x,
        posY: position.y,
      };
      setIsDragging(true);
      onDragStart?.();
    },
    [enabled, position.x, position.y, onDragStart]
  );

  return {
    position,
    isDragging,
    handlers: {
      onMouseDown,
      onTouchStart,
    },
    resetPosition,
  };
}

export default useDraggable;
