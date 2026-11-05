import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { startOfDay, endOfDay } from 'date-fns';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/roleGuard.js';
import { logAudit } from '../middleware/auditLog.js';
import { createPurchaseSchema, updatePurchaseSchema } from '../utils/validation.js';

const router = Router();
const prisma = new PrismaClient();

// GET /api/purchases — Owner: all; MarketEntry: today's own only
router.get('/', authenticate, async (req: Request, res: Response) => {
  try {
    const { role, userId } = req.user!;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const from = req.query.from as string;
    const to = req.query.to as string;
    const sellerId = req.query.sellerId ? parseInt(req.query.sellerId as string) : undefined;

    const where: any = {};

    if (role === 'MARKET_ENTRY') {
      // Only today's own purchases
      const today = new Date();
      where.createdBy = userId;
      where.date = {
        gte: startOfDay(today),
        lte: endOfDay(today),
      };
    } else {
      // Owner — filter by date range if provided
      if (from || to) {
        where.date = {};
        if (from) where.date.gte = new Date(from);
        if (to) where.date.lte = new Date(to + 'T23:59:59.999Z');
      }
    }

    if (sellerId) {
      where.sellerId = sellerId;
    }

    const [purchases, total] = await Promise.all([
      prisma.purchase.findMany({
        where,
        include: {
          items: { include: { vegetable: true } },
          seller: { select: { id: true, name: true, phone: true, village: true } },
          user: { select: { id: true, name: true } },
          account: { select: { id: true, name: true, type: true } },
        },
        orderBy: { date: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.purchase.count({ where }),
    ]);

    res.json({
      purchases,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    console.error('Get purchases error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// GET /api/purchases/:id
router.get('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { role, userId } = req.user!;

    const purchase = await prisma.purchase.findUnique({
      where: { id },
      include: {
        items: { include: { vegetable: true } },
        seller: true,
        user: { select: { id: true, name: true } },
        account: true,
      },
    });

    if (!purchase) {
      res.status(404).json({ error: 'Purchase not found.' });
      return;
    }

    // Role check: MARKET_ENTRY can only view today's own
    if (role === 'MARKET_ENTRY') {
      const today = new Date();
      const purchaseDate = new Date(purchase.date);
      if (
        purchase.createdBy !== userId ||
        purchaseDate < startOfDay(today) ||
        purchaseDate > endOfDay(today)
      ) {
        res.status(403).json({ error: 'Access denied.' });
        return;
      }
    }

    res.json(purchase);
  } catch (err) {
    console.error('Get purchase by id error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// POST /api/purchases — both roles
router.post('/', authenticate, async (req: Request, res: Response) => {
  try {
    const { userId } = req.user!;
    const data = createPurchaseSchema.parse(req.body);

    const result = await prisma.$transaction(async (tx) => {
      // Calculate line totals
      const itemsWithTotals = data.items.map((item) => ({
        vegetableId: item.vegetableId,
        quantity: item.quantity,
        unit: item.unit,
        rate: item.rate,
        lineTotal: Math.round(item.quantity * item.rate),
      }));

      // Create purchase with items
      const purchase = await tx.purchase.create({
        data: {
          date: new Date(data.date),
          sellerId: data.sellerId,
          transport: data.transport,
          transportType: data.transportType || 'FLAT',
          transportRate: data.transportRate || 0,
          transportUnit: data.transportUnit,
          transportQty: data.transportQty || 0,
          transporterName: data.transporterName,
          transportPaid: data.transportPaid !== undefined ? data.transportPaid : true,
          labour: data.labour,
          commission: data.commission,
          paidNow: data.paidNow,
          paymentMode: data.paymentMode,
          accountId: data.accountId || null,
          notes: data.notes,
          createdBy: userId,
          items: { create: itemsWithTotals },
        },
        include: {
          items: { include: { vegetable: true } },
          seller: { select: { id: true, name: true } },
          account: true,
        },
      });

      // Auto-create payment if paidNow > 0
      let payment = null;
      if (data.paidNow > 0) {
        payment = await tx.payment.create({
          data: {
            date: new Date(data.date),
            direction: 'PAID_TO_SELLER',
            sellerId: data.sellerId,
            amount: data.paidNow,
            mode: data.paymentMode || 'Cash',
            accountId: data.accountId || null,
            linkedEntryId: purchase.id,
            notes: `Auto-created from Purchase #${purchase.id}`,
            createdBy: userId,
          },
        });
      }

      return { purchase, payment };
    });

    await logAudit(userId, 'CREATE', 'Purchase', result.purchase.id, null, result.purchase);
    if (result.payment) {
      await logAudit(userId, 'CREATE', 'Payment', result.payment.id, null, result.payment);
    }

    res.status(201).json(result);
  } catch (err) {
    if ((err as any).name === 'ZodError') {
      res.status(400).json({ error: 'Validation failed', details: (err as any).errors });
      return;
    }
    console.error('Create purchase error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// PUT /api/purchases/:id — Owner: any; MarketEntry: today's own only
router.put('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { role, userId } = req.user!;
    const data = updatePurchaseSchema.parse(req.body);

    const before = await prisma.purchase.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!before) {
      res.status(404).json({ error: 'Purchase not found.' });
      return;
    }

    // MARKET_ENTRY can only update today's own
    if (role === 'MARKET_ENTRY') {
      const today = new Date();
      const purchaseDate = new Date(before.date);
      if (
        before.createdBy !== userId ||
        purchaseDate < startOfDay(today) ||
        purchaseDate > endOfDay(today)
      ) {
        res.status(403).json({ error: 'You can only edit your own purchases from today.' });
        return;
      }
    }

    const result = await prisma.$transaction(async (tx) => {
      // Delete old items if new items provided
      if (data.items) {
        await tx.purchaseItem.deleteMany({ where: { purchaseId: id } });
      }

      const updateData: any = {};
      if (data.date) updateData.date = new Date(data.date);
      if (data.sellerId !== undefined) updateData.sellerId = data.sellerId;
      if (data.transport !== undefined) updateData.transport = data.transport;
      if (data.transportType !== undefined) updateData.transportType = data.transportType;
      if (data.transportRate !== undefined) updateData.transportRate = data.transportRate;
      if (data.transportUnit !== undefined) updateData.transportUnit = data.transportUnit;
      if (data.transportQty !== undefined) updateData.transportQty = data.transportQty;
      if (data.transporterName !== undefined) updateData.transporterName = data.transporterName;
      if (data.transportPaid !== undefined) updateData.transportPaid = data.transportPaid;
      if (data.labour !== undefined) updateData.labour = data.labour;
      if (data.commission !== undefined) updateData.commission = data.commission;
      if (data.paidNow !== undefined) updateData.paidNow = data.paidNow;
      if (data.paymentMode !== undefined) updateData.paymentMode = data.paymentMode;
      if (data.accountId !== undefined) updateData.accountId = data.accountId;
      if (data.notes !== undefined) updateData.notes = data.notes;

      if (data.items) {
        updateData.items = {
          create: data.items.map((item) => ({
            vegetableId: item.vegetableId,
            quantity: item.quantity,
            unit: item.unit,
            rate: item.rate,
            lineTotal: Math.round(item.quantity * item.rate),
          })),
        };
      }

      const purchase = await tx.purchase.update({
        where: { id },
        data: updateData,
        include: {
          items: { include: { vegetable: true } },
          seller: { select: { id: true, name: true } },
          account: true,
        },
      });

      return purchase;
    });

    await logAudit(userId, 'UPDATE', 'Purchase', id, before, result);

    res.json({ purchase: result });
  } catch (err) {
    if ((err as any).name === 'ZodError') {
      res.status(400).json({ error: 'Validation failed', details: (err as any).errors });
      return;
    }
    console.error('Update purchase error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// DELETE /api/purchases/:id — Owner only
router.delete('/:id', authenticate, requireRole('OWNER'), async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);

    const before = await prisma.purchase.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!before) {
      res.status(404).json({ error: 'Purchase not found.' });
      return;
    }

    await prisma.purchase.delete({ where: { id } });

    await logAudit(req.user!.userId, 'DELETE', 'Purchase', id, before, null);

    res.json({ message: 'Purchase deleted.' });
  } catch (err) {
    console.error('Delete purchase error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

export default router;
