import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useSimulator } from '../context/SimulatorContext';
import { useBossAuth } from '../context/BossAuthContext';
import {
  Smartphone,
  Monitor,
  RotateCw,
  RefreshCw,
  Trash2,
  Share2,
  TrendingUp,
  ShoppingCart,
  BarChart3,
  Users,
  Carrot,
  PlusCircle,
  Copy,
  Check,
  X,
  Sparkles,
  Wifi,
  BatteryCharging,
  Maximize2
} from 'lucide-react';

interface MacSimulatorProps {
  children: React.ReactNode;
}

export const MacSimulator: React.FC<MacSimulatorProps> = ({ children }) => {
  const {
    isSimulator,
    setIsSimulator,
    scale,
    setScale,
    deviceModel,
    setDeviceModel,
    whatsappModal,
    closeWhatsAppModal,
    seedDemoData,
    resetAllData,
  } = useSimulator();

  const navigate = useNavigate();
  const location = useLocation();
  const { unlockBoss } = useBossAuth();

  const [copied, setCopied] = useState(false);
  const [currentTime, setCurrentTime] = useState('');

  // Clock for mobile status bar
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })
      );
    };
    updateTime();
    const timer = setInterval(updateTime, 10000);
    return () => clearInterval(timer);
  }, []);

  const handleCopyWhatsApp = () => {
    if (!whatsappModal?.text) return;
    navigator.clipboard.writeText(whatsappModal.text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Dimensions based on selected phone model
  const deviceDimensions = {
    pixel: { width: 412, height: 860, name: 'Google Pixel 8' },
    iphone: { width: 393, height: 852, name: 'iPhone 15 Pro' },
    compact: { width: 360, height: 780, name: 'Compact Mandi Phone' },
  }[deviceModel];

  // If simulator is disabled, render pure app directly without any simulator bars or frames
  if (!isSimulator) {
    return <>{children}</>;
  }

  // Active desk detector
  const isSell = location.pathname.startsWith('/sales') || location.pathname.startsWith('/buyers');
  const isBuy = location.pathname.startsWith('/purchases') || location.pathname.startsWith('/sellers');
  const isBoss = location.pathname.startsWith('/boss') || location.pathname.startsWith('/accounts') || location.pathname.startsWith('/reports');

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans select-none overflow-x-hidden">
      {/* ======================================================== */}
      {/* MAC STUDIO TOP BAR                                       */}
      {/* ======================================================== */}
      <header className="bg-slate-900 border-b border-slate-800 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 shrink-0 z-30">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-600 to-green-500 flex items-center justify-center text-lg shadow-md">
            🥬
          </div>
          <div>
            <h1 className="font-extrabold text-sm sm:text-base text-white tracking-tight flex items-center gap-2">
              <span>Sabzi Khata</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Mac Phone Simulator
              </span>
            </h1>
            <p className="text-[11px] text-slate-400">Hussain Foods · Mandi Bahi Khata v1.3</p>
          </div>
        </div>

        {/* Studio Controls */}
        <div className="flex items-center gap-2">
          {/* Desk Quick Switcher Tabs */}
          <div className="bg-slate-800 p-1 rounded-xl flex items-center gap-1 text-xs font-bold border border-slate-700">
            <button
              onClick={() => navigate('/')}
              className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 ${
                location.pathname === '/' ? 'bg-[#1F6B45] text-white shadow-xs' : 'text-slate-300 hover:text-white'
              }`}
            >
              <span>🏠 Home</span>
            </button>
            <button
              onClick={() => navigate('/sales')}
              className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 ${
                isSell ? 'bg-[#1F6B45] text-white shadow-xs' : 'text-slate-300 hover:text-white'
              }`}
            >
              <span>🥬 Sell Desk</span>
            </button>
            <button
              onClick={() => navigate('/purchases')}
              className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 ${
                isBuy ? 'bg-[#1F6B45] text-white shadow-xs' : 'text-slate-300 hover:text-white'
              }`}
            >
              <span>🚜 Buy Desk</span>
            </button>
            <button
              onClick={() => {
                unlockBoss();
                navigate('/boss');
              }}
              className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 ${
                isBoss ? 'bg-[#B4540A] text-white shadow-xs' : 'text-slate-300 hover:text-white'
              }`}
            >
              <span>👑 Boss Desk</span>
            </button>
          </div>

          {/* Model Switcher */}
          <select
            value={deviceModel}
            onChange={(e) => setDeviceModel(e.target.value as any)}
            className="bg-slate-800 border border-slate-700 text-slate-200 text-xs font-semibold rounded-xl px-2.5 py-1.5 focus:outline-hidden"
          >
            <option value="pixel">📱 Pixel 8 (412px)</option>
            <option value="iphone">📱 iPhone 15 (393px)</option>
            <option value="compact">📱 Compact (360px)</option>
          </select>

          {/* Zoom / Scale Selector */}
          <select
            value={scale}
            onChange={(e) => setScale(parseFloat(e.target.value))}
            className="bg-slate-800 border border-slate-700 text-slate-200 text-xs font-semibold rounded-xl px-2 py-1.5 focus:outline-hidden"
          >
            <option value="0.75">Zoom: 75%</option>
            <option value="0.82">Zoom: 82%</option>
            <option value="0.88">Zoom: 88% (Best)</option>
            <option value="0.95">Zoom: 95%</option>
            <option value="1.0">Zoom: 100%</option>
          </select>

          {/* Switch to Desktop Layout View */}
          <button
            onClick={() => setIsSimulator(false)}
            className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
            title="डेस्कटॉप फुलस्क्रीन मोड (Normal Desktop View)"
          >
            <Monitor className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">फुलस्क्रीन</span>
          </button>
        </div>
      </header>

      {/* ======================================================== */}
      {/* MAIN WORKSPACE: STUDIO TOOLBOX + SIMULATED PHONE         */}
      {/* ======================================================== */}
      <div className="flex-1 flex flex-col lg:flex-row items-center lg:items-start justify-center gap-6 p-4 md:p-6 overflow-y-auto">
        {/* LEFT TOOLBOX (Mandi Quick Actions & Demo Seeder) */}
        <div className="w-full lg:w-72 bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-4 shrink-0 shadow-xl order-2 lg:order-1">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
                ⚡ तुरंत टेस्ट करें (Quick Actions)
              </span>
              <span className="text-[10px] text-emerald-400 font-bold bg-emerald-950/60 px-1.5 py-0.5 rounded-sm">
                1-Click
              </span>
            </div>

            <div className="space-y-1.5 text-xs font-bold">
              <button
                onClick={() => navigate('/')}
                className="w-full text-left p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center justify-between transition-all"
              >
                <span>🏠 मुख्य पृष्ठ (Home Overview)</span>
                <span className="text-slate-400">→</span>
              </button>

              <button
                onClick={() => navigate('/sales/new')}
                className="w-full text-left p-2 rounded-xl bg-[#1F6B45]/20 hover:bg-[#1F6B45]/30 text-emerald-300 border border-[#1F6B45]/40 flex items-center justify-between transition-all"
              >
                <span>📝 + नया दैनिक बिल (Sell Bill)</span>
                <span className="text-emerald-400">→</span>
              </button>

              <button
                onClick={() => navigate('/buyers')}
                className="w-full text-left p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center justify-between transition-all"
              >
                <span>👥 ग्राहक खाते व लेजर (Accounts)</span>
                <span className="text-slate-400">→</span>
              </button>

              <button
                onClick={() => navigate('/purchases/new')}
                className="w-full text-left p-2 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 flex items-center justify-between transition-all"
              >
                <span>🛒 + नई मंडी खरीद (Mandi Buy)</span>
                <span className="text-emerald-400">→</span>
              </button>

              <button
                onClick={() => navigate('/sellers')}
                className="w-full text-left p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center justify-between transition-all"
              >
                <span>🚜 सप्लायर सूची व लेजर (Suppliers)</span>
                <span className="text-slate-400">→</span>
              </button>

              <button
                onClick={() => navigate('/vegetables')}
                className="w-full text-left p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center justify-between transition-all"
              >
                <span>🥬 सब्जियां व क्रेट वजन (Vegetables)</span>
                <span className="text-slate-400">→</span>
              </button>

              <button
                onClick={() => {
                  unlockBoss();
                  navigate('/boss');
                }}
                className="w-full text-left p-2 rounded-xl bg-[#B4540A]/20 hover:bg-[#B4540A]/30 text-amber-300 border border-[#B4540A]/40 flex items-center justify-between transition-all"
              >
                <span>👑 बॉस डेस्क (Boss Desk Reports)</span>
                <span className="text-amber-400">→</span>
              </button>
            </div>
          </div>

          {/* Demo Data Generator */}
          <div className="pt-3 border-t border-slate-800 space-y-2">
            <span className="text-xs font-extrabold uppercase tracking-wider text-slate-400 block">
              📦 टेस्टिंग डेटा (Demo Data)
            </span>
            <button
              type="button"
              onClick={seedDemoData}
              className="w-full p-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-xs rounded-xl shadow-md flex items-center justify-center gap-1.5 transition-all"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>🔄 लोड करें मंडी सैंपल डेटा (Seed Data)</span>
            </button>
            <p className="text-[11px] text-slate-400 leading-tight">
              क्लिक करने पर तुरंत 4 ग्राहक, 3 किसान, पिछले बिल और बाकी का हिसाब लोड हो जाएगा।
            </p>

            <button
              type="button"
              onClick={resetAllData}
              className="w-full p-2 bg-rose-950/40 hover:bg-rose-900/40 text-rose-300 border border-rose-800/40 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-400" />
              <span>डेटा रीसेट करें (Clear Khata Data)</span>
            </button>
          </div>

          {/* PRD v1.0 Checklist Box */}
          <div className="pt-3 border-t border-slate-800 text-[11px] space-y-1 text-slate-300">
            <span className="font-extrabold text-slate-400 block uppercase tracking-wider mb-1">
              ✓ PRD v1.0 Features Ready
            </span>
            <div className="text-emerald-400 font-medium">✓ बिल #1, #2, #3 सीक्वेंशियल नंबर</div>
            <div className="text-emerald-400 font-medium">✓ आज का माल + पिछला बाकी = कुल हिसाब</div>
            <div className="text-emerald-400 font-medium">✓ टमाटर व गोभी क्रेट वजन kg कन्वर्जन</div>
            <div className="text-emerald-400 font-medium">✓ खराब माल कटौती (Bad Goods PRD 5.4)</div>
            <div className="text-emerald-400 font-medium">✓ सप्लायर पर्ची फोटो अटैचमेंट</div>
            <div className="text-emerald-400 font-medium">✓ 100% ऑफ़लाइन बैकअप इंडिकेटर</div>
          </div>
        </div>

        {/* CENTER: THE PHOTOREALISTIC SMARTPHONE FRAME */}
        <div className="flex flex-col items-center justify-center order-1 lg:order-2">
          <div
            style={{
              transform: `scale(${scale})`,
              transformOrigin: 'top center',
              width: `${deviceDimensions.width}px`,
              height: `${deviceDimensions.height}px`,
            }}
            className="relative rounded-[52px] p-[10px] bg-slate-900 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9),0_0_0_1px_rgba(255,255,255,0.1)] ring-1 ring-slate-800 transition-all duration-200 shrink-0"
          >
            {/* Phone Outer Edge Highlights */}
            <div className="absolute inset-0 rounded-[52px] pointer-events-none border border-white/10" />

            {/* Hardware Side Buttons */}
            <div className="absolute -left-[14px] top-28 w-[4px] h-10 bg-slate-700 rounded-l-md" />
            <div className="absolute -left-[14px] top-42 w-[4px] h-14 bg-slate-700 rounded-l-md" />
            <div className="absolute -right-[14px] top-32 w-[4px] h-16 bg-slate-700 rounded-r-md" />

            {/* SCREEN VIEWPORT CONTAINER */}
            <div className="relative w-full h-full bg-[#F6F7F2] rounded-[42px] overflow-hidden flex flex-col shadow-inner select-text">
              {/* TOP MOBILE STATUS BAR */}
              <div className="h-9 bg-[#1F6B45] text-white px-6 flex items-center justify-between text-[11px] font-bold z-40 shrink-0 select-none">
                <span>{currentTime || '4:40 PM'}</span>

                {/* Dynamic Island / Punch Hole */}
                <div className="w-20 h-4 bg-black rounded-full mx-auto" />

                <div className="flex items-center gap-1.5 text-[10px]">
                  <Wifi className="w-3 h-3 text-white" />
                  <span className="font-extrabold text-[9px]">5G</span>
                  <div className="flex items-center gap-0.5">
                    <BatteryCharging className="w-3.5 h-3.5 text-white" />
                    <span>98%</span>
                  </div>
                </div>
              </div>

              {/* LIVE REACT APP VIEWPORT */}
              {/* Added CSS transform so fixed items stick to simulated phone bottom */}
              <div
                style={{ transform: 'translateZ(0)' }}
                className="flex-1 overflow-y-auto overscroll-contain relative bg-gray-50 text-gray-900"
              >
                {children}
              </div>

              {/* BOTTOM HOME GESTURE BAR */}
              <div className="h-5 bg-white border-t border-gray-100 flex items-center justify-center shrink-0 z-40 select-none">
                <div className="w-28 h-1 bg-gray-400 rounded-full" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* WHATSAPP SLIP PREVIEW MODAL (IN-APP MOCKUP)              */}
      {/* ======================================================== */}
      {whatsappModal?.isOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#121B22] text-[#E9EDEF] rounded-2xl max-w-sm w-full p-4 border border-emerald-900 shadow-2xl space-y-3 font-sans">
            <div className="flex items-center justify-between border-b border-[#222E35] pb-2.5">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-[#00A884] flex items-center justify-center text-white text-xs font-bold">
                  WA
                </div>
                <div>
                  <h3 className="text-xs font-bold text-white">WhatsApp पर्ची पूर्वावलोकन</h3>
                  <p className="text-[10px] text-gray-400">{whatsappModal.recipientName || 'ग्राहक/किसान'}</p>
                </div>
              </div>
              <button
                onClick={closeWhatsAppModal}
                className="text-gray-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Chat Bubble Mockup */}
            <div className="bg-[#0B141A] p-3 rounded-xl min-h-[220px] max-h-[360px] overflow-y-auto">
              <div className="bg-[#005C4B] text-white p-3 rounded-xl text-xs whitespace-pre-wrap leading-relaxed shadow-sm font-mono">
                {whatsappModal.text}
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-1">
              <button
                onClick={handleCopyWhatsApp}
                className="flex-1 py-2 px-3 bg-[#202C33] hover:bg-[#2A3942] text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'कॉपी हो गया!' : 'मेसेज कॉपी करें'}</span>
              </button>
              <button
                onClick={() => {
                  const url = whatsappModal.phone
                    ? `https://wa.me/91${whatsappModal.phone}?text=${encodeURIComponent(whatsappModal.text)}`
                    : `https://wa.me/?text=${encodeURIComponent(whatsappModal.text)}`;
                  window.open(url, '_blank');
                }}
                className="flex-1 py-2 px-3 bg-[#00A884] hover:bg-[#029072] text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs transition-colors"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>WhatsApp खोलें</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
