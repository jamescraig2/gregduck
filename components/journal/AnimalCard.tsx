import React, { useState } from 'react';
import { GlassCard } from '../ui/GlassCard';

export interface JournalEntry {
  encounterId: string;
  animalId: string;
  name: string;
  species: string;
  discoveredAt: string;
  photoUrl: string | null;
  isFirstDiscovery: boolean;
}

export interface AnimalCardProps {
  entry: JournalEntry;
}

export function formatRelativeTime(dateString: string): string {
  if (!dateString) return '';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return dateString;

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHours = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSec < 60) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  });
}

export const AnimalCard: React.FC<AnimalCardProps> = ({ entry }) => {
  const [imageError, setImageError] = useState(false);

  const hasPhoto = Boolean(entry.photoUrl) && !imageError;

  return (
    <GlassCard className="animal-card">
      <div className="animal-card-hero">
        {hasPhoto ? (
          <img
            src={entry.photoUrl!}
            alt={entry.name}
            onError={() => setImageError(true)}
            className="animal-card-image"
          />
        ) : (
          <div className="animal-card-fallback" data-testid="fallback-image">
            <svg
              className="animal-fallback-icon"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <span className="fallback-label">No Photo</span>
          </div>
        )}

        {entry.isFirstDiscovery && (
          <div className="badge-first-discovery" data-testid="first-discovery-badge">
            🌟 First Discovery
          </div>
        )}
      </div>

      <div className="animal-card-body">
        <div className="animal-card-header">
          <h3 className="animal-name">{entry.name}</h3>
          <span className="animal-species-badge">{entry.species}</span>
        </div>

        <div className="animal-card-footer">
          <span className="animal-timestamp" title={entry.discoveredAt}>
            {formatRelativeTime(entry.discoveredAt)}
          </span>
        </div>
      </div>
    </GlassCard>
  );
};
