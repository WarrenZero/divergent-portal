import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createClient } from '@/lib/supabase/server';

type Params = { params: Promise<{ id: string }> };

// ─── DELETE — delete file record + storage object ─────────────────────────────

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const supabase = await createClient();

  // Fetch the record first to get the storage_path for cleanup
  const { data: file } = await supabase
    .from('reasoning_files')
    .select('storage_path')
    .eq('id', id)
    .single();

  // If there's a storage path, delete from Supabase Storage
  if (file?.storage_path) {
    const { error: storageError } = await supabase.storage
      .from('reasoning-files')
      .remove([file.storage_path]);

    if (storageError) {
      console.warn('Storage delete warning (non-fatal):', storageError.message);
      // Non-fatal — proceed to delete the record
    }
  }

  // Delete the DB record (RLS ensures ownership)
  const { error } = await supabase
    .from('reasoning_files')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('File delete error:', error);
    return NextResponse.json({ error: 'Failed to delete file' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
