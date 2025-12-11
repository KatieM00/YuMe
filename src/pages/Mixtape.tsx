import { useState, useEffect, useRef } from 'react';
import { Play, Music, MessageSquare, X, Plus, Trash2, ExternalLink, Loader2, Edit2, PlayCircle, StopCircle, Search, TrendingUp, Clock, List } from 'lucide-react';
import { supabase } from '../lib/supabase';
import UserBadge from '../components/UserBadge';
import {
  checkSpotifyConnection,
  searchTracks,
  getTopTracks,
  getRecentlyPlayed,
  getUserPlaylists,
  getPlaylistTracks,
  type SpotifyTrack,
  type SpotifyPlaylist,
  type SpotifyConnectionStatus,
} from '../lib/spotifyService';

interface SongComment {
  id: string;
  song_id: string;
  comment: string;
  created_at: string;
}

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
  song_comments: SongComment[];
}

interface Playlist {
  id: string;
  user_id: string;
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
  const [songsToAdd, setSongsToAdd] = useState<Array<{title: string; artist: string; spotify_id: string; album_art: string | null}>>([]);

  // Add Song
  const [showAddSong, setShowAddSong] = useState(false);
  const [spotifyInput, setSpotifyInput] = useState('');
  const [addingSong, setAddingSong] = useState(false);
  const [addSongError, setAddSongError] = useState<string | null>(null);

  // Comments
  const [newComment, setNewComment] = useState<{ [key: string]: string }>({});
  const [addingComment, setAddingComment] = useState<string | null>(null);

  // Ref for add song form
  const addSongFormRef = useRef<HTMLDivElement>(null);
  const spotifyInputRef = useRef<HTMLInputElement>(null);

  // Play all functionality
  const [isPlayingAll, setIsPlayingAll] = useState(false);
  const [showEmbedPlayer, setShowEmbedPlayer] = useState(false);

