import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getPurchases } from '../../api/purchases';
import { getSellers, createSeller } from '../../api/sellers';
import { getPayments, createPayment } from '../../api/payments';
import { Purchase, Seller, Payment } from '../../utils/types';
import { CurrencyDisplay } from '../../components/CurrencyDisplay';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { EmptyState } from '../../components/EmptyState';
import { formatDate } from '../../utils/date';
import { SellerModal } from '../sellers/SellerModal';
import { PaymentModal } from '../payments/PaymentModal';
import {
  Plus,
  ShoppingCart,
  Calendar,
  Users,
  Search,
  MessageCircle,
  ArrowUpRight,
  UserPlus,
  CreditCard,
  ChevronRight,
  Filter,
  CheckCircle2,
  Clock,
  MapPin,
  TrendingUp
} from 'lucide-react';

export const PurchaseList: React.FC = () => {
  const navigate = useNavigate();

  // Active view tab: 'purchases' | 'sellers' | 'payouts'
  const [activeTab, setActiveTab] = useState<'purchases' | 'sellers' | 'payouts'>('purchases');

  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [payouts, setPayouts] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);

  // Search & Period Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [onlyWithDues, setOnlyWithDues] = useState(false);
  const [periodFilter, setPeriodFilter] = useState<'today' | 'week' | 'month' | 'year' | 'all'>('today');

  // Modals
  const [sellerModalOpen, setSellerModalOpen] = useState(false);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [selectedSellerForPayment, setSelectedSellerForPayment] = useState<number | undefined>(undefined);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [pRes, sRes, payRes] = await Promise.all([
        getPurchases(),
        getSellers(),
        getPayments({ direction: 'PAID_TO_SELLER' }),
      ]);
      setPurchases(pRes.purchases || []);
      const sellersList = Array.isArray(sRes) ? sRes : (sRes as any)?.sellers || [];
      setSellers(sellersList);
      setPayouts(payRes.payments || []);
    } catch (err) {
      console.error('Failed to load seller interface data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Filter by Period Logic (Day, Week, Month, Year, All Time)
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

  // Compute Period Metrics
  const periodPurchases = purchases.filter((p) => filterByPeriod(p.date));
  const periodPurchasesTotal = periodPurchases.reduce((sum, p) => {
    const goods = (p.items || []).reduce((acc: number, it: any) => acc + (it.lineTotal || 0), 0);
    return sum + goods + (p.transport || 0) + (p.labour || 0);
  }, 0);

  const periodCashPaid =
    periodPurchases.reduce((sum, p) => sum + (p.paidNow || 0), 0) +
    payouts
      .filter((pay) => filterByPeriod(pay.date))
      .reduce((sum, pay) => sum + (pay.amount || 0), 0);

  const getSellerDue = (s: any) =>
    (s.currentBalance !== undefined ? s.currentBalance : s.currentDue) || s.openingBalance || 0;

  const totalFarmerPayables = sellers.reduce(
    (sum, s) => sum + getSellerDue(s),
    0
  );

  // Handlers for Modals
  const handleCreateSeller = async (data: any) => {
    await createSeller(data);
    setSellerModalOpen(false);
    fetchData();
  };

  const handleSavePayment = async (data: any) => {
    await createPayment(data);
    setPaymentModalOpen(false);
    fetchData();
  };

  // WhatsApp Actions
  const sharePurchaseWhatsApp = (e: React.MouseEvent, purchase: any) => {
    e.stopPropagation();
    const sellerName = purchase.seller?.name || 'किसान';
    const itemsList = (purchase.items || [])
      .map(
        (it: any) =>
          `• ${it.vegetable?.nameHi || it.vegetable?.nameEn || 'सब्ज़ी'}: ${it.quantity} ${it.unit} @ ₹${it.rate / 100} = ₹${Math.round(it.lineTotal / 100)}`
      )
      .join('\n');
    const goodsSum = purchase.items?.reduce((sum: number, it: any) => sum + it.lineTotal, 0) || 0;
    const balance = Math.max(0, goodsSum - (purchase.paidNow || 0));

    const message =
      `*हुसैन फूड्स (सब्जी मंडी)*\n` +
      `मंडी खरीद पर्ची #${purchase.id}\n` +
      `तारीख: ${formatDate(purchase.date)}\n` +
      `किसान/विक्रेता: ${sellerName} ${purchase.seller?.village ? `(${purchase.seller.village})` : ''}\n` +
      `--------------------------\n` +
      `${itemsList}\n` +
      `--------------------------\n` +
      `कुल माल: ₹${Math.round(goodsSum / 100).toLocaleString('en-IN')}\n` +
      `भुगतान (Paid): ₹${Math.round((purchase.paidNow || 0) / 100).toLocaleString('en-IN')}\n` +
      `बाकी देनदारी: ₹${Math.round(balance / 100).toLocaleString('en-IN')}\n\n` +
      `धन्यवाद!`;

    const phone = purchase.seller?.phone ? purchase.seller.phone.replace(/[^0-9]/g, '') : '';
    const url =
      phone.length >= 10
        ? `https://wa.me/91${phone.slice(-10)}?text=${encodeURIComponent(message)}`
        : `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  const sendSellerStatementWhatsApp = (e: React.MouseEvent, seller: any) => {
    e.stopPropagation();
    const dueRupees = Math.round(getSellerDue(seller) / 100);
    const message =
      `नमस्ते ${seller.name} जी,\n\n` +
      `हुसैन फूड्स (सब्जी मंडी) से आपका कुल हिसाब देनदारी *₹${dueRupees.toLocaleString('en-IN')}* दर्ज है।\n` +
      `धन्यवाद,\nहुसैन फूड्स`;

    const phone = seller.phone ? seller.phone.replace(/[^0-9]/g, '') : '';
    const url =
      phone.length >= 10
        ? `https://wa.me/91${phone.slice(-10)}?text=${encodeURIComponent(message)}`
        : `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  // Filtered Purchases
  const filteredPurchases = purchases.filter((p) => {
    if (!filterByPeriod(p.date)) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchSeller = p.seller?.name?.toLowerCase().includes(q) || p.seller?.village?.toLowerCase().includes(q);
      const matchId = String(p.id).includes(q);
      if (!matchSeller && !matchId) return false;
    }
    return true;
  });

  // Filtered Sellers
  const filteredSellers = sellers.filter((s) => {
    const due = getSellerDue(s);
    if (onlyWithDues && due <= 0) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = s.name?.toLowerCase().includes(q);
      const matchPhone = s.phone?.includes(q);
      const matchVillage = s.village?.toLowerCase().includes(q);
      if (!matchName && !matchPhone && !matchVillage) return false;
    }
    return true;
  });

  // Filtered Payouts
  const filteredPayouts = payouts.filter((pay) => {
    if (!filterByPeriod(pay.date)) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchSeller = pay.seller?.name?.toLowerCase().includes(q);
      if (!matchSeller) return false;
    }
    return true;
  });

  return (
    <div className="space-y-5 max-w-5xl mx-auto">
      {/* Top Banner / Identity Header */}
      <div className="bg-linear-to-r from-emerald-900 via-teal-900 to-emerald-950 rounded-3xl p-5 sm:p-6 text-white shadow-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-200 text-xs font-semibold mb-2 backdrop-blur-xs">
              <ShoppingCart className="w-3.5 h-3.5 text-emerald-300" />
              <span>System 2 · Buy Desk (मंडी खरीद व किसान खाता)</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              खरीद व किसान खाता <span className="text-base font-normal text-emerald-200">/ Buy Desk</span>
            </h1>
            <p className="text-xs sm:text-sm text-emerald-100/80 mt-1">
              मंडी आवक गाड़ियां, किसान लेजर, बकाया देनदारी और गाड़ी भाड़ा खर्च का पूरा हिसाब
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => navigate('/purchases/new')}
              className="flex items-center gap-2 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-white rounded-xl text-xs sm:text-sm font-extrabold shadow-md transition-all active:scale-95"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>+ नया खरीद बिल (+ New Buy)</span>
            </button>

            <button
              onClick={() => navigate('/vegetables')}
              className="flex items-center gap-1.5 px-3 py-2.5 bg-emerald-800/80 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold border border-emerald-400/30 transition-all shadow-xs"
            >
              <span>🥦 सब्जियां (+/-)</span>
            </button>

            <button
              onClick={() => setSellerModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold border border-white/15 transition-all"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>+ नया किसान</span>
            </button>

            <button
              onClick={() => {
                setSelectedSellerForPayment(undefined);
                setPaymentModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-3 py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold shadow-xs transition-all"
            >
              <ArrowUpRight className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>किसान भुगतान (- Payout)</span>
            </button>
          </div>
        </div>

        {/* Multi-Period Filter Bar */}
        <div className="mt-5 pt-4 border-t border-white/15 flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-emerald-200 mr-1">हिसाब अवधि:</span>
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
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                periodFilter === item.id
                  ? 'bg-white text-emerald-950 shadow-sm'
                  : 'bg-white/10 hover:bg-white/20 text-emerald-100'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* 3 Metrics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3.5 border border-white/10">
            <span className="text-[11px] font-semibold text-emerald-200 uppercase tracking-wider block">
              कुल खरीद ({periodFilter === 'today' ? 'आज' : periodFilter === 'week' ? 'इस हफ्ते' : periodFilter === 'month' ? 'इस महीने' : periodFilter === 'year' ? 'इस साल' : 'कुल'})
            </span>
            <div className="text-2xl font-extrabold text-white mt-1">
              <CurrencyDisplay amount={periodPurchasesTotal} />
            </div>
            <span className="text-[11px] text-emerald-200/80 mt-0.5 block">
              {periodPurchases.length} खरीद बिल / गाड़ियां
            </span>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3.5 border border-white/10">
            <span className="text-[11px] font-semibold text-rose-200 uppercase tracking-wider block">
              कुल भुगतान (Paid to Sellers)
            </span>
            <div className="text-2xl font-extrabold text-rose-300 mt-1">
              <CurrencyDisplay amount={periodCashPaid} />
            </div>
            <span className="text-[11px] text-rose-200/80 mt-0.5 block">
              खरीद बिल व बकाया भुगतान
            </span>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3.5 border border-white/10">
            <span className="text-[11px] font-semibold text-amber-200 uppercase tracking-wider block">
              किसानों को कुल देनदारी (Mandi Payables)
            </span>
            <div className="text-2xl font-extrabold text-amber-300 mt-1">
              <CurrencyDisplay amount={totalFarmerPayables} />
            </div>
            <span className="text-[11px] text-amber-200/80 mt-0.5 block">
              {sellers.filter((s) => getSellerDue(s) > 0).length} किसानों/व्यापारियों को देना बाकी
            </span>
          </div>
        </div>
      </div>

      {/* Main Activity Navigation Tabs */}
      <div className="bg-white p-1.5 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between gap-1 overflow-x-auto">
        <button
          onClick={() => setActiveTab('purchases')}
          className={`flex-1 min-w-[120px] py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all ${
            activeTab === 'purchases'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'text-gray-600 hover:bg-gray-50'
          }`}
        >
          <ShoppingCart className="w-4 h-4" />
          <span>मंडी खरीद ({purchases.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('sellers')}
          className={`flex-1 min-w-[140px] py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all ${
            activeTab === 'sellers'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'text-gray-600 hover:bg-gray-50'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>किसान लेजर व खाता ({sellers.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('payouts')}
          className={`flex-1 min-w-[120px] py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all ${
            activeTab === 'payouts'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'text-gray-600 hover:bg-gray-50'
          }`}
        >
          <CreditCard className="w-4 h-4" />
          <span>भुगतान रसीदें ({payouts.length})</span>
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
              activeTab === 'purchases'
                ? 'बिल नंबर, किसान का नाम या गांव खोजें...'
                : activeTab === 'sellers'
                ? 'किसान का नाम, गांव या मोबाइल खोजें...'
                : 'भुगतान रसीद खोजें...'
            }
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-hidden focus:border-emerald-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          {activeTab === 'sellers' ? (
            <button
              onClick={() => setOnlyWithDues(!onlyWithDues)}
              className={`px-3 py-2 rounded-xl text-xs font-bold border transition-colors flex items-center gap-1.5 ${
                onlyWithDues
                  ? 'bg-amber-50 border-amber-300 text-amber-800'
                  : 'bg-gray-50 border-gray-200 text-gray-600'
              }`}
            >
              <Filter className="w-3.5 h-3.5" />
              <span>सिर्फ देनदारी वाले (Due only)</span>
            </button>
          ) : null}
        </div>
      </div>

      {/* Content Rendering based on Tab */}
      {loading ? (
        <LoadingSpinner />
      ) : activeTab === 'purchases' ? (
        /* TAB 1: PURCHASES INVOICES */
        filteredPurchases.length === 0 ? (
          <EmptyState
            title="कोई खरीद बिल नहीं मिला"
            description="मंडी आवक दर्ज करने के लिए नया खरीद बिल बनाएं।"
            action={
              <button
                onClick={() => navigate('/purchases/new')}
                className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-semibold"
              >
                + नया खरीद बिल बनाएं
              </button>
            }
          />
        ) : (
          <div className="space-y-3">
            {filteredPurchases.map((p: any) => {
              const goodsSum = p.items?.reduce((sum: number, it: any) => sum + it.lineTotal, 0) || 0;
              const totalLanded = goodsSum + (p.transport || 0) + (p.labour || 0);
              const balance = Math.max(0, goodsSum - (p.paidNow || 0));

              return (
                <div
                  key={p.id}
                  onClick={() => navigate(`/purchases/${p.id}`)}
                  className="bg-white p-4 sm:p-5 rounded-2xl border border-gray-200 shadow-xs hover:border-emerald-300 hover:shadow-md transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-gray-900 text-sm">खरीद #{p.id}</span>
                      <span className="text-xs text-gray-500 flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>{formatDate(p.date)}</span>
                      </span>
                      <span className="text-xs font-extrabold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 flex items-center gap-1">
                        <span>{p.seller?.name || 'किसान'}</span>
                        {p.seller?.village && (
                          <span className="text-[10px] text-emerald-600 font-normal">({p.seller.village})</span>
                        )}
                      </span>
                      {p.paymentMode && (
                        <span className="text-[11px] font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded-md">
                          {p.paymentMode}
                        </span>
                      )}
                    </div>

                    {/* Vegetables line items & Transport */}
                    <div className="text-xs text-gray-600 mt-2 flex flex-wrap gap-1.5">
                      {p.items?.map((it: any, idx: number) => (
                        <span
                          key={idx}
                          className="bg-gray-50 border border-gray-100 px-2 py-0.5 rounded-md font-medium text-gray-800"
                        >
                          {it.vegetable?.nameHi || it.vegetable?.nameEn || 'सब्ज़ी'} {it.quantity} {it.unit} @ ₹{it.rate / 100}
                        </span>
                      ))}
                      {p.transport > 0 && (
                        <span className="bg-amber-50 text-amber-900 border border-amber-200 px-2 py-0.5 rounded-md font-bold">
                          भाड़ा: ₹{Math.round(p.transport / 100)}
                        </span>
                      )}
                      {p.labour > 0 && (
                        <span className="bg-blue-50 text-blue-900 border border-blue-200 px-2 py-0.5 rounded-md font-bold">
                          मजदूरी: ₹{Math.round(p.labour / 100)}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Financial amounts & WhatsApp CTA */}
                  <div className="flex items-center justify-between sm:justify-end gap-4 border-t sm:border-t-0 pt-2 sm:pt-0 border-gray-100">
                    <div className="text-left sm:text-right">
                      <div className="text-base font-extrabold text-gray-900">
                        <CurrencyDisplay amount={goodsSum} />
                      </div>
                      {balance > 0 ? (
                        <span className="text-xs font-bold text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded-sm">
                          बाकी देनदारी: <CurrencyDisplay amount={balance} />
                        </span>
                      ) : (
                        <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-sm">
                          पूरा भुगतान चुकता
                        </span>
                      )}
                    </div>

                    <button
                      onClick={(e) => sharePurchaseWhatsApp(e, p)}
                      title="WhatsApp पर खरीद पर्ची भेजें"
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
      ) : activeTab === 'sellers' ? (
        /* TAB 2: SELLERS / FARMER LEDGER */
        filteredSellers.length === 0 ? (
          <EmptyState
            title="कोई किसान या विक्रेता नहीं मिला"
            description="नया किसान जोड़ने के लिए नीचे क्लिक करें।"
            action={
              <button
                onClick={() => setSellerModalOpen(true)}
                className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-semibold"
              >
                + नया किसान जोड़ें
              </button>
            }
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {filteredSellers.map((s: any) => {
              const due = getSellerDue(s);
              const hasDue = due > 0;

              return (
                <div
                  key={s.id}
                  onClick={() => navigate(`/sellers/${s.id}`)}
                  className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs hover:border-emerald-300 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="font-extrabold text-gray-900 text-base leading-tight flex items-center gap-1.5">
                          <span>{s.name}</span>
                          {s.isOwnFarmer && (
                            <span className="text-[10px] font-extrabold px-1.5 py-0.2 rounded-sm bg-emerald-100 text-emerald-800">
                              खास किसान
                            </span>
                          )}
                        </h4>
                        <div className="text-xs text-gray-500 mt-1 flex flex-wrap gap-2">
                          {s.village && (
                            <span className="flex items-center gap-0.5">
                              <MapPin className="w-3 h-3 text-gray-400" />
                              <span>{s.village}</span>
                            </span>
                          )}
                          {s.phone && <span>फोन: {s.phone}</span>}
                          <span className="text-gray-400">({s.type})</span>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">
                          देना बाकी (Payable)
                        </span>
                        <div
                          className={`text-lg font-extrabold ${
                            hasDue ? 'text-amber-700' : 'text-emerald-600'
                          }`}
                        >
                          <CurrencyDisplay amount={due} />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Quick Action Buttons on Seller Card */}
                  <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedSellerForPayment(s.id);
                        setPaymentModalOpen(true);
                      }}
                      className="flex-1 py-1.5 px-2 bg-rose-50 hover:bg-rose-100 text-rose-800 rounded-xl text-xs font-bold border border-rose-200 transition-colors flex items-center justify-center gap-1"
                    >
                      <ArrowUpRight className="w-3.5 h-3.5" />
                      <span>- भुगतान दें</span>
                    </button>

                    {hasDue && (
                      <button
                        onClick={(e) => sendSellerStatementWhatsApp(e, s)}
                        className="flex-1 py-1.5 px-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-xl text-xs font-bold border border-emerald-200 transition-colors flex items-center justify-center gap-1"
                      >
                        <MessageCircle className="w-3.5 h-3.5 fill-emerald-600 text-transparent" />
                        <span>रसीद भेजें</span>
                      </button>
                    )}

                    <button
                      onClick={() => navigate(`/sellers/${s.id}`)}
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
        /* TAB 3: PAYOUT RECEIPTS TO FARMERS */
        filteredPayouts.length === 0 ? (
          <EmptyState
            title="कोई भुगतान रसीद नहीं मिली"
            description="किसानों को दिए गए नकद या बैंक भुगतान यहां दिखेंगे।"
            action={
              <button
                onClick={() => {
                  setSelectedSellerForPayment(undefined);
                  setPaymentModalOpen(true);
                }}
                className="px-4 py-2 bg-rose-600 text-white rounded-xl text-sm font-semibold"
              >
                - किसान भुगतान दर्ज करें
              </button>
            }
          />
        ) : (
          <div className="space-y-2.5">
            {filteredPayouts.map((pay: any) => (
              <div
                key={pay.id}
                className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-700 flex items-center justify-center font-bold">
                    <ArrowUpRight className="w-5 h-5 stroke-[2.5]" />
                  </div>
                  <div>
                    <h5 className="font-bold text-gray-900 text-sm">
                      {pay.seller?.name || 'किसान'} को भुगतान
                    </h5>
                    <div className="text-xs text-gray-500 mt-0.5 flex items-center gap-2">
                      <span>{formatDate(pay.date)}</span>
                      <span>•</span>
                      <span className="font-medium text-rose-800 bg-rose-50 px-1.5 py-0.2 rounded-sm">
                        {pay.paymentMode || 'नकद'}
                      </span>
                      {pay.account?.name && (
                        <span>({pay.account.name})</span>
                      )}
                    </div>
                    {pay.notes && <p className="text-xs text-gray-400 mt-0.5 italic">{pay.notes}</p>}
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-base font-extrabold text-rose-700">
                    - <CurrencyDisplay amount={pay.amount} />
                  </span>
                  <span className="text-[10px] text-gray-400 block">भुगतान रसीद</span>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* New Seller Modal */}
      <SellerModal
        isOpen={sellerModalOpen}
        onClose={() => setSellerModalOpen(false)}
        onSave={handleCreateSeller}
      />

      {/* Record Payout Modal */}
      <PaymentModal
        isOpen={paymentModalOpen}
        onClose={() => {
          setPaymentModalOpen(false);
          setSelectedSellerForPayment(undefined);
        }}
        onSave={handleSavePayment}
        defaultDirection="PAID_TO_SELLER"
        initialSellerId={selectedSellerForPayment}
      />
    </div>
  );
};
