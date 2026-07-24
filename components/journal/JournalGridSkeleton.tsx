import React from 'react';
import { GlassCard } from '../ui/GlassCard';
import { Skeleton } from '../ui/Skeleton';

export interface JournalGridSkeletonProps {
  count?: number;
}

export const JournalGridSkeleton: React.FC<JournalGridSkeletonProps> = ({ count = 8 }) => {
  return (
    <div className="journal-grid" data-testid="journal-grid-skeleton">
      {Array.from({ length: count }).map((_, idx) => (
        <GlassCard key={idx} hoverEffect={false} className="animal-card skeleton-card">
          <Skeleton height={180} width="100%" borderRadius="8px 8px 0 0" />
          <div className="animal-card-body">
            <div className="skeleton-line-wrap">
              <Skeleton height={22} width="60%" />
              <Skeleton height={18} width="35%" borderRadius={12} />
            </div>
            <div className="skeleton-footer-wrap">
              <Skeleton height={14} width="40%" />
            </div>
          </div>
        </GlassCard>
      ))}
    </div>
  );
};
