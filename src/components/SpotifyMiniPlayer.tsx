import { useSpotifyPlayer } from '../contexts/SpotifyPlayerContext';
import { X, ChevronLeft, ChevronRight, Music, Play, Pause } from 'lucide-react';

export default function SpotifyMiniPlayer() {
  const {
    isPlaying,
    isPaused,
    currentPlaylist,
    currentTrack,
    currentTrackIndex,
    isExpanded,
    togglePlayPause,
    nextTrack,
    previousTrack,
    toggleExpanded,
    stop,
  } = useSpotifyPlayer();

  // Don't render if no track is playing
  if (!isPlaying && !isPaused) {
    return null;
  }

  if (!currentPlaylist || !currentTrack) {
    return null;
  }

  const hasMultipleSongs = currentPlaylist.songs.length > 1;
  const canGoPrevious = hasMultipleSongs && currentTrackIndex > 0;
  const canGoNext = hasMultipleSongs && currentTrackIndex < currentPlaylist.songs.length - 1;

  // Use currentTrack from Spotify SDK for real-time track info
  const trackName = currentTrack.name;
  const artistName = currentTrack.artists.map(a => a.name).join(', ');
  const albumArt = currentTrack.album.images[0]?.url;

  return (
    <>
      {/* Minimized state - small floating badge (64px circle) */}
      {!isExpanded && (
        <div
          onClick={toggleExpanded}
          className="fixed bottom-4 right-4 md:bottom-4 md:right-4 z-50 cursor-pointer group"
        >
          <div className="relative">
            <div className="w-16 h-16 rounded-full overflow-hidden bg-gray-800 border-2 border-blue-500 group-hover:border-blue-400 transition shadow-lg">
              {albumArt ? (
                <img src={albumArt} alt={trackName} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-500 to-purple-600">
                  <Music className="w-8 h-8 text-white" />
                </div>
              )}
            </div>
            {/* Pulsing ring animation - only when playing */}
            {!isPaused && (
              <div className="absolute inset-0 rounded-full border-2 border-blue-500 animate-ping opacity-75" />
            )}
            {/* Track counter badge */}
            {hasMultipleSongs && (
              <div className="absolute -top-1 -right-1 bg-blue-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full shadow-lg">
                {currentTrackIndex + 1}/{currentPlaylist.songs.length}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Expanded state - full player card */}
      {isExpanded && (
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
                {albumArt ? (
                  <img src={albumArt} alt={trackName} className="w-12 h-12 rounded object-cover flex-shrink-0" />
                ) : (
                  <div className="w-12 h-12 rounded bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                    <Music className="w-6 h-6 text-white" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium truncate">{trackName}</p>
                  <p className="text-gray-400 text-xs truncate">{artistName}</p>
                  {hasMultipleSongs && (
                    <p className="text-gray-500 text-[10px] mt-0.5">
                      Track {currentTrackIndex + 1} of {currentPlaylist.songs.length}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Playback Controls */}
            <div className="p-3 bg-gray-800/50 flex items-center justify-center space-x-4">
              {/* Previous Button */}
              <button
                onClick={previousTrack}
                disabled={!canGoPrevious}
                className="w-8 h-8 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed rounded-full flex items-center justify-center transition"
                title="Previous"
              >
                <ChevronLeft className="w-5 h-5 text-white" />
              </button>

              {/* Play/Pause Button */}
              <button
                onClick={togglePlayPause}
                className="w-10 h-10 bg-blue-500 hover:bg-blue-600 rounded-full flex items-center justify-center transition shadow-lg"
                title={isPaused ? 'Play' : 'Pause'}
              >
                {isPaused ? (
                  <Play className="w-5 h-5 text-white ml-0.5" />
                ) : (
                  <Pause className="w-5 h-5 text-white" />
                )}
              </button>

              {/* Next Button */}
              <button
                onClick={nextTrack}
                disabled={!canGoNext}
                className="w-8 h-8 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed rounded-full flex items-center justify-center transition"
                title="Next"
              >
                <ChevronRight className="w-5 h-5 text-white" />
              </button>
            </div>

            {/* Track position indicator (optional) */}
            {hasMultipleSongs && (
              <div className="px-3 pb-2">
                <div className="text-gray-400 text-xs font-medium text-center">
                  {currentTrackIndex + 1} / {currentPlaylist.songs.length}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
