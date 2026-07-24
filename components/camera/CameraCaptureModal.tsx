import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GlassPanel } from '../ui/GlassPanel';
import { CameraViewfinder } from './CameraViewfinder';
import { CaptureOverlay } from './CaptureOverlay';
import { requestCameraStream, stopCameraStream, captureFrameAsBlob } from '../../lib/camera';
import { getCurrentLocation, GeoCoords } from '../../lib/location';

export interface CameraCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (result: any) => void;
  onError?: (error: Error) => void;
}

export const CameraCaptureModal: React.FC<CameraCaptureModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  onError,
}) => {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isStreamLoading, setIsStreamLoading] = useState<boolean>(false);
  const [streamError, setStreamError] = useState<string | null>(null);

  const [locationStatus, setLocationStatus] = useState<'idle' | 'locating' | 'ready' | 'error'>('idle');
  const [locationCoords, setLocationCoords] = useState<GeoCoords | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);

  const [isCapturing, setIsCapturing] = useState<boolean>(false);
  const [captureError, setCaptureError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const cleanupStream = useCallback(() => {
    if (streamRef.current) {
      stopCameraStream(streamRef.current);
      streamRef.current = null;
    }
    setStream(null);
  }, []);

  const handleClose = useCallback(() => {
    cleanupStream();
    onClose();
  }, [cleanupStream, onClose]);

  useEffect(() => {
    if (!isOpen) {
      cleanupStream();
      return;
    }

    let isMounted = true;

    setIsStreamLoading(true);
    setStreamError(null);
    setLocationStatus('locating');
    setLocationCoords(null);
    setLocationError(null);
    setCaptureError(null);

    // Concurrently request camera stream and geolocation
    requestCameraStream()
      .then((mediaStream) => {
        if (!isMounted) {
          stopCameraStream(mediaStream);
          return;
        }
        streamRef.current = mediaStream;
        setStream(mediaStream);
        setIsStreamLoading(false);
      })
      .catch((err: any) => {
        if (!isMounted) return;
        const message = err?.message || 'Failed to acquire camera stream';
        setStreamError(message);
        setIsStreamLoading(false);
        onError?.(err instanceof Error ? err : new Error(message));
      });

    getCurrentLocation()
      .then((coords) => {
        if (!isMounted) return;
        setLocationCoords(coords);
        setLocationStatus('ready');
      })
      .catch((err: any) => {
        if (!isMounted) return;
        const message = err?.message || 'Failed to acquire geolocation';
        setLocationError(message);
        setLocationStatus('error');
      });

    return () => {
      isMounted = false;
      cleanupStream();
    };
  }, [isOpen, cleanupStream, onError]);

  const handleCapture = async () => {
    if (!videoRef.current || isCapturing) return;

    setIsCapturing(true);
    setCaptureError(null);

    try {
      const blob = await captureFrameAsBlob(videoRef.current);
      const formData = new FormData();
      formData.append('file', blob, 'capture.jpg');

      if (locationCoords) {
        formData.append('latitude', String(locationCoords.latitude));
        formData.append('longitude', String(locationCoords.longitude));
      }

      const response = await fetch('/api/capture', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Upload failed');
        throw new Error(`Capture API submission failed (${response.status}): ${errorText}`);
      }

      const result = await response.json();
      onSuccess?.(result);
      handleClose();
    } catch (err: any) {
      const errorObj = err instanceof Error ? err : new Error(String(err));
      setCaptureError(errorObj.message);
      onError?.(errorObj);
    } finally {
      setIsCapturing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="camera-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md"
    >
      <GlassPanel className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-slate-700/60 shadow-2xl p-0 flex flex-col">
        <h2 id="camera-modal-title" className="sr-only">
          Camera Wildlife Capture
        </h2>

        <div className="relative w-full aspect-[4/3] bg-black">
          <CameraViewfinder
            stream={stream}
            videoRef={videoRef}
            isLoading={isStreamLoading}
            error={streamError}
          />
          <CaptureOverlay
            onCapture={handleCapture}
            onClose={handleClose}
            isCapturing={isCapturing}
            locationStatus={locationStatus}
            locationCoords={locationCoords}
            locationError={locationError}
          />
        </div>

        {captureError && (
          <div className="p-3 bg-red-900/60 border-t border-red-500/40 text-red-200 text-xs text-center font-medium">
            {captureError}
          </div>
        )}
      </GlassPanel>
    </div>
  );
};
