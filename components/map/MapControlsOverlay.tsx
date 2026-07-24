'use client';

import React from 'react';
import { GlassPanel } from '../ui/GlassPanel';

export interface MapControlsOverlayProps {
  onRecenter: () => void;
  onQuickCapture: () => void;
  selectedSpecies: string;
  onSelectSpecies: (species: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  toastMessage?: string | null;
  onCloseToast?: () => void;
}

const SPECIES_OPTIONS = [
  { id: 'all', label: 'All' },
  { id: 'duck', label: 'Duck' },
  { id: 'squirrel', label: 'Squirrel' },
  { id: 'rabbit', label: 'Rabbit' },
  { id: 'bird', label: 'Bird' },
  { id: 'goose', label: 'Goose' },
];

export const MapControlsOverlay: React.FC<MapControlsOverlayProps> = ({
  onRecenter,
  onQuickCapture,
  selectedSpecies,
  onSelectSpecies,
  searchQuery,
  onSearchChange,
  toastMessage,
  onCloseToast,
}) => {
  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-4 z-10">
      {/* Top Bar: Search & Species Filters */}
      <div className="w-full max-w-xl mx-auto flex flex-col gap-2 pointer-events-auto">
        <GlassPanel className="bg-slate-900/80 backdrop-blur-md border border-slate-700/60 rounded-xl p-2 flex items-center gap-2 shadow-lg">
          <svg
            className="w-5 h-5 text-slate-400 ml-2 flex-shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            type="text"
            placeholder="Search species or location..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="bg-transparent text-slate-100 placeholder-slate-400 text-sm focus:outline-none w-full px-2 py-1"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              className="text-slate-400 hover:text-slate-200 p-1"
              aria-label="Clear search"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          )}
        </GlassPanel>

        {/* Species Filter Chips */}
        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
          {SPECIES_OPTIONS.map((chip) => {
            const isSelected = selectedSpecies.toLowerCase() === chip.id.toLowerCase();
            return (
              <button
                key={chip.id}
                type="button"
                onClick={() => onSelectSpecies(chip.id)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all shadow-md backdrop-blur-md ${
                  isSelected
                    ? 'bg-emerald-500 text-slate-950 font-semibold shadow-emerald-500/20'
                    : 'bg-slate-900/80 border border-slate-700/60 text-slate-300 hover:bg-slate-800/80 hover:text-white'
                }`}
              >
                {chip.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Toast Notification Alert */}
      {toastMessage && (
        <div className="absolute top-20 left-1/2 transform -translate-x-1/2 w-full max-w-md px-4 pointer-events-auto z-20">
          <div className="bg-red-900/90 border border-red-500/60 backdrop-blur-md text-red-100 text-sm rounded-xl px-4 py-3 shadow-xl flex items-center justify-between gap-3">
            <span>{toastMessage}</span>
            {onCloseToast && (
              <button
                type="button"
                onClick={onCloseToast}
                className="text-red-300 hover:text-white p-1"
                aria-label="Close notification"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Bottom Right FABs */}
      <div className="flex flex-col items-end gap-3 self-end pointer-events-auto">
        {/* Recenter Location Button */}
        <button
          type="button"
          onClick={onRecenter}
          aria-label="Recenter location"
          className="w-12 h-12 rounded-full bg-slate-900/80 backdrop-blur-md border border-slate-700/60 text-slate-200 hover:text-white hover:bg-slate-800 flex items-center justify-center shadow-lg transition-transform active:scale-95"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
        </button>

        {/* Quick Capture Camera FAB */}
        <button
          type="button"
          onClick={onQuickCapture}
          aria-label="Quick capture animal"
          className="w-14 h-14 rounded-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 flex items-center justify-center shadow-xl transition-transform active:scale-95 font-bold"
        >
          <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
        </button>
      </div>
    </div>
  );
};
