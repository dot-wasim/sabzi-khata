export interface User {
  id: number;
  username: string;
  name: string;
  phone?: string;
  role: 'OWNER' | 'MARKET_ENTRY';
}

export interface Account {
  id: number;
  name: string;
  type: 'CASH' | 'BANK' | 'UPI' | 'OTHER';
  accountNumber?: string | null;
  openingBalance: number;
  isDefault: boolean;
  active: boolean;
  liveBalance?: number;
  currentBalance?: number;
  totalInflow?: number;
  totalOutflow?: number;
}

export interface AccountTransaction {
  date: string;
  description: string;
  type: 'IN' | 'OUT';
  amount: number;
  category: string;
  balance: number;
}

export interface Vegetable {
  id: number;
  nameEn: string;
  nameHi: string;
  unit: string;
  category: string | null;
  defaultCrateKg?: number;
  crateWeightKg?: number;
  defaultRate?: number;
  active: boolean;
}

export interface BadGoodsDeduction {
  id?: number;
  vegetableId: number;
  vegetableName?: string;
  quantity: number;
  unit: string;
  rate: number;
  amount: number;
  reason?: string;
  photoUrl?: string;
}

export interface Seller {
  id: number;
  name: string;
  phone: string | null;
  village: string | null;
  type: string;
  isOwnFarmer: boolean;
  notes: string | null;
  openingBalance: number;
  active: boolean;
  currentBalance?: number;
  currentDue?: number;
  totalPurchased?: number;
  totalPaid?: number;
}

export interface Buyer {
  id: number;
  name: string;
  contactPerson: string | null;
  phone: string | null;
  address: string | null;
  shopName?: string | null;
  notes: string | null;
  openingBalance: number;
  active: boolean;
  currentBalance?: number;
  currentDue?: number;
  totalSold?: number;
  totalReceived?: number;
}

export interface PurchaseItem {
  id?: number;
  vegetableId: number;
  vegetable?: Vegetable;
  quantity: number;
  unit: string;
  rate: number;
  lineTotal: number;
  crateWeightKg?: number;
  convertedKg?: number;
  itemTransport?: number;
  itemLabour?: number;
}

export interface Purchase {
  id: number;
  entryNo?: number;
  date: string;
  sellerId: number;
  seller?: Seller;
  transport: number;
  transportType: 'FLAT' | 'PER_UNIT';
  transportRate: number;
  transportUnit?: string | null;
  transportQty: number;
  transporterName?: string | null;
  transportPaid: boolean;
  labour: number;
  commission: number;
  paidNow: number;
  paidAmount?: number;
  vehicleNumber?: string;
  paymentMode: string | null;
  accountId?: number | null;
  account?: Account;
  photoUrl?: string;
  badGoodsDeductions?: BadGoodsDeduction[];
  badGoodsTotal?: number;
  notes: string | null;
  createdBy: number;
  items: PurchaseItem[];
  createdAt: string;
}

export interface SaleItem {
  id?: number;
  vegetableId: number;
  vegetable?: Vegetable;
  quantity: number;
  unit: string;
  rate: number;
  lineTotal: number;
  crateWeightKg?: number;
  convertedKg?: number;
}

export interface Sale {
  id: number;
  billNo?: number;
  isVoid?: boolean;
  date: string;
  buyerId: number;
  buyer?: Buyer;
  deductionAmount: number;
  deductionReason: string | null;
  receivedNow: number;
  paymentMode: string | null;
  accountId?: number | null;
  account?: Account;
  todayTotal?: number;
  previousDue?: number;
  grandTotal?: number;
  balanceDue?: number;
  notes: string | null;
  createdBy: number;
  items: SaleItem[];
  createdAt: string;
}

export interface Payment {
  id: number;
  date: string;
  direction: 'PAID_TO_SELLER' | 'RECEIVED_FROM_BUYER';
  sellerId: number | null;
  buyerId: number | null;
  seller?: Seller;
  buyer?: Buyer;
  amount: number;
  mode: string;
  accountId?: number | null;
  account?: Account;
  reference: string | null;
  linkedEntryId: number | null;
  notes: string | null;
  createdBy: number;
  createdAt: string;
}

export interface Wastage {
  id: number;
  date: string;
  vegetableId: number;
  vegetable?: Vegetable;
  quantity: number;
  reason: string;
  notes: string | null;
  createdBy: number;
  createdAt: string;
}

export interface Expense {
  id: number;
  date: string;
  category: string;
  amount: number;
  accountId?: number | null;
  account?: Account;
  notes: string | null;
  createdBy: number;
  createdAt: string;
}

export interface AuditLogEntry {
  id: number;
  userId: number;
  user?: User;
  action: string;
  entity: string;
  entityId: number;
  before: string | null;
  after: string | null;
  timestamp: string;
}

export interface DashboardData {
  boughtToday: number;
  soldToday: number;
  paidToday: number;
  receivedToday: number;
  totalPayable: number;
  totalReceivable: number;
  todayProfit: number;
}

export interface StockItem {
  vegetableId: number;
  vegetable: Vegetable;
  opening: number;
  purchased: number;
  sold: number;
  wasted: number;
  closing: number;
  warning: boolean;
}

export interface LedgerEntry {
  date: string;
  type: 'OPENING' | 'PURCHASE' | 'SALE' | 'PAYMENT';
  description: string;
  debit: number;
  credit: number;
  balance: number;
  referenceId?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ProfitReportRow {
  label: string;
  purchases: number;
  sales: number;
  wastage: number;
  expenses: number;
  profit: number;
}
