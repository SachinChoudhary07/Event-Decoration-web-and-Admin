'use client';
import {useEffect, useRef, useState} from 'react';
import {usePathname} from 'next/navigation';
import {
  ArrowLeft, ArrowRight, Cake, CalendarCheck, Check, ChevronLeft, ChevronRight, Expand, Flower2, Gem, Gift,
  House, LayoutGrid, Mail, MapPin, MessageCircle, PartyPopper, Phone, Play, Search, Sparkles, Star, Sun, X,
} from 'lucide-react';
import {Dialog, DialogContent, DialogTitle, DialogDescription} from '@/components/ui/dialog';
import type {Catalog, Category, Decoration, Settings, Media} from '@/lib/types';
import {money, whatsapp} from '@/lib/types';

const palette = [
  'linear-gradient(135deg,#ff8fab,#d6336c)',
  'linear-gradient(135deg,#ffd43b,#f76707)',
  'linear-gradient(135deg,#8ce99a,#2b8a3e)',
  'linear-gradient(135deg,#b197fc,#7048e8)',
  'linear-gradient(135deg,#4c6ef5,#1c1f5a)',
  'linear-gradient(135deg,#63e6be,#0c8599)',
];
const iconColors = ['#d6336c', '#e8590c', '#2b8a3e', '#7048e8', '#364fc7', '#0c8599'];

function iconFor(name = '') {
  if (/birth|cake/i.test(name)) return Cake;
  if (/haldi|sun|yellow/i.test(name)) return Sun;
  if (/mehndi|mehendi|flower|floral/i.test(name)) return Flower2;
  if (/ring|engage|wedding|marri|anniv/i.test(name)) return Gem;
  if (/fire|sky|light/i.test(name)) return Sparkles;
  if (/baby|shower|gift/i.test(name)) return Gift;
  return PartyPopper;
}
function look(data: Catalog, categoryId?: string) {
  const i = Math.max(0, data.categories.findIndex(c => c.id === categoryId));
  const c = data.categories[i];
  return {bg: palette[i % palette.length], color: iconColors[i % iconColors.length], Icon: iconFor(c?.name)};
}
const priceOf = (d: Decoration) => d.discount ?? d.price;
const coverOf = (d: Decoration) => {
  const m = d.media.find(x => x.type === 'image') || d.media[0];
  return m?.type === 'video' ? m.poster : m?.url;
};

/** Image that falls back to a placeholder, or hides itself so the coloured artwork behind it shows. */
export function Photo({src, alt, hideOnError = false, ...rest}: React.ImgHTMLAttributes<HTMLImageElement> & {hideOnError?: boolean}) {
  const ref = useRef<HTMLImageElement>(null);
  const fail = (img: HTMLImageElement) => {
    if (hideOnError) img.style.visibility = 'hidden';
    else if (!img.src.endsWith('/image-unavailable.svg')) img.src = '/image-unavailable.svg';
  };
  useEffect(() => {
    const img = ref.current;
    if (img && img.complete && img.naturalWidth === 0) fail(img);
  });
  if (!src && hideOnError) return null;
  return <img ref={ref} src={src || '/image-unavailable.svg'} alt={alt || ''} {...rest} onError={e => fail(e.currentTarget)} />;
}

export function WA({settings, title, className = '', children}: {settings: Settings; title?: string; className?: string; children?: React.ReactNode}) {
  return <a className={`btn btn-wa ${className}`} href={whatsapp(settings, title)} target='_blank' rel='noopener noreferrer'>
    <MessageCircle size={18} />{children ?? 'Book on WhatsApp'}
  </a>;
}

function Reveal({children, className = ''}: {children: React.ReactNode; className?: string}) {
  const ref = useRef<HTMLDivElement>(null);
  const [on, setOn] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { setOn(true); return; }
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setOn(true); io.disconnect(); } }, {threshold: 0.12});
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return <div ref={ref} className={`reveal ${on ? 'in' : ''} ${className}`}>{children}</div>;
}

