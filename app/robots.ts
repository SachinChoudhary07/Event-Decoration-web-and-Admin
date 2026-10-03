import {siteUrl} from '@/lib/server';export default function robots(){return {rules:{userAgent:'*',allow:'/',disallow:['/admin','/api/manage','/api/upload']},sitemap:siteUrl()+'/sitemap.xml'}}
