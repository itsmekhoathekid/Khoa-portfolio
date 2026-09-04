import { redirect } from 'next/navigation';
import { HomeProfileEditor } from '@/src/features/admin/home-profile-editor';
import { getAdminHomeProfile } from '@/src/server/content/admin-queries';

export const dynamic = 'force-dynamic';

export default async function HomeProfileEditorPage() {
  let profile;
  try {
    profile = await getAdminHomeProfile();
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized')
      redirect('/');
    throw error;
  }
  return <HomeProfileEditor initial={profile} />;
}
