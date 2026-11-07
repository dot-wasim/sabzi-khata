import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getSeller, getSellerLedger, updateSeller } from '../../api/sellers';
import { getVegetables } from '../../api/vegetables';
import { createPayment } from '../../api/payments';
import { SellerModal } from './SellerModal';
import { formatDate } from '../../utils/date';
import { paiseToRupees, rupeesToPaise } from '../../utils/currency';
import { Vegetable } from '../../utils/types';

export const SellerDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const sellerId = parseInt(id || '0');

  const [data, setData] = useState<any>(null);
  const [ledger, setLedger] = useState<any>(null);
  const [vegetables, setVegetables] = useState<Vegetable[]>([]);
  const [loading, setLoading] = useState(true);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [showPaymentBox, setShowPaymentBox] = useState(false);
  const [selectedPurchaseDetail, setSelectedPurchaseDetail] = useState<any>(null);

  const [paymentAmountRupees, setPaymentAmountRupees] = useState('');
  const [paymentMode, setPaymentMode] = useState<'CASH' | 'UPI' | 'BANK'>('CASH');
  const [paymentNote, setPaymentNote] = useState('');
  const [savingPayment, setSavingPayment] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [sellerRes, ledgerRes, vegRes] = await Promise.all([
        getSeller(sellerId),
        getSellerLedger(sellerId),
        getVegetables().catch(() => []),
      ]);
      setData(sellerRes);
      setLedger(ledgerRes);
      setVegetables(vegRes);
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
            const purchaseId = ent.purchaseId || ent.id;
            return (
              <div
                key={idx}
                onClick={() => {
                  if (isPurchase) {
                    setSelectedPurchaseDetail(ent);
                  }
                }}
                className={`r border-b border-[#DDE3D6] py-2 last:border-0 last:pb-0 items-center ${
                  isPurchase ? 'cursor-pointer hover:bg-emerald-50/50 rounded-lg px-1' : ''
                }`}
              >
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className={`font-semibold text-xs ${isPurchase ? 'text-[#1F6B45]' : ''}`}>
                      {formatDate(ent.date, 'd MMM')} · {ent.referenceId || (isPurchase ? 'Purchase' : 'Paid')}
                    </span>
                    {isPurchase && (
                      <span className="text-[10px] bg-emerald-100 text-[#1F6B45] font-bold px-1.5 py-0.2 rounded">
                        View 👁
                      </span>
                    )}
                  </div>
                  {ent.notes && <span className="m block text-xs">{ent.notes}</span>}
                </div>
                <div className="flex items-center gap-2">
                  <b>
                    {ent.credit > 0
                      ? `+₹${paiseToRupees(ent.credit).toLocaleString('en-IN')}`
                      : `−₹${paiseToRupees(ent.debit).toLocaleString('en-IN')}`}
                  </b>
                  {isPurchase && purchaseId && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/purchases/${purchaseId}`);
                      }}
                      className="text-[11px] font-bold text-[#1F6B45] hover:text-[#185336] bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded-md"
                    >
                      ✏️ Edit
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
        <div className="r border-t border-[#DDE3D6] pt-2">
          <b>Total owed</b>
          <b className="d">₹{currentOwedRupees.toLocaleString('en-IN')}</b>
        </div>
      </div>

      {/* Purchase Details Modal */}
      {selectedPurchaseDetail && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#F6F7F2] border-2 border-[#1F6B45] rounded-2xl max-w-md w-full p-5 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex justify-between items-start border-b border-[#DDE3D6] pb-3">
              <div>
                <span className="text-xs font-bold text-[#1F6B45] uppercase tracking-wider">Hussain Foods · Purchase Details</span>
                <h2 className="text-lg font-black text-[#1B2A1F]">
                  {selectedPurchaseDetail.referenceId ? `Entry #${selectedPurchaseDetail.referenceId}` : 'Purchase'} · {seller.name}
                </h2>
                <p className="text-xs text-gray-500">
                  तारीख: {formatDate(selectedPurchaseDetail.date, 'd MMMM yyyy')}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedPurchaseDetail(null)}
                className="w-8 h-8 rounded-full bg-gray-200 hover:bg-gray-300 text-gray-700 flex items-center justify-center font-bold text-lg"
              >
                ✕
              </button>
            </div>

            {/* Produce Line Items */}
            <div className="space-y-1">
              <span className="text-xs font-bold text-gray-700">सब्ज़ियों का विवरण (Produce Items):</span>
              <div className="bg-white rounded-xl border border-[#DDE3D6] overflow-hidden text-xs">
                <table className="w-full text-left">
                  <thead className="bg-[#E8EDE2] text-[#1B2A1F] font-bold">
                    <tr>
                      <th className="px-3 py-2">आइटम</th>
                      <th className="px-2 py-2 text-center">वज़न / Unit</th>
                      <th className="px-2 py-2 text-right">रेट</th>
                      <th className="px-3 py-2 text-right">रकम</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#DDE3D6]">
                    {selectedPurchaseDetail.items && selectedPurchaseDetail.items.length > 0 ? (
                      selectedPurchaseDetail.items.map((it: any, i: number) => {
                        const veg = vegetables.find((v) => v.id === Number(it.vegetableId));
                        const nameEn = it.nameEn || it.vegetableName || veg?.nameEn || 'Item';
                        const nameHi = it.nameHi || veg?.nameHi ? ` (${it.nameHi || veg?.nameHi})` : '';
                        const rateRupees = paiseToRupees(it.rate || 0);
                        const lineTotalRupees = paiseToRupees(it.lineTotal || (it.quantity * it.rate));

                        return (
                          <tr key={i} className="hover:bg-gray-50">
                            <td className="px-3 py-2 font-semibold text-[#1B2A1F]">
                              {nameEn}{nameHi}
                            </td>
                            <td className="px-2 py-2 text-center text-gray-600">
                              {it.quantity} {it.unit || 'kg'}
                            </td>
                            <td className="px-2 py-2 text-right font-medium">
                              ₹{rateRupees}
                            </td>
                            <td className="px-3 py-2 text-right font-bold text-[#1B2A1F]">
                              ₹{lineTotalRupees.toLocaleString('en-IN')}
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td className="px-3 py-2.5 font-semibold text-[#1B2A1F]" colSpan={3}>
                          सब्ज़ियों की खरीद (Produce Purchase)
                        </td>
                        <td className="px-3 py-2.5 text-right font-bold text-[#1B2A1F]">
                          ₹{paiseToRupees(selectedPurchaseDetail.credit).toLocaleString('en-IN')}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Calculations Breakdown */}
            <div className="bg-white rounded-xl border border-[#DDE3D6] p-3 text-xs space-y-1.5">
              {(selectedPurchaseDetail.transport > 0 || selectedPurchaseDetail.labour > 0) && (
                <>
                  {selectedPurchaseDetail.transport > 0 && (
                    <div className="flex justify-between text-gray-600">
                      <span>किराया (Transport Cost)</span>
                      <span>+ ₹{paiseToRupees(selectedPurchaseDetail.transport).toLocaleString('en-IN')}</span>
                    </div>
                  )}
                  {selectedPurchaseDetail.labour > 0 && (
                    <div className="flex justify-between text-gray-600">
                      <span>मजदूरी (Labour Cost)</span>
                      <span>+ ₹{paiseToRupees(selectedPurchaseDetail.labour).toLocaleString('en-IN')}</span>
                    </div>
                  )}
                </>
              )}

              <div className="flex justify-between text-gray-700 font-bold border-t border-[#DDE3D6] pt-1">
                <span>कुल खरीद (Total Purchase)</span>
                <span>₹{paiseToRupees(selectedPurchaseDetail.credit).toLocaleString('en-IN')}</span>
              </div>

              {selectedPurchaseDetail.paidNow > 0 && (
                <div className="flex justify-between text-emerald-700 font-semibold">
                  <span>खरीद के समय नकद दिया (Paid Now)</span>
                  <span>− ₹{paiseToRupees(selectedPurchaseDetail.paidNow).toLocaleString('en-IN')}</span>
                </div>
              )}
            </div>

            {/* Action buttons */}
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  const pId = selectedPurchaseDetail.purchaseId || selectedPurchaseDetail.id;
                  setSelectedPurchaseDetail(null);
                  if (pId) {
                    navigate(`/purchases/${pId}`);
                  }
                }}
                className="flex-1 bg-white hover:bg-gray-100 text-[#1F6B45] border border-[#1F6B45] font-bold py-2.5 px-3 rounded-xl cursor-pointer text-xs text-center"
              >
                ✏️ बिल एडिट करें (Edit Purchase Bill)
              </button>
              <button
                type="button"
                onClick={() => setSelectedPurchaseDetail(null)}
                className="flex-1 bg-[#1F6B45] hover:bg-[#185336] text-white font-bold py-2.5 px-3 rounded-xl cursor-pointer text-xs text-center"
              >
                बंद करें (Close)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
