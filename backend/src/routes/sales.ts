import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/roleGuard.js';
import { logAudit } from '../middleware/auditLog.js';
import { createSaleSchema, updateSaleSchema } from '../utils/validation.js';

const router = Router();
const prisma = new PrismaClient();

// GET /api/sales — Both roles can view sales (Sell Desk)
router.get('/', authenticate, async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const from = req.query.from as string;
    const to = req.query.to as string;
    const buyerId = req.query.buyerId ? parseInt(req.query.buyerId as string) : undefined;

    const where: any = {};
    if (from || to) {
      where.date = {};
      if (from) where.date.gte = new Date(from);
      if (to) where.date.lte = new Date(to + 'T23:59:59.999Z');
    }

    if (buyerId) {
      where.buyerId = buyerId;
    }

    const [sales, total] = await Promise.all([
      prisma.sale.findMany({
        where,
        include: {
          items: { include: { vegetable: true } },
          buyer: { select: { id: true, name: true, phone: true, address: true } },
          user: { select: { id: true, name: true } },
          account: { select: { id: true, name: true, type: true } },
        },
        orderBy: { date: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.sale.count({ where }),
    ]);

    const enrichedSales = sales.map((sale) => {
      const itemsTotal = sale.items.reduce((sum, item) => sum + item.lineTotal, 0);
      const totalAmount = itemsTotal - (sale.deductionAmount || 0);
      const balance = totalAmount - (sale.receivedNow || 0);
      return {
        ...sale,
        itemsTotal,
        totalAmount,
        balance,
      };
    });

    res.json({
      sales: enrichedSales,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching sales:', error);
    res.status(500).json({ error: 'Failed to fetch sales' });
  }
});

// GET /api/sales/:id
router.get('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const sale = await prisma.sale.findUnique({
      where: { id },
      include: {
        items: { include: { vegetable: true } },
        buyer: true,
        user: { select: { id: true, name: true } },
        account: true,
      },
    });

    if (!sale) {
      return res.status(404).json({ error: 'Sale not found' });
    }

    const itemsTotal = sale.items.reduce((sum, item) => sum + item.lineTotal, 0);
    const totalAmount = itemsTotal - (sale.deductionAmount || 0);
    const balance = totalAmount - (sale.receivedNow || 0);

    res.json({
      ...sale,
      itemsTotal,
      totalAmount,
      balance,
    });
  } catch (error) {
    console.error('Error fetching sale:', error);
    res.status(500).json({ error: 'Failed to fetch sale' });
  }
});

// POST /api/sales — Both roles can record sales (System 1 Sell Desk)
router.post('/', authenticate, async (req: Request, res: Response) => {
  try {
    const validated = createSaleSchema.parse(req.body);
    const { userId } = req.user!;

    const result = await prisma.$transaction(async (tx) => {
      const sale = await tx.sale.create({
        data: {
          date: new Date(validated.date),
          buyerId: validated.buyerId,
          deductionAmount: validated.deductionAmount || 0,
          deductionReason: validated.deductionReason,
          receivedNow: validated.receivedNow || 0,
          paymentMode: validated.paymentMode,
          accountId: validated.accountId || null,
          notes: validated.notes,
          createdBy: userId,
          items: {
            create: validated.items.map((item) => ({
              vegetableId: item.vegetableId,
              quantity: item.quantity,
              unit: item.unit,
              rate: item.rate,
              lineTotal: Math.round(item.quantity * item.rate),
            })),
          },
        },
        include: {
          items: { include: { vegetable: true } },
          buyer: true,
          account: true,
        },
      });

      // If received money at time of sale, auto-create Payment record with linked account
      if (validated.receivedNow && validated.receivedNow > 0) {
        await tx.payment.create({
          data: {
            date: new Date(validated.date),
            direction: 'RECEIVED_FROM_BUYER',
            buyerId: validated.buyerId,
            amount: validated.receivedNow,
            mode: validated.paymentMode || 'Cash',
            accountId: validated.accountId || null,
            reference: `Sale #${sale.id}`,
            linkedEntryId: sale.id,
            notes: 'Payment received at time of sale',
            createdBy: userId,
          },
        });
      }

      await logAudit(userId, 'CREATE', 'Sale', sale.id, null, JSON.stringify(sale));
      return sale;
    });

    res.status(201).json(result);
  } catch (error: any) {
    console.error('Error creating sale:', error);
    if (error.errors) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    res.status(500).json({ error: 'Failed to create sale' });
  }
});

// PUT /api/sales/:id — Edit sale
router.put('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const validated = updateSaleSchema.parse(req.body);
    const { userId } = req.user!;

    const existing = await prisma.sale.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Sale not found' });
    }

    const updated = await prisma.$transaction(async (tx) => {
      if (validated.items) {
        await tx.saleItem.deleteMany({ where: { saleId: id } });
      }

      const sale = await tx.sale.update({
        where: { id },
        data: {
          ...(validated.date ? { date: new Date(validated.date) } : {}),
          ...(validated.buyerId ? { buyerId: validated.buyerId } : {}),
          ...(validated.deductionAmount !== undefined ? { deductionAmount: validated.deductionAmount } : {}),
          ...(validated.deductionReason !== undefined ? { deductionReason: validated.deductionReason } : {}),
          ...(validated.receivedNow !== undefined ? { receivedNow: validated.receivedNow } : {}),
          ...(validated.paymentMode !== undefined ? { paymentMode: validated.paymentMode } : {}),
          ...(validated.accountId !== undefined ? { accountId: validated.accountId } : {}),
          ...(validated.notes !== undefined ? { notes: validated.notes } : {}),
          ...(validated.items
            ? {
                items: {
                  create: validated.items.map((item) => ({
                    vegetableId: item.vegetableId,
                    quantity: item.quantity,
                    unit: item.unit,
                    rate: item.rate,
                    lineTotal: Math.round(item.quantity * item.rate),
                  })),
                },
              }
            : {}),
        },
        include: {
          items: { include: { vegetable: true } },
          buyer: true,
          account: true,
        },
      });

      await logAudit(userId, 'UPDATE', 'Sale', id, JSON.stringify(existing), JSON.stringify(sale));
      return sale;
    });

    res.json(updated);
  } catch (error: any) {
    console.error('Error updating sale:', error);
    if (error.errors) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    res.status(500).json({ error: 'Failed to update sale' });
  }
});

// DELETE /api/sales/:id — Owner only
router.delete('/:id', authenticate, requireRole('OWNER'), async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const { userId } = req.user!;

    const existing = await prisma.sale.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Sale not found' });
    }

    await prisma.$transaction(async (tx) => {
      await tx.saleItem.deleteMany({ where: { saleId: id } });
      await tx.sale.delete({ where: { id } });
      await logAudit(userId, 'DELETE', 'Sale', id, JSON.stringify(existing), null);
    });

    res.json({ message: 'Sale deleted successfully' });
  } catch (error) {
    console.error('Error deleting sale:', error);
    res.status(500).json({ error: 'Failed to delete sale' });
  }
});

export default router;
