import { supabase } from './supabase';

export interface MediaItem {
  id: string;
  storage_path: string;
  public_url: string;
  file_name: string;
  file_type: 'image' | 'video';
  mime_type: string;
  file_size: number | null;
  description: string | null;
  location: string | null;
  taken_date: string | null;
  created_at: string;
  updated_at: string;
  comments?: MediaComment[];
}

export interface MediaComment {
  id: string;
  media_id: string;
  comment: string;
  created_at: string;
  updated_at: string;
}

export interface MediaMetadata {
  description?: string;
  location?: string;
  taken_date?: string;
}

/**
 * Upload a file to Supabase Storage
 */
export async function uploadFile(file: File): Promise<{ path: string; url: string }> {
  console.log('[mediaService] uploadFile called:', { name: file.name, size: file.size, type: file.type });

  const fileExt = file.name.split('.').pop();
  const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
  const filePath = fileName;

  console.log('[mediaService] Uploading to Supabase Storage:', filePath);

  const { data, error } = await supabase.storage
    .from('media')
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false,
    });

  if (error) {
    console.error('[mediaService] Upload failed:', error);
    throw new Error(`Upload failed: ${error.message}`);
  }

  console.log('[mediaService] Upload successful:', data);

  const { data: { publicUrl } } = supabase.storage
    .from('media')
    .getPublicUrl(data.path);

  console.log('[mediaService] Public URL generated:', publicUrl);

  return { path: data.path, url: publicUrl };
}

/**
 * Download file from URL and upload to Supabase Storage (for Google Photos)
 */
export async function uploadFromUrl(url: string, fileName: string): Promise<{ path: string; url: string }> {
  // Fetch the file from the URL
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error('Failed to fetch file from URL');
  }

  const blob = await response.blob();
  const file = new File([blob], fileName, { type: blob.type });

  return uploadFile(file);
}

/**
 * Create a media item record in the database
 */
export async function createMediaItem(
  storagePath: string,
  publicUrl: string,
  fileName: string,
  fileType: 'image' | 'video',
  mimeType: string,
  fileSize: number | null,
  metadata: MediaMetadata
): Promise<MediaItem> {
  console.log('[mediaService] createMediaItem called:', {
    storagePath,
    publicUrl,
    fileName,
    fileType,
    mimeType,
    fileSize,
    metadata
  });

  const { data, error } = await supabase
    .from('media_items')
    .insert({
      storage_path: storagePath,
      public_url: publicUrl,
      file_name: fileName,
      file_type: fileType,
      mime_type: mimeType,
      file_size: fileSize,
      description: metadata.description || null,
      location: metadata.location || null,
      taken_date: metadata.taken_date || null,
    })
    .select()
    .single();

  if (error) {
    console.error('[mediaService] Failed to create media item:', error);
    throw new Error(`Failed to create media item: ${error.message}`);
  }

  console.log('[mediaService] Media item created successfully:', data);

  return data;
}

/**
 * Get all media items with their comments
 */
export async function getAllMedia(): Promise<MediaItem[]> {
  console.log('[mediaService] getAllMedia called');

  const { data: mediaItems, error: mediaError } = await supabase
    .from('media_items')
    .select('*')
    .order('created_at', { ascending: false });

  if (mediaError) {
    console.error('[mediaService] Failed to fetch media items:', mediaError);
    throw new Error(`Failed to fetch media: ${mediaError.message}`);
  }

  console.log('[mediaService] Fetched media items:', mediaItems?.length || 0);

  // Fetch comments for all media items
  const { data: comments, error: commentsError } = await supabase
    .from('media_comments')
    .select('*')
    .order('created_at', { ascending: true });

  if (commentsError) {
    console.error('[mediaService] Failed to fetch comments:', commentsError);
  } else {
    console.log('[mediaService] Fetched comments:', comments?.length || 0);
  }

  // Group comments by media_id
  const commentsMap = new Map<string, MediaComment[]>();
  comments?.forEach((comment) => {
    if (!commentsMap.has(comment.media_id)) {
      commentsMap.set(comment.media_id, []);
    }
    commentsMap.get(comment.media_id)!.push(comment);
  });

  // Attach comments to media items
  const result = mediaItems.map((item) => ({
    ...item,
    comments: commentsMap.get(item.id) || [],
  }));

  console.log('[mediaService] Returning media items with comments');

  return result;
}

/**
 * Update media item metadata
 */
export async function updateMediaItem(
  id: string,
  metadata: MediaMetadata
): Promise<MediaItem> {
  const { data, error } = await supabase
    .from('media_items')
    .update({
      description: metadata.description || null,
      location: metadata.location || null,
      taken_date: metadata.taken_date || null,
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update media item: ${error.message}`);
  }

  return data;
}

/**
 * Delete a media item and its storage file
 */
export async function deleteMediaItem(id: string, storagePath: string): Promise<void> {
  // Delete from storage
  const { error: storageError } = await supabase.storage
    .from('media')
    .remove([storagePath]);

  if (storageError) {
    console.error('Failed to delete from storage:', storageError);
  }

  // Delete from database (comments will be cascade deleted)
  const { error: dbError } = await supabase
    .from('media_items')
    .delete()
    .eq('id', id);

  if (dbError) {
    throw new Error(`Failed to delete media item: ${dbError.message}`);
  }
}

/**
 * Add a comment to a media item
 */
export async function addComment(mediaId: string, comment: string): Promise<MediaComment> {
  const { data, error } = await supabase
    .from('media_comments')
    .insert({
      media_id: mediaId,
      comment,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to add comment: ${error.message}`);
  }

  return data;
}

/**
 * Delete a comment
 */
export async function deleteComment(commentId: string): Promise<void> {
  const { error } = await supabase
    .from('media_comments')
    .delete()
    .eq('id', commentId);

  if (error) {
    throw new Error(`Failed to delete comment: ${error.message}`);
  }
}

/**
 * Determine file type from MIME type
 */
export function getFileType(mimeType: string): 'image' | 'video' {
  if (mimeType.startsWith('image/')) {
    return 'image';
  } else if (mimeType.startsWith('video/')) {
    return 'video';
  }
  throw new Error('Unsupported file type');
}
