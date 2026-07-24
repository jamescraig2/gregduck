import React from 'react';
import { GlassPanel } from '../ui/GlassPanel';

export interface EncounterModalProps {
  isOpen: boolean;
  onClose: () => void;
  animal: {
    id: string;
    species: string;
    name: string;
    imageUrl: string;
  };
  encounter: {
    id: string;
    capturedAt: string;
  };
}

export const EncounterModal: React.FC<EncounterModalProps> = ({
  isOpen,
  onClose,
  animal,
  encounter,
}) => {
  if (!isOpen) return null;

  const formattedDate = new Date(encounter.capturedAt).toLocaleDateString();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <GlassPanel
        className="w-full max-w-md p-6 flex flex-col items-center text-center space-y-4 rounded-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="headline-encounter"
      >
        <h2 id="headline-encounter" className="text-2xl font-bold text-sky-400">
          👋 You've seen {animal.name} before!
        </h2>
        {animal.imageUrl && (
          <img
            src={animal.imageUrl}
            alt={animal.name}
            className="w-48 h-48 object-cover rounded-xl shadow-md border border-slate-700"
          />
        )}
        <div className="space-y-1">
          <h3 className="text-xl font-semibold text-slate-100">{animal.species}</h3>
          <p className="text-sm text-slate-400">
            Last seen on <span className="font-medium text-slate-300">{formattedDate}</span>
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="w-full py-2.5 px-4 rounded-xl bg-sky-500 hover:bg-sky-600 active:bg-sky-700 text-slate-950 font-semibold transition-colors shadow-lg shadow-sky-500/20"
        >
          Got it
        </button>
      </GlassPanel>
    </div>
  );
};
