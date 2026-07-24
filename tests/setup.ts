import React from 'react';
import '@testing-library/jest-dom';
import { beforeAll, afterEach, afterAll, vi } from 'vitest';
import { server } from './mocks/server';

beforeAll(() => {
  server.listen({ onUnhandledRequest: 'warn' });
});

afterEach(() => {
  server.resetHandlers();
  vi.clearAllMocks();
});

afterAll(() => {
  server.close();
});

// Mock Clerk Client
vi.mock('@clerk/nextjs', () => ({
  useUser: vi.fn(() => ({
    isSignedIn: true,
    isLoaded: true,
    user: {
      id: 'usr_mock_123',
      firstName: 'Test',
      lastName: 'User',
      primaryEmailAddress: { emailAddress: 'test@example.com' },
    },
  })),
  useAuth: vi.fn(() => ({
    isLoaded: true,
    isSignedIn: true,
    userId: 'usr_mock_123',
    sessionId: 'sess_mock_123',
    getToken: vi.fn().mockResolvedValue('mock_token'),
  })),
  ClerkProvider: ({ children }: { children: React.ReactNode }) => children,
  SignedIn: ({ children }: { children: React.ReactNode }) =>
    React.createElement('div', { 'data-testid': 'clerk-signed-in' }, children),
  SignedOut: ({ children }: { children: React.ReactNode }) =>
    React.createElement('div', { 'data-testid': 'clerk-signed-out' }, children),
  SignInButton: ({ children }: { children?: React.ReactNode }) =>
    React.createElement(
      'div',
      { 'data-testid': 'clerk-sign-in-button' },
      children || React.createElement('button', null, 'Sign In'),
    ),
  SignIn: () => null,
  SignUp: () => null,
  UserButton: () =>
    React.createElement('div', { 'data-testid': 'clerk-user-button' }, 'UserButton'),
}));

// Mock Clerk Server
vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn(() => Promise.resolve({ userId: 'usr_mock_123', sessionId: 'sess_mock_123' })),
  currentUser: vi.fn(() =>
    Promise.resolve({
      id: 'usr_mock_123',
      firstName: 'Test',
      lastName: 'User',
      emailAddresses: [{ emailAddress: 'test@example.com' }],
    }),
  ),
  clerkClient: {
    users: {
      getUser: vi.fn().mockResolvedValue({ id: 'usr_mock_123' }),
      updateUser: vi.fn().mockResolvedValue({ id: 'usr_mock_123' }),
    },
  },
}));

// Mock Vercel Blob Client
vi.mock('@vercel/blob', () => ({
  put: vi.fn().mockResolvedValue({
    url: 'https://mock-blob-storage.com/image.jpg',
    downloadUrl: 'https://mock-blob-storage.com/image.jpg',
    pathname: 'uploads/image.jpg',
    contentType: 'image/jpeg',
  }),
  del: vi.fn().mockResolvedValue({ success: true }),
  list: vi.fn().mockResolvedValue({ blobs: [], cursor: undefined, hasMore: false }),
  head: vi.fn().mockResolvedValue({
    url: 'https://mock-blob-storage.com/image.jpg',
    size: 1024,
    uploadedAt: new Date(),
    contentType: 'image/jpeg',
  }),
}));

// Mock Google Generative AI
vi.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: vi.fn().mockImplementation(function () {
    return {
      getGenerativeModel: vi.fn().mockReturnValue({
        generateContent: vi.fn().mockResolvedValue({
          response: {
            text: () =>
              JSON.stringify({
                isAnimal: true,
                species: 'Eastern Gray Squirrel',
                name: 'Nutty',
                backstory: 'Loves hoarding acorns in campus parks.',
                confidence: 0.95,
              }),
          },
        }),
      }),
    };
  }),
}));
