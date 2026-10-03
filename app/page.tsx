import {catalog, siteUrl} from '@/lib/server';
import {Home} from '@/components/catalog';
export const dynamic='force-dynamic';
export default async function Page(){
  const data=await catalog();
  const json={
    '@context':'https://schema.org',
    '@type':'LocalBusiness',
    name:data.settings.name,
    description:data.settings.description,
    telephone:data.settings.phone,
    email:data.settings.email,
    address:data.settings.address,
    url:siteUrl()
  };
  return <><script type='application/ld+json' dangerouslySetInnerHTML={{__html:JSON.stringify(json).replace(/</g,'\\u003c')}}/><Home data={data}/></>;
}
