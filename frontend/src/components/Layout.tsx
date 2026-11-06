import React, { useEffect } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useBossAuth } from '../context/BossAuthContext';
import {
  TrendingUp,
  ShoppingCart,
  PlusCircle,
  LogOut,
  Carrot,
  Users,
  Building2,
  BarChart3,
  Truck,
  Landmark,
  Store,
  Layers,
  Lock
} from 'lucide-react';

export const Layout: React.FC = () => {
  const { user, logout } = useAuth();
  const { lockBoss } = useBossAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Determine current active system
  let activeSystem: 'sell' | 'buy' | 'boss' = 'sell';
  if (
    location.pathname.startsWith('/purchases') ||
    location.pathname.startsWith('/sellers')
  ) {
    activeSystem = 'buy';
  } else if (
    location.pathname.startsWith('/boss') ||
    location.pathname.startsWith('/accounts') ||
    location.pathname.startsWith('/stock') ||
    location.pathname.startsWith('/reports') ||
    location.pathname.startsWith('/wastage') ||
    location.pathname.startsWith('/expenses')
  ) {
    activeSystem = 'boss';
  } else if (location.pathname.startsWith('/vegetables')) {
    activeSystem = (localStorage.getItem('sk_active_system') as any) || 'sell';
  } else {
    activeSystem = 'sell';
  }

  useEffect(() => {
    localStorage.setItem('sk_active_system', activeSystem);
  }, [activeSystem]);

  const handleLogout = () => {
    lockBoss();
    logout();
    navigate('/login');
  };

  const getNavItemClass = (themeColor: 'blue' | 'emerald' | 'amber') => {
    const activeBg =
      themeColor === 'blue'
        ? 'bg-blue-600 text-white shadow-xs'
        : themeColor === 'emerald'
        ? 'bg-emerald-600 text-white shadow-xs'
        : 'bg-[#22304A] text-white shadow-xs';

    const hoverClass =
      themeColor === 'blue'
        ? 'text-gray-700 hover:bg-blue-50 hover:text-blue-700'
        : themeColor === 'emerald'
        ? 'text-gray-700 hover:bg-emerald-50 hover:text-emerald-700'
        : 'text-gray-700 hover:bg-slate-100 hover:text-[#22304A]';

    return ({ isActive }: { isActive: boolean }) =>
      `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-bold transition-all ${
        isActive ? activeBg : hoverClass
      }`;
  };

  const getMobileBottomItemClass = (themeColor: 'blue' | 'emerald' | 'amber') => {
    const activeText =
      themeColor === 'blue'
        ? 'text-blue-600 bg-blue-50/80 border-t-2 border-blue-600'
        : themeColor === 'emerald'
        ? 'text-emerald-700 bg-emerald-50/80 border-t-2 border-emerald-600'
        : 'text-[#22304A] bg-amber-50/80 border-t-2 border-[#22304A]';

    return ({ isActive }: { isActive: boolean }) =>
      `flex flex-col items-center justify-center py-2 px-1 text-[10.5px] font-extrabold transition-all ${
        isActive ? activeText : 'text-gray-500 hover:text-gray-900'
      }`;
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row font-sans">
      {/* ======================================================== */}
      {/* DESKTOP SIDEBAR — ADAPTS TO ACTIVE AUTONOMOUS SYSTEM     */}
      {/* ======================================================== */}
      <aside className="hidden md:flex flex-col w-64 bg-white border-r border-gray-200 shrink-0 h-screen sticky top-0 shadow-2xs">
        {/* Brand */}
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-2xl text-white flex items-center justify-center text-xl shadow-xs ${
                activeSystem === 'sell'
                  ? 'bg-blue-600'
                  : activeSystem === 'buy'
                  ? 'bg-emerald-600'
                  : 'bg-[#22304A]'
              }`}
            >
              {activeSystem === 'sell' ? '🥬' : activeSystem === 'buy' ? '🚜' : '👑'}
            </div>
            <div>
              <h1 className="font-extrabold text-gray-900 text-base leading-tight">Sabzi Khata</h1>
              <p className="text-xs font-semibold text-gray-500">Hussain Foods</p>
            </div>
          </div>
        </div>

        {/* System Identity Banner */}
        <div
          className={`px-4 py-3 border-b flex items-center justify-between ${
            activeSystem === 'sell'
              ? 'bg-blue-50/80 border-blue-100'
              : activeSystem === 'buy'
              ? 'bg-emerald-50/80 border-emerald-100'
              : 'bg-slate-100 border-slate-200'
          }`}
        >
          <div>
            <span
              className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wide text-white ${
                activeSystem === 'sell'
                  ? 'bg-blue-600'
                  : activeSystem === 'buy'
                  ? 'bg-emerald-600'
                  : 'bg-[#22304A]'
              }`}
            >
              {activeSystem === 'sell'
                ? 'System 1 · Sell Desk'
                : activeSystem === 'buy'
                ? 'System 2 · Buy Desk'
                : 'System 3 · Boss Desk'}
            </span>
            <p className="text-xs font-extrabold text-gray-900 mt-1 truncate">
              {activeSystem === 'sell'
                ? 'बिक्री व ग्राहक काउंटर'
                : activeSystem === 'buy'
                ? 'मंडी खरीद व किसान काउंटर'
                : 'मालिक कंट्रोल व P&L'}
            </p>
          </div>
          <button
            onClick={handleLogout}
            title="सिस्टम बदलें / लॉग आउट"
            className="text-gray-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>

        {/* Nav Links per autonomous system */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-1.5">
          {activeSystem === 'sell' && (
            <>
              <NavLink
                to="/sales/new"
                className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-extrabold bg-blue-600 text-white shadow-xs hover:bg-blue-700 transition-all mb-3"
              >
                <PlusCircle className="w-4 h-4 stroke-[2.5]" />
                <span>+ नया बिक्री बिल (+ Bill)</span>
              </NavLink>

              <NavLink to="/sales" end className={getNavItemClass('blue')}>
                <TrendingUp className="w-4 h-4" />
                <span>बिक्री बिल (Sale Invoices)</span>
              </NavLink>

              <NavLink to="/buyers" className={getNavItemClass('blue')}>
                <Users className="w-4 h-4" />
                <span>खरीदार खाता व लेजर (Buyers)</span>
              </NavLink>

              <NavLink to="/vegetables" className={getNavItemClass('blue')}>
                <Carrot className="w-4 h-4" />
                <span>सब्जियां जोड़ें/हटाएं (Vegetables)</span>
              </NavLink>
            </>
          )}

          {activeSystem === 'buy' && (
            <>
              <NavLink
                to="/purchases/new"
                className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-extrabold bg-emerald-600 text-white shadow-xs hover:bg-emerald-700 transition-all mb-3"
              >
                <PlusCircle className="w-4 h-4 stroke-[2.5]" />
                <span>+ नई मंडी खरीद (+ Purchase)</span>
              </NavLink>

              <NavLink to="/purchases" end className={getNavItemClass('emerald')}>
                <ShoppingCart className="w-4 h-4" />
                <span>खरीद बिल (Purchases)</span>
              </NavLink>

              <NavLink to="/sellers" className={getNavItemClass('emerald')}>
                <Users className="w-4 h-4" />
                <span>किसान व सप्लायर खाता (Sellers)</span>
              </NavLink>

              <NavLink to="/vegetables" className={getNavItemClass('emerald')}>
                <Carrot className="w-4 h-4" />
                <span>सब्जियां जोड़ें/हटाएं (Vegetables)</span>
              </NavLink>
            </>
          )}

          {activeSystem === 'boss' && (
            <>
              <NavLink to="/boss" end className={getNavItemClass('amber')}>
                <BarChart3 className="w-4 h-4" />
                <span>मालिक रिपोर्ट व P&L (Overview)</span>
              </NavLink>

              <NavLink to="/sales" className={getNavItemClass('amber')}>
                <TrendingUp className="w-4 h-4" />
                <span>क्या-क्या बिका (Sales Audit)</span>
              </NavLink>

              <NavLink to="/purchases" className={getNavItemClass('amber')}>
                <ShoppingCart className="w-4 h-4" />
                <span>क्या-क्या खरीदा (Purchases Audit)</span>
              </NavLink>

              <NavLink to="/accounts" className={getNavItemClass('amber')}>
                <Landmark className="w-4 h-4" />
                <span>गल्ला व बैंक पासबुक (Accounts)</span>
              </NavLink>

              <NavLink to="/vegetables" className={getNavItemClass('amber')}>
                <Carrot className="w-4 h-4" />
                <span>सब्जी मास्टर (Vegetables)</span>
              </NavLink>
            </>
          )}
        </nav>

        {/* Sidebar Bottom Switch & Logout */}
        <div className="p-3 border-t border-gray-100 space-y-2">
          <button
            onClick={() => navigate('/login')}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-bold transition-colors"
          >
            <span>सिस्टम बदलें (Switch System)</span>
          </button>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold border border-rose-200 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>लॉग आउट (Logout)</span>
          </button>
        </div>
      </aside>

      {/* ======================================================== */}
      {/* MOBILE TOP HEADER — CLEAR IDENTITY & SYSTEM SWITCHER    */}
      {/* ======================================================== */}
      <header className="md:hidden bg-white border-b border-gray-200 px-4 py-3 sticky top-0 z-40 flex items-center justify-between shadow-2xs">
        <div className="flex items-center gap-2.5">
          <div
            className={`w-8 h-8 rounded-xl text-white flex items-center justify-center text-base shadow-xs ${
              activeSystem === 'sell'
                ? 'bg-blue-600'
                : activeSystem === 'buy'
                ? 'bg-emerald-600'
                : 'bg-[#22304A]'
            }`}
          >
            {activeSystem === 'sell' ? '🥬' : activeSystem === 'buy' ? '🚜' : '👑'}
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="font-extrabold text-gray-900 text-sm leading-tight">Sabzi Khata</h1>
              <span
                className={`text-[9px] font-extrabold px-1.5 py-0.2 rounded-sm text-white ${
                  activeSystem === 'sell'
                    ? 'bg-blue-600'
                    : activeSystem === 'buy'
                    ? 'bg-emerald-600'
                    : 'bg-[#22304A]'
                }`}
              >
                {activeSystem === 'sell'
                  ? 'Sell Desk'
                  : activeSystem === 'buy'
                  ? 'Buy Desk'
                  : 'Boss Desk'}
              </span>
            </div>
            <p className="text-[11px] text-gray-500 font-medium">Hussain Foods</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => navigate('/login')}
            className="px-2.5 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold transition-colors"
            title="सिस्टम बदलें"
          >
            बदलें
          </button>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1 px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl text-xs font-bold border border-rose-200 transition-colors"
            title="लॉग आउट"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>लॉग आउट</span>
          </button>
        </div>
      </header>

      {/* ======================================================== */}
      {/* MAIN OUTLET CONTAINER                                    */}
      {/* ======================================================== */}
      <main className="flex-1 pb-24 md:pb-8 p-4 md:p-8 max-w-6xl mx-auto w-full">
        <Outlet />
      </main>

      {/* ======================================================== */}
      {/* MOBILE BOTTOM NAVIGATION BAR — PURE AUTONOMOUS DESK TABS  */}
      {/* ======================================================== */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-40 grid grid-cols-4 items-center pb-safe shadow-lg">
        {activeSystem === 'sell' && (
          <>
            <NavLink to="/sales" end className={getMobileBottomItemClass('blue')}>
              <TrendingUp className="w-5 h-5 text-blue-600" />
              <span className="mt-0.5">बिक्री बिल</span>
            </NavLink>

            <NavLink to="/sales/new" className={getMobileBottomItemClass('blue')}>
              <PlusCircle className="w-5 h-5 text-blue-600" />
              <span className="mt-0.5">+ नया बिल</span>
            </NavLink>

            <NavLink to="/buyers" className={getMobileBottomItemClass('blue')}>
              <Users className="w-5 h-5 text-blue-600" />
              <span className="mt-0.5">ग्राहक खाता</span>
            </NavLink>

            <NavLink to="/vegetables" className={getMobileBottomItemClass('blue')}>
              <Carrot className="w-5 h-5 text-blue-600" />
              <span className="mt-0.5">सब्जियां</span>
            </NavLink>
          </>
        )}

        {activeSystem === 'buy' && (
          <>
            <NavLink to="/purchases" end className={getMobileBottomItemClass('emerald')}>
              <ShoppingCart className="w-5 h-5 text-emerald-600" />
              <span className="mt-0.5">खरीद बिल</span>
            </NavLink>

            <NavLink to="/purchases/new" className={getMobileBottomItemClass('emerald')}>
              <PlusCircle className="w-5 h-5 text-emerald-600" />
              <span className="mt-0.5">+ नई खरीद</span>
            </NavLink>

            <NavLink to="/sellers" className={getMobileBottomItemClass('emerald')}>
              <Users className="w-5 h-5 text-emerald-600" />
              <span className="mt-0.5">किसान खाता</span>
            </NavLink>

            <NavLink to="/vegetables" className={getMobileBottomItemClass('emerald')}>
              <Carrot className="w-5 h-5 text-emerald-600" />
              <span className="mt-0.5">सब्जियां</span>
            </NavLink>
          </>
        )}

        {activeSystem === 'boss' && (
          <>
            <NavLink to="/boss" end className={getMobileBottomItemClass('amber')}>
              <BarChart3 className="w-5 h-5 text-[#22304A]" />
              <span className="mt-0.5">मालिक P&L</span>
            </NavLink>

            <NavLink to="/sales" className={getMobileBottomItemClass('amber')}>
              <TrendingUp className="w-5 h-5 text-[#22304A]" />
              <span className="mt-0.5">बिक्री ऑडिट</span>
            </NavLink>

            <NavLink to="/purchases" className={getMobileBottomItemClass('amber')}>
              <ShoppingCart className="w-5 h-5 text-[#22304A]" />
              <span className="mt-0.5">खरीद ऑडिट</span>
            </NavLink>

            <NavLink to="/accounts" className={getMobileBottomItemClass('amber')}>
              <Landmark className="w-5 h-5 text-[#22304A]" />
              <span className="mt-0.5">गल्ला व बैंक</span>
            </NavLink>
          </>
        )}
      </nav>
    </div>
  );
};
