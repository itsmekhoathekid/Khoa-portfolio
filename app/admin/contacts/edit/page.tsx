import { redirect } from 'next/navigation';
import { ContactsEditor } from '@/src/features/admin/contacts-editor';
import { getAdminSession } from '@/src/server/auth/guard';
import { getPublicContacts } from '@/src/server/content/public-queries';

export const dynamic = 'force-dynamic';

export default async function ContactsEditorPage() {
  const session = await getAdminSession();
  if (!session?.user) redirect('/');
  return <ContactsEditor initial={await getPublicContacts()} />;
}
