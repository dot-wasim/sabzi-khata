import React, { useState, useEffect } from 'react';
import { Modal } from '../../components/Modal';
import { EXPENSE_CATEGORIES } from '../../utils/constants';
import { toInputDate } from '../../utils/date';
import { rupeesToPaise } from '../../utils/currency';

interface ExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: any) => Promise<void>;
}

export const ExpenseModal: React.FC<ExpenseModalProps> = ({
  isOpen,
  onClose,
  onSave,
}) => {
  const [date, setDate] = useState(toInputDate(new Date()));
  const [category, setCategory] = useState('Transport');
  const [amountRupees, setAmountRupees] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setDate(toInputDate(new Date()));
      setCategory('Transport');
      setAmountRupees('');
      setNotes('');
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const paise = rupeesToPaise(amountRupees);
    if (paise <= 0) {
      alert('Please enter a valid amount');
      return;
    }
    setLoading(true);
    try {
      await onSave({
        date,
        category,
        amount: paise,
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
      title="Record Business Expense (व्यापार खर्च दर्ज करें)"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
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

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
              Category (श्रेणी)
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3.5 py-2 border border-gray-200 rounded-xl text-sm"
            >
              {EXPENSE_CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

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
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
            Notes / Details
          </label>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. Mandi tea, auto fare, daily labour"
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
            {loading ? 'Saving...' : 'Record Expense'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
