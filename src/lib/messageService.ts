import { supabase } from './supabase';

export interface Message {
  id: string;
  user_id: string;
  from_user: string;
  to_user: string;
  type: 'text' | 'voice' | 'video' | 'image';
  content: string;
  media_url: string | null;
  storage_path: string | null;
  status: 'active' | 'dismissed' | 'pinned';
  position_x: number;
  position_y: number;
  created_at: string;
  updated_at: string;
  reactions?: MessageReaction[];
}

export interface MessageReaction {
  id: string;
  message_id: string;
  emoji: string;
  created_at: string;
}

export interface CreateMessageData {
  from_user: string; // UUID foreign key to users table
  to_user: string;   // UUID foreign key to users table
  type: 'text' | 'voice' | 'video' | 'image';
  content: string;
  media_url?: string;
  storage_path?: string;
  status?: 'active' | 'dismissed' | 'pinned';
  position_x?: number;
  position_y?: number;
  viewportWidth?: number;
  viewportHeight?: number;
  existingMessages?: Message[];
}

/**
 * Upload a media file to Supabase Storage (message-media bucket)
 */
export async function uploadMessageMedia(file: File): Promise<{ path: string; url: string }> {
  console.log('[messageService] uploadMessageMedia called:', { name: file.name, size: file.size, type: file.type });

  // File size limit: 100MB for videos, 10MB for images/audio
  const MAX_VIDEO_SIZE = 100 * 1024 * 1024; // 100MB
  const MAX_MEDIA_SIZE = 10 * 1024 * 1024; // 10MB
  const isVideo = file.type.startsWith('video/');
  const maxSize = isVideo ? MAX_VIDEO_SIZE : MAX_MEDIA_SIZE;

  if (file.size > maxSize) {
    const sizeMB = (file.size / 1024 / 1024).toFixed(2);
    const maxSizeMB = (maxSize / 1024 / 1024).toFixed(0);
    throw new Error(`File too large: ${sizeMB}MB. Maximum size for ${isVideo ? 'videos' : 'media'} is ${maxSizeMB}MB.`);
  }

  const fileExt = file.name.split('.').pop();
  const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
  const filePath = fileName;

  console.log('[messageService] Uploading to Supabase Storage:', filePath);

  const { data, error } = await supabase.storage
    .from('message-media')
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false,
    });

  if (error) {
    console.error('[messageService] Upload failed:', error);
    throw new Error(`Upload failed: ${error.message}`);
  }

  console.log('[messageService] Upload successful:', data);

  const { data: { publicUrl } } = supabase.storage
    .from('message-media')
    .getPublicUrl(data.path);

  console.log('[messageService] Public URL generated:', publicUrl);

  return { path: data.path, url: publicUrl };
}

/**
 * Get all messages with their reactions
 */
export async function getAllMessages(): Promise<Message[]> {
  console.log('[messageService] getAllMessages called');

  const { data: messages, error: messagesError } = await supabase
    .from('messages')
    .select('*')
    .order('created_at', { ascending: true });

  if (messagesError) {
    console.error('[messageService] Failed to fetch messages:', messagesError);
    throw new Error(`Failed to fetch messages: ${messagesError.message}`);
  }

  console.log('[messageService] Fetched messages:', messages?.length || 0);

  // Fetch reactions for all messages
  const { data: reactions, error: reactionsError } = await supabase
    .from('message_reactions')
    .select('*')
    .order('created_at', { ascending: true });

  if (reactionsError) {
    console.error('[messageService] Failed to fetch reactions:', reactionsError);
  } else {
    console.log('[messageService] Fetched reactions:', reactions?.length || 0);
  }

  // Group reactions by message_id
  const reactionsMap = new Map<string, MessageReaction[]>();
  reactions?.forEach((reaction) => {
    if (!reactionsMap.has(reaction.message_id)) {
      reactionsMap.set(reaction.message_id, []);
    }
    reactionsMap.get(reaction.message_id)!.push(reaction);
  });

  // Attach reactions to messages
  const result = messages.map((message) => ({
    ...message,
    reactions: reactionsMap.get(message.id) || [],
  }));

  console.log('[messageService] Returning messages with reactions');

  return result;
}

/**
 * Message positioning constants (legacy - now using CSS Grid)
 */
const MESSAGE_CARD_WIDTH = 240; // max-w-[240px]
const MESSAGE_CARD_HEIGHT = 140; // Compact card height
const MIN_SPACING = 12; // Gap between grid items
const PADDING = 12; // Padding from screen edges

