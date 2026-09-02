import { notFound, redirect } from 'next/navigation';
import { ContentEditor } from '@/src/features/admin/content-editor';
import { getEditorDraft } from '@/src/server/content/admin-queries';

export const dynamic = 'force-dynamic';

export default async function EditorPage({
  params,
}: {
  params: Promise<{ collection: string; id: string }>;
}) {
  const { collection, id } = await params;
  let draft;
  try {
    draft = await getEditorDraft(collection, id);
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized')
      redirect('/');
    throw error;
  }
  if (!draft) notFound();
  return <ContentEditor initial={draft} />;
}
