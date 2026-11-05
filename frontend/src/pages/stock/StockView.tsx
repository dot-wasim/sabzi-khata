import React, { useState, useEffect } from 'react';
import { getStock } from '../../api/stock';
import { StockItem } from '../../utils/types';
import { PageHeader } from '../../components/PageHeader';
import { SearchInput } from '../../components/SearchInput';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { EmptyState } from '../../components/EmptyState';
import { toInputDate, formatDate } from '../../utils/date';
import { Calendar, AlertTriangle, CheckCircle, PackageOpen } from 'lucide-react';

export const StockView: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState(toInputDate(new Date()));
  const [stockList, setStockList] = useState<StockItem[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchStock = async (dateStr: string) => {
    setLoading(true);
    try {
      const res = await getStock(dateStr);
      setStockList(res.stock);
    } catch (err) {
      console.error('Failed to load stock:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStock(selectedDate);
  }, [selectedDate]);

  const filtered = stockList.filter((item) => {
    return (
      item.vegetable.nameEn.toLowerCase().includes(search.toLowerCase()) ||
      item.vegetable.nameHi.toLowerCase().includes(search.toLowerCase())
    );
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Daily Stock Ledger (दैनिक स्टॉक)"
        subtitle="Opening + Purchased − Sold − Wasted = Closing Stock"
        actions={
          <div className="flex items-center gap-2 bg-white border border-gray-200 px-3 py-1.5 rounded-xl shadow-xs">
            <Calendar className="w-4 h-4 text-gray-500" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="text-xs font-semibold text-gray-800 bg-transparent focus:outline-hidden"
            />
          </div>
        }
      />

      <SearchInput
        value={search}
        onChange={setSearch}
        placeholder="Filter vegetables by English or Hindi name..."
      />

      {loading ? (
        <LoadingSpinner />
      ) : filtered.length === 0 ? (
        <EmptyState
          title="No stock records"
          description="Ensure vegetables are added to your catalog."
        />
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50/70 border-b border-gray-100 text-xs text-gray-500 uppercase font-semibold">
                <tr>
                  <th className="px-5 py-3">Vegetable (सब्जी)</th>
                  <th className="px-5 py-3 text-right">Opening (आरंभिक)</th>
                  <th className="px-5 py-3 text-right">Bought (खरीदा)</th>
                  <th className="px-5 py-3 text-right">Sold (बेचा)</th>
                  <th className="px-5 py-3 text-right">Wasted (खराब)</th>
                  <th className="px-5 py-3 text-right font-bold text-gray-900">Closing (अंतिम)</th>
                  <th className="px-5 py-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((row) => (
                  <tr key={row.vegetableId} className="hover:bg-gray-50/50">
                    <td className="px-5 py-3 font-semibold text-gray-900">
                      {row.vegetable.nameEn}{' '}
                      <span className="text-gray-400 font-normal">/ {row.vegetable.nameHi}</span>
                      <span className="text-xs text-gray-400 ml-1.5 font-normal">({row.vegetable.unit})</span>
                    </td>
                    <td className="px-5 py-3 text-right text-gray-600 font-medium">
                      {row.opening}
                    </td>
                    <td className="px-5 py-3 text-right text-emerald-700 font-medium">
                      {row.purchased > 0 ? `+${row.purchased}` : '0'}
                    </td>
                    <td className="px-5 py-3 text-right text-blue-700 font-medium">
                      {row.sold > 0 ? `-${row.sold}` : '0'}
                    </td>
                    <td className="px-5 py-3 text-right text-rose-600 font-medium">
                      {row.wasted > 0 ? `-${row.wasted}` : '0'}
                    </td>
                    <td className={`px-5 py-3 text-right font-bold ${
                      row.closing < 0 ? 'text-rose-600' : 'text-gray-900'
                    }`}>
                      {row.closing}
                    </td>
                    <td className="px-5 py-3 text-center">
                      {row.warning ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                          <AlertTriangle className="w-3 h-3" />
                          <span>Shortage</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                          <CheckCircle className="w-3 h-3" />
                          <span>OK</span>
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
