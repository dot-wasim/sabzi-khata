import React, { useState, useEffect } from 'react';
import { Modal } from '../../components/Modal';
import { getSellers } from '../../api/sellers';
import { getBuyers } from '../../api/buyers';
import { getAccounts } from '../../api/accounts';
import { Seller, Buyer, Account } from '../../utils/types';
import { PAYMENT_MODES } from '../../utils/constants';
import { toInputDate } from '../../utils/date';
import { rupeesToPaise } from '../../utils/currency';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: any) => Promise<void>;
  defaultDirection?: 'PAID_TO_SELLER' | 'RECEIVED_FROM_BUYER';
  initialBuyerId?: number;
  initialSellerId?: number;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  isOpen,
  onClose,
  onSave,
  defaultDirection = 'PAID_TO_SELLER',
  initialBuyerId,
  initialSellerId,
}) => {
  const [direction, setDirection] = useState<'PAID_TO_SELLER' | 'RECEIVED_FROM_BUYER'>(defaultDirection);
  const [date, setDate] = useState(toInputDate(new Date()));
  const [sellerId, setSellerId] = useState<number | ''>(initialSellerId || '');
  const [buyerId, setBuyerId] = useState<number | ''>(initialBuyerId || '');
  const [accountId, setAccountId] = useState<number | ''>(1);
  const [amountRupees, setAmountRupees] = useState('');
  const [mode, setMode] = useState('Cash');
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');

  const [sellers, setSellers] = useState<Seller[]>([]);
  const [buyers, setBuyers] = useState<Buyer[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setDirection(defaultDirection);
      setDate(toInputDate(new Date()));
      setSellerId(initialSellerId || '');
      setBuyerId(initialBuyerId || '');
      setAmountRupees('');
      setMode('Cash');
      setReference('');
      setNotes('');

      Promise.all([getSellers(), getBuyers(), getAccounts()]).then(([s, b, accs]) => {
        setSellers(s);
        setBuyers(b);
        setAccounts(accs);
        if (accs.length > 0) {
          setAccountId(accs[0].id);
        }
      });
    }
  }, [isOpen, defaultDirection, initialBuyerId, initialSellerId]);

  // Auto-switch account based on payment mode
  const handleModeChange = (newMode: string) => {
    setMode(newMode);
    if (newMode === 'UPI') {
      const upiAcc = accounts.find((a) => a.type === 'UPI');
      if (upiAcc) setAccountId(upiAcc.id);
    } else if (newMode === 'Bank' || newMode === 'Cheque') {
      const bankAcc = accounts.find((a) => a.type === 'BANK');
      if (bankAcc) setAccountId(bankAcc.id);
    } else {
      const cashAcc = accounts.find((a) => a.type === 'CASH');
      if (cashAcc) setAccountId(cashAcc.id);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (direction === 'PAID_TO_SELLER' && !sellerId) {
      alert('कृपया विक्रेता / किसान चुनें');
      return;
    }
    if (direction === 'RECEIVED_FROM_BUYER' && !buyerId) {
      alert('कृपया ग्राहक चुनें (Please select customer)');
      return;
    }
    const paise = rupeesToPaise(amountRupees);
    if (paise <= 0) {
      alert('रकम शून्य से अधिक होनी चाहिए');
      return;
    }

    setLoading(true);
    try {
      await onSave({
        date,
        direction,
        sellerId: direction === 'PAID_TO_SELLER' ? Number(sellerId) : undefined,
        buyerId: direction === 'RECEIVED_FROM_BUYER' ? Number(buyerId) : undefined,
        accountId: Number(accountId) || 1,
        amount: paise,
        mode,
        reference: reference.trim() || undefined,
        notes: notes.trim() || undefined,
      });
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="रुपया जमा / भुगतान पर्ची (Record Payment)"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Direction Switch */}
        <div className="grid grid-cols-2 gap-2 p-1 bg-gray-100 rounded-xl">
          <button
            type="button"
            onClick={() => setDirection('RECEIVED_FROM_BUYER')}
            className={`py-2 text-xs font-bold rounded-lg transition-all ${
              direction === 'RECEIVED_FROM_BUYER'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            From Buyer (ग्राहक से मिला)
          </button>
          <button
            type="button"
            onClick={() => setDirection('PAID_TO_SELLER')}
            className={`py-2 text-xs font-bold rounded-lg transition-all ${
              direction === 'PAID_TO_SELLER'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Pay Seller (किसान को दिया)
          </button>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
            Date (तारीख) *
          </label>
          <input
            type="date"
            required
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full px-3.5 py-2 border border-gray-200 rounded-xl text-sm"
          />
        </div>

        {direction === 'PAID_TO_SELLER' ? (
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
              Select Seller / Farmer *
            </label>
            <select
              required
              value={sellerId}
              onChange={(e) => setSellerId(Number(e.target.value))}
              className="w-full px-3.5 py-2 border border-gray-200 rounded-xl text-sm"
            >
              <option value="">Select Seller...</option>
              {sellers.map((s) => (
                <option key={s.id} value={s.id}>{s.name} {s.village ? `(${s.village})` : ''}</option>
              ))}
            </select>
          </div>
        ) : (
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
              Select Buyer / Customer *
            </label>
            <select
              required
              value={buyerId}
              onChange={(e) => setBuyerId(Number(e.target.value))}
              className="w-full px-3.5 py-2 border border-gray-200 rounded-xl text-sm font-semibold text-gray-900"
            >
              <option value="">Select Customer...</option>
              {buyers.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} {b.phone ? `(${b.phone})` : ''} - बाकी: ₹{((b.currentDue !== undefined ? b.currentDue : b.openingBalance || 0) / 100).toLocaleString('en-IN')}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
              Amount (रुपये ₹) *
            </label>
            <input
              type="number"
              step="any"
              inputMode="decimal"
              required
              placeholder="0"
              value={amountRupees}
              onChange={(e) => setAmountRupees(e.target.value)}
              className="w-full px-3.5 py-2 border border-gray-200 rounded-xl text-base font-bold text-gray-900"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
              Payment Mode
            </label>
            <select
              value={mode}
              onChange={(e) => handleModeChange(e.target.value)}
              className="w-full px-3.5 py-2 border border-gray-200 rounded-xl text-sm"
            >
              {PAYMENT_MODES.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Deposit/Withdraw Account */}
        <div>
          <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
            खाता (Account) *
          </label>
          <select
            value={accountId}
            onChange={(e) => setAccountId(Number(e.target.value))}
            className="w-full px-3.5 py-2 border border-gray-200 rounded-xl text-sm font-medium bg-emerald-50/50 text-emerald-950"
          >
            {accounts.map((acc) => (
              <option key={acc.id} value={acc.id}>
                {acc.name} (बैलेंस: ₹{Math.round((acc.liveBalance || acc.currentBalance || 0) / 100).toLocaleString('en-IN')})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
            Reference / UPI UTR / Cheque No.
          </label>
          <input
            type="text"
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            placeholder="e.g. UPI Ref #93420..."
            className="w-full px-3.5 py-2 border border-gray-200 rounded-xl text-sm"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
            Notes (विवरण)
          </label>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. बकाया वसूली / सुबह का भुगतान"
            className="w-full px-3.5 py-2 border border-gray-200 rounded-xl text-sm"
          />
        </div>

        <div className="flex gap-3 pt-3 border-t border-gray-100">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 border border-gray-200 text-gray-700 rounded-xl text-sm font-semibold hover:bg-gray-50"
          >
            रद्द करें (Cancel)
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold shadow-xs transition-colors"
          >
            {loading ? 'सहेज रहे हैं...' : 'जमा करें (Save Payment)'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
