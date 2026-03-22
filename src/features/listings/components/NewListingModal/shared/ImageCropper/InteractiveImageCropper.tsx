/**
 * InteractiveImageCropper - Canvas-Based Image Cropping Component
 *
 * @authority CLAUDE.md - Build Map v2.1 compliance
 * @tier ENTERPRISE
 * @phase Phase 5 - Section 5 Media
 *
 * FEATURES:
 * - Canvas-based image manipulation
 * - Zoom, pan, and rotate controls
 * - requestAnimationFrame optimization
 * - Live preview generation
 * - Memory cleanup on unmount
 */

'use client';

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import type { CropperConfig, CropData } from './cropper-configs';
import { CROPPER_CONFIGS } from './cropper-configs';

// ============================================================================
// TYPES
// ============================================================================

interface InteractiveImageCropperProps {
  imageUrl: string;
  context: keyof typeof CROPPER_CONFIGS;
  customConfig?: Partial<CropperConfig>;
  onCropChange?: (_cropData: CropData) => void;
  onPreviewUpdate?: (_previewUrl: string) => void;
  showDebug?: boolean;
  className?: string;
  shapeMask?: 'rectangle' | 'circle' | 'rounded';
  borderRadiusPx?: number;
}

// ============================================================================
// HELPERS
// ============================================================================

function drawRoundedRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

// ============================================================================
// COMPONENT
// ============================================================================

