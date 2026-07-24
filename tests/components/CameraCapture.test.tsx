import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { DiscoveryModal } from '../../components/camera/DiscoveryModal';
import { EncounterModal } from '../../components/camera/EncounterModal';
import { CameraCaptureModal } from '../../components/camera/CameraCaptureModal';
import * as cameraLib from '../../lib/camera';
import * as locationLib from '../../lib/location';

describe('DiscoveryModal Component', () => {
  const mockAnimal = {
    id: 'a1',
    species: 'Mallard Duck',
    name: 'Quackers',
    imageUrl: 'https://mock.test/duck.jpg',
  };

  it('DiscoveryModal renders null when isOpen is false', () => {
    const { container } = render(
      <DiscoveryModal isOpen={false} onClose={vi.fn()} animal={mockAnimal} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('DiscoveryModal renders headline and animal name when isOpen is true', () => {
    render(
      <DiscoveryModal isOpen={true} onClose={vi.fn()} animal={mockAnimal} />
    );
    expect(screen.getByText(/🎉 New Discovery!/i)).toBeInTheDocument();
    expect(screen.getByText('Quackers')).toBeInTheDocument();
    expect(screen.getByText('Mallard Duck')).toBeInTheDocument();
  });

  it('DiscoveryModal calls onClose when CTA clicked', () => {
    const handleClose = vi.fn();
    render(
      <DiscoveryModal isOpen={true} onClose={handleClose} animal={mockAnimal} />
    );
    const button = screen.getByRole('button', { name: /Woohoo!/i });
    fireEvent.click(button);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('DiscoveryModal has role=dialog aria-modal=true', () => {
    render(
      <DiscoveryModal isOpen={true} onClose={vi.fn()} animal={mockAnimal} />
    );
    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeInTheDocument();
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAttribute('aria-labelledby', 'headline-discovery');
  });
});

describe('EncounterModal Component', () => {
  const mockAnimal = {
    id: 'a1',
    species: 'Mallard Duck',
    name: 'Quackers',
    imageUrl: 'https://mock.test/duck.jpg',
  };

  const mockEncounter = {
    id: 'e1',
    capturedAt: '2026-07-23T21:00:00.000Z',
  };

  it('EncounterModal renders null when isOpen is false', () => {
    const { container } = render(
      <EncounterModal
        isOpen={false}
        onClose={vi.fn()}
        animal={mockAnimal}
        encounter={mockEncounter}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it('EncounterModal renders formatted capturedAt date', () => {
    render(
      <EncounterModal
        isOpen={true}
        onClose={vi.fn()}
        animal={mockAnimal}
        encounter={mockEncounter}
      />
    );
    const formattedDate = new Date(mockEncounter.capturedAt).toLocaleDateString();
    expect(screen.getByText(new RegExp(`You've seen Quackers before!`, 'i'))).toBeInTheDocument();
    expect(screen.getByText(formattedDate)).toBeInTheDocument();
  });

  it('EncounterModal calls onClose when CTA clicked', () => {
    const handleClose = vi.fn();
    render(
      <EncounterModal
        isOpen={true}
        onClose={handleClose}
        animal={mockAnimal}
        encounter={mockEncounter}
      />
    );
    const button = screen.getByRole('button', { name: /Got it/i });
    fireEvent.click(button);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });
});

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
    vi.spyOn(cameraLib, 'captureFrameAsBlob').mockResolvedValue(
      new Blob(['fake-image'], { type: 'image/jpeg' })
    );
    vi.spyOn(locationLib, 'getCurrentLocation').mockResolvedValue(mockCoords);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('CameraCaptureModal does not render when isOpen is false', () => {
    const { container } = render(
      <CameraCaptureModal isOpen={false} onClose={vi.fn()} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('CameraCaptureModal renders viewfinder when isOpen is true', async () => {
    render(<CameraCaptureModal isOpen={true} onClose={vi.fn()} />);

    await waitFor(() => {
      const dialog = screen.getByRole('dialog');
      expect(dialog).toBeInTheDocument();
      const videoEl = dialog.querySelector('video');
      expect(videoEl).toBeInTheDocument();
    });
  });

  it('CameraCaptureModal POSTs FormData to /api/capture on shutter click', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({
        isNewDiscovery: true,
        animal: { id: 'a1', species: 'Mallard Duck', name: 'Quackers' },
      }),
    });
    global.fetch = mockFetch;

    render(<CameraCaptureModal isOpen={true} onClose={vi.fn()} />);

    await waitFor(() => {
      const shutterButton = screen.getByRole('button', { name: /Take photo/i });
      expect(shutterButton).not.toBeDisabled();
    });

    const shutterButton = screen.getByRole('button', { name: /Take photo/i });
    fireEvent.click(shutterButton);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/capture',
        expect.objectContaining({
          method: 'POST',
          body: expect.any(FormData),
        })
      );
    });

    const fetchCall = mockFetch.mock.calls[0];
    const formDataArg = fetchCall[1].body as FormData;
    expect(formDataArg.get('file')).toBeInstanceOf(Blob);
    expect(formDataArg.get('latitude')).toBe('37.7749');
    expect(formDataArg.get('longitude')).toBe('-122.4194');
  });

  it('CameraCaptureModal calls onCaptureComplete with parsed result on 2xx', async () => {
    const mockOnCaptureComplete = vi.fn();
    const mockResult = {
      isNewDiscovery: true,
      animal: { id: 'a1', species: 'Mallard Duck', name: 'Quackers' },
    };
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue(mockResult),
    });
    global.fetch = mockFetch;

    render(
      <CameraCaptureModal
        isOpen={true}
        onClose={vi.fn()}
        onCaptureComplete={mockOnCaptureComplete}
      />
    );

    await waitFor(() => {
      const shutterButton = screen.getByRole('button', { name: /Take photo/i });
      expect(shutterButton).not.toBeDisabled();
    });

    const shutterButton = screen.getByRole('button', { name: /Take photo/i });
    fireEvent.click(shutterButton);

    await waitFor(() => {
      expect(mockOnCaptureComplete).toHaveBeenCalledWith(mockResult);
    });
  });

  it('CameraCaptureModal calls onClose after successful capture', async () => {
    const handleClose = vi.fn();
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ success: true }),
    });
    global.fetch = mockFetch;

    render(<CameraCaptureModal isOpen={true} onClose={handleClose} />);

    await waitFor(() => {
      const shutterButton = screen.getByRole('button', { name: /Take photo/i });
      expect(shutterButton).not.toBeDisabled();
    });

    const shutterButton = screen.getByRole('button', { name: /Take photo/i });
    fireEvent.click(shutterButton);

    await waitFor(() => {
      expect(handleClose).toHaveBeenCalledTimes(1);
    });
  });
});
