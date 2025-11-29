import { supabase } from './supabase';

// =========================================================================
// TYPES & INTERFACES
// =========================================================================

export interface VisionItem {
  id: string;
  user_id: string;
  type: 'text' | 'goal' | 'image';
  title: string;
  content: string | null;
  image_url: string | null;
  goal_completed: boolean;
  event_date?: string | null;
  event_type?: 'goal' | 'event' | 'task' | null;
  is_all_day?: boolean;
  event_start_time?: string | null;
  event_end_time?: string | null;
  created_at: string;
  updated_at: string;
}

export interface VisionComment {
  id: string;
  vision_item_id: string;
  comment_text: string;
  created_at: string;
}

export interface CreateVisionItemData {
  type: 'text' | 'goal' | 'image';
  title: string;
  content?: string;
  image_url?: string;
  goal_completed?: boolean;
  event_date?: string | null;
  event_type?: 'goal' | 'event' | 'task' | null;
  is_all_day?: boolean;
  event_start_time?: string | null;
  event_end_time?: string | null;
}

// =========================================================================
// VISION ITEMS CRUD
// =========================================================================

export async function getAllVisionItems(): Promise<VisionItem[]> {
  const { data, error } = await supabase
    .from('vision_items')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching vision items:', error);
    throw error;
  }

  return data || [];
}

export async function getVisionItemById(id: string): Promise<VisionItem | null> {
  const { data, error } = await supabase
    .from('vision_items')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching vision item:', error);
    throw error;
  }

  return data;
}

export async function createVisionItem(itemData: CreateVisionItemData): Promise<VisionItem> {
  // Get current user ID
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('User not authenticated');
  }

  const { data, error } = await supabase
    .from('vision_items')
    .insert([{
      user_id: user.id,
      type: itemData.type,
      title: itemData.title,
      content: itemData.content || null,
      image_url: itemData.image_url || null,
      goal_completed: itemData.goal_completed || false,
      event_date: itemData.event_date || null,
      event_type: itemData.event_type || null,
      is_all_day: itemData.is_all_day || false,
      event_start_time: itemData.event_start_time || null,
      event_end_time: itemData.event_end_time || null,
    }])
    .select()
    .single();

  if (error) {
    console.error('Error creating vision item:', error);
    throw error;
  }

  return data;
}

export async function updateVisionItem(id: string, updates: Partial<CreateVisionItemData>): Promise<VisionItem> {
  const { data, error } = await supabase
    .from('vision_items')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating vision item:', error);
    throw error;
  }

  return data;
}

export async function toggleGoalCompletion(id: string, completed: boolean): Promise<VisionItem> {
  return updateVisionItem(id, { goal_completed: completed });
}

export async function deleteVisionItem(id: string): Promise<void> {
  const { error } = await supabase
    .from('vision_items')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting vision item:', error);
    throw error;
  }
}

// =========================================================================
// COMMENTS CRUD
// =========================================================================

export async function getCommentsByVisionItemId(visionItemId: string): Promise<VisionComment[]> {
  const { data, error } = await supabase
    .from('vision_comments')
    .select('*')
    .eq('vision_item_id', visionItemId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching comments:', error);
    throw error;
  }

  return data || [];
}

export async function createComment(visionItemId: string, commentText: string): Promise<VisionComment> {
  // Get current user ID
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('User not authenticated');
  }

  const { data, error } = await supabase
    .from('vision_comments')
    .insert([{
      user_id: user.id,
      vision_item_id: visionItemId,
      comment_text: commentText,
    }])
    .select()
    .single();

  if (error) {
    console.error('Error creating comment:', error);
    throw error;
  }

  return data;
}

export async function deleteComment(id: string): Promise<void> {
  const { error } = await supabase
    .from('vision_comments')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting comment:', error);
    throw error;
  }
}

// =========================================================================
// IMAGE UPLOAD
// =========================================================================

export async function uploadVisionImage(file: File): Promise<string> {
  // Validate file type
  if (!file.type.startsWith('image/')) {
    throw new Error('File must be an image');
  }

  // Validate file size (max 5MB)
  if (file.size > 5 * 1024 * 1024) {
    throw new Error('Image must be less than 5MB');
  }

  // Create unique filename
  const fileExt = file.name.split('.').pop();
  const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
  const filePath = `vision/${fileName}`;

  // Upload to Supabase Storage
  const { data, error } = await supabase.storage
    .from('media')
    .upload(filePath, file);

  if (error) {
    console.error('Error uploading image:', error);
    throw error;
  }

  // Get public URL
  const { data: urlData } = supabase.storage
    .from('media')
    .getPublicUrl(filePath);

  return urlData.publicUrl;
}

export async function deleteVisionImage(imageUrl: string): Promise<void> {
  // Extract file path from URL
  const urlParts = imageUrl.split('/');
  const filePath = urlParts.slice(urlParts.indexOf('vision')).join('/');

  const { error } = await supabase.storage
    .from('media')
    .remove([filePath]);

  if (error) {
    console.error('Error deleting image:', error);
    throw error;
  }
}
