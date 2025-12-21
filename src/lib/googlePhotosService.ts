import { supabase } from './supabase';

const NETLIFY_FUNCTIONS_URL = '/.netlify/functions';

// =========================================================================
// TYPES
// =========================================================================

export interface GooglePhotosMediaItem {
  id: string;
  productUrl: string;
  baseUrl: string;
  mimeType: string;
  mediaMetadata: {
    creationTime: string;
    width: string;
    height: string;
    photo?: {
      cameraMake?: string;
      cameraModel?: string;
      focalLength?: number;
      apertureFNumber?: number;
      isoEquivalent?: number;
    };
    video?: {
      fps: number;
      status: string;
    };
  };
  filename: string;
  description?: string;
}

export interface GooglePhotosAlbum {
  id: string;
  title: string;
  productUrl: string;
  mediaItemsCount: string;
  coverPhotoBaseUrl?: string;
  coverPhotoMediaItemId?: string;
}

export interface GooglePhotosConnectionStatus {
  connected: boolean;
  user_id?: string;
  display_name?: string;
}

export interface ImportProgress {
  total: number;
  current: number;
  status: 'pending' | 'uploading' | 'completed' | 'error';
  error?: string;
}

// =========================================================================
// AUTHENTICATION
// =========================================================================

/**
 * Get the Google Photos OAuth URL to initiate authentication
 * Note: Client ID will be fetched from backend to avoid exposing it in frontend bundle
 */
export async function getGooglePhotosAuthUrl(userId: string): Promise<string> {
  // Fetch client ID from backend
  const response = await fetch(`${window.location.origin}/.netlify/functions/google-photos-client-id`);
  if (!response.ok) {
    throw new Error('Failed to get Google Photos client configuration');
  }
  const { client_id } = await response.json();

  const redirectUri = `${window.location.origin}/.netlify/functions/google-photos-auth`;

  const scopes = [
    'https://www.googleapis.com/auth/photoslibrary.readonly',
    'https://www.googleapis.com/auth/userinfo.profile',
  ];

  const params = new URLSearchParams({
    client_id: client_id,
    response_type: 'code',
    redirect_uri: redirectUri,
    state: userId, // Pass YuMe user ID as state
    scope: scopes.join(' '),
    access_type: 'offline',
    prompt: 'consent', // Force consent to get refresh token
  });

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

/**
 * Check if user has connected their Google Photos account
 */
export async function checkGooglePhotosConnection(): Promise<GooglePhotosConnectionStatus> {
  try {
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { connected: false };
    }

    // Check if user has Google Photos tokens
    const { data: tokenData, error } = await supabase
      .from('google_photos_tokens')
      .select('user_id')
      .eq('user_id', user.id)
      .single();

    if (error || !tokenData) {
      return { connected: false };
    }

    // Get user profile from user_profiles table
    const { data: userData } = await supabase
      .from('user_profiles')
      .select('google_photos_id, google_photos_display_name')
      .eq('id', user.id)
      .single();

    return {
      connected: true,
      user_id: userData?.google_photos_id || undefined,
      display_name: userData?.google_photos_display_name || undefined,
    };
  } catch (error) {
    console.error('Error checking Google Photos connection:', error);
    return { connected: false };
  }
}

/**
 * Disconnect Google Photos account
 */
export async function disconnectGooglePhotos(): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('User not authenticated');
  }

  // Delete tokens
  const { error } = await supabase
    .from('google_photos_tokens')
    .delete()
    .eq('user_id', user.id);

  if (error) {
    throw new Error('Failed to disconnect Google Photos');
  }

  // Clear Google Photos info from user profile
  await supabase
    .from('user_profiles')
    .update({
      google_photos_id: null,
      google_photos_display_name: null,
    })
    .eq('id', user.id);
}

// =========================================================================
// API CALLS
// =========================================================================

/**
 * Generic function to call Google Photos API via our Netlify function
 */
async function callGooglePhotosAPI(
  endpoint: string,
  method: 'GET' | 'POST' = 'GET',
  body?: any,
  queryParams?: Record<string, string>
): Promise<any> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('User not authenticated');
  }

  const url = new URL(`${window.location.origin}${NETLIFY_FUNCTIONS_URL}/google-photos-api`);

  if (method === 'GET' && !body) {
    // For simple GET requests, pass everything as query params
    url.searchParams.append('user_id', user.id);
    url.searchParams.append('endpoint', endpoint);
    url.searchParams.append('method', method);

    if (queryParams) {
      Object.entries(queryParams).forEach(([key, value]) => {
        url.searchParams.append(key, value);
      });
    }

    const response = await fetch(url.toString());

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Google Photos API request failed');
    }

    return await response.json();
  } else {
    // For POST or GET with body, send data in request body
    const requestBody = {
      user_id: user.id,
      endpoint,
      method,
      body,
      ...queryParams,
    };

    const response = await fetch(url.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Google Photos API request failed');
    }

    return await response.json();
  }
}

