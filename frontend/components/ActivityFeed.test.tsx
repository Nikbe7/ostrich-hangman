import { render, screen } from '@testing-library/react';
import { expect, test } from 'vitest';
import ActivityFeed from './ActivityFeed';

test('ActivityFeed renders correct logs', () => {
    const logs = [
        { name: 'Alice', letter: 'A', correct: true },
        { name: 'Bob', letter: 'Z', correct: false }
    ];

    render(<ActivityFeed guessLog={logs} />);

    // Check texts separately since they are in different elements
    expect(screen.getByText(/Alice/i)).toBeInTheDocument();
    expect(screen.getByText('A')).toBeInTheDocument();

    expect(screen.getByText(/Bob/i)).toBeInTheDocument();
    expect(screen.getByText('Z')).toBeInTheDocument();
});
