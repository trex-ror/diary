import { supabase } from './lib/supabase';
import DiaryViewer from './components/DiaryViewer';

// Paksa render di server saat request (bukan saat build),
// sehingga ENV variables dibaca saat runtime, bukan compile time.
export const dynamic = 'force-dynamic';

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

export default async function ViewerPage() {
  const pages = await getDiaryData();

  return <DiaryViewer pages={pages} />;
}
