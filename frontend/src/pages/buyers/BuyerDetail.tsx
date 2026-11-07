import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getBuyer, getBuyerLedger, updateBuyer } from '../../api/buyers';
import { getVegetables } from '../../api/vegetables';
import { createPayment } from '../../api/payments';
import { BuyerModal } from './BuyerModal';
import { formatDate } from '../../utils/date';
import { paiseToRupees, rupeesToPaise } from '../../utils/currency';
import { Vegetable } from '../../utils/types';

export const BuyerDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const buyerId = parseInt(id || '0');

  const [data, setData] = useState<any>(null);
  const [ledger, setLedger] = useState<any>(null);
  const [vegetables, setVegetables] = useState<Vegetable[]>([]);
  const [selectedBillDetail, setSelectedBillDetail] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [showPaymentBox, setShowPaymentBox] = useState(false);
  const [ledgerView, setLedgerView] = useState<'cards' | 'table'>('table');

  // Payment box inputs
  const [paymentAmountRupees, setPaymentAmountRupees] = useState('');
  const [paymentMode, setPaymentMode] = useState<'CASH' | 'UPI' | 'BANK' | 'CHEQUE' | 'OTHER'>('UPI');
  const [paymentNote, setPaymentNote] = useState('');
  const [savingPayment, setSavingPayment] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [buyerRes, ledgerRes, vegRes] = await Promise.all([
        getBuyer(buyerId),
        getBuyerLedger(buyerId),
        getVegetables(),
      ]);
      setData(buyerRes);
      setLedger(ledgerRes);
      setVegetables(vegRes);
    } catch (err) {
      console.error('Failed to load buyer detail:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (buyerId) fetchData();
  }, [buyerId]);

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
        <span className="m">Customer not found</span>
        <button type="button" onClick={() => navigate('/buyers')} className="b mt-4">
          Back to Accounts
        </button>
      </div>
    );
  }

  const { buyer, balanceReceivable } = data;
  const currentDueRupees = paiseToRupees(balanceReceivable);

  const handleSavePayment = async () => {
    const amt = parseFloat(paymentAmountRupees);
    if (!amt || amt <= 0) {
      alert('कृपया वैध रकम दर्ज करें (Enter valid amount)');
      return;
    }

    setSavingPayment(true);
    try {
      await createPayment({
        direction: 'RECEIVED_FROM_BUYER',
        amount: rupeesToPaise(amt),
        date: new Date().toISOString(),
        paymentMethod: paymentMode,
        buyerId: buyerId,
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

  const handleWhatsAppReminder = () => {
    const msg = `नमस्ते ${buyer.name} जी,\nHussain Foods की तरफ से आपके खाते का पिछला बकाया ₹${currentDueRupees.toLocaleString('en-IN')} है।\nकृपया समय पर भुगतान करने का कष्ट करें।\nधन्यवाद!`;
    const cleanPhone = buyer.phone ? buyer.phone.replace(/[^0-9]/g, '') : '';
    const url = cleanPhone
      ? `https://wa.me/91${cleanPhone}?text=${encodeURIComponent(msg)}`
      : `https://wa.me/?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
  };

  const paymentAmtVal = parseFloat(paymentAmountRupees) || 0;
  const dueAfterPayment = Math.max(0, currentDueRupees - paymentAmtVal);

  return (
    <div className="s">
      {/* Top Header */}
      <div className="r">
        <h1 className="h">{buyer.name}</h1>
        <button
          type="button"
          onClick={() => navigate('/buyers')}
          className="text-xs font-semibold text-[#1F6B45]"
        >
          ← Back to Accounts
        </button>
      </div>

      {/* Customer Info Card */}
      <div className="c">
        <div className="r">
          <span className="m">Customer account</span>
          <span className="m">{buyer.phone || 'No phone'}</span>
        </div>
        <div className="r">
          <b>{buyer.shopName ? `${buyer.shopName}` : buyer.address || 'Hussain Foods'}</b>
          <b className="d text-base">Due ₹{currentDueRupees.toLocaleString('en-IN')}</b>
        </div>
      </div>

      {/* Quick Action Buttons */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setShowPaymentBox(!showPaymentBox)}
          className="b flex-1"
        >
          {showPaymentBox ? 'Close Payment' : '+ Receive payment'}
        </button>
        <button
          type="button"
          onClick={handleWhatsAppReminder}
          className="b b2 flex-1"
        >
          WhatsApp reminder
        </button>
        <button
          type="button"
          onClick={() => window.print()}
          className="b b2 px-3"
          title="Print statement"
        >
          Print
        </button>
      </div>

      {/* Receive Payment In-place Box (matches Payment.txt exactly) */}
      {showPaymentBox && (
        <div className="c border-2 border-[#1F6B45]">
          <b className="text-base">Receive payment</b>
          <label className="m" htmlFor="a">Amount received</label>
          <input
            id="a"
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
          <div className="t mt-1">
            <button
              type="button"
              className={paymentMode === 'CHEQUE' ? 'on' : ''}
              onClick={() => setPaymentMode('CHEQUE')}
            >
              Cheque
            </button>
            <button
              type="button"
              className={paymentMode === 'OTHER' ? 'on' : ''}
              onClick={() => setPaymentMode('OTHER')}
            >
              Other
            </button>
          </div>

          <label className="m mt-1" htmlFor="n">Note (optional)</label>
          <input
            id="n"
            type="text"
            placeholder="Example: paid by son"
            value={paymentNote}
            onChange={(e) => setPaymentNote(e.target.value)}
            className="min-h-[44px] border border-[#DDE3D6] rounded-[10px] px-3 text-sm bg-white"
          />

          <div className="border-t border-[#DDE3D6] pt-2 mt-1">
            <div className="r">
              <span className="m">Due after this payment</span>
              <b className="d">₹{dueAfterPayment.toLocaleString('en-IN')}</b>
            </div>
          </div>

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

      {/* Ledger Table Section */}
      <div className="r mt-1">
        <b>Account ledger</b>
        <div className="t">
          <button
            type="button"
            className={ledgerView === 'table' ? 'on' : ''}
            onClick={() => setLedgerView('table')}
            style={{ minHeight: '32px', padding: '0 8px', fontSize: '11px' }}
          >
            Table (PRD)
          </button>
          <button
            type="button"
            className={ledgerView === 'cards' ? 'on' : ''}
            onClick={() => setLedgerView('cards')}
            style={{ minHeight: '32px', padding: '0 8px', fontSize: '11px' }}
          >
            Cards
          </button>
        </div>
      </div>

      {ledger?.entries?.length === 0 ? (
        <div className="c text-center py-6 text-sm text-gray-500">
          कोई पुराना लेन-देन नहीं (No ledger entries)
        </div>
      ) : ledgerView === 'table' ? (
        /* PRD 4.4 Table Format */
        <div className="c p-0 overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#E8EDE2] text-[#1B2A1F] font-bold">
              <tr>
                <th className="px-3 py-2.5">तारीख</th>
                <th className="px-3 py-2.5">प्रविष्टि (Entry)</th>
                <th className="px-3 py-2.5 text-right">रकम</th>
                <th className="px-3 py-2.5 text-right">बकाया</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#DDE3D6]">
              {ledger?.entries?.map((entry: any, idx: number) => {
                const isSale = entry.type === 'SALE';
                const isOpening = entry.type === 'OPENING';
                return (
                  <tr
                    key={idx}
                    onClick={() => {
                      if (isSale) {
                        setSelectedBillDetail(entry);
                      }
                    }}
                    className={`transition-colors ${isSale ? 'cursor-pointer hover:bg-emerald-50/70' : 'hover:bg-gray-50'}`}
                    title={isSale ? 'Tap to view bill items and calculation details' : undefined}
                  >
                    <td className="px-3 py-2.5 font-semibold text-gray-700 whitespace-nowrap">
                      {formatDate(entry.date, 'd MMM')}
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-1.5">
                        <span className={isSale ? 'font-bold text-[#1F6B45]' : isOpening ? 'font-bold text-amber-700' : 'font-bold text-emerald-700'}>
                          {entry.referenceId || (isSale ? 'Bill' : 'Payment')}
                        </span>
                        {isSale && (
                          <span className="text-[10px] bg-emerald-100 text-[#1F6B45] font-bold px-1.5 py-0.2 rounded">
                            View 👁
                          </span>
                        )}
                      </div>
                      {entry.notes && (
                        <span className="text-[10px] text-gray-500 block truncate max-w-[120px]">
                          {entry.notes}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-right font-bold whitespace-nowrap">
                      {entry.debit > 0 ? (
                        <span>₹{paiseToRupees(entry.debit).toLocaleString('en-IN')}</span>
                      ) : (
                        <span className="text-emerald-700">₹{paiseToRupees(entry.credit).toLocaleString('en-IN')}</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-right font-black text-[#B4540A] whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <span>₹{paiseToRupees(entry.runningBalance !== undefined ? entry.runningBalance : (entry.balance || 0)).toLocaleString('en-IN')}</span>
                        {isSale && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              const bId = entry.saleId || entry.id || entry.billNo;
                              if (bId) navigate(`/sales/${bId}`);
                            }}
                            className="text-[11px] font-bold text-[#1F6B45] hover:text-[#185336] bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded-md ml-1"
                          >
                            ✏️ Edit
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        /* Cards View */
        ledger?.entries?.map((entry: any, idx: number) => {
          const isSale = entry.type === 'SALE';
          return (
            <div
              key={idx}
              onClick={() => {
                if (isSale) {
                  setSelectedBillDetail(entry);
                }
              }}
              className={`c transition-all ${isSale ? 'cursor-pointer hover:border-[#1F6B45]' : ''}`}
            >
              <div className="r">
                <span className="font-bold text-sm flex items-center gap-1.5">
                  {formatDate(entry.date, 'd MMM')} · {entry.referenceId || (isSale ? 'Bill' : 'Payment')}
                  {isSale && (
                    <span className="text-[10px] bg-emerald-100 text-[#1F6B45] font-bold px-1.5 py-0.2 rounded">
                      Items ▾
                    </span>
                  )}
                </span>
                <span className="d">
                  Due ₹{paiseToRupees(entry.runningBalance !== undefined ? entry.runningBalance : (entry.balance || 0)).toLocaleString('en-IN')}
                </span>
              </div>
              <div className="r text-xs">
                <span className="m">
                  {isSale ? 'Amount charged (Tap to view details)' : `Paid via ${entry.paymentMethod || 'cash'}`}
                </span>
                <div className="flex items-center gap-2">
                  <b>
                    {entry.debit > 0
                      ? `+₹${paiseToRupees(entry.debit).toLocaleString('en-IN')}`
                      : `−₹${paiseToRupees(entry.credit).toLocaleString('en-IN')}`}
                  </b>
                  {isSale && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        const bId = entry.saleId || entry.id || entry.billNo;
                        if (bId) navigate(`/sales/${bId}`);
                      }}
                      className="text-[11px] font-bold text-[#1F6B45] hover:text-[#185336] bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded-md"
                    >
                      ✏️ Edit
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })
      )}

      {/* Bill Items & Breakdown Detail Modal */}
      {selectedBillDetail && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#F6F7F2] border-2 border-[#1F6B45] rounded-2xl max-w-md w-full p-5 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex justify-between items-start border-b border-[#DDE3D6] pb-3">
              <div>
                <span className="text-xs font-bold text-[#1F6B45] uppercase tracking-wider">Hussain Foods · Bill Details</span>
                <h2 className="text-lg font-black text-[#1B2A1F]">
                  {selectedBillDetail.referenceId} · {buyer?.name}
                </h2>
                <p className="text-xs text-gray-500">
                  तारीख: {formatDate(selectedBillDetail.date, 'd MMMM yyyy')}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedBillDetail(null)}
                className="w-8 h-8 rounded-full bg-gray-200 hover:bg-gray-300 text-gray-700 flex items-center justify-center font-bold text-lg"
              >
                ✕
              </button>
            </div>

            {/* Produce Line Items */}
            <div className="space-y-1">
              <span className="text-xs font-bold text-gray-700">सब्ज़ियों का विवरण (Vegetable Line Items):</span>
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
                    {selectedBillDetail.items && selectedBillDetail.items.length > 0 ? (
                      selectedBillDetail.items.map((it: any, i: number) => {
                        const veg = it.vegetable || vegetables.find((v) => v.id === Number(it.vegetableId));
                        const nameEn = it.nameEn || it.vegetableName || veg?.nameEn || (it.vegetable?.nameEn) || 'Item';
                        const nameHi = it.nameHi || veg?.nameHi || (it.vegetable?.nameHi) ? ` (${it.nameHi || veg?.nameHi || it.vegetable?.nameHi})` : '';
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
                        <td className="px-3 py-2.5 font-semibold text-[#1B2A1F]">
                          {selectedBillDetail.notes ? 'सब्ज़ियों की खेप (Produce lot)' : 'सब्ज़ी (Vegetables)'}
                        </td>
                        <td className="px-2 py-2.5 text-center text-gray-600 font-semibold">
                          {selectedBillDetail.notes || '—'}
                        </td>
                        <td className="px-2 py-2.5 text-right font-medium text-gray-600">
                          {selectedBillDetail.notes && parseFloat(selectedBillDetail.notes)
                            ? `₹${Math.round(paiseToRupees(selectedBillDetail.debit) / (parseFloat(selectedBillDetail.notes) || 1))}/kg`
                            : '—'}
                        </td>
                        <td className="px-3 py-2.5 text-right font-bold text-[#1B2A1F]">
                          ₹{paiseToRupees(selectedBillDetail.debit).toLocaleString('en-IN')}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Step-by-Step Ledger Math Calculation */}
            <div className="bg-white rounded-xl p-3 border border-[#DDE3D6] space-y-2 text-xs">
              <span className="font-bold text-gray-800 block border-b border-gray-100 pb-1">
                बकाया का पूरा हिसाब (How Balance was Calculated):
              </span>
              
              <div className="flex justify-between text-gray-600">
                <span>आज का माल (Today's Sale Total)</span>
                <span className="font-bold text-[#1B2A1F]">
                  + ₹{paiseToRupees(selectedBillDetail.debit).toLocaleString('en-IN')}
                </span>
              </div>

              <div className="flex justify-between text-gray-600">
                <span>पिछला बकाया (Previous Due carried forward)</span>
                <span className="font-semibold text-gray-700">
                  + ₹{paiseToRupees(
                    selectedBillDetail.previousDue !== undefined
                      ? selectedBillDetail.previousDue
                      : Math.max(0, (selectedBillDetail.runningBalance !== undefined ? selectedBillDetail.runningBalance : selectedBillDetail.balance) - selectedBillDetail.debit + (selectedBillDetail.receivedNow || 0))
                  ).toLocaleString('en-IN')}
                </span>
              </div>

              <div className="flex justify-between font-bold text-gray-800 border-t border-dashed border-gray-200 pt-1">
                <span>कुल योग (Grand Total)</span>
                <span>
                  ₹{paiseToRupees(
                    selectedBillDetail.grandTotal !== undefined
                      ? selectedBillDetail.grandTotal
                      : (selectedBillDetail.runningBalance !== undefined ? selectedBillDetail.runningBalance : selectedBillDetail.balance) + (selectedBillDetail.receivedNow || 0)
                  ).toLocaleString('en-IN')}
                </span>
              </div>

              {selectedBillDetail.receivedNow > 0 && (
                <div className="flex justify-between text-emerald-700 font-semibold">
                  <span>बिल के समय जमा (Paid Now)</span>
                  <span>− ₹{paiseToRupees(selectedBillDetail.receivedNow).toLocaleString('en-IN')}</span>
                </div>
              )}

              <div className="flex justify-between border-t border-[#DDE3D6] pt-1.5 font-black text-sm">
                <span className="text-gray-800">इस बिल के बाद कुल बकाया (Balance After Bill)</span>
                <span className="text-[#B4540A]">
                  ₹{paiseToRupees(selectedBillDetail.runningBalance !== undefined ? selectedBillDetail.runningBalance : selectedBillDetail.balance).toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  const billId = selectedBillDetail.saleId || selectedBillDetail.id || selectedBillDetail.billNo;
                  setSelectedBillDetail(null);
                  if (billId) {
                    navigate(`/sales/${billId}`);
                  }
                }}
                className="flex-1 bg-white hover:bg-gray-100 text-[#1F6B45] border border-[#1F6B45] font-bold py-2.5 px-3 rounded-xl cursor-pointer text-xs text-center"
              >
                ✏️ बिल एडिट करें (Edit Bill)
              </button>
              <button
                type="button"
                onClick={() => setSelectedBillDetail(null)}
                className="flex-1 bg-[#1F6B45] hover:bg-[#185336] text-white font-bold py-2.5 px-3 rounded-xl cursor-pointer text-xs text-center"
              >
                बंद करें (Close)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Customer Modal */}
      {editModalOpen && (
        <BuyerModal
          isOpen={editModalOpen}
          buyer={buyer}
          onClose={() => setEditModalOpen(false)}
          onSave={async (formData) => {
            await updateBuyer(buyerId, formData);
            await fetchData();
            setEditModalOpen(false);
          }}
        />
      )}
    </div>
  );
};
