import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { getBuyers, createBuyer } from '../../api/buyers';
import { getSales } from '../../api/sales';
import { getPayments, createPayment } from '../../api/payments';
import { getVegetables } from '../../api/vegetables';
import { Buyer, Sale, Vegetable } from '../../utils/types';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { BuyerModal } from './BuyerModal';
import { PaymentModal } from '../payments/PaymentModal';
import { paiseToRupees } from '../../utils/currency';
import { formatDate } from '../../utils/date';
import {
  TrendingUp,
  Users,
  Search,
  Calendar,
  Filter,
  AlertCircle,
  Phone,
  MessageCircle,
  CheckCircle2,
  Clock,
  ChevronRight,
  Plus,
  ArrowUpRight,
  BarChart2,
  Carrot,
  Wallet,
  Sparkles,
  ShoppingBag
} from 'lucide-react';

export const BuyerList: React.FC = () => {
  const navigate = useNavigate();

  // Core Data
  const [buyers, setBuyers] = useState<Buyer[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [vegetables, setVegetables] = useState<Vegetable[]>([]);
  const [loading, setLoading] = useState(true);

  // Active Main Tab: 'dues' (Dues Tracker) | 'analysis' (Purchase Analysis) | 'customers' (All Customers & Filters)
  const [activeTab, setActiveTab] = useState<'dues' | 'analysis' | 'customers'>('dues');

  // KPI Time Range Filter: 'today' | '7days' | '14days' | 'month' | 'all'
  const [kpiPeriod, setKpiPeriod] = useState<'today' | '7days' | '14days' | 'month' | 'all'>('today');

  // Dues Tracker Aging Filter: 'all' | '7days' | '14days' | 'year'
  const [duesAgingFilter, setDuesAgingFilter] = useState<'all' | '7days' | '14days' | 'year'>('all');

  // Analysis Mode: 'by_customer' | 'by_product'
  const [analysisMode, setAnalysisMode] = useState<'by_customer' | 'by_product'>('by_customer');
  const [selectedCustomerIdForAnalysis, setSelectedCustomerIdForAnalysis] = useState<number | ''>('');
  const [selectedVegIdForAnalysis, setSelectedVegIdForAnalysis] = useState<number | ''>('');

  // Search & Filter State
  const [searchName, setSearchName] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [customerTypeFilter, setCustomerTypeFilter] = useState<'all' | 'regular' | 'occasional'>('all');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<'all' | 'paid' | 'unpaid' | 'partial'>('all');

  // Modals
  const [newBuyerModalOpen, setNewBuyerModalOpen] = useState(false);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [selectedBuyerForPayment, setSelectedBuyerForPayment] = useState<number | undefined>(undefined);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [buyersData, salesRes, paymentsRes, vegsData] = await Promise.all([
        getBuyers(),
        getSales({ limit: 1000 }),
        getPayments({ limit: 1000 }),
        getVegetables(),
      ]);

      setBuyers(Array.isArray(buyersData) ? buyersData : (buyersData as any)?.buyers || []);
      setSales(Array.isArray(salesRes) ? salesRes : (salesRes as any)?.sales || []);
      setPayments(Array.isArray(paymentsRes) ? paymentsRes : (paymentsRes as any)?.payments || []);
      setVegetables(Array.isArray(vegsData) ? vegsData : (vegsData as any)?.vegetables || []);
    } catch (err) {
      console.error('Failed to load accounts section data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Helper: Live Buyer Due
  const getDue = (b: any) =>
    (b.currentBalance !== undefined ? b.currentBalance : b.currentDue) || b.openingBalance || 0;

  // -------------------------------------------------------------
  // Customer Classification: Regular vs Occasional
  // Regular: 3+ purchases, or has made a purchase in last 5 days
  // Occasional: 1-2 purchases or inactive > 5 days
  // -------------------------------------------------------------
  const customerMeta = useMemo(() => {
    const metaMap: Record<number, {
      totalPurchases: number;
      lastPurchaseDate: string | null;
      daysSinceLastPurchase: number | null;
      isRegular: boolean;
      oldestUnpaidBillDate: string | null;
      daysOldestDue: number;
      latestBillPaid: boolean | null;
    }> = {};

    const now = new Date().getTime();

    buyers.forEach((b) => {
      const bSales = sales.filter((s) => s.buyerId === b.id);
      const purchaseCount = bSales.length;

      let lastDate: string | null = null;
      let oldestUnpaidDate: string | null = null;
      let latestPaid: boolean | null = null;

      if (bSales.length > 0) {
        // Sort sales descending
        const sorted = [...bSales].sort(
          (x, y) => new Date(y.date).getTime() - new Date(x.date).getTime()
        );
        lastDate = sorted[0].date;

        // Check latest bill status
        const latestItems = (sorted[0].items || []).reduce(
          (sum: number, it: any) => sum + (it.lineTotal || 0),
          0
        );
        const latestNet = Math.max(0, latestItems - (sorted[0].deductionAmount || 0));
        const latestReceived = sorted[0].receivedNow || 0;
        latestPaid = latestReceived >= latestNet;

        // Oldest unpaid bill
        const unpaidSales = sorted.filter((s) => {
          const itemsTot = (s.items || []).reduce(
            (sum: number, it: any) => sum + (it.lineTotal || 0),
            0
          );
          const net = Math.max(0, itemsTot - (s.deductionAmount || 0));
          return (s.receivedNow || 0) < net;
        });

        if (unpaidSales.length > 0) {
          oldestUnpaidDate = unpaidSales[unpaidSales.length - 1].date;
        }
      }

      const daysSinceLast = lastDate
        ? Math.floor((now - new Date(lastDate).getTime()) / (1000 * 60 * 60 * 24))
        : null;

      const daysOldest = oldestUnpaidDate
        ? Math.floor((now - new Date(oldestUnpaidDate).getTime()) / (1000 * 60 * 60 * 24))
        : daysSinceLast || 0;

      const isRegular = purchaseCount >= 3 || (daysSinceLast !== null && daysSinceLast <= 5);

      metaMap[b.id] = {
        totalPurchases: purchaseCount,
        lastPurchaseDate: lastDate,
        daysSinceLastPurchase: daysSinceLast,
        isRegular,
        oldestUnpaidBillDate: oldestUnpaidDate,
        daysOldestDue: daysOldest,
        latestBillPaid: latestPaid,
      };
    });

    return metaMap;
  }, [buyers, sales]);

  // -------------------------------------------------------------
  // Section 3: Key Dashboard Numbers (Filtered by KPI Period)
  // -------------------------------------------------------------
  const kpiMetrics = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    const isDateInKpiPeriod = (dateStr: string) => {
      if (kpiPeriod === 'all') return true;
      const d = new Date(dateStr);
      if (kpiPeriod === 'today') {
        return dateStr.startsWith(todayStr);
      }
      if (kpiPeriod === '7days') {
        const past7 = new Date();
        past7.setDate(now.getDate() - 7);
        return d >= past7 && d <= now;
      }
      if (kpiPeriod === '14days') {
        const past14 = new Date();
        past14.setDate(now.getDate() - 14);
        return d >= past14 && d <= now;
      }
      if (kpiPeriod === 'month') {
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      }
      return true;
    };

    const periodSales = sales.filter((s) => isDateInKpiPeriod(s.date));
    const totalSalesPeriod = periodSales.reduce((sum, s) => {
      const itemsSum = (s.items || []).reduce((acc: number, it: any) => acc + (it.lineTotal || 0), 0);
      return sum + Math.max(0, itemsSum - (s.deductionAmount || 0));
    }, 0);

    const periodPayments = payments.filter((p) => isDateInKpiPeriod(p.date) && (p.direction === 'IN' || p.direction === 'RECEIVED_FROM_BUYER'));
    const totalRevenuePeriod =
      periodSales.reduce((sum, s) => sum + (s.receivedNow || 0), 0) +
      periodPayments.reduce((sum, p) => sum + (p.amount || 0), 0);

    const totalPendingPeriod = Math.max(0, totalSalesPeriod - totalRevenuePeriod);

    // Overall market dues (across all time)
    const totalPendingOverall = buyers.reduce((sum, b) => sum + Math.max(0, getDue(b)), 0);

    return {
      totalSalesPeriod,
      totalRevenuePeriod,
      totalPendingPeriod,
      totalPendingOverall,
    };
  }, [sales, payments, buyers, kpiPeriod]);

  // -------------------------------------------------------------
  // Dues Tracker Debtors Pile-up (with aging filter)
  // -------------------------------------------------------------
  const debtors = useMemo(() => {
    const list = buyers
      .filter((b) => getDue(b) > 0)
      .map((b) => {
        const duePaise = getDue(b);
        const meta = customerMeta[b.id] || {
          daysOldestDue: 0,
          oldestUnpaidBillDate: null,
          isRegular: false,
        };
        return {
          buyer: b,
          duePaise,
          daysOld: meta.daysOldestDue,
          sinceDate: meta.oldestUnpaidBillDate || (b as any).createdAt || new Date().toISOString(),
          isRegular: meta.isRegular,
        };
      })
      .sort((a, b) => b.duePaise - a.duePaise); // highest due first

    if (duesAgingFilter === '7days') {
      return list.filter((item) => item.daysOld >= 7);
    }
    if (duesAgingFilter === '14days') {
      return list.filter((item) => item.daysOld >= 14);
    }
    if (duesAgingFilter === 'year') {
      return list.filter((item) => item.daysOld >= 365);
    }
    return list;
  }, [buyers, customerMeta, duesAgingFilter]);

  // -------------------------------------------------------------
  // Product & Customer Purchase Analysis Engine
  // -------------------------------------------------------------
  // View A: What products a specific customer buys & how much
  const customerPurchaseBreakdown = useMemo(() => {
    if (!selectedCustomerIdForAnalysis) return null;
    const bId = Number(selectedCustomerIdForAnalysis);
    const bSales = sales.filter((s) => s.buyerId === bId);

    const vegMap: Record<number, {
      vegetableId: number;
      nameHi: string;
      nameEn: string;
      unit: string;
      totalQty: number;
      totalSpend: number;
      purchaseCount: number;
    }> = {};

    let grandTotalSpend = 0;

    bSales.forEach((s) => {
      (s.items || []).forEach((it: any) => {
        const vId = it.vegetableId;
        const v = vegetables.find((veg) => veg.id === vId);
        const nameHi = v?.nameHi || 'सब्ज़ी';
        const nameEn = v?.nameEn || 'Vegetable';
        const unit = it.unit || v?.unit || 'kg';
        const lineTotal = it.lineTotal || 0;

        grandTotalSpend += lineTotal;

        if (!vegMap[vId]) {
          vegMap[vId] = {
            vegetableId: vId,
            nameHi,
            nameEn,
            unit,
            totalQty: 0,
            totalSpend: 0,
            purchaseCount: 0,
          };
        }
        vegMap[vId].totalQty += it.quantity || 0;
        vegMap[vId].totalSpend += lineTotal;
        vegMap[vId].purchaseCount += 1;
      });
    });

    const items = Object.values(vegMap).sort((a, b) => b.totalSpend - a.totalSpend);
    return { items, grandTotalSpend, billCount: bSales.length };
  }, [selectedCustomerIdForAnalysis, sales, vegetables]);

  // View B: Top Buyers for a specific product
  const topBuyersForProduct = useMemo(() => {
    if (!selectedVegIdForAnalysis) return [];
    const vId = Number(selectedVegIdForAnalysis);

    const buyerSpendMap: Record<number, {
      buyerId: number;
      buyerName: string;
      phone: string;
      shopName?: string;
      totalQty: number;
      totalSpend: number;
      lastDate: string;
      unit: string;
    }> = {};

    sales.forEach((s) => {
      (s.items || []).forEach((it: any) => {
        if (it.vegetableId === vId) {
          const bId = s.buyerId;
          const buyer = buyers.find((b) => b.id === bId);
          const bName = buyer?.name || s.buyer?.name || 'ग्राहक';

          if (!buyerSpendMap[bId]) {
            buyerSpendMap[bId] = {
              buyerId: bId,
              buyerName: bName,
              phone: buyer?.phone || '',
              shopName: buyer?.shopName || undefined,
              totalQty: 0,
              totalSpend: 0,
              lastDate: s.date,
              unit: it.unit || 'kg',
            };
          }

          buyerSpendMap[bId].totalQty += it.quantity || 0;
          buyerSpendMap[bId].totalSpend += it.lineTotal || 0;
          if (new Date(s.date) > new Date(buyerSpendMap[bId].lastDate)) {
            buyerSpendMap[bId].lastDate = s.date;
          }
        }
      });
    });

    return Object.values(buyerSpendMap).sort((a, b) => b.totalQty - a.totalQty);
  }, [selectedVegIdForAnalysis, sales, buyers]);

  // -------------------------------------------------------------
  // Filtered Customers List (with combined multi-filters)
  // -------------------------------------------------------------
  const filteredCustomers = useMemo(() => {
    return buyers.filter((b) => {
      // 1. Search Name / Phone / Shop
      if (searchName.trim()) {
        const q = searchName.toLowerCase();
        const mName = b.name.toLowerCase().includes(q);
        const mPhone = b.phone?.includes(q);
        const mContact = b.contactPerson?.toLowerCase().includes(q);
        const mShop = b.shopName?.toLowerCase().includes(q);
        if (!mName && !mPhone && !mContact && !mShop) return false;
      }

      // 2. Specific Date Filter (find bills created on this date)
      if (filterDate) {
        const bSalesOnDate = sales.filter(
          (s) => s.buyerId === b.id && s.date.startsWith(filterDate)
        );
        if (bSalesOnDate.length === 0) return false;
      }

      const meta = customerMeta[b.id] || { isRegular: false, latestBillPaid: null };
      const due = getDue(b);

      // 3. Customer Type Filter (Regular vs Occasional)
      if (customerTypeFilter === 'regular' && !meta.isRegular) return false;
      if (customerTypeFilter === 'occasional' && meta.isRegular) return false;

      // 4. Payment Status Filter
      if (paymentStatusFilter === 'paid' && due > 0) return false;
      if (paymentStatusFilter === 'unpaid' && (due <= 0 || meta.latestBillPaid === true)) return false;
      if (paymentStatusFilter === 'partial') {
        // Partially paid: has dues but totalReceived > 0
        const totalRec = (b.totalReceived || 0);
        if (due <= 0 || totalRec <= 0) return false;
      }

      return true;
    });
  }, [buyers, searchName, filterDate, customerTypeFilter, paymentStatusFilter, sales, customerMeta]);

  // WhatsApp Due Reminder
  const sendDueReminder = (buyer: Buyer, dueAmountPaise: number) => {
    const dueRupees = paiseToRupees(dueAmountPaise);
    const msg = `नमस्ते ${buyer.name} जी,\n\nहुसैन फूड्स (सब्जी मंडी) की तरफ से आपके खाते का पिछला बकाया हिसाब *₹${dueRupees.toLocaleString('en-IN')}* है।\nकृपया समय पर भुगतान करने का कष्ट करें।\n\nधन्यवाद,\nहुसैन फूड्स`;
    const cleanPhone = buyer.phone ? buyer.phone.replace(/[^0-9]/g, '') : '';
    const url = cleanPhone.length >= 10
      ? `https://wa.me/91${cleanPhone.slice(-10)}?text=${encodeURIComponent(msg)}`
      : `https://wa.me/?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
  };

  const handleCreateBuyer = async (data: any) => {
    await createBuyer(data);
    setNewBuyerModalOpen(false);
    fetchData();
  };

  const handleSavePayment = async (data: any) => {
    await createPayment(data);
    setPaymentModalOpen(false);
    fetchData();
  };

  return (
    <div className="max-w-4xl mx-auto bg-[#F6F4EC] min-h-screen text-[#1B2A1F] pb-28 font-sans">
      {/* ======================================================== */}
      {/* TOP DESK HEADER                                          */}
      {/* ======================================================== */}
      <div className="bg-linear-to-r from-blue-900 via-indigo-900 to-blue-950 text-white p-5 pt-6 rounded-b-3xl shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-200 text-xs font-bold mb-1 backdrop-blur-xs">
              <Sparkles className="w-3.5 h-3.5 text-blue-300" />
              <span>System 1 · खरीदार व खाता सेक्शन (Accounts & Insights)</span>
            </div>
            <h1 className="text-2xl font-black tracking-tight">ग्राहक खाता व बकाया वसूली</h1>
            <p className="text-xs text-blue-200/90 font-medium">Customer Insights, Dues Tracker & Purchase Analysis</p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setNewBuyerModalOpen(true)}
              className="py-2 px-3.5 bg-blue-600 hover:bg-blue-500 active:scale-95 text-white font-extrabold text-xs rounded-xl flex items-center gap-1.5 shadow-md transition-all"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>+ नया ग्राहक</span>
            </button>
            <button
              onClick={() => {
                setSelectedBuyerForPayment(undefined);
                setPaymentModalOpen(true);
              }}
              className="py-2 px-3.5 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-extrabold text-xs rounded-xl flex items-center gap-1.5 shadow-md transition-all"
            >
              <Wallet className="w-4 h-4" />
              <span>+ जमा लें</span>
            </button>
          </div>
        </div>

        {/* ======================================================== */}
        {/* SECTION 3: KEY DASHBOARD CARDS & TIME RANGE FILTER       */}
        {/* ======================================================== */}
        <div className="mt-5 pt-4 border-t border-blue-800/80">
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-xs font-extrabold text-blue-200 uppercase tracking-wider flex items-center gap-1.5">
              <BarChart2 className="w-3.5 h-3.5 text-blue-400" />
              <span>खाता स्थिति (Key Metrics)</span>
            </span>

            {/* Customizable Time Range Filter Chips */}
            <div className="flex items-center gap-1 bg-blue-950/70 p-1 rounded-xl border border-blue-800/60 overflow-x-auto text-[11px] font-bold">
              {[
                { id: 'today', label: 'आज' },
                { id: '7days', label: '7 दिन' },
                { id: '14days', label: '14 दिन' },
                { id: 'month', label: 'महीना' },
                { id: 'all', label: 'पूरा हिसाब' },
              ].map((p) => (
                <button
                  key={p.id}
                  onClick={() => setKpiPeriod(p.id as any)}
                  className={`px-2.5 py-1 rounded-lg transition-all ${
                    kpiPeriod === p.id
                      ? 'bg-blue-500 text-white font-black shadow-xs'
                      : 'text-blue-300 hover:text-white'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* 4 Responsive Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="bg-white/10 backdrop-blur-md border border-white/10 rounded-2xl p-3">
              <span className="text-[10.5px] font-semibold text-blue-200 uppercase tracking-wider block">
                {kpiPeriod === 'today' ? 'आज की बिक्री' : 'अवधि की बिक्री'}
              </span>
              <div className="text-xl font-black text-white mt-1">
                ₹{paiseToRupees(kpiMetrics.totalSalesPeriod).toLocaleString('en-IN')}
              </div>
              <span className="text-[10px] text-blue-300/80">Billed in period</span>
            </div>

            <div className="bg-white/10 backdrop-blur-md border border-white/10 rounded-2xl p-3">
              <span className="text-[10.5px] font-semibold text-emerald-200 uppercase tracking-wider block">
                {kpiPeriod === 'today' ? 'आज की वसूली' : 'अवधि की वसूली'}
              </span>
              <div className="text-xl font-black text-emerald-300 mt-1">
                ₹{paiseToRupees(kpiMetrics.totalRevenuePeriod).toLocaleString('en-IN')}
              </div>
              <span className="text-[10px] text-emerald-300/80">Collected revenue</span>
            </div>

            <div className="bg-white/10 backdrop-blur-md border border-white/10 rounded-2xl p-3">
              <span className="text-[10.5px] font-semibold text-amber-200 uppercase tracking-wider block">
                {kpiPeriod === 'today' ? 'आज का बाकी' : 'अवधि का बाकी'}
              </span>
              <div className="text-xl font-black text-amber-300 mt-1">
                ₹{paiseToRupees(kpiMetrics.totalPendingPeriod).toLocaleString('en-IN')}
              </div>
              <span className="text-[10px] text-amber-300/80">Unpaid in period</span>
            </div>

            <div className="bg-rose-500/20 backdrop-blur-md border border-rose-400/30 rounded-2xl p-3">
              <span className="text-[10.5px] font-black text-rose-200 uppercase tracking-wider block">
                बाजार कुल बकाया
              </span>
              <div className="text-xl font-black text-rose-300 mt-1">
                ₹{paiseToRupees(kpiMetrics.totalPendingOverall).toLocaleString('en-IN')}
              </div>
              <span className="text-[10px] text-rose-200/90 font-bold">Total pending overall</span>
            </div>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 3 CORE TABS NAVIGATION                                   */}
      {/* ======================================================== */}
      <div className="px-4 mt-4">
        <div className="bg-white p-1 rounded-2xl border border-[#E3DFD0] shadow-xs flex items-center gap-1">
          <button
            onClick={() => setActiveTab('dues')}
            className={`flex-1 py-2.5 px-3 rounded-xl font-extrabold text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-all ${
              activeTab === 'dues'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            <AlertCircle className="w-4 h-4" />
            <span>1. बकाया वसूली ({debtors.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('analysis')}
            className={`flex-1 py-2.5 px-3 rounded-xl font-extrabold text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-all ${
              activeTab === 'analysis'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            <ShoppingBag className="w-4 h-4" />
            <span>2. खरीद विश्लेषण</span>
          </button>

          <button
            onClick={() => setActiveTab('customers')}
            className={`flex-1 py-2.5 px-3 rounded-xl font-extrabold text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-all ${
              activeTab === 'customers'
                ? 'bg-[#1B2A1F] text-white shadow-xs'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>3. सभी ग्राहक ({filteredCustomers.length})</span>
          </button>
        </div>
      </div>

      {/* ======================================================== */}
      {/* TAB 1: DUES TRACKER (MONEY TO RECEIVE PILE-UP)           */}
      {/* ======================================================== */}
      {activeTab === 'dues' && (
        <div className="px-4 mt-4 space-y-3.5">
          {/* Aging Filter Ribbon */}
          <div className="bg-white border border-[#E3DFD0] rounded-2xl p-3.5 shadow-2xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div>
                <span className="text-xs font-black text-gray-900 block">बकाया कितने दिन पुराना है?</span>
                <span className="text-[11px] text-gray-500 font-medium">Filter unpaid dues by aging</span>
              </div>
              <div className="flex flex-wrap gap-1.5 text-xs font-bold">
                {[
                  { id: 'all', label: 'सभी बाकीदार' },
                  { id: '7days', label: '7+ दिन पुराना' },
                  { id: '14days', label: '14+ दिन पुराना' },
                  { id: 'year', label: '1 साल पुराना' },
                ].map((af) => (
                  <button
                    key={af.id}
                    onClick={() => setDuesAgingFilter(af.id as any)}
                    className={`px-3 py-1.5 rounded-xl transition-all border ${
                      duesAgingFilter === af.id
                        ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                        : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                    }`}
                  >
                    {af.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Debtors Pile-up List */}
          {debtors.length === 0 ? (
            <div className="bg-white border border-[#E3DFD0] rounded-2xl p-10 text-center">
              <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-2" />
              <h3 className="font-extrabold text-base text-gray-900">कोई पुराना बकाया नहीं है!</h3>
              <p className="text-xs text-gray-500 mt-1">चुने गए फ़िल्टर में सभी ग्राहकों का हिसाब चुकता है।</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {debtors.map(({ buyer, duePaise, daysOld, sinceDate, isRegular }) => (
                <div
                  key={buyer.id}
                  className="bg-white border-2 border-rose-100 hover:border-rose-300 rounded-2xl p-4 shadow-xs transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div
                    onClick={() => navigate(`/buyers/${buyer.id}`)}
                    className="flex-1 cursor-pointer"
                  >
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-black text-base text-gray-900">{buyer.name}</span>
                      {buyer.shopName && (
                        <span className="text-xs text-gray-500 font-semibold bg-gray-100 px-2 py-0.5 rounded-md">
                          {buyer.shopName}
                        </span>
                      )}
                      <span
                        className={`text-[10px] font-black px-2 py-0.5 rounded-md ${
                          isRegular
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {isRegular ? 'नियमित (Regular)' : 'कभी-कभार (Occasional)'}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-xs text-gray-500 mt-1.5 font-medium flex-wrap">
                      {buyer.phone && <span>फोन: {buyer.phone}</span>}
                      <span className="flex items-center gap-1 text-rose-700 font-bold bg-rose-50 px-2 py-0.5 rounded-md">
                        <Clock className="w-3.5 h-3.5" />
                        <span>
                          {daysOld > 0 ? `${daysOld} दिन से बाकी` : 'आज से बाकी'}
                          {sinceDate ? ` (${formatDate(sinceDate, 'd MMM yyyy')})` : ''}
                        </span>
                      </span>
                    </div>
                  </div>

                  {/* Amount & Actions */}
                  <div className="flex items-center justify-between sm:justify-end gap-3 border-t sm:border-t-0 pt-2.5 sm:pt-0 border-gray-100">
                    <div className="text-left sm:text-right">
                      <span className="text-[10px] uppercase font-extrabold text-gray-400 block tracking-wider">
                        कुल बाकी (Due)
                      </span>
                      <div className="text-xl font-black text-rose-600">
                        ₹{paiseToRupees(duePaise).toLocaleString('en-IN')}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => sendDueReminder(buyer, duePaise)}
                        title="WhatsApp पर बकाया याद दिलाएं"
                        className="p-2.5 bg-emerald-50 hover:bg-emerald-100 active:scale-95 text-emerald-700 rounded-xl border border-emerald-200 transition-all flex items-center gap-1 text-xs font-extrabold"
                      >
                        <MessageCircle className="w-4 h-4 fill-emerald-600 text-transparent" />
                        <span className="hidden sm:inline">WhatsApp</span>
                      </button>

                      <button
                        onClick={() => {
                          setSelectedBuyerForPayment(buyer.id);
                          setPaymentModalOpen(true);
                        }}
                        className="py-2.5 px-3 bg-[#1F6B3A] hover:bg-[#18552e] active:scale-95 text-white font-black text-xs rounded-xl shadow-xs transition-all flex items-center gap-1"
                      >
                        <ArrowUpRight className="w-4 h-4" />
                        <span>जमा लें</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 2: CUSTOMER PURCHASE ANALYSIS                        */}
      {/* ======================================================== */}
      {activeTab === 'analysis' && (
        <div className="px-4 mt-4 space-y-4">
          {/* Mode Switcher */}
          <div className="bg-white border border-[#E3DFD0] rounded-2xl p-2 flex gap-1.5 shadow-2xs">
            <button
              onClick={() => setAnalysisMode('by_customer')}
              className={`flex-1 py-2 px-3 rounded-xl font-black text-xs transition-all ${
                analysisMode === 'by_customer'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              1. ग्राहक अनुसार खरीद (Customer Breakdown)
            </button>
            <button
              onClick={() => setAnalysisMode('by_product')}
              className={`flex-1 py-2 px-3 rounded-xl font-black text-xs transition-all ${
                analysisMode === 'by_product'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              2. सब्ज़ी अनुसार टॉप खरीदार (Top Buyers by Product)
            </button>
          </div>

          {/* VIEW A: BY CUSTOMER */}
          {analysisMode === 'by_customer' && (
            <div className="space-y-3.5">
              <div className="bg-white border border-[#E3DFD0] rounded-2xl p-4 shadow-2xs">
                <label className="text-xs font-black text-gray-900 block mb-1">
                  ग्राहक चुनें (Select Customer to analyze):
                </label>
                <select
                  value={selectedCustomerIdForAnalysis}
                  onChange={(e) => setSelectedCustomerIdForAnalysis(e.target.value ? Number(e.target.value) : '')}
                  className="w-full min-h-[46px] bg-[#F6F4EC]/60 border border-[#BDB8A2] rounded-xl px-3 font-bold text-sm text-[#1B2A1F] focus:outline-hidden focus:bg-white"
                >
                  <option value="">-- ग्राहक चुनें / Choose Customer --</option>
                  {buyers.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} {b.shopName ? `(${b.shopName})` : ''} · {customerMeta[b.id]?.totalPurchases || 0} बिल
                    </option>
                  ))}
                </select>
              </div>

              {!selectedCustomerIdForAnalysis ? (
                <div className="bg-white border border-[#E3DFD0] rounded-2xl p-8 text-center text-gray-500 text-xs">
                  कृप्या ऊपर से ग्राहक चुनें ताकि आप देख सकें कि वह कौन-सी सब्ज़ी कितनी मात्रा में खरीदता है।
                </div>
              ) : !customerPurchaseBreakdown || customerPurchaseBreakdown.items.length === 0 ? (
                <div className="bg-white border border-[#E3DFD0] rounded-2xl p-8 text-center text-gray-500 text-xs">
                  इस ग्राहक के नाम पर अभी कोई सामान बिक्री दर्ज नहीं है।
                </div>
              ) : (
                <div className="bg-white border border-[#E3DFD0] rounded-2xl p-4 shadow-xs space-y-3">
                  <div className="flex justify-between items-center pb-3 border-b border-gray-100">
                    <div>
                      <h3 className="font-black text-base text-gray-900">
                        {buyers.find((b) => b.id === Number(selectedCustomerIdForAnalysis))?.name} का खरीद ब्योरा
                      </h3>
                      <span className="text-xs text-gray-500 font-semibold">
                        कुल {customerPurchaseBreakdown.billCount} बिलों का विश्लेषण
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] uppercase font-bold text-gray-400 block">कुल खरीदारी</span>
                      <span className="text-lg font-black text-[#1F6B3A]">
                        ₹{paiseToRupees(customerPurchaseBreakdown.grandTotalSpend).toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {customerPurchaseBreakdown.items.map((item) => {
                      const spendRupees = paiseToRupees(item.totalSpend);
                      const percent = customerPurchaseBreakdown.grandTotalSpend > 0
                        ? Math.round((item.totalSpend / customerPurchaseBreakdown.grandTotalSpend) * 100)
                        : 0;

                      return (
                        <div
                          key={item.vegetableId}
                          className="bg-gray-50/80 border border-gray-200/80 rounded-xl p-3 flex items-center justify-between gap-3"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-sm shrink-0">
                              🥬
                            </div>
                            <div>
                              <div className="font-extrabold text-sm text-gray-900">
                                {item.nameHi} <span className="text-xs font-semibold text-gray-500">({item.nameEn})</span>
                              </div>
                              <div className="text-xs text-gray-500 font-medium mt-0.5">
                                कुल मात्रा: <b className="text-gray-900">{item.totalQty} {item.unit}</b> ({item.purchaseCount} बार खरीदा)
                              </div>
                            </div>
                          </div>

                          <div className="text-right">
                            <div className="font-black text-base text-gray-900">
                              ₹{spendRupees.toLocaleString('en-IN')}
                            </div>
                            <span className="text-[11px] font-extrabold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">
                              {percent}% हिस्सा
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* VIEW B: BY PRODUCT (TOP BUYERS LEADERBOARD) */}
          {analysisMode === 'by_product' && (
            <div className="space-y-3.5">
              <div className="bg-white border border-[#E3DFD0] rounded-2xl p-4 shadow-2xs">
                <label className="text-xs font-black text-gray-900 block mb-1">
                  सब्ज़ी चुनें (Select Product to view Top Buyers):
                </label>
                <select
                  value={selectedVegIdForAnalysis}
                  onChange={(e) => setSelectedVegIdForAnalysis(e.target.value ? Number(e.target.value) : '')}
                  className="w-full min-h-[46px] bg-[#F6F4EC]/60 border border-[#BDB8A2] rounded-xl px-3 font-bold text-sm text-[#1B2A1F] focus:outline-hidden focus:bg-white"
                >
                  <option value="">-- सब्ज़ी चुनें / Choose Vegetable --</option>
                  {vegetables.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.nameHi} ({v.nameEn})
                    </option>
                  ))}
                </select>
              </div>

              {!selectedVegIdForAnalysis ? (
                <div className="bg-white border border-[#E3DFD0] rounded-2xl p-8 text-center text-gray-500 text-xs">
                  कृप्या ऊपर से कोई सब्ज़ी (जैसे टमाटर, आलू आदि) चुनें ताकि आप देख सकें कि उसके सबसे बड़े खरीदार कौन हैं।
                </div>
              ) : topBuyersForProduct.length === 0 ? (
                <div className="bg-white border border-[#E3DFD0] rounded-2xl p-8 text-center text-gray-500 text-xs">
                  इस सब्ज़ी के लिए अभी तक कोई बिक्री दर्ज नहीं हुई है।
                </div>
              ) : (
                <div className="bg-white border border-[#E3DFD0] rounded-2xl p-4 shadow-xs space-y-3">
                  <div className="flex justify-between items-center pb-2 border-b border-gray-100">
                    <div>
                      <h3 className="font-black text-base text-gray-900">
                        {vegetables.find((v) => v.id === Number(selectedVegIdForAnalysis))?.nameHi} के टॉप खरीदार
                      </h3>
                      <span className="text-xs text-gray-500">कुल मात्रा (kg) के आधार पर रैंकिंग</span>
                    </div>
                    <span className="text-xs font-extrabold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg">
                      {topBuyersForProduct.length} खरीदार
                    </span>
                  </div>

                  <div className="space-y-2">
                    {topBuyersForProduct.map((tb, idx) => (
                      <div
                        key={tb.buyerId}
                        onClick={() => navigate(`/buyers/${tb.buyerId}`)}
                        className="bg-gray-50/80 hover:bg-blue-50/40 border border-gray-200 rounded-xl p-3 flex items-center justify-between gap-3 cursor-pointer transition-all"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-xs shrink-0 ${
                              idx === 0
                                ? 'bg-amber-400 text-amber-950 shadow-xs'
                                : idx === 1
                                ? 'bg-slate-300 text-slate-800'
                                : idx === 2
                                ? 'bg-amber-600 text-white'
                                : 'bg-gray-200 text-gray-700'
                            }`}
                          >
                            #{idx + 1}
                          </div>

                          <div>
                            <div className="font-extrabold text-sm text-gray-900">
                              {tb.buyerName} {tb.shopName ? `· ${tb.shopName}` : ''}
                            </div>
                            <div className="text-xs text-gray-500 mt-0.5">
                              अंतिम खरीद: {formatDate(tb.lastDate, 'd MMM')}
                            </div>
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="font-black text-base text-gray-900">
                            {tb.totalQty} {tb.unit}
                          </div>
                          <div className="text-xs text-emerald-700 font-bold">
                            ₹{paiseToRupees(tb.totalSpend).toLocaleString('en-IN')}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 3: ALL CUSTOMERS & MULTI-DIMENSIONAL FILTERS         */}
      {/* ======================================================== */}
      {activeTab === 'customers' && (
        <div className="px-4 mt-4 space-y-3.5">
          {/* Advanced Filter Box */}
          <div className="bg-white border border-[#E3DFD0] rounded-2xl p-4 shadow-2xs space-y-3">
            {/* Search Input */}
            <div className="relative">
              <input
                type="text"
                value={searchName}
                onChange={(e) => setSearchName(e.target.value)}
                placeholder="ग्राहक नाम, फोन या दुकान खोजें / Search..."
                className="w-full min-h-[46px] bg-[#F6F4EC]/60 border border-[#BDB8A2] rounded-xl pl-10 pr-3.5 text-sm text-[#1B2A1F] focus:outline-hidden focus:bg-white"
              />
              <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-3.5" />
            </div>

            {/* Date Specific Filter & Customer Type Filter */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="text-[11px] font-bold text-gray-600 mb-1 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-gray-400" />
                  <span>बिल की तारीख (Specific Date):</span>
                </label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="date"
                    value={filterDate}
                    onChange={(e) => setFilterDate(e.target.value)}
                    className="w-full min-h-[40px] bg-white border border-[#BDB8A2] rounded-xl px-2.5 text-xs font-semibold text-[#1B2A1F] focus:outline-hidden"
                  />
                  {filterDate && (
                    <button
                      onClick={() => setFilterDate('')}
                      className="px-2 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg text-xs font-bold"
                    >
                      हटाएं
                    </button>
                  )}
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-gray-600 mb-1 block">
                  ग्राहक प्रकार (Customer Type):
                </label>
                <div className="flex gap-1.5">
                  {[
                    { id: 'all', label: 'सभी' },
                    { id: 'regular', label: 'नियमित' },
                    { id: 'occasional', label: 'कभी-कभार' },
                  ].map((ct) => (
                    <button
                      key={ct.id}
                      onClick={() => setCustomerTypeFilter(ct.id as any)}
                      className={`flex-1 py-1.5 px-2 rounded-xl text-xs font-bold border transition-all ${
                        customerTypeFilter === ct.id
                          ? 'bg-[#1B2A1F] text-white border-[#1B2A1F]'
                          : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      {ct.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Payment Status Filter */}
            <div>
              <label className="text-[11px] font-bold text-gray-600 mb-1 block">
                भुगतान स्थिति (Payment Status):
              </label>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { id: 'all', label: 'सभी ग्राहक' },
                  { id: 'paid', label: 'पूरा चुकता (Paid)' },
                  { id: 'unpaid', label: 'बाकी (Unpaid)' },
                  { id: 'partial', label: 'आधा बाकी (Partial)' },
                ].map((ps) => (
                  <button
                    key={ps.id}
                    onClick={() => setPaymentStatusFilter(ps.id as any)}
                    className={`py-1.5 px-3 rounded-xl text-xs font-bold border transition-all ${
                      paymentStatusFilter === ps.id
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    {ps.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Customer Cards List */}
          {loading ? (
            <div className="py-12 flex justify-center">
              <LoadingSpinner />
            </div>
          ) : filteredCustomers.length === 0 ? (
            <div className="bg-white border border-[#E3DFD0] rounded-2xl p-8 text-center text-gray-500 text-xs">
              चुने गए फ़िल्टर के अनुसार कोई ग्राहक नहीं मिला।
            </div>
          ) : (
            <div className="space-y-2.5">
              {filteredCustomers.map((buyer) => {
                const duePaise = getDue(buyer);
                const isDue = duePaise > 0;
                const meta = customerMeta[buyer.id] || {
                  isRegular: false,
                  daysSinceLastPurchase: null,
                  lastPurchaseDate: null,
                  latestBillPaid: null,
                };

                return (
                  <div
                    key={buyer.id}
                    onClick={() => navigate(`/buyers/${buyer.id}`)}
                    className="bg-white border border-[#E3DFD0] hover:border-blue-400 rounded-2xl p-4 shadow-2xs hover:shadow-sm cursor-pointer transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-extrabold text-base text-gray-900">{buyer.name}</span>
                        {buyer.shopName && (
                          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-md font-semibold">
                            {buyer.shopName}
                          </span>
                        )}
                        <span
                          className={`text-[10px] font-black px-2 py-0.5 rounded-md ${
                            meta.isRegular
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {meta.isRegular ? 'नियमित (Regular)' : 'कभी-कभार (Occasional)'}
                        </span>
                      </div>

                      <div className="text-xs text-gray-500 mt-1 flex flex-wrap gap-2.5 font-medium">
                        {buyer.phone && <span>फोन: {buyer.phone}</span>}
                        {meta.lastPurchaseDate ? (
                          <span>अंतिम बिल: {formatDate(meta.lastPurchaseDate, 'd MMM yyyy')}</span>
                        ) : (
                          <span>नया ग्राहक</span>
                        )}
                        {meta.latestBillPaid !== null && (
                          <span
                            className={`font-bold ${
                              meta.latestBillPaid ? 'text-emerald-700' : 'text-rose-600'
                            }`}
                          >
                            {meta.latestBillPaid ? '• पिछला बिल चुकता' : '• पिछला बिल बाकी'}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-3 border-t sm:border-t-0 pt-2 sm:pt-0 border-gray-100">
                      <div className="text-left sm:text-right">
                        <span className="text-[10px] font-bold text-gray-400 block uppercase tracking-wider">
                          खाता स्थिति
                        </span>
                        {isDue ? (
                          <div className="text-lg font-black text-rose-600">
                            ₹{paiseToRupees(duePaise).toLocaleString('en-IN')} बाकी
                          </div>
                        ) : (
                          <div className="text-lg font-black text-emerald-700">
                            पूरा चुकता (Paid)
                          </div>
                        )}
                      </div>

                      <ChevronRight className="w-5 h-5 text-gray-400" />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Floating Bottom Bar */}
      <div className="fixed bottom-0 left-0 right-0 p-3 bg-white/95 backdrop-blur-md border-t border-[#E3DFD0] flex gap-2.5 max-w-md mx-auto z-40 shadow-lg">
        <button
          onClick={() => {
            setSelectedBuyerForPayment(undefined);
            setPaymentModalOpen(true);
          }}
          className="flex-1 min-h-[46px] bg-white text-[#1F6B3A] border-2 border-[#1F6B3A] font-extrabold text-sm rounded-xl hover:bg-emerald-50 active:scale-95 flex items-center justify-center gap-1.5 transition-all"
        >
          <Wallet className="w-4 h-4" />
          <span>भुगतान जमा लें</span>
        </button>

        <button
          onClick={() => setNewBuyerModalOpen(true)}
          className="flex-1.2 min-h-[46px] bg-[#1F6B3A] hover:bg-[#18552e] active:scale-95 text-white font-black text-sm rounded-xl flex items-center justify-center gap-1.5 shadow-md transition-all"
        >
          <Plus className="w-5 h-5 stroke-[2.5]" />
          <span>+ नया ग्राहक जोड़ें</span>
        </button>
      </div>

      {/* Modals */}
      <BuyerModal
        isOpen={newBuyerModalOpen}
        onClose={() => setNewBuyerModalOpen(false)}
        onSave={handleCreateBuyer}
      />

      <PaymentModal
        isOpen={paymentModalOpen}
        onClose={() => setPaymentModalOpen(false)}
        onSave={handleSavePayment}
        defaultDirection="RECEIVED_FROM_BUYER"
        initialBuyerId={selectedBuyerForPayment}
      />
    </div>
  );
};
