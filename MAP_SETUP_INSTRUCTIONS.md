# Map Feature Setup Instructions

## Overview
The Map feature allows you to track visited locations and create a wishlist of places you want to visit. It uses Mapbox for the interactive map and Supabase for data storage.

## Setup Steps

### 1. Create Supabase Table

1. Go to your Supabase project dashboard
2. Navigate to the **SQL Editor**
3. Run the SQL script in `supabase-setup.sql` (in the project root)
4. Verify the table was created by checking the **Table Editor**

### 2. Get a Mapbox Token (For Deployment Only)

1. Sign up at [https://account.mapbox.com/auth/signup/](https://account.mapbox.com/auth/signup/)
2. After signing up, you'll see your **default public token** (starts with `pk.`)
3. Copy this token - you'll need it for Netlify

### 3. Add Token to Netlify (When Ready to Deploy)

1. Go to your Netlify site dashboard
2. Navigate to **Site settings** → **Environment variables**
3. Click **Add a variable**
4. Add:
   - **Key:** `VITE_MAPBOX_TOKEN`
   - **Value:** Your Mapbox token (the one starting with `pk.`)
5. Save and redeploy your site

## Local Development

**Good news:** You don't need a Mapbox token for local development!

The map will show a placeholder message without the token. You can:
- Add locations manually using the + button
- View your locations list
- Delete locations
- All data is still stored in Supabase

The interactive map will only appear once you add the token to Netlify.

## Features

### Interactive Map (with token)
- Click anywhere on the map to add a new location
- Automatically captures latitude/longitude from your click
- Green pins = Visited locations
- Red pins = Wishlist locations
- Click pins to see details in a popup

### Add Locations
- Click the **+** button or click the map
- Fill in:
  - **Name** (required) - e.g., "Paris", "Tokyo"
  - **Latitude & Longitude** (required) - auto-filled when clicking map
  - **Type** - Visited or Wishlist
  - **Visit Date** - Optional month/year
  - **Notes** - Optional notes about the location

### Manage Locations
- View all your locations in the sidebar
- See visited count and wishlist count at the top
- Delete locations with the trash icon
- All changes sync to Supabase automatically

## Database Schema

The `map_locations` table includes:
- `id` - Unique identifier
- `name` - Location name
- `lat`, `lng` - Coordinates
- `type` - 'visited' or 'wishlist'
- `visit_date` - Optional visit date
- `notes` - Optional notes
- `country_code`, `country_name` - For future features
- `created_at`, `updated_at` - Timestamps

## Security

- The `.gitignore` file prevents environment variables from being committed
- Mapbox public tokens (pk.*) are safe to use client-side
- Configure URL restrictions in your Mapbox dashboard for added security
- Supabase Row Level Security (RLS) is enabled by default

## Troubleshooting

### "Failed to load locations"
- Check your Supabase credentials in `.env` (for local) or Netlify env vars
- Verify the `map_locations` table exists in Supabase
- Check the browser console for specific errors

### Map shows placeholder even with token
- Verify `VITE_MAPBOX_TOKEN` is set correctly in Netlify
- Redeploy your site after adding the token
- Check browser console for Mapbox errors

### Can't add locations
- Verify Supabase connection is working
- Check that the table was created correctly
- Make sure all required fields are filled in

## Free Tier Limits

**Mapbox:**
- 50,000 free map loads per month
- More than enough for a personal project

**Supabase:**
- 500 MB database storage (free tier)
- 2 GB data transfer per month

Both should be plenty for personal use!
