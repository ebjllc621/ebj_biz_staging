/**
 * UploadDropZone component tests
 *
 * @tier ADVANCED
 * @phase Phase 7a - Unit Tests
 * @authority docs/media/galleryformat/phases/PHASE_7_UI_TESTING_INTEGRATION_BRAIN_PLAN.md
 * @target 70%+ coverage
 */

import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import UploadDropZone from '../UploadDropZone';

describe('UploadDropZone', () => {
  const defaultProps = {
    onFileSelect: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  function makeFile(name = 'test.jpg', type = 'image/jpeg', sizeMB = 1): File {
    const bytes = sizeMB * 1024 * 1024;
    const content = new Uint8Array(bytes);
    return new File([content], name, { type });
  }

  function makeDragEvent(files: File[]) {
    return {
      dataTransfer: {
        files: files as unknown as FileList,
      },
    };
  }

  // ---------------------------------------------------------------------------
  // Rendering - drop zone state (no preview)
  // ---------------------------------------------------------------------------

  describe('Drop zone rendering (no preview)', () => {
    it('should render the drop zone button when no currentPreview', () => {
      render(<UploadDropZone {...defaultProps} />);
      expect(screen.getByRole('button', { name: /upload file/i })).toBeInTheDocument();
    });

    it('should have correct aria-label on drop zone', () => {
      render(<UploadDropZone {...defaultProps} />);
      const zone = screen.getByRole('button');
      expect(zone).toHaveAttribute('aria-label', 'Upload file — drag and drop or click to browse');
    });

    it('should have tabIndex 0 when not disabled', () => {
      render(<UploadDropZone {...defaultProps} />);
      expect(screen.getByRole('button')).toHaveAttribute('tabindex', '0');
    });

    it('should display "Browse files" label', () => {
      render(<UploadDropZone {...defaultProps} />);
      expect(screen.getByText('Browse files')).toBeInTheDocument();
    });

    it('should display default format hint text', () => {
      render(<UploadDropZone {...defaultProps} />);
      expect(screen.getByText(/JPEG, PNG, GIF, WEBP up to 10MB/)).toBeInTheDocument();
    });

    it('should display custom format hint when acceptedFormats provided', () => {
      render(<UploadDropZone {...defaultProps} acceptedFormats="image/png,image/webp" maxFileSizeMB={5} />);
      expect(screen.getByText(/PNG, WEBP up to 5MB/)).toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // Rendering - preview state
  // ---------------------------------------------------------------------------

  describe('Preview state rendering', () => {
    it('should render img element when currentPreview is provided', () => {
      render(<UploadDropZone {...defaultProps} currentPreview="https://example.com/image.jpg" />);
      const img = screen.getByRole('img', { name: /upload preview/i });
      expect(img).toBeInTheDocument();
      expect(img).toHaveAttribute('src', 'https://example.com/image.jpg');
    });

    it('should NOT render drop zone button when currentPreview is provided', () => {
      render(<UploadDropZone {...defaultProps} currentPreview="https://example.com/image.jpg" />);
      expect(screen.queryByRole('button', { name: /upload file/i })).not.toBeInTheDocument();
    });

    it('should render clear button when onClear and currentPreview both provided', () => {
      const onClear = vi.fn();
      render(
        <UploadDropZone
          {...defaultProps}
          currentPreview="https://example.com/image.jpg"
          onClear={onClear}
        />
      );
      expect(screen.getByRole('button', { name: /remove selected file/i })).toBeInTheDocument();
    });

    it('should NOT render clear button when onClear not provided', () => {
      render(
        <UploadDropZone {...defaultProps} currentPreview="https://example.com/image.jpg" />
      );
      expect(screen.queryByRole('button', { name: /remove selected file/i })).not.toBeInTheDocument();
    });

    it('should call onClear when clear button is clicked', () => {
      const onClear = vi.fn();
      render(
        <UploadDropZone
          {...defaultProps}
          currentPreview="https://example.com/image.jpg"
          onClear={onClear}
        />
      );
      fireEvent.click(screen.getByRole('button', { name: /remove selected file/i }));
      expect(onClear).toHaveBeenCalledTimes(1);
    });
  });

  // ---------------------------------------------------------------------------
  // Disabled state
  // ---------------------------------------------------------------------------

  describe('Disabled state', () => {
    it('should have tabIndex -1 when disabled', () => {
      render(<UploadDropZone {...defaultProps} disabled />);
      expect(screen.getByRole('button')).toHaveAttribute('tabindex', '-1');
    });

    it('should have aria-disabled="true" when disabled', () => {
      render(<UploadDropZone {...defaultProps} disabled />);
      expect(screen.getByRole('button')).toHaveAttribute('aria-disabled', 'true');
    });

    it('should not call onFileSelect when file dropped on disabled zone', () => {
      render(<UploadDropZone {...defaultProps} disabled />);
      const zone = screen.getByRole('button');
      const file = makeFile();
      fireEvent.drop(zone, makeDragEvent([file]));
      expect(defaultProps.onFileSelect).not.toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // File input change (click to select)
  // ---------------------------------------------------------------------------

  describe('File input selection', () => {
    it('should call onFileSelect with valid jpeg file', () => {
      render(<UploadDropZone {...defaultProps} />);
      const input = document.querySelector('input[type="file"]') as HTMLInputElement;
      const file = makeFile('photo.jpg', 'image/jpeg', 1);
      Object.defineProperty(input, 'files', { value: [file], configurable: true });
      fireEvent.change(input);
      expect(defaultProps.onFileSelect).toHaveBeenCalledWith(file);
    });

    it('should call onFileSelect with valid png file', () => {
      render(<UploadDropZone {...defaultProps} />);
      const input = document.querySelector('input[type="file"]') as HTMLInputElement;
      const file = makeFile('image.png', 'image/png', 2);
      Object.defineProperty(input, 'files', { value: [file], configurable: true });
      fireEvent.change(input);
      expect(defaultProps.onFileSelect).toHaveBeenCalledWith(file);
    });

    it('should NOT call onFileSelect when file type is rejected', () => {
      render(<UploadDropZone {...defaultProps} acceptedFormats="image/jpeg" />);
      const input = document.querySelector('input[type="file"]') as HTMLInputElement;
      const file = makeFile('doc.pdf', 'application/pdf', 1);
      Object.defineProperty(input, 'files', { value: [file], configurable: true });
      fireEvent.change(input);
      expect(defaultProps.onFileSelect).not.toHaveBeenCalled();
    });

    it('should show type error message when file type is rejected', () => {
      render(<UploadDropZone {...defaultProps} acceptedFormats="image/jpeg" />);
      const input = document.querySelector('input[type="file"]') as HTMLInputElement;
      const file = makeFile('doc.pdf', 'application/pdf', 1);
      Object.defineProperty(input, 'files', { value: [file], configurable: true });
      fireEvent.change(input);
      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByRole('alert')).toHaveTextContent(/unsupported file type/i);
    });

    it('should NOT call onFileSelect when file exceeds maxFileSizeMB', () => {
      render(<UploadDropZone {...defaultProps} maxFileSizeMB={1} />);
      const input = document.querySelector('input[type="file"]') as HTMLInputElement;
      const file = makeFile('large.jpg', 'image/jpeg', 5);
      Object.defineProperty(input, 'files', { value: [file], configurable: true });
      fireEvent.change(input);
      expect(defaultProps.onFileSelect).not.toHaveBeenCalled();
    });

    it('should show size error message when file is too large', () => {
      render(<UploadDropZone {...defaultProps} maxFileSizeMB={1} />);
      const input = document.querySelector('input[type="file"]') as HTMLInputElement;
      const file = makeFile('large.jpg', 'image/jpeg', 5);
      Object.defineProperty(input, 'files', { value: [file], configurable: true });
      fireEvent.change(input);
      expect(screen.getByRole('alert')).toHaveTextContent(/file too large/i);
    });

    it('should not call onFileSelect when no files in input', () => {
      render(<UploadDropZone {...defaultProps} />);
      const input = document.querySelector('input[type="file"]') as HTMLInputElement;
      Object.defineProperty(input, 'files', { value: [], configurable: true });
      fireEvent.change(input);
      expect(defaultProps.onFileSelect).not.toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // Drag events
  // ---------------------------------------------------------------------------

  describe('Drag interactions', () => {
    it('should show "Drop file here" text during dragEnter', () => {
      render(<UploadDropZone {...defaultProps} />);
      const zone = screen.getByRole('button');
      fireEvent.dragEnter(zone);
      expect(screen.getByText('Drop file here')).toBeInTheDocument();
    });

    it('should hide "Browse files" button during dragging', () => {
      render(<UploadDropZone {...defaultProps} />);
      const zone = screen.getByRole('button');
      fireEvent.dragEnter(zone);
      expect(screen.queryByText('Browse files')).not.toBeInTheDocument();
    });

    it('should restore default text after dragLeave', () => {
      render(<UploadDropZone {...defaultProps} />);
      const zone = screen.getByRole('button');
      fireEvent.dragEnter(zone);
      fireEvent.dragLeave(zone);
      expect(screen.getByText(/drag and drop your file here/i)).toBeInTheDocument();
    });

    it('should call onFileSelect when valid file dropped', () => {
      render(<UploadDropZone {...defaultProps} />);
      const zone = screen.getByRole('button');
      const file = makeFile('photo.jpg', 'image/jpeg', 1);
      fireEvent.drop(zone, makeDragEvent([file]));
      expect(defaultProps.onFileSelect).toHaveBeenCalledWith(file);
    });

    it('should NOT call onFileSelect when invalid file dropped', () => {
      render(<UploadDropZone {...defaultProps} acceptedFormats="image/jpeg" />);
      const zone = screen.getByRole('button');
      const file = makeFile('video.mp4', 'video/mp4', 2);
      fireEvent.drop(zone, makeDragEvent([file]));
      expect(defaultProps.onFileSelect).not.toHaveBeenCalled();
    });

    it('should not toggle dragging state when disabled', () => {
      render(<UploadDropZone {...defaultProps} disabled />);
      const zone = screen.getByRole('button');
      fireEvent.dragEnter(zone);
      // Should still show default text, not "Drop file here"
      expect(screen.queryByText('Drop file here')).not.toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // Keyboard interactions
  // ---------------------------------------------------------------------------

  describe('Keyboard interactions', () => {
    it('should trigger file input click on Enter key', () => {
      render(<UploadDropZone {...defaultProps} />);
      const zone = screen.getByRole('button');
      const input = document.querySelector('input[type="file"]') as HTMLInputElement;
      const clickSpy = vi.spyOn(input, 'click');
      fireEvent.keyDown(zone, { key: 'Enter' });
      // jsdom's role="button" may also fire a synthetic click on Enter; verify at least 1 call
      expect(clickSpy).toHaveBeenCalled();
    });

    it('should trigger file input click on Space key', () => {
      render(<UploadDropZone {...defaultProps} />);
      const zone = screen.getByRole('button');
      const input = document.querySelector('input[type="file"]') as HTMLInputElement;
      const clickSpy = vi.spyOn(input, 'click');
      fireEvent.keyDown(zone, { key: ' ' });
      expect(clickSpy).toHaveBeenCalled();
    });

    it('should NOT trigger file input on other keys', () => {
      render(<UploadDropZone {...defaultProps} />);
      const zone = screen.getByRole('button');
      const input = document.querySelector('input[type="file"]') as HTMLInputElement;
      const clickSpy = vi.spyOn(input, 'click');
      fireEvent.keyDown(zone, { key: 'Tab' });
      expect(clickSpy).not.toHaveBeenCalled();
    });

    it('should NOT trigger file input on keyboard when disabled', () => {
      render(<UploadDropZone {...defaultProps} disabled />);
      const zone = screen.getByRole('button');
      const input = document.querySelector('input[type="file"]') as HTMLInputElement;
      const clickSpy = vi.spyOn(input, 'click');
      fireEvent.keyDown(zone, { key: 'Enter' });
      expect(clickSpy).not.toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // className prop
  // ---------------------------------------------------------------------------

  describe('className prop', () => {
    it('should apply custom className to wrapper', () => {
      const { container } = render(
        <UploadDropZone {...defaultProps} className="my-custom-class" />
      );
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toHaveClass('my-custom-class');
    });
  });
});
