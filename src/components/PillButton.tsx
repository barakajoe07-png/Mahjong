/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

interface PillButtonProps {
  id?: string;
  text?: string;
  variant?: 'primary' | 'secondary' | 'danger' | 'tile';
  loading?: boolean;
  disabled?: boolean;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  className?: string;
  children?: React.ReactNode;
}

export const PillButton: React.FC<PillButtonProps> = ({
  id,
  text,
  variant = 'secondary',
  loading = false,
  disabled = false,
  onClick,
  className = '',
  children,
}) => {
  let baseStyle = 'relative inline-flex items-center justify-center font-semibold rounded-full select-none cursor-pointer transition-all duration-300 transform active:scale-[0.98] outline-none tracking-wider text-sm';
  
  let variantStyle = '';

  switch (variant) {
    case 'primary':
      // Emerald green CTA gradient with luxury high brightness glow
      variantStyle = 'bg-linear-to-r from-brand-emerald to-emerald-600 text-white shadow-[0_4px_20px_rgba(16,185,129,0.35)] hover:shadow-[0_4px_30px_rgba(16,185,129,0.55)] border border-emerald-400/40 shimmer-bg py-3 px-8';
      break;
    case 'danger':
      // Rich red gradient
      variantStyle = 'bg-linear-to-r from-brand-danger to-rose-600 text-white shadow-[0_4px_20px_rgba(248,113,113,0.3)] hover:shadow-[0_4px_30px_rgba(248,113,113,0.45)] border border-rose-400/40 py-3 px-8';
      break;
    case 'tile':
      // Flat, highly defined glass tile button
      variantStyle = 'glass-card border border-brand-purple/40 text-brand-light-purple hover:bg-brand-purple/20 py-2.5 px-6 rounded-2xl';
      break;
    case 'secondary':
    default:
      // Transparent glass with elegant purple borderline glow
      variantStyle = 'glass-card border border-brand-purple/35 text-white hover:border-brand-light-purple hover:shadow-[0_0_15px_rgba(167,139,250,0.15)] py-3 px-8';
      break;
  }

  const isDisabled = disabled || loading;

  return (
    <button
      id={id}
      disabled={isDisabled}
      onClick={(e) => {
        if (!isDisabled && onClick) onClick(e);
      }}
      className={`${baseStyle} ${variantStyle} ${isDisabled ? 'opacity-50 cursor-not-allowed transform-none' : ''} ${className}`}
    >
      {loading ? (
        <span className="flex items-center gap-2">
          {/* Circular vector spinner */}
          <svg className="animate-spin h-4 w-4 text-current" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <span>Loading...</span>
        </span>
      ) : (
        <>
          {text ? <span>{text}</span> : children}
        </>
      )}
    </button>
  );
};
