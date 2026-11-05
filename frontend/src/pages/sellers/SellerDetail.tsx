import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getSeller, getSellerLedger, updateSeller } from '../../api/sellers';
import { PageHeader } from '../../components/PageHeader';
import { CurrencyDisplay } from '../../components/CurrencyDisplay';
import { Badge } from '../../components/Badge';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { SellerModal } from './SellerModal';
import { formatDate } from '../../utils/date';
import {
  ArrowLeft,
  Phone,
  MapPin,
  Sparkles,
  Edit2,
  Calendar,
  FileText,
  ShoppingCart,
  Printer
} from 'lucide-react';

export const SellerDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<any>(null);
  const [ledger, setLedger] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'purchases' | 'ledger'>('ledger');
  const [editModalOpen, setEditModalOpen] = useState(false);

  const sellerId = parseInt(id || '0');

  const fetchData = async () => {
    setLoading(true);
    try {
      const [sellerRes, ledgerRes] = await Promise.all([
        getSeller(sellerId),
        getSellerLedger(sellerId),
      ]);
      setData(sellerRes);
      setLedger(ledgerRes);
    } catch (err) {
      console.error('Failed to load seller detail:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (sellerId) fetchData();
  }, [sellerId]);

  const handleUpdate = async (formData: any) => {
    await updateSeller(sellerId, formData);
    fetchData();
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) return <LoadingSpinner size="lg" />;
  if (!data) return <div className="p-8 text-center text-gray-500">Seller not found</div>;

  const { seller, totalPurchased, totalPaid, balancePayable, lastPurchaseDate } = data;

  return (
    <div className="space-y-6">
      {/* Back button & Action */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/sellers')}
          className="flex items-center gap-2 text-sm text-gray-600 hover:text-emerald-700 font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Sellers</span>
        </button>

        <div className="flex gap-2">
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 text-gray-700 rounded-xl text-xs font-semibold hover:bg-gray-50"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Ledger</span>
          </button>
          <button
            onClick={() => setEditModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-xl text-xs font-semibold hover:bg-emerald-100"
          >
            <Edit2 className="w-3.5 h-3.5" />
            <span>Edit Profile</span>
          </button>
        </div>
      </div>

      {/* Seller Profile Header */}
      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-bold text-2xl shadow-xs">
              {seller.name.charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-bold text-gray-900">{seller.name}</h1>
                <Badge variant={seller.type === 'Farmer' ? 'green' : 'blue'}>
                  {seller.type}
                </Badge>
                {seller.isOwnFarmer && (
                  <Badge variant="yellow" className="flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-amber-600" />
                    <span>Own Farmer</span>
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-4 mt-2 text-xs text-gray-500 flex-wrap">
                {seller.phone && (
                  <div className="flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5" />
                    <span>{seller.phone}</span>
                  </div>
                )}
                {seller.village && (
                  <div className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5" />
                    <span>{seller.village}</span>
                  </div>
                )}
                {lastPurchaseDate && (
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Last Purchase: {formatDate(lastPurchaseDate)}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Bought</span>
          <div className="text-2xl font-bold text-gray-900 mt-1">
            <CurrencyDisplay amount={totalPurchased} />
          </div>
          <span className="text-xs text-gray-400 mt-1 block">Lifetime purchases from seller</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Paid</span>
          <div className="text-2xl font-bold text-gray-900 mt-1">
            <CurrencyDisplay amount={totalPaid} />
          </div>
          <span className="text-xs text-gray-400 mt-1 block">Total cash/UPI paid</span>
        </div>

        <div className={`p-5 rounded-2xl border shadow-xs ${
          balancePayable > 0
            ? 'bg-rose-50/50 border-rose-100 text-rose-800'
            : 'bg-emerald-50/50 border-emerald-100 text-emerald-800'
        }`}>
          <span className="text-xs font-semibold uppercase tracking-wider">Balance Payable (देनदारी)</span>
          <div className="text-2xl font-bold mt-1">
            <CurrencyDisplay amount={balancePayable} colorize />
          </div>
          <span className="text-xs opacity-75 mt-1 block">Current outstanding due to seller</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('ledger')}
          className={`pb-3 px-4 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'ledger'
              ? 'border-emerald-600 text-emerald-700'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Statement / Ledger (खाता विवरण)</span>
        </button>
        <button
          onClick={() => setActiveTab('purchases')}
          className={`pb-3 px-4 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'purchases'
              ? 'border-emerald-600 text-emerald-700'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <ShoppingCart className="w-4 h-4" />
          <span>Purchases History ({seller.purchases?.length || 0})</span>
        </button>
      </div>

      {/* Tab Content: Ledger */}
      {activeTab === 'ledger' && ledger && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50/70 border-b border-gray-100 text-xs text-gray-500 uppercase font-semibold">
                <tr>
                  <th className="px-5 py-3">Date</th>
                  <th className="px-5 py-3">Description</th>
                  <th className="px-5 py-3 text-right">Debit (We Paid)</th>
                  <th className="px-5 py-3 text-right">Credit (We Bought)</th>
                  <th className="px-5 py-3 text-right">Balance Due</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {ledger.entries?.map((row: any, idx: number) => (
                  <tr key={idx} className="hover:bg-gray-50/50">
                    <td className="px-5 py-3 whitespace-nowrap text-xs text-gray-600">
                      {formatDate(row.date)}
                    </td>
                    <td className="px-5 py-3 font-medium text-gray-900">
                      {row.description}
                    </td>
                    <td className="px-5 py-3 text-right whitespace-nowrap text-emerald-700 font-medium">
                      {row.debit > 0 ? <CurrencyDisplay amount={row.debit} /> : '-'}
                    </td>
                    <td className="px-5 py-3 text-right whitespace-nowrap text-rose-700 font-medium">
                      {row.credit > 0 ? <CurrencyDisplay amount={row.credit} /> : '-'}
                    </td>
                    <td className="px-5 py-3 text-right whitespace-nowrap font-bold text-gray-900">
                      <CurrencyDisplay amount={row.balance} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab Content: Purchases List */}
      {activeTab === 'purchases' && (
        <div className="space-y-3">
          {seller.purchases?.map((p: any) => (
            <div
              key={p.id}
              onClick={() => navigate(`/purchases/${p.id}`)}
              className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs hover:border-emerald-200 transition-all cursor-pointer flex items-center justify-between"
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-gray-900 text-sm">Purchase #{p.id}</span>
                  <span className="text-xs text-gray-500">• {formatDate(p.date)}</span>
                </div>
                <div className="text-xs text-gray-600 mt-1">
                  {p.items?.map((it: any) => `${it.vegetable?.nameEn || 'Veg'} (${it.quantity} ${it.unit})`).join(', ')}
                </div>
              </div>
              <div className="text-right">
                <div className="font-bold text-gray-900 text-sm">
                  <CurrencyDisplay amount={p.items?.reduce((s: number, i: any) => s + i.lineTotal, 0) + (p.transport || 0) + (p.labour || 0)} />
                </div>
                {p.paidNow > 0 && (
                  <span className="text-xs text-emerald-600">Paid: {formatDate(p.date)}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <SellerModal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        seller={seller}
        onSave={handleUpdate}
      />
    </div>
  );
};
