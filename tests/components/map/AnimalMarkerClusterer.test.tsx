import React from 'react';
import { render } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AnimalMarkerClusterer } from '../../../components/map/AnimalMarkerClusterer';
import { MarkerData } from '../../../types';
import * as reactGoogleMaps from '@vis.gl/react-google-maps';

const mockAddMarkers = vi.fn();
const mockRemoveMarker = vi.fn();
const mockClearMarkers = vi.fn();

vi.mock('@vis.gl/react-google-maps', () => ({
  useMap: vi.fn(),
}));

vi.mock('@googlemaps/markerclusterer', () => {
  return {
    MarkerClusterer: vi.fn().mockImplementation(function (this: Record<string, unknown>) {
      this.addMarkers = mockAddMarkers;
      this.removeMarker = mockRemoveMarker;
      this.clearMarkers = mockClearMarkers;
      return this;
    }),
  };
});

const mockMarkers: MarkerData[] = [
  {
    id: '1',
    name: 'Duck 1',
    species: 'Mallard',
    lat: 44.97,
    lng: -93.26,
    h3Index: '8928308280fffff',
    lastEncounteredAt: 'Just now',
    imageUrl: 'https://example.com/1.jpg',
  },
  {
    id: '2',
    name: 'Duck 2',
    species: 'Mallard',
    lat: 44.98,
    lng: -93.27,
    h3Index: '8928308281fffff',
    lastEncounteredAt: '1 hour ago',
    imageUrl: 'https://example.com/2.jpg',
  },
];

describe('AnimalMarkerClusterer', () => {
  let mockMap: Record<string, unknown>;

  beforeEach(() => {
    mockMap = {};
    vi.spyOn(reactGoogleMaps, 'useMap').mockReturnValue(mockMap as unknown as google.maps.Map);

    // Mock google maps global objects
    (globalThis as unknown as { window: unknown }).window = globalThis.window || {};
    (
      globalThis.window as unknown as {
        google: {
          maps: {
            marker: {
              AdvancedMarkerElement: unknown;
            };
            Marker: unknown;
          };
        };
      }
    ).google = {
      maps: {
        marker: {
          AdvancedMarkerElement: vi.fn().mockImplementation(function (
            this: Record<string, unknown>,
            { content }: { content: HTMLElement },
          ) {
            this.content = content;
            this.map = mockMap;
            this.addListener = vi.fn();
            return this;
          }),
        },
        Marker: vi.fn().mockImplementation(function (this: Record<string, unknown>) {
          this.setMap = vi.fn();
          this.addListener = vi.fn();
          return this;
        }),
      },
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
    mockAddMarkers.mockReset();
    mockRemoveMarker.mockReset();
    mockClearMarkers.mockReset();
  });

  it('renders without crashing when markers array is empty', () => {
    const { container } = render(<AnimalMarkerClusterer markers={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it('instantiates markers and clusters when markers are passed', () => {
    render(<AnimalMarkerClusterer markers={mockMarkers} />);
    expect(mockAddMarkers).toHaveBeenCalled();
  });

  it('invokes onSelect callback when marker pin is clicked', () => {
    const onSelect = vi.fn();
    render(<AnimalMarkerClusterer markers={mockMarkers} onSelect={onSelect} />);

    const advMarkerMock = window.google.maps.marker.AdvancedMarkerElement as unknown as {
      mock: { results: Array<{ value: { content: HTMLElement } }> };
    };
    const mockAdvMarkerCall = advMarkerMock.mock.results[0]?.value;
    expect(mockAdvMarkerCall).toBeDefined();

    const pinElement = mockAdvMarkerCall.content;
    expect(pinElement).toBeDefined();

    // Trigger click on pin element
    pinElement.click();
    expect(onSelect).toHaveBeenCalledWith(mockMarkers[0]);
  });
});
