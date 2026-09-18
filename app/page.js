import { supabase } from './lib/supabase';
import DiaryViewer from './components/DiaryViewer';

// Fetch all pages + items from Supabase at build time (SSR)
async function getDiaryData() {
  const { data: pages, error } = await supabase
    .from('pages')
    .select('*, items(*)')
    .order('page_number', { ascending: true });

  if (error) {
    console.error('Supabase fetch error:', error);
    return [];
  }
  return pages || [];
}

export default async function ViewerPage() {
  const pages = await getDiaryData();

  return <DiaryViewer pages={pages} />;
}
