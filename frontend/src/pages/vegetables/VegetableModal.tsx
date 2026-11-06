import React, { useState } from 'react';
import { Modal } from '../../components/Modal';
import { Vegetable } from '../../utils/types';
import { createVegetable } from '../../api/vegetables';
import { Carrot, Check } from 'lucide-react';

interface VegetableModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newVeg: Vegetable) => void;
}

export const VegetableModal: React.FC<VegetableModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [formData, setFormData] = useState({
    nameHi: '',
    nameEn: '',
    unit: 'kg',
    category: 'Root',
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nameHi.trim() && !formData.nameEn.trim()) {
      alert('कृपया सब्ज़ी का नाम लिखें (Please enter vegetable name)');
      return;
    }

    setSaving(true);
    try {
      const nameEn = formData.nameEn.trim() || formData.nameHi.trim();
      const nameHi = formData.nameHi.trim() || formData.nameEn.trim();

      const created = await createVegetable({
        nameEn,
        nameHi,
        unit: formData.unit,
        category: formData.category,
      });

      onSuccess(created);
      setFormData({ nameHi: '', nameEn: '', unit: 'kg', category: 'Root' });
      onClose();
    } catch (err: any) {
      alert(err.message || 'सब्ज़ी जोड़ने में त्रुटि हुई');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="नई सब्ज़ी जोड़ें / Add Vegetable">
      <form onSubmit={handleSubmit} className="space-y-3.5">
        <div>
          <label className="text-xs font-semibold text-gray-700 block mb-1">
            सब्ज़ी का नाम (हिंदी में) *
          </label>
          <input
            type="text"
            required
            placeholder="उदा. शिमला मिर्च, मटर, गाजर"
            value={formData.nameHi}
            onChange={(e) => setFormData({ ...formData, nameHi: e.target.value })}
            className="w-full min-h-[44px] bg-[#F6F4EC]/60 border border-[#BDB8A2] rounded-xl px-3 text-sm font-semibold text-[#1B2A1F] focus:outline-hidden focus:bg-white"
          />
        </div>

        <div>
          <label className="text-xs font-semibold text-gray-700 block mb-1">
            English Name (Optional)
          </label>
          <input
            type="text"
            placeholder="e.g. Capsicum, Peas, Carrot"
            value={formData.nameEn}
            onChange={(e) => setFormData({ ...formData, nameEn: e.target.value })}
            className="w-full min-h-[44px] bg-[#F6F4EC]/60 border border-[#BDB8A2] rounded-xl px-3 text-sm font-semibold text-[#1B2A1F] focus:outline-hidden focus:bg-white"
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs font-semibold text-gray-700 block mb-1">
              डिफ़ॉल्ट इकाई / Unit
            </label>
            <select
              value={formData.unit}
              onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
              className="w-full min-h-[44px] bg-[#F6F4EC]/60 border border-[#BDB8A2] rounded-xl px-2 text-xs font-semibold text-[#1B2A1F] focus:outline-hidden focus:bg-white"
            >
              <option value="kg">kg (किलो)</option>
              <option value="crate">crate (क्रेट)</option>
              <option value="sack">sack (बोरी)</option>
              <option value="piece">piece (नग)</option>
              <option value="bunch">bunch (गुच्छी)</option>
              <option value="quintal">quintal (क्विंटल)</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-700 block mb-1">
              श्रेणी / Category
            </label>
            <select
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className="w-full min-h-[44px] bg-[#F6F4EC]/60 border border-[#BDB8A2] rounded-xl px-2 text-xs font-semibold text-[#1B2A1F] focus:outline-hidden focus:bg-white"
            >
              <option value="Root">Root (जड़)</option>
              <option value="Leafy">Leafy (पत्तेदार)</option>
              <option value="Fruit">Fruit (फल/टमाटर)</option>
              <option value="Herbs">Herbs (धनिया/मिर्च)</option>
              <option value="Others">Others (अन्य)</option>
            </select>
          </div>
        </div>

        <div className="pt-2 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 min-h-[46px] border border-gray-300 rounded-xl text-xs font-bold text-gray-700 hover:bg-gray-100"
          >
            रद्द करें / Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex-1 min-h-[46px] bg-[#1F6B3A] text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 hover:bg-[#18552e] disabled:opacity-50"
          >
            <Check className="w-4 h-4" />
            <span>{saving ? 'जोड़ रहे हैं...' : '+ जोड़ें / Add'}</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};
