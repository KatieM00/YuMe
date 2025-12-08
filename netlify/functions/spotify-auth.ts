import { Handler, HandlerEvent, HandlerContext } from '@netlify/functions';

const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;
const SPOTIFY_REDIRECT_URI = process.env.SPOTIFY_REDIRECT_URI;
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

export const handler: Handler = async (event: HandlerEvent, context: HandlerContext) => {
  // Get origin from request or use production URL
  const origin = event.headers.origin || process.env.URL || 'https://yume-app.netlify.app';

  // CORS headers - only allow requests from our domain
  const headers = {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Credentials': 'true',
  };

  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: '',
    };
  }

  // Only allow GET requests
  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  // Check if required environment variables are set
  if (!SPOTIFY_CLIENT_ID || !SPOTIFY_CLIENT_SECRET || !SPOTIFY_REDIRECT_URI || !SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error('Missing required environment variables');
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Server configuration error' }),
    };
  }

  const { code, state, error } = event.queryStringParameters || {};

  // Handle OAuth error
  if (error) {
    console.error('Spotify OAuth error:', error);
    return {
      statusCode: 302,
      headers: {
        ...headers,
        Location: `${process.env.URL}/settings?spotify_error=${encodeURIComponent(error)}`,
      },
      body: '',
    };
  }

  // Validate that we have a code and state
  if (!code || !state) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'Missing code or state parameter' }),
    };
  }

  try {
    // Exchange authorization code for access token
    const tokenResponse = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': 'Basic ' + Buffer.from(SPOTIFY_CLIENT_ID + ':' + SPOTIFY_CLIENT_SECRET).toString('base64'),
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: SPOTIFY_REDIRECT_URI,
      }),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json();
      console.error('Spotify token exchange failed:', errorData);
      throw new Error('Failed to exchange authorization code');
    }

    const tokenData = await tokenResponse.json();
    const { access_token, refresh_token, expires_in } = tokenData;

    // Get Spotify user profile
    const profileResponse = await fetch('https://api.spotify.com/v1/me', {
      headers: {
        'Authorization': `Bearer ${access_token}`,
      },
    });

    if (!profileResponse.ok) {
      throw new Error('Failed to fetch Spotify user profile');
    }

    const spotifyProfile = await profileResponse.json();

    // The state parameter contains our YuMe user ID
    const yumeUserId = state;

    // Check if user exists in users table
    const existingUserResponse = await fetch(`${SUPABASE_URL}/rest/v1/users?id=eq.${yumeUserId}&select=*`, {
      headers: {
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
      },
    });

    let existingUser = null;
    if (existingUserResponse.ok) {
      const users = await existingUserResponse.json();
      existingUser = users[0];
    }

    // Upsert user data with Spotify info
    const upsertUserResponse = await fetch(`${SUPABASE_URL}/rest/v1/users`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'resolution=merge-duplicates',
      },
      body: JSON.stringify({
        id: yumeUserId,
        spotify_id: spotifyProfile.id,
        display_name: spotifyProfile.display_name || spotifyProfile.id,
        email: spotifyProfile.email || existingUser?.email,
        avatar_url: spotifyProfile.images?.[0]?.url || null,
      }),
    });

    if (!upsertUserResponse.ok) {
      console.error('Error upserting user:', await upsertUserResponse.text());
      throw new Error('Failed to update user profile');
    }

    // Store tokens in spotify_tokens table
    const expiresAt = Date.now() + (expires_in * 1000);

    const upsertTokenResponse = await fetch(`${SUPABASE_URL}/rest/v1/spotify_tokens`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'resolution=merge-duplicates',
      },
      body: JSON.stringify({
        user_id: yumeUserId,
        access_token: access_token,
        refresh_token: refresh_token,
        expires_at: expiresAt,
      }),
    });

    if (!upsertTokenResponse.ok) {
      console.error('Error storing tokens:', await upsertTokenResponse.text());
      throw new Error('Failed to store tokens');
    }

    // Redirect back to settings page with success message
    return {
      statusCode: 302,
      headers: {
        ...headers,
        Location: `${process.env.URL}/settings?spotify_connected=true`,
      },
      body: '',
    };

  } catch (error) {
    console.error('Spotify auth error:', error);
    return {
      statusCode: 302,
      headers: {
        ...headers,
        Location: `${process.env.URL}/settings?spotify_error=auth_failed`,
      },
      body: '',
    };
  }
};
