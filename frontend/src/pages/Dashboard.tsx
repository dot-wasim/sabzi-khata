import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { getDashboard } from '../api/dashboard';
import { getAccountPassbook } from '../api/accounts';
import { getBuyers } from '../api/buyers';
import { getSellers } from '../api/sellers';
import { getSales } from '../api/sales';
import { getPurchases } from '../api/purchases';
import { getExpenses } from '../api/expenses';
import { getWastages } from '../api/wastage';
import { getVegetables } from '../api/vegetables';
import { CurrencyDisplay } from '../components/CurrencyDisplay';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { Modal } from '../components/Modal';
import { formatDate } from '../utils/date';
import { useBossAuth } from '../context/BossAuthContext';
import {
  TrendingUp,
  ShoppingCart,
  Landmark,
  Lock,
  ChevronRight,
  Calendar,
  Sparkles,
  Wallet,
  ArrowDownLeft,
  ArrowUpRight,
  History,
  X,
  Users,
  Building2,
  Truck,
  Store,
  Carrot,
  Award,
  AlertTriangle,
  Search,
  MessageCircle,
  BarChart3,
  CheckCircle2,
  Receipt
} from 'lucide-react';

export const Dashboard: React.FC = () => {
  const { lockBoss } = useBossAuth();
  const navigate = useNavigate();

  // Active Boss Tab:
  // 'overview' | 'transport' | 'top_shops' | 'top_products' | 'purchases_audit' | 'sales_audit' | 'accounts'
  const [activeTab, setActiveTab] = useState<
    'overview' | 'transport' | 'top_shops' | 'top_products' | 'purchases_audit' | 'sales_audit' | 'accounts'
  >('overview');

  // Period Filter: today, week, month, year, all
  const [periodFilter, setPeriodFilter] = useState<'today' | 'week' | 'month' | 'year' | 'all'>('today');

  // Search filter for audit views
  const [searchQuery, setSearchQuery] = useState('');

  // Data States
  const [loading, setLoading] = useState(true);
  const [dashData, setDashData] = useState<any>(null);
  const [buyers, setBuyers] = useState<any[]>([]);
  const [sellers, setSellers] = useState<any[]>([]);
  const [sales, setSales] = useState<any[]>([]);
  const [purchases, setPurchases] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [wastages, setWastages] = useState<any[]>([]);
  const [vegetables, setVegetables] = useState<any[]>([]);

  // Account Passbook Modal
  const [passbookModalOpen, setPassbookModalOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<any>(null);
  const [passbookData, setPassbookData] = useState<any>(null);
  const [loadingPassbook, setLoadingPassbook] = useState(false);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const [
        dashRes,
        bRes,
        sRes,
        salesRes,
        purRes,
        expRes,
        wasteRes,
        vegRes,
      ] = await Promise.all([
        getDashboard(),
        getBuyers(),
        getSellers(),
        getSales(),
        getPurchases(),
        getExpenses(),
        getWastages(),
        getVegetables(undefined, true),
      ]);

      setDashData(dashRes);
      setBuyers(Array.isArray(bRes) ? bRes : (bRes as any)?.buyers || []);
      setSellers(Array.isArray(sRes) ? sRes : (sRes as any)?.sellers || []);
      setSales(salesRes.sales || []);
      setPurchases(purRes.purchases || []);
      setExpenses(expRes.expenses || []);
      setWastages(wasteRes.wastages || []);
      setVegetables(vegRes || []);
    } catch (err) {
      console.error('Failed to load boss data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  // Filter Date Range Function
  const filterByPeriod = (itemDateStr: string | undefined) => {
    if (!itemDateStr || periodFilter === 'all') return true;
    const itemDate = new Date(itemDateStr);
    const now = new Date();

    if (periodFilter === 'today') {
      return itemDate.toDateString() === now.toDateString();
    } else if (periodFilter === 'week') {
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(now.getDate() - 7);
      return itemDate >= oneWeekAgo && itemDate <= now;
    } else if (periodFilter === 'month') {
      return (
        itemDate.getMonth() === now.getMonth() &&
        itemDate.getFullYear() === now.getFullYear()
      );
    } else if (periodFilter === 'year') {
      return itemDate.getFullYear() === now.getFullYear();
    }
    return true;
  };

  // 1. FILTERED TRANSACTIONS IN PERIOD
  const periodSales = sales.filter((s) => filterByPeriod(s.date));
  const periodPurchases = purchases.filter((p) => filterByPeriod(p.date));
  const periodExpenses = expenses.filter((e) => filterByPeriod(e.date));
  const periodWastages = wastages.filter((w) => filterByPeriod(w.date));

  // 2. FINANCIAL AGGREGATIONS
  // Purchases Landed Cost
  const totalPurchaseGoods = periodPurchases.reduce((sum, p) => {
    const goods = (p.items || []).reduce((acc: number, it: any) => acc + (it.lineTotal || 0), 0);
    return sum + goods;
  }, 0);

  const mandiTransportTotal = periodPurchases.reduce((sum, p) => sum + (p.transport || 0), 0);
  const mandiLabourTotal = periodPurchases.reduce((sum, p) => sum + (p.labour || 0), 0);
  const directTransportExpenses = periodExpenses
    .filter((e) => e.category === 'Transport')
    .reduce((sum, e) => sum + (e.amount || 0), 0);

  // Total Transportation Cost
  const totalTransportCost = mandiTransportTotal + directTransportExpenses;

  // Other Direct Expenses (excluding transport)
  const otherExpensesTotal = periodExpenses
    .filter((e) => e.category !== 'Transport')
    .reduce((sum, e) => sum + (e.amount || 0), 0);

  // Sales Revenue
  const totalGrossSales = periodSales.reduce((sum, s) => {
    const lineSubtotal = (s.items || []).reduce((acc: number, it: any) => acc + (it.lineTotal || 0), 0);
    return sum + lineSubtotal;
  }, 0);
  const totalDeductions = periodSales.reduce((sum, s) => sum + (s.deductionAmount || 0), 0);
  const totalNetSales = Math.max(0, totalGrossSales - totalDeductions);

  // Weighted Average Buying Cost per Vegetable
  const vegCostMap = new Map<number, { totalCost: number; totalQty: number }>();
  for (const p of periodPurchases.length > 0 ? periodPurchases : purchases) {
    for (const it of p.items || []) {
      const cur = vegCostMap.get(it.vegetableId) || { totalCost: 0, totalQty: 0 };
      cur.totalCost += it.lineTotal;
      cur.totalQty += it.quantity;
      vegCostMap.set(it.vegetableId, cur);
    }
  }

  const getAvgCostRate = (vegId: number, fallbackRate: number = 0) => {
    const cur = vegCostMap.get(vegId);
    return cur && cur.totalQty > 0 ? Math.round(cur.totalCost / cur.totalQty) : fallbackRate;
  };

  // Wastage / Spoilage Loss
  const totalWastageLoss = periodWastages.reduce((sum, w) => {
    const unitCost = getAvgCostRate(w.vegetableId, 2000); // 20 rs/kg fallback
    return sum + Math.round((w.quantity || 0) * unitCost);
  }, 0);

  // Net Money Made (Net Profit)
  const netProfit = totalNetSales - totalPurchaseGoods - totalTransportCost - mandiLabourTotal - otherExpensesTotal - totalWastageLoss;
  const netMarginPct = totalNetSales > 0 ? ((netProfit / totalNetSales) * 100).toFixed(1) : '0';

  // Receivables & Payables
  const totalReceivable = buyers.reduce(
    (sum, b) => sum + ((b.currentBalance !== undefined ? b.currentBalance : b.openingBalance) || 0),
    0
  );
  const totalPayable = sellers.reduce(
    (sum, s) => sum + ((s.currentBalance !== undefined ? s.currentBalance : s.openingBalance) || 0),
    0
  );

  // Accounts Balances
  const accountsList = dashData?.accounts || [];
  const totalCashBank = accountsList.reduce((sum: number, a: any) => sum + (a.currentBalance || 0), 0);

  // 3. TRANSPORTATION TRANSACTION LEDGER
  const transportRecords: any[] = [];
  // From purchases
  for (const p of periodPurchases) {
    if (p.transport > 0) {
      transportRecords.push({
        id: `pur-${p.id}`,
        date: p.date,
        type: 'Mandi Freight (मंडी आवक भाड़ा)',
        vehicle: p.transporterName || 'गाड़ी / टेम्पो',
        rateDetail: p.transportType === 'PER_UNIT' ? `₹${(p.transportRate || 0) / 100} / ${p.transportUnit || 'kg'}` : 'Flat भाड़ा',
        amount: p.transport,
        ref: `खरीद #${p.id} (${p.seller?.name || 'किसान'})`,
      });
    }
  }
  // From direct expenses
  for (const e of periodExpenses) {
    if (e.category === 'Transport') {
      transportRecords.push({
        id: `exp-${e.id}`,
        date: e.date,
        type: 'Direct Transport (सीधा ट्रांसपोर्ट खर्च)',
        vehicle: e.notes || 'टेम्पो / माल भाड़ा',
        rateDetail: 'सीधा खर्च',
        amount: e.amount,
        ref: e.notes || 'गाड़ी भाड़ा',
      });
    }
  }
  transportRecords.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // 4. WHICH SHOP MAKES US MORE MONEY (TOP SHOPS LEADERBOARD)
  const shopProfitMap = new Map<number, {
    buyerId: number;
    name: string;
    phone: string;
    totalPurchased: number;
    totalQty: number;
    estimatedCost: number;
    profit: number;
    due: number;
    billCount: number;
  }>();

  for (const s of periodSales) {
    const bId = s.buyerId || 0;
    const bName = s.buyer?.name || 'Walk-in / नकद ग्राहक';
    const bPhone = s.buyer?.phone || '';
    const bDue = (s.buyer?.currentBalance !== undefined ? s.buyer.currentBalance : s.buyer?.openingBalance) || 0;

    const entry = shopProfitMap.get(bId) || {
      buyerId: bId,
      name: bName,
      phone: bPhone,
      totalPurchased: 0,
      totalQty: 0,
      estimatedCost: 0,
      profit: 0,
      due: bDue,
      billCount: 0,
    };

    const sItemsSum = (s.items || []).reduce((acc: number, it: any) => acc + (it.lineTotal || 0), 0);
    const sNet = Math.max(0, sItemsSum - (s.deductionAmount || 0));
    entry.totalPurchased += sNet;
    entry.billCount += 1;

    let sCost = 0;
    for (const it of s.items || []) {
      entry.totalQty += it.quantity || 0;
      const unitCost = getAvgCostRate(it.vegetableId, Math.round(it.rate * 0.75));
      sCost += Math.round((it.quantity || 0) * unitCost);
    }
    entry.estimatedCost += sCost;
    entry.profit += sNet - sCost;
    shopProfitMap.set(bId, entry);
  }

  const topShops = Array.from(shopProfitMap.values()).sort((a, b) => b.profit - a.profit);

  // 5. WHICH PRODUCT MAKES US MORE MONEY (TOP VEGETABLES LEADERBOARD)
  const productProfitMap = new Map<number, {
    vegetableId: number;
    nameHi: string;
    nameEn: string;
    unit: string;
    totalQtySold: number;
    totalRevenue: number;
    avgBuyRate: number;
    avgSellRate: number;
    profit: number;
  }>();

  for (const s of periodSales) {
    for (const it of s.items || []) {
      const vId = it.vegetableId;
      const veg = vegetables.find((v) => v.id === vId) || it.vegetable || {};
      const entry = productProfitMap.get(vId) || {
        vegetableId: vId,
        nameHi: veg.nameHi || veg.nameEn || 'सब्ज़ी',
        nameEn: veg.nameEn || 'Vegetable',
        unit: it.unit || veg.unit || 'kg',
        totalQtySold: 0,
        totalRevenue: 0,
        avgBuyRate: 0,
        avgSellRate: 0,
        profit: 0,
      };

      entry.totalQtySold += it.quantity || 0;
      entry.totalRevenue += it.lineTotal || 0;
      productProfitMap.set(vId, entry);
    }
  }

  // Calculate margins for products
  const topProducts = Array.from(productProfitMap.values()).map((p) => {
    const avgCost = getAvgCostRate(p.vegetableId, 0);
    const avgSell = p.totalQtySold > 0 ? Math.round(p.totalRevenue / p.totalQtySold) : 0;
    const totalCost = Math.round(p.totalQtySold * avgCost);
    const profit = p.totalRevenue - totalCost;

    return {
      ...p,
      avgBuyRate: avgCost,
      avgSellRate: avgSell,
      unitMargin: avgSell - avgCost,
      profit,
    };
  }).sort((a, b) => b.profit - a.profit);

  // 6. WHATSAPP BRIEFING SHARE
  const shareBossWhatsAppReport = () => {
    const periodName =
      periodFilter === 'today'
        ? 'आज का'
        : periodFilter === 'week'
        ? 'इस हफ्ते का'
        : periodFilter === 'month'
        ? 'इस महीने का'
        : periodFilter === 'year'
        ? 'इस साल का'
        : 'पूरा';

    const message =
      `*👑 हुसैन फूड्स — मालिक दैनिक रिपोर्ट (${periodName})*\n` +
      `तारीख: ${formatDate(new Date().toISOString())}\n\n` +
      `*💰 वित्तीय स्थिति (P&L):*\n` +
      `• कुल बिक्री: ₹${Math.round(totalNetSales / 100).toLocaleString('en-IN')}\n` +
      `• मंडी खरीद: ₹${Math.round(totalPurchaseGoods / 100).toLocaleString('en-IN')}\n` +
      `• गाड़ी भाड़ा (Transport): ₹${Math.round(totalTransportCost / 100).toLocaleString('en-IN')}\n` +
      `• मजदूरी व अन्य खर्च: ₹${Math.round((mandiLabourTotal + otherExpensesTotal) / 100).toLocaleString('en-IN')}\n` +
      `• बर्बादी/खराबी: ₹${Math.round(totalWastageLoss / 100).toLocaleString('en-IN')}\n` +
      `---------------------------------\n` +
      `*✅ कुल शुद्ध कमाई (Net Profit): ₹${Math.round(netProfit / 100).toLocaleString('en-IN')} (${netMarginPct}%)*\n\n` +
      `*🏦 गल्ला व बैंक बैलेंस:*\n` +
      accountsList.map((a: any) => `• ${a.name}: ₹${Math.round((a.currentBalance || 0) / 100).toLocaleString('en-IN')}`).join('\n') +
      `\n\n*⚖️ मार्केट बकाया स्थिति:*\n` +
      `• ग्राहकों से कुल लेना: ₹${Math.round(totalReceivable / 100).toLocaleString('en-IN')}\n` +
      `• किसानों को कुल देना: ₹${Math.round(totalPayable / 100).toLocaleString('en-IN')}\n\n` +
      `*हुसैन फूड्स मोबाइल बही खाता*`;

    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
  };

  const openAccountPassbook = async (acc: any) => {
    setSelectedAccount(acc);
    setPassbookModalOpen(true);
    setLoadingPassbook(true);
    try {
      const res = await getAccountPassbook(acc.id);
      setPassbookData(res);
    } catch (err) {
      console.error('Failed to load passbook:', err);
    } finally {
      setLoadingPassbook(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-3">
        <LoadingSpinner size="lg" />
        <span className="text-sm font-bold text-gray-500">मालिक डैशबोर्ड डेटा लोड हो रहा है...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto font-sans pb-16">
      {/* ======================================================== */}
      {/* EXECUTIVE BOSS HERO BANNER                               */}
      {/* ======================================================== */}
      <div className="bg-linear-to-r from-slate-900 via-[#22304A] to-slate-950 rounded-3xl p-5 sm:p-7 text-white shadow-xl border border-white/10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-400/20 text-amber-300 text-xs font-black mb-2.5 backdrop-blur-xs border border-amber-400/30">
              <Sparkles className="w-3.5 h-3.5" />
              <span>System 3 · Boss Desk (मालिक कंट्रोल सेंटर)</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight flex items-center gap-2">
              <span>मालिक हिसाब व P&L</span>
              <span className="text-base font-normal text-gray-300">/ Executive Hub</span>
            </h1>
            <p className="text-xs sm:text-sm text-gray-300 mt-1">
              खरीद-बिक्री ऑडिट, गाड़ी भाड़ा खर्च, सर्वाधिक मुनाफ़े वाली दुकानें व सब्जियां
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={shareBossWhatsAppReport}
              className="flex items-center gap-2 px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs sm:text-sm font-bold shadow-md transition-all"
              title="WhatsApp पर दैनिक सारांश भेजें"
            >
              <MessageCircle className="w-4 h-4 fill-white text-transparent" />
              <span>WhatsApp रिपोर्ट</span>
            </button>
            <button
              onClick={lockBoss}
              className="flex items-center gap-1.5 px-3 py-2.5 bg-white/10 hover:bg-white/20 rounded-xl text-xs font-bold text-gray-200 transition-colors border border-white/10"
              title="मालिक डेस्क लॉक करें"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>लॉक करें</span>
            </button>
          </div>
        </div>

        {/* Multi-Period Filter Buttons */}
        <div className="mt-6 pt-5 border-t border-white/15 flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-amber-300 mr-1">हिसाब अवधि:</span>
          {(
            [
              { id: 'today', label: 'आज (Today)' },
              { id: 'week', label: 'हफ्ता (This Week)' },
              { id: 'month', label: 'महीना (This Month)' },
              { id: 'year', label: 'साल (This Year)' },
              { id: 'all', label: 'पूरा हिसाब (All Time)' },
            ] as const
          ).map((item) => (
            <button
              key={item.id}
              onClick={() => setPeriodFilter(item.id)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition-all ${
                periodFilter === item.id
                  ? 'bg-amber-400 text-slate-950 shadow-md scale-102'
                  : 'bg-white/10 hover:bg-white/20 text-gray-200'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* NET PROFIT STATEMENT HERO CARD */}
        <div className="mt-5 p-5 bg-black/40 backdrop-blur-md rounded-2xl border border-white/15 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-amber-300">
                कुल शुद्ध कमाई / Net Money Made
              </span>
              <div className="text-3xl sm:text-4xl font-black mt-1 tracking-tight text-white flex items-baseline gap-3">
                <CurrencyDisplay amount={netProfit} />
                <span className="text-sm font-bold text-emerald-400">
                  {netMarginPct}% मार्जिन
                </span>
              </div>
            </div>

            <div className="text-xs sm:text-right text-gray-300 space-y-0.5">
              <div>
                कुल बिक्री:{' '}
                <b className="text-white">
                  <CurrencyDisplay amount={totalNetSales} />
                </b>
              </div>
              <div>
                मंडी खरीद:{' '}
                <b className="text-rose-300">
                  <CurrencyDisplay amount={totalPurchaseGoods} />
                </b>
              </div>
              <div>
                गाड़ी भाड़ा:{' '}
                <b className="text-amber-300">
                  <CurrencyDisplay amount={totalTransportCost} />
                </b>
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-white/10 text-[11px] text-gray-400 flex flex-wrap items-center gap-x-2 gap-y-1">
            <span>बिक्री ₹{Math.round(totalNetSales / 100).toLocaleString('en-IN')}</span>
            <span>− खरीद ₹{Math.round(totalPurchaseGoods / 100).toLocaleString('en-IN')}</span>
            <span>− भाड़ा ₹{Math.round(totalTransportCost / 100).toLocaleString('en-IN')}</span>
            <span>− मजदूरी ₹{Math.round(mandiLabourTotal / 100).toLocaleString('en-IN')}</span>
            <span>− बर्बादी ₹{Math.round(totalWastageLoss / 100).toLocaleString('en-IN')}</span>
            <span>= <b className="text-emerald-400">शुद्ध लाभ</b></span>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 7-WAY BOSS NAVIGATION TABS                               */}
      {/* ======================================================== */}
      <div className="bg-white p-1.5 rounded-2xl border border-gray-200 shadow-xs flex items-center gap-1 overflow-x-auto">
        <button
          onClick={() => setActiveTab('overview')}
          className={`flex-1 min-w-[110px] py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 transition-all ${
            activeTab === 'overview'
              ? 'bg-[#22304A] text-white shadow-xs'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          <span>अवलोकन P&L</span>
        </button>

        <button
          onClick={() => setActiveTab('transport')}
          className={`flex-1 min-w-[130px] py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 transition-all ${
            activeTab === 'transport'
              ? 'bg-amber-600 text-white shadow-xs'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          <Truck className="w-4 h-4" />
          <span>गाड़ी भाड़ा ({transportRecords.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('top_shops')}
          className={`flex-1 min-w-[130px] py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 transition-all ${
            activeTab === 'top_shops'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          <Store className="w-4 h-4" />
          <span>टॉप दुकानें ({topShops.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('top_products')}
          className={`flex-1 min-w-[130px] py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 transition-all ${
            activeTab === 'top_products'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          <Carrot className="w-4 h-4" />
          <span>टॉप सब्जियां ({topProducts.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('purchases_audit')}
          className={`flex-1 min-w-[120px] py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 transition-all ${
            activeTab === 'purchases_audit'
              ? 'bg-teal-700 text-white shadow-xs'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          <ShoppingCart className="w-4 h-4" />
          <span>खरीद ऑडिट ({periodPurchases.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('sales_audit')}
          className={`flex-1 min-w-[120px] py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 transition-all ${
            activeTab === 'sales_audit'
              ? 'bg-indigo-700 text-white shadow-xs'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          <span>बिक्री ऑडिट ({periodSales.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('accounts')}
          className={`flex-1 min-w-[110px] py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 transition-all ${
            activeTab === 'accounts'
              ? 'bg-purple-700 text-white shadow-xs'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          <Landmark className="w-4 h-4" />
          <span>गल्ला व बैंक</span>
        </button>
      </div>

      {/* ======================================================== */}
      {/* TAB 1: OVERVIEW P&L & BALANCES                           */}
      {/* ======================================================== */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Quick Metrics 4 Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-2xs">
              <span className="text-[11px] font-bold text-gray-500 uppercase block">कुल बिक्री (Sales)</span>
              <div className="text-xl sm:text-2xl font-black text-blue-700 mt-1">
                <CurrencyDisplay amount={totalNetSales} />
              </div>
              <span className="text-[10px] text-gray-400 mt-0.5 block">{periodSales.length} बिक्री पर्चियां</span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-2xs">
              <span className="text-[11px] font-bold text-gray-500 uppercase block">मंडी खरीद (Purchases)</span>
              <div className="text-xl sm:text-2xl font-black text-emerald-700 mt-1">
                <CurrencyDisplay amount={totalPurchaseGoods} />
              </div>
              <span className="text-[10px] text-gray-400 mt-0.5 block">{periodPurchases.length} आवक गाड़ियां</span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-2xs">
              <span className="text-[11px] font-bold text-gray-500 uppercase block">गाड़ी भाड़ा (Transport)</span>
              <div className="text-xl sm:text-2xl font-black text-amber-600 mt-1">
                <CurrencyDisplay amount={totalTransportCost} />
              </div>
              <span className="text-[10px] text-gray-400 mt-0.5 block">{transportRecords.length} ट्रिप / चालान</span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-2xs">
              <span className="text-[11px] font-bold text-gray-500 uppercase block">बर्बादी / सड़न (Wastage)</span>
              <div className="text-xl sm:text-2xl font-black text-rose-600 mt-1">
                <CurrencyDisplay amount={totalWastageLoss} />
              </div>
              <span className="text-[10px] text-gray-400 mt-0.5 block">{periodWastages.length} नुकसान एंट्रीज</span>
            </div>
          </div>

          {/* Market Dues Balance Ribbon */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="bg-white p-4 rounded-2xl border border-blue-200 shadow-2xs flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-blue-900 flex items-center gap-1.5">
                  <TrendingUp className="w-4 h-4 text-blue-600" />
                  <span>ग्राहकों से कुल बाकी (Market Receivable)</span>
                </span>
                <div className="text-2xl font-black text-rose-600 mt-1">
                  <CurrencyDisplay amount={totalReceivable} />
                </div>
                <span className="text-[11px] text-gray-500 mt-0.5 block">
                  {buyers.filter((b) => ((b.currentBalance !== undefined ? b.currentBalance : b.openingBalance) || 0) > 0).length} दुकानों पर बाकी
                </span>
              </div>
              <button
                onClick={() => setActiveTab('top_shops')}
                className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-xl text-xs font-bold hover:bg-blue-100 transition-colors"
              >
                दुकानें देखें &rarr;
              </button>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-emerald-200 shadow-2xs flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                  <ShoppingCart className="w-4 h-4 text-emerald-600" />
                  <span>किसानों को कुल देनदारी (Mandi Payable)</span>
                </span>
                <div className="text-2xl font-black text-rose-600 mt-1">
                  <CurrencyDisplay amount={totalPayable} />
                </div>
                <span className="text-[11px] text-gray-500 mt-0.5 block">
                  {sellers.filter((s) => ((s.currentBalance !== undefined ? s.currentBalance : s.openingBalance) || 0) > 0).length} किसानों को देना बाकी
                </span>
              </div>
              <button
                onClick={() => navigate('/sellers')}
                className="px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-xl text-xs font-bold hover:bg-emerald-100 transition-colors"
              >
                किसान लेजर &rarr;
              </button>
            </div>
          </div>

          {/* Accounts & Cash Galla Grid */}
          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-gray-900 text-sm">गल्ला व बैंक खाते (Live Passbooks)</h3>
                <span className="text-xs text-gray-400">दुकान का कुल उपलब्ध नकद व बैंक बैलेंस</span>
              </div>
              <span className="text-base font-black text-emerald-700">
                कुल: <CurrencyDisplay amount={totalCashBank} />
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {accountsList.map((acc: any) => (
                <button
                  key={acc.id}
                  onClick={() => openAccountPassbook(acc)}
                  className="p-3.5 bg-gray-50 hover:bg-gray-100 rounded-2xl border border-gray-200 text-left transition-all active:scale-98 flex flex-col justify-between"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-600">{acc.name}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-md font-extrabold uppercase bg-gray-200 text-gray-700">
                      {acc.type}
                    </span>
                  </div>
                  <div className="text-lg font-black text-gray-900 mt-2">
                    <CurrencyDisplay amount={acc.currentBalance || 0} />
                  </div>
                  <span className="text-[10px] text-blue-600 font-bold mt-2 block">
                    पासबुक देखें &rarr;
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 2: TRANSPORTATION COST TRACKER                       */}
      {/* ======================================================== */}
      {activeTab === 'transport' && (
        <div className="space-y-4">
          {/* Transport Summary Card */}
          <div className="bg-amber-50 border border-amber-200 p-5 rounded-3xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-amber-900 font-extrabold text-sm">
                <Truck className="w-5 h-5 text-amber-700" />
                <span>गाड़ी भाड़ा व ट्रांसपोर्टेशन कुल खर्च / Total Freight</span>
              </div>
              <div className="text-3xl font-black text-amber-950 mt-1">
                <CurrencyDisplay amount={totalTransportCost} />
              </div>
              <p className="text-xs text-amber-800 mt-1">
                मंडी आवक भाड़ा: ₹{Math.round(mandiTransportTotal / 100).toLocaleString('en-IN')} | सीधा ट्रांसपोर्ट खर्च: ₹{Math.round(directTransportExpenses / 100).toLocaleString('en-IN')}
              </p>
            </div>

            <div className="text-right">
              <span className="text-xs font-bold text-amber-800 block">कुल ट्रिप / चालान</span>
              <span className="text-2xl font-black text-amber-950">{transportRecords.length} गाड़ियां</span>
            </div>
          </div>

          {/* Transport Ledger Table */}
          {transportRecords.length === 0 ? (
            <div className="bg-white p-8 rounded-2xl border border-gray-200 text-center text-gray-400">
              इस अवधि में कोई गाड़ी भाड़ा खर्च दर्ज नहीं है।
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
              <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                <h4 className="font-extrabold text-gray-900 text-sm">
                  गाड़ी भाड़ा लेनदेन विवरण ({transportRecords.length})
                </h4>
              </div>

              <div className="divide-y divide-gray-100">
                {transportRecords.map((t) => (
                  <div
                    key={t.id}
                    className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-gray-50 transition-colors"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-gray-500">{formatDate(t.date)}</span>
                        <span className="text-xs font-extrabold text-amber-900 bg-amber-100 px-2 py-0.5 rounded-md">
                          {t.vehicle}
                        </span>
                        <span className="text-[11px] text-gray-500">{t.type}</span>
                      </div>
                      <p className="text-xs text-gray-700 mt-1 font-medium">{t.ref}</p>
                    </div>

                    <div className="text-left sm:text-right">
                      <span className="text-base font-black text-amber-800">
                        <CurrencyDisplay amount={t.amount} />
                      </span>
                      <span className="text-[10px] text-gray-400 block">{t.rateDetail}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 3: WHICH SHOP MAKES US MORE MONEY (LEADERBOARD)      */}
      {/* ======================================================== */}
      {activeTab === 'top_shops' && (
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 p-4 rounded-2xl flex items-center justify-between">
            <div>
              <h3 className="font-extrabold text-blue-950 text-base">
                सर्वाधिक कमाई कराने वाली दुकानें / Top Profitable Shops
              </h3>
              <p className="text-xs text-blue-800 mt-0.5">
                किस दुकान या खरीदार से सबसे ज्यादा मुनाफा और माल की बिक्री हुई
              </p>
            </div>
            <Award className="w-8 h-8 text-blue-600" />
          </div>

          {topShops.length === 0 ? (
            <div className="bg-white p-8 rounded-2xl border border-gray-200 text-center text-gray-400">
              इस अवधि में कोई दुकान बिक्री दर्ज नहीं है।
            </div>
          ) : (
            <div className="space-y-2.5">
              {topShops.map((shop, idx) => {
                const marginPct =
                  shop.totalPurchased > 0 ? ((shop.profit / shop.totalPurchased) * 100).toFixed(1) : '0';

                return (
                  <div
                    key={shop.buyerId}
                    onClick={() => shop.buyerId && navigate(`/buyers/${shop.buyerId}`)}
                    className="bg-white p-4 sm:p-5 rounded-2xl border border-gray-200 shadow-2xs hover:border-blue-300 hover:shadow-md transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3.5">
                      <div
                        className={`w-9 h-9 rounded-2xl flex items-center justify-center text-sm font-black text-white shrink-0 shadow-xs ${
                          idx === 0
                            ? 'bg-amber-500'
                            : idx === 1
                            ? 'bg-slate-400'
                            : idx === 2
                            ? 'bg-amber-700'
                            : 'bg-blue-600'
                        }`}
                      >
                        #{idx + 1}
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-black text-gray-900 text-base">{shop.name}</h4>
                          {shop.phone && <span className="text-xs text-gray-400">({shop.phone})</span>}
                        </div>
                        <div className="text-xs text-gray-500 mt-0.5 flex flex-wrap gap-2">
                          <span>{shop.billCount} पर्चियां</span>
                          <span>•</span>
                          <span>कुल माल: <b>{Math.round(shop.totalQty)} kg/नग</b></span>
                          <span>•</span>
                          <span>बिक्री: <b><CurrencyDisplay amount={shop.totalPurchased} /></b></span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-5 border-t sm:border-t-0 pt-2 sm:pt-0 border-gray-100">
                      <div className="text-left sm:text-right">
                        <span className="text-xs font-bold text-gray-400 block">अनुमानित मुनाफा (Profit)</span>
                        <div className="text-base font-black text-emerald-700">
                          + <CurrencyDisplay amount={shop.profit} />
                        </div>
                        <span className="text-[10px] text-emerald-800 font-extrabold bg-emerald-50 px-1.5 py-0.2 rounded-sm">
                          {marginPct}% मार्जिन
                        </span>
                      </div>

                      <div className="text-right">
                        <span className="text-xs font-bold text-gray-400 block">बाकी खाता (Due)</span>
                        <div
                          className={`text-sm font-black ${
                            shop.due > 0 ? 'text-rose-600' : 'text-emerald-700'
                          }`}
                        >
                          <CurrencyDisplay amount={shop.due} />
                        </div>
                      </div>

                      <ChevronRight className="w-4 h-4 text-gray-300" />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 4: WHICH PRODUCT MAKES US MORE MONEY (LEADERBOARD)    */}
      {/* ======================================================== */}
      {activeTab === 'top_products' && (
        <div className="space-y-4">
          <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-2xl flex items-center justify-between">
            <div>
              <h3 className="font-extrabold text-emerald-950 text-base">
                सर्वाधिक मुनाफ़े वाली सब्जियां / Most Profitable Vegetables
              </h3>
              <p className="text-xs text-emerald-800 mt-0.5">
                किस सब्जी में सबसे ज्यादा मार्जिन व कमाई मिली
              </p>
            </div>
            <Carrot className="w-8 h-8 text-emerald-600" />
          </div>

          {topProducts.length === 0 ? (
            <div className="bg-white p-8 rounded-2xl border border-gray-200 text-center text-gray-400">
              इस अवधि में कोई सब्जी बिक्री दर्ज नहीं है।
            </div>
          ) : (
            <div className="space-y-2.5">
              {topProducts.map((prod, idx) => (
                <div
                  key={prod.vegetableId}
                  className="bg-white p-4 sm:p-5 rounded-2xl border border-gray-200 shadow-2xs hover:border-emerald-300 hover:shadow-md transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3.5">
                    <div
                      className={`w-9 h-9 rounded-2xl flex items-center justify-center text-sm font-black text-white shrink-0 shadow-xs ${
                        idx === 0
                          ? 'bg-amber-500'
                          : idx === 1
                          ? 'bg-slate-400'
                          : idx === 2
                          ? 'bg-amber-700'
                          : 'bg-emerald-600'
                      }`}
                    >
                      #{idx + 1}
                    </div>

                    <div>
                      <h4 className="font-black text-gray-900 text-base">
                        {prod.nameHi} <span className="text-xs text-gray-400 font-normal">({prod.nameEn})</span>
                      </h4>
                      <div className="text-xs text-gray-500 mt-0.5 flex flex-wrap gap-2">
                        <span>कुल बिका: <b>{prod.totalQtySold} {prod.unit}</b></span>
                        <span>•</span>
                        <span>औसत खरीद: <b>₹{(prod.avgBuyRate / 100).toFixed(1)}/{prod.unit}</b></span>
                        <span>•</span>
                        <span>औसत बिक्री: <b>₹{(prod.avgSellRate / 100).toFixed(1)}/{prod.unit}</b></span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-5 border-t sm:border-t-0 pt-2 sm:pt-0 border-gray-100">
                    <div className="text-left sm:text-right">
                      <span className="text-xs font-bold text-gray-400 block">प्रति यूनिट मार्जिन</span>
                      <span className="text-sm font-black text-emerald-800">
                        + ₹{(prod.unitMargin / 100).toFixed(1)} / {prod.unit}
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="text-xs font-bold text-gray-400 block">कुल कमाई (Total Profit)</span>
                      <div className="text-base font-black text-emerald-700">
                        + <CurrencyDisplay amount={prod.profit} />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 5: WHAT WE BOUGHT & AT WHAT DATE (PURCHASES AUDIT)   */}
      {/* ======================================================== */}
      {activeTab === 'purchases_audit' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-extrabold text-gray-900 text-base">
                मंडी खरीद ऑडिट / Purchases Audit
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                क्या-क्या खरीदा, किस तारीख को, किस दर पर और कुल कितना लगा
              </p>
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="सब्जी या किसान खोजें..."
                className="w-full pl-9 pr-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-semibold"
              />
            </div>
          </div>

          <div className="space-y-3">
            {periodPurchases
              .filter((p) => {
                if (!searchQuery.trim()) return true;
                const q = searchQuery.toLowerCase();
                const matchSeller = p.seller?.name?.toLowerCase().includes(q);
                const matchVeg = (p.items || []).some(
                  (it: any) =>
                    it.vegetable?.nameHi?.toLowerCase().includes(q) ||
                    it.vegetable?.nameEn?.toLowerCase().includes(q)
                );
                return matchSeller || matchVeg;
              })
              .map((p) => {
                const goodsSum = (p.items || []).reduce((acc: number, it: any) => acc + (it.lineTotal || 0), 0);
                const landedCost = goodsSum + (p.transport || 0) + (p.labour || 0);

                return (
                  <div
                    key={p.id}
                    onClick={() => navigate(`/purchases/${p.id}`)}
                    className="bg-white p-4 sm:p-5 rounded-2xl border border-gray-200 shadow-2xs hover:border-emerald-300 transition-all cursor-pointer space-y-2.5"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 pb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-gray-900 text-sm">खरीद #{p.id}</span>
                        <span className="text-xs text-gray-500 font-bold">{formatDate(p.date)}</span>
                        <span className="text-xs font-black text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md">
                          {p.seller?.name || 'किसान'}
                        </span>
                      </div>

                      <div className="text-right">
                        <span className="text-base font-black text-gray-900">
                          <CurrencyDisplay amount={landedCost} />
                        </span>
                        <span className="text-[10px] text-gray-400 block">कुल लागत (Landed)</span>
                      </div>
                    </div>

                    {/* Items List with exact Rates */}
                    <div className="text-xs text-gray-700 flex flex-wrap gap-2">
                      {(p.items || []).map((it: any, i: number) => (
                        <span
                          key={i}
                          className="bg-gray-50 border border-gray-200 px-2.5 py-1 rounded-lg font-bold text-gray-900"
                        >
                          {it.vegetable?.nameHi || it.vegetable?.nameEn || 'सब्जी'}: {it.quantity} {it.unit} @ ₹{it.rate / 100} = ₹{Math.round(it.lineTotal / 100)}
                        </span>
                      ))}
                      {p.transport > 0 && (
                        <span className="bg-amber-50 border border-amber-200 text-amber-900 px-2.5 py-1 rounded-lg font-bold">
                          भाड़ा: ₹{Math.round(p.transport / 100)}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 6: WHAT WE SOLD & AT WHAT DATE (SALES AUDIT)         */}
      {/* ======================================================== */}
      {activeTab === 'sales_audit' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-extrabold text-gray-900 text-base">
                बिक्री ऑडिट / Sales Audit
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                क्या-क्या बिका, किस तारीख को, किस दर पर और कितनी वसूली हुई
              </p>
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="सब्जी या ग्राहक खोजें..."
                className="w-full pl-9 pr-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-semibold"
              />
            </div>
          </div>

          <div className="space-y-3">
            {periodSales
              .filter((s) => {
                if (!searchQuery.trim()) return true;
                const q = searchQuery.toLowerCase();
                const matchBuyer = s.buyer?.name?.toLowerCase().includes(q);
                const matchVeg = (s.items || []).some(
                  (it: any) =>
                    it.vegetable?.nameHi?.toLowerCase().includes(q) ||
                    it.vegetable?.nameEn?.toLowerCase().includes(q)
                );
                return matchBuyer || matchVeg;
              })
              .map((s) => {
                const goodsSum = (s.items || []).reduce((acc: number, it: any) => acc + (it.lineTotal || 0), 0);
                const netBill = Math.max(0, goodsSum - (s.deductionAmount || 0));

                return (
                  <div
                    key={s.id}
                    onClick={() => navigate(`/sales/${s.id}`)}
                    className="bg-white p-4 sm:p-5 rounded-2xl border border-gray-200 shadow-2xs hover:border-blue-300 transition-all cursor-pointer space-y-2.5"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 pb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-gray-900 text-sm">बिक्री #{s.id}</span>
                        <span className="text-xs text-gray-500 font-bold">{formatDate(s.date)}</span>
                        <span className="text-xs font-black text-blue-800 bg-blue-50 px-2 py-0.5 rounded-md">
                          {s.buyer?.name || 'ग्राहक'}
                        </span>
                      </div>

                      <div className="text-right">
                        <span className="text-base font-black text-gray-900">
                          <CurrencyDisplay amount={netBill} />
                        </span>
                        <span className="text-[10px] text-gray-400 block">कुल बिल राशि</span>
                      </div>
                    </div>

                    {/* Items List with exact Rates */}
                    <div className="text-xs text-gray-700 flex flex-wrap gap-2">
                      {(s.items || []).map((it: any, i: number) => (
                        <span
                          key={i}
                          className="bg-gray-50 border border-gray-200 px-2.5 py-1 rounded-lg font-bold text-gray-900"
                        >
                          {it.vegetable?.nameHi || it.vegetable?.nameEn || 'सब्जी'}: {it.quantity} {it.unit} @ ₹{it.rate / 100} = ₹{Math.round(it.lineTotal / 100)}
                        </span>
                      ))}
                      {s.deductionAmount > 0 && (
                        <span className="bg-rose-50 border border-rose-200 text-rose-800 px-2.5 py-1 rounded-lg font-bold">
                          छूट: − ₹{Math.round(s.deductionAmount / 100)}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 7: ACCOUNTS & PASSBOOKS                             */}
      {/* ======================================================== */}
      {activeTab === 'accounts' && (
        <div className="space-y-4">
          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs space-y-3">
            <h3 className="font-extrabold text-gray-900 text-base">
              खाता पासबुक व गल्ला (Accounts Passbook)
            </h3>
            <p className="text-xs text-gray-500">
              प्रत्येक बैंक खाते व गल्ले की पूरी रोकड़ पासबुक और लेन-देन
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              {accountsList.map((acc: any) => (
                <button
                  key={acc.id}
                  onClick={() => openAccountPassbook(acc)}
                  className="p-4 bg-gray-50 hover:bg-gray-100 rounded-2xl border border-gray-200 text-left transition-all active:scale-98"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-500">{acc.type}</span>
                    <span className="text-xs font-black text-blue-600">पासबुक देखें &rarr;</span>
                  </div>
                  <h4 className="font-black text-gray-900 text-base mt-1">{acc.name}</h4>
                  <div className="text-xl font-black text-emerald-800 mt-2">
                    <CurrencyDisplay amount={acc.currentBalance || 0} />
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* ACCOUNT PASSBOOK MODAL                                   */}
      {/* ======================================================== */}
      {passbookModalOpen && selectedAccount && (
        <Modal
          isOpen={passbookModalOpen}
          onClose={() => setPassbookModalOpen(false)}
          title={`${selectedAccount.name} — रोकड़ पासबुक`}
        >
          <div className="space-y-4 font-sans">
            <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200 flex items-center justify-between">
              <div>
                <span className="text-xs text-gray-500 font-bold block">वर्तमान उपलब्ध शेष (Balance)</span>
                <div className="text-2xl font-black text-emerald-700 mt-0.5">
                  <CurrencyDisplay amount={selectedAccount.currentBalance || 0} />
                </div>
              </div>
              <span className="px-2.5 py-1 bg-gray-200 rounded-lg text-xs font-black text-gray-700">
                {selectedAccount.type}
              </span>
            </div>

            {loadingPassbook ? (
              <div className="py-8 flex justify-center">
                <LoadingSpinner />
              </div>
            ) : !passbookData?.entries || passbookData.entries.length === 0 ? (
              <div className="text-center py-8 text-sm text-gray-400">
                इस खाते में अभी कोई लेन-देन दर्ज नहीं है।
              </div>
            ) : (
              <div className="max-h-80 overflow-y-auto divide-y divide-gray-100">
                {passbookData.entries.map((entry: any, i: number) => {
                  const isIn = entry.direction === 'IN' || entry.amount > 0;
                  return (
                    <div key={i} className="py-2.5 flex items-center justify-between text-xs">
                      <div>
                        <span className="font-bold text-gray-900 block">{entry.description || 'लेन-देन'}</span>
                        <span className="text-[10px] text-gray-400">{formatDate(entry.date)}</span>
                      </div>
                      <div className="text-right">
                        <span
                          className={`font-black text-sm ${
                            isIn ? 'text-emerald-700' : 'text-rose-600'
                          }`}
                        >
                          {isIn ? '+' : '−'} <CurrencyDisplay amount={Math.abs(entry.amount)} />
                        </span>
                        <span className="text-[10px] text-gray-400 block">
                          बाकी: <CurrencyDisplay amount={entry.runningBalance || 0} />
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
};
