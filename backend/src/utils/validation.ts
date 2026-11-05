import { z } from 'zod';

// --- Auth ---
export const loginSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
});

export const changePasswordSchema = z.object({
  oldPassword: z.string().min(1, 'Old password is required'),
  newPassword: z.string().min(6, 'New password must be at least 6 characters'),
});

// --- PIN Settings ---
export const setPinSchema = z.object({
  currentPin: z.string().optional(),
  newPin: z.string().regex(/^\d{4}$/, 'PIN must be exactly 4 digits'),
});

export const verifyPinSchema = z.object({
  pin: z.string().regex(/^\d{4}$/, 'PIN must be exactly 4 digits'),
});

// --- Accounts ---
export const createAccountSchema = z.object({
  name: z.string().min(1, 'Account name is required'),
  type: z.enum(['CASH', 'BANK', 'UPI', 'OTHER']).default('CASH'),
  accountNumber: z.string().optional(),
  openingBalance: z.number().int().default(0),
  isDefault: z.boolean().default(false),
});

export const updateAccountSchema = z.object({
  name: z.string().min(1).optional(),
  type: z.enum(['CASH', 'BANK', 'UPI', 'OTHER']).optional(),
  accountNumber: z.string().optional(),
  openingBalance: z.number().int().optional(),
  isDefault: z.boolean().optional(),
  active: z.boolean().optional(),
});

export const transferAccountSchema = z.object({
  date: z.string().min(1, 'Date is required'),
  fromAccountId: z.number().int().positive('Source account is required'),
  toAccountId: z.number().int().positive('Destination account is required'),
  amount: z.number().int().positive('Transfer amount must be positive'),
  notes: z.string().optional(),
});

// --- Vegetable ---
export const createVegetableSchema = z.object({
  nameEn: z.string().min(1, 'English name is required'),
  nameHi: z.string().min(1, 'Hindi name is required'),
  unit: z.string().default('kg'),
  category: z.string().optional(),
});

export const updateVegetableSchema = z.object({
  nameEn: z.string().min(1).optional(),
  nameHi: z.string().min(1).optional(),
  unit: z.string().optional(),
  category: z.string().optional(),
  active: z.boolean().optional(),
});

// --- Seller ---
export const createSellerSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  phone: z.string().optional(),
  village: z.string().optional(),
  type: z.enum(['Farmer', 'Mandi Trader']).default('Farmer'),
  isOwnFarmer: z.boolean().default(false),
  notes: z.string().optional(),
  openingBalance: z.number().int().default(0),
});

export const updateSellerSchema = z.object({
  name: z.string().min(1).optional(),
  phone: z.string().optional(),
  village: z.string().optional(),
  type: z.enum(['Farmer', 'Mandi Trader']).optional(),
  isOwnFarmer: z.boolean().optional(),
  notes: z.string().optional(),
  openingBalance: z.number().int().optional(),
  active: z.boolean().optional(),
});

// --- Buyer ---
export const createBuyerSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  contactPerson: z.string().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  notes: z.string().optional(),
  openingBalance: z.number().int().default(0),
});

export const updateBuyerSchema = z.object({
  name: z.string().min(1).optional(),
  contactPerson: z.string().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  notes: z.string().optional(),
  openingBalance: z.number().int().optional(),
  active: z.boolean().optional(),
});

// --- Purchase Item ---
const purchaseItemSchema = z.object({
  vegetableId: z.number().int().positive(),
  quantity: z.number().positive(),
  unit: z.string().min(1),
  rate: z.number().int().nonnegative(),
});

// --- Purchase ---
export const createPurchaseSchema = z.object({
  date: z.string().min(1, 'Date is required'),
  sellerId: z.number().int().positive(),
  transport: z.number().int().nonnegative().default(0),
  transportType: z.enum(['FLAT', 'PER_UNIT']).default('FLAT'),
  transportRate: z.number().int().nonnegative().default(0),
  transportUnit: z.string().optional(),
  transportQty: z.number().nonnegative().default(0),
  transporterName: z.string().optional(),
  transportPaid: z.boolean().default(true),
  labour: z.number().int().nonnegative().default(0),
  commission: z.number().int().nonnegative().default(0),
  paidNow: z.number().int().nonnegative().default(0),
  paymentMode: z.string().optional(),
  accountId: z.number().int().positive().optional().nullable(),
  notes: z.string().optional(),
  items: z.array(purchaseItemSchema).min(1, 'At least one item is required'),
});

