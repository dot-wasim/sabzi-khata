import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/roleGuard.js';
import { logAudit } from '../middleware/auditLog.js';
import { createAccountSchema, updateAccountSchema, transferAccountSchema } from '../utils/validation.js';

const router = Router();
const prisma = new PrismaClient();

// Helper to compute live balances for all accounts
async function getAccountLiveBalances() {
  const accounts = await prisma.account.findMany({
    where: { active: true },
    orderBy: [{ isDefault: 'desc' }, { id: 'asc' }],
  });

  // Calculate inflows and outflows for each account
  const accountsWithBalances = await Promise.all(
    accounts.map(async (acc) => {
      // INFLOWS:
      // 1. Sales received now into this account
      const salesIn = await prisma.sale.aggregate({
        where: { accountId: acc.id },
        _sum: { receivedNow: true },
      });
      // 2. Payments received from buyers into this account
      const paymentsIn = await prisma.payment.aggregate({
        where: { accountId: acc.id, direction: 'RECEIVED_FROM_BUYER' },
        _sum: { amount: true },
      });

      // OUTFLOWS:
      // 1. Purchases paid now from this account
      const purchasesOut = await prisma.purchase.aggregate({
        where: { accountId: acc.id },
        _sum: { paidNow: true },
      });
      // 2. Payments paid to sellers from this account
      const paymentsOut = await prisma.payment.aggregate({
        where: { accountId: acc.id, direction: 'PAID_TO_SELLER' },
        _sum: { amount: true },
      });
      // 3. Expenses paid from this account
      const expensesOut = await prisma.expense.aggregate({
        where: { accountId: acc.id },
        _sum: { amount: true },
      });

      const totalInflow = (salesIn._sum.receivedNow || 0) + (paymentsIn._sum.amount || 0);
      const totalOutflow =
        (purchasesOut._sum.paidNow || 0) +
        (paymentsOut._sum.amount || 0) +
        (expensesOut._sum.amount || 0);

      const liveBalance = acc.openingBalance + totalInflow - totalOutflow;

      return {
        ...acc,
        liveBalance,
        totalInflow,
        totalOutflow,
      };
    })
  );

  return accountsWithBalances;
}

// GET /api/accounts — list all accounts (Both roles can list accounts for selecting dropdowns)
router.get('/', authenticate, async (_req: Request, res: Response) => {
  try {
    const accounts = await getAccountLiveBalances();
    res.json(accounts);
  } catch (error) {
    console.error('Error fetching accounts:', error);
    res.status(500).json({ error: 'Failed to fetch accounts' });
  }
});

// POST /api/accounts — Owner only
router.post('/', authenticate, requireRole('OWNER'), async (req: Request, res: Response) => {
  try {
    const validated = createAccountSchema.parse(req.body);
    const { userId } = req.user!;

    if (validated.isDefault) {
      await prisma.account.updateMany({
        where: { isDefault: true },
        data: { isDefault: false },
      });
    }

    const account = await prisma.account.create({
      data: validated,
    });

    await logAudit(userId, 'CREATE', 'Account', account.id, null, JSON.stringify(account));
    res.status(201).json(account);
  } catch (error: any) {
    console.error('Error creating account:', error);
    if (error.errors) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    res.status(500).json({ error: 'Failed to create account' });
  }
});

// PUT /api/accounts/:id — Owner only
router.put('/:id', authenticate, requireRole('OWNER'), async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const validated = updateAccountSchema.parse(req.body);
    const { userId } = req.user!;

    const existing = await prisma.account.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: 'Account not found' });
    }

    if (validated.isDefault) {
      await prisma.account.updateMany({
        where: { id: { not: id }, isDefault: true },
        data: { isDefault: false },
      });
    }

    const updated = await prisma.account.update({
      where: { id },
      data: validated,
    });

    await logAudit(userId, 'UPDATE', 'Account', id, JSON.stringify(existing), JSON.stringify(updated));
    res.json(updated);
  } catch (error: any) {
    console.error('Error updating account:', error);
    if (error.errors) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    res.status(500).json({ error: 'Failed to update account' });
  }
});

