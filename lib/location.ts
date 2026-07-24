export interface GeoCoords {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number;
}

export type LocationErrorCode = 'NOT_SUPPORTED' | 'PERMISSION_DENIED' | 'TIMEOUT' | 'UNAVAILABLE';

export class LocationError extends Error {
  constructor(public code: LocationErrorCode, message: string) {
    super(message);
    this.name = 'LocationError';
  }
}

export function isGeolocationSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof navigator !== 'undefined' &&
    'geolocation' in navigator
  );
}

const DEFAULT_POSITION_OPTIONS: PositionOptions = {
  timeout: 10000,
  maximumAge: 30000,
  enableHighAccuracy: true,
};

export function getCurrentLocation(options?: PositionOptions): Promise<GeoCoords> {
  return new Promise((resolve, reject) => {
    if (!isGeolocationSupported()) {
      return reject(
        new LocationError('NOT_SUPPORTED', 'Geolocation API is not supported in this environment')
      );
    }

    const mergedOptions = { ...DEFAULT_POSITION_OPTIONS, ...options };

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: position.timestamp,
        });
      },
      (error) => {
        switch (error.code) {
          case error.PERMISSION_DENIED:
            reject(new LocationError('PERMISSION_DENIED', 'Geolocation permission denied'));
            break;
          case error.POSITION_UNAVAILABLE:
            reject(new LocationError('UNAVAILABLE', 'Location information is unavailable'));
            break;
          case error.TIMEOUT:
            reject(new LocationError('TIMEOUT', 'Geolocation request timed out'));
            break;
          default:
            reject(new LocationError('UNAVAILABLE', error.message || 'Unknown geolocation error'));
            break;
        }
      },
      mergedOptions
    );
  });
}
