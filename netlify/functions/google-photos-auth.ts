import { Handler, HandlerEvent, HandlerContext } from '@netlify/functions';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI;
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
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_REDIRECT_URI || !SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
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
    console.error('Google Photos OAuth error:', error);
    return {
      statusCode: 302,
      headers: {
        ...headers,
        Location: `${process.env.URL}/settings?google_photos_error=${encodeURIComponent(error)}`,
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
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code: code,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: GOOGLE_REDIRECT_URI,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json();
      console.error('Google token exchange failed:', errorData);
      throw new Error('Failed to exchange authorization code');
    }

    const tokenData = await tokenResponse.json();
    const { access_token, refresh_token, expires_in } = tokenData;

    // Get Google user profile
    const profileResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        'Authorization': `Bearer ${access_token}`,
      },
    });

    if (!profileResponse.ok) {
      throw new Error('Failed to fetch Google user profile');
    }

    const googleProfile = await profileResponse.json();

    // The state parameter contains our YuMe user ID
    const yumeUserId = state;

    // Update user_profiles table with Google Photos info
    const updateProfileResponse = await fetch(`${SUPABASE_URL}/rest/v1/user_profiles?id=eq.${yumeUserId}`, {
      method: 'PATCH',
      headers: {
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        google_photos_id: googleProfile.id,
        google_photos_display_name: googleProfile.name || googleProfile.email,
      }),
    });

    if (!updateProfileResponse.ok) {
      console.error('Error updating user profile:', await updateProfileResponse.text());
      throw new Error('Failed to update user profile');
    }

    // Store tokens in google_photos_tokens table
    const expiresAt = new Date(Date.now() + (expires_in * 1000)).toISOString();

    const upsertTokenResponse = await fetch(`${SUPABASE_URL}/rest/v1/google_photos_tokens`, {
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
        Location: `${process.env.URL}/settings?google_photos_connected=true`,
      },
      body: '',
    };

  } catch (error) {
    console.error('Google Photos auth error:', error);
    return {
      statusCode: 302,
      headers: {
        ...headers,
        Location: `${process.env.URL}/settings?google_photos_error=auth_failed`,
      },
      body: '',
    };
  }
};
