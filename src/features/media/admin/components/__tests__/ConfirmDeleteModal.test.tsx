/**
 * ConfirmDeleteModal component tests
 *
 * @tier STANDARD
 * @phase Phase 7a - Unit Tests
 * @authority docs/media/galleryformat/phases/PHASE_7_UI_TESTING_INTEGRATION_BRAIN_PLAN.md
 * @target 70%+ coverage
 */

import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ConfirmDeleteModal } from '../ConfirmDeleteModal';

describe('ConfirmDeleteModal', () => {
  const defaultFileProps = {
    isOpen: true,
    onClose: vi.fn(),
    onConfirm: vi.fn(),
    itemName: 'photo.jpg',
    itemType: 'file' as const,
    isDeleting: false,
  };

  const defaultFolderProps = {
    ...defaultFileProps,
    itemName: 'gallery',
    itemType: 'folder' as const,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ---------------------------------------------------------------------------
  // Rendering - file type
  // ---------------------------------------------------------------------------

  describe('File type rendering', () => {
    it('should render when isOpen is true', () => {
      render(<ConfirmDeleteModal {...defaultFileProps} />);
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('should NOT render when isOpen is false', () => {
      render(<ConfirmDeleteModal {...defaultFileProps} isOpen={false} />);
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('should render title "Delete File" for file type', () => {
      render(<ConfirmDeleteModal {...defaultFileProps} />);
      // Title appears in heading, button label also contains "Delete File" - use getAllByText
      const matches = screen.getAllByText('Delete File');
      expect(matches.length).toBeGreaterThanOrEqual(1);
    });

    it('should show itemName in the confirmation message', () => {
      render(<ConfirmDeleteModal {...defaultFileProps} />);
      expect(screen.getByText(/photo\.jpg/)).toBeInTheDocument();
    });

    it('should show file permanence message for file type', () => {
      render(<ConfirmDeleteModal {...defaultFileProps} />);
      expect(
        screen.getByText(/This file will be permanently deleted and cannot be recovered/)
      ).toBeInTheDocument();
    });

    it('should NOT show folder recursive warning for file type', () => {
      render(<ConfirmDeleteModal {...defaultFileProps} />);
      expect(
        screen.queryByText(/permanently delete the folder and all its contents/)
      ).not.toBeInTheDocument();
    });

    it('should render Delete File button text', () => {
      render(<ConfirmDeleteModal {...defaultFileProps} />);
      expect(screen.getByRole('button', { name: /^delete file$/i })).toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // Rendering - folder type
  // ---------------------------------------------------------------------------

  describe('Folder type rendering', () => {
    it('should render title "Delete Folder" for folder type', () => {
      render(<ConfirmDeleteModal {...defaultFolderProps} />);
      const matches = screen.getAllByText('Delete Folder');
      expect(matches.length).toBeGreaterThanOrEqual(1);
    });

    it('should show itemName in the confirmation message for folder', () => {
      render(<ConfirmDeleteModal {...defaultFolderProps} />);
      expect(screen.getByText(/gallery/)).toBeInTheDocument();
    });

    it('should show recursive deletion warning for folder type', () => {
      render(<ConfirmDeleteModal {...defaultFolderProps} />);
      expect(
        screen.getByText(/This will permanently delete the folder and all its contents/)
      ).toBeInTheDocument();
    });

    it('should NOT show file permanence message for folder type', () => {
      render(<ConfirmDeleteModal {...defaultFolderProps} />);
      expect(
        screen.queryByText(/This file will be permanently deleted and cannot be recovered/)
      ).not.toBeInTheDocument();
    });

    it('should render Delete Folder button text', () => {
      render(<ConfirmDeleteModal {...defaultFolderProps} />);
      expect(screen.getByRole('button', { name: /^delete folder$/i })).toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // Button interactions
  // ---------------------------------------------------------------------------

  describe('Cancel button', () => {
    it('should call onClose when Cancel is clicked', () => {
      render(<ConfirmDeleteModal {...defaultFileProps} />);
      fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
      expect(defaultFileProps.onClose).toHaveBeenCalledTimes(1);
    });

    it('should have Cancel button disabled when isDeleting', () => {
      render(<ConfirmDeleteModal {...defaultFileProps} isDeleting={true} />);
      expect(screen.getByRole('button', { name: /cancel/i })).toBeDisabled();
    });

    it('should have Cancel button enabled when not deleting', () => {
      render(<ConfirmDeleteModal {...defaultFileProps} />);
      expect(screen.getByRole('button', { name: /cancel/i })).not.toBeDisabled();
    });
  });

  describe('Delete (confirm) button', () => {
    it('should call onConfirm when Delete File button is clicked', () => {
      render(<ConfirmDeleteModal {...defaultFileProps} />);
      fireEvent.click(screen.getByRole('button', { name: /^delete file$/i }));
      expect(defaultFileProps.onConfirm).toHaveBeenCalledTimes(1);
    });

    it('should call onConfirm when Delete Folder button is clicked', () => {
      render(<ConfirmDeleteModal {...defaultFolderProps} />);
      fireEvent.click(screen.getByRole('button', { name: /^delete folder$/i }));
      expect(defaultFolderProps.onConfirm).toHaveBeenCalledTimes(1);
    });

    it('should show "Deleting..." text when isDeleting is true', () => {
      render(<ConfirmDeleteModal {...defaultFileProps} isDeleting={true} />);
      expect(screen.getByText('Deleting...')).toBeInTheDocument();
    });

    it('should have Delete button disabled when isDeleting', () => {
      render(<ConfirmDeleteModal {...defaultFileProps} isDeleting={true} />);
      const deletingButton = screen.getByRole('button', { name: /deleting/i });
      expect(deletingButton).toBeDisabled();
    });

    it('should have Delete button enabled when not deleting', () => {
      render(<ConfirmDeleteModal {...defaultFileProps} />);
      expect(screen.getByRole('button', { name: /^delete file$/i })).not.toBeDisabled();
    });

    it('should not call onConfirm when isDeleting and button is clicked', () => {
      render(<ConfirmDeleteModal {...defaultFileProps} isDeleting={true} />);
      const deletingButton = screen.getByRole('button', { name: /deleting/i });
      fireEvent.click(deletingButton);
      expect(defaultFileProps.onConfirm).not.toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // AlertTriangle icon presence
  // ---------------------------------------------------------------------------

  describe('Warning icon', () => {
    it('should render an SVG warning icon in the modal body', () => {
      render(<ConfirmDeleteModal {...defaultFileProps} />);
      // AlertTriangle from lucide-react renders as SVG. BizModal renders via portal
      // so SVGs appear in document.body, not the render container
      const svgs = document.body.querySelectorAll('svg');
      expect(svgs.length).toBeGreaterThan(0);
    });
  });

  // ---------------------------------------------------------------------------
  // itemName display
  // ---------------------------------------------------------------------------

  describe('Item name display', () => {
    it('should display itemName in bold within the message', () => {
      render(<ConfirmDeleteModal {...defaultFileProps} itemName="important-photo.png" />);
      // The strong element contains the itemName (HTML entities render as curly quotes around it)
      const strongElements = document.querySelectorAll('strong');
      const found = Array.from(strongElements).some((el) =>
        el.textContent?.includes('important-photo.png')
      );
      expect(found).toBe(true);
    });

    it('should display folder name in bold', () => {
      render(<ConfirmDeleteModal {...defaultFolderProps} itemName="my-folder" />);
      const strongElements = document.querySelectorAll('strong');
      const found = Array.from(strongElements).some((el) =>
        el.textContent?.includes('my-folder')
      );
      expect(found).toBe(true);
    });
  });
});
