import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import fs from 'fs';
import path from 'path';

import { GlassCard, GlassPanel, Skeleton } from '@/components';

describe('Design System Theme & UI Primitives', () => {
  describe('GlassCard Component', () => {
    it('renders children with default glass-card class and hover effect', () => {
      render(React.createElement(GlassCard, null, 'Card Content'));
      const card = screen.getByText('Card Content');
      expect(card).toBeInTheDocument();
      expect(card).toHaveClass('glass-card');
      expect(card).not.toHaveClass('no-hover');
    });

    it('applies no-hover class when hoverEffect is false', () => {
      render(React.createElement(GlassCard, { hoverEffect: false }, 'Static Card'));
      const card = screen.getByText('Static Card');
      expect(card).toHaveClass('glass-card');
      expect(card).toHaveClass('no-hover');
    });

    it('merges custom className props', () => {
      render(React.createElement(GlassCard, { className: 'custom-class' }, 'Custom Card'));
      const card = screen.getByText('Custom Card');
      expect(card).toHaveClass('glass-card');
      expect(card).toHaveClass('custom-class');
    });
  });

  describe('GlassPanel Component', () => {
    it('renders children with glass-panel class', () => {
      render(React.createElement(GlassPanel, null, 'Panel Content'));
      const panel = screen.getByText('Panel Content');
      expect(panel).toBeInTheDocument();
      expect(panel).toHaveClass('glass-panel');
    });

    it('merges custom className props', () => {
      render(React.createElement(GlassPanel, { className: 'extra-panel-class' }, 'Panel Extra'));
      const panel = screen.getByText('Panel Extra');
      expect(panel).toHaveClass('glass-panel');
      expect(panel).toHaveClass('extra-panel-class');
    });
  });

  describe('Skeleton Component', () => {
    it('renders skeleton-loader with role="status" and default aria-label', () => {
      render(React.createElement(Skeleton, null));
      const skeleton = screen.getByRole('status');
      expect(skeleton).toBeInTheDocument();
      expect(skeleton).toHaveClass('skeleton-loader');
      expect(skeleton).toHaveAttribute('aria-label', 'Loading...');
    });

    it('applies numeric and string custom dimensions correctly', () => {
      render(React.createElement(Skeleton, { width: 200, height: 40, borderRadius: 8 }));
      const skeleton = screen.getByRole('status');
      expect(skeleton.style.width).toBe('200px');
      expect(skeleton.style.height).toBe('40px');
      expect(skeleton.style.borderRadius).toBe('8px');
    });

    it('handles string dimensions correctly', () => {
      render(
        React.createElement(Skeleton, { width: '100%', height: '2rem', borderRadius: '0.5rem' }),
      );
      const skeleton = screen.getByRole('status');
      expect(skeleton.style.width).toBe('100%');
      expect(skeleton.style.height).toBe('2rem');
      expect(skeleton.style.borderRadius).toBe('0.5rem');
    });
  });

  describe('Barrel Export Resolution', () => {
    it('resolves UI primitives from @/components', () => {
      expect(GlassCard).toBeDefined();
      expect(GlassPanel).toBeDefined();
      expect(Skeleton).toBeDefined();
    });
  });

  describe('CSS Tokens & Theme Rules in app/globals.css', () => {
    const cssPath = path.resolve(process.cwd(), 'app/globals.css');
    const cssContent = fs.readFileSync(cssPath, 'utf-8');

    it('contains :root and [data-theme="dark"] CSS custom property tokens', () => {
      expect(cssContent).toContain(':root');
      expect(cssContent).toContain("[data-theme='dark']");
      expect(cssContent).toContain('--color-bg-base: #0b0f19;');
      expect(cssContent).toContain('--color-bg-surface: rgba(18, 24, 38, 0.75);');
      expect(cssContent).toContain('--color-bg-card: rgba(30, 41, 59, 0.55);');
      expect(cssContent).toContain('--color-primary: #3b82f6;');
      expect(cssContent).toContain('--color-primary-glow: rgba(59, 130, 246, 0.35);');
      expect(cssContent).toContain('--color-accent-emerald: #10b981;');
      expect(cssContent).toContain('--color-accent-amber: #f59e0b;');
      expect(cssContent).toContain('--color-text-main: #f3f4f6;');
      expect(cssContent).toContain('--color-text-muted: #9ca3af;');
      expect(cssContent).toContain('--color-text-subtle: #6b7280;');
      expect(cssContent).toContain('--color-loading-pulse: rgba(255, 255, 255, 0.08);');
      expect(cssContent).toContain('--glass-backdrop-blur: 12px;');
      expect(cssContent).toContain('--glass-border: 1px solid rgba(255, 255, 255, 0.12);');
      expect(cssContent).toContain(
        '--glass-border-highlight: 1px solid rgba(255, 255, 255, 0.25);',
      );
      expect(cssContent).toContain('--glass-box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.37);');
    });

    it('contains required utility classes and vendor prefixes', () => {
      expect(cssContent).toContain('.glass-panel');
      expect(cssContent).toContain('.glass-card');
      expect(cssContent).toContain('.skeleton-loader');
      expect(cssContent).toContain('.spinner');
      expect(cssContent).toContain('-webkit-backdrop-filter:');
      expect(cssContent).toContain('backdrop-filter:');
    });

    it('contains keyframe animations and reduced motion query', () => {
      expect(cssContent).toContain('@keyframes shimmer');
      expect(cssContent).toContain('@keyframes pulse');
      expect(cssContent).toContain('@keyframes spin');
      expect(cssContent).toContain('@media (prefers-reduced-motion: reduce)');
    });
  });
});
