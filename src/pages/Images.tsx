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
    <div className="min-h-screen p-4 md:p-8 pt-20 md:pt-24">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">

          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-lg text-sm font-medium hover:from-blue-600 hover:to-cyan-600 transition"
          >
            <Plus className="w-4 h-4" />
            <span>Add Media</span>
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
            {error}
          </div>
        )}

        {images.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-800/50 rounded-full flex items-center justify-center mx-auto mb-3">
              <Plus className="w-8 h-8 text-gray-600" />
            </div>
            <p className="text-gray-400 text-base mb-1.5">No media yet</p>
            <p className="text-gray-500 text-xs">Click "Add Media" to upload your first photo or video</p>
          </div>
        ) : (
          <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">
            {images.map((image) => (
              <div
                key={image.id}
                onClick={() => setSelectedImage(image)}
                className="relative group cursor-pointer aspect-square rounded-lg overflow-hidden bg-gray-900"
              >
                {image.file_type === 'image' ? (
                  <img
                    src={image.public_url}
                    alt={image.description || image.file_name}
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <video
                    src={image.public_url}
                    className="w-full h-full object-contain"
                  />
                )}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/60 transition flex items-center justify-center">
                  <div className="opacity-0 group-hover:opacity-100 transition text-white text-center p-3">
                    {image.description && (
                      <p className="text-xs font-medium mb-1.5">{image.description}</p>
                    )}
                    {image.location && (
                      <div className="flex items-center justify-center space-x-0.5 mb-0.5">
                        <MapPin className="w-3 h-3" />
                        <p className="text-[10px]">{image.location}</p>
                      </div>
                    )}
                    {image.taken_date && (
                      <div className="flex items-center justify-center space-x-0.5">
                        <Calendar className="w-3 h-3" />
                        <p className="text-[10px] text-gray-300">{image.taken_date}</p>
                      </div>
                    )}
                  </div>
                </div>
                {image.file_type === 'video' && (
                  <div className="absolute top-1.5 right-1.5 bg-black/70 backdrop-blur-sm px-1.5 py-0.5 rounded text-[10px] text-white">
                    VIDEO
                  </div>
                )}
                <div className="absolute bottom-1.5 right-1.5">
                  <UserBadge userId={image.user_id} size={16} />
                </div>
              </div>
            ))}
          </div>
        )}

        {selectedImage && (
          <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-gray-900 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden border border-gray-700 flex flex-col">
              <div className="grid md:grid-cols-2 flex-1 min-h-0">
                <div className="flex items-center justify-center relative bg-black min-h-0">
                  {selectedImage.file_type === 'image' ? (
                    <img
                      src={selectedImage.public_url}
                      alt={selectedImage.description || selectedImage.file_name}
                      className="max-w-full max-h-full object-contain"
                    />
                  ) : (
                    <video
                      src={selectedImage.public_url}
                      controls
                      className="max-w-full max-h-full object-contain"
                    />
                  )}
                </div>

                <div className="p-4 flex flex-col overflow-y-auto overflow-x-hidden">
                  <div className="flex items-start gap-3 mb-3">
                    <div className="flex-1 min-w-0">
                      {isEditMode ? (
                        <input
                          type="text"
                          name="description"
                          form="edit-media-form"
                          defaultValue={selectedImage.description || selectedImage.file_name}
                          className="w-full text-base md:text-lg font-bold text-white mb-1.5 bg-gray-800 border border-blue-500 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Image title..."
                        />
                      ) : (
                        <h2 className="text-base md:text-lg font-bold text-white mb-1.5 break-words whitespace-normal" style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
                          {selectedImage.description || selectedImage.file_name}
                        </h2>
                      )}
                      <div className="flex flex-wrap items-center gap-2 text-xs text-gray-400">
                        {selectedImage.location && (
                          <div className="flex items-center space-x-0.5">
                            <MapPin className="w-3 h-3" />
                            <span>{selectedImage.location}</span>
                          </div>
                        )}
                        {selectedImage.taken_date && (
                          <div className="flex items-center space-x-0.5">
                            <Calendar className="w-3 h-3" />
                            <span>{selectedImage.taken_date}</span>
                          </div>
                        )}
                        <div className="flex items-center space-x-1.5">
                          <UserBadge userId={selectedImage.user_id} size={16} />
                          <span className="text-gray-400 text-xs">Added by</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-1.5 flex-shrink-0">
                      <button
                        onClick={() => setIsEditMode(!isEditMode)}
                        className="w-8 h-8 bg-blue-500/20 hover:bg-blue-500/30 rounded-full flex items-center justify-center transition"
                        title="Edit media"
                      >
                        <Pencil className="w-4 h-4 text-blue-400" />
                      </button>
                      <button
                        onClick={() => handleDeleteMedia(selectedImage.id, selectedImage.storage_path)}
                        className="w-8 h-8 bg-red-500/20 hover:bg-red-500/30 rounded-full flex items-center justify-center transition"
                        title="Delete media"
                      >
                        <Trash2 className="w-4 h-4 text-red-400" />
                      </button>
                      <button
                        onClick={() => {
                          setSelectedImage(null);
                          setIsEditMode(false);
                        }}
                        className="w-8 h-8 bg-gray-800 hover:bg-gray-700 rounded-full flex items-center justify-center transition"
                      >
                        <X className="w-4 h-4 text-white" />
                      </button>
                    </div>
                  </div>

                  {/* Edit Form */}
                  {isEditMode && (
                    <div className="border-t border-gray-700 pt-3 mb-3">
                      <h3 className="text-base font-semibold text-white mb-3">Edit Details</h3>
                      <form id="edit-media-form" onSubmit={handleUpdateMedia} className="space-y-3">

                        <div>
                          <label className="block mb-1.5 text-xs font-medium text-gray-300">
                            Location
                          </label>
                          <input
                            type="text"
                            name="location"
                            defaultValue={selectedImage.location || ''}
                            placeholder="Where was this taken?"
                            className="w-full px-3 py-1.5 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>

                        <div>
                          <label className="block mb-1.5 text-xs font-medium text-gray-300">
                            Date
                          </label>
                          <input
                            type="date"
                            name="taken_date"
                            defaultValue={selectedImage.taken_date || ''}
                            className="w-full px-3 py-1.5 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>

                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => setIsEditMode(false)}
                            className="flex-1 px-3 py-1.5 border border-gray-700 text-gray-300 rounded-lg text-xs hover:bg-gray-800 transition"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            className="flex-1 px-3 py-1.5 bg-blue-500 text-white rounded-lg text-xs hover:bg-blue-600 transition"
                          >
                            Save Changes
                          </button>
                        </div>
                      </form>
                    </div>
                  )}

                  <div className="border-t border-gray-700 pt-3 flex-1">
                    <h3 className="text-base font-semibold text-white mb-3 flex items-center space-x-1.5">
                      <MessageSquare className="w-4 h-4" />
                      <span>Comments</span>
                    </h3>

                    <div className="space-y-2 mb-3">
                      {selectedImage.comments && selectedImage.comments.length > 0 ? (
                        selectedImage.comments.map((comment) => (
                          <div
                            key={comment.id}
                            className="group bg-gray-800/50 rounded-lg p-2 border border-gray-700 flex items-start justify-between"
                          >
                            <p className="text-gray-300 text-xs flex-1">{comment.comment}</p>
                            <button
                              onClick={() => handleDeleteComment(comment.id)}
                              className="ml-2 p-0.5 text-gray-500 hover:text-red-400 transition opacity-0 group-hover:opacity-100"
                              title="Delete comment"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        ))
                      ) : (
                        <p className="text-gray-500 text-xs italic">No comments yet</p>
                      )}
                    </div>

                    <div className="flex space-x-1.5 mt-auto">
                      <input
                        type="text"
                        placeholder="Add a comment..."
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        className="flex-1 px-3 py-1.5 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleAddComment();
                          }
                        }}
                      />
                      <button
                        onClick={handleAddComment}
                        className="px-4 py-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-xs transition"
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
