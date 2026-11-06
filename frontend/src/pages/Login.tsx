import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { login as apiLogin } from '../api/auth';
import { Carrot, Lock, User as UserIcon } from 'lucide-react';

export const Login: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const data = await apiLogin(username.trim(), password);
      login(data.token, data.user);
      // Navigate directly to Sell Desk (Buyer activities)
      navigate('/sales');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Invalid username or password');
    } finally {
      setLoading(false);
    }
  };

  const performDirectLogin = async (u: string, p: string) => {
    setError('');
    setLoading(true);
    try {
      const data = await apiLogin(u, p);
      login(data.token, data.user);
      navigate('/sales');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-linear-to-b from-emerald-50 via-white to-emerald-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-xl border border-gray-100 max-w-md w-full p-8">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-emerald-600 rounded-2xl flex items-center justify-center text-3xl mx-auto shadow-md mb-3 text-white">
            🥬
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Sabzi Khata</h1>
          <p className="text-sm font-medium text-emerald-700 mt-1">Hussain Foods • सब्जी खाता</p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
              Username
            </label>
            <div className="relative">
              <UserIcon className="w-5 h-5 text-gray-400 absolute left-3 top-3" />
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. owner or market"
                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
              Password
            </label>
            <div className="relative">
              <Lock className="w-5 h-5 text-gray-400 absolute left-3 top-3" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-semibold rounded-xl text-sm shadow-md transition-all disabled:opacity-50 mt-2"
          >
            {loading ? 'Signing in...' : 'Sign In (लॉग इन करें)'}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-gray-100 text-center">
          <p className="text-xs font-semibold text-gray-500 mb-3 uppercase tracking-wider">
            1-क्लिक सीधा लॉगिन (Quick Login):
          </p>
          <div className="flex flex-col sm:flex-row gap-2 justify-center">
            <button
              type="button"
              disabled={loading}
              onClick={() => performDirectLogin('father', 'father123')}
              className="py-2.5 px-3 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-900 font-extrabold text-xs border border-blue-200 flex items-center justify-center gap-1.5 shadow-2xs transition-all active:scale-95"
            >
              <span>👨‍🦳 पिता जी (Father Login)</span>
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={() => performDirectLogin('owner', 'owner123')}
              className="py-2.5 px-3 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-900 font-extrabold text-xs border border-purple-200 flex items-center justify-center gap-1.5 shadow-2xs transition-all active:scale-95"
            >
              <span>👑 मालिक (Owner / Boss)</span>
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={() => performDirectLogin('market', 'market123')}
              className="py-2.5 px-3 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-900 font-extrabold text-xs border border-emerald-200 flex items-center justify-center gap-1.5 shadow-2xs transition-all active:scale-95"
            >
              <span>🛒 मंडी ऑपरेटर (Operator)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
