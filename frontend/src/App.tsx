import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './hooks/useAuth';
import { BossAuthProvider } from './context/BossAuthContext';
import { Layout } from './components/Layout';
import { PrivateRoute, RoleRoute } from './components/PrivateRoute';
import { BossRoute } from './components/BossRoute';

// Pages
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { VegetableList } from './pages/vegetables/VegetableList';
import { SellerList } from './pages/sellers/SellerList';
import { SellerDetail } from './pages/sellers/SellerDetail';
import { BuyerList } from './pages/buyers/BuyerList';
import { BuyerDetail } from './pages/buyers/BuyerDetail';
import { PurchaseList } from './pages/purchases/PurchaseList';
import { PurchaseForm } from './pages/purchases/PurchaseForm';
import { PurchaseDetail } from './pages/purchases/PurchaseDetail';
import { SaleList } from './pages/sales/SaleList';
import { SaleForm } from './pages/sales/SaleForm';
import { SaleDetail } from './pages/sales/SaleDetail';
import { PaymentList } from './pages/payments/PaymentList';
import { StockView } from './pages/stock/StockView';
import { WastageList } from './pages/wastage/WastageList';
import { ExpenseList } from './pages/expenses/ExpenseList';
import { ProfitReport } from './pages/reports/ProfitReport';
import { AuditLogView } from './pages/reports/AuditLogView';
import { ChangePassword } from './pages/settings/ChangePassword';
import { AccountList } from './pages/accounts/AccountList';

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <BossAuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />

            {/* Authenticated Routes wrapped in Layout */}
            <Route element={<PrivateRoute />}>
              <Route element={<Layout />}>
                {/* System 1: Sell Desk & Counter Operations (Accessible to Father & Brother) */}
                <Route path="/sales" element={<SaleList />} />
                <Route path="/sales/new" element={<SaleForm />} />
                <Route path="/sales/:id" element={<SaleDetail />} />
                <Route path="/sales/:id/edit" element={<SaleForm />} />
                <Route path="/buyers" element={<BuyerList />} />
                <Route path="/buyers/:id" element={<BuyerDetail />} />

                {/* System 2: Buy Desk & Mandi Operations (Accessible to Father & Brother) */}
                <Route path="/purchases" element={<PurchaseList />} />
                <Route path="/purchases/new" element={<PurchaseForm />} />
                <Route path="/purchases/:id" element={<PurchaseDetail />} />
                <Route path="/purchases/:id/edit" element={<PurchaseForm />} />
                <Route path="/sellers" element={<SellerList />} />
                <Route path="/sellers/:id" element={<SellerDetail />} />

                {/* General Settings */}
                <Route path="/settings/password" element={<ChangePassword />} />

                {/* System 3: Boss Desk & Financial Evaluations (Protected by PIN via BossRoute) */}
                <Route element={<BossRoute />}>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/boss" element={<Dashboard />} />
                  <Route path="/accounts" element={<AccountList />} />
                  <Route path="/stock" element={<StockView />} />
                  <Route path="/payments" element={<PaymentList />} />
                  <Route path="/vegetables" element={<VegetableList />} />
                  <Route path="/wastage" element={<WastageList />} />
                  <Route path="/expenses" element={<ExpenseList />} />
                  <Route path="/reports" element={<ProfitReport />} />
                  <Route path="/audit-log" element={<AuditLogView />} />
                </Route>
              </Route>
            </Route>

            <Route path="*" element={<Navigate to="/sales" replace />} />
          </Routes>
        </BrowserRouter>
      </BossAuthProvider>
    </AuthProvider>
  );
};
