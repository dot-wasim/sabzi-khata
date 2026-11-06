import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { login as apiLogin } from '../api/auth';
import { Lock, User as UserIcon, TrendingUp, ShoppingCart, BarChart3, AlertCircle } from 'lucide-react';

export const Login: React.FC = () => {
  const [username, setUsername] = useState('buyer');
  const [password, setPassword] = useState('buyer123');
  const [error, setError] = useState('');
  const [pausedNotice, setPausedNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (u: string, p: string) => {
    setError('');
    setPausedNotice(null);
    setLoading(true);

    try {
      const data = await apiLogin(u.trim(), p);
      login(data.token, data.user);
      navigate('/sales');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleLogin(username, password);
  };

  return (
    <div className="min-h-screen bg-linear-to-b from-blue-50 via-slate-50 to-blue-50 flex items-center justify-center p-4 font-sans">
      <div className="bg-white rounded-3xl shadow-xl border border-gray-200 max-w-md w-full p-6 sm:p-8 space-y-6">
        {/* Brand Header */}
        <div className="text-center">
          <div className="w-16 h-16 bg-blue-600 rounded-3xl flex items-center justify-center text-3xl mx-auto shadow-md mb-3 text-white">
            🥬
          </div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Sabzi Khata</h1>
          <p className="text-xs font-bold text-blue-700 mt-1 uppercase tracking-wider">Hussain Foods • सब्जी खाता</p>
        </div>

        {/* 3 UIs System Selector */}
        <div className="space-y-2.5">
          <label className="block text-[11px] font-extrabold text-gray-500 uppercase tracking-wider text-center">
            लॉगिन UI चुनें (Select Login UI):
          </label>

          {/* 1. Buyer UI (ACTIVE) */}
          <button
            type="button"
            onClick={() => handleLogin('buyer', 'buyer123')}
            disabled={loading}
            className="w-full p-3.5 rounded-2xl bg-linear-to-r from-blue-600 to-indigo-600 text-white font-extrabold text-left flex items-center justify-between shadow-md hover:from-blue-700 hover:to-indigo-700 active:scale-98 transition-all"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                <TrendingUp className="w-5 h-5" />
              </div>
              <div>
                <span className="text-sm font-extrabold block">1. Buyer UI (खरीदार व बिक्री)</span>
                <span className="text-[11px] text-blue-100 font-medium block">
                  सभी बिक्री बिल, खरीदार लेजर, बकाया व वसूली
                </span>
              </div>
            </div>
            <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase bg-emerald-400 text-emerald-950">
              चालू / Active
            </span>
          </button>

          {/* 2. Seller UI (PAUSED) */}
          <button
            type="button"
            onClick={() => {
              setPausedNotice('सिस्टम 2 (Seller UI · मंडी खरीद) अभी रोका गया है। पहले सिस्टम 1 (Buyer UI) पर काम जारी है।');
            }}
            className="w-full p-3 rounded-2xl bg-gray-50 text-gray-400 font-bold text-left flex items-center justify-between border border-dashed border-gray-300 hover:bg-gray-100 transition-all opacity-70"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gray-200 flex items-center justify-center text-gray-500">
                <ShoppingCart className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-bold block text-gray-600">2. Seller UI (मंडी खरीद)</span>
                <span className="text-[10px] text-gray-400 block">किसान व मंडी आवक लेजर</span>
              </div>
            </div>
            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-amber-100 text-amber-800">
              रोका गया / Paused
            </span>
          </button>

          {/* 3. Boss UI (PAUSED) */}
          <button
            type="button"
            onClick={() => {
              setPausedNotice('सिस्टम 3 (Boss UI · मूल्यांकन व लाभ) अभी रोका गया है। पहले सिस्टम 1 (Buyer UI) पर काम जारी है।');
            }}
            className="w-full p-3 rounded-2xl bg-gray-50 text-gray-400 font-bold text-left flex items-center justify-between border border-dashed border-gray-300 hover:bg-gray-100 transition-all opacity-70"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gray-200 flex items-center justify-center text-gray-500">
                <BarChart3 className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-bold block text-gray-600">3. Boss UI (मालिक डेस्क)</span>
                <span className="text-[10px] text-gray-400 block">कुल लाभ, बैंक गल्ला व स्टॉक</span>
              </div>
            </div>
            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-amber-100 text-amber-800">
              रोका गया / Paused
            </span>
          </button>
        </div>

        {/* Paused Notice Alert */}
        {pausedNotice && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>{pausedNotice}</span>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
            {error}
          </div>
        )}

        {/* Manual Credentials Option */}
        <form onSubmit={handleFormSubmit} className="space-y-3 pt-2 border-t border-gray-100">
          <div>
            <label className="block text-[11px] font-semibold text-gray-600 uppercase mb-1">
              यूजरनेम (Username)
            </label>
            <div className="relative">
              <UserIcon className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="buyer, owner, father..."
                className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs sm:text-sm font-semibold"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-gray-600 uppercase mb-1">
              पासवर्ड (Password)
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs sm:text-sm font-semibold"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 bg-gray-900 hover:bg-black text-white font-bold rounded-xl text-xs transition-all disabled:opacity-50"
          >
            {loading ? 'लॉगिन हो रहा है...' : 'लॉगिन करें (Sign In)'}
          </button>
        </form>
      </div>
    </div>
  );
};
