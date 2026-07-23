import { pgTable, uuid, varchar, doublePrecision, timestamp, text } from 'drizzle-orm/pg-core';

// 1. Users Table (Clerk cached profile data)
export const users = pgTable('users', {
  id: varchar('id', { length: 255 }).primaryKey(), // Clerk User ID (e.g. user_2xxx)
  username: varchar('username', { length: 255 }).notNull(),
  avatarUrl: varchar('avatar_url', { length: 1024 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 2. Animals Table (Unique animal discoveries)
export const animals = pgTable('animals', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  species: varchar('species', { length: 255 }).notNull(),
  backstory: text('backstory').notNull(),
  photoUrl: varchar('photo_url', { length: 1024 }).notNull(),
  discovererId: varchar('discoverer_id', { length: 255 })
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  h3Index: varchar('h3_index', { length: 32 }).notNull(),
  latitude: doublePrecision('latitude').notNull(),
  longitude: doublePrecision('longitude').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 3. Encounters Table (Tracks sightings of animals)
export const encounters = pgTable('encounters', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: varchar('user_id', { length: 255 })
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  animalId: uuid('animal_id')
    .references(() => animals.id, { onDelete: 'cascade' })
    .notNull(),
  photoUrl: varchar('photo_url', { length: 1024 }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Inferred TypeScript Types
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type Animal = typeof animals.$inferSelect;
export type NewAnimal = typeof animals.$inferInsert;

export type Encounter = typeof encounters.$inferSelect;
export type NewEncounter = typeof encounters.$inferInsert;
