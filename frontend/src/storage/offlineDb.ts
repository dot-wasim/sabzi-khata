// Offline Local Database Engine for Standalone APK / Phone Storage Testing
// Persists vegetables, buyers, sellers, sales, purchases, accounts, and auth directly in phone storage.

const STORAGE_KEYS = {
  VEGETABLES: 'sk_offline_vegetables',
  BUYERS: 'sk_offline_buyers',
  SELLERS: 'sk_offline_sellers',
  SALES: 'sk_offline_sales',
  PURCHASES: 'sk_offline_purchases',
  ACCOUNTS: 'sk_offline_accounts',
  SETTINGS: 'sk_offline_settings',
  USER: 'sk_offline_user',
  TOKEN: 'token',
};

// Seed initial data on fresh install
function initDefaultData() {
  if (!localStorage.getItem(STORAGE_KEYS.VEGETABLES)) {
    const defaultVegetables = [
      { id: 1, nameEn: 'Potato', nameHi: 'आलू', unit: 'kg', category: 'Root', active: true },
      { id: 2, nameEn: 'Onion', nameHi: 'प्याज़', unit: 'kg', category: 'Root', active: true },
      { id: 3, nameEn: 'Tomato', nameHi: 'टमाटर', unit: 'kg', category: 'Fruit', active: true },
      { id: 4, nameEn: 'Cauliflower', nameHi: 'फूलगोभी', unit: 'kg', category: 'Leafy', active: true },
    ];
    localStorage.setItem(STORAGE_KEYS.VEGETABLES, JSON.stringify(defaultVegetables));
  }

  if (!localStorage.getItem(STORAGE_KEYS.ACCOUNTS)) {
    const defaultAccounts = [
      { id: 1, name: 'Cash in Hand (गल्ला)', type: 'CASH', openingBalance: 500000, currentBalance: 500000, active: true },
      { id: 2, name: 'SBI Current Account', type: 'BANK', openingBalance: 2500000, currentBalance: 2500000, active: true },
      { id: 3, name: 'UPI QR (PhonePe / GPay)', type: 'UPI', openingBalance: 0, currentBalance: 0, active: true },
    ];
    localStorage.setItem(STORAGE_KEYS.ACCOUNTS, JSON.stringify(defaultAccounts));
  }

  if (!localStorage.getItem(STORAGE_KEYS.BUYERS)) {
    const defaultBuyers = [
      { id: 1, name: 'Annapurna Dhaba', contactPerson: 'Ramesh', phone: '9876543210', address: 'Main Road', openingBalance: 150000, currentDue: 150000, active: true },
      { id: 2, name: 'Royal Hotel', contactPerson: 'Imran', phone: '9876543211', address: 'Station Road', openingBalance: 320000, currentDue: 320000, active: true },
      { id: 3, name: 'Sanjay Retailer', contactPerson: 'Sanjay', phone: '9876543212', address: 'Market Yard', openingBalance: 0, currentDue: 0, active: true },
    ];
    localStorage.setItem(STORAGE_KEYS.BUYERS, JSON.stringify(defaultBuyers));
  }

  if (!localStorage.getItem(STORAGE_KEYS.SELLERS)) {
    const defaultSellers = [
      { id: 1, name: 'Ramkishan Farmer', phone: '9812345678', village: 'Rampur', type: 'Farmer', isOwnFarmer: true, openingBalance: 0, currentDue: 0, active: true },
      { id: 2, name: 'Shyam Trader', phone: '9812345679', village: 'Mandi Yard', type: 'Trader', isOwnFarmer: false, openingBalance: 450000, currentDue: 450000, active: true },
    ];
    localStorage.setItem(STORAGE_KEYS.SELLERS, JSON.stringify(defaultSellers));
  }

  if (!localStorage.getItem(STORAGE_KEYS.SALES)) {
    localStorage.setItem(STORAGE_KEYS.SALES, JSON.stringify([]));
  }

  if (!localStorage.getItem(STORAGE_KEYS.PURCHASES)) {
    localStorage.setItem(STORAGE_KEYS.PURCHASES, JSON.stringify([]));
  }

  // Pre-seed an owner user session so offline APK can bypass or use instant login
  if (!localStorage.getItem(STORAGE_KEYS.USER)) {
    const offlineUser = {
      id: 1,
      username: 'owner',
      name: 'Owner (ऑफलाइन मोड)',
      role: 'OWNER',
    };
    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(offlineUser));
    localStorage.setItem(STORAGE_KEYS.TOKEN, 'offline-demo-token');
  }
}

