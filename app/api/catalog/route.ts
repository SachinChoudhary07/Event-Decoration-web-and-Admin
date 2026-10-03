import {catalog} from '@/lib/server';
export async function GET(){try{return Response.json(await catalog(),{headers:{'Cache-Control':'no-store'}})}catch{return Response.json({error:'We could not load decorations. Please try again.'},{status:503})}}
