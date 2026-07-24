import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  isCameraSupported,
  requestCameraStream,
  stopCameraStream,
  captureFrameAsBlob,
  CameraError,
} from '../../lib/camera';

describe('Camera Utility Module (lib/camera.ts)', () => {
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

  describe('isCameraSupported', () => {
    it('returns false when navigator.mediaDevices is undefined', () => {
      Object.defineProperty(globalThis, 'navigator', {
        value: {},
        writable: true,
        configurable: true,
      });
      expect(isCameraSupported()).toBe(false);
    });

    it('returns true when navigator.mediaDevices.getUserMedia is present', () => {
      Object.defineProperty(globalThis, 'navigator', {
        value: {
          mediaDevices: {
            getUserMedia: vi.fn(),
          },
        },
        writable: true,
        configurable: true,
      });
      expect(isCameraSupported()).toBe(true);
    });
  });

  describe('requestCameraStream', () => {
    it('throws CameraError NOT_SUPPORTED if camera is not supported', async () => {
      Object.defineProperty(globalThis, 'navigator', {
        value: {},
        writable: true,
        configurable: true,
      });
      await expect(requestCameraStream()).rejects.toThrow(CameraError);
      try {
        await requestCameraStream();
      } catch (err: any) {
        expect(err).toBeInstanceOf(CameraError);
        expect(err.code).toBe('NOT_SUPPORTED');
      }
    });

    it('succeeds when tier 1 getUserMedia resolves a MediaStream', async () => {
      const mockStream = { getTracks: vi.fn() } as unknown as MediaStream;
      const getUserMediaMock = vi.fn().mockResolvedValue(mockStream);
      Object.defineProperty(globalThis, 'navigator', {
        value: { mediaDevices: { getUserMedia: getUserMediaMock } },
        writable: true,
        configurable: true,
      });

      const stream = await requestCameraStream();
      expect(stream).toBe(mockStream);
      expect(getUserMediaMock).toHaveBeenCalledTimes(1);
      expect(getUserMediaMock).toHaveBeenCalledWith({
        video: { facingMode: { ideal: 'environment' } },
      });
    });

    it('falls back through constraint tiers when encountering OverconstrainedError', async () => {
      const mockStream = { getTracks: vi.fn() } as unknown as MediaStream;
      const overconstrainedErr = new Error('Overconstrained');
      overconstrainedErr.name = 'OverconstrainedError';

      const getUserMediaMock = vi
        .fn()
        .mockRejectedValueOnce(overconstrainedErr)
        .mockRejectedValueOnce(overconstrainedErr)
        .mockResolvedValueOnce(mockStream);

      Object.defineProperty(globalThis, 'navigator', {
        value: { mediaDevices: { getUserMedia: getUserMediaMock } },
        writable: true,
        configurable: true,
      });

      const stream = await requestCameraStream();
      expect(stream).toBe(mockStream);
      expect(getUserMediaMock).toHaveBeenCalledTimes(3);
      expect(getUserMediaMock).toHaveBeenNthCalledWith(1, { video: { facingMode: { ideal: 'environment' } } });
      expect(getUserMediaMock).toHaveBeenNthCalledWith(2, { video: { facingMode: 'environment' } });
      expect(getUserMediaMock).toHaveBeenNthCalledWith(3, { video: true });
    });

    it('throws CameraError PERMISSION_DENIED on NotAllowedError', async () => {
      const notAllowedErr = new Error('Permission denied');
      notAllowedErr.name = 'NotAllowedError';

      const getUserMediaMock = vi.fn().mockRejectedValue(notAllowedErr);
      Object.defineProperty(globalThis, 'navigator', {
        value: { mediaDevices: { getUserMedia: getUserMediaMock } },
        writable: true,
        configurable: true,
      });

      try {
        await requestCameraStream();
        expect.fail('Should have thrown CameraError');
      } catch (err: any) {
        expect(err).toBeInstanceOf(CameraError);
        expect(err.code).toBe('PERMISSION_DENIED');
      }
    });

    it('throws CameraError CAPTURE_FAILED when all constraint tiers fail', async () => {
      const unknownErr = new Error('Hardware failure');
      const getUserMediaMock = vi.fn().mockRejectedValue(unknownErr);
      Object.defineProperty(globalThis, 'navigator', {
        value: { mediaDevices: { getUserMedia: getUserMediaMock } },
        writable: true,
        configurable: true,
      });

      try {
        await requestCameraStream();
        expect.fail('Should have thrown CameraError');
      } catch (err: any) {
        expect(err).toBeInstanceOf(CameraError);
        expect(err.code).toBe('CAPTURE_FAILED');
      }
    });
  });

  describe('stopCameraStream', () => {
    it('does nothing when stream is null or undefined', () => {
      expect(() => stopCameraStream(null)).not.toThrow();
      expect(() => stopCameraStream(undefined)).not.toThrow();
    });

    it('calls stop() on all tracks of the stream', () => {
      const track1 = { stop: vi.fn() };
      const track2 = { stop: vi.fn() };
      const mockStream = {
        getTracks: vi.fn().mockReturnValue([track1, track2]),
      } as unknown as MediaStream;

      stopCameraStream(mockStream);
      expect(track1.stop).toHaveBeenCalledTimes(1);
      expect(track2.stop).toHaveBeenCalledTimes(1);
    });
  });

  describe('captureFrameAsBlob', () => {
    it('throws CameraError CAPTURE_FAILED if video element has invalid dimensions', async () => {
      const videoEl = { videoWidth: 0, videoHeight: 0 } as HTMLVideoElement;
      await expect(captureFrameAsBlob(videoEl)).rejects.toThrow(CameraError);
    });

    it('bounds 3840x2160 video input to 1920x1080 canvas output and calls toBlob', async () => {
      const videoEl = { videoWidth: 3840, videoHeight: 2160 } as HTMLVideoElement;
      const fakeBlob = new Blob(['test'], { type: 'image/jpeg' });

      const drawImageSpy = vi.fn();
      const getContextSpy = vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
        drawImage: drawImageSpy,
      } as any);

      const toBlobSpy = vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation(
        (callback: BlobCallback) => {
          callback(fakeBlob);
        }
      );

      const blob = await captureFrameAsBlob(videoEl, 0.85);
      expect(blob).toBe(fakeBlob);
      expect(drawImageSpy).toHaveBeenCalledWith(videoEl, 0, 0, 1920, 1080);
      expect(toBlobSpy).toHaveBeenCalledWith(expect.any(Function), 'image/jpeg', 0.85);

      getContextSpy.mockRestore();
      toBlobSpy.mockRestore();
    });
  });
});
