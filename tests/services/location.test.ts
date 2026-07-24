import { describe, it, expect } from 'vitest';
import {
  latLngToH3Index,
  getLocalZone,
  isValidH3Index,
  h3IndexToLatLng,
  calculateDistanceMeters,
  DEFAULT_H3_RESOLUTION,
} from '../../services/location';

describe('Spatial Indexing Service (h3-js)', () => {
  const sfLat = 37.7749;
  const sfLng = -122.4194;

  describe('latLngToH3Index', () => {
    it('should compute resolution 9 H3 index from lat/lng coordinates', () => {
      const h3Index = latLngToH3Index(sfLat, sfLng);
      expect(h3Index).toBeTypeOf('string');
      expect(h3Index.length).toBeGreaterThan(0);
      expect(isValidH3Index(h3Index)).toBe(true);
    });

    it('should support explicit resolution parameters', () => {
      const res5Index = latLngToH3Index(sfLat, sfLng, 5);
      const res9Index = latLngToH3Index(sfLat, sfLng, DEFAULT_H3_RESOLUTION);
      expect(isValidH3Index(res5Index)).toBe(true);
      expect(isValidH3Index(res9Index)).toBe(true);
      expect(res5Index).not.toBe(res9Index);
    });

    it('should throw error for out-of-bounds latitude or longitude', () => {
      expect(() => latLngToH3Index(91, 0)).toThrow(/Invalid latitude/);
      expect(() => latLngToH3Index(-91, 0)).toThrow(/Invalid latitude/);
      expect(() => latLngToH3Index(0, 181)).toThrow(/Invalid longitude/);
      expect(() => latLngToH3Index(0, -181)).toThrow(/Invalid longitude/);
    });
  });

  describe('getLocalZone', () => {
    it('should return a 7-cell cluster array representing current cell and 6 neighbors', () => {
      const centerCell = latLngToH3Index(sfLat, sfLng);
      const localZone = getLocalZone(centerCell);

      expect(Array.isArray(localZone)).toBe(true);
      expect(localZone.length).toBe(7);
      expect(localZone).toContain(centerCell);

      const uniqueCells = new Set(localZone);
      expect(uniqueCells.size).toBe(7);

      localZone.forEach((cell) => {
        expect(isValidH3Index(cell)).toBe(true);
      });
    });

    it('should throw error when provided an invalid H3 index', () => {
      expect(() => getLocalZone('invalid_index')).toThrow(/Invalid H3 cell index/);
    });
  });

  describe('isValidH3Index', () => {
    it('should identify valid and invalid H3 cell indexes', () => {
      const validCell = latLngToH3Index(0, 0);
      expect(isValidH3Index(validCell)).toBe(true);
      expect(isValidH3Index('invalid_string')).toBe(false);
      expect(isValidH3Index('')).toBe(false);
      expect(isValidH3Index('8928308280fffff')).toBe(true);
    });
  });

  describe('h3IndexToLatLng', () => {
    it('should convert H3 index back to approximate lat/lng coordinates', () => {
      const h3Index = latLngToH3Index(sfLat, sfLng);
      const coords = h3IndexToLatLng(h3Index);

      expect(coords).toHaveProperty('latitude');
      expect(coords).toHaveProperty('longitude');
      expect(coords.latitude).toBeCloseTo(sfLat, 2);
      expect(coords.longitude).toBeCloseTo(sfLng, 2);
    });

    it('should throw error for invalid H3 index', () => {
      expect(() => h3IndexToLatLng('not_a_valid_h3_cell')).toThrow(/Invalid H3 cell index/);
    });
  });

  describe('calculateDistanceMeters', () => {
    it('should return 0 when calculating distance between identical coordinates', () => {
      const distance = calculateDistanceMeters(sfLat, sfLng, sfLat, sfLng);
      expect(distance).toBe(0);
    });

    it('should accurately calculate distance between two known lat/lng points', () => {
      // 1 degree latitude difference ~ 111.2km (111,195m with R=6371000)
      const dist = calculateDistanceMeters(0, 0, 1, 0);
      expect(dist).toBeGreaterThan(111000);
      expect(dist).toBeLessThan(112000);
    });

    it('should throw error for invalid latitude or longitude parameters', () => {
      expect(() => calculateDistanceMeters(95, 0, 0, 0)).toThrow(/Invalid latitude/);
      expect(() => calculateDistanceMeters(0, 0, -95, 0)).toThrow(/Invalid latitude/);
      expect(() => calculateDistanceMeters(0, -200, 0, 0)).toThrow(/Invalid longitude/);
      expect(() => calculateDistanceMeters(0, 0, 0, 200)).toThrow(/Invalid longitude/);
    });
  });
});
