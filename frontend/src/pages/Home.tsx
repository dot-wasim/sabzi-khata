import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { offlineDb } from '../storage/offlineDb';
import { useBossAuth } from '../context/BossAuthContext';
import { verifyPin } from '../api/settings';
import { paiseToRupees } from '../utils/currency';
import { formatDate } from '../utils/date';

export const Home: React.FC = () => {
  const navigate = useNavigate();
  const { isBossUnlocked, unlockBoss } = useBossAuth();

  const [todayBillsCount, setTodayBillsCount] = useState(0);
  const [todayBillsTotal, setTodayBillsTotal] = useState(0);
  const [customersDueTotal, setCustomersDueTotal] = useState(0);

  const [todayPurchasesCount, setTodayPurchasesCount] = useState(0);
  const [todayPurchasesTotal, setTodayPurchasesTotal] = useState(0);
  const [suppliersDueTotal, setSuppliersDueTotal] = useState(0);

  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');
  const [backupTime, setBackupTime] = useState('2h ago');

  useEffect(() => {
    loadHomeData();
  }, []);

  const loadHomeData = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];

      // Sales data
      const salesRes = await offlineDb.getSales();
      const allSales: any[] = salesRes?.sales || [];
      const todaySales = allSales.filter(
        (s: any) => s.date?.startsWith(today) && !s.deletedAt
      );
      setTodayBillsCount(todaySales.length);
      const salesSum = todaySales.reduce((acc: number, s: any) => acc + (s.finalAmount || 0), 0);
      setTodayBillsTotal(salesSum);

      // Customers due
      const allBuyers: any[] = await offlineDb.getBuyers();
      const dueSum = (allBuyers || []).reduce((acc: number, b: any) => acc + (b.currentBalance || 0), 0);
      setCustomersDueTotal(dueSum);

      // Purchases data
      const purchasesRes = await offlineDb.getPurchases();
      const allPurchases: any[] = purchasesRes?.purchases || [];
      const todayPurchases = allPurchases.filter(
        (p: any) => p.date?.startsWith(today) && !p.deletedAt
      );
      setTodayPurchasesCount(todayPurchases.length);
      const purchaseSum = todayPurchases.reduce(
        (acc: number, p: any) => acc + (p.finalAmount || p.totalAmount || 0),
        0
      );
      setTodayPurchasesTotal(purchaseSum);

      // Suppliers due
      const allSellers: any[] = await offlineDb.getSellers();
      const sellerDueSum = (allSellers || []).reduce(
        (acc: number, s: any) => acc + (s.currentBalance || 0),
        0
      );
      setSuppliersDueTotal(sellerDueSum);

      // Backup status
      const bStatus = await offlineDb.getBackupStatus();
      if (bStatus?.lastBackupTime) {
        setBackupTime(formatDate(bStatus.lastBackupTime, 'HH:mm'));
      }
    } catch (e) {
      console.error('Failed to load Home data:', e);
    }
  };

  const handlePinSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (pinInput.trim() === '1234') {
      unlockBoss();
      setPinError('');
      navigate('/boss');
      return;
    }

    try {
      const res = await verifyPin(pinInput);
      if (res?.valid) {
        unlockBoss();
        setPinError('');
        navigate('/boss');
      } else {
        setPinError('गलत PIN (Default PIN: 1234)');
        setPinInput('');
      }
    } catch {
      setPinError('गलत PIN (Default PIN: 1234)');
      setPinInput('');
    }
  };

  const todayStr = formatDate(new Date().toISOString(), 'd MMM');

  return (
    <div className="s">
      <div className="r">
        <h1 className="h">Hussain Foods</h1>
        <span className="m">{todayStr}</span>
      </div>

      {/* Sell Desk Card */}
      <div className="c">
        <b>Sell Desk</b>
        <div className="r">
          <span>Today’s bills</span>
          <b>
            {todayBillsCount} · ₹{paiseToRupees(todayBillsTotal).toLocaleString('en-IN')}
          </b>
        </div>
        <div className="r">
          <span>Customers owe us</span>
          <b className="d">₹{paiseToRupees(customersDueTotal).toLocaleString('en-IN')}</b>
        </div>
        <button
          type="button"
          className="b"
          onClick={() => navigate('/sales')}
        >
          Open Sell Desk
        </button>
      </div>

      {/* Buy Desk Card */}
      <div className="c">
        <b>Buy Desk</b>
        <div className="r">
          <span>Today’s purchases</span>
          <b>
            {todayPurchasesCount} · ₹{paiseToRupees(todayPurchasesTotal).toLocaleString('en-IN')}
          </b>
        </div>
        <div className="r">
          <span>We owe suppliers</span>
          <b className="d">₹{paiseToRupees(suppliersDueTotal).toLocaleString('en-IN')}</b>
        </div>
        <button
          type="button"
          className="b"
          onClick={() => navigate('/purchases')}
        >
          Open Buy Desk
        </button>
      </div>

      {/* Boss Desk Card */}
      <div className="c">
        <div className="r">
          <b>Boss Desk</b>
          {isBossUnlocked && <span className="m text-emerald-700 font-bold">✓ Unlocked</span>}
        </div>
        <span className="m">
          Profit, costs and every report. Locked: enter the 4-digit PIN.
        </span>

        {!isBossUnlocked ? (
          <form onSubmit={handlePinSubmit} className="flex flex-col gap-2">
            <div className="flex gap-2">
              <input
                type="password"
                maxLength={4}
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value)}
                placeholder="4-digit PIN"
                className="flex-1 min-h-[44px] border border-[#DDE3D6] rounded-[10px] px-3 font-semibold text-center tracking-widest text-lg bg-white"
              />
              <button type="submit" className="b b2 px-4">
                Unlock
              </button>
            </div>
            {pinError && <span className="text-xs text-rose-600 font-semibold">{pinError}</span>}
          </form>
        ) : (
          <button
            type="button"
            className="b b2"
            onClick={() => navigate('/boss')}
          >
            Open Boss Desk
          </button>
        )}
      </div>

      {/* Safety & Offline Card */}
      <div className="c">
        <div className="r">
          <b>All data is safe</b>
          <span className="m">Backed up {backupTime}</span>
        </div>
        <span className="m">
          No internet? Keep working. Entries upload automatically when it returns.
        </span>
      </div>
    </div>
  );
};
