import React, { createContext, useContext, useState, useEffect } from 'react';

export type DeskMode = 'sell' | 'buy';

interface DeskModeContextType {
  mode: DeskMode;
  setMode: (mode: DeskMode) => void;
  toggleMode: () => void;
}

const DeskModeContext = createContext<DeskModeContextType | undefined>(undefined);

export const DeskModeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [mode, setModeState] = useState<DeskMode>(() => {
    const saved = localStorage.getItem('sk_desk_mode');
    if (saved === 'buy' || saved === 'sell') return saved;
    return 'sell';
  });

  const setMode = (newMode: DeskMode) => {
    setModeState(newMode);
    localStorage.setItem('sk_desk_mode', newMode);
  };

  const toggleMode = () => {
    setMode(mode === 'sell' ? 'buy' : 'sell');
  };

  return (
    <DeskModeContext.Provider value={{ mode, setMode, toggleMode }}>
      {children}
    </DeskModeContext.Provider>
  );
};

export const useDeskMode = () => {
  const context = useContext(DeskModeContext);
  if (!context) {
    throw new Error('useDeskMode must be used within a DeskModeProvider');
  }
  return context;
};
