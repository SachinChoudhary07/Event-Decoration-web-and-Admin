'use client';
import {useEffect, useMemo, useState} from 'react';
import {toast} from 'sonner';
import {Upload} from 'lucide-react';
import {Dialog, DialogContent, DialogTitle, DialogDescription} from '@/components/ui/dialog';
import {AlertDialog, AlertDialogContent, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction} from '@/components/ui/alert-dialog';
import {Switch} from '@/components/ui/switch';
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from '@/components/ui/select';
import {Progress} from '@/components/ui/progress';
import {Photo} from './catalog';
import {money} from '@/lib/types';
import type {Catalog, Category, Decoration, Media, Settings, Testimonial} from '@/lib/types';

type Kind = 'category' | 'decoration' | 'testimonial';
type RecordData = Category | Decoration | Testimonial;
const slugify = (v: string) => v.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const slugOk = (v: string) => /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(v);

async function request(method: string, body?: unknown) {
  const r = await fetch('/api/manage', {method, headers: {'Content-Type': 'application/json'}, body: body ? JSON.stringify(body) : undefined});
  const j = await r.json() as {error?: string};
  if (!r.ok) throw Error(j.error || 'Unable to save');
  return j as Catalog;
}

function Field({label, value, onChange, type = 'text', area = false, full = false, required = false, error}: {label: string; value: string | number; onChange: (v: string) => void; type?: string; area?: boolean; full?: boolean; required?: boolean; error?: string}) {
  return <label className={'field ' + (full ? 'full' : '')}>{label}{area ? <textarea value={value} onChange={e => onChange(e.target.value)} required={required} /> : <input type={type} value={value} onChange={e => onChange(e.target.value)} required={required} min={type === 'number' ? 0 : undefined} />}{error && <span className='err'>{error}</span>}</label>;
}
function Toggle({label, value, onChange}: {label: string; value: boolean; onChange: (v: boolean) => void}) {
  return <label className='toggle-field'><Switch checked={value} onCheckedChange={onChange} />{label}</label>;
}
async function optimize(file: File) {
  if (!file.type.startsWith('image/')) return file;
  const bitmap = await createImageBitmap(file);
  const ratio = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * ratio);
  canvas.height = Math.round(bitmap.height * ratio);
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const blob = await new Promise<Blob | null>(r => canvas.toBlob(r, 'image/webp', 0.85));
  return blob ? new File([blob], file.name.replace(/\.[^.]+$/, '.webp'), {type: 'image/webp'}) : file;
}
function uploadFile(file: File, progress: (v: number) => void): Promise<Media> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/upload');
    xhr.upload.onprogress = e => { if (e.lengthComputable) progress(Math.round(e.loaded / e.total * 100)); };
    xhr.onload = () => { try { const d = JSON.parse(xhr.responseText); if (xhr.status >= 400) reject(Error(d.error)); else resolve(d); } catch { reject(Error('Upload failed')); } };
    xhr.onerror = () => reject(Error('Connection interrupted. Please retry.'));
    const f = new FormData();
    f.set('file', file);
    xhr.send(f);
  });
}
function Uploader({media, onChange, single = false}: {media: Media[]; onChange: (v: Media[]) => void; single?: boolean}) {
  const [progress, setProgress] = useState<number | null>(null);
  async function pick(files: FileList | null) {
    if (!files) return;
    const chosen = Array.from(files);
    if (chosen.length + media.length > 30) { toast.error('Maximum 30 media files per decoration'); return; }
    try {
      const added: Media[] = [];
      for (const file of chosen) {
        if (!['image/jpeg', 'image/png', 'image/webp', 'video/mp4'].includes(file.type) || (single && file.type === 'video/mp4')) throw Error('Choose JPG, PNG, WebP' + (!single ? ' or MP4' : ''));
        if (file.size > (file.type === 'video/mp4' ? 4.5 : 20) * 1024 * 1024) throw Error('Photos: 20 MB maximum. Videos: 4.5 MB maximum.');
        setProgress(0);
        const ready = await optimize(file);
        if (ready.size > 4.5 * 1024 * 1024) throw Error('This file is still larger than 4.5 MB after compression. Try a smaller one.');
        const item = await uploadFile(ready, setProgress);
        added.push(item);
        onChange(single ? [item] : [...media, ...added]);
      }
      toast.success('Upload ready. Save to publish it.');
    } catch (e) { toast.error((e as Error).message); }
    finally { setProgress(null); }
  }
  return <div className='upload-box'>
    <div className='row'><Upload size={16} /><strong>{single ? 'Image' : 'Photographs and video'}</strong></div>
    <p className='muted'>JPG, PNG, WebP up to 20 MB{!single ? ' · short MP4 clips up to 4.5 MB' : ''}. Images are resized before upload. The first image is the cover.</p>
    <input aria-label='Upload media' disabled={progress !== null} type='file' multiple={!single} accept={single ? 'image/jpeg,image/png,image/webp' : 'image/jpeg,image/png,image/webp,video/mp4'} onChange={e => { pick(e.target.files); e.target.value = ''; }} />
    {progress !== null && <><Progress value={progress} className='mt-3' /><small>Uploading {progress}%</small></>}
    <div className='upload-preview'>{media.map((m, i) => <div key={m.id}>
      {m.type === 'video' ? <video src={m.url} controls preload='metadata' /> : <Photo src={m.url} alt={'Uploaded image ' + (i + 1)} />}
      <div>
        <small>{i === 0 ? 'Cover' : `Image ${i + 1}`}</small><br />
        {i > 0 && <button type='button' onClick={() => onChange([m, ...media.filter(x => x.id !== m.id)])}>Make cover</button>}
        {i > 0 && <button type='button' aria-label='Move earlier' onClick={() => { const a = [...media]; [a[i - 1], a[i]] = [a[i], a[i - 1]]; onChange(a); }}>Earlier</button>}
        {i < media.length - 1 && <button type='button' aria-label='Move later' onClick={() => { const a = [...media]; [a[i + 1], a[i]] = [a[i], a[i + 1]]; onChange(a); }}>Later</button>}
        <button type='button' className='danger' onClick={() => onChange(media.filter(x => x.id !== m.id))}>Remove</button>
        {m.type === 'video' && <input placeholder='Poster image URL' aria-label='Video poster URL' value={m.poster || ''} onChange={e => onChange(media.map(x => x.id === m.id ? {...x, poster: e.target.value} : x))} />}
      </div>
    </div>)}</div>
  </div>;
}

