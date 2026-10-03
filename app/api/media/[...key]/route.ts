import {storage} from '@/lib/storage';

export const dynamic = 'force-dynamic';

export async function GET(_req: Request, {params}: {params: Promise<{key: string[]}>}) {
  try {
    const {key} = await params;
    const name = key.join('/');
    if (!/^(decorations|videos)\/[0-9a-f-]{36}\.(jpg|png|webp|mp4)$/.test(name)) return new Response('Not found', {status: 404});
    const file = await storage().getFile(name);
    if (!file) return new Response('Not found', {status: 404});
    // Keys are random UUIDs and never overwritten, so caching forever is safe.
    const cache = 'public, max-age=31536000, immutable';
    return new Response(file.data, {headers: {
      'Content-Type': file.type,
      'Content-Length': String(file.data.byteLength),
      'Cache-Control': cache,
      'Netlify-CDN-Cache-Control': cache,
      'X-Content-Type-Options': 'nosniff',
    }});
  } catch {
    return new Response('Media unavailable', {status: 503});
  }
}
