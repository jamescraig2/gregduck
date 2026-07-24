'use client';

import { FC, useRef } from 'react';
import Link from 'next/link';
import { MarkerData } from '@/types';
import { calculateDistanceMeters } from '@/services/location/h3';

export interface AnimalTeaserDrawerProps {
  animal: MarkerData | null;
  onClose?: () => void;
  userPosition?: { lat: number; lng: number } | null;
}

export const AnimalTeaserDrawer: FC<AnimalTeaserDrawerProps> = ({
  animal,
  onClose,
  userPosition,
}) => {
  const touchStartYRef = useRef<number | null>(null);

  if (!animal) return null;

  let distanceText: string | null = null;
  if (
    userPosition &&
    typeof userPosition.lat === 'number' &&
    typeof userPosition.lng === 'number'
  ) {
    try {
      const distM = calculateDistanceMeters(
        userPosition.lat,
        userPosition.lng,
        animal.lat,
        animal.lng,
      );
      distanceText =
        distM < 1000 ? `${Math.round(distM)} m away` : `${(distM / 1000).toFixed(1)} km away`;
    } catch {
      distanceText = null;
    }
  }

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length > 0) {
      touchStartYRef.current = e.touches[0].clientY;
    }
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    if (touchStartYRef.current !== null && e.changedTouches.length > 0) {
      const deltaY = e.changedTouches[0].clientY - touchStartYRef.current;
      if (deltaY > 60) {
        onClose?.();
      }
      touchStartYRef.current = null;
    }
  };

  return (
    <>
      {/* Semi-transparent backdrop overlay */}
      <div
        className="fixed inset-0 bg-black/40 z-40"
        onClick={onClose}
        data-testid="teaser-backdrop"
      />

      {/* Bottom sheet teaser drawer */}
      <div
        className="fixed bottom-0 left-0 right-0 z-50 p-4 max-h-[33vh] glass-panel bg-slate-900/90 text-white rounded-t-2xl shadow-2xl transition-transform duration-300 ease-out"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        data-testid="teaser-drawer"
      >
        {/* Touch drag handle */}
        <div
          className="w-12 h-1.5 bg-slate-600 rounded-full mx-auto mb-3 cursor-grab"
          data-testid="drag-handle"
        />

        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            {animal.imageUrl ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={animal.imageUrl}
                alt={animal.name}
                className="w-16 h-16 rounded-xl object-cover flex-shrink-0"
              />
            ) : (
              <div className="w-16 h-16 rounded-xl bg-slate-800 flex items-center justify-center text-2xl flex-shrink-0">
                🐾
              </div>
            )}

            <div className="min-w-0">
              <h3 className="text-lg font-bold text-white truncate">{animal.name}</h3>
              <p className="text-sm text-slate-300 truncate">{animal.species}</p>
              {distanceText && (
                <p
                  className="text-xs text-emerald-400 font-medium mt-0.5"
                  data-testid="distance-text"
                >
                  {distanceText}
                </p>
              )}
              {animal.lastEncounteredAt && (
                <p className="text-xs text-slate-400 mt-0.5">Spotted: {animal.lastEncounteredAt}</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <Link
              href={`/animals/${animal.id}`}
              className="px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg transition-colors"
            >
              View Details
            </Link>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white transition-colors"
              aria-label="Close"
            >
              ✕
            </button>
          </div>
        </div>
      </div>
    </>
  );
};
