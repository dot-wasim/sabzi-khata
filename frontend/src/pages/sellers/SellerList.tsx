import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSellers, createSeller } from '../../api/sellers';
import { Seller } from '../../utils/types';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { SellerModal } from './SellerModal';
import { paiseToRupees } from '../../utils/currency';
import { Plus, Search, ShoppingBag } from 'lucide-react';

export const SellerList: React.FC = () => {
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<'ALL' | 'FARMER' | 'TRADER' | 'OWN_FARMER'>('ALL');
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const navigate = useNavigate();

  const fetchList = async () => {
    setLoading(true);
    try {
      const data: any = await getSellers();
      setSellers(data.sellers || data || []);
    } catch (err) {
      console.error('Failed to load sellers:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchList();
  }, []);

  const handleCreate = async (formData: any) => {
    await createSeller(formData);
    fetchList();
  };

  // Metrics
  const totalPayable = sellers.reduce(
    (sum, s) => sum + Math.max(0, s.currentBalance || 0),
    0
  );
  const totalFarmerCount = sellers.filter((s) => s.type === 'Farmer' || !s.type).length;
  const totalTraderCount = sellers.filter((s) => s.type === 'Mandi Trader' || s.type === 'Trader').length;
  const totalOwnCount = sellers.filter((s) => s.isOwnFarmer).length;

  const filtered = sellers.filter((s) => {
    const matchesSearch =
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      (s.phone && s.phone.includes(search)) ||
      (s.village && s.village.toLowerCase().includes(search.toLowerCase()));

    if (!matchesSearch) return false;
    if (filterType === 'OWN_FARMER') return s.isOwnFarmer;
    if (filterType === 'FARMER') return s.type === 'Farmer' || !s.type;
    if (filterType === 'TRADER') return s.type === 'Mandi Trader' || s.type === 'Trader';
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
        <div className="text-xs opacity-85">Hussain Foods · खरीद डेस्क</div>
        <div className="text-2xl font-bold mt-1">
          विक्रेता <span className="text-base font-normal opacity-90">/ Sellers</span>
        </div>
      </div>

      {/* Metrics Cards Ribbon (Overlapping header) */}
      <div className="-mt-8 mx-4 grid grid-cols-2 gap-2.5">
        <div className="bg-white border border-[#E3DFD0] rounded-xl p-3.5 shadow-2xs">
          <div className="text-xs text-[#5B6558]">किसानों को देना / To pay</div>
          <div className="text-[#B3261E] font-extrabold text-xl mt-0.5">
            ₹{paiseToRupees(totalPayable).toLocaleString('en-IN')}
          </div>
        </div>

        <div className="bg-white border border-[#E3DFD0] rounded-xl p-3.5 shadow-2xs">
          <div className="text-xs text-[#5B6558]">कुल विक्रेता / Total sellers</div>
          <div className="text-[#1F6B3A] font-extrabold text-xl mt-0.5">
            {sellers.length} पार्टी
          </div>
        </div>
      </div>

      {/* Search Input */}
      <div className="px-4 pt-3.5">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="नाम, गाँव या फोन खोजें / Search"
          className="w-full min-h-[48px] bg-white border border-[#BDB8A2] rounded-xl px-3.5 text-sm text-[#1B2A1F] focus:outline-hidden focus:border-[#1F6B3A] placeholder:text-gray-400"
        />
      </div>

      {/* Filter Chips */}
      <div className="flex gap-2 px-4 py-3 overflow-x-auto no-scrollbar">
        <button
          onClick={() => setFilterType('ALL')}
          className={`min-h-[38px] px-3.5 rounded-full text-xs font-semibold border shrink-0 transition-all ${
            filterType === 'ALL'
              ? 'bg-[#1B2A1F] text-white border-[#1B2A1F]'
              : 'bg-white text-[#1B2A1F] border-[#CFCAB6] hover:bg-gray-50'
          }`}
        >
          सभी · {sellers.length}
        </button>
        <button
          onClick={() => setFilterType('FARMER')}
          className={`min-h-[38px] px-3.5 rounded-full text-xs font-semibold border shrink-0 transition-all ${
            filterType === 'FARMER'
              ? 'bg-[#1B2A1F] text-white border-[#1B2A1F]'
              : 'bg-white text-[#1B2A1F] border-[#CFCAB6] hover:bg-gray-50'
          }`}
        >
          किसान · {totalFarmerCount}
        </button>
        <button
          onClick={() => setFilterType('TRADER')}
          className={`min-h-[38px] px-3.5 rounded-full text-xs font-semibold border shrink-0 transition-all ${
            filterType === 'TRADER'
              ? 'bg-[#1B2A1F] text-white border-[#1B2A1F]'
              : 'bg-white text-[#1B2A1F] border-[#CFCAB6] hover:bg-gray-50'
          }`}
        >
          व्यापारी · {totalTraderCount}
        </button>
        <button
          onClick={() => setFilterType('OWN_FARMER')}
          className={`min-h-[38px] px-3.5 rounded-full text-xs font-semibold border shrink-0 transition-all ${
            filterType === 'OWN_FARMER'
              ? 'bg-[#1B2A1F] text-white border-[#1B2A1F]'
              : 'bg-white text-[#1B2A1F] border-[#CFCAB6] hover:bg-gray-50'
          }`}
        >
          ★ अपना खेत · {totalOwnCount}
        </button>
      </div>

      {/* Seller List Cards */}
      <div className="px-4 space-y-2.5">
        {loading ? (
          <div className="py-12 flex justify-center">
            <LoadingSpinner />
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white border border-[#E3DFD0] rounded-xl p-8 text-center">
            <p className="text-gray-500 text-sm">कोई विक्रेता नहीं मिला (No sellers found)</p>
          </div>
        ) : (
          filtered.map((seller) => {
            const duePaise = seller.currentBalance || 0;
            const isDue = duePaise > 0;

            return (
              <div
                key={seller.id}
                onClick={() => navigate(`/sellers/${seller.id}`)}
                className="bg-white border border-[#E3DFD0] rounded-xl p-3.5 flex items-center gap-3 shadow-2xs hover:border-[#1F6B3A] cursor-pointer transition-all"
              >
                {/* Avatar Badge */}
                <div className="w-11 h-11 rounded-full bg-[#E4EFE6] text-[#1F6B3A] font-bold text-sm flex items-center justify-center shrink-0">
                  {getInitials(seller.name)}
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-base text-[#1B2A1F] truncate flex items-center gap-1.5">
                    <span>{seller.name}</span>
                    {seller.isOwnFarmer && (
                      <span className="text-amber-600 text-xs">★</span>
                    )}
                  </div>
                  <div className="text-xs text-[#5B6558] truncate mt-0.5">
                    {seller.village ? `${seller.village} · ` : ''}
                    {seller.type === 'Farmer' || !seller.type ? 'किसान' : 'व्यापारी'}
                    {seller.phone ? ` · ${seller.phone}` : ''}
                  </div>
                  <div className="mt-1">
                    <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded-md bg-[#F6E8D2] text-[#9A5B13]">
                      {seller.isOwnFarmer
                        ? 'अपना खेत'
                        : seller.type === 'Farmer' || !seller.type
                        ? 'किसान'
                        : 'व्यापारी'}
                    </span>
                  </div>
                </div>

                {/* Balance Status */}
                <div className="text-right shrink-0">
                  {isDue ? (
                    <>
                      <div className="text-[#B3261E] font-bold text-base">
                        ₹{paiseToRupees(duePaise).toLocaleString('en-IN')}
                      </div>
                      <div className="text-[11px] text-[#5B6558]">देना बाकी</div>
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
          className="flex-1 min-h-[48px] bg-white text-[#1F6B3A] border-2 border-[#1F6B3A] font-bold text-sm rounded-xl hover:bg-emerald-50 flex items-center justify-center transition-colors"
        >
          + विक्रेता
        </button>

        <button
          onClick={() => navigate('/purchases/new')}
          className="flex-2 min-h-[48px] bg-[#1F6B3A] hover:bg-[#18552e] text-white font-bold text-sm rounded-xl flex items-center justify-center gap-2 shadow-sm transition-colors"
        >
          <Plus className="w-5 h-5" />
          <span>+ नई खरीद / New purchase</span>
        </button>
      </div>

      {/* Modal */}
      <SellerModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleCreate}
      />
    </div>
  );
};
