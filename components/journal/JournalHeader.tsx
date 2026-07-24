import React from 'react';
import { GlassPanel } from '../ui/GlassPanel';

export interface JournalHeaderProps {
  tab: 'discoveries' | 'all';
  search: string;
  species: string;
  onTabChange: (tab: 'discoveries' | 'all') => void;
  onSearchChange: (search: string) => void;
  onSpeciesChange: (species: string) => void;
}

export const JournalHeader: React.FC<JournalHeaderProps> = ({
  tab,
  search,
  species,
  onTabChange,
  onSearchChange,
  onSpeciesChange,
}) => {
  return (
    <GlassPanel className="journal-header-panel">
      <div className="journal-header-top">
        <div>
          <h1 className="journal-title">Discovery Journal</h1>
          <p className="journal-subtitle">Explore your wildlife catalog and encounter history.</p>
        </div>

        <div className="journal-tabs" role="tablist" aria-label="Journal tabs">
          <button
            role="tab"
            type="button"
            aria-selected={tab === 'discoveries'}
            onClick={() => onTabChange('discoveries')}
            className={`journal-tab-btn ${tab === 'discoveries' ? 'active' : ''}`}
          >
            My Discoveries
          </button>
          <button
            role="tab"
            type="button"
            aria-selected={tab === 'all'}
            onClick={() => onTabChange('all')}
            className={`journal-tab-btn ${tab === 'all' ? 'active' : ''}`}
          >
            All Encountered Animals
          </button>
        </div>
      </div>

      <div className="journal-header-controls">
        <div className="journal-search-wrap">
          <input
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search animals..."
            aria-label="Search animals"
            className="journal-input"
          />
        </div>

        <div className="journal-species-wrap">
          <input
            type="text"
            value={species}
            onChange={(e) => onSpeciesChange(e.target.value)}
            placeholder="Filter by species..."
            aria-label="Filter by species"
            className="journal-input"
          />
        </div>
      </div>
    </GlassPanel>
  );
};
