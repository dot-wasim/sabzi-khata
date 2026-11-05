import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { startOfDay, endOfDay, format } from 'date-fns';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/roleGuard.js';
import { generateCSV } from '../utils/csvExport.js';

const router = Router();
const prisma = new PrismaClient();

// Helper to get date filters
function parseDateRange(req: Request) {
  const from = req.query.from ? startOfDay(new Date(req.query.from as string)) : startOfDay(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000));
  const to = req.query.to ? endOfDay(new Date(req.query.to as string)) : endOfDay(new Date());
  return { from, to };
}

// GET /api/reports/profit — Owner only
router.get('/profit', authenticate, requireRole('OWNER'), async (req: Request, res: Response) => {
  try {
    const { from, to } = parseDateRange(req);
    const groupBy = (req.query.groupBy as string) || 'day'; // 'day' | 'vegetable' | 'buyer'

    // Fetch purchases, sales, wastages, expenses in date range
    const [purchases, sales, wastages, expenses] = await Promise.all([
      prisma.purchase.findMany({
        where: { date: { gte: from, lte: to } },
        include: { items: true },
      }),
      prisma.sale.findMany({
        where: { date: { gte: from, lte: to } },
        include: { items: { include: { vegetable: true } }, buyer: true },
      }),
      prisma.wastage.findMany({
        where: { date: { gte: from, lte: to } },
        include: { vegetable: true },
      }),
      prisma.expense.findMany({
        where: { date: { gte: from, lte: to } },
      }),
    ]);

    // Average purchase rate per vegetable across the range
    const vegRates = new Map<number, { totalCost: number; totalQty: number }>();
    for (const p of purchases) {
      for (const it of p.items) {
        const cur = vegRates.get(it.vegetableId) || { totalCost: 0, totalQty: 0 };
        cur.totalCost += it.lineTotal;
        cur.totalQty += it.quantity;
        vegRates.set(it.vegetableId, cur);
      }
    }
    const getAvgRate = (vegId: number, fallback: number = 0) => {
      const cur = vegRates.get(vegId);
      return cur && cur.totalQty > 0 ? Math.round(cur.totalCost / cur.totalQty) : fallback;
    };

    if (groupBy === 'day') {
      const daysMap = new Map<string, { date: string; revenue: number; cogs: number; wastage: number; expenses: number; profit: number }>();

      // Sales
      for (const s of sales) {
        const dStr = format(s.date, 'yyyy-MM-dd');
        const entry = daysMap.get(dStr) || { date: dStr, revenue: 0, cogs: 0, wastage: 0, expenses: 0, profit: 0 };
        const itemsTotal = s.items.reduce((sum, it) => sum + it.lineTotal, 0);
        entry.revenue += itemsTotal - (s.deductionAmount || 0);

        for (const it of s.items) {
          const rate = getAvgRate(it.vegetableId, Math.round(it.rate * 0.8));
          entry.cogs += Math.round(it.quantity * rate);
        }
        daysMap.set(dStr, entry);
      }

      // Purchases extras into expenses
      for (const p of purchases) {
        const dStr = format(p.date, 'yyyy-MM-dd');
        const entry = daysMap.get(dStr) || { date: dStr, revenue: 0, cogs: 0, wastage: 0, expenses: 0, profit: 0 };
        entry.expenses += (p.transport || 0) + (p.labour || 0) + (p.commission || 0);
        daysMap.set(dStr, entry);
      }

      // Wastages
      for (const w of wastages) {
        const dStr = format(w.date, 'yyyy-MM-dd');
        const entry = daysMap.get(dStr) || { date: dStr, revenue: 0, cogs: 0, wastage: 0, expenses: 0, profit: 0 };
        const rate = getAvgRate(w.vegetableId, 0);
        entry.wastage += Math.round(w.quantity * rate);
        daysMap.set(dStr, entry);
      }

      // Direct Expenses
      for (const e of expenses) {
        const dStr = format(e.date, 'yyyy-MM-dd');
        const entry = daysMap.get(dStr) || { date: dStr, revenue: 0, cogs: 0, wastage: 0, expenses: 0, profit: 0 };
        entry.expenses += e.amount;
        daysMap.set(dStr, entry);
      }

      // Calculate profit
      const results = Array.from(daysMap.values()).map((row) => ({
        ...row,
        profit: row.revenue - row.cogs - row.wastage - row.expenses,
      })).sort((a, b) => b.date.localeCompare(a.date));

      return res.json({ groupBy: 'day', data: results });
    }

    if (groupBy === 'vegetable') {
      const vegMap = new Map<number, { vegetableId: number; nameEn: string; nameHi: string; quantitySold: number; revenue: number; cogs: number; wastageCost: number; profit: number }>();

      for (const s of sales) {
        for (const it of s.items) {
          const entry = vegMap.get(it.vegetableId) || {
            vegetableId: it.vegetableId,
            nameEn: it.vegetable.nameEn,
            nameHi: it.vegetable.nameHi,
            quantitySold: 0,
            revenue: 0,
            cogs: 0,
            wastageCost: 0,
            profit: 0,
          };
          entry.quantitySold += it.quantity;
          entry.revenue += it.lineTotal;
          const costRate = getAvgRate(it.vegetableId, Math.round(it.rate * 0.8));
          entry.cogs += Math.round(it.quantity * costRate);
          vegMap.set(it.vegetableId, entry);
        }
      }

      for (const w of wastages) {
        const entry = vegMap.get(w.vegetableId) || {
          vegetableId: w.vegetableId,
          nameEn: w.vegetable.nameEn,
          nameHi: w.vegetable.nameHi,
          quantitySold: 0,
          revenue: 0,
          cogs: 0,
          wastageCost: 0,
          profit: 0,
        };
        const costRate = getAvgRate(w.vegetableId, 0);
        entry.wastageCost += Math.round(w.quantity * costRate);
        vegMap.set(w.vegetableId, entry);
      }

      const results = Array.from(vegMap.values()).map((row) => ({
        ...row,
        quantitySold: Number(row.quantitySold.toFixed(2)),
        profit: row.revenue - row.cogs - row.wastageCost,
      })).sort((a, b) => b.profit - a.profit);

      return res.json({ groupBy: 'vegetable', data: results });
    }

    if (groupBy === 'buyer') {
      const buyerMap = new Map<number, { buyerId: number; buyerName: string; totalSales: number; totalReceived: number; balance: number; profit: number }>();

      for (const s of sales) {
        const entry = buyerMap.get(s.buyerId) || {
          buyerId: s.buyerId,
          buyerName: s.buyer.name,
          totalSales: 0,
          totalReceived: 0,
          balance: 0,
          profit: 0,
        };
        const itemsTotal = s.items.reduce((sum, it) => sum + it.lineTotal, 0);
        const netSale = itemsTotal - (s.deductionAmount || 0);
        entry.totalSales += netSale;

        let saleCost = 0;
        for (const it of s.items) {
          const costRate = getAvgRate(it.vegetableId, Math.round(it.rate * 0.8));
          saleCost += Math.round(it.quantity * costRate);
        }
        entry.profit += netSale - saleCost;
        buyerMap.set(s.buyerId, entry);
      }

      const results = Array.from(buyerMap.values()).sort((a, b) => b.profit - a.profit);
      return res.json({ groupBy: 'buyer', data: results });
    }

    res.status(400).json({ error: 'Invalid groupBy parameter' });
  } catch (error) {
    console.error('Error fetching profit report:', error);
    res.status(500).json({ error: 'Failed to fetch profit report' });
  }
});