export default function InteractiveImageCropper({
  imageUrl,
  context,
  customConfig = {},
  onCropChange,
  onPreviewUpdate,
  showDebug = false,
  className = '',
  shapeMask: shapeMaskProp,
  borderRadiusPx: borderRadiusPxProp
}: InteractiveImageCropperProps) {

  // Configuration - Ensure all properties are defined
  const config = useMemo(() => {
    const baseConfig = CROPPER_CONFIGS[context];
    return {
      ...baseConfig,
      ...customConfig
    } as CropperConfig;
  }, [context, customConfig]);

  // Resolved shape mask - prop takes priority, then config, then default
  const resolvedShapeMask = shapeMaskProp ?? config.shapeMask ?? 'rectangle';
  const resolvedBorderRadiusPx = borderRadiusPxProp ?? config.borderRadiusPx ?? 16;

  // Animation frame reference for performance optimization
  const animationFrameRef = useRef<number>();

  // Performance monitoring
  const performanceMonitor = useMemo(() => ({
    startTime: 0,

    start(operation: string) {
      this.startTime = performance.now();
      if (showDebug) {
        console.log(`🚀 Starting ${operation}`);
      }
    },

    end(operation: string) {
      const duration = performance.now() - this.startTime;
      if (showDebug) {
        console.log(`✅ ${operation} took ${duration.toFixed(2)}ms`);
      }

      // Alert if slower than 60fps (16.67ms)
      if (duration > 16.67) {
        console.warn(`⚠️ Performance warning: ${operation} took ${duration.toFixed(2)}ms`);
      }
    }
  }), [showDebug]);

  // Refs
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  // Stable canvas context refs - populated after mount via useEffect
  const mainCtxRef = useRef<CanvasRenderingContext2D | null>(null);
  const previewCtxRef = useRef<CanvasRenderingContext2D | null>(null);

  // Populate canvas contexts after mount
  useEffect(() => {
    mainCtxRef.current = canvasRef.current?.getContext('2d') ?? null;
    previewCtxRef.current = previewCanvasRef.current?.getContext('2d') ?? null;
  }, []);

  // State
  const [isImageLoaded, setIsImageLoaded] = useState(false);
  const [imageScale, setImageScale] = useState(config.zoomDefault);
  const [imageOffsetX, setImageOffsetX] = useState(0);
  const [imageOffsetY, setImageOffsetY] = useState(0);
  const [imageRotation, setImageRotation] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [dragStartOffset, setDragStartOffset] = useState({ x: 0, y: 0 });
  const [debugInfo, setDebugInfo] = useState('');

  // Calculated values
  const cropX = (config.canvasWidth - config.cropWidth) / 2;
  const cropY = (config.canvasHeight - config.cropHeight) / 2;

  // Image loading
  useEffect(() => {
    if (!imageUrl) {
      setIsImageLoaded(false);
      return;
    }

    setDebugInfo('Loading image...');
    setIsImageLoaded(false);

    if (imageRef.current) {
      imageRef.current.onload = () => {
        setIsImageLoaded(true);
        setDebugInfo('Image loaded successfully');
      };

      imageRef.current.onerror = () => {
        setDebugInfo('Image failed to load');
        setIsImageLoaded(false);
      };

      // MUST set crossOrigin before src to avoid tainted canvas when using toDataURL()
      imageRef.current.crossOrigin = 'anonymous';
      imageRef.current.src = imageUrl;
    }
  }, [imageUrl]);

  // Canvas drawing function
  const drawCanvas = useCallback((canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D, isPreview = false) => {
    if (!imageRef.current || !isImageLoaded) return;

    const imgWidth = imageRef.current.naturalWidth;
    const imgHeight = imageRef.current.naturalHeight;

    // Calculate dimensions based on rotation
    let drawWidth = imgWidth;
    let drawHeight = imgHeight;

    if (config.allowRotation && (imageRotation === 90 || imageRotation === 270)) {
      drawWidth = imgHeight;
      drawHeight = imgWidth;
    }

    // Calculate scaling
    const targetWidth = isPreview ? config.previewWidth : config.cropWidth;
    const targetHeight = isPreview ? config.previewHeight : config.cropHeight;
    const baseScale = Math.min(targetWidth / drawWidth, targetHeight / drawHeight);
    const finalScale = baseScale * (imageScale / 100);
    const scaledWidth = drawWidth * finalScale;
    const scaledHeight = drawHeight * finalScale;

    // Calculate position
    const centerX = isPreview ? canvas.width / 2 : cropX + config.cropWidth / 2;
    const centerY = isPreview ? canvas.height / 2 : cropY + config.cropHeight / 2;
    const imageX = centerX - scaledWidth / 2 + (isPreview ? imageOffsetX * (config.previewWidth / config.cropWidth) : imageOffsetX);
    const imageY = centerY - scaledHeight / 2 + (isPreview ? imageOffsetY * (config.previewHeight / config.cropHeight) : imageOffsetY);

    if (isPreview) {
      // Preview canvas: shape-aware background and clip
      if (resolvedShapeMask === 'circle' || resolvedShapeMask === 'rounded') {
        // Transparent background for non-rectangle shapes
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        ctx.save();
        if (resolvedShapeMask === 'circle') {
          ctx.beginPath();
          ctx.arc(canvas.width / 2, canvas.height / 2, Math.min(canvas.width, canvas.height) / 2, 0, Math.PI * 2);
          ctx.clip();
        } else {
          // rounded
          drawRoundedRectPath(ctx, 0, 0, canvas.width, canvas.height, resolvedBorderRadiusPx);
          ctx.clip();
        }

        ctx.translate(imageX + scaledWidth / 2, imageY + scaledHeight / 2);
        if (config.allowRotation) {
          ctx.rotate((imageRotation * Math.PI) / 180);
        }
        ctx.drawImage(imageRef.current, -scaledWidth / 2, -scaledHeight / 2, scaledWidth, scaledHeight);
        ctx.restore();
      } else {
        // rectangle: existing white fill behavior
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.save();
        ctx.translate(imageX + scaledWidth / 2, imageY + scaledHeight / 2);
        if (config.allowRotation) {
          ctx.rotate((imageRotation * Math.PI) / 180);
        }
        ctx.drawImage(imageRef.current, -scaledWidth / 2, -scaledHeight / 2, scaledWidth, scaledHeight);
        ctx.restore();
      }
      return;
    }

    // Main canvas: clear with background color
    ctx.fillStyle = config.backgroundColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw overlay
    ctx.fillStyle = config.overlayColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Cut out crop area using composite operation for all shapes
    ctx.save();
    if (resolvedShapeMask === 'circle') {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.beginPath();
      ctx.arc(
        cropX + config.cropWidth / 2,
        cropY + config.cropHeight / 2,
        Math.min(config.cropWidth, config.cropHeight) / 2,
        0,
        Math.PI * 2
      );
      ctx.fill();
      ctx.globalCompositeOperation = 'source-over';
    } else if (resolvedShapeMask === 'rounded') {
      ctx.globalCompositeOperation = 'destination-out';
      drawRoundedRectPath(ctx, cropX, cropY, config.cropWidth, config.cropHeight, resolvedBorderRadiusPx);
      ctx.fill();
      ctx.globalCompositeOperation = 'source-over';
    } else {
      // rectangle
      ctx.clearRect(cropX, cropY, config.cropWidth, config.cropHeight);
    }
    ctx.restore();

    // Draw image with transformations
    ctx.save();
    ctx.translate(imageX + scaledWidth / 2, imageY + scaledHeight / 2);

    if (config.allowRotation) {
      ctx.rotate((imageRotation * Math.PI) / 180);
    }

    ctx.drawImage(
      imageRef.current,
      -scaledWidth / 2,
      -scaledHeight / 2,
      scaledWidth,
      scaledHeight
    );

    ctx.restore();

    // Draw crop border
    ctx.save();
    ctx.strokeStyle = config.cropBorderColor;
    ctx.lineWidth = config.cropBorderWidth;

    if (resolvedShapeMask === 'circle') {
      ctx.beginPath();
      ctx.arc(
        cropX + config.cropWidth / 2,
        cropY + config.cropHeight / 2,
        Math.min(config.cropWidth, config.cropHeight) / 2,
        0,
        Math.PI * 2
      );
      ctx.stroke();
    } else if (resolvedShapeMask === 'rounded') {
      drawRoundedRectPath(ctx, cropX, cropY, config.cropWidth, config.cropHeight, resolvedBorderRadiusPx);
      ctx.stroke();
    } else {
      // rectangle
      ctx.strokeRect(cropX, cropY, config.cropWidth, config.cropHeight);

      // Corner handles only for rectangle
      const handleSize = 8;
      ctx.fillStyle = config.cropBorderColor;
      ctx.fillRect(cropX - handleSize/2, cropY - handleSize/2, handleSize, handleSize);
      ctx.fillRect(cropX + config.cropWidth - handleSize/2, cropY - handleSize/2, handleSize, handleSize);
      ctx.fillRect(cropX - handleSize/2, cropY + config.cropHeight - handleSize/2, handleSize, handleSize);
      ctx.fillRect(cropX + config.cropWidth - handleSize/2, cropY + config.cropHeight - handleSize/2, handleSize, handleSize);
    }

    ctx.restore();
  }, [
    isImageLoaded,
    imageScale,
    imageOffsetX,
    imageOffsetY,
    imageRotation,
    config,
    cropX,
    cropY,
    resolvedShapeMask,
    resolvedBorderRadiusPx
  ]);

  // Render scheduling with requestAnimationFrame
  const scheduleRender = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    animationFrameRef.current = requestAnimationFrame(() => {
      performanceMonitor.start('Canvas Rendering');

      if (mainCtxRef.current && canvasRef.current) {
        drawCanvas(canvasRef.current, mainCtxRef.current, false);
      }

      if (previewCtxRef.current && previewCanvasRef.current) {
        drawCanvas(previewCanvasRef.current, previewCtxRef.current, true);
      }

      performanceMonitor.end('Canvas Rendering');
    });
  }, [drawCanvas, performanceMonitor]);

  // Canvas updates
  useEffect(() => {
    if (isImageLoaded) {
      scheduleRender();
    }
  }, [isImageLoaded, scheduleRender]);

  // Generate crop data
  const generateCropData = useCallback((): CropData => ({
    scale: imageScale,
    offsetX: imageOffsetX,
    offsetY: imageOffsetY,
    rotation: imageRotation,
    cropWidth: config.cropWidth,
    cropHeight: config.cropHeight,
    canvasWidth: config.canvasWidth,
    canvasHeight: config.canvasHeight
  }), [imageScale, imageOffsetX, imageOffsetY, imageRotation, config]);

  // Generate cropped image
  const generateCroppedImage = useCallback((): string | null => {
    if (!imageRef.current || !isImageLoaded) return null;

    const cropCanvas = document.createElement('canvas');
    cropCanvas.width = config.cropWidth;
    cropCanvas.height = config.cropHeight;
    const cropCtx = cropCanvas.getContext('2d');

    if (!cropCtx) return null;

    const imgWidth = imageRef.current.naturalWidth;
    const imgHeight = imageRef.current.naturalHeight;

    // Calculate dimensions based on rotation
    let drawWidth = imgWidth;
    let drawHeight = imgHeight;

    if (config.allowRotation && (imageRotation === 90 || imageRotation === 270)) {
      drawWidth = imgHeight;
      drawHeight = imgWidth;
    }

    // Calculate scaling for the crop area
    const baseScale = Math.min(config.cropWidth / drawWidth, config.cropHeight / drawHeight);
    const finalScale = baseScale * (imageScale / 100);
    const scaledWidth = drawWidth * finalScale;
    const scaledHeight = drawHeight * finalScale;

    // Calculate position for the crop area
    const centerX = config.cropWidth / 2;
    const centerY = config.cropHeight / 2;
    const imageX = centerX - scaledWidth / 2 + imageOffsetX;
    const imageY = centerY - scaledHeight / 2 + imageOffsetY;

    if (resolvedShapeMask === 'circle' || resolvedShapeMask === 'rounded') {
      // Transparent background - alpha channel preserved in PNG
      cropCtx.clearRect(0, 0, cropCanvas.width, cropCanvas.height);

      cropCtx.save();
      if (resolvedShapeMask === 'circle') {
        cropCtx.beginPath();
        cropCtx.arc(
          cropCanvas.width / 2,
          cropCanvas.height / 2,
          Math.min(cropCanvas.width, cropCanvas.height) / 2,
          0,
          Math.PI * 2
        );
        cropCtx.clip();
      } else {
        // rounded
        drawRoundedRectPath(cropCtx, 0, 0, cropCanvas.width, cropCanvas.height, resolvedBorderRadiusPx);
        cropCtx.clip();
      }

      cropCtx.translate(imageX + scaledWidth / 2, imageY + scaledHeight / 2);
      if (config.allowRotation) {
        cropCtx.rotate((imageRotation * Math.PI) / 180);
      }
      cropCtx.drawImage(imageRef.current, -scaledWidth / 2, -scaledHeight / 2, scaledWidth, scaledHeight);
      cropCtx.restore();
    } else {
      // rectangle: white background
      cropCtx.fillStyle = 'white';
      cropCtx.fillRect(0, 0, cropCanvas.width, cropCanvas.height);

      cropCtx.save();
      cropCtx.translate(imageX + scaledWidth / 2, imageY + scaledHeight / 2);

      if (config.allowRotation) {
        cropCtx.rotate((imageRotation * Math.PI) / 180);
      }

      cropCtx.drawImage(
        imageRef.current,
        -scaledWidth / 2,
        -scaledHeight / 2,
        scaledWidth,
        scaledHeight
      );

      cropCtx.restore();
    }

    return cropCanvas.toDataURL('image/png');
  }, [isImageLoaded, imageScale, imageOffsetX, imageOffsetY, imageRotation, config, resolvedShapeMask, resolvedBorderRadiusPx]);

  // Debounce timer refs for cleanup on unmount
  const previewTimerRef = useRef<NodeJS.Timeout>();
  const cropChangeTimerRef = useRef<NodeJS.Timeout>();

  // Debounced callbacks
  const debouncedPreviewUpdate = useCallback(
    (previewUrl: string) => {
      clearTimeout(previewTimerRef.current);
      previewTimerRef.current = setTimeout(() => {
        if (onPreviewUpdate) {
          performanceMonitor.start('Preview Update Callback');
          onPreviewUpdate(previewUrl);
          performanceMonitor.end('Preview Update Callback');
        }
      }, config.debounceDelay + 50);
    },
    [config.debounceDelay, performanceMonitor, onPreviewUpdate]
  );

  const debouncedCropChange = useCallback(
    (cropData: CropData) => {
      clearTimeout(cropChangeTimerRef.current);
      cropChangeTimerRef.current = setTimeout(() => {
        if (onCropChange) {
          performanceMonitor.start('Crop Change Callback');
          onCropChange(cropData);
          performanceMonitor.end('Crop Change Callback');
        }
      }, Math.max(50, config.debounceDelay - 50));
    },
    [config.debounceDelay, performanceMonitor, onCropChange]
  );

  // Callback updates
  useEffect(() => {
    if (!isImageLoaded) return;

    const cropData = generateCropData();
    debouncedCropChange(cropData);

    const croppedImage = generateCroppedImage();
    if (croppedImage) {
      debouncedPreviewUpdate(croppedImage);
    }
  }, [
    isImageLoaded,
    generateCropData,
    generateCroppedImage,
    debouncedCropChange,
    debouncedPreviewUpdate
  ]);

  // Memory cleanup
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }

      clearTimeout(previewTimerRef.current);
      clearTimeout(cropChangeTimerRef.current);

      if (canvasRef.current) {
        const ctx = canvasRef.current.getContext('2d');
        ctx?.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      }

      if (previewCanvasRef.current) {
        const ctx = previewCanvasRef.current.getContext('2d');
        ctx?.clearRect(0, 0, previewCanvasRef.current.width, previewCanvasRef.current.height);
      }
    };
  }, []);

  // Control handlers
  const handleZoomIn = useCallback(() => {
    if (!config.allowZoom) return;
    setImageScale(prev => Math.min(config.zoomMax, prev + config.zoomStep));
  }, [config.allowZoom, config.zoomMax, config.zoomStep]);

  const handleZoomOut = useCallback(() => {
    if (!config.allowZoom) return;
    setImageScale(prev => Math.max(config.zoomMin, prev - config.zoomStep));
  }, [config.allowZoom, config.zoomMin, config.zoomStep]);

  const handleRotateRight = useCallback(() => {
    if (!config.allowRotation) return;
    setImageRotation(prev => (prev + 90) % 360);
    setImageOffsetX(0);
    setImageOffsetY(0);
  }, [config.allowRotation]);

  const handleCenterHorizontal = useCallback(() => setImageOffsetX(0), []);
  const handleCenterVertical = useCallback(() => setImageOffsetY(0), []);
  const handleCenterBoth = useCallback(() => {
    setImageOffsetX(0);
    setImageOffsetY(0);
  }, []);

  // Mouse/touch handlers
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!config.allowDrag || !isImageLoaded) return;

    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const canvasScaleX = config.canvasWidth / rect.width;
    const canvasScaleY = config.canvasHeight / rect.height;
    const canvasX = x * canvasScaleX;
    const canvasY = y * canvasScaleY;

    if (canvasX >= cropX && canvasX <= cropX + config.cropWidth &&
        canvasY >= cropY && canvasY <= cropY + config.cropHeight) {
      setIsDragging(true);
      setDragStart({ x: e.clientX, y: e.clientY });
      setDragStartOffset({ x: imageOffsetX, y: imageOffsetY });

      if (canvasRef.current) {
        canvasRef.current.style.cursor = 'grabbing';
      }
    }
  }, [config.allowDrag, isImageLoaded, cropX, cropY, config.canvasWidth, config.canvasHeight, config.cropWidth, config.cropHeight, imageOffsetX, imageOffsetY]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging) {
      if (canvasRef.current && isImageLoaded && config.allowDrag) {
        const rect = canvasRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const canvasScaleX = config.canvasWidth / rect.width;
        const canvasScaleY = config.canvasHeight / rect.height;
        const canvasX = x * canvasScaleX;
        const canvasY = y * canvasScaleY;

        if (canvasX >= cropX && canvasX <= cropX + config.cropWidth &&
            canvasY >= cropY && canvasY <= cropY + config.cropHeight) {
          canvasRef.current.style.cursor = 'grab';
        } else {
          canvasRef.current.style.cursor = 'default';
        }
      }
      return;
    }

    const deltaX = e.clientX - dragStart.x;
    const deltaY = e.clientY - dragStart.y;

    setImageOffsetX(dragStartOffset.x + deltaX);
    setImageOffsetY(dragStartOffset.y + deltaY);
  }, [isDragging, dragStart, dragStartOffset, isImageLoaded, config.allowDrag, config.canvasWidth, config.canvasHeight, config.cropWidth, config.cropHeight, cropX, cropY]);

  const handleMouseUp = useCallback(() => {
    if (isDragging) {
      setIsDragging(false);
      if (canvasRef.current) {
        canvasRef.current.style.cursor = 'grab';
      }
    }
  }, [isDragging]);

  const handleMouseLeave = useCallback(() => {
    if (isDragging) {
      setIsDragging(false);
      if (canvasRef.current) {
        canvasRef.current.style.cursor = 'default';
      }
    }
  }, [isDragging]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (!config.allowZoom) return;

    e.preventDefault();
    const delta = e.deltaY > 0 ? -config.zoomStep : config.zoomStep;
    setImageScale(prev => Math.max(config.zoomMin, Math.min(config.zoomMax, prev + delta)));
  }, [config.allowZoom, config.zoomStep, config.zoomMin, config.zoomMax]);

  return (
    <div className={`interactive-image-cropper ${className}`}>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Left Column - Editor */}
        <div className="flex flex-col items-center">
          <canvas
            ref={canvasRef}
            width={config.canvasWidth}
            height={config.canvasHeight}
            onWheel={handleWheel}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseLeave}
            className="border border-gray-300 rounded-lg max-w-full h-auto cursor-default"
          />

          <img
            ref={imageRef}
            crossOrigin="anonymous"
            style={{ display: 'none' }}
            alt="Crop source"
          />

          {/* Control Buttons */}
          <div className="mt-4 flex gap-2 justify-center items-center flex-wrap">
            {/* Centering Controls */}
            <button
              onClick={handleCenterHorizontal}
              className="px-3 py-2 text-xs bg-gray-50 border border-gray-300 rounded hover:bg-gray-100 min-w-[32px]"
              title="Center Horizontally"
              type="button"
            >
              ↔
            </button>
            <button
              onClick={handleCenterVertical}
              className="px-3 py-2 text-xs bg-gray-50 border border-gray-300 rounded hover:bg-gray-100 min-w-[32px]"
              title="Center Vertically"
              type="button"
            >
              ↕
            </button>
            <button
              onClick={handleCenterBoth}
              className="px-3 py-2 text-xs bg-[#ed6437] text-white border border-[#ed6437] rounded hover:bg-[#d95a31] min-w-[32px]"
              title="Center Both"
              type="button"
            >
              ⊕
            </button>

            <div className="w-px h-6 bg-gray-300 mx-1"></div>

            {/* Zoom Controls */}
            {config.allowZoom && (
              <>
                <button
                  onClick={handleZoomOut}
                  className="px-3 py-2 text-sm bg-gray-50 border border-gray-300 rounded hover:bg-gray-100 min-w-[32px]"
                  title="Zoom Out"
                  type="button"
                >
                  -
                </button>
                <span className="text-xs font-bold min-w-[35px] text-center text-[#ed6437]">
                  {imageScale}%
                </span>
                <button
                  onClick={handleZoomIn}
                  className="px-3 py-2 text-sm bg-gray-50 border border-gray-300 rounded hover:bg-gray-100 min-w-[32px]"
                  title="Zoom In"
                  type="button"
                >
                  +
                </button>
              </>
            )}

            {/* Rotation Control */}
            {config.allowRotation && (
              <>
                <div className="w-px h-6 bg-gray-300 mx-1"></div>

                <button
                  onClick={handleRotateRight}
                  className="px-3 py-2 text-xs bg-gray-50 border border-gray-300 rounded hover:bg-gray-100 min-w-[32px] flex items-center justify-center"
                  title={`Rotate 90° (Currently: ${imageRotation}°)`}
                  type="button"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M15 4.5l-4 4L7 4.5"/>
                    <path d="M11 8.5V21"/>
                    <path d="M21 12a9 9 0 1 1-9-9"/>
                  </svg>
                </button>
                {imageRotation !== 0 && (
                  <span className="text-xs font-bold min-w-[25px] text-center text-gray-600">
                    {imageRotation}°
                  </span>
                )}
              </>
            )}
          </div>
        </div>

        {/* Right Column - Preview */}
        <div className="flex flex-col items-center pt-5">
          <h3 className="text-base font-bold text-[#022641] mb-4 text-center">
            Live Preview
          </h3>

          <div
            className="overflow-hidden bg-white flex items-center justify-center"
            style={{
              width: `${config.previewWidth}px`,
              height: `${config.previewHeight}px`,
              borderRadius: config.previewBorderRadius,
              boxShadow: config.previewShadow,
              border: config.previewBorder
            }}
          >
            <canvas
              ref={previewCanvasRef}
              width={config.previewWidth}
              height={config.previewHeight}
              className="object-contain"
              style={{
                width: '100%',
                height: '100%',
                borderRadius: config.previewBorderRadius
              }}
            />
          </div>

          <p className="text-xs text-gray-500 text-center mt-2 max-w-[200px]">
            This is how your {context} will appear in the live preview
          </p>

          {/* Context-aware tips */}
          {context === 'cover' && (
            <div className="text-xs text-[#8d918d] bg-gray-50 p-2 rounded mt-3 max-w-[280px]">
              <strong>Cover Image Tips:</strong> Choose a high-quality image that showcases your business, products, or services. This appears as your hero banner at 1920×600px on desktop. Landscape orientation works best.
            </div>
          )}

          {context === 'logo' && (
            <div className="text-xs text-[#8d918d] bg-gray-50 p-2 rounded mt-3 max-w-[280px]">
              <strong>Logo Tips:</strong> Use a clear, high-contrast logo that works on both light and dark backgrounds. Square format works best. Recommended: 300x300px, Minimum: 150x150px.
            </div>
          )}
        </div>
      </div>

      {/* Debug Info */}
      {showDebug && (
        <div className="mt-5 p-2 bg-yellow-50 rounded text-xs break-all">
          <strong>Debug:</strong> {debugInfo} | Scale: {imageScale}% | Rotation: {imageRotation}° | Offset: {imageOffsetX},{imageOffsetY}
        </div>
      )}
    </div>
  );
}
