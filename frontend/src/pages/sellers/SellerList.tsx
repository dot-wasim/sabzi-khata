import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSellers } from '../../api/sellers';
import { getPurchases } from '../../api/purchases';
import { Seller } from '../../utils/types';
import { SellerModal } from './SellerModal';
import { paiseToRupees } from '../../utils/currency';
import { formatDate } from '../../utils/date';
import { useDeskMode } from '../../context/DeskModeContext';

export const SellerList: React.FC = () => {
  const navigate = useNavigate();
  const { setMode } = useDeskMode();

  const [sellers, setSellers] = useState<Seller[]>([]);
  const [purchases, setPurchases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [sellersRes, purchasesRes] = await Promise.all([
        getSellers(),
        getPurchases({ limit: 500 }).catch(() => ({ purchases: [] })),
      ]);
      const sList = (sellersRes as any).sellers || sellersRes || [];
      setSellers(sList);
      setPurchases(Array.isArray(purchasesRes) ? purchasesRes : (purchasesRes as any)?.purchases || []);
    } catch (err) {
      console.error('Failed to load suppliers:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const totalOwedPaise = useMemo(() => {
    return sellers.reduce((sum, s) => sum + (s.currentBalance || 0), 0);
  }, [sellers]);

  const getSellerSummary = (sellerId: number) => {
    const sPurchases = purchases
      .filter((p) => p.sellerId === sellerId && !p.deletedAt)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const lastP = sPurchases[0];
    const lastPStr = lastP ? `Last purchase ${formatDate(lastP.date, 'd MMM')}` : 'No purchases yet';
    return `${lastPStr} · bad-goods deductions this month ₹0`;
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
          onClick={() => setModalOpen(true)}
          className="text-xs font-bold text-[#1F6B45] hover:underline bg-emerald-50 px-2 py-1 rounded border border-emerald-200"
        >
          + Add Supplier
        </button>
      </div>

      {/* Summary Card */}
      <div className="c">
        <div className="r">
          <span>Total we owe {sellers.length} suppliers</span>
          <b className="d">₹{paiseToRupees(totalOwedPaise).toLocaleString('en-IN')}</b>
        </div>
      </div>

      {/* Supplier List */}
      {sellers.length === 0 ? (
        <div className="c text-center py-6 text-sm text-gray-500">
          कोई सप्लायर नहीं मिला (No suppliers found)
        </div>
      ) : (
        sellers.map((seller) => {
          const weOweRupees = paiseToRupees(seller.currentBalance || 0);
          const summaryStr = getSellerSummary(seller.id);

          return (
            <div
              key={seller.id}
              onClick={() => navigate(`/sellers/${seller.id}`)}
              className="c cursor-pointer hover:border-[#1F6B45] transition-colors"
            >
              <div className="r">
                <b>{seller.name} {seller.village ? `(${seller.village})` : ''}</b>
                {weOweRupees > 0 ? (
                  <b className="d">₹{weOweRupees.toLocaleString('en-IN')}</b>
                ) : (
                  <b className="text-gray-600">₹0</b>
                )}
              </div>
              <span className="m">{summaryStr}</span>
            </div>
          );
        })
      )}

      {/* Add Supplier Action */}
      <button
        type="button"
        onClick={() => setModalOpen(true)}
        className="b"
      >
        + Add supplier
      </button>

      {/* Modal */}
      {modalOpen && (
        <SellerModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          onSave={async () => {
            await fetchData();
            setModalOpen(false);
          }}
        />
      )}
    </div>
  );
};
