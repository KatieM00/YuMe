import { useState, useEffect } from 'react';
import { Play, Music, MessageSquare, X, Plus, Trash2, ExternalLink, Loader2, Edit2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface SongComment {
  id: string;
  song_id: string;
  comment: string;
  created_at: string;
}

interface Song {
  id: string;
  playlist_id: string;
  title: string;
  artist: string;
  spotify_id: string;
  duration: string;
  album_art?: string;
  position: number;
  created_at: string;
  song_comments: SongComment[];
}

interface Playlist {
  id: string;
  title: string;
  description: string;
  cover: string;
  created_at: string;
  updated_at: string;
  songs: Song[];
}

const coverGradients = [
  'bg-gradient-to-br from-yellow-400 to-orange-500',
  'bg-gradient-to-br from-blue-400 to-cyan-500',
  'bg-gradient-to-br from-red-500 to-pink-600',
  'bg-gradient-to-br from-green-500 to-teal-600',
  'bg-gradient-to-br from-purple-500 to-pink-500',
];

export default function Mixtape() {
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [selectedPlaylist, setSelectedPlaylist] = useState<Playlist | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Create/Edit Playlist Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingPlaylist, setEditingPlaylist] = useState<Playlist | null>(null);
  const [playlistTitle, setPlaylistTitle] = useState('');
  const [playlistDescription, setPlaylistDescription] = useState('');
  const [selectedCover, setSelectedCover] = useState(coverGradients[0]);
  const [creatingPlaylist, setCreatingPlaylist] = useState(false);

  // Add Song
  const [showAddSong, setShowAddSong] = useState(false);
  const [spotifyInput, setSpotifyInput] = useState('');
  const [addingSong, setAddingSong] = useState(false);
  const [addSongError, setAddSongError] = useState<string | null>(null);

  // Comments
  const [newComment, setNewComment] = useState<{ [key: string]: string }>({});
  const [addingComment, setAddingComment] = useState<string | null>(null);

  useEffect(() => {
    fetchPlaylists();
  }, []);

  const fetchPlaylists = async () => {
    try {
      setLoading(true);
      setError(null);
      const { data, error: fetchError } = await supabase
        .from('playlists')
        .select(`
          *,
          songs (
            *,
            song_comments (*)
          )
        `)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      // Sort songs by position
      const playlistsWithSortedSongs = data?.map(playlist => ({
        ...playlist,
        songs: playlist.songs.sort((a: Song, b: Song) => a.position - b.position)
      })) || [];

      setPlaylists(playlistsWithSortedSongs);
    } catch (err) {
      console.error('Error fetching playlists:', err);
      setError('Couldn\'t load playlists. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = () => {
    setEditingPlaylist(null);
    setPlaylistTitle('');
    setPlaylistDescription('');
    setSelectedCover(coverGradients[0]);
    setShowCreateModal(true);
  };

  const openEditModal = (playlist: Playlist) => {
    setEditingPlaylist(playlist);
    setPlaylistTitle(playlist.title);
    setPlaylistDescription(playlist.description);
    setSelectedCover(playlist.cover);
    setShowCreateModal(true);
  };

  const handleCreateOrUpdatePlaylist = async () => {
    if (!playlistTitle.trim()) {
      setError('Please enter a playlist name');
      return;
    }

    try {
      setCreatingPlaylist(true);
      setError(null);

      if (editingPlaylist) {
        // Update existing playlist
        const { error: updateError } = await supabase
          .from('playlists')
          .update({
            title: playlistTitle,
            description: playlistDescription,
            cover: selectedCover,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingPlaylist.id);

        if (updateError) throw updateError;
      } else {
        // Create new playlist
        const { error: insertError } = await supabase
          .from('playlists')
          .insert({
            title: playlistTitle,
            description: playlistDescription,
            cover: selectedCover,
          });

        if (insertError) throw insertError;
      }

      await fetchPlaylists();
      setShowCreateModal(false);
      setPlaylistTitle('');
      setPlaylistDescription('');
    } catch (err) {
      console.error('Error creating/updating playlist:', err);
      setError('Couldn\'t save playlist. Please try again.');
    } finally {
      setCreatingPlaylist(false);
    }
  };

  const handleDeletePlaylist = async (playlistId: string, e: React.MouseEvent) => {
    e.stopPropagation();

    if (!confirm('Are you sure you want to delete this playlist? This will also delete all songs in it.')) {
      return;
    }

    try {
      const { error: deleteError } = await supabase
        .from('playlists')
        .delete()
        .eq('id', playlistId);

      if (deleteError) throw deleteError;

      await fetchPlaylists();
      if (selectedPlaylist?.id === playlistId) {
        setSelectedPlaylist(null);
      }
    } catch (err) {
      console.error('Error deleting playlist:', err);
      setError('Couldn\'t delete playlist. Please try again.');
    }
  };

  const extractSpotifyTrackId = (input: string): string | null => {
    const trimmed = input.trim();

    // Check if it's a URL
    if (trimmed.includes('spotify.com')) {
      const match = trimmed.match(/track\/([a-zA-Z0-9]+)/);
      return match ? match[1] : null;
    }

    // Check if it's already a track ID (alphanumeric, typically 22 chars)
    if (/^[a-zA-Z0-9]{22}$/.test(trimmed)) {
      return trimmed;
    }

    return null;
  };

  const handleAddSong = async () => {
    if (!selectedPlaylist) return;

    const trackId = extractSpotifyTrackId(spotifyInput);

    if (!trackId) {
      setAddSongError('Please enter a valid Spotify URL or Track ID');
      return;
    }

    try {
      setAddingSong(true);
      setAddSongError(null);

      // Fetch song info from Spotify oEmbed API
      const response = await fetch(
        `https://open.spotify.com/oembed?url=https://open.spotify.com/track/${trackId}`
      );

      if (!response.ok) {
        throw new Error('Invalid Spotify track');
      }

      const data = await response.json();

      // Parse title and artist from data.title (usually "Song Name by Artist Name")
      const titleParts = data.title?.split(' by ') || [];
      const title = titleParts[0] || 'Unknown';
      const artist = titleParts.slice(1).join(' by ') || 'Unknown';

      // Get max position for ordering
      const { data: existingSongs } = await supabase
        .from('songs')
        .select('position')
        .eq('playlist_id', selectedPlaylist.id)
        .order('position', { ascending: false })
        .limit(1);

      const nextPosition = (existingSongs && existingSongs.length > 0 ? existingSongs[0].position : -1) + 1;

      // Insert song
      const { error: insertError } = await supabase
        .from('songs')
        .insert({
          playlist_id: selectedPlaylist.id,
          title,
          artist,
          spotify_id: trackId,
          duration: '0:00',
          position: nextPosition,
        });

      if (insertError) throw insertError;

      // Fetch updated data
      const { data: updatedData } = await supabase
        .from('playlists')
        .select(`
          *,
          songs (
            *,
            song_comments (*)
          )
        `)
        .eq('id', selectedPlaylist.id)
        .single();

      if (updatedData) {
        // Sort songs by position
        const playlistWithSortedSongs = {
          ...updatedData,
          songs: updatedData.songs.sort((a: Song, b: Song) => a.position - b.position)
        };
        setSelectedPlaylist(playlistWithSortedSongs);
      }

      await fetchPlaylists();

      setSpotifyInput('');
      setShowAddSong(false);
    } catch (err) {
      console.error('Error adding song:', err);
      setAddSongError('Couldn\'t add song. Please check the URL and try again.');
    } finally {
      setAddingSong(false);
    }
  };

  const handleDeleteSong = async (songId: string, e: React.MouseEvent) => {
    e.stopPropagation();

    if (!confirm('Are you sure you want to remove this song?')) {
      return;
    }

    try {
      const { error: deleteError } = await supabase
        .from('songs')
        .delete()
        .eq('id', songId);

      if (deleteError) throw deleteError;

      // Fetch updated data
      if (selectedPlaylist) {
        const { data: updatedData } = await supabase
          .from('playlists')
          .select(`
            *,
            songs (
              *,
              song_comments (*)
            )
          `)
          .eq('id', selectedPlaylist.id)
          .single();

        if (updatedData) {
          // Sort songs by position
          const playlistWithSortedSongs = {
            ...updatedData,
            songs: updatedData.songs.sort((a: Song, b: Song) => a.position - b.position)
          };
          setSelectedPlaylist(playlistWithSortedSongs);
        }
      }

      await fetchPlaylists();
    } catch (err) {
      console.error('Error deleting song:', err);
      setError('Couldn\'t delete song. Please try again.');
    }
  };

  const handleAddComment = async (songId: string) => {
    const commentText = newComment[songId]?.trim();

    if (!commentText) return;

    try {
      setAddingComment(songId);

      const { error: insertError } = await supabase
        .from('song_comments')
        .insert({
          song_id: songId,
          comment: commentText
        });

      if (insertError) throw insertError;

      // Fetch updated data
      if (selectedPlaylist) {
        const { data: updatedData } = await supabase
          .from('playlists')
          .select(`
            *,
            songs (
              *,
              song_comments (*)
            )
          `)
          .eq('id', selectedPlaylist.id)
          .single();

        if (updatedData) {
          // Sort songs by position
          const playlistWithSortedSongs = {
            ...updatedData,
            songs: updatedData.songs.sort((a: Song, b: Song) => a.position - b.position)
          };
          setSelectedPlaylist(playlistWithSortedSongs);
        }
      }

      await fetchPlaylists();

      setNewComment({ ...newComment, [songId]: '' });
    } catch (err) {
      console.error('Error adding comment:', err);
      setError('Couldn\'t add comment. Please try again.');
    } finally {
      setAddingComment(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen p-4 md:p-8 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-blue-500 animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Loading playlists...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-white">Mixtape</h1>
          <button
            onClick={openCreateModal}
            className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-full font-medium hover:from-blue-600 hover:to-cyan-600 transition hover:scale-105"
          >
            <Plus className="w-5 h-5" />
            <span>Create Playlist</span>
          </button>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/50 rounded-lg">
            <p className="text-red-400">{error}</p>
          </div>
        )}

        {playlists.length === 0 ? (
          <div className="text-center py-20">
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-12 border border-gray-700 max-w-md mx-auto">
              <Music className="w-20 h-20 text-gray-600 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-white mb-2">No playlists yet</h2>
              <p className="text-gray-400 mb-6">Create your first playlist to get started</p>
              <button
                onClick={openCreateModal}
                className="px-6 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-full font-medium hover:from-blue-600 hover:to-cyan-600 transition inline-flex items-center space-x-2"
              >
                <Plus className="w-5 h-5" />
                <span>Create Playlist</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {playlists.map((playlist) => (
              <div
                key={playlist.id}
                onClick={() => setSelectedPlaylist(playlist)}
                className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-4 border border-gray-700 hover:bg-gray-800/70 hover:scale-105 transition-all cursor-pointer group relative"
              >
                <button
                  onClick={(e) => handleDeletePlaylist(playlist.id, e)}
                  className="absolute top-2 right-2 w-8 h-8 bg-red-500/80 hover:bg-red-600 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition z-10"
                  title="Delete playlist"
                >
                  <Trash2 className="w-4 h-4 text-white" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    openEditModal(playlist);
                  }}
                  className="absolute top-2 right-12 w-8 h-8 bg-blue-500/80 hover:bg-blue-600 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition z-10"
                  title="Edit playlist"
                >
                  <Edit2 className="w-4 h-4 text-white" />
                </button>
                <div className={`w-full aspect-square ${playlist.cover} rounded-xl mb-4 flex items-center justify-center relative overflow-hidden`}>
                  <Music className="w-16 h-16 text-white/50" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                    <Play className="w-12 h-12 text-white" />
                  </div>
                </div>
                <h3 className="text-lg font-bold text-white mb-1">{playlist.title}</h3>
                <p className="text-sm text-gray-400 line-clamp-2">{playlist.description}</p>
                <p className="text-xs text-gray-500 mt-2">{playlist.songs?.length || 0} songs</p>
              </div>
            ))}
          </div>
        )}

        {/* Create/Edit Playlist Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-gray-900 rounded-2xl max-w-md w-full border border-gray-700">
              <div className="p-6">
                <h2 className="text-2xl font-bold text-white mb-6">
                  {editingPlaylist ? 'Edit Playlist' : 'Create Playlist'}
                </h2>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Playlist Name *
                    </label>
                    <input
                      type="text"
                      value={playlistTitle}
                      onChange={(e) => setPlaylistTitle(e.target.value)}
                      placeholder="e.g., Summer Vibes"
                      className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Description
                    </label>
                    <textarea
                      value={playlistDescription}
                      onChange={(e) => setPlaylistDescription(e.target.value)}
                      placeholder="What's this playlist about?"
                      rows={3}
                      className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-3">
                      Cover Color
                    </label>
                    <div className="grid grid-cols-5 gap-3">
                      {coverGradients.map((gradient) => (
                        <button
                          key={gradient}
                          onClick={() => setSelectedCover(gradient)}
                          className={`w-full aspect-square ${gradient} rounded-lg transition ${
                            selectedCover === gradient
                              ? 'ring-4 ring-white scale-110'
                              : 'hover:scale-105'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex space-x-3 mt-6">
                  <button
                    onClick={() => setShowCreateModal(false)}
                    className="flex-1 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition"
                    disabled={creatingPlaylist}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreateOrUpdatePlaylist}
                    disabled={creatingPlaylist || !playlistTitle.trim()}
                    className="flex-1 px-4 py-2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-lg font-medium hover:from-blue-600 hover:to-cyan-600 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                  >
                    {creatingPlaylist ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        {editingPlaylist ? 'Updating...' : 'Creating...'}
                      </>
                    ) : (
                      editingPlaylist ? 'Update' : 'Create'
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Playlist Detail Modal */}
        {selectedPlaylist && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-gray-900 rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden border border-gray-700">
              <div className="relative">
                <div className={`${selectedPlaylist.cover} p-8 flex items-center space-x-6`}>
                  <div className="w-32 h-32 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center flex-shrink-0">
                    <Music className="w-16 h-16 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white/80 text-sm font-medium mb-2">PLAYLIST</p>
                    <h2 className="text-3xl font-bold text-white mb-2">{selectedPlaylist.title}</h2>
                    <p className="text-white/90">{selectedPlaylist.description}</p>
                    <p className="text-white/70 text-sm mt-2">{selectedPlaylist.songs?.length || 0} songs</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setSelectedPlaylist(null);
                    setShowAddSong(false);
                  }}
                  className="absolute top-4 right-4 w-10 h-10 bg-black/50 hover:bg-black/70 rounded-full flex items-center justify-center transition"
                  title="Close"
                >
                  <X className="w-5 h-5 text-white" />
                </button>
                <button
                  onClick={() => setShowAddSong(true)}
                  className="absolute bottom-4 right-4 w-12 h-12 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-full flex items-center justify-center transition hover:scale-110 shadow-lg"
                  title="Add song"
                >
                  <Plus className="w-6 h-6 text-white" />
                </button>
              </div>

              <div className="p-6 overflow-y-auto max-h-[calc(90vh-250px)]">
                {selectedPlaylist.songs?.length === 0 && !showAddSong ? (
                  <div className="text-center py-12">
                    <Music className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                    <p className="text-gray-400 mb-4">No songs yet. Add your first song!</p>
                    <button
                      onClick={() => setShowAddSong(true)}
                      className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition inline-flex items-center space-x-2"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Add Song</span>
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {selectedPlaylist.songs?.map((song, index) => (
                      <div key={song.id} className="bg-gray-800/30 rounded-lg p-4 border border-gray-700/50">
                        <div className="flex items-start space-x-4 mb-3">
                          <span className="text-gray-400 text-sm w-6 mt-2">{index + 1}</span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex-1 min-w-0">
                                <p className="text-white font-medium truncate">{song.title}</p>
                                <p className="text-gray-400 text-sm truncate">{song.artist}</p>
                              </div>
                              <button
                                onClick={(e) => handleDeleteSong(song.id, e)}
                                className="ml-2 w-8 h-8 bg-red-500/20 hover:bg-red-500/40 rounded-full flex items-center justify-center transition flex-shrink-0"
                                title="Remove song"
                              >
                                <Trash2 className="w-4 h-4 text-red-400" />
                              </button>
                            </div>

                            {/* Spotify Embed */}
                            <div className="mb-3">
                              <iframe
                                src={`https://open.spotify.com/embed/track/${song.spotify_id}?theme=0`}
                                width="100%"
                                height="80"
                                frameBorder="0"
                                allow="encrypted-media"
                                className="rounded-lg"
                              />
                            </div>

                            {/* External Links */}
                            <div className="flex items-center space-x-2 mb-3">
                              <a
                                href={`https://open.spotify.com/track/${song.spotify_id}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center space-x-1 px-3 py-1.5 bg-green-500/20 hover:bg-green-500/30 text-green-400 text-xs rounded-full transition"
                              >
                                <ExternalLink className="w-3 h-3" />
                                <span>Open in Spotify</span>
                              </a>
                              <a
                                href={`https://music.youtube.com/search?q=${encodeURIComponent(song.title + ' ' + song.artist)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center space-x-1 px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-400 text-xs rounded-full transition"
                              >
                                <ExternalLink className="w-3 h-3" />
                                <span>YouTube Music</span>
                              </a>
                            </div>

                            {/* Comments */}
                            <div className="space-y-2">
                              {song.song_comments?.map((comment) => (
                                <div key={comment.id} className="bg-gray-900/50 rounded-lg p-3 border border-gray-700">
                                  <div className="flex items-start space-x-2">
                                    <MessageSquare className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                                    <p className="text-gray-300 text-sm flex-1">{comment.comment}</p>
                                  </div>
                                </div>
                              ))}

                              <div className="flex space-x-2">
                                <input
                                  type="text"
                                  placeholder="Add a comment..."
                                  value={newComment[song.id] || ''}
                                  onChange={(e) => setNewComment({ ...newComment, [song.id]: e.target.value })}
                                  className="flex-1 px-3 py-2 bg-gray-900/50 border border-gray-700 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      handleAddComment(song.id);
                                    }
                                  }}
                                  disabled={addingComment === song.id}
                                />
                                <button
                                  onClick={() => handleAddComment(song.id)}
                                  disabled={addingComment === song.id || !newComment[song.id]?.trim()}
                                  className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                                >
                                  {addingComment === song.id ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                  ) : (
                                    'Add'
                                  )}
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}

                    {/* Add Song Form */}
                    {showAddSong ? (
                      <div className="bg-gray-800/50 rounded-lg p-4 border border-blue-500/50">
                        <h3 className="text-white font-medium mb-3">Add a Song</h3>
                        {addSongError && (
                          <div className="mb-3 p-2 bg-red-500/10 border border-red-500/50 rounded text-red-400 text-sm">
                            {addSongError}
                          </div>
                        )}
                        <div className="space-y-3">
                          <div>
                            <input
                              type="text"
                              value={spotifyInput}
                              onChange={(e) => {
                                setSpotifyInput(e.target.value);
                                setAddSongError(null);
                              }}
                              placeholder="Paste Spotify Song URL or Track ID"
                              className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                              disabled={addingSong}
                            />
                            <p className="text-xs text-gray-500 mt-1">
                              e.g., https://open.spotify.com/track/...
                            </p>
                          </div>
                          <div className="flex space-x-2">
                            <button
                              onClick={() => {
                                setShowAddSong(false);
                                setSpotifyInput('');
                                setAddSongError(null);
                              }}
                              className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition"
                              disabled={addingSong}
                            >
                              Cancel
                            </button>
                            <button
                              onClick={handleAddSong}
                              disabled={addingSong || !spotifyInput.trim()}
                              className="flex-1 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                            >
                              {addingSong ? (
                                <>
                                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                  Adding...
                                </>
                              ) : (
                                'Add Song'
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => setShowAddSong(true)}
                        className="w-full px-4 py-3 bg-gray-800/50 hover:bg-gray-800 border border-gray-700 border-dashed rounded-lg text-gray-400 hover:text-white transition flex items-center justify-center space-x-2"
                      >
                        <Plus className="w-5 h-5" />
                        <span>Add Song</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