export function Shell({data, children, dock = false}: {data: Catalog; children: React.ReactNode; dock?: boolean}) {
  const path = usePathname() || '/';
  const s = data.settings;
  const isDesigns = path.startsWith('/gallery') || path.startsWith('/category') || path.startsWith('/decoration');
  return <>
    <a className='skip' href='#content'>Skip to content</a>
    <header className='header'>
      <div className='wrap'>
        <a className='brand' href='/' aria-label={`${s.name} home`}>
          {s.logo ? <Photo src={s.logo} alt='' /> : <span className='brand-logo'><Sparkles size={20} /></span>}
          <span className='brand-name'>{s.name}<small>Decoration for every occasion</small></span>
        </a>
        <nav className='top-nav' aria-label='Main'>
          <a href='/' aria-current={path === '/' ? 'page' : undefined}>Home</a>
          <a href='/gallery' aria-current={isDesigns ? 'page' : undefined}>All designs</a>
          <a href='/#how'>How it works</a>
          <a href='/contact' aria-current={path.startsWith('/contact') ? 'page' : undefined}>Contact</a>
        </nav>
        <WA settings={s} className='header-wa'><span>Chat on WhatsApp</span></WA>
      </div>
    </header>

    <main id='content'>{children}</main>

    <footer className='site-foot'>
      <div className='wrap'>
        <div className='foot-grid'>
          <div>
            <span className='brand'><span className='brand-logo'><Sparkles size={20} /></span><span className='brand-name'>{s.name}<small>Decoration for every occasion</small></span></span>
            <p>{s.description}</p>
          </div>
          <div>
            <h4>Occasions</h4>
            <ul>{data.categories.map(c => <li key={c.id}><a href={'/category/' + c.slug}>{c.name}</a></li>)}</ul>
          </div>
          <div>
            <h4>Contact</h4>
            <ul>
              <li><a href={whatsapp(s)} target='_blank' rel='noopener noreferrer'>WhatsApp</a></li>
              {s.phone && <li><a href={'tel:' + s.phone}>{s.phone}</a></li>}
              {s.email && <li><a href={'mailto:' + s.email}>{s.email}</a></li>}
              {s.address && <li>{s.address}</li>}
              {[['Instagram', s.instagram], ['Facebook', s.facebook], ['YouTube', s.youtube]].filter(x => x[1]).map(x => <li key={x[0]}><a href={x[1]} target='_blank' rel='noopener noreferrer'>{x[0]}</a></li>)}
            </ul>
          </div>
        </div>
        {data.sample && <p className='demo-note'>Demo catalogue: the designs and prices shown are samples. Replace them from the Admin panel.</p>}
        <div className='foot-bottom'>
          <span>© {new Date().getFullYear()} {s.name}</span>
          <span>Designed & developed by Sachin Choudhary · <a href='tel:6232580029'>6232580029</a> · <a href='mailto:sachin.dev2910@gmail.com'>sachin.dev2910@gmail.com</a></span>
          <a href='/admin'>Admin login</a>
        </div>
      </div>
    </footer>

    {!dock && <nav className='tabbar' aria-label='Quick navigation'>
      <a href='/' aria-current={path === '/' ? 'page' : undefined}><House size={22} />Home</a>
      <a href='/gallery' aria-current={isDesigns ? 'page' : undefined}><LayoutGrid size={22} />Designs</a>
      <a className='tab-wa' href={whatsapp(s)} target='_blank' rel='noopener noreferrer'><i><MessageCircle size={22} /></i>WhatsApp</a>
      <a href='/contact' aria-current={path.startsWith('/contact') ? 'page' : undefined}><Phone size={22} />Contact</a>
    </nav>}
    <a className='float-wa' href={whatsapp(s)} target='_blank' rel='noopener noreferrer' aria-label='Chat on WhatsApp'><MessageCircle size={28} /></a>
  </>;
}

function CategoryCard({c, data, i}: {c: Category; data: Catalog; i: number}) {
  const {bg, color, Icon} = look(data, c.id);
  const count = data.decorations.filter(d => d.categoryId === c.id).length;
  return <a className='cat-card' href={'/category/' + c.slug} style={{'--i': i, background: bg} as React.CSSProperties}>
    <span className='art' aria-hidden><Icon /></span>
    <Photo src={c.cover} alt='' hideOnError loading={i < 4 ? 'eager' : 'lazy'} />
    <span className='cat-icon' aria-hidden style={{color}}><Icon size={20} /></span>
    <div className='cat-info'>
      <h3>{c.name}</h3>
      <span>{count} design{count === 1 ? '' : 's'} <ArrowRight size={13} /></span>
    </div>
  </a>;
}

