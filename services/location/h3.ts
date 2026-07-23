import { latLngToCell, gridDisk, isValidCell, cellToLatLng } from 'h3-js';

export const DEFAULT_H3_RESOLUTION = 9;

/**
 * Computes the H3 hexagonal cell index for a given latitude and longitude at resolution 9 (or custom resolution).
 */
export function latLngToH3Index(
  latitude: number,
  longitude: number,
  resolution: number = DEFAULT_H3_RESOLUTION,
): string {
  if (latitude < -90 || latitude > 90) {
    throw new Error(`Invalid latitude: ${latitude}. Must be between -90 and 90.`);
  }
  if (longitude < -180 || longitude > 180) {
    throw new Error(`Invalid longitude: ${longitude}. Must be between -180 and 180.`);
  }
  return latLngToCell(latitude, longitude, resolution);
}

/**
 * Returns the 7-cell local zone cluster (the center cell + 6 adjacent k=1 neighbors) for a given H3 cell index.
 */
export function getLocalZone(h3Index: string): string[] {
  if (!isValidH3Index(h3Index)) {
    throw new Error(`Invalid H3 cell index: ${h3Index}`);
  }
  return gridDisk(h3Index, 1);
}

/**
 * Validates whether a given string is a valid H3 cell index.
 */
export function isValidH3Index(h3Index: string): boolean {
  if (typeof h3Index !== 'string' || !h3Index.trim()) {
    return false;
  }
  return isValidCell(h3Index);
}

/**
 * Converts an H3 cell index back into latitude and longitude coordinates.
 */
export function h3IndexToLatLng(h3Index: string): { latitude: number; longitude: number } {
  if (!isValidH3Index(h3Index)) {
    throw new Error(`Invalid H3 cell index: ${h3Index}`);
  }
  const [latitude, longitude] = cellToLatLng(h3Index);
  return { latitude, longitude };
}
