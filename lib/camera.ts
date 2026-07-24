export type CameraErrorCode = 'NOT_SUPPORTED' | 'PERMISSION_DENIED' | 'CAPTURE_FAILED';

export class CameraError extends Error {
  constructor(public code: CameraErrorCode, message: string) {
    super(message);
    this.name = 'CameraError';
  }
}

export function isCameraSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof navigator !== 'undefined' &&
    Boolean(navigator.mediaDevices?.getUserMedia)
  );
}

const FALLBACK_CONSTRAINTS: MediaStreamConstraints[] = [
  { video: { facingMode: { ideal: 'environment' } } },
  { video: { facingMode: 'environment' } },
  { video: true },
];

export async function requestCameraStream(): Promise<MediaStream> {
  if (!isCameraSupported()) {
    throw new CameraError('NOT_SUPPORTED', 'MediaDevices getUserMedia is not supported in this environment');
  }

  let lastError: unknown;
  for (const constraints of FALLBACK_CONSTRAINTS) {
    try {
      return await navigator.mediaDevices.getUserMedia(constraints);
    } catch (err: any) {
      lastError = err;
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        throw new CameraError('PERMISSION_DENIED', 'Camera access permission was denied by the user');
      }
      // Continue to next constraint tier for OverconstrainedError or NotFoundError
    }
  }

  throw new CameraError('CAPTURE_FAILED', `Failed to acquire camera stream: ${lastError instanceof Error ? lastError.message : 'Unknown error'}`);
}

export function stopCameraStream(stream: MediaStream | null | undefined): void {
  if (!stream) return;
  stream.getTracks().forEach((track) => {
    track.stop();
  });
}

export async function captureFrameAsBlob(
  videoEl: HTMLVideoElement,
  quality: number = 0.85
): Promise<Blob> {
  const width = videoEl.videoWidth;
  const height = videoEl.videoHeight;

  if (!width || !height) {
    throw new CameraError('CAPTURE_FAILED', 'Invalid video element dimensions');
  }

  const maxW = 1920;
  const maxH = 1080;
  const scale = Math.min(1, maxW / width, maxH / height);

  const targetWidth = Math.round(width * scale);
  const targetHeight = Math.round(height * scale);

  const canvas = document.createElement('canvas');
  canvas.width = targetWidth;
  canvas.height = targetHeight;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new CameraError('CAPTURE_FAILED', 'Failed to acquire 2D canvas context');
  }

  ctx.drawImage(videoEl, 0, 0, targetWidth, targetHeight);

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new CameraError('CAPTURE_FAILED', 'Failed to generate JPEG blob from canvas'));
        }
      },
      'image/jpeg',
      quality
    );
  });
}
