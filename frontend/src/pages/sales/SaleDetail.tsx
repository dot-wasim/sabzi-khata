import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getSale, deleteSale } from '../../api/sales';
import { Sale } from '../../utils/types';
import { PageHeader } from '../../components/PageHeader';
import { CurrencyDisplay } from '../../components/CurrencyDisplay';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { formatDate } from '../../utils/date';
import {
  ArrowLeft,
  Edit2,
  Trash2,
  Calendar,
  Building2,
  Carrot,
  Printer,
  Share2
} from 'lucide-react';

export const SaleDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [sale, setSale] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const saleId = parseInt(id || '0');

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      try {
        const s = await getSale(saleId);
        setSale(s);
      } catch (err) {
        console.error('Failed to load sale:', err);
      } finally {
        setLoading(false);
      }
    };
    if (saleId) fetch();
  }, [saleId]);

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this sale entry?')) return;
    try {
      await deleteSale(saleId);
      navigate('/sales');
    } catch (err) {
      alert('Failed to delete sale');
    }
  };

  const shareWhatsApp = () => {
    if (!sale) return;
    const itemsText = sale.items
      ?.map(
        (it: any) =>
          `• ${it.vegetable?.nameEn || 'Item'} (${it.quantity} ${it.unit} @ ₹${it.rate}/${it.unit}) = ₹${it.lineTotal}`
      )
      .join('\n');

    const msg = `*Hussain Foods - Vegetable Bill*
Bill No: #${sale.id}
Date: ${formatDate(sale.date, 'dd/MM/yyyy')}
Customer: ${sale.buyer?.name || 'Walk-in'}

*Items:*
${itemsText}

*Subtotal:* ₹${itemsSum}
${sale.deductionAmount > 0 ? `*Deduction:* -₹${sale.deductionAmount}\n` : ''}*Net Bill:* ₹${netTotal}
*Received:* ₹${sale.receivedNow || 0} (${sale.paymentMode || 'Cash'})
*Balance Due:* ₹${balance}

_Thank you for your business!_`;

    const url = `https://wa.me/?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
  };

  if (loading) return <LoadingSpinner size="lg" />;
  if (!sale) return <div className="p-8 text-center text-gray-500">Sale not found</div>;

  const itemsSum = sale.items?.reduce((s: number, it: any) => s + it.lineTotal, 0) || 0;
  const netTotal = itemsSum - (sale.deductionAmount || 0);
  const balance = netTotal - (sale.receivedNow || 0);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/sales')}
          className="flex items-center gap-2 text-sm text-gray-600 hover:text-emerald-700 font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Sales (बिक्री सूची)</span>
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={shareWhatsApp}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-xl text-xs font-semibold hover:bg-emerald-100"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>WhatsApp</span>
          </button>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 text-gray-700 rounded-xl text-xs font-semibold hover:bg-gray-50"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print</span>
          </button>
          <button
            onClick={() => navigate(`/sales/${saleId}/edit`)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-xl text-xs font-semibold hover:bg-blue-100"
          >
            <Edit2 className="w-3.5 h-3.5" />
            <span>Edit</span>
          </button>
          <button
            onClick={handleDelete}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 text-rose-700 rounded-xl text-xs font-semibold hover:bg-rose-100"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete</span>
          </button>
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-xs space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 pb-4">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Sale Bill #{sale.id}</h1>
            <p className="text-xs text-gray-500 mt-0.5">
              Issued on {formatDate(sale.date, 'dd MMMM yyyy')}
            </p>
          </div>
          <div className="text-right">
            <span className="text-xs text-gray-500 block">Buyer / Shop</span>
            <span className="font-bold text-gray-900 text-sm">{sale.buyer?.name}</span>
          </div>
        </div>

        {/* Veg Lines Table */}
        <div>
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
            Items Sold
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
                {sale.items?.map((it: any, idx: number) => (
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

        {/* Deductions & Totals Breakdown */}
        <div className="bg-gray-50/70 p-4 rounded-xl space-y-2 text-sm border border-gray-100">
          <div className="flex justify-between text-gray-600">
            <span>Items Subtotal:</span>
            <CurrencyDisplay amount={itemsSum} className="font-medium" />
          </div>
          {sale.deductionAmount > 0 && (
            <div className="flex justify-between text-rose-600">
              <span>Deductions ({sale.deductionReason || 'Returns'}):</span>
              <span>-<CurrencyDisplay amount={sale.deductionAmount} /></span>
            </div>
          )}
          <div className="flex justify-between text-base font-bold text-gray-900 border-t border-gray-200 pt-2">
            <span>Net Sale Total:</span>
            <CurrencyDisplay amount={netTotal} />
          </div>
          {sale.receivedNow > 0 && (
            <div className="flex justify-between text-emerald-700 font-semibold">
              <span>Received Now ({sale.paymentMode || 'Cash'}):</span>
              <CurrencyDisplay amount={sale.receivedNow} />
            </div>
          )}
          <div className="flex justify-between text-amber-700 font-bold border-t border-gray-200 pt-2">
            <span>Market Balance Due:</span>
            <CurrencyDisplay amount={balance} />
          </div>
        </div>

        {sale.notes && (
          <div className="text-xs text-gray-600 bg-blue-50/50 p-3 rounded-xl border border-blue-100">
            <span className="font-semibold text-gray-800">Notes:</span> {sale.notes}
          </div>
        )}
      </div>
    </div>
  );
};
