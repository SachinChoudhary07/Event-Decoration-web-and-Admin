import {authorize} from '@/lib/auth';
import {errorResponse} from '@/lib/server';
import {storage} from '@/lib/storage';

// Netlify Functions accept request bodies up to ~6 MB, so keep a margin.
const MAX_IMAGE = 4.5 * 1024 * 1024;
const MAX_VIDEO = 4.5 * 1024 * 1024;
const types: Record<string, string> = {'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'video/mp4': 'mp4'};

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    authorize(req);
    if (Number(req.headers.get('content-length') || 0) > MAX_VIDEO + 64 * 1024) throw Error('File too large. Maximum upload is 4.5 MB.');
    const f = (await req.formData()).get('file');
    if (!(f instanceof File)) throw Error('Choose a file');
    if (!types[f.type]) throw Error('Use JPG, PNG, WebP or MP4');
    const video = f.type === 'video/mp4';
    if (f.size > (video ? MAX_VIDEO : MAX_IMAGE)) throw Error('File too large. Maximum upload is 4.5 MB.');
    const bytes = new Uint8Array(await f.arrayBuffer());
    const text = (a: number, b: number) => new TextDecoder().decode(bytes.slice(a, b));
    const sig = Array.from(bytes.slice(0, 8));
    const valid = f.type === 'image/jpeg' ? sig[0] === 255 && sig[1] === 216 && sig[2] === 255
      : f.type === 'image/png' ? sig.join(',') === '137,80,78,71,13,10,26,10'
      : f.type === 'image/webp' ? text(0, 4) === 'RIFF' && text(8, 12) === 'WEBP'
      : text(4, 8) === 'ftyp';
    if (!valid) throw Error('File content does not match its type');
    const id = crypto.randomUUID();
    const key = `${video ? 'videos' : 'decorations'}/${id}.${types[f.type]}`;
    await storage().setFile(key, bytes, f.type);
    return Response.json({id, url: '/api/media/' + key, type: video ? 'video' : 'image'});
  } catch (e) { return errorResponse(e); }
}
