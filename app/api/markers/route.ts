import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { animals } from '@/lib/db/schema';
import { and, or, gte, lte, inArray, SQL } from 'drizzle-orm';
import { isValidH3Index } from '@/services/location/h3';

export function parseH3Indexes(h3Indexes?: string): string[] {
  if (!h3Indexes) return [];
  return h3Indexes
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

const latitudeSchema = z
  .string()
  .refine((val) => val.trim().length > 0, { message: 'Latitude cannot be empty' })
  .transform((val) => Number(val))
  .refine((val) => !isNaN(val), { message: 'Latitude must be a valid number' })
  .refine((val) => val >= -90 && val <= 90, { message: 'Latitude must be between -90 and 90' });

const longitudeSchema = z
  .string()
  .refine((val) => val.trim().length > 0, { message: 'Longitude cannot be empty' })
  .transform((val) => Number(val))
  .refine((val) => !isNaN(val), { message: 'Longitude must be a valid number' })
  .refine((val) => val >= -180 && val <= 180, {
    message: 'Longitude must be between -180 and 180',
  });

const querySchema = z
  .object({
    sw_lat: latitudeSchema.optional(),
    sw_lng: longitudeSchema.optional(),
    ne_lat: latitudeSchema.optional(),
    ne_lng: longitudeSchema.optional(),
    h3_indexes: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    const hasSwLat = data.sw_lat !== undefined;
    const hasSwLng = data.sw_lng !== undefined;
    const hasNeLat = data.ne_lat !== undefined;
    const hasNeLng = data.ne_lng !== undefined;

    const hasFullBbox = hasSwLat && hasSwLng && hasNeLat && hasNeLng;
    const hasAnyBbox = hasSwLat || hasSwLng || hasNeLat || hasNeLng;

    if (hasAnyBbox && !hasFullBbox) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          'All bounding box coordinates (sw_lat, sw_lng, ne_lat, ne_lng) must be provided together.',
      });
    }

    const h3List = parseH3Indexes(data.h3_indexes);

    if (!hasFullBbox && h3List.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          'Either complete bounding box parameters (sw_lat, sw_lng, ne_lat, ne_lng) or h3_indexes must be provided.',
      });
    }
  });

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const rawParams: Record<string, string> = {};

    for (const key of ['sw_lat', 'sw_lng', 'ne_lat', 'ne_lng', 'h3_indexes']) {
      const val = searchParams.get(key);
      if (val !== null) {
        rawParams[key] = val;
      }
    }

    if (rawParams.h3_indexes) {
      const h3List = parseH3Indexes(rawParams.h3_indexes);
      for (const h3Index of h3List) {
        if (!isValidH3Index(h3Index)) {
          return NextResponse.json({ error: `Invalid H3 cell index: ${h3Index}` }, { status: 400 });
        }
      }
    }

    const parseResult = querySchema.safeParse(rawParams);
    if (!parseResult.success) {
      const details = parseResult.error.issues.map((i) => i.message).join('; ');
      return NextResponse.json(
        {
          error: 'Bad Request',
          details: `Either complete bounding box parameters (sw_lat, sw_lng, ne_lat, ne_lng) or h3_indexes must be provided. ${details}`,
        },
        { status: 400 },
      );
    }

    const parsed = parseResult.data;
    const conditions: SQL[] = [];

    if (
      parsed.sw_lat !== undefined &&
      parsed.sw_lng !== undefined &&
      parsed.ne_lat !== undefined &&
      parsed.ne_lng !== undefined
    ) {
      const minLat = Math.min(parsed.sw_lat, parsed.ne_lat);
      const maxLat = Math.max(parsed.sw_lat, parsed.ne_lat);
      const latCondition = and(gte(animals.latitude, minLat), lte(animals.latitude, maxLat))!;

      const lngCondition =
        parsed.sw_lng > parsed.ne_lng
          ? or(gte(animals.longitude, parsed.sw_lng), lte(animals.longitude, parsed.ne_lng))!
          : and(gte(animals.longitude, parsed.sw_lng), lte(animals.longitude, parsed.ne_lng))!;

      conditions.push(and(latCondition, lngCondition)!);
    }

    const h3List = parseH3Indexes(parsed.h3_indexes);

    if (h3List.length > 0) {
      conditions.push(inArray(animals.h3Index, h3List));
    }

    const whereClause = conditions.length === 1 ? conditions[0] : and(...conditions);
    const results = await db.select().from(animals).where(whereClause);

    const markers = results.map((animal) => ({
      id: animal.id,
      name: animal.name,
      species: animal.species,
      lat: animal.latitude,
      lng: animal.longitude,
      h3Index: animal.h3Index,
      lastEncounteredAt:
        animal.createdAt instanceof Date
          ? animal.createdAt.toISOString()
          : new Date(animal.createdAt).toISOString(),
      imageUrl: animal.photoUrl,
    }));

    return NextResponse.json({
      markers,
      total: markers.length,
    });
  } catch (error) {
    console.error('Error fetching markers:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
