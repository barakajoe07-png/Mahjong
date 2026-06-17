/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

interface MahjongTileProps {
  id?: string;
  tile: string; // e.g., '1W', '9B', '3T'
  selected?: boolean;
  onClick?: () => void;
  className?: string;
}

const CHINESE_NUMBER_MAP: { [key: string]: string } = {
  '1': '一', '2': '二', '3': '三', '4': '四', '5': '五', '6': '六', '7': '七', '8': '八', '9': '九'
};

export const MahjongTile: React.FC<MahjongTileProps> = ({
  id,
  tile,
  selected = false,
  onClick,
  className = '',
}) => {
  const value = tile[0];
  const suit = tile[1];

  let displayValue = value;
  let suitLabel = '万';
  let valueColor = 'text-red-500';
  let suitColor = 'text-red-500';
  let isSpecial = false;

  if (suit === 'W') {
    suitLabel = '万';
    displayValue = CHINESE_NUMBER_MAP[value] || value;
    valueColor = 'text-slate-100';
    suitColor = 'text-rose-500';
  } else if (suit === 'B') {
    suitLabel = '条';
    displayValue = CHINESE_NUMBER_MAP[value] || value;
    valueColor = 'text-emerald-500';
    suitColor = 'text-emerald-500';
  } else if (suit === 'T') {
    suitLabel = '筒';
    displayValue = value;
    isSpecial = true;
    valueColor = 'text-indigo-400';
    suitColor = 'text-brand-gold';
  }

  return (
    <div
      id={id}
      onClick={onClick}
      className={`
        relative w-11 h-16 rounded-lg cursor-pointer select-none transition-all duration-300 transform font-sans
        bg-linear-to-b from-stone-100 via-white to-stone-200 text-stone-900 border-2 border-slate-300
        shadow-[2px_3px_0px_#a1a1aa,0px_10px_15px_rgba(0,0,0,0.5)]
        ${selected ? '-translate-y-4 !border-brand-light-purple shadow-[0_0_15px_rgba(167,139,250,0.8)]' : 'hover:-translate-y-1 hover:border-white'}
        ${className}
      `}
    >
      {/* 3D Jade Green Backing Edge Effect */}
      <div className="absolute inset-x-0 bottom-0 h-1 bg-emerald-800 rounded-b-md pointer-events-none" />

      {/* Internal Carved Inlay Card */}
      <div className="absolute inset-1 bg-white border border-stone-200 rounded flex flex-col items-center justify-between py-1 leading-none">
        
        {suit === 'W' && (
          <>
            <span className={`text-[13px] font-semibold ${valueColor}`}>{displayValue}</span>
            <span className={`text-[15px] font-bold ${suitColor}`}>{suitLabel}</span>
          </>
        )}

        {suit === 'B' && (
          <div className="flex flex-col items-center justify-center h-full gap-0.5">
            <span className={`text-[16px] font-extrabold tracking-widest ${valueColor}`}>
              {displayValue}
            </span>
            <span className="text-[9px] text-emerald-600 font-bold opacity-80">‖‖</span>
          </div>
        )}

        {suit === 'T' && (
          <div className="flex flex-col items-center justify-center h-full">
            {/* Medallion SVG / Icon Representation */}
            <div className="w-6 h-6 rounded-full border border-orange-400/50 flex items-center justify-center bg-linear-to-br from-indigo-500 to-brand-gold shadow-xs">
              <span className="text-[12px] font-extrabold text-white">{displayValue}</span>
            </div>
          </div>
        )}
      </div>

      {/* Bone-like sheen gloss overlay */}
      <div className="absolute inset-0 bg-linear-to-tr from-transparent via-white/10 to-transparent rounded-lg pointer-events-none" />
    </div>
  );
};
