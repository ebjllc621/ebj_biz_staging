/**
 * ImageSEOEditModal component tests
 *
 * @tier STANDARD
 * @phase Phase 7a - Unit Tests
 * @authority docs/media/galleryformat/phases/PHASE_7_UI_TESTING_INTEGRATION_BRAIN_PLAN.md
 * @target 70%+ coverage
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ImageSEOEditModal } from '../ImageSEOEditModal';

describe('ImageSEOEditModal', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    imageUrl: 'https://example.com/image.jpg',
    currentAltText: 'Current alt text',
    currentTitleText: 'Current title',
    onSave: vi.fn().mockResolvedValue(undefined),
    isSaving: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    defaultProps.onSave = vi.fn().mockResolvedValue(undefined);
  });

  // ---------------------------------------------------------------------------
  // Rendering
  // ---------------------------------------------------------------------------

  describe('Rendering', () => {
    it('should render modal when isOpen is true', () => {
      render(<ImageSEOEditModal {...defaultProps} />);
      expect(screen.getByText('Edit SEO Metadata')).toBeInTheDocument();
    });

    it('should NOT render modal when isOpen is false', () => {
      render(<ImageSEOEditModal {...defaultProps} isOpen={false} />);
      expect(screen.queryByText('Edit SEO Metadata')).not.toBeInTheDocument();
    });

    it('should render image preview with correct src', () => {
      render(<ImageSEOEditModal {...defaultProps} />);
      const img = screen.getByRole('img', { name: /media preview/i });
      expect(img).toHaveAttribute('src', 'https://example.com/image.jpg');
    });

    it('should render alt text input with current value', () => {
      render(<ImageSEOEditModal {...defaultProps} />);
      const input = screen.getByRole('textbox', { name: /alt text/i });
      expect(input).toHaveValue('Current alt text');
    });

    it('should render title text input with current value', () => {
      render(<ImageSEOEditModal {...defaultProps} />);
      const input = screen.getByRole('textbox', { name: /title text/i });
      expect(input).toHaveValue('Current title');
    });

    it('should render alt text character counter', () => {
      render(<ImageSEOEditModal {...defaultProps} currentAltText="Hello" />);
      expect(screen.getByText('5/255')).toBeInTheDocument();
    });

    it('should render title text character counter', () => {
      render(<ImageSEOEditModal {...defaultProps} currentTitleText="Hi" />);
      expect(screen.getByText('2/60')).toBeInTheDocument();
    });

    it('should have aria-required="true" on alt text input', () => {
      render(<ImageSEOEditModal {...defaultProps} />);
      const input = document.getElementById('seo-alt-text');
      expect(input).toHaveAttribute('aria-required', 'true');
    });

    it('should have maxLength 255 on alt text input', () => {
      render(<ImageSEOEditModal {...defaultProps} />);
      expect(document.getElementById('seo-alt-text')).toHaveAttribute('maxlength', '255');
    });

    it('should have maxLength 60 on title text input', () => {
      render(<ImageSEOEditModal {...defaultProps} />);
      expect(document.getElementById('seo-title-text')).toHaveAttribute('maxlength', '60');
    });
  });

  // ---------------------------------------------------------------------------
  // Form state sync
  // ---------------------------------------------------------------------------

  describe('Form state synchronization', () => {
    it('should sync form values when modal opens with new props', () => {
      const { rerender } = render(
        <ImageSEOEditModal {...defaultProps} isOpen={false} currentAltText="Old text" />
      );

      rerender(
        <ImageSEOEditModal {...defaultProps} isOpen={true} currentAltText="New text" />
      );

      const altInput = screen.getByRole('textbox', { name: /alt text/i });
      expect(altInput).toHaveValue('New text');
    });

    it('should update character counter as user types in alt text', () => {
      render(<ImageSEOEditModal {...defaultProps} currentAltText="" />);
      const input = screen.getByRole('textbox', { name: /alt text/i });
      fireEvent.change(input, { target: { value: 'Hello World' } });
      expect(screen.getByText('11/255')).toBeInTheDocument();
    });

    it('should update character counter as user types in title text', () => {
      render(<ImageSEOEditModal {...defaultProps} currentTitleText="" />);
      const input = screen.getByRole('textbox', { name: /title text/i });
      fireEvent.change(input, { target: { value: 'My Title' } });
      expect(screen.getByText('8/60')).toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // Save button state
  // ---------------------------------------------------------------------------

  describe('Save button state', () => {
    it('should have Save button enabled when alt text is non-empty', () => {
      render(<ImageSEOEditModal {...defaultProps} currentAltText="Valid alt" />);
      const saveButton = screen.getByRole('button', { name: /save seo/i });
      expect(saveButton).not.toBeDisabled();
    });

    it('should have Save button disabled when alt text is empty', () => {
      render(<ImageSEOEditModal {...defaultProps} currentAltText="" />);
      const saveButton = screen.getByRole('button', { name: /save seo/i });
      expect(saveButton).toBeDisabled();
    });

    it('should have Save button disabled when alt text is only whitespace', () => {
      render(<ImageSEOEditModal {...defaultProps} currentAltText="   " />);
      // The form syncs on open, so alt text will be "   " - not valid
      const saveButton = screen.getByRole('button', { name: /save seo/i });
      expect(saveButton).toBeDisabled();
    });

    it('should have Save button disabled when isSaving', () => {
      render(<ImageSEOEditModal {...defaultProps} isSaving={true} />);
      const saveButton = screen.getByRole('button', { name: /saving/i });
      expect(saveButton).toBeDisabled();
    });

    it('should show "Saving..." text when isSaving', () => {
      render(<ImageSEOEditModal {...defaultProps} isSaving={true} />);
      expect(screen.getByText('Saving...')).toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // Cancel behavior
  // ---------------------------------------------------------------------------

  describe('Cancel behavior', () => {
    it('should call onClose when Cancel button is clicked', () => {
      render(<ImageSEOEditModal {...defaultProps} />);
      fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
      expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
    });

    it('should have Cancel button disabled when isSaving', () => {
      render(<ImageSEOEditModal {...defaultProps} isSaving={true} />);
      expect(screen.getByRole('button', { name: /cancel/i })).toBeDisabled();
    });
  });

  // ---------------------------------------------------------------------------
  // Save behavior
  // ---------------------------------------------------------------------------

  describe('Save behavior', () => {
    it('should call onSave with current altText and titleText when Save is clicked', async () => {
      render(<ImageSEOEditModal {...defaultProps} />);
      const altInput = screen.getByRole('textbox', { name: /alt text/i });
      const titleInput = screen.getByRole('textbox', { name: /title text/i });

      fireEvent.change(altInput, { target: { value: 'Updated alt' } });
      fireEvent.change(titleInput, { target: { value: 'Updated title' } });
      fireEvent.click(screen.getByRole('button', { name: /save seo/i }));

      await waitFor(() => {
        expect(defaultProps.onSave).toHaveBeenCalledWith('Updated alt', 'Updated title');
      });
    });

    it('should call onSave with original values if user does not change anything', async () => {
      render(<ImageSEOEditModal {...defaultProps} />);
      fireEvent.click(screen.getByRole('button', { name: /save seo/i }));

      await waitFor(() => {
        expect(defaultProps.onSave).toHaveBeenCalledWith('Current alt text', 'Current title');
      });
    });
  });
});
