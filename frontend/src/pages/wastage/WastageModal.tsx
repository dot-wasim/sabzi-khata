import React, { useState, useEffect } from 'react';
import { Modal } from '../../components/Modal';
import { getVegetables } from '../../api/vegetables';
import { Vegetable } from '../../utils/types';
import { WASTAGE_REASONS } from '../../utils/constants';
import { toInputDate } from '../../utils/date';

interface WastageModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: any) => Promise<void>;
}

export const WastageModal: React.FC<WastageModalProps> = ({
  isOpen,
  onClose,
  onSave,
}) => {
  const [date, setDate] = useState(toInputDate(new Date()));
  const [vegetableId, setVegetableId] = useState<number | ''>('');
  const [quantity, setQuantity] = useState('');
  const [reason, setReason] = useState('Rotten');
  const [notes, setNotes] = useState('');
  const [vegetables, setVegetables] = useState<Vegetable[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setDate(toInputDate(new Date()));
      setQuantity('');
      setReason('Rotten');
      setNotes('');
      getVegetables().then((list) => {
        setVegetables(list);
        if (list.length > 0) setVegetableId(list[0].id);
      });
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vegetableId || parseFloat(quantity) <= 0) {
      alert('Please select vegetable and enter valid quantity');
      return;
    }
    setLoading(true);
    try {
      await onSave({
        date,
        vegetableId: Number(vegetableId),
        quantity: parseFloat(quantity),
        reason,
        notes: notes.trim() || undefined,
      });
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const selectedVeg = vegetables.find((v) => v.id === vegetableId);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Log Wastage / Damage (खराबी दर्ज करें)"
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

        <div>
          <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
            Vegetable (सब्जी) *
          </label>
          <select
            required
            value={vegetableId}
            onChange={(e) => setVegetableId(Number(e.target.value))}
            className="w-full px-3.5 py-2 border border-gray-200 rounded-xl text-sm"
          >
            {vegetables.map((v) => (
              <option key={v.id} value={v.id}>
                {v.nameEn} / {v.nameHi} ({v.unit})
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
              Quantity ({selectedVeg?.unit || 'unit'}) *
            </label>
            <input
              type="number"
              step="any"
              inputMode="decimal"
              required
              placeholder="0"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="w-full px-3.5 py-2 border border-gray-200 rounded-xl text-sm font-bold"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
              Reason (कारण)
            </label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3.5 py-2 border border-gray-200 rounded-xl text-sm"
            >
              {WASTAGE_REASONS.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
            Notes
          </label>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. Rotten in transport crate"
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
            className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-sm font-semibold shadow-xs disabled:opacity-50"
          >
            {loading ? 'Saving...' : 'Log Wastage'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
