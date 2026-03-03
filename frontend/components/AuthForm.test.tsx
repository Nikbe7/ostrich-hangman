import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { expect, test, vi, beforeEach } from 'vitest';
import AuthForm from './AuthForm';
import * as authUtils from '../utils/auth';

// Mock the next router
vi.mock('next/navigation', () => ({
    useRouter() {
        return {
            push: vi.fn(),
        };
    },
}));

// Mock the toast hook
vi.mock('@/components/Toast', () => ({
    useToast: () => ({
        showToast: vi.fn(),
    }),
}));

// Mock auth utils
vi.mock('../utils/auth', () => ({
    loginUser: vi.fn(),
    registerUser: vi.fn(),
    setToken: vi.fn(),
    setUser: vi.fn(),
}));

beforeEach(() => {
    vi.clearAllMocks();
});

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

test('AuthForm validates empty fields', async () => {
    render(<AuthForm onLogin={vi.fn()} />);

    const submitBtn = screen.getByRole('button', { name: 'Logga in' });
    fireEvent.click(submitBtn);

    expect(await screen.findByText('Fyll i alla fält.')).toBeInTheDocument();
});

test('AuthForm handles successful login', async () => {
    const mockOnLogin = vi.fn();
    (authUtils.loginUser as any).mockResolvedValue({
        success: true,
        user: { id: '1', username: 'testuser' },
        session: { access_token: 'abc', refresh_token: 'def' }
    });

    render(<AuthForm onLogin={mockOnLogin} />);

    fireEvent.change(screen.getByPlaceholderText('Användarnamn'), { target: { value: 'testuser' } });
    fireEvent.change(screen.getByPlaceholderText('Lösenord'), { target: { value: 'password123' } });

    const submitBtn = screen.getByRole('button', { name: 'Logga in' });
    fireEvent.click(submitBtn);

    await waitFor(() => {
        expect(authUtils.loginUser).toHaveBeenCalledWith('testuser', 'password123');
        expect(mockOnLogin).toHaveBeenCalled();
    });
});

test('AuthForm handles login error', async () => {
    (authUtils.loginUser as any).mockResolvedValue({
        success: false,
        error: 'Felaktigt lösenord'
    });

    render(<AuthForm onLogin={vi.fn()} />);

    fireEvent.change(screen.getByPlaceholderText('Användarnamn'), { target: { value: 'testuser' } });
    fireEvent.change(screen.getByPlaceholderText('Lösenord'), { target: { value: 'wrong' } });

    const submitBtn = screen.getByRole('button', { name: 'Logga in' });
    fireEvent.click(submitBtn);

    expect(await screen.findByText('Felaktigt lösenord')).toBeInTheDocument();
});
