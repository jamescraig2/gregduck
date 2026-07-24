/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '../../app/api/capture/route';
import { db, animals } from '../../lib';
import { analyzeAnimalImage } from '../../services/gemini/client';

// Mock lib (database)
vi.mock('../../lib', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../lib')>();
  return {
    ...actual,
    db: {
      select: vi.fn(),
      transaction: vi.fn(),
    },
  };
});

// Mock Gemini client module analyzeAnimalImage
vi.mock('../../services/gemini/client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../services/gemini/client')>();
  return {
    ...actual,
    getGeminiClient: vi.fn().mockReturnValue({}),
    analyzeAnimalImage: vi.fn().mockResolvedValue({
      isAnimal: true,
      species: 'Eastern Gray Squirrel',
      name: 'Nutty',
      backstory: 'Loves acorns.',
      confidence: 0.95,
    }),
  };
});

// Mock Vercel Blob storage
vi.mock('../../services/storage', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../services/storage')>();
  return {
    ...actual,
    uploadAnimalPhoto: vi.fn().mockResolvedValue({
      url: 'https://blob.vercel-storage.com/animal-photos/123-squirrel.jpg',
    }),
  };
});

// Mock Clerk auth
vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn().mockResolvedValue({ userId: null }),
}));

function getValidJpegFile(): File {
  const buffer = Buffer.from([
    0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01,
  ]);
  return new File([buffer], 'test.jpg', { type: 'image/jpeg' });
}

function getInvalidTextFile(): File {
  const buffer = Buffer.from('this is text, not an image');
  return new File([buffer], 'test.txt', { type: 'text/plain' });
}

function createMockRequest(formData: FormData, headers: Record<string, string> = {}): NextRequest {
  return {
    formData: async () => formData,
    headers: new Headers(headers),
  } as unknown as NextRequest;
}

