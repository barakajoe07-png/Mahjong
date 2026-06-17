/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Wifi, Battery, Network, Settings, RefreshCw } from 'lucide-react';
import { isDemoMode, getApiBaseUrl } from '../services/runtime-config';

interface StatusBarProps {
  id?: string;
  onOpenSettings: () => void;
}

export const StatusBar: React.FC<StatusBarProps> = ({ id, onOpenSettings }) => {
  const [time, setTime] = useState('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      let hours = now.getHours();
      const minutes = now.getMinutes().toString().padStart(2, '0');
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12;
      hours = hours ? hours : 12; // 12-hour format
      setTime(`${hours}:${minutes} ${ampm}`);
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  const demoActive = isDemoMode();

  return (
    <div
      id={id}
      className="bg-game-bg-start/60 border-b border-white/5 px-6 py-2 flex items-center justify-between text-xs text-brand-light-purple/70 tracking-wider font-display relative z-50 select-none backdrop-blur-md"
    >
      <div className="flex items-center gap-2">
        <span className="font-bold text-gray-200">{time}</span>
        <span className="text-[10px] bg-indigo-950/80 border border-brand-purple/30 px-1.5 py-0.5 rounded text-brand-light-purple flex items-center gap-1">
          <span className={`w-1.5 h-1.5 rounded-full ${demoActive ? 'bg-amber-400' : 'bg-emerald-400'}`} />
          {demoActive ? '离线模拟' : '联机大厅'}
        </span>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1 opacity-80">
          <Network size={12} />
          <span>5G</span>
        </div>
        <Wifi size={13} className="opacity-80" />
        <div className="flex items-center gap-1 opacity-80">
          <Battery size={14} />
          <span>98%</span>
        </div>
        <button
          onClick={onOpenSettings}
          className="hover:text-brand-gold p-1 cursor-pointer transition-colors"
          title="Server Connection Settings"
        >
          <Settings size={14} />
        </button>
      </div>
    </div>
  );
};
