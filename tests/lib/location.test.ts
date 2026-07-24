import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  isGeolocationSupported,
  getCurrentLocation,
  LocationError,
} from '../../lib/location';

describe('Geolocation Utility Module (lib/location.ts)', () => {
  const originalNavigator = globalThis.navigator;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    Object.defineProperty(globalThis, 'navigator', {
      value: originalNavigator,
      writable: true,
      configurable: true,
    });
  });

  describe('isGeolocationSupported', () => {
    it('returns false when navigator.geolocation is undefined', () => {
      Object.defineProperty(globalThis, 'navigator', {
        value: {},
        writable: true,
        configurable: true,
      });
      expect(isGeolocationSupported()).toBe(false);
    });

    it('returns true when navigator.geolocation is present', () => {
      Object.defineProperty(globalThis, 'navigator', {
        value: { geolocation: {} },
        writable: true,
        configurable: true,
      });
      expect(isGeolocationSupported()).toBe(true);
    });
  });

  describe('getCurrentLocation', () => {
    it('rejects with LocationError NOT_SUPPORTED if geolocation is not supported', async () => {
      Object.defineProperty(globalThis, 'navigator', {
        value: {},
        writable: true,
        configurable: true,
      });

      try {
        await getCurrentLocation();
        expect.fail('Should have rejected');
      } catch (err: any) {
        expect(err).toBeInstanceOf(LocationError);
        expect(err.code).toBe('NOT_SUPPORTED');
      }
    });

    it('resolves correct GeoCoords and passes default options to getCurrentPosition', async () => {
      const mockPosition = {
        coords: {
          latitude: 37.7749,
          longitude: -122.4194,
          accuracy: 10,
        },
        timestamp: 1600000000000,
      };

      const getCurrentPositionMock = vi
        .fn()
        .mockImplementation((successCallback: PositionCallback) => {
          successCallback(mockPosition as any);
        });

      Object.defineProperty(globalThis, 'navigator', {
        value: { geolocation: { getCurrentPosition: getCurrentPositionMock } },
        writable: true,
        configurable: true,
      });

      const coords = await getCurrentLocation();
      expect(coords).toEqual({
        latitude: 37.7749,
        longitude: -122.4194,
        accuracy: 10,
        timestamp: 1600000000000,
      });

      expect(getCurrentPositionMock).toHaveBeenCalledWith(
        expect.any(Function),
        expect.any(Function),
        {
          timeout: 10000,
          maximumAge: 30000,
          enableHighAccuracy: true,
        }
      );
    });

    it('allows overriding position options', async () => {
      const mockPosition = {
        coords: { latitude: 0, longitude: 0, accuracy: 1 },
        timestamp: 100,
      };

      const getCurrentPositionMock = vi
        .fn()
        .mockImplementation((successCallback: PositionCallback) => {
          successCallback(mockPosition as any);
        });

      Object.defineProperty(globalThis, 'navigator', {
        value: { geolocation: { getCurrentPosition: getCurrentPositionMock } },
        writable: true,
        configurable: true,
      });

      await getCurrentLocation({ timeout: 5000 });

      expect(getCurrentPositionMock).toHaveBeenCalledWith(
        expect.any(Function),
        expect.any(Function),
        {
          timeout: 5000,
          maximumAge: 30000,
          enableHighAccuracy: true,
        }
      );
    });

    it('maps GeolocationPositionError.PERMISSION_DENIED (1) to PERMISSION_DENIED LocationError', async () => {
      const mockError = {
        code: 1,
        PERMISSION_DENIED: 1,
        POSITION_UNAVAILABLE: 2,
        TIMEOUT: 3,
        message: 'User denied geolocation prompt',
      };

      const getCurrentPositionMock = vi
        .fn()
        .mockImplementation((_: PositionCallback, errorCallback: PositionErrorCallback) => {
          errorCallback(mockError as any);
        });

      Object.defineProperty(globalThis, 'navigator', {
        value: { geolocation: { getCurrentPosition: getCurrentPositionMock } },
        writable: true,
        configurable: true,
      });

      try {
        await getCurrentLocation();
        expect.fail('Should have rejected');
      } catch (err: any) {
        expect(err).toBeInstanceOf(LocationError);
        expect(err.code).toBe('PERMISSION_DENIED');
      }
    });

    it('maps GeolocationPositionError.POSITION_UNAVAILABLE (2) to UNAVAILABLE LocationError', async () => {
      const mockError = {
        code: 2,
        PERMISSION_DENIED: 1,
        POSITION_UNAVAILABLE: 2,
        TIMEOUT: 3,
        message: 'Position unavailable',
      };

      const getCurrentPositionMock = vi
        .fn()
        .mockImplementation((_: PositionCallback, errorCallback: PositionErrorCallback) => {
          errorCallback(mockError as any);
        });

      Object.defineProperty(globalThis, 'navigator', {
        value: { geolocation: { getCurrentPosition: getCurrentPositionMock } },
        writable: true,
        configurable: true,
      });

      try {
        await getCurrentLocation();
        expect.fail('Should have rejected');
      } catch (err: any) {
        expect(err).toBeInstanceOf(LocationError);
        expect(err.code).toBe('UNAVAILABLE');
      }
    });

    it('maps GeolocationPositionError.TIMEOUT (3) to TIMEOUT LocationError', async () => {
      const mockError = {
        code: 3,
        PERMISSION_DENIED: 1,
        POSITION_UNAVAILABLE: 2,
        TIMEOUT: 3,
        message: 'Location request timed out',
      };

      const getCurrentPositionMock = vi
        .fn()
        .mockImplementation((_: PositionCallback, errorCallback: PositionErrorCallback) => {
          errorCallback(mockError as any);
        });

      Object.defineProperty(globalThis, 'navigator', {
        value: { geolocation: { getCurrentPosition: getCurrentPositionMock } },
        writable: true,
        configurable: true,
      });

      try {
        await getCurrentLocation();
        expect.fail('Should have rejected');
      } catch (err: any) {
        expect(err).toBeInstanceOf(LocationError);
        expect(err.code).toBe('TIMEOUT');
      }
    });
  });
});
