import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import Header from '@/components/layout/Header';

vi.mock('next/navigation', () => ({
  usePathname: vi.fn(() => '/'),
}));

describe('Header Component', () => {
  it('renders brand logo linking to home', () => {
    render(<Header />);
    const logoLink = screen.getByRole('link', { name: /greg duck/i });
    expect(logoLink).toBeInTheDocument();
    expect(logoLink).toHaveAttribute('href', '/');
  });

  it('renders navigation links to Map and Journal', () => {
    render(<Header />);
    const mapLink = screen.getByRole('link', { name: /^map$/i });
    const journalLink = screen.getByRole('link', { name: /^journal$/i });

    expect(mapLink).toBeInTheDocument();
    expect(mapLink).toHaveAttribute('href', '/');
    expect(journalLink).toBeInTheDocument();
    expect(journalLink).toHaveAttribute('href', '/journal');
  });

  it('renders Clerk authentication components', () => {
    render(<Header />);
    expect(screen.getByTestId('clerk-signed-in')).toBeInTheDocument();
    expect(screen.getByTestId('clerk-signed-out')).toBeInTheDocument();
    expect(screen.getByTestId('clerk-user-button')).toBeInTheDocument();
    expect(screen.getByTestId('clerk-sign-in-button')).toBeInTheDocument();
  });
});
