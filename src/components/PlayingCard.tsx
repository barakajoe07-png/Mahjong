/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

interface PlayingCardProps {
  id?: string;
  card: string; // e.g., 'S3', 'HJ', 'D10', 'CA'
  selected?: boolean;
  onClick?: () => void;
  className?: string;
}

export const PlayingCard: React.FC<PlayingCardProps> = ({
  id,
  card,
  selected = false,
  onClick,
  className = '',
}) => {
  const suitSymbol = card[0];
  const rank = card.substring(1);

  // Parse suite
  let suitIcon = '♠';
  let isRed = false;
  let suitLabel = 'Spade';

  switch (suitSymbol) {
    case 'H':
      suitIcon = '♥';
      isRed = true;
      suitLabel = 'Heart';
      break;
    case 'D':
      suitIcon = '♦';
      isRed = true;
      suitLabel = 'Diamond';
      break;
    case 'C':
      suitIcon = '♣';
      isRed = false;
      suitLabel = 'Club';
      break;
    case 'S':
    default:
      suitIcon = '♠';
      isRed = false;
      suitLabel = 'Spade';
      break;
  }

  return (
    <div
      id={id}
      onClick={onClick}
      className={`
        relative w-18 h-26 rounded-xl cursor-pointer select-none transition-all duration-300 transform
        ${selected ? '-translate-y-4 shadow-[0_10px_20px_rgba(167,139,250,0.35)] border-2 border-brand-light-purple' : 'hover:-translate-y-1 shadow-md border border-white/10'}
        ${isRed ? 'bg-linear-to-b from-gray-900 via-stone-900 to-red-950/20 text-red-500' : 'bg-linear-to-b from-gray-900 via-slate-900 to-indigo-950/20 text-gray-200'}
        ${className}
      `}
    >
      {/* Corner Value */}
      <div className="absolute top-1.5 left-2 flex flex-col items-center leading-none">
        <span className="font-display font-bold text-base">{rank}</span>
        <span className="text-sm mt-0.5">{suitIcon}</span>
      </div>

      {/* Centered Large Vector Symbol */}
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-3xl font-display opacity-40 select-none">
        {suitIcon}
      </div>

      {/* Mini Bottom-Right Corner Value */}
      <div className="absolute bottom-1.5 right-2 flex flex-col items-center rotate-180 leading-none">
        <span className="font-display font-bold text-base">{rank}</span>
        <span className="text-sm mt-0.5">{suitIcon}</span>
      </div>

      {/* Fine golden trim border effect around card edge */}
      <div className="absolute inset-1 border border-white/5 rounded-lg pointer-events-none" />
    </div>
  );
};
