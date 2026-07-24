import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { server } from '../../mocks/server';
import { http, HttpResponse } from 'msw';
import { useGeolocation } from '../../../components/map/useGeolocation';

describe('useGeolocation', () => {
  const originalNavigator = globalThis.navigator;

  afterEach(() => {
    Object.defineProperty(globalThis, 'navigator', {
      value: originalNavigator,
      writable: true,
      configurable: true,
    });
    vi.restoreAllMocks();
  });

  it('returns GPS coordinates when navigator.geolocation succeeds', async () => {
    // Arrange
    const mockGetCurrentPosition = vi.fn().mockImplementation((success: PositionCallback) => {
      success({
        coords: { latitude: 37.7749, longitude: -122.4194, accuracy: 10 },
        timestamp: 0,
      } as GeolocationPosition);
    });
    Object.defineProperty(globalThis, 'navigator', {
      value: { geolocation: { getCurrentPosition: mockGetCurrentPosition } },
      writable: true,
      configurable: true,
    });

    // Act
    const { result } = renderHook(() => useGeolocation());
    await waitFor(() => expect(result.current.loading).toBe(false));

    // Assert
    expect(result.current.center).toEqual({ lat: 37.7749, lng: -122.4194 });
  });

  it('falls back to ipapi.co when GPS fails', async () => {
    server.use(
      http.get('/api/geolocation', () =>
        HttpResponse.json({ latitude: 40.7128, longitude: -74.006 }),
      ),
    );
    const mockGetCurrentPosition = vi
      .fn()
      .mockImplementation((_: PositionCallback, error: PositionErrorCallback) => {
        error({
          code: 1,
          PERMISSION_DENIED: 1,
          POSITION_UNAVAILABLE: 2,
          TIMEOUT: 3,
          message: 'denied',
        } as GeolocationPositionError);
      });
    Object.defineProperty(globalThis, 'navigator', {
      value: { geolocation: { getCurrentPosition: mockGetCurrentPosition } },
      writable: true,
      configurable: true,
    });

    const { result } = renderHook(() => useGeolocation());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.center).toEqual({ lat: 40.7128, lng: -74.006 });
  });

  it('falls back to Minneapolis default when both GPS and ipapi.co fail', async () => {
    server.use(http.get('/api/geolocation', () => HttpResponse.error()));
    const mockGetCurrentPosition = vi
      .fn()
      .mockImplementation((_: PositionCallback, error: PositionErrorCallback) => {
        error({
          code: 3,
          PERMISSION_DENIED: 1,
          POSITION_UNAVAILABLE: 2,
          TIMEOUT: 3,
          message: 'timeout',
        } as GeolocationPositionError);
      });
    Object.defineProperty(globalThis, 'navigator', {
      value: { geolocation: { getCurrentPosition: mockGetCurrentPosition } },
      writable: true,
      configurable: true,
    });

    const { result } = renderHook(() => useGeolocation());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.center).toEqual({ lat: 44.9778, lng: -93.265 });
  });

  it('sets loading=true initially and loading=false after resolution', async () => {
    const mockGetCurrentPosition = vi.fn().mockImplementation((success: PositionCallback) => {
      success({
        coords: { latitude: 0, longitude: 0, accuracy: 1 },
        timestamp: 0,
      } as GeolocationPosition);
    });
    Object.defineProperty(globalThis, 'navigator', {
      value: { geolocation: { getCurrentPosition: mockGetCurrentPosition } },
      writable: true,
      configurable: true,
    });

    const { result } = renderHook(() => useGeolocation());
    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.loading).toBe(false));
  });

  it('does not set state after unmount — cancelled flag prevents stale updates', async () => {
    let resolveGps!: (coords: GeolocationPosition) => void;
    const pendingGps = new Promise<GeolocationPosition>((resolve) => {
      resolveGps = resolve;
    });
    const mockGetCurrentPosition = vi
      .fn()
      .mockImplementation((success: PositionCallback) => pendingGps.then(success));
    Object.defineProperty(globalThis, 'navigator', {
      value: { geolocation: { getCurrentPosition: mockGetCurrentPosition } },
      writable: true,
      configurable: true,
    });

    const { unmount, result } = renderHook(() => useGeolocation());

    // Capture center value before unmount — should still be the initial default
    const centerBeforeUnmount = result.current.center;

    // Unmount before GPS resolves
    unmount();

    // Now resolve GPS with a different position
    await act(async () => {
      resolveGps({
        coords: { latitude: 55.0, longitude: 10.0, accuracy: 5 },
        timestamp: Date.now(),
      } as GeolocationPosition);
      await Promise.resolve();
    });

    // Center should remain unchanged (default MINNEAPOLIS) because the hook was
    // unmounted and the cancelled flag should have prevented any state update.
    expect(result.current.center).toEqual(centerBeforeUnmount);
    expect(result.current.center).toEqual({ lat: 44.9778, lng: -93.265 });
  });
});
