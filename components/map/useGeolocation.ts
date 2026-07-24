'use client';

import { useState, useEffect } from 'react';
import { getCurrentLocation } from '@/lib/location';

export interface LatLng {
  lat: number;
  lng: number;
}

export interface UseGeolocationResult {
  center: LatLng;
  loading: boolean;
}

const MINNEAPOLIS_DEFAULT: LatLng = { lat: 44.9778, lng: -93.265 };

export function useGeolocation(): UseGeolocationResult {
  const [center, setCenter] = useState<LatLng>(MINNEAPOLIS_DEFAULT);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let cancelled = false;

    async function resolveLocation() {
      // Step 1: Browser GPS via lib/location.ts (5 000 ms timeout override)
      try {
        const coords = await getCurrentLocation({ timeout: 5000 });
        if (!cancelled) {
          setCenter({ lat: coords.latitude, lng: coords.longitude });
          setLoading(false);
          return;
        }
      } catch {
        // fall through to Step 2
      }

      // Step 2: IP geolocation via server-side proxy (avoids exposing user IP to third-party)
      try {
        const res = await fetch('/api/geolocation');
        const data = await res.json();
        if (!cancelled && typeof data.latitude === 'number' && typeof data.longitude === 'number') {
          setCenter({ lat: data.latitude, lng: data.longitude });
          setLoading(false);
          return;
        }
      } catch {
        // fall through to Step 3
      }

      // Step 3: Minneapolis default (hardcoded)
      if (!cancelled) {
        setCenter(MINNEAPOLIS_DEFAULT);
        setLoading(false);
      }
    }

    resolveLocation();

    return () => {
      cancelled = true;
    };
  }, []); // empty dep array — run once on mount

  return { center, loading };
}
