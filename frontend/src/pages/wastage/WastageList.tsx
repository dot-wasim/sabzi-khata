import React, { useState, useEffect } from 'react';
import { getWastages, createWastage, deleteWastage } from '../../api/wastage';
import { Wastage } from '../../utils/types';
import { PageHeader } from '../../components/PageHeader';
import { Badge } from '../../components/Badge';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { EmptyState } from '../../components/EmptyState';
import { WastageModal } from './WastageModal';
import { formatDate } from '../../utils/date';
import { Plus, Trash2, AlertOctagon } from 'lucide-react';

export const WastageList: React.FC = () => {
  const [wastages, setWastages] = useState<Wastage[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  const fetchList = async () => {
    setLoading(true);
    try {
      const res = await getWastages();
      setWastages(res.wastages);
    } catch (err) {
      console.error('Failed to load wastages:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchList();
  }, []);

  const handleCreate = async (formData: any) => {
    await createWastage(formData);
    fetchList();
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Delete this wastage entry?')) return;
    try {
      await deleteWastage(id);
      fetchList();
    } catch (err) {
      alert('Failed to delete wastage entry');
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Wastage & Damage (सब्जी खराबी)"
        subtitle="Track rotten, damaged, or shrinkage losses to accurately calculate daily profit"
        actions={
          <button
            onClick={() => setModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-sm font-semibold shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Log Wastage (+ खराबी दर्ज करें)</span>
          </button>
        }
      />

      {loading ? (
        <LoadingSpinner />
      ) : wastages.length === 0 ? (
        <EmptyState
          title="No wastage recorded"
          description="Logging damaged and rotten vegetables ensures inventory and profits stay 100% accurate."
          action={
            <button
              onClick={() => setModalOpen(true)}
              className="px-4 py-2 bg-rose-600 text-white rounded-xl text-sm font-medium"
            >
              Log Wastage
            </button>
          }
        />
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50/70 border-b border-gray-100 text-xs text-gray-500 uppercase font-semibold">
                <tr>
                  <th className="px-5 py-3">Date</th>
                  <th className="px-5 py-3">Vegetable</th>
                  <th className="px-5 py-3 text-right">Quantity</th>
                  <th className="px-5 py-3">Reason</th>
                  <th className="px-5 py-3">Notes</th>
                  <th className="px-5 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {wastages.map((w) => (
                  <tr key={w.id} className="hover:bg-gray-50/50">
                    <td className="px-5 py-3 text-xs text-gray-600 whitespace-nowrap">
                      {formatDate(w.date)}
                    </td>
                    <td className="px-5 py-3 font-semibold text-gray-900">
                      {w.vegetable?.nameEn} <span className="text-gray-400 font-normal">/ {w.vegetable?.nameHi}</span>
                    </td>
                    <td className="px-5 py-3 text-right font-bold text-rose-700">
                      {w.quantity} {w.vegetable?.unit}
                    </td>
                    <td className="px-5 py-3">
                      <Badge variant="red">{w.reason}</Badge>
                    </td>
                    <td className="px-5 py-3 text-xs text-gray-500">
                      {w.notes || '-'}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <button
                        onClick={() => handleDelete(w.id)}
                        className="text-gray-300 hover:text-rose-600 p-1 rounded-md"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <WastageModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleCreate}
      />
    </div>
  );
};