  // Spotify integration
  const [spotifyConnected, setSpotifyConnected] = useState<SpotifyConnectionStatus>({ connected: false });
  const [showSpotifySearch, setShowSpotifySearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SpotifyTrack[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showBrowse, setShowBrowse] = useState(false);
  const [browseTab, setBrowseTab] = useState<'top' | 'recent' | 'playlists'>('top');
  const [topTracks, setTopTracks] = useState<SpotifyTrack[]>([]);
  const [recentTracks, setRecentTracks] = useState<SpotifyTrack[]>([]);
  const [spotifyPlaylists, setSpotifyPlaylists] = useState<SpotifyPlaylist[]>([]);
  const [loadingBrowse, setLoadingBrowse] = useState(false);
  const [importingPlaylist, setImportingPlaylist] = useState<string | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [targetPlaylistForImport, setTargetPlaylistForImport] = useState<Playlist | 'new' | null>(null);

  useEffect(() => {
    fetchPlaylists();
    checkSpotifyStatus();
  }, []);

  const scrollToAddSongForm = () => {
    setShowAddSong(true);
    setTimeout(() => {
      addSongFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      spotifyInputRef.current?.focus();
    }, 100);
  };

  const handlePlayAll = () => {
    if (!selectedPlaylist?.songs || selectedPlaylist.songs.length === 0) return;

    // Toggle the embedded player view
    setShowEmbedPlayer(!showEmbedPlayer);
    setIsPlayingAll(!isPlayingAll);
  };

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

  const checkSpotifyStatus = async () => {
    try {
      const status = await checkSpotifyConnection();
      setSpotifyConnected(status);
    } catch (err) {
      console.error('Error checking Spotify connection:', err);
    }
  };

  const handleSpotifySearch = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      setIsSearching(true);
      const results = await searchTracks(query, 20);
      setSearchResults(results);
    } catch (err) {
      console.error('Error searching Spotify:', err);
      setError('Failed to search Spotify. Please try again.');
    } finally {
      setIsSearching(false);
    }
  };

  // Debounced search effect for inline search
  useEffect(() => {
    if (!showSpotifySearch || !spotifyConnected.connected) return;

    const timer = setTimeout(() => {
      if (searchQuery) {
        handleSpotifySearch(searchQuery);
      } else {
        setSearchResults([]);
      }
    }, 300); // 300ms debounce

    return () => clearTimeout(timer);
  }, [searchQuery, showSpotifySearch, spotifyConnected.connected]);

  const handleAddSpotifyTrack = async (track: SpotifyTrack) => {
    if (!selectedPlaylist) return;

    try {
      setAddingSong(true);
      setAddSongError(null);

      // Get max position for ordering
      const { data: existingSongs } = await supabase
        .from('songs')
        .select('position')
        .eq('playlist_id', selectedPlaylist.id)
        .order('position', { ascending: false })
        .limit(1);

      const nextPosition = (existingSongs && existingSongs.length > 0 ? existingSongs[0].position : -1) + 1;

      // Get current user ID
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Insert song with Spotify data
      const { error: insertError } = await supabase
        .from('songs')
        .insert({
          user_id: user.id,
          playlist_id: selectedPlaylist.id,
          title: track.name,
          artist: track.artists.map(a => a.name).join(', '),
          spotify_id: track.id,
          duration: `${Math.floor(track.duration_ms / 60000)}:${String(Math.floor((track.duration_ms % 60000) / 1000)).padStart(2, '0')}`,
          album_art: track.album.images[0]?.url || null,
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
        const playlistWithSortedSongs = {
          ...updatedData,
          songs: updatedData.songs.sort((a: Song, b: Song) => a.position - b.position)
        };
        setSelectedPlaylist(playlistWithSortedSongs);
      }

      await fetchPlaylists();
      setShowSpotifySearch(false);
      setSearchQuery('');
      setSearchResults([]);
    } catch (err) {
      console.error('Error adding song:', err);
      setAddSongError('Couldn\'t add song. Please try again.');
    } finally {
      setAddingSong(false);
    }
  };

  const loadBrowseData = async (tab: 'top' | 'recent' | 'playlists') => {
    try {
      setLoadingBrowse(true);

      if (tab === 'top' && topTracks.length === 0) {
        const tracks = await getTopTracks(20, 'medium_term');
        setTopTracks(tracks);
      } else if (tab === 'recent' && recentTracks.length === 0) {
        const tracks = await getRecentlyPlayed(20);
        setRecentTracks(tracks);
      } else if (tab === 'playlists' && spotifyPlaylists.length === 0) {
        const playlists = await getUserPlaylists(50);
        setSpotifyPlaylists(playlists);
      }
    } catch (err) {
      console.error('Error loading browse data:', err);
      setError('Failed to load Spotify data. Please try again.');
    } finally {
      setLoadingBrowse(false);
    }
  };

  const handleImportSpotifyPlaylist = async (spotifyPlaylist: SpotifyPlaylist, targetPlaylist: Playlist | 'new') => {
    try {
      setImportingPlaylist(spotifyPlaylist.id);
      setError(null);

      // Fetch tracks from Spotify playlist
      const tracks = await getPlaylistTracks(spotifyPlaylist.id, 100);

      if (tracks.length === 0) {
        setError('This Spotify playlist is empty');
        return;
      }

      // Get current user ID
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      let playlistId: string;
      let playlistTitle: string;

      // Create new playlist if needed
      if (targetPlaylist === 'new') {
        const { data: newPlaylist, error: createError } = await supabase
          .from('playlists')
          .insert({
            user_id: user.id,
            title: spotifyPlaylist.name,
            description: spotifyPlaylist.description || `Imported from Spotify`,
            cover: spotifyPlaylist.images[0]?.url || coverGradients[0],
          })
          .select()
          .single();

        if (createError) throw createError;
        playlistId = newPlaylist.id;
        playlistTitle = newPlaylist.title;
      } else {
        playlistId = targetPlaylist.id;
        playlistTitle = targetPlaylist.title;
      }

      // Insert all tracks
      const songsToInsert = tracks.map((track, index) => ({
        user_id: user.id,
        playlist_id: playlistId,
        title: track.name,
        artist: track.artists.map(a => a.name).join(', '),
        spotify_id: track.id,
        duration: `${Math.floor(track.duration_ms / 60000)}:${String(Math.floor((track.duration_ms % 60000) / 1000)).padStart(2, '0')}`,
        album_art: track.album.images[0]?.url || null,
        position: index,
      }));

      const { error: insertError } = await supabase
        .from('songs')
        .insert(songsToInsert);

      if (insertError) throw insertError;

      await fetchPlaylists();
      setShowImportModal(false);
      setTargetPlaylistForImport(null);

      // Show success message
      const message = targetPlaylist === 'new'
        ? `Successfully created "${playlistTitle}" with ${tracks.length} songs from Spotify!`
        : `Successfully imported ${tracks.length} songs from "${spotifyPlaylist.name}" into "${playlistTitle}"`;
      alert(message);
    } catch (err) {
      console.error('Error importing playlist:', err);
      setError('Failed to import playlist. Please try again.');
    } finally {
      setImportingPlaylist(null);
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
        // Get current user ID
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          throw new Error('User not authenticated');
        }

        const { data: newPlaylist, error: insertError } = await supabase
          .from('playlists')
          .insert({
            user_id: user.id,
            title: playlistTitle,
            description: playlistDescription,
            cover: selectedCover,
          })
          .select()
          .single();

        if (insertError) throw insertError;

        // Add songs to the newly created playlist
        if (newPlaylist && songsToAdd.length > 0) {
          const songsWithPlaylistId = songsToAdd.map((song, index) => ({
            user_id: user.id,
            playlist_id: newPlaylist.id,
            title: song.title,
            artist: song.artist,
            spotify_id: song.spotify_id,
            album_art: song.album_art,
            duration: '0:00',
            position: index,
          }));

          const { error: songsError } = await supabase
            .from('songs')
            .insert(songsWithPlaylistId);

          if (songsError) throw songsError;
        }
      }

      await fetchPlaylists();
      setShowCreateModal(false);
      setPlaylistTitle('');
      setPlaylistDescription('');
      setSongsToAdd([]);
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

  const handleAddSongToList = async () => {
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

      // Extract album art from thumbnail_url
      const albumArt = data.thumbnail_url || null;

      // Add to temporary list
      setSongsToAdd([...songsToAdd, {
        title,
        artist,
        spotify_id: trackId,
        album_art: albumArt,
      }]);

      // Clear input
      setSpotifyInput('');
    } catch (err) {
      console.error('Error adding song:', err);
      setAddSongError('Failed to fetch song info. Please check the Spotify link.');
    } finally {
      setAddingSong(false);
    }
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

      // Extract album art from thumbnail_url
      const albumArt = data.thumbnail_url || null;

      // Get max position for ordering
      const { data: existingSongs } = await supabase
        .from('songs')
        .select('position')
        .eq('playlist_id', selectedPlaylist.id)
        .order('position', { ascending: false })
        .limit(1);

      const nextPosition = (existingSongs && existingSongs.length > 0 ? existingSongs[0].position : -1) + 1;

      // Get current user ID
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Insert song
      const { error: insertError } = await supabase
        .from('songs')
        .insert({
          user_id: user.id,
          playlist_id: selectedPlaylist.id,
          title,
          artist,
          spotify_id: trackId,
          duration: '0:00',
          album_art: albumArt,
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

      // Get current user ID
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      const { error: insertError } = await supabase
        .from('song_comments')
        .insert({
          user_id: user.id,
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
    <div className="min-h-screen p-4 md:p-8 pt-20 md:pt-24">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-start gap-2 mb-6">
          <button
            onClick={openCreateModal}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-lg text-sm font-medium hover:from-blue-600 hover:to-cyan-600 transition hover:scale-105"
          >
            <Plus className="w-4 h-4" />
            <span>Create Playlist</span>
          </button>
          {spotifyConnected.connected && (
            <button
              onClick={() => {
                if (playlists.length === 0) {
                  setError('Please create a YuMe playlist first before importing from Spotify');
                  return;
                }
                setShowImportModal(true);
                loadBrowseData('playlists');
              }}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-lg text-sm font-medium hover:from-green-600 hover:to-emerald-600 transition hover:scale-105"
            >
              <List className="w-4 h-4" />
              <span>Import from Spotify</span>
            </button>
          )}
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/50 rounded-lg">
            <p className="text-red-400">{error}</p>
          </div>
        )}

        {playlists.length === 0 ? (
          <div className="text-center py-16">
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-8 border border-gray-700 max-w-md mx-auto">
              <Music className="w-16 h-16 text-gray-600 mx-auto mb-3" />
              <h2 className="text-xl font-bold text-white mb-2">No playlists yet</h2>
              <p className="text-gray-400 text-sm mb-5">Create your first playlist to get started</p>
              <button
                onClick={openCreateModal}
                className="px-4 py-2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-lg text-sm font-medium hover:from-blue-600 hover:to-cyan-600 transition inline-flex items-center space-x-2"
              >
                <Plus className="w-4 h-4" />
                <span>Create Playlist</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {playlists.map((playlist) => (
              <div
                key={playlist.id}
                onClick={() => setSelectedPlaylist(playlist)}
                className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-3 border border-gray-700 hover:bg-gray-800/70 hover:scale-105 transition-all cursor-pointer group relative"
              >
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    openEditModal(playlist);
                  }}
                  className="absolute top-2 right-2 w-7 h-7 bg-blue-500/80 hover:bg-blue-600 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition z-10"
                  title="Edit playlist"
                >
                  <Edit2 className="w-3.5 h-3.5 text-white" />
                </button>
                <div className={`w-full aspect-square rounded-lg mb-3 flex items-center justify-center relative overflow-hidden ${playlist.cover.startsWith('http') ? '' : playlist.cover}`}>
                  {playlist.cover.startsWith('http') ? (
                    <img
                      src={playlist.cover}
                      alt={playlist.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Music className="w-12 h-12 text-white/50" />
                  )}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                    <Play className="w-10 h-10 text-white" />
                  </div>
                  <div className="absolute bottom-2 right-2">
                    <UserBadge userId={playlist.user_id} size={16} />
                  </div>
                </div>
                <h3 className="text-base font-bold text-white mb-1">{playlist.title}</h3>
                <p className="text-sm text-gray-400 line-clamp-2">{playlist.description}</p>
                <p className="text-xs text-gray-500 mt-1.5">{playlist.songs?.length || 0} songs</p>
              </div>
            ))}
          </div>
        )}

        {/* Create/Edit Playlist Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-gray-900 rounded-xl max-w-md w-full border border-gray-700 max-h-[90vh] flex flex-col">
              <div className="p-5 overflow-y-auto flex-1">
                <h2 className="text-xl font-bold text-white mb-5">
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

                  {!editingPlaylist && (
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Add Songs (Optional)
                      </label>
                      <div className="space-y-2">
                        <div className="flex space-x-2">
                          <input
                            type="text"
                            value={spotifyInput}
                            onChange={(e) => setSpotifyInput(e.target.value)}
                            placeholder="Paste Spotify track link..."
                            className="flex-1 px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            onKeyPress={async (e) => {
                              if (e.key === 'Enter' && spotifyInput.trim()) {
                                e.preventDefault();
                                await handleAddSongToList();
                              }
                            }}
                          />
                          <button
                            onClick={handleAddSongToList}
                            disabled={!spotifyInput.trim() || addingSong}
                            className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {addingSong ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
                          </button>
                        </div>
                        {songsToAdd.length > 0 && (
                          <div className="mt-3 space-y-2 max-h-48 overflow-y-auto">
                            {songsToAdd.map((song, index) => (
                              <div key={index} className="flex items-center space-x-3 p-2 bg-gray-800 rounded-lg">
                                {song.album_art && (
                                  <img src={song.album_art} alt={song.title} className="w-10 h-10 rounded object-cover" />
                                )}
                                <div className="flex-1 min-w-0">
                                  <p className="text-white text-sm font-medium truncate">{song.title}</p>
                                  <p className="text-gray-400 text-xs truncate">{song.artist}</p>
                                </div>
                                <button
                                  onClick={() => setSongsToAdd(songsToAdd.filter((_, i) => i !== index))}
                                  className="text-gray-400 hover:text-red-500 transition"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-3">
                      Cover
                    </label>
                    <div className="space-y-3">
                      <div className="grid grid-cols-5 gap-3">
                        {coverGradients.map((gradient) => (
                          <button
                            key={gradient}
                            onClick={() => setSelectedCover(gradient)}
                            className={`w-full aspect-square ${gradient} rounded-lg transition ${
                              selectedCover === gradient && !selectedCover.startsWith('http')
                                ? 'ring-4 ring-white scale-110'
                                : 'hover:scale-105'
                            }`}
                          />
                        ))}
                      </div>
                      {editingPlaylist && editingPlaylist.songs && editingPlaylist.songs.length > 0 && editingPlaylist.songs[0].album_art && (
                        <button
                          onClick={() => setSelectedCover(editingPlaylist.songs[0].album_art!)}
                          className={`w-full px-4 py-3 rounded-lg border-2 transition flex items-center space-x-3 ${
                            selectedCover === editingPlaylist.songs[0].album_art
                              ? 'border-white bg-gray-700'
                              : 'border-gray-700 bg-gray-800 hover:bg-gray-700'
                          }`}
                        >
                          <img
                            src={editingPlaylist.songs[0].album_art}
                            alt="Album art"
                            className="w-12 h-12 rounded object-cover"
                          />
                          <span className="text-white text-sm">Use first song's album art</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {editingPlaylist && (
                  <div className="mt-4 pt-4 border-t border-gray-700">
                    <button
                      onClick={async () => {
                        if (window.confirm(`Are you sure you want to delete "${editingPlaylist.title}"? This action cannot be undone.`)) {
                          try {
                            const { error } = await supabase
                              .from('playlists')
                              .delete()
                              .eq('id', editingPlaylist.id);

                            if (error) throw error;

                            await fetchPlaylists();
                            setShowCreateModal(false);
                            setEditingPlaylist(null);
                          } catch (error) {
                            console.error('Error deleting playlist:', error);
                            alert('Failed to delete playlist');
                          }
                        }
                      }}
                      className="w-full px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition flex items-center justify-center space-x-2 border border-red-500/30"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>Delete Playlist</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Fixed Footer with Buttons */}
              <div className="p-4 border-t border-gray-700 flex space-x-2 bg-gray-900 rounded-b-xl">
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    setEditingPlaylist(null);
                    setPlaylistTitle('');
                    setPlaylistDescription('');
                    setSelectedCover(coverGradients[0]);
                    setSongsToAdd([]);
                    setSpotifyInput('');
                    setAddSongError(null);
                  }}
                  className="flex-1 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white text-sm rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateOrUpdatePlaylist}
                  disabled={!playlistTitle.trim()}
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white text-sm rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {editingPlaylist ? 'Update Playlist' : 'Create Playlist'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Playlist Detail Modal */}
        {selectedPlaylist && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-gray-900 rounded-xl max-w-3xl w-full max-h-[90vh] overflow-hidden border border-gray-700">
              <div className="relative">
                <div className={`${selectedPlaylist.cover.startsWith('http') ? 'bg-gradient-to-br from-gray-800 to-gray-900' : selectedPlaylist.cover} p-6 flex items-center space-x-4 relative`}>
                  {selectedPlaylist.cover.startsWith('http') && (
                    <div className="absolute inset-0 opacity-30">
                      <img
                        src={selectedPlaylist.cover}
                        alt={selectedPlaylist.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <div className="w-24 h-24 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center flex-shrink-0 relative z-10 overflow-hidden">
                    {selectedPlaylist.cover.startsWith('http') ? (
                      <img
                        src={selectedPlaylist.cover}
                        alt={selectedPlaylist.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Music className="w-12 h-12 text-white" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0 relative z-10">
                    <p className="text-white/80 text-xs font-medium mb-1.5 uppercase tracking-wider">Playlist</p>
                    <h2 className="text-2xl font-bold text-white mb-1.5">{selectedPlaylist.title}</h2>
                    <p className="text-white/90 text-sm">{selectedPlaylist.description}</p>
                    <p className="text-white/70 text-xs mt-1.5">{selectedPlaylist.songs?.length || 0} songs</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setSelectedPlaylist(null);
                    setShowAddSong(false);
                    setIsPlayingAll(false);
                    setShowEmbedPlayer(false);
                  }}
                  className="absolute top-3 right-3 w-8 h-8 bg-black/50 hover:bg-black/70 rounded-full flex items-center justify-center transition"
                  title="Close"
                >
                  <X className="w-4 h-4 text-white" />
                </button>
                <div className="absolute bottom-3 right-3 flex items-center space-x-2">
                  {selectedPlaylist.songs && selectedPlaylist.songs.length > 0 && (
                    <button
                      onClick={handlePlayAll}
                      className="w-10 h-10 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-full flex items-center justify-center transition hover:scale-110 shadow-lg"
                      title={isPlayingAll ? "Stop playing" : "Play all"}
                    >
                      {isPlayingAll ? (
                        <StopCircle className="w-5 h-5 text-white" />
                      ) : (
                        <PlayCircle className="w-5 h-5 text-white" />
                      )}
                    </button>
                  )}
                  <button
                    onClick={scrollToAddSongForm}
                    className="w-10 h-10 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-full flex items-center justify-center transition hover:scale-110 shadow-lg"
                    title="Add song"
                  >
                    <Plus className="w-5 h-5 text-white" />
                  </button>
                </div>
              </div>

              <div className="p-6 overflow-y-auto max-h-[calc(90vh-250px)]">
                {/* Play All Embedded Player View */}
                {showEmbedPlayer && selectedPlaylist.songs && selectedPlaylist.songs.length > 0 && (
                  <div className="mb-6 bg-gradient-to-br from-green-900/20 to-blue-900/20 border border-green-500/30 rounded-xl p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-white font-semibold text-lg flex items-center">
                        <PlayCircle className="w-5 h-5 mr-2 text-green-400" />
                        Now Playing - {selectedPlaylist.songs.length} {selectedPlaylist.songs.length === 1 ? 'track' : 'tracks'}
                      </h3>
                      <button
                        onClick={() => {
                          setShowEmbedPlayer(false);
                          setIsPlayingAll(false);
                        }}
                        className="text-gray-400 hover:text-white transition"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                    <div className="space-y-3 max-h-[400px] overflow-y-auto">
                      {selectedPlaylist.songs.map((song, index) => (
                        <div key={song.id} className="bg-gray-800/50 rounded-lg p-3">
                          <div className="flex items-center space-x-3 mb-2">
                            <span className="text-gray-400 text-sm font-medium w-6">{index + 1}</span>
                            <div className="flex-1">
                              <p className="text-white text-sm font-medium">{song.title}</p>
                              <p className="text-gray-400 text-xs">{song.artist}</p>
                            </div>
                          </div>
                          <iframe
                            src={`https://open.spotify.com/embed/track/${song.spotify_id}?theme=0`}
                            width="100%"
                            height="80"
                            frameBorder="0"
                            allow="encrypted-media"
                            className="rounded-lg"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {selectedPlaylist.songs?.length === 0 && !showAddSong ? (
                  <div className="text-center py-8">
                    <Music className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                    <p className="text-gray-400 text-sm mb-3">No songs yet. Add your first song!</p>
                    <button
                      onClick={scrollToAddSongForm}
                      className="px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white text-sm rounded-lg transition inline-flex items-center space-x-1.5"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Song</span>
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {selectedPlaylist.songs?.map((song, index) => (
                      <div key={song.id} className="group relative">
                        <div className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition">
                          <button
                            onClick={(e) => handleDeleteSong(song.id, e)}
                            className="w-8 h-8 bg-black/70 hover:bg-red-500/70 rounded-full flex items-center justify-center transition"
                            title="Remove song"
                          >
                            <Trash2 className="w-4 h-4 text-white" />
                          </button>
                        </div>
                        <iframe
                          src={`https://open.spotify.com/embed/track/${song.spotify_id}?theme=0`}
                          width="100%"
                          height="152"
                          frameBorder="0"
                          allow="encrypted-media"
                          className="rounded-lg"
                        />
                      </div>
                    ))}

                    {/* Add Song Form */}
                    {showAddSong ? (
                      <div ref={addSongFormRef} className="bg-gray-800/50 rounded-lg p-4 border border-blue-500/50">
                        <h3 className="text-white font-medium mb-3">Add a Song</h3>
                        {addSongError && (
                          <div className="mb-3 p-2 bg-red-500/10 border border-red-500/50 rounded text-red-400 text-sm">
                            {addSongError}
                          </div>
                        )}

                        {/* Spotify Connected - Show Search */}
                        {spotifyConnected.connected ? (
                          <div className="space-y-3">
                            <div className="flex items-center space-x-2 p-2 bg-green-900/20 border border-green-500/30 rounded-lg">
                              <Music className="w-4 h-4 text-green-400" />
                              <span className="text-green-400 text-sm">Spotify Connected</span>
                            </div>

                            {/* Inline Search Field - Always visible */}
                            <div className="space-y-3">
                              <div className="relative">
                                <div className="relative">
                                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                                  <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => {
                                      setSearchQuery(e.target.value);
                                      setShowSpotifySearch(true);
                                    }}
                                    placeholder="Search Spotify for songs or artists..."
                                    className="w-full pl-10 pr-10 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500"
                                    disabled={isSearching}
                                  />
                                  {isSearching && (
                                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 animate-spin" />
                                  )}
                                </div>

                                {/* Inline suggestions dropdown */}
                                {searchResults.length > 0 && (
                                  <div className="absolute z-10 w-full mt-1 bg-gray-900 border border-gray-700 rounded-lg shadow-xl max-h-96 overflow-y-auto">
                                    {searchResults.map((track) => (
                                      <div
                                        key={track.id}
                                        className="flex items-center space-x-3 p-3 hover:bg-gray-800 transition cursor-pointer border-b border-gray-800 last:border-b-0"
                                        onClick={() => {
                                          handleAddSpotifyTrack(track);
                                          setSearchQuery('');
                                          setSearchResults([]);
                                        }}
                                      >
                                        {track.album.images[2] && (
                                          <img
                                            src={track.album.images[2].url}
                                            alt={track.name}
                                            className="w-12 h-12 rounded object-cover"
                                          />
                                        )}
                                        <div className="flex-1 min-w-0">
                                          <p className="text-white text-sm font-medium truncate">{track.name}</p>
                                          <p className="text-gray-400 text-xs truncate">
                                            {track.artists.map(a => a.name).join(', ')}
                                          </p>
                                        </div>
                                        <Plus className="w-5 h-5 text-green-400 flex-shrink-0" />
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>

                              <button
                                onClick={() => {
                                  setShowBrowse(true);
                                  loadBrowseData('top');
                                }}
                                className="w-full px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition flex items-center justify-center space-x-2"
                              >
                                <TrendingUp className="w-4 h-4" />
                                <span>Browse Your Music</span>
                              </button>
                            </div>

                            <div className="pt-2 border-t border-gray-700">
                              <p className="text-xs text-gray-500 mb-2">Or paste a Spotify URL:</p>
                              <input
                                type="text"
                                value={spotifyInput}
                                onChange={(e) => {
                                  setSpotifyInput(e.target.value);
                                  setAddSongError(null);
                                }}
                                placeholder="https://open.spotify.com/track/..."
                                className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                disabled={addingSong}
                              />
                            </div>

                            <div className="flex space-x-2">
                              <button
                                onClick={() => {
                                  setShowAddSong(false);
                                  setSpotifyInput('');
                                  setAddSongError(null);
                                  setShowSpotifySearch(false);
                                  setSearchQuery('');
                                  setSearchResults([]);
                                }}
                                className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition"
                                disabled={addingSong}
                              >
                                Cancel
                              </button>
                              {spotifyInput.trim() && (
                                <button
                                  onClick={handleAddSong}
                                  disabled={addingSong}
                                  className="flex-1 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                                >
                                  {addingSong ? (
                                    <>
                                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                      Adding...
                                    </>
                                  ) : (
                                    'Add from URL'
                                  )}
                                </button>
                              )}
                            </div>
                          </div>
                        ) : (
                          /* Not Connected - Show URL Input Only */
                          <div className="space-y-3">
                            <div className="p-3 bg-yellow-900/20 border border-yellow-500/30 rounded-lg">
                              <p className="text-yellow-400 text-sm">
                                Connect Spotify in Settings to search and browse your music!
                              </p>
                            </div>
                            <div>
                              <input
                                ref={spotifyInputRef}
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
                        )}
                      </div>
                    ) : (
                      <button
                        onClick={scrollToAddSongForm}
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

        {/* Import from Spotify Modal */}
        {showImportModal && spotifyConnected.connected && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-gray-900 rounded-xl max-w-4xl w-full max-h-[90vh] flex flex-col border border-gray-700">
              <div className="p-5 border-b border-gray-700 flex-shrink-0">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-xl font-bold text-white">Import from Spotify</h2>
                  <button
                    onClick={() => {
                      setShowImportModal(false);
                      setTargetPlaylistForImport(null);
                    }}
                    className="w-8 h-8 bg-gray-800 hover:bg-gray-700 rounded-full flex items-center justify-center transition"
                  >
                    <X className="w-4 h-4 text-white" />
                  </button>
                </div>
                <p className="text-gray-400 text-sm">
                  {targetPlaylistForImport
                    ? targetPlaylistForImport === 'new'
                      ? 'Select a Spotify playlist to import as a new YuMe playlist:'
                      : `Select a Spotify playlist to import into "${targetPlaylistForImport.title}"`
                    : 'First, select where to import:'
                  }
                </p>

                {!targetPlaylistForImport ? (
                  /* Step 1: Select YuMe Playlist or Create New */
                  <div className="space-y-4 overflow-y-auto max-h-[calc(90vh-200px)]">
                    {/* Create New Playlist Option */}
                    <button
                      onClick={() => {
                        setTargetPlaylistForImport('new');
                        loadBrowseData('playlists');
                      }}
                      className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 rounded-lg p-3 border border-green-500/50 transition text-left flex items-center space-x-3"
                    >
                      <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Plus className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex-1">
                        <p className="text-white text-base font-semibold">Create New Playlist</p>
                      </div>
                    </button>

                    {/* Existing Playlists */}
                    {playlists.length > 0 && (
                      <>
                        <div className="flex items-center space-x-2">
                          <div className="flex-1 h-px bg-gray-700"></div>
                          <p className="text-gray-500 text-xs uppercase">Or add to existing</p>
                          <div className="flex-1 h-px bg-gray-700"></div>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                          {playlists.map((playlist) => (
                            <button
                              key={playlist.id}
                              onClick={() => {
                                setTargetPlaylistForImport(playlist);
                                loadBrowseData('playlists');
                              }}
                              className="bg-gray-800/50 hover:bg-gray-800 rounded-lg p-2.5 border border-gray-700 transition text-left"
                            >
                              <div className={`w-full aspect-square rounded-md mb-2 flex items-center justify-center ${playlist.cover.startsWith('http') ? '' : playlist.cover}`}>
                                {playlist.cover.startsWith('http') ? (
                                  <img
                                    src={playlist.cover}
                                    alt={playlist.title}
                                    className="w-full h-full object-cover rounded-md"
                                  />
                                ) : (
                                  <Music className="w-6 h-6 text-white/50" />
                                )}
                              </div>
                              <p className="text-white text-xs font-medium truncate">{playlist.title}</p>
                              <p className="text-gray-500 text-xs">{playlist.songs?.length || 0} songs</p>
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                ) : (
                  /* Step 2: Select Spotify Playlist to Import */
                  <div className="space-y-3">
                    {targetPlaylistForImport === 'new' ? (
                      <div className="flex items-center justify-between p-3 bg-green-900/20 border border-green-500/30 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-500 rounded-lg flex items-center justify-center flex-shrink-0">
                            <Plus className="w-6 h-6 text-white" />
                          </div>
                          <div>
                            <p className="text-white font-medium">Creating new playlist</p>
                            <p className="text-gray-400 text-xs">Will use Spotify playlist name</p>
                          </div>
                        </div>
                        <button
                          onClick={() => setTargetPlaylistForImport(null)}
                          className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded-lg transition"
                        >
                          Change
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between p-3 bg-blue-900/20 border border-blue-500/30 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className={`w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 ${targetPlaylistForImport.cover.startsWith('http') ? '' : targetPlaylistForImport.cover}`}>
                            {targetPlaylistForImport.cover.startsWith('http') ? (
                              <img
                                src={targetPlaylistForImport.cover}
                                alt={targetPlaylistForImport.title}
                                className="w-full h-full object-cover rounded-lg"
                              />
                            ) : (
                              <Music className="w-6 h-6 text-white" />
                            )}
                          </div>
                          <div>
                            <p className="text-white font-medium">Importing into: {targetPlaylistForImport.title}</p>
                            <p className="text-gray-400 text-xs">{targetPlaylistForImport.songs?.length || 0} existing songs</p>
                          </div>
                        </div>
                        <button
                          onClick={() => setTargetPlaylistForImport(null)}
                          className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded-lg transition"
                        >
                          Change
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {targetPlaylistForImport && (
                <div className="p-4 overflow-y-auto max-h-[calc(90vh-200px)]">
                  {loadingBrowse ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-6 h-6 text-purple-500 animate-spin" />
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      {spotifyPlaylists.map((playlist) => (
                        <div
                          key={playlist.id}
                          className="flex items-center space-x-2.5 p-2.5 bg-gray-800/50 rounded-lg hover:bg-gray-800 transition"
                        >
                          {playlist.images[0] && (
                            <img
                              src={playlist.images[0].url}
                              alt={playlist.name}
                              className="w-12 h-12 rounded object-cover flex-shrink-0"
                            />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-white text-sm font-medium truncate">{playlist.name}</p>
                            <p className="text-gray-400 text-xs truncate">{playlist.description}</p>
                            <p className="text-gray-500 text-xs">{playlist.tracks.total} tracks</p>
                          </div>
                          <button
                            onClick={() => handleImportSpotifyPlaylist(playlist, targetPlaylistForImport)}
                            disabled={importingPlaylist === playlist.id}
                            className="px-2.5 py-1.5 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white text-xs rounded-lg transition flex items-center space-x-1 flex-shrink-0"
                          >
                            {importingPlaylist === playlist.id ? (
                              <>
                                <Loader2 className="w-3 h-3 animate-spin" />
                                <span>Importing...</span>
                              </>
                            ) : (
                              <>
                                <Plus className="w-3 h-3" />
                                <span>Import</span>
                              </>
                            )}
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Browse Your Spotify Modal */}
        {showBrowse && spotifyConnected.connected && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-gray-900 rounded-xl max-w-4xl w-full max-h-[90vh] overflow-hidden border border-gray-700">
              <div className="p-5 border-b border-gray-700">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-xl font-bold text-white">Browse Your Spotify</h2>
                  <button
                    onClick={() => {
                      setShowBrowse(false);
                      if (selectedPlaylist) setShowAddSong(false);
                    }}
                    className="w-8 h-8 bg-gray-800 hover:bg-gray-700 rounded-full flex items-center justify-center transition"
                  >
                    <X className="w-4 h-4 text-white" />
                  </button>
                </div>

                {/* Tabs */}
                <div className="flex space-x-1.5">
                  <button
                    onClick={() => {
                      setBrowseTab('top');
                      loadBrowseData('top');
                    }}
                    className={`px-3 py-1.5 rounded-lg text-sm transition flex items-center space-x-1.5 ${
                      browseTab === 'top'
                        ? 'bg-purple-600 text-white'
                        : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                    }`}
                  >
                    <TrendingUp className="w-3.5 h-3.5" />
                    <span>Top Tracks</span>
                  </button>
                  <button
                    onClick={() => {
                      setBrowseTab('recent');
                      loadBrowseData('recent');
                    }}
                    className={`px-3 py-1.5 rounded-lg text-sm transition flex items-center space-x-1.5 ${
                      browseTab === 'recent'
                        ? 'bg-purple-600 text-white'
                        : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                    }`}
                  >
                    <Clock className="w-3.5 h-3.5" />
                    <span>Recently Played</span>
                  </button>
                  <button
                    onClick={() => {
                      setBrowseTab('playlists');
                      loadBrowseData('playlists');
                    }}
                    className={`px-3 py-1.5 rounded-lg text-sm transition flex items-center space-x-1.5 ${
                      browseTab === 'playlists'
                        ? 'bg-purple-600 text-white'
                        : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                    }`}
                  >
                    <List className="w-3.5 h-3.5" />
                    <span>Your Playlists</span>
                  </button>
                </div>
              </div>

              <div className="p-4 overflow-y-auto max-h-[calc(90vh-150px)]">
                {loadingBrowse ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 text-purple-500 animate-spin" />
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {browseTab === 'top' && topTracks.map((track) => (
                      <div
                        key={track.id}
                        className="flex items-center space-x-2.5 p-2.5 bg-gray-800/50 rounded-lg hover:bg-gray-800 transition cursor-pointer"
                        onClick={() => {
                          if (selectedPlaylist) {
                            handleAddSpotifyTrack(track);
                            setShowBrowse(false);
                          }
                        }}
                      >
                        {track.album.images[2] && (
                          <img
                            src={track.album.images[2].url}
                            alt={track.name}
                            className="w-12 h-12 rounded object-cover flex-shrink-0"
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-white text-sm font-medium truncate">{track.name}</p>
                          <p className="text-gray-400 text-xs truncate">
                            {track.artists.map(a => a.name).join(', ')}
                          </p>
                          <p className="text-gray-500 text-xs truncate">{track.album.name}</p>
                        </div>
                        {selectedPlaylist && (
                          <Plus className="w-4 h-4 text-purple-400 flex-shrink-0" />
                        )}
                      </div>
                    ))}

                    {browseTab === 'recent' && recentTracks.map((track) => (
                      <div
                        key={track.id}
                        className="flex items-center space-x-2.5 p-2.5 bg-gray-800/50 rounded-lg hover:bg-gray-800 transition cursor-pointer"
                        onClick={() => {
                          if (selectedPlaylist) {
                            handleAddSpotifyTrack(track);
                            setShowBrowse(false);
                          }
                        }}
                      >
                        {track.album.images[2] && (
                          <img
                            src={track.album.images[2].url}
                            alt={track.name}
                            className="w-12 h-12 rounded object-cover flex-shrink-0"
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-white text-sm font-medium truncate">{track.name}</p>
                          <p className="text-gray-400 text-xs truncate">
                            {track.artists.map(a => a.name).join(', ')}
                          </p>
                          <p className="text-gray-500 text-xs truncate">{track.album.name}</p>
                        </div>
                        {selectedPlaylist && (
                          <Plus className="w-4 h-4 text-purple-400 flex-shrink-0" />
                        )}
                      </div>
                    ))}

                    {browseTab === 'playlists' && spotifyPlaylists.map((playlist) => (
                      <div
                        key={playlist.id}
                        className="flex items-center space-x-2.5 p-2.5 bg-gray-800/50 rounded-lg hover:bg-gray-800 transition"
                      >
                        {playlist.images[0] && (
                          <img
                            src={playlist.images[0].url}
                            alt={playlist.name}
                            className="w-12 h-12 rounded object-cover flex-shrink-0"
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-white text-sm font-medium truncate">{playlist.name}</p>
                          <p className="text-gray-400 text-xs truncate">{playlist.description}</p>
                          <p className="text-gray-500 text-xs">{playlist.tracks.total} tracks</p>
                        </div>
                        <a
                          href={playlist.external_urls.spotify}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2.5 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs rounded-lg transition flex items-center space-x-1 flex-shrink-0"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <ExternalLink className="w-3 h-3" />
                          <span>Open</span>
                        </a>
                      </div>
                    ))}
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
