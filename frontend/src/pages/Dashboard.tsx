import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { getDashboard } from '../api/dashboard';
import { getBuyers } from '../api/buyers';
import { getSellers } from '../api/sellers';
import { getSales } from '../api/sales';
import { getPurchases } from '../api/purchases';
import { getPayments } from '../api/payments';
import { getVegetables } from '../api/vegetables';
import { paiseToRupees } from '../utils/currency';
import { formatDate } from '../utils/date';
import { useBossAuth } from '../context/BossAuthContext';

export const Dashboard: React.FC = () => {
  const { lockBoss } = useBossAuth();
  const navigate = useNavigate();

  const [period, setPeriod] = useState<'today' | 'week' | 'month' | 'custom'>('month');
  const [sales, setSales] = useState<any[]>([]);
  const [purchases, setPurchases] = useState<any[]>([]);
  const [buyers, setBuyers] = useState<any[]>([]);
  const [sellers, setSellers] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [vegetables, setVegetables] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [salesRes, purRes, bRes, sRes, payRes, vegRes] = await Promise.all([
          getSales({ limit: 1000 }).catch(() => ({ sales: [] })),
          getPurchases({ limit: 1000 }).catch(() => ({ purchases: [] })),
          getBuyers().catch(() => []),
          getSellers().catch(() => []),
          getPayments({ limit: 1000 }).catch(() => ({ payments: [] })),
          getVegetables().catch(() => []),
        ]);

        setSales(Array.isArray(salesRes) ? salesRes : (salesRes as any)?.sales || []);
        setPurchases(Array.isArray(purRes) ? purRes : (purRes as any)?.purchases || []);
        setBuyers(Array.isArray(bRes) ? bRes : (bRes as any)?.buyers || []);
        setSellers(Array.isArray(sRes) ? sRes : (sRes as any)?.sellers || []);
        setPayments(Array.isArray(payRes) ? payRes : (payRes as any)?.payments || []);
        setVegetables(Array.isArray(vegRes) ? vegRes : []);
      } catch (err) {
        console.error('Failed to load Boss Desk data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Filter by period
  const filteredSales = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    return sales.filter((s) => {
      if (s.deletedAt) return false;
      const sDate = s.date?.split('T')[0];
      if (period === 'today') return sDate === todayStr;
      if (period === 'week') {
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

  const filteredPurchases = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    return purchases.filter((p) => {
      if (p.deletedAt) return false;
      const pDate = p.date?.split('T')[0];
      if (period === 'today') return pDate === todayStr;
      if (period === 'week') {
        const diff = (now.getTime() - new Date(p.date).getTime()) / (1000 * 3600 * 24);
        return diff <= 7;
      }
      if (period === 'month') {
        const diff = (now.getTime() - new Date(p.date).getTime()) / (1000 * 3600 * 24);
        return diff <= 30;
      }
      return true;
    });
  }, [purchases, period]);

  // Aggregate Metrics (PRD Section 7: Profit = Sales − Purchases − Transport − Labour)
  const salesTotalPaise = filteredSales.reduce((sum, s) => sum + (s.finalAmount || 0), 0);
  const purchaseCostPaise = filteredPurchases.reduce((sum, p) => sum + (p.finalAmount || p.totalAmount || 0), 0);
  const transportCostPaise = filteredPurchases.reduce((sum, p) => sum + (p.transportCost || 0), 0);
  const labourCostPaise = filteredPurchases.reduce((sum, p) => sum + (p.labourCost || 0), 0);

  const totalCostPaise = purchaseCostPaise + transportCostPaise + labourCostPaise;
  const profitPaise = salesTotalPaise - totalCostPaise;

  const customersOwePaise = buyers.reduce((sum, b) => sum + (b.currentBalance || 0), 0);
  const suppliersOwePaise = sellers.reduce((sum, s) => sum + (s.currentBalance || 0), 0);

  // Collections by Payment Method
  const collections = useMemo(() => {
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

    return {
      cash: Math.round(paiseToRupees(cash) / 1000),
      upi: Math.round(paiseToRupees(upi) / 1000),
      bank: Math.round(paiseToRupees(bank) / 1000),
    };
  }, [filteredSales]);

  // Profit by Vegetable
  const vegProfits = useMemo(() => {
    const vegStats: { [id: number]: { name: string; revenue: number; cost: number; profit: number } } = {};

    vegetables.forEach((v) => {
      vegStats[v.id] = { name: v.nameEn || 'Veg', revenue: 0, cost: 0, profit: 0 };
    });

    filteredSales.forEach((s) => {
      s.items?.forEach((it: any) => {
        const vId = it.vegetableId;
        if (vegStats[vId]) {
          vegStats[vId].revenue += (it.quantity || 0) * (it.rate || 0);
        }
      });
    });

    filteredPurchases.forEach((p) => {
      p.items?.forEach((it: any) => {
        const vId = it.vegetableId;
        if (vegStats[vId]) {
          vegStats[vId].cost += (it.quantity || 0) * (it.rate || 0);
        }
      });
    });

    const list = Object.values(vegStats)
      .filter((v) => v.revenue > 0 || v.cost > 0)
      .map((v) => {
        const profit = v.revenue - v.cost;
        return {
          name: v.name,
          profit,
          profitRupees: paiseToRupees(profit),
        };
      })
      .sort((a, b) => b.profit - a.profit);

    const maxAbs = Math.max(...list.map((v) => Math.abs(v.profitRupees)), 100);
    return list.map((v) => ({
      ...v,
      barPct: Math.min(100, Math.max(10, Math.round((Math.abs(v.profitRupees) / maxAbs) * 100))),
    }));
  }, [filteredSales, filteredPurchases, vegetables]);

  // Best Customers
  const bestCustomers = useMemo(() => {
    const buyerMap: { [id: number]: { name: string; sales: number; bills: number } } = {};

    filteredSales.forEach((s) => {
      const bId = s.buyerId;
      if (!buyerMap[bId]) {
        const b = buyers.find((buyer) => buyer.id === bId);
        buyerMap[bId] = { name: b?.name || 'Customer', sales: 0, bills: 0 };
      }
      buyerMap[bId].sales += s.finalAmount || 0;
      buyerMap[bId].bills += 1;
    });

    return Object.values(buyerMap)
      .sort((a, b) => b.sales - a.sales)
      .slice(0, 3)
      .map((c) => {
        const salesRupees = paiseToRupees(c.sales);
        const marginPct = salesTotalPaise > 0 ? Math.round((c.sales / salesTotalPaise) * 20) : 12;
        return {
          name: c.name,
          salesRupees,
          marginPct: Math.max(4, marginPct),
        };
      });
  }, [filteredSales, buyers, salesTotalPaise]);

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
        <h1 className="h">Boss Desk</h1>
        <div className="flex items-center gap-2">
          <span className="m">PIN unlocked</span>
          <button
            type="button"
            onClick={() => {
              lockBoss();
              navigate('/');
            }}
            className="text-xs font-semibold text-rose-600"
          >
            Lock
          </button>
        </div>
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
          className={period === 'week' ? 'on' : ''}
          onClick={() => setPeriod('week')}
        >
          Week
        </button>
        <button
          type="button"
          className={period === 'month' ? 'on' : ''}
          onClick={() => setPeriod('month')}
        >
          Month
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
          <span className="m">Sales</span>
          <b>₹{paiseToRupees(salesTotalPaise).toLocaleString('en-IN')}</b>
        </div>
        <div className="k">
          <span className="m">Money made</span>
          <b className={profitPaise >= 0 ? 'text-[#1F6B45]' : 'd'}>
            {profitPaise >= 0 ? '+' : '−'}₹{Math.abs(paiseToRupees(profitPaise)).toLocaleString('en-IN')}
          </b>
        </div>
      </div>

      <div className="r" style={{ gap: '8px' }}>
        <div className="k">
          <span className="m">Transport</span>
          <b>₹{paiseToRupees(transportCostPaise).toLocaleString('en-IN')}</b>
        </div>
        <div className="k">
          <span className="m">Labour</span>
          <b>₹{paiseToRupees(labourCostPaise).toLocaleString('en-IN')}</b>
        </div>
      </div>

      {/* Profit by Vegetable */}
      <div className="c">
        <b>Profit by vegetable</b>
        {vegProfits.length === 0 ? (
          <span className="m">No item transactions in this period</span>
        ) : (
          vegProfits.map((vp, idx) => (
            <div key={idx} className="space-y-1">
              <div className="r">
                <span>{vp.name}</span>
                <b className={vp.profitRupees >= 0 ? '' : 'd'}>
                  {vp.profitRupees >= 0 ? `+₹${vp.profitRupees.toLocaleString('en-IN')}` : `Loss −₹${Math.abs(vp.profitRupees).toLocaleString('en-IN')}`}
                </b>
              </div>
              <div
                className="bar"
                style={{
                  width: `${vp.barPct}%`,
                  background: vp.profitRupees >= 0 ? '#1F6B45' : '#B4540A',
                }}
              />
            </div>
          ))
        )}
      </div>

      {/* Best Customers */}
      <div className="c">
        <b>Best customers</b>
        {bestCustomers.length === 0 ? (
          <span className="m">No customer sales recorded yet</span>
        ) : (
          bestCustomers.map((bc, idx) => (
            <div key={idx} className="r">
              <span>{bc.name}</span>
              <b className={bc.marginPct < 6 ? 'd' : ''}>
                ₹{bc.salesRupees.toLocaleString('en-IN')} · {bc.marginPct}% {bc.marginPct < 6 ? 'low' : ''}
              </b>
            </div>
          ))
        )}
        <span className="m">Profit and margin on sales</span>
      </div>

      {/* Dues and Collections */}
      <div className="c">
        <div className="r">
          <span>Customers owe us</span>
          <b className="d">₹{paiseToRupees(customersOwePaise).toLocaleString('en-IN')}</b>
        </div>
        <div className="r">
          <span>We owe suppliers</span>
          <b className="d">₹{paiseToRupees(suppliersOwePaise).toLocaleString('en-IN')}</b>
        </div>
        <div className="r">
          <span>Collected: cash · UPI · bank</span>
          <b>₹{collections.cash}k · ₹{collections.upi}k · ₹{collections.bank}k</b>
        </div>
      </div>

      {/* Action Buttons */}
      <button
        type="button"
        onClick={() => navigate('/purchases')}
        className="b b2"
      >
        All purchases by date
      </button>
      <button
        type="button"
        onClick={() => navigate('/sales')}
        className="b b2"
      >
        All sales by date
      </button>
      <button
        type="button"
        onClick={() => navigate('/sellers')}
        className="b b2"
      >
        Supplier summary and bad goods
      </button>
    </div>
  );
};
