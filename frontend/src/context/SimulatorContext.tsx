import React, { createContext, useContext, useState, useEffect } from 'react';

interface SimulatorContextType {
  isSimulator: boolean;
  setIsSimulator: (val: boolean) => void;
  scale: number;
  setScale: (val: number) => void;
  deviceModel: 'pixel' | 'iphone' | 'compact';
  setDeviceModel: (val: 'pixel' | 'iphone' | 'compact') => void;
  whatsappModal: { isOpen: boolean; text: string; phone?: string; recipientName?: string } | null;
  openWhatsAppModal: (text: string, phone?: string, recipientName?: string) => void;
  closeWhatsAppModal: () => void;
  seedDemoData: () => Promise<void>;
  resetAllData: () => Promise<void>;
}

const SimulatorContext = createContext<SimulatorContextType | undefined>(undefined);

export const SimulatorProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Default to false: render pure direct app (no simulator frame wrapper)
  const [isSimulator, setIsSimulatorState] = useState<boolean>(() => {
    const saved = localStorage.getItem('sk_simulator_mode');
    if (saved !== null) return saved === 'true';
    return false;
  });

  const [scale, setScaleState] = useState<number>(() => {
    const saved = localStorage.getItem('sk_simulator_scale');
    return saved ? parseFloat(saved) : 0.88;
  });

  const [deviceModel, setDeviceModelState] = useState<'pixel' | 'iphone' | 'compact'>(() => {
    return (localStorage.getItem('sk_simulator_model') as any) || 'pixel';
  });

  const [whatsappModal, setWhatsappModal] = useState<{
    isOpen: boolean;
    text: string;
    phone?: string;
    recipientName?: string;
  } | null>(null);

  const setIsSimulator = (val: boolean) => {
    setIsSimulatorState(val);
    localStorage.setItem('sk_simulator_mode', String(val));
  };

  const setScale = (val: number) => {
    setScaleState(val);
    localStorage.setItem('sk_simulator_scale', String(val));
  };

  const setDeviceModel = (val: 'pixel' | 'iphone' | 'compact') => {
    setDeviceModelState(val);
    localStorage.setItem('sk_simulator_model', val);
  };

  const openWhatsAppModal = (text: string, phone?: string, recipientName?: string) => {
    setWhatsappModal({ isOpen: true, text, phone, recipientName });
  };

  const closeWhatsAppModal = () => {
    setWhatsappModal(null);
  };

  const seedDemoData = async () => {
    const STORAGE_KEYS = {
      BUYERS: 'sk_offline_buyers',
      SELLERS: 'sk_offline_sellers',
      SALES: 'sk_offline_sales',
      PURCHASES: 'sk_offline_purchases',
      PAYMENTS: 'sk_offline_payments',
      EXPENSES: 'sk_offline_expenses',
      ACCOUNTS: 'sk_offline_accounts',
      CRATE_WEIGHTS: 'sk_offline_crate_weights',
      VEGETABLES: 'sk_offline_vegetables',
    };

    const now = new Date();
    const today = now.toISOString().slice(0, 10);
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    const tenDaysAgo = new Date(Date.now() - 10 * 86400000).toISOString().slice(0, 10);

    const demoBuyers = [
      { id: 1, name: 'रमेश सब्जी भंडार', phone: '9876543210', shopName: 'दुकान #12, आजादपुर', openingBalance: 450000, currentDue: 680000, customerType: 'REGULAR', active: true },
      { id: 2, name: 'सुरेश होटल व कैटरिंग', phone: '9811223344', shopName: 'स्टेशन रोड', openingBalance: 1200000, currentDue: 1850000, customerType: 'REGULAR', active: true },
      { id: 3, name: 'राजेश किराना स्टोर', phone: '9899887766', shopName: 'गली #4, मेन बाजार', openingBalance: 0, currentDue: 0, customerType: 'OCCASIONAL', active: true },
      { id: 4, name: 'अनिल ठेलावाला', phone: '9871112233', shopName: 'बस स्टैंड', openingBalance: 150000, currentDue: 150000, customerType: 'OCCASIONAL', createdAt: tenDaysAgo, active: true },
    ];

    const demoSellers = [
      { id: 1, name: 'राम किशन (किसान)', phone: '9416012345', village: 'सोनीपत', openingBalance: 500000, currentDue: 850000, isChemicalFree: true, active: true },
      { id: 2, name: 'बलबीर सिंह (आढ़ती)', phone: '9812054321', village: 'करनाल मंडी', openingBalance: 1200000, currentDue: 1940000, isChemicalFree: false, active: true },
      { id: 3, name: 'सुखविंदर', phone: '9896011223', village: 'मुजफ्फरनगर', openingBalance: 200000, currentDue: 320000, isChemicalFree: false, active: true },
    ];

    const demoSales = [
      {
        id: 101,
        billNo: 1,
        date: yesterday,
        buyerId: 1,
        buyer: demoBuyers[0],
        todayTotal: 420000,
        previousDue: 450000,
        grandTotal: 870000,
        receivedNow: 200000,
        balanceDue: 670000,
        paymentMode: 'UPI',
        items: [
          { vegetableId: 3, vegetable: { nameHi: 'टमाटर', nameEn: 'Tomato' }, quantity: 100, unit: 'kg', rate: 2500, lineTotal: 250000 },
          { vegetableId: 1, vegetable: { nameHi: 'आलू', nameEn: 'Potato' }, quantity: 100, unit: 'kg', rate: 1700, lineTotal: 170000 },
        ],
      },
      {
        id: 102,
        billNo: 2,
        date: today,
        buyerId: 2,
        buyer: demoBuyers[1],
        todayTotal: 650000,
        previousDue: 1200000,
        grandTotal: 1850000,
        receivedNow: 0,
        balanceDue: 1850000,
        paymentMode: 'Cash',
        items: [
          { vegetableId: 2, vegetable: { nameHi: 'प्याज़', nameEn: 'Onion' }, quantity: 150, unit: 'kg', rate: 3000, lineTotal: 450000 },
          { vegetableId: 4, vegetable: { nameHi: 'फूलगोभी', nameEn: 'Cauliflower' }, quantity: 80, unit: 'kg', rate: 2500, lineTotal: 200000 },
        ],
      },
    ];

    const demoPurchases = [
      {
        id: 201,
        entryNo: 1,
        date: yesterday,
        sellerId: 1,
        seller: demoSellers[0],
        transport: 40000,
        labour: 20000,
        totalOrderKg: 350,
        paidNow: 500000,
        badGoodsTotal: 50000,
        badGoodsDeductions: [
          { id: 1, vegetableId: 3, vegetableName: 'टमाटर', quantity: 20, unit: 'kg', rate: 2500, amount: 50000, reason: 'दबा हुआ / सड़ा माल' }
        ],
        items: [
          { vegetableId: 3, vegetable: { nameHi: 'टमाटर', nameEn: 'Tomato' }, quantity: 200, unit: 'kg', rate: 2000, lineTotal: 400000, convertedKg: 200 },
          { vegetableId: 1, vegetable: { nameHi: 'आलू', nameEn: 'Potato' }, quantity: 150, unit: 'kg', rate: 1400, lineTotal: 210000, convertedKg: 150 },
        ],
      },
      {
        id: 202,
        entryNo: 2,
        date: today,
        sellerId: 2,
        seller: demoSellers[1],
        transport: 60000,
        labour: 30000,
        totalOrderKg: 300,
        paidNow: 800000,
        badGoodsTotal: 0,
        items: [
          { vegetableId: 2, vegetable: { nameHi: 'प्याज़', nameEn: 'Onion' }, quantity: 200, unit: 'kg', rate: 2400, lineTotal: 480000, convertedKg: 200 },
          { vegetableId: 4, vegetable: { nameHi: 'फूलगोभी', nameEn: 'Cauliflower' }, quantity: 100, unit: 'kg', rate: 1800, lineTotal: 180000, convertedKg: 100 },
        ],
      },
    ];

    const demoPayments = [
      {
        id: 301,
        date: yesterday,
        direction: 'IN',
        buyerId: 1,
        buyer: demoBuyers[0],
        amount: 200000,
        mode: 'UPI',
        notes: 'GPay से जमा',
      },
      {
        id: 302,
        date: today,
        direction: 'IN',
        buyerId: 3,
        buyer: demoBuyers[2],
        amount: 350000,
        mode: 'Cash',
        notes: 'दुकान पर नकद हिसाब चुकता',
      },
    ];

    localStorage.setItem(STORAGE_KEYS.BUYERS, JSON.stringify(demoBuyers));
    localStorage.setItem(STORAGE_KEYS.SELLERS, JSON.stringify(demoSellers));
    localStorage.setItem(STORAGE_KEYS.SALES, JSON.stringify(demoSales));
    localStorage.setItem(STORAGE_KEYS.PURCHASES, JSON.stringify(demoPurchases));
    localStorage.setItem(STORAGE_KEYS.PAYMENTS, JSON.stringify(demoPayments));

    window.location.reload();
  };

  const resetAllData = async () => {
    if (!window.confirm('क्या आप सचमुच सारा डेटा रीसेट करना चाहते हैं? (Reset all local data?)')) return;
    localStorage.clear();
    window.location.reload();
  };

  return (
    <SimulatorContext.Provider
      value={{
        isSimulator,
        setIsSimulator,
        scale,
        setScale,
        deviceModel,
        setDeviceModel,
        whatsappModal,
        openWhatsAppModal,
        closeWhatsAppModal,
        seedDemoData,
        resetAllData,
      }}
    >
      {children}
    </SimulatorContext.Provider>
  );
};

export const useSimulator = () => {
  const context = useContext(SimulatorContext);
  if (!context) {
    throw new Error('useSimulator must be used within a SimulatorProvider');
  }
  return context;
};
