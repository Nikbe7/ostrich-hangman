import { render, screen } from '@testing-library/react';
import { expect, test } from 'vitest';
import GuessedLetters from './GuessedLetters';

test('GuessedLetters renders nothing when no letters guessed', () => {
    const { container } = render(
        <GuessedLetters guessedLetters={[]} word="TEST" />
    );
    expect(container.firstChild).toBeNull();
});

test('GuessedLetters shows each guessed letter', () => {
    render(<GuessedLetters guessedLetters={['A', 'B']} word="ABC" />);
    expect(screen.getByText('A')).toBeInTheDocument();
    expect(screen.getByText('B')).toBeInTheDocument();
});

test('GuessedLetters shows correct and wrong letters from guessLog', () => {
    const guessLog = [
        { name: 'Alice', letter: 'A', correct: true },
        { name: 'Bob', letter: 'Z', correct: false },
    ];
    render(<GuessedLetters guessedLetters={['A', 'Z']} word="ABC" guessLog={guessLog} />);
    expect(screen.getByText('A')).toBeInTheDocument();
    expect(screen.getByText('Z')).toBeInTheDocument();
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
});
