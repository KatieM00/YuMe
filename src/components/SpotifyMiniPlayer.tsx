import { useSpotifyPlayer } from '../contexts/SpotifyPlayerContext';
import { X, ChevronLeft, ChevronRight, ChevronUp, ChevronDown, Music, SkipBack, SkipForward, Play } from 'lucide-react';

export default function SpotifyMiniPlayer() {
  const {
    isPlaying,
    currentPlaylist,
    currentTrackIndex,
    isExpanded,
    nextTrack,
    previousTrack,
    toggleExpanded,
    stop,
  } = useSpotifyPlayer();

  if (!isPlaying || !currentPlaylist) {
    return null; // Hidden state
  }

  const currentSong = currentPlaylist.songs[currentTrackIndex];
  const hasMultipleSongs = currentPlaylist.songs.length > 1;
  const canGoPrevious = hasMultipleSongs && currentTrackIndex > 0;
  const canGoNext = hasMultipleSongs && currentTrackIndex < currentPlaylist.songs.length - 1;

  // Render UI based on state
  return (
    <>
      {/* Spotify Iframe - Always in DOM, positioned based on expanded state */}
      <div
        style={{
          position: 'fixed',
          bottom: isExpanded ? '1rem' : '-9999px',
          right: isExpanded ? '1rem' : '-9999px',
          width: '320px',
          maxWidth: 'calc(100vw - 2rem)',
          zIndex: 50,
        }}
      >
        <iframe
          key={currentSong.spotify_id}
          src={`https://open.spotify.com/embed/track/${currentSong.spotify_id}?theme=0`}
          width="100%"
          height="152"
          allow="encrypted-media"
          className="w-full rounded-xl border-0 shadow-2xl"
          title="Spotify Player"
        />
      </div>

      {/* Optional: Minimize button overlay */}
      {isExpanded && (
        <button
          onClick={toggleExpanded}
          className="fixed bottom-[13rem] right-4 z-[51] w-8 h-8 bg-black/70 hover:bg-black/90 rounded-full flex items-center justify-center transition"
          title="Minimize player"
        >
          <ChevronDown className="w-5 h-5 text-white" />
        </button>
      )}
    </>
  );
}
