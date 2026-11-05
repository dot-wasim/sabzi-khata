import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/roleGuard.js';
import { logAudit } from '../middleware/auditLog.js';
import { createPaymentSchema, updatePaymentSchema } from '../utils/validation.js';

const router = Router();
const prisma = new PrismaClient();

// GET /api/payments
router.get('/', authenticate, async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const direction = req.query.direction as string;
    const sellerId = req.query.sellerId ? parseInt(req.query.sellerId as string) : undefined;
    const buyerId = req.query.buyerId ? parseInt(req.query.buyerId as string) : undefined;
    const accountId = req.query.accountId ? parseInt(req.query.accountId as string) : undefined;
    const from = req.query.from as string;
    const to = req.query.to as string;

    const where: any = {};
    if (direction) where.direction = direction;
    if (sellerId) where.sellerId = sellerId;
    if (buyerId) where.buyerId = buyerId;
    if (accountId) where.accountId = accountId;
    if (from || to) {
      where.date = {};
      if (from) where.date.gte = new Date(from);
      if (to) where.date.lte = new Date(to + 'T23:59:59.999Z');
    }

    const [payments, total] = await Promise.all([
      prisma.payment.findMany({
        where,
        include: {
          seller: { select: { id: true, name: true } },
          buyer: { select: { id: true, name: true } },
          user: { select: { id: true, name: true } },
          account: { select: { id: true, name: true, type: true } },
        },
        orderBy: { date: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.payment.count({ where }),
    ]);

    res.json({
      payments,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching payments:', error);
    res.status(500).json({ error: 'Failed to fetch payments' });
  }
});

// GET /api/payments/:id
router.get('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const payment = await prisma.payment.findUnique({
      where: { id },
      include: {
        seller: true,
        buyer: true,
        user: { select: { id: true, name: true } },
        account: true,
      },
    });

    if (!payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    res.json(payment);
  } catch (error) {
    console.error('Error fetching payment:', error);
    res.status(500).json({ error: 'Failed to fetch payment' });
  }
});

// POST /api/payments — Both roles can record payments
router.post('/', authenticate, async (req: Request, res: Response) => {
  try {
    const validated = createPaymentSchema.parse(req.body);
    const { userId } = req.user!;

    const payment = await prisma.payment.create({
      data: {
        date: new Date(validated.date),
        direction: validated.direction,
        sellerId: validated.sellerId || null,
        buyerId: validated.buyerId || null,
        amount: validated.amount,
        mode: validated.mode,
        accountId: validated.accountId || null,
        reference: validated.reference,
        linkedEntryId: validated.linkedEntryId || null,
        notes: validated.notes,
        createdBy: userId,
      },
      include: {
        seller: true,
        buyer: true,
        account: true,
      },
    });

    await logAudit(userId, 'CREATE', 'Payment', payment.id, null, JSON.stringify(payment));
    res.status(201).json(payment);
  } catch (error: any) {
    console.error('Error creating payment:', error);
    if (error.errors) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    res.status(500).json({ error: 'Failed to create payment' });
  }
});

// PUT /api/payments/:id — Owner only
router.put('/:id', authenticate, requireRole('OWNER'), async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const validated = updatePaymentSchema.parse(req.body);
    const { userId } = req.user!;

    const existing = await prisma.payment.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    const updated = await prisma.payment.update({
      where: { id },
      data: {
        ...(validated.date ? { date: new Date(validated.date) } : {}),
        ...(validated.direction ? { direction: validated.direction } : {}),
        ...(validated.sellerId !== undefined ? { sellerId: validated.sellerId } : {}),
        ...(validated.buyerId !== undefined ? { buyerId: validated.buyerId } : {}),
        ...(validated.amount !== undefined ? { amount: validated.amount } : {}),
        ...(validated.mode !== undefined ? { mode: validated.mode } : {}),
        ...(validated.accountId !== undefined ? { accountId: validated.accountId } : {}),
        ...(validated.reference !== undefined ? { reference: validated.reference } : {}),
        ...(validated.linkedEntryId !== undefined ? { linkedEntryId: validated.linkedEntryId } : {}),
        ...(validated.notes !== undefined ? { notes: validated.notes } : {}),
      },
      include: {
        seller: true,
        buyer: true,
        account: true,
      },
    });

    await logAudit(userId, 'UPDATE', 'Payment', id, JSON.stringify(existing), JSON.stringify(updated));
    res.json(updated);
  } catch (error: any) {
    console.error('Error updating payment:', error);
    if (error.errors) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    res.status(500).json({ error: 'Failed to update payment' });
  }
});

// DELETE /api/payments/:id — Owner only
router.delete('/:id', authenticate, requireRole('OWNER'), async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const { userId } = req.user!;

    const existing = await prisma.payment.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    await prisma.payment.delete({ where: { id } });
    await logAudit(userId, 'DELETE', 'Payment', id, JSON.stringify(existing), null);

    res.json({ message: 'Payment deleted successfully' });
  } catch (error) {
    console.error('Error deleting payment:', error);
    res.status(500).json({ error: 'Failed to delete payment' });
  }
});

export default router;
