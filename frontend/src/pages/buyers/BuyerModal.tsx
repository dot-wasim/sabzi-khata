import React, { useState, useEffect } from 'react';
import { Modal } from '../../components/Modal';
import { Buyer } from '../../utils/types';
import { rupeesToPaise, paiseToRupees } from '../../utils/currency';
import { X, Check } from 'lucide-react';

interface BuyerModalProps {
  isOpen: boolean;
  onClose: () => void;
  buyer?: Buyer | null;
  onSave: (data: any) => Promise<void>;
  onSaveAndBill?: (data: any) => Promise<void>;
}

export const BuyerModal: React.FC<BuyerModalProps> = ({
  isOpen,
  onClose,
  buyer,
  onSave,
  onSaveAndBill,
}) => {
  const [name, setName] = useState('');
  const [shopName, setShopName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [openingBalanceRupees, setOpeningBalanceRupees] = useState('0');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (buyer) {
      setName(buyer.name);
      setShopName(buyer.shopName || '');
      setPhone(buyer.phone || '');
      setAddress(buyer.address || '');
      setOpeningBalanceRupees(String(paiseToRupees(buyer.openingBalance || 0)));
    } else {
      setName('');
      setShopName('');
      setPhone('');
      setAddress('');
      setOpeningBalanceRupees('0');
    }
  }, [buyer, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (andBill = false) => {
    if (!name.trim()) {
      alert('कृपया ग्राहक का नाम लिखें (Customer name required)');
      return;
    }
    setLoading(true);
    try {
      const payload = {
        name: name.trim(),
        shopName: shopName.trim() || undefined,
        phone: phone.trim() || undefined,
        address: address.trim() || undefined,
        openingBalance: rupeesToPaise(openingBalanceRupees || 0),
      };

      if (andBill && onSaveAndBill) {
        await onSaveAndBill(payload);
      } else {
        await onSave(payload);
      }
      onClose();
    } catch (err: any) {
      alert('Failed to save customer');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center p-0 sm:p-4 backdrop-blur-2xs">
      <div className="bg-[#F6F4EC] w-full max-w-md rounded-t-3xl sm:rounded-2xl p-5 text-[#1B2A1F] shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
        {/* Handle bar on mobile */}
        <div className="w-11 h-1.5 rounded-full bg-[#BDB8A2] mx-auto -mt-1 sm:hidden" />

        {/* Header */}
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-bold">
            {buyer ? 'ग्राहक बदलें' : 'नया ग्राहक'}{' '}
            <span className="text-sm font-normal text-gray-600">/ {buyer ? 'Edit Customer' : 'New Customer'}</span>
          </h2>
          <button
            onClick={onClose}
            className="min-h-[36px] px-3 bg-white text-gray-700 border border-[#CFCAB6] rounded-full text-xs font-bold hover:bg-gray-100"
          >
            बंद
          </button>
        </div>

        {/* Inputs */}
        <div className="space-y-3.5 pt-1">
          <div>
            <label className="text-xs font-semibold text-gray-700 mb-1 block">
              नाम / Name *
            </label>
            <input
              type="text"
              required
              placeholder="जैसे: Imran Khan"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full min-h-[48px] bg-white border border-[#BDB8A2] rounded-xl px-3.5 text-base font-medium text-[#1B2A1F] focus:outline-hidden focus:border-[#1F6B3A]"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-700 mb-1 block">
              फोन / Phone
            </label>
            <input
              type="tel"
              placeholder="98XXX XXXXX"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full min-h-[48px] bg-white border border-[#BDB8A2] rounded-xl px-3.5 text-base font-medium text-[#1B2A1F] focus:outline-hidden focus:border-[#1F6B3A]"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-700 mb-1 block">
              दुकान का नाम / Shop name
            </label>
            <input
              type="text"
              placeholder="जैसे: Khan Fruits"
              value={shopName}
              onChange={(e) => setShopName(e.target.value)}
              className="w-full min-h-[48px] bg-white border border-[#BDB8A2] rounded-xl px-3.5 text-base font-medium text-[#1B2A1F] focus:outline-hidden focus:border-[#1F6B3A]"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-700 mb-1 block">
              पुराना बाकी / Opening balance (₹)
            </label>
            <input
              type="number"
              placeholder="0"
              value={openingBalanceRupees}
              onChange={(e) => setOpeningBalanceRupees(e.target.value)}
              className="w-full min-h-[48px] bg-white border border-[#BDB8A2] rounded-xl px-3.5 text-base font-medium text-[#1B2A1F] focus:outline-hidden focus:border-[#1F6B3A]"
            />
            <p className="text-[11px] text-[#5B6558] mt-1">
              जो पहले से बाकी है वही डालें। खाली हो तो 0 रहने दें।
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="pt-2 space-y-2.5">
          <button
            type="button"
            disabled={loading}
            onClick={() => handleSubmit(false)}
            className="w-full min-h-[48px] bg-[#1F6B3A] hover:bg-[#18552e] text-white font-bold text-sm rounded-xl flex items-center justify-center shadow-xs transition-colors disabled:opacity-50"
          >
            {loading ? 'सेव हो रहा है...' : 'सेव करें / Save'}
          </button>

          <button
            type="button"
            onClick={onClose}
            className="w-full min-h-[44px] bg-white text-gray-700 border border-[#CFCAB6] font-semibold text-xs rounded-xl hover:bg-gray-50"
          >
            रद्द करें / Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
