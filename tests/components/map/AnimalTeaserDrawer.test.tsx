import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { AnimalTeaserDrawer } from '../../../components/map/AnimalTeaserDrawer';
import { MarkerData } from '../../../types';

const mockAnimal: MarkerData = {
  id: 'anim_123',
  name: 'Greg',
  species: 'Mallard Duck',
  lat: 44.9778,
  lng: -93.265,
  h3Index: '8928308280fffff',
  lastEncounteredAt: '2 hours ago',
  imageUrl: 'https://example.com/greg.jpg',
};

const mockUserPos = {
  lat: 44.97,
  lng: -93.26,
};

describe('AnimalTeaserDrawer', () => {
  it('renders null when animal is null', () => {
    const { container } = render(<AnimalTeaserDrawer animal={null} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders animal details when animal prop is provided', () => {
    render(<AnimalTeaserDrawer animal={mockAnimal} />);
    expect(screen.getByText('Greg')).toBeInTheDocument();
    expect(screen.getByText('Mallard Duck')).toBeInTheDocument();
    expect(screen.getByText(/Spotted: 2 hours ago/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /View Details/i })).toHaveAttribute(
      'href',
      '/animals/anim_123',
    );
  });

  it('calculates and displays formatted distance when userPosition is provided', () => {
    render(<AnimalTeaserDrawer animal={mockAnimal} userPosition={mockUserPos} />);
    const distanceEl = screen.getByTestId('distance-text');
    expect(distanceEl).toBeInTheDocument();
    expect(distanceEl.textContent).toMatch(/away$/);
  });

  it('hides distance when userPosition is null', () => {
    render(<AnimalTeaserDrawer animal={mockAnimal} userPosition={null} />);
    expect(screen.queryByTestId('distance-text')).toBeNull();
  });

  it('invokes onClose when backdrop overlay is clicked', () => {
    const onClose = vi.fn();
    render(<AnimalTeaserDrawer animal={mockAnimal} onClose={onClose} />);
    const backdrop = screen.getByTestId('teaser-backdrop');
    fireEvent.click(backdrop);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('invokes onClose when close button is clicked', () => {
    const onClose = vi.fn();
    render(<AnimalTeaserDrawer animal={mockAnimal} onClose={onClose} />);
    const closeBtn = screen.getByRole('button', { name: /Close/i });
    fireEvent.click(closeBtn);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('invokes onClose on touch swipe down gesture exceeding 60px', () => {
    const onClose = vi.fn();
    render(<AnimalTeaserDrawer animal={mockAnimal} onClose={onClose} />);
    const drawer = screen.getByTestId('teaser-drawer');

    fireEvent.touchStart(drawer, {
      touches: [{ clientY: 100 }],
    });
    fireEvent.touchEnd(drawer, {
      changedTouches: [{ clientY: 170 }],
    });

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does not invoke onClose on minor touch swipe (< 60px)', () => {
    const onClose = vi.fn();
    render(<AnimalTeaserDrawer animal={mockAnimal} onClose={onClose} />);
    const drawer = screen.getByTestId('teaser-drawer');

    fireEvent.touchStart(drawer, {
      touches: [{ clientY: 100 }],
    });
    fireEvent.touchEnd(drawer, {
      changedTouches: [{ clientY: 130 }],
    });

    expect(onClose).not.toHaveBeenCalled();
  });
});
