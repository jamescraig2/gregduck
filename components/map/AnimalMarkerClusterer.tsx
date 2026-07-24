'use client';

import { FC, useEffect, useRef } from 'react';
import { useMap } from '@vis.gl/react-google-maps';
import { MarkerClusterer } from '@googlemaps/markerclusterer';
import { MarkerData } from '@/types';

export interface AnimalMarkerClustererProps {
  markers: MarkerData[];
  onSelect?: (animal: MarkerData | null) => void;
}

export const AnimalMarkerClusterer: FC<AnimalMarkerClustererProps> = ({ markers, onSelect }) => {
  const map = useMap();
  const clustererRef = useRef<MarkerClusterer | null>(null);
  const markersMapRef = useRef<
    Map<string, google.maps.marker.AdvancedMarkerElement | google.maps.Marker>
  >(new Map());

  // Initialize MarkerClusterer when map becomes available
  useEffect(() => {
    if (!map || typeof window === 'undefined' || !window.google?.maps) return;

    if (!clustererRef.current) {
      clustererRef.current = new MarkerClusterer({ map });
    }

    return () => {
      if (clustererRef.current) {
        clustererRef.current.clearMarkers();
        clustererRef.current = null;
      }
    };
  }, [map]);

  // Sync markers whenever markers array or onSelect handler updates
  useEffect(() => {
    if (!map || typeof window === 'undefined' || !window.google?.maps) return;

    const currentMarkersMap = markersMapRef.current;
    const newMarkerIds = new Set(markers.map((m) => m.id));

    // Remove markers that are no longer in the markers list
    for (const [id, markerInstance] of currentMarkersMap.entries()) {
      if (!newMarkerIds.has(id)) {
        if (clustererRef.current) {
          clustererRef.current.removeMarker(markerInstance);
        }
        if ('setMap' in markerInstance) {
          markerInstance.setMap(null);
        } else {
          markerInstance.map = null;
        }
        currentMarkersMap.delete(id);
      }
    }

    // Add new markers
    const newlyCreatedMarkers: (google.maps.marker.AdvancedMarkerElement | google.maps.Marker)[] =
      [];

    markers.forEach((animal) => {
      if (!currentMarkersMap.has(animal.id)) {
        const position = { lat: animal.lat, lng: animal.lng };

        // Create custom glassmorphism marker DOM element
        const pinContainer = document.createElement('div');
        pinContainer.className =
          'glass-panel flex items-center gap-1.5 p-1 px-2 rounded-full bg-slate-900/80 border border-white/20 shadow-lg cursor-pointer hover:scale-105 transition-transform text-white text-xs font-medium';

        if (animal.imageUrl) {
          const img = document.createElement('img');
          img.src = animal.imageUrl;
          img.alt = animal.name;
          img.className = 'w-6 h-6 rounded-full object-cover';
          pinContainer.appendChild(img);
        }

        const nameSpan = document.createElement('span');
        nameSpan.textContent = animal.name || animal.species;
        pinContainer.appendChild(nameSpan);

        pinContainer.addEventListener('click', (e) => {
          e.stopPropagation();
          onSelect?.(animal);
        });

        let markerInstance: google.maps.marker.AdvancedMarkerElement | google.maps.Marker;

        if (window.google.maps.marker?.AdvancedMarkerElement) {
          markerInstance = new window.google.maps.marker.AdvancedMarkerElement({
            map,
            position,
            content: pinContainer,
            title: animal.name,
          });
        } else {
          markerInstance = new window.google.maps.Marker({
            map,
            position,
            title: animal.name,
          });
          markerInstance.addListener('click', () => {
            onSelect?.(animal);
          });
        }

        currentMarkersMap.set(animal.id, markerInstance);
        newlyCreatedMarkers.push(markerInstance);
      }
    });

    if (newlyCreatedMarkers.length > 0 && clustererRef.current) {
      clustererRef.current.addMarkers(newlyCreatedMarkers);
    }
  }, [map, markers, onSelect]);

  return null;
};
