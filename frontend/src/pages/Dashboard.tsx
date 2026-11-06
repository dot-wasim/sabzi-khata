import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { getDashboard } from '../api/dashboard';
import { getAccountPassbook } from '../api/accounts';
import { CurrencyDisplay } from '../components/CurrencyDisplay';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { Modal } from '../components/Modal';
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
  Sparkles,
  Wallet,
  QrCode,
  ArrowDownLeft,
  ArrowUpRight,
  History,
  X
} from 'lucide-react';

export const Dashboard: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState(toInputDate(new Date()));
  const [activeTab, setActiveTab] = useState<'today' | 'week' | 'month' | 'season'>('today');
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const { lockBoss, openPinModal } = useBossAuth();
  const navigate = useNavigate();

  // Account Passbook Modal in Boss section
  const [passbookModalOpen, setPassbookModalOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<any>(null);
  const [passbookData, setPassbookData] = useState<any>(null);
  const [loadingPassbook, setLoadingPassbook] = useState(false);
  const [passbookFilter, setPassbookFilter] = useState<'ALL' | 'IN' | 'OUT'>('ALL');

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

  const openAccountPassbook = async (acc: any) => {
    setSelectedAccount(acc);
    setPassbookModalOpen(true);
    setLoadingPassbook(true);
    setPassbookFilter('ALL');
    try {
      const res = await getAccountPassbook(acc.id);
      setPassbookData(res);
    } catch (err) {
      console.error('Failed to load account passbook:', err);
    } finally {
      setLoadingPassbook(false);
    }
  };

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

        {/* Big Profit Hero Card */}
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

        {/* Live Bank Balances Bar with direct Passbook access */}
        {data?.accounts && data.accounts.length > 0 && (
          <div className="bg-white border border-[#E3DFD0] rounded-xl p-3.5 shadow-2xs space-y-2.5">
            <div className="flex justify-between items-center">
              <div>
                <b className="text-sm text-[#1B2A1F] block">खाता पासबुक व गल्ला / Accounts Ledger</b>
                <span className="text-[11px] text-gray-400">अलग-अलग बैंक व नकद लेन-देन का लेजर</span>
              </div>
              <NavLink to="/accounts" className="text-xs font-bold text-[#1F6B3A] hover:underline flex items-center gap-1">
                <span>विस्तार</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </NavLink>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {data.accounts.map((acc: any) => (
                <button
                  key={acc.id}
                  onClick={() => openAccountPassbook(acc)}
                  className="p-2.5 bg-[#F6F4EC] hover:bg-[#eae6d5] active:scale-98 transition-all rounded-xl border border-[#E3DFD0] text-left flex flex-col justify-between"
                >
                  <div>
                    <span className="text-[10px] font-bold text-gray-500 block truncate">
                      {acc.type === 'CASH' ? 'गल्ला (Cash)' : acc.type === 'BANK' ? 'SBI Bank' : 'UPI QR'}
                    </span>
                    <b className="text-xs text-[#1B2A1F] block mt-1">
                      <CurrencyDisplay amount={acc.currentBalance || 0} />
                    </b>
                  </div>
                  <span className="text-[9px] text-[#1F6B3A] font-bold mt-2 block">
                    लेजर देखें &rarr;
                  </span>
                </button>
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

      {/* Account Passbook / Payment Ledger Modal inside Boss Section */}
      <Modal
        isOpen={passbookModalOpen}
        onClose={() => setPassbookModalOpen(false)}
        title={selectedAccount ? `${selectedAccount.name} - लेजर पासबुक` : 'खाता लेजर'}
        maxWidth="lg"
      >
        {loadingPassbook ? (
          <LoadingSpinner />
        ) : passbookData ? (
          <div className="space-y-4">
            {/* Account Balance Summary Header */}
            <div className="p-4 bg-linear-to-r from-[#22304A] to-[#1B2A1F] text-white rounded-2xl flex items-center justify-between shadow-xs">
              <div>
                <span className="text-xs text-gray-300 uppercase tracking-wider block">
                  वर्तमान बैलेंस (Live Balance)
                </span>
                <div className="text-2xl font-extrabold mt-0.5 text-white">
                  <CurrencyDisplay amount={passbookData.currentBalance} />
                </div>
                <span className="text-[11px] text-gray-300 block mt-0.5">
                  शुरुआती बैलेंस: ₹{Math.round(passbookData.openingBalance / 100).toLocaleString('en-IN')}
                </span>
              </div>

              <div className="text-right space-y-1">
                <div className="text-xs">
                  <span className="text-emerald-300 font-bold">कुल आवक (+ IN): </span>
                  <span className="font-extrabold text-white">
                    ₹{Math.round((passbookData.totalInflow || 0) / 100).toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="text-xs">
                  <span className="text-rose-300 font-bold">कुल निकासी (- OUT): </span>
                  <span className="font-extrabold text-white">
                    ₹{Math.round((passbookData.totalOutflow || 0) / 100).toLocaleString('en-IN')}
                  </span>
                </div>
              </div>
            </div>

            {/* Filter Tabs for IN / OUT / ALL */}
            <div className="flex gap-1.5 p-1 bg-gray-100 rounded-xl text-xs font-bold">
              <button
                onClick={() => setPassbookFilter('ALL')}
                className={`flex-1 py-1.5 rounded-lg transition-all ${
                  passbookFilter === 'ALL' ? 'bg-white text-gray-900 shadow-2xs' : 'text-gray-500'
                }`}
              >
                सभी ({passbookData.transactions.length})
              </button>
              <button
                onClick={() => setPassbookFilter('IN')}
                className={`flex-1 py-1.5 rounded-lg transition-all ${
                  passbookFilter === 'IN' ? 'bg-white text-emerald-700 shadow-2xs' : 'text-gray-500'
                }`}
              >
                आवक / जमा (+ IN)
              </button>
              <button
                onClick={() => setPassbookFilter('OUT')}
                className={`flex-1 py-1.5 rounded-lg transition-all ${
                  passbookFilter === 'OUT' ? 'bg-white text-rose-700 shadow-2xs' : 'text-gray-500'
                }`}
              >
                निकासी / भुगतान (- OUT)
              </button>
            </div>

            {/* Transactions List */}
            <div className="border border-gray-200 rounded-xl overflow-hidden max-h-80 overflow-y-auto">
              <div className="divide-y divide-gray-100">
                {passbookData.transactions.filter((tx: any) =>
                  passbookFilter === 'ALL' ? true : tx.type === passbookFilter
                ).length === 0 ? (
                  <div className="p-6 text-center text-gray-400 text-xs">
                    इस खाते में कोई लेन-देन नहीं है।
                  </div>
                ) : (
                  passbookData.transactions
                    .filter((tx: any) => (passbookFilter === 'ALL' ? true : tx.type === passbookFilter))
                    .map((tx: any, idx: number) => (
                      <div key={idx} className="p-3 hover:bg-gray-50 flex items-center justify-between gap-3 text-xs">
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-[10px] ${
                              tx.type === 'IN'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {tx.type === 'IN' ? '+IN' : '-OUT'}
                          </div>
                          <div>
                            <div className="font-bold text-gray-900 leading-tight">
                              {tx.description}
                            </div>
                            <div className="text-[10px] text-gray-500 mt-0.5 flex items-center gap-1.5">
                              <span>{formatDate(tx.date)}</span>
                              {tx.category && (
                                <>
                                  <span>•</span>
                                  <span>{tx.category}</span>
                                </>
                              )}
                              {tx.referenceId && (
                                <>
                                  <span>•</span>
                                  <span className="font-mono">{tx.referenceId}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="text-right">
                          <div
                            className={`font-extrabold ${
                              tx.type === 'IN' ? 'text-emerald-700' : 'text-rose-700'
                            }`}
                          >
                            {tx.type === 'IN' ? '+' : '-'}
                            <CurrencyDisplay amount={tx.amount} />
                          </div>
                          <div className="text-[10px] text-gray-400 mt-0.5">
                            बैलेंस: ₹{Math.round(tx.balance / 100).toLocaleString('en-IN')}
                          </div>
                        </div>
                      </div>
                    ))
                )}
              </div>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
};
