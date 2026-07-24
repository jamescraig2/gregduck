import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '../app/api/animals/[id]/route';
import { db } from '../lib/db';

vi.mock('../lib/db', () => ({
  db: {
    select: vi.fn(),
  },
}));

describe('GET /api/animals/[id]', () => {
  const validUuid = '123e4567-e89b-12d3-a456-426614174000';
  const validAnimal = {
    id: validUuid,
    name: 'Barnaby the Blue Heron',
    species: 'Great Blue Heron',
    backstory: 'First spotted near the edge of the lake...',
    photoUrl: 'https://storage.googleapis.com/hero.jpg',
    discovererId: 'user_abc',
    createdAt: new Date('2026-07-01T10:00:00Z'),
  };
  const validDiscoverer = {
    id: 'user_abc',
    username: 'Jane Doe',
    avatarUrl: 'https://img.clerk.com/avatar1.jpg',
    createdAt: new Date('2026-06-01T10:00:00Z'),
  };
  const validEncounters = [
    {
      encounter: {
        id: 'enc-11111111-1111-1111-1111-111111111111',
        userId: 'user_abc',
        animalId: validUuid,
        photoUrl: 'https://storage.googleapis.com/enc1.jpg',
        createdAt: new Date('2026-07-01T10:00:00Z'),
      },
      user: validDiscoverer,
    },
    {
      encounter: {
        id: 'enc-22222222-2222-2222-2222-222222222222',
        userId: 'user_xyz',
        animalId: validUuid,
        photoUrl: 'https://storage.googleapis.com/enc2.jpg',
        createdAt: new Date('2026-07-05T14:30:00Z'),
      },
      user: {
        id: 'user_xyz',
        username: 'John Smith',
        avatarUrl: 'https://img.clerk.com/avatar2.jpg',
        createdAt: new Date('2026-06-02T10:00:00Z'),
      },
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 400 Bad Request when given an invalid UUID format', async () => {
    const request = new Request('http://localhost:3000/api/animals/invalid-id');
    const response = await GET(request, {
      params: Promise.resolve({ id: 'invalid-id' }),
    });

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body).toEqual({ error: 'Invalid animal ID format' });
  });

  it('returns 404 Not Found when animal does not exist', async () => {
    const mockFrom = vi.fn().mockReturnValue({
      leftJoin: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([]),
      }),
    });
    vi.mocked(db.select).mockReturnValue({
      from: mockFrom,
    } as unknown as ReturnType<typeof db.select>);

    const request = new Request(`http://localhost:3000/api/animals/${validUuid}`);
    const response = await GET(request, {
      params: Promise.resolve({ id: validUuid }),
    });

    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body).toEqual({ error: 'Animal not found' });
  });

  it('returns 200 OK with complete metadata and encounter timeline for a valid animal ID', async () => {
    const mockAnimalSelectFrom = vi.fn().mockReturnValue({
      leftJoin: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([
          {
            animal: validAnimal,
            discoverer: validDiscoverer,
          },
        ]),
      }),
    });

    const mockEncounterSelectFrom = vi.fn().mockReturnValue({
      leftJoin: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockResolvedValue(validEncounters),
        }),
      }),
    });

    vi.mocked(db.select)
      .mockReturnValueOnce({ from: mockAnimalSelectFrom } as unknown as ReturnType<
        typeof db.select
      >)
      .mockReturnValueOnce({ from: mockEncounterSelectFrom } as unknown as ReturnType<
        typeof db.select
      >);

    const request = new Request(`http://localhost:3000/api/animals/${validUuid}`);
    const response = await GET(request, {
      params: Promise.resolve({ id: validUuid }),
    });

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual({
      id: validUuid,
      name: 'Barnaby the Blue Heron',
      species: 'Great Blue Heron',
      backstory: 'First spotted near the edge of the lake...',
      photoUrl: 'https://storage.googleapis.com/hero.jpg',
      discoveredAt: '2026-07-01T10:00:00.000Z',
      discoverer: {
        userId: 'user_abc',
        name: 'Jane Doe',
        avatarUrl: 'https://img.clerk.com/avatar1.jpg',
      },
      encounters: [
        {
          id: 'enc-11111111-1111-1111-1111-111111111111',
          createdAt: '2026-07-01T10:00:00.000Z',
          photoUrl: 'https://storage.googleapis.com/enc1.jpg',
          notes: null,
          user: {
            userId: 'user_abc',
            name: 'Jane Doe',
            avatarUrl: 'https://img.clerk.com/avatar1.jpg',
          },
        },
        {
          id: 'enc-22222222-2222-2222-2222-222222222222',
          createdAt: '2026-07-05T14:30:00.000Z',
          photoUrl: 'https://storage.googleapis.com/enc2.jpg',
          notes: null,
          user: {
            userId: 'user_xyz',
            name: 'John Smith',
            avatarUrl: 'https://img.clerk.com/avatar2.jpg',
          },
        },
      ],
    });
  });

  it('returns 500 Internal Server Error when database fails', async () => {
    vi.mocked(db.select).mockImplementationOnce(() => {
      throw new Error('Database query failed');
    });

    const request = new Request(`http://localhost:3000/api/animals/${validUuid}`);
    const response = await GET(request, {
      params: Promise.resolve({ id: validUuid }),
    });

    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body).toEqual({ error: 'Failed to fetch animal details' });
  });
});
