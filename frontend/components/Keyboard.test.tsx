import { render, screen, fireEvent } from '@testing-library/react';
import { expect, test, vi } from 'vitest';
import Keyboard from './Keyboard';

test('Keyboard renders correctly and responds to clicks', () => {
    const mockOnGuess = vi.fn();
    const guessedLetters = ['A', 'B'];

    render(<Keyboard onGuess={mockOnGuess} guessedLetters={guessedLetters} disabled={false} />);

    // Verify letters are rendered (keyboard renders lowercase)
    const aButton = screen.getByText('a').closest('button');
    const cButton = screen.getByText('c').closest('button');

    expect(aButton).toBeInTheDocument();
    expect(cButton).toBeInTheDocument();

    // Verify disabled state logic
    expect(aButton).toBeDisabled();
    expect(cButton).not.toBeDisabled();

    // Test click returns lowercase 'c'
    fireEvent.click(cButton);
    expect(mockOnGuess).toHaveBeenCalledWith('c');
});