describe('POST /api/capture', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 Unauthorized when user identifier is missing', async () => {
    const formData = new FormData();
    formData.append('file', getValidJpegFile());
    formData.append('latitude', '37.7749');
    formData.append('longitude', '-122.4194');

    const req = createMockRequest(formData);
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.error).toBe('Unauthorized: User identifier required');
  });

  it('returns 400 Bad Request when photo file is missing', async () => {
    const formData = new FormData();
    formData.append('latitude', '37.7749');
    formData.append('longitude', '-122.4194');
    formData.append('userId', 'user_123');

    const req = createMockRequest(formData);
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBe('Missing or invalid photo file');
  });

  it('returns 400 Bad Request when latitude/longitude are out of bounds or missing', async () => {
    const formData = new FormData();
    formData.append('file', getValidJpegFile());
    formData.append('latitude', '100'); // Invalid latitude > 90
    formData.append('longitude', '-122.4194');
    formData.append('userId', 'user_123');

    const req = createMockRequest(formData);
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBe('Invalid latitude or longitude coordinates');
  });

  it('returns 400 Bad Request when magic bytes validation fails', async () => {
    const formData = new FormData();
    formData.append('file', getInvalidTextFile());
    formData.append('latitude', '37.7749');
    formData.append('longitude', '-122.4194');
    formData.append('userId', 'user_123');

    const req = createMockRequest(formData);
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBe('Invalid file content: Not a valid image');
  });

  it('returns 400 Bad Request with isAnimal: false when Gemini analysis rejects non-animal image', async () => {
    vi.mocked(analyzeAnimalImage).mockResolvedValueOnce({
      isAnimal: false,
      species: null,
      name: null,
      backstory: null,
      reasoning: 'Image contains a park bench, no animals found.',
    });

    const formData = new FormData();
    formData.append('file', getValidJpegFile());
    formData.append('latitude', '37.7749');
    formData.append('longitude', '-122.4194');
    formData.append('userId', 'user_123');

    const req = createMockRequest(formData);
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.isAnimal).toBe(false);
    expect(body.error).toBe('Image does not contain a recognizable animal');
  });

  it('returns 201 Created for a new discovery when no matching existing animal is found', async () => {
    // DB select query mock for existing animals
    const selectChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue([]), // No animals in local zone
    };
    vi.mocked(db.select).mockReturnValue(selectChain as any);

    // DB transaction mock
    const mockAnimal = {
      id: 'animal-uuid-1',
      name: 'Nutty',
      species: 'Eastern Gray Squirrel',
      backstory: 'Loves acorns.',
      photoUrl: 'https://blob.vercel-storage.com/animal-photos/123-squirrel.jpg',
      discovererId: 'user_123',
      h3Index: '8928308280fffff',
      latitude: 37.7749,
      longitude: -122.4194,
      createdAt: new Date(),
    };

    const mockEncounter = {
      id: 'encounter-uuid-1',
      userId: 'user_123',
      animalId: 'animal-uuid-1',
      photoUrl: 'https://blob.vercel-storage.com/animal-photos/123-squirrel.jpg',
      createdAt: new Date(),
    };

    vi.mocked(db.transaction).mockImplementation(async (txCallback: any) => {
      const mockTx = {
        insert: vi.fn().mockImplementation((table) => {
          return {
            values: vi.fn().mockImplementation(() => {
              return {
                onConflictDoNothing: vi.fn().mockResolvedValue(undefined),
                returning: vi.fn().mockImplementation(async () => {
                  if (table === animals) {
                    return [mockAnimal];
                  }
                  return [mockEncounter];
                }),
              };
            }),
          };
        }),
      };
      return await txCallback(mockTx);
    });

    const formData = new FormData();
    formData.append('file', getValidJpegFile());
    formData.append('latitude', '37.7749');
    formData.append('longitude', '-122.4194');
    formData.append('userId', 'user_123');

    const req = createMockRequest(formData);
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.success).toBe(true);
    expect(body.isNewDiscovery).toBe(true);
    expect(body.animal.id).toBe('animal-uuid-1');
    expect(body.encounter.id).toBe('encounter-uuid-1');
  });

  it('returns 200 OK when matching an existing animal encounter', async () => {
    // Existing animal in zone
    const existingAnimal = {
      id: 'existing-animal-uuid',
      name: 'Existing Squirrel',
      species: 'Eastern Gray Squirrel',
      backstory: 'Resident squirrel',
      photoUrl: 'https://blob.vercel-storage.com/old-squirrel.jpg',
      discovererId: 'other_user',
      h3Index: '8928308280fffff',
      latitude: 37.7749,
      longitude: -122.4194,
      createdAt: new Date(),
    };

    const selectChain = {
      from: vi.fn().mockReturnThis(),
      where: vi
        .fn()
        .mockResolvedValue([
          existingAnimal,
          { ...existingAnimal, id: 'existing-2' },
          { ...existingAnimal, id: 'existing-3' },
        ]), // 3 animals reaching species saturation limit
    };
    vi.mocked(db.select).mockReturnValue(selectChain as any);

    const mockEncounter = {
      id: 'encounter-uuid-2',
      userId: 'user_123',
      animalId: 'existing-animal-uuid',
      photoUrl: 'https://blob.vercel-storage.com/animal-photos/123-squirrel.jpg',
      createdAt: new Date(),
    };

    vi.mocked(db.transaction).mockImplementation(async (txCallback: any) => {
      const mockTx = {
        insert: vi.fn().mockImplementation(() => {
          return {
            values: vi.fn().mockImplementation(() => {
              return {
                onConflictDoNothing: vi.fn().mockResolvedValue(undefined),
                returning: vi.fn().mockResolvedValue([mockEncounter]),
              };
            }),
          };
        }),
      };
      return await txCallback(mockTx);
    });

    const formData = new FormData();
    formData.append('photo', getValidJpegFile()); // Testing 'photo' key as well
    formData.append('latitude', '37.7749');
    formData.append('longitude', '-122.4194');

    const req = createMockRequest(formData, { 'x-user-id': 'user_123' });
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.isNewDiscovery).toBe(false);
    expect(body.animal.id).toBe('existing-animal-uuid');
    expect(body.encounter.id).toBe('encounter-uuid-2');
  });

  it('returns 500 Internal Server Error when database fails', async () => {
    vi.mocked(db.select).mockImplementationOnce(() => {
      throw new Error('Database connection timeout');
    });

    const formData = new FormData();
    formData.append('file', getValidJpegFile());
    formData.append('latitude', '37.7749');
    formData.append('longitude', '-122.4194');
    formData.append('userId', 'user_123');

    const req = createMockRequest(formData);
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.error).toBe('Database connection timeout');
  });
});