/**
 * Check if two rectangles collide
 */
function checkCollision(
  x1: number, y1: number, w1: number, h1: number,
  x2: number, y2: number, w2: number, h2: number,
  buffer: number = MIN_SPACING
): boolean {
  return !(
    x1 + w1 + buffer < x2 ||
    x2 + w2 + buffer < x1 ||
    y1 + h1 + buffer < y2 ||
    y2 + h2 + buffer < y1
  );
}

/**
 * Find a non-overlapping position for a new message
 */
function findAvailablePosition(
  existingMessages: Message[],
  viewportWidth: number,
  viewportHeight: number
): { x: number; y: number } {
  console.log('[findAvailablePosition] Starting with:', {
    existingCount: existingMessages.length,
    viewport: { width: viewportWidth, height: viewportHeight },
    existingPositions: existingMessages.map(m => ({ id: m.id, x: m.position_x, y: m.position_y }))
  });

  const maxX = viewportWidth - MESSAGE_CARD_WIDTH - PADDING;
  const maxY = viewportHeight - MESSAGE_CARD_HEIGHT - PADDING;

  // Ensure we have valid boundaries
  if (maxX < PADDING || maxY < PADDING) {
    console.log('[findAvailablePosition] Viewport too small, using default position');
    return { x: PADDING, y: PADDING };
  }

  // Try random positions up to 20 times
  for (let attempt = 0; attempt < 20; attempt++) {
    const x = Math.floor(Math.random() * (maxX - PADDING) + PADDING);
    const y = Math.floor(Math.random() * (maxY - PADDING) + PADDING);

    // Check if this position collides with any existing message
    let hasCollision = false;
    for (const msg of existingMessages) {
      if (checkCollision(
        x, y, MESSAGE_CARD_WIDTH, MESSAGE_CARD_HEIGHT,
        msg.position_x, msg.position_y, MESSAGE_CARD_WIDTH, MESSAGE_CARD_HEIGHT
      )) {
        hasCollision = true;
        console.log(`[findAvailablePosition] Attempt ${attempt + 1}: Collision at (${x}, ${y}) with message at (${msg.position_x}, ${msg.position_y})`);
        break;
      }
    }

    if (!hasCollision) {
      console.log(`[findAvailablePosition] Found position after ${attempt + 1} attempts:`, { x, y });
      return { x, y };
    }
  }

  // If all random attempts failed, use grid-based placement
  const cols = Math.floor((viewportWidth - 2 * PADDING) / (MESSAGE_CARD_WIDTH + MIN_SPACING));
  const rows = Math.floor((viewportHeight - 2 * PADDING) / (MESSAGE_CARD_HEIGHT + MIN_SPACING));

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const x = PADDING + col * (MESSAGE_CARD_WIDTH + MIN_SPACING);
      const y = PADDING + row * (MESSAGE_CARD_HEIGHT + MIN_SPACING);

      let hasCollision = false;
      for (const msg of existingMessages) {
        if (checkCollision(
          x, y, MESSAGE_CARD_WIDTH, MESSAGE_CARD_HEIGHT,
          msg.position_x, msg.position_y, MESSAGE_CARD_WIDTH, MESSAGE_CARD_HEIGHT
        )) {
          hasCollision = true;
          break;
        }
      }

      if (!hasCollision) {
        return { x, y };
      }
    }
  }

  // Last resort: place at top-left with padding
  return { x: PADDING, y: PADDING };
}

/**
 * Create a new message
 */
export async function createMessage(messageData: CreateMessageData): Promise<Message> {
  console.log('[messageService] createMessage called:', messageData);

  // Get current user ID
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('User not authenticated');
  }

  // Use grid-based positioning now - positions are just placeholders for database schema
  // Actual positioning is handled by CSS Grid in the UI
  const positionX = messageData.position_x ?? 0;
  const positionY = messageData.position_y ?? 0;

  const { data, error } = await supabase
    .from('messages')
    .insert({
      user_id: user.id,
      from_user: messageData.from_user,
      to_user: messageData.to_user,
      type: messageData.type,
      content: messageData.content,
      media_url: messageData.media_url || null,
      storage_path: messageData.storage_path || null,
      status: messageData.status || 'active',
      position_x: positionX,
      position_y: positionY,
    })
    .select()
    .single();

  if (error) {
    console.error('[messageService] Failed to create message:', error);
    throw new Error(`Failed to create message: ${error.message}`);
  }

  console.log('[messageService] Message created successfully:', data);

  return { ...data, reactions: [] };
}

