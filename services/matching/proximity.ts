import { getLocalZone, isValidH3Index, calculateDistanceMeters } from '../location/h3';
import { MatchingParams, MatchingResult, AnimalMatchingStrategy } from './types';
import { getSpeciesSaturationLimit } from './config';

export class ProximityMatchingStrategy implements AnimalMatchingStrategy {
  async match(params: MatchingParams): Promise<MatchingResult> {
    if (params.latitude < -90 || params.latitude > 90) {
      throw new Error(`Invalid latitude: ${params.latitude}. Must be between -90 and 90.`);
    }
    if (params.longitude < -180 || params.longitude > 180) {
      throw new Error(`Invalid longitude: ${params.longitude}. Must be between -180 and 180.`);
    }
    if (!isValidH3Index(params.h3Index)) {
      throw new Error(`Invalid H3 cell index: ${params.h3Index}`);
    }

    const zoneCells = new Set(getLocalZone(params.h3Index));
    const targetSpeciesNormalized = params.species.trim().toLowerCase();

    const filteredAnimals = params.existingAnimalsInZone.filter(
      (animal) =>
        zoneCells.has(animal.h3Index) &&
        animal.species.trim().toLowerCase() === targetSpeciesNormalized,
    );

    const saturationLimit = getSpeciesSaturationLimit(params.species);

    if (filteredAnimals.length < saturationLimit) {
      return {
        isNewDiscovery: true,
        matchedAnimal: null,
      };
    }

    let closestAnimal = filteredAnimals[0];
    let minDistance = calculateDistanceMeters(
      params.latitude,
      params.longitude,
      closestAnimal.latitude,
      closestAnimal.longitude,
    );

    for (let i = 1; i < filteredAnimals.length; i++) {
      const distance = calculateDistanceMeters(
        params.latitude,
        params.longitude,
        filteredAnimals[i].latitude,
        filteredAnimals[i].longitude,
      );
      if (distance < minDistance) {
        minDistance = distance;
        closestAnimal = filteredAnimals[i];
      }
    }

    return {
      isNewDiscovery: false,
      matchedAnimal: closestAnimal,
    };
  }
}
