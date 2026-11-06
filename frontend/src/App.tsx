import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './hooks/useAuth';
import { BossAuthProvider } from './context/BossAuthContext';
import { SimulatorProvider } from './context/SimulatorContext';
import { MacSimulator } from './components/MacSimulator';
import { Layout } from './components/Layout';
import { PrivateRoute } from './components/PrivateRoute';
import { BossRoute } from './components/BossRoute';

// Pages matching User's Custom Design System
import { Login } from './pages/Login';
import { Home } from './pages/Home';
import { SaleList } from './pages/sales/SaleList';
import { SaleForm } from './pages/sales/SaleForm';
import { BuyerList } from './pages/buyers/BuyerList';
import { BuyerDetail } from './pages/buyers/BuyerDetail';
import { PurchaseList } from './pages/purchases/PurchaseList';
import { PurchaseForm } from './pages/purchases/PurchaseForm';
import { SellerList } from './pages/sellers/SellerList';
import { SellerDetail } from './pages/sellers/SellerDetail';
import { VegetableList } from './pages/vegetables/VegetableList';
import { Dashboard } from './pages/Dashboard';
import { BackupAccount } from './pages/settings/BackupAccount';
import { ChangePassword } from './pages/settings/ChangePassword';

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <BossAuthProvider>
        <SimulatorProvider>
          <BrowserRouter>
            <MacSimulator>
              <Routes>
                <Route path="/login" element={<Login />} />

                {/* Authenticated Routes wrapped in Layout */}
                <Route element={<PrivateRoute />}>
                  <Route element={<Layout />}>
                    {/* Main Home Screen (Hussain Foods overview) */}
                    <Route path="/" element={<Home />} />

                    {/* Sell Desk */}
                    <Route path="/sales" element={<SaleList />} />
                    <Route path="/sales/new" element={<SaleForm />} />
                    <Route path="/sales/:id" element={<SaleForm />} />
                    <Route path="/sales/:id/edit" element={<SaleForm />} />
                    <Route path="/buyers" element={<BuyerList />} />
                    <Route path="/buyers/:id" element={<BuyerDetail />} />

                    {/* Buy Desk */}
                    <Route path="/purchases" element={<PurchaseList />} />
                    <Route path="/purchases/new" element={<PurchaseForm />} />
                    <Route path="/purchases/:id" element={<PurchaseForm />} />
                    <Route path="/purchases/:id/edit" element={<PurchaseForm />} />
                    <Route path="/sellers" element={<SellerList />} />
                    <Route path="/sellers/:id" element={<SellerDetail />} />

                    {/* Vegetables & Crate Weights */}
                    <Route path="/vegetables" element={<VegetableList />} />

                    {/* Boss Desk (PIN Protected) */}
                    <Route element={<BossRoute />}>
                      <Route path="/boss" element={<Dashboard />} />
                    </Route>

                    {/* Backup & Settings */}
                    <Route path="/settings/backup" element={<BackupAccount />} />
                    <Route path="/settings/password" element={<ChangePassword />} />
                  </Route>
                </Route>

                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </MacSimulator>
          </BrowserRouter>
        </SimulatorProvider>
      </BossAuthProvider>
    </AuthProvider>
  );
};
