import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getBuyers, createBuyer } from '../../api/buyers';
import { getVegetables } from '../../api/vegetables';
import { getAccounts } from '../../api/accounts';
import { createSale, getSale, updateSale, getSales } from '../../api/sales';
import { Buyer, Vegetable, Account } from '../../utils/types';
import { BuyerModal } from '../buyers/BuyerModal';
import { VegetableModal } from '../vegetables/VegetableModal';
import { toInputDate, formatDate } from '../../utils/date';
import { rupeesToPaise, paiseToRupees } from '../../utils/currency';
import { useSimulator } from '../../context/SimulatorContext';
import { useDeskMode } from '../../context/DeskModeContext';
import { offlineDb } from '../../storage/offlineDb';

interface FormLineItem {
  vegetableId: number;
  quantity: string;
  unit: string;
  rateRupees: string;
  crateCount?: string;
  kgPerCrate?: string;
  isCrateMode?: boolean;
  isRatePending?: boolean;
}

export const SaleForm: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEdit = !!id;
  const { openWhatsAppModal } = useSimulator();
  const { setMode } = useDeskMode();

  const [buyers, setBuyers] = useState<Buyer[]>([]);
  const [vegetables, setVegetables] = useState<Vegetable[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [buyerModalOpen, setBuyerModalOpen] = useState(false);
  const [vegModalOpen, setVegModalOpen] = useState(false);

  // Form fields
  const [date, setDate] = useState(toInputDate(new Date()));
  const [buyerId, setBuyerId] = useState<number | ''>('');
  const [items, setItems] = useState<FormLineItem[]>([
    { vegetableId: 0, quantity: '', unit: 'kg', rateRupees: '' },
  ]);

  const [paidNowRupees, setPaidNowRupees] = useState('');
  const [paymentMode, setPaymentMode] = useState<'CASH' | 'UPI' | 'BANK' | 'CHEQUE'>('UPI');
  const [accountId, setAccountId] = useState<number | ''>('');
  const [nextBillNo, setNextBillNo] = useState<number>(1);
  const [savedSaleId, setSavedSaleId] = useState<number | null>(null);
  const [customerRecentEntries, setCustomerRecentEntries] = useState<any[]>([]);
  const [showSavedModal, setShowSavedModal] = useState(false);
  const [savedBillSummary, setSavedBillSummary] = useState<{
    billNo: number | string;
    customerName: string;
    todayTotal: number;
    balanceDue: number;
    paidAmount: number;
  } | null>(null);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      try {
        const [buyersData, vegData, accData, salesData] = await Promise.all([
          getBuyers(),
          getVegetables(),
          getAccounts(),
          getSales({ limit: 500 }).catch(() => ({ sales: [] })),
        ]);
        setBuyers(buyersData);
        setVegetables(vegData);
        setAccounts(accData);

        const salesList = (salesData as any)?.sales || [];
        const maxBill = salesList.reduce((m: number, s: any) => Math.max(m, s.billNo || 0), 0);
        setNextBillNo(maxBill > 0 ? maxBill + 1 : salesList.length + 1);

        const defaultAcc = accData.find((a) => a.isDefault) || accData[0];
        if (defaultAcc && !isEdit) {
          setAccountId(defaultAcc.id);
        }

        if (isEdit) {
          const s = await getSale(parseInt(id));
          setDate(toInputDate(new Date(s.date)));
          setBuyerId(s.buyerId);
          setAccountId(s.accountId || (defaultAcc ? defaultAcc.id : ''));
          setPaidNowRupees(String(paiseToRupees((s as any).paidAmount || (s as any).paid || 0)));
          setSavedSaleId(s.id);
          setItems(
            s.items.map((it: any) => ({
              vegetableId: it.vegetableId,
              quantity: String(it.quantity),
              unit: it.unit || 'kg',
              rateRupees: it.isRatePending || !it.rate ? '' : String(paiseToRupees(it.rate)),
              isRatePending: Boolean(it.isRatePending || !it.rate),
            }))
          );
        } else if (buyersData.length > 0) {
          setBuyerId(buyersData[0].id);
        }
      } catch (err) {
        console.error('Failed to initialize sale form:', err);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [id, isEdit]);

  // Load customer ledger snippet when buyerId changes
  useEffect(() => {
    if (!buyerId) {
      setCustomerRecentEntries([]);
      return;
    }
    offlineDb.getBuyerLedger(Number(buyerId)).then((ledger) => {
      if (ledger?.entries) {
        setCustomerRecentEntries(ledger.entries.slice(-3).reverse());
      }
    }).catch(() => {});
  }, [buyerId]);

  const selectedBuyer = buyers.find((b) => b.id === Number(buyerId));
  const previousDuePaise = selectedBuyer?.currentBalance || 0;
  const previousDueRupees = paiseToRupees(previousDuePaise);

  const handleAddItem = () => {
    setItems((prev) => [
      ...prev,
      { vegetableId: 0, quantity: '', unit: 'kg', rateRupees: '' },
    ]);
  };

  const handleRemoveItem = (idx: number) => {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleItemChange = (
    idx: number,
    field: keyof FormLineItem,
    value: any
  ) => {
    setItems((prev) => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], [field]: value };

      if (field === 'vegetableId') {
        const veg = vegetables.find((v) => v.id === Number(value));
        if (veg) {
          if (veg.defaultCrateKg) {
            copy[idx].kgPerCrate = String(veg.defaultCrateKg);
          }
        }
      }

      if (field === 'rateRupees') {
        const num = parseFloat(value);
        if (!isNaN(num) && num > 0) {
          copy[idx].isRatePending = false;
        }
      }

      if (copy[idx].isCrateMode && (field === 'crateCount' || field === 'kgPerCrate')) {
        const crates = parseFloat(copy[idx].crateCount || '0');
        const kgPer = parseFloat(copy[idx].kgPerCrate || '25');
        copy[idx].quantity = String(crates * kgPer);
      }

      return copy;
    });
  };

  const toggleRatePending = (idx: number) => {
    setItems((prev) => {
      const copy = [...prev];
      const isCurrentlyPending = Boolean(copy[idx].isRatePending || !copy[idx].rateRupees || parseFloat(copy[idx].rateRupees) === 0);
      copy[idx] = {
        ...copy[idx],
        isRatePending: !isCurrentlyPending,
        rateRupees: !isCurrentlyPending ? '' : copy[idx].rateRupees,
      };
      return copy;
    });
  };

  // Calculations
  const todayTotalRupees = items.reduce((sum, it) => {
    const rateVal = parseFloat(it.rateRupees) || 0;
    if (it.isRatePending || rateVal === 0) return sum;
    const qty = parseFloat(it.quantity) || 0;
    return sum + qty * rateVal;
  }, 0);

  const hasPendingItems = items.some(
    (it) => it.vegetableId && (it.isRatePending || !it.rateRupees || parseFloat(it.rateRupees) === 0)
  );

  const grandTotalRupees = todayTotalRupees + previousDueRupees;
  const paidNowVal = parseFloat(paidNowRupees) || 0;
  const balanceDueRupees = Math.max(0, grandTotalRupees - paidNowVal);

  const handleSaveBill = async (): Promise<number | null> => {
    if (!buyerId) {
      alert('कृपया ग्राहक चुनें (Please select customer)');
      return null;
    }
    const validItems = items.filter(
      (it) => it.vegetableId && (parseFloat(it.quantity) || 0) > 0
    );
    if (validItems.length === 0) {
      alert('कृपया कम से कम एक सब्ज़ी जोड़ें (Add at least 1 vegetable)');
      return null;
    }

    setSaving(true);
    try {
      const payload: any = {
        date: new Date(date).toISOString(),
        buyerId: Number(buyerId),
        billNo: isEdit ? undefined : nextBillNo,
        items: validItems.map((it) => {
          const rateVal = parseFloat(it.rateRupees) || 0;
          const isPending = Boolean(it.isRatePending || rateVal === 0);
          return {
            vegetableId: Number(it.vegetableId),
            quantity: parseFloat(it.quantity) || 0,
            unit: it.unit || 'kg',
            rate: isPending ? 0 : rupeesToPaise(rateVal),
            isRatePending: isPending,
          };
        }),
        paidAmount: rupeesToPaise(paidNowVal),
        receivedNow: rupeesToPaise(paidNowVal),
        paid: rupeesToPaise(paidNowVal),
        paymentMethod: paymentMode,
        paymentMode: paymentMode,
        accountId: accountId ? Number(accountId) : undefined,
      };

      let resultId = savedSaleId;
      if (isEdit && id) {
        await updateSale(parseInt(id), payload);
        resultId = parseInt(id);
      } else {
        const res = await createSale(payload);
        resultId = res.id;
        setSavedSaleId(res.id);
      }

      setSavedBillSummary({
        billNo: isEdit ? id : nextBillNo,
        customerName: selectedBuyer?.name || 'Customer',
        todayTotal: todayTotalRupees,
        balanceDue: balanceDueRupees,
        paidAmount: paidNowVal,
      });
      setShowSavedModal(true);

      return resultId || null;
    } catch (err: any) {
      alert(`त्रुटि: ${err.message || 'बिल सेव नहीं हो पाया'}`);
      return null;
    } finally {
      setSaving(false);
    }
  };

  const handleShareWhatsApp = async () => {
    let saleId = savedSaleId;
    if (!saleId) {
      saleId = await handleSaveBill();
    }
    if (!saleId) return;

    const buyerName = selectedBuyer?.name || 'Customer';
    const linesText = items
      .filter((it) => it.vegetableId)
      .map((it) => {
        const veg = vegetables.find((v) => v.id === Number(it.vegetableId));
        const rateVal = parseFloat(it.rateRupees) || 0;
        const isPending = Boolean(it.isRatePending || rateVal === 0);
        if (isPending) {
          return `• ${veg?.nameEn || 'Item'} (${veg?.nameHi || ''}): ${it.quantity} kg @ [⏳ भाव 10 AM पर मंडी से तय होगा]`;
        }
        const lineTotal = (parseFloat(it.quantity) || 0) * rateVal;
        return `• ${veg?.nameEn || 'Item'} (${veg?.nameHi || ''}): ${it.quantity} kg @ ₹${it.rateRupees} = ₹${lineTotal.toLocaleString('en-IN')}`;
      })
      .join('\n');

    const pendingNote = hasPendingItems
      ? `\n⚠️ *नोट: कुछ सब्ज़ियों का भाव 10:00 AM पर मंडी से आने के बाद कुल जोड़ अपडेट होगा।*\n`
      : '';

    const slip = `*Hussain Foods — Sabzi Khata*\n` +
      `बिल #${isEdit ? id : nextBillNo} | तारीख: ${formatDate(date, 'd MMM yyyy')}\n` +
      `ग्राहक: ${buyerName}\n` +
      `---------------------------------\n` +
      `${linesText}\n` +
      `---------------------------------\n` +
      `आज का कुल (Today): ₹${todayTotalRupees.toLocaleString('en-IN')}\n` +
      `पिछला बाकी (Prev Due): ₹${previousDueRupees.toLocaleString('en-IN')}\n` +
      `*कुल जोड़ (Grand Total): ₹${grandTotalRupees.toLocaleString('en-IN')}*\n` +
      `आज जमा (Paid): ₹${paidNowVal.toLocaleString('en-IN')} (${paymentMode})\n` +
      `*बाकी (Balance Due): ₹${balanceDueRupees.toLocaleString('en-IN')}*\n` +
      pendingNote +
      `\nधन्यवाद! 🙏 Hussain Foods`;

    openWhatsAppModal(slip, selectedBuyer?.phone || undefined, buyerName);
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
        <h1 className="h">Bill</h1>
        <span className="m">Works offline</span>
      </div>

      {/* Customer Header Card */}
      <div className="c">
        <div className="r">
          <div className="flex items-center gap-2">
            <span className="m font-bold">Customer</span>
            <button
              type="button"
              onClick={() => setBuyerModalOpen(true)}
              className="text-xs font-bold text-[#1F6B45] hover:underline cursor-pointer bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200"
            >
              + Add Customer
            </button>
          </div>
          <span className="m">
            Bill no. {isEdit ? id : nextBillNo} · {formatDate(date, 'd MMM')}
          </span>
        </div>
        <div className="r">
          <div className="flex-1">
            <select
              value={buyerId}
              onChange={(e) => {
                if (e.target.value === '__new__') {
                  setBuyerModalOpen(true);
                } else {
                  setBuyerId(Number(e.target.value));
                }
              }}
              className="w-full font-bold text-base bg-transparent border-0 focus:outline-hidden cursor-pointer"
            >
              <option value="">-- ग्राहक चुनें / Select Customer --</option>
              <option value="__new__">✨ + नया ग्राहक जोड़ें (+ Add Customer)</option>
              {buyers.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} {b.shopName ? `(${b.shopName})` : ''}
                </option>
              ))}
            </select>
          </div>
          <span className="d">Previous due ₹{previousDueRupees.toLocaleString('en-IN')}</span>
        </div>
      </div>

      {/* Produce Items List Card */}
      <div className="c">
        {items.map((item, idx) => {
          const veg = vegetables.find((v) => v.id === Number(item.vegetableId));
          const rateVal = parseFloat(item.rateRupees) || 0;
          const isPending = Boolean(item.isRatePending || rateVal === 0);
          const lineTotal = isPending ? 0 : (parseFloat(item.quantity) || 0) * rateVal;

          return (
            <div key={idx} className="border-b border-[#DDE3D6] pb-2 last:border-0 last:pb-0">
              <div className="r">
                <div className="flex-1">
                  <div className="flex items-center gap-1.5">
                    <select
                      value={item.vegetableId}
                      onChange={(e) => handleItemChange(idx, 'vegetableId', Number(e.target.value))}
                      className="font-bold text-sm bg-transparent border-0 focus:outline-hidden cursor-pointer"
                    >
                      <option value="0">सब्ज़ी चुनें / Select</option>
                      {vegetables.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.nameEn} {v.nameHi}
                        </option>
                      ))}
                    </select>
                    {veg && <span className="m">{veg.nameHi}</span>}
                  </div>

                  <div className="flex items-center gap-2 mt-1">
                    <input
                      type="number"
                      step="any"
                      placeholder="Qty"
                      value={item.quantity}
                      onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                      className="w-16 border border-[#DDE3D6] rounded-md px-2 py-0.5 text-xs bg-white"
                    />
                    <span className="m">kg ·</span>

                    {isPending ? (
                      <button
                        type="button"
                        onClick={() => toggleRatePending(idx)}
                        className="text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-300 rounded px-2 py-0.5 flex items-center gap-1 cursor-pointer hover:bg-amber-100"
                        title="Click to enter confirmed rate"
                      >
                        ⏳ भाव बाद में (10 AM)
                      </button>
                    ) : (
                      <div className="flex items-center gap-1">
                        <span className="m">₹</span>
                        <input
                          type="number"
                          step="any"
                          placeholder="Rate"
                          value={item.rateRupees}
                          onChange={(e) => handleItemChange(idx, 'rateRupees', e.target.value)}
                          className="w-16 border border-[#DDE3D6] rounded-md px-2 py-0.5 text-xs bg-white"
                        />
                        <span className="m">/kg</span>
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={() => toggleRatePending(idx)}
                      className={`text-[10px] px-1.5 py-0.5 rounded font-medium border cursor-pointer ${
                        isPending
                          ? 'text-gray-600 bg-gray-100 border-gray-300 hover:bg-gray-200'
                          : 'text-amber-800 bg-amber-50 border-amber-300 hover:bg-amber-100'
                      }`}
                      title={isPending ? 'भाव दर्ज करें' : 'भाव बाद में छोड़ें (10 AM मंडी भाव)'}
                    >
                      {isPending ? '✏️ भाव भरें' : '⏳ भाव बाद में'}
                    </button>

                    {items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(idx)}
                        className="text-xs text-rose-600 font-bold ml-auto"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>

                {isPending ? (
                  <span className="text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-1 rounded">
                    भाव बाकी
                  </span>
                ) : (
                  <b className="text-base">₹{lineTotal.toLocaleString('en-IN')}</b>
                )}
              </div>
            </div>
          );
        })}

        <button
          type="button"
          onClick={handleAddItem}
          className="b b2 mt-1"
        >
          + Add vegetable
        </button>
      </div>

      {/* Pending Mandi Rate Banner if any item has pending rate */}
      {hasPendingItems && (
        <div className="bg-amber-50 border border-amber-300 rounded-xl p-3 flex items-start gap-2.5 text-xs text-amber-900">
          <span className="text-base leading-none mt-0.5">⏳</span>
          <div className="flex-1">
            <b className="block text-amber-950 font-bold">मंडी भाव बाद में (Rate Pending - 10:00 AM)</b>
            <span>इस बिल में कुछ सब्ज़ियों के भाव बाकी हैं। 10:00 AM पर मंडी का भाव तय होने पर डैशबोर्ड से 1-क्लिक में सभी बिलों का भाव भर सकेंगे।</span>
          </div>
        </div>
      )}

      {/* Bill Totals & Payment Summary Card */}
      <div className="c">
        <div className="r">
          <span>Today’s total</span>
          <b>₹{todayTotalRupees.toLocaleString('en-IN')}</b>
        </div>
        <div className="r">
          <span>Previous due</span>
          <b>₹{previousDueRupees.toLocaleString('en-IN')}</b>
        </div>
        <div className="r">
          <span>Grand total</span>
          <b>₹{grandTotalRupees.toLocaleString('en-IN')}</b>
        </div>
        <div className="r">
          <span>Paid now</span>
          <div className="flex items-center gap-1">
            <span className="text-sm font-semibold">₹</span>
            <input
              type="number"
              step="any"
              placeholder="0"
              value={paidNowRupees}
              onChange={(e) => setPaidNowRupees(e.target.value)}
              className="w-24 border border-[#DDE3D6] rounded-lg px-2.5 py-1 text-right font-bold text-sm bg-white"
            />
          </div>
        </div>
        <div className="r">
          <span>Balance due</span>
          <b className="d">₹{balanceDueRupees.toLocaleString('en-IN')}</b>
        </div>

        <span className="m mt-1">Payment method</span>
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
          <button
            type="button"
            className={paymentMode === 'CHEQUE' ? 'on' : ''}
            onClick={() => setPaymentMode('CHEQUE')}
          >
            Cheque
          </button>
        </div>
      </div>

      {/* Customer Account Ledger Snippet */}
      {selectedBuyer && (
        <div className="c">
          <b>{selectedBuyer.name} · account</b>
          {customerRecentEntries.length > 0 ? (
            customerRecentEntries.map((ent: any, i: number) => (
              <div key={i} className="r">
                <span>
                  {formatDate(ent.date, 'd MMM')} · {ent.referenceId || ent.type}
                </span>
                <span>
                  {ent.debit > 0
                    ? `Due ₹${paiseToRupees(ent.debit).toLocaleString('en-IN')}`
                    : `−₹${paiseToRupees(ent.credit).toLocaleString('en-IN')}`}
                </span>
              </div>
            ))
          ) : (
            <span className="m">No recent entries</span>
          )}
          <div className="r border-t border-[#DDE3D6] pt-1">
            <b>Total due</b>
            <b className="d">₹{previousDueRupees.toLocaleString('en-IN')}</b>
          </div>
          <button
            type="button"
            onClick={() => navigate(`/buyers/${buyerId}`)}
            className="b b2"
          >
            Open customer ledger
          </button>
        </div>
      )}

      {/* Actions */}
      <button
        type="button"
        disabled={saving}
        onClick={handleSaveBill}
        className="b"
      >
        {saving ? 'Saving...' : 'Save Bill'}
      </button>

      <button
        type="button"
        onClick={handleShareWhatsApp}
        className="b b2"
      >
        Share bill on WhatsApp
      </button>

      <button
        type="button"
        onClick={() => window.print()}
        className="b b2"
      >
        Save as PDF
      </button>

      {/* Modals */}
      {showSavedModal && savedBillSummary && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#F6F7F2] border-2 border-[#1F6B45] rounded-2xl max-w-sm w-full p-5 shadow-2xl space-y-4">
            <div className="text-center space-y-1">
              <div className="w-12 h-12 bg-[#1F6B45] text-white rounded-full flex items-center justify-center mx-auto text-2xl font-bold shadow-md">
                ✓
              </div>
              <h2 className="text-lg font-bold text-[#1B2A1F]">बिल सेव हो गया! (Bill Saved)</h2>
              <p className="text-xs text-gray-600">
                Bill #{savedBillSummary.billNo} · {savedBillSummary.customerName}
              </p>
            </div>

            <div className="bg-white rounded-xl p-3 border border-[#DDE3D6] space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">आज का कुल (Today)</span>
                <span className="font-semibold text-[#1B2A1F]">₹{savedBillSummary.todayTotal.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">आज जमा (Paid Now)</span>
                <span className="font-semibold text-emerald-700">₹{savedBillSummary.paidAmount.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between border-t border-[#DDE3D6] pt-1.5 font-bold">
                <span className="text-gray-700">कुल बाकी (Total Due)</span>
                <span className="text-[#B4540A] text-base">₹{savedBillSummary.balanceDue.toLocaleString('en-IN')}</span>
              </div>
            </div>

            <div className="space-y-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  setShowSavedModal(false);
                  handleShareWhatsApp();
                }}
                className="w-full bg-[#25D366] hover:bg-[#20ba59] text-white font-bold py-2.5 px-4 rounded-xl shadow flex items-center justify-center gap-2 cursor-pointer text-sm"
              >
                <span>💬 WhatsApp पर पर्ची भेजें</span>
              </button>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowSavedModal(false);
                    // Reset form for next customer
                    setBuyerId('');
                    setItems([{ vegetableId: 0, quantity: '', unit: 'kg', rateRupees: '' }]);
                    setPaidNowRupees('');
                    setSavedSaleId(null);
                    setNextBillNo((prev) => prev + 1);
                  }}
                  className="flex-1 bg-[#1F6B45] hover:bg-[#185336] text-white font-bold py-2.5 px-3 rounded-xl cursor-pointer text-xs text-center"
                >
                  ➕ अगला बिल (New Bill)
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowSavedModal(false);
                    navigate('/sales');
                  }}
                  className="flex-1 bg-white hover:bg-gray-100 text-[#1B2A1F] border border-[#DDE3D6] font-semibold py-2.5 px-3 rounded-xl cursor-pointer text-xs text-center"
                >
                  📋 बिल लिस्ट (All Bills)
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {buyerModalOpen && (
        <BuyerModal
          isOpen={buyerModalOpen}
          onClose={() => setBuyerModalOpen(false)}
          onSave={async (formData) => {
            const newBuyer = await createBuyer(formData);
            const data = await getBuyers();
            setBuyers(data);
            if (newBuyer?.id) {
              setBuyerId(newBuyer.id);
            }
            setBuyerModalOpen(false);
          }}
        />
      )}
      {vegModalOpen && (
        <VegetableModal
          isOpen={vegModalOpen}
          onClose={() => setVegModalOpen(false)}
          onSuccess={async () => {
            const data = await getVegetables();
            setVegetables(data);
            setVegModalOpen(false);
          }}
        />
      )}
    </div>
  );
};
