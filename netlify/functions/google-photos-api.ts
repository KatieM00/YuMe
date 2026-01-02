import { Handler, HandlerEvent, HandlerContext } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const GOOGLE_PHOTOS_BASE_URL = 'https://photoslibrary.googleapis.com/v1';

export const handler: Handler = async (event: HandlerEvent, context: HandlerContext) => {
  // Get origin from request or use production URL
  const origin = event.headers.origin || process.env.URL || 'https://yume-app.netlify.app';

  // CORS headers - only allow requests from our domain
  const headers = {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
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

  // Check if required environment variables are set
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error('Missing required environment variables');
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Server configuration error' }),
    };
  }

  // Extract and verify JWT token
  const authHeader = event.headers.authorization || event.headers.Authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return {
      statusCode: 401,
      headers,
      body: JSON.stringify({ error: 'Authorization header required' }),
    };
  }

  const token = authHeader.replace('Bearer ', '');

  // Verify token with Supabase
  const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_KEY!);
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);

  if (authError || !user) {
    console.error('Auth error:', authError);
    return {
      statusCode: 401,
      headers,
      body: JSON.stringify({ error: 'Invalid or expired token' }),
    };
  }

  // Use verified user ID from token
  const user_id = user.id;

  // Extract other parameters
  const { endpoint, method = 'GET', body: requestBody, ...queryParams } =
    event.httpMethod === 'GET'
      ? event.queryStringParameters || {}
      : { ...event.queryStringParameters, ...(JSON.parse(event.body || '{}')) };

  if (!endpoint) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'endpoint parameter required' }),
    };
  }

  try {
    // Get access token for user
    const tokenResponse = await fetch(`${SUPABASE_URL}/rest/v1/google_photos_tokens?user_id=eq.${user_id}&select=access_token,expires_at,refresh_token`, {
      headers: {
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
      },
    });

    if (!tokenResponse.ok) {
      console.error('Error fetching token');
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'No Google Photos account connected' }),
      };
    }

    const tokenData = await tokenResponse.json();
    if (!tokenData || tokenData.length === 0) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'No Google Photos account connected' }),
      };
    }

    let accessToken = tokenData[0].access_token;
    const expiresAt = new Date(tokenData[0].expires_at).getTime();
    const refreshToken = tokenData[0].refresh_token;

    // Check if token is expired or about to expire (within 5 minutes)
    if (expiresAt < Date.now() + (5 * 60 * 1000)) {
      console.log('Token expired or about to expire, refreshing...');

      // Refresh the token
      const refreshResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: GOOGLE_CLIENT_ID,
          client_secret: GOOGLE_CLIENT_SECRET,
          refresh_token: refreshToken,
          grant_type: 'refresh_token',
        }),
      });

      if (!refreshResponse.ok) {
        const errorData = await refreshResponse.json();
        console.error('Token refresh failed:', errorData);

        if (errorData.error === 'invalid_grant') {
          return {
            statusCode: 401,
            headers,
            body: JSON.stringify({
              error: 'Google Photos connection expired',
              reconnect_required: true
            }),
          };
        }

        throw new Error('Failed to refresh token');
      }

      const newTokenData = await refreshResponse.json();
      accessToken = newTokenData.access_token;

      // Update token in database
      const newExpiresAt = new Date(Date.now() + (newTokenData.expires_in * 1000)).toISOString();
      await fetch(`${SUPABASE_URL}/rest/v1/google_photos_tokens?user_id=eq.${user_id}`, {
        method: 'PATCH',
        headers: {
          'apikey': SUPABASE_SERVICE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          access_token: accessToken,
          expires_at: newExpiresAt,
        }),
      });
    }

    // Build Google Photos API URL
    const url = new URL(`${GOOGLE_PHOTOS_BASE_URL}/${endpoint}`);

    // Add query parameters (excluding our internal params)
    Object.entries(queryParams).forEach(([key, value]) => {
      if (key !== 'user_id' && key !== 'endpoint' && key !== 'method' && key !== 'body' && value) {
        url.searchParams.append(key, String(value));
      }
    });

    // Make request to Google Photos API
    const fetchOptions: RequestInit = {
      method: method.toUpperCase(),
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    };

    // Add body for POST requests
    if (requestBody && method.toUpperCase() === 'POST') {
      fetchOptions.body = typeof requestBody === 'string' ? requestBody : JSON.stringify(requestBody);
    }

    console.log(`Making ${method} request to Google Photos:`, url.pathname);

    const googlePhotosResponse = await fetch(url.toString(), fetchOptions);

    // Handle empty responses
    if (googlePhotosResponse.status === 204) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true }),
      };
    }

    if (!googlePhotosResponse.ok) {
      const errorData = await googlePhotosResponse.json().catch(() => ({}));
      console.error('Google Photos API error:', googlePhotosResponse.status, errorData);

      return {
        statusCode: googlePhotosResponse.status,
        headers,
        body: JSON.stringify({
          error: 'Google Photos API request failed',
          status: googlePhotosResponse.status,
          details: errorData,
        }),
      };
    }

    const data = await googlePhotosResponse.json();

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(data),
    };

  } catch (error) {
    console.error('Google Photos API proxy error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to fetch from Google Photos API',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
    };
  }
};
