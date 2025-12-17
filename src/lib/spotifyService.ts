import { supabase } from './supabase';

const NETLIFY_FUNCTIONS_URL = '/.netlify/functions';

// =========================================================================
// TYPES
// =========================================================================

export interface SpotifyTrack {
  id: string;
  name: string;
  artists: { name: string; id: string }[];
  album: {
    name: string;
    images: { url: string; height: number; width: number }[];
  };
  duration_ms: number;
  preview_url: string | null;
  external_urls: {
    spotify: string;
  };
}

export interface SpotifyPlaylist {
  id: string;
  name: string;
  description: string;
  images: { url: string }[];
  tracks: {
    total: number;
  };
  external_urls: {
    spotify: string;
  };
}

export interface SpotifyUserProfile {
  id: string;
  display_name: string;
  email: string;
  images: { url: string }[];
  external_urls: {
    spotify: string;
  };
}

export interface SpotifyConnectionStatus {
  connected: boolean;
  user_id?: string;
  display_name?: string;
  avatar_url?: string;
}

// =========================================================================
// AUTHENTICATION
// =========================================================================

/**
 * Get the Spotify OAuth URL to initiate authentication
 * Note: Client ID will be fetched from backend to avoid exposing it in frontend bundle
 */
export async function getSpotifyAuthUrl(userId: string): Promise<string> {
  // Fetch client ID from backend
  const response = await fetch(`${window.location.origin}/.netlify/functions/spotify-client-id`);
  if (!response.ok) {
    throw new Error('Failed to get Spotify client configuration');
  }
  const { client_id } = await response.json();

  const redirectUri = `${window.location.origin}/.netlify/functions/spotify-auth`;

  const scopes = [
    'user-read-private',
    'user-read-email',
    'playlist-read-private',
    'playlist-read-collaborative',
    'playlist-modify-public',
    'playlist-modify-private',
    'user-library-read',
    'user-library-modify',
    'user-top-read',
    'user-read-recently-played',
    'user-read-currently-playing',
    'user-read-playback-state',
  ];

  const params = new URLSearchParams({
    client_id: client_id,
    response_type: 'code',
    redirect_uri: redirectUri,
    state: userId, // Pass YuMe user ID as state
    scope: scopes.join(' '),
  });

  return `https://accounts.spotify.com/authorize?${params.toString()}`;
}

/**
 * Check if user has connected their Spotify account
 */
export async function checkSpotifyConnection(): Promise<SpotifyConnectionStatus> {
  try {
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { connected: false };
    }

    // Check if user has Spotify tokens
    const { data: tokenData, error } = await supabase
      .from('spotify_tokens')
      .select('user_id')
      .eq('user_id', user.id)
      .single();

    if (error || !tokenData) {
      return { connected: false };
    }

    // Get user profile from users table
    const { data: userData } = await supabase
      .from('users')
      .select('spotify_id, display_name, avatar_url')
      .eq('id', user.id)
      .single();

    return {
      connected: true,
      user_id: userData?.spotify_id || undefined,
      display_name: userData?.display_name || undefined,
      avatar_url: userData?.avatar_url || undefined,
    };
  } catch (error) {
    console.error('Error checking Spotify connection:', error);
    return { connected: false };
  }
}

/**
 * Disconnect Spotify account
 */
export async function disconnectSpotify(): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('User not authenticated');
  }

  // Delete tokens
  const { error } = await supabase
    .from('spotify_tokens')
    .delete()
    .eq('user_id', user.id);

  if (error) {
    throw new Error('Failed to disconnect Spotify');
  }
}

// =========================================================================
// API CALLS
// =========================================================================

/**
 * Generic function to call Spotify API via our Netlify function
 */
async function callSpotifyAPI(
  endpoint: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
  body?: any,
  queryParams?: Record<string, string>
): Promise<any> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('User not authenticated');
  }

  const url = new URL(`${window.location.origin}${NETLIFY_FUNCTIONS_URL}/spotify-api`);

  if (method === 'GET') {
    // For GET requests, pass everything as query params
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
      throw new Error(errorData.error || 'Spotify API request failed');
    }

    return await response.json();
  } else {
    // For POST/PUT/DELETE, send data in body
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
      throw new Error(errorData.error || 'Spotify API request failed');
    }

    return await response.json();
  }
}

// =========================================================================
// USER PROFILE
// =========================================================================

/**
 * Get current user's Spotify profile
 */
export async function getSpotifyProfile(): Promise<SpotifyUserProfile> {
  return await callSpotifyAPI('me');
}

// =========================================================================
// SEARCH
// =========================================================================

/**
 * Search for tracks on Spotify
 */
export async function searchTracks(query: string, limit: number = 20): Promise<SpotifyTrack[]> {
  const data = await callSpotifyAPI('search', 'GET', undefined, {
    q: query,
    type: 'track',
    limit: limit.toString(),
  });

  return data.tracks?.items || [];
}

/**
 * Get track by ID
 */
export async function getTrack(trackId: string): Promise<SpotifyTrack> {
  return await callSpotifyAPI(`tracks/${trackId}`);
}

/**
 * Get multiple tracks by IDs
 */
