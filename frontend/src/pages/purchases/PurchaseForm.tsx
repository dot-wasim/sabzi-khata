import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getSellers, createSeller } from '../../api/sellers';
import { getVegetables } from '../../api/vegetables';
import { getAccounts } from '../../api/accounts';
import { createPurchase, getPurchase, updatePurchase, getPurchases } from '../../api/purchases';
import { Seller, Vegetable, Account } from '../../utils/types';
import { SellerModal } from '../sellers/SellerModal';
import { VegetableModal } from '../vegetables/VegetableModal';
import { toInputDate, formatDate } from '../../utils/date';
import { rupeesToPaise, paiseToRupees } from '../../utils/currency';
import { useSimulator } from '../../context/SimulatorContext';
import {
  ArrowLeft,
  Plus,
  Trash2,
  Check,
  Truck,
  Carrot,
  Share2,
  Camera,
  Printer,
  Image,
  AlertTriangle,
  FileText
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

interface BadGoodsLineItem {
  vegetableId: number;
  quantity: string;
  unit: string;
  rateRupees: string;
  reason: string;
  photoUrl?: string;
}

export const PurchaseForm: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEdit = !!id;
  const { openWhatsAppModal, isSimulator } = useSimulator();

  const [sellers, setSellers] = useState<Seller[]>([]);
  const [vegetables, setVegetables] = useState<Vegetable[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sellerModalOpen, setSellerModalOpen] = useState(false);
  const [vegModalOpen, setVegModalOpen] = useState(false);
  const [pendingVegItemIdx, setPendingVegItemIdx] = useState<number | null>(null);

  // Form fields
  const [date, setDate] = useState(toInputDate(new Date()));
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [sellerId, setSellerId] = useState<number | ''>('');
  const [items, setItems] = useState<FormLineItem[]>([
    { vegetableId: 0, quantity: '', unit: 'kg', rateRupees: '' },
  ]);

  // Transportation & Labour (Variable or Flat)
  const [transportType, setTransportType] = useState<'PER_UNIT' | 'FLAT'>('PER_UNIT');
  const [transportRateRupees, setTransportRateRupees] = useState('25');
  const [transportFlatRupees, setTransportFlatRupees] = useState('150');
  const [transporterName, setTransporterName] = useState('');
  const [labourRupees, setLabourRupees] = useState('100');
  const [isChemicalFree, setIsChemicalFree] = useState(false);

  // Bad-condition Goods Deduction (PRD 5.4)
  const [badGoods, setBadGoods] = useState<BadGoodsLineItem[]>([]);
  const [slipPhotoUrl, setSlipPhotoUrl] = useState('');
  const [nextEntryNo, setNextEntryNo] = useState<number>(1);

  // Payment
  const [paidNowRupees, setPaidNowRupees] = useState('');
  const [accountId, setAccountId] = useState<number | ''>('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      try {
        const [sellersRes, vegData, accData, purchasesRes] = await Promise.all([
          getSellers(),
          getVegetables(),
          getAccounts(),
          getPurchases({ limit: 500 }).catch(() => ({ purchases: [] })),
        ]);
        const sellersList = (sellersRes as any).sellers || sellersRes || [];
        setSellers(sellersList);
        setVegetables(vegData);
        setAccounts(accData);

        const pList = (purchasesRes as any).purchases || [];
        const maxEntry = pList.reduce((m: number, p: any) => Math.max(m, p.entryNo || 0), 0);
        setNextEntryNo(maxEntry > 0 ? maxEntry + 1 : pList.length + 1);

        const defaultAcc = accData.find((a) => a.isDefault) || accData[0];
        if (defaultAcc && !isEdit) {
          setAccountId(defaultAcc.id);
        }

        if (isEdit) {
          const p = await getPurchase(parseInt(id));
          setDate(toInputDate(new Date(p.date)));
          setSellerId(p.sellerId);
          setVehicleNumber((p as any).vehicleNumber || '');
          setLabourRupees(String(paiseToRupees(p.labour || 0)));
          setPaidNowRupees(String(paiseToRupees(p.paidAmount || 0)));
          setAccountId(p.accountId || (defaultAcc ? defaultAcc.id : ''));
          setTransportType(p.transportType || 'FLAT');
          if (p.transportType === 'PER_UNIT') {
            setTransportRateRupees(String(paiseToRupees(p.transportRate || 0)));
          } else {
            setTransportFlatRupees(String(paiseToRupees(p.transport || 0)));
          }
          setTransporterName(p.transporterName || '');
          if ((p as any).photoUrl) {
            setSlipPhotoUrl((p as any).photoUrl);
          }
          if ((p as any).badGoodsDeductions && (p as any).badGoodsDeductions.length > 0) {
            setBadGoods(
              (p as any).badGoodsDeductions.map((d: any) => ({
                vegetableId: d.vegetableId || 0,
                quantity: String(d.quantity || ''),
                unit: d.unit || 'kg',
                rateRupees: String(paiseToRupees(d.rate || 0)),
                reason: d.reason || '',
                photoUrl: d.photoUrl || '',
              }))
            );
          }
          setItems(
            p.items.map((it: any) => ({
              vegetableId: it.vegetableId,
              quantity: String(it.quantity),
              unit: it.unit,
              rateRupees: String(paiseToRupees(it.rate)),
              kgPerCrate: it.crateWeightKg ? String(it.crateWeightKg) : '25',
            }))
          );
        } else if (sellersList.length > 0) {
          setSellerId(sellersList[0].id);
        }
      } catch (err) {
        console.error('Failed to initialize purchase form:', err);
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
      if (isTomato && !updated[index].kgPerCrate) {
        updated[index].kgPerCrate = '25';
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

  const handleAddBadGoods = () => {
    setBadGoods((prev) => [
      ...prev,
      { vegetableId: 0, quantity: '', unit: 'kg', rateRupees: '', reason: 'सड़ा / खराब माल (Damaged)' },
    ]);
  };

  const handleRemoveBadGoods = (idx: number) => {
    setBadGoods((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleBadGoodsChange = (idx: number, field: keyof BadGoodsLineItem, val: any) => {
    const updated = [...badGoods];
    (updated[idx] as any)[field] = val;
    setBadGoods(updated);
  };

  const handleSlipPhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setSlipPhotoUrl(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  // Calculations
  const lineTotals = items.map((it) => {
    const q = parseFloat(it.quantity) || 0;
    const r = parseFloat(it.rateRupees) || 0;
    return q * r;
  });

  const goodsTotalRupees = lineTotals.reduce((sum, val) => sum + val, 0);
  const totalItemQty = items.reduce((sum, it) => sum + (parseFloat(it.quantity) || 0), 0);

  // Bad-condition Goods Deductions (PRD 5.4)
  const badGoodsTotalRupees = badGoods.reduce((sum, it) => {
    const q = parseFloat(it.quantity) || 0;
    const r = parseFloat(it.rateRupees) || 0;
    return sum + q * r;
  }, 0);

  // Net payable to supplier for goods after bad goods deduction
  const netPayableToSellerRupees = Math.max(0, goodsTotalRupees - badGoodsTotalRupees);

  const calculatedTransportRupees =
    transportType === 'PER_UNIT'
      ? totalItemQty * (parseFloat(transportRateRupees) || 0)
      : parseFloat(transportFlatRupees) || 0;

  const labourCostRupees = parseFloat(labourRupees) || 0;
  const totalLandedRupees = goodsTotalRupees + calculatedTransportRupees + labourCostRupees;

  const paidRupees = parseFloat(paidNowRupees) || 0;
  const balanceDueRupees = Math.max(0, netPayableToSellerRupees - paidRupees);

  const selectedSeller = sellers.find((s) => s.id === Number(sellerId));
  const rawSellerDue = selectedSeller
    ? (selectedSeller.currentBalance !== undefined
        ? selectedSeller.currentBalance
        : selectedSeller.currentDue !== undefined
        ? selectedSeller.currentDue
        : selectedSeller.openingBalance) || 0
    : 0;
  const previousSellerBalanceRupees = paiseToRupees(rawSellerDue);

  const handleCreateSeller = async (formData: any) => {
    try {
      const res: any = await createSeller(formData);
      const newS = res.seller || res;
      setSellers((prev) => [newS, ...prev]);
      setSellerId(newS.id);
      setSellerModalOpen(false);
    } catch (err) {
      alert('Failed to create seller');
    }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!sellerId) {
      alert('कृपया विक्रेता चुनें (Please select seller)');
      return;
    }

    const validItems = items.filter(
      (it) => it.vegetableId > 0 && parseFloat(it.quantity) > 0 && parseFloat(it.rateRupees) > 0
    );

    if (validItems.length === 0) {
      alert('कम से कम एक सब्ज़ी जोड़ें (Please add at least one item)');
      return;
    }

    setSaving(true);
    try {
      const selectedAcc = accounts.find((a) => a.id === Number(accountId));
      const validBadGoods = badGoods
        .filter((d) => d.vegetableId > 0 && parseFloat(d.quantity) > 0 && parseFloat(d.rateRupees) > 0)
        .map((d) => {
          const v = vegetables.find((veg) => veg.id === Number(d.vegetableId));
          return {
            vegetableId: Number(d.vegetableId),
            vegetableName: v?.nameHi || v?.nameEn,
            quantity: parseFloat(d.quantity),
            unit: d.unit,
            rate: rupeesToPaise(d.rateRupees),
            reason: d.reason || 'खराब माल',
            photoUrl: d.photoUrl,
          };
        });

      const payload: any = {
        date,
        sellerId: Number(sellerId),
        accountId: accountId ? Number(accountId) : undefined,
        paymentMode: selectedAcc ? selectedAcc.name : 'Cash',
        transport: rupeesToPaise(calculatedTransportRupees),
        transportType,
        transportRate: transportType === 'PER_UNIT' ? rupeesToPaise(transportRateRupees) : 0,
        transportQty: totalItemQty,
        transportUnit: 'kg',
        transporterName: transporterName.trim() || undefined,
        transportPaid: true,
        labour: rupeesToPaise(labourCostRupees),
        commission: 0,
        paidAmount: rupeesToPaise(paidRupees),
        paidNow: rupeesToPaise(paidRupees),
        photoUrl: slipPhotoUrl || undefined,
        badGoodsDeductions: validBadGoods,
        badGoodsTotal: rupeesToPaise(badGoodsTotalRupees),
        notes: [
          vehicleNumber ? `गाड़ी: ${vehicleNumber}` : '',
          isChemicalFree ? 'बिना केमिकल (अपना खेत)' : '',
          notes.trim(),
        ]
          .filter(Boolean)
          .join(' | ') || undefined,
        items: validItems.map((it) => {
          const qty = parseFloat(it.quantity) || 0;
          const isCrate = it.unit === 'crate';
          const crateKg = isCrate ? (parseFloat(it.kgPerCrate || '25') || 25) : undefined;
          return {
            vegetableId: Number(it.vegetableId),
            quantity: qty,
            unit: it.unit,
            rate: rupeesToPaise(it.rateRupees),
            crateWeightKg: crateKg,
            convertedKg: isCrate && crateKg ? qty * crateKg : qty,
          };
        }),
      };

      if (isEdit) {
        await updatePurchase(parseInt(id), payload);
      } else {
        await createPurchase(payload);
      }
      navigate('/purchases');
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to save purchase');
    } finally {
      setSaving(false);
    }
  };

  const handleShareWhatsApp = () => {
    const sellerName = selectedSeller?.name || 'Mandi Farmer';
    const itemsText = items
      .filter((it) => it.vegetableId > 0)
      .map((it) => {
        const veg = vegetables.find((v) => v.id === Number(it.vegetableId));
        const lineTotal = (parseFloat(it.quantity) || 0) * (parseFloat(it.rateRupees) || 0);
        return `• ${veg?.nameHi || veg?.nameEn || 'सब्ज़ी'} (${it.quantity} ${it.unit} @ ₹${it.rateRupees}/${it.unit}) = ₹${lineTotal.toLocaleString('en-IN')}`;
      })
      .join('\n');

    const badGoodsText = badGoods
      .filter((d) => d.vegetableId > 0)
      .map((d) => {
        const veg = vegetables.find((v) => v.id === Number(d.vegetableId));
        const total = (parseFloat(d.quantity) || 0) * (parseFloat(d.rateRupees) || 0);
        return `• [खराब माल] ${veg?.nameHi || veg?.nameEn || 'सब्ज़ी'}: ${d.quantity} ${d.unit} @ ₹${d.rateRupees} = −₹${total.toLocaleString('en-IN')} (${d.reason})`;
      })
      .join('\n');

    const cleanPhone = selectedSeller?.phone ? selectedSeller.phone.replace(/[^0-9]/g, '') : '';
    const msg = `*हुसैन फूड्स (सब्जी मंडी)*
मंडी खरीद पर्ची #${isEdit ? id : nextEntryNo}
तारीख: ${formatDate(date, 'dd/MM/yyyy')}
किसान/विक्रेता: ${sellerName} ${selectedSeller?.village ? `(${selectedSeller.village})` : ''}
${vehicleNumber ? `गाड़ी नंबर: ${vehicleNumber}\n` : ''}----------------------------------
*खरीदी गई सब्जियां:*
${itemsText}
${badGoodsText ? `----------------------------------\n*खराब माल कटौती (Deductions):*\n${badGoodsText}\n` : ''}----------------------------------
*कुल माल (Goods Total):* ₹${goodsTotalRupees.toLocaleString('en-IN')}
${badGoodsTotalRupees > 0 ? `*खराब माल कटौती:* −₹${badGoodsTotalRupees.toLocaleString('en-IN')}\n` : ''}*देय माल रकम (Net Payable):* ₹${netPayableToSellerRupees.toLocaleString('en-IN')}
*पिछला बकाया (Old Due):* ₹${previousSellerBalanceRupees.toLocaleString('en-IN')}
*आज दिया (Paid Now):* ₹${paidRupees.toLocaleString('en-IN')}
*शेष बाकी (Balance Due):* ₹${balanceDueRupees.toLocaleString('en-IN')}

_Hussain Foods - Sabzi Mandi_`;

    const url = cleanPhone.length >= 10
      ? `https://wa.me/91${cleanPhone.slice(-10)}?text=${encodeURIComponent(msg)}`
      : `https://wa.me/?text=${encodeURIComponent(msg)}`;

    if (isSimulator) {
      openWhatsAppModal(msg, cleanPhone, sellerName);
    } else {
      window.open(url, '_blank');
    }
  };

  const handlePrintPdf = () => {
    window.print();
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
      {/* Dark Header with Top Quick Save Button */}
      <div className="bg-[#1F6B3A] text-white p-5 pb-6">
        <div className="flex items-center justify-between mb-2">
          <button
            onClick={() => navigate('/purchases')}
            className="flex items-center gap-2 text-sm text-white/90 hover:text-white"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>← खरीद डेस्क / Back</span>
          </button>

          <button
            type="button"
            disabled={saving}
            onClick={handleSubmit}
            className="px-3.5 py-1.5 bg-white text-[#1F6B3A] font-black text-xs rounded-xl shadow-md hover:bg-emerald-50 active:scale-95 flex items-center gap-1.5 transition-all"
          >
            <Check className="w-4 h-4 stroke-[3]" />
            <span>{saving ? 'सेव हो रहा...' : '💾 खरीद सेव करें'}</span>
          </button>
        </div>

        <div className="flex items-baseline justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <span>{isEdit ? `खरीद #${id}` : `नई खरीद #${nextEntryNo}`}</span>
              <span className="text-base font-normal opacity-90">/ {isEdit ? 'Edit Purchase' : 'New Purchase'}</span>
            </h1>
            <p className="text-xs text-white/80 mt-0.5">
              Hussain Foods · {formatDate(date, 'd MMM yyyy')}
            </p>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-3.5 -mt-2">
        {/* Seller Info Card */}
        <div className="bg-white border border-[#E3DFD0] rounded-xl p-3.5 flex justify-between items-center shadow-2xs">
          <div>
            <div className="text-xs text-[#5B6558]">विक्रेता / Seller</div>
            <select
              value={sellerId}
              onChange={(e) => setSellerId(Number(e.target.value))}
              className="font-bold text-base bg-transparent text-[#1B2A1F] focus:outline-hidden cursor-pointer"
            >
              <option value="">-- विक्रेता चुनें --</option>
              {sellers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} {s.village ? `· ${s.village}` : ''}
                </option>
              ))}
            </select>
            {selectedSeller && (
              <div className="text-xs text-[#5B6558] mt-0.5">
                {selectedSeller.village || 'मंडी'} · {selectedSeller.phone || 'No phone'}
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={() => setSellerModalOpen(true)}
            className="text-xs font-bold text-[#1F6B3A] hover:underline"
          >
            + नया
          </button>
        </div>

        {selectedSeller && (
          <div className="bg-emerald-50/80 border-2 border-emerald-300 rounded-xl p-3.5 -mt-1 flex justify-between items-center text-sm shadow-xs">
            <div>
              <span className="text-gray-800 font-extrabold block">
                {selectedSeller.name} का पिछला बाकी
              </span>
              <span className="text-[11px] text-gray-500 font-medium">Old Payable Balance</span>
            </div>
            <span className="text-rose-600 font-black text-xl">
              ₹{previousSellerBalanceRupees.toLocaleString('en-IN')}
            </span>
          </div>
        )}

        {/* Date & Vehicle Number Inputs */}
        <div className="flex gap-2">
          <div className="flex-1">
            <label className="text-xs font-semibold text-gray-600 mb-1 block">
              तारीख / Date
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full min-h-[46px] bg-white border border-[#BDB8A2] rounded-xl px-3 text-sm font-medium text-[#1B2A1F] focus:outline-hidden focus:border-[#1F6B3A]"
            />
          </div>
          <div className="flex-1">
            <label className="text-xs font-semibold text-gray-600 mb-1 block">
              गाड़ी नं. (optional)
            </label>
            <input
              type="text"
              placeholder="JH 02 AB 1234"
              value={vehicleNumber}
              onChange={(e) => setVehicleNumber(e.target.value)}
              className="w-full min-h-[46px] bg-white border border-[#BDB8A2] rounded-xl px-3 text-sm font-medium text-[#1B2A1F] focus:outline-hidden focus:border-[#1F6B3A]"
            />
          </div>
        </div>

        {/* Produce Items */}
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
                          {v.nameHi} · {v.nameEn}
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
                        className="text-xs text-[#5B6558] hover:text-rose-600"
                      >
                        ✕ हटाएँ
                      </button>
                    )}
                  </div>
                </div>

                {/* Tomato Weight Flexibility Toggle (Crate weight varies vs Direct kg) */}
                {isTomato && (
                  <div className="bg-[#F6F4EC]/80 border border-[#E3DFD0] rounded-lg p-2 mb-2.5 space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold text-gray-700">टमाटर वजन तरीका:</span>
                      <div className="flex gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            const updated = [...items];
                            updated[idx].isTomatoCrateMode = false;
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
                    <label className="text-[10px] text-gray-500 mb-0.5 block font-medium">
                      {item.isTomatoCrateMode ? 'मात्रा kg' : 'मात्रा (Qty)'}
                    </label>
                    <input
                      type="number"
                      step="any"
                      placeholder="0"
                      value={item.quantity}
                      onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                      className="w-full min-h-[46px] bg-[#F6F4EC]/60 border border-[#BDB8A2] rounded-lg px-2 text-center font-bold text-sm text-[#1B2A1F] focus:outline-hidden focus:bg-white"
                    />
                  </div>

                  {/* Unit */}
                  <div className="w-24 shrink-0">
                    <label className="text-[10px] text-gray-500 mb-0.5 block font-medium">इकाई (Unit)</label>
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
                    <label className="text-[11px] text-[#1F6B3A] mb-0.5 block font-bold">
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

          <button
            type="button"
            onClick={handleAddItem}
            className="w-full min-h-[46px] bg-white text-[#1F6B3A] border-2 border-[#1F6B3A] font-bold text-sm rounded-xl hover:bg-emerald-50 flex items-center justify-center gap-1.5 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>+ सब्ज़ी जोड़ें / Add vegetable</span>
          </button>
        </div>

        {/* Bad-Condition Goods Deduction Card (PRD 5.4) */}
        <div className="bg-white border border-rose-200 rounded-xl p-3.5 shadow-2xs space-y-2.5">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-rose-600" />
              <span className="font-bold text-sm text-gray-900">खराब माल कटौती / Damaged Goods (PRD 5.4)</span>
            </div>
            <button
              type="button"
              onClick={handleAddBadGoods}
              className="text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 px-2.5 py-1 rounded-lg border border-rose-200 transition-colors"
            >
              + कटौती जोड़ें
            </button>
          </div>
          <p className="text-[11px] text-gray-500">
            मंडी में जो माल खराब या सड़ा आया है, उसे सप्लायर के हिसाब से काटें।
          </p>

          {badGoods.map((bg, bIdx) => {
            const lineTotal = (parseFloat(bg.quantity) || 0) * (parseFloat(bg.rateRupees) || 0);
            return (
              <div key={bIdx} className="bg-rose-50/50 border border-rose-200 rounded-lg p-2.5 space-y-2">
                <div className="flex justify-between items-center">
                  <select
                    value={bg.vegetableId}
                    onChange={(e) => handleBadGoodsChange(bIdx, 'vegetableId', Number(e.target.value))}
                    className="font-bold text-xs bg-white border border-gray-200 rounded-md p-1.5 text-gray-800"
                  >
                    <option value={0}>-- सब्ज़ी चुनें --</option>
                    {vegetables.map((v) => (
                      <option key={v.id} value={v.id}>{v.nameHi || v.nameEn}</option>
                    ))}
                  </select>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-rose-700">− ₹{lineTotal.toLocaleString('en-IN')}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveBadGoods(bIdx)}
                      className="text-gray-400 hover:text-rose-600 p-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="flex gap-2">
                  <div className="flex-1">
                    <input
                      type="number"
                      step="any"
                      placeholder="मात्रा (kg)"
                      value={bg.quantity}
                      onChange={(e) => handleBadGoodsChange(bIdx, 'quantity', e.target.value)}
                      className="w-full bg-white border border-gray-200 rounded-md p-1.5 text-xs font-bold"
                    />
                  </div>
                  <div className="flex-1">
                    <input
                      type="number"
                      step="any"
                      placeholder="भाव (₹/kg)"
                      value={bg.rateRupees}
                      onChange={(e) => handleBadGoodsChange(bIdx, 'rateRupees', e.target.value)}
                      className="w-full bg-white border border-gray-200 rounded-md p-1.5 text-xs font-bold"
                    />
                  </div>
                  <div className="flex-1.5">
                    <input
                      type="text"
                      placeholder="कारण (जैसे: सड़ा हुआ)"
                      value={bg.reason}
                      onChange={(e) => handleBadGoodsChange(bIdx, 'reason', e.target.value)}
                      className="w-full bg-white border border-gray-200 rounded-md p-1.5 text-xs font-medium"
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Supplier Slip / Goods Photo Attachment (PRD 5.2) */}
        <div className="bg-white border border-[#E3DFD0] rounded-xl p-3.5 shadow-2xs">
          <div className="flex justify-between items-center mb-1.5">
            <div className="flex items-center gap-1.5 text-xs font-bold text-gray-700">
              <Camera className="w-4 h-4 text-emerald-600" />
              <span>सप्लायर पर्ची फोटो / Slip Photo (PRD 5.2)</span>
            </div>
            {slipPhotoUrl && (
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                ✓ फोटो संलग्न (Attached)
              </span>
            )}
          </div>
          <input
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleSlipPhotoUpload}
            className="w-full text-xs text-gray-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 cursor-pointer"
          />
          {slipPhotoUrl && (
            <div className="mt-2 relative inline-block">
              <img src={slipPhotoUrl} alt="Slip" className="w-20 h-20 object-cover rounded-lg border border-gray-200 shadow-xs" />
              <button
                type="button"
                onClick={() => setSlipPhotoUrl('')}
                className="absolute -top-1.5 -right-1.5 bg-rose-600 text-white rounded-full p-0.5 text-xs shadow-xs"
              >
                ✕
              </button>
            </div>
          )}
        </div>

        {/* Real-Time Live Bill & Due Summary Card right at Items */}
        {goodsTotalRupees > 0 && (
          <div className="bg-emerald-50/90 border-2 border-emerald-300 rounded-2xl p-4 shadow-sm space-y-2">
            <div className="flex justify-between items-center text-xs font-bold text-emerald-900">
              <span>इस खरीद का सामान कुल (Goods Total):</span>
              <span className="text-sm font-black text-gray-900">₹{goodsTotalRupees.toLocaleString('en-IN')}</span>
            </div>
            {badGoodsTotalRupees > 0 && (
              <div className="flex justify-between items-center text-xs font-bold text-rose-700">
                <span>खराब माल कटौती (Bad Goods Deductions):</span>
                <span className="text-sm font-black text-rose-600">− ₹{badGoodsTotalRupees.toLocaleString('en-IN')}</span>
              </div>
            )}
            <div className="flex justify-between items-center text-xs font-bold text-emerald-900 pt-1 border-t border-emerald-200">
              <span>सप्लायर को देय माल रकम (Net Payable):</span>
              <span className="text-sm font-black text-emerald-800">₹{netPayableToSellerRupees.toLocaleString('en-IN')}</span>
            </div>
            {selectedSeller && (
              <div className="flex justify-between items-center text-xs font-bold text-emerald-900">
                <span>{selectedSeller.name} का पिछला बाकी (Old Due):</span>
                <span className="text-sm font-black text-rose-600">₹{previousSellerBalanceRupees.toLocaleString('en-IN')}</span>
              </div>
            )}
            <div className="pt-2 border-t border-emerald-200 flex justify-between items-center font-black">
              <span className="text-sm text-emerald-950">नया कुल किसान बकाया (Total Due):</span>
              <span className="text-xl font-black text-rose-600">
                ₹{(previousSellerBalanceRupees + balanceDueRupees).toLocaleString('en-IN')}
              </span>
            </div>
          </div>
        )}

        {/* Transport & Labour */}
        <div className="flex gap-2">
          <div className="flex-1">
            <label className="text-xs font-semibold text-gray-600 mb-1 block">
              भाड़ा / Transport ₹
            </label>
            <input
              type="number"
              step="any"
              value={transportFlatRupees}
              onChange={(e) => setTransportFlatRupees(e.target.value)}
              className="w-full min-h-[44px] bg-white border border-[#BDB8A2] rounded-xl px-3 font-semibold text-sm text-[#1B2A1F] focus:outline-hidden focus:border-[#1F6B3A]"
            />
          </div>
          <div className="flex-1">
            <label className="text-xs font-semibold text-gray-600 mb-1 block">
              मज़दूरी / Labour ₹
            </label>
            <input
              type="number"
              step="any"
              value={labourRupees}
              onChange={(e) => setLabourRupees(e.target.value)}
              className="w-full min-h-[44px] bg-white border border-[#BDB8A2] rounded-xl px-3 font-semibold text-sm text-[#1B2A1F] focus:outline-hidden focus:border-[#1F6B3A]"
            />
          </div>
        </div>

        {/* Chemical-Free Toggle */}
        <div
          onClick={() => setIsChemicalFree(!isChemicalFree)}
          className="bg-white border border-[#E3DFD0] rounded-xl p-3 flex justify-between items-center cursor-pointer shadow-2xs"
        >
          <span className="text-sm font-medium">बिना केमिकल (अपना खेत) / Chemical-free</span>
          <span
            className={`text-xs font-bold px-2.5 py-1 rounded-md transition-all ${
              isChemicalFree
                ? 'bg-emerald-100 text-emerald-800'
                : 'bg-[#F6E8D2] text-[#9A5B13]'
            }`}
          >
            {isChemicalFree ? 'हाँ (Yes)' : 'नहीं'}
          </span>
        </div>

        {/* Payment & Balance Card */}
        <div className="bg-white border border-[#E3DFD0] rounded-xl p-3.5 space-y-2.5 shadow-2xs">
          <div className="flex justify-between items-center text-sm">
            <span className="text-[#5B6558]">कुल माल / Goods total</span>
            <b className="text-base">₹{goodsTotalRupees.toLocaleString('en-IN')}</b>
          </div>

          {badGoodsTotalRupees > 0 && (
            <div className="flex justify-between items-center text-sm text-rose-600">
              <span>खराब माल कटौती / Deductions</span>
              <b className="text-base">− ₹{badGoodsTotalRupees.toLocaleString('en-IN')}</b>
            </div>
          )}

          <div className="flex justify-between items-center text-sm font-bold text-gray-900 pt-1 border-t border-gray-100">
            <span>देय माल रकम / Net payable</span>
            <b className="text-base text-emerald-800">₹{netPayableToSellerRupees.toLocaleString('en-IN')}</b>
          </div>

          <div className="flex justify-between items-center text-sm pt-1">
            <span className="font-medium">अभी दिया / Paid now</span>
            <div className="relative">
              <span className="absolute left-2.5 top-2.5 text-xs text-gray-500 font-bold">₹</span>
              <input
                type="number"
                step="any"
                value={paidNowRupees}
                onChange={(e) => setPaidNowRupees(e.target.value)}
                placeholder="0"
                className="w-32 min-h-[40px] bg-[#F6F4EC]/60 border border-[#BDB8A2] rounded-lg pl-6 pr-2 text-right font-bold text-base text-[#1B2A1F] focus:outline-hidden focus:bg-white"
              />
            </div>
          </div>

          {/* Payment Mode Chips */}
          <div className="flex gap-2 pt-1">
            {accounts.map((acc) => {
              const active = Number(accountId) === acc.id;
              return (
                <button
                  type="button"
                  key={acc.id}
                  onClick={() => setAccountId(acc.id)}
                  className={`min-h-[36px] px-3 py-1 rounded-full text-xs font-bold transition-all border ${
                    active
                      ? 'bg-[#1B2A1F] text-white border-[#1B2A1F]'
                      : 'bg-white text-[#1B2A1F] border-[#CFCAB6] hover:bg-gray-50'
                  }`}
                >
                  {acc.type === 'CASH'
                    ? 'नकद (Cash)'
                    : acc.type === 'UPI'
                    ? 'UPI'
                    : 'बैंक (SBI)'}
                </button>
              );
            })}
          </div>

          <div className="flex justify-between items-center text-sm pt-2 border-t border-[#E3DFD0]">
            <span className="text-[#5B6558]">विक्रेता का बाकी / Balance</span>
            <b className="text-[#B3261E] text-base">
              ₹{balanceDueRupees.toLocaleString('en-IN')}
            </b>
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
            <span>{saving ? 'खरीद सेव हो रही है...' : '💾 खरीद सेव करें (Save Purchase)'}</span>
          </button>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={handleShareWhatsApp}
              className="w-full min-h-[46px] bg-white text-[#1F6B3A] border-2 border-[#1F6B3A] font-extrabold text-xs rounded-xl hover:bg-emerald-50 active:scale-[0.98] flex items-center justify-center gap-1.5 transition-all shadow-2xs"
            >
              <Share2 className="w-4 h-4 text-emerald-600" />
              <span>📲 WhatsApp शेयर</span>
            </button>

            <button
              type="button"
              onClick={handlePrintPdf}
              className="w-full min-h-[46px] bg-white text-gray-800 border-2 border-gray-300 font-bold text-xs rounded-xl hover:bg-gray-100 active:scale-[0.98] flex items-center justify-center gap-1.5 transition-all shadow-2xs"
            >
              <Printer className="w-4 h-4 text-gray-700" />
              <span>📄 प्रिंट / Save PDF</span>
            </button>
          </div>
        </div>
      </div>

      {/* Sticky Bottom Save & WhatsApp Bar (Elevated Z-Index) */}
      <div className="fixed bottom-0 left-0 right-0 p-3 bg-white/95 backdrop-blur-md border-t border-gray-200 grid grid-cols-3 gap-2 max-w-md mx-auto z-50 shadow-2xl">
        <button
          type="button"
          onClick={handleShareWhatsApp}
          className="w-full min-h-[46px] bg-white text-[#1F6B3A] border-2 border-[#1F6B3A] font-extrabold text-xs rounded-xl hover:bg-emerald-50 active:scale-[0.98] flex items-center justify-center gap-1 transition-all shadow-xs"
        >
          <Share2 className="w-3.5 h-3.5 text-emerald-600" />
          <span>WhatsApp</span>
        </button>

        <button
          type="button"
          onClick={handlePrintPdf}
          className="w-full min-h-[46px] bg-white text-gray-700 border border-gray-300 font-bold text-xs rounded-xl hover:bg-gray-50 active:scale-[0.98] flex items-center justify-center gap-1 transition-all shadow-xs"
        >
          <Printer className="w-3.5 h-3.5 text-gray-600" />
          <span>PDF / प्रिंट</span>
        </button>

        <button
          type="button"
          disabled={saving}
          onClick={handleSubmit}
          className="w-full min-h-[46px] bg-[#1F6B3A] hover:bg-[#18552e] active:scale-[0.98] text-white font-black text-xs rounded-xl flex items-center justify-center gap-1 shadow-md transition-all disabled:opacity-50"
        >
          <Check className="w-4 h-4 stroke-[3]" />
          <span>{saving ? '...' : '💾 सेव'}</span>
        </button>
      </div>

      {/* On-the-Fly Seller Modal */}
      <SellerModal
        isOpen={sellerModalOpen}
        onClose={() => setSellerModalOpen(false)}
        onSave={handleCreateSeller}
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
