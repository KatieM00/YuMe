import { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';

// Song type matching the Mixtape component
interface Song {
  id: string;
  user_id: string;
  playlist_id: string;
  title: string;
  artist: string;
  spotify_id: string;
  duration: string;
  album_art?: string;
  position: number;
  created_at: string;
}

interface Playlist {
  id: string;
  title: string;
  songs: Song[];
}

interface SpotifyPlayerContextType {
  isPlaying: boolean;
  isPaused: boolean;
  currentPlaylist: Playlist | null;
  currentTrackIndex: number;
  isExpanded: boolean;
  currentTrack: Spotify.Track | null;
  position: number;
  duration: number;

  // Methods
  playPlaylist: (playlist: Playlist) => Promise<void>;
  playSingleTrack: (song: Song, playlistTitle?: string) => Promise<void>;
  togglePlayPause: () => void;
  nextTrack: () => void;
  previousTrack: () => void;
  toggleExpanded: () => void;
  stop: () => void;
  seek: (position: number) => void;
}

const SpotifyPlayerContext = createContext<SpotifyPlayerContextType | undefined>(undefined);

// Spotify Web Playback SDK types
declare global {
  interface Window {
    onSpotifyWebPlaybackSDKReady: () => void;
    Spotify: typeof Spotify;
  }
}

export function SpotifyPlayerProvider({ children }: { children: ReactNode }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentPlaylist, setCurrentPlaylist] = useState<Playlist | null>(null);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [isExpanded, setIsExpanded] = useState(false);
  const [currentTrack, setCurrentTrack] = useState<Spotify.Track | null>(null);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [deviceId, setDeviceId] = useState<string | null>(null);

  const playerRef = useRef<Spotify.Player | null>(null);
  const accessTokenRef = useRef<string | null>(null);

  // Load Spotify Web Playback SDK
  useEffect(() => {
    // Check if SDK is already loaded
    if (window.Spotify) {
      initializePlayer();
      return;
    }

    // Load SDK script
    const script = document.createElement('script');
    script.src = 'https://sdk.scdn.co/spotify-player.js';
    script.async = true;
    document.body.appendChild(script);

    window.onSpotifyWebPlaybackSDKReady = () => {
      initializePlayer();
    };

    return () => {
      if (playerRef.current) {
        playerRef.current.disconnect();
      }
    };
  }, []);

  // Initialize Spotify Player
  const initializePlayer = async () => {
    try {
      // Get access token from your backend
      const response = await fetch('/.netlify/functions/spotify-api', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: 'current', // Replace with actual user ID from auth
          endpoint: 'me',
          method: 'GET',
        }),
      });

      if (!response.ok) {
        console.error('Failed to get Spotify access token');
        return;
      }

      // Extract token from your API response format
      // You'll need to modify this based on your actual API response
      const token = await getSpotifyAccessToken();
      if (!token) return;

      accessTokenRef.current = token;

      // Create Spotify Player instance
      const player = new window.Spotify.Player({
        name: 'YuMe Player',
        getOAuthToken: (cb) => {
          cb(token);
        },
        volume: 0.8,
      });

      // Error handling
      player.addListener('initialization_error', ({ message }) => {
        console.error('Initialization error:', message);
      });

      player.addListener('authentication_error', ({ message }) => {
        console.error('Authentication error:', message);
      });

      player.addListener('account_error', ({ message }) => {
        console.error('Account error:', message);
      });

      player.addListener('playback_error', ({ message }) => {
        console.error('Playback error:', message);
      });

      // Ready
      player.addListener('ready', ({ device_id }) => {
        console.log('Spotify Player ready with Device ID:', device_id);
        setDeviceId(device_id);
      });

      // Not Ready
      player.addListener('not_ready', ({ device_id }) => {
        console.log('Device ID has gone offline:', device_id);
      });

      // Player state changed
      player.addListener('player_state_changed', (state) => {
        if (!state) return;

        setCurrentTrack(state.track_window.current_track);
        setPosition(state.position);
        setDuration(state.duration);
        setIsPaused(state.paused);
        setIsPlaying(!state.paused);

        // Check if track changed for playlist progression
        const currentTrackUri = state.track_window.current_track.uri;
        const currentTrackId = currentTrackUri.split(':').pop();

        if (currentPlaylist) {
          const trackIndex = currentPlaylist.songs.findIndex(
            (song) => song.spotify_id === currentTrackId
          );
          if (trackIndex !== -1 && trackIndex !== currentTrackIndex) {
            setCurrentTrackIndex(trackIndex);
          }
        }
      });

      // Connect to the player
      const connected = await player.connect();
      if (connected) {
        console.log('Spotify Player connected successfully');
        playerRef.current = player;
      }
    } catch (error) {
      console.error('Error initializing Spotify player:', error);
    }
  };

  // Get Spotify access token from your backend
  const getSpotifyAccessToken = async (): Promise<string | null> => {
    try {
      // TODO: Replace with your actual API call to get the access token
      // This should call your backend to retrieve the user's Spotify access token
      const response = await fetch('/.netlify/functions/spotify-check');
      const data = await response.json();
      return data.access_token || null;
    } catch (error) {
      console.error('Error getting access token:', error);
      return null;
    }
  };

  // Transfer playback to this device and play playlist
  const playPlaylist = async (playlist: Playlist) => {
    if (!playerRef.current || !deviceId || !accessTokenRef.current) {
      console.error('Player not ready');
      return;
    }

    try {
      setCurrentPlaylist(playlist);
      setCurrentTrackIndex(0);
      setIsExpanded(true);

      // Build array of Spotify track URIs
      const uris = playlist.songs.map((song) => `spotify:track:${song.spotify_id}`);

      // Transfer playback to this device and start playing
      const response = await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessTokenRef.current}`,
        },
        body: JSON.stringify({
          uris: uris,
          offset: { position: 0 },
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to start playback');
      }

      setIsPlaying(true);
      setIsPaused(false);
    } catch (error) {
      console.error('Error playing playlist:', error);
    }
  };

  // Play a single track
  const playSingleTrack = async (song: Song, playlistTitle?: string) => {
    if (!playerRef.current || !deviceId || !accessTokenRef.current) {
      console.error('Player not ready');
      return;
    }

    try {
      const singleSongPlaylist: Playlist = {
        id: song.playlist_id,
        title: playlistTitle || 'Now Playing',
        songs: [song],
      };

      setCurrentPlaylist(singleSongPlaylist);
      setCurrentTrackIndex(0);
      setIsExpanded(true);

      // Play single track
      const response = await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessTokenRef.current}`,
        },
        body: JSON.stringify({
          uris: [`spotify:track:${song.spotify_id}`],
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to start playback');
      }

      setIsPlaying(true);
      setIsPaused(false);
    } catch (error) {
      console.error('Error playing track:', error);
    }
  };

  // Toggle play/pause
  const togglePlayPause = async () => {
    if (!playerRef.current) return;

    try {
      await playerRef.current.togglePlay();
    } catch (error) {
      console.error('Error toggling play/pause:', error);
    }
  };

  // Next track
  const nextTrack = async () => {
    if (!playerRef.current) return;

    try {
      await playerRef.current.nextTrack();
    } catch (error) {
      console.error('Error skipping to next track:', error);
    }
  };

  // Previous track
  const previousTrack = async () => {
    if (!playerRef.current) return;

    try {
      await playerRef.current.previousTrack();
    } catch (error) {
      console.error('Error going to previous track:', error);
    }
  };

  // Seek to position
  const seek = async (positionMs: number) => {
    if (!playerRef.current) return;

    try {
      await playerRef.current.seek(positionMs);
    } catch (error) {
      console.error('Error seeking:', error);
    }
  };

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  const stop = async () => {
    if (!playerRef.current) return;

    try {
      await playerRef.current.pause();
      setIsPlaying(false);
      setIsPaused(true);
      setCurrentPlaylist(null);
      setCurrentTrackIndex(0);
      setIsExpanded(false);
    } catch (error) {
      console.error('Error stopping playback:', error);
    }
  };

  return (
    <SpotifyPlayerContext.Provider
      value={{
        isPlaying,
        isPaused,
        currentPlaylist,
        currentTrackIndex,
        isExpanded,
        currentTrack,
        position,
        duration,
        playPlaylist,
        playSingleTrack,
        togglePlayPause,
        nextTrack,
        previousTrack,
        toggleExpanded,
        stop,
        seek,
      }}
    >
      {children}
    </SpotifyPlayerContext.Provider>
  );
}

export function useSpotifyPlayer() {
  const context = useContext(SpotifyPlayerContext);
  if (context === undefined) {
    throw new Error('useSpotifyPlayer must be used within a SpotifyPlayerProvider');
  }
  return context;
}
