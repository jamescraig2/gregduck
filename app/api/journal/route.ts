import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { animals, encounters } from '@/lib/db/schema';
import { eq, and, gte, lte, ilike, or, inArray, desc, asc, SQL } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const tabParam = searchParams.get('tab') || 'discoveries';
    const tab = tabParam === 'all' ? 'all' : 'discoveries';
    const speciesParam = searchParams.get('species')?.trim();
    const searchParam = searchParams.get('search')?.trim();
    const startDateParam = searchParams.get('startDate')?.trim();
    const endDateParam = searchParams.get('endDate')?.trim();

    let page = parseInt(searchParams.get('page') || '1', 10);
    if (isNaN(page) || page < 1) page = 1;

    let limit = parseInt(searchParams.get('limit') || '20', 10);
    if (isNaN(limit) || limit < 1) limit = 20;
    if (limit > 100) limit = 100;

    // Fetch all user encounters ordered by createdAt asc to determine first-time discoveries
    const userAllEncounters = await db
      .select({
        id: encounters.id,
        animalId: encounters.animalId,
        createdAt: encounters.createdAt,
      })
      .from(encounters)
      .where(eq(encounters.userId, userId))
      .orderBy(asc(encounters.createdAt));

    if (userAllEncounters.length === 0) {
      return NextResponse.json({
        data: [],
        pagination: {
          page,
          limit,
          total: 0,
          totalPages: 0,
        },
      });
    }

    const firstDiscoveryEncounterIds = new Set<string>();
    const seenAnimals = new Set<string>();
    for (const enc of userAllEncounters) {
      if (!seenAnimals.has(enc.animalId)) {
        seenAnimals.add(enc.animalId);
        firstDiscoveryEncounterIds.add(enc.id);
      }
    }

    const conditions: SQL[] = [eq(encounters.userId, userId)];

    if (tab === 'discoveries') {
      const idsArray = Array.from(firstDiscoveryEncounterIds);
      if (idsArray.length > 0) {
        conditions.push(inArray(encounters.id, idsArray));
      }
    }

    if (speciesParam) {
      conditions.push(ilike(animals.species, `%${speciesParam}%`));
    }

    if (searchParam) {
      conditions.push(
        or(ilike(animals.name, `%${searchParam}%`), ilike(animals.species, `%${searchParam}%`))!,
      );
    }

    if (startDateParam) {
      const startDate = new Date(startDateParam);
      if (!isNaN(startDate.getTime())) {
        conditions.push(gte(encounters.createdAt, startDate));
      }
    }

    if (endDateParam) {
      const endDate = new Date(endDateParam);
      if (!isNaN(endDate.getTime())) {
        conditions.push(lte(encounters.createdAt, endDate));
      }
    }

    const whereClause = conditions.length === 1 ? conditions[0] : and(...conditions)!;

    const records = await db
      .select({
        encounter: encounters,
        animal: animals,
      })
      .from(encounters)
      .innerJoin(animals, eq(encounters.animalId, animals.id))
      .where(whereClause)
      .orderBy(desc(encounters.createdAt));

    const total = records.length;
    const totalPages = Math.ceil(total / limit);
    const paginatedRecords = records.slice((page - 1) * limit, page * limit);

    const data = paginatedRecords.map((row) => ({
      encounterId: row.encounter.id,
      animalId: row.animal.id,
      name: row.animal.name,
      species: row.animal.species,
      discoveredAt:
        row.encounter.createdAt instanceof Date
          ? row.encounter.createdAt.toISOString()
          : new Date(row.encounter.createdAt).toISOString(),
      photoUrl: row.encounter.photoUrl || row.animal.photoUrl || null,
      isFirstDiscovery: firstDiscoveryEncounterIds.has(row.encounter.id),
    }));

    return NextResponse.json({
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    });
  } catch (error) {
    console.error('Error fetching journal entries:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
