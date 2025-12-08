import { Handler, HandlerEvent, HandlerContext } from '@netlify/functions';

const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

export const handler: Handler = async (event: HandlerEvent, context: HandlerContext) => {
  // Get origin from request or use production URL
  const origin = event.headers.origin || process.env.URL || 'https://yume-app.netlify.app';

  // CORS headers - only allow requests from our domain
  const headers = {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Credentials': 'true',
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

    // Get current refresh token from database
    const tokenResponse = await fetch(`${SUPABASE_URL}/rest/v1/spotify_tokens?user_id=eq.${user_id}&select=refresh_token`, {
      headers: {
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
      },
    });

    if (!tokenResponse.ok) {
      console.error('Error fetching refresh token');
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'No Spotify account connected' }),
      };
    }

    const tokenData = await tokenResponse.json();
    if (!tokenData || tokenData.length === 0 || !tokenData[0].refresh_token) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'No Spotify account connected' }),
      };
    }

    const refreshToken = tokenData[0].refresh_token;

    // Request new access token from Spotify
    const spotifyTokenResponse = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': 'Basic ' + Buffer.from(SPOTIFY_CLIENT_ID + ':' + SPOTIFY_CLIENT_SECRET).toString('base64'),
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
      }),
    });

    if (!spotifyTokenResponse.ok) {
      const errorData = await spotifyTokenResponse.json();
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

    const newTokenData = await spotifyTokenResponse.json();
    const { access_token, expires_in, refresh_token } = newTokenData;

    // Calculate expiration timestamp
    const expiresAt = Date.now() + (expires_in * 1000);

    // Update tokens in database
    const updateResponse = await fetch(`${SUPABASE_URL}/rest/v1/spotify_tokens?user_id=eq.${user_id}`, {
      method: 'PATCH',
      headers: {
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        access_token: access_token,
        refresh_token: refresh_token || refreshToken, // Use new refresh token if provided
        expires_at: expiresAt,
      }),
    });

    if (!updateResponse.ok) {
      console.error('Error updating tokens:', await updateResponse.text());
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
