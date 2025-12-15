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
      {/* Collapsed State - Rounded Rectangle Bar */}
      {!isExpanded && (
        <div className="fixed bottom-4 right-4 md:bottom-4 md:right-4 z-50 w-[280px] h-16 bg-gray-900/95 backdrop-blur-md border border-gray-700 rounded-xl shadow-2xl flex items-center gap-3 px-3">
          {/* Album Art */}
          <div className="w-12 h-12 rounded-md overflow-hidden flex-shrink-0">
            {currentSong.album_art ? (
              <img src={currentSong.album_art} alt={currentSong.title} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                <Music className="w-6 h-6 text-white" />
              </div>
            )}
          </div>

          {/* Track Info */}
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-medium truncate">{currentSong.title}</p>
            <p className="text-gray-400 text-xs truncate">{currentSong.artist}</p>
          </div>

          {/* Playback Controls */}
          <div className="flex items-center gap-1">
            <button
              onClick={previousTrack}
              disabled={!canGoPrevious}
              className="w-7 h-7 rounded-full hover:bg-white/10 flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed transition"
              title="Previous"
            >
              <SkipBack className="w-4 h-4 text-white" />
            </button>

            {/* Play/Pause - Expands player so user can control Spotify */}
            <button
              onClick={toggleExpanded}
              className="w-7 h-7 rounded-full hover:bg-white/10 flex items-center justify-center transition"
              title="Expand to control playback"
            >
              <Play className="w-4 h-4 text-white" />
            </button>

            <button
              onClick={nextTrack}
              disabled={!canGoNext}
              className="w-7 h-7 rounded-full hover:bg-white/10 flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed transition"
              title="Next"
            >
              <SkipForward className="w-4 h-4 text-white" />
            </button>
          </div>

          {/* Expand Button */}
          <button
            onClick={toggleExpanded}
            className="w-7 h-7 rounded-full hover:bg-white/10 flex items-center justify-center transition"
            title="Expand player"
          >
            <ChevronUp className="w-4 h-4 text-white" />
          </button>

          {/* Close Button */}
          <button
            onClick={stop}
            className="w-7 h-7 rounded-full hover:bg-white/10 flex items-center justify-center transition"
            title="Close"
          >
            <X className="w-4 h-4 text-white" />
          </button>
        </div>
      )}

      {/* Expanded State - Full Player */}
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
                  <ChevronDown className="w-4 h-4 text-white" />
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
                key={currentSong.spotify_id}
                src={`https://open.spotify.com/embed/track/${currentSong.spotify_id}?theme=0`}
                width="100%"
                height="152"
                allow="encrypted-media"
                className="w-full"
                title="Spotify Player"
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
      )}
    </>
  );
}