// GET /api/reports/top-vegetables
router.get('/top-vegetables', authenticate, requireRole('OWNER'), async (req: Request, res: Response) => {
  try {
    const { from, to } = parseDateRange(req);
    const by = (req.query.by as string) || 'quantity'; // 'quantity' | 'profit'

    const sales = await prisma.sale.findMany({
      where: { date: { gte: from, lte: to } },
      include: { items: { include: { vegetable: true } } },
    });

    const purchases = await prisma.purchase.findMany({
      where: { date: { gte: from, lte: to } },
      include: { items: true },
    });

    const rates = new Map<number, { cost: number; qty: number }>();
    for (const p of purchases) {
      for (const it of p.items) {
        const cur = rates.get(it.vegetableId) || { cost: 0, qty: 0 };
        cur.cost += it.lineTotal;
        cur.qty += it.quantity;
        rates.set(it.vegetableId, cur);
      }
    }

    const map = new Map<number, { id: number; nameEn: string; nameHi: string; unit: string; totalQuantity: number; totalRevenue: number; totalProfit: number }>();

    for (const s of sales) {
      for (const it of s.items) {
        const cur = map.get(it.vegetableId) || {
          id: it.vegetableId,
          nameEn: it.vegetable.nameEn,
          nameHi: it.vegetable.nameHi,
          unit: it.unit,
          totalQuantity: 0,
          totalRevenue: 0,
          totalProfit: 0,
        };
        cur.totalQuantity += it.quantity;
        cur.totalRevenue += it.lineTotal;
        const avg = rates.get(it.vegetableId);
        const costRate = avg && avg.qty > 0 ? Math.round(avg.cost / avg.qty) : Math.round(it.rate * 0.8);
        cur.totalProfit += it.lineTotal - Math.round(it.quantity * costRate);
        map.set(it.vegetableId, cur);
      }
    }

    const list = Array.from(map.values()).sort((a, b) =>
      by === 'profit' ? b.totalProfit - a.totalProfit : b.totalQuantity - a.totalQuantity
    ).slice(0, 10);

    res.json(list);
  } catch (error) {
    console.error('Error fetching top vegetables:', error);
    res.status(500).json({ error: 'Failed to fetch top vegetables' });
  }
});

