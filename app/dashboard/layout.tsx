import { redirect } from 'next/navigation';
import { getSession } from '@/app/lib/session';
import { getUserRepository } from '@/app/lib/data-source';
import SideNav from '@/app/ui/dashboard/sidenav';

export default async function Layout({ children }: { children: React.ReactNode }) {
  const userId = await getSession();
  if (!userId) {
    redirect('/login');
  }
  const userRepo = await getUserRepository();
  const user = await userRepo.findOne({ where: { id: userId } });
  if (!user) {
    redirect('/login');
  }
  return (
    <div className="flex h-screen flex-col md:flex-row md:overflow-hidden">
      <div className="w-full flex-none md:w-64">
        <SideNav userName={user.name} />
      </div>
      <div className="grow p-6 ms:overflow-y-auto md:p-12">{children}</div>
    </div>
  );
}