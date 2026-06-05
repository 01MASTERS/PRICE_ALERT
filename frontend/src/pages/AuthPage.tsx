import { useState, useEffect } from 'react';
import { Loader2, Lock, User, AlertCircle, CheckCircle, XCircle } from 'lucide-react';
import type { AuthResponse } from '../types/user';
import { login, register, checkUsername } from '../services/api';

interface Props {
  onAuthenticated: (auth: AuthResponse, isNewUser?: boolean) => void;
}

export const AuthPage = ({ onAuthenticated }: Props) => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [checkingUsername, setCheckingUsername] = useState(false);

  useEffect(() => {
    if (mode === 'login' || !username.trim() || username.trim().length < 2) {
      setUsernameAvailable(null);
      setCheckingUsername(false);
      return;
    }

    const check = async () => {
      setCheckingUsername(true);
      try {
        const { available } = await checkUsername(username);
        setUsernameAvailable(available);
      } catch {
        setUsernameAvailable(null);
      } finally {
        setCheckingUsername(false);
      }
    };

    const timer = setTimeout(check, 500);
    return () => clearTimeout(timer);
  }, [username, mode]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (mode === 'register' && usernameAvailable === false) {
      setError('Please choose an available username.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const auth = mode === 'login'
        ? await login({ username, password })
        : await register({ username, password });
      onAuthenticated(auth, mode === 'register');
    } catch {
      setError(mode === 'login' ? 'Invalid username or password.' : 'Could not create account.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-gray-50 flex items-center justify-center px-4 sm:px-6 lg:px-8">
      <form onSubmit={handleSubmit} className="w-full max-w-md bg-white/80 backdrop-blur-xl border border-gray-100 rounded-3xl shadow-2xl p-8 sm:p-10 transition-all">
        
        <div className="text-center mb-8">
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight mb-2">
            {mode === 'login' ? 'Welcome back' : 'Create an account'}
          </h1>
          <p className="text-sm text-gray-500">
            {mode === 'login' ? 'Enter your details to access your account.' : 'Start managing your private price alerts today.'}
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-2xl bg-red-50 border border-red-100 flex items-start gap-3 text-sm text-red-600">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <p className="font-medium">{error}</p>
          </div>
        )}

        <div className="space-y-5">
          <div>
            <label htmlFor="username" className="block text-sm font-semibold text-gray-700 mb-1.5">
              Username
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <User className="h-5 w-5 text-gray-400" />
              </div>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                minLength={2}
                placeholder="johndoe"
                className={`w-full pl-11 pr-10 py-3 rounded-2xl bg-gray-50/50 border text-gray-900 placeholder:text-gray-400 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all duration-200 outline-none ${
                  mode === 'register' && usernameAvailable === false
                    ? 'border-red-300 focus:border-red-500 focus:ring-red-500/20'
                    : mode === 'register' && usernameAvailable === true
                    ? 'border-green-300 focus:border-green-500 focus:ring-green-500/20'
                    : 'border-gray-200'
                }`}
              />
              {mode === 'register' && (
                <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
                  {checkingUsername ? (
                    <Loader2 className="h-4 w-4 text-gray-400 animate-spin" />
                  ) : usernameAvailable === true ? (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  ) : usernameAvailable === false ? (
                    <XCircle className="h-5 w-5 text-red-500" />
                  ) : null}
                </div>
              )}
            </div>
            {mode === 'register' && usernameAvailable === false && !checkingUsername && (
               <p className="mt-1.5 text-xs font-medium text-red-500 ml-1">This username is already taken.</p>
            )}
            {mode === 'register' && usernameAvailable === true && !checkingUsername && (
               <p className="mt-1.5 text-xs font-medium text-green-600 ml-1">Username is available!</p>
            )}
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-1.5">
              Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-gray-400" />
              </div>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                placeholder="••••••••"
                className="w-full pl-11 pr-4 py-3 rounded-2xl bg-gray-50/50 border border-gray-200 text-gray-900 placeholder:text-gray-400 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all duration-200 outline-none"
              />
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading || (mode === 'register' && usernameAvailable === false) || checkingUsername}
          className="w-full mt-8 flex justify-center items-center py-3.5 rounded-2xl bg-indigo-600 text-white font-semibold shadow-lg shadow-indigo-600/20 hover:bg-indigo-700 hover:shadow-indigo-600/30 focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 active:scale-[0.98] disabled:opacity-70 disabled:active:scale-100 transition-all duration-200"
        >
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : mode === 'login' ? 'Sign in' : 'Create account'}
        </button>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-500">
            {mode === 'login' ? "Don't have an account?" : "Already have an account?"}{' '}
            <button
              type="button"
              onClick={() => {
                setMode(mode === 'login' ? 'register' : 'login');
                setError('');
                setUsername('');
                setPassword('');
                setUsernameAvailable(null);
              }}
              className="font-semibold text-indigo-600 hover:text-indigo-500 transition-colors"
            >
              {mode === 'login' ? 'Sign up' : 'Log in'}
            </button>
          </p>
        </div>
        
      </form>
    </div>
  );
};