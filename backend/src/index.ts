import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config } from './config.js';
import { errorHandler } from './middleware/errorHandler.js';

import authRoutes from './routes/auth.js';
import vegetableRoutes from './routes/vegetables.js';
import sellerRoutes from './routes/sellers.js';
import buyerRoutes from './routes/buyers.js';
import purchaseRoutes from './routes/purchases.js';
import saleRoutes from './routes/sales.js';
import paymentRoutes from './routes/payments.js';
import wastageRoutes from './routes/wastage.js';
import expenseRoutes from './routes/expenses.js';
import stockRoutes from './routes/stock.js';
import dashboardRoutes from './routes/dashboard.js';
import reportsRoutes from './routes/reports.js';
import auditLogRoutes from './routes/auditLog.js';
import accountRoutes from './routes/accounts.js';
import settingsRoutes from './routes/settings.js';

const app = express();

// Security and middleware
app.use(helmet());
app.use(cors({
  origin: [config.corsOrigin, 'http://localhost:5173', 'http://127.0.0.1:5173'],
  credentials: true,
}));
app.use(express.json());

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/vegetables', vegetableRoutes);
app.use('/api/sellers', sellerRoutes);
app.use('/api/buyers', buyerRoutes);
app.use('/api/purchases', purchaseRoutes);
app.use('/api/sales', saleRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/wastage', wastageRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/stock', stockRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/audit-log', auditLogRoutes);
app.use('/api/accounts', accountRoutes);
app.use('/api/settings', settingsRoutes);

// Error handling
app.use(errorHandler);

const server = app.listen(config.port, () => {
  console.log(`🥦 Sabzi Khata backend listening on http://localhost:${config.port}`);
});

export default app;
