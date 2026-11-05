import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/roleGuard.js';
import { logAudit } from '../middleware/auditLog.js';
import { createWastageSchema, updateWastageSchema } from '../utils/validation.js';

const router = Router();
const prisma = new PrismaClient();

// GET /api/wastage — Owner only
router.get('/', authenticate, requireRole('OWNER'), async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const vegetableId = req.query.vegetableId ? parseInt(req.query.vegetableId as string) : undefined;
    const from = req.query.from as string;
    const to = req.query.to as string;

    const where: any = {};
    if (vegetableId) where.vegetableId = vegetableId;
    if (from || to) {
      where.date = {};
      if (from) where.date.gte = new Date(from);
      if (to) where.date.lte = new Date(to + 'T23:59:59.999Z');
    }

    const [wastages, total] = await Promise.all([
      prisma.wastage.findMany({
        where,
        include: {
          vegetable: true,
          user: { select: { id: true, name: true } },
        },
        orderBy: { date: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.wastage.count({ where }),
    ]);

    res.json({
      wastages,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching wastage:', error);
    res.status(500).json({ error: 'Failed to fetch wastage' });
  }
});

// POST /api/wastage — Owner only
router.post('/', authenticate, requireRole('OWNER'), async (req: Request, res: Response) => {
  try {
    const validated = createWastageSchema.parse(req.body);
    const { userId } = req.user!;

    const wastage = await prisma.wastage.create({
      data: {
        date: new Date(validated.date),
        vegetableId: validated.vegetableId,
        quantity: validated.quantity,
        reason: validated.reason,
        notes: validated.notes,
        createdBy: userId,
      },
      include: {
        vegetable: true,
      },
    });

    await logAudit(userId, 'CREATE', 'Wastage', wastage.id, null, JSON.stringify(wastage));
    res.status(201).json(wastage);
  } catch (error: any) {
    console.error('Error creating wastage:', error);
    if (error.errors) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    res.status(500).json({ error: 'Failed to create wastage' });
  }
});

// PUT /api/wastage/:id — Owner only
router.put('/:id', authenticate, requireRole('OWNER'), async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const validated = updateWastageSchema.parse(req.body);
    const { userId } = req.user!;

    const existing = await prisma.wastage.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: 'Wastage entry not found' });
    }

    const updated = await prisma.wastage.update({
      where: { id },
      data: {
        ...(validated.date ? { date: new Date(validated.date) } : {}),
        ...(validated.vegetableId !== undefined ? { vegetableId: validated.vegetableId } : {}),
        ...(validated.quantity !== undefined ? { quantity: validated.quantity } : {}),
        ...(validated.reason ? { reason: validated.reason } : {}),
        ...(validated.notes !== undefined ? { notes: validated.notes } : {}),
      },
      include: {
        vegetable: true,
      },
    });

    await logAudit(userId, 'UPDATE', 'Wastage', id, JSON.stringify(existing), JSON.stringify(updated));
    res.json(updated);
  } catch (error: any) {
    console.error('Error updating wastage:', error);
    if (error.errors) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    res.status(500).json({ error: 'Failed to update wastage' });
  }
});

// DELETE /api/wastage/:id — Owner only
router.delete('/:id', authenticate, requireRole('OWNER'), async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const { userId } = req.user!;

    const existing = await prisma.wastage.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: 'Wastage entry not found' });
    }

    await prisma.wastage.delete({ where: { id } });
    await logAudit(userId, 'DELETE', 'Wastage', id, JSON.stringify(existing), null);

    res.json({ message: 'Wastage entry deleted successfully' });
  } catch (error) {
    console.error('Error deleting wastage:', error);
    res.status(500).json({ error: 'Failed to delete wastage' });
  }
});

export default router;
