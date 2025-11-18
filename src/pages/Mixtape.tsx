import { useState } from 'react';
import { Play, Pause, Music, MessageSquare, X } from 'lucide-react';

interface Song {
  id: number;
  title: string;
  artist: string;
  duration: string;
}

interface Playlist {
  id: number;
  title: string;
  description: string;
  cover: string;
  songs: Song[];
}

export default function Mixtape() {
  const [selectedPlaylist, setSelectedPlaylist] = useState<Playlist | null>(null);
  const [playingSong, setPlayingSong] = useState<number | null>(null);
  const [comments, setComments] = useState<{ [key: number]: string }>({});
  const [newComment, setNewComment] = useState('');

  const playlists: Playlist[] = [
    {
      id: 1,
      title: 'Our Summer Vibes',
      description: 'Songs that remind us of sunny days together',
      cover: 'bg-gradient-to-br from-yellow-400 to-orange-500',
      songs: [
        { id: 1, title: 'Golden Hour', artist: 'JVKE', duration: '3:29' },
        { id: 2, title: 'Summertime Sadness', artist: 'Lana Del Rey', duration: '4:25' },
        { id: 3, title: 'Heat Waves', artist: 'Glass Animals', duration: '3:59' },
        { id: 4, title: 'Blinding Lights', artist: 'The Weeknd', duration: '3:20' },
      ],
    },
    {
      id: 2,
      title: 'Late Night Talks',
      description: 'For those endless conversations under the stars',
      cover: 'bg-gradient-to-br from-blue-600 to-cyan-500',
      songs: [
        { id: 5, title: 'The Night We Met', artist: 'Lord Huron', duration: '3:28' },
        { id: 6, title: 'Midnight City', artist: 'M83', duration: '4:04' },
        { id: 7, title: 'Dreams', artist: 'Fleetwood Mac', duration: '4:17' },
        { id: 8, title: 'Electric Feel', artist: 'MGMT', duration: '3:49' },
      ],
    },
    {
      id: 3,
      title: 'Distance & Longing',
      description: 'When we miss each other',
      cover: 'bg-gradient-to-br from-red-500 to-pink-600',
      songs: [
        { id: 9, title: 'Someone Like You', artist: 'Adele', duration: '4:45' },
        { id: 10, title: 'Photograph', artist: 'Ed Sheeran', duration: '4:19' },
        { id: 11, title: 'All of Me', artist: 'John Legend', duration: '4:29' },
      ],
    },
    {
      id: 4,
      title: 'Road Trip Mix',
      description: 'Adventures and long drives',
      cover: 'bg-gradient-to-br from-green-500 to-teal-600',
      songs: [
        { id: 12, title: 'Life Is A Highway', artist: 'Tom Cochrane', duration: '4:28' },
        { id: 13, title: 'Take Me Home', artist: 'Cash Cash', duration: '3:46' },
        { id: 14, title: 'Home', artist: 'Phillip Phillips', duration: '3:27' },
      ],
    },
  ];

  const handlePlaySong = (songId: number) => {
    if (playingSong === songId) {
      setPlayingSong(null);
    } else {
      setPlayingSong(songId);
    }
  };

  const handleAddComment = (songId: number) => {
    if (newComment.trim()) {
      setComments({ ...comments, [songId]: newComment });
      setNewComment('');
    }
  };

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-white">Mixtape</h1>
          <button className="px-4 py-2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-full font-medium hover:from-blue-600 hover:to-cyan-600 transition">
            + Create Playlist
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {playlists.map((playlist) => (
            <div
              key={playlist.id}
              onClick={() => setSelectedPlaylist(playlist)}
              className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-4 border border-gray-700 hover:bg-gray-800/70 transition cursor-pointer group"
            >
              <div className={`w-full aspect-square ${playlist.cover} rounded-xl mb-4 flex items-center justify-center relative overflow-hidden`}>
                <Music className="w-16 h-16 text-white/50" />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                  <Play className="w-12 h-12 text-white" />
                </div>
              </div>
              <h3 className="text-lg font-bold text-white mb-1">{playlist.title}</h3>
              <p className="text-sm text-gray-400">{playlist.description}</p>
              <p className="text-xs text-gray-500 mt-2">{playlist.songs.length} songs</p>
            </div>
          ))}
        </div>

        {selectedPlaylist && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-gray-900 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden border border-gray-700">
              <div className="relative">
                <div className={`${selectedPlaylist.cover} p-8 flex items-center space-x-6`}>
                  <div className="w-32 h-32 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                    <Music className="w-16 h-16 text-white" />
                  </div>
                  <div>
                    <p className="text-white/80 text-sm font-medium mb-2">PLAYLIST</p>
                    <h2 className="text-3xl font-bold text-white mb-2">{selectedPlaylist.title}</h2>
                    <p className="text-white/90">{selectedPlaylist.description}</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedPlaylist(null)}
                  className="absolute top-4 right-4 w-10 h-10 bg-black/50 hover:bg-black/70 rounded-full flex items-center justify-center transition"
                >
                  <X className="w-5 h-5 text-white" />
                </button>
              </div>

              <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
                <div className="space-y-2">
                  {selectedPlaylist.songs.map((song, index) => (
                    <div key={song.id}>
                      <div className="flex items-center space-x-4 p-3 rounded-lg hover:bg-gray-800/50 transition group">
                        <span className="text-gray-400 text-sm w-6">{index + 1}</span>
                        <button
                          onClick={() => handlePlaySong(song.id)}
                          className="w-10 h-10 rounded-full bg-blue-500 hover:bg-blue-600 flex items-center justify-center transition flex-shrink-0"
                        >
                          {playingSong === song.id ? (
                            <Pause className="w-5 h-5 text-white" />
                          ) : (
                            <Play className="w-5 h-5 text-white ml-0.5" />
                          )}
                        </button>
                        <div className="flex-1 min-w-0">
                          <p className="text-white font-medium truncate">{song.title}</p>
                          <p className="text-gray-400 text-sm truncate">{song.artist}</p>
                        </div>
                        <span className="text-gray-400 text-sm">{song.duration}</span>
                      </div>

                      <div className="ml-20 mb-4">
                        {comments[song.id] ? (
                          <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700">
                            <div className="flex items-start space-x-2">
                              <MessageSquare className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                              <p className="text-gray-300 text-sm">{comments[song.id]}</p>
                            </div>
                          </div>
                        ) : (
                          <div className="flex space-x-2">
                            <input
                              type="text"
                              placeholder="Add a comment..."
                              value={newComment}
                              onChange={(e) => setNewComment(e.target.value)}
                              className="flex-1 px-3 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  handleAddComment(song.id);
                                }
                              }}
                            />
                            <button
                              onClick={() => handleAddComment(song.id)}
                              className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm transition"
                            >
                              Add
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
