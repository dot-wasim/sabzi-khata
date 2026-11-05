import React, { useState, useEffect } from 'react';
import { Modal } from '../../components/Modal';
import { Seller } from '../../utils/types';
import { SELLER_TYPES } from '../../utils/constants';
import { rupeesToPaise, paiseToRupees } from '../../utils/currency';

interface SellerModalProps {
  isOpen: boolean;
  onClose: () => void;
  seller?: Seller | null;
  onSave: (data: any) => Promise<void>;
}

export const SellerModal: React.FC<SellerModalProps> = ({
  isOpen,
  onClose,
  seller,
  onSave,
}) => {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [village, setVillage] = useState('');
  const [type, setType] = useState('Farmer');
  const [isOwnFarmer, setIsOwnFarmer] = useState(false);
  const [notes, setNotes] = useState('');
  const [openingBalanceRupees, setOpeningBalanceRupees] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (seller) {
      setName(seller.name);
      setPhone(seller.phone || '');
      setVillage(seller.village || '');
      setType(seller.type || 'Farmer');
      setIsOwnFarmer(seller.isOwnFarmer || false);
      setNotes(seller.notes || '');
      setOpeningBalanceRupees(String(paiseToRupees(seller.openingBalance)));
    } else {
      setName('');
      setPhone('');
      setVillage('');
      setType('Farmer');
      setIsOwnFarmer(false);
      setNotes('');
      setOpeningBalanceRupees('0');
    }
  }, [seller, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSave({
        name: name.trim(),
        phone: phone.trim() || undefined,
        village: village.trim() || undefined,
        type,
        isOwnFarmer,
        notes: notes.trim() || undefined,
        openingBalance: rupeesToPaise(openingBalanceRupees || 0),
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
      title={seller ? 'Edit Seller (विक्रेता बदलें)' : 'Add New Seller (+ नया विक्रेता)'}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
            Seller / Farmer Name *
          </label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Ramesh Yadav"
            className="w-full px-3.5 py-2 border border-gray-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
              Phone Number
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="10-digit number"
              className="w-full px-3.5 py-2 border border-gray-200 rounded-xl text-sm focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
              Village / Location
            </label>
            <input
              type="text"
              value={village}
              onChange={(e) => setVillage(e.target.value)}
              placeholder="e.g. Barauli"
              className="w-full px-3.5 py-2 border border-gray-200 rounded-xl text-sm focus:outline-hidden"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
              Type
            </label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-hidden"
            >
              {SELLER_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
              Opening Balance (₹ dues)
            </label>
            <input
              type="number"
              step="any"
              value={openingBalanceRupees}
              onChange={(e) => setOpeningBalanceRupees(e.target.value)}
              placeholder="0"
              className="w-full px-3.5 py-2 border border-gray-200 rounded-xl text-sm focus:outline-hidden"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 p-3 bg-emerald-50/70 border border-emerald-100 rounded-xl">
          <input
            type="checkbox"
            id="isOwnFarmer"
            checked={isOwnFarmer}
            onChange={(e) => setIsOwnFarmer(e.target.checked)}
            className="w-4 h-4 text-emerald-600 rounded-md focus:ring-emerald-500 border-gray-300"
          />
          <label htmlFor="isOwnFarmer" className="text-sm font-medium text-emerald-900 cursor-pointer">
            Own Chemical-Free Farmer (हमारा अपना किसान)
          </label>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
            Notes
          </label>
          <textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Additional notes about supply or contact..."
            className="w-full px-3.5 py-2 border border-gray-200 rounded-xl text-sm focus:outline-hidden"
          />
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t border-gray-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-gray-200 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold shadow-xs disabled:opacity-50"
          >
            {loading ? 'Saving...' : seller ? 'Update Seller' : 'Add Seller'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
