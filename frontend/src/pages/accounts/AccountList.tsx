import React, { useState, useEffect } from 'react';
import { getAccounts, createAccount, transferAccount, getAccountPassbook } from '../../api/accounts';
import { Account, AccountTransaction } from '../../utils/types';
import { PageHeader } from '../../components/PageHeader';
import { CurrencyDisplay } from '../../components/CurrencyDisplay';
import { Modal } from '../../components/Modal';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { toInputDate, formatDate } from '../../utils/date';
import { rupeesToPaise, paiseToRupees } from '../../utils/currency';
import {
  Landmark,
  Wallet,
  QrCode,
  ArrowRightLeft,
  Plus,
  ArrowDownLeft,
  ArrowUpRight,
  History,
  FileText,
  Building,
  CheckCircle2
} from 'lucide-react';

export const AccountList: React.FC = () => {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);

  // New Account Modal
  const [newAccountModalOpen, setNewAccountModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [type, setType] = useState('BANK');
  const [accountNumber, setAccountNumber] = useState('');
  const [openingBalanceRupees, setOpeningBalanceRupees] = useState('0');
  const [savingAccount, setSavingAccount] = useState(false);

  // Transfer Modal
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [transferDate, setTransferDate] = useState(toInputDate(new Date()));
  const [fromAccountId, setFromAccountId] = useState<number | ''>('');
  const [toAccountId, setToAccountId] = useState<number | ''>('');
  const [transferAmountRupees, setTransferAmountRupees] = useState('');
  const [transferNotes, setTransferNotes] = useState('');
  const [savingTransfer, setSavingTransfer] = useState(false);

  // Passbook Modal
  const [passbookModalOpen, setPassbookModalOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const [passbookFilter, setPassbookFilter] = useState<'ALL' | 'IN' | 'OUT'>('ALL');
  const [passbookData, setPassbookData] = useState<{
    openingBalance: number;
    currentBalance: number;
    totalInflow?: number;
    totalOutflow?: number;
    transactions: AccountTransaction[];
  } | null>(null);
  const [loadingPassbook, setLoadingPassbook] = useState(false);

  const fetchAccounts = async () => {
    setLoading(true);
    try {
      const data = await getAccounts();
      setAccounts(data);
    } catch (err) {
      console.error('Failed to load accounts:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAccounts();
  }, []);

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSavingAccount(true);
    try {
      await createAccount({
        name: name.trim(),
        type,
        accountNumber: accountNumber.trim() || undefined,
        openingBalance: rupeesToPaise(openingBalanceRupees || 0),
      });
      setNewAccountModalOpen(false);
      setName('');
      setAccountNumber('');
      setOpeningBalanceRupees('0');
      fetchAccounts();
    } catch (err) {
      alert('Failed to create account');
    } finally {
      setSavingAccount(false);
    }
  };

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fromAccountId || !toAccountId || fromAccountId === toAccountId) {
      alert('Please select different source and destination accounts');
      return;
    }
    const paise = rupeesToPaise(transferAmountRupees);
    if (paise <= 0) {
      alert('Please enter a valid amount');
      return;
    }

    setSavingTransfer(true);
    try {
      await transferAccount({
        date: transferDate,
        fromAccountId: Number(fromAccountId),
        toAccountId: Number(toAccountId),
        amount: paise,
        notes: transferNotes.trim() || undefined,
      });
      setTransferModalOpen(false);
      setTransferAmountRupees('');
      setTransferNotes('');
      fetchAccounts();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Transfer failed');
    } finally {
      setSavingTransfer(false);
    }
  };

  const openPassbook = async (acc: Account) => {
    setSelectedAccount(acc);
    setPassbookModalOpen(true);
    setLoadingPassbook(true);
    setPassbookFilter('ALL');
    try {
      const res = await getAccountPassbook(acc.id);
      setPassbookData(res);
    } catch (err) {
      console.error('Failed to load passbook:', err);
    } finally {
      setLoadingPassbook(false);
    }
  };

  const totalLiquidCash = accounts.reduce((sum, a) => sum + (a.liveBalance || 0), 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Bank Accounts & Cash Drawer (बैंक खाते व गल्ला)"
        subtitle="Live passbook balances across Cash in Hand, SBI, and UPI collections"
        actions={
          <div className="flex gap-2">
            <button
              onClick={() => {
                if (accounts.length >= 2) {
                  setFromAccountId(accounts[0].id);
                  setToAccountId(accounts[1].id);
                }
                setTransferModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-3 py-2 bg-white border border-gray-200 text-gray-700 rounded-xl text-xs font-semibold hover:bg-gray-50 shadow-xs"
            >
              <ArrowRightLeft className="w-3.5 h-3.5 text-blue-600" />
              <span>Transfer (गल्ला $\rightarrow$ बैंक)</span>
            </button>
            <button
              onClick={() => setNewAccountModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Add Account</span>
            </button>
          </div>
        }
      />

      {/* Total Liquid Cash Banner */}
      <div className="bg-linear-to-r from-gray-900 via-slate-800 to-gray-900 rounded-3xl p-6 text-white shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider block">
            Total Available Liquid Balance (कुल रोकड़ / बैंक बैलेंस)
          </span>
          <div className="text-3xl sm:text-4xl font-extrabold mt-1 tracking-tight text-white">
            <CurrencyDisplay amount={totalLiquidCash} />
          </div>
          <p className="text-xs text-gray-400 mt-1">
            Real cash balance after factoring all mandi purchases, sales collections, and expenses.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs px-3 py-1.5 bg-white/10 rounded-xl font-bold backdrop-blur-xs text-emerald-400 border border-white/10">
            {accounts.length} Active Accounts
          </span>
        </div>
      </div>

      {/* Account Cards Grid */}
      {loading ? (
        <LoadingSpinner />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {accounts.map((acc) => {
            const isCash = acc.type === 'CASH';
            const isUPI = acc.type === 'UPI';
            const icon = isCash ? (
              <Wallet className="w-6 h-6 text-emerald-600" />
            ) : isUPI ? (
              <QrCode className="w-6 h-6 text-teal-600" />
            ) : (
              <Landmark className="w-6 h-6 text-blue-600" />
            );

            return (
              <div
                key={acc.id}
                onClick={() => openPassbook(acc)}
                className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs hover:border-emerald-300 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center shadow-xs">
                        {icon}
                      </div>
                      <div>
                        <h4 className="font-bold text-gray-900 text-sm leading-tight flex items-center gap-1.5">
                          <span>{acc.name}</span>
                          {acc.isDefault && (
                            <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded-sm bg-emerald-100 text-emerald-800">
                              Default
                            </span>
                          )}
                        </h4>
                        <span className="text-xs text-gray-400 block mt-0.5">
                          {acc.accountNumber ? `A/c: ${acc.accountNumber}` : acc.type}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 border-t border-gray-50 pt-3">
                    <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider block">
                      Live Balance
                    </span>
                    <div className="text-2xl font-extrabold text-gray-900 mt-0.5">
                      <CurrencyDisplay amount={acc.liveBalance} colorize />
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-gray-50 flex items-center justify-between text-xs text-emerald-700 font-semibold">
                  <span className="flex items-center gap-1">
                    <History className="w-3.5 h-3.5" />
                    <span>View Passbook</span>
                  </span>
                  <span className="text-gray-400 font-normal">Tap to inspect $\rightarrow$</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Account Modal */}
      <Modal
        isOpen={newAccountModalOpen}
        onClose={() => setNewAccountModalOpen(false)}
        title="Add Bank / Cash Account (नया खाता जोड़ें)"
      >
        <form onSubmit={handleCreateAccount} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
              Account Name *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. SBI Current Account, Galla Box 2"
              className="w-full px-3.5 py-2 border border-gray-200 rounded-xl text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                Account Type
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm"
              >
                <option value="BANK">Bank Account</option>
                <option value="CASH">Cash Drawer (गल्ला)</option>
                <option value="UPI">UPI / Digital Wallet</option>
                <option value="OTHER">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                Account Number (Optional)
              </label>
              <input
                type="text"
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
                placeholder="e.g. XXXX4821"
                className="w-full px-3.5 py-2 border border-gray-200 rounded-xl text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
              Starting / Opening Balance (₹)
            </label>
            <input
              type="number"
              step="any"
              value={openingBalanceRupees}
              onChange={(e) => setOpeningBalanceRupees(e.target.value)}
              placeholder="0"
              className="w-full px-3.5 py-2 border border-gray-200 rounded-xl text-sm font-bold text-gray-900"
            />
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={() => setNewAccountModalOpen(false)}
              className="px-4 py-2 border border-gray-200 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={savingAccount}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold shadow-xs disabled:opacity-50"
            >
              {savingAccount ? 'Adding...' : 'Add Account'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Internal Transfer Modal (e.g. Cash in Hand to Bank) */}
      <Modal
        isOpen={transferModalOpen}
        onClose={() => setTransferModalOpen(false)}
        title="Internal Account Transfer (खाता स्थानांतरण)"
      >
        <form onSubmit={handleTransfer} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
              Date *
            </label>
            <input
              type="date"
              required
              value={transferDate}
              onChange={(e) => setTransferDate(e.target.value)}
              className="w-full px-3.5 py-2 border border-gray-200 rounded-xl text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                From Account (निकाला) *
              </label>
              <select
                required
                value={fromAccountId}
                onChange={(e) => setFromAccountId(Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm font-bold text-gray-900"
              >
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                To Account (जमा किया) *
              </label>
              <select
                required
                value={toAccountId}
                onChange={(e) => setToAccountId(Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm font-bold text-gray-900"
              >
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
              Transfer Amount (रुपये ₹) *
            </label>
            <input
              type="number"
              step="any"
              inputMode="decimal"
              required
              placeholder="0"
              value={transferAmountRupees}
              onChange={(e) => setTransferAmountRupees(e.target.value)}
              className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-base font-extrabold text-gray-900"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
              Notes
            </label>
            <input
              type="text"
              placeholder="e.g. Deposited cash into SBI branch"
              value={transferNotes}
              onChange={(e) => setTransferNotes(e.target.value)}
              className="w-full px-3.5 py-2 border border-gray-200 rounded-xl text-sm"
            />
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={() => setTransferModalOpen(false)}
              className="px-4 py-2 border border-gray-200 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={savingTransfer}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold shadow-xs disabled:opacity-50"
            >
              {savingTransfer ? 'Transferring...' : 'Transfer Funds'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Passbook / Statement Modal */}
      <Modal
        isOpen={passbookModalOpen}
        onClose={() => setPassbookModalOpen(false)}
        title={selectedAccount ? `${selectedAccount.name} Passbook (खाता विवरणी)` : 'Passbook'}
        maxWidth="lg"
      >
        {loadingPassbook ? (
          <LoadingSpinner />
        ) : passbookData ? (
          <div className="space-y-4">
            <div className="p-4 bg-linear-to-r from-gray-900 to-slate-800 text-white rounded-2xl flex items-center justify-between shadow-xs">
              <div>
                <span className="text-xs text-gray-400 block uppercase tracking-wider">Current Live Balance:</span>
                <div className="text-2xl font-extrabold text-white mt-0.5">
                  <CurrencyDisplay amount={passbookData.currentBalance} />
                </div>
                <span className="text-[11px] text-gray-400 block mt-0.5">
                  Opening: ₹{Math.round(passbookData.openingBalance / 100).toLocaleString('en-IN')}
                </span>
              </div>
              <div className="text-right space-y-1">
                <div className="text-xs">
                  <span className="text-emerald-400 font-bold">Total In (+ IN): </span>
                  <span className="font-extrabold text-white">
                    ₹{Math.round((passbookData.totalInflow || 0) / 100).toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="text-xs">
                  <span className="text-rose-400 font-bold">Total Out (- OUT): </span>
                  <span className="font-extrabold text-white">
                    ₹{Math.round((passbookData.totalOutflow || 0) / 100).toLocaleString('en-IN')}
                  </span>
                </div>
              </div>
            </div>

            {/* Filter Tabs */}
            <div className="flex gap-1.5 p-1 bg-gray-100 rounded-xl text-xs font-bold">
              <button
                onClick={() => setPassbookFilter('ALL')}
                className={`flex-1 py-1.5 rounded-lg transition-all ${
                  passbookFilter === 'ALL' ? 'bg-white text-gray-900 shadow-2xs' : 'text-gray-500'
                }`}
              >
                सभी ({passbookData.transactions.length})
              </button>
              <button
                onClick={() => setPassbookFilter('IN')}
                className={`flex-1 py-1.5 rounded-lg transition-all ${
                  passbookFilter === 'IN' ? 'bg-white text-emerald-700 shadow-2xs' : 'text-gray-500'
                }`}
              >
                आवक / जमा (+ IN)
              </button>
              <button
                onClick={() => setPassbookFilter('OUT')}
                className={`flex-1 py-1.5 rounded-lg transition-all ${
                  passbookFilter === 'OUT' ? 'bg-white text-rose-700 shadow-2xs' : 'text-gray-500'
                }`}
              >
                निकासी / भुगतान (- OUT)
              </button>
            </div>

            <div className="border border-gray-100 rounded-xl overflow-hidden max-h-96 overflow-y-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-50 text-gray-500 uppercase font-semibold sticky top-0">
                  <tr>
                    <th className="px-3 py-2.5">Date</th>
                    <th className="px-3 py-2.5">Transaction</th>
                    <th className="px-3 py-2.5 text-right">In / Out</th>
                    <th className="px-3 py-2.5 text-right">Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {passbookData.transactions.filter((tx) =>
                    passbookFilter === 'ALL' ? true : tx.type === passbookFilter
                  ).length === 0 ? (
                    <tr>
                      <td colSpan={4} className="p-6 text-center text-gray-400">
                        No transactions recorded for this filter.
                      </td>
                    </tr>
                  ) : (
                    passbookData.transactions
                      .filter((tx) => (passbookFilter === 'ALL' ? true : tx.type === passbookFilter))
                      .map((tx: any, idx: number) => (
                        <tr key={idx} className="hover:bg-gray-50/50">
                          <td className="px-3 py-2.5 whitespace-nowrap text-gray-500">
                            {formatDate(tx.date, 'dd MMM yyyy')}
                          </td>
                          <td className="px-3 py-2.5 font-medium text-gray-900">
                            <div>{tx.description}</div>
                            {tx.category && (
                              <span className="text-[10px] text-gray-400">{tx.category}</span>
                            )}
                          </td>
                          <td
                            className={`px-3 py-2.5 text-right font-bold whitespace-nowrap ${
                              tx.type === 'IN' ? 'text-emerald-700' : 'text-rose-700'
                            }`}
                          >
                            {tx.type === 'IN' ? '+' : '-'}
                            <CurrencyDisplay amount={tx.amount} />
                          </td>
                          <td className="px-3 py-2.5 text-right font-bold text-gray-900 whitespace-nowrap">
                            <CurrencyDisplay amount={tx.balance} />
                          </td>
                        </tr>
                      ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
};
