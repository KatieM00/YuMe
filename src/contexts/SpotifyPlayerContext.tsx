import { createContext, useContext, useState, ReactNode } from 'react';

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

  const playPlaylist = (playlist: Playlist) => {
    setCurrentPlaylist(playlist);
    setCurrentTrackIndex(0);
    setIsPlaying(true);
    setIsExpanded(true); // Auto-expand when starting playback
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

  const stop = () => {
    setIsPlaying(false);
    setCurrentPlaylist(null);
    setCurrentTrackIndex(0);
    setIsExpanded(false);
  };

  return (
    <SpotifyPlayerContext.Provider
      value={{
        isPlaying,
        currentPlaylist,
        currentTrackIndex,
        isExpanded,
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
