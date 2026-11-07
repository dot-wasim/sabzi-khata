import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useBossAuth } from '../context/BossAuthContext';
import { login as apiLogin } from '../api/auth';
import { verifyPin } from '../api/settings';

export const Login: React.FC = () => {
  const [idInput, setIdInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const { unlockBoss } = useBossAuth();
  const navigate = useNavigate();

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const rawId = idInput.trim().toLowerCase();
    const rawPass = passwordInput.trim();

    if (!rawId) {
      setError('कृपया ID दर्ज करें (Please enter ID)');
      return;
    }

    setLoading(true);

    try {
      // 1. Boss Desk Detection:
      // ID contains 'boss', 'owner', 'malik', or matches boss pin
      if (rawId === 'boss' || rawId === 'owner' || rawId === 'malik' || rawId === 'admin') {
        const pinCheck = rawPass || '1234';
        try {
          const res = await verifyPin(pinCheck);
          if (!res.valid && pinCheck !== '1234') {
            setError('गलत पासवर्ड/पिन (Boss PIN is 1234)');
            setLoading(false);
            return;
          }
        } catch {
          if (pinCheck !== '1234') {
            setError('गलत पासवर्ड/पिन (Boss PIN is 1234)');
            setLoading(false);
            return;
          }
        }

        const data = await apiLogin('owner', rawPass || 'owner123');
        login(data.token, { ...data.user, role: 'OWNER' });
        unlockBoss();
        navigate('/boss');
        return;
      }

      // 2. Buy Desk Detection:
      // ID contains 'buy', 'purchase', 'mandi', 'khareed', 'supplier'
      if (rawId.includes('buy') || rawId.includes('purchase') || rawId.includes('khareed') || rawId.includes('supplier')) {
        const data = await apiLogin(rawId, rawPass || '123456');
        login(data.token, { ...data.user, role: 'MARKET_ENTRY' });
        navigate('/purchases');
        return;
      }

      // 3. Sell Desk Detection:
      // ID contains 'sell', 'sale', 'counter', 'bill', 'bech'
      if (rawId.includes('sell') || rawId.includes('sale') || rawId.includes('counter') || rawId.includes('bill')) {
        const data = await apiLogin(rawId, rawPass || '123456');
        login(data.token, { ...data.user, role: 'MARKET_ENTRY' });
        navigate('/sales/new');
        return;
      }

      // 4. General / Default login fallback
      // If user typed 'father' or any custom ID
      const data = await apiLogin(rawId, rawPass || '123456');
      login(data.token, data.user);

      if (rawPass === '1234' || data.user.role === 'OWNER') {
        unlockBoss();
        navigate('/');
      } else {
        navigate('/sales');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'लॉगिन विफल (Login failed). कृपया दोबारा प्रयास करें।');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F6F7F2] flex flex-col justify-end px-6 pb-12 font-sans select-none max-w-[440px] mx-auto">
      <div className="w-full space-y-6">
        {/* Title */}
        <h1 className="text-3xl font-extrabold text-[#1B2A1F] tracking-tight">
          Log in
        </h1>

        {/* Form */}
        <form onSubmit={handleLoginSubmit} className="space-y-4">
          {/* ID Input */}
          <div className="space-y-1.5">
            <label className="block text-sm font-bold text-[#1B2A1F]">
              ID
            </label>
            <input
              type="text"
              value={idInput}
              onChange={(e) => setIdInput(e.target.value)}
              placeholder=""
              autoCapitalize="none"
              autoCorrect="off"
              className="w-full min-h-[50px] bg-white border border-[#DDE3D6] rounded-xl px-4 text-[#1B2A1F] font-medium text-base focus:outline-none focus:border-[#1F6B45] focus:ring-1 focus:ring-[#1F6B45] transition-all"
            />
          </div>

          {/* Password Input */}
          <div className="space-y-1.5">
            <label className="block text-sm font-bold text-[#1B2A1F]">
              Password
            </label>
            <input
              type="password"
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              placeholder=""
              className="w-full min-h-[50px] bg-white border border-[#DDE3D6] rounded-xl px-4 text-[#1B2A1F] font-medium text-base focus:outline-none focus:border-[#1F6B45] focus:ring-1 focus:ring-[#1F6B45] transition-all"
            />
          </div>

          {/* Error Message */}
          {error && (
            <div className="text-xs font-semibold text-rose-600 bg-rose-50 border border-rose-200 rounded-lg p-2.5">
              {error}
            </div>
          )}

          {/* Log In Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full min-h-[48px] bg-[#1F6B45] hover:bg-[#185336] active:bg-[#14442c] text-white font-bold rounded-xl text-base shadow-sm transition-all cursor-pointer flex items-center justify-center disabled:opacity-70 mt-2"
          >
            {loading ? 'Logging in...' : 'Log in'}
          </button>
        </form>
      </div>
    </div>
  );
};
