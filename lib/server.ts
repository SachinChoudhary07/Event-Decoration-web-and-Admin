import {seed} from './seed';
import {storage} from './storage';
import type {Catalog, Category, Decoration, Settings, Testimonial} from './types';

type Stored = Omit<Catalog, 'sample'>;
const KEY = 'catalog';

export const siteUrl = () => (process.env.SITE_URL || process.env.URL || 'http://localhost:5173').replace(/\/$/, '');

async function load(): Promise<Catalog> {
  const saved = await storage().getJSON<Stored>(KEY);
  return saved ? {...saved, sample: false} : structuredClone(seed);
}

export async function catalog(admin = false): Promise<Catalog> {
  const c = await load();
  c.categories.sort((a, b) => a.order - b.order);
  c.decorations.sort((a, b) => a.order - b.order);
  if (!admin) {
    c.categories = c.categories.filter(x => x.active);
    c.decorations = c.decorations.filter(x => x.published && c.categories.some(y => y.id === x.categoryId));
    c.testimonials = c.testimonials.filter(x => x.published);
  }
  return c;
}

async function write(mutate: (c: Stored) => void) {
  const {sample: _sample, ...current} = await load();
  mutate(current);
  await storage().setJSON(KEY, current);
}

function upsert<T extends {id: string}>(list: T[], item: T) {
  const i = list.findIndex(x => x.id === item.id);
  if (i >= 0) list[i] = item; else list.push(item);
}

export async function saveCategory(c: Category) {
  await write(s => {
    if (s.categories.some(x => x.slug === c.slug && x.id !== c.id)) throw Error('UNIQUE');
    upsert(s.categories, c);
  });
}

export async function saveDecoration(d: Decoration) {
  await write(s => {
    if (!s.categories.some(x => x.id === d.categoryId)) throw Error('Choose a valid category');
    if (s.decorations.some(x => x.slug === d.slug && x.id !== d.id)) throw Error('UNIQUE');
    upsert(s.decorations, d);
  });
}

export async function saveTestimonial(t: Testimonial) {
  await write(s => upsert(s.testimonials, t));
}

export async function saveSettings(settings: Settings) {
  await write(s => { s.settings = settings; });
}

export async function deleteRecord(kind: 'category' | 'decoration' | 'testimonial', id: string) {
  await write(s => {
    if (kind === 'category') {
      if (s.decorations.some(d => d.categoryId === id)) throw Error('FOREIGN KEY');
      s.categories = s.categories.filter(x => x.id !== id);
    } else if (kind === 'decoration') s.decorations = s.decorations.filter(x => x.id !== id);
    else s.testimonials = s.testimonials.filter(x => x.id !== id);
  });
}

function zodMessage(e: {issues: {path: (string | number)[]; message: string}[]}) {
  const first = e.issues[0];
  return first ? `${first.path.join(' › ') || 'Form'}: ${first.message}` : 'Please check the form fields';
}

export function errorResponse(e: unknown) {
  console.error('Request failed', e);
  const message = e instanceof Error ? e.message : 'Request failed';
  const body = message === 'FORBIDDEN' ? 'Please sign in again'
    : message === 'UNIQUE' ? 'This slug is already in use'
    : message === 'FOREIGN KEY' ? 'Remove or move this category’s decorations first'
    : e && typeof e === 'object' && 'issues' in e ? zodMessage(e as {issues: {path: (string | number)[]; message: string}[]})
    : message;
  return Response.json({error: body}, {status: message === 'FORBIDDEN' ? 401 : 400});
}
