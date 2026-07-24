import { describe, it, expect } from 'vitest';
import type { MarkerData } from '../types';

describe('Types Export Verification', () => {
  it('exports MarkerData interface with expected properties', () => {
    const sampleMarker: MarkerData = {
      id: 'marker-123',
      name: 'Greg The Duck',
      species: 'Mallard',
      lat: 41.8781,
      lng: -87.6298,
      h3Index: '882a1072b7fffff',
      lastEncounteredAt: '2026-07-24T09:00:00Z',
      imageUrl: 'https://example.com/greg.jpg',
    };

    expect(sampleMarker.id).toBe('marker-123');
    expect(sampleMarker.name).toBe('Greg The Duck');
    expect(sampleMarker.species).toBe('Mallard');
    expect(sampleMarker.lat).toBe(41.8781);
    expect(sampleMarker.lng).toBe(-87.6298);
    expect(sampleMarker.h3Index).toBe('882a1072b7fffff');
    expect(sampleMarker.lastEncounteredAt).toBe('2026-07-24T09:00:00Z');
    expect(sampleMarker.imageUrl).toBe('https://example.com/greg.jpg');
  });
});
