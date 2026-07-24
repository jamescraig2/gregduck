import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import Home from '../app/page';

vi.mock('../components/map/useGeolocation', () => ({
  useGeolocation: vi.fn(() => ({
    center: { lat: 44.9778, lng: -93.265 },
    loading: false,
  })),
}));

vi.mock('@vis.gl/react-google-maps', () => ({
  APIProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useMap: vi.fn(() => null),
  Map: ({ children }: { children: React.ReactNode }) => <div data-testid="map">{children}</div>,
}));

describe('Home Page', () => {
  it('renders MapDashboard on home page', () => {
    render(<Home />);
    expect(screen.getByTestId('map-dashboard')).toBeInTheDocument();
    expect(screen.getByTestId('map')).toBeInTheDocument();
  });
});
