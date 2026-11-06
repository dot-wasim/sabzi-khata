import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useBossAuth } from '../context/BossAuthContext';
import { login as apiLogin } from '../api/auth';
import { verifyPin } from '../api/settings';
import {
  Lock,
  User as UserIcon,
  TrendingUp,
  ShoppingCart,
  BarChart3,
  KeyRound,
  ShieldCheck,
  CheckCircle2,
  X
} from 'lucide-react';

export const Login: React.FC = () => {
  const [username, setUsername] = useState('seller');
  const [password, setPassword] = useState('seller123');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const { unlockBoss } = useBossAuth();
  const navigate = useNavigate();

  // Boss PIN Modal
  const [bossPinModal, setBossPinModal] = useState(false);
  const [bossPin, setBossPin] = useState('');
  const [pinError, setPinError] = useState('');
  const [pinLoading, setPinLoading] = useState(false);

  const handleLogin = async (u: string, p: string, targetPath: string, unlockAsBoss = false) => {
    setError('');
    setLoading(true);

    try {
      const data = await apiLogin(u.trim(), p);
      login(data.token, data.user);
      if (unlockAsBoss) {
        unlockBoss();
      }
      navigate(targetPath);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyBossPin = async (pinToTest: string) => {
    setPinError('');
    setPinLoading(true);

    try {
      const res = await verifyPin(pinToTest);
      if (res.valid || pinToTest === '1234') {
        setBossPinModal(false);
        await handleLogin('owner', 'owner123', '/boss', true);
      } else {
        setPinError('गलत 4-अंकीय PIN (Incorrect PIN). कृपया 1234 दर्ज करें।');
        setBossPin('');
      }
    } catch (err) {
      if (pinToTest === '1234') {
        setBossPinModal(false);
        await handleLogin('owner', 'owner123', '/boss', true);
      } else {
        setPinError('गलत PIN (कृपया 1234 दर्ज करें)');
        setBossPin('');
      }
    } finally {
      setPinLoading(false);
    }
  };

  const handlePinKey = (digit: string) => {
    if (bossPin.length < 4) {
      const updated = bossPin + digit;
      setBossPin(updated);
      if (updated.length === 4) {
        handleVerifyBossPin(updated);
      }
    }
  };

  const handlePinDelete = () => {
    setBossPin((prev) => prev.slice(0, -1));
    setPinError('');
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleLogin(username, password, '/sales');
  };

  return (
    <div className="min-h-screen bg-linear-to-b from-slate-100 via-gray-50 to-blue-50 flex items-center justify-center p-4 font-sans">
      <div className="bg-white rounded-3xl shadow-2xl border border-gray-200 max-w-md w-full p-6 sm:p-8 space-y-6">
        {/* Brand Header */}
        <div className="text-center">
          <div className="w-16 h-16 bg-[#22304A] rounded-3xl flex items-center justify-center text-3xl mx-auto shadow-md mb-3 text-white">
            🥬
          </div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Sabzi Khata</h1>
          <p className="text-xs font-bold text-blue-700 mt-1 uppercase tracking-wider">
            Hussain Foods · मोबाइल बही खाता
          </p>
        </div>

        {/* 3 Autonomous Systems Entry Points */}
        <div className="space-y-3">
          <label className="block text-[11px] font-extrabold text-gray-500 uppercase tracking-wider text-center">
            सिस्टम चुनें (Select Autonomous System):
          </label>

          {/* 1. SELL SECTION (System 1) */}
          <button
            type="button"
            onClick={() => handleLogin('seller', 'seller123', '/sales')}
            disabled={loading}
            className="w-full p-3.5 rounded-2xl bg-linear-to-r from-blue-600 to-indigo-600 text-white font-extrabold text-left flex items-center justify-between shadow-md hover:from-blue-700 hover:to-indigo-700 active:scale-98 transition-all"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-xl">
                🥬
              </div>
              <div>
                <span className="text-sm font-black block">1. बिक्री काउंटर (Sell Section)</span>
                <span className="text-[11px] text-blue-100 font-medium block">
                  ग्राहक बिल, बकाया वसूली, लेजर व सब्जियां
                </span>
              </div>
            </div>
            <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase bg-white text-blue-900">
              खोलें &rarr;
            </span>
          </button>

          {/* 2. BUY SECTION (System 2) */}
          <button
            type="button"
            onClick={() => handleLogin('buyer', 'buyer123', '/purchases')}
            disabled={loading}
            className="w-full p-3.5 rounded-2xl bg-linear-to-r from-emerald-600 to-teal-700 text-white font-extrabold text-left flex items-center justify-between shadow-md hover:from-emerald-700 hover:to-teal-800 active:scale-98 transition-all"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-xl">
                🚜
              </div>
              <div>
                <span className="text-sm font-black block">2. खरीद मंडी (Buy Section)</span>
                <span className="text-[11px] text-emerald-100 font-medium block">
                  मंडी खरीद बिल, किसान हिसाब, गाड़ी भाड़ा व सब्जियां
                </span>
              </div>
            </div>
            <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase bg-white text-emerald-950">
              खोलें &rarr;
            </span>
          </button>

          {/* 3. BOSS SYSTEM (System 3) */}
          <button
            type="button"
            onClick={() => {
              setBossPin('');
              setPinError('');
              setBossPinModal(true);
            }}
            disabled={loading}
            className="w-full p-3.5 rounded-2xl bg-linear-to-r from-slate-900 to-[#22304A] text-white font-extrabold text-left flex items-center justify-between shadow-md hover:from-black hover:to-slate-900 active:scale-98 transition-all border border-amber-400/30"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-400/20 text-amber-300 flex items-center justify-center text-xl">
                👑
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-black block text-amber-300">
                    3. मालिक कंट्रोल (Boss System)
                  </span>
                  <Lock className="w-3.5 h-3.5 text-amber-300" />
                </div>
                <span className="text-[11px] text-gray-300 font-medium block">
                  कुल कमाई, खरीद-बिक्री ऑडिट, गाड़ी भाड़ा, टॉप दुकानें
                </span>
              </div>
            </div>
            <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase bg-amber-400 text-slate-950">
              PIN दर्ज करें
            </span>
          </button>
        </div>

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
                placeholder="seller, buyer, owner, father..."
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

      {/* ======================================================== */}
      {/* 4-DIGIT BOSS PIN MODAL (DEFAULT: 1234)                   */}
      {/* ======================================================== */}
      {bossPinModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#22304A] text-white rounded-3xl max-w-xs w-full p-6 text-center space-y-4 shadow-2xl border border-white/10">
            <div className="flex justify-between items-center">
              <div className="w-10 h-10 rounded-2xl bg-amber-400/20 text-amber-300 flex items-center justify-center mx-auto text-xl">
                👑
              </div>
              <button
                onClick={() => setBossPinModal(false)}
                className="text-gray-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <h3 className="text-lg font-black text-white">मालिक पिन (Boss PIN)</h3>
              <p className="text-xs text-gray-300 mt-0.5">
                4-अंकीय मालिक पिन दर्ज करें (Default PIN: <b>1234</b>)
              </p>
            </div>

            {/* PIN Dots Display */}
            <div className="flex justify-center gap-3 py-2">
              {[0, 1, 2, 3].map((idx) => (
                <div
                  key={idx}
                  className={`w-4 h-4 rounded-full transition-all ${
                    bossPin.length > idx
                      ? 'bg-amber-400 scale-110 shadow-sm'
                      : 'border-2 border-white/30 bg-transparent'
                  }`}
                />
              ))}
            </div>

            {pinError && (
              <p className="text-xs text-rose-300 font-bold bg-rose-900/40 p-2 rounded-xl border border-rose-700/50">
                {pinError}
              </p>
            )}

            {/* Numeric Keypad */}
            <div className="grid grid-cols-3 gap-2.5 pt-2">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
                <button
                  key={digit}
                  onClick={() => handlePinKey(digit)}
                  disabled={pinLoading}
                  className="py-3.5 bg-white/10 hover:bg-white/20 active:bg-amber-400 active:text-slate-900 rounded-2xl text-lg font-black transition-all"
                >
                  {digit}
                </button>
              ))}
              <button
                onClick={() => handleVerifyBossPin('1234')}
                className="py-3.5 bg-amber-400/20 hover:bg-amber-400/30 text-amber-300 rounded-2xl text-[10px] font-black uppercase transition-all"
              >
                1234 Auto
              </button>
              <button
                onClick={() => handlePinKey('0')}
                disabled={pinLoading}
                className="py-3.5 bg-white/10 hover:bg-white/20 active:bg-amber-400 active:text-slate-900 rounded-2xl text-lg font-black transition-all"
              >
                0
              </button>
              <button
                onClick={handlePinDelete}
                className="py-3.5 bg-white/10 hover:bg-rose-500/30 text-rose-300 rounded-2xl text-sm font-bold transition-all"
              >
                ⌫
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
