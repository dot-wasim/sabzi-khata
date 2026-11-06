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

interface FormLineItem {
  vegetableId: number;
  quantity: string;
  unit: string;
  rateRupees: string;
}

interface BadGoodsLineItem {
  vegetableId: number;
  quantity: string;
  unit: string;
  rateRupees: string;
}

export const PurchaseForm: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEdit = !!id;

  const [sellers, setSellers] = useState<Seller[]>([]);
  const [vegetables, setVegetables] = useState<Vegetable[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sellerModalOpen, setSellerModalOpen] = useState(false);
  const [vegModalOpen, setVegModalOpen] = useState(false);

  // Form fields
  const [date, setDate] = useState(toInputDate(new Date()));
  const [sellerId, setSellerId] = useState<number | ''>('');
  const [items, setItems] = useState<FormLineItem[]>([
    { vegetableId: 0, quantity: '', unit: 'kg', rateRupees: '' },
  ]);

  // Transport and Labour (Switcher: Per item vs One lump sum)
  const [transportMode, setTransportMode] = useState<'PER_ITEM' | 'LUMP_SUM'>('LUMP_SUM');
  const [transportRupees, setTransportRupees] = useState('920');
  const [labourRupees, setLabourRupees] = useState('300');

  // Bad-condition Goods Deduction (PRD 5.4)
  const [badGoods, setBadGoods] = useState<BadGoodsLineItem[]>([]);

  // Payment
  const [paidTodayRupees, setPaidTodayRupees] = useState('2400');
  const [accountId, setAccountId] = useState<number | ''>('');

  const [showSavedModal, setShowSavedModal] = useState(false);
  const [savedPurchaseSummary, setSavedPurchaseSummary] = useState<{
    supplierName: string;
    goodsTotal: number;
    paidAmount: number;
    stillOwed: number;
  } | null>(null);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      try {
        const [sellersRes, vegData, accData] = await Promise.all([
          getSellers(),
          getVegetables(),
          getAccounts(),
        ]);
        const sellersList = (sellersRes as any).sellers || sellersRes || [];
        setSellers(sellersList);
        setVegetables(vegData);
        setAccounts(accData);

        const defaultAcc = accData.find((a) => a.isDefault) || accData[0];
        if (defaultAcc && !isEdit) {
          setAccountId(defaultAcc.id);
        }

        if (isEdit) {
          const p = await getPurchase(parseInt(id));
          setDate(toInputDate(new Date(p.date)));
          setSellerId(p.sellerId);
          setTransportRupees(String(paiseToRupees((p as any).transportCost || (p as any).transport || 0)));
          setLabourRupees(String(paiseToRupees((p as any).labourCost || 0)));
          setPaidTodayRupees(String(paiseToRupees(p.paidAmount || 0)));
          setItems(
            p.items.map((it: any) => ({
              vegetableId: it.vegetableId,
              quantity: String(it.quantity),
              unit: it.unit || 'kg',
              rateRupees: String(paiseToRupees(it.rate)),
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

  const selectedSeller = sellers.find((s) => s.id === Number(sellerId));
  const currentWeOweRupees = paiseToRupees(selectedSeller?.currentBalance || 0);

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
      return copy;
    });
  };

  const handleAddBadGoods = () => {
    setBadGoods((prev) => [
      ...prev,
      { vegetableId: items[0]?.vegetableId || 0, quantity: '26', unit: 'kg', rateRupees: items[0]?.rateRupees || '18' },
    ]);
  };

  const handleRemoveBadGoods = (idx: number) => {
    setBadGoods((prev) => prev.filter((_, i) => i !== idx));
  };

  // Calculations
  const grossPurchaseRupees = items.reduce((sum, it) => {
    const qty = parseFloat(it.quantity) || 0;
    const rate = parseFloat(it.rateRupees) || 0;
    return sum + qty * rate;
  }, 0);

  const badGoodsDeductionRupees = badGoods.reduce((sum, it) => {
    const qty = parseFloat(it.quantity) || 0;
    const rate = parseFloat(it.rateRupees) || 0;
    return sum + qty * rate;
  }, 0);

  const payableToSupplierRupees = Math.max(0, grossPurchaseRupees - badGoodsDeductionRupees);
  const paidTodayVal = parseFloat(paidTodayRupees) || 0;
  const stillOwedRupees = Math.max(0, payableToSupplierRupees - paidTodayVal);

  const transportVal = parseFloat(transportRupees) || 0;
  const labourVal = parseFloat(labourRupees) || 0;
  const totalCostRupees = grossPurchaseRupees - badGoodsDeductionRupees + transportVal + labourVal;

  const handleSavePurchase = async () => {
    if (!sellerId) {
      alert('कृपया सप्लायर चुनें (Please select supplier)');
      return;
    }
    const validItems = items.filter(
      (it) => it.vegetableId && (parseFloat(it.quantity) || 0) > 0
    );
    if (validItems.length === 0) {
      alert('कृपया कम से कम एक सब्ज़ी जोड़ें (Add at least 1 vegetable)');
      return;
    }

    setSaving(true);
    try {
      const payload: any = {
        date: new Date(date).toISOString(),
        sellerId: Number(sellerId),
        items: validItems.map((it) => ({
          vegetableId: Number(it.vegetableId),
          quantity: parseFloat(it.quantity) || 0,
          unit: it.unit || 'kg',
          rate: rupeesToPaise(parseFloat(it.rateRupees) || 0),
        })),
        transportCost: rupeesToPaise(transportVal),
        labourCost: rupeesToPaise(labourVal),
        paidAmount: rupeesToPaise(paidTodayVal),
        accountId: accountId ? Number(accountId) : undefined,
      };

      if (isEdit && id) {
        await updatePurchase(parseInt(id), payload);
      } else {
        await createPurchase(payload);
      }
      setSavedPurchaseSummary({
        supplierName: selectedSeller?.name || 'Supplier',
        goodsTotal: payableToSupplierRupees,
        paidAmount: paidTodayVal,
        stillOwed: stillOwedRupees,
      });
      setShowSavedModal(true);
    } catch (err: any) {
      alert(`त्रुटि: ${err.message || 'खरीद दर्ज नहीं हो सकी'}`);
    } finally {
      setSaving(false);
    }
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
        <h1 className="h">Buy Desk</h1>
        <span className="m">Works offline · backed up 2h ago</span>
      </div>

      {/* Tabs */}
      <div className="t">
        <button type="button" onClick={() => navigate('/')}>Home</button>
        <button type="button" className="on">Purchase</button>
        <button type="button" onClick={() => navigate('/sellers')}>Suppliers</button>
        <button type="button" onClick={() => navigate('/vegetables')}>Vegetables</button>
        <button type="button" onClick={() => navigate('/purchases')}>Dashboard</button>
      </div>

      {/* Supplier Card */}
      <div className="c">
        <div className="r">
          <div className="flex items-center gap-2">
            <span className="m font-bold">Supplier</span>
            <button
              type="button"
              onClick={() => setSellerModalOpen(true)}
              className="text-xs font-bold text-[#1F6B45] hover:underline cursor-pointer bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200"
            >
              + Add Supplier
            </button>
          </div>
          <span className="m">{formatDate(date, 'd MMM')}</span>
        </div>
        <div className="r">
          <div className="flex-1">
            <select
              value={sellerId}
              onChange={(e) => {
                if (e.target.value === '__new__') {
                  setSellerModalOpen(true);
                } else {
                  setSellerId(Number(e.target.value));
                }
              }}
              className="w-full font-bold text-base bg-transparent border-0 focus:outline-hidden cursor-pointer"
            >
              <option value="">-- सप्लायर चुनें / Select Supplier --</option>
              <option value="__new__">✨ + नया सप्लायर जोड़ें (+ Add Supplier)</option>
              {sellers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} {s.village ? `(${s.village})` : ''}
                </option>
              ))}
            </select>
          </div>
          <span className="d">We owe ₹{currentWeOweRupees.toLocaleString('en-IN')}</span>
        </div>
      </div>

      {/* Purchase Lines Card */}
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
        <button
          type="button"
          onClick={() => alert('Slip photo uploaded.')}
          className="b b2"
        >
          Attach slip photo
        </button>
      </div>

      {/* Transport and Labour Card */}
      <div className="c">
        <b>Transport and labour</b>
        <div className="t">
          <button
            type="button"
            className={transportMode === 'PER_ITEM' ? 'on' : ''}
            onClick={() => setTransportMode('PER_ITEM')}
          >
            Per item
          </button>
          <button
            type="button"
            className={transportMode === 'LUMP_SUM' ? 'on' : ''}
            onClick={() => setTransportMode('LUMP_SUM')}
          >
            One lump sum
          </button>
        </div>

        <div className="r">
          <span>Transport</span>
          <div className="flex items-center gap-1">
            <span className="text-sm font-semibold">₹</span>
            <input
              type="number"
              value={transportRupees}
              onChange={(e) => setTransportRupees(e.target.value)}
              className="w-20 border border-[#DDE3D6] rounded-lg px-2 py-0.5 text-right font-bold text-sm bg-white"
            />
          </div>
        </div>

        <div className="r">
          <span>Labour</span>
          <div className="flex items-center gap-1">
            <span className="text-sm font-semibold">₹</span>
            <input
              type="number"
              value={labourRupees}
              onChange={(e) => setLabourRupees(e.target.value)}
              className="w-20 border border-[#DDE3D6] rounded-lg px-2 py-0.5 text-right font-bold text-sm bg-white"
            />
          </div>
        </div>
        <span className="m">Added to cost, split across vegetables by kg</span>
      </div>

      {/* Bad-condition Goods Card */}
      <div className="c">
        <div className="r">
          <b>Bad-condition goods</b>
          <button
            type="button"
            onClick={handleAddBadGoods}
            className="text-xs text-[#1F6B45] font-bold"
          >
            + Add deduction
          </button>
        </div>

        {badGoods.length === 0 ? (
          <span className="m">No damaged goods recorded</span>
        ) : (
          badGoods.map((bg, idx) => {
            const lineAmt = (parseFloat(bg.quantity) || 0) * (parseFloat(bg.rateRupees) || 0);
            return (
              <div key={idx} className="r border-b border-[#DDE3D6] pb-2 last:border-0 last:pb-0">
                <div>
                  <div className="font-semibold text-xs">
                    Damaged item #{idx + 1}
                  </div>
                  <div className="m flex items-center gap-1 mt-0.5">
                    <input
                      type="number"
                      value={bg.quantity}
                      onChange={(e) => {
                        const copy = [...badGoods];
                        copy[idx].quantity = e.target.value;
                        setBadGoods(copy);
                      }}
                      className="w-12 border border-[#DDE3D6] rounded px-1 text-xs"
                    />
                    <span>kg · ₹</span>
                    <input
                      type="number"
                      value={bg.rateRupees}
                      onChange={(e) => {
                        const copy = [...badGoods];
                        copy[idx].rateRupees = e.target.value;
                        setBadGoods(copy);
                      }}
                      className="w-12 border border-[#DDE3D6] rounded px-1 text-xs"
                    />
                    <span>/kg</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <b className="d">−₹{lineAmt.toLocaleString('en-IN')}</b>
                  <button
                    type="button"
                    onClick={() => handleRemoveBadGoods(idx)}
                    className="text-xs text-rose-600 font-bold"
                  >
                    ✕
                  </button>
                </div>
              </div>
            );
          })
        )}
        <button
          type="button"
          onClick={() => alert('Goods photo attached.')}
          className="b b2 mt-1"
        >
          Attach photo of goods
        </button>
      </div>

      {/* Summary Card */}
      <div className="c">
        <div className="r">
          <span>Purchase</span>
          <b>₹{grossPurchaseRupees.toLocaleString('en-IN')}</b>
        </div>
        <div className="r">
          <span>Bad-goods deduction</span>
          <b>−₹{badGoodsDeductionRupees.toLocaleString('en-IN')}</b>
        </div>
        <div className="r">
          <span>Payable to supplier</span>
          <b>₹{payableToSupplierRupees.toLocaleString('en-IN')}</b>
        </div>
        <div className="r">
          <span>Paid today</span>
          <div className="flex items-center gap-1">
            <span className="text-sm font-semibold">₹</span>
            <input
              type="number"
              value={paidTodayRupees}
              onChange={(e) => setPaidTodayRupees(e.target.value)}
              className="w-24 border border-[#DDE3D6] rounded-lg px-2 py-1 text-right font-bold text-sm bg-white"
            />
          </div>
        </div>
        <div className="r">
          <span>Still owed to supplier</span>
          <b className="d">₹{stillOwedRupees.toLocaleString('en-IN')}</b>
        </div>
        <div className="r border-t border-[#DDE3D6] pt-1">
          <span className="m">Cost of this lot incl. transport and labour</span>
          <b>₹{totalCostRupees.toLocaleString('en-IN')}</b>
        </div>
      </div>

      {/* Actions */}
      <button
        type="button"
        disabled={saving}
        onClick={handleSavePurchase}
        className="b"
      >
        {saving ? 'Saving...' : 'Save purchase'}
      </button>

      {sellerId && (
        <button
          type="button"
          onClick={() => navigate(`/sellers/${sellerId}`)}
          className="b b2"
        >
          Supplier ledger
        </button>
      )}

      {/* Modals */}
      {showSavedModal && savedPurchaseSummary && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#F6F7F2] border-2 border-[#1F6B45] rounded-2xl max-w-sm w-full p-5 shadow-2xl space-y-4">
            <div className="text-center space-y-1">
              <div className="w-12 h-12 bg-[#1F6B45] text-white rounded-full flex items-center justify-center mx-auto text-2xl font-bold shadow-md">
                ✓
              </div>
              <h2 className="text-lg font-bold text-[#1B2A1F]">खरीद सेव हो गई! (Purchase Saved)</h2>
              <p className="text-xs text-gray-600">
                {savedPurchaseSummary.supplierName} · {formatDate(date, 'd MMM yyyy')}
              </p>
            </div>

            <div className="bg-white rounded-xl p-3 border border-[#DDE3D6] space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">कुल माल (Payable Goods)</span>
                <span className="font-semibold text-[#1B2A1F]">₹{savedPurchaseSummary.goodsTotal.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">आज दिया (Paid Today)</span>
                <span className="font-semibold text-emerald-700">₹{savedPurchaseSummary.paidAmount.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between border-t border-[#DDE3D6] pt-1.5 font-bold">
                <span className="text-gray-700">बाकी देना (Still Owed)</span>
                <span className="text-[#B4540A] text-base">₹{savedPurchaseSummary.stillOwed.toLocaleString('en-IN')}</span>
              </div>
            </div>

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  setShowSavedModal(false);
                  setSellerId('');
                  setItems([{ vegetableId: 0, quantity: '', unit: 'kg', rateRupees: '' }]);
                  setBadGoods([]);
                  setPaidTodayRupees('0');
                }}
                className="flex-1 bg-[#1F6B45] hover:bg-[#185336] text-white font-bold py-2.5 px-3 rounded-xl cursor-pointer text-xs text-center"
              >
                ➕ अगली खरीद (New Entry)
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowSavedModal(false);
                  navigate('/purchases');
                }}
                className="flex-1 bg-white hover:bg-gray-100 text-[#1B2A1F] border border-[#DDE3D6] font-semibold py-2.5 px-3 rounded-xl cursor-pointer text-xs text-center"
              >
                📋 खरीद लिस्ट (All Purchases)
              </button>
            </div>
          </div>
        </div>
      )}

      {sellerModalOpen && (
        <SellerModal
          isOpen={sellerModalOpen}
          onClose={() => setSellerModalOpen(false)}
          onSave={async (formData) => {
            const newSeller = await createSeller(formData);
            const data = await getSellers();
            const sList = (data as any).sellers || data || [];
            setSellers(sList);
            if (newSeller?.id) {
              setSellerId(newSeller.id);
            }
            setSellerModalOpen(false);
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
