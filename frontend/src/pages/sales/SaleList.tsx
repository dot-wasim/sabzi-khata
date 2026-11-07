import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSales } from '../../api/sales';
import { getBuyers } from '../../api/buyers';
import { getPayments } from '../../api/payments';
import { getVegetables } from '../../api/vegetables';
import { paiseToRupees } from '../../utils/currency';
import { formatDate } from '../../utils/date';

export const SaleList: React.FC = () => {
  const navigate = useNavigate();

  const [period, setPeriod] = useState<'today' | '7days' | 'month' | 'custom'>('7days');
  const [sales, setSales] = useState<any[]>([]);
  const [buyers, setBuyers] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [vegetables, setVegetables] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const [salesRes, buyersRes, paymentsRes, vegsRes] = await Promise.all([
        getSales({ limit: 1000 }).catch(() => ({ sales: [] })),
        getBuyers().catch(() => []),
        getPayments({ limit: 1000 }).catch(() => ({ payments: [] })),
        getVegetables().catch(() => []),
      ]);
      setSales(Array.isArray(salesRes) ? salesRes : (salesRes as any)?.sales || []);
      setBuyers(Array.isArray(buyersRes) ? buyersRes : []);
      setPayments(Array.isArray(paymentsRes) ? paymentsRes : (paymentsRes as any)?.payments || []);
      setVegetables(Array.isArray(vegsRes) ? vegsRes : []);
    } catch (err) {
      console.error('Failed to load Sell Dashboard data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Filter sales & payments by selected period
  const filteredSales = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    return sales.filter((s) => {
      if (s.deletedAt) return false;
      const sDate = s.date?.split('T')[0];
      if (period === 'today') {
        return sDate === todayStr;
      }
      if (period === '7days') {
        const diff = (now.getTime() - new Date(s.date).getTime()) / (1000 * 3600 * 24);
        return diff <= 7;
      }
      if (period === 'month') {
        const diff = (now.getTime() - new Date(s.date).getTime()) / (1000 * 3600 * 24);
        return diff <= 30;
      }
      return true;
    });
  }, [sales, period]);

  const filteredPayments = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    return payments.filter((p) => {
      if (p.deletedAt || p.direction !== 'RECEIVED_FROM_BUYER') return false;
      const pDate = p.date?.split('T')[0];
      if (period === 'today') return pDate === todayStr;
      if (period === '7days') {
        const diff = (now.getTime() - new Date(p.date).getTime()) / (1000 * 3600 * 24);
        return diff <= 7;
      }
      if (period === 'month') {
        const diff = (now.getTime() - new Date(p.date).getTime()) / (1000 * 3600 * 24);
        return diff <= 30;
      }
      return true;
    });
  }, [payments, period]);

  // Aggregate Metrics
  const totalSoldPaise = filteredSales.reduce((sum, s) => {
    const val = s.finalAmount !== undefined ? s.finalAmount : (s.todayTotal !== undefined ? s.todayTotal : (s.totalAmount || 0));
    return sum + val;
  }, 0);

  const totalReceivedFromBillsPaise = filteredSales.reduce((sum, s) => {
    const val = s.paidAmount !== undefined ? s.paidAmount : (s.receivedNow !== undefined ? s.receivedNow : (s.paid || 0));
    return sum + val;
  }, 0);

  const directPaymentsPaise = filteredPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
  const totalReceivedPaise = totalReceivedFromBillsPaise + directPaymentsPaise;
  const newDuePaise = Math.max(0, totalSoldPaise - totalReceivedFromBillsPaise);

  const totalOutstandingDuePaise = buyers.reduce(
    (sum, b) => sum + (b.currentBalance || 0),
    0
  );

  // Group by Day (Day-by-Day analysis for last 7 days)
  const dayStats = useMemo(() => {
    const daysMap: { [dateStr: string]: { sales: number; count: number; received: number; dateObj: Date } } = {};
    for (let i = 0; i < 7; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const str = d.toISOString().split('T')[0];
      daysMap[str] = { sales: 0, count: 0, received: 0, dateObj: d };
    }

    sales.forEach((s) => {
      if (s.deletedAt || s.isVoid) return;
      const str = s.date?.split('T')[0];
      if (daysMap[str]) {
        const sTotal = s.finalAmount !== undefined ? s.finalAmount : (s.todayTotal !== undefined ? s.todayTotal : (s.totalAmount || 0));
        const sPaid = s.paidAmount !== undefined ? s.paidAmount : (s.receivedNow !== undefined ? s.receivedNow : (s.paid || 0));
        daysMap[str].sales += sTotal;
        daysMap[str].count += 1;
        daysMap[str].received += sPaid;
      }
    });

    payments.forEach((p) => {
      if (p.deletedAt || p.direction !== 'RECEIVED_FROM_BUYER') return;
      const str = p.date?.split('T')[0];
      if (daysMap[str]) {
        daysMap[str].received += p.amount || 0;
      }
    });

    return Object.entries(daysMap)
      .map(([dateKey, val]) => ({
        dateKey,
        dayNum: val.dateObj.getDate(),
        dateLabel: formatDate(val.dateObj.toISOString(), 'd MMM'),
        salesPaise: val.sales,
        count: val.count,
        receivedPaise: val.received,
        newDuePaise: Math.max(0, val.sales - val.received),
      }))
      .sort((a, b) => new Date(a.dateKey).getTime() - new Date(b.dateKey).getTime());
  }, [sales, payments]);

  // Max sales for bar scaling
  const maxDaySales = Math.max(...dayStats.map((d) => d.salesPaise), 1000);

  // Payment Mode Breakdown
  const paymentModeStats = useMemo(() => {
    let cash = 0;
    let upi = 0;
    let bank = 0;

    filteredSales.forEach((s) => {
      const amt = s.paidAmount || 0;
      if (s.paymentMethod === 'CASH') cash += amt;
      else if (s.paymentMethod === 'UPI') upi += amt;
      else if (s.paymentMethod === 'BANK' || s.paymentMethod === 'CHEQUE') bank += amt;
      else cash += amt;
    });

    filteredPayments.forEach((p) => {
      const amt = p.amount || 0;
      if (p.paymentMethod === 'CASH') cash += amt;
      else if (p.paymentMethod === 'UPI') upi += amt;
      else if (p.paymentMethod === 'BANK' || p.paymentMethod === 'CHEQUE') bank += amt;
      else cash += amt;
    });

    const max = Math.max(cash, upi, bank, 1);
    return {
      cash,
      upi,
      bank,
      cashPct: Math.round((cash / max) * 100),
      upiPct: Math.round((upi / max) * 100),
      bankPct: Math.round((bank / max) * 100),
    };
  }, [filteredSales, filteredPayments]);

  // Top Items Sold
  const topItems = useMemo(() => {
    const itemMap: { [vegId: number]: { kg: number; amount: number; vegName: string } } = {};

    filteredSales.forEach((s) => {
      s.items?.forEach((it: any) => {
        const vId = it.vegetableId;
        if (!itemMap[vId]) {
          const v = vegetables.find((veg) => veg.id === vId);
          itemMap[vId] = {
            kg: 0,
            amount: 0,
            vegName: v?.nameEn ? `${v.nameEn} (${v.nameHi || ''})` : 'Veg',
          };
        }
        itemMap[vId].kg += parseFloat(it.quantity) || 0;
        itemMap[vId].amount += ((parseFloat(it.quantity) || 0) * (it.rate || 0));
      });
    });

    return Object.values(itemMap)
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);
  }, [filteredSales, vegetables]);

  if (loading) {
    return (
      <div className="s flex items-center justify-center min-h-[60vh]">
        <span className="m font-semibold">लोड हो रहा है...</span>
      </div>
    );
  }

  return (
    <div className="s">
      {/* Top Header */}
      <div className="r">
        <h1 className="h">Sell Dashboard</h1>
      </div>

      {/* Tabs */}
      <div className="t">
        <button
          type="button"
          className={period === 'today' ? 'on' : ''}
          onClick={() => setPeriod('today')}
        >
          Today
        </button>
        <button
          type="button"
          className={period === '7days' ? 'on' : ''}
          onClick={() => setPeriod('7days')}
        >
          7 days
        </button>
        <button
          type="button"
          className={period === 'month' ? 'on' : ''}
          onClick={() => setPeriod('month')}
        >
          1 month
        </button>
        <button
          type="button"
          className={period === 'custom' ? 'on' : ''}
          onClick={() => setPeriod('custom')}
        >
          Custom
        </button>
      </div>

      {/* 2x2 Metric Grid */}
      <div className="r" style={{ gap: '8px' }}>
        <div className="k">
          <span className="m">Sold</span>
          <b>₹{paiseToRupees(totalSoldPaise).toLocaleString('en-IN')}</b>
        </div>
        <div className="k">
          <span className="m">Received</span>
          <b>₹{paiseToRupees(totalReceivedPaise).toLocaleString('en-IN')}</b>
        </div>
      </div>

      <div className="r" style={{ gap: '8px' }}>
        <div className="k">
          <span className="m">New due</span>
          <b>₹{paiseToRupees(newDuePaise).toLocaleString('en-IN')}</b>
        </div>
        <div className="k">
          <span className="m">Total due</span>
          <b className="d">₹{paiseToRupees(totalOutstandingDuePaise).toLocaleString('en-IN')}</b>
        </div>
      </div>

      {/* Sales Per Day Vertical Bar Chart */}
      <div className="c">
        <b>Sales per day</b>
        <div style={{ display: 'flex', gap: '6px', alignItems: 'flex-end', height: '140px', paddingTop: '10px' }}>
          {dayStats.map((ds, idx) => {
            const hPct = Math.max(8, Math.round((ds.salesPaise / maxDaySales) * 110));
            return (
              <div
                key={idx}
                style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'flex-end',
                  gap: '4px',
                  height: '100%',
                }}
              >
                <div
                  style={{
                    width: '70%',
                    height: `${hPct}px`,
                    background: '#1F6B45',
                    borderRadius: '4px 4px 0 0',
                    transition: 'height 0.3s ease',
                  }}
                  title={`₹${paiseToRupees(ds.salesPaise).toLocaleString('en-IN')}`}
                />
                <span className="m text-[10px]">{ds.dayNum}</span>
              </div>
            );
          })}
        </div>
        <span className="m">
          {dayStats.length > 0
            ? `${dayStats[0].dateLabel} to ${dayStats[dayStats.length - 1].dateLabel}`
            : 'Last 7 days sales trend'}
        </span>
      </div>

      {/* Day by Day List */}
      <div className="c">
        <b>Day by day</b>
        {[...dayStats].reverse().map((ds, idx) => (
          <div
            key={idx}
            style={{
              borderTop: idx > 0 ? '1px solid #DDE3D6' : 'none',
              paddingTop: idx > 0 ? '8px' : '0',
            }}
          >
            <div className="r">
              <b>{ds.dateLabel}</b>
              <b>₹{paiseToRupees(ds.salesPaise).toLocaleString('en-IN')}</b>
            </div>
            <span className="m">
              {ds.count} bills · received ₹{paiseToRupees(ds.receivedPaise).toLocaleString('en-IN')} · new due ₹{paiseToRupees(ds.newDuePaise).toLocaleString('en-IN')}
            </span>
          </div>
        ))}
      </div>

      {/* Money Received by Mode */}
      <div className="c">
        <b>Money received by mode</b>
        <div>
          <div className="r">
            <span>Cash</span>
            <b>₹{paiseToRupees(paymentModeStats.cash).toLocaleString('en-IN')}</b>
          </div>
          <div className="bar mt-1" style={{ width: `${paymentModeStats.cashPct}%` }} />
        </div>
        <div className="mt-2">
          <div className="r">
            <span>UPI</span>
            <b>₹{paiseToRupees(paymentModeStats.upi).toLocaleString('en-IN')}</b>
          </div>
          <div className="bar mt-1" style={{ width: `${paymentModeStats.upiPct}%` }} />
        </div>
        <div className="mt-2">
          <div className="r">
            <span>Bank</span>
            <b>₹{paiseToRupees(paymentModeStats.bank).toLocaleString('en-IN')}</b>
          </div>
          <div className="bar mt-1" style={{ width: `${paymentModeStats.bankPct}%` }} />
        </div>
      </div>

      {/* Top Items Sold */}
      <div className="c">
        <b>Top items sold</b>
        {topItems.length === 0 ? (
          <span className="m">No sales in this period</span>
        ) : (
          topItems.map((item, idx) => (
            <div key={idx} className="r">
              <span>{item.vegName} · {item.kg.toFixed(0)} kg</span>
              <b>₹{paiseToRupees(item.amount).toLocaleString('en-IN')}</b>
            </div>
          ))
        )}
      </div>

      {/* Recent Bills (हाल के बिल) */}
      <div className="c">
        <div className="r">
          <b>Recent Bills · हाल के बिल</b>
          <span className="m font-bold text-xs text-[#1F6B45]">
            {filteredSales.length} bill{filteredSales.length !== 1 ? 's' : ''}
          </span>
        </div>

        {filteredSales.length === 0 ? (
          <span className="m py-2 block text-center">इस अवधि में कोई बिल नहीं बना</span>
        ) : (
          filteredSales.slice(0, 10).map((s) => {
            const buyer = buyers.find((b) => b.id === s.buyerId) || s.buyer;
            const bName = buyer?.name || 'Customer';
            const sTotal = s.finalAmount !== undefined ? s.finalAmount : (s.todayTotal !== undefined ? s.todayTotal : (s.totalAmount || 0));
            const sPaid = s.paidAmount !== undefined ? s.paidAmount : (s.receivedNow !== undefined ? s.receivedNow : (s.paid || 0));

            const itemsSummary = (s.items || [])
              .map((it: any) => {
                const veg = vegetables.find((v) => v.id === it.vegetableId);
                const rateText = it.rate ? `@ ₹${paiseToRupees(it.rate)}` : '';
                return `${veg?.nameHi || veg?.nameEn || 'सब्ज़ी'} ${it.quantity}kg ${rateText}`.trim();
              })
              .join(', ');

            return (
              <div
                key={s.id}
                onClick={() => navigate(`/sales/${s.id}`)}
                className="border-b border-[#DDE3D6] pb-2 last:border-0 last:pb-0 cursor-pointer hover:bg-emerald-50/60 p-2 rounded-lg transition-colors"
              >
                <div className="r items-center">
                  <div className="flex-1 pr-2">
                    <div className="flex items-center gap-2">
                      <b className="text-sm">Bill #{s.billNo || s.id}</b>
                      <span className="text-sm font-semibold text-[#1B2A1F]">{bName}</span>
                    </div>
                    <span className="m text-xs block mt-0.5">
                      {formatDate(s.date, 'd MMM, h:mm a')} · {itemsSummary || 'Produce'}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="text-right">
                      <b className="text-sm block">₹{paiseToRupees(sTotal).toLocaleString('en-IN')}</b>
                      <div className="text-[11px] text-[#1F6B45] font-semibold">
                        जमा: ₹{paiseToRupees(sPaid).toLocaleString('en-IN')}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/sales/${s.id}`);
                      }}
                      className="bg-emerald-50 hover:bg-[#1F6B45] text-[#1F6B45] hover:text-white border border-[#1F6B45]/30 text-xs font-bold px-2.5 py-1.5 rounded-lg shadow-xs flex items-center gap-1 cursor-pointer transition-colors"
                      title="बिल एडिट करें / भाव भरें"
                    >
                      ✏️ Edit
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Quick Action Button */}
      <button
        type="button"
        onClick={() => navigate('/sales/new')}
        className="b"
      >
        + Create Daily Bill
      </button>
    </div>
  );
};
