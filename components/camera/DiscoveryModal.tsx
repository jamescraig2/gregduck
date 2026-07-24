import React from 'react';
import { GlassPanel } from '../ui/GlassPanel';

export interface DiscoveryModalProps {
  isOpen: boolean;
  onClose: () => void;
  animal: {
    id: string;
    species: string;
    name: string;
    imageUrl: string;
  };
}

export const DiscoveryModal: React.FC<DiscoveryModalProps> = ({
  isOpen,
  onClose,
  animal,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <GlassPanel
        className="w-full max-w-md p-6 flex flex-col items-center text-center space-y-4 rounded-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="headline-discovery"
      >
        <h2 id="headline-discovery" className="text-2xl font-bold text-emerald-400">
          🎉 New Discovery!
        </h2>
        {animal.imageUrl && (
          <img
            src={animal.imageUrl}
            alt={animal.name}
            className="w-48 h-48 object-cover rounded-xl shadow-md border border-slate-700"
          />
        )}
        <div className="space-y-1">
          <h3 className="text-xl font-semibold text-slate-100">{animal.name}</h3>
          <p className="text-sm text-slate-400 italic">{animal.species}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="w-full py-2.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-slate-950 font-semibold transition-colors shadow-lg shadow-emerald-500/20"
        >
          Woohoo!
        </button>
      </GlassPanel>
    </div>
  );
};
