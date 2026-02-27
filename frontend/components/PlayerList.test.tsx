import { render, screen } from '@testing-library/react';
import { expect, test } from 'vitest';
import PlayerList from './PlayerList';

test('PlayerList renders players properly', () => {
    const players = [
        { sessionId: '1', name: 'Alice', score: 10, isOnline: true, lastSeen: '2023-01-01' },
        { sessionId: '2', name: 'Bob', score: 5, isOnline: false, lastSeen: '2023-01-01' }
    ];

    render(<PlayerList players={players} wordChooser="1" currentPlayerId="1" />);

    // Check player names appear
    expect(screen.getByText(/Alice/i)).toBeInTheDocument();
    expect(screen.getByText(/Bob/i)).toBeInTheDocument();
});
