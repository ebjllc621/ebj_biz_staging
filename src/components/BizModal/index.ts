/**
 * BizModal Component Exports
 *
 * @authority master_build_v_4_4_0.md section 9.2
 * @governance All modals MUST use BizModal template - branded header mandatory
 */

export { default } from './BizModal';
export { default as BizModal } from './BizModal';
export type { BizModalProps } from './BizModal';

// Button component (for backward compatibility with ui/BizModal imports)
export { BizModalButton } from './BizModal';
export type { BizModalButtonProps } from './BizModal';

// Helper components
export {
  BizModalSectionHeader,
  BizModalInput,
  BizModalTextarea,
  BizModalFormGrid,
} from './BizModal';

export type {
  BizModalSectionHeaderProps,
  BizModalInputProps,
  BizModalTextareaProps,
} from './BizModal';