export async function getTracks(trackIds: string[]): Promise<SpotifyTrack[]> {
  const data = await callSpotifyAPI('tracks', 'GET', undefined, {
    ids: trackIds.join(','),
  });

  return data.tracks || [];
}

// =========================================================================
// PLAYLISTS
// =========================================================================

/**
 * Get user's playlists
 */
export async function getUserPlaylists(limit: number = 50): Promise<SpotifyPlaylist[]> {
  const data = await callSpotifyAPI('me/playlists', 'GET', undefined, {
    limit: limit.toString(),
  });

  return data.items || [];
}

/**
 * Get a specific playlist
 */
export async function getPlaylist(playlistId: string): Promise<SpotifyPlaylist> {
  return await callSpotifyAPI(`playlists/${playlistId}`);
}

/**
 * Get playlist tracks with pagination support to avoid rate limiting
 */
export async function getPlaylistTracks(playlistId: string, limit: number = 100): Promise<SpotifyTrack[]> {
  const tracks: SpotifyTrack[] = [];
  let offset = 0;
  const batchSize = 50; // Smaller batch size to avoid rate limits

  while (tracks.length < limit) {
    const remaining = limit - tracks.length;
    const currentLimit = Math.min(remaining, batchSize);

    // Add delay between requests to avoid rate limiting
    if (offset > 0) {
      await new Promise(resolve => setTimeout(resolve, 100)); // 100ms delay between requests
    }

    const data = await callSpotifyAPI(`playlists/${playlistId}/tracks`, 'GET', undefined, {
      limit: currentLimit.toString(),
      offset: offset.toString(),
    });

    const batch = data.items?.map((item: any) => item.track).filter(Boolean) || [];

    if (batch.length === 0) {
      // No more tracks available
      break;
    }

    tracks.push(...batch);
    offset += batch.length;

    // If we got fewer tracks than requested, we've reached the end
    if (batch.length < currentLimit) {
      break;
    }
  }

  return tracks;
}

/**
 * Create a new playlist
 */
export async function createPlaylist(name: string, description?: string, isPublic: boolean = false): Promise<SpotifyPlaylist> {
  // Get user's Spotify ID
  const profile = await getSpotifyProfile();

  return await callSpotifyAPI(
    `users/${profile.id}/playlists`,
    'POST',
    {
      name,
      description,
      public: isPublic,
    }
  );
}

/**
 * Add tracks to a playlist
 */
export async function addTracksToPlaylist(playlistId: string, trackUris: string[]): Promise<void> {
  await callSpotifyAPI(
    `playlists/${playlistId}/tracks`,
    'POST',
    {
      uris: trackUris,
    }
  );
}

/**
 * Delete (unfollow) a playlist
 */
export async function deletePlaylist(playlistId: string): Promise<void> {
  await callSpotifyAPI(
    `playlists/${playlistId}/followers`,
    'DELETE'
  );
}

// =========================================================================
// USER LIBRARY
// =========================================================================

/**
 * Get user's saved tracks
 */
export async function getSavedTracks(limit: number = 50): Promise<SpotifyTrack[]> {
  const data = await callSpotifyAPI('me/tracks', 'GET', undefined, {
    limit: limit.toString(),
  });

  return data.items?.map((item: any) => item.track) || [];
}

/**
 * Save tracks to user's library
 */
export async function saveTracks(trackIds: string[]): Promise<void> {
  await callSpotifyAPI(
    'me/tracks',
    'PUT',
    {
      ids: trackIds,
    }
  );
}

/**
 * Check if tracks are saved in user's library
 */
export async function checkSavedTracks(trackIds: string[]): Promise<boolean[]> {
  return await callSpotifyAPI('me/tracks/contains', 'GET', undefined, {
    ids: trackIds.join(','),
  });
}

// =========================================================================
// USER TOP ITEMS
// =========================================================================

/**
 * Get user's top tracks
 */
export async function getTopTracks(limit: number = 20, timeRange: 'short_term' | 'medium_term' | 'long_term' = 'medium_term'): Promise<SpotifyTrack[]> {
  const data = await callSpotifyAPI('me/top/tracks', 'GET', undefined, {
    limit: limit.toString(),
    time_range: timeRange,
  });

  return data.items || [];
}

/**
 * Get user's recently played tracks
 */
export async function getRecentlyPlayed(limit: number = 20): Promise<SpotifyTrack[]> {
  const data = await callSpotifyAPI('me/player/recently-played', 'GET', undefined, {
    limit: limit.toString(),
  });

  return data.items?.map((item: any) => item.track) || [];
}

/**
 * Get user's currently playing track
 */
export async function getCurrentlyPlaying(): Promise<SpotifyTrack | null> {
  try {
    const data = await callSpotifyAPI('me/player/currently-playing');
    return data.item || null;
  } catch (error) {
    // User might not be playing anything
    return null;
  }
}

// =========================================================================
// RECOMMENDATIONS
// =========================================================================

/**
 * Get track recommendations based on seed tracks
 */
export async function getRecommendations(seedTrackIds: string[], limit: number = 20): Promise<SpotifyTrack[]> {
  const data = await callSpotifyAPI('recommendations', 'GET', undefined, {
    seed_tracks: seedTrackIds.slice(0, 5).join(','), // Max 5 seeds
    limit: limit.toString(),
  });

  return data.tracks || [];
}
