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
    const itemsSum = sale.items?.reduce((s: number, it: any) => s + (it.lineTotal || 0), 0) || 0;
    const netTotal = Math.max(0, itemsSum - (sale.deductionAmount || 0));
    const previousDue = sale.previousDue || 0;
    const grandTotal = sale.grandTotal !== undefined ? sale.grandTotal : (netTotal + previousDue);
    const paidNow = sale.receivedNow || 0;
    const balanceDue = sale.balanceDue !== undefined ? sale.balanceDue : Math.max(0, grandTotal - paidNow);

    const itemsText = sale.items
      ?.map(
        (it: any) =>
          `• ${it.vegetable?.nameHi || it.vegetable?.nameEn || 'सामान'}: ${it.quantity} ${it.unit} @ ₹${(it.rate || 0).toLocaleString('en-IN')}/${it.unit} = ₹${(it.lineTotal || 0).toLocaleString('en-IN')}`
      )
      .join('\n');

    const cleanPhone = sale.buyer?.phone ? sale.buyer.phone.replace(/[^0-9]/g, '') : '';
    const msg = `*हुसैन फूड्स (सब्जी मंडी)*
बिक्री पर्ची #${sale.billNo || sale.id}
तारीख: ${formatDate(sale.date, 'dd/MM/yyyy')}
ग्राहक: ${sale.buyer?.name || 'Walk-in'} ${sale.buyer?.shopName ? `(${sale.buyer.shopName})` : ''}
----------------------------------
*सामान विवरण:*
${itemsText}
----------------------------------
*आज का माल (Today's Total):* ₹${netTotal.toLocaleString('en-IN')}
*पिछला बाकी (Previous Due):* ₹${previousDue.toLocaleString('en-IN')}
*कुल हिसाब (Grand Total):* ₹${grandTotal.toLocaleString('en-IN')}
*जमा (Paid Now):* ₹${paidNow.toLocaleString('en-IN')} (${sale.paymentMode || 'नकद'})
*बकाया (Balance Due):* ₹${balanceDue.toLocaleString('en-IN')}

_धन्यवाद! Hussain Foods_`;

    const url = cleanPhone.length >= 10
      ? `https://wa.me/91${cleanPhone.slice(-10)}?text=${encodeURIComponent(msg)}`
      : `https://wa.me/?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
  };

  if (loading) return <LoadingSpinner size="lg" />;
  if (!sale) return <div className="p-8 text-center text-gray-500">Sale not found</div>;

  const itemsSum = sale.items?.reduce((s: number, it: any) => s + (it.lineTotal || 0), 0) || 0;
  const netTotal = Math.max(0, itemsSum - (sale.deductionAmount || 0));
  const previousDue = sale.previousDue || 0;
  const grandTotal = sale.grandTotal !== undefined ? sale.grandTotal : (netTotal + previousDue);
  const paidNow = sale.receivedNow || 0;
  const balanceDue = sale.balanceDue !== undefined ? sale.balanceDue : Math.max(0, grandTotal - paidNow);

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
            <h1 className="text-xl font-bold text-gray-900">Sale Bill #{sale.billNo || sale.id}</h1>
            <p className="text-xs text-gray-500 mt-0.5">
              Issued on {formatDate(sale.date, 'dd MMMM yyyy')}
            </p>
          </div>
          <div className="text-right">
            <span className="text-xs text-gray-500 block">Buyer / Shop</span>
            <span className="font-bold text-gray-900 text-sm">{sale.buyer?.name} {sale.buyer?.shopName ? `(${sale.buyer.shopName})` : ''}</span>
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
                      {it.vegetable?.nameHi || it.vegetable?.nameEn} <span className="text-gray-400 font-normal">/ {it.vegetable?.nameEn}</span>
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

        {/* PRD 4.2 Formula Breakdown */}
        <div className="bg-gray-50/70 p-4 rounded-xl space-y-2 text-sm border border-gray-100">
          <div className="flex justify-between text-gray-600">
            <span>सामान कुल / Items Subtotal:</span>
            <CurrencyDisplay amount={itemsSum} className="font-medium" />
          </div>
          {sale.deductionAmount > 0 && (
            <div className="flex justify-between text-rose-600">
              <span>छूट / Deduction ({sale.deductionReason || 'कटौती'}):</span>
              <span>-<CurrencyDisplay amount={sale.deductionAmount} /></span>
            </div>
          )}
          <div className="flex justify-between text-sm font-bold text-gray-900 border-t border-gray-200 pt-2">
            <span>आज का माल / Today's Total:</span>
            <CurrencyDisplay amount={netTotal} />
          </div>
          <div className="flex justify-between text-sm text-amber-700 font-semibold">
            <span>पिछला बाकी / Previous Due:</span>
            <CurrencyDisplay amount={previousDue} />
          </div>
          <div className="flex justify-between text-base font-black text-gray-950 border-t border-gray-200 pt-2">
            <span>कुल हिसाब / Grand Total:</span>
            <CurrencyDisplay amount={grandTotal} />
          </div>
          {paidNow > 0 && (
            <div className="flex justify-between text-emerald-700 font-semibold">
              <span>जमा / Paid Now ({sale.paymentMode || 'नकद'}):</span>
              <CurrencyDisplay amount={paidNow} />
            </div>
          )}
          <div className="flex justify-between text-rose-600 font-black text-lg border-t-2 border-gray-300 pt-2">
            <span>बकाया / Balance Due:</span>
            <CurrencyDisplay amount={balanceDue} />
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
