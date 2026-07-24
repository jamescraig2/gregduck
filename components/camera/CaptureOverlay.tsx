import React from 'react';
import { GeoCoords } from '../../lib/location';

export interface CaptureOverlayProps {
  onCapture: () => void;
  onClose: () => void;
  isCapturing: boolean;
  locationStatus: 'idle' | 'locating' | 'ready' | 'error';
  locationCoords?: GeoCoords | null;
  locationError?: string | null;
  className?: string;
}

export const CaptureOverlay: React.FC<CaptureOverlayProps> = ({
  onCapture,
  onClose,
  isCapturing,
  locationStatus,
  locationCoords,
  locationError,
  className = '',
}) => {
  const isShutterDisabled = isCapturing || locationStatus === 'locating';

  const renderLocationBadge = () => {
    switch (locationStatus) {
      case 'locating':
        return (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900/70 border border-slate-700/50 text-slate-300 text-xs backdrop-blur-md">
            <svg className="animate-spin h-3.5 w-3.5 text-emerald-400" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <span>Locating...</span>
          </div>
        );
      case 'ready':
        return (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900/70 border border-emerald-500/30 text-emerald-400 text-xs font-mono backdrop-blur-md">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>
              {locationCoords
                ? `${locationCoords.latitude.toFixed(4)}°, ${locationCoords.longitude.toFixed(4)}°`
                : 'GPS Ready'}
            </span>
          </div>
        );
      case 'error':
        return (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900/70 border border-amber-500/30 text-amber-400 text-xs backdrop-blur-md">
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            <span>{locationError || 'Location unavailable'}</span>
          </div>
        );
      case 'idle':
      default:
        return (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900/70 border border-slate-700/50 text-slate-400 text-xs backdrop-blur-md">
            <span>Location pending</span>
          </div>
        );
    }
  };

  return (
    <div className={`absolute inset-0 pointer-events-none flex flex-col justify-between p-4 z-20 ${className}`.trim()}>
      {/* Top bar controls */}
      <div className="flex items-center justify-between w-full pointer-events-auto">
        <div className="location-pill">{renderLocationBadge()}</div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close camera"
          className="p-2.5 rounded-full bg-slate-900/70 text-slate-300 hover:text-white border border-slate-700/50 backdrop-blur-md transition-all hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-emerald-400"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Bottom shutter control */}
      <div className="flex justify-center items-center pb-2 pointer-events-auto">
        <div className="relative flex items-center justify-center w-16 h-16">
          <button
            type="button"
            onClick={onCapture}
            disabled={isShutterDisabled}
            aria-label="Take photo"
            className={`w-16 h-16 rounded-full border-4 flex items-center justify-center transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-emerald-400/50 ${
              isShutterDisabled
                ? 'border-slate-500/50 bg-slate-700/40 cursor-not-allowed opacity-60'
                : 'border-white bg-white/20 hover:bg-white/40 active:scale-95 hover:border-emerald-400'
            }`}
          >
            {isCapturing ? (
              <svg className="animate-spin h-7 w-7 text-emerald-400" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            ) : (
              <span className={`w-11 h-11 rounded-full transition-transform ${isShutterDisabled ? 'bg-slate-400/50' : 'bg-white'}`} />
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
