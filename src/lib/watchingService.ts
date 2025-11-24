import { supabase } from './supabase';

export interface WatchingItem {
  id: string;
  tmdb_id: number;
  media_type: 'movie' | 'tv';
  title: string;
  poster_path: string | null;
  backdrop_path: string | null;
  overview: string;
  release_date: string | null;
  runtime: number | null;
  genres: string[];
  seasons: number | null; // for TV shows
  episodes: number | null; // for TV shows
  tmdb_rating: number; // TMDB's vote_average
  user_rating: number | null; // Our rating (1-5)
  status: 'watching' | 'want_to_watch' | 'watched';
  created_at: string;
  updated_at: string;
}

/**
 * Get all watching items
 */
export async function getAllWatchingItems(): Promise<WatchingItem[]> {
  console.log('[watchingService] getAllWatchingItems called');

  const { data, error } = await supabase
    .from('watching')
    .select('*')
    .order('updated_at', { ascending: false });

  if (error) {
    console.error('[watchingService] Failed to fetch items:', error);
    throw new Error(`Failed to fetch watching items: ${error.message}`);
  }

  console.log('[watchingService] Fetched items:', data?.length || 0);

  return data || [];
}

/**
 * Add a new watching item
 */
export async function addWatchingItem(itemData: Omit<WatchingItem, 'id' | 'created_at' | 'updated_at'>): Promise<WatchingItem> {
  console.log('[watchingService] addWatchingItem called:', itemData);

  // Check if item already exists
  const { data: existing } = await supabase
    .from('watching')
    .select('*')
    .eq('tmdb_id', itemData.tmdb_id)
    .eq('media_type', itemData.media_type)
    .single();

  if (existing) {
    console.log('[watchingService] Item already exists:', existing);
    throw new Error('This item is already in your watching list');
  }

  const { data, error } = await supabase
    .from('watching')
    .insert(itemData)
    .select()
    .single();

  if (error) {
    console.error('[watchingService] Failed to add item:', error);
    throw new Error(`Failed to add watching item: ${error.message}`);
  }

  console.log('[watchingService] Item added successfully:', data);

  return data;
}

/**
 * Update watching item status
 */
export async function updateWatchingStatus(
  id: string,
  status: 'watching' | 'want_to_watch' | 'watched'
): Promise<WatchingItem> {
  console.log('[watchingService] updateWatchingStatus called:', { id, status });

  const { data, error } = await supabase
    .from('watching')
    .update({ status })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('[watchingService] Failed to update status:', error);
    throw new Error(`Failed to update status: ${error.message}`);
  }

  console.log('[watchingService] Status updated successfully');

  return data;
}

/**
 * Update user rating
 */
export async function updateUserRating(id: string, rating: number | null): Promise<WatchingItem> {
  console.log('[watchingService] updateUserRating called:', { id, rating });

  const { data, error } = await supabase
    .from('watching')
    .update({ user_rating: rating })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('[watchingService] Failed to update rating:', error);
    throw new Error(`Failed to update rating: ${error.message}`);
  }

  console.log('[watchingService] Rating updated successfully');

  return data;
}

/**
 * Delete watching item
 */
export async function deleteWatchingItem(id: string): Promise<void> {
  console.log('[watchingService] deleteWatchingItem called:', id);

  const { error } = await supabase
    .from('watching')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('[watchingService] Failed to delete item:', error);
    throw new Error(`Failed to delete watching item: ${error.message}`);
  }

  console.log('[watchingService] Item deleted successfully');
}
