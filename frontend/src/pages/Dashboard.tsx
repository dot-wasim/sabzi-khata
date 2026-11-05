import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { getDashboard } from '../api/dashboard';
import { CurrencyDisplay } from '../components/CurrencyDisplay';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { toInputDate, formatDate } from '../utils/date';
import { useBossAuth } from '../context/BossAuthContext';
import {
  TrendingUp,
  ShoppingCart,
  Landmark,
  Lock,
  ChevronRight,
  ShieldCheck,
  Calendar,
  Sparkles
} from 'lucide-react';

export const Dashboard: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState(toInputDate(new Date()));
  const [activeTab, setActiveTab] = useState<'today' | 'week' | 'month' | 'season'>('today');
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const { lockBoss, openPinModal } = useBossAuth();
  const navigate = useNavigate();

  const fetchDashboard = async (dateStr: string) => {
    setLoading(true);
    try {
      const res = await getDashboard(dateStr);
      setData(res);
    } catch (err) {
      console.error('Failed to load dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard(selectedDate);
  }, [selectedDate]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const breakdown = data?.breakdown || { revenue: 0, cogs: 0, wastageCost: 0, expenses: 0 };
  const cards = data?.cards || {
    boughtToday: 0,
    soldToday: 0,
    paidToday: 0,
    receivedToday: 0,
    totalPayable: 0,
    totalReceivable: 0,
    todayProfit: 0,
  };

  return (
    <div className="max-w-md mx-auto bg-[#F6F4EC] min-h-screen text-[#1B2A1F] pb-24 shadow-lg rounded-2xl overflow-hidden font-sans">
      {/* Dark Navy Boss Header */}
      <div className="bg-[#22304A] text-white p-5 pb-6">
        <div className="flex justify-between items-start">
          <div>
            <div className="text-xs opacity-85">Hussain Foods · मालिक डेस्क</div>
            <div className="text-2xl font-bold mt-1">
              हिसाब <span className="text-base font-normal opacity-90">/ Overview</span>
            </div>
          </div>
          <button
            onClick={lockBoss}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-xl text-xs font-semibold text-white transition-colors"
          >
            <Lock className="w-3.5 h-3.5" />
            <span>लॉक करें</span>
          </button>
        </div>
      </div>

      <div className="p-4 space-y-3.5 -mt-2">
        {/* Period Chips */}
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('today')}
            className={`min-h-[38px] px-4 rounded-full text-xs font-bold transition-all border ${
              activeTab === 'today'
                ? 'bg-[#1B2A1F] text-white border-[#1B2A1F]'
                : 'bg-white text-[#1B2A1F] border-[#CFCAB6] hover:bg-gray-50'
            }`}
          >
            आज
          </button>
          <button
            onClick={() => setActiveTab('week')}
            className={`min-h-[38px] px-4 rounded-full text-xs font-bold transition-all border ${
              activeTab === 'week'
                ? 'bg-[#1B2A1F] text-white border-[#1B2A1F]'
                : 'bg-white text-[#1B2A1F] border-[#CFCAB6] hover:bg-gray-50'
            }`}
          >
            हफ्ता
          </button>
          <button
            onClick={() => setActiveTab('month')}
            className={`min-h-[38px] px-4 rounded-full text-xs font-bold transition-all border ${
              activeTab === 'month'
                ? 'bg-[#1B2A1F] text-white border-[#1B2A1F]'
                : 'bg-white text-[#1B2A1F] border-[#CFCAB6] hover:bg-gray-50'
            }`}
          >
            महीना
          </button>
          <button
            onClick={() => setActiveTab('season')}
            className={`min-h-[38px] px-4 rounded-full text-xs font-bold transition-all border ${
              activeTab === 'season'
                ? 'bg-[#1B2A1F] text-white border-[#1B2A1F]'
                : 'bg-white text-[#1B2A1F] border-[#CFCAB6] hover:bg-gray-50'
            }`}
          >
            सीज़न
          </button>
        </div>

        {/* Big Profit Hero Card (Navy Blue as in prototype) */}
        <div className="bg-[#22304A] text-white rounded-2xl p-5 shadow-md">
          <div className="text-xs text-[#C9D2E6]">आज का मुनाफ़ा / Today's profit</div>
          <div className="text-3xl sm:text-4xl font-extrabold mt-1 tracking-tight">
            <CurrencyDisplay amount={cards.todayProfit} />
          </div>
          <div className="text-xs text-white/75 mt-2 pt-2 border-t border-white/10 flex flex-wrap gap-1 leading-relaxed">
            <span>बिक्री ₹{Math.round(breakdown.revenue / 100).toLocaleString('en-IN')}</span>
            <span>−</span>
            <span>खरीद ₹{Math.round(breakdown.cogs / 100).toLocaleString('en-IN')}</span>
            <span>−</span>
            <span>बर्बादी ₹{Math.round(breakdown.wastageCost / 100).toLocaleString('en-IN')}</span>
            <span>−</span>
            <span>खर्च ₹{Math.round(breakdown.expenses / 100).toLocaleString('en-IN')}</span>
          </div>
        </div>

        {/* Market Dues Ribbon (Receivable & Payable) */}
        <div className="grid grid-cols-2 gap-2.5">
          <NavLink
            to="/buyers"
            className="bg-white border border-[#E3DFD0] rounded-xl p-3.5 shadow-2xs hover:border-[#1F6B3A] transition-colors"
          >
            <div className="text-xs text-[#5B6558]">ग्राहकों से लेना (Receivable)</div>
            <div className="text-[#B3261E] font-extrabold text-xl mt-1">
              <CurrencyDisplay amount={cards.totalReceivable} />
            </div>
            <span className="text-[10px] text-gray-400 mt-0.5 block">बाजार से वसूली &rarr;</span>
          </NavLink>

          <NavLink
            to="/sellers"
            className="bg-white border border-[#E3DFD0] rounded-xl p-3.5 shadow-2xs hover:border-[#1F6B3A] transition-colors"
          >
            <div className="text-xs text-[#5B6558]">विक्रेताओं को देना (Payable)</div>
            <div className="text-[#B3261E] font-extrabold text-xl mt-1">
              <CurrencyDisplay amount={cards.totalPayable} />
            </div>
            <span className="text-[10px] text-gray-400 mt-0.5 block">किसान देनदारी &rarr;</span>
          </NavLink>
        </div>

        {/* Live Bank Balances Bar */}
        {data?.accounts && data.accounts.length > 0 && (
          <div className="bg-white border border-[#E3DFD0] rounded-xl p-3.5 shadow-2xs">
            <div className="flex justify-between items-center mb-2">
              <b className="text-sm text-[#1B2A1F]">बैंक व गल्ला स्थिति / Liquid Balances</b>
              <NavLink to="/accounts" className="text-xs font-bold text-[#1F6B3A] hover:underline">
                पासबुक &rarr;
              </NavLink>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              {data.accounts.map((acc: any) => (
                <div key={acc.id} className="p-2 bg-[#F6F4EC] rounded-lg">
                  <span className="text-[10px] text-gray-500 block truncate">
                    {acc.type === 'CASH' ? 'गल्ला (Cash)' : acc.type === 'BANK' ? 'SBI Bank' : 'UPI QR'}
                  </span>
                  <b className="text-xs text-[#1B2A1F] block mt-0.5">
                    <CurrencyDisplay amount={acc.currentBalance || 0} />
                  </b>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Profit by Vegetable (Progress Bars as in prototype) */}
        <div className="bg-white border border-[#E3DFD0] rounded-xl p-4 shadow-2xs space-y-3">
          <b className="text-sm block text-[#1B2A1F]">
            सब्ज़ी के हिसाब से मुनाफ़ा / Per vegetable
          </b>

          {[
            { name: 'टमाटर · Tomato', profit: '+₹5,200', pct: '100%' },
            { name: 'आलू · Potato', profit: '+₹3,100', pct: '60%' },
            { name: 'फूलगोभी · Cauliflower', profit: '+₹2,400', pct: '46%' },
            { name: 'प्याज़ · Onion', profit: '+₹1,600', pct: '30%' },
          ].map((item, idx) => (
            <div key={idx} className="space-y-1">
              <div className="flex justify-between text-xs font-medium">
                <span>{item.name}</span>
                <b className="text-[#1F6B3A]">{item.profit}</b>
              </div>
              <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#1F6B3A] rounded-full"
                  style={{ width: item.pct }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Profit by Buyer */}
        <div className="bg-white border border-[#E3DFD0] rounded-xl p-4 shadow-2xs space-y-3">
          <b className="text-sm block text-[#1B2A1F]">ग्राहक के हिसाब से / Per buyer</b>

          {[
            { name: 'Gupta Hotel', profit: '+₹5,100', pct: '100%' },
            { name: 'Sharma Caterers', profit: '+₹3,400', pct: '66%' },
            { name: 'Station Mess', profit: '+₹2,300', pct: '45%' },
            { name: 'Anand Dhaba', profit: '+₹1,500', pct: '29%' },
          ].map((item, idx) => (
            <div key={idx} className="space-y-1">
              <div className="flex justify-between text-xs font-medium">
                <span>{item.name}</span>
                <b className="text-[#1F6B3A]">{item.profit}</b>
              </div>
              <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#1F6B3A] rounded-full"
                  style={{ width: item.pct }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Stock Matrix Table Card */}
        <div className="bg-white border border-[#E3DFD0] rounded-xl p-4 shadow-2xs">
          <div className="flex justify-between items-center mb-2">
            <b className="text-sm text-[#1B2A1F]">स्टॉक स्थिति / Daily Stock</b>
            <NavLink to="/stock" className="text-xs text-[#1F6B3A] font-bold">
              पूरा स्टॉक &rarr;
            </NavLink>
          </div>

          <div className="text-xs">
            <div className="flex font-bold text-gray-500 pb-2">
              <span className="flex-2">स्टॉक / Stock</span>
              <span className="flex-1 text-right">खरीदा</span>
              <span className="flex-1 text-right">बिका</span>
              <span className="flex-1 text-right">बर्बाद</span>
              <span className="flex-1 text-right">बचा</span>
            </div>

            {[
              { name: 'टमाटर', buy: '320', sold: '270', waste: '8', rem: '42' },
              { name: 'आलू', buy: '500', sold: '420', waste: '10', rem: '70' },
              { name: 'फूलगोभी', buy: '180', sold: '150', waste: '6', rem: '24' },
              { name: 'प्याज़', buy: '300', sold: '250', waste: '4', rem: '46' },
            ].map((st, i) => (
              <div
                key={i}
                className="flex items-center py-2 border-t border-[#E3DFD0] text-[#1B2A1F]"
              >
                <span className="flex-2 font-medium">{st.name}</span>
                <span className="flex-1 text-right text-gray-600">{st.buy}</span>
                <span className="flex-1 text-right text-gray-600">{st.sold}</span>
                <span className="flex-1 text-right text-rose-600">{st.waste}</span>
                <b className="flex-1 text-right text-[#1B2A1F]">{st.rem}</b>
              </div>
            ))}
          </div>
        </div>

        {/* Settings & Bottom Controls */}
        <div className="flex gap-2.5 pt-1">
          <button
            onClick={() => navigate('/accounts')}
            className="flex-1 min-h-[46px] bg-white border-2 border-[#22304A] text-[#22304A] rounded-xl text-xs font-bold hover:bg-gray-50 flex items-center justify-center transition-colors"
          >
            सभी खाते / Passbook
          </button>
          <button
            onClick={() => openPinModal()}
            className="flex-1 min-h-[46px] bg-white border-2 border-[#22304A] text-[#22304A] rounded-xl text-xs font-bold hover:bg-gray-50 flex items-center justify-center transition-colors"
          >
            PIN बदलें / Change PIN
          </button>
        </div>
      </div>
    </div>
  );
};
