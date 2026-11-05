import React, { useState, useEffect } from 'react';
import { getExpenses, createExpense, deleteExpense } from '../../api/expenses';
import { Expense } from '../../utils/types';
import { PageHeader } from '../../components/PageHeader';
import { CurrencyDisplay } from '../../components/CurrencyDisplay';
import { Badge } from '../../components/Badge';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { EmptyState } from '../../components/EmptyState';
import { ExpenseModal } from './ExpenseModal';
import { formatDate } from '../../utils/date';
import { Plus, Trash2, Receipt } from 'lucide-react';

export const ExpenseList: React.FC = () => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  const fetchList = async () => {
    setLoading(true);
    try {
      const res = await getExpenses();
      setExpenses(res.expenses);
    } catch (err) {
      console.error('Failed to load expenses:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchList();
  }, []);

  const handleCreate = async (formData: any) => {
    await createExpense(formData);
    fetchList();
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Delete this expense?')) return;
    try {
      await deleteExpense(id);
      fetchList();
    } catch (err) {
      alert('Failed to delete expense');
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Business Expenses (दैनिक खर्च)"
        subtitle="Track operational costs such as mandi transport, labour, shop rent, and fuel"
        actions={
          <button
            onClick={() => setModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-sm font-semibold shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Add Expense (+ खर्च जोड़ें)</span>
          </button>
        }
      />

      {loading ? (
        <LoadingSpinner />
      ) : expenses.length === 0 ? (
        <EmptyState
          title="No expenses recorded"
          description="Log daily expenses to get an accurate view of net business profits."
          action={
            <button
              onClick={() => setModalOpen(true)}
              className="px-4 py-2 bg-purple-600 text-white rounded-xl text-sm font-medium"
            >
              Add First Expense
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
                  <th className="px-5 py-3">Category</th>
                  <th className="px-5 py-3">Notes</th>
                  <th className="px-5 py-3 text-right">Amount</th>
                  <th className="px-5 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {expenses.map((e) => (
                  <tr key={e.id} className="hover:bg-gray-50/50">
                    <td className="px-5 py-3 text-xs text-gray-600 whitespace-nowrap">
                      {formatDate(e.date)}
                    </td>
                    <td className="px-5 py-3">
                      <Badge variant="purple">{e.category}</Badge>
                    </td>
                    <td className="px-5 py-3 text-sm text-gray-800 font-medium">
                      {e.notes || '-'}
                    </td>
                    <td className="px-5 py-3 text-right font-bold text-gray-900 whitespace-nowrap">
                      <CurrencyDisplay amount={e.amount} />
                    </td>
                    <td className="px-5 py-3 text-right">
                      <button
                        onClick={() => handleDelete(e.id)}
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

      <ExpenseModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleCreate}
      />
    </div>
  );
};
