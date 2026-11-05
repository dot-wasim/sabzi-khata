import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/roleGuard.js';
import { logAudit } from '../middleware/auditLog.js';
import { createSellerSchema, updateSellerSchema } from '../utils/validation.js';

const router = Router();
const prisma = new PrismaClient();

// GET /api/sellers — both roles
router.get('/', authenticate, async (req: Request, res: Response) => {
  try {
    const search = (req.query.search as string) || '';
    const showInactive = req.query.showInactive === 'true';

    const where: any = {};
    if (!showInactive) {
      where.active = true;
    }
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { phone: { contains: search } },
        { village: { contains: search } },
      ];
    }

    const sellers = await prisma.seller.findMany({
      where,
      include: {
        purchases: {
          include: {
            items: true,
          },
        },
        payments: true,
      },
      orderBy: { name: 'asc' },
    });

    const sellersWithBalance = sellers.map((s) => {
      const totalPurchased = s.purchases.reduce((sum, p) => {
        const itemsTotal = p.items.reduce((iSum, it) => iSum + it.lineTotal, 0);
        return sum + itemsTotal + (p.transport || 0) + (p.labour || 0) + (p.commission || 0);
      }, 0);
      const totalPaid = s.payments
        .filter((pm) => pm.direction === 'PAID_TO_SELLER')
        .reduce((sum, pm) => sum + pm.amount, 0);
      const currentBalance = s.openingBalance + totalPurchased - totalPaid;

      return {
        id: s.id,
        name: s.name,
        phone: s.phone,
        village: s.village,
        type: s.type,
        isOwnFarmer: s.isOwnFarmer,
        notes: s.notes,
        openingBalance: s.openingBalance,
        active: s.active,
        createdAt: s.createdAt,
        updatedAt: s.updatedAt,
        currentBalance,
        totalPurchased,
        totalPaid,
      };
    });

    res.json({ sellers: sellersWithBalance });
  } catch (err) {
    console.error('List sellers error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// POST /api/sellers — both roles
router.post('/', authenticate, async (req: Request, res: Response) => {
  try {
    const data = createSellerSchema.parse(req.body);
    const seller = await prisma.seller.create({ data });

    await logAudit(req.user!.userId, 'CREATE', 'Seller', seller.id, null, seller);

    res.status(201).json({ seller });
  } catch (err) {
    if ((err as any).name === 'ZodError') {
      res.status(400).json({ error: 'Validation failed', details: (err as any).errors });
      return;
    }
    console.error('Create seller error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// PUT /api/sellers/:id — Owner only
router.put('/:id', authenticate, requireRole('OWNER'), async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    const data = updateSellerSchema.parse(req.body);

    const before = await prisma.seller.findUnique({ where: { id } });
    if (!before) {
      res.status(404).json({ error: 'Seller not found.' });
      return;
    }

    const seller = await prisma.seller.update({ where: { id }, data });

    await logAudit(req.user!.userId, 'UPDATE', 'Seller', id, before, seller);

    res.json({ seller });
  } catch (err) {
    if ((err as any).name === 'ZodError') {
      res.status(400).json({ error: 'Validation failed', details: (err as any).errors });
      return;
    }
    console.error('Update seller error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// GET /api/sellers/:id — full profile with summary stats
router.get('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);

    const seller = await prisma.seller.findUnique({ where: { id } });
    if (!seller) {
      res.status(404).json({ error: 'Seller not found.' });
      return;
    }

    // Total purchases from this seller
    const purchaseItems = await prisma.purchaseItem.findMany({
      where: { purchase: { sellerId: id } },
      select: { lineTotal: true },
    });
    const totalPurchases = purchaseItems.reduce((sum, i) => sum + i.lineTotal, 0);

    // Extra costs on purchases
    const purchases = await prisma.purchase.findMany({
      where: { sellerId: id },
      select: { transport: true, labour: true, commission: true },
    });
    const totalExtras = purchases.reduce(
      (sum, p) => sum + p.transport + p.labour + p.commission,
      0
    );

    // Total payments to this seller
    const payments = await prisma.payment.findMany({
      where: { sellerId: id, direction: 'PAID_TO_SELLER' },
      select: { amount: true },
    });
    const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);

    // Balance = openingBalance + totalPurchases + totalExtras - totalPaid
    const currentBalance = seller.openingBalance + totalPurchases + totalExtras - totalPaid;

    res.json({
      seller,
      stats: {
        totalPurchases,
        totalExtras,
        totalPaid,
        currentBalance,
        purchaseCount: purchases.length,
        paymentCount: payments.length,
      },
    });
  } catch (err) {
    console.error('Get seller error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// GET /api/sellers/:id/ledger — Owner only, paginated ledger
router.get('/:id/ledger', authenticate, requireRole('OWNER'), async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const from = req.query.from as string;
    const to = req.query.to as string;

    const seller = await prisma.seller.findUnique({ where: { id } });
    if (!seller) {
      res.status(404).json({ error: 'Seller not found.' });
      return;
    }

    // Build date filter
    const dateFilter: any = {};
    if (from) dateFilter.gte = new Date(from);
    if (to) dateFilter.lte = new Date(to + 'T23:59:59.999Z');

    // Fetch purchases
    const purchasesWhere: any = { sellerId: id };
    if (from || to) purchasesWhere.date = dateFilter;

    const allPurchases = await prisma.purchase.findMany({
      where: purchasesWhere,
      include: { items: { include: { vegetable: true } } },
      orderBy: { date: 'asc' },
    });

    // Fetch payments
    const paymentsWhere: any = { sellerId: id, direction: 'PAID_TO_SELLER' };
    if (from || to) paymentsWhere.date = dateFilter;

    const allPayments = await prisma.payment.findMany({
      where: paymentsWhere,
      orderBy: { date: 'asc' },
    });

    // Build ledger entries
    type LedgerEntry = {
      date: Date;
      type: 'OPENING' | 'PURCHASE' | 'PAYMENT';
      description: string;
      debit: number;
      credit: number;
      balance: number;
      refId?: number;
    };

    const entries: LedgerEntry[] = [];

    // Opening balance
    let runningBalance = seller.openingBalance;
    entries.push({
      date: seller.createdAt,
      type: 'OPENING',
      description: 'Opening Balance',
      debit: seller.openingBalance,
      credit: 0,
      balance: runningBalance,
    });

    // Combine and sort by date
    const combined: { date: Date; kind: 'purchase' | 'payment'; data: any }[] = [];
    for (const p of allPurchases) {
      const itemsTotal = p.items.reduce((s, i) => s + i.lineTotal, 0);
      combined.push({
        date: p.date,
        kind: 'purchase',
        data: { ...p, itemsTotal },
      });
    }
    for (const p of allPayments) {
      combined.push({
        date: p.date,
        kind: 'payment',
        data: p,
      });
    }

    combined.sort((a, b) => a.date.getTime() - b.date.getTime());

    for (const entry of combined) {
      if (entry.kind === 'purchase') {
        const total = entry.data.itemsTotal + entry.data.transport + entry.data.labour + entry.data.commission;
        runningBalance += total;
        entries.push({
          date: entry.date,
          type: 'PURCHASE',
          description: `Purchase #${entry.data.id} (${entry.data.items.length} items)`,
          debit: total,
          credit: 0,
          balance: runningBalance,
          refId: entry.data.id,
        });
      } else {
        runningBalance -= entry.data.amount;
        entries.push({
          date: entry.date,
          type: 'PAYMENT',
          description: `Payment #${entry.data.id} via ${entry.data.mode}`,
          debit: 0,
          credit: entry.data.amount,
          balance: runningBalance,
          refId: entry.data.id,
        });
      }
    }

    // Paginate
    const total = entries.length;
    const start = (page - 1) * limit;
    const paginatedEntries = entries.slice(start, start + limit);

    res.json({
      seller: { id: seller.id, name: seller.name },
      ledger: paginatedEntries,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
      currentBalance: runningBalance,
    });
  } catch (err) {
    console.error('Seller ledger error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

export default router;
