import { GoogleGenerativeAI } from '@google/generative-ai';

export interface GeminiAnimalAnalysisResponse {
  isAnimal: boolean;
  species: string | null;
  name: string | null;
  backstory: string | null;
  confidence?: number;
  reasoning?: string;
}

export interface GeminiClientConfig {
  apiKey?: string;
  modelName?: string;
}

export function getGeminiClient(config?: GeminiClientConfig): GoogleGenerativeAI | null {
  const apiKey = config?.apiKey || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn(
      '[Gemini Client] GEMINI_API_KEY is not defined. Calls will fail or require mock mode.',
    );
    return null;
  }
  return new GoogleGenerativeAI(apiKey);
}

export async function analyzeAnimalImage(
  client: GoogleGenerativeAI | null,
  imageBase64: string,
  mimeType: string = 'image/jpeg',
): Promise<GeminiAnimalAnalysisResponse> {
  if (!client) {
    throw new Error('Gemini client is not initialized. GEMINI_API_KEY may be missing.');
  }

  const model = client.getGenerativeModel({
    model: 'gemini-1.5-flash',
    generationConfig: { responseMimeType: 'application/json' },
  });

  const prompt =
    'Analyze this image and determine if it contains an animal. ' +
    'Return a JSON object with: ' +
    'isAnimal (boolean), ' +
    'species (string or null), ' +
    'name (string or null), ' +
    'backstory (string or null), ' +
    'confidence (number, optional), ' +
    'reasoning (string, optional).';

  const cleanBase64 = imageBase64.replace(/^data:[^;]+;base64,/, '');

  const imagePart = {
    inlineData: {
      data: cleanBase64,
      mimeType,
    },
  };

  const result = await model.generateContent([prompt, imagePart]);
  const responseText = result.response.text();
  const parsed = JSON.parse(responseText) as GeminiAnimalAnalysisResponse;
  return parsed;
}
