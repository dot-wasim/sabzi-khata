import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSales, settlePendingRate, getPendingRateVegetables } from '../../api/sales';
import { getBuyers } from '../../api/buyers';
import { getPayments } from '../../api/payments';
import { getVegetables } from '../../api/vegetables';
import { paiseToRupees, rupeesToPaise } from '../../utils/currency';
import { formatDate } from '../../utils/date';

export const SaleList: React.FC = () => {
  const navigate = useNavigate();

  const [period, setPeriod] = useState<'today' | '7days' | 'month' | 'custom'>('7days');
  const [sales, setSales] = useState<any[]>([]);
  const [buyers, setBuyers] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [vegetables, setVegetables] = useState<any[]>([]);
  const [pendingVegs, setPendingVegs] = useState<any[]>([]);
  const [settleModalOpen, setSettleModalOpen] = useState(false);
  const [settleRatesInput, setSettleRatesInput] = useState<{ [vegId: number]: string }>({});
  const [settling, setSettling] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const [salesRes, buyersRes, paymentsRes, vegsRes, pendingData] = await Promise.all([
        getSales({ limit: 1000 }).catch(() => ({ sales: [] })),
        getBuyers().catch(() => []),
        getPayments({ limit: 1000 }).catch(() => ({ payments: [] })),
        getVegetables().catch(() => []),
        getPendingRateVegetables().catch(() => []),
      ]);
      setSales(Array.isArray(salesRes) ? salesRes : (salesRes as any)?.sales || []);
      setBuyers(Array.isArray(buyersRes) ? buyersRes : []);
      setPayments(Array.isArray(paymentsRes) ? paymentsRes : (paymentsRes as any)?.payments || []);
      setVegetables(Array.isArray(vegsRes) ? vegsRes : []);
      setPendingVegs(pendingData || []);
    } catch (err) {
      console.error('Failed to load Sell Dashboard data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSettleVegetableRate = async (vegId: number) => {
    const rateRupees = parseFloat(settleRatesInput[vegId] || '0');
    if (!rateRupees || rateRupees <= 0) {
      alert('कृपया सही भाव दर्ज करें (Enter valid rate in ₹/kg)');
      return;
    }
    setSettling(true);
    try {
      const res = await settlePendingRate(vegId, rupeesToPaise(rateRupees));
      alert(`सफलतापूर्वक ${res.updatedBillsCount} बिलों में भाव ₹${rateRupees}/kg लागू कर दिया गया!`);
      await fetchData();
      // If no more pending vegs, close modal
      const remaining = await getPendingRateVegetables().catch(() => []);
      setPendingVegs(remaining || []);
      if (!remaining || remaining.length === 0) {
        setSettleModalOpen(false);
      }
    } catch (err: any) {
      alert(`त्रुटि: ${err.message || 'भाव अपडेट नहीं हो पाया'}`);
    } finally {
      setSettling(false);
    }
  };

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

      {/* 10:00 AM Mandi Pending Rates Settlement Banner */}
      {pendingVegs.length > 0 && (
        <div className="bg-amber-50 border-2 border-amber-400 rounded-xl p-3.5 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xl">⏳</span>
              <div>
                <b className="text-sm text-amber-950 font-bold block">
                  आज के मंडी भाव बाकी हैं (10:00 AM Settlement)
                </b>
                <span className="text-xs text-amber-900">
                  {pendingVegs.length} सब्ज़ियों के भाव आने बाकी हैं ({pendingVegs.reduce((acc, p) => acc + (p.billsCount || 1), 0)} बिल प्रभावित)
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setSettleModalOpen(true)}
              className="bg-[#B4540A] text-white text-xs font-bold px-3 py-2 rounded-lg shadow-xs hover:bg-amber-800 cursor-pointer flex items-center gap-1"
            >
              ⚡ भाव भरें
            </button>
          </div>
        </div>
      )}

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
          <span className="m">इस अवधि में कोई बिल नहीं बना</span>
        ) : (
          filteredSales.slice(0, 8).map((s) => {
            const buyer = buyers.find((b) => b.id === s.buyerId) || s.buyer;
            const bName = buyer?.name || 'Customer';
            const sTotal = s.finalAmount !== undefined ? s.finalAmount : (s.todayTotal !== undefined ? s.todayTotal : (s.totalAmount || 0));
            const sPaid = s.paidAmount !== undefined ? s.paidAmount : (s.receivedNow !== undefined ? s.receivedNow : (s.paid || 0));
            const hasPending = s.hasPendingRates || (s.items || []).some((it: any) => it.isRatePending);

            const itemsSummary = (s.items || [])
              .map((it: any) => {
                const veg = vegetables.find((v) => v.id === it.vegetableId);
                return `${veg?.nameHi || veg?.nameEn || 'सब्ज़ी'} ${it.quantity}kg`;
              })
              .join(', ');

            return (
              <div
                key={s.id}
                onClick={() => navigate(`/sales/${s.id}`)}
                className="border-b border-[#DDE3D6] pb-2 last:border-0 last:pb-0 cursor-pointer hover:bg-emerald-50/60 p-1.5 rounded-lg transition-colors"
              >
                <div className="r">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <b className="text-sm">Bill #{s.billNo || s.id}</b>
                      <span className="text-sm font-semibold">{bName}</span>
                    </div>
                    <span className="m text-xs">
                      {formatDate(s.date, 'd MMM, h:mm a')} · {itemsSummary || 'Produce'}
                    </span>
                  </div>

                  <div className="text-right">
                    {hasPending ? (
                      <span className="text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-300 px-2 py-0.5 rounded">
                        ⏳ भाव बाकी
                      </span>
                    ) : (
                      <b className="text-sm">₹{paiseToRupees(sTotal).toLocaleString('en-IN')}</b>
                    )}
                    <div className="text-[11px] text-[#1F6B45] font-semibold">
                      जमा: ₹{paiseToRupees(sPaid).toLocaleString('en-IN')}
                    </div>
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

      {/* Settle Rates Modal (10:00 AM Mandi Rate Settler) */}
      {settleModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-[#F6F7F2] border-2 border-[#1F6B45] rounded-2xl max-w-sm w-full p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#DDE3D6] pb-3">
              <div>
                <h2 className="text-base font-bold text-[#1B2A1F]">10:00 AM मंडी भाव तय करें</h2>
                <p className="text-xs text-gray-600">आज सुबह के बिलों में पेंडिंग भाव दर्ज करें</p>
              </div>
              <button
                type="button"
                onClick={() => setSettleModalOpen(false)}
                className="text-gray-500 hover:text-black font-bold text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 max-h-[60vh] overflow-y-auto">
              {pendingVegs.length === 0 ? (
                <div className="text-center py-4 text-xs text-gray-600">
                  ✓ आज की सभी सब्ज़ियों के भाव तय हो चुके हैं!
                </div>
              ) : (
                pendingVegs.map((pv) => {
                  const veg = pv.vegetable;
                  const currentInput = settleRatesInput[pv.vegetableId] || '';
                  return (
                    <div key={pv.vegetableId} className="bg-white border border-[#DDE3D6] rounded-xl p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <b className="text-sm text-[#1B2A1F] block">{veg?.nameEn} ({veg?.nameHi})</b>
                          <span className="text-[11px] text-gray-500">
                            कुल बिका: {pv.totalQuantity} {pv.unit} ({pv.billsCount} बिल)
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1 flex-1">
                          <span className="text-sm font-semibold">₹</span>
                          <input
                            type="number"
                            step="any"
                            placeholder="आज का भाव (Rate)"
                            value={currentInput}
                            onChange={(e) =>
                              setSettleRatesInput((prev) => ({
                                ...prev,
                                [pv.vegetableId]: e.target.value,
                              }))
                            }
                            className="w-full border border-[#DDE3D6] rounded-lg px-2.5 py-1.5 text-sm font-bold bg-[#F6F7F2] focus:bg-white"
                          />
                          <span className="text-xs text-gray-500">/kg</span>
                        </div>

                        <button
                          type="button"
                          disabled={settling}
                          onClick={() => handleSettleVegetableRate(pv.vegetableId)}
                          className="bg-[#1F6B45] hover:bg-[#165034] text-white text-xs font-bold px-3 py-2 rounded-lg cursor-pointer whitespace-nowrap shadow-xs"
                        >
                          {settling ? 'लागू हो रहा है...' : '✓ भाव लागू करें'}
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="border-t border-[#DDE3D6] pt-3">
              <button
                type="button"
                onClick={() => setSettleModalOpen(false)}
                className="w-full bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-2 rounded-xl text-xs cursor-pointer"
              >
                बंद करें (Close)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
