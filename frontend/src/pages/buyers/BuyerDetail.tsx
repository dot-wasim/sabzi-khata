import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getBuyer, getBuyerLedger, updateBuyer } from '../../api/buyers';
import { createPayment } from '../../api/payments';
import { BuyerModal } from './BuyerModal';
import { PaymentModal } from '../payments/PaymentModal';
import { formatDate } from '../../utils/date';
import { paiseToRupees } from '../../utils/currency';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import {
  ArrowLeft,
  Phone,
  MessageCircle,
  Edit2,
  Plus,
  Receipt,
  CreditCard
} from 'lucide-react';

export const BuyerDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<any>(null);
  const [ledger, setLedger] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);

  const buyerId = parseInt(id || '0');

  const fetchData = async () => {
    setLoading(true);
    try {
      const [buyerRes, ledgerRes] = await Promise.all([
        getBuyer(buyerId),
        getBuyerLedger(buyerId),
      ]);
      setData(buyerRes);
      setLedger(ledgerRes);
    } catch (err) {
      console.error('Failed to load buyer detail:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (buyerId) fetchData();
  }, [buyerId]);

  const handleUpdate = async (formData: any) => {
    await updateBuyer(buyerId, formData);
    fetchData();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <LoadingSpinner />
      </div>
    );
  }

  if (!data) return <div className="p-8 text-center text-gray-500">Buyer not found</div>;

  const { buyer, totalSold, totalReceived, balanceReceivable } = data;

  const handleCall = () => {
    if (buyer.phone) {
      window.open(`tel:${buyer.phone}`, '_self');
    } else {
      alert('Phone number not recorded');
    }
  };

  const handleWhatsAppReminder = () => {
    const dueAmount = paiseToRupees(balanceReceivable);
    const msg = `नमस्ते ${buyer.name} जी,
Hussain Foods की तरफ से आपके खाते का पिछला बकाया ₹${dueAmount.toLocaleString('en-IN')} है।
कृपया समय पर भुगतान करने का कष्ट करें।
धन्यवाद!`;

    const cleanPhone = buyer.phone ? buyer.phone.replace(/[^0-9]/g, '') : '';
    const url = cleanPhone
      ? `https://wa.me/91${cleanPhone}?text=${encodeURIComponent(msg)}`
      : `https://wa.me/?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="max-w-md mx-auto bg-[#F6F4EC] min-h-screen text-[#1B2A1F] pb-24 shadow-lg rounded-2xl overflow-hidden font-sans">
      {/* Top Header Card */}
      <div className="bg-[#1F6B3A] text-white p-5 pb-16">
        <button
          onClick={() => navigate('/buyers')}
          className="flex items-center gap-2 text-sm text-white/90 hover:text-white mb-2.5"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>ग्राहक / Customers</span>
        </button>

        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold">{buyer.name}</h1>
            <p className="text-xs text-white/80 mt-0.5">
              {buyer.shopName ? `${buyer.shopName} · ` : ''}
              {buyer.phone || 'No phone'}
            </p>
          </div>
          <button
            onClick={() => setEditModalOpen(true)}
            className="p-2 bg-white/10 hover:bg-white/20 rounded-xl text-white text-xs flex items-center gap-1"
          >
            <Edit2 className="w-3.5 h-3.5" />
            <span>Edit</span>
          </button>
        </div>

        {/* Quick Action Buttons inside Header */}
        <div className="grid grid-cols-2 gap-2.5 mt-4">
          <button
            onClick={handleCall}
            className="min-h-[44px] rounded-xl bg-white/20 hover:bg-white/30 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
          >
            <Phone className="w-4 h-4" />
            <span>फोन करें / Call</span>
          </button>
          <button
            onClick={handleWhatsAppReminder}
            className="min-h-[44px] rounded-xl bg-white text-[#1F6B3A] font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs hover:bg-emerald-50 transition-colors"
          >
            <MessageCircle className="w-4 h-4" />
            <span>WhatsApp याद दिलाएं</span>
          </button>
        </div>
      </div>

      {/* 4-Stat Overlapping Card */}
      <div className="-mt-10 mx-4 bg-white border border-[#E3DFD0] rounded-xl p-4 grid grid-cols-2 gap-3 shadow-sm">
        <div>
          <div className="text-xs text-[#5B6558]">पुराना बाकी / Opening</div>
          <div className="font-bold text-base mt-0.5">
            ₹{paiseToRupees(buyer.openingBalance || 0).toLocaleString('en-IN')}
          </div>
        </div>
        <div>
          <div className="text-xs text-[#5B6558]">कुल बिल / Total billed</div>
          <div className="font-bold text-base mt-0.5">
            ₹{paiseToRupees(totalSold).toLocaleString('en-IN')}
          </div>
        </div>
        <div>
          <div className="text-xs text-[#5B6558]">कुल जमा / Total paid</div>
          <div className="text-[#1F6B3A] font-bold text-base mt-0.5">
            ₹{paiseToRupees(totalReceived).toLocaleString('en-IN')}
          </div>
        </div>
        <div>
          <div className="text-xs text-[#5B6558]">अभी बाकी / Balance due</div>
          <div className="text-[#B3261E] font-extrabold text-xl mt-0.5">
            ₹{paiseToRupees(balanceReceivable).toLocaleString('en-IN')}
          </div>
        </div>
      </div>

      {/* Section Title */}
      <div className="flex justify-between items-center px-4 pt-4 pb-2">
        <span className="font-bold text-base text-[#1B2A1F]">खाता इतिहास / History</span>
        <span className="text-xs text-[#5B6558]">Recent Ledger</span>
      </div>

      {/* Ledger Entries List */}
      <div className="px-4 space-y-2.5">
        {ledger?.entries?.length === 0 ? (
          <div className="bg-white border border-[#E3DFD0] rounded-xl p-6 text-center text-sm text-gray-500">
            कोई पुराना लेनदेन नहीं (No ledger history)
          </div>
        ) : (
          ledger?.entries?.map((entry: any, idx: number) => {
            const isSale = entry.type === 'SALE';
            return (
              <div
                key={idx}
                className="bg-white border border-[#E3DFD0] rounded-xl p-3.5 shadow-2xs"
              >
                <div className="flex justify-between items-center">
                  <span className="font-bold text-sm text-[#1B2A1F]">
                    {formatDate(entry.date, 'd MMM')}
                  </span>
                  <span
                    className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${
                      isSale
                        ? 'bg-[#E4EFE6] text-[#1F6B3A]'
                        : 'bg-[#FBE9C8] text-[#6B4300]'
                    }`}
                  >
                    {isSale ? `बिल #${entry.referenceId || ''}` : 'भुगतान / Payment'}
                  </span>
                </div>

                <div className="text-xs text-[#5B6558] my-2 truncate">
                  {entry.notes || (isSale ? 'सब्ज़ी बिक्री' : 'खाते में जमा')}
                </div>

                <div className="grid grid-cols-3 gap-2 border-t border-dashed border-[#D5D0BC] pt-2 text-xs">
                  <div>
                    <span className="text-gray-400 block text-[10px]">बिल / Bill</span>
                    <span className="font-bold text-[#1B2A1F]">
                      {entry.debit ? `₹${paiseToRupees(entry.debit).toLocaleString('en-IN')}` : '—'}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-400 block text-[10px]">जमा / Paid</span>
                    <span className="font-bold text-[#1F6B3A]">
                      {entry.credit ? `₹${paiseToRupees(entry.credit).toLocaleString('en-IN')}` : '—'}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-400 block text-[10px]">बाकी / Balance</span>
                    <span className="font-bold text-[#B3261E]">
                      ₹{paiseToRupees(entry.runningBalance !== undefined ? entry.runningBalance : (entry.balance || 0)).toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Floating Bottom Bar */}
      <div className="fixed bottom-0 left-0 right-0 p-3 bg-white border-t border-[#E3DFD0] flex gap-2.5 max-w-md mx-auto z-40">
        <button
          onClick={() => setPaymentModalOpen(true)}
          className="flex-1 min-h-[48px] bg-white text-[#1F6B3A] border-2 border-[#1F6B3A] font-bold text-sm rounded-xl hover:bg-emerald-50 flex items-center justify-center gap-1.5 transition-colors"
        >
          <CreditCard className="w-4 h-4 text-emerald-600" />
          <span>+ जमा लें (Receive Pay)</span>
        </button>
        <button
          onClick={() => navigate('/sales/new')}
          className="flex-1.2 min-h-[48px] bg-[#1F6B3A] hover:bg-[#18552e] text-white font-bold text-sm rounded-xl flex items-center justify-center gap-1.5 shadow-sm transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>नया बिल / New Bill</span>
        </button>
      </div>

      {/* Edit Modal */}
      <BuyerModal
        isOpen={editModalOpen}
        buyer={buyer}
        onClose={() => setEditModalOpen(false)}
        onSave={handleUpdate}
      />

      {/* Direct Payment Modal (PRD 4.3) */}
      <PaymentModal
        isOpen={paymentModalOpen}
        defaultDirection="RECEIVED_FROM_BUYER"
        initialBuyerId={buyerId}
        onClose={() => setPaymentModalOpen(false)}
        onSave={async (paymentData) => {
          await createPayment(paymentData);
          setPaymentModalOpen(false);
          fetchData();
        }}
      />
    </div>
  );
};
