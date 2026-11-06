import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSales } from '../../api/sales';
import { getBuyers, createBuyer } from '../../api/buyers';
import { getPayments, createPayment } from '../../api/payments';
import { Sale, Buyer, Payment } from '../../utils/types';
import { CurrencyDisplay } from '../../components/CurrencyDisplay';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { EmptyState } from '../../components/EmptyState';
import { formatDate } from '../../utils/date';
import { BuyerModal } from '../buyers/BuyerModal';
import { PaymentModal } from '../payments/PaymentModal';
import {
  Plus,
  TrendingUp,
  Calendar,
  Users,
  Search,
  MessageCircle,
  ArrowDownLeft,
  FileText,
  UserPlus,
  CreditCard,
  ChevronRight,
  Filter,
  CheckCircle2,
  Clock,
  Sparkles
} from 'lucide-react';

export const SaleList: React.FC = () => {
  const navigate = useNavigate();

  // Active view tab: 'sales' | 'buyers' | 'payments'
  const [activeTab, setActiveTab] = useState<'sales' | 'buyers' | 'payments'>('sales');

  // Time Period Filter: 'today' | 'week' | 'month' | 'year' | 'all'
  const [periodFilter, setPeriodFilter] = useState<'today' | 'week' | 'month' | 'year' | 'all'>('all');

  const [sales, setSales] = useState<Sale[]>([]);
  const [buyers, setBuyers] = useState<Buyer[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [onlyWithDues, setOnlyWithDues] = useState(false);

  // Modals
  const [buyerModalOpen, setBuyerModalOpen] = useState(false);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [selectedBuyerForPayment, setSelectedBuyerForPayment] = useState<number | undefined>(undefined);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [sRes, bRes, pRes] = await Promise.all([
        getSales(),
        getBuyers(),
        getPayments({ direction: 'IN' }),
      ]);
      setSales(sRes.sales || []);
      const buyersList = Array.isArray(bRes) ? bRes : (bRes as any)?.buyers || [];
      setBuyers(buyersList);
      setPayments(pRes.payments || []);
    } catch (err) {
      console.error('Failed to load buyer interface data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Time Period Matching Helper
  const isDateInPeriod = (dateStr?: string) => {
    if (!dateStr) return false;
    if (periodFilter === 'all') return true;

    const txDate = new Date(dateStr);
    const now = new Date();

    if (periodFilter === 'today') {
      return dateStr.startsWith(now.toISOString().split('T')[0]);
    }
    if (periodFilter === 'week') {
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(now.getDate() - 7);
      return txDate >= oneWeekAgo && txDate <= now;
    }
    if (periodFilter === 'month') {
      return txDate.getMonth() === now.getMonth() && txDate.getFullYear() === now.getFullYear();
    }
    if (periodFilter === 'year') {
      return txDate.getFullYear() === now.getFullYear();
    }
    return true;
  };

  // Compute Metrics across selected Period (Days, Months, Years)
  const periodSales = sales.filter((s) => isDateInPeriod(s.date));
  const periodSalesTotal = periodSales.reduce((sum, s) => {
    const itemsSum = s.items?.reduce((acc: number, it: any) => acc + (it.lineTotal || 0), 0) || 0;
    return sum + Math.max(0, itemsSum - (s.deductionAmount || 0));
  }, 0);

  const periodPayments = payments.filter((p) => isDateInPeriod(p.date));
  const periodCashReceived =
    periodSales.reduce((sum, s) => sum + (s.receivedNow || 0), 0) +
    periodPayments.reduce((sum, p) => sum + (p.amount || 0), 0);

  const totalMarketDues = buyers.reduce(
    (sum, b) => sum + ((b.currentDue !== undefined ? b.currentDue : b.openingBalance) || 0),
    0
  );

  // Handlers for Modals
  const handleCreateBuyer = async (data: any) => {
    await createBuyer(data);
    setBuyerModalOpen(false);
    fetchData();
  };

  const handleSavePayment = async (data: any) => {
    await createPayment(data);
    setPaymentModalOpen(false);
    fetchData();
  };

  // WhatsApp Actions
  const shareBillWhatsApp = (e: React.MouseEvent, sale: any) => {
    e.stopPropagation();
    const buyerName = sale.buyer?.name || 'ग्राहक';
    const itemsList = (sale.items || [])
      .map(
        (it: any) =>
          `• ${it.vegetable?.nameHi || it.vegetable?.nameEn || 'सब्ज़ी'}: ${it.quantity} ${it.unit} @ ₹${it.rate / 100} = ₹${Math.round(it.lineTotal / 100)}`
      )
      .join('\n');
    const itemsSum = sale.items?.reduce((sum: number, it: any) => sum + it.lineTotal, 0) || 0;
    const netTotal = itemsSum - (sale.deductionAmount || 0);
    const balance = Math.max(0, netTotal - (sale.receivedNow || 0));

    const message =
      `*हुसैन फूड्स (सब्जी मंडी)*\n` +
      `बिक्री रसीद #${sale.id}\n` +
      `तारीख: ${formatDate(sale.date)}\n` +
      `ग्राहक: ${buyerName}\n` +
      `--------------------------\n` +
      `${itemsList}\n` +
      `--------------------------\n` +
      `कुल बिल: ₹${Math.round(netTotal / 100).toLocaleString('en-IN')}\n` +
      `जमा (Received): ₹${Math.round((sale.receivedNow || 0) / 100).toLocaleString('en-IN')}\n` +
      `बाकी (Due): ₹${Math.round(balance / 100).toLocaleString('en-IN')}\n\n` +
      `धन्यवाद!`;

    const phone = sale.buyer?.phone ? sale.buyer.phone.replace(/[^0-9]/g, '') : '';
    const url =
      phone.length >= 10
        ? `https://wa.me/91${phone.slice(-10)}?text=${encodeURIComponent(message)}`
        : `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  const sendDueReminderWhatsApp = (e: React.MouseEvent, buyer: any) => {
    e.stopPropagation();
    const dueRupees = Math.round(
      ((buyer.currentDue !== undefined ? buyer.currentDue : buyer.openingBalance || 0)) / 100
    );
    const message =
      `नमस्ते ${buyer.name} जी,\n\n` +
      `हुसैन फूड्स (सब्जी मंडी) से आपका पिछला बकाया हिसाब *₹${dueRupees.toLocaleString('en-IN')}* है।\n` +
      `कृपया इसका भुगतान करने का कष्ट करें।\n\n` +
      `धन्यवाद,\nहुसैन फूड्स`;

    const phone = buyer.phone ? buyer.phone.replace(/[^0-9]/g, '') : '';
    const url =
      phone.length >= 10
        ? `https://wa.me/91${phone.slice(-10)}?text=${encodeURIComponent(message)}`
        : `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  // Filtered Sales
  const filteredSales = sales.filter((s) => {
    if (!isDateInPeriod(s.date)) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchBuyer = s.buyer?.name?.toLowerCase().includes(q);
      const matchId = String(s.id).includes(q);
      const matchVeg = (s.items || []).some(
        (it: any) =>
          it.vegetable?.nameHi?.toLowerCase().includes(q) ||
          it.vegetable?.nameEn?.toLowerCase().includes(q)
      );
      if (!matchBuyer && !matchId && !matchVeg) return false;
    }
    return true;
  });

  // Filtered Buyers
  const filteredBuyers = buyers.filter((b) => {
    const due = (b.currentDue !== undefined ? b.currentDue : b.openingBalance) || 0;
    if (onlyWithDues && due <= 0) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = b.name?.toLowerCase().includes(q);
      const matchPhone = b.phone?.includes(q);
      const matchPerson = b.contactPerson?.toLowerCase().includes(q);
      if (!matchName && !matchPhone && !matchPerson) return false;
    }
    return true;
  });

  // Filtered Payments
  const filteredPayments = payments.filter((p) => {
    if (!isDateInPeriod(p.date)) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchBuyer = p.buyer?.name?.toLowerCase().includes(q);
      if (!matchBuyer) return false;
    }
    return true;
  });

  return (
    <div className="space-y-5 max-w-5xl mx-auto font-sans">
      {/* Top Banner / Financial Overview across Days, Months, Years */}
      <div className="bg-linear-to-r from-blue-900 via-indigo-900 to-blue-950 rounded-3xl p-5 sm:p-6 text-white shadow-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-500/20 text-blue-200 text-xs font-semibold mb-2 backdrop-blur-xs">
              <TrendingUp className="w-3.5 h-3.5 text-blue-300" />
              <span>System 1 · खरीदार व बिक्री खाता (Buyer UI)</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
              खरीदार व बिक्री लेजर <span className="text-base font-normal text-blue-200">/ Sell Desk</span>
            </h1>
            <p className="text-xs sm:text-sm text-blue-100/80 mt-1">
              सब्जी बिक्री, ग्राहक बकाया, लेजर और पेमेंट वसूली का पूरा हिसाब
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => navigate('/sales/new')}
              className="flex items-center gap-2 px-4 py-2.5 bg-blue-500 hover:bg-blue-400 text-white rounded-xl text-xs sm:text-sm font-extrabold shadow-md transition-all active:scale-95"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>+ नया बिल (+ New Bill)</span>
            </button>

            <button
              onClick={() => setBuyerModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold border border-white/15 transition-all"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>+ नया खरीदार</span>
            </button>

            <button
              onClick={() => {
                setSelectedBuyerForPayment(undefined);
                setPaymentModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-3 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-xs transition-all"
            >
              <ArrowDownLeft className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>रुपया जमा (+ Payment)</span>
            </button>
          </div>
        </div>

        {/* Period Selector Chips (Days, Months, Years) */}
        <div className="flex flex-wrap gap-1.5 mt-5 pt-4 border-t border-white/15">
          <span className="text-[11px] font-bold text-blue-200 uppercase tracking-wider self-center mr-2">
            समय सीमा (Period):
          </span>
          {[
            { id: 'today', label: 'आज (Today)' },
            { id: 'week', label: 'हफ्ता (This Week)' },
            { id: 'month', label: 'महीना (This Month)' },
            { id: 'year', label: 'साल (This Year)' },
            { id: 'all', label: 'पूरा हिसाब (All Time)' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setPeriodFilter(tab.id as any)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                periodFilter === tab.id
                  ? 'bg-white text-blue-900 shadow-xs scale-102'
                  : 'bg-white/10 text-blue-200 hover:bg-white/20'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* 3 Metrics Cards (Computed dynamically for selected period) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3.5 border border-white/10">
            <span className="text-[11px] font-semibold text-blue-200 uppercase tracking-wider block">
              कुल बिक्री (Total Sold)
            </span>
            <div className="text-2xl font-black text-white mt-1">
              <CurrencyDisplay amount={periodSalesTotal} />
            </div>
            <span className="text-[11px] text-blue-200/80 mt-0.5 block">
              {periodSales.length} बिल दर्ज हैं
            </span>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3.5 border border-white/10">
            <span className="text-[11px] font-semibold text-emerald-200 uppercase tracking-wider block">
              कुल वसूली (Payments Received)
            </span>
            <div className="text-2xl font-black text-emerald-300 mt-1">
              <CurrencyDisplay amount={periodCashReceived} />
            </div>
            <span className="text-[11px] text-emerald-200/80 mt-0.5 block">
              बिल व जमा पर्ची से वसूली
            </span>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3.5 border border-white/10">
            <span className="text-[11px] font-semibold text-rose-200 uppercase tracking-wider block">
              ग्राहकों पर कुल बाकी (Market Dues)
            </span>
            <div className="text-2xl font-black text-rose-300 mt-1">
              <CurrencyDisplay amount={totalMarketDues} />
            </div>
            <span className="text-[11px] text-rose-200/80 mt-0.5 block">
              {buyers.filter((b) => ((b.currentDue !== undefined ? b.currentDue : b.openingBalance) || 0) > 0).length} खरीदारों पर बकाया
            </span>
          </div>
        </div>
      </div>

      {/* Main Activity Navigation Tabs */}
      <div className="bg-white p-1.5 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between gap-1 overflow-x-auto">
        <button
          onClick={() => setActiveTab('sales')}
          className={`flex-1 min-w-[130px] py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all ${
            activeTab === 'sales'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-gray-600 hover:bg-gray-50'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          <span>बिक्री बिल ({filteredSales.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('buyers')}
          className={`flex-1 min-w-[150px] py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all ${
            activeTab === 'buyers'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-gray-600 hover:bg-gray-50'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>खरीदार लेजर व खाता ({buyers.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('payments')}
          className={`flex-1 min-w-[130px] py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all ${
            activeTab === 'payments'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-gray-600 hover:bg-gray-50'
          }`}
        >
          <CreditCard className="w-4 h-4" />
          <span>जमा रसीदें ({filteredPayments.length})</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-3.5 rounded-2xl border border-gray-200 shadow-xs flex flex-col sm:flex-row items-center gap-2.5">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={
              activeTab === 'sales'
                ? 'बिल नंबर, खरीदार या सब्ज़ी खोजें (जैसे आलू, टमाटर)...'
                : activeTab === 'buyers'
                ? 'खरीदार का नाम, दुकान या मोबाइल खोजें...'
                : 'जमा रसीद खोजें...'
            }
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-hidden focus:border-blue-500 font-medium"
          />
        </div>

        {activeTab === 'buyers' && (
          <button
            onClick={() => setOnlyWithDues(!onlyWithDues)}
            className={`px-3 py-2 rounded-xl text-xs font-bold border transition-colors flex items-center gap-1.5 w-full sm:w-auto justify-center ${
              onlyWithDues
                ? 'bg-rose-50 border-rose-300 text-rose-700'
                : 'bg-gray-50 border-gray-200 text-gray-600'
            }`}
          >
            <Filter className="w-3.5 h-3.5" />
            <span>सिर्फ बाकी वाले (Due only)</span>
          </button>
        )}
      </div>

      {/* Content Rendering based on Tab */}
      {loading ? (
        <LoadingSpinner />
      ) : activeTab === 'sales' ? (
        /* TAB 1: ALL INVOICES (WHAT WAS BOUGHT/SOLD AND AT WHAT RATE ACROSS DAYS/MONTHS/YEARS) */
        filteredSales.length === 0 ? (
          <EmptyState
            title="कोई बिक्री बिल नहीं मिला"
            description="इस समय सीमा में कोई बिक्री बिल दर्ज नहीं है।"
            action={
              <button
                onClick={() => navigate('/sales/new')}
                className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold"
              >
                + नया बिल बनाएं
              </button>
            }
          />
        ) : (
          <div className="space-y-3">
            {filteredSales.map((s: any) => {
              const itemsSum = s.items?.reduce((sum: number, it: any) => sum + it.lineTotal, 0) || 0;
              const netTotal = itemsSum - (s.deductionAmount || 0);
              const balance = Math.max(0, netTotal - (s.receivedNow || 0));

              return (
                <div
                  key={s.id}
                  onClick={() => navigate(`/sales/${s.id}`)}
                  className="bg-white p-4 sm:p-5 rounded-2xl border border-gray-200 shadow-xs hover:border-blue-300 hover:shadow-md transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-gray-900 text-sm">बिल #{s.id}</span>
                      <span className="text-xs text-gray-500 flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>{formatDate(s.date)}</span>
                      </span>
                      <span className="text-xs font-extrabold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-800">
                        {s.buyer?.name || 'खरीदार'}
                      </span>
                      {s.paymentMode && (
                        <span className="text-[11px] font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded-md">
                          {s.paymentMode}
                        </span>
                      )}
                    </div>

                    {/* Exact vegetables bought/sold and at what rate */}
                    <div className="text-xs text-gray-700 mt-2 flex flex-wrap gap-1.5">
                      {s.items?.map((it: any, idx: number) => (
                        <span
                          key={idx}
                          className="bg-gray-50 border border-gray-200 px-2.5 py-1 rounded-lg font-bold text-gray-800"
                        >
                          {it.vegetable?.nameHi || it.vegetable?.nameEn || 'सब्ज़ी'}: {it.quantity} {it.unit} @ ₹{it.rate / 100}/{it.unit}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Financial amounts & WhatsApp CTA */}
                  <div className="flex items-center justify-between sm:justify-end gap-4 border-t sm:border-t-0 pt-2 sm:pt-0 border-gray-100">
                    <div className="text-left sm:text-right">
                      <div className="text-base font-extrabold text-gray-900">
                        <CurrencyDisplay amount={netTotal} />
                      </div>
                      {balance > 0 ? (
                        <span className="text-xs font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md">
                          बाकी: <CurrencyDisplay amount={balance} />
                        </span>
                      ) : (
                        <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                          पूरा चुकता (Paid)
                        </span>
                      )}
                    </div>

                    <button
                      onClick={(e) => shareBillWhatsApp(e, s)}
                      title="WhatsApp पर बिल रसीद भेजें"
                      className="p-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl border border-emerald-200 transition-colors flex items-center gap-1.5 text-xs font-bold"
                    >
                      <MessageCircle className="w-4 h-4 fill-emerald-600 text-transparent" />
                      <span className="hidden sm:inline">WhatsApp</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : activeTab === 'buyers' ? (
        /* TAB 2: BUYER KHATAS & LEDGERS */
        filteredBuyers.length === 0 ? (
          <EmptyState
            title="कोई खरीदार नहीं मिला"
            description="नया खरीदार जोड़ने के लिए नीचे क्लिक करें।"
            action={
              <button
                onClick={() => setBuyerModalOpen(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold"
              >
                + नया खरीदार जोड़ें
              </button>
            }
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {filteredBuyers.map((b: any) => {
              const due = (b.currentDue !== undefined ? b.currentDue : b.openingBalance) || 0;
              const hasDue = due > 0;

              return (
                <div
                  key={b.id}
                  onClick={() => navigate(`/buyers/${b.id}`)}
                  className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs hover:border-blue-300 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="font-extrabold text-gray-900 text-base leading-tight">
                          {b.name}
                        </h4>
                        <div className="text-xs text-gray-500 mt-1 flex flex-wrap gap-2">
                          {b.contactPerson && <span>व्यक्ति: {b.contactPerson}</span>}
                          {b.phone && <span>फोन: {b.phone}</span>}
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">
                          बाकी खाता (Due)
                        </span>
                        <div
                          className={`text-lg font-black ${
                            hasDue ? 'text-rose-600' : 'text-emerald-600'
                          }`}
                        >
                          <CurrencyDisplay amount={due} />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Quick Action Buttons on Buyer Card */}
                  <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedBuyerForPayment(b.id);
                        setPaymentModalOpen(true);
                      }}
                      className="flex-1 py-1.5 px-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-xl text-xs font-bold border border-emerald-200 transition-colors flex items-center justify-center gap-1"
                    >
                      <ArrowDownLeft className="w-3.5 h-3.5" />
                      <span>+ जमा करें</span>
                    </button>

                    {hasDue && (
                      <button
                        onClick={(e) => sendDueReminderWhatsApp(e, b)}
                        className="flex-1 py-1.5 px-2 bg-amber-50 hover:bg-amber-100 text-amber-900 rounded-xl text-xs font-bold border border-amber-200 transition-colors flex items-center justify-center gap-1"
                      >
                        <MessageCircle className="w-3.5 h-3.5 fill-amber-600 text-transparent" />
                        <span>तकादा भेजें</span>
                      </button>
                    )}

                    <button
                      onClick={() => navigate(`/buyers/${b.id}`)}
                      className="py-1.5 px-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold transition-colors flex items-center gap-0.5"
                    >
                      <span>खाता लेजर</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : (
        /* TAB 3: PAYMENT RECEIPTS */
        filteredPayments.length === 0 ? (
          <EmptyState
            title="कोई जमा रसीद नहीं मिली"
            description="खरीदारों से मिलने वाली बकाया वसूली यहां दिखेंगी।"
            action={
              <button
                onClick={() => {
                  setSelectedBuyerForPayment(undefined);
                  setPaymentModalOpen(true);
                }}
                className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-semibold"
              >
                + रुपया जमा दर्ज करें
              </button>
            }
          />
        ) : (
          <div className="space-y-2.5">
            {filteredPayments.map((p: any) => (
              <div
                key={p.id}
                className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
                    <ArrowDownLeft className="w-5 h-5 stroke-[2.5]" />
                  </div>
                  <div>
                    <h5 className="font-bold text-gray-900 text-sm">
                      {p.buyer?.name || 'खरीदार'} से जमा
                    </h5>
                    <div className="text-xs text-gray-500 mt-0.5 flex items-center gap-2">
                      <span>{formatDate(p.date)}</span>
                      <span>•</span>
                      <span className="font-medium text-emerald-800 bg-emerald-50 px-1.5 py-0.2 rounded-sm">
                        {p.paymentMode || 'नकद'}
                      </span>
                      {p.account?.name && <span>({p.account.name})</span>}
                    </div>
                    {p.notes && <p className="text-xs text-gray-400 mt-0.5 italic">{p.notes}</p>}
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-base font-black text-emerald-700">
                    + <CurrencyDisplay amount={p.amount} />
                  </span>
                  <span className="text-[10px] text-gray-400 block">जमा रसीद</span>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* New Buyer Modal */}
      <BuyerModal
        isOpen={buyerModalOpen}
        onClose={() => setBuyerModalOpen(false)}
        onSave={handleCreateBuyer}
      />

      {/* Record Payment Modal */}
      <PaymentModal
        isOpen={paymentModalOpen}
        onClose={() => {
          setPaymentModalOpen(false);
          setSelectedBuyerForPayment(undefined);
        }}
        onSave={handleSavePayment}
        defaultDirection="RECEIVED_FROM_BUYER"
        initialBuyerId={selectedBuyerForPayment}
      />
    </div>
  );
};