// GET /api/accounts/:id/passbook — Owner only passbook transactions
router.get('/:id/passbook', authenticate, requireRole('OWNER'), async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const account = await prisma.account.findUnique({ where: { id } });
    if (!account) {
      return res.status(404).json({ error: 'Account not found' });
    }

    // Fetch all related entries
    const [sales, purchases, payments, expenses] = await Promise.all([
      prisma.sale.findMany({
        where: { accountId: id, receivedNow: { gt: 0 } },
        include: { buyer: { select: { name: true } } },
        orderBy: { date: 'asc' },
      }),
      prisma.purchase.findMany({
        where: { accountId: id, paidNow: { gt: 0 } },
        include: { seller: { select: { name: true } } },
        orderBy: { date: 'asc' },
      }),
      prisma.payment.findMany({
        where: { accountId: id },
        include: {
          seller: { select: { name: true } },
          buyer: { select: { name: true } },
        },
        orderBy: { date: 'asc' },
      }),
      prisma.expense.findMany({
        where: { accountId: id },
        orderBy: { date: 'asc' },
      }),
    ]);

    // Format all into chronological passbook transactions
    interface Transaction {
      date: Date;
      description: string;
      type: 'IN' | 'OUT';
      amount: number;
      category: string;
    }

    const transactions: Transaction[] = [];

    // Opening balance
    let runningBalance = account.openingBalance;

    for (const s of sales) {
      transactions.push({
        date: s.date,
        description: `Sale #${s.id} Collection (${s.buyer?.name || 'Customer'})`,
        type: 'IN',
        amount: s.receivedNow,
        category: 'Sale Cash Collection',
      });
    }

    for (const p of purchases) {
      transactions.push({
        date: p.date,
        description: `Purchase #${p.id} Payout (${p.seller?.name || 'Farmer'})`,
        type: 'OUT',
        amount: p.paidNow,
        category: 'Purchase Payment',
      });
    }

    for (const pay of payments) {
      if (pay.direction === 'RECEIVED_FROM_BUYER') {
        transactions.push({
          date: pay.date,
          description: `Payment from ${pay.buyer?.name || 'Buyer'} (${pay.mode})`,
          type: 'IN',
          amount: pay.amount,
          category: 'Buyer Payment',
        });
      } else {
        transactions.push({
          date: pay.date,
          description: `Payment to ${pay.seller?.name || 'Seller'} (${pay.mode})`,
          type: 'OUT',
          amount: pay.amount,
          category: 'Seller Payout',
        });
      }
    }

    for (const exp of expenses) {
      transactions.push({
        date: exp.date,
        description: `Expense: ${exp.category} ${exp.notes ? `(${exp.notes})` : ''}`,
        type: 'OUT',
        amount: exp.amount,
        category: 'Operational Expense',
      });
    }

    // Sort chronologically
    transactions.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Compute running balance
    const passbook = transactions.map((tx) => {
      if (tx.type === 'IN') {
        runningBalance += tx.amount;
      } else {
        runningBalance -= tx.amount;
      }
      return {
        ...tx,
        balance: runningBalance,
      };
    });

    res.json({
      account,
      openingBalance: account.openingBalance,
      currentBalance: runningBalance,
      transactions: passbook.reverse(), // latest first
    });
  } catch (error) {
    console.error('Error fetching account passbook:', error);
    res.status(500).json({ error: 'Failed to fetch passbook' });
  }
});

// POST /api/accounts/transfer — Internal transfer between accounts (e.g. Galla to SBI)
router.post('/transfer', authenticate, requireRole('OWNER'), async (req: Request, res: Response) => {
  try {
    const validated = transferAccountSchema.parse(req.body);
    const { userId } = req.user!;

    if (validated.fromAccountId === validated.toAccountId) {
      return res.status(400).json({ error: 'Source and destination accounts must be different' });
    }

    const [fromAcc, toAcc] = await Promise.all([
      prisma.account.findUnique({ where: { id: validated.fromAccountId } }),
      prisma.account.findUnique({ where: { id: validated.toAccountId } }),
    ]);

    if (!fromAcc || !toAcc) {
      return res.status(404).json({ error: 'Account not found' });
    }

    // Record as two corresponding payment / internal records or expense/inflow
    // 1. Outflow from fromAcc
    const outflow = await prisma.expense.create({
      data: {
        date: new Date(validated.date),
        category: 'Other',
        amount: validated.amount,
        accountId: validated.fromAccountId,
        notes: `Transfer to ${toAcc.name}${validated.notes ? `: ${validated.notes}` : ''}`,
        createdBy: userId,
      },
    });

    // 2. Inflow to toAcc
    const inflow = await prisma.payment.create({
      data: {
        date: new Date(validated.date),
        direction: 'RECEIVED_FROM_BUYER',
        amount: validated.amount,
        mode: 'Bank Transfer',
        accountId: validated.toAccountId,
        reference: `Transfer from ${fromAcc.name}`,
        notes: `Internal transfer from ${fromAcc.name} to ${toAcc.name}`,
        createdBy: userId,
      },
    });

    await logAudit(
      userId,
      'CREATE',
      'AccountTransfer',
      outflow.id,
      null,
      JSON.stringify({ from: fromAcc.name, to: toAcc.name, amount: validated.amount })
    );

    res.json({ message: 'Transfer completed successfully', outflow, inflow });
  } catch (error: any) {
    console.error('Error in account transfer:', error);
    if (error.errors) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    res.status(500).json({ error: 'Transfer failed' });
  }
});

export default router;
