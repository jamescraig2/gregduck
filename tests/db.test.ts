import { describe, it, expect } from 'vitest';
import { users, animals, encounters, db, pool } from '../lib';
import * as dbModule from '../lib/db';
import * as schemaModule from '../lib/db/schema';

describe('Database Schema & Connection Pool', () => {
  it('exports users table with correct columns', () => {
    expect(users).toBeDefined();
    expect(users.id).toBeDefined();
    expect(users.username).toBeDefined();
    expect(users.avatarUrl).toBeDefined();
    expect(users.createdAt).toBeDefined();
  });

  it('exports animals table with correct columns and foreign keys', () => {
    expect(animals).toBeDefined();
    expect(animals.id).toBeDefined();
    expect(animals.name).toBeDefined();
    expect(animals.species).toBeDefined();
    expect(animals.backstory).toBeDefined();
    expect(animals.photoUrl).toBeDefined();
    expect(animals.discovererId).toBeDefined();
    expect(animals.h3Index).toBeDefined();
    expect(animals.latitude).toBeDefined();
    expect(animals.longitude).toBeDefined();
    expect(animals.createdAt).toBeDefined();
  });

  it('exports encounters table with correct columns and foreign keys', () => {
    expect(encounters).toBeDefined();
    expect(encounters.id).toBeDefined();
    expect(encounters.userId).toBeDefined();
    expect(encounters.animalId).toBeDefined();
    expect(encounters.photoUrl).toBeDefined();
    expect(encounters.createdAt).toBeDefined();
  });

  it('exports db and pool connection instances', () => {
    expect(db).toBeDefined();
    expect(pool).toBeDefined();
    expect(dbModule.db).toBe(db);
    expect(dbModule.pool).toBe(pool);
  });

  it('re-exports everything from lib index', () => {
    expect(schemaModule.users).toBe(users);
    expect(schemaModule.animals).toBe(animals);
    expect(schemaModule.encounters).toBe(encounters);
  });
});
