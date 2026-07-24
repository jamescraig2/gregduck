import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { CameraCaptureModal } from '../../../components/camera/CameraCaptureModal';
import * as cameraLib from '../../../lib/camera';
import * as locationLib from '../../../lib/location';

describe('CameraCaptureModal Component', () => {
  const mockTrack = { stop: vi.fn() };
  const mockStream = { getTracks: vi.fn(() => [mockTrack]) } as unknown as MediaStream;

  const mockCoords: locationLib.GeoCoords = {
    latitude: 37.7749,
    longitude: -122.4194,
    accuracy: 10,
    timestamp: Date.now(),
  };

  beforeEach(() => {
    vi.restoreAllMocks();

    vi.spyOn(cameraLib, 'requestCameraStream').mockResolvedValue(mockStream);
    vi.spyOn(cameraLib, 'stopCameraStream').mockImplementation(() => {});
    vi.spyOn(cameraLib, 'captureFrameAsBlob').mockResolvedValue(new Blob(['fake-image'], { type: 'image/jpeg' }));
    vi.spyOn(locationLib, 'getCurrentLocation').mockResolvedValue(mockCoords);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders null when isOpen is false', () => {
    const { container } = render(<CameraCaptureModal isOpen={false} onClose={vi.fn()} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders dialog modal when isOpen is true', async () => {
    render(<CameraCaptureModal isOpen={true} onClose={vi.fn()} />);

    await waitFor(() => {
      const dialog = screen.getByRole('dialog');
      expect(dialog).toBeInTheDocument();
      expect(dialog).toHaveAttribute('aria-modal', 'true');
      expect(screen.getByText(/Camera Wildlife Capture/i)).toBeInTheDocument();
    });
  });

  it('initiates concurrent camera stream and location acquisition on open', async () => {
    render(<CameraCaptureModal isOpen={true} onClose={vi.fn()} />);

    expect(cameraLib.requestCameraStream).toHaveBeenCalledTimes(1);
    expect(locationLib.getCurrentLocation).toHaveBeenCalledTimes(1);

    await waitFor(() => {
      expect(screen.getByText(/37\.7749°, -122\.4194°/i)).toBeInTheDocument();
    });
  });

  it('binds video srcObject and hides skeleton once stream is acquired', async () => {
    render(<CameraCaptureModal isOpen={true} onClose={vi.fn()} />);

    await waitFor(() => {
      const videoEl = screen.getByRole('dialog').querySelector('video') as HTMLVideoElement;
      expect(videoEl).toBeInTheDocument();
      expect(videoEl.srcObject).toBe(mockStream);
    });
  });

  it('disables shutter button during locating or capturing state', async () => {
    let resolveLocation: (coords: locationLib.GeoCoords) => void;
    const pendingLocationPromise = new Promise<locationLib.GeoCoords>((res) => {
      resolveLocation = res;
    });
    vi.spyOn(locationLib, 'getCurrentLocation').mockReturnValue(pendingLocationPromise);

    render(<CameraCaptureModal isOpen={true} onClose={vi.fn()} />);

    await waitFor(() => {
      const shutterButton = screen.getByRole('button', { name: /Take photo/i });
      expect(shutterButton).toBeDisabled();
      expect(screen.getByText(/Locating.../i)).toBeInTheDocument();
    });

    resolveLocation!(mockCoords);

    await waitFor(() => {
      const shutterButton = screen.getByRole('button', { name: /Take photo/i });
      expect(shutterButton).not.toBeDisabled();
      expect(screen.getByText(/37\.7749°, -122\.4194°/i)).toBeInTheDocument();
    });
  });

  it('invokes stopCameraStream on close button click and unmount', async () => {
    const handleClose = vi.fn();
    const { unmount } = render(<CameraCaptureModal isOpen={true} onClose={handleClose} />);

    await waitFor(() => {
      expect(cameraLib.requestCameraStream).toHaveBeenCalled();
    });

    const closeButton = screen.getByRole('button', { name: /Close camera/i });
    fireEvent.click(closeButton);

    expect(cameraLib.stopCameraStream).toHaveBeenCalledWith(mockStream);
    expect(handleClose).toHaveBeenCalledTimes(1);

    unmount();
    expect(cameraLib.stopCameraStream).toHaveBeenCalled();
  });

  it('captures frame blob, constructs FormData with coords, and POSTs to /api/capture', async () => {
    const mockSuccess = vi.fn();
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ success: true, captureId: 'cap_123' }),
    });
    global.fetch = mockFetch;

    render(<CameraCaptureModal isOpen={true} onClose={vi.fn()} onSuccess={mockSuccess} />);

    await waitFor(() => {
      const shutterButton = screen.getByRole('button', { name: /Take photo/i });
      expect(shutterButton).not.toBeDisabled();
    });

    const shutterButton = screen.getByRole('button', { name: /Take photo/i });
    fireEvent.click(shutterButton);

    await waitFor(() => {
      expect(cameraLib.captureFrameAsBlob).toHaveBeenCalled();
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/capture',
        expect.objectContaining({
          method: 'POST',
          body: expect.any(FormData),
        })
      );
      expect(mockSuccess).toHaveBeenCalledWith({ success: true, captureId: 'cap_123' });
    });

    const fetchCall = mockFetch.mock.calls[0];
    const formDataArg = fetchCall[1].body as FormData;
    expect(formDataArg.get('file')).toBeInstanceOf(Blob);
    expect(formDataArg.get('latitude')).toBe('37.7749');
    expect(formDataArg.get('longitude')).toBe('-122.4194');
  });

  it('handles camera stream error gracefully', async () => {
    const mockError = vi.fn();
    vi.spyOn(cameraLib, 'requestCameraStream').mockRejectedValue(
      new cameraLib.CameraError('PERMISSION_DENIED', 'Camera access denied')
    );

    render(<CameraCaptureModal isOpen={true} onClose={vi.fn()} onError={mockError} />);

    await waitFor(() => {
      expect(screen.getByText(/Camera access denied/i)).toBeInTheDocument();
      expect(mockError).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  it('handles geolocation error gracefully and retains active shutter button if stream succeeds', async () => {
    vi.spyOn(locationLib, 'getCurrentLocation').mockRejectedValue(
      new locationLib.LocationError('PERMISSION_DENIED', 'Location denied')
    );

    render(<CameraCaptureModal isOpen={true} onClose={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText(/Location denied/i)).toBeInTheDocument();
      const shutterButton = screen.getByRole('button', { name: /Take photo/i });
      expect(shutterButton).not.toBeDisabled();
    });
  });
});
