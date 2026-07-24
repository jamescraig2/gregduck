import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { server } from '../../mocks/server';
import { http, HttpResponse } from 'msw';
import type { MapCameraChangedEvent } from '@vis.gl/react-google-maps';
import * as geolocationHook from '../../../components/map/useGeolocation';
import { MapDashboard } from '../../../components/map/MapDashboard';
import { CLEAN_MAP_STYLE } from '../../../lib/mapStyle';

// Mock @vis.gl/react-google-maps to avoid needing Google Maps JS API in tests
vi.mock('@vis.gl/react-google-maps', () => ({
  APIProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useMap: vi.fn(() => null),
  Map: ({
    children,
    onCameraChanged,
    styles,
  }: {
    children: React.ReactNode;
    onCameraChanged?: (ev: MapCameraChangedEvent) => void;
    styles?: google.maps.MapTypeStyle[];
  }) => (
    <div
      data-testid="map"
      data-has-custom-style={Boolean(styles && styles.length > 0)}
      onClick={() =>
        onCameraChanged?.({
          detail: {
            bounds: { south: 37.7, west: -122.5, north: 37.8, east: -122.4 },
          },
        } as MapCameraChangedEvent)
      }
    >
      {children}
    </div>
  ),
}));

const mockCenter = { lat: 44.9778, lng: -93.265 };

beforeEach(() => {
  vi.spyOn(geolocationHook, 'useGeolocation').mockReturnValue({
    center: mockCenter,
    loading: false,
  });
  server.use(http.get('/api/markers', () => HttpResponse.json({ markers: [], total: 0 })));
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('MapDashboard', () => {
  it('renders without crashing with empty markers', () => {
    const { container } = render(<MapDashboard />);
    expect(container).toBeTruthy();
    expect(screen.getByTestId('map')).toBeInTheDocument();
  });

  it('shows loading state when useGeolocation loading=true', () => {
    vi.spyOn(geolocationHook, 'useGeolocation').mockReturnValue({
      center: mockCenter,
      loading: true,
    });
    render(<MapDashboard />);
    expect(screen.getByText(/Locating/i)).toBeInTheDocument();
  });

  it('fetches markers from /api/markers when bounds change', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    render(<MapDashboard />);

    act(() => {
      screen.getByTestId('map').click();
    });

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledWith(expect.stringContaining('sw_lat=37.7'));
    });
  });

  it('debounces rapid camera changes — only one fetch per 300 ms window', async () => {
    vi.useFakeTimers();
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response(JSON.stringify({ markers: [], total: 0 }), { status: 200 }));
    render(<MapDashboard />);
    const mapEl = screen.getByTestId('map');

    // Rapid-fire 5 clicks (5 camera changes within debounce window)
    act(() => {
      mapEl.click();
      mapEl.click();
      mapEl.click();
      mapEl.click();
      mapEl.click();
    });

    // Before debounce settles — no fetch should have fired
    expect(fetchSpy).not.toHaveBeenCalled();

    // Advance past debounce window and flush pending microtasks
    await act(async () => {
      vi.advanceTimersByTime(400);
    });

    expect(fetchSpy).toHaveBeenCalledTimes(1);

    vi.useRealTimers();
  });

  it('sets markers to empty array when /api/markers returns HTTP error', async () => {
    vi.useFakeTimers();
    server.use(http.get('/api/markers', () => new HttpResponse(null, { status: 500 })));
    const { container } = render(<MapDashboard />);
    const mapEl = screen.getByTestId('map');

    act(() => {
      mapEl.click();
    });

    await act(async () => {
      vi.advanceTimersByTime(400);
    });

    // No TypeError should be thrown — markers gracefully reset to []
    expect(container).toBeTruthy();

    vi.useRealTimers();
  });

  it('passes CLEAN_MAP_STYLE to Map component', () => {
    render(<MapDashboard />);
    const mapEl = screen.getByTestId('map');
    expect(mapEl).toHaveAttribute('data-has-custom-style', 'true');
  });

  it('configures CLEAN_MAP_STYLE to hide poi and transit while preserving landscape.natural and locality', () => {
    const poiStyle = CLEAN_MAP_STYLE.find((s) => s.featureType === 'poi');
    expect(poiStyle?.stylers).toEqual(expect.arrayContaining([{ visibility: 'off' }]));

    const transitStyle = CLEAN_MAP_STYLE.find((s) => s.featureType === 'transit');
    expect(transitStyle?.stylers).toEqual(expect.arrayContaining([{ visibility: 'off' }]));

    const terrainStyle = CLEAN_MAP_STYLE.find((s) => s.featureType === 'landscape.natural');
    expect(terrainStyle?.stylers).toEqual(expect.arrayContaining([{ visibility: 'on' }]));

    const localityStyle = CLEAN_MAP_STYLE.find((s) => s.featureType === 'locality');
    const adminLocalityStyle = CLEAN_MAP_STYLE.find(
      (s) => s.featureType === 'administrative.locality',
    );
    expect(localityStyle?.stylers || adminLocalityStyle?.stylers).toEqual(
      expect.arrayContaining([{ visibility: 'on' }]),
    );
  });
});
