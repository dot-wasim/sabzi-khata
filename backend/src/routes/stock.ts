import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { startOfDay, endOfDay } from 'date-fns';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/roleGuard.js';

const router = Router();
const prisma = new PrismaClient();

// GET /api/stock?date=YYYY-MM-DD — Owner only
router.get('/', authenticate, requireRole('OWNER'), async (req: Request, res: Response) => {
  try {
    const targetDate = req.query.date ? new Date(req.query.date as string) : new Date();
    const dayStart = startOfDay(targetDate);
    const dayEnd = endOfDay(targetDate);

    // 1. Fetch all active vegetables
    const vegetables = await prisma.vegetable.findMany({
      where: { active: true },
      orderBy: { nameEn: 'asc' },
    });

    // 2. Fetch all historical purchases, sales, wastages prior to targetDate
    const [priorPurchases, priorSales, priorWastages] = await Promise.all([
      prisma.purchaseItem.findMany({
        where: {
          purchase: { date: { lt: dayStart } },
        },
        select: { vegetableId: true, quantity: true },
      }),
      prisma.saleItem.findMany({
        where: {
          sale: { date: { lt: dayStart } },
        },
        select: { vegetableId: true, quantity: true },
      }),
      prisma.wastage.findMany({
        where: { date: { lt: dayStart } },
        select: { vegetableId: true, quantity: true },
      }),
    ]);

    // 3. Fetch target day's purchases, sales, wastages
    const [dayPurchases, daySales, dayWastages] = await Promise.all([
      prisma.purchaseItem.findMany({
        where: {
          purchase: { date: { gte: dayStart, lte: dayEnd } },
        },
        select: { vegetableId: true, quantity: true },
      }),
      prisma.saleItem.findMany({
        where: {
          sale: { date: { gte: dayStart, lte: dayEnd } },
        },
        select: { vegetableId: true, quantity: true },
      }),
      prisma.wastage.findMany({
        where: { date: { gte: dayStart, lte: dayEnd } },
        select: { vegetableId: true, quantity: true },
      }),
    ]);

    // Aggregate prior
    const priorPurchasedMap = new Map<number, number>();
    for (const item of priorPurchases) {
      priorPurchasedMap.set(item.vegetableId, (priorPurchasedMap.get(item.vegetableId) || 0) + item.quantity);
    }
    const priorSoldMap = new Map<number, number>();
    for (const item of priorSales) {
      priorSoldMap.set(item.vegetableId, (priorSoldMap.get(item.vegetableId) || 0) + item.quantity);
    }
    const priorWastedMap = new Map<number, number>();
    for (const item of priorWastages) {
      priorWastedMap.set(item.vegetableId, (priorWastedMap.get(item.vegetableId) || 0) + item.quantity);
    }

    // Aggregate day
    const dayPurchasedMap = new Map<number, number>();
    for (const item of dayPurchases) {
      dayPurchasedMap.set(item.vegetableId, (dayPurchasedMap.get(item.vegetableId) || 0) + item.quantity);
    }
    const daySoldMap = new Map<number, number>();
    for (const item of daySales) {
      daySoldMap.set(item.vegetableId, (daySoldMap.get(item.vegetableId) || 0) + item.quantity);
    }
    const dayWastedMap = new Map<number, number>();
    for (const item of dayWastages) {
      dayWastedMap.set(item.vegetableId, (dayWastedMap.get(item.vegetableId) || 0) + item.quantity);
    }

    // Compute stock per vegetable
    const stock = vegetables.map((v) => {
      const priorP = priorPurchasedMap.get(v.id) || 0;
      const priorS = priorSoldMap.get(v.id) || 0;
      const priorW = priorWastedMap.get(v.id) || 0;
      const opening = Number((priorP - priorS - priorW).toFixed(2));

      const purchased = Number((dayPurchasedMap.get(v.id) || 0).toFixed(2));
      const sold = Number((daySoldMap.get(v.id) || 0).toFixed(2));
      const wasted = Number((dayWastedMap.get(v.id) || 0).toFixed(2));

      const closing = Number((opening + purchased - sold - wasted).toFixed(2));
      const warning = sold > opening + purchased || closing < 0;

      return {
        vegetableId: v.id,
        vegetable: v,
        opening,
        purchased,
        sold,
        wasted,
        closing,
        warning,
      };
    });

    res.json({
      date: targetDate.toISOString().split('T')[0],
      stock,
    });
  } catch (error) {
    console.error('Error calculating stock:', error);
    res.status(500).json({ error: 'Failed to calculate stock' });
  }
});

export default router;
