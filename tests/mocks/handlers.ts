import { http, HttpResponse } from 'msw';

export const handlers = [
  http.post('https://blob.vercel-storage.com/*', async () => {
    return HttpResponse.json({
      url: 'https://mock-blob-storage.com/test-image.jpg',
      downloadUrl: 'https://mock-blob-storage.com/test-image.jpg',
      pathname: 'test-image.jpg',
      contentType: 'image/jpeg',
    });
  }),
  http.delete('https://blob.vercel-storage.com/*', async () => {
    return HttpResponse.json({ success: true });
  }),
  http.post('https://generativelanguage.googleapis.com/v1beta/*', async () => {
    return HttpResponse.json({
      candidates: [
        {
          content: {
            parts: [
              {
                text: 'Mocked Gemini AI response: Identified species as Anas platyrhynchos (Mallard Duck).',
              },
            ],
            role: 'model',
          },
          finishReason: 'STOP',
        },
      ],
    });
  }),
  http.post('/api/capture', async () => {
    return HttpResponse.json({
      isNewDiscovery: true,
      animal: {
        id: 'a1',
        species: 'Mallard Duck',
        name: 'Quackers',
        imageUrl: 'https://mock.test/duck.jpg',
      },
      encounter: {
        id: 'e1',
        capturedAt: '2026-07-23T21:00:00.000Z',
      },
    });
  }),
];

