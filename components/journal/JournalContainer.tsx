'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { JournalHeader } from './JournalHeader';
import { AnimalCard, JournalEntry } from './AnimalCard';
import { JournalGridSkeleton } from './JournalGridSkeleton';
import { GlassPanel } from '../ui/GlassPanel';

export const JournalContainer: React.FC = () => {
  const router = useRouter();
  const searchParams = useSearchParams();

  const initialTab = (searchParams.get('tab') as 'discoveries' | 'all') || 'discoveries';
  const initialSearch = searchParams.get('search') || '';
  const initialSpecies = searchParams.get('species') || '';
  const initialPage = parseInt(searchParams.get('page') || '1', 10);

  const [tab, setTab] = useState<'discoveries' | 'all'>(initialTab);
  const [search, setSearch] = useState(initialSearch);
  const [species, setSpecies] = useState(initialSpecies);
  const [page, setPage] = useState(initialPage);

  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isFetchingNextPage, setIsFetchingNextPage] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const observerRef = useRef<HTMLDivElement | null>(null);

  const updateQueryParams = useCallback(
    (newTab: 'discoveries' | 'all', newSearch: string, newSpecies: string, newPage: number) => {
      const params = new URLSearchParams();
      if (newTab && newTab !== 'discoveries') params.set('tab', newTab);
      if (newSearch) params.set('search', newSearch);
      if (newSpecies) params.set('species', newSpecies);
      if (newPage > 1) params.set('page', newPage.toString());

      const queryString = params.toString();
      const newPath = queryString ? `/journal?${queryString}` : '/journal';
      router.push(newPath);
    },
    [router]
  );

  const fetchEntries = useCallback(
    async (currentPage: number, append: boolean = false) => {
      if (append) {
        setIsFetchingNextPage(true);
      } else {
        setIsLoading(true);
      }
      setError(null);

      try {
        const query = new URLSearchParams({
          tab,
          search,
          species,
          page: currentPage.toString(),
          limit: '20',
        });

        const res = await fetch(`/api/journal?${query.toString()}`);
        if (!res.ok) {
          throw new Error(`Failed to load journal entries (${res.status})`);
        }

        const data = await res.json();
        const fetchedEntries: JournalEntry[] = data.entries || data.data || [];
        const fetchedTotalPages = data.totalPages || data.meta?.totalPages || 1;

        setTotalPages(fetchedTotalPages);
        if (append) {
          setEntries((prev) => [...prev, ...fetchedEntries]);
        } else {
          setEntries(fetchedEntries);
        }
      } catch (err: any) {
        setError(err.message || 'An error occurred while fetching discoveries.');
      } finally {
        setIsLoading(false);
        setIsFetchingNextPage(false);
      }
    },
    [tab, search, species]
  );

  const handleTabChange = (newTab: 'discoveries' | 'all') => {
    setTab(newTab);
    setPage(1);
    updateQueryParams(newTab, search, species, 1);
  };

  const handleSearchChange = (newSearch: string) => {
    setSearch(newSearch);
    setPage(1);
    updateQueryParams(tab, newSearch, species, 1);
  };

  const handleSpeciesChange = (newSpecies: string) => {
    setSpecies(newSpecies);
    setPage(1);
    updateQueryParams(tab, search, newSpecies, 1);
  };

  const handleResetFilters = () => {
    setTab('discoveries');
    setSearch('');
    setSpecies('');
    setPage(1);
    updateQueryParams('discoveries', '', '', 1);
  };

  useEffect(() => {
    fetchEntries(1, false);
  }, [tab, search, species, fetchEntries]);

  useEffect(() => {
    if (isLoading || isFetchingNextPage || page >= totalPages) return;

    if (typeof window === 'undefined' || !('IntersectionObserver' in window)) return;

    const observer = new IntersectionObserver(
      (observerEntries) => {
        if (observerEntries[0].isIntersecting) {
          const nextPage = page + 1;
          setPage(nextPage);
          updateQueryParams(tab, search, species, nextPage);
          fetchEntries(nextPage, true);
        }
      },
      { threshold: 0.5 }
    );

    const currentObserverRef = observerRef.current;
    if (currentObserverRef) {
      observer.observe(currentObserverRef);
    }

    return () => {
      if (currentObserverRef) {
        observer.unobserve(currentObserverRef);
      }
    };
  }, [isLoading, isFetchingNextPage, page, totalPages, tab, search, species, updateQueryParams, fetchEntries]);

  return (
    <div className="journal-container">
      <JournalHeader
        tab={tab}
        search={search}
        species={species}
        onTabChange={handleTabChange}
        onSearchChange={handleSearchChange}
        onSpeciesChange={handleSpeciesChange}
      />

      {error ? (
        <GlassPanel className="journal-error-state">
          <h2>Error Loading Journal</h2>
          <p>{error}</p>
          <button type="button" onClick={() => fetchEntries(1, false)} className="journal-retry-btn">
            Try Again
          </button>
        </GlassPanel>
      ) : isLoading ? (
        <JournalGridSkeleton count={8} />
      ) : entries.length === 0 ? (
        <GlassPanel className="journal-empty-state">
          <h2>No Animal Discoveries Found</h2>
          <p>No animal discoveries found matching your search criteria.</p>
          <button type="button" onClick={handleResetFilters} className="journal-reset-btn">
            Reset Filters
          </button>
        </GlassPanel>
      ) : (
        <>
          <div className="journal-grid">
            {entries.map((entry) => (
              <AnimalCard key={entry.encounterId || entry.animalId} entry={entry} />
            ))}
          </div>

          {page < totalPages && (
            <div ref={observerRef} className="journal-sentinel" data-testid="infinite-scroll-sentinel">
              {isFetchingNextPage && <div className="spinner" aria-label="Loading more..." />}
            </div>
          )}
        </>
      )}
    </div>
  );
};
