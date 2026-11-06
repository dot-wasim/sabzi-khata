import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getBuyers, createBuyer } from '../../api/buyers';
import { getVegetables } from '../../api/vegetables';
import { getAccounts } from '../../api/accounts';
import { createSale, getSale, updateSale } from '../../api/sales';
import { Buyer, Vegetable, Account } from '../../utils/types';
import { CurrencyDisplay } from '../../components/CurrencyDisplay';
import { BuyerModal } from '../buyers/BuyerModal';
import { VegetableModal } from '../vegetables/VegetableModal';
import { toInputDate, formatDate } from '../../utils/date';
import { rupeesToPaise, paiseToRupees } from '../../utils/currency';
import {
  ArrowLeft,
  Plus,
  Trash2,
  Share2,
  Check,
  Receipt,
  UserPlus
} from 'lucide-react';

interface FormLineItem {
  vegetableId: number;
  quantity: string;
  unit: string;
  rateRupees: string;
  crateCount?: string;
  kgPerCrate?: string;
  isTomatoCrateMode?: boolean;
}

export const SaleForm: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEdit = !!id;

  const [buyers, setBuyers] = useState<Buyer[]>([]);
  const [vegetables, setVegetables] = useState<Vegetable[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [buyerModalOpen, setBuyerModalOpen] = useState(false);
  const [vegModalOpen, setVegModalOpen] = useState(false);
  const [pendingVegItemIdx, setPendingVegItemIdx] = useState<number | null>(null);

  // Form fields
  const [date, setDate] = useState(toInputDate(new Date()));
  const [buyerId, setBuyerId] = useState<number | ''>('');
  const [items, setItems] = useState<FormLineItem[]>([
    { vegetableId: 0, quantity: '', unit: 'kg', rateRupees: '' },
  ]);

  // Deductions & Received now
  const [deductionAmountRupees, setDeductionAmountRupees] = useState('');
  const [deductionReason, setDeductionReason] = useState('');
  const [receivedNowRupees, setReceivedNowRupees] = useState('');
  const [accountId, setAccountId] = useState<number | ''>('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      try {
        const [buyersData, vegData, accData] = await Promise.all([
          getBuyers(),
          getVegetables(),
          getAccounts(),
        ]);
        setBuyers(buyersData);
        setVegetables(vegData);
        setAccounts(accData);

        const defaultAcc = accData.find((a) => a.isDefault) || accData[0];
        if (defaultAcc && !isEdit) {
          setAccountId(defaultAcc.id);
        }

        if (isEdit) {
          const s = await getSale(parseInt(id));
          setDate(toInputDate(new Date(s.date)));
          setBuyerId(s.buyerId);
          setAccountId(s.accountId || (defaultAcc ? defaultAcc.id : ''));
          setItems(
            s.items.map((it: any) => ({
              vegetableId: it.vegetableId,
              quantity: String(it.quantity),
              unit: it.unit,
              rateRupees: String(paiseToRupees(it.rate)),
            }))
          );
          if (s.deductionAmount) {
            setDeductionAmountRupees(String(paiseToRupees(s.deductionAmount)));
            setDeductionReason(s.deductionReason || '');
          }
          if (s.receivedNow) {
            setReceivedNowRupees(String(paiseToRupees(s.receivedNow)));
          }
          setNotes(s.notes || '');
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

  const handleAddItem = () => {
    setItems((prev) => [
      ...prev,
      { vegetableId: 0, quantity: '', unit: 'kg', rateRupees: '', crateCount: '', kgPerCrate: '25', isTomatoCrateMode: false },
    ]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: keyof FormLineItem, val: any) => {
    const updated = [...items];
    (updated[index] as any)[field] = val;

    // Check if vegetable selected is Tomato
    if (field === 'vegetableId') {
      const selectedVeg = vegetables.find((v) => v.id === Number(val));
      const isTomato = selectedVeg && (
        selectedVeg.nameEn.toLowerCase().includes('tomato') ||
        selectedVeg.nameHi.includes('टमाटर')
      );
      if (isTomato) {
        if (!updated[index].kgPerCrate) {
          updated[index].kgPerCrate = '25';
        }
      }
    }

    // Auto-calculate total kg if in Tomato Crate Mode
    if (updated[index].isTomatoCrateMode) {
      if (field === 'crateCount' || field === 'kgPerCrate') {
        const crates = parseFloat(field === 'crateCount' ? val : updated[index].crateCount || '0') || 0;
        const perCrate = parseFloat(field === 'kgPerCrate' ? val : updated[index].kgPerCrate || '25') || 0;
        if (crates > 0 && perCrate > 0) {
          updated[index].quantity = String(crates * perCrate);
        }
      }
    }

    setItems(updated);
  };

  // Calculations
  const lineTotals = items.map((it) => {
    const q = parseFloat(it.quantity) || 0;
    const r = parseFloat(it.rateRupees) || 0;
    return q * r;
  });

  const subtotalRupees = lineTotals.reduce((sum, val) => sum + val, 0);
  const deductionRupees = parseFloat(deductionAmountRupees) || 0;
  const netTotalRupees = Math.max(0, subtotalRupees - deductionRupees);
  const receivedRupees = parseFloat(receivedNowRupees) || 0;
  const thisBillDueRupees = Math.max(0, netTotalRupees - receivedRupees);

  const selectedBuyer = buyers.find((b) => b.id === Number(buyerId));
  const previousBalanceRupees = selectedBuyer
    ? paiseToRupees(selectedBuyer.currentBalance || 0)
    : 0;
  const totalKhataDueRupees = previousBalanceRupees + thisBillDueRupees;

  const handleCreateBuyer = async (formData: any) => {
    try {
      const newB = await createBuyer(formData);
      setBuyers((prev) => [newB, ...prev]);
      setBuyerId(newB.id);
      setBuyerModalOpen(false);
    } catch (err) {
      alert('Failed to create customer');
    }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!buyerId) {
      alert('कृपया ग्राहक चुनें (Please select a customer)');
      return;
    }

    const validItems = items.filter(
      (it) => it.vegetableId > 0 && parseFloat(it.quantity) > 0 && parseFloat(it.rateRupees) > 0
    );

    if (validItems.length === 0) {
      alert('कम से कम एक सामान जोड़ें (Please add at least one valid item)');
      return;
    }

    if (deductionRupees > 0 && !deductionReason.trim()) {
      alert('छूट का कारण लिखें (Please enter a deduction reason)');
      return;
    }

    setSaving(true);
    try {
      const selectedAcc = accounts.find((a) => a.id === Number(accountId));
      const payload: any = {
        date,
        buyerId: Number(buyerId),
        accountId: accountId ? Number(accountId) : undefined,
        paymentMode: selectedAcc ? selectedAcc.name : 'Cash',
        items: validItems.map((it) => ({
          vegetableId: Number(it.vegetableId),
          quantity: parseFloat(it.quantity),
          unit: it.unit,
          rate: rupeesToPaise(it.rateRupees),
        })),
        deductionAmount: deductionRupees > 0 ? rupeesToPaise(deductionRupees) : undefined,
        deductionReason: deductionReason.trim() || undefined,
        receivedNow: receivedRupees > 0 ? rupeesToPaise(receivedRupees) : undefined,
        notes: notes.trim() || undefined,
      };

      if (isEdit) {
        await updateSale(parseInt(id), payload);
      } else {
        await createSale(payload);
      }
      navigate('/sales');
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to save bill');
    } finally {
      setSaving(false);
    }
  };

  const handleShareWhatsApp = () => {
    const buyerName = selectedBuyer?.name || 'Walk-in';
    const itemsText = items
      .filter((it) => it.vegetableId > 0)
      .map((it) => {
        const veg = vegetables.find((v) => v.id === Number(it.vegetableId));
        const lineTotal = (parseFloat(it.quantity) || 0) * (parseFloat(it.rateRupees) || 0);
        return `• ${veg?.nameEn || 'Item'} (${it.quantity} ${it.unit} @ ₹${it.rateRupees}/${it.unit}) = ₹${lineTotal}`;
      })
      .join('\n');

    const msg = `*Hussain Foods — Vegetable Bill*
Date: ${formatDate(date, 'dd/MM/yyyy')}
Customer: ${buyerName}

*Items:*
${itemsText}

*Subtotal:* ₹${subtotalRupees}
${deductionRupees > 0 ? `*Deduction:* -₹${deductionRupees} (${deductionReason})\n` : ''}*Net Total:* ₹${netTotalRupees}
*Received:* ₹${receivedRupees}
*This Bill Due:* ₹${thisBillDueRupees}
*Total Khata Due:* ₹${totalKhataDueRupees}

_Thank you for your business!_`;

    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto bg-[#F6F4EC] min-h-screen text-[#1B2A1F] pb-36 shadow-lg rounded-2xl overflow-hidden font-sans">
      {/* Dark Green Mandi Header with Top Save Button */}
      <div className="bg-[#1F6B3A] text-white p-5 pb-6">
        <div className="flex items-center justify-between mb-2">
          <button
            onClick={() => navigate('/sales')}
            className="flex items-center gap-2 text-sm text-white/90 hover:text-white"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>वापस / Back</span>
          </button>

          <button
            type="button"
            disabled={saving}
            onClick={handleSubmit}
            className="px-3.5 py-1.5 bg-white text-[#1F6B3A] font-black text-xs rounded-xl shadow-md hover:bg-emerald-50 active:scale-95 flex items-center gap-1.5 transition-all"
          >
            <Check className="w-4 h-4 stroke-[3]" />
            <span>{saving ? 'सेव हो रहा...' : '💾 बिल सेव करें'}</span>
          </button>
        </div>

        <div className="flex items-baseline justify-between">
          <div>
            <h1 className="text-2xl font-bold">
              नया बिल <span className="text-base font-normal opacity-90">/ New Bill</span>
            </h1>
            <p className="text-xs text-white/80 mt-0.5">
              Hussain Foods · {formatDate(date, 'd MMM yyyy')}
            </p>
          </div>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="bg-white/10 text-white text-xs px-2.5 py-1.5 rounded-lg border border-white/20 focus:outline-hidden"
          />
        </div>
      </div>

      <div className="p-4 space-y-3.5 -mt-2">
        {/* Customer Select Card */}
        <div>
          <label className="text-xs font-semibold text-gray-600 mb-1.5 block">
            ग्राहक / Customer
          </label>
          <div className="flex gap-2">
            <select
              value={buyerId}
              onChange={(e) => setBuyerId(Number(e.target.value))}
              className="flex-1 min-h-[48px] bg-white border border-[#BDB8A2] rounded-xl px-3.5 text-base font-semibold text-[#1B2A1F] focus:outline-hidden focus:border-[#1F6B3A]"
            >
              <option value="">-- ग्राहक चुनें / Select Customer --</option>
              {buyers.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} {b.shopName ? `(${b.shopName})` : ''}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => setBuyerModalOpen(true)}
              className="min-h-[48px] px-3.5 bg-white text-[#1F6B3A] border-2 border-[#1F6B3A] font-bold text-sm rounded-xl hover:bg-emerald-50 shrink-0 flex items-center gap-1"
            >
              <Plus className="w-4 h-4" />
              <span>नया</span>
            </button>
          </div>

          {selectedBuyer && (
            <div className="bg-white border border-[#E3DFD0] rounded-xl p-3 mt-2 flex justify-between items-center text-sm shadow-2xs">
              <span className="text-gray-500 font-medium">पिछला बाकी / Previous balance</span>
              <span className="text-[#B3261E] font-bold text-base">
                ₹{previousBalanceRupees.toLocaleString('en-IN')}
              </span>
            </div>
          )}
        </div>

        {/* Produce Items Section */}
        <div className="pt-1">
          <div className="flex justify-between items-center mb-2">
            <span className="font-bold text-base text-[#1B2A1F]">सामान / Items</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setPendingVegItemIdx(null);
                  setVegModalOpen(true);
                }}
                className="text-xs font-bold text-[#1F6B3A] bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1 rounded-lg border border-emerald-200 transition-colors"
              >
                + नई सब्ज़ी (New Veg)
              </button>
              <span className="text-xs text-gray-500">{items.length} item(s)</span>
            </div>
          </div>

          <div className="space-y-2.5">
            {items.map((item, idx) => {
              const veg = vegetables.find((v) => v.id === Number(item.vegetableId));
              const isTomato = veg && (
                veg.nameEn.toLowerCase().includes('tomato') ||
                veg.nameHi.includes('टमाटर')
              );
              const lineTotal =
                (parseFloat(item.quantity) || 0) * (parseFloat(item.rateRupees) || 0);

              return (
                <div
                  key={idx}
                  className="bg-white border border-[#E3DFD0] rounded-xl p-3.5 shadow-2xs relative"
                >
                  <div className="flex justify-between items-center mb-2.5">
                    <div className="flex items-center gap-2 max-w-[70%]">
                      <select
                        value={item.vegetableId}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === '__new__') {
                            setPendingVegItemIdx(idx);
                            setVegModalOpen(true);
                          } else {
                            handleItemChange(idx, 'vegetableId', Number(val));
                          }
                        }}
                        className="font-bold text-base bg-transparent text-[#1B2A1F] focus:outline-hidden pr-2 cursor-pointer truncate"
                      >
                        <option value={0}>-- सब्ज़ी चुनें / Select --</option>
                        {vegetables.map((v) => (
                          <option key={v.id} value={v.id}>
                            {v.nameEn} / {v.nameHi}
                          </option>
                        ))}
                        <option value="__new__">+ नई सब्ज़ी जोड़ें...</option>
                      </select>

                      {isTomato && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-sm bg-rose-100 text-rose-800 shrink-0">
                          टमाटर
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="font-bold text-base text-[#1B2A1F]">
                        ₹{lineTotal.toLocaleString('en-IN')}
                      </span>
                      {items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(idx)}
                          className="text-gray-400 hover:text-rose-600 p-1"
                          title="Remove item"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Tomato Weight Flexibility Toggle (Crate weight varies vs Direct kg) */}
                  {isTomato && (
                    <div className="bg-[#F6F4EC]/80 border border-[#E3DFD0] rounded-lg p-2 mb-2.5 space-y-2">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-bold text-gray-700">टमाटर वजन तरीका / Tomato Weight Mode:</span>
                        <div className="flex gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              const updated = [...items];
                              updated[idx].isTomatoCrateMode = false;
                              updated[idx].unit = 'kg';
                              setItems(updated);
                            }}
                            className={`px-2 py-1 rounded-md text-[11px] font-bold transition-all ${
                              !item.isTomatoCrateMode
                                ? 'bg-[#1B2A1F] text-white'
                                : 'bg-white text-gray-700 border border-[#CFCAB6]'
                            }`}
                          >
                            सीधा किलो (Per kg)
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const updated = [...items];
                              updated[idx].isTomatoCrateMode = true;
                              updated[idx].unit = 'kg';
                              if (!updated[idx].kgPerCrate) updated[idx].kgPerCrate = '25';
                              const c = parseFloat(updated[idx].crateCount || '1') || 1;
                              const w = parseFloat(updated[idx].kgPerCrate || '25') || 25;
                              updated[idx].crateCount = String(c);
                              updated[idx].quantity = String(c * w);
                              setItems(updated);
                            }}
                            className={`px-2 py-1 rounded-md text-[11px] font-bold transition-all ${
                              item.isTomatoCrateMode
                                ? 'bg-[#1B2A1F] text-white'
                                : 'bg-white text-gray-700 border border-[#CFCAB6]'
                            }`}
                          >
                            क्रेट वजन (Crates × wt)
                          </button>
                        </div>
                      </div>

                      {item.isTomatoCrateMode && (
                        <div className="flex items-center gap-2 pt-1 border-t border-[#E3DFD0]/60 text-xs">
                          <div className="flex-1">
                            <span className="text-[10px] text-gray-500 block mb-0.5 font-medium">क्रेट संख्या (Crates)</span>
                            <input
                              type="number"
                              step="any"
                              placeholder="उदा. 4"
                              value={item.crateCount || ''}
                              onChange={(e) => handleItemChange(idx, 'crateCount', e.target.value)}
                              className="w-full min-h-[38px] bg-white border border-[#BDB8A2] rounded-md px-2 font-bold text-[#1B2A1F]"
                            />
                          </div>
                          <span className="text-gray-400 font-bold mt-3">×</span>
                          <div className="flex-1">
                            <span className="text-[10px] text-gray-500 block mb-0.5 font-medium">वजन kg/क्रेट (25-26kg)</span>
                            <input
                              type="number"
                              step="any"
                              placeholder="25 या 26"
                              value={item.kgPerCrate || '25'}
                              onChange={(e) => handleItemChange(idx, 'kgPerCrate', e.target.value)}
                              className="w-full min-h-[38px] bg-white border border-[#BDB8A2] rounded-md px-2 font-bold text-[#1B2A1F]"
                            />
                          </div>
                          <span className="text-gray-400 font-bold mt-3">=</span>
                          <div className="flex-1">
                            <span className="text-[10px] text-emerald-700 block mb-0.5 font-bold">कुल वजन (Total kg)</span>
                            <div className="min-h-[38px] bg-emerald-50 border border-emerald-200 rounded-md px-2 flex items-center font-extrabold text-[#1F6B3A]">
                              {item.quantity || 0} kg
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    {/* Compact Quantity */}
                    <div className="w-24 shrink-0">
                      <label className="text-[10px] text-gray-500 block mb-0.5 font-medium">
                        {item.isTomatoCrateMode ? 'मात्रा kg' : 'मात्रा (Qty)'}
                      </label>
                      <input
                        type="number"
                        step="any"
                        placeholder="मात्रा"
                        value={item.quantity}
                        onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                        className="w-full min-h-[46px] bg-[#F6F4EC]/60 border border-[#BDB8A2] rounded-lg px-2 text-center font-bold text-sm text-[#1B2A1F] focus:outline-hidden focus:bg-white"
                      />
                    </div>

                    {/* Unit */}
                    <div className="w-24 shrink-0">
                      <label className="text-[10px] text-gray-500 block mb-0.5 font-medium">इकाई (Unit)</label>
                      <select
                        value={item.unit}
                        onChange={(e) => handleItemChange(idx, 'unit', e.target.value)}
                        className="w-full min-h-[46px] bg-[#F6F4EC]/60 border border-[#BDB8A2] rounded-lg px-1.5 font-semibold text-xs text-[#1B2A1F] focus:outline-hidden focus:bg-white cursor-pointer"
                      >
                        <option value="kg">kg (किलो)</option>
                        <option value="crate">crate (क्रेट)</option>
                        <option value="sack">sack (बोरी)</option>
                        <option value="piece">piece (नग)</option>
                        <option value="bunch">bunch (गुच्छी)</option>
                        <option value="quintal">quintal (क्विंटल)</option>
                      </select>
                    </div>

                    <span className="text-gray-400 text-sm font-bold mt-3.5">×</span>

                    {/* Big Prominent Rate */}
                    <div className="flex-1 min-w-0 relative">
                      <label className="text-[11px] text-[#1F6B3A] block mb-0.5 font-bold">
                        भाव / Rate (₹/{item.unit})
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-2.5 text-base text-[#1F6B3A] font-extrabold">
                          ₹
                        </span>
                        <input
                          type="number"
                          step="any"
                          placeholder="0"
                          value={item.rateRupees}
                          onChange={(e) => handleItemChange(idx, 'rateRupees', e.target.value)}
                          className="w-full min-h-[46px] bg-emerald-50/60 border-2 border-emerald-600 rounded-lg pl-8 pr-2.5 font-extrabold text-lg text-[#1B2A1F] focus:outline-hidden focus:bg-white focus:border-emerald-700 shadow-2xs"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <button
            type="button"
            onClick={handleAddItem}
            className="w-full mt-2.5 min-h-[46px] bg-white text-[#1F6B3A] border-2 border-[#1F6B3A] font-bold text-sm rounded-xl hover:bg-emerald-50 flex items-center justify-center gap-1.5 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>+ सामान जोड़ें / Add item</span>
          </button>
        </div>

        {/* Deductions & Returns Card */}
        <div className="bg-white border border-[#E3DFD0] rounded-xl p-3.5 shadow-2xs">
          <div className="font-bold text-sm mb-2 text-[#1B2A1F]">
            छूट / वापसी / Deduction
          </div>
          <div className="flex gap-2">
            <div className="flex-0.8 relative">
              <span className="absolute left-2.5 top-3 text-xs text-gray-500 font-bold">₹</span>
              <input
                type="number"
                step="any"
                placeholder="रकम (₹)"
                value={deductionAmountRupees}
                onChange={(e) => setDeductionAmountRupees(e.target.value)}
                className="w-full min-h-[44px] bg-[#F6F4EC]/60 border border-[#BDB8A2] rounded-lg pl-6 pr-2 font-medium text-sm text-[#1B2A1F] focus:outline-hidden focus:bg-white"
              />
            </div>
            <div className="flex-1.4">
              <input
                type="text"
                placeholder="कारण (जैसे: 2 kg खराब)"
                value={deductionReason}
                onChange={(e) => setDeductionReason(e.target.value)}
                className="w-full min-h-[44px] bg-[#F6F4EC]/60 border border-[#BDB8A2] rounded-lg px-2.5 font-medium text-sm text-[#1B2A1F] focus:outline-hidden focus:bg-white"
              />
            </div>
          </div>
          <p className="text-[11px] text-gray-500 mt-1.5">
            कटौती होने पर कारण लिखना आवश्यक है / Reason required if deducting
          </p>
        </div>

        {/* Deposit Destination & Payment Received */}
        <div className="bg-white border border-[#E3DFD0] rounded-xl p-3.5 shadow-2xs">
          <div className="font-bold text-sm mb-2 text-[#1B2A1F]">
            पैसा कहाँ आया / Deposit to
          </div>
          <div className="grid grid-cols-3 gap-2">
            {accounts.map((acc) => {
              const active = Number(accountId) === acc.id;
              return (
                <button
                  type="button"
                  key={acc.id}
                  onClick={() => setAccountId(acc.id)}
                  className={`min-h-[40px] px-2 py-1 rounded-full text-xs font-bold transition-all border ${
                    active
                      ? 'bg-[#1B2A1F] text-white border-[#1B2A1F]'
                      : 'bg-white text-[#1B2A1F] border-[#CFCAB6] hover:bg-gray-50'
                  }`}
                >
                  {acc.type === 'CASH'
                    ? 'Cash (गल्ला)'
                    : acc.type === 'BANK'
                    ? 'SBI'
                    : 'UPI QR'}
                </button>
              );
            })}
          </div>

          <div className="mt-3">
            <label className="text-xs font-semibold text-gray-600 mb-1 block">
              मिला / Received (₹)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-3 text-sm text-gray-500 font-bold">₹</span>
              <input
                type="number"
                step="any"
                placeholder="0"
                value={receivedNowRupees}
                onChange={(e) => setReceivedNowRupees(e.target.value)}
                className="w-full min-h-[46px] bg-[#F6F4EC]/60 border border-[#BDB8A2] rounded-lg pl-7 pr-3 font-bold text-base text-[#1B2A1F] focus:outline-hidden focus:bg-white"
              />
            </div>
          </div>
        </div>

        {/* High-Contrast Summary Card (Dark Theme as in Prototype) */}
        <div className="bg-[#1B2A1F] text-white rounded-xl p-4 space-y-2 shadow-md">
          <div className="flex justify-between text-sm text-white/90">
            <span>सामान कुल / Subtotal</span>
            <span>₹{subtotalRupees.toLocaleString('en-IN')}</span>
          </div>

          {deductionRupees > 0 && (
            <div className="flex justify-between text-sm text-rose-300">
              <span>छूट / Deduction</span>
              <span>− ₹{deductionRupees.toLocaleString('en-IN')}</span>
            </div>
          )}

          <div className="flex justify-between font-bold text-xl pt-2 border-t border-[#4A5B4E]">
            <span>बिल कुल / Net total</span>
            <span>₹{netTotalRupees.toLocaleString('en-IN')}</span>
          </div>

          <div className="flex justify-between text-sm text-white/90 pt-1">
            <span>मिला / Received</span>
            <span className="font-semibold text-emerald-300">
              ₹{receivedRupees.toLocaleString('en-IN')}
            </span>
          </div>

          <div className="flex justify-between text-sm pt-0.5">
            <span>इस बिल का बाकी / This bill due</span>
            <span className="font-bold">₹{thisBillDueRupees.toLocaleString('en-IN')}</span>
          </div>

          <div className="flex justify-between text-sm pt-1 text-[#F6C9C5] border-t border-[#4A5B4E]/60">
            <span>कुल खाता बाकी / Khata due</span>
            <span className="font-bold text-base">
              ₹{totalKhataDueRupees.toLocaleString('en-IN')}
            </span>
          </div>
        </div>

        {/* PROMINENT INLINE ACTION BUTTONS (ALWAYS VISIBLE DIRECTLY IN FORM) */}
        <div className="pt-2 space-y-2.5">
          <button
            type="button"
            disabled={saving}
            onClick={handleSubmit}
            className="w-full min-h-[52px] bg-[#1F6B3A] hover:bg-[#18552e] active:scale-[0.98] text-white font-black text-base rounded-2xl flex items-center justify-center gap-2.5 shadow-lg transition-all disabled:opacity-50"
          >
            <Check className="w-6 h-6 stroke-[3]" />
            <span>{saving ? 'बिल सेव हो रहा है...' : '💾 बिल सेव करें (Save Bill)'}</span>
          </button>

          <button
            type="button"
            onClick={handleShareWhatsApp}
            className="w-full min-h-[46px] bg-white text-[#1F6B3A] border-2 border-[#1F6B3A] font-extrabold text-sm rounded-2xl hover:bg-emerald-50 active:scale-[0.98] flex items-center justify-center gap-2 transition-all shadow-2xs"
          >
            <Share2 className="w-5 h-5 text-emerald-600" />
            <span>📲 WhatsApp पर बिल शेयर करें (Share Bill)</span>
          </button>
        </div>
      </div>

      {/* Floating Sticky Action Bar (Elevated Z-Index) */}
      <div className="fixed bottom-0 left-0 right-0 p-3 bg-white/95 backdrop-blur-md border-t border-gray-200 grid grid-cols-2 gap-3 max-w-md mx-auto z-50 shadow-2xl">
        <button
          type="button"
          onClick={handleShareWhatsApp}
          className="w-full min-h-[46px] bg-white text-[#1F6B3A] border-2 border-[#1F6B3A] font-extrabold text-sm rounded-xl hover:bg-emerald-50 active:scale-[0.98] flex items-center justify-center gap-2 transition-all shadow-xs"
        >
          <Share2 className="w-4 h-4 text-emerald-600" />
          <span>WhatsApp</span>
        </button>

        <button
          type="button"
          disabled={saving}
          onClick={handleSubmit}
          className="w-full min-h-[46px] bg-[#1F6B3A] hover:bg-[#18552e] active:scale-[0.98] text-white font-black text-sm rounded-xl flex items-center justify-center gap-2 shadow-md transition-all disabled:opacity-50"
        >
          <Check className="w-5 h-5 stroke-[3]" />
          <span>{saving ? 'सेव हो रहा...' : '💾 बिल सेव करें'}</span>
        </button>
      </div>

      {/* On-the-Fly New Customer Modal */}
      <BuyerModal
        isOpen={buyerModalOpen}
        onClose={() => setBuyerModalOpen(false)}
        onSave={handleCreateBuyer}
      />

      {/* On-the-Fly New Vegetable Modal */}
      <VegetableModal
        isOpen={vegModalOpen}
        onClose={() => setVegModalOpen(false)}
        onSuccess={(newVeg) => {
          setVegetables((prev) => [...prev, newVeg]);
          if (pendingVegItemIdx !== null) {
            handleItemChange(pendingVegItemIdx, 'vegetableId', newVeg.id);
            handleItemChange(pendingVegItemIdx, 'unit', newVeg.unit || 'kg');
          }
        }}
      />
    </div>
  );
};
