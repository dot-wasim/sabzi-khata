import React, { useState, useEffect } from 'react';
import {
  getProfitReport,
  getTopVegetables,
  getTopBuyers,
  getTopSellers,
  downloadPurchasesCSV,
  downloadSalesCSV
} from '../../api/reports';
import { PageHeader } from '../../components/PageHeader';
import { CurrencyDisplay } from '../../components/CurrencyDisplay';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { formatDate } from '../../utils/date';
import {
  BarChart3,
  Download,
  Calendar,
  Layers,
  Carrot,
  Building2,
  Users,
  TrendingUp,
  FileSpreadsheet
} from 'lucide-react';

export const ProfitReport: React.FC = () => {
  const [groupBy, setGroupBy] = useState<'day' | 'vegetable' | 'buyer'>('day');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [loading, setLoading] = useState(true);
  const [reportData, setReportData] = useState<any[]>([]);

  // Top rankings
  const [topVegs, setTopVegs] = useState<any[]>([]);
  const [topBuyers, setTopBuyers] = useState<any[]>([]);
  const [topSellers, setTopSellers] = useState<any[]>([]);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const [repRes, tvRes, tbRes, tsRes] = await Promise.all([
        getProfitReport(fromDate || undefined, toDate || undefined, groupBy),
        getTopVegetables(fromDate || undefined, toDate || undefined),
        getTopBuyers(fromDate || undefined, toDate || undefined),
        getTopSellers(fromDate || undefined, toDate || undefined),
      ]);
      setReportData(repRes.data || []);
      setTopVegs(tvRes);
      setTopBuyers(tbRes);
      setTopSellers(tsRes);
    } catch (err) {
      console.error('Failed to load reports:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [groupBy, fromDate, toDate]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Profit & Performance Reports (मुनाफा रिपोर्ट)"
        subtitle="Detailed analysis of daily earnings, high-margin vegetables, and buyer volumes"
        actions={
          <div className="flex gap-2">
            <button
              onClick={() => downloadPurchasesCSV(fromDate, toDate)}
              className="flex items-center gap-1.5 px-3 py-2 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-semibold hover:bg-emerald-100"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              <span>Export Purchases CSV</span>
            </button>
            <button
              onClick={() => downloadSalesCSV(fromDate, toDate)}
              className="flex items-center gap-1.5 px-3 py-2 bg-blue-50 text-blue-800 border border-blue-200 rounded-xl text-xs font-semibold hover:bg-blue-100"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-blue-600" />
              <span>Export Sales CSV</span>
            </button>
          </div>
        }
      />

      {/* Date & Group By Selector */}
      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="flex gap-2 w-full sm:w-auto">
          <button
            onClick={() => setGroupBy('day')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-colors ${
              groupBy === 'day'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Day-by-Day (प्रतिदिन)
          </button>
          <button
            onClick={() => setGroupBy('vegetable')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-colors ${
              groupBy === 'vegetable'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            By Vegetable (सब्जी अनुसार)
          </button>
          <button
            onClick={() => setGroupBy('buyer')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-colors ${
              groupBy === 'buyer'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            By Buyer (ग्राहक अनुसार)
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

      {/* Main Report Table */}
      {loading ? (
        <LoadingSpinner />
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              {groupBy === 'day' && (
                <>
                  <thead className="bg-gray-50/70 border-b border-gray-100 text-xs text-gray-500 uppercase font-semibold">
                    <tr>
                      <th className="px-5 py-3">Date</th>
                      <th className="px-5 py-3 text-right">Sales Revenue</th>
                      <th className="px-5 py-3 text-right">Cost of Goods (COGS)</th>
                      <th className="px-5 py-3 text-right">Wastage Loss</th>
                      <th className="px-5 py-3 text-right">Expenses</th>
                      <th className="px-5 py-3 text-right font-bold text-gray-900">Net Profit (शुद्ध लाभ)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {reportData.map((row: any, idx: number) => (
                      <tr key={idx} className="hover:bg-gray-50/50">
                        <td className="px-5 py-3 font-semibold text-gray-900 whitespace-nowrap">
                          {formatDate(row.date)}
                        </td>
                        <td className="px-5 py-3 text-right text-gray-700 font-medium">
                          <CurrencyDisplay amount={row.revenue} />
                        </td>
                        <td className="px-5 py-3 text-right text-gray-600 font-medium">
                          <CurrencyDisplay amount={row.cogs} />
                        </td>
                        <td className="px-5 py-3 text-right text-rose-600 font-medium">
                          <CurrencyDisplay amount={row.wastage} />
                        </td>
                        <td className="px-5 py-3 text-right text-purple-600 font-medium">
                          <CurrencyDisplay amount={row.expenses} />
                        </td>
                        <td className="px-5 py-3 text-right font-bold text-base">
                          <CurrencyDisplay amount={row.profit} colorize />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </>
              )}

              {groupBy === 'vegetable' && (
                <>
                  <thead className="bg-gray-50/70 border-b border-gray-100 text-xs text-gray-500 uppercase font-semibold">
                    <tr>
                      <th className="px-5 py-3">Vegetable</th>
                      <th className="px-5 py-3 text-right">Quantity Sold</th>
                      <th className="px-5 py-3 text-right">Revenue</th>
                      <th className="px-5 py-3 text-right">Purchase Cost</th>
                      <th className="px-5 py-3 text-right">Wastage Loss</th>
                      <th className="px-5 py-3 text-right font-bold text-gray-900">Net Margin</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {reportData.map((row: any, idx: number) => (
                      <tr key={idx} className="hover:bg-gray-50/50">
                        <td className="px-5 py-3 font-semibold text-gray-900">
                          {row.nameEn} <span className="text-gray-400 font-normal">/ {row.nameHi}</span>
                        </td>
                        <td className="px-5 py-3 text-right text-gray-700 font-medium">
                          {row.quantitySold}
                        </td>
                        <td className="px-5 py-3 text-right text-gray-700 font-medium">
                          <CurrencyDisplay amount={row.revenue} />
                        </td>
                        <td className="px-5 py-3 text-right text-gray-600 font-medium">
                          <CurrencyDisplay amount={row.cogs} />
                        </td>
                        <td className="px-5 py-3 text-right text-rose-600 font-medium">
                          <CurrencyDisplay amount={row.wastageCost} />
                        </td>
                        <td className="px-5 py-3 text-right font-bold text-base">
                          <CurrencyDisplay amount={row.profit} colorize />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </>
              )}

              {groupBy === 'buyer' && (
                <>
                  <thead className="bg-gray-50/70 border-b border-gray-100 text-xs text-gray-500 uppercase font-semibold">
                    <tr>
                      <th className="px-5 py-3">Buyer / Shop</th>
                      <th className="px-5 py-3 text-right">Gross Sales</th>
                      <th className="px-5 py-3 text-right font-bold text-gray-900">Estimated Profit Contribution</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {reportData.map((row: any, idx: number) => (
                      <tr key={idx} className="hover:bg-gray-50/50">
                        <td className="px-5 py-3 font-semibold text-gray-900">
                          {row.buyerName}
                        </td>
                        <td className="px-5 py-3 text-right text-gray-700 font-medium">
                          <CurrencyDisplay amount={row.totalSales} />
                        </td>
                        <td className="px-5 py-3 text-right font-bold text-base">
                          <CurrencyDisplay amount={row.profit} colorize />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </>
              )}
            </table>
          </div>
        </div>
      )}

      {/* Top Rankings Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
        {/* Top Vegetables */}
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs">
          <div className="flex items-center gap-2 mb-4 pb-2 border-b border-gray-100">
            <Carrot className="w-5 h-5 text-emerald-600" />
            <h3 className="font-bold text-gray-900 text-sm">Top Vegetables by Volume</h3>
          </div>
          <div className="space-y-3">
            {topVegs.slice(0, 5).map((v, i) => (
              <div key={v.id} className="flex items-center justify-between text-xs">
                <span className="font-medium text-gray-800">
                  {i + 1}. {v.nameEn} ({v.nameHi})
                </span>
                <span className="font-bold text-emerald-700">
                  {v.totalQuantity} {v.unit}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Top Buyers */}
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs">
          <div className="flex items-center gap-2 mb-4 pb-2 border-b border-gray-100">
            <Building2 className="w-5 h-5 text-blue-600" />
            <h3 className="font-bold text-gray-900 text-sm">Top Buyers by Sales Value</h3>
          </div>
          <div className="space-y-3">
            {topBuyers.slice(0, 5).map((b, i) => (
              <div key={b.id} className="flex items-center justify-between text-xs">
                <span className="font-medium text-gray-800">
                  {i + 1}. {b.name}
                </span>
                <span className="font-bold text-blue-700">
                  <CurrencyDisplay amount={b.totalBought} />
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Top Sellers */}
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs">
          <div className="flex items-center gap-2 mb-4 pb-2 border-b border-gray-100">
            <Users className="w-5 h-5 text-amber-600" />
            <h3 className="font-bold text-gray-900 text-sm">Top Suppliers / Mandi Sellers</h3>
          </div>
          <div className="space-y-3">
            {topSellers.slice(0, 5).map((s, i) => (
              <div key={s.id} className="flex items-center justify-between text-xs">
                <span className="font-medium text-gray-800">
                  {i + 1}. {s.name}
                </span>
                <span className="font-bold text-amber-700">
                  <CurrencyDisplay amount={s.totalPurchased} />
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