export const updatePurchaseSchema = z.object({
  date: z.string().optional(),
  sellerId: z.number().int().positive().optional(),
  transport: z.number().int().nonnegative().optional(),
  transportType: z.enum(['FLAT', 'PER_UNIT']).optional(),
  transportRate: z.number().int().nonnegative().optional(),
  transportUnit: z.string().optional(),
  transportQty: z.number().nonnegative().optional(),
  transporterName: z.string().optional(),
  transportPaid: z.boolean().optional(),
  labour: z.number().int().nonnegative().optional(),
  commission: z.number().int().nonnegative().optional(),
  paidNow: z.number().int().nonnegative().optional(),
  paymentMode: z.string().optional(),
  accountId: z.number().int().positive().optional().nullable(),
  notes: z.string().optional(),
  items: z.array(purchaseItemSchema).min(1).optional(),
});

// --- Sale Item ---
const saleItemSchema = z.object({
  vegetableId: z.number().int().positive(),
  quantity: z.number().positive(),
  unit: z.string().min(1),
  rate: z.number().int().nonnegative(),
});

// --- Sale ---
export const createSaleSchema = z.object({
  date: z.string().min(1, 'Date is required'),
  buyerId: z.number().int().positive(),
  deductionAmount: z.number().int().nonnegative().default(0),
  deductionReason: z.string().optional(),
  receivedNow: z.number().int().nonnegative().default(0),
  paymentMode: z.string().optional(),
  accountId: z.number().int().positive().optional().nullable(),
  notes: z.string().optional(),
  items: z.array(saleItemSchema).min(1, 'At least one item is required'),
});

export const updateSaleSchema = z.object({
  date: z.string().optional(),
  buyerId: z.number().int().positive().optional(),
  deductionAmount: z.number().int().nonnegative().optional(),
  deductionReason: z.string().optional(),
  receivedNow: z.number().int().nonnegative().optional(),
  paymentMode: z.string().optional(),
  accountId: z.number().int().positive().optional().nullable(),
  notes: z.string().optional(),
  items: z.array(saleItemSchema).min(1).optional(),
});

// --- Payment ---
export const createPaymentSchema = z.object({
  date: z.string().min(1, 'Date is required'),
  direction: z.enum(['PAID_TO_SELLER', 'RECEIVED_FROM_BUYER']),
  sellerId: z.number().int().positive().optional(),
  buyerId: z.number().int().positive().optional(),
  amount: z.number().int().positive('Amount must be positive'),
  mode: z.string().min(1, 'Payment mode is required'),
  accountId: z.number().int().positive().optional().nullable(),
  reference: z.string().optional(),
  linkedEntryId: z.number().int().optional(),
  notes: z.string().optional(),
}).refine(
  (data) => {
    if (data.direction === 'PAID_TO_SELLER') return !!data.sellerId;
    if (data.direction === 'RECEIVED_FROM_BUYER') return !!data.buyerId;
    return false;
  },
  { message: 'sellerId required for PAID_TO_SELLER, buyerId required for RECEIVED_FROM_BUYER' }
);

export const updatePaymentSchema = z.object({
  date: z.string().optional(),
  direction: z.enum(['PAID_TO_SELLER', 'RECEIVED_FROM_BUYER']).optional(),
  sellerId: z.number().int().positive().optional().nullable(),
  buyerId: z.number().int().positive().optional().nullable(),
  amount: z.number().int().positive().optional(),
  mode: z.string().min(1).optional(),
  accountId: z.number().int().positive().optional().nullable(),
  reference: z.string().optional(),
  linkedEntryId: z.number().int().optional().nullable(),
  notes: z.string().optional(),
});

// --- Wastage ---
export const createWastageSchema = z.object({
  date: z.string().min(1, 'Date is required'),
  vegetableId: z.number().int().positive(),
  quantity: z.number().positive(),
  reason: z.enum(['Rotten', 'Damaged', 'Shrinkage', 'Other']),
  notes: z.string().optional(),
});

export const updateWastageSchema = z.object({
  date: z.string().optional(),
  vegetableId: z.number().int().positive().optional(),
  quantity: z.number().positive().optional(),
  reason: z.enum(['Rotten', 'Damaged', 'Shrinkage', 'Other']).optional(),
  notes: z.string().optional(),
});

// --- Expense ---
export const createExpenseSchema = z.object({
  date: z.string().min(1, 'Date is required'),
  category: z.enum(['Transport', 'Labour', 'Rent', 'Fuel', 'Other']),
  amount: z.number().int().positive('Amount must be positive'),
  accountId: z.number().int().positive().optional().nullable(),
  notes: z.string().optional(),
});

export const updateExpenseSchema = z.object({
  date: z.string().optional(),
  category: z.enum(['Transport', 'Labour', 'Rent', 'Fuel', 'Other']).optional(),
  amount: z.number().int().positive().optional(),
  accountId: z.number().int().positive().optional().nullable(),
  notes: z.string().optional(),
});
