import {catalog} from '@/lib/server';import {Collection} from '@/components/catalog';
export const dynamic='force-dynamic';
export async function generateMetadata(){const data=await catalog();return {title:`Collection | ${data.settings.name}`,description:data.settings.seoDescription};}
export default async function Page(){return <Collection data={await catalog()} gallery/>}
