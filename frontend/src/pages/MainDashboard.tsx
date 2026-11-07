import React from 'react';
import { useDeskMode } from '../context/DeskModeContext';
import { SaleList } from './sales/SaleList';
import { PurchaseList } from './purchases/PurchaseList';

export const MainDashboard: React.FC = () => {
  const { mode } = useDeskMode();
  return mode === 'buy' ? <PurchaseList /> : <SaleList />;
};
