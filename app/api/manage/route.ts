import {z} from 'zod';
import {authorize} from '@/lib/auth';
import {catalog, deleteRecord, errorResponse, saveCategory, saveDecoration, saveSettings, saveTestimonial} from '@/lib/server';

const str = z.string().max(10000);
const id = z.string().min(1).max(150);
const slug = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Use lowercase letters, numbers and hyphens').max(150);
const url = z.string().max(2000).refine(v => !v || v.startsWith('/api/media/') || v.startsWith('/images/') || /^https:\/\//.test(v), 'Use an HTTPS URL or uploaded image');
const cat = z.object({id, name: z.string().min(1).max(120), slug, description: str, cover: url, order: z.number().int().min(0).max(10000), active: z.boolean()});
const media = z.object({id, url, type: z.enum(['image', 'video']), poster: url.optional()});
const dec = z.object({id, categoryId: id, title: z.string().min(1).max(150), slug, shortDescription: str, description: str, price: z.number().min(0).max(1e8), discount: z.number().min(0).nullable(), inclusions: str, tags: str, featured: z.boolean(), published: z.boolean(), order: z.number().int().min(0), createdAt: str, media: z.array(media).max(30)}).refine(v => v.discount === null || v.discount < v.price, 'Discounted price must be below starting price');
const rev = z.object({id, name: z.string().min(1).max(120), review: z.string().min(1).max(2000), rating: z.number().min(1).max(5), event: str, published: z.boolean()});
const settings = z.object({name: z.string().min(1).max(120), description: str, whatsapp: z.string().regex(/^\+?[1-9]\d{7,14}$/, 'Use country code + number, e.g. 919876543210'), phone: str, email: z.string().email(), address: str, instagram: url, facebook: url, youtube: url, message: str, logo: url, favicon: url, seoTitle: str, seoDescription: str});

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try { authorize(req); return Response.json(await catalog(true), {headers: {'Cache-Control': 'no-store'}}); }
  catch (e) { return errorResponse(e); }
}

export async function POST(req: Request) {
  try {
    authorize(req);
    if (Number(req.headers.get('content-length') || 0) > 150000) throw Error('Request too large');
    const {kind, data} = await req.json() as {kind: string; data: unknown};
    if (kind === 'category') await saveCategory(cat.parse(data));
    else if (kind === 'decoration') await saveDecoration(dec.parse(data));
    else if (kind === 'testimonial') await saveTestimonial(rev.parse(data));
    else if (kind === 'settings') await saveSettings(settings.parse(data));
    else throw Error('Invalid record type');
    return Response.json({ok: true});
  } catch (e) { return errorResponse(e); }
}

export async function DELETE(req: Request) {
  try {
    authorize(req);
    const {kind, id: recordId} = await req.json() as {kind: string; id: string};
    id.parse(recordId);
    if (kind !== 'category' && kind !== 'decoration' && kind !== 'testimonial') throw Error('Invalid record type');
    await deleteRecord(kind, recordId);
    return Response.json({ok: true});
  } catch (e) { return errorResponse(e); }
}
