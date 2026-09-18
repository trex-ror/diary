import { supabase } from '../lib/supabase';
import EditorClient from '../components/EditorClient';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Editor — Diary With You',
};

async function getDiaryData() {
  try {
    const { data: pages, error } = await supabase
      .from('pages')
      .select('*, items(*)')
      .order('page_number', { ascending: true });

    if (error) {
      console.error('Supabase fetch error:', error);
      return [];
    }
    return pages || [];
  } catch (e) {
    console.error('Supabase not configured yet:', e.message);
    return [];
  }
}

export default async function EditorPage() {
  const pages = await getDiaryData();
  return <EditorClient existingPages={pages} />;
}
