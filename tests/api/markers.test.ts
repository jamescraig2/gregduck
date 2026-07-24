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

type SqlChunk = string | { queryChunks?: SqlChunk[]; value?: unknown; name?: string } | SqlChunk[];

let mockDbRecords = mockAnimalsData;
let mockDbShouldFail = false;
let lastWhereClause: SqlChunk | null = null;

function extractSqlInfo(clause: SqlChunk | null): { sqlStr: string; params: unknown[] } {
  if (!clause) return { sqlStr: '', params: [] };

  const params: unknown[] = [];
  let sqlStr = '';

  function walk(chunk: SqlChunk | null | undefined) {
    if (!chunk) return;
    if (typeof chunk === 'string') {
      sqlStr += chunk;
    } else if (Array.isArray(chunk)) {
      chunk.forEach(walk);
    } else if (
      typeof chunk === 'object' &&
      'queryChunks' in chunk &&
      Array.isArray(chunk.queryChunks)
    ) {
      chunk.queryChunks.forEach(walk);
    } else if (typeof chunk === 'object' && 'value' in chunk && chunk.value !== undefined) {
      if (Array.isArray(chunk.value)) {
        sqlStr += chunk.value.join('');
      } else {
        params.push(chunk.value);
        sqlStr += '?';
      }
    } else if (typeof chunk === 'object' && 'name' in chunk && typeof chunk.name === 'string') {
      sqlStr += chunk.name;
    }
  }

  walk(clause);
  return { sqlStr, params };
}

vi.mock('@/lib/db', () => ({
  db: {
    select: () => ({
      from: () => ({
        where: async (clause: SqlChunk) => {
          lastWhereClause = clause;
          if (mockDbShouldFail) {
            throw new Error('Database connection failed');
          }
          return mockDbRecords;
        },
      }),
    }),
  },
}));

import { GET, parseH3Indexes } from '../../app/api/markers/route';

describe('GET /api/markers Endpoint', () => {
  beforeEach(() => {
    mockDbRecords = mockAnimalsData;
    mockDbShouldFail = false;
    lastWhereClause = null;
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

  describe('Antimeridian crossing logic (sw_lng > ne_lng)', () => {
    it('constructs correct OR condition for longitude when sw_lng > ne_lng', async () => {
      const req = new NextRequest(
        'http://localhost:3000/api/markers?sw_lat=-10&sw_lng=170&ne_lat=10&ne_lng=-170',
      );
      const res = await GET(req);
      expect(res.status).toBe(200);

      const { sqlStr, params } = extractSqlInfo(lastWhereClause);
      expect(sqlStr).toContain('or');
      expect(params).toContain(170);
      expect(params).toContain(-170);
    });
  });

  describe('Combined BBox + H3 filtering', () => {
    it('applies both bounding box and H3 index conditions in query', async () => {
      const validH3 = '8928308280fffff';
      const req = new NextRequest(
        `http://localhost:3000/api/markers?sw_lat=37.7&sw_lng=-122.5&ne_lat=37.8&ne_lng=-122.4&h3_indexes=${validH3}`,
      );
      const res = await GET(req);
      expect(res.status).toBe(200);

      const { params } = extractSqlInfo(lastWhereClause);
      expect(params).toContain(37.7);
      expect(params).toContain(37.8);
      expect(params).toContain(-122.5);
      expect(params).toContain(-122.4);
      expect(params).toContain(validH3);
    });
  });

  describe('Multiple comma-separated H3 indexes', () => {
    it('parses and passes multiple H3 indexes to query', async () => {
      const h3Index1 = '8828308281fffff';
      const h3Index2 = '8828308285fffff';
      const req = new NextRequest(
        `http://localhost:3000/api/markers?h3_indexes=${h3Index1},${h3Index2}`,
      );
      const res = await GET(req);
      expect(res.status).toBe(200);

      const { params } = extractSqlInfo(lastWhereClause);
      expect(params).toContain(h3Index1);
      expect(params).toContain(h3Index2);
    });
  });

  describe('parseH3Indexes helper', () => {
    it('returns empty array when input is undefined or empty', () => {
      expect(parseH3Indexes(undefined)).toEqual([]);
      expect(parseH3Indexes('')).toEqual([]);
      expect(parseH3Indexes('   ')).toEqual([]);
    });

    it('parses and trims comma-separated H3 index strings', () => {
      const input = ' 8828308281fffff , 8828308285fffff ';
      expect(parseH3Indexes(input)).toEqual(['8828308281fffff', '8828308285fffff']);
    });

    it('filters out empty values from trailing or consecutive commas', () => {
      const input = '8828308281fffff,,8828308285fffff,';
      expect(parseH3Indexes(input)).toEqual(['8828308281fffff', '8828308285fffff']);
    });
  });
});
