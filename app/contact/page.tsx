import {catalog} from '@/lib/server';import {Contact} from '@/components/catalog';
export const dynamic='force-dynamic';
export async function generateMetadata(){const data=await catalog();return {title:`Contact | ${data.settings.name}`,description:`Enquire with ${data.settings.name} on WhatsApp.`};}
export default async function Page(){return <Contact data={await catalog()}/>}
