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
import { getCurrentUserProfile, type UserProfile } from '../lib/partnerService';

export default function Vision() {
  const [items, setItems] = useState<VisionItem[]>([]);
  const [profile, setProfile] = useState<UserProfile | null>(null);
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
  const [editingWishId, setEditingWishId] = useState<string | null>(null);
  const [editingWishTitle, setEditingWishTitle] = useState('');
  const [editingWishContent, setEditingWishContent] = useState('');
  const [expandedWishId, setExpandedWishId] = useState<string | null>(null);

  // Delete confirmation modal state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{ id: string; imageUrl: string | null } | null>(null);

  // Refs for horizontal scroll navigation
  const workingTowardsScrollRef = useRef<HTMLDivElement>(null);
  const accomplishedScrollRef = useRef<HTMLDivElement>(null);

  // Calendar states
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [eventTitle, setEventTitle] = useState('');
  const [eventDescription, setEventDescription] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [eventType, setEventType] = useState<'goal' | 'event' | 'task' | 'reunion'>('event');
  const [isAllDay, setIsAllDay] = useState(false);
  const [eventStartTime, setEventStartTime] = useState('09:00');
  const [eventEndTime, setEventEndTime] = useState('10:00');

  // Load vision items and profile on mount
  useEffect(() => {
    loadItems();
    loadProfile();
  }, []);

  const loadItems = async () => {
    try {
      const data = await getAllVisionItems();
      setItems(data);
    } catch (error) {
      console.error('Error loading vision items:', error);
    }
  };

  const loadProfile = async () => {
    try {
      const userProfile = await getCurrentUserProfile();
      setProfile(userProfile);
    } catch (error) {
      console.error('Error loading profile:', error);
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

    // Find next "reunion" event (event_type === 'reunion')
    const reunionEvents = eventsWithDates.filter(item =>
      item.event_type === 'reunion'
    );
    const nextReunion = reunionEvents
      .map(item => ({ item, days: getDaysUntil(new Date(item.event_date!)) }))
      .filter(({ days }) => days >= 0)
      .sort((a, b) => a.days - b.days)[0];

    // Anniversary from profile (calculate next occurrence)
    let anniversaryDays: number | null = null;
    if (profile?.anniversary_date) {
      const anniversaryDateParsed = new Date(profile.anniversary_date);
      const currentYear = new Date().getFullYear();
      let nextAnniversary = new Date(currentYear, anniversaryDateParsed.getMonth(), anniversaryDateParsed.getDate());
      let days = getDaysUntil(nextAnniversary);

      // If this year's anniversary has passed, use next year's
      if (days < 0) {
        nextAnniversary = new Date(currentYear + 1, anniversaryDateParsed.getMonth(), anniversaryDateParsed.getDate());
        days = getDaysUntil(nextAnniversary);
      }
      anniversaryDays = days;
    }

    // Birthday from profile (calculate next occurrence)
    let birthdayDays: number | null = null;
    if (profile?.birthday_date) {
      const birthdayDateParsed = new Date(profile.birthday_date);
      const currentYear = new Date().getFullYear();
      let nextBirthday = new Date(currentYear, birthdayDateParsed.getMonth(), birthdayDateParsed.getDate());
      let days = getDaysUntil(nextBirthday);

      // If this year's birthday has passed, use next year's
      if (days < 0) {
        nextBirthday = new Date(currentYear + 1, birthdayDateParsed.getMonth(), birthdayDateParsed.getDate());
        days = getDaysUntil(nextBirthday);
      }
      birthdayDays = days;
    }

    return {
      reunion: nextReunion ? { days: nextReunion.days, item: nextReunion.item } : null,
      anniversary: anniversaryDays,
      birthday: birthdayDays,
    };
  }, [items, profile]);

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
    const regularEvents = items.filter(item => item.event_date === dateStr);

    // Check if this date matches Birthday or Anniversary
    const specialEvents: Array<VisionItem & { specialType?: 'birthday' | 'anniversary' }> = [];

    // Check Birthday
    if (profile?.birthday_date) {
      const birthdayDate = new Date(profile.birthday_date);
      const currentYear = date.getFullYear();
      const nextBirthday = new Date(currentYear, birthdayDate.getMonth(), birthdayDate.getDate());

      if (nextBirthday.toISOString().split('T')[0] === dateStr) {
        specialEvents.push({
          id: 'birthday-' + dateStr,
          user_id: profile.id,
          type: 'goal',
          title: 'Birthday',
          content: null,
          image_url: null,
          goal_completed: false,
          event_date: dateStr,
          event_type: 'event',
          is_all_day: true,
          event_start_time: null,
          event_end_time: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          specialType: 'birthday'
        });
      }
    }

    // Check Anniversary
    if (profile?.anniversary_date) {
      const anniversaryDate = new Date(profile.anniversary_date);
      const currentYear = date.getFullYear();
      const nextAnniversary = new Date(currentYear, anniversaryDate.getMonth(), anniversaryDate.getDate());

      if (nextAnniversary.toISOString().split('T')[0] === dateStr) {
        specialEvents.push({
          id: 'anniversary-' + dateStr,
          user_id: profile.id,
          type: 'goal',
          title: 'Anniversary',
          content: null,
          image_url: null,
          goal_completed: false,
          event_date: dateStr,
          event_type: 'event',
          is_all_day: true,
          event_start_time: null,
          event_end_time: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          specialType: 'anniversary'
        });
      }
    }

    return [...specialEvents, ...regularEvents];
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
    setShowDeleteConfirm(true);
    setItemToDelete({ id: event.id, imageUrl: null });
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
    setShowDeleteConfirm(true);
    setItemToDelete({ id, imageUrl });
  };

  const confirmDelete = async () => {
    if (!itemToDelete) return;

    try {
      if (itemToDelete.imageUrl) {
        await deleteVisionImage(itemToDelete.imageUrl);
      }
      await deleteVisionItem(itemToDelete.id);
      setItems(items.filter((item) => item.id !== itemToDelete.id));
      if (selectedItem?.id === itemToDelete.id) {
        setShowDetailModal(false);
        setSelectedItem(null);
      }
      setShowDeleteConfirm(false);
      setItemToDelete(null);
    } catch (error) {
      console.error('Error deleting vision item:', error);
      setShowDeleteConfirm(false);
      setItemToDelete(null);
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
    setNewItemType('goal');
    setNewItemTitle('');
    setNewItemContent('');
    setUploadedImageUrl(null);
  };

  const handleEditWish = (item: VisionItem) => {
    setEditingWishId(item.id);
    setEditingWishTitle(item.title);
    setEditingWishContent(item.content || '');
  };

  const handleSaveWishEdit = async () => {
    if (!editingWishId || !editingWishTitle.trim()) {
      return;
    }

    try {
      const updated = await updateVisionItem(editingWishId, {
        title: editingWishTitle,
        content: editingWishContent || undefined,
      });
      setItems(items.map((item) => (item.id === editingWishId ? updated : item)));
      setEditingWishId(null);
      setEditingWishTitle('');
      setEditingWishContent('');
    } catch (error) {
      console.error('Error updating wish:', error);
    }
  };

  const handleCancelWishEdit = () => {
    setEditingWishId(null);
    setEditingWishTitle('');
    setEditingWishContent('');
  };

  // Scroll navigation handlers
  const scrollCards = (ref: React.RefObject<HTMLDivElement>, direction: 'left' | 'right') => {
    if (ref.current) {
      const scrollAmount = 200; // Approximately one card width (190px) + gap
      ref.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  const { daysInMonth, startingDayOfWeek } = getDaysInMonth(currentMonth);
  const monthName = currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Filter items for vision board (items without event_date)
  const visionBoardItems = items.filter(item => !item.event_date && item.type === 'goal');
  const workingTowards = visionBoardItems.filter(item => !item.goal_completed);
  const accomplished = visionBoardItems.filter(item => item.goal_completed);

  return (
    <div className="min-h-screen p-3 md:p-4 pt-20 md:pt-20">
      <div className="max-w-7xl mx-auto flex justify-center">
        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-[auto_1fr] gap-3">
          {/* Left: Countdown Cards Sidebar - Full Height */}
          <div className="flex flex-col justify-between h-full min-w-[220px] gap-3">
            {/* Reunion Countdown */}
            <div className="flex-1 bg-gradient-to-br from-gray-900/90 to-gray-800/90 backdrop-blur-md rounded-xl p-3 border border-gray-700/50 shadow-[0_0_15px_rgba(59,130,246,0.1)] hover:shadow-[0_0_25px_rgba(59,130,246,0.2)] transition-all duration-300 flex flex-col justify-center">
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
            <div className="flex-1 bg-gradient-to-br from-gray-900/90 to-gray-800/90 backdrop-blur-md rounded-xl p-3 border border-gray-700/50 shadow-[0_0_15px_rgba(236,72,153,0.1)] hover:shadow-[0_0_25px_rgba(236,72,153,0.2)] transition-all duration-300 flex flex-col justify-center">
              <div className="text-pink-400 text-xs font-medium mb-1.5 flex items-center">
                <Heart className="w-3 h-3 mr-1" />
                Anniversary
              </div>
              <div className="text-2xl font-bold text-white mb-1">
                {countdowns.anniversary !== null ? countdowns.anniversary : '--'}
              </div>
              <div className="text-gray-400 text-xs">days</div>
            </div>

            {/* Birthday Countdown */}
            <div className="flex-1 bg-gradient-to-br from-gray-900/90 to-gray-800/90 backdrop-blur-md rounded-xl p-3 border border-gray-700/50 shadow-[0_0_15px_rgba(168,85,247,0.1)] hover:shadow-[0_0_25px_rgba(168,85,247,0.2)] transition-all duration-300 flex flex-col justify-center">
              <div className="text-purple-400 text-xs font-medium mb-1.5 flex items-center">
                <CalendarIcon className="w-3 h-3 mr-1" />
                Birthday
              </div>
              <div className="text-2xl font-bold text-white mb-1">
                {countdowns.birthday !== null ? countdowns.birthday : '--'}
              </div>
              <div className="text-gray-400 text-xs">days</div>
            </div>

            {/* Make a Wish Button */}
            <button
              onClick={() => setShowWishModal(true)}
              className="flex-1 bg-gradient-to-br from-blue-600/20 to-cyan-600/20 backdrop-blur-md rounded-xl p-3 border border-blue-500/30 shadow-[0_0_15px_rgba(59,130,246,0.15)] hover:shadow-[0_0_30px_rgba(59,130,246,0.3)] hover:scale-[1.02] transition-all duration-300 flex flex-col items-center justify-center group"
            >
              <Sparkles className="w-5 h-5 text-blue-400 mb-1.5 group-hover:text-cyan-300 transition-colors" />
              <span className="text-white text-xs font-semibold">Make a Wish</span>
            </button>
          </div>

          {/* Right: Calendar */}
          <div className="bg-gradient-to-br from-gray-900/90 to-gray-800/90 backdrop-blur-md rounded-xl p-2 border border-gray-700/50 shadow-2xl w-full max-w-[500px]">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm font-bold text-white flex items-center">
                <CalendarIcon className="w-3.5 h-3.5 mr-1 text-cyan-400" />
                Sanctuary
              </h2>
              <div className="flex items-center space-x-1">
                <button
                  onClick={handlePreviousMonth}
                  className="p-0.5 bg-gray-800/80 hover:bg-gray-700/80 rounded transition border border-gray-600/50"
                >
                  <ChevronLeft className="w-3 h-3 text-white" />
                </button>
                <span className="text-white text-[10px] font-semibold min-w-[100px] text-center">{monthName}</span>
                <button
                  onClick={handleNextMonth}
                  className="p-0.5 bg-gray-800/80 hover:bg-gray-700/80 rounded transition border border-gray-600/50"
                >
                  <ChevronRight className="w-3 h-3 text-white" />
                </button>
              </div>
            </div>

            {/* Calendar Grid */}
            <div className="bg-black/20 rounded-lg p-1 border border-gray-700/30">
              {/* Week days header */}
              <div className="grid grid-cols-7 gap-0.5 mb-0.5">
                {weekDays.map(day => (
                  <div key={day} className="text-center text-gray-400 text-[10px] font-semibold py-0.5">
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
                      className={`aspect-square p-1 rounded cursor-pointer transition-all duration-200 ${
                        isToday
                          ? 'bg-gradient-to-br from-blue-600/40 to-cyan-600/40 border border-blue-500/50 shadow-[inset_0_0_20px_rgba(59,130,246,0.3)]'
                          : hasEvents
                          ? 'bg-gray-800/60 border border-gray-600/40 shadow-[inset_0_0_15px_rgba(6,182,212,0.2)]'
                          : 'bg-gray-800/40 border border-gray-700/30 hover:bg-gray-700/50'
                      }`}
                    >
                      <div className="flex flex-col h-full">
                        <span className={`text-[10px] font-semibold ${isToday ? 'text-white' : 'text-gray-300'}`}>
                          {day}
                        </span>
                        {events.length > 0 && (
                          <div className="mt-0.5 flex-1 overflow-hidden">
                            {events.slice(0, 1).map((event) => {
                              const specialEvent = event as VisionItem & { specialType?: 'birthday' | 'anniversary' };
                              const isBirthday = specialEvent.specialType === 'birthday';
                              const isAnniversary = specialEvent.specialType === 'anniversary';

                              return (
                                <div
                                  key={event.id}
                                  className={`text-[8px] text-white rounded px-0.5 py-0.5 truncate cursor-pointer transition ${
                                    isBirthday
                                      ? 'bg-purple-600/80 hover:bg-purple-500 border border-purple-400/30'
                                      : isAnniversary
                                      ? 'bg-pink-600/80 hover:bg-pink-500 border border-pink-400/30'
                                      : 'bg-cyan-600/80 hover:bg-cyan-500 border border-cyan-400/30'
                                  }`}
                                  onClick={(e) => {
                                    // Don't allow editing special events (Birthday/Anniversary)
                                    if (!isBirthday && !isAnniversary) {
                                      handleEditEvent(event, e);
                                    }
                                  }}
                                >
                                  {event.title}
                                </div>
                              );
                            })}
                            {events.length > 1 && (
                              <div className="text-[7px] text-cyan-400 font-medium mt-0.5">
                                +{events.length - 1}
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
              <div className="mt-2 bg-gray-900/50 rounded-xl p-1.5 border border-gray-700/40">
                <h3 className="text-[10px] font-bold text-white mb-1">
                  Events on {selectedDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}
                </h3>
                <div className="space-y-1 max-h-24 overflow-y-auto">
                  {getEventsForDate(selectedDate).map(event => {
                    const specialEvent = event as VisionItem & { specialType?: 'birthday' | 'anniversary' };
                    const isBirthday = specialEvent.specialType === 'birthday';
                    const isAnniversary = specialEvent.specialType === 'anniversary';
                    const isSpecialEvent = isBirthday || isAnniversary;

                    return (
                      <div
                        key={event.id}
                        className={`bg-gray-800/70 rounded-lg p-2 group flex items-center justify-between border ${
                          isBirthday
                            ? 'border-purple-500/50'
                            : isAnniversary
                            ? 'border-pink-500/50'
                            : 'border-gray-700/50'
                        }`}
                      >
                        <div
                          className="flex-1 cursor-pointer"
                          onClick={() => {
                            // Don't open detail modal for special events
                            if (!isSpecialEvent) {
                              openDetailModal(event);
                            }
                          }}
                        >
                          <h4 className={`text-xs font-semibold ${
                            isBirthday
                              ? 'text-purple-400'
                              : isAnniversary
                              ? 'text-pink-400'
                              : 'text-white'
                          }`}>{event.title}</h4>
                          {event.content && (
                            <p className="text-gray-400 text-[10px] mt-0.5 line-clamp-1">{event.content}</p>
                          )}
                        </div>
                        {!isSpecialEvent && (
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
                        )}
                      </div>
                    );
                  })}
                  {getEventsForDate(selectedDate).length === 0 && (
                    <p className="text-gray-400 text-xs italic text-center py-2">No events on this day</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Add/Edit Event Modal - Glass Tray */}
        {showEventModal && (
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-end md:items-center justify-center p-0 md:p-4"
            onClick={() => {
              setShowEventModal(false);
              resetEventForm();
            }}
          >
            {/* Mobile: Bottom Sheet | Desktop: Compact Glass Tray */}
            <div
              className="bg-slate-900/80 backdrop-blur-2xl rounded-t-2xl md:rounded-xl w-full md:max-w-xl border-t md:border border-white/10 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.1)] h-[70vh] md:h-auto md:max-h-[60vh] overflow-hidden flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Compact Header with Delete Icon */}
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/5 flex-shrink-0">
                <h2 className="text-sm md:text-base font-bold text-white">
                  {editingEvent ? 'Edit Event' : 'New Event'}
                </h2>
                <div className="flex items-center gap-2">
                  {/* Auto-save indicator (shown briefly after save) */}
                  <Check className="w-3.5 h-3.5 text-cyan-400 opacity-0" id="save-indicator" />
                  {/* Delete button (top-right, low opacity) */}
                  {editingEvent && editingEvent.id && (
                    <button
                      onClick={() => {
                        handleDeleteItem(editingEvent.id, null);
                        setShowEventModal(false);
                        setEditingEvent(null);
                      }}
                      className="p-1 hover:bg-red-500/10 rounded transition opacity-40 hover:opacity-100"
                      title="Delete event"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-red-400" />
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setShowEventModal(false);
                      resetEventForm();
                    }}
                    className="p-1 hover:bg-white/5 rounded transition text-gray-400 hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Two-Column Grid Form */}
              <div className="flex-1 overflow-y-auto px-4 py-3">
                <div className="grid md:grid-cols-2 gap-3">
                  {/* Left Column: Title & Description */}
                  <div className="space-y-3">
                    {/* Title with Floating Label */}
                    <div className="relative">
                      <input
                        type="text"
                        value={eventTitle}
                        onChange={(e) => setEventTitle(e.target.value)}
                        placeholder=" "
                        className="peer w-full px-3 py-2 bg-black/20 border border-white/10 rounded-lg text-white text-sm placeholder-transparent focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/30"
                      />
                      <label className="absolute left-3 -top-2 bg-slate-900 px-1 text-[10px] text-gray-400 peer-placeholder-shown:text-sm peer-placeholder-shown:top-2 peer-placeholder-shown:bg-transparent peer-focus:-top-2 peer-focus:text-[10px] peer-focus:text-cyan-400 peer-focus:bg-slate-900 transition-all">
                        Event Title *
                      </label>
                    </div>

                    {/* Description with Floating Label */}
                    <div className="relative">
                      <textarea
                        value={eventDescription}
                        onChange={(e) => setEventDescription(e.target.value)}
                        placeholder=" "
                        rows={4}
                        className="peer w-full px-3 py-2 bg-black/20 border border-white/10 rounded-lg text-white text-sm placeholder-transparent focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/30 resize-none"
                      />
                      <label className="absolute left-3 -top-2 bg-slate-900 px-1 text-[10px] text-gray-400 peer-placeholder-shown:text-sm peer-placeholder-shown:top-2 peer-placeholder-shown:bg-transparent peer-focus:-top-2 peer-focus:text-[10px] peer-focus:text-cyan-400 peer-focus:bg-slate-900 transition-all">
                        Description
                      </label>
                    </div>
                  </div>

                  {/* Right Column: Date, Type, Time */}
                  <div className="space-y-3">
                    {/* Date with Floating Label */}
                    <div className="relative">
                      <input
                        type="date"
                        value={eventDate}
                        onChange={(e) => setEventDate(e.target.value)}
                        className="peer w-full px-3 py-2 bg-black/20 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/30"
                      />
                      <label className="absolute left-3 -top-2 bg-slate-900 px-1 text-[10px] text-cyan-400">
                        Date *
                      </label>
                    </div>

                    {/* Type Selector - Compact Pills */}
                    <div>
                      <label className="block text-[10px] text-gray-400 mb-1.5">Type</label>
                      <div className="grid grid-cols-2 gap-1.5">
                        <button
                          type="button"
                          onClick={() => setEventType('goal')}
                          className={`px-2 py-1.5 rounded-md text-xs font-medium transition ${
                            eventType === 'goal'
                              ? 'bg-purple-600/80 text-white border border-purple-400/30'
                              : 'bg-black/20 text-gray-400 border border-white/5 hover:bg-black/30'
                          }`}
                        >
                          Goal
                        </button>
                        <button
                          type="button"
                          onClick={() => setEventType('event')}
                          className={`px-2 py-1.5 rounded-md text-xs font-medium transition ${
                            eventType === 'event'
                              ? 'bg-blue-600/80 text-white border border-blue-400/30'
                              : 'bg-black/20 text-gray-400 border border-white/5 hover:bg-black/30'
                          }`}
                        >
                          Event
                        </button>
                        <button
                          type="button"
                          onClick={() => setEventType('task')}
                          className={`px-2 py-1.5 rounded-md text-xs font-medium transition ${
                            eventType === 'task'
                              ? 'bg-green-600/80 text-white border border-green-400/30'
                              : 'bg-black/20 text-gray-400 border border-white/5 hover:bg-black/30'
                          }`}
                        >
                          Task
                        </button>
                        <button
                          type="button"
                          onClick={() => setEventType('reunion')}
                          className={`px-2 py-1.5 rounded-md text-xs font-medium transition ${
                            eventType === 'reunion'
                              ? 'bg-orange-600/80 text-white border border-orange-400/30'
                              : 'bg-black/20 text-gray-400 border border-white/5 hover:bg-black/30'
                          }`}
                        >
                          Reunion
                        </button>
                      </div>
                    </div>

                    {/* All Day Toggle - Compact */}
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isAllDay}
                        onChange={(e) => setIsAllDay(e.target.checked)}
                        className="w-3.5 h-3.5 rounded border-white/10 bg-black/20 text-cyan-600 focus:ring-1 focus:ring-cyan-500/30"
                      />
                      <span className="text-xs text-gray-400">All Day</span>
                    </label>

                    {/* Time Inputs - Compact Side by Side */}
                    {!isAllDay && (
                      <div className="grid grid-cols-2 gap-2">
                        <div className="relative">
                          <input
                            type="time"
                            value={eventStartTime}
                            onChange={(e) => setEventStartTime(e.target.value)}
                            className="w-full px-2 py-1.5 bg-black/20 border border-white/10 rounded-md text-white text-xs focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/30"
                          />
                          <label className="absolute left-2 -top-2 bg-slate-900 px-1 text-[9px] text-gray-400">
                            From
                          </label>
                        </div>
                        <div className="relative">
                          <input
                            type="time"
                            value={eventEndTime}
                            onChange={(e) => setEventEndTime(e.target.value)}
                            className="w-full px-2 py-1.5 bg-black/20 border border-white/10 rounded-md text-white text-xs focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/30"
                          />
                          <label className="absolute left-2 -top-2 bg-slate-900 px-1 text-[9px] text-gray-400">
                            To
                          </label>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Minimal Footer - Single Save Button */}
              <div className="px-4 py-2.5 border-t border-white/5 flex-shrink-0">
                <button
                  onClick={handleAddEvent}
                  className="w-full px-3 py-2 bg-gradient-to-r from-blue-600/90 to-cyan-600/90 hover:from-blue-600 hover:to-cyan-600 text-white text-sm font-medium rounded-lg transition shadow-lg shadow-cyan-500/10"
                >
                  {editingEvent ? 'Save Changes' : 'Create Event'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Make a Wish Modal - Netflix-Style Horizontal Scrolling */}
        {showWishModal && (
          <div
            className="fixed inset-0 bg-black/90 backdrop-blur-2xl z-50 flex items-end md:items-center justify-center p-0 md:p-4"
            onClick={() => {
              setShowWishModal(false);
              setIsCreatingNewWish(false);
              resetForm();
            }}
          >
            {/* Mobile: Bottom Sheet (85vh) | Desktop: Centered Modal (max-w-4xl, max-h-75vh) */}
            <div
              className="bg-gradient-to-br from-gray-950/98 to-gray-900/98 backdrop-blur-md rounded-t-2xl md:rounded-xl w-full md:max-w-4xl border-t md:border border-gray-700/50 shadow-2xl h-[85vh] md:h-auto md:max-h-[75vh] overflow-hidden flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Compact Header */}
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-700/30 flex-shrink-0">
                <h2 className="text-base md:text-lg font-bold text-white flex items-center">
                  <Sparkles className="w-3.5 md:w-4 h-3.5 md:h-4 mr-1.5 text-cyan-400" />
                  Our Shared Dreams
                </h2>
                <button
                  onClick={() => {
                    setShowWishModal(false);
                    setIsCreatingNewWish(false);
                    resetForm();
                  }}
                  className="p-1 hover:bg-gray-800/50 rounded-lg transition text-gray-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto px-3 md:px-4 py-3 space-y-4">
                {/* Working Towards Section - Horizontal Scroll */}
                <div className="relative">
                  <h3 className="text-xs md:text-sm font-bold text-white mb-2 flex items-center">
                    <Sparkles className="w-3 h-3 mr-1 text-cyan-400" />
                    Working Towards
                  </h3>

                  {/* Netflix-style Navigation Arrows - Overlay on scroll container */}
                  <button
                    onClick={() => scrollCards(workingTowardsScrollRef, 'left')}
                    className="hidden md:flex absolute left-0 top-1/2 -translate-y-1/2 z-10 w-10 h-full items-center justify-center bg-gradient-to-r from-black/60 to-transparent hover:from-black/80 transition-all opacity-0 hover:opacity-100 group-hover:opacity-100"
                    aria-label="Scroll left"
                  >
                    <ChevronLeft className="w-8 h-8 text-white drop-shadow-lg" />
                  </button>
                  <button
                    onClick={() => scrollCards(workingTowardsScrollRef, 'right')}
                    className="hidden md:flex absolute right-0 top-1/2 -translate-y-1/2 z-10 w-10 h-full items-center justify-center bg-gradient-to-l from-black/60 to-transparent hover:from-black/80 transition-all opacity-0 hover:opacity-100 group-hover:opacity-100"
                    aria-label="Scroll right"
                  >
                    <ChevronRight className="w-8 h-8 text-white drop-shadow-lg" />
                  </button>

                  <div ref={workingTowardsScrollRef} className="group flex overflow-x-auto snap-x snap-mandatory gap-2 pb-2 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent">
                    {/* Ghost Card - Add New Wish */}
                    {!isCreatingNewWish ? (
                      <button
                        onClick={() => setIsCreatingNewWish(true)}
                        className="group flex-shrink-0 w-[180px] md:w-[190px] h-[240px] md:h-[250px] snap-start rounded-lg border border-dashed border-gray-600/50 hover:border-cyan-500/50 bg-gradient-to-br from-gray-900/40 to-gray-800/40 backdrop-blur-sm transition-all duration-300 hover:shadow-lg hover:shadow-cyan-500/10 flex flex-col items-center justify-center"
                      >
                        <Plus className="w-7 h-7 text-gray-600 group-hover:text-cyan-400 transition mb-1.5" />
                        <p className="text-xs text-gray-500 group-hover:text-cyan-400 font-medium transition">Add a dream...</p>
                      </button>
                    ) : (
                      <div className="flex-shrink-0 w-[180px] md:w-[190px] h-[240px] md:h-[250px] snap-start rounded-lg border border-cyan-500/30 bg-gradient-to-br from-blue-950/60 via-gray-900/80 to-gray-950/60 backdrop-blur-sm p-2.5 flex flex-col shadow-lg shadow-cyan-500/20">
                        <input
                          type="text"
                          value={newItemTitle}
                          onChange={(e) => setNewItemTitle(e.target.value)}
                          placeholder="Dream title..."
                          autoFocus
                          className="w-full px-2 py-1.5 bg-gray-800/80 border border-gray-600/50 rounded text-white text-xs font-semibold placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 mb-1.5"
                        />
                        <textarea
                          value={newItemContent}
                          onChange={(e) => setNewItemContent(e.target.value)}
                          placeholder="Describe your dream..."
                          className="flex-1 w-full px-2 py-1.5 bg-gray-800/80 border border-gray-600/50 rounded text-white text-[11px] placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 resize-none mb-1.5"
                        />
                        <div className="flex gap-1.5">
                          <button
                            onClick={() => {
                              handleAddItem();
                              setIsCreatingNewWish(false);
                            }}
                            className="flex-1 px-2 py-1.5 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded text-[11px] font-medium hover:from-blue-700 hover:to-cyan-700 transition"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => {
                              setIsCreatingNewWish(false);
                              resetForm();
                            }}
                            className="px-2 py-1.5 bg-gray-700/80 hover:bg-gray-600/80 text-white rounded text-[11px] transition"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Active Wishes - Micro-Polaroids */}
                    {workingTowards.map((item, index) => {
                      const isEditing = editingWishId === item.id;
                      const isExpanded = expandedWishId === item.id;

                      return (
                        <div
                          key={item.id}
                          style={{ marginRight: index === workingTowards.length - 1 ? '0.5rem' : '0' }}
                          className={`group flex-shrink-0 w-[180px] md:w-[190px] snap-start rounded-lg border ${
                            isEditing ? 'border-cyan-500/30' : 'border-gray-700/50'
                          } bg-gradient-to-br from-gray-950/95 via-gray-900/95 to-gray-950/95 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-300 hover:border-cyan-500/30 relative overflow-hidden ${
                            completingItemId === item.id ? 'animate-pulse' : ''
                          } ${isExpanded ? 'h-auto' : 'h-[240px] md:h-[250px]'}`}
                        >
                          {/* 1px Brushed metal border */}
                          <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-black/20 pointer-events-none rounded-lg" />

                          {/* Content */}
                          {isEditing ? (
                            <div className="relative h-full p-2.5 flex flex-col">
                              <input
                                type="text"
                                value={editingWishTitle}
                                onChange={(e) => setEditingWishTitle(e.target.value)}
                                placeholder="Dream title..."
                                autoFocus
                                className="w-full px-2 py-1.5 bg-gray-800/80 border border-gray-600/50 rounded text-white text-xs font-semibold placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 mb-1.5"
                              />
                              <textarea
                                value={editingWishContent}
                                onChange={(e) => setEditingWishContent(e.target.value)}
                                placeholder="Describe your dream..."
                                className="flex-1 w-full px-2 py-1.5 bg-gray-800/80 border border-gray-600/50 rounded text-white text-[11px] placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 resize-none mb-2"
                              />

                              {/* Save/Cancel Buttons */}
                              <div className="flex gap-1.5 mb-2">
                                <button
                                  onClick={handleSaveWishEdit}
                                  className="flex-1 px-2 py-1 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded text-[11px] font-medium hover:from-blue-700 hover:to-cyan-700 transition"
                                >
                                  Save
                                </button>
                                <button
                                  onClick={handleCancelWishEdit}
                                  className="px-2 py-1 bg-gray-700/80 hover:bg-gray-600/80 text-white rounded text-[11px] transition"
                                >
                                  Cancel
                                </button>
                              </div>

                              {/* Action Buttons */}
                              <div className="flex items-center justify-end gap-2 pt-1.5 border-t border-gray-700/30">
                                <button
                                  onClick={async (e) => {
                                    e.stopPropagation();
                                    handleDeleteItem(item.id, null);
                                  }}
                                  className="p-1 hover:bg-red-600/20 rounded-full transition"
                                  title="Delete"
                                >
                                  <X className="w-3.5 h-3.5 text-red-400" />
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="relative h-full p-2.5 flex flex-col">
                              {/* Title - Clickable to expand on mobile, clickable to edit on desktop */}
                              <h4
                                className="text-white font-bold text-xs mb-1.5 line-clamp-2 cursor-pointer"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  // On mobile: toggle expand, on desktop: edit
                                  if (window.innerWidth < 768) {
                                    setExpandedWishId(isExpanded ? null : item.id);
                                  } else {
                                    handleEditWish(item);
                                  }
                                }}
                              >
                                {item.title}
                              </h4>

                              {/* Content - Hidden on mobile unless expanded, always visible on desktop */}
                              {item.content && (
                                <p
                                  className={`text-gray-300 text-[11px] leading-relaxed ${
                                    isExpanded ? 'block' : 'hidden md:block md:line-clamp-5'
                                  }`}
                                >
                                  {item.content}
                                </p>
                              )}

                              {/* Action Buttons - Edit, Complete, Delete */}
                              <div className="flex items-center justify-end gap-2 mt-auto pt-1.5 border-t border-gray-700/30">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleEditWish(item);
                                  }}
                                  className="p-1 hover:bg-blue-600/20 rounded-full transition"
                                  title="Edit"
                                >
                                  <Edit2 className="w-3.5 h-3.5 text-blue-400" />
                                </button>

                                <button
                                  onClick={async (e) => {
                                    e.stopPropagation();
                                    setCompletingItemId(item.id);
                                    await handleToggleGoal(item.id, item.goal_completed);
                                    setTimeout(() => setCompletingItemId(null), 600);
                                  }}
                                  className="p-1 bg-green-600/20 hover:bg-green-600/30 border border-green-500/30 rounded-full transition"
                                  title="Complete"
                                >
                                  <Check className="w-3.5 h-3.5 text-green-400" />
                                </button>

                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteItem(item.id, null);
                                  }}
                                  className="p-1 hover:bg-red-600/20 rounded-full transition"
                                  title="Delete"
                                >
                                  <X className="w-3.5 h-3.5 text-red-400" />
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Accomplished Section - Horizontal Scroll */}
                <div className="relative">
                  <h3 className="text-xs md:text-sm font-bold text-white mb-2 flex items-center">
                    <Check className="w-3 h-3 mr-1 text-green-400" />
                    Shared Victories
                  </h3>

                  {/* Netflix-style Navigation Arrows - Overlay on scroll container */}
                  {accomplished.length > 0 && (
                    <>
                      <button
                        onClick={() => scrollCards(accomplishedScrollRef, 'left')}
                        className="hidden md:flex absolute left-0 top-1/2 -translate-y-1/2 z-10 w-10 h-full items-center justify-center bg-gradient-to-r from-black/60 to-transparent hover:from-black/80 transition-all opacity-0 hover:opacity-100 group-hover:opacity-100"
                        aria-label="Scroll left"
                      >
                        <ChevronLeft className="w-8 h-8 text-white drop-shadow-lg" />
                      </button>
                      <button
                        onClick={() => scrollCards(accomplishedScrollRef, 'right')}
                        className="hidden md:flex absolute right-0 top-1/2 -translate-y-1/2 z-10 w-10 h-full items-center justify-center bg-gradient-to-l from-black/60 to-transparent hover:from-black/80 transition-all opacity-0 hover:opacity-100 group-hover:opacity-100"
                        aria-label="Scroll right"
                      >
                        <ChevronRight className="w-8 h-8 text-white drop-shadow-lg" />
                      </button>
                    </>
                  )}

                  {accomplished.length > 0 ? (
                    <div ref={accomplishedScrollRef} className="group flex overflow-x-auto snap-x snap-mandatory gap-2 pb-2 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent">
                      {accomplished.map((item, index) => {
                        const isEditing = editingWishId === item.id;

                        return (
                          <div
                            key={item.id}
                            style={{ marginRight: index === accomplished.length - 1 ? '0.5rem' : '0' }}
                            className={`group flex-shrink-0 w-[180px] md:w-[190px] h-[240px] md:h-[250px] snap-start rounded-lg border ${
                              isEditing ? 'border-cyan-500/30' : 'border-gray-700/30'
                            } bg-gradient-to-br from-gray-900/60 via-gray-800/60 to-gray-900/60 backdrop-blur-sm shadow-lg grayscale opacity-70 hover:opacity-100 hover:grayscale-0 transition-all duration-500 relative overflow-hidden`}
                          >
                            {/* 1px Brushed metal border */}
                            <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-black/20 pointer-events-none rounded-lg" />

                            {isEditing ? (
                              <div className="relative h-full p-2.5 flex flex-col">
                                <input
                                  type="text"
                                  value={editingWishTitle}
                                  onChange={(e) => setEditingWishTitle(e.target.value)}
                                  placeholder="Dream title..."
                                  autoFocus
                                  className="w-full px-2 py-1.5 bg-gray-800/80 border border-gray-600/50 rounded text-white text-xs font-semibold placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 mb-1.5"
                                />
                                <textarea
                                  value={editingWishContent}
                                  onChange={(e) => setEditingWishContent(e.target.value)}
                                  placeholder="Describe your dream..."
                                  className="flex-1 w-full px-2 py-1.5 bg-gray-800/80 border border-gray-600/50 rounded text-white text-[11px] placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 resize-none mb-2"
                                />

                                {/* Save/Cancel Buttons */}
                                <div className="flex gap-1.5 mb-2">
                                  <button
                                    onClick={handleSaveWishEdit}
                                    className="flex-1 px-2 py-1 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded text-[11px] font-medium hover:from-blue-700 hover:to-cyan-700 transition"
                                  >
                                    Save
                                  </button>
                                  <button
                                    onClick={handleCancelWishEdit}
                                    className="px-2 py-1 bg-gray-700/80 hover:bg-gray-600/80 text-white rounded text-[11px] transition"
                                  >
                                    Cancel
                                  </button>
                                </div>

                                {/* Action Buttons */}
                                <div className="flex items-center justify-end gap-2 pt-1.5 border-t border-gray-700/30">
                                  <button
                                    onClick={async (e) => {
                                      e.stopPropagation();
                                      handleDeleteItem(item.id, null);
                                    }}
                                    className="p-1 hover:bg-red-600/20 rounded-full transition"
                                    title="Delete"
                                  >
                                    <X className="w-3.5 h-3.5 text-red-400" />
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div className="relative h-full p-2.5 flex flex-col">
                                <h4 className="text-white font-bold text-xs mb-1.5 line-clamp-2 line-through decoration-green-500/50">{item.title}</h4>
                                {item.content && (
                                  <p className="text-gray-300 text-[11px] mb-auto line-clamp-5 leading-relaxed line-through decoration-green-500/30">{item.content}</p>
                                )}

                                <div className="mt-2 pt-1.5 border-t border-gray-700/30 flex items-center justify-end gap-2">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleEditWish(item);
                                    }}
                                    className="p-1 hover:bg-blue-600/20 rounded-full transition"
                                    title="Edit"
                                  >
                                    <Edit2 className="w-3.5 h-3.5 text-blue-400" />
                                  </button>

                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteItem(item.id, null);
                                    }}
                                    className="p-1 hover:bg-red-600/20 rounded-full transition"
                                    title="Delete"
                                  >
                                    <X className="w-3.5 h-3.5 text-red-400" />
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-gray-400 text-center py-6 italic text-[11px]">No shared victories yet. Complete a dream to celebrate together!</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && (
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] flex items-center justify-center p-4"
            onClick={() => {
              setShowDeleteConfirm(false);
              setItemToDelete(null);
            }}
          >
            <div
              className="bg-gradient-to-br from-gray-900/95 to-gray-800/95 backdrop-blur-md rounded-xl max-w-sm w-full border border-red-500/30 shadow-2xl shadow-red-500/10"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6">
                <div className="flex items-center justify-center w-12 h-12 mx-auto mb-4 bg-red-500/20 rounded-full">
                  <Trash2 className="w-6 h-6 text-red-400" />
                </div>
                <h3 className="text-lg font-bold text-white text-center mb-2">Delete Item?</h3>
                <p className="text-sm text-gray-300 text-center mb-6">
                  This action cannot be undone. Are you sure you want to delete this item?
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setShowDeleteConfirm(false);
                      setItemToDelete(null);
                    }}
                    className="flex-1 px-4 py-2.5 bg-gray-700/80 hover:bg-gray-600/80 text-white rounded-lg transition font-medium text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={confirmDelete}
                    className="flex-1 px-4 py-2.5 bg-gradient-to-r from-red-600 to-red-500 hover:from-red-700 hover:to-red-600 text-white rounded-lg transition font-medium text-sm shadow-lg shadow-red-500/20"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Detail Modal - Glass Tray */}
        {showDetailModal && selectedItem && (
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-end md:items-center justify-center p-0 md:p-4"
            onClick={() => {
              setShowDetailModal(false);
              setSelectedItem(null);
            }}
          >
            {/* Mobile: Bottom Sheet | Desktop: Compact Glass Tray */}
            <div
              className="bg-slate-900/80 backdrop-blur-2xl rounded-t-2xl md:rounded-xl w-full md:max-w-xl border-t md:border border-white/10 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.1)] h-[70vh] md:max-h-[70vh] overflow-hidden flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Compact Header with Delete Icon */}
              <div className="flex items-start justify-between px-4 py-2.5 border-b border-white/5 flex-shrink-0">
                <div className="flex-1 min-w-0">
                  <h2 className="text-base md:text-lg font-bold text-white mb-1.5 truncate">{selectedItem.title}</h2>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="inline-block px-2 py-0.5 bg-blue-600/90 text-white text-[10px] font-medium rounded-full">
                      {selectedItem.type.toUpperCase()}
                    </span>
                    {selectedItem.event_date && (
                      <span className="inline-flex items-center px-2 py-0.5 bg-green-600/90 text-white text-[10px] font-medium rounded-full">
                        <CalendarIcon className="w-2.5 h-2.5 mr-1" />
                        {new Date(selectedItem.event_date).toLocaleDateString()}
                      </span>
                    )}
                    <div className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-black/20 rounded-full border border-white/10">
                      <UserBadge userId={selectedItem.user_id} size={14} />
                      <span className="text-gray-400 text-[10px]">Created by</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1 ml-2 flex-shrink-0">
                  {/* Delete button (low opacity) */}
                  {selectedItem.id && (
                    <button
                      onClick={() => {
                        handleDeleteItem(selectedItem.id, selectedItem.image_url || null);
                      }}
                      className="p-1 hover:bg-red-500/10 rounded transition opacity-40 hover:opacity-100"
                      title={`Delete ${selectedItem.type}`}
                    >
                      <Trash2 className="w-3.5 h-3.5 text-red-400" />
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setShowDetailModal(false);
                      setSelectedItem(null);
                    }}
                    className="p-1 hover:bg-white/5 rounded transition text-gray-400 hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto px-4 py-3">
                {selectedItem.type === 'image' && selectedItem.image_url && (
                  <img
                    src={selectedItem.image_url}
                    alt={selectedItem.title}
                    className="w-full h-40 object-cover rounded-lg mb-3"
                  />
                )}
                {selectedItem.content && (
                  <p className="text-gray-300 text-sm mb-4 leading-relaxed">{selectedItem.content}</p>
                )}
                {selectedItem.type === 'goal' && (
                  <button
                    onClick={() => handleToggleGoal(selectedItem.id, selectedItem.goal_completed)}
                    className={`w-full px-3 py-2 rounded-lg text-sm font-medium transition mb-4 flex items-center justify-center gap-2 ${
                      selectedItem.goal_completed
                        ? 'bg-black/20 text-gray-300 hover:bg-black/30 border border-white/10'
                        : 'bg-gradient-to-r from-green-600/90 to-emerald-600/90 hover:from-green-600 hover:to-emerald-600 text-white shadow-lg shadow-green-500/10'
                    }`}
                  >
                    <Check className="w-4 h-4" />
                    <span>{selectedItem.goal_completed ? 'Completed' : 'Mark as Complete'}</span>
                  </button>
                )}

                {/* Comments Section */}
                <div className="border-t border-white/5 pt-3">
                  <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-1.5">
                    <MessageSquare className="w-3.5 h-3.5" />
                    Comments ({comments.length})
                  </h3>

                  {/* Comments List */}
                  <div className="space-y-2 mb-3 max-h-48 overflow-y-auto">
                    {comments.map((comment) => (
                      <div key={comment.id} className="bg-black/20 rounded-lg p-3 border border-white/5 group">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-gray-300 text-xs leading-relaxed flex-1">{comment.comment_text}</p>
                          <button
                            onClick={() => handleDeleteComment(comment.id)}
                            className="opacity-0 group-hover:opacity-100 transition flex-shrink-0"
                          >
                            <X className="w-3 h-3 text-red-400" />
                          </button>
                        </div>
                        <p className="text-gray-500 text-[10px] mt-1.5">
                          {new Date(comment.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    ))}
                  </div>

                  {/* Add Comment */}
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newCommentText}
                      onChange={(e) => setNewCommentText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleAddComment();
                        }
                      }}
                      placeholder="Add a comment..."
                      className="flex-1 px-3 py-2 bg-black/20 border border-white/10 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/30"
                    />
                    <button
                      onClick={handleAddComment}
                      className="px-3 py-2 bg-gradient-to-r from-blue-600/90 to-cyan-600/90 hover:from-blue-600 hover:to-cyan-600 text-white rounded-lg transition text-sm font-medium shadow-lg shadow-cyan-500/10"
                    >
                      Send
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
