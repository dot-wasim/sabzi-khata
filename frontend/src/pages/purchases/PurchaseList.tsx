import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getPurchases } from '../../api/purchases';
import { getSellers } from '../../api/sellers';
import { Purchase, Seller } from '../../utils/types';
import { PageHeader } from '../../components/PageHeader';
import { CurrencyDisplay } from '../../components/CurrencyDisplay';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { EmptyState } from '../../components/EmptyState';
import { formatDate } from '../../utils/date';
import { useAuth } from '../../hooks/useAuth';
import { Plus, ShoppingCart, Calendar, User, ChevronRight } from 'lucide-react';

export const PurchaseList: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isOwner = user?.role === 'OWNER';

  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [selectedSeller, setSelectedSeller] = useState<string>('');
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');
  const [loading, setLoading] = useState(true);

  const fetchList = async () => {
    setLoading(true);
    try {
      const [pRes, sRes] = await Promise.all([
        getPurchases({
          sellerId: selectedSeller ? Number(selectedSeller) : undefined,
          from: fromDate || undefined,
          to: toDate || undefined,
        }),
        isOwner ? getSellers() : Promise.resolve([]),
      ]);
      setPurchases(pRes.purchases || []);
      if (isOwner) {
        const sellersList = Array.isArray(sRes) ? sRes : (sRes as any)?.sellers || [];
        setSellers(sellersList);
      }
    } catch (err) {
      console.error('Failed to load purchases:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchList();
  }, [selectedSeller, fromDate, toDate]);

  return (
    <div className="space-y-6">
      <PageHeader
        title={isOwner ? "Purchases (खरीददारी)" : "Today's Purchases (आज की खरीद)"}
        subtitle={isOwner ? "History of all purchases from farmers and mandi traders" : "Your recorded purchases for today"}
        actions={
          <button
            onClick={() => navigate('/purchases/new')}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>New Purchase (+ खरीद दर्ज करें)</span>
          </button>
        }
      />

      {/* Owner Filters */}
      {isOwner && (
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <label className="block text-[11px] font-semibold text-gray-500 uppercase mb-1">
              Filter by Seller
            </label>
            <select
              value={selectedSeller}
              onChange={(e) => setSelectedSeller(e.target.value)}
              className="w-full px-3 py-1.5 border border-gray-200 rounded-xl text-sm focus:outline-hidden"
            >
              <option value="">All Sellers</option>
              {sellers.map((s) => (
                <option key={s.id} value={s.id}>{s.name} {s.village ? `(${s.village})` : ''}</option>
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
      )}

      {loading ? (
        <LoadingSpinner />
      ) : purchases.length === 0 ? (
        <EmptyState
          title="No purchases found"
          description={isOwner ? "No purchase entries match the selected filters." : "You have not recorded any purchases today."}
          action={
            <button
              onClick={() => navigate('/purchases/new')}
              className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-medium"
            >
              Add First Purchase
            </button>
          }
        />
      ) : (
        <div className="space-y-3">
          {purchases.map((p: any) => {
            const itemsSum = p.items?.reduce((s: number, it: any) => s + it.lineTotal, 0) || 0;
            const grandTotal = itemsSum + (p.transport || 0) + (p.labour || 0) + (p.commission || 0);
            const balance = grandTotal - (p.paidNow || 0);

            return (
              <div
                key={p.id}
                onClick={() => navigate(`/purchases/${p.id}`)}
                className="bg-white p-4 sm:p-5 rounded-2xl border border-gray-100 shadow-xs hover:border-emerald-200 hover:shadow-md transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-gray-900 text-sm">Purchase #{p.id}</span>
                    <span className="text-xs text-gray-500 flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>{formatDate(p.date)}</span>
                    </span>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">
                      {p.seller?.name || 'Seller'}
                    </span>
                  </div>

                  {/* Veg summary */}
                  <div className="text-xs text-gray-600 mt-2 flex flex-wrap gap-1.5">
                    {p.items?.map((it: any, idx: number) => (
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
                    <CurrencyDisplay amount={grandTotal} />
                  </div>
                  {balance > 0 ? (
                    <span className="text-xs font-semibold text-rose-600">
                      Due: <CurrencyDisplay amount={balance} />
                    </span>
                  ) : (
                    <span className="text-xs font-semibold text-emerald-600">
                      Paid in Full
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
