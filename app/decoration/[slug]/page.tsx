import {catalog,siteUrl} from '@/lib/server';import {Detail} from '@/components/catalog';import {notFound} from 'next/navigation';
export const dynamic='force-dynamic';
export async function generateMetadata({params}:{params:Promise<{slug:string}>}){const {slug}=await params;const data=await catalog();const d=data.decorations.find(d=>d.slug===slug);const images=d?.media.filter(m=>m.type==='image').slice(0,1).map(m=>new URL(m.url,siteUrl()).href)||[];return {title:d?`${d.title} | ${data.settings.name}`:'Decoration not found',description:d?.shortDescription,alternates:{canonical:`${siteUrl()}/decoration/${slug}`},openGraph:{title:d?.title,description:d?.shortDescription,images},twitter:{title:d?.title,description:d?.shortDescription,images}}}
export default async function Page({params}:{params:Promise<{slug:string}>}){
  const {slug}=await params;const data=await catalog();const item=data.decorations.find(d=>d.slug===slug);if(!item)notFound();
  const price=item.discount??item.price;
  const json={'@context':'https://schema.org','@type':'Product',name:item.title,description:item.shortDescription,image:item.media.filter(m=>m.type==='image').map(m=>new URL(m.url,siteUrl()).href),category:data.categories.find(c=>c.id===item.categoryId)?.name,offers:{'@type':'Offer',priceCurrency:'INR',price,availability:'https://schema.org/InStock',description:'Starting price. Final quotation depends on venue and date.'}};
  return <><script type='application/ld+json' dangerouslySetInnerHTML={{__html:JSON.stringify(json).replace(/</g,'\\u003c')}}/><Detail data={data} item={item}/></>;
}
