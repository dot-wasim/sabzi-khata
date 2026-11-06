import React from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import {
  TrendingUp,
  Building2,
  PlusCircle,
  LogOut,
  Receipt,
  Users
} from 'lucide-react';

export const Layout: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItemClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-bold transition-all ${
      isActive
        ? 'bg-blue-600 text-white shadow-xs'
        : 'text-gray-600 hover:bg-blue-50 hover:text-blue-700'
    }`;

  const mobileBottomItemClass = ({ isActive }: { isActive: boolean }) =>
    `flex flex-col items-center justify-center py-2 px-1 text-[11px] font-extrabold transition-all ${
      isActive ? 'text-blue-600 bg-blue-50/80 border-t-2 border-blue-600' : 'text-gray-500 hover:text-gray-900'
    }`;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row font-sans">
      {/* Desktop Sidebar (Pure System 1: Buyer UI) */}
      <aside className="hidden md:flex flex-col w-64 bg-white border-r border-gray-200 shrink-0 h-screen sticky top-0 shadow-2xs">
        {/* Brand */}
        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center text-xl shadow-xs">
              🥬
            </div>
            <div>
              <h1 className="font-extrabold text-gray-900 text-base leading-tight">Sabzi Khata</h1>
              <p className="text-xs text-blue-700 font-semibold">Hussain Foods</p>
            </div>
          </div>
        </div>

        {/* System 1 Identity Banner */}
        <div className="px-5 py-3 bg-blue-50/70 border-b border-blue-100 flex items-center justify-between">
          <div>
            <span className="inline-block px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wide bg-blue-600 text-white">
              System 1 · Buyer UI
            </span>
            <p className="text-xs font-bold text-gray-800 mt-1 truncate">
              {user?.name || 'काउंटर ऑपरेटर'}
            </p>
          </div>
          <button
            onClick={handleLogout}
            title="Log Out (लॉग आउट)"
            className="text-gray-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>

        {/* System 1 Navigation links */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-1.5">
          <NavLink to="/sales/new" className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-extrabold bg-blue-600 text-white shadow-xs hover:bg-blue-700 transition-all mb-3">
            <PlusCircle className="w-4 h-4 stroke-[2.5]" />
            <span>+ नया बिल (+ New Bill)</span>
          </NavLink>

          <NavLink to="/sales" end className={navItemClass}>
            <TrendingUp className="w-4 h-4" />
            <span>बिक्री बिल (Sale Invoices)</span>
          </NavLink>

          <NavLink to="/buyers" className={navItemClass}>
            <Users className="w-4 h-4" />
            <span>खरीदार लेजर व खाता (Buyers)</span>
          </NavLink>
        </nav>

        {/* Bottom User & Logout on Sidebar */}
        <div className="p-3 border-t border-gray-100">
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-gray-50 hover:bg-rose-50 text-gray-700 hover:text-rose-700 text-xs font-bold border border-gray-200 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>लॉग आउट (Logout)</span>
          </button>
        </div>
      </aside>

      {/* Mobile Top Header (Pure System 1: Buyer UI) */}
      <header className="md:hidden bg-white border-b border-gray-200 px-4 py-3 sticky top-0 z-40 flex items-center justify-between shadow-2xs">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center text-base shadow-xs">
            🥬
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="font-extrabold text-gray-900 text-sm leading-tight">Sabzi Khata</h1>
              <span className="text-[9px] font-extrabold px-1.5 py-0.2 rounded-sm bg-blue-100 text-blue-800">
                Buyer UI
              </span>
            </div>
            <p className="text-[11px] text-gray-500 font-medium">Hussain Foods</p>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="flex items-center gap-1 px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl text-xs font-bold border border-rose-200 transition-colors"
          title="लॉग आउट करें"
        >
          <LogOut className="w-3.5 h-3.5 stroke-[2.5]" />
          <span>लॉग आउट</span>
        </button>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 pb-24 md:pb-8 p-4 md:p-8 max-w-6xl mx-auto w-full">
        <Outlet />
      </main>

      {/* Mobile Bottom Navigation Bar (Pure System 1) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-40 grid grid-cols-4 items-center pb-safe shadow-lg">
        <NavLink to="/sales" end className={mobileBottomItemClass}>
          <TrendingUp className="w-5 h-5 text-blue-600" />
          <span className="mt-0.5">बिक्री बिल</span>
        </NavLink>

        <NavLink to="/sales/new" className={mobileBottomItemClass}>
          <PlusCircle className="w-5 h-5 text-blue-600" />
          <span className="mt-0.5">+ नया बिल</span>
        </NavLink>

        <NavLink to="/buyers" className={mobileBottomItemClass}>
          <Users className="w-5 h-5 text-blue-600" />
          <span className="mt-0.5">ग्राहक खाता</span>
        </NavLink>

        <button
          onClick={handleLogout}
          className="flex flex-col items-center justify-center py-2 px-1 text-[11px] font-extrabold text-rose-600 hover:text-rose-700"
        >
          <LogOut className="w-5 h-5 stroke-[2.2]" />
          <span className="mt-0.5">लॉग आउट</span>
        </button>
      </nav>
    </div>
  );
};
