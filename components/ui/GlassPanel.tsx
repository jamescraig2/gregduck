import React from 'react';

export interface GlassPanelProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode;
  className?: string;
}

export const GlassPanel: React.FC<GlassPanelProps> = ({ children, className = '', ...props }) => (
  <div className={`glass-panel ${className}`.trim()} {...props}>
    {children}
  </div>
);
