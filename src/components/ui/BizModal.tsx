/**
 * BizModal Re-export Module
 *
 * GOVERNANCE: This file re-exports from the canonical branded BizModal component.
 * All modals MUST use the branded version with Bizconekt gradient header and logo.
 *
 * @authority master_build_v_4_4_0.md section 9.2 (BizModal required)
 * @canonical src/components/BizModal/BizModal.tsx
 *
 * NOTE: This file exists for backward compatibility with existing imports.
 * New code should import directly from '@/components/BizModal'.
 */

'use client';

// Re-export everything from the canonical branded BizModal
export {
  default as BizModal,
  BizModalButton,
  BizModalSectionHeader,
  BizModalInput,
  BizModalTextarea,
  BizModalFormGrid,
} from '@/components/BizModal';

export type {
  BizModalProps,
  BizModalButtonProps,
  BizModalSectionHeaderProps,
  BizModalInputProps,
  BizModalTextareaProps,
} from '@/components/BizModal';
