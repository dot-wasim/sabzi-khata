import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getPurchase, deletePurchase } from '../../api/purchases';
import { Purchase } from '../../utils/types';
import { PageHeader } from '../../components/PageHeader';
import { CurrencyDisplay } from '../../components/CurrencyDisplay';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { formatDate } from '../../utils/date';
import { useAuth } from '../../hooks/useAuth';
import {
  ArrowLeft,
  Edit2,
  Trash2,
  Calendar,
  User,
  Truck,
  Carrot,
  Printer
} from 'lucide-react';

export const PurchaseDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isOwner = user?.role === 'OWNER';

  const [purchase, setPurchase] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const purchaseId = parseInt(id || '0');

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      try {
        const p = await getPurchase(purchaseId);
        setPurchase(p);
      } catch (err) {
        console.error('Failed to load purchase:', err);
      } finally {
        setLoading(false);
      }
    };
    if (purchaseId) fetch();
  }, [purchaseId]);

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this purchase entry?')) return;
    try {
      await deletePurchase(purchaseId);
      navigate('/purchases');
    } catch (err) {
      alert('Failed to delete purchase');
    }
  };

  if (loading) return <LoadingSpinner size="lg" />;
  if (!purchase) return <div className="p-8 text-center text-gray-500">Purchase not found</div>;

  const itemsSum = purchase.items?.reduce((s: number, it: any) => s + it.lineTotal, 0) || 0;
  const grandTotal = itemsSum + (purchase.transport || 0) + (purchase.labour || 0) + (purchase.commission || 0);
  const balance = grandTotal - (purchase.paidNow || 0);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/purchases')}
          className="flex items-center gap-2 text-sm text-gray-600 hover:text-emerald-700 font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Purchases</span>
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 text-gray-700 rounded-xl text-xs font-semibold hover:bg-gray-50"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print</span>
          </button>
          <button
            onClick={() => navigate(`/purchases/${purchaseId}/edit`)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-xl text-xs font-semibold hover:bg-emerald-100"
          >
            <Edit2 className="w-3.5 h-3.5" />
            <span>Edit</span>
          </button>
          {isOwner && (
            <button
              onClick={handleDelete}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 text-rose-700 rounded-xl text-xs font-semibold hover:bg-rose-100"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete</span>
            </button>
          )}
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-xs space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 pb-4">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Purchase #{purchase.entryNo || purchase.id}</h1>
            <p className="text-xs text-gray-500 mt-0.5">
              Recorded on {formatDate(purchase.date, 'dd MMMM yyyy')}
            </p>
          </div>
          <div className="text-right">
            <span className="text-xs text-gray-500 block">Seller</span>
            <span className="font-bold text-gray-900 text-sm">{purchase.seller?.name}</span>
          </div>
        </div>

        {/* Veg Lines Table */}
        <div>
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
            Items Purchased
          </h3>
          <div className="border border-gray-100 rounded-xl overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500 uppercase font-semibold">
                <tr>
                  <th className="px-4 py-2.5">Vegetable</th>
                  <th className="px-4 py-2.5 text-right">Quantity</th>
                  <th className="px-4 py-2.5 text-right">Rate</th>
                  <th className="px-4 py-2.5 text-right">Line Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {purchase.items?.map((it: any, idx: number) => (
                  <tr key={idx}>
                    <td className="px-4 py-3 font-semibold text-gray-900">
                      {it.vegetable?.nameEn} <span className="text-gray-400 font-normal">/ {it.vegetable?.nameHi}</span>
                    </td>
                    <td className="px-4 py-3 text-right text-gray-700 font-medium">
                      {it.quantity} {it.unit}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-700 font-medium">
                      <CurrencyDisplay amount={it.rate} />/{it.unit}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-gray-900">
                      <CurrencyDisplay amount={it.lineTotal} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Extras & Totals Breakdown */}
        <div className="bg-gray-50/70 p-4 rounded-xl space-y-2 text-sm border border-gray-100">
          <div className="flex justify-between text-gray-600">
            <span>सब्जियां कुल (Items Subtotal):</span>
            <CurrencyDisplay amount={itemsSum} className="font-medium" />
          </div>
          {purchase.badGoodsTotal > 0 && (
            <div className="flex justify-between text-rose-600 font-medium">
              <span>खराब माल कटौती (Bad Goods Deductions):</span>
              <span>-<CurrencyDisplay amount={purchase.badGoodsTotal} /></span>
            </div>
          )}
          <div className="flex justify-between text-sm font-bold text-gray-900 border-t border-gray-200 pt-2">
            <span>देय माल रकम (Net Goods Payable):</span>
            <CurrencyDisplay amount={Math.max(0, itemsSum - (purchase.badGoodsTotal || 0))} />
          </div>
          {purchase.transport > 0 && (
            <div className="flex justify-between text-gray-600">
              <span>Transport (गाड़ी भाड़ा):</span>
              <CurrencyDisplay amount={purchase.transport} className="font-medium" />
            </div>
          )}
          {purchase.labour > 0 && (
            <div className="flex justify-between text-gray-600">
              <span>Labour (मजदूरी):</span>
              <CurrencyDisplay amount={purchase.labour} className="font-medium" />
            </div>
          )}
          {purchase.commission > 0 && (
            <div className="flex justify-between text-gray-600">
              <span>Commission:</span>
              <CurrencyDisplay amount={purchase.commission} className="font-medium" />
            </div>
          )}
          <div className="flex justify-between text-base font-bold text-gray-900 border-t border-gray-200 pt-2">
            <span>कुल खरीद लागत (Landed Cost):</span>
            <CurrencyDisplay amount={grandTotal} />
          </div>
          {purchase.paidNow > 0 && (
            <div className="flex justify-between text-emerald-700 font-semibold">
              <span>Paid Now ({purchase.paymentMode || 'Cash'}):</span>
              <CurrencyDisplay amount={purchase.paidNow} />
            </div>
          )}
          <div className="flex justify-between text-rose-700 font-bold border-t border-gray-200 pt-2">
            <span>Balance Due to Seller:</span>
            <CurrencyDisplay amount={balance} />
          </div>
        </div>

        {purchase.photoUrl && (
          <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
            <h4 className="text-xs font-bold text-gray-600 uppercase mb-2">सप्लायर रसीद फोटो (Slip Photo)</h4>
            <img src={purchase.photoUrl} alt="Slip" className="max-h-64 rounded-lg border border-gray-200" />
          </div>
        )}

        {purchase.notes && (
          <div className="text-xs text-gray-600 bg-amber-50/50 p-3 rounded-xl border border-amber-100">
            <span className="font-semibold text-gray-800">Notes:</span> {purchase.notes}
          </div>
        )}
      </div>
    </div>
  );
};
