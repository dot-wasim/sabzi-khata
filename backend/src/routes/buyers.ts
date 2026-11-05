import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/roleGuard.js';
import { logAudit } from '../middleware/auditLog.js';
import { createBuyerSchema, updateBuyerSchema } from '../utils/validation.js';

const router = Router();
const prisma = new PrismaClient();

// GET /api/buyers — Both roles can list buyers (e.g. for selling)
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
        { contactPerson: { contains: search } },
      ];
    }

    const buyers = await prisma.buyer.findMany({
      where,
      include: {
        sales: {
          include: {
            items: true,
          },
        },
        payments: true,
      },
      orderBy: { name: 'asc' },
    });

    const buyersWithBalance = buyers.map((b) => {
      const totalSold = b.sales.reduce((sum, s) => {
        const itemsTotal = s.items.reduce((sSum, item) => sSum + item.lineTotal, 0);
        return sum + itemsTotal - (s.deductionAmount || 0);
      }, 0);

      const totalReceived = b.payments
        .filter((p) => p.direction === 'RECEIVED_FROM_BUYER')
        .reduce((sum, p) => sum + p.amount, 0);

      const currentBalance = b.openingBalance + totalSold - totalReceived;

      return {
        id: b.id,
        name: b.name,
        contactPerson: b.contactPerson,
        phone: b.phone,
        address: b.address,
        notes: b.notes,
        openingBalance: b.openingBalance,
        active: b.active,
        createdAt: b.createdAt,
        updatedAt: b.updatedAt,
        currentBalance,
        totalSold,
        totalReceived,
      };
    });

    res.json(buyersWithBalance);
  } catch (err) {
    console.error('List buyers error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// POST /api/buyers — Both roles can add new customers on the fly
router.post('/', authenticate, async (req: Request, res: Response) => {
  try {
    const data = createBuyerSchema.parse(req.body);
    const buyer = await prisma.buyer.create({ data });

    await logAudit(req.user!.userId, 'CREATE', 'Buyer', buyer.id, null, JSON.stringify(buyer));

    res.status(201).json(buyer);
  } catch (err: any) {
    if (err.errors) {
      return res.status(400).json({ error: 'Validation failed', details: err.errors });
    }
    console.error('Create buyer error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// GET /api/buyers/:id — Both roles can view buyer profile & ledger
router.get('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);

    const buyer = await prisma.buyer.findUnique({
      where: { id },
      include: {
        sales: {
          include: {
            items: { include: { vegetable: true } },
          },
          orderBy: { date: 'desc' },
        },
        payments: {
          orderBy: { date: 'desc' },
        },
      },
    });

    if (!buyer) {
      return res.status(404).json({ error: 'Buyer not found.' });
    }

    // Calculate totals
    const totalSold = buyer.sales.reduce((sum, s) => {
      const itemsTotal = s.items.reduce((sSum, item) => sSum + item.lineTotal, 0);
      return sum + itemsTotal - (s.deductionAmount || 0);
    }, 0);

    const totalReceived = buyer.payments
      .filter((p) => p.direction === 'RECEIVED_FROM_BUYER')
      .reduce((sum, p) => sum + p.amount, 0);

    const balanceReceivable = buyer.openingBalance + totalSold - totalReceived;

    const lastSale = buyer.sales[0];

    res.json({
      buyer,
      totalSold,
      totalReceived,
      balanceReceivable,
      lastSaleDate: lastSale ? lastSale.date : null,
    });
  } catch (err) {
    console.error('Get buyer error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// GET /api/buyers/:id/ledger — Chronological statement
router.get('/:id/ledger', authenticate, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    const from = req.query.from ? new Date(req.query.from as string) : undefined;
    const to = req.query.to ? new Date(req.query.to as string + 'T23:59:59.999Z') : undefined;

    const buyer = await prisma.buyer.findUnique({ where: { id } });
    if (!buyer) {
      return res.status(404).json({ error: 'Buyer not found.' });
    }

    const salesWhere: any = { buyerId: id };
    const paymentsWhere: any = { buyerId: id, direction: 'RECEIVED_FROM_BUYER' };

    if (from || to) {
      salesWhere.date = {};
      paymentsWhere.date = {};
      if (from) {
        salesWhere.date.gte = from;
        paymentsWhere.date.gte = from;
      }
      if (to) {
        salesWhere.date.lte = to;
        paymentsWhere.date.lte = to;
      }
    }

    const [sales, payments] = await Promise.all([
      prisma.sale.findMany({
        where: salesWhere,
        include: { items: true },
        orderBy: { date: 'asc' },
      }),
      prisma.payment.findMany({
        where: paymentsWhere,
        orderBy: { date: 'asc' },
      }),
    ]);

    interface LedgerEntry {
      date: Date;
      description: string;
      debit: number; // What we sold to them
      credit: number; // What they paid us
      balance: number;
      type: string;
    }

    const entries: LedgerEntry[] = [];
    let runningBalance = buyer.openingBalance;

    entries.push({
      date: buyer.createdAt,
      description: 'Opening Balance (आरंभिक शेष)',
      debit: buyer.openingBalance > 0 ? buyer.openingBalance : 0,
      credit: buyer.openingBalance < 0 ? Math.abs(buyer.openingBalance) : 0,
      balance: runningBalance,
      type: 'OPENING',
    });

    const combined = [
      ...sales.map((s) => ({ ...s, isSale: true })),
      ...payments.map((p) => ({ ...p, isSale: false })),
    ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    for (const item of combined) {
      if (item.isSale) {
        const s = item as any;
        const itemsTotal = s.items.reduce((sum: number, it: any) => sum + it.lineTotal, 0);
        const netSale = itemsTotal - (s.deductionAmount || 0);
        runningBalance += netSale;
        entries.push({
          date: s.date,
          description: `Sale #${s.id}`,
          debit: netSale,
          credit: 0,
          balance: runningBalance,
          type: 'SALE',
        });
      } else {
        const p = item as any;
        runningBalance -= p.amount;
        entries.push({
          date: p.date,
          description: `Payment Received (${p.mode})${p.reference ? ` - Ref: ${p.reference}` : ''}`,
          debit: 0,
          credit: p.amount,
          balance: runningBalance,
          type: 'PAYMENT',
        });
      }
    }

    res.json({
      buyer,
      openingBalance: buyer.openingBalance,
      currentBalance: runningBalance,
      entries,
    });
  } catch (err) {
    console.error('Buyer ledger error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// PUT /api/buyers/:id — Owner only
router.put('/:id', authenticate, requireRole('OWNER'), async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    const data = updateBuyerSchema.parse(req.body);

    const existing = await prisma.buyer.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: 'Buyer not found.' });
    }

    const updated = await prisma.buyer.update({
      where: { id },
      data,
    });

    await logAudit(req.user!.userId, 'UPDATE', 'Buyer', id, JSON.stringify(existing), JSON.stringify(updated));
    res.json(updated);
  } catch (err: any) {
    if (err.errors) {
      return res.status(400).json({ error: 'Validation failed', details: err.errors });
    }
    console.error('Update buyer error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// DELETE /api/buyers/:id — Owner only
router.delete('/:id', authenticate, requireRole('OWNER'), async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    const existing = await prisma.buyer.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: 'Buyer not found.' });
    }

    await prisma.buyer.delete({ where: { id } });
    await logAudit(req.user!.userId, 'DELETE', 'Buyer', id, JSON.stringify(existing), null);

    res.json({ message: 'Buyer deleted.' });
  } catch (err) {
    console.error('Delete buyer error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

export default router;
