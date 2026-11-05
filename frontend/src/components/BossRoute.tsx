import React from 'react';
import { Outlet } from 'react-router-dom';
import { useBossAuth } from '../context/BossAuthContext';
import { Lock, ShieldAlert } from 'lucide-react';

export const BossRoute: React.FC = () => {
  const { isBossUnlocked, openPinModal } = useBossAuth();

  if (!isBossUnlocked) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 bg-amber-50 text-amber-700 rounded-3xl flex items-center justify-center mb-4 shadow-xs border border-amber-200">
          <Lock className="w-8 h-8" />
        </div>

        <h2 className="text-xl font-bold text-gray-900">
          System 3: Boss Desk is Locked (मालिक का डेस्क)
        </h2>
        <p className="text-sm text-gray-500 mt-1 max-w-sm">
          Net profit calculations, bank accounts, and evaluation reports are protected by your 4-digit PIN.
        </p>

        <button
          onClick={() => openPinModal()}
          className="mt-6 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold rounded-2xl text-sm shadow-md transition-all flex items-center gap-2"
        >
          <Lock className="w-4 h-4" />
          <span>Unlock with 4-Digit PIN (पिन से खोलें)</span>
        </button>
      </div>
    );
  }

  return <Outlet />;
};
