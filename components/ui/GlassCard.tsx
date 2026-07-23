import React from 'react';

export interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode;
  className?: string;
  hoverEffect?: boolean;
}

export const GlassCard: React.FC<GlassCardProps> = ({
  children,
  className = '',
  hoverEffect = true,
  ...props
}) => (
  <div className={`glass-card ${hoverEffect ? '' : 'no-hover'} ${className}`.trim()} {...props}>
    {children}
  </div>
);
