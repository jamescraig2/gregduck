import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const mockAnimalsData = [
  {
    id: 'anim-1',
    name: 'Mallard Duck',
    species: 'Duck',
    backstory: 'A friendly duck',
    photoUrl: 'https://example.com/duck.jpg',
    discovererId: 'user-1',
    h3Index: '8928308280fffff',
    latitude: 37.7749,
    longitude: -122.4194,
    createdAt: new Date('2026-07-23T12:00:00Z'),
  },
  {
    id: 'anim-2',
    name: 'Pigeon',
    species: 'Pigeon',
    backstory: 'City pigeon',
    photoUrl: 'https://example.com/pigeon.jpg',
    discovererId: 'user-2',
    h3Index: '89283082807ffff',
    latitude: 37.7833,
    longitude: -122.4167,
    createdAt: new Date('2026-07-23T13:00:00Z'),
  },
  {
    id: 'anim-3',
    name: 'Tokyo Crow',
    species: 'Crow',
    backstory: 'Crow near Shibuya',
    photoUrl: 'https://example.com/crow.jpg',
    discovererId: 'user-3',
    h3Index: '89283082803ffff',
    latitude: 35.6762,
    longitude: 139.6503,
    createdAt: new Date('2026-07-23T14:00:00Z'),
  },
];

let mockDbRecords = mockAnimalsData;
let mockDbShouldFail = false;

vi.mock('@/lib/db', () => ({
  db: {
    select: () => ({
      from: () => ({
        where: async () => {
          if (mockDbShouldFail) {
            throw new Error('Database connection failed');
          }
          return mockDbRecords;
        },
      }),
    }),
  },
}));

import { GET } from '../../app/api/markers/route';

describe('GET /api/markers Endpoint', () => {
  beforeEach(() => {
    mockDbRecords = mockAnimalsData;
    mockDbShouldFail = false;
  });

  it('returns 400 Bad Request when no query parameters are provided', async () => {
    const req = new NextRequest('http://localhost:3000/api/markers');
    const res = await GET(req);
    expect(res.status).toBe(400);

    const body = await res.json();
    expect(body.error).toBe('Bad Request');
    expect(body.details).toContain('Either complete bounding box parameters');
  });

  it('returns 400 Bad Request when bounding box parameters are incomplete', async () => {
    const req = new NextRequest(
      'http://localhost:3000/api/markers?sw_lat=37.7&sw_lng=-122.5&ne_lat=37.8',
    );
    const res = await GET(req);
    expect(res.status).toBe(400);

    const body = await res.json();
    expect(body.error).toBe('Bad Request');
  });

  it('returns 400 Bad Request when coordinates are out of bounds', async () => {
    const req = new NextRequest(
      'http://localhost:3000/api/markers?sw_lat=-95.0&sw_lng=-122.5&ne_lat=37.8&ne_lng=-122.4',
    );
    const res = await GET(req);
    expect(res.status).toBe(400);
  });

  it('returns 400 Bad Request when invalid H3 index is passed', async () => {
    const req = new NextRequest('http://localhost:3000/api/markers?h3_indexes=invalid_h3_cell');
    const res = await GET(req);
    expect(res.status).toBe(400);

    const body = await res.json();
    expect(body.error).toContain('Invalid H3 cell index');
  });

  it('returns 200 OK with markers for valid bounding box query', async () => {
    const req = new NextRequest(
      'http://localhost:3000/api/markers?sw_lat=37.7&sw_lng=-122.5&ne_lat=37.8&ne_lng=-122.4',
    );
    const res = await GET(req);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.total).toBe(3);
    expect(Array.isArray(body.markers)).toBe(true);
    expect(body.markers[0]).toEqual({
      id: 'anim-1',
      name: 'Mallard Duck',
      species: 'Duck',
      lat: 37.7749,
      lng: -122.4194,
      h3Index: '8928308280fffff',
      lastEncounteredAt: '2026-07-23T12:00:00.000Z',
      imageUrl: 'https://example.com/duck.jpg',
    });
  });

  it('returns 200 OK for valid H3 indexes parameter', async () => {
    const validH3 = '8928308280fffff';
    const req = new NextRequest(`http://localhost:3000/api/markers?h3_indexes=${validH3}`);
    const res = await GET(req);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.total).toBe(3);
  });

  it('returns 500 Internal Server Error when database query throws', async () => {
    mockDbShouldFail = true;
    const req = new NextRequest(
      'http://localhost:3000/api/markers?sw_lat=37.7&sw_lng=-122.5&ne_lat=37.8&ne_lng=-122.4',
    );
    const res = await GET(req);
    expect(res.status).toBe(500);

    const body = await res.json();
    expect(body.error).toBe('Internal Server Error');
  });
});
