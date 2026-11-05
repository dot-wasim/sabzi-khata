import React, { useState, useEffect } from 'react';
import { Modal } from '../../components/Modal';
import { getSellers } from '../../api/sellers';
import { getBuyers } from '../../api/buyers';
import { Seller, Buyer } from '../../utils/types';
import { PAYMENT_MODES } from '../../utils/constants';
import { toInputDate } from '../../utils/date';
import { rupeesToPaise, paiseToRupees } from '../../utils/currency';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: any) => Promise<void>;
  defaultDirection?: 'PAID_TO_SELLER' | 'RECEIVED_FROM_BUYER';
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  isOpen,
  onClose,
  onSave,
  defaultDirection = 'PAID_TO_SELLER',
}) => {
  const [direction, setDirection] = useState<'PAID_TO_SELLER' | 'RECEIVED_FROM_BUYER'>(defaultDirection);
  const [date, setDate] = useState(toInputDate(new Date()));
  const [sellerId, setSellerId] = useState<number | ''>('');
  const [buyerId, setBuyerId] = useState<number | ''>('');
  const [amountRupees, setAmountRupees] = useState('');
  const [mode, setMode] = useState('Cash');
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');

  const [sellers, setSellers] = useState<Seller[]>([]);
  const [buyers, setBuyers] = useState<Buyer[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setDirection(defaultDirection);
      setDate(toInputDate(new Date()));
      setSellerId('');
      setBuyerId('');
      setAmountRupees('');
      setMode('Cash');
      setReference('');
      setNotes('');

      Promise.all([getSellers(), getBuyers()]).then(([s, b]) => {
        setSellers(s);
        setBuyers(b);
      });
    }
  }, [isOpen, defaultDirection]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (direction === 'PAID_TO_SELLER' && !sellerId) {
      alert('Please select a seller');
      return;
    }
    if (direction === 'RECEIVED_FROM_BUYER' && !buyerId) {
      alert('Please select a buyer');
      return;
    }
    const paise = rupeesToPaise(amountRupees);
    if (paise <= 0) {
      alert('Amount must be greater than zero');
      return;
    }

    setLoading(true);
    try {
      await onSave({
        date,
        direction,
        sellerId: direction === 'PAID_TO_SELLER' ? Number(sellerId) : undefined,
        buyerId: direction === 'RECEIVED_FROM_BUYER' ? Number(buyerId) : undefined,
        amount: paise,
        mode,
        reference: reference.trim() || undefined,
        notes: notes.trim() || undefined,
      });
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Record Payment (भुगतान दर्ज करें)"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Direction Switch */}
        <div className="grid grid-cols-2 gap-2 p-1 bg-gray-100 rounded-xl">
          <button
            type="button"
            onClick={() => setDirection('PAID_TO_SELLER')}
            className={`py-2 text-xs font-bold rounded-lg transition-all ${
              direction === 'PAID_TO_SELLER'
                ? 'bg-white text-gray-900 shadow-xs'
                : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            Pay Seller (किसान को दिया)
          </button>
          <button
            type="button"
            onClick={() => setDirection('RECEIVED_FROM_BUYER')}
            className={`py-2 text-xs font-bold rounded-lg transition-all ${
              direction === 'RECEIVED_FROM_BUYER'
                ? 'bg-white text-gray-900 shadow-xs'
                : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            From Buyer (ग्राहक से मिला)
          </button>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
            Date (तारीख) *
          </label>
          <input
            type="date"
            required
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full px-3.5 py-2 border border-gray-200 rounded-xl text-sm"
          />
        </div>

        {direction === 'PAID_TO_SELLER' ? (
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
              Select Seller / Farmer *
            </label>
            <select
              required
              value={sellerId}
              onChange={(e) => setSellerId(Number(e.target.value))}
              className="w-full px-3.5 py-2 border border-gray-200 rounded-xl text-sm"
            >
              <option value="">Select Seller...</option>
              {sellers.map((s) => (
                <option key={s.id} value={s.id}>{s.name} {s.village ? `(${s.village})` : ''}</option>
              ))}
            </select>
          </div>
        ) : (
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
              Select Buyer / Shop *
            </label>
            <select
              required
              value={buyerId}
              onChange={(e) => setBuyerId(Number(e.target.value))}
              className="w-full px-3.5 py-2 border border-gray-200 rounded-xl text-sm"
            >
              <option value="">Select Buyer...</option>
              {buyers.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
              Amount (रुपये ₹) *
            </label>
            <input
              type="number"
              step="any"
              inputMode="decimal"
              required
              placeholder="0"
              value={amountRupees}
              onChange={(e) => setAmountRupees(e.target.value)}
              className="w-full px-3.5 py-2 border border-gray-200 rounded-xl text-base font-bold text-gray-900"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
              Payment Mode
            </label>
            <select
              value={mode}
              onChange={(e) => setMode(e.target.value)}
              className="w-full px-3.5 py-2 border border-gray-200 rounded-xl text-sm"
            >
              {PAYMENT_MODES.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
            Reference / UPI UTR / Cheque No.
          </label>
          <input
            type="text"
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            placeholder="e.g. UPI Ref #93420..."
            className="w-full px-3.5 py-2 border border-gray-200 rounded-xl text-sm"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
            Notes
          </label>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. Cleared full balance"
            className="w-full px-3.5 py-2 border border-gray-200 rounded-xl text-sm"
          />
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t border-gray-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-gray-200 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold shadow-xs disabled:opacity-50"
          >
            {loading ? 'Recording...' : 'Record Payment'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
