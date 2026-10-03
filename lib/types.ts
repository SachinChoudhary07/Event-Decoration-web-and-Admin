export interface Category {id:string;name:string;slug:string;description:string;cover:string;order:number;active:boolean}
export interface Media {id:string;url:string;type:'image'|'video';poster?:string}
export interface Decoration {id:string;categoryId:string;title:string;slug:string;shortDescription:string;description:string;price:number;discount:number|null;inclusions:string;tags:string;featured:boolean;published:boolean;order:number;createdAt:string;media:Media[]}
export interface Testimonial {id:string;name:string;review:string;rating:number;event:string;published:boolean}
export interface Settings {name:string;description:string;whatsapp:string;phone:string;email:string;address:string;instagram:string;facebook:string;youtube:string;message:string;logo:string;favicon:string;seoTitle:string;seoDescription:string}
export interface Catalog {categories:Category[];decorations:Decoration[];testimonials:Testimonial[];settings:Settings;sample:boolean}
export const money=(n:number)=>new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',maximumFractionDigits:0}).format(n);
export function whatsapp(s:Settings,title?:string){const message=title?`Hello, I am interested in the ${title} shown on your website. Please share availability and final pricing.`:s.message;return `https://wa.me/${s.whatsapp.replace(/\D/g,'')}?text=${encodeURIComponent(message)}`}
