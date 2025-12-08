import { Handler, HandlerEvent, HandlerContext } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';

const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

export const handler: Handler = async (event: HandlerEvent, context: HandlerContext) => {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json',
  };

  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: '',
    };
  }

  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  // Check if required environment variables are set
  if (!SPOTIFY_CLIENT_ID || !SPOTIFY_CLIENT_SECRET || !SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error('Missing required environment variables');
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Server configuration error' }),
    };
  }

  try {
    // Get user_id from request body
    const { user_id } = JSON.parse(event.body || '{}');

    if (!user_id) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'user_id is required' }),
      };
    }

    // Initialize Supabase client
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // Get current refresh token from database
    const { data: tokenData, error: tokenFetchError } = await supabase
      .from('spotify_tokens')
      .select('refresh_token')
      .eq('user_id', user_id)
      .single();

    if (tokenFetchError || !tokenData?.refresh_token) {
      console.error('Error fetching refresh token:', tokenFetchError);
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'No Spotify account connected' }),
      };
    }

    // Request new access token from Spotify
    const tokenResponse = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': 'Basic ' + Buffer.from(SPOTIFY_CLIENT_ID + ':' + SPOTIFY_CLIENT_SECRET).toString('base64'),
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: tokenData.refresh_token,
      }),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json();
      console.error('Spotify token refresh failed:', errorData);

      // If refresh token is invalid, user needs to reconnect
      if (errorData.error === 'invalid_grant') {
        return {
          statusCode: 401,
          headers,
          body: JSON.stringify({
            error: 'Spotify connection expired',
            reconnect_required: true
          }),
        };
      }

      throw new Error('Failed to refresh token');
    }

    const newTokenData = await tokenResponse.json();
    const { access_token, expires_in, refresh_token } = newTokenData;

    // Calculate expiration timestamp
    const expiresAt = Date.now() + (expires_in * 1000);

    // Update tokens in database
    // Note: Spotify sometimes returns a new refresh_token, sometimes doesn't
    const { error: updateError } = await supabase
      .from('spotify_tokens')
      .update({
        access_token: access_token,
        refresh_token: refresh_token || tokenData.refresh_token, // Use new refresh token if provided
        expires_at: expiresAt,
      })
      .eq('user_id', user_id);

    if (updateError) {
      console.error('Error updating tokens:', updateError);
      throw new Error('Failed to update tokens');
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        access_token: access_token,
        expires_at: expiresAt,
      }),
    };

  } catch (error) {
    console.error('Token refresh error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to refresh token',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
    };
  }
};
