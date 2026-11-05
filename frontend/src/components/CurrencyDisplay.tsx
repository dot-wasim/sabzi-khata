import React from 'react';
import { formatPaise } from '../utils/currency';

interface CurrencyDisplayProps {
  amount: number | undefined | null;
  className?: string;
  colorize?: boolean;
}

export const CurrencyDisplay: React.FC<CurrencyDisplayProps> = ({ amount, className = '', colorize = false }) => {
  const val = amount || 0;
  let colorClass = '';
  if (colorize) {
    if (val > 0) colorClass = 'text-emerald-700 font-semibold';
    else if (val < 0) colorClass = 'text-rose-600 font-semibold';
    else colorClass = 'text-gray-500';
  }

  return (
    <span className={`currency inline-block ${colorClass} ${className}`}>
      {formatPaise(val)}
    </span>
  );
};
