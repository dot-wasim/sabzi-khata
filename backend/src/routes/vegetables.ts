import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/roleGuard.js';
import { logAudit } from '../middleware/auditLog.js';
import { createVegetableSchema, updateVegetableSchema } from '../utils/validation.js';

const router = Router();
const prisma = new PrismaClient();

// GET /api/vegetables — both roles
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
        { nameEn: { contains: search } },
        { nameHi: { contains: search } },
      ];
    }

    const vegetables = await prisma.vegetable.findMany({
      where,
      orderBy: { nameEn: 'asc' },
    });

    res.json({ vegetables });
  } catch (err) {
    console.error('List vegetables error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// POST /api/vegetables — Both roles can add/restore vegetables
router.post('/', authenticate, async (req: Request, res: Response) => {
  try {
    const data = createVegetableSchema.parse(req.body);
    const existing = await prisma.vegetable.findFirst({
      where: {
        OR: [
          { nameEn: { equals: data.nameEn } },
          { nameHi: { equals: data.nameHi } },
        ],
      },
    });

    if (existing) {
      // Reactivate if already exists
      const updated = await prisma.vegetable.update({
        where: { id: existing.id },
        data: { active: true, unit: data.unit, category: data.category },
      });
      await logAudit(req.user!.userId, 'UPDATE', 'Vegetable', updated.id, existing, updated);
      res.status(200).json({ vegetable: updated });
      return;
    }

    const vegetable = await prisma.vegetable.create({ data });
    await logAudit(req.user!.userId, 'CREATE', 'Vegetable', vegetable.id, null, vegetable);
    res.status(201).json({ vegetable });
  } catch (err) {
    if ((err as any).name === 'ZodError') {
      res.status(400).json({ error: 'Validation failed', details: (err as any).errors });
      return;
    }
    console.error('Create vegetable error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// PUT /api/vegetables/:id — Both roles can edit/toggle active
router.put('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    const data = updateVegetableSchema.parse(req.body);

    const before = await prisma.vegetable.findUnique({ where: { id } });
    if (!before) {
      res.status(404).json({ error: 'Vegetable not found.' });
      return;
    }

    const vegetable = await prisma.vegetable.update({ where: { id }, data });
    await logAudit(req.user!.userId, 'UPDATE', 'Vegetable', id, before, vegetable);
    res.json({ vegetable });
  } catch (err) {
    if ((err as any).name === 'ZodError') {
      res.status(400).json({ error: 'Validation failed', details: (err as any).errors });
      return;
    }
    console.error('Update vegetable error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// DELETE /api/vegetables/:id — Soft delete / deactivate (discard from current season)
router.delete('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);

    const before = await prisma.vegetable.findUnique({ where: { id } });
    if (!before) {
      res.status(404).json({ error: 'Vegetable not found.' });
      return;
    }

    const vegetable = await prisma.vegetable.update({
      where: { id },
      data: { active: false },
    });

    await logAudit(req.user!.userId, 'DELETE', 'Vegetable', id, before, vegetable);
    res.json({ message: 'Vegetable deactivated.', vegetable });
  } catch (err) {
    console.error('Delete vegetable error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

export default router;