// Helpers
function getCollection<T>(key: string): T[] {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function saveCollection<T>(key: string, items: T[]): void {
  localStorage.setItem(key, JSON.stringify(items));
}

// Initialize on load
initDefaultData();

export const offlineDb = {
  // Auth
  login: async (username: string, _password: string) => {
    const user = {
      id: 1,
      username: username || 'owner',
      name: 'Hussain Foods (Owner)',
      role: 'OWNER',
    };
    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
    localStorage.setItem(STORAGE_KEYS.TOKEN, 'offline-token-' + Date.now());
    return { token: 'offline-token', user };
  },

  getMe: async () => {
    const userStr = localStorage.getItem(STORAGE_KEYS.USER);
    const user = userStr ? JSON.parse(userStr) : { id: 1, username: 'owner', name: 'Owner', role: 'OWNER' };
    return { user };
  },

  // Vegetables
  getVegetables: async (showInactive = false) => {
    const all = getCollection<any>(STORAGE_KEYS.VEGETABLES);
    return showInactive ? all : all.filter((v) => v.active !== false);
  },

  createVegetable: async (data: any) => {
    const all = getCollection<any>(STORAGE_KEYS.VEGETABLES);
    const newVeg = {
      id: Date.now(),
      nameEn: data.nameEn,
      nameHi: data.nameHi || data.nameEn,
      unit: data.unit || 'kg',
      category: data.category || 'Root',
      active: true,
    };
    all.push(newVeg);
    saveCollection(STORAGE_KEYS.VEGETABLES, all);
    return newVeg;
  },

  updateVegetable: async (id: number, data: any) => {
    const all = getCollection<any>(STORAGE_KEYS.VEGETABLES);
    const idx = all.findIndex((v) => v.id === id);
    if (idx !== -1) {
      all[idx] = { ...all[idx], ...data };
      saveCollection(STORAGE_KEYS.VEGETABLES, all);
      return all[idx];
    }
    return data;
  },

  deleteVegetable: async (id: number) => {
    const all = getCollection<any>(STORAGE_KEYS.VEGETABLES);
    const updated = all.filter((v) => v.id !== id);
    saveCollection(STORAGE_KEYS.VEGETABLES, updated);
  },

  // Buyers / Customers
  getBuyers: async (search?: string) => {
    let all = getCollection<any>(STORAGE_KEYS.BUYERS);
    if (search) {
      const q = search.toLowerCase();
      all = all.filter((b) => b.name?.toLowerCase().includes(q) || b.phone?.includes(q));
    }
    return all;
  },

  getBuyer: async (id: number) => {
    const all = getCollection<any>(STORAGE_KEYS.BUYERS);
    const buyer = all.find((b) => b.id === id);
    const sales = getCollection<any>(STORAGE_KEYS.SALES).filter((s) => s.buyerId === id);
    return { buyer, sales };
  },

  createBuyer: async (data: any) => {
    const all = getCollection<any>(STORAGE_KEYS.BUYERS);
    const newBuyer = {
      id: Date.now(),
      name: data.name,
      contactPerson: data.contactPerson || '',
      phone: data.phone || '',
      address: data.address || '',
      notes: data.notes || '',
      openingBalance: data.openingBalance || 0,
      currentDue: data.openingBalance || 0,
      active: true,
    };
    all.push(newBuyer);
    saveCollection(STORAGE_KEYS.BUYERS, all);
    return newBuyer;
  },

  // Sellers / Mandi Farmers
  getSellers: async (search?: string) => {
    let all = getCollection<any>(STORAGE_KEYS.SELLERS);
    if (search) {
      const q = search.toLowerCase();
      all = all.filter((s) => s.name?.toLowerCase().includes(q) || s.village?.toLowerCase().includes(q));
    }
    return all;
  },

  getSeller: async (id: number) => {
    const all = getCollection<any>(STORAGE_KEYS.SELLERS);
    const seller = all.find((s) => s.id === id);
    const purchases = getCollection<any>(STORAGE_KEYS.PURCHASES).filter((p) => p.sellerId === id);
    return { seller, purchases };
  },

  createSeller: async (data: any) => {
    const all = getCollection<any>(STORAGE_KEYS.SELLERS);
    const newSeller = {
      id: Date.now(),
      name: data.name,
      phone: data.phone || '',
      village: data.village || '',
      type: data.type || 'Farmer',
      isOwnFarmer: Boolean(data.isOwnFarmer),
      openingBalance: data.openingBalance || 0,
      currentDue: data.openingBalance || 0,
      active: true,
    };
    all.push(newSeller);
    saveCollection(STORAGE_KEYS.SELLERS, all);
    return newSeller;
  },

  // Accounts
  getAccounts: async () => {
    return getCollection<any>(STORAGE_KEYS.ACCOUNTS);
  },

  // Sales (Sell Desk)
  getSales: async () => {
    const sales = getCollection<any>(STORAGE_KEYS.SALES);
    return { sales: sales.reverse(), pagination: { total: sales.length } };
  },

  getSale: async (id: number) => {
    const sales = getCollection<any>(STORAGE_KEYS.SALES);
    return sales.find((s) => s.id === id);
  },

  createSale: async (data: any) => {
    const sales = getCollection<any>(STORAGE_KEYS.SALES);
    const buyers = getCollection<any>(STORAGE_KEYS.BUYERS);
    const accounts = getCollection<any>(STORAGE_KEYS.ACCOUNTS);

    const buyer = buyers.find((b) => b.id === Number(data.buyerId));

    // Calculate line totals
    const items = (data.items || []).map((it: any, idx: number) => ({
      id: Date.now() + idx,
      vegetableId: it.vegetableId,
      quantity: it.quantity,
      unit: it.unit || 'kg',
      rate: it.rate,
      lineTotal: Math.round(it.quantity * it.rate),
    }));

    const subtotal = items.reduce((sum: number, it: any) => sum + it.lineTotal, 0);
    const deductionAmount = data.deductionAmount || 0;
    const netTotal = Math.max(0, subtotal - deductionAmount);
    const receivedNow = data.receivedNow || 0;
    const balanceDue = Math.max(0, netTotal - receivedNow);

    const newSale = {
      id: Date.now(),
      date: data.date || new Date().toISOString(),
      buyerId: Number(data.buyerId),
      buyer: buyer ? { id: buyer.id, name: buyer.name, phone: buyer.phone } : undefined,
      deductionAmount,
      deductionReason: data.deductionReason,
      receivedNow,
      paymentMode: data.paymentMode || 'Cash',
      accountId: data.accountId,
      notes: data.notes,
      items,
      createdAt: new Date().toISOString(),
    };

    sales.push(newSale);
    saveCollection(STORAGE_KEYS.SALES, sales);

    // Update buyer due
    if (buyer) {
      buyer.currentDue = (buyer.currentDue || 0) + balanceDue;
      saveCollection(STORAGE_KEYS.BUYERS, buyers);
    }

    // Update account balance
    if (receivedNow > 0 && data.accountId) {
      const acc = accounts.find((a) => a.id === Number(data.accountId));
      if (acc) {
        acc.currentBalance = (acc.currentBalance || 0) + receivedNow;
        saveCollection(STORAGE_KEYS.ACCOUNTS, accounts);
      }
    }

    return newSale;
  },

  // Purchases (Buy Desk)
  getPurchases: async () => {
    const purchases = getCollection<any>(STORAGE_KEYS.PURCHASES);
    return { purchases: purchases.reverse(), pagination: { total: purchases.length } };
  },

  getPurchase: async (id: number) => {
    const purchases = getCollection<any>(STORAGE_KEYS.PURCHASES);
    return purchases.find((p) => p.id === id);
  },

  createPurchase: async (data: any) => {
    const purchases = getCollection<any>(STORAGE_KEYS.PURCHASES);
    const sellers = getCollection<any>(STORAGE_KEYS.SELLERS);
    const accounts = getCollection<any>(STORAGE_KEYS.ACCOUNTS);

    const seller = sellers.find((s) => s.id === Number(data.sellerId));

    const items = (data.items || []).map((it: any, idx: number) => ({
      id: Date.now() + idx,
      vegetableId: it.vegetableId,
      quantity: it.quantity,
      unit: it.unit || 'kg',
      rate: it.rate,
      lineTotal: Math.round(it.quantity * it.rate),
    }));

    const goodsTotal = items.reduce((sum: number, it: any) => sum + it.lineTotal, 0);
    const transport = data.transport || 0;
    const labour = data.labour || 0;
    const paidAmount = data.paidAmount || 0;
    const balanceDue = Math.max(0, goodsTotal - paidAmount);

    const newPurchase = {
      id: Date.now(),
      date: data.date || new Date().toISOString(),
      sellerId: Number(data.sellerId),
      seller: seller ? { id: seller.id, name: seller.name, phone: seller.phone, village: seller.village } : undefined,
      transport,
      labour,
      paidNow: paidAmount,
      paymentMode: data.paymentMode || 'Cash',
      accountId: data.accountId,
      notes: data.notes,
      items,
      createdAt: new Date().toISOString(),
    };

    purchases.push(newPurchase);
    saveCollection(STORAGE_KEYS.PURCHASES, purchases);

    // Update seller due
    if (seller) {
      seller.currentDue = (seller.currentDue || 0) + balanceDue;
      saveCollection(STORAGE_KEYS.SELLERS, sellers);
    }

    // Deduct from account balance if paid
    if (paidAmount > 0 && data.accountId) {
      const acc = accounts.find((a) => a.id === Number(data.accountId));
      if (acc) {
        acc.currentBalance = (acc.currentBalance || 0) - paidAmount;
        saveCollection(STORAGE_KEYS.ACCOUNTS, accounts);
      }
    }

    return newPurchase;
  },

  // Reports / Dashboard
  getDashboardToday: async () => {
    const sales = getCollection<any>(STORAGE_KEYS.SALES);
    const purchases = getCollection<any>(STORAGE_KEYS.PURCHASES);
    const buyers = getCollection<any>(STORAGE_KEYS.BUYERS);
    const sellers = getCollection<any>(STORAGE_KEYS.SELLERS);

    const todayStr = new Date().toISOString().split('T')[0];
    const todaySales = sales.filter((s) => s.date?.startsWith(todayStr));
    const todayPurchases = purchases.filter((p) => p.date?.startsWith(todayStr));

    const totalSalesRupees = todaySales.reduce((sum, s) => {
      const lineSubtotal = (s.items || []).reduce((subSum: number, it: any) => subSum + (it.lineTotal || 0), 0);
      return sum + Math.max(0, lineSubtotal - (s.deductionAmount || 0));
    }, 0);

    const totalPurchasesRupees = todayPurchases.reduce((sum, p) => {
      const goods = (p.items || []).reduce((subSum: number, it: any) => subSum + (it.lineTotal || 0), 0);
      return sum + goods + (p.transport || 0) + (p.labour || 0);
    }, 0);

    const totalBuyerDues = buyers.reduce((sum, b) => sum + (b.currentDue || 0), 0);
    const totalSellerDues = sellers.reduce((sum, s) => sum + (s.currentDue || 0), 0);

    return {
      todaySales: totalSalesRupees,
      todayPurchases: totalPurchasesRupees,
      netProfit: totalSalesRupees - totalPurchasesRupees,
      totalBuyerDues,
      totalSellerDues,
    };
  },
};