const tabs = ['Overview', 'Decorations', 'Categories', 'Media', 'Testimonials', 'Settings'] as const;
type Tab = typeof tabs[number];

export function Admin({initial, email}: {initial: Catalog; email: string}) {
  const [data, setData] = useState(initial);
  const [tab, setTab] = useState<Tab>('Overview');
  const [editor, setEditor] = useState<{kind: Kind; record: RecordData} | null>(null);
  const [dirty, setDirty] = useState(false);
  const [deleting, setDeleting] = useState<{kind: Kind; id: string; name: string} | null>(null);
  const [busy, setBusy] = useState(false);
  const [settings, setSettings] = useState(initial.settings);
  const [q, setQ] = useState('');
  const [catFilter, setCatFilter] = useState('all');
  const [status, setStatus] = useState('all');
  const [sort, setSort] = useState('order');
  const [selected, setSelected] = useState<string[]>([]);

  async function refresh() {
    const next = await request('GET');
    setData(next);
    setSettings(next.settings);
    setSelected([]);
  }
  async function save(kind: string, record: unknown) {
    setBusy(true);
    try {
      await request('POST', {kind, data: record});
      await refresh();
      setEditor(null);
      setDirty(false);
      toast.success('Saved');
    } catch (e) { toast.error((e as Error).message); }
    finally { setBusy(false); }
  }
  function add(kind: Kind) {
    const id = crypto.randomUUID();
    const record: RecordData = kind === 'category'
      ? {id, name: '', slug: '', description: '', cover: '', order: data.categories.length, active: true}
      : kind === 'decoration'
        ? {id, categoryId: data.categories[0]?.id || '', title: '', slug: '', shortDescription: '', description: '', price: 0, discount: null, inclusions: '', tags: '', featured: false, published: false, order: data.decorations.length, createdAt: new Date().toISOString(), media: []}
        : {id, name: '', review: '', rating: 5, event: '', published: true};
    setDirty(false);
    setEditor({kind, record});
  }
  function askClose() {
    if (busy) return;
    if (dirty && !confirm('Close without saving?')) return;
    setEditor(null);
    setDirty(false);
  }
  const decorations = useMemo(() => {
    return data.decorations.filter(d => {
      const cat = data.categories.find(c => c.id === d.categoryId)?.name || '';
      const text = `${d.title} ${d.tags} ${cat}`.toLowerCase().includes(q.toLowerCase());
      const catOk = catFilter === 'all' || d.categoryId === catFilter;
      const statusOk = status === 'all' || (status === 'published' && d.published) || (status === 'draft' && !d.published) || (status === 'featured' && d.featured);
      return text && catOk && statusOk;
    }).sort((a, b) => sort === 'price' ? (a.discount ?? a.price) - (b.discount ?? b.price) : sort === 'newest' ? b.createdAt.localeCompare(a.createdAt) : sort === 'title' ? a.title.localeCompare(b.title) : a.order - b.order);
  }, [data, q, catFilter, status, sort]);

  async function bulk(patch: Partial<Decoration>) {
    const rows = data.decorations.filter(d => selected.includes(d.id));
    if (!rows.length) return;
    setBusy(true);
    try {
      for (const row of rows) await request('POST', {kind: 'decoration', data: {...row, ...patch}});
      await refresh();
      toast.success('Updated ' + rows.length + ' designs');
    } catch (e) { toast.error((e as Error).message); }
    finally { setBusy(false); }
  }

  useEffect(() => {
    const changed = tab === 'Settings' && JSON.stringify(settings) !== JSON.stringify(data.settings);
    if (!changed) return;
    const warn = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [settings, data.settings, tab]);
  const mediaCount = data.decorations.reduce((n, d) => n + d.media.length, 0);
  return <div className='studio'>
    <aside className='studio-side'>
      <a className='brand' href='/'>{data.settings.name}<small>Studio</small></a>
      <nav aria-label='Studio sections'>{tabs.map(name => <button key={name} aria-current={tab === name ? 'page' : undefined} onClick={() => setTab(name)}>{name}</button>)}</nav>
      <div className='studio-user'>
        <a className='btn' href='/'>View website</a>
        <span>Signed in as {email}</span>
        <button type='button' className='text-btn' style={{textAlign: 'left'}} onClick={async () => { await fetch('/api/auth/logout', {method: 'POST'}); window.location.href = '/admin'; }}>Sign out</button>
      </div>
    </aside>
    <div className='studio-main'>
      <div className='studio-tabs' role='tablist'>{tabs.map(name => <button key={name} aria-current={tab === name ? 'page' : undefined} onClick={() => setTab(name)}>{name}</button>)}</div>
      <div className='studio-top'>
        <div>
          <span className='eyebrow'>Studio</span>
          <h1>{tab}</h1>
          <p>{tab === 'Decorations' ? 'Search, publish, and edit designs without leaving the list.' : 'Manage the catalogue that visitors browse.'}</p>
        </div>
        {tab === 'Categories' && <button className='btn primary' onClick={() => add('category')}>Add category</button>}
        {tab === 'Decorations' && <button className='btn primary' onClick={() => add('decoration')}>Add decoration</button>}
        {tab === 'Testimonials' && <button className='btn primary' onClick={() => add('testimonial')}>Add review</button>}
      </div>
      {data.sample && <div className='notice'>This is the sample catalogue. The first save copies it into your database. Demo enquiries still use the sample WhatsApp number until you change Settings.</div>}

      {tab === 'Overview' && <>
        <div className='admin-stats'>
          {[['Categories', data.categories.length], ['Decorations', data.decorations.length], ['Published', data.decorations.filter(d => d.published).length], ['Featured', data.decorations.filter(d => d.featured).length], ['Media', mediaCount]].map(([label, n]) => <div className='admin-stat' key={String(label)}><span>{label}</span><strong>{n}</strong></div>)}
        </div>
        <div className='section-head'><h2>Recent designs</h2><button className='text-link' onClick={() => setTab('Decorations')}>Open the list</button></div>
        <div className='admin-list'>{[...data.decorations].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 6).map(d => <DecorationRow key={d.id} d={d} category={data.categories.find(c => c.id === d.categoryId)?.name} onEdit={() => { setDirty(false); setEditor({kind: 'decoration', record: d}); }} />)}</div>
      </>}

      {tab === 'Decorations' && <>
        <div className='toolbar'>
          <input aria-label='Search decorations' placeholder='Search title or tag' value={q} onChange={e => setQ(e.target.value)} />
          <select aria-label='Filter by category' value={catFilter} onChange={e => setCatFilter(e.target.value)}>
            <option value='all'>All categories</option>
            {data.categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select aria-label='Filter by status' value={status} onChange={e => setStatus(e.target.value)}>
            <option value='all'>Any status</option>
            <option value='published'>Published</option>
            <option value='draft'>Draft</option>
            <option value='featured'>Featured</option>
          </select>
          <select aria-label='Sort decorations' value={sort} onChange={e => setSort(e.target.value)}>
            <option value='order'>Display order</option>
            <option value='title'>Title</option>
            <option value='price'>Price</option>
            <option value='newest'>Newest</option>
          </select>
        </div>
        {selected.length > 0 && <div className='bulk-bar'>
          <span>{selected.length} selected</span>
          <button className='btn' disabled={busy} onClick={() => bulk({published: true})}>Publish</button>
          <button className='btn' disabled={busy} onClick={() => bulk({published: false})}>Unpublish</button>
          <button className='btn' disabled={busy} onClick={() => bulk({featured: true})}>Feature</button>
          <button className='btn' disabled={busy} onClick={() => bulk({featured: false})}>Unfeature</button>
          <button className='text-btn' onClick={() => setSelected([])}>Clear</button>
        </div>}
        {!decorations.length && <div className='catalog-empty'><h2>No designs in this view.</h2><p>Change the filters, or add a decoration.</p></div>}
        <div className='table-wrap'><table className='data'>
          <thead><tr>
            <th><input aria-label='Select all visible' type='checkbox' checked={decorations.length > 0 && decorations.every(d => selected.includes(d.id))} onChange={e => setSelected(e.target.checked ? decorations.map(d => d.id) : [])} /></th>
            <th>Image</th><th>Design</th><th>Price</th><th>Status</th><th></th>
          </tr></thead>
          <tbody>{decorations.map(d => {
            const cover = d.media.find(m => m.type === 'image') || d.media[0];
            return <tr key={d.id}>
              <td><input aria-label={'Select ' + d.title} type='checkbox' checked={selected.includes(d.id)} onChange={e => setSelected(cur => e.target.checked ? [...cur, d.id] : cur.filter(id => id !== d.id))} /></td>
              <td><Photo className='thumb' src={cover?.type === 'video' ? cover.poster : cover?.url} alt='' /></td>
              <td><strong>{d.title}</strong><br /><span className='muted'>{data.categories.find(c => c.id === d.categoryId)?.name} · {d.media.length} files</span></td>
              <td>{money(d.discount ?? d.price)}</td>
              <td><span className={'status ' + (d.published ? 'live' : 'draft')}>{d.published ? 'Published' : 'Draft'}</span>{d.featured ? ' · Featured' : ''}</td>
              <td className='row-actions'>
                <button onClick={() => { setDirty(false); setEditor({kind: 'decoration', record: d}); }}>Edit</button>
                {d.published ? <a href={'/decoration/' + d.slug}>Preview</a> : <span className='muted'>Draft</span>}
                <button className='danger' onClick={() => setDeleting({kind: 'decoration', id: d.id, name: d.title})}>Delete</button>
              </td>
            </tr>;
          })}</tbody>
        </table></div>
      </>}

      {tab === 'Categories' && <div className='admin-list'>{data.categories.map(c => <article key={c.id}>
        <Photo src={c.cover} alt='' />
        <div><h3>{c.name}</h3><p>{c.description}</p><small>Order {c.order} · {c.active ? 'Visible' : 'Hidden'} · {data.decorations.filter(d => d.categoryId === c.id).length} designs</small></div>
        <div className='row-actions'><button onClick={() => { setDirty(false); setEditor({kind: 'category', record: c}); }}>Edit</button><button className='danger' onClick={() => setDeleting({kind: 'category', id: c.id, name: c.name})}>Delete</button></div>
      </article>)}</div>}

      {tab === 'Media' && <>
        <p className='notice'>Photographs are stored with each decoration. Change the cover and order from the decoration editor. Removing a photo from a listing does not delete the stored file.</p>
        {data.decorations.flatMap(d => d.media.map(m => <div className='media-row' key={d.id + m.id}>
          {m.type === 'video' ? <video src={m.url} poster={m.poster} preload='metadata' /> : <Photo src={m.url} alt={d.title} />}
          <div><strong>{d.title}</strong><p>{m.type === 'video' ? 'Video' : 'Photograph'}</p></div>
          <div className='row-actions'><button onClick={() => { setDirty(false); setEditor({kind: 'decoration', record: d}); }}>Edit decoration</button></div>
        </div>))}
        {!mediaCount && <div className='catalog-empty'><h2>No media yet.</h2><p>Add photographs from a decoration.</p></div>}
      </>}

      {tab === 'Testimonials' && <div>
        {!data.testimonials.length && <div className='notice'>No reviews yet. Publish only feedback you have permission to show.</div>}
        {data.testimonials.map(t => <article className='quote-admin' key={t.id}>
          <strong>{t.name} · {'★'.repeat(t.rating)}</strong>
          <p>{t.review}</p>
          <small className='muted'>{t.event} · {t.published ? 'Published' : 'Hidden'}</small>
          <div className='row-actions'><button onClick={() => { setDirty(false); setEditor({kind: 'testimonial', record: t}); }}>Edit</button><button className='danger' onClick={() => setDeleting({kind: 'testimonial', id: t.id, name: t.name})}>Delete</button></div>
        </article>)}
      </div>}

      {tab === 'Settings' && <form className='settings-form' onSubmit={e => { e.preventDefault(); save('settings', settings); }}>
        <div className='notice'>WhatsApp needs a country code, for example 916232580029. These details appear on the public site. The admin email and password are set in the hosting environment (ADMIN_EMAIL, ADMIN_PASSWORD_HASH), not here.</div>
        <div className='form-grid'>{Object.entries({name: 'Business name', description: 'Description', whatsapp: 'WhatsApp number', phone: 'Phone', email: 'Email', address: 'Service area', instagram: 'Instagram URL', facebook: 'Facebook URL', youtube: 'YouTube URL', message: 'Default WhatsApp message', logo: 'Logo URL', favicon: 'Favicon URL', seoTitle: 'SEO title', seoDescription: 'SEO description'}).map(([key, label]) => <Field key={key} label={label} value={settings[key as keyof Settings]} onChange={v => setSettings({...settings, [key]: v})} area={['description', 'message', 'seoDescription'].includes(key)} full={['description', 'message', 'seoDescription', 'address'].includes(key)} />)}</div>
        <h3 className='mt-6'>Logo</h3>
        <Uploader single media={settings.logo ? [{id: 'logo', url: settings.logo, type: 'image'}] : []} onChange={m => setSettings({...settings, logo: m[0]?.url || ''})} />
        <h3>Favicon</h3>
        <Uploader single media={settings.favicon ? [{id: 'favicon', url: settings.favicon, type: 'image'}] : []} onChange={m => setSettings({...settings, favicon: m[0]?.url || ''})} />
        <button disabled={busy} className='btn primary'>{busy ? 'Saving…' : 'Save settings'}</button>
      </form>}
    </div>

    <Dialog open={!!editor} onOpenChange={v => { if (!v) askClose(); }}>
      <DialogContent className='editor'>
        <DialogTitle>{editor ? ((('title' in editor.record && editor.record.title) || ('name' in editor.record && editor.record.name) ? 'Edit ' : 'New ') + editor.kind) : ''}</DialogTitle>
        <DialogDescription>Nothing changes on the website until you save.</DialogDescription>
        {editor && <Editor key={editor.record.id} kind={editor.kind} initial={editor.record} categories={data.categories} busy={busy} onDirty={() => setDirty(true)} onSave={d => save(editor.kind, d)} />}
      </DialogContent>
    </Dialog>
    <AlertDialog open={!!deleting} onOpenChange={v => { if (!v && !busy) setDeleting(null); }}>
      <AlertDialogContent>
        <AlertDialogTitle>Delete {deleting?.name}?</AlertDialogTitle>
        <AlertDialogDescription>This removes it from the catalogue. A category that still has decorations cannot be deleted until those decorations are moved or removed.</AlertDialogDescription>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={busy}>Keep</AlertDialogCancel>
          <AlertDialogAction disabled={busy} onClick={async e => {
            e.preventDefault();
            if (!deleting) return;
            setBusy(true);
            try { await request('DELETE', deleting); await refresh(); setDeleting(null); toast.success('Deleted'); }
            catch (err) { toast.error((err as Error).message); }
            finally { setBusy(false); }
          }}>Delete</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </div>;
}

function DecorationRow({d, category, onEdit}: {d: Decoration; category?: string; onEdit: () => void}) {
  const cover = d.media.find(m => m.type === 'image') || d.media[0];
  return <article>
    <Photo src={cover?.type === 'video' ? cover.poster : cover?.url} alt='' />
    <div><h3>{d.title}</h3><p>{money(d.discount ?? d.price)} · {category} · {d.published ? 'Published' : 'Draft'}{d.featured ? ' · Featured' : ''}</p></div>
    <div className='row-actions'><button onClick={onEdit}>Edit</button>{d.published && <a href={'/decoration/' + d.slug}>Preview</a>}</div>
  </article>;
}

function Editor({kind, initial, categories, busy, onSave, onDirty}: {kind: Kind; initial: RecordData; categories: Category[]; busy: boolean; onSave: (d: RecordData) => void; onDirty: () => void}) {
  const [v, setV] = useState<Record<string, unknown>>(structuredClone(initial) as unknown as Record<string, unknown>);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState(false);
  const change = (k: string, x: unknown) => { setTouched(true); onDirty(); setV(cur => ({...cur, [k]: x})); };
  useEffect(() => {
    if (!touched) return;
    const warn = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [touched]);
  function validate() {
    const next: Record<string, string> = {};
    if (kind !== 'testimonial' && !slugOk(String(v.slug || ''))) next.slug = 'Use lowercase letters, numbers, and hyphens.';
    if (kind === 'decoration') {
      if (!v.categoryId) next.categoryId = 'Choose a category.';
      if (!(v.media as Media[]).length) next.media = 'Add at least one photograph or video.';
      if (v.discount !== null && v.discount !== '' && Number(v.discount) >= Number(v.price)) next.discount = 'Discount must be below the starting price.';
    }
    if (kind === 'category' && !v.cover) next.cover = 'Add a cover image.';
    setErrors(next);
    return Object.keys(next).length === 0;
  }
  return <form onSubmit={e => { e.preventDefault(); if (!validate()) { toast.error('Check the highlighted fields'); return; } onSave(v as unknown as RecordData); }}>
    <div className='form-grid'>
      {kind === 'category' && <>
        <Field label='Category name' value={String(v.name || '')} required error={errors.name} onChange={x => { setTouched(true); onDirty(); setV(cur => ({...cur, name: x, slug: !cur.slug || cur.slug === slugify(String(cur.name || '')) ? slugify(x) : cur.slug})); }} />
        <Field label='Slug' value={String(v.slug || '')} required error={errors.slug} onChange={x => change('slug', x)} />
        <Field label='Description' value={String(v.description || '')} area full onChange={x => change('description', x)} />
        <Field label='Display order' value={Number(v.order || 0)} type='number' onChange={x => change('order', Number(x))} />
        <Toggle label='Visible on the website' value={Boolean(v.active)} onChange={x => change('active', x)} />
        <Field label='Cover image URL' value={String(v.cover || '')} full error={errors.cover} onChange={x => change('cover', x)} />
      </>}
      {kind === 'decoration' && <>
        <Field label='Title' value={String(v.title || '')} required onChange={x => { setTouched(true); onDirty(); setV(cur => ({...cur, title: x, slug: !cur.slug || cur.slug === slugify(String(cur.title || '')) ? slugify(x) : cur.slug})); }} />
        <Field label='Slug' value={String(v.slug || '')} required error={errors.slug} onChange={x => change('slug', x)} />
        <label className='field'>Category
          <Select value={String(v.categoryId || '')} onValueChange={x => change('categoryId', x)}>
            <SelectTrigger className='w-full rounded-none'><SelectValue placeholder='Select category' /></SelectTrigger>
            <SelectContent>{categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
          </Select>
          {errors.categoryId && <span className='err'>{errors.categoryId}</span>}
        </label>
        <Field label='Display order' value={Number(v.order || 0)} type='number' onChange={x => change('order', Number(x))} />
        <Field label='Starting price (₹)' value={Number(v.price || 0)} type='number' required onChange={x => change('price', Number(x))} />
        <Field label='Discounted price' value={v.discount === null || v.discount === undefined ? '' : Number(v.discount)} type='number' error={errors.discount} onChange={x => change('discount', x === '' ? null : Number(x))} />
        <Field label='Short description' value={String(v.shortDescription || '')} full onChange={x => change('shortDescription', x)} />
        <Field label='Full description' value={String(v.description || '')} area full onChange={x => change('description', x)} />
        <Field label='Included (one item per line)' value={String(v.inclusions || '')} area full onChange={x => change('inclusions', x)} />
        <Field label='Tags, comma separated' value={String(v.tags || '')} full onChange={x => change('tags', x)} />
        <Toggle label='Published' value={Boolean(v.published)} onChange={x => change('published', x)} />
        <Toggle label='Featured on the homepage' value={Boolean(v.featured)} onChange={x => change('featured', x)} />
      </>}
      {kind === 'testimonial' && <>
        <Field label='Customer name' value={String(v.name || '')} required onChange={x => change('name', x)} />
        <label className='field'>Rating
          <Select value={String(v.rating)} onValueChange={x => change('rating', Number(x))}>
            <SelectTrigger className='rounded-none'><SelectValue /></SelectTrigger>
            <SelectContent>{[1, 2, 3, 4, 5].map(x => <SelectItem key={x} value={String(x)}>{x} stars</SelectItem>)}</SelectContent>
          </Select>
        </label>
        <Field label='Review' value={String(v.review || '')} required area full onChange={x => change('review', x)} />
        <Field label='Event' value={String(v.event || '')} onChange={x => change('event', x)} />
        <Toggle label='Published' value={Boolean(v.published)} onChange={x => change('published', x)} />
      </>}
    </div>
    {kind === 'category' && <Uploader single media={v.cover ? [{id: 'cover', url: String(v.cover), type: 'image'}] : []} onChange={m => change('cover', m[0]?.url || '')} />}
    {kind === 'decoration' && <>{errors.media && <p className='err'>{errors.media}</p>}<Uploader media={(v.media as Media[]) || []} onChange={m => change('media', m)} /></>}
    <button className='btn primary' disabled={busy} type='submit'>{busy ? 'Saving…' : 'Save'}</button>
  </form>;
}
