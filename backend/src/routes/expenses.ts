import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/roleGuard.js';
import { logAudit } from '../middleware/auditLog.js';
import { createExpenseSchema, updateExpenseSchema } from '../utils/validation.js';

const router = Router();
const prisma = new PrismaClient();

// GET /api/expenses — Owner only
router.get('/', authenticate, requireRole('OWNER'), async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const category = req.query.category as string;
    const accountId = req.query.accountId ? parseInt(req.query.accountId as string) : undefined;
    const from = req.query.from as string;
    const to = req.query.to as string;

    const where: any = {};
    if (category) where.category = category;
    if (accountId) where.accountId = accountId;
    if (from || to) {
      where.date = {};
      if (from) where.date.gte = new Date(from);
      if (to) where.date.lte = new Date(to + 'T23:59:59.999Z');
    }

    const [expenses, total] = await Promise.all([
      prisma.expense.findMany({
        where,
        include: {
          user: { select: { id: true, name: true } },
          account: { select: { id: true, name: true, type: true } },
        },
        orderBy: { date: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.expense.count({ where }),
    ]);

    res.json({
      expenses,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching expenses:', error);
    res.status(500).json({ error: 'Failed to fetch expenses' });
  }
});

// POST /api/expenses — Owner only
router.post('/', authenticate, requireRole('OWNER'), async (req: Request, res: Response) => {
  try {
    const validated = createExpenseSchema.parse(req.body);
    const { userId } = req.user!;

    const expense = await prisma.expense.create({
      data: {
        date: new Date(validated.date),
        category: validated.category,
        amount: validated.amount,
        accountId: validated.accountId || null,
        notes: validated.notes,
        createdBy: userId,
      },
      include: {
        account: true,
      },
    });

    await logAudit(userId, 'CREATE', 'Expense', expense.id, null, JSON.stringify(expense));
    res.status(201).json(expense);
  } catch (error: any) {
    console.error('Error creating expense:', error);
    if (error.errors) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    res.status(500).json({ error: 'Failed to create expense' });
  }
});

// PUT /api/expenses/:id — Owner only
router.put('/:id', authenticate, requireRole('OWNER'), async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const validated = updateExpenseSchema.parse(req.body);
    const { userId } = req.user!;

    const existing = await prisma.expense.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: 'Expense not found' });
    }

    const updated = await prisma.expense.update({
      where: { id },
      data: {
        ...(validated.date ? { date: new Date(validated.date) } : {}),
        ...(validated.category ? { category: validated.category } : {}),
        ...(validated.amount !== undefined ? { amount: validated.amount } : {}),
        ...(validated.accountId !== undefined ? { accountId: validated.accountId } : {}),
        ...(validated.notes !== undefined ? { notes: validated.notes } : {}),
      },
      include: {
        account: true,
      },
    });

    await logAudit(userId, 'UPDATE', 'Expense', id, JSON.stringify(existing), JSON.stringify(updated));
    res.json(updated);
  } catch (error: any) {
    console.error('Error updating expense:', error);
    if (error.errors) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    res.status(500).json({ error: 'Failed to update expense' });
  }
});

// DELETE /api/expenses/:id — Owner only
router.delete('/:id', authenticate, requireRole('OWNER'), async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const { userId } = req.user!;

    const existing = await prisma.expense.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: 'Expense not found' });
    }

    await prisma.expense.delete({ where: { id } });
    await logAudit(userId, 'DELETE', 'Expense', id, JSON.stringify(existing), null);

    res.json({ message: 'Expense deleted successfully' });
  } catch (error) {
    console.error('Error deleting expense:', error);
    res.status(500).json({ error: 'Failed to delete expense' });
  }
});

export default router;
