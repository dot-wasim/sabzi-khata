import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getBuyers, createBuyer } from '../../api/buyers';
import { Buyer } from '../../utils/types';
import { SearchInput } from '../../components/SearchInput';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { EmptyState } from '../../components/EmptyState';
import { BuyerModal } from './BuyerModal';
import { paiseToRupees } from '../../utils/currency';
import { Plus, UserPlus, Phone, Search } from 'lucide-react';

export const BuyerList: React.FC = () => {
  const [buyers, setBuyers] = useState<Buyer[]>([]);
  const [search, setSearch] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'due' | 'clear'>('all');
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const navigate = useNavigate();

  const fetchList = async () => {
    setLoading(true);
    try {
      const data = await getBuyers();
      setBuyers(data);
    } catch (err) {
      console.error('Failed to load buyers:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchList();
  }, []);

  const handleCreate = async (formData: any) => {
    await createBuyer(formData);
    fetchList();
  };

  // Metrics
  const totalReceivable = buyers.reduce(
    (sum, b) => sum + Math.max(0, b.currentBalance || 0),
    0
  );
  const totalDueCount = buyers.filter((b) => (b.currentBalance || 0) > 0).length;
  const totalClearCount = buyers.filter((b) => (b.currentBalance || 0) <= 0).length;

  const filtered = buyers.filter((b) => {
    const matchesSearch =
      b.name.toLowerCase().includes(search.toLowerCase()) ||
      (b.contactPerson && b.contactPerson.toLowerCase().includes(search.toLowerCase())) ||
      (b.phone && b.phone.includes(search)) ||
      (b.shopName && b.shopName.toLowerCase().includes(search.toLowerCase()));

    if (!matchesSearch) return false;

    if (filterMode === 'due') return (b.currentBalance || 0) > 0;
    if (filterMode === 'clear') return (b.currentBalance || 0) <= 0;
    return true;
  });

  const getInitials = (name: string) => {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <div className="max-w-md mx-auto bg-[#F6F4EC] min-h-screen text-[#1B2A1F] pb-24 shadow-lg rounded-2xl overflow-hidden font-sans">
      {/* Top Header */}
      <div className="bg-[#1F6B3A] text-white p-5 pb-12">
        <div className="text-xs opacity-85">Hussain Foods · बिक्री डेस्क</div>
        <div className="text-2xl font-bold mt-1">
          ग्राहक खाता <span className="text-base font-normal opacity-90">/ Customers</span>
        </div>
      </div>

      {/* Metrics Cards Ribbon (Overlapping header like prototype) */}
      <div className="-mt-8 mx-4 grid grid-cols-2 gap-2.5">
        <div className="bg-white border border-[#E3DFD0] rounded-xl p-3.5 shadow-2xs">
          <div className="text-xs text-[#5B6558]">बाजार से लेना / To receive</div>
          <div className="text-[#B3261E] font-extrabold text-xl mt-0.5">
            ₹{paiseToRupees(totalReceivable).toLocaleString('en-IN')}
          </div>
        </div>

        <div className="bg-white border border-[#E3DFD0] rounded-xl p-3.5 shadow-2xs">
          <div className="text-xs text-[#5B6558]">ग्राहक स्थिति / Status</div>
          <div className="text-[#1F6B3A] font-extrabold text-xl mt-0.5">
            {buyers.length} ग्राहक
          </div>
        </div>
      </div>

      {/* Search Input */}
      <div className="px-4 pt-3.5">
        <div className="relative">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="नाम या फोन खोजें / Search name or phone"
            className="w-full min-h-[48px] bg-white border border-[#BDB8A2] rounded-xl px-3.5 text-sm text-[#1B2A1F] focus:outline-hidden focus:border-[#1F6B3A] placeholder:text-gray-400"
          />
        </div>
      </div>

      {/* Filter Chips */}
      <div className="flex gap-2 px-4 py-3">
        <button
          onClick={() => setFilterMode('all')}
          className={`min-h-[38px] px-3.5 rounded-full text-xs font-semibold border transition-all ${
            filterMode === 'all'
              ? 'bg-[#1B2A1F] text-white border-[#1B2A1F]'
              : 'bg-white text-[#1B2A1F] border-[#CFCAB6] hover:bg-gray-50'
          }`}
        >
          सभी · {buyers.length}
        </button>
        <button
          onClick={() => setFilterMode('due')}
          className={`min-h-[38px] px-3.5 rounded-full text-xs font-semibold border transition-all ${
            filterMode === 'due'
              ? 'bg-[#1B2A1F] text-white border-[#1B2A1F]'
              : 'bg-white text-[#1B2A1F] border-[#CFCAB6] hover:bg-gray-50'
          }`}
        >
          बाकी · {totalDueCount}
        </button>
        <button
          onClick={() => setFilterMode('clear')}
          className={`min-h-[38px] px-3.5 rounded-full text-xs font-semibold border transition-all ${
            filterMode === 'clear'
              ? 'bg-[#1B2A1F] text-white border-[#1B2A1F]'
              : 'bg-white text-[#1B2A1F] border-[#CFCAB6] hover:bg-gray-50'
          }`}
        >
          चुकता · {totalClearCount}
        </button>
      </div>

      {/* Customer List Cards */}
      <div className="px-4 space-y-2.5">
        {loading ? (
          <div className="py-12 flex justify-center">
            <LoadingSpinner />
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white border border-[#E3DFD0] rounded-xl p-8 text-center">
            <p className="text-gray-500 text-sm">कोई ग्राहक नहीं मिला (No customers found)</p>
          </div>
        ) : (
          filtered.map((buyer) => {
            const duePaise = buyer.currentBalance || 0;
            const isDue = duePaise > 0;

            return (
              <div
                key={buyer.id}
                onClick={() => navigate(`/buyers/${buyer.id}`)}
                className="bg-white border border-[#E3DFD0] rounded-xl p-3.5 flex items-center gap-3 shadow-2xs hover:border-[#1F6B3A] cursor-pointer transition-all"
              >
                {/* Avatar Badge */}
                <div className="w-11 h-11 rounded-full bg-[#E4EFE6] text-[#1F6B3A] font-bold text-sm flex items-center justify-center shrink-0">
                  {getInitials(buyer.name)}
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-base text-[#1B2A1F] truncate">
                    {buyer.name}
                  </div>
                  <div className="text-xs text-[#5B6558] truncate mt-0.5">
                    {buyer.shopName ? `${buyer.shopName} · ` : ''}
                    {buyer.phone || 'No phone'}
                  </div>
                  {buyer.address && (
                    <div className="text-[11px] text-[#5B6558] truncate">
                      {buyer.address}
                    </div>
                  )}
                </div>

                {/* Due Amount Status */}
                <div className="text-right shrink-0">
                  {isDue ? (
                    <>
                      <div className="text-[#B3261E] font-bold text-base">
                        ₹{paiseToRupees(duePaise).toLocaleString('en-IN')}
                      </div>
                      <div className="text-[11px] text-[#5B6558]">बाकी / Due</div>
                    </>
                  ) : (
                    <>
                      <div className="text-[#1F6B3A] font-bold text-base">चुकता</div>
                      <div className="text-[11px] text-[#5B6558]">Paid up</div>
                    </>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Floating Bottom Bar */}
      <div className="fixed bottom-0 left-0 right-0 p-3 bg-white border-t border-[#E3DFD0] flex gap-2.5 max-w-md mx-auto z-40">
        <button
          onClick={() => setModalOpen(true)}
          className="flex-1 min-h-[48px] bg-[#1F6B3A] hover:bg-[#18552e] text-white font-bold text-sm rounded-xl flex items-center justify-center gap-2 shadow-sm transition-colors"
        >
          <Plus className="w-5 h-5" />
          <span>नया ग्राहक / New Customer</span>
        </button>
      </div>

      {/* Modal */}
      <BuyerModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleCreate}
      />
    </div>
  );
};
