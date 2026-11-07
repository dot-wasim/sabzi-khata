import React, { useEffect, useState } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useBossAuth } from '../context/BossAuthContext';
import { useSimulator } from '../context/SimulatorContext';
import { useDeskMode } from '../context/DeskModeContext';
import { offlineDb } from '../storage/offlineDb';
import {
  LayoutDashboard,
  Receipt,
  Users,
  Carrot,
  CloudCheck
} from 'lucide-react';

export const Layout: React.FC = () => {
  const { user } = useAuth();
  const { isBossUnlocked } = useBossAuth();
  const { isSimulator } = useSimulator();
  const { mode } = useDeskMode();
  const location = useLocation();

  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const getMobileBottomItemClass = () => {
    return ({ isActive }: { isActive: boolean }) =>
      `flex flex-col items-center justify-center py-2 px-1 text-[11px] font-semibold transition-all ${
        isActive
          ? 'text-[#1F6B45] font-bold'
          : 'text-[#4D5C50] hover:text-[#1B2A1F]'
      }`;
  };

  return (
    <div className="min-h-full bg-[#F6F7F2] flex flex-col font-sans text-[#1B2A1F]">
      {/* Main Content Area */}
      <main className="flex-1 w-full pb-16">
        <Outlet />
      </main>

      {/* Persistent Bottom Navigation Bar */}
      <nav
        className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#DDE3D6] z-50 max-w-[440px] mx-auto shadow-sm"
        style={{ transform: 'translateZ(0)' }}
      >
        <div className="grid grid-cols-5 h-14">
          {/* 1. Dashboard */}
          <NavLink to="/" end className={getMobileBottomItemClass()}>
            <LayoutDashboard className="w-5 h-5 mb-0.5" />
            <span>Dashboard</span>
          </NavLink>

          {/* 2. Bill (Sell Customer Bill vs Buy Purchase Inward Slip) */}
          <NavLink
            to={mode === 'buy' ? '/purchases/new' : '/sales/new'}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center py-2 px-1 text-[11px] font-semibold transition-all ${
                isActive || location.pathname.startsWith('/sales') || location.pathname.startsWith('/purchases')
                  ? 'text-[#1F6B45] font-bold'
                  : 'text-[#4D5C50] hover:text-[#1B2A1F]'
              }`
            }
          >
            <Receipt className="w-5 h-5 mb-0.5" />
            <span>Bill</span>
          </NavLink>

          {/* 3. Accounts (Customer Accounts vs Farmer/Supplier Accounts) */}
          <NavLink
            to={mode === 'buy' ? '/sellers' : '/buyers'}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center py-2 px-1 text-[11px] font-semibold transition-all ${
                isActive || location.pathname.startsWith('/buyers') || location.pathname.startsWith('/sellers')
                  ? 'text-[#1F6B45] font-bold'
                  : 'text-[#4D5C50] hover:text-[#1B2A1F]'
              }`
            }
          >
            <Users className="w-5 h-5 mb-0.5" />
            <span>Accounts</span>
          </NavLink>

          {/* 4. Vegetable */}
          <NavLink to="/vegetables" className={getMobileBottomItemClass()}>
            <Carrot className="w-5 h-5 mb-0.5" />
            <span>Vegetable</span>
          </NavLink>

          {/* 5. Backup */}
          <NavLink to="/settings/backup" className={getMobileBottomItemClass()}>
            <CloudCheck className="w-5 h-5 mb-0.5" />
            <span>Backup</span>
          </NavLink>
        </div>
      </nav>
    </div>
  );
};
