import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSales } from '../../api/sales';
import { getBuyers } from '../../api/buyers';
import { Sale, Buyer } from '../../utils/types';
import { PageHeader } from '../../components/PageHeader';
import { CurrencyDisplay } from '../../components/CurrencyDisplay';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { EmptyState } from '../../components/EmptyState';
import { formatDate } from '../../utils/date';
import { Plus, TrendingUp, Calendar } from 'lucide-react';

export const SaleList: React.FC = () => {
  const navigate = useNavigate();

  const [sales, setSales] = useState<Sale[]>([]);
  const [buyers, setBuyers] = useState<Buyer[]>([]);
  const [selectedBuyer, setSelectedBuyer] = useState<string>('');
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');
  const [loading, setLoading] = useState(true);

  const fetchList = async () => {
    setLoading(true);
    try {
      const [sRes, bRes] = await Promise.all([
        getSales({
          buyerId: selectedBuyer ? Number(selectedBuyer) : undefined,
          from: fromDate || undefined,
          to: toDate || undefined,
        }),
        getBuyers(),
      ]);
      setSales(sRes.sales || []);
      const buyersList = Array.isArray(bRes) ? bRes : (bRes as any)?.buyers || [];
      setBuyers(buyersList);
    } catch (err) {
      console.error('Failed to load sales:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchList();
  }, [selectedBuyer, fromDate, toDate]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Sales (बिक्री रिकॉर्ड)"
        subtitle="Wholesale sales entries delivered to shopkeepers and buyers"
        actions={
          <button
            onClick={() => navigate('/sales/new')}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>New Sale (+ बिक्री दर्ज करें)</span>
          </button>
        }
      />

      {/* Filters */}
      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <label className="block text-[11px] font-semibold text-gray-500 uppercase mb-1">
            Filter by Buyer
          </label>
          <select
            value={selectedBuyer}
            onChange={(e) => setSelectedBuyer(e.target.value)}
            className="w-full px-3 py-1.5 border border-gray-200 rounded-xl text-sm focus:outline-hidden"
          >
            <option value="">All Buyers</option>
            {buyers.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        </div>

        <div className="flex gap-2">
          <div>
            <label className="block text-[11px] font-semibold text-gray-500 uppercase mb-1">
              From Date
            </label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="px-3 py-1.5 border border-gray-200 rounded-xl text-sm"
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-gray-500 uppercase mb-1">
              To Date
            </label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="px-3 py-1.5 border border-gray-200 rounded-xl text-sm"
            />
          </div>
        </div>
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : sales.length === 0 ? (
        <EmptyState
          title="No sales found"
          description="Record vegetable sales to start tracking revenue and buyer receivables."
          action={
            <button
              onClick={() => navigate('/sales/new')}
              className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium"
            >
              Add First Sale
            </button>
          }
        />
      ) : (
        <div className="space-y-3">
          {sales.map((s: any) => {
            const itemsSum = s.items?.reduce((sum: number, it: any) => sum + it.lineTotal, 0) || 0;
            const netTotal = itemsSum - (s.deductionAmount || 0);
            const balance = netTotal - (s.receivedNow || 0);

            return (
              <div
                key={s.id}
                onClick={() => navigate(`/sales/${s.id}`)}
                className="bg-white p-4 sm:p-5 rounded-2xl border border-gray-100 shadow-xs hover:border-blue-200 hover:shadow-md transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-gray-900 text-sm">Sale #{s.id}</span>
                    <span className="text-xs text-gray-500 flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>{formatDate(s.date)}</span>
                    </span>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">
                      {s.buyer?.name || 'Buyer'}
                    </span>
                  </div>

                  <div className="text-xs text-gray-600 mt-2 flex flex-wrap gap-1.5">
                    {s.items?.map((it: any, idx: number) => (
                      <span
                        key={idx}
                        className="bg-gray-100 px-2 py-0.5 rounded-md font-medium text-gray-700"
                      >
                        {it.vegetable?.nameEn} {it.quantity} {it.unit} @ ₹{it.rate / 100}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center border-t sm:border-t-0 pt-2 sm:pt-0 border-gray-50">
                  <div className="text-base font-extrabold text-gray-900">
                    <CurrencyDisplay amount={netTotal} />
                  </div>
                  {balance > 0 ? (
                    <span className="text-xs font-semibold text-amber-700">
                      Due: <CurrencyDisplay amount={balance} />
                    </span>
                  ) : (
                    <span className="text-xs font-semibold text-emerald-600">
                      Fully Received
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
