/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

interface GlassCardProps {
  id?: string;
  variant?: 'default' | 'highlight' | 'danger';
  padding?: string;
  className?: string;
  children: React.ReactNode;
}

export const GlassCard: React.FC<GlassCardProps> = ({
  id,
  variant = 'default',
  padding = 'p-6',
  className = '',
  children,
}) => {
  let cardStyle = 'glass-card';
  if (variant === 'highlight') {
    cardStyle = 'glass-card-highlight';
  } else if (variant === 'danger') {
    cardStyle = 'glass-card-danger';
  }

  return (
    <div
      id={id}
      className={`rounded-3xl relative overflow-hidden transition-all duration-300 ${padding} ${cardStyle} ${className}`}
    >
      {/* Subtle vector grid design lines in the glass card background */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(167,139,250,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(167,139,250,0.03)_1px,transparent_1px)] bg-[size:20px_20px] pointer-events-none" />
      
      {/* Interactive internal contents */}
      <div className="relative z-10">{children}</div>
    </div>
  );
};
