import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import InfoModal from './InfoModal';

describe('InfoModal', () => {
  const mockOnClose = jest.fn();
  const testTitle = 'Test Title';
  const testContent = 'Test Content';

  beforeEach(() => {
    mockOnClose.mockClear();
  });

  test('renders with correct title and content', () => {
    render(<InfoModal title={testTitle} content={testContent} onClose={mockOnClose} />);

    expect(screen.getByText(testTitle)).toBeInTheDocument();
    expect(screen.getByText(testContent)).toBeInTheDocument();
  });

  test('calls onClose when close button is clicked', () => {
    render(<InfoModal title={testTitle} content={testContent} onClose={mockOnClose} />);

    const closeButton = screen.getByRole('button', { name: /×/i }); // Finds the button with '×' text
    fireEvent.click(closeButton);

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  test('calls onClose when overlay is clicked', () => {
    render(<InfoModal title={testTitle} content={testContent} onClose={mockOnClose} />);

    const overlay = screen.getByTestId('info-modal-overlay'); // Use data-testid for selection
    fireEvent.click(overlay);

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  test('does not call onClose when modal content is clicked', () => {
    render(<InfoModal title={testTitle} content={testContent} onClose={mockOnClose} />);

    const modalContent = screen.getByTestId('info-modal-content'); // Use data-testid for selection
    fireEvent.click(modalContent);

    expect(mockOnClose).not.toHaveBeenCalled();
  });
});