// =========================================================================
// ALBUMS
// =========================================================================

/**
 * Get user's Google Photos albums
 */
export async function getGooglePhotosAlbums(pageSize: number = 50, pageToken?: string): Promise<{
  albums: GooglePhotosAlbum[];
  nextPageToken?: string;
}> {
  const queryParams: Record<string, string> = {
    pageSize: pageSize.toString(),
  };

  if (pageToken) {
    queryParams.pageToken = pageToken;
  }

  const data = await callGooglePhotosAPI('albums', 'GET', undefined, queryParams);

  return {
    albums: data.albums || [],
    nextPageToken: data.nextPageToken,
  };
}

/**
 * Get all albums (handles pagination automatically)
 */
export async function getAllGooglePhotosAlbums(): Promise<GooglePhotosAlbum[]> {
  const allAlbums: GooglePhotosAlbum[] = [];
  let pageToken: string | undefined;

  do {
    // Add delay between requests to avoid rate limiting
    if (pageToken) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    const { albums, nextPageToken } = await getGooglePhotosAlbums(50, pageToken);
    allAlbums.push(...albums);
    pageToken = nextPageToken;
  } while (pageToken);

  return allAlbums;
}

// =========================================================================
// MEDIA ITEMS
// =========================================================================

/**
 * Get media items from a specific album
 */
export async function getAlbumMediaItems(
  albumId: string,
  pageSize: number = 100,
  pageToken?: string
): Promise<{
  mediaItems: GooglePhotosMediaItem[];
  nextPageToken?: string;
}> {
  const body = {
    albumId,
    pageSize,
    pageToken,
  };

  const data = await callGooglePhotosAPI('mediaItems:search', 'POST', body);

  return {
    mediaItems: data.mediaItems || [],
    nextPageToken: data.nextPageToken,
  };
}

/**
 * Get all media items from an album (handles pagination automatically)
 */
export async function getAllAlbumMediaItems(albumId: string, maxItems?: number): Promise<GooglePhotosMediaItem[]> {
  const allMediaItems: GooglePhotosMediaItem[] = [];
  let pageToken: string | undefined;

  do {
    // Add delay between requests to avoid rate limiting
    if (pageToken) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    const { mediaItems, nextPageToken } = await getAlbumMediaItems(albumId, 100, pageToken);
    allMediaItems.push(...mediaItems);
    pageToken = nextPageToken;

    // Stop if we've reached maxItems
    if (maxItems && allMediaItems.length >= maxItems) {
      break;
    }
  } while (pageToken);

  // Trim to maxItems if specified
  if (maxItems && allMediaItems.length > maxItems) {
    return allMediaItems.slice(0, maxItems);
  }

  return allMediaItems;
}

/**
 * Get a specific media item by ID
 */
export async function getMediaItem(mediaItemId: string): Promise<GooglePhotosMediaItem> {
  return await callGooglePhotosAPI(`mediaItems/${mediaItemId}`);
}

/**
 * Download a media item (returns the base URL with width/height/download parameters)
 */
export function getDownloadUrl(mediaItem: GooglePhotosMediaItem): string {
  const isVideo = mediaItem.mimeType.startsWith('video/');

  if (isVideo) {
    // For videos, use dv parameter
    return `${mediaItem.baseUrl}=dv`;
  } else {
    // For images, use download parameter with dimensions
    const width = mediaItem.mediaMetadata.width;
    const height = mediaItem.mediaMetadata.height;
    return `${mediaItem.baseUrl}=w${width}-h${height}-d`;
  }
}

// =========================================================================
// IMPORT HELPERS
// =========================================================================

/**
 * Helper to extract metadata from Google Photos media item
 */
export function extractMetadata(mediaItem: GooglePhotosMediaItem): {
  description?: string;
  takenDate?: string;
  location?: string;
} {
  return {
    description: mediaItem.description || mediaItem.filename,
    takenDate: mediaItem.mediaMetadata.creationTime,
    // Google Photos API doesn't provide location data in the basic response
    // Location would require additional API calls or premium access
    location: undefined,
  };
}
