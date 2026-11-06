import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getSeller, getSellerLedger, updateSeller } from '../../api/sellers';
import { createPayment } from '../../api/payments';
import { SellerModal } from './SellerModal';
import { formatDate } from '../../utils/date';
import { paiseToRupees, rupeesToPaise } from '../../utils/currency';

export const SellerDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const sellerId = parseInt(id || '0');

  const [data, setData] = useState<any>(null);
  const [ledger, setLedger] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [showPaymentBox, setShowPaymentBox] = useState(false);

  const [paymentAmountRupees, setPaymentAmountRupees] = useState('');
  const [paymentMode, setPaymentMode] = useState<'CASH' | 'UPI' | 'BANK'>('CASH');
  const [paymentNote, setPaymentNote] = useState('');
  const [savingPayment, setSavingPayment] = useState(false);

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

  if (loading) {
    return (
      <div className="s flex items-center justify-center min-h-[60vh]">
        <span className="m font-semibold">लोड हो रहा है...</span>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="s text-center py-12">
        <span className="m">Supplier not found</span>
        <button type="button" onClick={() => navigate('/sellers')} className="b mt-4">
          Back to Suppliers
        </button>
      </div>
    );
  }

  const { seller, balancePayable } = data;
  const currentOwedRupees = paiseToRupees(balancePayable);

  const handleSavePayment = async () => {
    const amt = parseFloat(paymentAmountRupees);
    if (!amt || amt <= 0) {
      alert('कृपया वैध रकम दर्ज करें (Enter valid amount)');
      return;
    }

    setSavingPayment(true);
    try {
      await createPayment({
        direction: 'PAID_TO_SELLER',
        amount: rupeesToPaise(amt),
        date: new Date().toISOString(),
        paymentMethod: paymentMode,
        sellerId: sellerId,
        notes: paymentNote || undefined,
      });
      setPaymentAmountRupees('');
      setPaymentNote('');
      setShowPaymentBox(false);
      await fetchData();
    } catch (err: any) {
      alert(`त्रुटि: ${err.message || 'पेमेंट दर्ज नहीं हो सकी'}`);
    } finally {
      setSavingPayment(false);
    }
  };

  return (
    <div className="s">
      {/* Top Header */}
      <div className="r">
        <h1 className="h">{seller.name}</h1>
        <button
          type="button"
          onClick={() => navigate('/sellers')}
          className="text-xs font-semibold text-[#1F6B45]"
        >
          ← Back to Suppliers
        </button>
      </div>

      {/* Supplier Card */}
      <div className="c">
        <div className="r">
          <span className="m">Supplier account</span>
          <span className="m">{seller.phone || 'No phone'}</span>
        </div>
        <div className="r">
          <b>{seller.village ? `Village: ${seller.village}` : 'Mandi Supplier'}</b>
          <b className="d text-base">We owe ₹{currentOwedRupees.toLocaleString('en-IN')}</b>
        </div>
      </div>

      {/* Quick Action Buttons */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setShowPaymentBox(!showPaymentBox)}
          className="b flex-1"
        >
          {showPaymentBox ? 'Close Payment' : '+ Pay supplier'}
        </button>
        <button
          type="button"
          onClick={() => navigate('/purchases/new')}
          className="b b2 flex-1"
        >
          + New purchase
        </button>
      </div>

      {/* Pay Supplier In-place Box */}
      {showPaymentBox && (
        <div className="c border-2 border-[#1F6B45]">
          <b className="text-base">Pay supplier</b>
          <label className="m" htmlFor="pay-amt">Amount paid</label>
          <input
            id="pay-amt"
            type="number"
            step="any"
            placeholder="₹ Amount"
            value={paymentAmountRupees}
            onChange={(e) => setPaymentAmountRupees(e.target.value)}
            className="min-h-[44px] border border-[#DDE3D6] rounded-[10px] px-3 font-semibold text-lg bg-white"
          />

          <span className="m">Payment mode</span>
          <div className="t">
            <button
              type="button"
              className={paymentMode === 'CASH' ? 'on' : ''}
              onClick={() => setPaymentMode('CASH')}
            >
              Cash
            </button>
            <button
              type="button"
              className={paymentMode === 'UPI' ? 'on' : ''}
              onClick={() => setPaymentMode('UPI')}
            >
              UPI
            </button>
            <button
              type="button"
              className={paymentMode === 'BANK' ? 'on' : ''}
              onClick={() => setPaymentMode('BANK')}
            >
              Bank
            </button>
          </div>

          <label className="m mt-1" htmlFor="pay-note">Note (optional)</label>
          <input
            id="pay-note"
            type="text"
            placeholder="Note"
            value={paymentNote}
            onChange={(e) => setPaymentNote(e.target.value)}
            className="min-h-[44px] border border-[#DDE3D6] rounded-[10px] px-3 text-sm bg-white"
          />

          <button
            type="button"
            disabled={savingPayment}
            onClick={handleSavePayment}
            className="b mt-1"
          >
            {savingPayment ? 'Saving...' : 'Save payment'}
          </button>
        </div>
      )}

      {/* Supplier Ledger Card */}
      <div className="c">
        <b>{seller.name} · ledger</b>
        {ledger?.entries?.length === 0 ? (
          <span className="m">No ledger entries</span>
        ) : (
          ledger?.entries?.map((ent: any, idx: number) => {
            const isPurchase = ent.type === 'PURCHASE';
            return (
              <div key={idx} className="r border-b border-[#DDE3D6] pb-1.5 last:border-0 last:pb-0">
                <div>
                  <span className="font-semibold text-xs">
                    {formatDate(ent.date, 'd MMM')} · {ent.referenceId || (isPurchase ? 'Purchase' : 'Paid')}
                  </span>
                  {ent.notes && <span className="m block">{ent.notes}</span>}
                </div>
                <b>
                  {ent.credit > 0
                    ? `+₹${paiseToRupees(ent.credit).toLocaleString('en-IN')}`
                    : `−₹${paiseToRupees(ent.debit).toLocaleString('en-IN')}`}
                </b>
              </div>
            );
          })
        )}
        <div className="r border-t border-[#DDE3D6] pt-1">
          <b>Total owed</b>
          <b className="d">₹{currentOwedRupees.toLocaleString('en-IN')}</b>
        </div>
      </div>
    </div>
  );
};
