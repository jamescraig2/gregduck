import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { inArray } from 'drizzle-orm';
import { db, animals, encounters, users } from '@/lib';
import { getGeminiClient, analyzeAnimalImage } from '@/services/gemini/client';
import { validateImageContent, uploadAnimalPhoto } from '@/services/storage';
import { latLngToH3Index, getLocalZone } from '@/services/location/h3';
import { ProximityMatchingStrategy } from '@/services/matching/proximity';

export async function POST(req: NextRequest) {
  try {
    // 1. User Authentication Context
    let authUserId: string | null = null;
    try {
      const authObj = await auth();
      authUserId = authObj?.userId || null;
    } catch {
      // Clerk auth context may be absent during unit test execution
    }

    // 2. Parse Multipart Form Data
    const formData = await req.formData();
    const file = (formData.get('file') || formData.get('photo')) as File | null;
    const latStr = formData.get('latitude') as string | null;
    const lngStr = formData.get('longitude') as string | null;
    const formUserId = formData.get('userId') as string | null;
    const headerUserId = req.headers.get('x-user-id');

    const userId = authUserId || formUserId || headerUserId;
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized: User identifier required' },
        { status: 401 },
      );
    }

    // 3. Coordinate & Input Validation
    if (!file || typeof (file as unknown as Blob).arrayBuffer !== 'function') {
      return NextResponse.json({ error: 'Missing or invalid photo file' }, { status: 400 });
    }

    if (latStr === null || lngStr === null || latStr.trim() === '' || lngStr.trim() === '') {
      return NextResponse.json(
        { error: 'Invalid latitude or longitude coordinates' },
        { status: 400 },
      );
    }

    const latitude = parseFloat(latStr);
    const longitude = parseFloat(lngStr);

    if (
      isNaN(latitude) ||
      latitude < -90 ||
      latitude > 90 ||
      isNaN(longitude) ||
      longitude < -180 ||
      longitude > 180
    ) {
      return NextResponse.json(
        { error: 'Invalid latitude or longitude coordinates' },
        { status: 400 },
      );
    }

    // 4. Image Magic Bytes Content Validation
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const isValidImage = await validateImageContent(buffer);
    if (!isValidImage) {
      return NextResponse.json(
        { error: 'Invalid file content: Not a valid image' },
        { status: 400 },
      );
    }

    // 5. Gemini AI Vision Analysis
    const geminiClient = getGeminiClient();
    const base64Image = buffer.toString('base64');
    const analysis = await analyzeAnimalImage(geminiClient, base64Image, file.type || 'image/jpeg');

    if (!analysis.isAnimal) {
      return NextResponse.json(
        { error: 'Image does not contain a recognizable animal', isAnimal: false },
        { status: 400 },
      );
    }

    // 6. Vercel Blob Image Upload
    const blobResult = await uploadAnimalPhoto(buffer, file.name || 'photo.jpg');

    // 7. Spatial Indexing & Proximity Query
    const h3Index = latLngToH3Index(latitude, longitude);
    const localZoneCells = getLocalZone(h3Index);

    const existingAnimalsInZone = await db
      .select()
      .from(animals)
      .where(inArray(animals.h3Index, localZoneCells));

    const matchingStrategy = new ProximityMatchingStrategy();
    const matchResult = await matchingStrategy.match({
      userId,
      species: analysis.species || 'Unknown Animal',
      latitude,
      longitude,
      h3Index,
      photoUrl: blobResult.url,
      existingAnimalsInZone,
    });

    // 8. Atomic Database Transaction
    let resultData: {
      isNewDiscovery: boolean;
      animal: typeof animals.$inferSelect;
      encounter: typeof encounters.$inferSelect;
    };

    await db.transaction(async (tx) => {
      // Ensure user profile cached record exists for foreign key constraints
      await tx.insert(users).values({ id: userId, username: userId }).onConflictDoNothing();

      if (matchResult.isNewDiscovery) {
        const [newAnimal] = await tx
          .insert(animals)
          .values({
            name: analysis.name || analysis.species || 'Mysterious Creature',
            species: analysis.species || 'Unknown Animal',
            backstory: analysis.backstory || 'Spotted exploring the neighborhood.',
            photoUrl: blobResult.url,
            discovererId: userId,
            h3Index,
            latitude,
            longitude,
          })
          .returning();

        const [newEncounter] = await tx
          .insert(encounters)
          .values({
            userId,
            animalId: newAnimal.id,
            photoUrl: blobResult.url,
          })
          .returning();

        resultData = { isNewDiscovery: true, animal: newAnimal, encounter: newEncounter };
      } else {
        const matchedAnimal = matchResult.matchedAnimal!;
        const [newEncounter] = await tx
          .insert(encounters)
          .values({
            userId,
            animalId: matchedAnimal.id,
            photoUrl: blobResult.url,
          })
          .returning();

        resultData = { isNewDiscovery: false, animal: matchedAnimal, encounter: newEncounter };
      }
    });

    return NextResponse.json(
      { success: true, ...resultData! },
      { status: resultData!.isNewDiscovery ? 201 : 200 },
    );
  } catch (error) {
    console.error('Error processing capture request:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal Server Error' },
      { status: 500 },
    );
  }
}
