import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GoogleGenerativeAI } from '@google/generative-ai';
import {
  getGeminiClient,
  analyzeAnimalImage,
  mockSquirrelResponse,
  mockDuckResponse,
  mockNotAnimalResponse,
  mockGeminiNetworkError,
  getMockGeminiResponse,
} from '../services/gemini';

describe('Gemini Client & Mocks Suite', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('getGeminiClient', () => {
    it('returns null and logs warning when GEMINI_API_KEY is not defined', () => {
      delete process.env.GEMINI_API_KEY;
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const client = getGeminiClient();

      expect(client).toBeNull();
      expect(warnSpy).toHaveBeenCalledWith(
        '[Gemini Client] GEMINI_API_KEY is not defined. Calls will fail or require mock mode.',
      );
    });

    it('returns a GoogleGenerativeAI instance when API key is provided in env', () => {
      process.env.GEMINI_API_KEY = 'test-api-key-123';

      const client = getGeminiClient();

      expect(client).not.toBeNull();
    });

    it('returns a GoogleGenerativeAI instance when API key is provided via config', () => {
      delete process.env.GEMINI_API_KEY;

      const client = getGeminiClient({ apiKey: 'config-api-key-456' });

      expect(client).not.toBeNull();
    });
  });

  describe('analyzeAnimalImage', () => {
    it('throws descriptive error when client is null', async () => {
      await expect(analyzeAnimalImage(null, 'fakeBase64Data')).rejects.toThrow(
        'Gemini client is not initialized. GEMINI_API_KEY may be missing.',
      );
    });

    it('calls generative model and parses JSON response when client is provided', async () => {
      const mockGenerateContent = vi.fn().mockResolvedValue({
        response: {
          text: () => JSON.stringify(mockSquirrelResponse),
        },
      });

      const mockGetGenerativeModel = vi.fn().mockReturnValue({
        generateContent: mockGenerateContent,
      });

      const mockClient = {
        getGenerativeModel: mockGetGenerativeModel,
      } as unknown as GoogleGenerativeAI;

      const result = await analyzeAnimalImage(mockClient, 'data:image/jpeg;base64,abc123xyz');

      expect(mockGetGenerativeModel).toHaveBeenCalledWith({
        model: 'gemini-1.5-flash',
        generationConfig: { responseMimeType: 'application/json' },
      });
      expect(mockGenerateContent).toHaveBeenCalled();
      expect(result).toEqual(mockSquirrelResponse);
    });

    it('strips markdown code fences from response text before parsing JSON', async () => {
      const mockGenerateContent = vi.fn().mockResolvedValue({
        response: {
          text: () => `\`\`\`json\n${JSON.stringify(mockDuckResponse)}\n\`\`\``,
        },
      });

      const mockGetGenerativeModel = vi.fn().mockReturnValue({
        generateContent: mockGenerateContent,
      });

      const mockClient = {
        getGenerativeModel: mockGetGenerativeModel,
      } as unknown as GoogleGenerativeAI;

      const result = await analyzeAnimalImage(mockClient, 'abc123xyz');
      expect(result).toEqual(mockDuckResponse);
    });

    it('throws a descriptive error when JSON.parse fails on invalid response', async () => {
      const mockGenerateContent = vi.fn().mockResolvedValue({
        response: {
          text: () => 'Invalid raw string response non-json',
        },
      });

      const mockGetGenerativeModel = vi.fn().mockReturnValue({
        generateContent: mockGenerateContent,
      });

      const mockClient = {
        getGenerativeModel: mockGetGenerativeModel,
      } as unknown as GoogleGenerativeAI;

      await expect(analyzeAnimalImage(mockClient, 'abc123xyz')).rejects.toThrow(
        /Failed to parse Gemini response as JSON/,
      );
    });
  });

  describe('Mock Structure Verification', () => {
    it('mockSquirrelResponse has correct structure', () => {
      expect(mockSquirrelResponse).toEqual({
        isAnimal: true,
        species: 'Eastern Gray Squirrel',
        name: 'Nutty',
        backstory: 'Loves hoarding acorns in campus parks.',
        confidence: 0.95,
      });
    });

    it('mockDuckResponse has correct structure', () => {
      expect(mockDuckResponse).toEqual({
        isAnimal: true,
        species: 'Mallard Duck',
        name: 'Quackers',
        backstory: 'Enjoys swimming in campus ponds.',
        confidence: 0.98,
      });
    });

    it('mockNotAnimalResponse has correct structure', () => {
      expect(mockNotAnimalResponse).toEqual({
        isAnimal: false,
        species: null,
        name: null,
        backstory: null,
        reasoning: 'Image contains a park bench, no animals detected.',
      });
    });

    it('mockGeminiNetworkError is an instance of Error', () => {
      expect(mockGeminiNetworkError).toBeInstanceOf(Error);
      expect(mockGeminiNetworkError.message).toBe(
        'Gemini API network request failed: connection timeout / rate limit',
      );
    });
  });

  describe('getMockGeminiResponse helper', () => {
    it('returns mockSquirrelResponse for scenario "squirrel"', async () => {
      const response = await getMockGeminiResponse('squirrel');
      expect(response).toEqual(mockSquirrelResponse);
    });

    it('returns mockDuckResponse for scenario "duck"', async () => {
      const response = await getMockGeminiResponse('duck');
      expect(response).toEqual(mockDuckResponse);
    });

    it('returns mockNotAnimalResponse for scenario "not_animal"', async () => {
      const response = await getMockGeminiResponse('not_animal');
      expect(response).toEqual(mockNotAnimalResponse);
    });

    it('rejects with mockGeminiNetworkError for scenario "error"', async () => {
      await expect(getMockGeminiResponse('error')).rejects.toThrow(mockGeminiNetworkError);
    });
  });
});
