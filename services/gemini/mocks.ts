import { GeminiAnimalAnalysisResponse } from './client';

export const mockSquirrelResponse: GeminiAnimalAnalysisResponse = {
  isAnimal: true,
  species: 'Eastern Gray Squirrel',
  name: 'Nutty',
  backstory: 'Loves hoarding acorns in campus parks.',
  confidence: 0.95,
};

export const mockDuckResponse: GeminiAnimalAnalysisResponse = {
  isAnimal: true,
  species: 'Mallard Duck',
  name: 'Quackers',
  backstory: 'Enjoys swimming in campus ponds.',
  confidence: 0.98,
};

export const mockNotAnimalResponse: GeminiAnimalAnalysisResponse = {
  isAnimal: false,
  species: null,
  name: null,
  backstory: null,
  reasoning: 'Image contains a park bench, no animals detected.',
};

export const mockGeminiNetworkError = new Error(
  'Gemini API network request failed: connection timeout / rate limit',
);

export async function getMockGeminiResponse(
  scenario: 'squirrel' | 'duck' | 'not_animal' | 'error',
): Promise<GeminiAnimalAnalysisResponse> {
  switch (scenario) {
    case 'squirrel':
      return mockSquirrelResponse;
    case 'duck':
      return mockDuckResponse;
    case 'not_animal':
      return mockNotAnimalResponse;
    case 'error':
      throw mockGeminiNetworkError;
    default: {
      const _exhaustiveCheck: never = scenario;
      throw new Error(`Unhandled scenario: ${_exhaustiveCheck}`);
    }
  }
}