// GET /api/reports/top-buyers
router.get('/top-buyers', authenticate, requireRole('OWNER'), async (req: Request, res: Response) => {
  try {
    const { from, to } = parseDateRange(req);

    const sales = await prisma.sale.findMany({
      where: { date: { gte: from, lte: to } },
      include: { buyer: true, items: true },
    });

    const map = new Map<number, { id: number; name: string; totalBought: number; totalOrders: number }>();

    for (const s of sales) {
      const cur = map.get(s.buyerId) || {
        id: s.buyerId,
        name: s.buyer.name,
        totalBought: 0,
        totalOrders: 0,
      };
      const itemsTotal = s.items.reduce((sum, it) => sum + it.lineTotal, 0);
      cur.totalBought += itemsTotal - (s.deductionAmount || 0);
      cur.totalOrders += 1;
      map.set(s.buyerId, cur);
    }

    const list = Array.from(map.values()).sort((a, b) => b.totalBought - a.totalBought).slice(0, 10);
    res.json(list);
  } catch (error) {
    console.error('Error fetching top buyers:', error);
    res.status(500).json({ error: 'Failed to fetch top buyers' });
  }
});

// GET /api/reports/top-sellers
router.get('/top-sellers', authenticate, requireRole('OWNER'), async (req: Request, res: Response) => {
  try {
    const { from, to } = parseDateRange(req);

    const purchases = await prisma.purchase.findMany({
      where: { date: { gte: from, lte: to } },
      include: { seller: true, items: true },
    });

    const map = new Map<number, { id: number; name: string; totalPurchased: number; totalOrders: number }>();

    for (const p of purchases) {
      const cur = map.get(p.sellerId) || {
        id: p.sellerId,
        name: p.seller.name,
        totalPurchased: 0,
        totalOrders: 0,
      };
      const itemsTotal = p.items.reduce((sum, it) => sum + it.lineTotal, 0);
      cur.totalPurchased += itemsTotal;
      cur.totalOrders += 1;
      map.set(p.sellerId, cur);
    }

    const list = Array.from(map.values()).sort((a, b) => b.totalPurchased - a.totalPurchased).slice(0, 10);
    res.json(list);
  } catch (error) {
    console.error('Error fetching top sellers:', error);
    res.status(500).json({ error: 'Failed to fetch top sellers' });
  }
});

// GET /api/reports/export/purchases (CSV)
router.get('/export/purchases', authenticate, requireRole('OWNER'), async (req: Request, res: Response) => {
  try {
    const { from, to } = parseDateRange(req);

    const purchases = await prisma.purchase.findMany({
      where: { date: { gte: from, lte: to } },
      include: {
        seller: true,
        items: { include: { vegetable: true } },
      },
      orderBy: { date: 'desc' },
    });

    const rows: Record<string, unknown>[] = [];
    for (const p of purchases) {
      for (const it of p.items) {
        rows.push({
          'Purchase ID': p.id,
          Date: format(p.date, 'yyyy-MM-dd'),
          Seller: p.seller.name,
          Vegetable: `${it.vegetable.nameEn} / ${it.vegetable.nameHi}`,
          Quantity: it.quantity,
          Unit: it.unit,
          'Rate (Rs)': (it.rate / 100).toFixed(2),
          'Line Total (Rs)': (it.lineTotal / 100).toFixed(2),
          'Transport (Rs)': (p.transport / 100).toFixed(2),
          'Labour (Rs)': (p.labour / 100).toFixed(2),
          'Paid Now (Rs)': (p.paidNow / 100).toFixed(2),
          Notes: p.notes || '',
        });
      }
    }

    const csv = generateCSV(rows);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="purchases_${format(new Date(), 'yyyy-MM-dd')}.csv"`);
    res.send(csv);
  } catch (error) {
    console.error('Error exporting purchases:', error);
    res.status(500).json({ error: 'Failed to export purchases' });
  }
});

// GET /api/reports/export/sales (CSV)
router.get('/export/sales', authenticate, requireRole('OWNER'), async (req: Request, res: Response) => {
  try {
    const { from, to } = parseDateRange(req);

    const sales = await prisma.sale.findMany({
      where: { date: { gte: from, lte: to } },
      include: {
        buyer: true,
        items: { include: { vegetable: true } },
      },
      orderBy: { date: 'desc' },
    });

    const rows: Record<string, unknown>[] = [];
    for (const s of sales) {
      for (const it of s.items) {
        rows.push({
          'Sale ID': s.id,
          Date: format(s.date, 'yyyy-MM-dd'),
          Buyer: s.buyer.name,
          Vegetable: `${it.vegetable.nameEn} / ${it.vegetable.nameHi}`,
          Quantity: it.quantity,
          Unit: it.unit,
          'Rate (Rs)': (it.rate / 100).toFixed(2),
          'Line Total (Rs)': (it.lineTotal / 100).toFixed(2),
          'Deduction (Rs)': (s.deductionAmount / 100).toFixed(2),
          'Received Now (Rs)': (s.receivedNow / 100).toFixed(2),
          Notes: s.notes || '',
        });
      }
    }

    const csv = generateCSV(rows);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="sales_${format(new Date(), 'yyyy-MM-dd')}.csv"`);
    res.send(csv);
  } catch (error) {
    console.error('Error exporting sales:', error);
    res.status(500).json({ error: 'Failed to export sales' });
  }
});

export default router;
