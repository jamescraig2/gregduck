import React, { useEffect } from 'react';
import { GlassCard } from '../ui/GlassCard';
import { Skeleton } from '../ui/Skeleton';

export interface CameraViewfinderProps {
  stream: MediaStream | null;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  isLoading?: boolean;
  error?: string | null;
  className?: string;
}

export const CameraViewfinder: React.FC<CameraViewfinderProps> = ({
  stream,
  videoRef,
  isLoading = false,
  error = null,
  className = '',
}) => {
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
    }
  }, [stream, videoRef]);

  const showSkeleton = isLoading || (!stream && !error);

  return (
    <GlassCard hoverEffect={false} className={`relative overflow-hidden w-full h-full min-h-[300px] flex items-center justify-center bg-black/40 ${className}`.trim()}>
      {showSkeleton && (
        <div className="absolute inset-0 flex flex-col items-center justify-center p-4 gap-3 z-10 bg-slate-900/60 backdrop-blur-sm">
          <Skeleton width="100%" height="100%" borderRadius="0.75rem" />
          <span className="absolute text-slate-300 font-medium text-sm animate-pulse">Initializing camera...</span>
        </div>
      )}

      {error ? (
        <div className="flex flex-col items-center justify-center text-center p-6 text-red-400 gap-2 z-10">
          <svg className="w-10 h-10 stroke-current text-red-400" fill="none" viewBox="0 0 24 24" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
          <span className="font-semibold text-base">Camera Error</span>
          <p className="text-sm text-slate-300 max-w-xs">{error}</p>
        </div>
      ) : (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={`w-full h-full object-cover transition-opacity duration-300 ${stream ? 'opacity-100' : 'opacity-0'}`}
        />
      )}
    </GlassCard>
  );
};
