import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import React from 'react';
import { JournalContainer } from '../components/journal/JournalContainer';
import { AnimalCard, JournalEntry } from '../components/journal/AnimalCard';
import { JournalGridSkeleton } from '../components/journal/JournalGridSkeleton';

const mockPush = vi.fn();
let mockSearchParams = new Map<string, string>();

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
  useSearchParams: () => ({
    get: (key: string) => mockSearchParams.get(key) || null,
  }),
}));

const mockEntries: JournalEntry[] = [
  {
    encounterId: 'enc_1',
    animalId: 'anim_1',
    name: 'Mallard Duck',
    species: 'Anas platyrhynchos',
    discoveredAt: new Date(Date.now() - 3600000).toISOString(),
    photoUrl: 'https://example.com/mallard.jpg',
    isFirstDiscovery: true,
  },
  {
    encounterId: 'enc_2',
    animalId: 'anim_2',
    name: 'Gray Squirrel',
    species: 'Sciurus carolinensis',
    discoveredAt: new Date(Date.now() - 86400000).toISOString(),
    photoUrl: null,
    isFirstDiscovery: false,
  },
];

describe('Journal Page & Components', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSearchParams.clear();

    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes('/api/journal')) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              entries: mockEntries,
              totalPages: 2,
              page: 1,
            }),
        } as Response);
      }
      return Promise.reject(new Error('Unknown endpoint'));
    });
  });

  it('rendersJournalPageWithHeaderAndTabs', async () => {
    await act(async () => {
      render(<JournalContainer />);
    });

    expect(screen.getByText('Discovery Journal')).toBeDefined();
    expect(screen.getByRole('tab', { name: 'My Discoveries' })).toBeDefined();
    expect(screen.getByRole('tab', { name: 'All Encountered Animals' })).toBeDefined();

    await waitFor(() => {
      expect(screen.getByText('Mallard Duck')).toBeDefined();
      expect(screen.getByText('Gray Squirrel')).toBeDefined();
    });
  });

  it('switchesTabsAndUpdatesQueryParams', async () => {
    await act(async () => {
      render(<JournalContainer />);
    });

    const allTab = screen.getByRole('tab', { name: 'All Encountered Animals' });
    await act(async () => {
      fireEvent.click(allTab);
    });

    expect(mockPush).toHaveBeenCalledWith('/journal?tab=all');
  });

  it('filtersBySearchInput', async () => {
    await act(async () => {
      render(<JournalContainer />);
    });

    const searchInput = screen.getByPlaceholderText('Search animals...');
    await act(async () => {
      fireEvent.change(searchInput, { target: { value: 'Mallard' } });
    });

    expect(mockPush).toHaveBeenCalledWith('/journal?search=Mallard');
  });

  it('rendersFallbackImageOnError', async () => {
    const entryWithBrokenPhoto: JournalEntry = {
      encounterId: 'enc_3',
      animalId: 'anim_3',
      name: 'Broken Image Bird',
      species: 'Unknownus',
      discoveredAt: new Date().toISOString(),
      photoUrl: 'https://example.com/broken.jpg',
      isFirstDiscovery: false,
    };

    render(<AnimalCard entry={entryWithBrokenPhoto} />);

    const img = screen.getByRole('img');
    fireEvent.error(img);

    await waitFor(() => {
      expect(screen.getByTestId('fallback-image')).toBeDefined();
      expect(screen.getByText('No Photo')).toBeDefined();
    });
  });

  it('rendersEmptyState', async () => {
    global.fetch = vi.fn().mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ entries: [], totalPages: 1 }),
      } as Response)
    );

    await act(async () => {
      render(<JournalContainer />);
    });

    await waitFor(() => {
      expect(screen.getByText('No Animal Discoveries Found')).toBeDefined();
      expect(screen.getByText('No animal discoveries found matching your search criteria.')).toBeDefined();
    });
  });

  it('rendersLoadingSkeleton', () => {
    render(<JournalGridSkeleton count={4} />);

    const skeletonGrid = screen.getByTestId('journal-grid-skeleton');
    expect(skeletonGrid).toBeDefined();
    const skeletons = screen.getAllByRole('status');
    expect(skeletons.length).toBeGreaterThan(0);
  });
});
