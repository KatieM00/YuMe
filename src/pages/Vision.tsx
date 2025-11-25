import { useState, useEffect, useRef } from 'react';
import { Plus, Image as ImageIcon, Type, List, X, MessageSquare, Check, Upload } from 'lucide-react';
import Masonry from 'react-masonry-css';
import {
  VisionItem,
  VisionComment,
  getAllVisionItems,
  createVisionItem,
  updateVisionItem,
  deleteVisionItem,
  toggleGoalCompletion,
  getCommentsByVisionItemId,
  createComment,
  deleteComment,
  uploadVisionImage,
  deleteVisionImage,
} from '../lib/visionService';

export default function Vision() {
  const [items, setItems] = useState<VisionItem[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<VisionItem | null>(null);
  const [newItemType, setNewItemType] = useState<'text' | 'goal' | 'image'>('text');
  const [newItemTitle, setNewItemTitle] = useState('');
  const [newItemContent, setNewItemContent] = useState('');
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [comments, setComments] = useState<VisionComment[]>([]);
  const [newCommentText, setNewCommentText] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load vision items on mount
  useEffect(() => {
    loadItems();
  }, []);

  const loadItems = async () => {
    try {
      const data = await getAllVisionItems();
      setItems(data);
    } catch (error) {
      console.error('Error loading vision items:', error);
    }
  };

  const loadComments = async (itemId: string) => {
    try {
      const data = await getCommentsByVisionItemId(itemId);
      setComments(data);
    } catch (error) {
      console.error('Error loading comments:', error);
    }
  };

  const handleAddItem = async () => {
    if (newItemType === 'image' && !uploadedImageUrl) {
      alert('Please upload an image first');
      return;
    }
    if (newItemType !== 'image' && !newItemTitle.trim()) {
      alert('Please enter a title');
      return;
    }

    try {
      const newItem = await createVisionItem({
        type: newItemType,
        title: newItemTitle,
        content: newItemContent || undefined,
        image_url: uploadedImageUrl || undefined,
      });
      setItems([newItem, ...items]);
      setShowAddModal(false);
      resetForm();
    } catch (error) {
      console.error('Error creating vision item:', error);
    }
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const url = await uploadVisionImage(file);
      setUploadedImageUrl(url);
    } catch (error) {
      console.error('Error uploading image:', error);
      alert('Failed to upload image. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteItem = async (id: string, imageUrl: string | null) => {
    if (!confirm('Are you sure you want to delete this item?')) return;

    try {
      // Delete image from storage if exists
      if (imageUrl) {
        await deleteVisionImage(imageUrl);
      }
      await deleteVisionItem(id);
      setItems(items.filter((item) => item.id !== id));
      if (selectedItem?.id === id) {
        setShowDetailModal(false);
        setSelectedItem(null);
      }
    } catch (error) {
      console.error('Error deleting vision item:', error);
    }
  };

  const handleToggleGoal = async (id: string, currentStatus: boolean) => {
    try {
      const updated = await toggleGoalCompletion(id, !currentStatus);
      setItems(items.map((item) => (item.id === id ? updated : item)));
      if (selectedItem?.id === id) {
        setSelectedItem(updated);
      }
    } catch (error) {
      console.error('Error toggling goal:', error);
    }
  };

  const handleAddComment = async () => {
    if (!selectedItem || !newCommentText.trim()) return;

    try {
      const comment = await createComment(selectedItem.id, newCommentText);
      setComments([...comments, comment]);
      setNewCommentText('');
    } catch (error) {
      console.error('Error adding comment:', error);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    try {
      await deleteComment(commentId);
      setComments(comments.filter((c) => c.id !== commentId));
    } catch (error) {
      console.error('Error deleting comment:', error);
    }
  };

  const openDetailModal = (item: VisionItem) => {
    setSelectedItem(item);
    loadComments(item.id);
    setShowDetailModal(true);
  };

  const resetForm = () => {
    setNewItemType('text');
    setNewItemTitle('');
    setNewItemContent('');
    setUploadedImageUrl(null);
  };

  const getCardColor = (index: number) => {
    const colors = [
      'bg-gradient-to-br from-blue-600 to-cyan-600',
      'bg-gradient-to-br from-cyan-600 to-teal-600',
      'bg-gradient-to-br from-slate-600 to-blue-600',
      'bg-gradient-to-br from-gray-600 to-slate-600',
      'bg-gradient-to-br from-blue-700 to-indigo-700',
    ];
    return colors[index % colors.length];
  };

  const breakpointColumnsObj = {
    default: 4,
    1536: 3,
    1024: 2,
    640: 1,
  };

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-white">Vision Board</h1>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-lg font-medium hover:from-blue-700 hover:to-cyan-700 transition"
          >
            <Plus className="w-5 h-5" />
            <span>Add Item</span>
          </button>
        </div>

        {/* Masonry Grid */}
        <Masonry
          breakpointCols={breakpointColumnsObj}
          className="flex -ml-6 w-auto"
          columnClassName="pl-6 bg-clip-padding"
        >
          {items.map((item, index) => (
            <div
              key={item.id}
              className="mb-6 group cursor-pointer"
              onClick={() => openDetailModal(item)}
            >
              {item.type === 'image' && (
                <div className="relative overflow-hidden rounded-xl shadow-2xl transform transition-all duration-300 hover:scale-105 hover:shadow-3xl">
                  <img
                    src={item.image_url || ''}
                    alt={item.title}
                    className="w-full h-auto object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="absolute bottom-0 left-0 right-0 p-4">
                      <h3 className="text-white font-semibold text-lg">{item.title}</h3>
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteItem(item.id, item.image_url);
                    }}
                    className="absolute top-2 right-2 w-8 h-8 bg-red-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
                  >
                    <X className="w-4 h-4 text-white" />
                  </button>
                </div>
              )}

              {item.type === 'text' && (
                <div className="relative">
                  <div className={`${getCardColor(index)} p-6 rounded-xl shadow-2xl transform transition-all duration-300 hover:scale-105 hover:shadow-3xl`}>
                    <h3 className="text-white font-bold text-lg mb-2">{item.title}</h3>
                    {item.content && (
                      <p className="text-white/90 text-sm line-clamp-4">{item.content}</p>
                    )}
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteItem(item.id, null);
                    }}
                    className="absolute top-2 right-2 w-8 h-8 bg-red-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
                  >
                    <X className="w-4 h-4 text-white" />
                  </button>
                </div>
              )}

              {item.type === 'goal' && (
                <div className="relative">
                  <div className={`${getCardColor(index)} p-6 rounded-xl shadow-2xl transform transition-all duration-300 hover:scale-105 hover:shadow-3xl`}>
                    <div className="flex items-start space-x-3">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleGoal(item.id, item.goal_completed);
                        }}
                        className={`w-6 h-6 rounded-full border-2 flex-shrink-0 mt-0.5 flex items-center justify-center transition ${
                          item.goal_completed
                            ? 'bg-white border-white'
                            : 'border-white bg-transparent hover:bg-white/20'
                        }`}
                      >
                        {item.goal_completed && <Check className="w-4 h-4 text-blue-600" />}
                      </button>
                      <div className="flex-1">
                        <h3 className={`text-white font-bold text-lg ${item.goal_completed ? 'line-through opacity-70' : ''}`}>
                          {item.title}
                        </h3>
                        {item.content && (
                          <p className={`text-white/90 text-sm mt-2 line-clamp-4 ${item.goal_completed ? 'line-through opacity-70' : ''}`}>
                            {item.content}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteItem(item.id, null);
                    }}
                    className="absolute top-2 right-2 w-8 h-8 bg-red-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
                  >
                    <X className="w-4 h-4 text-white" />
                  </button>
                </div>
              )}
            </div>
          ))}
        </Masonry>

        {/* Add Item Modal */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-gray-900 rounded-2xl max-w-md w-full p-6 border border-gray-700">
              <h2 className="text-2xl font-bold text-white mb-4">Add to Vision Board</h2>

              {/* Type Selector */}
              <div className="flex space-x-2 mb-4">
                <button
                  onClick={() => setNewItemType('image')}
                  className={`flex-1 flex flex-col items-center justify-center py-4 rounded-lg transition ${
                    newItemType === 'image'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                  }`}
                >
                  <ImageIcon className="w-6 h-6 mb-1" />
                  <span className="text-sm">Image</span>
                </button>
                <button
                  onClick={() => setNewItemType('text')}
                  className={`flex-1 flex flex-col items-center justify-center py-4 rounded-lg transition ${
                    newItemType === 'text'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                  }`}
                >
                  <Type className="w-6 h-6 mb-1" />
                  <span className="text-sm">Text</span>
                </button>
                <button
                  onClick={() => setNewItemType('goal')}
                  className={`flex-1 flex flex-col items-center justify-center py-4 rounded-lg transition ${
                    newItemType === 'goal'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                  }`}
                >
                  <List className="w-6 h-6 mb-1" />
                  <span className="text-sm">Goal</span>
                </button>
              </div>

              {/* Image Upload */}
              {newItemType === 'image' && (
                <>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-gray-700 rounded-xl p-8 text-center hover:border-blue-500 transition cursor-pointer mb-4"
                  >
                    {isUploading ? (
                      <p className="text-blue-400">Uploading...</p>
                    ) : uploadedImageUrl ? (
                      <div>
                        <img src={uploadedImageUrl} alt="Preview" className="max-h-40 mx-auto mb-2 rounded" />
                        <p className="text-green-400 text-sm">Image uploaded!</p>
                      </div>
                    ) : (
                      <>
                        <Upload className="w-12 h-12 text-gray-600 mx-auto mb-2" />
                        <p className="text-gray-400">Click to upload image</p>
                        <p className="text-gray-600 text-sm mt-1">Max 5MB</p>
                      </>
                    )}
                  </div>
                  <input
                    type="text"
                    value={newItemTitle}
                    onChange={(e) => setNewItemTitle(e.target.value)}
                    placeholder="Image title..."
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
                  />
                </>
              )}

              {/* Text/Goal Input */}
              {newItemType !== 'image' && (
                <>
                  <input
                    type="text"
                    value={newItemTitle}
                    onChange={(e) => setNewItemTitle(e.target.value)}
                    placeholder={newItemType === 'goal' ? 'Goal title...' : 'Text title...'}
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
                  />
                  <textarea
                    value={newItemContent}
                    onChange={(e) => setNewItemContent(e.target.value)}
                    placeholder={newItemType === 'goal' ? 'Goal description (optional)...' : 'Text content (optional)...'}
                    className="w-full h-32 px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none mb-4"
                  />
                </>
              )}

              {/* Action Buttons */}
              <div className="flex space-x-2">
                <button
                  onClick={handleAddItem}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-lg font-medium hover:from-blue-700 hover:to-cyan-700 transition"
                >
                  Add
                </button>
                <button
                  onClick={() => {
                    setShowAddModal(false);
                    resetForm();
                  }}
                  className="px-4 py-3 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Detail Modal */}
        {showDetailModal && selectedItem && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-gray-900 rounded-2xl max-w-2xl w-full p-6 border border-gray-700 my-8">
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h2 className="text-2xl font-bold text-white mb-2">{selectedItem.title}</h2>
                  <span className="inline-block px-3 py-1 bg-blue-600 text-white text-xs rounded-full">
                    {selectedItem.type.toUpperCase()}
                  </span>
                </div>
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="text-gray-400 hover:text-white transition"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Content */}
              <div className="mb-6">
                {selectedItem.type === 'image' && selectedItem.image_url && (
                  <img
                    src={selectedItem.image_url}
                    alt={selectedItem.title}
                    className="w-full h-auto rounded-lg mb-4"
                  />
                )}
                {selectedItem.content && (
                  <p className="text-gray-300 leading-relaxed">{selectedItem.content}</p>
                )}
                {selectedItem.type === 'goal' && (
                  <div className="mt-4">
                    <button
                      onClick={() => handleToggleGoal(selectedItem.id, selectedItem.goal_completed)}
                      className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition ${
                        selectedItem.goal_completed
                          ? 'bg-green-600 hover:bg-green-700'
                          : 'bg-gray-700 hover:bg-gray-600'
                      }`}
                    >
                      <Check className="w-5 h-5 text-white" />
                      <span className="text-white">
                        {selectedItem.goal_completed ? 'Completed' : 'Mark as Complete'}
                      </span>
                    </button>
                  </div>
                )}
              </div>

              {/* Comments Section */}
              <div className="border-t border-gray-700 pt-6">
                <h3 className="text-xl font-bold text-white mb-4 flex items-center">
                  <MessageSquare className="w-5 h-5 mr-2" />
                  Comments ({comments.length})
                </h3>

                {/* Comments List */}
                <div className="space-y-3 mb-4 max-h-60 overflow-y-auto">
                  {comments.map((comment) => (
                    <div key={comment.id} className="bg-gray-800 rounded-lg p-3 group">
                      <div className="flex items-start justify-between">
                        <p className="text-gray-300 text-sm flex-1">{comment.comment_text}</p>
                        <button
                          onClick={() => handleDeleteComment(comment.id)}
                          className="opacity-0 group-hover:opacity-100 transition"
                        >
                          <X className="w-4 h-4 text-red-400" />
                        </button>
                      </div>
                      <p className="text-gray-500 text-xs mt-1">
                        {new Date(comment.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Add Comment */}
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={newCommentText}
                    onChange={(e) => setNewCommentText(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleAddComment()}
                    placeholder="Add a comment..."
                    className="flex-1 px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    onClick={handleAddComment}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition"
                  >
                    Send
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
