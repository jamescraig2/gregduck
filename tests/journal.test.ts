import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { GET } from '@/app/api/journal/route';

vi.mock('@/lib/db', () => ({
  db: {
    select: vi.fn(),
  },
}));

describe('GET /api/journal Endpoint', () => {
  const userId = 'usr_mock_123';
  const animal1 = {
    id: 'anim-11111111-1111-1111-1111-111111111111',
    name: 'Mallard Duck',
    species: 'Anas platyrhynchos',
    backstory: 'A quacky friend',
    photoUrl: 'https://example.com/duck.jpg',
    discovererId: userId,
    h3Index: '8928308280fffff',
    latitude: 37.7749,
    longitude: -122.4194,
    createdAt: new Date('2026-07-01T10:00:00Z'),
  };

  const animal2 = {
    id: 'anim-22222222-2222-2222-2222-222222222222',
    name: 'Gray Squirrel',
    species: 'Sciurus carolinensis',
    backstory: 'Acorn collector',
    photoUrl: 'https://example.com/squirrel.jpg',
    discovererId: userId,
    h3Index: '89283082807ffff',
    latitude: 37.7833,
    longitude: -122.4167,
    createdAt: new Date('2026-07-05T12:00:00Z'),
  };

  const encounter1 = {
    id: 'enc-11111111-1111-1111-1111-111111111111',
    userId,
    animalId: animal1.id,
    photoUrl: 'https://example.com/enc1.jpg',
    createdAt: new Date('2026-07-01T10:00:00Z'),
  };

  const encounter2 = {
    id: 'enc-22222222-2222-2222-2222-222222222222',
    userId,
    animalId: animal2.id,
    photoUrl: 'https://example.com/enc2.jpg',
    createdAt: new Date('2026-07-05T12:00:00Z'),
  };

  const encounter3 = {
    id: 'enc-33333333-3333-3333-3333-333333333333',
    userId,
    animalId: animal1.id,
    photoUrl: 'https://example.com/enc3.jpg',
    createdAt: new Date('2026-07-10T15:00:00Z'),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(auth).mockResolvedValue({ userId, sessionId: 'sess_mock' } as never);
  });

  it('returns 401 Unauthorized when unauthenticated', async () => {
    vi.mocked(auth).mockResolvedValueOnce({ userId: null } as never);

    const req = new NextRequest('http://localhost:3000/api/journal');
    const res = await GET(req);

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe('Unauthorized');
  });

  it('returns 200 OK with default tab=discoveries returning unique first-time discoveries', async () => {
    const allUserEncounters = [encounter1, encounter2, encounter3];
    const joinedRecords = [
      { encounter: encounter2, animal: animal2 },
      { encounter: encounter1, animal: animal1 },
    ];

    const mockFirstFrom = vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        orderBy: vi.fn().mockResolvedValue(allUserEncounters),
      }),
    });

    const mockSecondFrom = vi.fn().mockReturnValue({
      innerJoin: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockResolvedValue(joinedRecords),
        }),
      }),
    });

    vi.mocked(db.select)
      .mockReturnValueOnce({ from: mockFirstFrom } as never)
      .mockReturnValueOnce({ from: mockSecondFrom } as never);

    const req = new NextRequest('http://localhost:3000/api/journal?tab=discoveries');
    const res = await GET(req);

    expect(res.status).toBe(200);
    const body = await res.json();

    expect(body.data).toHaveLength(2);
    expect(body.data[0].encounterId).toBe(encounter2.id);
    expect(body.data[0].isFirstDiscovery).toBe(true);
    expect(body.data[1].encounterId).toBe(encounter1.id);
    expect(body.data[1].isFirstDiscovery).toBe(true);
    expect(body.pagination).toEqual({
      page: 1,
      limit: 20,
      total: 2,
      totalPages: 1,
    });
  });

  it('returns 200 OK with tab=all returning all logged encounters chronologically with accurate isFirstDiscovery', async () => {
    const allUserEncounters = [encounter1, encounter2, encounter3];
    const joinedRecords = [
      { encounter: encounter3, animal: animal1 },
      { encounter: encounter2, animal: animal2 },
      { encounter: encounter1, animal: animal1 },
    ];

    const mockFirstFrom = vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        orderBy: vi.fn().mockResolvedValue(allUserEncounters),
      }),
    });

    const mockSecondFrom = vi.fn().mockReturnValue({
      innerJoin: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockResolvedValue(joinedRecords),
        }),
      }),
    });

    vi.mocked(db.select)
      .mockReturnValueOnce({ from: mockFirstFrom } as never)
      .mockReturnValueOnce({ from: mockSecondFrom } as never);

    const req = new NextRequest('http://localhost:3000/api/journal?tab=all');
    const res = await GET(req);

    expect(res.status).toBe(200);
    const body = await res.json();

    expect(body.data).toHaveLength(3);
    expect(body.data[0].encounterId).toBe(encounter3.id);
    expect(body.data[0].isFirstDiscovery).toBe(false);
    expect(body.data[1].encounterId).toBe(encounter2.id);
    expect(body.data[1].isFirstDiscovery).toBe(true);
    expect(body.data[2].encounterId).toBe(encounter1.id);
    expect(body.data[2].isFirstDiscovery).toBe(true);
    expect(body.pagination).toEqual({
      page: 1,
      limit: 20,
      total: 3,
      totalPages: 1,
    });
  });

  it('supports pagination parameters (page & limit)', async () => {
    const allUserEncounters = [encounter1, encounter2, encounter3];
    const joinedRecords = [
      { encounter: encounter3, animal: animal1 },
      { encounter: encounter2, animal: animal2 },
      { encounter: encounter1, animal: animal1 },
    ];

    const mockFirstFrom = vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        orderBy: vi.fn().mockResolvedValue(allUserEncounters),
      }),
    });

    const mockSecondFrom = vi.fn().mockReturnValue({
      innerJoin: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockResolvedValue(joinedRecords),
        }),
      }),
    });

    vi.mocked(db.select)
      .mockReturnValueOnce({ from: mockFirstFrom } as never)
      .mockReturnValueOnce({ from: mockSecondFrom } as never);

    const req = new NextRequest('http://localhost:3000/api/journal?tab=all&page=2&limit=2');
    const res = await GET(req);

    expect(res.status).toBe(200);
    const body = await res.json();

    expect(body.data).toHaveLength(1);
    expect(body.data[0].encounterId).toBe(encounter1.id);
    expect(body.pagination).toEqual({
      page: 2,
      limit: 2,
      total: 3,
      totalPages: 2,
    });
  });

  it('returns empty data payload when user has no encounters', async () => {
    const mockFirstFrom = vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        orderBy: vi.fn().mockResolvedValue([]),
      }),
    });

    vi.mocked(db.select).mockReturnValueOnce({ from: mockFirstFrom } as never);

    const req = new NextRequest('http://localhost:3000/api/journal');
    const res = await GET(req);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toEqual([]);
    expect(body.pagination).toEqual({
      page: 1,
      limit: 20,
      total: 0,
      totalPages: 0,
    });
  });

  it('returns 500 Internal Server Error when database operation fails', async () => {
    vi.mocked(db.select).mockImplementationOnce(() => {
      throw new Error('Database connection failed');
    });

    const req = new NextRequest('http://localhost:3000/api/journal');
    const res = await GET(req);

    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe('Internal Server Error');
  });
});
