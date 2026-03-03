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
    const toggleBtn = screen.getByRole('button', { name: /Registrera dig/i });
    fireEvent.click(toggleBtn);

    // The register button text
    expect(screen.getByRole('button', { name: 'Registrera' })).toBeInTheDocument();
});
