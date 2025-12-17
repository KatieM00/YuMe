import { createContext, useContext, useState, ReactNode } from 'react';
import { createPlaylist, addTracksToPlaylist, deletePlaylist } from '../lib/spotifyService';

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
  currentPlaylist: Playlist | null;
  currentTrackIndex: number;
  isExpanded: boolean;
  spotifyPlaylistId: string | null;

  // Methods
  playPlaylist: (playlist: Playlist) => void;
  playSingleTrack: (song: Song, playlistTitle?: string) => void;
  nextTrack: () => void;
  previousTrack: () => void;
  toggleExpanded: () => void;
  stop: () => void;
}

const SpotifyPlayerContext = createContext<SpotifyPlayerContextType | undefined>(undefined);

export function SpotifyPlayerProvider({ children }: { children: ReactNode }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentPlaylist, setCurrentPlaylist] = useState<Playlist | null>(null);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [isExpanded, setIsExpanded] = useState(false);
  const [spotifyPlaylistId, setSpotifyPlaylistId] = useState<string | null>(null);

  const playPlaylist = async (playlist: Playlist) => {
    try {
      // Create a temporary Spotify playlist
      const spotifyPlaylist = await createPlaylist(
        `YuMe: ${playlist.title}`,
        `Temporary playlist for ${playlist.title}`,
        false // private
      );

      // Add all songs to the Spotify playlist
      const trackUris = playlist.songs.map(song => `spotify:track:${song.spotify_id}`);
      await addTracksToPlaylist(spotifyPlaylist.id, trackUris);

      // Store the Spotify playlist ID
      setSpotifyPlaylistId(spotifyPlaylist.id);
      setCurrentPlaylist(playlist);
      setCurrentTrackIndex(0);
      setIsPlaying(true);
      setIsExpanded(true); // Auto-expand when starting playback
    } catch (error) {
      console.error('Failed to create Spotify playlist:', error);
      // Fall back to not playing if playlist creation fails
    }
  };

  const playSingleTrack = (song: Song, playlistTitle?: string) => {
    // Create a single-song playlist
    setCurrentPlaylist({
      id: song.playlist_id,
      title: playlistTitle || 'Now Playing',
      songs: [song],
    });
    setCurrentTrackIndex(0);
    setIsPlaying(true);
    setIsExpanded(true);
  };

  const nextTrack = () => {
    if (!currentPlaylist || currentTrackIndex >= currentPlaylist.songs.length - 1) return;
    setCurrentTrackIndex(currentTrackIndex + 1);
  };

  const previousTrack = () => {
    if (!currentPlaylist || currentTrackIndex === 0) return;
    setCurrentTrackIndex(currentTrackIndex - 1);
  };

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  const stop = async () => {
    // Delete the temporary Spotify playlist if it exists
    if (spotifyPlaylistId) {
      try {
        await deletePlaylist(spotifyPlaylistId);
      } catch (error) {
        console.error('Failed to delete Spotify playlist:', error);
        // Continue anyway
      }
    }

    setIsPlaying(false);
    setCurrentPlaylist(null);
    setCurrentTrackIndex(0);
    setIsExpanded(false);
    setSpotifyPlaylistId(null);
  };

  return (
    <SpotifyPlayerContext.Provider
      value={{
        isPlaying,
        currentPlaylist,
        currentTrackIndex,
        isExpanded,
        spotifyPlaylistId,
        playPlaylist,
        playSingleTrack,
        nextTrack,
        previousTrack,
        toggleExpanded,
        stop,
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
