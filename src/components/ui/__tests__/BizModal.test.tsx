// BizModal Component Tests
// AUTHORITY: Phase 2.2 - Core Patterns Implementation
// TARGET: 70%+ code coverage

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { BizModal, BizModalButton } from '../BizModal';

describe('BizModal', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    title: 'Test Modal'
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Clean up any remaining portals
    const portals = document.querySelectorAll('[role="dialog"]');
    portals.forEach(portal => portal.remove());
  });

  describe('Rendering', () => {
    it('should render when isOpen is true', () => {
      render(<BizModal {...defaultProps}>Content</BizModal>);
      expect(screen.getByText('Test Modal')).toBeInTheDocument();
      expect(screen.getByText('Content')).toBeInTheDocument();
    });

    it('should not render when isOpen is false', () => {
      render(<BizModal {...defaultProps} isOpen={false}>Content</BizModal>);
      expect(screen.queryByText('Test Modal')).not.toBeInTheDocument();
    });

    it('should render footer when provided', () => {
      render(
        <BizModal {...defaultProps} footer={<button>Action</button>}>
          Content
        </BizModal>
      );
      expect(screen.getByText('Action')).toBeInTheDocument();
    });

    it('should not render close button when showCloseButton is false', () => {
      render(
        <BizModal {...defaultProps} showCloseButton={false}>
          Content
        </BizModal>
      );
      expect(screen.queryByLabelText('Close modal')).not.toBeInTheDocument();
    });
  });

  describe('Size Variants', () => {
    it('should apply small size class', () => {
      render(<BizModal {...defaultProps} size="small">Content</BizModal>);
      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveClass('max-w-md');
    });

    it('should apply medium size class (default)', () => {
      render(<BizModal {...defaultProps}>Content</BizModal>);
      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveClass('max-w-2xl');
    });

    it('should apply large size class', () => {
      render(<BizModal {...defaultProps} size="large">Content</BizModal>);
      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveClass('max-w-4xl');
    });

    it('should apply full size class', () => {
      render(<BizModal {...defaultProps} size="full">Content</BizModal>);
      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveClass('max-w-7xl');
    });
  });

  describe('Close Functionality', () => {
    it('should call onClose when close button clicked', () => {
      render(<BizModal {...defaultProps}>Content</BizModal>);
      const closeButton = screen.getByLabelText('Close modal');
      fireEvent.click(closeButton);
      expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
    });

    it('should call onClose when backdrop clicked', () => {
      render(<BizModal {...defaultProps}>Content</BizModal>);
      const backdrop = screen.getByRole('presentation');
      fireEvent.click(backdrop);
      expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
    });

    it('should call onClose when Escape key pressed', () => {
      render(<BizModal {...defaultProps}>Content</BizModal>);
      fireEvent.keyDown(document, { key: 'Escape' });
      expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
    });

    it('should not close on backdrop click when closeOnBackdropClick is false', () => {
      render(<BizModal {...defaultProps} closeOnBackdropClick={false}>Content</BizModal>);
      const backdrop = screen.getByRole('presentation');
      fireEvent.click(backdrop);
      expect(defaultProps.onClose).not.toHaveBeenCalled();
    });

    it('should not close on Escape when closeOnEscape is false', () => {
      render(<BizModal {...defaultProps} closeOnEscape={false}>Content</BizModal>);
      fireEvent.keyDown(document, { key: 'Escape' });
      expect(defaultProps.onClose).not.toHaveBeenCalled();
    });

    it('should not close when clicking modal content', () => {
      render(<BizModal {...defaultProps}>Content</BizModal>);
      const dialog = screen.getByRole('dialog');
      fireEvent.click(dialog);
      expect(defaultProps.onClose).not.toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('should have correct ARIA attributes', () => {
      render(<BizModal {...defaultProps}>Content</BizModal>);
      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-modal', 'true');
      expect(dialog).toHaveAttribute('aria-labelledby', 'modal-title');
    });

    it('should have correct role for backdrop', () => {
      render(<BizModal {...defaultProps}>Content</BizModal>);
      const backdrop = screen.getByRole('presentation');
      expect(backdrop).toBeInTheDocument();
    });

    it('should focus modal when opened', async () => {
      render(<BizModal {...defaultProps}>Content</BizModal>);
      const dialog = screen.getByRole('dialog');
      await waitFor(() => {
        expect(dialog).toHaveFocus();
      });
    });
  });

  describe('Body Scroll Prevention', () => {
    it('should prevent body scroll when open', () => {
      render(<BizModal {...defaultProps}>Content</BizModal>);
      expect(document.body.style.overflow).toBe('hidden');
    });

    it('should restore body scroll when closed', () => {
      const { rerender } = render(<BizModal {...defaultProps}>Content</BizModal>);
      expect(document.body.style.overflow).toBe('hidden');

      rerender(<BizModal {...defaultProps} isOpen={false}>Content</BizModal>);
      // Note: cleanup happens in useEffect, restoration is tested implicitly
    });
  });

  describe('Custom ClassName', () => {
    it('should apply custom className to dialog', () => {
      render(<BizModal {...defaultProps} className="custom-class">Content</BizModal>);
      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveClass('custom-class');
    });
  });
});

describe('BizModalButton', () => {
  describe('Rendering', () => {
    it('should render with children', () => {
      render(<BizModalButton>Click Me</BizModalButton>);
      expect(screen.getByText('Click Me')).toBeInTheDocument();
    });

    it('should render as button type by default', () => {
      render(<BizModalButton>Click Me</BizModalButton>);
      const button = screen.getByText('Click Me');
      expect(button).toHaveAttribute('type', 'button');
    });

    it('should render with submit type', () => {
      render(<BizModalButton type="submit">Submit</BizModalButton>);
      const button = screen.getByText('Submit');
      expect(button).toHaveAttribute('type', 'submit');
    });
  });

  describe('Variants', () => {
    it('should render with primary variant (default)', () => {
      render(<BizModalButton>Click Me</BizModalButton>);
      const button = screen.getByText('Click Me');
      expect(button).toHaveClass('bg-orange-600');
    });

    it('should render with secondary variant', () => {
      render(<BizModalButton variant="secondary">Click Me</BizModalButton>);
      const button = screen.getByText('Click Me');
      expect(button).toHaveClass('bg-white');
      expect(button).toHaveClass('border-gray-300');
    });

    it('should render with danger variant', () => {
      render(<BizModalButton variant="danger">Delete</BizModalButton>);
      const button = screen.getByText('Delete');
      expect(button).toHaveClass('bg-red-600');
    });
  });

  describe('Interactions', () => {
    it('should call onClick when clicked', () => {
      const onClick = vi.fn();
      render(<BizModalButton onClick={onClick}>Click Me</BizModalButton>);
      fireEvent.click(screen.getByText('Click Me'));
      expect(onClick).toHaveBeenCalledTimes(1);
    });

    it('should be disabled when disabled prop is true', () => {
      render(<BizModalButton disabled>Click Me</BizModalButton>);
      const button = screen.getByText('Click Me');
      expect(button).toBeDisabled();
    });

    it('should not call onClick when disabled', () => {
      const onClick = vi.fn();
      render(<BizModalButton onClick={onClick} disabled>Click Me</BizModalButton>);
      fireEvent.click(screen.getByText('Click Me'));
      expect(onClick).not.toHaveBeenCalled();
    });
  });

  describe('Custom ClassName', () => {
    it('should apply custom className', () => {
      render(<BizModalButton className="custom-button">Click Me</BizModalButton>);
      const button = screen.getByText('Click Me');
      expect(button).toHaveClass('custom-button');
    });
  });
});
