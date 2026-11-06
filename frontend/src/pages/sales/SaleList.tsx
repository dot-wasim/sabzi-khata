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

  const [sales, setSales] = useState<Sale[]>([]);
  const [buyers, setBuyers] = useState<Buyer[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [onlyWithDues, setOnlyWithDues] = useState(false);
  const [selectedBuyerFilter, setSelectedBuyerFilter] = useState('');
  const [dateFilter, setDateFilter] = useState<'all' | 'today'>('all');

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

  // Compute Daily & Khata Metrics
  const todayStr = new Date().toISOString().split('T')[0];
  const todaySales = sales.filter((s) => s.date?.startsWith(todayStr));
  const todaySalesTotal = todaySales.reduce((sum, s) => {
    const itemsSum = s.items?.reduce((acc: number, it: any) => acc + (it.lineTotal || 0), 0) || 0;
    return sum + Math.max(0, itemsSum - (s.deductionAmount || 0));
  }, 0);

  const todayCashReceived = todaySales.reduce((sum, s) => sum + (s.receivedNow || 0), 0) +
    payments
      .filter((p) => p.date?.startsWith(todayStr))
      .reduce((sum, p) => sum + (p.amount || 0), 0);

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
    if (dateFilter === 'today' && !s.date?.startsWith(todayStr)) return false;
    if (selectedBuyerFilter && String(s.buyerId) !== selectedBuyerFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchBuyer = s.buyer?.name?.toLowerCase().includes(q);
      const matchId = String(s.id).includes(q);
      if (!matchBuyer && !matchId) return false;
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
    if (dateFilter === 'today' && !p.date?.startsWith(todayStr)) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchBuyer = p.buyer?.name?.toLowerCase().includes(q);
      if (!matchBuyer) return false;
    }
    return true;
  });

  return (
    <div className="space-y-5 max-w-5xl mx-auto">
      {/* Top Banner / Identity Header */}
      <div className="bg-linear-to-r from-blue-900 via-indigo-900 to-blue-950 rounded-3xl p-5 sm:p-6 text-white shadow-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-500/20 text-blue-200 text-xs font-semibold mb-2 backdrop-blur-xs">
              <TrendingUp className="w-3.5 h-3.5 text-blue-300" />
              <span>बिक्री व ग्राहक डेस्क · Counter Hub</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              ग्राहक व बिक्री खाता <span className="text-base font-normal text-blue-200">/ Sell Desk</span>
            </h1>
            <p className="text-xs sm:text-sm text-blue-100/80 mt-1">
              दुकानदार बिलिंग, बाज़ार बाकी, और ग्राहक लेन-देन की पूरी गतिविधियां
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
              <span>+ नया ग्राहक</span>
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

        {/* 3 Metrics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-6 pt-5 border-t border-white/15">
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3.5 border border-white/10">
            <span className="text-[11px] font-semibold text-blue-200 uppercase tracking-wider block">
              आज की कुल बिक्री (Today Sales)
            </span>
            <div className="text-2xl font-extrabold text-white mt-1">
              <CurrencyDisplay amount={todaySalesTotal} />
            </div>
            <span className="text-[11px] text-blue-200/80 mt-0.5 block">
              {todaySales.length} बिल आज बने
            </span>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3.5 border border-white/10">
            <span className="text-[11px] font-semibold text-emerald-200 uppercase tracking-wider block">
              आज नकद वसूली (Collected Today)
            </span>
            <div className="text-2xl font-extrabold text-emerald-300 mt-1">
              <CurrencyDisplay amount={todayCashReceived} />
            </div>
            <span className="text-[11px] text-emerald-200/80 mt-0.5 block">
              बिल व जमा पर्ची से वसूली
            </span>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3.5 border border-white/10">
            <span className="text-[11px] font-semibold text-rose-200 uppercase tracking-wider block">
              ग्राहकों पर कुल बाकी (Market Dues)
            </span>
            <div className="text-2xl font-extrabold text-rose-300 mt-1">
              <CurrencyDisplay amount={totalMarketDues} />
            </div>
            <span className="text-[11px] text-rose-200/80 mt-0.5 block">
              {buyers.filter((b) => ((b.currentDue !== undefined ? b.currentDue : b.openingBalance) || 0) > 0).length} ग्राहकों पर बाकी
            </span>
          </div>
        </div>
      </div>

      {/* Main Activity Navigation Tabs */}
      <div className="bg-white p-1.5 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between gap-1 overflow-x-auto">
        <button
          onClick={() => setActiveTab('sales')}
          className={`flex-1 min-w-[120px] py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all ${
            activeTab === 'sales'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-gray-600 hover:bg-gray-50'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          <span>बिक्री बिल ({sales.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('buyers')}
          className={`flex-1 min-w-[140px] py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all ${
            activeTab === 'buyers'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-gray-600 hover:bg-gray-50'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>ग्राहक खाता व बाकी ({buyers.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('payments')}
          className={`flex-1 min-w-[120px] py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all ${
            activeTab === 'payments'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-gray-600 hover:bg-gray-50'
          }`}
        >
          <CreditCard className="w-4 h-4" />
          <span>जमा रसीदें ({payments.length})</span>
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
                ? 'बिल नंबर या ग्राहक का नाम खोजें...'
                : activeTab === 'buyers'
                ? 'ग्राहक का नाम या मोबाइल नंबर खोजें...'
                : 'जमा रसीद खोजें...'
            }
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-hidden focus:border-blue-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          {activeTab === 'buyers' ? (
            <button
              onClick={() => setOnlyWithDues(!onlyWithDues)}
              className={`px-3 py-2 rounded-xl text-xs font-bold border transition-colors flex items-center gap-1.5 ${
                onlyWithDues
                  ? 'bg-rose-50 border-rose-300 text-rose-700'
                  : 'bg-gray-50 border-gray-200 text-gray-600'
              }`}
            >
              <Filter className="w-3.5 h-3.5" />
              <span>सिर्फ बाकी वाले (Due only)</span>
            </button>
          ) : (
            <div className="flex items-center bg-gray-100 p-1 rounded-xl w-full sm:w-auto">
              <button
                onClick={() => setDateFilter('all')}
                className={`flex-1 sm:flex-none px-3 py-1 rounded-lg text-xs font-bold ${
                  dateFilter === 'all' ? 'bg-white text-gray-900 shadow-2xs' : 'text-gray-500'
                }`}
              >
                सभी
              </button>
              <button
                onClick={() => setDateFilter('today')}
                className={`flex-1 sm:flex-none px-3 py-1 rounded-lg text-xs font-bold ${
                  dateFilter === 'today' ? 'bg-white text-blue-700 shadow-2xs' : 'text-gray-500'
                }`}
              >
                आज के
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Content Rendering based on Tab */}
      {loading ? (
        <LoadingSpinner />
      ) : activeTab === 'sales' ? (
        /* TAB 1: SALES INVOICES */
        filteredSales.length === 0 ? (
          <EmptyState
            title="कोई बिक्री बिल नहीं मिला"
            description="सब्जी बिक्री दर्ज करने के लिए नया बिल बनाएं।"
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
                        {s.buyer?.name || 'ग्राहक'}
                      </span>
                      {s.paymentMode && (
                        <span className="text-[11px] font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded-md">
                          {s.paymentMode}
                        </span>
                      )}
                    </div>

                    {/* Vegetables line items */}
                    <div className="text-xs text-gray-600 mt-2 flex flex-wrap gap-1.5">
                      {s.items?.map((it: any, idx: number) => (
                        <span
                          key={idx}
                          className="bg-gray-50 border border-gray-100 px-2 py-0.5 rounded-md font-medium text-gray-800"
                        >
                          {it.vegetable?.nameHi || it.vegetable?.nameEn || 'सब्ज़ी'} {it.quantity} {it.unit} @ ₹{it.rate / 100}
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
                        <span className="text-xs font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded-sm">
                          बाकी: <CurrencyDisplay amount={balance} />
                        </span>
                      ) : (
                        <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-sm">
                          पूरा नकद जमा
                        </span>
                      )}
                    </div>

                    <button
                      onClick={(e) => shareBillWhatsApp(e, s)}
                      title="WhatsApp पर बिल भेजें"
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
        /* TAB 2: BUYERS / CUSTOMER KHATA */
        filteredBuyers.length === 0 ? (
          <EmptyState
            title="कोई ग्राहक नहीं मिला"
            description="नया ग्राहक जोड़ने के लिए नीचे क्लिक करें।"
            action={
              <button
                onClick={() => setBuyerModalOpen(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold"
              >
                + नया ग्राहक जोड़ें
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
                        <div className="text-xs text-gray-500 mt-0.5 flex flex-wrap gap-2">
                          {b.contactPerson && <span>व्यक्ति: {b.contactPerson}</span>}
                          {b.phone && <span>फोन: {b.phone}</span>}
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">
                          बाकी खाता (Due)
                        </span>
                        <div
                          className={`text-lg font-extrabold ${
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
                      <span>खाता</span>
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
            description="ग्राहकों से मिलने वाली बकाया वसूली यहां दिखेगी।"
            action={
              <button
                onClick={() => {
                  setSelectedBuyerForPayment(undefined);
                  setPaymentModalOpen(true);
                }}
                className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-semibold"
              >
                + रुपया जमा करें
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
                      {p.buyer?.name || 'ग्राहक'} से जमा
                    </h5>
                    <div className="text-xs text-gray-500 mt-0.5 flex items-center gap-2">
                      <span>{formatDate(p.date)}</span>
                      <span>•</span>
                      <span className="font-medium text-emerald-800 bg-emerald-50 px-1.5 py-0.2 rounded-sm">
                        {p.paymentMode || 'नकद'}
                      </span>
                      {p.account?.name && (
                        <span>({p.account.name})</span>
                      )}
                    </div>
                    {p.notes && <p className="text-xs text-gray-400 mt-0.5 italic">{p.notes}</p>}
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-base font-extrabold text-emerald-700">
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
