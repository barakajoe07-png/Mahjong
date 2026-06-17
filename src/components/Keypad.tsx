/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Delete, X } from 'lucide-react';
import { PillButton } from './PillButton';

interface KeypadProps {
  id?: string;
  onKeyPress: (char: string) => void;
  onDelete: () => void;
  onClear: () => void;
  onCancel: () => void;
}

export const Keypad: React.FC<KeypadProps> = ({
  id,
  onKeyPress,
  onDelete,
  onClear,
  onCancel,
}) => {
  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'Clear', '0', 'backspace'];

  return (
    <div id={id} className="grid grid-cols-3 gap-3 max-w-sm mx-auto user-select-none mt-4">
      {keys.map((key) => {
        if (key === 'Clear') {
          return (
            <button
              key={key}
              onClick={onClear}
              className="glass-card active:scale-95 text-brand-light-purple font-display text-sm flex items-center justify-center p-4 rounded-2xl border border-white/5 cursor-pointer transition-transform"
            >
              Clear
            </button>
          );
        }
        if (key === 'backspace') {
          return (
            <button
              key={key}
              onClick={onDelete}
              className="glass-card active:scale-95 text-brand-light-purple flex items-center justify-center p-4 rounded-2xl border border-white/5 cursor-pointer transition-transform"
            >
              <Delete size={18} />
            </button>
          );
        }
        return (
          <button
            key={key}
            onClick={() => onKeyPress(key)}
            className="glass-card active:scale-95 text-white font-display text-xl font-bold flex items-center justify-center p-4 rounded-2xl border border-white/5 hover:border-brand-purple/40 hover:bg-brand-purple/10 cursor-pointer transition-all duration-150"
          >
            {key}
          </button>
        );
      })}
    </div>
  );
};
