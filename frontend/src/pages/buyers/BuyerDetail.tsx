import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getBuyer, getBuyerLedger, updateBuyer } from '../../api/buyers';
import { createPayment } from '../../api/payments';
import { BuyerModal } from './BuyerModal';
import { formatDate } from '../../utils/date';
import { paiseToRupees, rupeesToPaise } from '../../utils/currency';

export const BuyerDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const buyerId = parseInt(id || '0');

  const [data, setData] = useState<any>(null);
  const [ledger, setLedger] = useState<any>(null);
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
      const [buyerRes, ledgerRes] = await Promise.all([
        getBuyer(buyerId),
        getBuyerLedger(buyerId),
      ]);
      setData(buyerRes);
      setLedger(ledgerRes);
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
                  <tr key={idx} className="hover:bg-gray-50">
                    <td className="px-3 py-2.5 font-semibold text-gray-700 whitespace-nowrap">
                      {formatDate(entry.date, 'd MMM')}
                    </td>
                    <td className="px-3 py-2.5">
                      <span className={isSale ? 'font-bold text-[#1F6B45]' : isOpening ? 'font-bold text-amber-700' : 'font-bold text-emerald-700'}>
                        {entry.referenceId || (isSale ? 'Bill' : 'Payment')}
                      </span>
                      {entry.notes && (
                        <span className="text-[10px] text-gray-500 block truncate max-w-[110px]">
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
                      ₹{paiseToRupees(entry.runningBalance !== undefined ? entry.runningBalance : (entry.balance || 0)).toLocaleString('en-IN')}
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
            <div key={idx} className="c">
              <div className="r">
                <span className="font-bold text-sm">
                  {formatDate(entry.date, 'd MMM')} · {entry.referenceId || (isSale ? 'Bill' : 'Payment')}
                </span>
                <span className="d">
                  Due ₹{paiseToRupees(entry.runningBalance !== undefined ? entry.runningBalance : (entry.balance || 0)).toLocaleString('en-IN')}
                </span>
              </div>
              <div className="r text-xs">
                <span className="m">
                  {isSale ? 'Amount charged' : `Paid via ${entry.paymentMethod || 'cash'}`}
                </span>
                <b>
                  {entry.debit > 0
                    ? `+₹${paiseToRupees(entry.debit).toLocaleString('en-IN')}`
                    : `−₹${paiseToRupees(entry.credit).toLocaleString('en-IN')}`}
                </b>
              </div>
            </div>
          );
        })
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
