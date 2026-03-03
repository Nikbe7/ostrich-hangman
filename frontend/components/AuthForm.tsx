import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { loginUser, registerUser, setToken, setUser } from '../utils/auth';
import { AuthResponse } from '../types/game';
import { useToast } from './Toast';

interface AuthFormProps {
    onLogin: () => void;
}

export default function AuthForm({ onLogin }: AuthFormProps) {
    const [isLogin, setIsLogin] = useState(true);
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const { showToast } = useToast();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        if (!username || !password) {
            setError('Fyll i alla fält.');
            showToast('Fyll i alla fält.', 'error');
            setLoading(false);
            return;
        }

        if (!isLogin && password !== confirmPassword) {
            setError('Lösenorden matchar inte.');
            showToast('Lösenorden matchar inte.', 'error');
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
                showToast(isLogin ? 'Välkommen tillbaka!' : 'Konto skapat!', 'success');
                onLogin();
            } else {
                const msg = result.error || 'Något gick fel.';
                setError(msg);
                showToast(msg, 'error');
            }
        } catch (err) {
            const msg = 'Ett fel uppstod.';
            setError(msg);
            showToast(msg, 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-brand-card/80 p-5 sm:p-8 rounded-2xl backdrop-blur-xl border border-white/5 shadow-2xl w-full max-w-md">
            <h2 className="text-2xl font-bold mb-6 text-center text-white">
                {isLogin ? 'Logga in' : 'Registrera dig'}
            </h2>

            {error && (
                <div className="bg-brand-danger/10 border border-brand-danger text-red-100 px-4 py-3 rounded-lg mb-4 text-sm font-medium">
                    {error}
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium mb-1 text-gray-300">Användarnamn</label>
                    <input
                        id="username"
                        name="username"
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="w-full p-4 rounded-xl bg-black/40 border border-white/10 focus:border-brand-primary focus:ring-1 focus:ring-brand-primary outline-none transition-all text-white font-medium"
                        placeholder="Användarnamn"
                        disabled={loading}
                        maxLength={20}
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium mb-1 text-gray-300">Lösenord</label>
                    <div className="relative">
                        <input
                            id="password"
                            name="password"
                            type={showPassword ? "text" : "password"}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full p-4 pr-12 rounded-xl bg-black/40 border border-white/10 focus:border-brand-primary focus:ring-1 focus:ring-brand-primary outline-none transition-all text-white font-medium"
                            placeholder="Lösenord"
                            disabled={loading}
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                            tabIndex={-1}
                        >
                            {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                        </button>
                    </div>
                </div>

                {!isLogin && (
                    <div>
                        <label className="block text-sm font-medium mb-1 text-gray-300">Bekräfta lösenord</label>
                        <div className="relative">
                            <input
                                id="confirmPassword"
                                name="confirmPassword"
                                type={showPassword ? "text" : "password"}
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className="w-full p-4 pr-12 rounded-xl bg-black/40 border border-white/10 focus:border-brand-primary focus:ring-1 focus:ring-brand-primary outline-none transition-all text-white font-medium"
                                placeholder="Bekräfta lösenord"
                                disabled={loading}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                                tabIndex={-1}
                            >
                                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                            </button>
                        </div>
                    </div>
                )}

                <div className="pt-2">
                    <button
                        type="submit"
                        disabled={loading}
                        className={`w-full font-bold py-4 px-4 rounded-xl transition-all shadow-lg 
                            ${loading ? 'bg-gray-800 text-gray-400 cursor-not-allowed border border-white/10' : 'bg-brand-primary hover:bg-brand-primaryHover hover:shadow-[0_0_20px_rgba(5,150,105,0.4)] hover:scale-[1.02] active:scale-95 text-white'}`}
                    >
                        {loading ? 'Laddar...' : (isLogin ? 'Logga in' : 'Registrera')}
                    </button>
                </div>
            </form>

            <div className="mt-6 text-center text-sm border-t border-white/10 pt-6">
                <span className="text-gray-400">
                    {isLogin ? 'Har du inget konto? ' : 'Har du redan ett konto? '}
                </span>
                <button
                    onClick={() => {
                        setIsLogin(!isLogin);
                        setError('');
                        setConfirmPassword('');
                    }}
                    className="text-brand-primary hover:text-white transition-colors font-semibold ml-1 underline decoration-brand-primary/30 underline-offset-4"
                >
                    {isLogin ? 'Registrera dig' : 'Logga in'}
                </button>
            </div>
        </div>
    );
}
