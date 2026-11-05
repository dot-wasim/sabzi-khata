import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useBossAuth } from '../context/BossAuthContext';
import {
  TrendingUp,
  ShoppingCart,
  BarChart3,
  Landmark,
  Building2,
  Users,
  Carrot,
  PackageCheck,
  Trash2,
  Receipt,
  CreditCard,
  ShieldAlert,
  LogOut,
  KeyRound,
  Lock,
  Unlock,
  PlusCircle,
  MoreHorizontal,
  X
} from 'lucide-react';

export const Layout: React.FC = () => {
  const { user, logout } = useAuth();
  const { isBossUnlocked, lockBoss, openPinModal } = useBossAuth();
  const navigate = useNavigate();
  const [moreSheetOpen, setMoreSheetOpen] = useState(false);

  const isOwner = user?.role === 'OWNER';

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItemClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
      isActive
        ? 'bg-emerald-600 text-white shadow-xs'
        : 'text-gray-600 hover:bg-emerald-50 hover:text-emerald-700'
    }`;

  const deskTabClass = (isActive: boolean, colorClass: string) =>
    `flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all ${
      isActive ? colorClass : 'text-gray-600 hover:bg-gray-100'
    }`;

  const mobileBottomItemClass = ({ isActive }: { isActive: boolean }) =>
    `flex flex-col items-center justify-center py-1.5 px-2 text-[11px] font-bold transition-all ${
      isActive ? 'text-emerald-600' : 'text-gray-500 hover:text-gray-900'
    }`;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-white border-r border-gray-100 shrink-0 h-screen sticky top-0">
        {/* Brand */}
        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center text-xl shadow-xs">
              🥬
            </div>
            <div>
              <h1 className="font-bold text-gray-900 text-base leading-tight">Sabzi Khata</h1>
              <p className="text-xs text-emerald-700 font-medium">Hussain Foods</p>
            </div>
          </div>
        </div>

        {/* User Info & System 3 Lock toggle */}
        <div className="px-5 py-3 bg-gray-50/70 border-b border-gray-100 flex items-center justify-between">
          <div className="truncate pr-2">
            <p className="text-xs font-semibold text-gray-800 truncate">{user?.name}</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="inline-block px-1.5 py-0.5 rounded-sm text-[10px] font-bold uppercase tracking-wide bg-emerald-100 text-emerald-800">
                {user?.role === 'OWNER' ? 'Owner' : 'Market Entry'}
              </span>
              {isBossUnlocked ? (
                <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1 rounded-sm">
                  <Unlock className="w-2.5 h-2.5" /> Boss
                </span>
              ) : (
                <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-gray-500 bg-gray-200/80 px-1 rounded-sm">
                  <Lock className="w-2.5 h-2.5" /> Boss Locked
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1">
            {isBossUnlocked && (
              <button
                onClick={lockBoss}
                title="Lock Boss Desk"
                className="text-gray-400 hover:text-amber-600 p-1.5 rounded-lg hover:bg-amber-50"
              >
                <Lock className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={handleLogout}
              title="Logout"
              className="text-gray-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Navigation links grouped into the 3 Desks */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-4">
          {/* SYSTEM 1: SELL DESK */}
          <div className="space-y-1">
            <div className="text-[11px] font-extrabold text-blue-700 px-3 uppercase tracking-wider py-1 flex items-center justify-between">
              <span>1. Sell Desk (बिक्री)</span>
              <span className="text-[10px] bg-blue-50 text-blue-700 px-1.5 rounded-sm">Public-Safe</span>
            </div>
            <NavLink to="/sales/new" className={navItemClass}>
              <PlusCircle className="w-4 h-4 text-blue-600" />
              <span>+ New Sale Bill</span>
            </NavLink>
            <NavLink to="/sales" end className={navItemClass}>
              <TrendingUp className="w-4 h-4 text-blue-600" />
              <span>Sales Bills</span>
            </NavLink>
            <NavLink to="/buyers" className={navItemClass}>
              <Building2 className="w-4 h-4 text-blue-600" />
              <span>Customers & Dues</span>
            </NavLink>
          </div>

          {/* SYSTEM 2: BUY DESK */}
          <div className="space-y-1 pt-2 border-t border-gray-100">
            <div className="text-[11px] font-extrabold text-emerald-700 px-3 uppercase tracking-wider py-1 flex items-center justify-between">
              <span>2. Buy Desk (मंडी खरीद)</span>
              <span className="text-[10px] bg-emerald-50 text-emerald-700 px-1.5 rounded-sm">Mandi</span>
            </div>
            <NavLink to="/purchases/new" className={navItemClass}>
              <PlusCircle className="w-4 h-4 text-emerald-600" />
              <span>+ New Mandi Buy</span>
            </NavLink>
            <NavLink to="/purchases" end className={navItemClass}>
              <ShoppingCart className="w-4 h-4 text-emerald-600" />
              <span>Mandi Purchases</span>
            </NavLink>
            <NavLink to="/sellers" className={navItemClass}>
              <Users className="w-4 h-4 text-emerald-600" />
              <span>Farmers & Dues</span>
            </NavLink>
          </div>

          {/* SYSTEM 3: BOSS DESK */}
          <div className="space-y-1 pt-2 border-t border-gray-100">
            <div className="text-[11px] font-extrabold text-purple-700 px-3 uppercase tracking-wider py-1 flex items-center justify-between">
              <span>3. Boss Desk (मूल्यांकन)</span>
              {isBossUnlocked ? (
                <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 rounded-sm flex items-center gap-1">
                  <Unlock className="w-2.5 h-2.5" /> Unlocked
                </span>
              ) : (
                <span className="text-[10px] bg-amber-100 text-amber-800 px-1.5 rounded-sm flex items-center gap-1">
                  <Lock className="w-2.5 h-2.5" /> PIN Locked
                </span>
              )}
            </div>

            <NavLink
              to="/boss"
              end
              onClick={(e) => {
                if (!isBossUnlocked) {
                  e.preventDefault();
                  openPinModal(() => navigate('/boss'));
                }
              }}
              className={navItemClass}
            >
              <BarChart3 className="w-4 h-4 text-purple-600" />
              <span>Net Profit & Overview</span>
            </NavLink>

            <NavLink
              to="/accounts"
              onClick={(e) => {
                if (!isBossUnlocked) {
                  e.preventDefault();
                  openPinModal(() => navigate('/accounts'));
                }
              }}
              className={navItemClass}
            >
              <Landmark className="w-4 h-4 text-purple-600" />
              <span>Bank & Cash Galla</span>
            </NavLink>

            <NavLink
              to="/stock"
              onClick={(e) => {
                if (!isBossUnlocked) {
                  e.preventDefault();
                  openPinModal(() => navigate('/stock'));
                }
              }}
              className={navItemClass}
            >
              <PackageCheck className="w-4 h-4 text-purple-600" />
              <span>Stock Balance</span>
            </NavLink>

            <NavLink
              to="/payments"
              onClick={(e) => {
                if (!isBossUnlocked) {
                  e.preventDefault();
                  openPinModal(() => navigate('/payments'));
                }
              }}
              className={navItemClass}
            >
              <CreditCard className="w-4 h-4 text-purple-600" />
              <span>Payments Ledger</span>
            </NavLink>

            <NavLink
              to="/wastage"
              onClick={(e) => {
                if (!isBossUnlocked) {
                  e.preventDefault();
                  openPinModal(() => navigate('/wastage'));
                }
              }}
              className={navItemClass}
            >
              <Trash2 className="w-4 h-4 text-purple-600" />
              <span>Wastage & Damage</span>
            </NavLink>

            <NavLink
              to="/expenses"
              onClick={(e) => {
                if (!isBossUnlocked) {
                  e.preventDefault();
                  openPinModal(() => navigate('/expenses'));
                }
              }}
              className={navItemClass}
            >
              <Receipt className="w-4 h-4 text-purple-600" />
              <span>Daily Expenses</span>
            </NavLink>

            <NavLink
              to="/reports"
              onClick={(e) => {
                if (!isBossUnlocked) {
                  e.preventDefault();
                  openPinModal(() => navigate('/reports'));
                }
              }}
              className={navItemClass}
            >
              <BarChart3 className="w-4 h-4 text-purple-600" />
              <span>Profit Breakdown</span>
            </NavLink>
          </div>

          {/* Master Settings */}
          <div className="space-y-1 pt-2 border-t border-gray-100">
            <div className="text-[11px] font-bold text-gray-400 px-3 uppercase tracking-wider py-1">Master</div>
            <NavLink to="/vegetables" className={navItemClass}>
              <Carrot className="w-4 h-4" />
              <span>Vegetables (सब्जियां)</span>
            </NavLink>
            <NavLink to="/settings/password" className={navItemClass}>
              <KeyRound className="w-4 h-4" />
              <span>Security & Password</span>
            </NavLink>
          </div>
        </nav>
      </aside>

      {/* Mobile Top Header */}
      <header className="md:hidden bg-white border-b border-gray-100 px-4 py-3 sticky top-0 z-40 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center text-base">
            🥬
          </div>
          <div>
            <h1 className="font-bold text-gray-900 text-sm leading-none">Sabzi Khata</h1>
            <p className="text-[11px] text-emerald-700 font-medium">{user?.name}</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          {isBossUnlocked ? (
            <button
              onClick={lockBoss}
              className="text-xs px-2.5 py-1 bg-emerald-50 text-emerald-800 rounded-lg flex items-center gap-1 font-bold border border-emerald-200"
            >
              <Unlock className="w-3.5 h-3.5" /> Boss
            </button>
          ) : (
            <button
              onClick={() => openPinModal()}
              className="text-xs px-2.5 py-1 bg-gray-100 text-gray-700 rounded-lg flex items-center gap-1 font-semibold"
            >
              <Lock className="w-3.5 h-3.5" /> Boss
            </button>
          )}
          <button
            onClick={handleLogout}
            className="text-gray-400 hover:text-rose-600 p-1.5 rounded-lg"
            title="Logout"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 pb-24 md:pb-8 p-4 md:p-8 max-w-7xl mx-auto w-full">
        <Outlet />
      </main>

      {/* Mobile Bottom Navigation Bar (The 3 Desks) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-40 grid grid-cols-4 items-center pb-safe shadow-lg">
        <NavLink to="/sales" className={mobileBottomItemClass}>
          <TrendingUp className="w-5 h-5 text-blue-600" />
          <span className="mt-0.5">1. Sell (बिक्री)</span>
        </NavLink>

        <NavLink to="/purchases" className={mobileBottomItemClass}>
          <ShoppingCart className="w-5 h-5 text-emerald-600" />
          <span className="mt-0.5">2. Buy (खरीद)</span>
        </NavLink>

        <button
          onClick={() => {
            if (isBossUnlocked) {
              navigate('/boss');
            } else {
              openPinModal(() => navigate('/boss'));
            }
          }}
          className={`flex flex-col items-center justify-center py-1.5 px-2 text-[11px] font-bold ${
            isBossUnlocked ? 'text-purple-700 font-extrabold' : 'text-gray-600'
          }`}
        >
          {isBossUnlocked ? <BarChart3 className="w-5 h-5 text-purple-600" /> : <Lock className="w-5 h-5 text-amber-600" />}
          <span className="mt-0.5">3. Boss (लाभ)</span>
        </button>

        <button
          onClick={() => setMoreSheetOpen(true)}
          className="flex flex-col items-center justify-center py-1.5 px-2 text-[11px] font-bold text-gray-500 hover:text-gray-900"
        >
          <MoreHorizontal className="w-5 h-5" />
          <span className="mt-0.5">More</span>
        </button>
      </nav>

      {/* Mobile "More" Slide-up Sheet */}
      {moreSheetOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex flex-col justify-end">
          <div className="bg-white rounded-t-3xl p-6 space-y-4 max-h-[80vh] overflow-y-auto animate-in slide-in-from-bottom duration-200">
            <div className="flex items-center justify-between border-b pb-3 border-gray-100">
              <h3 className="font-bold text-gray-900 text-lg">All Desks & Features</h3>
              <button
                onClick={() => setMoreSheetOpen(false)}
                className="p-1 rounded-full text-gray-400 hover:bg-gray-100"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4 pt-1">
              <div>
                <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block mb-2">
                  System 1: Sell Desk (बिक्री)
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <NavLink
                    to="/sales/new"
                    onClick={() => setMoreSheetOpen(false)}
                    className="p-3 bg-blue-50 text-blue-800 rounded-xl font-bold text-xs flex items-center gap-2"
                  >
                    <PlusCircle className="w-4 h-4" />
                    <span>+ New Sale Bill</span>
                  </NavLink>
                  <NavLink
                    to="/buyers"
                    onClick={() => setMoreSheetOpen(false)}
                    className="p-3 bg-gray-50 text-gray-800 rounded-xl font-bold text-xs flex items-center gap-2"
                  >
                    <Building2 className="w-4 h-4 text-blue-600" />
                    <span>Customers & Dues</span>
                  </NavLink>
                </div>
              </div>

              <div>
                <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block mb-2">
                  System 2: Buy Desk (मंडी खरीद)
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <NavLink
                    to="/purchases/new"
                    onClick={() => setMoreSheetOpen(false)}
                    className="p-3 bg-emerald-50 text-emerald-800 rounded-xl font-bold text-xs flex items-center gap-2"
                  >
                    <PlusCircle className="w-4 h-4" />
                    <span>+ New Mandi Buy</span>
                  </NavLink>
                  <NavLink
                    to="/sellers"
                    onClick={() => setMoreSheetOpen(false)}
                    className="p-3 bg-gray-50 text-gray-800 rounded-xl font-bold text-xs flex items-center gap-2"
                  >
                    <Users className="w-4 h-4 text-emerald-600" />
                    <span>Farmers & Dues</span>
                  </NavLink>
                </div>
              </div>

              <div>
                <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block mb-2">
                  System 3: Boss Desk (Protected 🔒)
                </span>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => {
                      setMoreSheetOpen(false);
                      if (isBossUnlocked) navigate('/accounts');
                      else openPinModal(() => navigate('/accounts'));
                    }}
                    className="p-3 bg-purple-50 text-purple-800 rounded-xl font-bold text-xs flex flex-col items-center justify-center text-center gap-1"
                  >
                    <Landmark className="w-5 h-5" />
                    <span>Bank & Galla</span>
                  </button>

                  <button
                    onClick={() => {
                      setMoreSheetOpen(false);
                      if (isBossUnlocked) navigate('/stock');
                      else openPinModal(() => navigate('/stock'));
                    }}
                    className="p-3 bg-purple-50 text-purple-800 rounded-xl font-bold text-xs flex flex-col items-center justify-center text-center gap-1"
                  >
                    <PackageCheck className="w-5 h-5" />
                    <span>Stock</span>
                  </button>

                  <button
                    onClick={() => {
                      setMoreSheetOpen(false);
                      if (isBossUnlocked) navigate('/reports');
                      else openPinModal(() => navigate('/reports'));
                    }}
                    className="p-3 bg-purple-50 text-purple-800 rounded-xl font-bold text-xs flex flex-col items-center justify-center text-center gap-1"
                  >
                    <BarChart3 className="w-5 h-5" />
                    <span>Profit</span>
                  </button>
                </div>
              </div>

              <div className="pt-2 border-t border-gray-100 flex flex-col gap-2 text-xs">
                <NavLink
                  to="/vegetables"
                  onClick={() => setMoreSheetOpen(false)}
                  className="p-3 bg-amber-50 hover:bg-amber-100 text-amber-900 rounded-xl font-bold flex items-center justify-between"
                >
                  <div className="flex items-center gap-2">
                    <Carrot className="w-4 h-4 text-amber-600" />
                    <span>🥬 सब्ज़ी सूची और सीज़न (Add/Remove)</span>
                  </div>
                  <span className="text-[10px] bg-amber-200 text-amber-800 px-2 py-0.5 rounded-full font-bold">Seasonal</span>
                </NavLink>

                <div className="flex items-center justify-between text-gray-500 pt-1">
                  <NavLink
                    to="/settings/password"
                    onClick={() => setMoreSheetOpen(false)}
                    className="p-1 hover:text-emerald-700 font-medium"
                  >
                    Change Password
                  </NavLink>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
