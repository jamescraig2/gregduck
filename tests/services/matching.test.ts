import { describe, it, expect, beforeEach } from 'vitest';
import {
  ProximityMatchingStrategy,
  getSpeciesSaturationLimit,
  DEFAULT_SPECIES_SATURATION_LIMIT,
  SPECIES_SATURATION_LIMITS,
  MatchingParams,
} from '../../services/matching';
import { latLngToH3Index, getLocalZone } from '../../services/location/h3';
import { Animal } from '../../lib';

describe('Matching Service', () => {
  const sfLat = 37.7749;
  const sfLng = -122.4194;
  const centerH3 = latLngToH3Index(sfLat, sfLng);
  const localZone = getLocalZone(centerH3);

  describe('getSpeciesSaturationLimit & config', () => {
    beforeEach(() => {
      // Clear custom limits between tests
      for (const key in SPECIES_SATURATION_LIMITS) {
        delete SPECIES_SATURATION_LIMITS[key];
      }
    });

    it('should return DEFAULT_SPECIES_SATURATION_LIMIT (3) by default', () => {
      expect(getSpeciesSaturationLimit('Mallard')).toBe(DEFAULT_SPECIES_SATURATION_LIMIT);
      expect(getSpeciesSaturationLimit('  Canary ')).toBe(3);
    });

    it('should respect custom saturation limits in SPECIES_SATURATION_LIMITS', () => {
      SPECIES_SATURATION_LIMITS['mallard'] = 5;
      expect(getSpeciesSaturationLimit('Mallard')).toBe(5);
      expect(getSpeciesSaturationLimit('MALLARD ')).toBe(5);
      expect(getSpeciesSaturationLimit('Pigeon')).toBe(3);
    });
  });

  describe('ProximityMatchingStrategy', () => {
    const strategy = new ProximityMatchingStrategy();

    const mockAnimal = (
      id: string,
      species: string,
      lat: number,
      lng: number,
      h3Idx: string,
    ): Animal => ({
      id,
      name: `Animal-${id}`,
      species,
      backstory: 'Mock backstory',
      photoUrl: 'https://example.com/photo.jpg',
      discovererId: 'user_1',
      h3Index: h3Idx,
      latitude: lat,
      longitude: lng,
      createdAt: new Date(),
    });

    it('should throw error for invalid latitude, longitude, or h3Index', async () => {
      const baseParams: MatchingParams = {
        userId: 'user_1',
        species: 'Duck',
        latitude: sfLat,
        longitude: sfLng,
        h3Index: centerH3,
        photoUrl: 'https://example.com/duck.jpg',
        existingAnimalsInZone: [],
      };

      await expect(strategy.match({ ...baseParams, latitude: 100 })).rejects.toThrow(
        /Invalid latitude/,
      );
      await expect(strategy.match({ ...baseParams, longitude: -200 })).rejects.toThrow(
        /Invalid longitude/,
      );
      await expect(strategy.match({ ...baseParams, h3Index: 'invalid_h3' })).rejects.toThrow(
        /Invalid H3 cell index/,
      );
    });

    it('should return isNewDiscovery: true when count of existing animals in zone < saturation limit', async () => {
      const existing: Animal[] = [
        mockAnimal('1', 'Duck', sfLat + 0.0001, sfLng + 0.0001, centerH3),
        mockAnimal('2', 'Duck', sfLat + 0.0002, sfLng + 0.0002, centerH3),
      ];

      const params: MatchingParams = {
        userId: 'user_1',
        species: 'Duck',
        latitude: sfLat,
        longitude: sfLng,
        h3Index: centerH3,
        photoUrl: 'https://example.com/duck.jpg',
        existingAnimalsInZone: existing,
      };

      const result = await strategy.match(params);
      expect(result.isNewDiscovery).toBe(true);
      expect(result.matchedAnimal).toBeNull();
    });

    it('should ignore animals outside the 7-cell local zone or with different species', async () => {
      // Cell outside 7-cell neighborhood
      const farLat = 40.7128;
      const farLng = -74.006;
      const farH3 = latLngToH3Index(farLat, farLng);

      const existing: Animal[] = [
        mockAnimal('1', 'Duck', sfLat + 0.0001, sfLng + 0.0001, centerH3),
        mockAnimal('2', 'Duck', sfLat + 0.0002, sfLng + 0.0002, centerH3),
        mockAnimal('3', 'Duck', farLat, farLng, farH3), // Far animal
        mockAnimal('4', 'Goose', sfLat + 0.0001, sfLng + 0.0001, centerH3), // Different species
      ];

      const params: MatchingParams = {
        userId: 'user_1',
        species: 'Duck',
        latitude: sfLat,
        longitude: sfLng,
        h3Index: centerH3,
        photoUrl: 'https://example.com/duck.jpg',
        existingAnimalsInZone: existing,
      };

      // Only 2 matching ducks in local zone, saturation limit is 3 -> New Discovery
      const result = await strategy.match(params);
      expect(result.isNewDiscovery).toBe(true);
      expect(result.matchedAnimal).toBeNull();
    });

    it('should return isNewDiscovery: false and the closest matchedAnimal when count >= saturation limit', async () => {
      // 3 matching ducks in local zone (center cell or neighbor cell in localZone)
      const neighborH3 = localZone[1];

      const animalFar = mockAnimal('far', 'Duck', sfLat + 0.005, sfLng + 0.005, centerH3);
      const animalClosest = mockAnimal('closest', 'Duck', sfLat + 0.0001, sfLng + 0.0001, centerH3);
      const animalMid = mockAnimal('mid', 'Duck', sfLat + 0.001, sfLng + 0.001, neighborH3);

      const existing: Animal[] = [animalFar, animalMid, animalClosest];

      const params: MatchingParams = {
        userId: 'user_1',
        species: 'DUCK ', // uppercase + trailing space
        latitude: sfLat,
        longitude: sfLng,
        h3Index: centerH3,
        photoUrl: 'https://example.com/duck.jpg',
        existingAnimalsInZone: existing,
      };

      const result = await strategy.match(params);
      expect(result.isNewDiscovery).toBe(false);
      expect(result.matchedAnimal).not.toBeNull();
      expect(result.matchedAnimal?.id).toBe('closest');
    });
  });
});
