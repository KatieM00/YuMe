import { useState, useEffect } from 'react';
import { Plus, MapPin, Calendar, MessageSquare, X, Trash2, Loader, Pencil } from 'lucide-react';
import { UploadModal } from '../components/UploadModal';
import UserBadge from '../components/UserBadge';
import {
  MediaItem,
  getAllMedia,
  deleteMediaItem,
  addComment,
  deleteComment,
  updateMediaItem,
} from '../lib/mediaService';

export default function Images() {
  const [images, setImages] = useState<MediaItem[]>([]);
  const [selectedImage, setSelectedImage] = useState<MediaItem | null>(null);
  const [newComment, setNewComment] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);

  const loadMedia = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const media = await getAllMedia();
      setImages(media);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load media');
      console.error('Failed to load media:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadMedia();
  }, []);

  const handleAddComment = async () => {
    if (selectedImage && newComment.trim()) {
      try {
        const comment = await addComment(selectedImage.id, newComment);

        // Update local state
        const updatedImages = images.map((img) =>
          img.id === selectedImage.id
            ? { ...img, comments: [...(img.comments || []), comment] }
            : img
        );
        setImages(updatedImages);

        setSelectedImage({
          ...selectedImage,
          comments: [...(selectedImage.comments || []), comment],
        });

        setNewComment('');
      } catch (err) {
        console.error('Failed to add comment:', err);
        alert('Failed to add comment. Please try again.');
      }
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!selectedImage) return;

    try {
      await deleteComment(commentId);

      // Update local state
      const updatedComments = selectedImage.comments?.filter(c => c.id !== commentId) || [];
      const updatedImages = images.map((img) =>
        img.id === selectedImage.id
          ? { ...img, comments: updatedComments }
          : img
      );

      setImages(updatedImages);
      setSelectedImage({
        ...selectedImage,
        comments: updatedComments,
      });
    } catch (err) {
      console.error('Failed to delete comment:', err);
      alert('Failed to delete comment. Please try again.');
    }
  };

  const handleDeleteMedia = async (mediaId: string, storagePath: string) => {
    if (!confirm('Are you sure you want to delete this media?')) return;

    try {
      await deleteMediaItem(mediaId, storagePath);

      // Update local state
      const updatedImages = images.filter((img) => img.id !== mediaId);
      setImages(updatedImages);

      if (selectedImage?.id === mediaId) {
        setSelectedImage(null);
      }
    } catch (err) {
      console.error('Failed to delete media:', err);
      alert('Failed to delete media. Please try again.');
    }
  };

  const handleUploadComplete = () => {
    loadMedia();
  };

  const handleUpdateMedia = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedImage) return;

    const formData = new FormData(e.currentTarget);
    const metadata = {
      description: formData.get('description') as string || undefined,
      location: formData.get('location') as string || undefined,
      taken_date: formData.get('taken_date') as string || undefined,
      added_by: formData.get('added_by') as string || undefined,
    };

    try {
      const updated = await updateMediaItem(selectedImage.id, metadata);

      // Update local state
      const updatedImages = images.map((img) =>
        img.id === updated.id ? { ...updated, comments: img.comments } : img
      );
      setImages(updatedImages);
      setSelectedImage({ ...updated, comments: selectedImage.comments });
      setIsEditMode(false);
    } catch (err) {
      console.error('Failed to update media:', err);
      alert('Failed to update media. Please try again.');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen p-4 md:p-8 flex items-center justify-center">
        <div className="text-center">
          <Loader className="w-12 h-12 mx-auto mb-4 text-blue-500 animate-spin" />
          <p className="text-gray-400">Loading media...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-white">Album</h1>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-full font-medium hover:from-blue-600 hover:to-cyan-600 transition"
          >
            <Plus className="w-5 h-5" />
            <span>Add Media</span>
          </button>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400">
            {error}
          </div>
        )}

        {images.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-20 h-20 bg-gray-800/50 rounded-full flex items-center justify-center mx-auto mb-4">
              <Plus className="w-10 h-10 text-gray-600" />
            </div>
            <p className="text-gray-400 text-lg mb-2">No media yet</p>
            <p className="text-gray-500 text-sm">Click "Add Media" to upload your first photo or video</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {images.map((image) => (
              <div
                key={image.id}
                onClick={() => setSelectedImage(image)}
                className="relative group cursor-pointer aspect-square rounded-xl overflow-hidden bg-gray-800"
              >
                {image.file_type === 'image' ? (
                  <img
                    src={image.public_url}
                    alt={image.description || image.file_name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <video
                    src={image.public_url}
                    className="w-full h-full object-cover"
                  />
                )}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/60 transition flex items-center justify-center">
                  <div className="opacity-0 group-hover:opacity-100 transition text-white text-center p-4">
                    {image.description && (
                      <p className="text-sm font-medium mb-2">{image.description}</p>
                    )}
                    {image.location && (
                      <div className="flex items-center justify-center space-x-1 mb-1">
                        <MapPin className="w-4 h-4" />
                        <p className="text-xs">{image.location}</p>
                      </div>
                    )}
                    {image.taken_date && (
                      <div className="flex items-center justify-center space-x-1">
                        <Calendar className="w-4 h-4" />
                        <p className="text-xs text-gray-300">{image.taken_date}</p>
                      </div>
                    )}
                  </div>
                </div>
                {image.file_type === 'video' && (
                  <div className="absolute top-2 right-2 bg-black/70 backdrop-blur-sm px-2 py-1 rounded text-xs text-white">
                    VIDEO
                  </div>
                )}
                <div className="absolute bottom-2 right-2">
                  <UserBadge userId={image.user_id} size={20} />
                </div>
              </div>
            ))}
          </div>
        )}

        {selectedImage && (
          <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-gray-900 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden border border-gray-700">
              <div className="grid md:grid-cols-2 h-full">
                <div className="flex items-center justify-center relative bg-black">
                  {selectedImage.file_type === 'image' ? (
                    <img
                      src={selectedImage.public_url}
                      alt={selectedImage.description || selectedImage.file_name}
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <video
                      src={selectedImage.public_url}
                      controls
                      className="w-full h-full object-contain"
                    />
                  )}
                </div>

                <div className="p-6 flex flex-col max-h-[90vh] overflow-y-auto">
                  <div className="flex items-start justify-between mb-4 gap-4">
                    <div className="flex-1 min-w-0">
                      <h2 className="text-2xl font-bold text-white mb-2 break-words">
                        {selectedImage.description || selectedImage.file_name}
                      </h2>
                      <div className="flex flex-wrap items-center gap-4 text-sm text-gray-400">
                        {selectedImage.location && (
                          <div className="flex items-center space-x-1">
                            <MapPin className="w-4 h-4" />
                            <span>{selectedImage.location}</span>
                          </div>
                        )}
                        {selectedImage.taken_date && (
                          <div className="flex items-center space-x-1">
                            <Calendar className="w-4 h-4" />
                            <span>{selectedImage.taken_date}</span>
                          </div>
                        )}
                        <div className="flex items-center space-x-2">
                          <UserBadge userId={selectedImage.user_id} size={20} />
                          <span className="text-gray-400 text-sm">Added by</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 flex-shrink-0">
                      <button
                        onClick={() => setIsEditMode(!isEditMode)}
                        className="w-10 h-10 bg-blue-500/20 hover:bg-blue-500/30 rounded-full flex items-center justify-center transition"
                        title="Edit media"
                      >
                        <Pencil className="w-5 h-5 text-blue-400" />
                      </button>
                      <button
                        onClick={() => handleDeleteMedia(selectedImage.id, selectedImage.storage_path)}
                        className="w-10 h-10 bg-red-500/20 hover:bg-red-500/30 rounded-full flex items-center justify-center transition"
                        title="Delete media"
                      >
                        <Trash2 className="w-5 h-5 text-red-400" />
                      </button>
                      <button
                        onClick={() => {
                          setSelectedImage(null);
                          setIsEditMode(false);
                        }}
                        className="w-10 h-10 bg-gray-800 hover:bg-gray-700 rounded-full flex items-center justify-center transition"
                      >
                        <X className="w-5 h-5 text-white" />
                      </button>
                    </div>
                  </div>

                  {/* Edit Form */}
                  {isEditMode && (
                    <div className="border-t border-gray-700 pt-4 mb-4">
                      <h3 className="text-lg font-semibold text-white mb-4">Edit Details</h3>
                      <form onSubmit={handleUpdateMedia} className="space-y-4">
                        <div>
                          <label className="block mb-2 text-sm font-medium text-gray-300">
                            Description
                          </label>
                          <textarea
                            name="description"
                            defaultValue={selectedImage.description || ''}
                            placeholder="Add a description..."
                            className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            rows={3}
                          />
                        </div>

                        <div>
                          <label className="block mb-2 text-sm font-medium text-gray-300">
                            Location
                          </label>
                          <input
                            type="text"
                            name="location"
                            defaultValue={selectedImage.location || ''}
                            placeholder="Where was this taken?"
                            className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>

                        <div>
                          <label className="block mb-2 text-sm font-medium text-gray-300">
                            Date
                          </label>
                          <input
                            type="date"
                            name="taken_date"
                            defaultValue={selectedImage.taken_date || ''}
                            className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>

                        <div>
                          <label className="block mb-2 text-sm font-medium text-gray-300">
                            Added by
                          </label>
                          <input
                            type="text"
                            name="added_by"
                            defaultValue={selectedImage.added_by || ''}
                            placeholder="Who added this?"
                            className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>

                        <div className="flex gap-3">
                          <button
                            type="button"
                            onClick={() => setIsEditMode(false)}
                            className="flex-1 px-4 py-2 border border-gray-700 text-gray-300 rounded-lg hover:bg-gray-800 transition"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
                          >
                            Save Changes
                          </button>
                        </div>
                      </form>
                    </div>
                  )}

                  <div className="border-t border-gray-700 pt-4 flex-1">
                    <h3 className="text-lg font-semibold text-white mb-4 flex items-center space-x-2">
                      <MessageSquare className="w-5 h-5" />
                      <span>Comments</span>
                    </h3>

                    <div className="space-y-3 mb-4">
                      {selectedImage.comments && selectedImage.comments.length > 0 ? (
                        selectedImage.comments.map((comment) => (
                          <div
                            key={comment.id}
                            className="group bg-gray-800/50 rounded-lg p-3 border border-gray-700 flex items-start justify-between"
                          >
                            <p className="text-gray-300 text-sm flex-1">{comment.comment}</p>
                            <button
                              onClick={() => handleDeleteComment(comment.id)}
                              className="ml-2 p-1 text-gray-500 hover:text-red-400 transition opacity-0 group-hover:opacity-100"
                              title="Delete comment"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
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
                            handleAddComment();
                          }
                        }}
                      />
                      <button
                        onClick={handleAddComment}
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

        <UploadModal
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
          onUploadComplete={handleUploadComplete}
        />
      </div>
    </div>
  );
}
