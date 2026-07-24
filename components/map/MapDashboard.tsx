'use client';

import React, { FC, useState, useEffect, useCallback } from 'react';
import { APIProvider, Map, MapCameraChangedEvent, useMap } from '@vis.gl/react-google-maps';
import { useGeolocation } from './useGeolocation';
import { useDebounce } from '@/lib/useDebounce';
import { MarkerData } from '@/types';
import { AnimalMarkerClusterer } from './AnimalMarkerClusterer';
import { AnimalTeaserDrawer } from './AnimalTeaserDrawer';
import { MapControlsOverlay } from './MapControlsOverlay';
import { CameraCaptureModal } from '../camera/CameraCaptureModal';
import { CLEAN_MAP_STYLE } from '@/lib/mapStyle';

export interface MapDashboardProps {
  className?: string;
}

interface MapContentProps {
  center: { lat: number; lng: number };
  markers: MarkerData[];
  selectedAnimal: MarkerData | null;
  setSelectedAnimal: (animal: MarkerData | null) => void;
  handleCameraChanged: (ev: MapCameraChangedEvent) => void;
  selectedSpecies: string;
  setSelectedSpecies: (species: string) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  toastMessage: string | null;
  setToastMessage: (msg: string | null) => void;
  onQuickCapture: () => void;
}

const MapContent: FC<MapContentProps> = ({
  center,
  markers,
  selectedAnimal,
  setSelectedAnimal,
  handleCameraChanged,
  selectedSpecies,
  setSelectedSpecies,
  searchQuery,
  setSearchQuery,
  toastMessage,
  setToastMessage,
  onQuickCapture,
}) => {
  const map = useMap();

  const handleRecenter = useCallback(() => {
    if (map && center) {
      map.panTo(center);
      map.setZoom(14);
    }
  }, [map, center]);

  const filteredMarkers = markers.filter((marker) => {
    const matchesSpecies =
      selectedSpecies === 'all' ||
      marker.species.toLowerCase() === selectedSpecies.toLowerCase();

    const query = searchQuery.trim().toLowerCase();
    const matchesSearch =
      !query ||
      marker.name.toLowerCase().includes(query) ||
      marker.species.toLowerCase().includes(query);

    return matchesSpecies && matchesSearch;
  });

  return (
    <div className="relative w-full h-full">
      <Map
        mapId={process.env.NEXT_PUBLIC_MAP_ID}
        defaultZoom={13}
        defaultCenter={center}
        onCameraChanged={handleCameraChanged}
        styles={CLEAN_MAP_STYLE}
        style={{ width: '100%', height: '100%' }}
      >
        <AnimalMarkerClusterer markers={filteredMarkers} onSelect={setSelectedAnimal} />
        <AnimalTeaserDrawer
          animal={selectedAnimal}
          onClose={() => setSelectedAnimal(null)}
          userPosition={center}
        />
      </Map>

      <MapControlsOverlay
        onRecenter={handleRecenter}
        onQuickCapture={onQuickCapture}
        selectedSpecies={selectedSpecies}
        onSelectSpecies={setSelectedSpecies}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        toastMessage={toastMessage}
        onCloseToast={() => setToastMessage(null)}
      />
    </div>
  );
};

export const MapDashboard: FC<MapDashboardProps> = ({ className = '' }) => {
  const { center, loading } = useGeolocation();

  // Bounds state — null until first camera event fires
  const [bounds, setBounds] = useState<google.maps.LatLngBoundsLiteral | null>(null);
  const [markers, setMarkers] = useState<MarkerData[]>([]);
  const [selectedAnimal, setSelectedAnimal] = useState<MarkerData | null>(null);

  // Filter & overlay state
  const [selectedSpecies, setSelectedSpecies] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isCameraOpen, setIsCameraOpen] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

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
        if (!cancelled) {
          setMarkers(data.markers);
          setToastMessage(null);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setMarkers([]);
          setToastMessage('Failed to load markers. Please try again.');
        }
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
    <div className={`w-full h-full ${className}`} data-testid="map-dashboard">
      <APIProvider apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!}>
        <MapContent
          center={center}
          markers={markers}
          selectedAnimal={selectedAnimal}
          setSelectedAnimal={setSelectedAnimal}
          handleCameraChanged={handleCameraChanged}
          selectedSpecies={selectedSpecies}
          setSelectedSpecies={setSelectedSpecies}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          toastMessage={toastMessage}
          setToastMessage={setToastMessage}
          onQuickCapture={() => setIsCameraOpen(true)}
        />
      </APIProvider>

      <CameraCaptureModal
        isOpen={isCameraOpen}
        onClose={() => setIsCameraOpen(false)}
      />
    </div>
  );
};
