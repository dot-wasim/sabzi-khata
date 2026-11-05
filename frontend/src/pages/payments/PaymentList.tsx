import React, { useState, useEffect } from 'react';
import { getPayments, createPayment, deletePayment } from '../../api/payments';
import { Payment } from '../../utils/types';
import { PageHeader } from '../../components/PageHeader';
import { CurrencyDisplay } from '../../components/CurrencyDisplay';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { EmptyState } from '../../components/EmptyState';
import { PaymentModal } from './PaymentModal';
import { formatDate } from '../../utils/date';
import { Plus, ArrowDownLeft, ArrowUpRight, Trash2, Calendar } from 'lucide-react';

export const PaymentList: React.FC = () => {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [filterDirection, setFilterDirection] = useState<'ALL' | 'PAID_TO_SELLER' | 'RECEIVED_FROM_BUYER'>('ALL');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [defaultDir, setDefaultDir] = useState<'PAID_TO_SELLER' | 'RECEIVED_FROM_BUYER'>('PAID_TO_SELLER');

  const fetchList = async () => {
    setLoading(true);
    try {
      const res = await getPayments({
        direction: filterDirection === 'ALL' ? undefined : filterDirection,
        from: fromDate || undefined,
        to: toDate || undefined,
      });
      setPayments(res.payments);
    } catch (err) {
      console.error('Failed to load payments:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchList();
  }, [filterDirection, fromDate, toDate]);

  const handleCreate = async (formData: any) => {
    await createPayment(formData);
    fetchList();
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this payment record?')) return;
    try {
      await deletePayment(id);
      fetchList();
    } catch (err) {
      alert('Failed to delete payment');
    }
  };

  const openModal = (dir: 'PAID_TO_SELLER' | 'RECEIVED_FROM_BUYER') => {
    setDefaultDir(dir);
    setModalOpen(true);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Payments (लेन-देन / भुगतान)"
        subtitle="Record of all cash and digital payments paid to sellers or received from buyers"
        actions={
          <div className="flex gap-2">
            <button
              onClick={() => openModal('PAID_TO_SELLER')}
              className="flex items-center gap-1.5 px-3 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold shadow-xs"
            >
              <ArrowUpRight className="w-4 h-4" />
              <span>Pay Seller (किसान को दिया)</span>
            </button>
            <button
              onClick={() => openModal('RECEIVED_FROM_BUYER')}
              className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-xs"
            >
              <ArrowDownLeft className="w-4 h-4" />
              <span>From Buyer (ग्राहक से मिला)</span>
            </button>
          </div>
        }
      />

      {/* Filters */}
      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="flex gap-2 w-full sm:w-auto">
          <button
            onClick={() => setFilterDirection('ALL')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
              filterDirection === 'ALL'
                ? 'bg-gray-900 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            All Transactions
          </button>
          <button
            onClick={() => setFilterDirection('PAID_TO_SELLER')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1 ${
              filterDirection === 'PAID_TO_SELLER'
                ? 'bg-rose-600 text-white'
                : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
            }`}
          >
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span>Paid to Sellers</span>
          </button>
          <button
            onClick={() => setFilterDirection('RECEIVED_FROM_BUYER')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1 ${
              filterDirection === 'RECEIVED_FROM_BUYER'
                ? 'bg-emerald-600 text-white'
                : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
            }`}
          >
            <ArrowDownLeft className="w-3.5 h-3.5" />
            <span>Received from Buyers</span>
          </button>
        </div>

        <div className="flex gap-2 w-full sm:w-auto">
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="px-3 py-1.5 border border-gray-200 rounded-xl text-xs"
          />
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="px-3 py-1.5 border border-gray-200 rounded-xl text-xs"
          />
        </div>
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : payments.length === 0 ? (
        <EmptyState
          title="No payments found"
          description="Record payments to keep seller and buyer ledgers in balance."
          action={
            <button
              onClick={() => openModal('PAID_TO_SELLER')}
              className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-medium"
            >
              Record First Payment
            </button>
          }
        />
      ) : (
        <div className="space-y-3">
          {payments.map((p) => {
            const isOut = p.direction === 'PAID_TO_SELLER';
            return (
              <div
                key={p.id}
                className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold ${
                      isOut ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'
                    }`}
                  >
                    {isOut ? <ArrowUpRight className="w-5 h-5" /> : <ArrowDownLeft className="w-5 h-5" />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold text-gray-900 text-sm">
                        {isOut ? p.seller?.name : p.buyer?.name}
                      </h4>
                      <span className="text-[11px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 font-medium">
                        {p.mode}
                      </span>
                    </div>
                    <div className="text-xs text-gray-400 mt-0.5 flex items-center gap-2">
                      <span>{formatDate(p.date)}</span>
                      {p.reference && <span>• Ref: {p.reference}</span>}
                      {p.notes && <span>• {p.notes}</span>}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className={`text-base font-bold ${isOut ? 'text-rose-700' : 'text-emerald-700'}`}>
                    {isOut ? '-' : '+'}<CurrencyDisplay amount={p.amount} />
                  </div>
                  <button
                    onClick={() => handleDelete(p.id)}
                    className="text-gray-300 hover:text-rose-600 p-1 rounded-md"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <PaymentModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        defaultDirection={defaultDir}
        onSave={handleCreate}
      />
    </div>
  );
};
