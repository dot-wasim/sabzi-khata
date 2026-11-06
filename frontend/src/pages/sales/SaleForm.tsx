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
import { offlineDb } from '../../storage/offlineDb';

interface FormLineItem {
  vegetableId: number;
  quantity: string;
  unit: string;
  rateRupees: string;
  crateCount?: string;
  kgPerCrate?: string;
  isCrateMode?: boolean;
}

export const SaleForm: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEdit = !!id;
  const { openWhatsAppModal } = useSimulator();

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
              rateRupees: String(paiseToRupees(it.rate)),
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

      if (copy[idx].isCrateMode && (field === 'crateCount' || field === 'kgPerCrate')) {
        const crates = parseFloat(copy[idx].crateCount || '0');
        const kgPer = parseFloat(copy[idx].kgPerCrate || '25');
        copy[idx].quantity = String(crates * kgPer);
      }

      return copy;
    });
  };

  // Calculations
  const todayTotalRupees = items.reduce((sum, it) => {
    const qty = parseFloat(it.quantity) || 0;
    const rate = parseFloat(it.rateRupees) || 0;
    return sum + qty * rate;
  }, 0);

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
        items: validItems.map((it) => ({
          vegetableId: Number(it.vegetableId),
          quantity: parseFloat(it.quantity) || 0,
          unit: it.unit || 'kg',
          rate: rupeesToPaise(parseFloat(it.rateRupees) || 0),
        })),
        paidAmount: rupeesToPaise(paidNowVal),
        paymentMethod: paymentMode,
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
        const lineTotal = (parseFloat(it.quantity) || 0) * (parseFloat(it.rateRupees) || 0);
        return `• ${veg?.nameEn || 'Item'} (${veg?.nameHi || ''}): ${it.quantity} kg @ ₹${it.rateRupees} = ₹${lineTotal.toLocaleString('en-IN')}`;
      })
      .join('\n');

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
        <h1 className="h">Sell Desk</h1>
        <span className="m">Works offline · backed up 2h ago</span>
      </div>

      {/* Tabs */}
      <div className="t">
        <button type="button" onClick={() => navigate('/')}>Home</button>
        <button type="button" className="on">Bill</button>
        <button type="button" onClick={() => navigate('/buyers')}>Accounts</button>
        <button type="button" onClick={() => navigate('/vegetables')}>Vegetables</button>
        <button type="button" onClick={() => navigate('/sales')}>Dashboard</button>
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
          const lineTotal =
            (parseFloat(item.quantity) || 0) * (parseFloat(item.rateRupees) || 0);

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
                    <span className="m">kg · ₹</span>
                    <input
                      type="number"
                      step="any"
                      placeholder="Rate"
                      value={item.rateRupees}
                      onChange={(e) => handleItemChange(idx, 'rateRupees', e.target.value)}
                      className="w-16 border border-[#DDE3D6] rounded-md px-2 py-0.5 text-xs bg-white"
                    />
                    <span className="m">/kg</span>

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

                <b className="text-base">₹{lineTotal.toLocaleString('en-IN')}</b>
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
