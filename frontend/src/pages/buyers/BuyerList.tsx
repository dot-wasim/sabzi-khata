import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { getBuyers } from '../../api/buyers';
import { getSales } from '../../api/sales';
import { getPayments } from '../../api/payments';
import { Buyer } from '../../utils/types';
import { BuyerModal } from './BuyerModal';
import { paiseToRupees } from '../../utils/currency';
import { formatDate } from '../../utils/date';
import { useDeskMode } from '../../context/DeskModeContext';

export const BuyerList: React.FC = () => {
  const navigate = useNavigate();
  const { setMode } = useDeskMode();

  const [buyers, setBuyers] = useState<Buyer[]>([]);
  const [sales, setSales] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [newBuyerModalOpen, setNewBuyerModalOpen] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [buyersData, salesRes, paymentsRes] = await Promise.all([
        getBuyers(),
        getSales({ limit: 1000 }).catch(() => ({ sales: [] })),
        getPayments({ limit: 1000 }).catch(() => ({ payments: [] })),
      ]);

      setBuyers(Array.isArray(buyersData) ? buyersData : (buyersData as any)?.buyers || []);
      setSales(Array.isArray(salesRes) ? salesRes : (salesRes as any)?.sales || []);
      setPayments(Array.isArray(paymentsRes) ? paymentsRes : (paymentsRes as any)?.payments || []);
    } catch (err) {
      console.error('Failed to load accounts section data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Filtered buyers based on search query
  const filteredBuyers = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return buyers;
    return buyers.filter(
      (b) =>
        b.name?.toLowerCase().includes(q) ||
        b.phone?.toLowerCase().includes(q) ||
        b.shopName?.toLowerCase().includes(q) ||
        b.address?.toLowerCase().includes(q)
    );
  }, [buyers, searchQuery]);

  // Total outstanding balance across all buyers
  const totalOutstandingPaise = useMemo(() => {
    return buyers.reduce((sum, b) => sum + (b.currentBalance || 0), 0);
  }, [buyers]);

  // Helper to find last bill & payment for each buyer
  const getCustomerSummary = (buyerId: number) => {
    const buyerSales = sales
      .filter((s) => s.buyerId === buyerId && !s.deletedAt)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const buyerPayments = payments
      .filter((p) => p.buyerId === buyerId && !p.deletedAt)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const lastSale = buyerSales[0];
    const lastPayment = buyerPayments[0];

    const salePart = lastSale ? `Last bill ${formatDate(lastSale.date, 'd MMM')}` : 'No bills yet';
    const payPart = lastPayment
      ? `last payment ${formatDate(lastPayment.date, 'd MMM')}, ${lastPayment.paymentMethod || 'cash'}`
      : 'no payment yet';

    return `${salePart} · ${payPart}`;
  };

  if (loading) {
    return (
      <div className="s flex items-center justify-center min-h-[60vh]">
        <span className="m font-semibold">लोड हो रहा है...</span>
      </div>
    );
  }

  return (
    <div className="s">
      {/* Top Header */}
      <div className="r">
        <h1 className="h">Accounts</h1>
        <button
          type="button"
          onClick={() => setNewBuyerModalOpen(true)}
          className="text-xs font-bold text-[#1F6B45] hover:underline bg-emerald-50 px-2 py-1 rounded border border-emerald-200"
        >
          + Add Customer
        </button>
      </div>

      {/* Search Input */}
      <div>
        <label className="m block mb-1" htmlFor="q">Search customer</label>
        <input
          id="q"
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Name or phone"
          className="w-full min-h-[44px] border border-[#DDE3D6] rounded-[10px] px-3 font-normal text-sm bg-white text-[#1B2A1F] focus:outline-hidden"
        />
      </div>

      {/* Summary Card */}
      <div className="c">
        <div className="r">
          <span>Total due from {buyers.length} customers</span>
          <b className="d">₹{paiseToRupees(totalOutstandingPaise).toLocaleString('en-IN')}</b>
        </div>
      </div>

      {/* Customer List Cards */}
      {filteredBuyers.length === 0 ? (
        <div className="c text-center py-6 text-sm text-gray-500">
          कोई ग्राहक नहीं मिला (No customers found)
        </div>
      ) : (
        filteredBuyers.map((buyer) => {
          const duePaise = buyer.currentBalance || 0;
          const dueRupees = paiseToRupees(duePaise);
          const summaryStr = getCustomerSummary(buyer.id);

          return (
            <div
              key={buyer.id}
              onClick={() => navigate(`/buyers/${buyer.id}`)}
              className="c cursor-pointer hover:border-[#1F6B45] transition-colors"
            >
              <div className="r">
                <b>{buyer.name} {buyer.shopName ? `(${buyer.shopName})` : ''}</b>
                {dueRupees > 0 ? (
                  <b className="d">₹{dueRupees.toLocaleString('en-IN')}</b>
                ) : (
                  <b className="text-gray-600">₹0</b>
                )}
              </div>
              <span className="m">
                {dueRupees === 0 ? `${summaryStr} · settled` : summaryStr}
              </span>
            </div>
          );
        })
      )}

      {/* Add Customer Action Button */}
      <button
        type="button"
        onClick={() => setNewBuyerModalOpen(true)}
        className="b"
      >
        + Add customer
      </button>

      {/* Modal */}
      {newBuyerModalOpen && (
        <BuyerModal
          isOpen={newBuyerModalOpen}
          onClose={() => setNewBuyerModalOpen(false)}
          onSave={async () => {
            await fetchData();
            setNewBuyerModalOpen(false);
          }}
        />
      )}
    </div>
  );
};
