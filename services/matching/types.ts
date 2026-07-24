import { Animal } from '@/lib';

export interface MatchingResult {
  isNewDiscovery: boolean;
  matchedAnimal: Animal | null;
}

export interface MatchingParams {
  userId: string;
  species: string;
  latitude: number;
  longitude: number;
  h3Index: string;
  photoUrl: string;
  existingAnimalsInZone: Animal[];
}

export interface AnimalMatchingStrategy {
  match(params: MatchingParams): Promise<MatchingResult>;
}
