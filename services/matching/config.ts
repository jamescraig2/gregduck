export const DEFAULT_SPECIES_SATURATION_LIMIT = 3;

export const SPECIES_SATURATION_LIMITS: Record<string, number> = {};

export function getSpeciesSaturationLimit(species: string): number {
  const normalizedSpecies = species.trim().toLowerCase();
  return SPECIES_SATURATION_LIMITS[normalizedSpecies] ?? DEFAULT_SPECIES_SATURATION_LIMIT;
}
