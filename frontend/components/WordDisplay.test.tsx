import { render, screen } from '@testing-library/react';
import { expect, test } from 'vitest';
import WordDisplay from './WordDisplay';

test('WordDisplay shows underscores for unguessed letters', () => {
    render(<WordDisplay word="CAT" guessedLetters={[]} status="playing" />);
    // 3 letter tiles should exist (no letters visible yet)
    // We check that the revealed letters are NOT visible
    expect(screen.queryByText('C')).toBeNull();
    expect(screen.queryByText('A')).toBeNull();
    expect(screen.queryByText('T')).toBeNull();
});

test('WordDisplay reveals guessed letters', () => {
    render(<WordDisplay word="CAT" guessedLetters={['C', 'T']} status="playing" />);
    expect(screen.getByText('C')).toBeInTheDocument();
    expect(screen.getByText('T')).toBeInTheDocument();
    // A is not guessed yet
    expect(screen.queryByText('A')).toBeNull();
});

test('WordDisplay reveals all letters when game is finished', () => {
    render(<WordDisplay word="CAT" guessedLetters={[]} status="finished" />);
    expect(screen.getByText('C')).toBeInTheDocument();
    expect(screen.getByText('A')).toBeInTheDocument();
    expect(screen.getByText('T')).toBeInTheDocument();
});
