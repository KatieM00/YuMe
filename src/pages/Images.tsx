import { useState, useEffect } from 'react';
import { Plus, MapPin, Calendar, MessageSquare, X } from 'lucide-react';

interface ImageItem {
  id: number;
  url: string;
  type: 'image' | 'video';
  location: string;
  date: string;
  description: string;
  comments: string[];
}

export default function Images() {
  const [images, setImages] = useState<ImageItem[]>([
    {
      id: 1,
      url: 'bg-gradient-to-br from-blue-400 to-cyan-500',
      type: 'image',
      location: 'Santorini, Greece',
      date: '2024-07-15',
      description: 'Sunset at Oia',
      comments: ['This was magical', 'Best day ever'],
    },
    {
      id: 2,
      url: 'bg-gradient-to-br from-pink-400 to-red-500',
      type: 'image',
      location: 'London, UK',
      date: '2024-02-10',
      description: 'Tower Bridge at night',
      comments: ['So beautiful!'],
    },
    {
      id: 3,
      url: 'bg-gradient-to-br from-green-400 to-teal-500',
      type: 'image',
      location: 'Athens, Greece',
      date: '2024-03-22',
      description: 'Acropolis view',
      comments: [],
    },
    {
      id: 4,
      url: 'bg-gradient-to-br from-yellow-400 to-orange-500',
      type: 'video',
      location: 'Rome, Italy',
      date: '2023-09-05',
      description: 'Walking through the streets',
      comments: ['I miss this place'],
    },
    {
      id: 5,
      url: 'bg-gradient-to-br from-purple-400 to-pink-500',
      type: 'image',
      location: 'Paris, France',
      date: '2024-05-01',
      description: 'Eiffel Tower',
      comments: [],
    },
    {
      id: 6,
      url: 'bg-gradient-to-br from-indigo-400 to-blue-500',
      type: 'image',
      location: 'Barcelona, Spain',
      date: '2024-06-12',
      description: 'La Sagrada Familia',
      comments: ['Incredible architecture'],
    },
  ]);

  const [selectedImage, setSelectedImage] = useState<ImageItem | null>(null);
  const [newComment, setNewComment] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('yumeImages');
    if (saved) {
      setImages(JSON.parse(saved));
    }
  }, []);

  const saveToStorage = (updatedImages: ImageItem[]) => {
    localStorage.setItem('yumeImages', JSON.stringify(updatedImages));
  };

  const addComment = () => {
    if (selectedImage && newComment.trim()) {
      const updatedImages = images.map((img) =>
        img.id === selectedImage.id
          ? { ...img, comments: [...img.comments, newComment] }
          : img
      );
      setImages(updatedImages);
      saveToStorage(updatedImages);
      setSelectedImage({
        ...selectedImage,
        comments: [...selectedImage.comments, newComment],
      });
      setNewComment('');
    }
  };

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-white">Images</h1>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-full font-medium hover:from-blue-600 hover:to-cyan-600 transition"
          >
            <Plus className="w-5 h-5" />
            <span>Add Media</span>
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {images.map((image) => (
            <div
              key={image.id}
              onClick={() => setSelectedImage(image)}
              className="relative group cursor-pointer aspect-square rounded-xl overflow-hidden"
            >
              <div className={`w-full h-full ${image.url}`}>
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/60 transition flex items-center justify-center">
                  <div className="opacity-0 group-hover:opacity-100 transition text-white text-center p-4">
                    <MapPin className="w-5 h-5 mx-auto mb-2" />
                    <p className="text-sm font-medium">{image.location}</p>
                    <p className="text-xs text-gray-300 mt-1">{image.date}</p>
                  </div>
                </div>
              </div>
              {image.type === 'video' && (
                <div className="absolute top-2 right-2 bg-black/70 backdrop-blur-sm px-2 py-1 rounded text-xs text-white">
                  VIDEO
                </div>
              )}
            </div>
          ))}
        </div>

        {selectedImage && (
          <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-gray-900 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden border border-gray-700">
              <div className="grid md:grid-cols-2 h-full">
                <div className={`${selectedImage.url} flex items-center justify-center relative`}>
                  <div className="w-full aspect-square"></div>
                  {selectedImage.type === 'video' && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                        <div className="w-0 h-0 border-t-8 border-t-transparent border-l-12 border-l-white border-b-8 border-b-transparent ml-1"></div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="p-6 flex flex-col max-h-[90vh] overflow-y-auto">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h2 className="text-2xl font-bold text-white mb-2">
                        {selectedImage.description}
                      </h2>
                      <div className="flex items-center space-x-4 text-sm text-gray-400">
                        <div className="flex items-center space-x-1">
                          <MapPin className="w-4 h-4" />
                          <span>{selectedImage.location}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Calendar className="w-4 h-4" />
                          <span>{selectedImage.date}</span>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => setSelectedImage(null)}
                      className="w-10 h-10 bg-gray-800 hover:bg-gray-700 rounded-full flex items-center justify-center transition"
                    >
                      <X className="w-5 h-5 text-white" />
                    </button>
                  </div>

                  <div className="border-t border-gray-700 pt-4 flex-1">
                    <h3 className="text-lg font-semibold text-white mb-4 flex items-center space-x-2">
                      <MessageSquare className="w-5 h-5" />
                      <span>Comments</span>
                    </h3>

                    <div className="space-y-3 mb-4">
                      {selectedImage.comments.length > 0 ? (
                        selectedImage.comments.map((comment, index) => (
                          <div
                            key={index}
                            className="bg-gray-800/50 rounded-lg p-3 border border-gray-700"
                          >
                            <p className="text-gray-300 text-sm">{comment}</p>
                          </div>
                        ))
                      ) : (
                        <p className="text-gray-500 text-sm italic">No comments yet</p>
                      )}
                    </div>

                    <div className="flex space-x-2 mt-auto">
                      <input
                        type="text"
                        placeholder="Add a comment..."
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        className="flex-1 px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            addComment();
                          }
                        }}
                      />
                      <button
                        onClick={addComment}
                        className="px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition"
                      >
                        Post
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {showAddModal && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-gray-900 rounded-2xl max-w-md w-full p-6 border border-gray-700">
              <h2 className="text-2xl font-bold text-white mb-4">Add Media</h2>
              <p className="text-gray-400 mb-4">Upload images or videos to share your memories</p>
              <div className="border-2 border-dashed border-gray-700 rounded-xl p-8 text-center hover:border-blue-500 transition cursor-pointer">
                <Plus className="w-12 h-12 text-gray-600 mx-auto mb-2" />
                <p className="text-gray-400">Click to upload</p>
                <p className="text-gray-600 text-sm mt-1">or drag and drop</p>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="w-full mt-4 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
