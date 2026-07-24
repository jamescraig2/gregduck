'use client';

import React, { FC, useState, useEffect, useCallback } from 'react';
import { APIProvider, Map, MapCameraChangedEvent } from '@vis.gl/react-google-maps';
import { useGeolocation } from './useGeolocation';
import { useDebounce } from '@/lib/useDebounce';
import { MarkerData } from '@/types';
import { AnimalMarkerClusterer } from './AnimalMarkerClusterer';
import { AnimalTeaserDrawer } from './AnimalTeaserDrawer';
import { CLEAN_MAP_STYLE } from '@/lib/mapStyle';

export interface MapDashboardProps {
  className?: string;
}

export const MapDashboard: FC<MapDashboardProps> = ({ className = '' }) => {
  const { center, loading } = useGeolocation();

  // Bounds state — null until first camera event fires
  const [bounds, setBounds] = useState<google.maps.LatLngBoundsLiteral | null>(null);
  const [markers, setMarkers] = useState<MarkerData[]>([]);
  const [selectedAnimal, setSelectedAnimal] = useState<MarkerData | null>(null);

  // Debounce camera bounds by 300 ms to avoid per-frame API calls
  const debouncedBounds = useDebounce(bounds, 300);

  // Fetch markers when debounced bounds change
  useEffect(() => {
    if (!debouncedBounds) return; // guard: no fetch before first camera event

    const { south, west, north, east } = debouncedBounds;
    const params = new URLSearchParams({
      sw_lat: String(south),
      sw_lng: String(west),
      ne_lat: String(north),
      ne_lng: String(east),
    });

    let cancelled = false;

    fetch(`/api/markers?${params}`)
      .then((res) => {
        if (!res.ok) throw new Error(`/api/markers responded ${res.status}`);
        return res.json();
      })
      .then((data: { markers: MarkerData[]; total: number }) => {
        if (!cancelled) setMarkers(data.markers);
      })
      .catch(() => {
        if (!cancelled) setMarkers([]);
      });

    return () => {
      cancelled = true;
    };
  }, [debouncedBounds]);

  const handleCameraChanged = useCallback((ev: MapCameraChangedEvent) => {
    setBounds(ev.detail.bounds);
  }, []);

  if (loading) {
    return (
      <div className={`flex items-center justify-center w-full h-full ${className}`}>
        <span className="animate-pulse text-slate-400">Locating…</span>
      </div>
    );
  }

  return (
    <div className={`w-full h-full ${className}`}>
      <APIProvider apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!}>
        <Map
          mapId={process.env.NEXT_PUBLIC_MAP_ID}
          defaultZoom={13}
          defaultCenter={center}
          onCameraChanged={handleCameraChanged}
          styles={CLEAN_MAP_STYLE}
          style={{ width: '100%', height: '100%' }}
        >
          <AnimalMarkerClusterer markers={markers} onSelect={setSelectedAnimal} />
          <AnimalTeaserDrawer
            animal={selectedAnimal}
            onClose={() => setSelectedAnimal(null)}
            userPosition={center}
          />
        </Map>
      </APIProvider>
    </div>
  );
};
