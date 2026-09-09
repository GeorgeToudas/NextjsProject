import { redirect } from 'next/navigation';
import { getSession } from '@/app/lib/session';
import RegisterForm from '@/app/ui/register-form';

export default async function RegisterPage() {
  const userId = await getSession();

  if (userId) {
    redirect('/dashboard');
  }

  return <RegisterForm />;
}