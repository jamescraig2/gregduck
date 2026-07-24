import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { animals, encounters, users } from '@/lib/db/schema';
import { eq, asc } from 'drizzle-orm';

const UUID_REGEX = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    if (!id || !UUID_REGEX.test(id)) {
      return NextResponse.json({ error: 'Invalid animal ID format' }, { status: 400 });
    }

    const [animalRecord] = await db
      .select({
        animal: animals,
        discoverer: users,
      })
      .from(animals)
      .leftJoin(users, eq(animals.discovererId, users.id))
      .where(eq(animals.id, id));

    if (!animalRecord) {
      return NextResponse.json({ error: 'Animal not found' }, { status: 404 });
    }

    const encounterRecords = await db
      .select({
        encounter: encounters,
        user: users,
      })
      .from(encounters)
      .leftJoin(users, eq(encounters.userId, users.id))
      .where(eq(encounters.animalId, id))
      .orderBy(asc(encounters.createdAt));

    const responsePayload = {
      id: animalRecord.animal.id,
      name: animalRecord.animal.name,
      species: animalRecord.animal.species,
      backstory: animalRecord.animal.backstory,
      photoUrl: animalRecord.animal.photoUrl,
      discoveredAt: animalRecord.animal.createdAt.toISOString(),
      discoverer: {
        userId: animalRecord.animal.discovererId,
        name: animalRecord.discoverer?.username || 'Unknown Discoverer',
        avatarUrl: animalRecord.discoverer?.avatarUrl || null,
      },
      encounters: encounterRecords.map((row) => ({
        id: row.encounter.id,
        createdAt: row.encounter.createdAt.toISOString(),
        photoUrl: row.encounter.photoUrl,
        notes: (row.encounter as Record<string, unknown>).notes ?? null,
        user: {
          userId: row.encounter.userId,
          name: row.user?.username || 'Anonymous User',
          avatarUrl: row.user?.avatarUrl || null,
        },
      })),
    };

    return NextResponse.json(responsePayload, { status: 200 });
  } catch (error) {
    console.error('Error fetching animal details:', error);
    return NextResponse.json({ error: 'Failed to fetch animal details' }, { status: 500 });
  }
}
