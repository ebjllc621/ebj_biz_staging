/**
 * PhotoSwipeLightbox - Production-grade lightbox wrapping the PhotoSwipe v5 library
 *
 * Supports images, embedded video providers (YouTube/Vimeo/etc), and direct video files.
 * Renders a custom thumbnail strip below the PhotoSwipe viewport via direct DOM manipulation.
 *
 * @component Client Component
 * @tier ADVANCED
 * @phase Phase 8C - Justified Layout + Enhanced Lightbox
 * @governance Build Map v2.1 ENHANCED
 */
'use client';

import { useEffect } from 'react';
import PhotoSwipeCore from 'photoswipe';
import 'photoswipe/style.css';
import type { PhotoSwipeLightboxProps, GalleryItem } from '../types/gallery-types';

// ─── Video HTML helpers ────────────────────────────────────────────────────────

function buildEmbedVideoHtml(embedUrl: string): string {
  return (
    '<div class="pswp-video-container" style="display:flex;align-items:center;justify-content:center;' +
    'width:960px;height:540px;background:#000">' +
    '<iframe src="' +
    embedUrl +
    '" style="width:100%;height:100%;border:none" ' +
    'allow="accelerometer;autoplay;clipboard-write;encrypted-media;gyroscope;picture-in-picture" ' +
    'allowfullscreen></iframe>' +
    '</div>'
  );
}

function buildDirectVideoHtml(url: string): string {
  return (
    '<div class="pswp-video-container" style="display:flex;align-items:center;justify-content:center;' +
    'width:960px;height:540px;background:#000">' +
    '<video src="' +
    url +
    '" controls autoplay style="width:100%;height:100%">Your browser does not support video.</video>' +
    '</div>'
  );
}

// ─── Slide mapping ─────────────────────────────────────────────────────────────

interface ImageSlide {
  src: string;
  width: number;
  height: number;
  alt?: string;
}

interface HtmlSlide {
  html: string;
}

type PswpSlide = ImageSlide | HtmlSlide;

function itemToSlide(item: GalleryItem): PswpSlide {
  if (item.type === 'video') {
    const isDirect = item.videoProvider === 'direct';
    if (!isDirect && item.embedUrl) {
      return { html: buildEmbedVideoHtml(item.embedUrl) };
    }
    const videoSrc = item.embedUrl || item.url;
    return { html: buildDirectVideoHtml(videoSrc) };
  }

  return {
    src: item.url,
    width: item.width ?? 1200,
    height: item.height ?? 900,
    alt: item.alt,
  };
}

// ─── Thumbnail strip ───────────────────────────────────────────────────────────

const STRIP_ID = 'pswp-thumbnail-strip';

function buildThumbnailStrip(
  items: GalleryItem[],
  activeIndex: number,
  onThumbClick: (_index: number) => void
): HTMLDivElement {
  // Outer wrapper — fixed to bottom of viewport, above PhotoSwipe overlay
  const wrapper = document.createElement('div');
  wrapper.id = STRIP_ID;
  wrapper.setAttribute(
    'style',
    'position:fixed;bottom:0;left:50%;transform:translateX(-50%);' +
      'z-index:1600;background:rgba(0,0,0,0.8);padding:8px;' +
      'border-radius:8px 8px 0 0;max-width:90vw;' +
      'display:flex;gap:4px;overflow-x:auto;align-items:center;'
  );

  items.forEach((item, index) => {
    const thumb = document.createElement('button');
    thumb.setAttribute(
      'style',
      'flex-shrink:0;width:64px;height:48px;padding:0;border:none;cursor:pointer;border-radius:4px;overflow:hidden;' +
        (index === activeIndex
          ? 'outline:2px solid #f97316;outline-offset:-2px;'
          : 'outline:none;')
    );
    thumb.setAttribute('aria-label', `Go to item ${index + 1}`);
    thumb.dataset['thumbIndex'] = String(index);

    if (item.type === 'image') {
      const img = document.createElement('img');
      img.src = item.url;
      img.alt = item.alt;
      img.setAttribute('style', 'width:100%;height:100%;object-fit:cover;display:block;');
      thumb.appendChild(img);
    } else {
      // Video placeholder
      const placeholder = document.createElement('div');
      placeholder.setAttribute(
        'style',
        'width:100%;height:100%;background:#1a1a1a;display:flex;align-items:center;' +
          'justify-content:center;color:#fff;font-size:18px;'
      );
      placeholder.textContent = '▶';
      thumb.appendChild(placeholder);
    }

    thumb.addEventListener('click', () => onThumbClick(index));
    wrapper.appendChild(thumb);
  });

  return wrapper;
}

function updateActiveThumbnail(strip: HTMLDivElement, activeIndex: number): void {
  const thumbs = strip.querySelectorAll<HTMLButtonElement>('button[data-thumb-index]');
  thumbs.forEach((thumb, index) => {
    if (index === activeIndex) {
      thumb.style.outline = '2px solid #f97316';
      thumb.style.outlineOffset = '-2px';
      thumb.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    } else {
      thumb.style.outline = 'none';
      thumb.style.outlineOffset = '0';
    }
  });
}

// ─── Component ─────────────────────────────────────────────────────────────────

export function PhotoSwipeLightbox(props: PhotoSwipeLightboxProps): null {
  const { items, currentIndex, onClose, onNavigate } = props;
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (items.length === 0) return;

    const slides = items.map(itemToSlide);

    const pswp = new PhotoSwipeCore({
      dataSource: slides,
      index: currentIndex,
      // Prevent PhotoSwipe from scrolling the page when not at zoom limit
      closeOnVerticalDrag: true,
    });

    // ── Thumbnail strip ──────────────────────────────────────────────────────
    let thumbStrip: HTMLDivElement | null = null;

    if (items.length > 1) {
      thumbStrip = buildThumbnailStrip(items, currentIndex, (idx) => {
        pswp.goTo(idx);
      });
      document.body.appendChild(thumbStrip);
    }

    // ── PhotoSwipe event registration (must be before init) ──────────────────
    pswp.on('close', () => {
      onClose();
    });

    pswp.on('change', () => {
      onNavigate(pswp.currIndex);
      if (thumbStrip) {
        updateActiveThumbnail(thumbStrip, pswp.currIndex);
      }
    });

    // ── Open the lightbox ────────────────────────────────────────────────────
    pswp.init();

    // ── Cleanup ──────────────────────────────────────────────────────────────
    return () => {
      pswp.destroy();
      if (thumbStrip && thumbStrip.parentNode) {
        thumbStrip.parentNode.removeChild(thumbStrip);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}

export default PhotoSwipeLightbox;
