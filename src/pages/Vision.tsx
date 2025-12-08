import { useState, useEffect, useRef } from 'react';
import {
  Plus,
  Image as ImageIcon,
  Type,
  List,
  X,
  MessageSquare,
  Check,
  Upload,
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Clock,
  Edit2,
  Trash2
} from 'lucide-react';
import Masonry from 'react-masonry-css';
import UserBadge from '../components/UserBadge';
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
  const [showEventModal, setShowEventModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<VisionItem | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [editingEvent, setEditingEvent] = useState<VisionItem | null>(null);

  // Vision board item states
  const [newItemType, setNewItemType] = useState<'text' | 'goal' | 'image'>('text');
  const [newItemTitle, setNewItemTitle] = useState('');
  const [newItemContent, setNewItemContent] = useState('');
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [comments, setComments] = useState<VisionComment[]>([]);
  const [newCommentText, setNewCommentText] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Calendar states
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [eventTitle, setEventTitle] = useState('');
  const [eventDescription, setEventDescription] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [eventType, setEventType] = useState<'goal' | 'event' | 'task'>('event');
  const [isAllDay, setIsAllDay] = useState(false);
  const [eventStartTime, setEventStartTime] = useState('09:00');
  const [eventEndTime, setEventEndTime] = useState('10:00');

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

  // Calendar helper functions
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    return { daysInMonth, startingDayOfWeek, firstDay, lastDay };
  };

  const getEventsForDate = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    return items.filter(item => item.event_date === dateStr);
  };

  const handlePreviousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
  };

  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
    setEventDate(date.toISOString().split('T')[0]);
    setEventType('event');
    setIsAllDay(false);
    setEventStartTime('09:00');
    setEventEndTime('10:00');
    setShowEventModal(true);
  };

  const handleAddEvent = async () => {
    if (!eventTitle.trim()) {
      alert('Please enter an event title');
      return;
    }

    try {
      if (editingEvent) {
        // Update existing event
        const updated = await updateVisionItem(editingEvent.id, {
          title: eventTitle,
          content: eventDescription || undefined,
          event_date: eventDate || null,
          event_type: eventType,
          is_all_day: isAllDay,
          event_start_time: isAllDay ? null : eventStartTime,
          event_end_time: isAllDay ? null : eventEndTime,
        });
        setItems(items.map(item => item.id === editingEvent.id ? updated : item));
      } else {
        // Create new event (as a goal type with event_date)
        const newEvent = await createVisionItem({
          type: 'goal',
          title: eventTitle,
          content: eventDescription || undefined,
          event_date: eventDate || null,
          event_type: eventType,
          is_all_day: isAllDay,
          event_start_time: isAllDay ? null : eventStartTime,
          event_end_time: isAllDay ? null : eventEndTime,
        });
        setItems([newEvent, ...items]);
      }

      setShowEventModal(false);
      resetEventForm();
    } catch (error) {
      console.error('Error saving event:', error);
    }
  };

  const handleEditEvent = (event: VisionItem, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingEvent(event);
    setEventTitle(event.title);
    setEventDescription(event.content || '');
    setEventDate(event.event_date || '');
    setEventType(event.event_type || 'event');
    setIsAllDay(event.is_all_day || false);
    setEventStartTime(event.event_start_time || '09:00');
    setEventEndTime(event.event_end_time || '10:00');
    setShowEventModal(true);
  };

  const handleDeleteEvent = async (event: VisionItem, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this event?')) return;

    try {
      await deleteVisionItem(event.id);
      setItems(items.filter(item => item.id !== event.id));
    } catch (error) {
      console.error('Error deleting event:', error);
    }
  };

  const resetEventForm = () => {
    setEventTitle('');
    setEventDescription('');
    setEventDate('');
    setEventType('event');
    setIsAllDay(false);
    setEventStartTime('09:00');
    setEventEndTime('10:00');
    setEditingEvent(null);
    setSelectedDate(null);
  };

  // Vision board functions
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
    default: 2,
    1536: 2,
    1024: 1,
    640: 1,
  };

  const { daysInMonth, startingDayOfWeek } = getDaysInMonth(currentMonth);
  const monthName = currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Filter items for vision board (items without event_date or can include all)
  const visionBoardItems = items.filter(item => !item.event_date);

  return (
    <div className="min-h-screen p-4 md:p-8 pt-20 md:pt-24">
      <div className="max-w-[1800px] mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-white">Vision & Calendar</h1>
        </div>

        {/* Split Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* LEFT: Calendar */}
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-700">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white flex items-center">
                <CalendarIcon className="w-6 h-6 mr-2" />
                Calendar
              </h2>
              <div className="flex items-center space-x-2">
                <button
                  onClick={handlePreviousMonth}
                  className="p-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition"
                >
                  <ChevronLeft className="w-5 h-5 text-white" />
                </button>
                <span className="text-white font-semibold min-w-[200px] text-center">{monthName}</span>
                <button
                  onClick={handleNextMonth}
                  className="p-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition"
                >
                  <ChevronRight className="w-5 h-5 text-white" />
                </button>
              </div>
            </div>

            {/* Calendar Grid */}
            <div className="bg-gray-900/50 rounded-xl p-4">
              {/* Week days header */}
              <div className="grid grid-cols-7 gap-2 mb-2">
                {weekDays.map(day => (
                  <div key={day} className="text-center text-gray-400 text-sm font-medium py-2">
                    {day}
                  </div>
                ))}
              </div>

              {/* Calendar days */}
              <div className="grid grid-cols-7 gap-2">
                {/* Empty cells for days before month starts */}
                {Array.from({ length: startingDayOfWeek }).map((_, i) => (
                  <div key={`empty-${i}`} className="aspect-square" />
                ))}

                {/* Days of the month */}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const day = i + 1;
                  const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
                  const events = getEventsForDate(date);
                  const isToday =
                    date.toDateString() === new Date().toDateString();

                  return (
                    <div
                      key={day}
                      onClick={() => handleDateClick(date)}
                      className={`aspect-square p-2 rounded-lg cursor-pointer transition ${
                        isToday
                          ? 'bg-blue-600 hover:bg-blue-700'
                          : 'bg-gray-800 hover:bg-gray-700'
                      }`}
                    >
                      <div className="flex flex-col h-full">
                        <span className={`text-sm font-medium ${isToday ? 'text-white' : 'text-gray-300'}`}>
                          {day}
                        </span>
                        {events.length > 0 && (
                          <div className="mt-1 flex-1 overflow-hidden">
                            {events.slice(0, 2).map((event, idx) => (
                              <div
                                key={event.id}
                                className="text-[10px] text-white bg-cyan-600 hover:bg-cyan-700 rounded px-1 py-0.5 mb-0.5 truncate cursor-pointer transition"
                                onClick={(e) => handleEditEvent(event, e)}
                              >
                                {event.title}
                              </div>
                            ))}
                            {events.length > 2 && (
                              <div className="text-[9px] text-gray-400">
                                +{events.length - 2} more
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Events List for Selected Date */}
            {selectedDate && (
              <div className="mt-6">
                <h3 className="text-lg font-bold text-white mb-3">
                  Events on {selectedDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}
                </h3>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {getEventsForDate(selectedDate).map(event => (
                    <div
                      key={event.id}
                      className="bg-gray-800 rounded-lg p-3 group flex items-center justify-between"
                    >
                      <div
                        className="flex-1 cursor-pointer"
                        onClick={() => openDetailModal(event)}
                      >
                        <h4 className="text-white font-medium">{event.title}</h4>
                        {event.content && (
                          <p className="text-gray-400 text-sm mt-1 line-clamp-1">{event.content}</p>
                        )}
                      </div>
                      <div className="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition">
                        <button
                          onClick={(e) => handleEditEvent(event, e)}
                          className="p-1 bg-blue-600 hover:bg-blue-700 rounded"
                        >
                          <Edit2 className="w-3 h-3 text-white" />
                        </button>
                        <button
                          onClick={(e) => handleDeleteEvent(event, e)}
                          className="p-1 bg-red-600 hover:bg-red-700 rounded"
                        >
                          <Trash2 className="w-3 h-3 text-white" />
                        </button>
                      </div>
                    </div>
                  ))}
                  {getEventsForDate(selectedDate).length === 0 && (
                    <p className="text-gray-400 text-sm italic">No events on this day</p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* RIGHT: Vision Board */}
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-700">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white">Vision Board</h2>
              <button
                onClick={() => setShowAddModal(true)}
                className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-lg font-medium hover:from-blue-700 hover:to-cyan-700 transition"
              >
                <Plus className="w-5 h-5" />
                <span>Add Item</span>
              </button>
            </div>

            {/* Vision Board Grid */}
            <div className="overflow-y-auto max-h-[calc(100vh-200px)]">
              <Masonry
                breakpointCols={breakpointColumnsObj}
                className="flex -ml-4 w-auto"
                columnClassName="pl-4 bg-clip-padding"
              >
                {visionBoardItems.map((item, index) => (
                  <div
                    key={item.id}
                    className="mb-4 group cursor-pointer"
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
                        <div className="absolute bottom-2 right-2">
                          <UserBadge userId={item.user_id} size={20} />
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
                        <div className={`${getCardColor(index)} p-3 rounded-lg shadow-lg transform transition-all duration-300 hover:scale-105 hover:shadow-xl`}>
                          <h3 className="text-white font-bold text-sm mb-1">{item.title}</h3>
                          {item.content && (
                            <p className="text-white/90 text-xs line-clamp-3">{item.content}</p>
                          )}
                        </div>
                        <div className="absolute bottom-2 right-2">
                          <UserBadge userId={item.user_id} size={20} />
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
                        <div className={`${getCardColor(index)} p-3 rounded-lg shadow-lg transform transition-all duration-300 hover:scale-105 hover:shadow-xl`}>
                          <div className="flex items-start space-x-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleToggleGoal(item.id, item.goal_completed);
                              }}
                              className={`w-4 h-4 rounded-full border-2 flex-shrink-0 mt-0.5 flex items-center justify-center transition ${
                                item.goal_completed
                                  ? 'bg-white border-white'
                                  : 'border-white bg-transparent hover:bg-white/20'
                              }`}
                            >
                              {item.goal_completed && <Check className="w-3 h-3 text-blue-600" />}
                            </button>
                            <div className="flex-1">
                              <h3 className={`text-white font-bold text-sm ${item.goal_completed ? 'line-through opacity-70' : ''}`}>
                                {item.title}
                              </h3>
                              {item.content && (
                                <p className={`text-white/90 text-xs mt-1 line-clamp-3 ${item.goal_completed ? 'line-through opacity-70' : ''}`}>
                                  {item.content}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="absolute bottom-2 right-2">
                          <UserBadge userId={item.user_id} size={20} />
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
            </div>
          </div>
        </div>

        {/* Add Event Modal */}
        {showEventModal && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 overflow-y-auto">
            <div className="min-h-screen px-4 flex items-center justify-center">
              <div className="bg-gray-900 rounded-2xl max-w-md w-full p-6 border border-gray-700 my-8">
              <h2 className="text-2xl font-bold text-white mb-4">
                {editingEvent ? 'Edit Event' : 'Add Event'}
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Event Title *
                  </label>
                  <input
                    type="text"
                    value={eventTitle}
                    onChange={(e) => setEventTitle(e.target.value)}
                    placeholder="e.g., Anniversary Dinner"
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Event Type *
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setEventType('goal')}
                      className={`px-4 py-2 rounded-lg font-medium transition ${
                        eventType === 'goal'
                          ? 'bg-purple-600 text-white'
                          : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                      }`}
                    >
                      Goal
                    </button>
                    <button
                      type="button"
                      onClick={() => setEventType('event')}
                      className={`px-4 py-2 rounded-lg font-medium transition ${
                        eventType === 'event'
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                      }`}
                    >
                      Event
                    </button>
                    <button
                      type="button"
                      onClick={() => setEventType('task')}
                      className={`px-4 py-2 rounded-lg font-medium transition ${
                        eventType === 'task'
                          ? 'bg-green-600 text-white'
                          : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                      }`}
                    >
                      Task
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Description
                  </label>
                  <textarea
                    value={eventDescription}
                    onChange={(e) => setEventDescription(e.target.value)}
                    placeholder="Add details about this event..."
                    rows={3}
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Date *
                  </label>
                  <input
                    type="date"
                    value={eventDate}
                    onChange={(e) => setEventDate(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="flex items-center space-x-2 mb-3">
                    <input
                      type="checkbox"
                      checked={isAllDay}
                      onChange={(e) => setIsAllDay(e.target.checked)}
                      className="w-4 h-4 rounded border-gray-600 bg-gray-800 text-blue-600 focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="text-sm font-medium text-gray-300">All Day Event</span>
                  </label>

                  {!isAllDay && (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">
                          From
                        </label>
                        <input
                          type="time"
                          value={eventStartTime}
                          onChange={(e) => setEventStartTime(e.target.value)}
                          className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">
                          To
                        </label>
                        <input
                          type="time"
                          value={eventEndTime}
                          onChange={(e) => setEventEndTime(e.target.value)}
                          className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex space-x-2 mt-6">
                <button
                  onClick={handleAddEvent}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-lg font-medium hover:from-blue-700 hover:to-cyan-700 transition"
                >
                  {editingEvent ? 'Update Event' : 'Add Event'}
                </button>
                {editingEvent && editingEvent.id && (
                  <button
                    onClick={() => {
                      if (confirm('Are you sure you want to delete this event?')) {
                        handleDeleteItem(editingEvent.id, null);
                        setShowEventModal(false);
                        setEditingEvent(null);
                      }
                    }}
                    className="px-4 py-3 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition flex items-center space-x-2"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Delete</span>
                  </button>
                )}
                <button
                  onClick={() => {
                    setShowEventModal(false);
                    resetEventForm();
                  }}
                  className="px-4 py-3 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition"
                >
                  Cancel
                </button>
              </div>
              </div>
            </div>
          </div>
        )}

        {/* Add Vision Item Modal */}
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
                  <div className="flex items-center space-x-2 flex-wrap">
                    <span className="inline-block px-3 py-1 bg-blue-600 text-white text-xs rounded-full">
                      {selectedItem.type.toUpperCase()}
                    </span>
                    {selectedItem.event_date && (
                      <span className="inline-block px-3 py-1 bg-green-600 text-white text-xs rounded-full flex items-center">
                        <CalendarIcon className="w-3 h-3 mr-1" />
                        {new Date(selectedItem.event_date).toLocaleDateString()}
                      </span>
                    )}
                    <div className="flex items-center space-x-2 px-3 py-1 bg-gray-800 rounded-full">
                      <UserBadge userId={selectedItem.user_id} size={18} />
                      <span className="text-gray-300 text-xs">Created by</span>
                    </div>
                  </div>
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
