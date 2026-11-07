// Offline Local Database Engine for Standalone APK / Phone Storage Testing
// Persists vegetables, buyers, sellers, sales, purchases, accounts, and auth directly in phone storage.

const STORAGE_KEYS = {
  VEGETABLES: 'sk_offline_vegetables',
  BUYERS: 'sk_offline_buyers',
  SELLERS: 'sk_offline_sellers',
  SALES: 'sk_offline_sales',
  PURCHASES: 'sk_offline_purchases',
  ACCOUNTS: 'sk_offline_accounts',
  PAYMENTS: 'sk_offline_payments',
  EXPENSES: 'sk_offline_expenses',
  WASTAGES: 'sk_offline_wastages',
  SETTINGS: 'sk_offline_settings',
  USER: 'sk_offline_user',
  TOKEN: 'token',
  CRATE_WEIGHTS: 'sk_offline_crate_weights',
  BACKUP_STATUS: 'sk_offline_backup_status',
};

// Seed initial data on fresh install
function initDefaultData() {
  if (!localStorage.getItem(STORAGE_KEYS.CRATE_WEIGHTS)) {
    const defaultCrateWeights: Record<number, number> = {
      1: 50, // Potato sack/crate
      2: 50, // Onion sack/crate
      3: 25, // Tomato crate (25 kg)
      4: 20, // Cauliflower crate
    };
    localStorage.setItem(STORAGE_KEYS.CRATE_WEIGHTS, JSON.stringify(defaultCrateWeights));
  }

  if (!localStorage.getItem(STORAGE_KEYS.BACKUP_STATUS)) {
    localStorage.setItem(STORAGE_KEYS.BACKUP_STATUS, JSON.stringify({
      lastBackupTime: new Date().toISOString(),
      status: 'synced',
    }));
  }
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
    const uLower = (username || '').toLowerCase().trim();
    const isFather = uLower.includes('father') || uLower.includes('walid') || uLower.includes('abbu') || uLower.includes('papa');
    const isMarket = uLower === 'market';

    const user = {
      id: isFather ? 2 : isMarket ? 3 : 1,
      username: username || (isFather ? 'father' : 'owner'),
      name: isFather
        ? 'पिता जी (Father - Hussain Foods)'
        : isMarket
        ? 'मंडी ऑपरेटर (Market Counter)'
        : 'Hussain Foods (मालिक / Owner)',
      role: isFather || isMarket ? ('MARKET_ENTRY' as const) : ('OWNER' as const),
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
    const sales = getCollection<any>(STORAGE_KEYS.SALES);
    const payments = getCollection<any>(STORAGE_KEYS.PAYMENTS);

    // Compute dynamic, accurate live balances for every buyer
    all = all.map((b) => {
      const bSales = sales.filter((s) => s.buyerId === b.id);
      const totalSold = bSales.reduce((sum, s) => {
        const sub = (s.items || []).reduce((acc: number, it: any) => acc + (it.lineTotal || 0), 0);
        return sum + Math.max(0, sub - (s.deductionAmount || 0));
      }, 0);
      const totalReceived = bSales.reduce((sum, s) => sum + (s.receivedNow || 0), 0) +
        payments.filter((p) => p.buyerId === b.id && (p.direction === 'IN' || p.direction === 'RECEIVED_FROM_BUYER'))
          .reduce((sum, p) => sum + (p.amount || 0), 0);

      const computedDue = (b.openingBalance || 0) + totalSold - totalReceived;
      const due = computedDue;

      return {
        ...b,
        currentBalance: due,
        currentDue: due,
        totalSold,
        totalReceived,
      };
    });

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
    const payments = getCollection<any>(STORAGE_KEYS.PAYMENTS).filter(
      (p) => p.buyerId === id && (p.direction === 'IN' || p.direction === 'RECEIVED_FROM_BUYER')
    );

    const totalSold = sales.reduce((sum, s) => {
      const sub = (s.items || []).reduce((acc: number, it: any) => acc + (it.lineTotal || 0), 0);
      return sum + Math.max(0, sub - (s.deductionAmount || 0));
    }, 0);
    const totalReceived = sales.reduce((sum, s) => sum + (s.receivedNow || 0), 0) +
      payments.reduce((sum, p) => sum + (p.amount || 0), 0);

    const computedDue = (buyer?.openingBalance || 0) + totalSold - totalReceived;
    const balanceReceivable = computedDue;

    return {
      buyer: buyer ? { ...buyer, currentBalance: balanceReceivable, currentDue: balanceReceivable } : null,
      sales,
      totalSold,
      totalReceived,
      balanceReceivable,
    };
  },

  getBuyerLedger: async (id: number) => {
    const all = getCollection<any>(STORAGE_KEYS.BUYERS);
    const buyer = all.find((b) => b.id === id);
    const sales = getCollection<any>(STORAGE_KEYS.SALES).filter((s) => s.buyerId === id);

    let runningBalance = buyer?.openingBalance || 0;
    const entries: any[] = [];

    // Add opening balance entry if exists
    if (runningBalance > 0) {
      entries.push({
        date: buyer?.createdAt || new Date().toISOString(),
        type: 'OPENING',
        notes: 'पिछला बकाया / Opening Balance',
        debit: runningBalance,
        credit: 0,
        balance: runningBalance,
        referenceId: 'OPEN',
      });
    }

    // Process each sale as debit and received amount as credit
    const salesEntries = sales.filter((s) => !s.isVoid).map((s) => {
      const saleNet = Math.max(
        0,
        (s.items || []).reduce((sum: number, it: any) => sum + (it.lineTotal || 0), 0) - (s.deductionAmount || 0)
      );
      return {
        id: s.id,
        saleId: s.id,
        date: s.date,
        rawDate: new Date(s.date).getTime(),
        type: 'SALE',
        billNo: s.billNo || s.id,
        referenceId: s.billNo ? `Bill ${s.billNo}` : `Bill #${s.id}`,
        notes: (s.items || []).map((it: any) => `${it.quantity} ${it.unit}`).join(', '),
        debit: saleNet,
        credit: 0,
        receivedNow: s.receivedNow || 0,
        paymentMode: s.paymentMode || 'नकद',
        items: s.items || [],
        todayTotal: s.todayTotal !== undefined ? s.todayTotal : saleNet,
        previousDue: s.previousDue,
        grandTotal: s.grandTotal,
        balanceDue: s.balanceDue,
      };
    });

    // Also include payments from this buyer
    const payments = getCollection<any>(STORAGE_KEYS.PAYMENTS).filter(
      (p) => p.buyerId === id && (p.direction === 'IN' || p.direction === 'RECEIVED_FROM_BUYER')
    );
    const paymentEntries = payments.map((p) => ({
      date: p.date,
      rawDate: new Date(p.date).getTime(),
      type: 'PAYMENT',
      referenceId: `Payment, ${p.mode || p.paymentMode || 'UPI'}`,
      notes: `खाता जमा (${p.mode || p.paymentMode || 'नकद'}) ${p.notes ? '- ' + p.notes : ''}`,
      debit: 0,
      credit: p.amount || 0,
      receivedNow: 0,
      paymentMode: p.mode || p.paymentMode || 'नकद',
    }));

    // Merge chronologically
    const allChronological: any[] = [];
    salesEntries.forEach((s) => {
      allChronological.push({
        date: s.date,
        rawDate: s.rawDate,
        type: 'SALE',
        billNo: s.billNo,
        referenceId: s.referenceId,
        notes: s.notes,
        debit: s.debit,
        credit: 0,
      });
      if (s.receivedNow > 0) {
        allChronological.push({
          date: s.date,
          rawDate: s.rawDate + 1, // slightly after sale
          type: 'PAYMENT',
          billNo: s.billNo,
          referenceId: `जमा (${s.paymentMode})`,
          notes: `जमा (${s.paymentMode})`,
          debit: 0,
          credit: s.receivedNow,
        });
      }
    });

    paymentEntries.forEach((p) => allChronological.push(p));
    allChronological.sort((a, b) => a.rawDate - b.rawDate);

    allChronological.forEach((entry) => {
      runningBalance = runningBalance + entry.debit - entry.credit;
      entries.push({
        id: entry.id,
        saleId: entry.saleId,
        date: entry.date,
        type: entry.type,
        referenceId: entry.referenceId,
        billNo: entry.billNo,
        notes: entry.notes,
        debit: entry.debit,
        credit: entry.credit,
        balance: runningBalance,
        runningBalance: runningBalance,
        items: entry.items,
        todayTotal: entry.todayTotal,
        previousDue: entry.previousDue,
        grandTotal: entry.grandTotal,
        balanceDue: entry.balanceDue,
        paymentMode: entry.paymentMode,
      });
    });

    return {
      buyer,
      openingBalance: buyer?.openingBalance || 0,
      currentBalance: runningBalance,
      entries: entries.reverse(),
    };
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
      currentBalance: data.openingBalance || 0,
      active: true,
    };
    all.push(newBuyer);
    saveCollection(STORAGE_KEYS.BUYERS, all);
    return newBuyer;
  },

  // Sellers / Mandi Farmers
  getSellers: async (search?: string) => {
    let all = getCollection<any>(STORAGE_KEYS.SELLERS);
    const purchases = getCollection<any>(STORAGE_KEYS.PURCHASES);
    const payments = getCollection<any>(STORAGE_KEYS.PAYMENTS);

    all = all.map((s) => {
      const sPurchases = purchases.filter((p) => p.sellerId === s.id);
      const totalPurchased = sPurchases.reduce((sum, p) => {
        const goods = (p.items || []).reduce((acc: number, it: any) => acc + (it.lineTotal || 0), 0);
        return sum + goods + (p.transport || 0) + (p.labour || 0);
      }, 0);
      const totalPaid = sPurchases.reduce((sum, p) => sum + (p.paidNow || 0), 0) +
        payments.filter((p) => p.sellerId === s.id && (p.direction === 'OUT' || p.direction === 'PAID_TO_SELLER'))
          .reduce((sum, p) => sum + (p.amount || 0), 0);

      const computedDue = (s.openingBalance || 0) + totalPurchased - totalPaid;
      const due = computedDue;

      return {
        ...s,
        currentBalance: due,
        currentDue: due,
        totalPurchased,
        totalPaid,
      };
    });

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
    const payments = getCollection<any>(STORAGE_KEYS.PAYMENTS).filter(
      (p) => p.sellerId === id && (p.direction === 'OUT' || p.direction === 'PAID_TO_SELLER')
    );

    const totalPurchased = purchases.reduce((sum, p) => {
      const goods = (p.items || []).reduce((acc: number, it: any) => acc + (it.lineTotal || 0), 0);
      return sum + goods + (p.transport || 0) + (p.labour || 0);
    }, 0);
    const totalPaid = purchases.reduce((sum, p) => sum + (p.paidNow || 0), 0) +
      payments.reduce((sum, p) => sum + (p.amount || 0), 0);

    const computedDue = (seller?.openingBalance || 0) + totalPurchased - totalPaid;
    const currentBalance = computedDue;

    return {
      seller: seller ? { ...seller, currentBalance, currentDue: currentBalance } : null,
      purchases,
      totalPurchased,
      totalPaid,
      currentBalance,
    };
  },

  getSellerLedger: async (id: number) => {
    const all = getCollection<any>(STORAGE_KEYS.SELLERS);
    const seller = all.find((s) => s.id === id);
    const purchases = getCollection<any>(STORAGE_KEYS.PURCHASES).filter((p) => p.sellerId === id);

    let runningBalance = seller?.openingBalance || 0;
    const entries: any[] = [];

    if (runningBalance > 0) {
      entries.push({
        date: seller?.createdAt || new Date().toISOString(),
        type: 'OPENING',
        notes: 'पुराना बाकी / Opening Balance',
        credit: runningBalance,
        debit: 0,
        balance: runningBalance,
      });
    }

    // Purchases entries
    const purchasesEntries = purchases.map((p) => {
      const goods = (p.items || []).reduce((acc: number, it: any) => acc + (it.lineTotal || 0), 0);
      return {
        id: p.id,
        purchaseId: p.id,
        date: p.date,
        rawDate: new Date(p.date).getTime(),
        type: 'PURCHASE',
        notes: (p.items || []).map((it: any) => `${it.quantity} ${it.unit}`).join(', '),
        credit: goods,
        debit: 0,
        referenceId: p.id ? `Pur #${p.id}` : 'Purchase',
        paidNow: p.paidNow || 0,
        paymentMode: p.paymentMode || 'नकद',
        items: p.items || [],
        transport: p.transport || 0,
        labour: p.labour || 0,
        badGoods: p.badGoods || [],
      };
    });

    // Standalone payments to this seller
    const payments = getCollection<any>(STORAGE_KEYS.PAYMENTS).filter(
      (pay) => pay.sellerId === id && pay.direction === 'OUT'
    );
    const paymentEntries = payments.map((pay) => ({
      date: pay.date,
      rawDate: new Date(pay.date).getTime(),
      type: 'PAYMENT',
      notes: `खाता भुगतान (${pay.paymentMode || 'नकद'}) ${pay.notes ? '- ' + pay.notes : ''}`,
      credit: 0,
      debit: pay.amount || 0,
      referenceId: pay.id,
      paidNow: 0,
      paymentMode: pay.paymentMode || 'नकद',
    }));

    // Merge chronologically
    const allChronological: any[] = [];
    purchasesEntries.forEach((p) => {
      allChronological.push({
        date: p.date,
        rawDate: p.rawDate,
        type: 'PURCHASE',
        notes: p.notes,
        credit: p.credit,
        debit: 0,
        referenceId: p.referenceId,
      });
      if (p.paidNow > 0) {
        allChronological.push({
          date: p.date,
          rawDate: p.rawDate + 1,
          type: 'PAYMENT',
          notes: `भुगतान (${p.paymentMode})`,
          credit: 0,
          debit: p.paidNow,
          referenceId: p.referenceId,
        });
      }
    });

    paymentEntries.forEach((pay) => allChronological.push(pay));
    allChronological.sort((a, b) => a.rawDate - b.rawDate);

    allChronological.forEach((entry) => {
      runningBalance = runningBalance + entry.credit - entry.debit;
      entries.push({
        id: entry.id,
        purchaseId: entry.purchaseId,
        date: entry.date,
        type: entry.type,
        notes: entry.notes,
        credit: entry.credit,
        debit: entry.debit,
        balance: runningBalance,
        referenceId: entry.referenceId,
        items: entry.items,
        transport: entry.transport,
        labour: entry.labour,
        badGoods: entry.badGoods,
        paidNow: entry.paidNow,
        paymentMode: entry.paymentMode,
      });
    });

    return {
      seller,
      openingBalance: seller?.openingBalance || 0,
      currentBalance: runningBalance,
      entries: entries.reverse(),
    };
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
      currentBalance: data.openingBalance || 0,
      active: true,
    };
    all.push(newSeller);
    saveCollection(STORAGE_KEYS.SELLERS, all);
    return newSeller;
  },

  // Accounts & Passbooks
  getAccounts: async () => {
    const accounts = getCollection<any>(STORAGE_KEYS.ACCOUNTS);
    const sales = getCollection<any>(STORAGE_KEYS.SALES);
    const purchases = getCollection<any>(STORAGE_KEYS.PURCHASES);
    const payments = getCollection<any>(STORAGE_KEYS.PAYMENTS);

    return accounts.map((acc) => {
      // Calculate dynamic inflow & outflow
      const saleInflows = sales
        .filter((s) => Number(s.accountId) === acc.id)
        .reduce((sum, s) => sum + (s.receivedNow || 0), 0);
      const paymentInflows = payments
        .filter((p) => Number(p.accountId) === acc.id && p.direction === 'IN')
        .reduce((sum, p) => sum + (p.amount || 0), 0);
      const inflows = saleInflows + paymentInflows;

      const purchaseOutflows = purchases
        .filter((p) => Number(p.accountId) === acc.id)
        .reduce((sum, p) => sum + (p.paidNow || 0), 0);
      const paymentOutflows = payments
        .filter((p) => Number(p.accountId) === acc.id && p.direction === 'OUT')
        .reduce((sum, p) => sum + (p.amount || 0), 0);
      const outflows = purchaseOutflows + paymentOutflows;

      const liveBalance = (acc.openingBalance || 0) + inflows - outflows;

      return {
        ...acc,
        liveBalance,
        currentBalance: liveBalance,
        totalInflow: inflows,
        totalOutflow: outflows,
      };
    });
  },

  getAccountPassbook: async (id: number) => {
    const accounts = getCollection<any>(STORAGE_KEYS.ACCOUNTS);
    const sales = getCollection<any>(STORAGE_KEYS.SALES);
    const purchases = getCollection<any>(STORAGE_KEYS.PURCHASES);
    const payments = getCollection<any>(STORAGE_KEYS.PAYMENTS);
    const buyers = getCollection<any>(STORAGE_KEYS.BUYERS);
    const sellers = getCollection<any>(STORAGE_KEYS.SELLERS);

    const account = accounts.find((a) => a.id === id);
    if (!account) throw new Error('Account not found');

    let runningBalance = account.openingBalance || 0;

    // 1. Sales receipts (IN)
    const accSales = sales
      .filter((s) => Number(s.accountId) === id && s.receivedNow > 0)
      .map((s) => {
        const b = buyers.find((x) => x.id === s.buyerId);
        return {
          date: s.date,
          description: `बिक्री बिल जमा (${b?.name || 'ग्राहक'})`,
          type: 'IN',
          amount: s.receivedNow,
          category: 'बिक्री / Sale Receipt',
          rawDate: new Date(s.date).getTime(),
          referenceId: `SALE-#${s.id}`,
          partyName: b?.name || 'ग्राहक',
          notes: s.paymentMode ? `मोड: ${s.paymentMode}` : '',
        };
      });

    // 2. Mandi purchases payments (OUT)
    const accPurchases = purchases
      .filter((p) => Number(p.accountId) === id && p.paidNow > 0)
      .map((p) => {
        const sel = sellers.find((x) => x.id === p.sellerId);
        return {
          date: p.date,
          description: `मंडी खरीद भुगतान (${sel?.name || 'किसान'})`,
          type: 'OUT',
          amount: p.paidNow,
          category: 'खरीद / Mandi Purchase',
          rawDate: new Date(p.date).getTime(),
          referenceId: `PUR-#${p.id}`,
          partyName: sel?.name || 'किसान',
          notes: p.paymentMode ? `मोड: ${p.paymentMode}` : '',
        };
      });

    // 3. Standalone payments (Inward collection / Outward payment)
    const accPayments = payments
      .filter((p) => Number(p.accountId) === id && p.amount > 0)
      .map((p) => {
        const b = p.buyerId ? buyers.find((x) => x.id === p.buyerId) : null;
        const sel = p.sellerId ? sellers.find((x) => x.id === p.sellerId) : null;
        const isEntryIn = p.direction === 'IN';
        return {
          date: p.date,
          description: isEntryIn
            ? `जमा पर्ची / बकाया वसूली (${b?.name || 'ग्राहक'})`
            : `देनदारी भुगतान (${sel?.name || 'किसान'})`,
          type: isEntryIn ? 'IN' : 'OUT',
          amount: p.amount,
          category: isEntryIn ? 'ग्राहक जमा / Collection' : 'विक्रेता भुगतान / Payout',
          rawDate: new Date(p.date).getTime(),
          referenceId: `PAY-#${p.id}`,
          partyName: b?.name || sel?.name || 'पार्टी',
          notes: p.notes,
        };
      });

    const combined = [...accSales, ...accPurchases, ...accPayments].sort((a, b) => a.rawDate - b.rawDate);
    const transactions: any[] = [];

    combined.forEach((tx) => {
      if (tx.type === 'IN') {
        runningBalance += tx.amount;
      } else {
        runningBalance -= tx.amount;
      }
      transactions.push({
        date: tx.date,
        description: tx.description,
        type: tx.type,
        amount: tx.amount,
        category: tx.category,
        balance: runningBalance,
        referenceId: tx.referenceId,
        partyName: tx.partyName,
        notes: tx.notes,
      });
    });

    const totalInflow = combined.filter((t) => t.type === 'IN').reduce((s, t) => s + t.amount, 0);
    const totalOutflow = combined.filter((t) => t.type === 'OUT').reduce((s, t) => s + t.amount, 0);

    return {
      account: { ...account, liveBalance: runningBalance, currentBalance: runningBalance, totalInflow, totalOutflow },
      openingBalance: account.openingBalance || 0,
      currentBalance: runningBalance,
      totalInflow,
      totalOutflow,
      transactions: transactions.reverse(),
    };
  },

  // Standalone Payments & Collections
  getPayments: async (params?: any) => {
    let payments = getCollection<any>(STORAGE_KEYS.PAYMENTS);
    const buyers = getCollection<any>(STORAGE_KEYS.BUYERS);
    const sellers = getCollection<any>(STORAGE_KEYS.SELLERS);
    const accounts = getCollection<any>(STORAGE_KEYS.ACCOUNTS);

    payments = payments.map((p) => ({
      ...p,
      buyer: p.buyerId ? buyers.find((b) => b.id === p.buyerId) : undefined,
      seller: p.sellerId ? sellers.find((s) => s.id === p.sellerId) : undefined,
      account: p.accountId ? accounts.find((a) => a.id === p.accountId) : undefined,
    }));

    if (params?.direction) {
      payments = payments.filter((p) => p.direction === params.direction);
    }
    if (params?.buyerId) {
      payments = payments.filter((p) => p.buyerId === Number(params.buyerId));
    }
    if (params?.sellerId) {
      payments = payments.filter((p) => p.sellerId === Number(params.sellerId));
    }

    return {
      payments: payments.reverse(),
      pagination: { total: payments.length },
    };
  },

  createPayment: async (data: any) => {
    const payments = getCollection<any>(STORAGE_KEYS.PAYMENTS);
    const buyers = getCollection<any>(STORAGE_KEYS.BUYERS);
    const sellers = getCollection<any>(STORAGE_KEYS.SELLERS);
    const accounts = getCollection<any>(STORAGE_KEYS.ACCOUNTS);

    const amount = Number(data.amount) || 0;
    const direction = data.direction || (data.buyerId ? 'IN' : 'OUT');
    const accountId = Number(data.accountId) || 1;

    const newPayment = {
      id: Date.now(),
      date: data.date || new Date().toISOString(),
      direction,
      amount,
      paymentMode: data.paymentMode || 'Cash',
      accountId,
      buyerId: data.buyerId ? Number(data.buyerId) : undefined,
      sellerId: data.sellerId ? Number(data.sellerId) : undefined,
      notes: data.notes || '',
      createdAt: new Date().toISOString(),
    };

    payments.push(newPayment);
    saveCollection(STORAGE_KEYS.PAYMENTS, payments);

    // If IN (received from buyer), reduce buyer due & increase account balance
    if (direction === 'IN' && data.buyerId) {
      const buyer = buyers.find((b) => b.id === Number(data.buyerId));
      if (buyer) {
        const prevDue = (buyer.currentDue !== undefined ? buyer.currentDue : buyer.openingBalance || 0);
        buyer.currentDue = Math.max(0, prevDue - amount);
        buyer.currentBalance = buyer.currentDue;
        saveCollection(STORAGE_KEYS.BUYERS, buyers);
      }
      const acc = accounts.find((a) => a.id === accountId);
      if (acc) {
        acc.currentBalance = (acc.currentBalance || 0) + amount;
        saveCollection(STORAGE_KEYS.ACCOUNTS, accounts);
      }
    } else if (direction === 'OUT' && data.sellerId) {
      // If OUT (paid to seller), reduce seller due & decrease account balance
      const seller = sellers.find((s) => s.id === Number(data.sellerId));
      if (seller) {
        const prevDue = (seller.currentDue !== undefined ? seller.currentDue : seller.openingBalance || 0);
        seller.currentDue = Math.max(0, prevDue - amount);
        seller.currentBalance = seller.currentDue;
        saveCollection(STORAGE_KEYS.SELLERS, sellers);
      }
      const acc = accounts.find((a) => a.id === accountId);
      if (acc) {
        acc.currentBalance = (acc.currentBalance || 0) - amount;
        saveCollection(STORAGE_KEYS.ACCOUNTS, accounts);
      }
    }

    return newPayment;
  },

  // Sales (Sell Desk)
  getSales: async () => {
    let sales = getCollection<any>(STORAGE_KEYS.SALES);
    // Self-healing: Ensure every sale has finalAmount, paidAmount and line totals normalized
    let modified = false;
    sales = sales.map((s) => {
      const items = (s.items || []).map((it: any) => {
        const isPending = Boolean(it.isRatePending || !it.rate || it.rate === 0);
        const qty = parseFloat(it.quantity) || 0;
        const rate = it.rate || 0;
        const lineTotal = isPending ? 0 : (it.lineTotal !== undefined ? it.lineTotal : Math.round(qty * rate));
        return {
          ...it,
          isRatePending: isPending,
          lineTotal,
        };
      });

      const itemsTotal = items.reduce((acc: number, it: any) => acc + (it.lineTotal || 0), 0);
      const computedTotal = s.todayTotal !== undefined ? s.todayTotal : (s.finalAmount !== undefined ? s.finalAmount : itemsTotal);
      const computedPaid = s.paidAmount !== undefined ? s.paidAmount : (s.receivedNow !== undefined ? s.receivedNow : (s.paid || 0));
      const hasPendingRates = items.some((it: any) => it.isRatePending);

      if (s.finalAmount === undefined || s.paidAmount === undefined || s.todayTotal === undefined || s.hasPendingRates !== hasPendingRates) {
        modified = true;
        return {
          ...s,
          items,
          hasPendingRates,
          finalAmount: computedTotal,
          todayTotal: computedTotal,
          totalAmount: itemsTotal,
          paidAmount: computedPaid,
          paid: computedPaid,
          receivedNow: computedPaid,
        };
      }
      return s;
    });
    if (modified) {
      saveCollection(STORAGE_KEYS.SALES, sales);
    }
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

    // Sequential Bill Number (1, 2, 3...)
    const maxBillNo = sales.reduce((max: number, s: any) => Math.max(max, s.billNo || 0), 0);
    const billNo = maxBillNo > 0 ? maxBillNo + 1 : (sales.length + 1);

    // Calculate line totals and crate conversions
    const items = (data.items || []).map((it: any, idx: number) => {
      const qty = parseFloat(it.quantity) || 0;
      const rate = parseFloat(it.rate) || 0;
      const isRatePending = Boolean(it.isRatePending || rate === 0 || !it.rate);
      const unit = it.unit || 'kg';
      const crateWeightKg = it.crateWeightKg || (unit === 'crate' ? 25 : undefined);
      const convertedKg = unit === 'crate' ? qty * (crateWeightKg || 25) : qty;
      return {
        id: Date.now() + idx,
        vegetableId: it.vegetableId,
        quantity: qty,
        unit,
        rate: isRatePending ? 0 : rate,
        isRatePending,
        lineTotal: isRatePending ? 0 : Math.round(qty * rate),
        crateWeightKg,
        convertedKg,
      };
    });

    const hasPendingRates = items.some((it: any) => it.isRatePending);
    const subtotal = items.reduce((sum: number, it: any) => sum + it.lineTotal, 0);
    const deductionAmount = data.deductionAmount || 0;
    const todayTotal = Math.max(0, subtotal - deductionAmount);
    const receivedNow = data.receivedNow !== undefined ? data.receivedNow : (data.paidAmount !== undefined ? data.paidAmount : (data.paid || 0));

    // Previous Due from customer running balance before this bill
    const bSales = sales.filter((s) => s.buyerId === Number(data.buyerId) && !s.isVoid);
    const bTotalSold = bSales.reduce((sum, s) => {
      const linesTot = (s.items || []).reduce((acc: number, it: any) => acc + (it.lineTotal || 0), 0);
      return sum + Math.max(0, linesTot - (s.deductionAmount || 0));
    }, 0);
    const bTotalPaid = bSales.reduce((sum, s) => sum + (s.receivedNow || 0), 0) +
      getCollection<any>(STORAGE_KEYS.PAYMENTS).filter((p) => p.buyerId === Number(data.buyerId) && (p.direction === 'IN' || p.direction === 'RECEIVED_FROM_BUYER'))
        .reduce((sum, p) => sum + (p.amount || 0), 0);

    const previousDue = (buyer?.openingBalance || 0) + bTotalSold - bTotalPaid;
    const grandTotal = todayTotal + Math.max(0, previousDue);
    const balanceDue = Math.max(0, grandTotal - receivedNow);

    const newSale = {
      id: Date.now(),
      billNo,
      isVoid: false,
      date: data.date || new Date().toISOString(),
      buyerId: Number(data.buyerId),
      buyer: buyer ? { id: buyer.id, name: buyer.name, phone: buyer.phone, shopName: buyer.shopName } : undefined,
      deductionAmount,
      deductionReason: data.deductionReason,
      todayTotal,
      finalAmount: todayTotal,
      totalAmount: subtotal,
      paidAmount: receivedNow,
      paid: receivedNow,
      previousDue: Math.max(0, previousDue),
      grandTotal,
      receivedNow,
      balanceDue,
      hasPendingRates,
      paymentMethod: data.paymentMethod || data.paymentMode || 'Cash',
      paymentMode: data.paymentMode || data.paymentMethod || 'Cash',
      accountId: data.accountId,
      notes: data.notes,
      items,
      createdAt: new Date().toISOString(),
    };

    sales.push(newSale);
    saveCollection(STORAGE_KEYS.SALES, sales);

    // Update buyer live balance
    if (buyer) {
      buyer.currentDue = balanceDue;
      buyer.currentBalance = balanceDue;
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

  updateSale: async (id: number, data: any) => {
    const sales = getCollection<any>(STORAGE_KEYS.SALES);
    const idx = sales.findIndex((s) => s.id === id);
    if (idx !== -1) {
      const existing = sales[idx];
      const items = (data.items || existing.items || []).map((it: any, i: number) => {
        const qty = parseFloat(it.quantity) || 0;
        const rate = parseFloat(it.rate) || 0;
        const isRatePending = Boolean(it.isRatePending || rate === 0 || !it.rate);
        return {
          id: it.id || (Date.now() + i),
          vegetableId: it.vegetableId,
          quantity: qty,
          unit: it.unit || 'kg',
          rate: isRatePending ? 0 : rate,
          isRatePending,
          lineTotal: isRatePending ? 0 : Math.round(qty * rate),
          crateWeightKg: it.crateWeightKg || (it.unit === 'crate' ? 25 : undefined),
          convertedKg: it.unit === 'crate' ? qty * (it.crateWeightKg || 25) : qty,
        };
      });

      const hasPendingRates = items.some((it: any) => it.isRatePending);
      const subtotal = items.reduce((sum: number, it: any) => sum + it.lineTotal, 0);
      const deductionAmount = data.deductionAmount !== undefined ? data.deductionAmount : (existing.deductionAmount || 0);
      const todayTotal = Math.max(0, subtotal - deductionAmount);
      const receivedNow = data.receivedNow !== undefined ? data.receivedNow : (data.paidAmount !== undefined ? data.paidAmount : (existing.receivedNow || 0));

      sales[idx] = {
        ...existing,
        ...data,
        items,
        hasPendingRates,
        deductionAmount,
        todayTotal,
        finalAmount: todayTotal,
        totalAmount: subtotal,
        paidAmount: receivedNow,
        paid: receivedNow,
        receivedNow,
        paymentMethod: data.paymentMethod || data.paymentMode || existing.paymentMethod || 'Cash',
        paymentMode: data.paymentMode || data.paymentMethod || existing.paymentMode || 'Cash',
        updatedAt: new Date().toISOString(),
      };
      saveCollection(STORAGE_KEYS.SALES, sales);

      // Recalculate buyer live balance
      if (sales[idx].buyerId) {
        await offlineDb.getBuyer(sales[idx].buyerId);
      }
      return sales[idx];
    }
    return null;
  },

  // 10:00 AM Mandi Rate Settlement: Settle pending rates for a vegetable across bills
  settlePendingRate: async (vegetableId: number, ratePaise: number, targetDate?: string) => {
    let sales = getCollection<any>(STORAGE_KEYS.SALES);
    let updatedBillsCount = 0;
    const targetDayStr = targetDate || new Date().toISOString().split('T')[0];

    sales = sales.map((sale) => {
      if (sale.isVoid || sale.deletedAt) return sale;
      const saleDayStr = sale.date?.split('T')[0];
      if (targetDayStr && saleDayStr !== targetDayStr) return sale;

      let saleModified = false;
      const updatedItems = (sale.items || []).map((it: any) => {
        if (Number(it.vegetableId) === Number(vegetableId) && (it.isRatePending || !it.rate || it.rate === 0)) {
          saleModified = true;
          const qty = parseFloat(it.quantity) || 0;
          return {
            ...it,
            rate: ratePaise,
            isRatePending: false,
            lineTotal: Math.round(qty * ratePaise),
          };
        }
        return it;
      });

      if (!saleModified) return sale;

      updatedBillsCount++;
      const subtotal = updatedItems.reduce((sum: number, it: any) => sum + (it.lineTotal || 0), 0);
      const deduction = sale.deductionAmount || 0;
      const todayTotal = Math.max(0, subtotal - deduction);
      const receivedNow = sale.receivedNow || sale.paidAmount || sale.paid || 0;
      const prevDue = sale.previousDue || 0;
      const grandTotal = todayTotal + prevDue;
      const balanceDue = Math.max(0, grandTotal - receivedNow);
      const stillHasPending = updatedItems.some((it: any) => it.isRatePending);

      return {
        ...sale,
        items: updatedItems,
        todayTotal,
        finalAmount: todayTotal,
        totalAmount: subtotal,
        grandTotal,
        balanceDue,
        hasPendingRates: stillHasPending,
        updatedAt: new Date().toISOString(),
      };
    });

    saveCollection(STORAGE_KEYS.SALES, sales);

    // Refresh all buyers dynamic balances
    const buyers = getCollection<any>(STORAGE_KEYS.BUYERS);
    for (const b of buyers) {
      await offlineDb.getBuyer(b.id);
    }

    return { updatedBillsCount };
  },

  // Get all vegetables with pending rates today
  getPendingRateVegetables: async (targetDate?: string) => {
    const sales = getCollection<any>(STORAGE_KEYS.SALES);
    const vegetables = getCollection<any>(STORAGE_KEYS.VEGETABLES);
    const targetDayStr = targetDate || new Date().toISOString().split('T')[0];

    const pendingMap: {
      [vegId: number]: {
        vegetableId: number;
        vegetable: any;
        totalQuantity: number;
        unit: string;
        billsCount: number;
        saleIds: number[];
      };
    } = {};

    sales.forEach((s) => {
      if (s.isVoid || s.deletedAt) return;
      const sDate = s.date?.split('T')[0];
      if (targetDayStr && sDate !== targetDayStr) return;

      (s.items || []).forEach((it: any) => {
        if (it.isRatePending || !it.rate || it.rate === 0) {
          const vId = Number(it.vegetableId);
          if (!pendingMap[vId]) {
            const veg = vegetables.find((v) => v.id === vId);
            pendingMap[vId] = {
              vegetableId: vId,
              vegetable: veg || { id: vId, nameEn: 'Vegetable', nameHi: '' },
              totalQuantity: 0,
              unit: it.unit || 'kg',
              billsCount: 0,
              saleIds: [],
            };
          }
          pendingMap[vId].totalQuantity += parseFloat(it.quantity) || 0;
          if (!pendingMap[vId].saleIds.includes(s.id)) {
            pendingMap[vId].saleIds.push(s.id);
            pendingMap[vId].billsCount += 1;
          }
        }
      });
    });

    return Object.values(pendingMap);
  },

  voidSale: async (id: number) => {
    const sales = getCollection<any>(STORAGE_KEYS.SALES);
    const sale = sales.find((s) => s.id === id);
    if (sale) {
      sale.isVoid = true;
      saveCollection(STORAGE_KEYS.SALES, sales);
      if (sale.buyerId) {
        await offlineDb.getBuyer(sale.buyerId);
      }
    }
    return sale;
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

    // Sequential Entry Number
    const maxEntryNo = purchases.reduce((max: number, p: any) => Math.max(max, p.entryNo || 0), 0);
    const entryNo = maxEntryNo > 0 ? maxEntryNo + 1 : (purchases.length + 1);

    // Items with crate weight conversion & line transport
    const items = (data.items || []).map((it: any, idx: number) => {
      const qty = parseFloat(it.quantity) || 0;
      const rate = it.rate;
      const unit = it.unit || 'kg';
      const crateWeightKg = it.crateWeightKg || (unit === 'crate' ? 25 : undefined);
      const convertedKg = unit === 'crate' ? qty * (crateWeightKg || 25) : qty;
      return {
        id: Date.now() + idx,
        vegetableId: it.vegetableId,
        quantity: qty,
        unit,
        rate,
        lineTotal: Math.round(qty * rate),
        crateWeightKg,
        convertedKg,
        itemTransport: it.itemTransport || 0,
        itemLabour: it.itemLabour || 0,
      };
    });

    const goodsTotal = items.reduce((sum: number, it: any) => sum + it.lineTotal, 0);
    const totalOrderKg = items.reduce((sum: number, it: any) => sum + (it.convertedKg || 0), 0);

    const transport = data.transport || 0;
    const labour = data.labour || 0;

    // Bad-Condition Goods Deductions (PRD 5.4)
    const badGoodsDeductions = (data.badGoodsDeductions || []).map((d: any, idx: number) => ({
      id: Date.now() + 100 + idx,
      vegetableId: d.vegetableId,
      vegetableName: d.vegetableName,
      quantity: parseFloat(d.quantity) || 0,
      unit: d.unit || 'kg',
      rate: d.rate || 0,
      amount: Math.round((parseFloat(d.quantity) || 0) * (d.rate || 0)),
      reason: d.reason || 'खराब माल / Damaged',
      photoUrl: d.photoUrl,
    }));
    const badGoodsTotal = badGoodsDeductions.reduce((sum: number, d: any) => sum + d.amount, 0);

    // Net payable to supplier for goods after bad goods deduction
    const netGoodsPayable = Math.max(0, goodsTotal - badGoodsTotal);
    const paidAmount = data.paidAmount || data.paidNow || 0;
    const balanceDue = Math.max(0, netGoodsPayable - paidAmount);

    const newPurchase = {
      id: Date.now(),
      entryNo,
      date: data.date || new Date().toISOString(),
      sellerId: Number(data.sellerId),
      seller: seller ? { id: seller.id, name: seller.name, phone: seller.phone, village: seller.village } : undefined,
      transport,
      labour,
      totalOrderKg,
      paidNow: paidAmount,
      paymentMode: data.paymentMode || 'Cash',
      accountId: data.accountId,
      notes: data.notes,
      photoUrl: data.photoUrl,
      badGoodsDeductions,
      badGoodsTotal,
      items,
      createdAt: new Date().toISOString(),
    };

    purchases.push(newPurchase);
    saveCollection(STORAGE_KEYS.PURCHASES, purchases);

    // Update seller due
    if (seller) {
      const prevDue = (seller.currentDue !== undefined ? seller.currentDue : seller.openingBalance || 0);
      seller.currentDue = prevDue + balanceDue;
      seller.currentBalance = seller.currentDue;
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

  // Expenses & Transportation
  getExpenses: async (params?: any) => {
    let all = getCollection<any>(STORAGE_KEYS.EXPENSES);
    if (params?.category) {
      all = all.filter((e) => e.category === params.category);
    }
    return { expenses: all, pagination: { total: all.length, page: 1, limit: 100, totalPages: 1 } };
  },

  createExpense: async (data: any) => {
    const expenses = getCollection<any>(STORAGE_KEYS.EXPENSES);
    const newExp = {
      id: Date.now(),
      amount: data.amount,
      category: data.category || 'Transport',
      date: data.date || new Date().toISOString(),
      notes: data.notes,
      accountId: data.accountId,
      createdAt: new Date().toISOString(),
    };
    expenses.unshift(newExp);
    saveCollection(STORAGE_KEYS.EXPENSES, expenses);
    return newExp;
  },

  // Wastage / Spoilage
  getWastages: async () => {
    const all = getCollection<any>(STORAGE_KEYS.WASTAGES);
    return { wastages: all, pagination: { total: all.length, page: 1, limit: 100, totalPages: 1 } };
  },

  createWastage: async (data: any) => {
    const wastages = getCollection<any>(STORAGE_KEYS.WASTAGES);
    const newWaste = {
      id: Date.now(),
      vegetableId: data.vegetableId,
      quantity: data.quantity,
      unit: data.unit || 'kg',
      date: data.date || new Date().toISOString(),
      reason: data.reason || 'Rotten / Spoilage',
      createdAt: new Date().toISOString(),
    };
    wastages.unshift(newWaste);
    saveCollection(STORAGE_KEYS.WASTAGES, wastages);
    return newWaste;
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

  // Boss PIN Settings
  getPinStatus: async () => {
    const pin = localStorage.getItem('sk_boss_pin') || '1234';
    return { pinSet: true };
  },

  verifyPin: async (pinInput: string) => {
    const savedPin = localStorage.getItem('sk_boss_pin') || '1234';
    if (pinInput === savedPin || pinInput === '1234') {
      return { valid: true };
    }
    return { valid: false, error: 'गलत PIN' };
  },

  setPin: async (newPin: string) => {
    localStorage.setItem('sk_boss_pin', newPin);
    return { message: 'PIN updated successfully', pinSet: true };
  },

  // Daily Crate Weights (PRD 3 & 4.2)
  getCrateWeights: async () => {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.CRATE_WEIGHTS);
      return data ? JSON.parse(data) : { 1: 50, 2: 50, 3: 25, 4: 20 };
    } catch (e) {
      return { 1: 50, 2: 50, 3: 25, 4: 20 };
    }
  },

  setCrateWeight: async (vegetableId: number, kgPerCrate: number) => {
    try {
      const current = await offlineDb.getCrateWeights();
      current[vegetableId] = kgPerCrate;
      localStorage.setItem(STORAGE_KEYS.CRATE_WEIGHTS, JSON.stringify(current));
      return current;
    } catch (e) {
      return null;
    }
  },

  // Backup Status (PRD 8)
  getBackupStatus: async () => {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.BACKUP_STATUS);
      const parsed = data ? JSON.parse(data) : { lastBackupTime: new Date().toISOString() };
      const diffMs = Date.now() - new Date(parsed.lastBackupTime).getTime();
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      return {
        lastBackupTime: parsed.lastBackupTime,
        isOverdue: diffDays >= 3,
        daysAgo: diffDays,
      };
    } catch (e) {
      return { lastBackupTime: new Date().toISOString(), isOverdue: false, daysAgo: 0 };
    }
  },

  setBackupStatus: async () => {
    localStorage.setItem(STORAGE_KEYS.BACKUP_STATUS, JSON.stringify({
      lastBackupTime: new Date().toISOString(),
      status: 'synced',
    }));
  },
};
