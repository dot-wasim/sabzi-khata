import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { getPinStatus, verifyPin, setPin as apiSetPin } from '../api/settings';

interface BossAuthContextType {
  isBossUnlocked: boolean;
  unlockBoss: () => void;
  lockBoss: () => void;
  openPinModal: (onSuccess?: () => void) => void;
}

const BossAuthContext = createContext<BossAuthContextType | undefined>(undefined);

export const BossAuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isBossUnlocked, setIsBossUnlocked] = useState<boolean>(() => {
    return sessionStorage.getItem('boss_unlocked') === 'true';
  });

  const [modalOpen, setModalOpen] = useState(false);
  const [pinSet, setPinSet] = useState<boolean>(true);
  const [pinInput, setPinInput] = useState('');
  const [confirmPinInput, setConfirmPinInput] = useState('');
  const [isSettingNewPin, setIsSettingNewPin] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [pendingCallback, setPendingCallback] = useState<(() => void) | null>(null);

  const checkStatus = async () => {
    try {
      const res = await getPinStatus();
      setPinSet(res.pinSet);
      if (!res.pinSet) {
        setIsSettingNewPin(true);
      }
    } catch (err) {
      console.error('Failed to get PIN status:', err);
    }
  };

  const openPinModal = (onSuccess?: () => void) => {
    if (isBossUnlocked) {
      if (onSuccess) onSuccess();
      return;
    }
    setErrorMsg('');
    setPinInput('');
    setConfirmPinInput('');
    if (onSuccess) setPendingCallback(() => onSuccess);
    checkStatus().then(() => setModalOpen(true));
  };

  const lockBoss = () => {
    sessionStorage.removeItem('boss_unlocked');
    setIsBossUnlocked(false);
  };

  const unlockBoss = () => {
    sessionStorage.setItem('boss_unlocked', 'true');
    setIsBossUnlocked(true);
    setModalOpen(false);
    if (pendingCallback) {
      pendingCallback();
      setPendingCallback(null);
    }
  };

  const handleKeyPress = (num: string) => {
    if (loading) return;
    setErrorMsg('');
    if (isSettingNewPin && pinInput.length === 4) {
      if (confirmPinInput.length < 4) {
        setConfirmPinInput((prev) => prev + num);
      }
    } else {
      if (pinInput.length < 4) {
        setPinInput((prev) => prev + num);
      }
    }
  };

  const handleDeleteKey = () => {
    if (loading) return;
    setErrorMsg('');
    if (isSettingNewPin && confirmPinInput.length > 0) {
      setConfirmPinInput((prev) => prev.slice(0, -1));
    } else {
      setPinInput((prev) => prev.slice(0, -1));
    }
  };

  // Auto submit when complete
  useEffect(() => {
    if (!modalOpen) return;

    if (!isSettingNewPin && pinInput.length === 4) {
      handleVerify();
    } else if (isSettingNewPin && pinInput.length === 4 && confirmPinInput.length === 4) {
      handleSetNewPin();
    }
  }, [pinInput, confirmPinInput, isSettingNewPin, modalOpen]);

  const handleVerify = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await verifyPin(pinInput);
      if (res.valid) {
        unlockBoss();
      } else {
        setErrorMsg('गलत PIN / Incorrect PIN');
        setPinInput('');
      }
    } catch (err: any) {
      setErrorMsg('PIN जांचने में त्रुटि / Verification failed');
      setPinInput('');
    } finally {
      setLoading(false);
    }
  };

  const handleSetNewPin = async () => {
    if (pinInput !== confirmPinInput) {
      setErrorMsg('PIN मेल नहीं खा रहा / PINs do not match');
      setConfirmPinInput('');
      return;
    }
    setLoading(true);
    setErrorMsg('');
    try {
      await apiSetPin(pinInput);
      setPinSet(true);
      setIsSettingNewPin(false);
      unlockBoss();
    } catch (err: any) {
      setErrorMsg('नया PIN सेट नहीं हो सका / Failed to set PIN');
    } finally {
      setLoading(false);
    }
  };

  const activeDisplayLength =
    isSettingNewPin && pinInput.length === 4
      ? confirmPinInput.length
      : pinInput.length;

  return (
    <BossAuthContext.Provider
      value={{
        isBossUnlocked,
        unlockBoss,
        lockBoss,
        openPinModal,
      }}
    >
      {children}

      {/* 4-Digit Owner PIN Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-[#22304A] text-white flex flex-col items-center justify-between p-6 sm:p-8 font-sans">
          {/* Top Brand & Title */}
          <div className="w-full max-w-xs flex flex-col items-center pt-8 text-center space-y-2">
            <div className="text-xs opacity-75 tracking-wider uppercase font-semibold">
              Hussain Foods
            </div>
            <div className="text-2xl font-bold">
              मालिक डेस्क <span className="font-normal text-base text-gray-300">/ Boss Desk</span>
            </div>
            <div className="text-sm text-[#C9D2E6] pt-1">
              {isSettingNewPin
                ? pinInput.length === 4
                  ? 'PIN दोबारा दर्ज करें / Confirm PIN'
                  : 'नया 4 अंकों का PIN सेट करें / Set 4-digit PIN'
                : '4 अंकों का PIN डालें / Enter PIN'}
            </div>

            {/* 4 PIN Dots */}
            <div className="flex justify-center gap-4 py-4">
              {[0, 1, 2, 3].map((idx) => {
                const isFilled = idx < activeDisplayLength;
                return (
                  <i
                    key={idx}
                    className={`w-4 h-4 rounded-full transition-all duration-150 ${
                      isFilled
                        ? 'bg-white scale-110 shadow-sm'
                        : 'border-2 border-white/60 bg-transparent'
                    }`}
                  />
                );
              })}
            </div>

            {errorMsg && (
              <div className="text-rose-300 text-xs font-semibold bg-rose-950/60 px-3 py-1.5 rounded-lg border border-rose-800 animate-shake">
                {errorMsg}
              </div>
            )}
          </div>

          {/* Keypad */}
          <div className="w-full max-w-xs flex flex-col items-center pb-8 space-y-4">
            <div className="grid grid-cols-3 gap-3 text-[#1B2A1F]">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
                <button
                  key={digit}
                  type="button"
                  onClick={() => handleKeyPress(digit)}
                  className="w-20 h-16 sm:w-24 sm:h-16 text-2xl font-semibold bg-white border border-[#E3DFD0] rounded-2xl flex items-center justify-center hover:bg-gray-100 active:bg-gray-200 transition-transform active:scale-95 shadow-xs"
                >
                  {digit}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="w-20 h-16 sm:w-24 sm:h-16 text-xs font-bold text-white bg-white/10 rounded-2xl flex items-center justify-center hover:bg-white/20 active:scale-95"
              >
                रद्द करें
              </button>
              <button
                type="button"
                onClick={() => handleKeyPress('0')}
                className="w-20 h-16 sm:w-24 sm:h-16 text-2xl font-semibold bg-white border border-[#E3DFD0] rounded-2xl flex items-center justify-center hover:bg-gray-100 active:bg-gray-200 transition-transform active:scale-95 shadow-xs"
              >
                0
              </button>
              <button
                type="button"
                onClick={handleDeleteKey}
                className="w-20 h-16 sm:w-24 sm:h-16 text-2xl font-semibold bg-white border border-[#E3DFD0] rounded-2xl flex items-center justify-center hover:bg-gray-100 active:bg-gray-200 transition-transform active:scale-95 shadow-xs"
              >
                ⌫
              </button>
            </div>

            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => {
                  alert('PIN रीसेट करने के लिए एडमिन से संपर्क करें');
                }}
                className="text-xs text-[#C9D2E6] hover:text-white underline cursor-pointer"
              >
                PIN भूल गए? / Forgot PIN
              </button>
            </div>
          </div>
        </div>
      )}
    </BossAuthContext.Provider>
  );
};

export const useBossAuth = () => {
  const context = useContext(BossAuthContext);
  if (!context) {
    throw new Error('useBossAuth must be used within a BossAuthProvider');
  }
  return context;
};
