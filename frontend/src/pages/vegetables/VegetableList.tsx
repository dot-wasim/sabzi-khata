import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getVegetables, createVegetable, updateVegetable, deleteVegetable } from '../../api/vegetables';
import { Vegetable } from '../../utils/types';
import { formatDate } from '../../utils/date';
import { VegetableModal } from './VegetableModal';

export const VegetableList: React.FC = () => {
  const navigate = useNavigate();

  const [vegetables, setVegetables] = useState<Vegetable[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingVeg, setEditingVeg] = useState<Vegetable | null>(null);
  const [settingCrates, setSettingCrates] = useState(false);

  const fetchList = async () => {
    setLoading(true);
    try {
      const data = await getVegetables(undefined, false);
      setVegetables(data);
    } catch (err) {
      console.error('Failed to load vegetables:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchList();
  }, []);

  const handleRemove = async (veg: Vegetable) => {
    if (!window.confirm(`क्या आप ${veg.nameEn} (${veg.nameHi || ''}) को हटाना चाहते हैं? (यह पुराने बिलों पर सुरक्षित रहेगा)`)) {
      return;
    }
    try {
      await deleteVegetable(veg.id);
      fetchList();
    } catch (err) {
      alert('हटाने में त्रुटि');
    }
  };

  const handleUpdateCrateWeight = async (vegId: number, weight: number) => {
    try {
      await updateVegetable(vegId, { crateWeightKg: weight });
      fetchList();
    } catch (err) {
      console.error('Failed to update crate weight:', err);
    }
  };

  const todayStr = formatDate(new Date().toISOString(), 'd MMM');

  if (loading) {
    return (
      <div className="s flex items-center justify-center min-h-[60vh]">
        <span className="m font-semibold">लोड हो रहा है...</span>
      </div>
    );
  }

  return (
    <div className="s">
      {/* Top Header */}
      <h1 className="h">Sell Desk · Vegetables</h1>
      <span className="m">Own list for Sell Desk. Buy Desk keeps a separate list.</span>

      {/* Tabs */}
      <div className="t">
        <button type="button" onClick={() => navigate('/')}>Home</button>
        <button type="button" onClick={() => navigate('/sales/new')}>Bill</button>
        <button type="button" onClick={() => navigate('/buyers')}>Accounts</button>
        <button type="button" className="on">Vegetables</button>
        <button type="button" onClick={() => navigate('/sales')}>Dashboard</button>
      </div>

      {/* Crate Weights Card */}
      <div className="c">
        <b>Crate weights today, {todayStr}</b>

        {vegetables.length === 0 ? (
          <span className="m">No vegetables in list</span>
        ) : (
          vegetables.map((veg) => (
            <div key={veg.id} className="r border-b border-[#DDE3D6] pb-2 last:border-0 last:pb-0">
              <div>
                <b>{veg.nameEn}</b> <span className="m">{veg.nameHi}</span>
                <div className="m flex items-center gap-1 mt-0.5">
                  {settingCrates ? (
                    <div className="flex items-center gap-1">
                      <span>1 crate =</span>
                      <input
                        type="number"
                        defaultValue={veg.crateWeightKg || 25}
                        onBlur={(e) => handleUpdateCrateWeight(veg.id, parseFloat(e.target.value) || 25)}
                        className="w-14 border border-[#DDE3D6] rounded px-1.5 py-0.5 text-xs bg-white font-bold"
                      />
                      <span>kg</span>
                    </div>
                  ) : veg.crateWeightKg ? (
                    `1 crate = ${veg.crateWeightKg} kg`
                  ) : (
                    'Crate weight not set today'
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleRemove(veg)}
                className="b b2 text-xs"
                style={{ minHeight: '32px', padding: '0 12px' }}
              >
                Remove
              </button>
            </div>
          ))
        )}
      </div>

      <span className="m">
        Crate weight changes by day, so set it each morning. A removed vegetable stays on old bills.
      </span>

      {/* Action Buttons */}
      <button
        type="button"
        onClick={() => {
          setEditingVeg(null);
          setModalOpen(true);
        }}
        className="b"
      >
        + Add vegetable
      </button>

      <button
        type="button"
        onClick={() => setSettingCrates(!settingCrates)}
        className="b b2"
      >
        {settingCrates ? '✓ Save crate weights' : 'Set today’s crate weights'}
      </button>

      {/* Modal */}
      {modalOpen && (
        <VegetableModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          onSuccess={async () => {
            await fetchList();
            setModalOpen(false);
          }}
        />
      )}
    </div>
  );
};
