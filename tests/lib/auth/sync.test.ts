/* eslint-disable @typescript-eslint/no-explicit-any */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { syncUser } from '../../../lib/auth/sync';
import { db } from '../../../lib/db';
import { auth, clerkClient } from '@clerk/nextjs/server';

vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn(),
  clerkClient: vi.fn(),
}));

vi.mock('../../../lib/db', () => ({
  db: {
    query: {
      users: {
        findFirst: vi.fn(),
      },
    },
    insert: vi.fn(),
  },
}));

describe('syncUser', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return null if no userId', async () => {
    vi.mocked(auth).mockResolvedValue({ userId: null } as any);

    const result = await syncUser();

    expect(result).toBeNull();
    expect(db.query.users.findFirst).not.toHaveBeenCalled();
  });

  it('should return existing user if found in db', async () => {
    vi.mocked(auth).mockResolvedValue({ userId: 'user_123' } as any);
    const mockUser = { id: 'user_123', username: 'testuser', avatarUrl: null };
    vi.mocked(db.query.users.findFirst).mockResolvedValue(mockUser as any);

    const result = await syncUser();

    expect(result).toEqual(mockUser);
    expect(db.query.users.findFirst).toHaveBeenCalled();
    expect(clerkClient).not.toHaveBeenCalled();
  });

  it('should fetch from clerk and insert if not found in db', async () => {
    vi.mocked(auth).mockResolvedValue({ userId: 'user_123' } as any);
    vi.mocked(db.query.users.findFirst).mockResolvedValue(undefined as any);

    const mockClerkUser = {
      id: 'user_123',
      username: 'clerkuser',
      imageUrl: 'http://example.com/avatar.jpg',
    };

    const mockClient = {
      users: {
        getUser: vi.fn().mockResolvedValue(mockClerkUser),
      },
    };

    vi.mocked(clerkClient).mockResolvedValue(mockClient as any);

    const mockInsertedUser = {
      id: 'user_123',
      username: 'clerkuser',
      avatarUrl: 'http://example.com/avatar.jpg',
    };

    const returningMock = vi.fn().mockResolvedValue([mockInsertedUser]);
    const valuesMock = vi.fn().mockReturnValue({ returning: returningMock });
    vi.mocked(db.insert).mockReturnValue({ values: valuesMock } as any);

    const result = await syncUser();

    expect(result).toEqual(mockInsertedUser);
    expect(mockClient.users.getUser).toHaveBeenCalledWith('user_123');
    expect(db.insert).toHaveBeenCalled();
    expect(valuesMock).toHaveBeenCalledWith({
      id: 'user_123',
      username: 'clerkuser',
      avatarUrl: 'http://example.com/avatar.jpg',
    });
  });
});
