import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { getPurchases } from '../../api/purchases';
import { getSellers } from '../../api/sellers';
import { getVegetables } from '../../api/vegetables';
import { paiseToRupees } from '../../utils/currency';
import { formatDate } from '../../utils/date';

export const PurchaseList: React.FC = () => {
  const navigate = useNavigate();

  const [period, setPeriod] = useState<'today' | '7days' | 'month' | 'custom'>('7days');
  const [purchases, setPurchases] = useState<any[]>([]);
  const [sellers, setSellers] = useState<any[]>([]);
  const [vegetables, setVegetables] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [purchasesRes, sellersRes, vegsRes] = await Promise.all([
          getPurchases({ limit: 1000 }).catch(() => ({ purchases: [] })),
          getSellers().catch(() => []),
          getVegetables().catch(() => []),
        ]);
        setPurchases(Array.isArray(purchasesRes) ? purchasesRes : (purchasesRes as any)?.purchases || []);
        setSellers((sellersRes as any).sellers || sellersRes || []);
        setVegetables(Array.isArray(vegsRes) ? vegsRes : []);
      } catch (err) {
        console.error('Failed to load Buy Dashboard data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const filteredPurchases = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    return purchases.filter((p) => {
      if (p.deletedAt) return false;
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
  }, [purchases, period]);

  const totalBoughtPaise = filteredPurchases.reduce((sum, p) => sum + (p.finalAmount || p.totalAmount || 0), 0);
  const totalPaidPaise = filteredPurchases.reduce((sum, p) => sum + (p.paidAmount || 0), 0);
  const totalTransportPaise = filteredPurchases.reduce((sum, p) => sum + (p.transportCost || 0), 0);
  const totalLabourPaise = filteredPurchases.reduce((sum, p) => sum + (p.labourCost || 0), 0);

  const totalOwedPaise = sellers.reduce(
    (sum, s) => sum + (s.currentBalance || 0),
    0
  );

  return (
    <div className="s">
      {/* Top Header */}
      <div className="r">
        <h1 className="h">Buy Dashboard</h1>
        <button
          type="button"
          onClick={() => navigate('/purchases/new')}
          className="text-xs font-bold text-[#1F6B45]"
        >
          + New Purchase
        </button>
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
          All
        </button>
      </div>

      {/* 2x2 Metric Grid */}
      <div className="r" style={{ gap: '8px' }}>
        <div className="k">
          <span className="m">Bought</span>
          <b>₹{paiseToRupees(totalBoughtPaise).toLocaleString('en-IN')}</b>
        </div>
        <div className="k">
          <span className="m">Paid</span>
          <b>₹{paiseToRupees(totalPaidPaise).toLocaleString('en-IN')}</b>
        </div>
      </div>

      <div className="r" style={{ gap: '8px' }}>
        <div className="k">
          <span className="m">Transport + Labour</span>
          <b>₹{paiseToRupees(totalTransportPaise + totalLabourPaise).toLocaleString('en-IN')}</b>
        </div>
        <div className="k">
          <span className="m">Still owe</span>
          <b className="d">₹{paiseToRupees(totalOwedPaise).toLocaleString('en-IN')}</b>
        </div>
      </div>

      {/* Day by Day Purchases */}
      <div className="c">
        <b>Recent purchases</b>
        {filteredPurchases.length === 0 ? (
          <span className="m">No purchases recorded in this period</span>
        ) : (
          filteredPurchases.slice(0, 8).map((p, idx) => {
            const seller = sellers.find((s) => s.id === p.sellerId);
            return (
              <div
                key={idx}
                onClick={() => navigate(`/purchases/${p.id}`)}
                className="cursor-pointer border-b border-[#DDE3D6] pb-2 last:border-0 last:pb-0"
              >
                <div className="r">
                  <b>{formatDate(p.date, 'd MMM')} · {seller?.name || 'Supplier'}</b>
                  <b>₹{paiseToRupees(p.finalAmount || p.totalAmount || 0).toLocaleString('en-IN')}</b>
                </div>
                <span className="m">
                  Paid ₹{paiseToRupees(p.paidAmount || 0).toLocaleString('en-IN')} · Transport/labour ₹{paiseToRupees((p.transportCost || 0) + (p.labourCost || 0)).toLocaleString('en-IN')}
                </span>
              </div>
            );
          })
        )}
      </div>

      {/* Action Button */}
      <button
        type="button"
        onClick={() => navigate('/purchases/new')}
        className="b"
      >
        + Record Purchase
      </button>
    </div>
  );
};
