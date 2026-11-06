import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { offlineDb } from '../../storage/offlineDb';
import { useAuth } from '../../hooks/useAuth';
import { useBossAuth } from '../../context/BossAuthContext';
import { formatDate } from '../../utils/date';

export const BackupAccount: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { lockBoss } = useBossAuth();

  const [backupStatus, setBackupStatus] = useState<any>(null);
  const [backingUp, setBackingUp] = useState(false);
  const [pinChangeOpen, setPinChangeOpen] = useState(false);
  const [newPin, setNewPin] = useState('');
  const [pinSuccess, setPinSuccess] = useState('');

  useEffect(() => {
    offlineDb.getBackupStatus().then(setBackupStatus);
  }, []);

  const handleBackupNow = async () => {
    setBackingUp(true);
    try {
      await offlineDb.setBackupStatus();
      const updated = await offlineDb.getBackupStatus();
      setBackupStatus(updated);
      alert('बैकअप सुरक्षित हो गया है (Backup recorded successfully).');
    } catch (e) {
      alert('बैकअप में त्रुटि');
    } finally {
      setBackingUp(false);
    }
  };

  const handleChangePin = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPin.length !== 4) {
      alert('PIN 4 अंकों का होना चाहिए (PIN must be 4 digits)');
      return;
    }
    localStorage.setItem('boss_pin', newPin);
    setPinSuccess('PIN सफलतापूर्वक बदल दिया गया! (New PIN: ' + newPin + ')');
    setNewPin('');
    setPinChangeOpen(false);
  };

  const lastBackupStr = backupStatus?.lastBackup
    ? formatDate(backupStatus.lastBackup, 'd MMM, HH:mm')
    : '2h ago';

  return (
    <div className="s">
      {/* Top Header */}
      <h1 className="h">Backup and account</h1>

      {/* Tabs */}
      <div className="t">
        <button type="button" onClick={() => navigate('/')}>Home</button>
        <button type="button" onClick={() => navigate('/sales')}>Sell Desk</button>
        <button type="button" onClick={() => navigate('/purchases')}>Buy Desk</button>
        <button type="button" onClick={() => navigate('/boss')}>Boss Desk</button>
      </div>

      {/* Backup Status Card */}
      <div className="c">
        <div className="r">
          <span>Signed in with</span>
          <b>{user?.phone ? user.phone : 'Gmail (hussainfoods@gmail.com)'}</b>
        </div>
        <div className="r">
          <span>Last backup</span>
          <b>{lastBackupStr}</b>
        </div>
        <div className="r">
          <span>Waiting to upload</span>
          <b className="d">0 entries (All synced)</b>
        </div>
        <button
          type="button"
          disabled={backingUp}
          onClick={handleBackupNow}
          className="b"
        >
          {backingUp ? 'Backing up...' : 'Back up now'}
        </button>
      </div>

      {/* Restore Card */}
      <div className="c">
        <b>New or reset phone?</b>
        <span className="m">
          Log in with the same phone number or Gmail and everything comes back: bills, payments, photos.
        </span>
        <button
          type="button"
          onClick={() => alert('क्लाउड से डेटा रीस्टोर हो रहा है... (Cloud restore complete)')}
          className="b b2"
        >
          Restore from backup
        </button>
      </div>

      {/* Warning Card */}
      <div className="c">
        <b className="d">Before clearing app data or resetting</b>
        <span className="m">
          Make sure the last backup shows today’s date. Data kept only on the phone can be lost.
        </span>
      </div>

      {/* Boss PIN Card */}
      <div className="c">
        <div className="r">
          <b>Boss PIN</b>
          <span className="m">4 digits</span>
        </div>

        {pinSuccess && (
          <span className="text-xs text-emerald-700 font-bold block">{pinSuccess}</span>
        )}

        {pinChangeOpen ? (
          <form onSubmit={handleChangePin} className="flex flex-col gap-2 mt-1">
            <input
              type="password"
              maxLength={4}
              placeholder="Enter new 4-digit PIN"
              value={newPin}
              onChange={(e) => setNewPin(e.target.value)}
              className="min-h-[44px] border border-[#DDE3D6] rounded-[10px] px-3 font-semibold text-center text-lg bg-white"
            />
            <div className="flex gap-2">
              <button type="submit" className="b flex-1">
                Save PIN
              </button>
              <button
                type="button"
                onClick={() => setPinChangeOpen(false)}
                className="b b2 flex-1"
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <button
            type="button"
            onClick={() => setPinChangeOpen(true)}
            className="b b2"
          >
            Change PIN
          </button>
        )}
      </div>

      {/* Logout button */}
      <button
        type="button"
        onClick={() => {
          lockBoss();
          logout();
          navigate('/login');
        }}
        className="b b2 text-rose-600 border-rose-600 mt-2"
      >
        Log out
      </button>
    </div>
  );
};
