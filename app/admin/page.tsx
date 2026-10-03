import {catalog} from '@/lib/server';
import {authConfigured, currentAdmin} from '@/lib/auth';
import {Admin} from '@/components/admin';
import {Login} from '@/components/login';

export const dynamic = 'force-dynamic';
export const metadata = {title: 'Admin | Celebration Decor', robots: {index: false, follow: false}};

export default async function Page() {
  const admin = await currentAdmin();
  if (!admin) return <Login configured={authConfigured()} />;
  return <Admin initial={await catalog(true)} email={admin.email} />;
}
