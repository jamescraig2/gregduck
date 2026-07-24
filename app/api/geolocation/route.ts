import { NextResponse } from 'next/server';

/**
 * GET /api/geolocation
 *
 * Server-side proxy for IP geolocation. Forwards the request to ipapi.co so
 * that the client's IP address is never exposed to a third-party service
 * directly from the browser (GDPR risk mitigation).
 */
export async function GET() {
  try {
    const res = await fetch('https://ipapi.co/json/', {
      headers: { Accept: 'application/json' },
      // Next.js will cache this by default — we want fresh results per request
      cache: 'no-store',
    });

    if (!res.ok) {
      return NextResponse.json({ error: 'Geolocation lookup failed' }, { status: 502 });
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: 'Geolocation unavailable' }, { status: 503 });
  }
}
