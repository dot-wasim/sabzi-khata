import React, { useState, useEffect } from 'react';
import { getVegetables, createVegetable, updateVegetable, deleteVegetable } from '../../api/vegetables';
import { Vegetable } from '../../utils/types';
import { Modal } from '../../components/Modal';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { Plus, Edit2, Trash2, Power, Sparkles, Check, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const VegetableList: React.FC = () => {
  const [vegetables, setVegetables] = useState<Vegetable[]>([]);
  const [allVegetables, setAllVegetables] = useState<Vegetable[]>([]);
  const [search, setSearch] = useState('');
  const [filterMode, setFilterMode] = useState<'ACTIVE' | 'ALL'>('ACTIVE');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingVeg, setEditingVeg] = useState<Vegetable | null>(null);
  const [formData, setFormData] = useState({
    nameEn: '',
    nameHi: '',
    unit: 'kg',
    category: 'Root',
  });
  const [saving, setSaving] = useState(false);

  const fetchList = async () => {
    setLoading(true);
    try {
      // Fetch both active-only and all vegetables
      const [activeData, allData] = await Promise.all([
        getVegetables(),
        // Custom query to see all deactivated seasonal vegetables
        fetch('http://' + (window.location.hostname || 'localhost') + ':3001/api/vegetables?showInactive=true', {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        }).then(r => r.json()).then(d => d.vegetables || d || []).catch(() => [])
      ]);
      setVegetables(activeData);
      setAllVegetables(allData.length > 0 ? allData : activeData);
    } catch (err) {
      console.error('Failed to load vegetables:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchList();
  }, []);

  const openAddModal = () => {
    setEditingVeg(null);
    setFormData({ nameEn: '', nameHi: '', unit: 'kg', category: 'Fruit' });
    setModalOpen(true);
  };

  const openEditModal = (veg: Vegetable) => {
    setEditingVeg(veg);
    setFormData({
      nameEn: veg.nameEn,
      nameHi: veg.nameHi,
      unit: veg.unit,
      category: veg.category || 'Root',
    });
    setModalOpen(true);
  };

  const handleToggleActive = async (veg: Vegetable) => {
    try {
      if (veg.active) {
        // Discard/Deactivate for off-season
        if (!window.confirm(`क्या आप "${veg.nameHi || veg.nameEn}" को इस सीज़न की लिस्ट से हटाना चाहते हैं? (Remove from active list)`)) return;
        await deleteVegetable(veg.id);
      } else {
        // Reactivate for current season
        await updateVegetable(veg.id, { active: true });
      }
      fetchList();
    } catch (err) {
      alert('Failed to update status');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nameEn.trim() && !formData.nameHi.trim()) {
      alert('कृपया सब्ज़ी का नाम लिखें (Vegetable name required)');
      return;
    }
    setSaving(true);
    try {
      if (editingVeg) {
        await updateVegetable(editingVeg.id, {
          nameEn: formData.nameEn.trim() || formData.nameHi.trim(),
          nameHi: formData.nameHi.trim() || formData.nameEn.trim(),
          unit: formData.unit,
          category: formData.category,
        });
      } else {
        await createVegetable({
          nameEn: formData.nameEn.trim() || formData.nameHi.trim(),
          nameHi: formData.nameHi.trim() || formData.nameEn.trim(),
          unit: formData.unit,
          category: formData.category,
        });
      }
      setModalOpen(false);
      fetchList();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to save vegetable');
    } finally {
      setSaving(false);
    }
  };

  const displayedList = (filterMode === 'ACTIVE' ? vegetables : allVegetables).filter((v) => {
    const q = search.toLowerCase();
    return (
      v.nameEn.toLowerCase().includes(q) ||
      v.nameHi.toLowerCase().includes(q)
    );
  });

  return (
    <div className="max-w-md mx-auto bg-[#F6F4EC] min-h-screen text-[#1B2A1F] pb-24 shadow-lg rounded-2xl overflow-hidden font-sans">
      {/* Header */}
      <div className="bg-[#1F6B3A] text-white p-5 pb-6">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-sm text-white/90 hover:text-white mb-2"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>वापस / Back</span>
        </button>
        <div className="flex items-baseline justify-between">
          <div>
            <h1 className="text-2xl font-bold">
              सब्ज़ी लिस्ट <span className="text-base font-normal opacity-90">/ Vegetables</span>
            </h1>
            <p className="text-xs text-white/80 mt-0.5">
              सीज़न के अनुसार चालू या बंद करें (Active/Seasonal)
            </p>
          </div>
          <button
            onClick={openAddModal}
            className="min-h-[40px] px-3.5 bg-white text-[#1F6B3A] font-bold text-xs rounded-xl shadow-xs hover:bg-emerald-50 flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>+ नई सब्ज़ी</span>
          </button>
        </div>
      </div>

      <div className="p-4 space-y-3.5 -mt-2">
        {/* Search */}
        <div>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="खोजें / Search vegetable..."
            className="w-full min-h-[46px] bg-white border border-[#BDB8A2] rounded-xl px-3.5 text-sm text-[#1B2A1F] focus:outline-hidden focus:border-[#1F6B3A] placeholder:text-gray-400"
          />
        </div>

        {/* Filter Toggle Chips */}
        <div className="flex gap-2">
          <button
            onClick={() => setFilterMode('ACTIVE')}
            className={`flex-1 min-h-[38px] rounded-xl text-xs font-bold border transition-all ${
              filterMode === 'ACTIVE'
                ? 'bg-[#1B2A1F] text-white border-[#1B2A1F]'
                : 'bg-white text-gray-700 border-[#CFCAB6] hover:bg-gray-50'
            }`}
          >
            चालू सीज़न ({vegetables.length})
          </button>
          <button
            onClick={() => setFilterMode('ALL')}
            className={`flex-1 min-h-[38px] rounded-xl text-xs font-bold border transition-all ${
              filterMode === 'ALL'
                ? 'bg-[#1B2A1F] text-white border-[#1B2A1F]'
                : 'bg-white text-gray-700 border-[#CFCAB6] hover:bg-gray-50'
            }`}
          >
            सभी / ऑफ-सीज़न ({allVegetables.length})
          </button>
        </div>

        {/* Informative Tip */}
        <div className="bg-emerald-50/80 border border-emerald-200 rounded-xl p-3 text-xs text-emerald-900 leading-relaxed">
          💡 <b>सीज़न सुविधा:</b> जो सब्ज़ी अभी बिक रही है उसे ही <b>"चालू"</b> रखें। ऑफ-सीज़न होने पर <b>"हटाएँ"</b> दबा दें। वह खरीद और बिक्री की लिस्ट से तुरंत गायब हो जाएगी।
        </div>

        {/* Vegetables List */}
        {loading ? (
          <div className="py-12 flex justify-center">
            <LoadingSpinner />
          </div>
        ) : displayedList.length === 0 ? (
          <div className="bg-white border border-[#E3DFD0] rounded-xl p-8 text-center text-sm text-gray-500">
            कोई सब्ज़ी नहीं मिली (No vegetables found)
          </div>
        ) : (
          <div className="space-y-2.5">
            {displayedList.map((veg) => {
              const isActive = veg.active !== false;

              return (
                <div
                  key={veg.id}
                  className={`bg-white border rounded-xl p-3.5 flex items-center justify-between shadow-2xs transition-all ${
                    isActive ? 'border-[#E3DFD0]' : 'border-dashed border-gray-300 opacity-60 bg-gray-50'
                  }`}
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <b className="text-base text-[#1B2A1F]">
                        {veg.nameHi} <span className="font-normal text-sm text-gray-500">/ {veg.nameEn}</span>
                      </b>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-sm bg-[#F6F4EC] text-gray-700 border border-[#E3DFD0]">
                        {veg.unit}
                      </span>
                    </div>

                    <div className="text-xs mt-1">
                      {isActive ? (
                        <span className="text-emerald-700 font-semibold flex items-center gap-1">
                          ● खरीद-बिक्री में चालू (Active in list)
                        </span>
                      ) : (
                        <span className="text-rose-600 font-medium">
                          ○ ऑफ-सीज़न / बंद (Hidden from buy/sell)
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => openEditModal(veg)}
                      className="p-2 text-gray-400 hover:text-emerald-700 rounded-lg hover:bg-gray-100"
                      title="Edit details"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => handleToggleActive(veg)}
                      className={`min-h-[34px] px-2.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1 ${
                        isActive
                          ? 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
                          : 'bg-emerald-600 text-white hover:bg-emerald-700'
                      }`}
                    >
                      {isActive ? (
                        <>
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>हटाएँ</span>
                        </>
                      ) : (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>चालू करें</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Floating Add Vegetable Bar */}
      <div className="fixed bottom-0 left-0 right-0 p-3 bg-white border-t border-[#E3DFD0] flex gap-2.5 max-w-md mx-auto z-40">
        <button
          onClick={openAddModal}
          className="w-full min-h-[48px] bg-[#1F6B3A] hover:bg-[#18552e] text-white font-bold text-sm rounded-xl flex items-center justify-center gap-2 shadow-sm transition-colors"
        >
          <Plus className="w-5 h-5" />
          <span>+ नई सब्ज़ी जोड़ें (Add New Vegetable)</span>
        </button>
      </div>

      {/* Add / Edit Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingVeg ? 'सब्ज़ी बदलें / Edit Vegetable' : '+ नई सब्ज़ी / Add Vegetable'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              हिंदी नाम / Hindi Name *
            </label>
            <input
              type="text"
              required
              placeholder="उदा. टमाटर, आलू, फूलगोभी"
              value={formData.nameHi}
              onChange={(e) => setFormData({ ...formData, nameHi: e.target.value })}
              className="w-full min-h-[44px] bg-white border border-[#BDB8A2] rounded-xl px-3 text-sm font-medium text-[#1B2A1F] focus:outline-hidden focus:border-[#1F6B3A]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              English Name *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Tomato, Potato"
              value={formData.nameEn}
              onChange={(e) => setFormData({ ...formData, nameEn: e.target.value })}
              className="w-full min-h-[44px] bg-white border border-[#BDB8A2] rounded-xl px-3 text-sm font-medium text-[#1B2A1F] focus:outline-hidden focus:border-[#1F6B3A]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              डिफ़ॉल्ट इकाई / Default Unit *
            </label>
            <select
              value={formData.unit}
              onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
              className="w-full min-h-[44px] bg-white border border-[#BDB8A2] rounded-xl px-3 text-sm font-medium text-[#1B2A1F] focus:outline-hidden focus:border-[#1F6B3A]"
            >
              <option value="kg">kg (किलो)</option>
              <option value="piece">piece (नग / पीस)</option>
              <option value="crate">crate (क्रेट)</option>
              <option value="sack">sack (बोरी)</option>
              <option value="bunch">bunch (गुच्छी)</option>
              <option value="quintal">quintal (क्विंटल)</option>
            </select>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={saving}
              className="w-full min-h-[48px] bg-[#1F6B3A] hover:bg-[#18552e] text-white font-bold text-sm rounded-xl flex items-center justify-center transition-colors disabled:opacity-50"
            >
              {saving ? 'सेव हो रहा है...' : 'सेव करें / Save'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