export function Card({item, data, i = 0}: {item: Decoration; data: Catalog; i?: number}) {
  const {bg, Icon} = look(data, item.categoryId);
  const category = data.categories.find(c => c.id === item.categoryId)?.name;
  const off = item.discount !== null && item.price > 0 ? Math.round((1 - item.discount / item.price) * 100) : 0;
  return <article className='design-card' style={{'--i': Math.min(i, 8)} as React.CSSProperties}>
    <a className='design-photo' href={'/decoration/' + item.slug} style={{background: bg}} aria-label={`View ${item.title}`}>
      <span className='art' aria-hidden><Icon /></span>
      <Photo src={coverOf(item)} alt={item.title} hideOnError loading='lazy' />
      {item.featured && <span className='tag-pop'><Star size={11} fill='currentColor' />Popular</span>}
      {off > 0 && <span className='tag-off'>{off}% off</span>}
    </a>
    <div className='design-body'>
      {category && <span className='cat-label'>{category}</span>}
      <h3><a href={'/decoration/' + item.slug}>{item.title}</a></h3>
      <p className='desc'>{item.shortDescription}</p>
      <div className='design-foot'>
        <div className='price'><small>Starting from</small><strong>{money(priceOf(item))}</strong>{item.discount !== null && <del>{money(item.price)}</del>}</div>
        <a className='wa-mini' href={whatsapp(data.settings, item.title)} target='_blank' rel='noopener noreferrer' aria-label={`Ask about ${item.title} on WhatsApp`}><MessageCircle size={18} /></a>
      </div>
    </div>
  </article>;
}

export function Home({data}: {data: Catalog}) {
  const s = data.settings;
  const featured = data.decorations.filter(d => d.featured);
  const popular = (featured.length ? featured : data.decorations).slice(0, 8);
  return <Shell data={data}>
    <section className='hero'>
      <span className='blob a' aria-hidden /><span className='blob b' aria-hidden /><span className='blob c' aria-hidden />
      <div className='wrap'>
        <span className='hero-badge'><Sparkles size={14} />{data.decorations.length} designs · {data.categories.length} occasions</span>
        <h1>Make your celebration <span className='hl'>beautiful</span></h1>
        <p className='lead'>Pick your occasion below, choose a design you love and book it on WhatsApp.</p>
        <div className='steps-inline' aria-label='How it works'>
          <span><b>1</b>Choose occasion</span>
          <span><b>2</b>Pick a design</span>
          <span><b>3</b>Book on WhatsApp</span>
        </div>
      </div>
    </section>

    <section className='section' id='categories' aria-labelledby='cat-title' style={{paddingTop: 20}}>
      <div className='wrap'>
        <div className='section-head'>
          <div><span className='kicker'><PartyPopper size={14} />Step 1</span><h2 id='cat-title'>What are you celebrating?</h2></div>
          <a className='see-all' href='/gallery'>All designs <ArrowRight size={16} /></a>
        </div>
        <div className='cat-grid'>{data.categories.map((c, i) => <CategoryCard key={c.id} c={c} data={data} i={i} />)}</div>
      </div>
    </section>

    {popular.length > 0 && <section className='section' aria-labelledby='pop-title'>
      <div className='wrap'>
        <Reveal>
          <div className='section-head'>
            <div><span className='kicker'><Star size={14} />Most loved</span><h2 id='pop-title'>Popular designs</h2></div>
            <a className='see-all' href='/gallery'>See all <ArrowRight size={16} /></a>
          </div>
        </Reveal>
        <div className='rail'>{popular.map((d, i) => <Card key={d.id} item={d} data={data} i={i} />)}</div>
      </div>
    </section>}

    <section className='section' id='how' aria-labelledby='how-title'>
      <div className='wrap'>
        <Reveal>
          <div className='section-head'><div><span className='kicker'><CalendarCheck size={14} />Simple booking</span><h2 id='how-title'>How it works</h2></div></div>
          <div className='how'>
            <div className='how-step'><i><LayoutGrid size={22} /></i><div><small>Step 1</small><h3>Choose your occasion</h3><p>Birthday, haldi, mehndi and more. Tap a category to see its designs.</p></div></div>
            <div className='how-step'><i><Sparkles size={22} /></i><div><small>Step 2</small><h3>Pick a design</h3><p>Open any design to see photos, starting price and what’s included.</p></div></div>
            <div className='how-step'><i><MessageCircle size={22} /></i><div><small>Step 3</small><h3>Book on WhatsApp</h3><p>One tap sends the design name to us. Share your date and venue.</p></div></div>
          </div>
        </Reveal>
      </div>
    </section>

    {data.testimonials.length > 0 && <section className='section' aria-labelledby='rev-title'>
      <div className='wrap'>
        <Reveal>
          <div className='section-head'><div><span className='kicker'><Star size={14} />Reviews</span><h2 id='rev-title'>Happy customers</h2></div></div>
          <div className='quotes'>{data.testimonials.map(t => <blockquote className='quote' key={t.id} style={{margin: 0}}>
            <div className='stars' aria-label={`${t.rating} out of 5 stars`}>{Array.from({length: t.rating}).map((_, i) => <Star key={i} size={15} fill='currentColor' />)}</div>
            <p>“{t.review}”</p><strong>{t.name}</strong>{t.event && <small> · {t.event}</small>}
          </blockquote>)}</div>
        </Reveal>
      </div>
    </section>}

    <section className='section'>
      <div className='wrap'>
        <Reveal>
          <div className='cta'>
            <h2>Have an event coming up?</h2>
            <p>Send us your date, venue and the design you like. We reply quickly on WhatsApp.</p>
            <WA settings={s} className='btn-lg'>Chat on WhatsApp</WA>
          </div>
        </Reveal>
      </div>
    </section>
  </Shell>;
}

