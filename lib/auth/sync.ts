import { auth, clerkClient } from '@clerk/nextjs/server';
import { db } from '../db';
import { users } from '../db/schema';
import { eq } from 'drizzle-orm';

export async function syncUser() {
  const { userId } = await auth();

  if (!userId) {
    return null;
  }

  // Check if user exists in the local database
  const existingUser = await db.query.users.findFirst({
    where: eq(users.id, userId),
  });

  if (existingUser) {
    return existingUser;
  }

  // If not found, fetch from Clerk and insert
  const client = await clerkClient();
  const clerkUser = await client.users.getUser(userId);

  const username =
    clerkUser.username ||
    clerkUser.firstName ||
    clerkUser.primaryEmailAddress?.emailAddress?.split('@')[0] ||
    `user_${userId.slice(-4)}`;
  const avatarUrl = clerkUser.imageUrl;

  const [newUser] = await db
    .insert(users)
    .values({
      id: userId,
      username,
      avatarUrl,
    })
    .returning();

  return newUser;
}
