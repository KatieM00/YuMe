import { Handler, HandlerEvent, HandlerContext } from '@netlify/functions';

export const handler: Handler = async (event: HandlerEvent, context: HandlerContext) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  };

  // Check environment variables (without exposing values)
  const envCheck = {
    SPOTIFY_CLIENT_ID: !!process.env.SPOTIFY_CLIENT_ID,
    SPOTIFY_CLIENT_SECRET: !!process.env.SPOTIFY_CLIENT_SECRET,
    SPOTIFY_REDIRECT_URI: !!process.env.SPOTIFY_REDIRECT_URI,
    VITE_SUPABASE_URL: !!process.env.VITE_SUPABASE_URL,
    SUPABASE_SERVICE_KEY: !!process.env.SUPABASE_SERVICE_KEY,
    URL: process.env.URL || 'not set',
  };

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      message: 'Environment check',
      environment: envCheck,
      redirectUri: process.env.SPOTIFY_REDIRECT_URI || 'NOT SET',
    }),
  };
};
