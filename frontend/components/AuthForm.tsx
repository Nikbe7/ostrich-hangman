import React, { useState } from 'react';
import { loginUser, registerUser, setToken, setUser, AuthResponse } from '../utils/auth';

interface AuthFormProps {
    onLogin: () => void;
}

export default function AuthForm({ onLogin }: AuthFormProps) {
    const [isLogin, setIsLogin] = useState(true);
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        if (!username || !password) {
            setError('Fyll i alla fält.');
            setLoading(false);
            return;
        }

        try {
            const result: AuthResponse = isLogin
                ? await loginUser(username, password)
                : await registerUser(username, password);

            if (result.success && result.session && result.user) {
                setToken(result.session.access_token);
                setUser(result.user);
                onLogin();
            } else {
                setError(result.error || 'Något gick fel.');
            }
        } catch (err) {
            setError('Ett fel uppstod.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-white/10 p-8 rounded-xl backdrop-blur-lg shadow-2xl w-full max-w-md">
            <h2 className="text-2xl font-bold mb-6 text-center">
                {isLogin ? 'Logga in' : 'Registrera dig'}
            </h2>

            {error && (
                <div className="bg-red-500/20 border border-red-500 text-red-100 px-4 py-2 rounded mb-4 text-sm">
                    {error}
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium mb-1">Användarnamn</label>
                    <input
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="w-full p-3 rounded bg-black/30 border border-gray-600 focus:border-blue-500 outline-none transition-colors text-white"
                        placeholder="Användarnamn"
                        disabled={loading}
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium mb-1">Lösenord</label>
                    <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full p-3 rounded bg-black/30 border border-gray-600 focus:border-blue-500 outline-none transition-colors text-white"
                        placeholder="Lösenord"
                        disabled={loading}
                    />
                </div>

                <button
                    type="submit"
                    disabled={loading}
                    className={`w-full font-bold py-3 px-4 rounded transition-all transform active:scale-95 shadow-lg 
                        ${loading ? 'bg-gray-600 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-500 shadow-blue-500/30'}`}
                >
                    {loading ? 'Laddar...' : (isLogin ? 'Logga in' : 'Registrera')}
                </button>
            </form>

            <div className="mt-6 text-center text-sm">
                <span className="text-gray-400">
                    {isLogin ? 'Har du inget konto? ' : 'Har du redan ett konto? '}
                </span>
                <button
                    onClick={() => {
                        setIsLogin(!isLogin);
                        setError('');
                    }}
                    className="text-blue-400 hover:text-blue-300 font-semibold ml-1"
                >
                    {isLogin ? 'Registrera dig' : 'Logga in'}
                </button>
            </div>
        </div>
    );
}
