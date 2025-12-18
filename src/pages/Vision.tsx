import { useState, useEffect, useRef, useMemo } from 'react';
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
  Trash2,
  Heart,
  Sparkles
} from 'lucide-react';
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
  const [showWishModal, setShowWishModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showEventModal, setShowEventModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<VisionItem | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [editingEvent, setEditingEvent] = useState<VisionItem | null>(null);

  // Vision board item states
  const [newItemType, setNewItemType] = useState<'text' | 'goal' | 'image'>('goal');
  const [newItemTitle, setNewItemTitle] = useState('');
  const [newItemContent, setNewItemContent] = useState('');
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [comments, setComments] = useState<VisionComment[]>([]);
  const [newCommentText, setNewCommentText] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isCreatingNewWish, setIsCreatingNewWish] = useState(false);
  const [completingItemId, setCompletingItemId] = useState<string | null>(null);

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

  // Helper function to calculate days until a date
  const getDaysUntil = (date: Date) => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const targetDate = new Date(date);
    targetDate.setHours(0, 0, 0, 0);
    const diff = targetDate.getTime() - now.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  // Calculate countdowns for header cards
  const countdowns = useMemo(() => {
    const eventsWithDates = items.filter(item => item.event_date);

    // Find next "travel" event (event_type === 'event' with keyword 'travel' or 'trip')
    const travelEvents = eventsWithDates.filter(item =>
      item.event_type === 'event' &&
      (item.title.toLowerCase().includes('travel') ||
       item.title.toLowerCase().includes('trip') ||
       item.title.toLowerCase().includes('reunion'))
    );
    const nextTravel = travelEvents
      .map(item => ({ item, days: getDaysUntil(new Date(item.event_date!)) }))
      .filter(({ days }) => days >= 0)
      .sort((a, b) => a.days - b.days)[0];

    // Placeholder for anniversary (can be configured later)
    const anniversaryDate = new Date(new Date().getFullYear(), 5, 15); // June 15th placeholder
    const anniversaryDays = getDaysUntil(anniversaryDate);

    // Placeholder for birthday (can be configured later)
    const birthdayDate = new Date(new Date().getFullYear(), 8, 20); // Sept 20th placeholder
    const birthdayDays = getDaysUntil(birthdayDate);

    return {
      reunion: nextTravel ? { days: nextTravel.days, item: nextTravel.item } : null,
      anniversary: anniversaryDays >= 0 ? anniversaryDays : anniversaryDays + 365,
      birthday: birthdayDays >= 0 ? birthdayDays : birthdayDays + 365,
    };
  }, [items]);

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
      setShowWishModal(false);
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

  const handleNudge = (itemId: string) => {
    console.log('Nudge interaction for item:', itemId);
    // Placeholder for future notification service integration
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
    setNewItemType('goal');
    setNewItemTitle('');
    setNewItemContent('');
    setUploadedImageUrl(null);
  };

  const { daysInMonth, startingDayOfWeek } = getDaysInMonth(currentMonth);
  const monthName = currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Filter items for vision board (items without event_date)
  const visionBoardItems = items.filter(item => !item.event_date && item.type === 'goal');
  const workingTowards = visionBoardItems.filter(item => !item.goal_completed);
  const accomplished = visionBoardItems.filter(item => item.goal_completed);

  return (
    <div className="min-h-screen p-3 md:p-4 pt-14 md:pt-16">
      <div className="max-w-5xl mx-auto">
        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-[580px_220px] gap-3">
          {/* Left: Calendar */}
          <div className="bg-gradient-to-br from-gray-900/90 to-gray-800/90 backdrop-blur-md rounded-xl p-2.5 border border-gray-700/50 shadow-2xl w-full max-w-[580px]">
            <div className="flex items-center justify-between mb-2.5">
              <h2 className="text-base font-bold text-white flex items-center">
                <CalendarIcon className="w-4 h-4 mr-1.5 text-cyan-400" />
                Sanctuary
              </h2>
              <div className="flex items-center space-x-1.5">
                <button
                  onClick={handlePreviousMonth}
                  className="p-1 bg-gray-800/80 hover:bg-gray-700/80 rounded-lg transition border border-gray-600/50"
                >
                  <ChevronLeft className="w-3.5 h-3.5 text-white" />
                </button>
                <span className="text-white text-xs font-semibold min-w-[120px] text-center">{monthName}</span>
                <button
                  onClick={handleNextMonth}
                  className="p-1 bg-gray-800/80 hover:bg-gray-700/80 rounded-lg transition border border-gray-600/50"
                >
                  <ChevronRight className="w-3.5 h-3.5 text-white" />
                </button>
              </div>
            </div>

            {/* Calendar Grid */}
            <div className="bg-black/20 rounded-lg p-1.5 border border-gray-700/30">
              {/* Week days header */}
              <div className="grid grid-cols-7 gap-0.5 mb-0.5">
                {weekDays.map(day => (
                  <div key={day} className="text-center text-gray-400 text-xs font-semibold py-1">
                    {day}
                  </div>
                ))}
              </div>

              {/* Calendar days */}
              <div className="grid grid-cols-7 gap-0.5">
                {/* Empty cells for days before month starts */}
                {Array.from({ length: startingDayOfWeek }).map((_, i) => (
                  <div key={`empty-${i}`} className="aspect-square" />
                ))}

                {/* Days of the month */}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const day = i + 1;
                  const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
                  const events = getEventsForDate(date);
                  const isToday = date.toDateString() === new Date().toDateString();
                  const hasEvents = events.length > 0;

                  return (
                    <div
                      key={day}
                      onClick={() => handleDateClick(date)}
                      className={`aspect-square p-1.5 rounded-lg cursor-pointer transition-all duration-200 ${
                        isToday
                          ? 'bg-gradient-to-br from-blue-600/40 to-cyan-600/40 border border-blue-500/50 shadow-[inset_0_0_20px_rgba(59,130,246,0.3)]'
                          : hasEvents
                          ? 'bg-gray-800/60 border border-gray-600/40 shadow-[inset_0_0_15px_rgba(6,182,212,0.2)]'
                          : 'bg-gray-800/40 border border-gray-700/30 hover:bg-gray-700/50'
                      }`}
                    >
                      <div className="flex flex-col h-full">
                        <span className={`text-xs font-semibold ${isToday ? 'text-white' : 'text-gray-300'}`}>
                          {day}
                        </span>
                        {events.length > 0 && (
                          <div className="mt-0.5 flex-1 overflow-hidden">
                            {events.slice(0, 2).map((event) => (
                              <div
                                key={event.id}
                                className="text-[9px] text-white bg-cyan-600/80 hover:bg-cyan-500 rounded px-0.5 py-0.5 mb-0.5 truncate cursor-pointer transition border border-cyan-400/30"
                                onClick={(e) => handleEditEvent(event, e)}
                              >
                                {event.title}
                              </div>
                            ))}
                            {events.length > 2 && (
                              <div className="text-[8px] text-cyan-400 font-medium">
                                +{events.length - 2}
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
              <div className="mt-2.5 bg-gray-900/50 rounded-xl p-2 border border-gray-700/40">
                <h3 className="text-xs font-bold text-white mb-1.5">
                  Events on {selectedDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}
                </h3>
                <div className="space-y-1.5 max-h-32 overflow-y-auto">
                  {getEventsForDate(selectedDate).map(event => (
                    <div
                      key={event.id}
                      className="bg-gray-800/70 rounded-lg p-2 group flex items-center justify-between border border-gray-700/50"
                    >
                      <div
                        className="flex-1 cursor-pointer"
                        onClick={() => openDetailModal(event)}
                      >
                        <h4 className="text-white text-xs font-semibold">{event.title}</h4>
                        {event.content && (
                          <p className="text-gray-400 text-[10px] mt-0.5 line-clamp-1">{event.content}</p>
                        )}
                      </div>
                      <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition">
                        <button
                          onClick={(e) => handleEditEvent(event, e)}
                          className="p-1 bg-blue-600 hover:bg-blue-700 rounded border border-blue-500/50"
                        >
                          <Edit2 className="w-3 h-3 text-white" />
                        </button>
                        <button
                          onClick={(e) => handleDeleteEvent(event, e)}
                          className="p-1 bg-red-600 hover:bg-red-700 rounded border border-red-500/50"
                        >
                          <Trash2 className="w-3 h-3 text-white" />
                        </button>
                      </div>
                    </div>
                  ))}
                  {getEventsForDate(selectedDate).length === 0 && (
                    <p className="text-gray-400 text-xs italic text-center py-2">No events on this day</p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Right: Countdown Cards Sidebar */}
          <div className="space-y-3">
            {/* Reunion Countdown */}
            <div className="bg-gradient-to-br from-gray-900/90 to-gray-800/90 backdrop-blur-md rounded-xl p-3 border border-gray-700/50 shadow-[0_0_15px_rgba(59,130,246,0.1)] hover:shadow-[0_0_25px_rgba(59,130,246,0.2)] transition-all duration-300">
              <div className="text-cyan-400 text-xs font-medium mb-1.5 flex items-center">
                <Sparkles className="w-3 h-3 mr-1" />
                Reunion
              </div>
              <div className="text-2xl font-bold text-white mb-1">
                {countdowns.reunion ? countdowns.reunion.days : '--'}
              </div>
              <div className="text-gray-400 text-xs">days</div>
            </div>

            {/* Anniversary Countdown */}
            <div className="bg-gradient-to-br from-gray-900/90 to-gray-800/90 backdrop-blur-md rounded-xl p-3 border border-gray-700/50 shadow-[0_0_15px_rgba(236,72,153,0.1)] hover:shadow-[0_0_25px_rgba(236,72,153,0.2)] transition-all duration-300">
              <div className="text-pink-400 text-xs font-medium mb-1.5 flex items-center">
                <Heart className="w-3 h-3 mr-1" />
                Anniversary
              </div>
              <div className="text-2xl font-bold text-white mb-1">
                {countdowns.anniversary}
              </div>
              <div className="text-gray-400 text-xs">days</div>
            </div>

            {/* Birthday Countdown */}
            <div className="bg-gradient-to-br from-gray-900/90 to-gray-800/90 backdrop-blur-md rounded-xl p-3 border border-gray-700/50 shadow-[0_0_15px_rgba(168,85,247,0.1)] hover:shadow-[0_0_25px_rgba(168,85,247,0.2)] transition-all duration-300">
              <div className="text-purple-400 text-xs font-medium mb-1.5 flex items-center">
                <CalendarIcon className="w-3 h-3 mr-1" />
                Birthday
              </div>
              <div className="text-2xl font-bold text-white mb-1">
                {countdowns.birthday}
              </div>
              <div className="text-gray-400 text-xs">days</div>
            </div>

            {/* Make a Wish Button */}
            <button
              onClick={() => setShowWishModal(true)}
              className="w-full bg-gradient-to-br from-blue-600/20 to-cyan-600/20 backdrop-blur-md rounded-xl p-3 border border-blue-500/30 shadow-[0_0_15px_rgba(59,130,246,0.15)] hover:shadow-[0_0_30px_rgba(59,130,246,0.3)] hover:scale-[1.02] transition-all duration-300 flex flex-col items-center justify-center group"
            >
              <Sparkles className="w-5 h-5 text-blue-400 mb-1.5 group-hover:text-cyan-300 transition-colors" />
              <span className="text-white text-xs font-semibold">Make a Wish</span>
            </button>
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

        {/* Make a Wish Modal - Polaroid Dream Vault */}
        {showWishModal && (
          <div className="fixed inset-0 bg-black/90 backdrop-blur-xl z-50 flex items-center justify-center p-4">
            <div className="bg-gradient-to-br from-gray-950/95 to-gray-900/95 backdrop-blur-md rounded-2xl max-w-6xl w-full border border-gray-700/50 shadow-2xl max-h-[90vh] overflow-hidden flex flex-col">
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-gray-700/30">
                <h2 className="text-3xl font-bold text-white flex items-center">
                  <Sparkles className="w-7 h-7 mr-3 text-cyan-400" />
                  Our Shared Dreams
                </h2>
                <button
                  onClick={() => {
                    setShowWishModal(false);
                    setIsCreatingNewWish(false);
                    resetForm();
                  }}
                  className="p-2 hover:bg-gray-800/50 rounded-lg transition text-gray-400 hover:text-white"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6">
                {/* Working Towards Section - Polaroid Grid */}
                <div className="mb-8">
                  <h3 className="text-xl font-bold text-white mb-4 flex items-center">
                    <Sparkles className="w-5 h-5 mr-2 text-cyan-400" />
                    Working Towards
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {/* Empty Slot - Add New Wish Card */}
                    {!isCreatingNewWish ? (
                      <button
                        onClick={() => setIsCreatingNewWish(true)}
                        className="group aspect-[3/4] rounded-lg border-2 border-dashed border-gray-600/50 hover:border-cyan-500/50 bg-gradient-to-br from-gray-900/40 to-gray-800/40 backdrop-blur-sm transition-all duration-300 hover:shadow-lg hover:shadow-cyan-500/10 flex flex-col items-center justify-center"
                      >
                        <Plus className="w-12 h-12 text-gray-600 group-hover:text-cyan-400 transition mb-3" />
                        <p className="text-gray-500 group-hover:text-cyan-400 font-medium transition">Add a dream...</p>
                      </button>
                    ) : (
                      <div className="aspect-[3/4] rounded-lg border border-gray-700/50 bg-gradient-to-br from-blue-950/40 via-gray-900/60 to-gray-950/40 backdrop-blur-sm p-4 flex flex-col shadow-lg shadow-blue-500/10">
                        <input
                          type="text"
                          value={newItemTitle}
                          onChange={(e) => setNewItemTitle(e.target.value)}
                          placeholder="Dream title..."
                          autoFocus
                          className="w-full px-3 py-2 bg-gray-800/80 border border-gray-600/50 rounded-lg text-white text-lg font-semibold placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 mb-3"
                        />
                        <textarea
                          value={newItemContent}
                          onChange={(e) => setNewItemContent(e.target.value)}
                          placeholder="Describe your dream..."
                          className="flex-1 w-full px-3 py-2 bg-gray-800/80 border border-gray-600/50 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 resize-none mb-3"
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              handleAddItem();
                              setIsCreatingNewWish(false);
                            }}
                            className="flex-1 px-3 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-lg font-medium hover:from-blue-700 hover:to-cyan-700 transition text-sm"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => {
                              setIsCreatingNewWish(false);
                              resetForm();
                            }}
                            className="px-3 py-2 bg-gray-700/80 hover:bg-gray-600/80 text-white rounded-lg transition text-sm"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Active Wishes - Polaroid Cards */}
                    {workingTowards.map((item) => (
                      <div
                        key={item.id}
                        className={`group aspect-[3/4] rounded-lg border border-gray-700/50 bg-gradient-to-br from-gray-900/90 via-gray-800/90 to-gray-900/90 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-300 hover:border-cyan-500/30 relative overflow-hidden ${
                          completingItemId === item.id ? 'animate-pulse' : ''
                        }`}
                      >
                        {/* Metallic border effect */}
                        <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-black/20 pointer-events-none rounded-lg" />

                        {/* Content */}
                        <div className="relative h-full p-5 flex flex-col">
                          {/* Title */}
                          <h4 className="text-white font-bold text-xl mb-3 line-clamp-2">{item.title}</h4>

                          {/* Description */}
                          {item.content && (
                            <p className="text-gray-300 text-sm mb-auto line-clamp-6 leading-relaxed">{item.content}</p>
                          )}

                          {/* Action Buttons */}
                          <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-700/30">
                            {/* Nudge Heart - Pulsing */}
                            <button
                              onClick={() => handleNudge(item.id)}
                              className="p-2 hover:bg-pink-600/20 rounded-full transition group/heart"
                              title="Nudge partner"
                            >
                              <Heart className="w-5 h-5 text-pink-400/70 hover:text-pink-400 group-hover/heart:animate-pulse transition" />
                            </button>

                            {/* Complete Checkmark */}
                            <button
                              onClick={async () => {
                                setCompletingItemId(item.id);
                                await handleToggleGoal(item.id, item.goal_completed);
                                setTimeout(() => setCompletingItemId(null), 600);
                              }}
                              className="p-2 bg-green-600/20 hover:bg-green-600/30 border border-green-500/30 rounded-full transition"
                              title="Mark as complete"
                            >
                              <Check className="w-5 h-5 text-green-400" />
                            </button>

                            {/* Delete (hidden, shows on hover) */}
                            <button
                              onClick={() => handleDeleteItem(item.id, null)}
                              className="p-2 opacity-0 group-hover:opacity-100 hover:bg-red-600/20 rounded-full transition"
                              title="Delete dream"
                            >
                              <X className="w-5 h-5 text-red-400" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Accomplished Section - Grayscale Polaroids */}
                <div>
                  <h3 className="text-xl font-bold text-white mb-4 flex items-center">
                    <Check className="w-5 h-5 mr-2 text-green-400" />
                    Shared Victories
                  </h3>
                  {accomplished.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {accomplished.map((item) => (
                        <div
                          key={item.id}
                          className="group aspect-[3/4] rounded-lg border border-gray-700/30 bg-gradient-to-br from-gray-900/60 via-gray-800/60 to-gray-900/60 backdrop-blur-sm shadow-lg grayscale opacity-70 hover:opacity-100 hover:grayscale-0 transition-all duration-500 relative overflow-hidden"
                        >
                          {/* Metallic border effect */}
                          <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-black/20 pointer-events-none rounded-lg" />

                          {/* Content */}
                          <div className="relative h-full p-5 flex flex-col">
                            {/* Title with strikethrough */}
                            <h4 className="text-white font-bold text-xl mb-3 line-clamp-2 line-through decoration-green-500/50">{item.title}</h4>

                            {/* Description */}
                            {item.content && (
                              <p className="text-gray-300 text-sm mb-auto line-clamp-6 leading-relaxed line-through decoration-green-500/30">{item.content}</p>
                            )}

                            {/* Completion Date */}
                            <div className="mt-4 pt-4 border-t border-gray-700/30 flex items-center justify-between">
                              <div className="flex items-center space-x-2 text-xs text-green-400/80">
                                <Check className="w-4 h-4" />
                                <span>Achieved {new Date(item.updated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                              </div>

                              {/* Delete (hidden, shows on hover) */}
                              <button
                                onClick={() => handleDeleteItem(item.id, null)}
                                className="p-2 opacity-0 group-hover:opacity-100 hover:bg-red-600/20 rounded-full transition"
                                title="Remove from history"
                              >
                                <X className="w-4 h-4 text-red-400" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-400 text-center py-12 italic text-sm">No shared victories yet. Complete a dream to celebrate together!</p>
                  )}
                </div>
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