/**
 * Update message status
 */
export async function updateMessageStatus(messageId: string, status: 'active' | 'dismissed' | 'pinned'): Promise<Message> {
  console.log('[messageService] updateMessageStatus called:', { messageId, status });

  const { data, error } = await supabase
    .from('messages')
    .update({ status })
    .eq('id', messageId)
    .select()
    .single();

  if (error) {
    console.error('[messageService] Failed to update message status:', error);
    throw new Error(`Failed to update message status: ${error.message}`);
  }

  console.log('[messageService] Message status updated successfully');

  return data;
}

/**
 * Update message position (for desktop scatter layout)
 */
export async function updateMessagePosition(messageId: string, x: number, y: number): Promise<Message> {
  console.log('[messageService] updateMessagePosition called:', { messageId, x, y });

  const { data, error } = await supabase
    .from('messages')
    .update({ position_x: x, position_y: y })
    .eq('id', messageId)
    .select()
    .single();

  if (error) {
    console.error('[messageService] Failed to update message position:', error);
    throw new Error(`Failed to update message position: ${error.message}`);
  }

  console.log('[messageService] Message position updated successfully');

  return data;
}

/**
 * Delete a message (and its media file if exists)
 */
export async function deleteMessage(messageId: string, storagePath?: string): Promise<void> {
  console.log('[messageService] deleteMessage called:', { messageId, storagePath });

  // Delete from storage if media file exists
  if (storagePath) {
    const { error: storageError } = await supabase.storage
      .from('message-media')
      .remove([storagePath]);

    if (storageError) {
      console.error('[messageService] Failed to delete storage file:', storageError);
      // Continue with message deletion even if storage deletion fails
    } else {
      console.log('[messageService] Storage file deleted successfully');
    }
  }

  // Delete message (reactions will cascade delete automatically)
  const { error } = await supabase
    .from('messages')
    .delete()
    .eq('id', messageId);

  if (error) {
    console.error('[messageService] Failed to delete message:', error);
    throw new Error(`Failed to delete message: ${error.message}`);
  }

  console.log('[messageService] Message deleted successfully');
}

/**
 * Add a reaction to a message
 */
export async function addReaction(messageId: string, emoji: string): Promise<MessageReaction> {
  console.log('[messageService] addReaction called:', { messageId, emoji });

  // Get current user ID
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('User not authenticated');
  }

  // Check if reaction already exists for this user
  const { data: existing } = await supabase
    .from('message_reactions')
    .select('*')
    .eq('message_id', messageId)
    .eq('emoji', emoji)
    .eq('user_id', user.id)
    .single();

  if (existing) {
    console.log('[messageService] Reaction already exists, returning existing');
    return existing;
  }

  const { data, error } = await supabase
    .from('message_reactions')
    .insert({
      user_id: user.id,
      message_id: messageId,
      emoji,
    })
    .select()
    .single();

  if (error) {
    console.error('[messageService] Failed to add reaction:', error);
    throw new Error(`Failed to add reaction: ${error.message}`);
  }

  console.log('[messageService] Reaction added successfully');

  return data;
}

/**
 * Delete a reaction
 */
export async function deleteReaction(reactionId: string): Promise<void> {
  console.log('[messageService] deleteReaction called:', reactionId);

  const { error } = await supabase
    .from('message_reactions')
    .delete()
    .eq('id', reactionId);

  if (error) {
    console.error('[messageService] Failed to delete reaction:', error);
    throw new Error(`Failed to delete reaction: ${error.message}`);
  }

  console.log('[messageService] Reaction deleted successfully');
}

/**
 * Toggle a reaction (add if doesn't exist, remove if exists)
 */
export async function toggleReaction(messageId: string, emoji: string): Promise<{ added: boolean; reaction?: MessageReaction }> {
  console.log('[messageService] toggleReaction called:', { messageId, emoji });

  // Check if reaction already exists
  const { data: existing } = await supabase
    .from('message_reactions')
    .select('*')
    .eq('message_id', messageId)
    .eq('emoji', emoji)
    .maybeSingle();

  if (existing) {
    // Remove reaction
    await deleteReaction(existing.id);
    return { added: false };
  } else {
    // Add reaction
    const reaction = await addReaction(messageId, emoji);
    return { added: true, reaction };
  }
}
