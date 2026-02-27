import { render, screen, fireEvent } from '@testing-library/react';
import { expect, test, vi } from 'vitest';
import AuthForm from './AuthForm';

// Mock the next router
vi.mock('next/navigation', () => ({
    useRouter() {
        return {
            push: vi.fn(),
        };
    },
}));

test('AuthForm toggles between login and register', () => {
    render(<AuthForm onLogin={vi.fn()} />);

    // Default should be login
    expect(screen.getByRole('heading', { name: 'Logga in' })).toBeInTheDocument();

    // Toggle to register
    const toggleBtn = screen.getByText(/Skapa ett här/i);
    fireEvent.click(toggleBtn);

    expect(screen.getByText('Registrera')).toBeInTheDocument();
});
