import { useSpotifyPlayer } from '../contexts/SpotifyPlayerContext';
import { X, ChevronLeft, ChevronRight, Music } from 'lucide-react';

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

  if (!isExpanded) {
    // Minimized state - small floating badge
    return (
      <div
        onClick={toggleExpanded}
        className="fixed bottom-4 right-4 md:bottom-4 md:right-4 z-50 cursor-pointer group"
        style={{ bottom: '1rem' }} // Adjust for mobile navbar if needed
      >
        <div className="relative">
          {/* Album art circle */}
          <div className="w-16 h-16 rounded-full overflow-hidden bg-gray-800 border-2 border-blue-500 group-hover:border-blue-400 transition shadow-lg">
            {currentSong.album_art ? (
              <img
                src={currentSong.album_art}
                alt={currentSong.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-500 to-purple-600">
                <Music className="w-8 h-8 text-white" />
              </div>
            )}
          </div>

          {/* Pulsing ring animation */}
          <div className="absolute inset-0 rounded-full border-2 border-blue-500 animate-ping opacity-75" />

          {/* Track counter badge */}
          {hasMultipleSongs && (
            <div className="absolute -top-1 -right-1 bg-blue-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full shadow-lg">
              {currentTrackIndex + 1}/{currentPlaylist.songs.length}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Expanded state - full player
  return (
    <div className="fixed bottom-4 right-4 md:bottom-4 md:right-4 z-50 w-80 max-w-[calc(100vw-2rem)]">
      <div className="bg-gray-900 rounded-xl border border-gray-700 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-3 flex items-center justify-between">
          <div className="flex items-center space-x-2 flex-1 min-w-0">
            <Music className="w-4 h-4 text-white flex-shrink-0" />
            <p className="text-white text-sm font-medium truncate">{currentPlaylist.title}</p>
          </div>
          <div className="flex items-center space-x-1">
            <button
              onClick={toggleExpanded}
              className="w-6 h-6 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center transition"
              title="Minimize"
            >
              <ChevronRight className="w-4 h-4 text-white" />
            </button>
            <button
              onClick={stop}
              className="w-6 h-6 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center transition"
              title="Close"
            >
              <X className="w-4 h-4 text-white" />
            </button>
          </div>
        </div>

        {/* Track info */}
        <div className="p-3 border-b border-gray-700">
          <div className="flex items-center space-x-3">
            {currentSong.album_art ? (
              <img
                src={currentSong.album_art}
                alt={currentSong.title}
                className="w-12 h-12 rounded object-cover flex-shrink-0"
              />
            ) : (
              <div className="w-12 h-12 rounded bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                <Music className="w-6 h-6 text-white" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-medium truncate">{currentSong.title}</p>
              <p className="text-gray-400 text-xs truncate">{currentSong.artist}</p>
              {hasMultipleSongs && (
                <p className="text-gray-500 text-[10px] mt-0.5">
                  Track {currentTrackIndex + 1} of {currentPlaylist.songs.length}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Spotify embed */}
        <div className="bg-black">
          <iframe
            key={currentSong.spotify_id} // Force re-render when track changes
            src={`https://open.spotify.com/embed/track/${currentSong.spotify_id}?theme=0`}
            width="100%"
            height="152"
            frameBorder="0"
            allow="encrypted-media"
            className="w-full"
          />
        </div>

        {/* Controls */}
        {hasMultipleSongs && (
          <div className="p-3 bg-gray-800/50 flex items-center justify-center space-x-4">
            <button
              onClick={previousTrack}
              disabled={!canGoPrevious}
              className="w-8 h-8 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed rounded-full flex items-center justify-center transition"
              title="Previous"
            >
              <ChevronLeft className="w-5 h-5 text-white" />
            </button>
            <div className="text-gray-400 text-xs font-medium">
              {currentTrackIndex + 1} / {currentPlaylist.songs.length}
            </div>
            <button
              onClick={nextTrack}
              disabled={!canGoNext}
              className="w-8 h-8 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed rounded-full flex items-center justify-center transition"
              title="Next"
            >
              <ChevronRight className="w-5 h-5 text-white" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