export function Lightbox({items, index, onIndex, onClose, title}: {items: Media[] | null; index: number; onIndex: (i: number) => void; onClose: () => void; title?: string}) {
  const media = items?.[index];
  const n = items?.length || 0;
  useEffect(() => {
    if (!n) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') onIndex((index + 1) % n);
      if (e.key === 'ArrowLeft') onIndex((index - 1 + n) % n);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [n, index, onIndex]);
  return <Dialog open={n > 0} onOpenChange={v => { if (!v) onClose(); }}>
    <DialogContent className='lightbox'>
      <div className='lb-bar'><DialogTitle>{title || 'Photos'} · {index + 1} / {n}</DialogTitle></div>
      <DialogDescription className='sr-only'>Use the arrow buttons or keys to move between photos.</DialogDescription>
      <div className='lb-stage'>
        {media?.type === 'video'
          ? <video key={media.id} src={media.url} poster={media.poster} controls playsInline />
          : media && <Photo key={media.id} src={media.url} alt={title || 'Decoration photo'} />}
        {n > 1 && <>
          <button className='lb-nav prev' onClick={() => onIndex((index - 1 + n) % n)} aria-label='Previous photo'><ChevronLeft size={22} /></button>
          <button className='lb-nav next' onClick={() => onIndex((index + 1) % n)} aria-label='Next photo'><ChevronRight size={22} /></button>
        </>}
      </div>
    </DialogContent>
  </Dialog>;
}

export function Collection({data, categorySlug}: {data: Catalog; categorySlug?: string; gallery?: boolean}) {
  const initial = data.categories.find(c => c.slug === categorySlug);
  const [filter, setFilter] = useState(initial?.id || 'all');
  const [q, setQ] = useState('');
  const [sort, setSort] = useState('popular');
  const [shown, setShown] = useState(12);
  useEffect(() => { setShown(12); }, [q, filter, sort]);
  useEffect(() => {
    const ctx = (document as unknown as {modelContext?: {registerTool?: (tool: unknown, opts: unknown) => void}}).modelContext;
    if (!ctx?.registerTool) return;
    const lifecycle = new AbortController();
    ctx.registerTool({
      name: 'filter_decorations',
      description: 'Filter the visible decoration collection by search phrase',
      inputSchema: {type: 'object', properties: {query: {type: 'string', maxLength: 100}}, required: ['query'], additionalProperties: false},
      annotations: {readOnlyHint: true},
      execute: (v: {query?: string}) => { if (typeof v.query !== 'string' || v.query.length > 100) throw Error('Invalid query'); setQ(v.query); return {query: v.query}; },
    }, {signal: lifecycle.signal});
    return () => lifecycle.abort();
  }, []);

  function pick(id: string) {
    setFilter(id);
    const c = data.categories.find(x => x.id === id);
    window.history.replaceState(null, '', c ? '/category/' + c.slug : '/gallery');
  }

  const category = data.categories.find(c => c.id === filter);
  const {bg, Icon} = look(data, category?.id);
  const term = q.trim().toLowerCase();
  const items = data.decorations
    .filter(d => (filter === 'all' || d.categoryId === filter) && (!term || `${d.title} ${d.tags} ${d.shortDescription} ${data.categories.find(c => c.id === d.categoryId)?.name}`.toLowerCase().includes(term)))
    .sort((a, b) => sort === 'low' ? priceOf(a) - priceOf(b) : sort === 'high' ? priceOf(b) - priceOf(a) : sort === 'new' ? b.createdAt.localeCompare(a.createdAt) : Number(b.featured) - Number(a.featured) || a.order - b.order);
  const visible = items.slice(0, shown);

  return <Shell data={data}>
    <div className='wrap'>
      <a className='back' href='/'><ArrowLeft size={16} />All occasions</a>
      <section className='banner' key={filter} style={{background: category ? bg : 'linear-gradient(135deg,#d6336c,#f59f00)'}}>
        <span className='art' aria-hidden>{category ? <Icon size={160} /> : <Sparkles size={160} />}</span>
        {category?.cover && <Photo src={category.cover} alt='' hideOnError />}
        <span className='count'>{items.length} design{items.length === 1 ? '' : 's'}</span>
        <h1>{category ? `${category.name} decoration` : 'All designs'}</h1>
        <p>{category?.description || 'Browse every design. Tap one to see photos, price and details.'}</p>
      </section>

      <div className='chipbar'>
        <div className='chips' role='group' aria-label='Filter by occasion'>
          <button className='chip' aria-pressed={filter === 'all'} onClick={() => pick('all')}><LayoutGrid size={15} />All</button>
          {data.categories.map(c => { const L = look(data, c.id); return <button key={c.id} className='chip' aria-pressed={filter === c.id} onClick={() => pick(c.id)}><L.Icon size={15} />{c.name}</button>; })}
        </div>
        <div className='tools'>
          <label className='searchbox'>
            <Search size={18} />
            <span className='sr-only'>Search designs</span>
            <input value={q} onChange={e => setQ(e.target.value)} placeholder='Search e.g. pastel, marigold' />
            {q && <button type='button' onClick={() => setQ('')} aria-label='Clear search'><X size={16} /></button>}
          </label>
          <select className='sort' value={sort} onChange={e => setSort(e.target.value)} aria-label='Sort designs'>
            <option value='popular'>Popular</option>
            <option value='low'>Price: low to high</option>
            <option value='high'>Price: high to low</option>
            <option value='new'>Newest</option>
          </select>
        </div>
      </div>

      <p className='result-line' aria-live='polite'><b>{items.length}</b> design{items.length === 1 ? '' : 's'} found · tap any design to see full details</p>

      {visible.length
        ? <div className='design-grid' key={filter + sort + term}>{visible.map((d, i) => <Card key={d.id} item={d} data={data} i={i} />)}</div>
        : <div className='empty'>
            <i><Search size={26} /></i>
            <h3>No designs found</h3>
            <p>Try another occasion or clear your search.</p>
            <button className='btn btn-primary' onClick={() => { setQ(''); pick('all'); }}>Show all designs</button>
          </div>}

      {shown < items.length && <div className='more'><button className='btn btn-ghost' onClick={() => setShown(n => n + 12)}>Load more designs</button></div>}
    </div>
    <div style={{height: 24}} />
  </Shell>;
}

export function Detail({data, item}: {data: Catalog; item: Decoration}) {
  const [index, setIndex] = useState(0);
  const [light, setLight] = useState(false);
  const track = useRef<HTMLDivElement>(null);
  const category = data.categories.find(c => c.id === item.categoryId);
  const {bg, Icon} = look(data, item.categoryId);
  const media = item.media;
  const n = media.length;
  const related = data.decorations.filter(d => d.id !== item.id && d.categoryId === item.categoryId);
  const more = (related.length ? related : data.decorations.filter(d => d.id !== item.id)).slice(0, 4);
  const off = item.discount !== null && item.price > 0 ? Math.round((1 - item.discount / item.price) * 100) : 0;
  const inclusions = item.inclusions.split('\n').map(x => x.trim()).filter(Boolean);
  const tags = item.tags.split(',').map(x => x.trim()).filter(Boolean);

  function go(i: number) {
    const next = (i + n) % n;
    setIndex(next);
    const el = track.current;
    if (el) el.scrollTo({left: next * el.clientWidth, behavior: 'smooth'});
  }
  function onScroll() {
    const el = track.current;
    if (!el) return;
    const i = Math.round(el.scrollLeft / el.clientWidth);
    if (i !== index) setIndex(i);
  }

  return <Shell data={data} dock>
    <div className='wrap'>
      <a className='back' href={category ? '/category/' + category.slug : '/gallery'}><ArrowLeft size={16} />{category ? `${category.name} designs` : 'All designs'}</a>
      <section className='detail'>
        <div className='gallery'>
          <div className='slides' ref={track} onScroll={onScroll} style={{background: bg}}>
            {(n ? media : [null]).map((m, i) => <div className='slide' key={m?.id || 'empty'}>
              <span className='art' aria-hidden><Icon /></span>
              {m && <button type='button' onClick={() => { setIndex(i); setLight(true); }} aria-label={`Open photo ${i + 1} full screen`}>
                {m.type === 'video'
                  ? <><Photo src={m.poster} alt='' hideOnError /><span className='art' aria-hidden><Play /></span></>
                  : <Photo src={m.url} alt={`${item.title} photo ${i + 1}`} hideOnError loading={i === 0 ? 'eager' : 'lazy'} />}
              </button>}
            </div>)}
          </div>
          {n > 1 && <span className='gal-count'>{index + 1} / {n}</span>}
          {n > 0 && <button className='gal-expand' onClick={() => setLight(true)} aria-label='View full screen'><Expand size={18} /></button>}
          {n > 1 && <>
            <button className='gal-arrow prev' onClick={() => go(index - 1)} aria-label='Previous photo'><ChevronLeft size={22} /></button>
            <button className='gal-arrow next' onClick={() => go(index + 1)} aria-label='Next photo'><ChevronRight size={22} /></button>
            <div className='dots'>{media.map((m, i) => <button key={m.id} aria-label={`Photo ${i + 1}`} aria-current={i === index} onClick={() => go(i)} />)}</div>
            <div className='thumbs'>{media.map((m, i) => <button key={m.id} aria-label={`Show photo ${i + 1}`} aria-current={i === index} onClick={() => go(i)} style={{background: bg}}>
              {m.type === 'video' ? <Play size={18} color='#fff' /> : <Photo src={m.url} alt='' hideOnError />}
            </button>)}</div>
          </>}
        </div>

        <div className='info'>
          {category && <a className='cat-pill' href={'/category/' + category.slug}><Icon size={14} />{category.name}</a>}
          <h1>{item.title}</h1>
          {item.shortDescription && <p className='short'>{item.shortDescription}</p>}

          <div className='price-card'>
            <small>Starting price</small>
            <div className='big'>
              <strong>{money(priceOf(item))}</strong>
              {item.discount !== null && <del>{money(item.price)}</del>}
              {off > 0 && <span className='save'>Save {off}%</span>}
            </div>
            <p>Final price depends on your venue, date and changes you ask for.</p>
          </div>

          <div className='cta-stack'>
            <WA settings={data.settings} title={item.title} className='btn-lg btn-block'>Book this design on WhatsApp</WA>
            <div className='row'>
              {data.settings.phone && <a className='btn btn-ghost' href={'tel:' + data.settings.phone}><Phone size={16} />Call us</a>}
              <a className='btn btn-ghost' href={category ? '/category/' + category.slug : '/gallery'}><LayoutGrid size={16} />More designs</a>
            </div>
          </div>

          {inclusions.length > 0 && <div className='box'>
            <h3><Check size={18} />What’s included</h3>
            <ul className='incl'>{inclusions.map(x => <li key={x}><i><Check size={13} /></i>{x}</li>)}</ul>
          </div>}

          {item.description && <div className='box'><h3><Sparkles size={18} />About this design</h3><p>{item.description}</p></div>}

          <div className='box'>
            <h3><CalendarCheck size={18} />How to book</h3>
            <ol className='mini-steps'>
              <li>Tap “Book this design on WhatsApp”</li>
              <li>Share your event date and venue</li>
              <li>Get the final price and confirm</li>
            </ol>
            {data.settings.address && <p className='muted' style={{marginTop: 10, display: 'flex', gap: 6, alignItems: 'center'}}><MapPin size={14} />Service area: {data.settings.address}</p>}
          </div>

          {tags.length > 0 && <div className='tags'>{tags.map(t => <span key={t}>{t}</span>)}</div>}
        </div>
      </section>

      {more.length > 0 && <section className='section' style={{paddingTop: 8}}>
        <Reveal>
          <div className='section-head'><div><span className='kicker'><Sparkles size={14} />You may also like</span><h2>{related.length ? `More ${category?.name} designs` : 'Other designs'}</h2></div></div>
        </Reveal>
        <div className='rail'>{more.map((d, i) => <Card key={d.id} item={d} data={data} i={i} />)}</div>
      </section>}
    </div>

    <div className='buybar'>
      <div className='price'><small>Starting from</small><strong>{money(priceOf(item))}</strong></div>
      <WA settings={data.settings} title={item.title}>Book on WhatsApp</WA>
    </div>
    <Lightbox items={light ? media : null} index={index} onIndex={i => go(i)} onClose={() => setLight(false)} title={item.title} />
  </Shell>;
}

export function Contact({data}: {data: Catalog}) {
  const s = data.settings;
  return <Shell data={data}>
    <div className='wrap'>
      <section className='section' style={{paddingTop: 24}}>
        <span className='kicker'><MessageCircle size={14} />Contact</span>
        <h1 style={{marginTop: 6}}>Let’s plan your event</h1>
        <p style={{marginTop: 8, maxWidth: '48ch'}}>The fastest way to book is WhatsApp. Tell us your date, venue and the design you like.</p>
        <div className='contact-cards'>
          <a className='contact-card wa' style={{'--i': 0} as React.CSSProperties} href={whatsapp(s)} target='_blank' rel='noopener noreferrer'>
            <i><MessageCircle size={24} /></i><div><small>Fastest reply</small><strong>Chat on WhatsApp</strong></div>
          </a>
          {s.phone && <a className='contact-card' style={{'--i': 1} as React.CSSProperties} href={'tel:' + s.phone}>
            <i style={{background: 'var(--brand-soft)', color: 'var(--brand)'}}><Phone size={22} /></i><div><small>Call us</small><strong>{s.phone}</strong></div>
          </a>}
          {s.email && <a className='contact-card' style={{'--i': 2} as React.CSSProperties} href={'mailto:' + s.email}>
            <i style={{background: 'var(--gold-soft)', color: '#c77700'}}><Mail size={22} /></i><div><small>Email</small><strong>{s.email}</strong></div>
          </a>}
          {s.address && <div className='contact-card' style={{'--i': 3} as React.CSSProperties}>
            <i style={{background: '#e5dbff', color: '#7048e8'}}><MapPin size={22} /></i><div><small>Service area</small><strong>{s.address}</strong></div>
          </div>}
        </div>
        {data.sample && <p className='notice' style={{marginTop: 16}}>These are demo contact details. Update them in Admin → Settings.</p>}
      </section>
    </div>
  </Shell>;
}
