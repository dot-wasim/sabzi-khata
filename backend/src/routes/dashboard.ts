import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { startOfDay, endOfDay } from 'date-fns';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/roleGuard.js';

const router = Router();
const prisma = new PrismaClient();

// GET /api/dashboard?date=YYYY-MM-DD — Owner only
router.get('/', authenticate, requireRole('OWNER'), async (req: Request, res: Response) => {
  try {
    const targetDate = req.query.date ? new Date(req.query.date as string) : new Date();
    const dayStart = startOfDay(targetDate);
    const dayEnd = endOfDay(targetDate);

    // 1. Purchases today
    const dayPurchases = await prisma.purchase.findMany({
      where: { date: { gte: dayStart, lte: dayEnd } },
      include: { items: true },
    });

    let boughtToday = 0;
    let purchaseExtrasToday = 0;
    const vegPurchaseRateMap = new Map<number, { totalCost: number; totalQty: number }>();

    for (const p of dayPurchases) {
      purchaseExtrasToday += (p.transport || 0) + (p.labour || 0) + (p.commission || 0);
      for (const item of p.items) {
        boughtToday += item.lineTotal;
        const current = vegPurchaseRateMap.get(item.vegetableId) || { totalCost: 0, totalQty: 0 };
        current.totalCost += item.lineTotal;
        current.totalQty += item.quantity;
        vegPurchaseRateMap.set(item.vegetableId, current);
      }
    }

    // Average purchase rate per vegetable today (in paise per unit)
    const avgRateToday = new Map<number, number>();
    for (const [vegId, data] of vegPurchaseRateMap.entries()) {
      if (data.totalQty > 0) {
        avgRateToday.set(vegId, Math.round(data.totalCost / data.totalQty));
      }
    }

    // 2. Sales today
    const daySales = await prisma.sale.findMany({
      where: { date: { gte: dayStart, lte: dayEnd } },
      include: { items: true },
    });

    let soldToday = 0;
    let costOfGoodsSold = 0;

    for (const s of daySales) {
      const itemsSum = s.items.reduce((sum, item) => sum + item.lineTotal, 0);
      soldToday += itemsSum - (s.deductionAmount || 0);

      for (const item of s.items) {
        let unitRate = avgRateToday.get(item.vegetableId);
        if (unitRate === undefined) {
          // Fallback to sale rate * 0.8 or 0 if never purchased today
          unitRate = Math.round(item.rate * 0.8);
        }
        costOfGoodsSold += Math.round(item.quantity * unitRate);
      }
    }

    // 3. Wastage today
    const dayWastages = await prisma.wastage.findMany({
      where: { date: { gte: dayStart, lte: dayEnd } },
    });

    let wastageCostToday = 0;
    for (const w of dayWastages) {
      const unitRate = avgRateToday.get(w.vegetableId) || 0;
      wastageCostToday += Math.round(w.quantity * unitRate);
    }

    // 4. Expenses today
    const dayExpenses = await prisma.expense.findMany({
      where: { date: { gte: dayStart, lte: dayEnd } },
    });
    const directExpensesToday = dayExpenses.reduce((sum, e) => sum + e.amount, 0);
    const totalExpensesToday = directExpensesToday + purchaseExtrasToday;

    // 5. Today's profit
    const todayProfit = soldToday - costOfGoodsSold - wastageCostToday - totalExpensesToday;

    // 6. Payments today
    const dayPayments = await prisma.payment.findMany({
      where: { date: { gte: dayStart, lte: dayEnd } },
    });
    let paidToday = 0;
    let receivedToday = 0;
    for (const pay of dayPayments) {
      if (pay.direction === 'PAID_TO_SELLER') paidToday += pay.amount;
      if (pay.direction === 'RECEIVED_FROM_BUYER') receivedToday += pay.amount;
    }

    // 7. Total Payable to Sellers
    const sellers = await prisma.seller.findMany({
      where: { active: true },
      include: {
        purchases: { include: { items: true } },
        payments: true,
      },
    });

    let totalPayable = 0;
    for (const seller of sellers) {
      const totalPurchases = seller.purchases.reduce((sum, p) => {
        const itemsTotal = p.items.reduce((s, it) => s + it.lineTotal, 0);
        return sum + itemsTotal + (p.transport || 0) + (p.labour || 0) + (p.commission || 0);
      }, 0);
      const totalPaid = seller.payments
        .filter((pay) => pay.direction === 'PAID_TO_SELLER')
        .reduce((sum, pay) => sum + pay.amount, 0);
      const balance = seller.openingBalance + totalPurchases - totalPaid;
      if (balance > 0) {
        totalPayable += balance;
      }
    }

    // 8. Total Receivable from Buyers
    const buyers = await prisma.buyer.findMany({
      where: { active: true },
      include: {
        sales: { include: { items: true } },
        payments: true,
      },
    });

    let totalReceivable = 0;
    for (const buyer of buyers) {
      const totalSales = buyer.sales.reduce((sum, s) => {
        const itemsTotal = s.items.reduce((sumIt, it) => sumIt + it.lineTotal, 0);
        return sum + itemsTotal - (s.deductionAmount || 0);
      }, 0);
      const totalReceived = buyer.payments
        .filter((pay) => pay.direction === 'RECEIVED_FROM_BUYER')
        .reduce((sum, pay) => sum + pay.amount, 0);
      const balance = buyer.openingBalance + totalSales - totalReceived;
      if (balance > 0) {
        totalReceivable += balance;
      }
    }

    // 9. Accounts & Bank Balances
    const accounts = await prisma.account.findMany({
      where: { active: true },
      orderBy: [{ isDefault: 'desc' }, { id: 'asc' }],
    });

    const accountsSummary = await Promise.all(
      accounts.map(async (acc) => {
        const salesIn = await prisma.sale.aggregate({
          where: { accountId: acc.id },
          _sum: { receivedNow: true },
        });
        const paymentsIn = await prisma.payment.aggregate({
          where: { accountId: acc.id, direction: 'RECEIVED_FROM_BUYER' },
          _sum: { amount: true },
        });
        const purchasesOut = await prisma.purchase.aggregate({
          where: { accountId: acc.id },
          _sum: { paidNow: true },
        });
        const paymentsOut = await prisma.payment.aggregate({
          where: { accountId: acc.id, direction: 'PAID_TO_SELLER' },
          _sum: { amount: true },
        });
        const expensesOut = await prisma.expense.aggregate({
          where: { accountId: acc.id },
          _sum: { amount: true },
        });

        const totalIn = (salesIn._sum.receivedNow || 0) + (paymentsIn._sum.amount || 0);
        const totalOut =
          (purchasesOut._sum.paidNow || 0) +
          (paymentsOut._sum.amount || 0) +
          (expensesOut._sum.amount || 0);
        const liveBalance = acc.openingBalance + totalIn - totalOut;

        return {
          id: acc.id,
          name: acc.name,
          type: acc.type,
          accountNumber: acc.accountNumber,
          isDefault: acc.isDefault,
          liveBalance,
        };
      })
    );

    res.json({
      date: targetDate.toISOString().split('T')[0],
      cards: {
        boughtToday,
        soldToday,
        paidToday,
        receivedToday,
        totalPayable,
        totalReceivable,
        todayProfit,
      },
      breakdown: {
        revenue: soldToday,
        cogs: costOfGoodsSold,
        wastageCost: wastageCostToday,
        expenses: totalExpensesToday,
      },
      accounts: accountsSummary,
    });
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard data' });
  }
});

export default router;
