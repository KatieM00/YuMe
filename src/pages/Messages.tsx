import { useState, useEffect, useRef } from 'react';
import { Plus, Pin, Image, Mic, Video, X, Inbox, Trash2, Play, Pause, Square, Camera, Loader, User } from 'lucide-react';
import {
  Message,
  getAllMessages,
  createMessage,
  updateMessageStatus,
  deleteMessage,
  toggleReaction,
  uploadMessageMedia,
} from '../lib/messageService';

const reactionOptions = [
  { icon: '♥️', label: 'heart' },
  { icon: '😍', label: 'love' },
  { icon: '🥹', label: 'tears' },
  { icon: '😂', label: 'laugh' },
  { icon: '😭', label: 'cry' },
  { icon: '👏', label: 'clap' },
  { icon: '🎉', label: 'party' },
  { icon: '😉', label: 'wink' },
];

export default function Messages() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showNewMessage, setShowNewMessage] = useState(false);
  const [showInbox, setShowInbox] = useState(false);
  const [newMessageContent, setNewMessageContent] = useState('');
  const [newMessageType, setNewMessageType] = useState<'text' | 'voice' | 'video' | 'image'>('text');
  const [expandedReactions, setExpandedReactions] = useState<string | null>(null);

  // Recording states
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [recordedUrl, setRecordedUrl] = useState<string | null>(null);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [countdown, setCountdown] = useState<number | null>(null);

  // Camera states for image capture
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const videoPreviewRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Load messages from Supabase
  const loadMessages = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await getAllMessages();

      // Enforce maximum of 10 messages on dashboard (active + pinned)
      const dashboardMsgs = data.filter(msg => msg.status === 'active' || msg.status === 'pinned');

      if (dashboardMsgs.length > 10) {
        // Find oldest unpinned active messages to dismiss
        const activeUnpinned = dashboardMsgs
          .filter(msg => msg.status === 'active')
          .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

        const numToRemove = dashboardMsgs.length - 10;
        const messagesToDismiss = activeUnpinned.slice(0, numToRemove);

        // Dismiss the oldest unpinned messages (moves to inbox, not deleted)
        for (const msg of messagesToDismiss) {
          try {
            await updateMessageStatus(msg.id, 'dismissed');
          } catch (err) {
            console.error('Failed to auto-dismiss message:', err);
          }
        }

        // Reload messages after auto-dismissing
        const updatedData = await getAllMessages();
        setMessages(updatedData);
      } else {
        setMessages(data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load messages');
      console.error('Failed to load messages:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadMessages();
  }, []);

  const handleAddReaction = async (messageId: string, emoji: string) => {
    try {
      await toggleReaction(messageId, emoji);
      await loadMessages(); // Reload to get updated reactions
    } catch (err) {
      console.error('Failed to toggle reaction:', err);
      alert('Failed to update reaction. Please try again.');
    }
  };

  const togglePin = async (messageId: string, currentStatus: string) => {
    try {
      const newStatus = currentStatus === 'pinned' ? 'active' : 'pinned';
      await updateMessageStatus(messageId, newStatus);
      await loadMessages();
    } catch (err) {
      console.error('Failed to toggle pin:', err);
      alert('Failed to update message status. Please try again.');
    }
  };

  const dismissMessage = async (messageId: string) => {
    try {
      await updateMessageStatus(messageId, 'dismissed');
      await loadMessages();
    } catch (err) {
      console.error('Failed to dismiss message:', err);
      alert('Failed to dismiss message. Please try again.');
    }
  };

  // Count words in text (handle multiple spaces correctly)
  const countWords = (text: string): number => {
    const trimmed = text.trim();
    if (!trimmed) return 0;
    return trimmed.split(/\s+/).length;
  };

  const wordCount = countWords(newMessageContent);
  const MAX_WORDS = 150;

  const getWordCountColor = () => {
    if (wordCount > MAX_WORDS) return 'text-red-400';
    if (wordCount >= 140) return 'text-yellow-400';
    return 'text-green-400';
  };

  const addNewMessage = async () => {
    if (newMessageContent.trim() && wordCount <= MAX_WORDS) {
      try {
        await createMessage({
          from_user: 'You',
          to_user: 'Them',
          type: newMessageType,
          content: newMessageContent,
        });
        setNewMessageContent('');
        setShowNewMessage(false);
        await loadMessages();
      } catch (err) {
        console.error('Failed to create message:', err);
        alert('Failed to send message. Please try again.');
      }
    }
  };

  const handleDeleteMessage = async (messageId: string, storagePath: string | null) => {
    if (!confirm('Are you sure you want to permanently delete this message?')) return;

    try {
      await deleteMessage(messageId, storagePath || undefined);
      await loadMessages();
    } catch (err) {
      console.error('Failed to delete message:', err);
      alert('Failed to delete message. Please try again.');
    }
  };

  // Clean up recording resources
  const cleanupRecording = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current = null;
    }
    setIsRecording(false);
    setIsPaused(false);
    setRecordingTime(0);
  };

  // Start recording (voice or video)
  const startRecording = async () => {
    try {
      setPermissionError(null);
      const isVideo = newMessageType === 'video';

      // Use existing stream if already active (for video), otherwise get new stream (for voice)
      let stream = streamRef.current;

      if (!stream) {
        const constraints = isVideo
          ? {
              video: { facingMode },
              audio: true
            }
          : { audio: true };

        stream = await navigator.mediaDevices.getUserMedia(constraints);
        streamRef.current = stream;
      }

      // Always attach stream to video element for video recording
      // (Re-attach in case the video element was remounted during state transition)
      if (isVideo && videoPreviewRef.current && stream) {
        videoPreviewRef.current.srcObject = stream;
        videoPreviewRef.current.play();
      }

      const mimeType = isVideo
        ? 'video/webm;codecs=vp8,opus'
        : 'audio/webm;codecs=opus';

      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType });
        setRecordedBlob(blob);
        const url = URL.createObjectURL(blob);
        setRecordedUrl(url);

        if (videoPreviewRef.current) {
          videoPreviewRef.current.srcObject = null;
        }
      };

      mediaRecorder.start();
      setIsRecording(true);

      // Start timer
      timerRef.current = window.setInterval(() => {
        setRecordingTime((prev) => {
          const newTime = prev + 1;
          // Auto-stop at 60 seconds
          if (newTime >= 60) {
            stopRecording();
          }
          return newTime;
        });
      }, 1000);
    } catch (error) {
      console.error('Error accessing media devices:', error);
      setPermissionError(
        newMessageType === 'video'
          ? 'Camera/microphone access denied. Please enable permissions.'
          : 'Microphone access denied. Please enable permissions.'
      );
    }
  };

  // Pause/resume recording
  const togglePauseRecording = () => {
    if (!mediaRecorderRef.current) return;

    if (isPaused) {
      mediaRecorderRef.current.resume();
      if (timerRef.current === null) {
        timerRef.current = window.setInterval(() => {
          setRecordingTime((prev) => {
            const newTime = prev + 1;
            if (newTime >= 60) {
              stopRecording();
            }
            return newTime;
          });
        }, 1000);
      }
      setIsPaused(false);
    } else {
      mediaRecorderRef.current.pause();
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      setIsPaused(true);
    }
  };

  // Stop recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsRecording(false);
    setIsPaused(false);
  };

  // Send recorded message
  const sendRecordedMessage = async () => {
    if (!recordedBlob) return;

    try {
      // Check file size (warn if > 5MB)
      const sizeMB = recordedBlob.size / (1024 * 1024);
      if (sizeMB > 5) {
        if (!confirm(`This recording is ${sizeMB.toFixed(1)}MB. Large files may cause performance issues. Continue?`)) {
          return;
        }
      }

      // Create file from blob
      const fileExt = newMessageType === 'video' ? 'webm' : 'webm';
      const fileName = `${newMessageType}-${Date.now()}.${fileExt}`;
      const file = new File([recordedBlob], fileName, { type: recordedBlob.type });

      // Upload to Supabase Storage
      const { path, url } = await uploadMessageMedia(file);

      // Create message with media URL
      await createMessage({
        from_user: 'You',
        to_user: 'Them',
        type: newMessageType,
        content: `${newMessageType === 'video' ? 'Video' : 'Voice'} message`,
        media_url: url,
        storage_path: path,
      });

      // Reset recording state
      if (recordedUrl) {
        URL.revokeObjectURL(recordedUrl);
      }
      setRecordedBlob(null);
      setRecordedUrl(null);
      setRecordingTime(0);
      setShowNewMessage(false);

      await loadMessages();
    } catch (error) {
      console.error('Error sending recorded message:', error);
      alert('Failed to send recording. Please try again.');
    }
  };

  // Cancel recording
  const cancelRecording = () => {
    cleanupRecording();
    if (recordedUrl) {
      URL.revokeObjectURL(recordedUrl);
    }
    setRecordedBlob(null);
    setRecordedUrl(null);
    setPermissionError(null);
  };

  // Switch camera (mobile)
  const switchCamera = async () => {
    const newFacingMode = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(newFacingMode);

    // If recording, switch camera without stopping the recording
    if (isRecording && streamRef.current) {
      try {
        // Get new stream with new facing mode
        const newStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: newFacingMode },
          audio: true
        });

        // Update video preview
        if (videoPreviewRef.current) {
          videoPreviewRef.current.srcObject = newStream;
        }

        // Replace tracks in the MediaRecorder's stream
        const videoTrack = newStream.getVideoTracks()[0];
        const audioTrack = newStream.getAudioTracks()[0];

        const oldVideoTrack = streamRef.current.getVideoTracks()[0];
        const oldAudioTrack = streamRef.current.getAudioTracks()[0];

        // Stop old tracks
        if (oldVideoTrack) oldVideoTrack.stop();
        if (oldAudioTrack) oldAudioTrack.stop();

        // Update stream reference
        streamRef.current = newStream;
      } catch (error) {
        console.error('Error switching camera:', error);
        // If switching fails, continue with current camera
      }
    }
  };

  // Format recording time
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Start camera for photo capture or video preview
  const startCamera = async (withAudio: boolean = false) => {
    try {
      setPermissionError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode },
        audio: withAudio
      });
      streamRef.current = stream;

      if (videoPreviewRef.current) {
        videoPreviewRef.current.srcObject = stream;
        videoPreviewRef.current.play();
      }

      setIsCameraActive(true);
    } catch (error) {
      console.error('Error accessing camera:', error);
      setPermissionError(withAudio
        ? 'Camera/microphone access denied. Please enable permissions.'
        : 'Camera access denied. Please enable camera permissions.');
    }
  };

  // Take photo from camera stream
  const takePhoto = () => {
    if (videoPreviewRef.current && canvasRef.current) {
      const video = videoPreviewRef.current;
      const canvas = canvasRef.current;

      // Set canvas size to match video
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      // Draw current video frame to canvas
      const context = canvas.getContext('2d');
      if (context) {
        context.drawImage(video, 0, 0, canvas.width, canvas.height);

        // Convert canvas to data URL
        const imageDataUrl = canvas.toDataURL('image/jpeg', 0.9);
        setCapturedImage(imageDataUrl);

        // Stop camera stream
        stopCamera();
      }
    }
  };

  // Stop camera
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoPreviewRef.current) {
      videoPreviewRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  };

  // Switch camera for photo mode
  const switchCameraPhoto = async () => {
    const newFacingMode = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(newFacingMode);

    if (isCameraActive) {
      stopCamera();
      // Restart camera with new facing mode
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: newFacingMode },
          audio: false
        });
        streamRef.current = stream;

        if (videoPreviewRef.current) {
          videoPreviewRef.current.srcObject = stream;
          videoPreviewRef.current.play();
        }
      } catch (error) {
        console.error('Error switching camera:', error);
      }
    }
  };

  // Retake photo
  const retakePhoto = () => {
    setCapturedImage(null);
    startCamera();
  };

  // Send captured photo
  const sendCapturedPhoto = async () => {
    if (!capturedImage) return;

    try {
      // Convert data URL to blob
      const response = await fetch(capturedImage);
      const blob = await response.blob();

      // Create file from blob
      const fileName = `photo-${Date.now()}.jpg`;
      const file = new File([blob], fileName, { type: 'image/jpeg' });

      // Upload to Supabase Storage
      const { path, url } = await uploadMessageMedia(file);

      // Create message with image URL
      await createMessage({
        from_user: 'You',
        to_user: 'Them',
        type: 'image',
        content: 'Photo message',
        media_url: url,
        storage_path: path,
      });

      // Reset state
      setCapturedImage(null);
      setShowNewMessage(false);
      await loadMessages();
    } catch (error) {
      console.error('Error sending photo:', error);
      alert('Failed to send photo. Please try again.');
    }
  };

  // Cancel photo capture
  const cancelPhoto = () => {
    setCapturedImage(null);
    stopCamera();
    setPermissionError(null);
  };

  // Cleanup on unmount or when closing modal
  useEffect(() => {
    return () => {
      cleanupRecording();
      stopCamera();
      if (recordedUrl) {
        URL.revokeObjectURL(recordedUrl);
      }
    };
  }, []); // Empty dependency array ensures cleanup always runs on unmount

  // Filter messages for dashboard: only active and pinned
  const dashboardMessages = messages.filter(
    (msg) => msg.status === 'active' || msg.status === 'pinned'
  );

  // Get reaction emojis for a message
  const getMessageReactionEmojis = (message: Message): string[] => {
    return message.reactions?.map(r => r.emoji) || [];
  };

  // Render message card
  const renderMessageCard = (message: Message, showDelete: boolean = false) => {
    const isExpanded = expandedReactions === message.id;
    const visibleReactions = isExpanded ? reactionOptions : reactionOptions.slice(0, 4);
    const messageReactionEmojis = getMessageReactionEmojis(message);

    return (
      <div className="bg-gray-800 border-2 border-gray-600 rounded-lg shadow-2xl max-w-xs w-full">
        <div className="bg-gradient-to-r from-blue-600 to-cyan-600 px-4 py-2 rounded-t-md flex items-center justify-between cursor-move">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
            <span className="text-white text-sm font-medium ml-2">
              {message.from_user} → {message.to_user}
            </span>
          </div>
          <div className="flex items-center space-x-1">
            {showDelete ? (
              <button
                onClick={() => handleDeleteMessage(message.id, message.storage_path)}
                className="w-6 h-6 flex items-center justify-center hover:bg-white/20 rounded transition"
              >
                <Trash2 className="w-4 h-4 text-white" />
              </button>
            ) : (
              message.status !== 'pinned' && (
                <button
                  onClick={() => dismissMessage(message.id)}
                  className="w-6 h-6 flex items-center justify-center hover:bg-white/20 rounded transition"
                  title="Dismiss from dashboard"
                >
                  <X className="w-4 h-4 text-white" />
                </button>
              )
            )}
          </div>
        </div>

      <div className="p-4 bg-gray-900/95 backdrop-blur-sm">
        {message.type === 'text' && (
          <p className="text-gray-200 mb-3">{message.content}</p>
        )}
        {message.type === 'voice' && (
          <div className="mb-3">
            {message.media_url ? (
              <audio
                controls
                src={message.media_url}
                className="w-full"
                style={{ height: '40px' }}
              />
            ) : (
              <div className="flex items-center space-x-3 bg-gray-800/50 rounded-lg p-3">
                <Mic className="w-5 h-5 text-blue-400" />
                <div className="flex-1 h-1 bg-gray-700 rounded-full">
                  <div className="w-1/3 h-full bg-blue-500 rounded-full"></div>
                </div>
                <span className="text-gray-400 text-xs">0:15</span>
              </div>
            )}
          </div>
        )}
        {message.type === 'video' && (
          <div className="mb-3">
            {message.media_url ? (
              <video
                controls
                src={message.media_url}
                className="w-full rounded-lg bg-black"
                style={{ maxHeight: '300px' }}
              />
            ) : (
              <div className="bg-gray-800/50 rounded-lg p-3 text-center">
                <Video className="w-8 h-8 text-blue-400 mx-auto mb-2" />
                <p className="text-gray-400 text-sm">Video message</p>
              </div>
            )}
          </div>
        )}
        {message.type === 'image' && (
          <div className="mb-3">
            {message.media_url ? (
              <img
                src={message.media_url}
                alt="Photo message"
                className="w-full rounded-lg"
              />
            ) : (
              <div className="bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg aspect-video flex items-center justify-center">
                <Image className="w-12 h-12 text-white/50" />
              </div>
            )}
          </div>
        )}

        <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
          <span>{new Date(message.created_at).toLocaleString()}</span>
          {message.status === 'pinned' && (
            <span className="text-yellow-400 text-xs">📌 Pinned</span>
          )}
          {message.status === 'dismissed' && (
            <span className="text-gray-500 text-xs">Dismissed</span>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-gray-700 pt-3">
          <div className="flex items-center space-x-1 flex-wrap">
            {visibleReactions.map((reaction) => (
              <button
                key={reaction.label}
                onClick={() => handleAddReaction(message.id, reaction.icon)}
                className={`w-8 h-8 rounded-full flex items-center justify-center transition ${
                  messageReactionEmojis.includes(reaction.icon)
                    ? 'bg-blue-500/30 ring-2 ring-blue-500'
                    : 'bg-gray-800 hover:bg-gray-700'
                }`}
              >
                <span className="text-sm">{reaction.icon}</span>
              </button>
            ))}
            {reactionOptions.length > 4 && (
              <button
                onClick={() => setExpandedReactions(isExpanded ? null : message.id)}
                className="w-8 h-8 rounded-full flex items-center justify-center bg-gray-800 hover:bg-gray-700 transition"
                title={isExpanded ? "Show less" : "More reactions"}
              >
                <span className="text-xs text-gray-400">...</span>
              </button>
            )}
          </div>
          <button
            onClick={() => togglePin(message.id, message.status)}
            className={`p-2 rounded-full transition ${
              message.status === 'pinned'
                ? 'bg-yellow-500/30 text-yellow-400'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            <Pin className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen p-4 md:p-8 flex items-center justify-center">
        <div className="text-center">
          <Loader className="w-12 h-12 mx-auto mb-4 text-blue-500 animate-spin" />
          <p className="text-gray-400">Loading messages...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-8 relative overflow-hidden">
      <div className="max-w-7xl mx-auto relative" style={{ minHeight: '600px' }}>
        <div className="flex items-center justify-between mb-8 relative z-10">
          <h1 className="text-3xl md:text-4xl font-bold text-white">Messages</h1>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setShowInbox(true)}
              className="flex items-center space-x-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition"
            >
              <Inbox className="w-5 h-5" />
              <span>Inbox</span>
              {messages.filter((m) => m.status === 'dismissed').length > 0 && (
                <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                  {messages.filter((m) => m.status === 'dismissed').length}
                </span>
              )}
            </button>
            <button
              onClick={() => setShowNewMessage(true)}
              className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-lg font-medium hover:from-blue-600 hover:to-cyan-600 transition"
            >
              <Plus className="w-5 h-5" />
              <span>New Message</span>
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400">
            {error}
          </div>
        )}

        {/* Desktop: Flexible Grid Layout */}
        <div className="hidden md:grid grid-cols-3 gap-6 auto-rows-min">
          {dashboardMessages.map((message) => (
            <div key={message.id} className="flex justify-center items-start">
              {renderMessageCard(message)}
            </div>
          ))}
        </div>

        {/* Mobile: Vertical scrollable list */}
        <div className="md:hidden space-y-4">
          {dashboardMessages.map((message) => (
            <div key={message.id}>
              {renderMessageCard(message)}
            </div>
          ))}
        </div>

        {/* New Message Modal */}
        {showNewMessage && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-gray-800 border-2 border-gray-600 rounded-lg shadow-2xl max-w-md w-full">
              <div className="bg-gradient-to-r from-blue-600 to-cyan-600 px-4 py-3 rounded-t-md flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 rounded-full bg-red-500"></div>
                  <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                  <div className="w-3 h-3 rounded-full bg-green-500"></div>
                  <span className="text-white font-medium ml-2">New Message</span>
                </div>
                <button
                  onClick={() => {
                    setShowNewMessage(false);
                    // Clean up camera and recording when closing modal
                    cancelRecording();
                    cancelPhoto();
                  }}
                  className="w-6 h-6 flex items-center justify-center hover:bg-white/20 rounded transition"
                >
                  <X className="w-4 h-4 text-white" />
                </button>
              </div>

              <div className="p-6 bg-gray-900/95">
                <div className="flex space-x-2 mb-4">
                  {[
                    { type: 'text', icon: '📝', label: 'Text' },
                    { type: 'voice', icon: '🎤', label: 'Voice' },
                    { type: 'video', icon: '🎥', label: 'Video' },
                    { type: 'image', icon: '🖼️', label: 'Image' },
                  ].map((option) => (
                    <button
                      key={option.type}
                      onClick={() => {
                        // Clean up any active recording or camera first
                        cancelRecording();
                        cancelPhoto();

                        // Set the new message type
                        setNewMessageType(option.type as any);

                        // Start camera automatically for image and video modes
                        if (option.type === 'image') {
                          setTimeout(() => startCamera(false), 100);
                        } else if (option.type === 'video') {
                          setTimeout(() => startCamera(true), 100);
                        }
                      }}
                      className={`flex-1 py-2 rounded-lg text-sm transition ${
                        newMessageType === option.type
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                      }`}
                    >
                      <span className="mr-1">{option.icon}</span>
                      {option.label}
                    </button>
                  ))}
                </div>

                {/* Text Message Input */}
                {newMessageType === 'text' && (
                  <div>
                    <div>
                      <textarea
                        value={newMessageContent}
                        onChange={(e) => setNewMessageContent(e.target.value)}
                        placeholder="Type your message..."
                        className="w-full h-32 px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                      />
                      <div className={`mt-2 text-sm text-right ${getWordCountColor()}`}>
                        {wordCount} / {MAX_WORDS} words
                      </div>
                    </div>

                    <button
                      onClick={addNewMessage}
                      disabled={wordCount > MAX_WORDS || !newMessageContent.trim()}
                      className="w-full mt-4 px-4 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-lg font-medium hover:from-blue-600 hover:to-cyan-600 transition disabled:from-gray-600 disabled:to-gray-600 disabled:cursor-not-allowed"
                    >
                      Send Message
                    </button>
                  </div>
                )}

                {/* Voice Recording */}
                {newMessageType === 'voice' && (
                  <div>
                    {permissionError && (
                      <div className="mb-4 p-3 bg-red-500/20 border border-red-500 rounded-lg text-red-400 text-sm">
                        {permissionError}
                      </div>
                    )}

                    {!isRecording && !recordedBlob && (
                      <button
                        onClick={startRecording}
                        className="w-full py-12 bg-gray-800 border-2 border-dashed border-gray-600 rounded-lg hover:border-blue-500 hover:bg-gray-800/50 transition flex flex-col items-center justify-center"
                      >
                        <Mic className="w-12 h-12 text-blue-400 mb-3" />
                        <span className="text-white font-medium">Start Recording</span>
                        <span className="text-gray-400 text-sm mt-1">Max 60 seconds</span>
                      </button>
                    )}

                    {isRecording && (
                      <div className="bg-gray-800 rounded-lg p-6">
                        <div className="flex items-center justify-center mb-6">
                          <div className={`w-4 h-4 rounded-full mr-3 ${isPaused ? 'bg-yellow-500' : 'bg-red-500 animate-pulse'}`}></div>
                          <span className="text-white text-2xl font-mono">{formatTime(recordingTime)}</span>
                          <span className="text-gray-400 text-sm ml-2">/ 1:00</span>
                        </div>

                        <div className="flex items-center justify-center space-x-3">
                          <button
                            onClick={togglePauseRecording}
                            className="p-4 bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400 rounded-full transition"
                            title={isPaused ? 'Resume' : 'Pause'}
                          >
                            {isPaused ? <Play className="w-6 h-6" /> : <Pause className="w-6 h-6" />}
                          </button>
                          <button
                            onClick={stopRecording}
                            className="p-4 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-full transition"
                            title="Stop"
                          >
                            <Square className="w-6 h-6" />
                          </button>
                        </div>

                        <div className="mt-4 h-16 bg-gray-900 rounded-lg flex items-center justify-center">
                          <div className="flex items-center space-x-1">
                            {Array.from({ length: 20 }).map((_, i) => (
                              <div
                                key={i}
                                className="w-1 bg-blue-500 rounded-full transition-all"
                                style={{
                                  height: `${Math.random() * 40 + 10}px`,
                                  opacity: isPaused ? 0.3 : 1,
                                }}
                              ></div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {recordedBlob && recordedUrl && (
                      <div className="space-y-4">
                        <div className="bg-gray-800 rounded-lg p-4">
                          <div className="flex items-center justify-between mb-3">
                            <span className="text-white font-medium">Preview</span>
                            <span className="text-gray-400 text-sm">{formatTime(recordingTime)}</span>
                          </div>
                          <audio
                            controls
                            src={recordedUrl}
                            className="w-full"
                          />
                        </div>

                        <div className="flex space-x-3">
                          <button
                            onClick={cancelRecording}
                            className="flex-1 px-4 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition"
                          >
                            Re-record
                          </button>
                          <button
                            onClick={sendRecordedMessage}
                            className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-lg font-medium hover:from-blue-600 hover:to-cyan-600 transition"
                          >
                            Send
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Video Recording */}
                {newMessageType === 'video' && (
                  <div>
                    {permissionError && (
                      <div className="mb-4 p-3 bg-red-500/20 border border-red-500 rounded-lg text-red-400 text-sm">
                        {permissionError}
                      </div>
                    )}

                    {!isRecording && !recordedBlob && (
                      <div className="space-y-3">
                        {/* Camera Preview with Start Recording button */}
                        <div className="bg-gray-800 rounded-lg p-4">
                          <div className="relative mb-4 bg-black rounded-lg overflow-hidden" style={{ aspectRatio: '16/9' }}>
                            <video
                              ref={videoPreviewRef}
                              autoPlay
                              muted
                              playsInline
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <button
                            onClick={startRecording}
                            className="w-full py-3 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-lg font-medium hover:from-blue-600 hover:to-cyan-600 transition flex items-center justify-center"
                          >
                            <Video className="w-5 h-5 mr-2" />
                            Start Recording
                          </button>
                        </div>
                        <button
                          onClick={switchCameraPhoto}
                          className="w-full py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-sm transition flex items-center justify-center"
                        >
                          {facingMode === 'user' ? (
                            <>
                              <Camera className="w-4 h-4 mr-2" />
                              Switch to Back Camera
                            </>
                          ) : (
                            <>
                              <User className="w-4 h-4 mr-2" />
                              Switch to Selfie Camera
                            </>
                          )}
                        </button>
                        <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                          <p className="text-yellow-400 text-xs text-center">
                            ⚠️ Videos will automatically stop recording after 60 seconds
                          </p>
                        </div>
                      </div>
                    )}

                    {isRecording && (
                      <div className="bg-gray-800 rounded-lg p-4">
                        <div className="relative mb-4 bg-black rounded-lg overflow-hidden" style={{ aspectRatio: '16/9' }}>
                          <video
                            ref={videoPreviewRef}
                            autoPlay
                            muted
                            playsInline
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute top-3 left-3 flex items-center space-x-2 bg-black/70 px-3 py-1 rounded-full">
                            <div className={`w-3 h-3 rounded-full ${isPaused ? 'bg-yellow-500' : 'bg-red-500 animate-pulse'}`}></div>
                            <span className="text-white font-mono text-sm">{formatTime(recordingTime)}</span>
                            <span className="text-gray-400 text-xs">/ 1:00</span>
                          </div>
                          {recordingTime >= 50 && recordingTime < 60 && (
                            <div className="absolute bottom-3 left-1/2 transform -translate-x-1/2 bg-yellow-500/90 px-4 py-2 rounded-full">
                              <span className="text-black text-xs font-semibold">
                                Recording stops in {60 - recordingTime}s
                              </span>
                            </div>
                          )}
                        </div>

                        <div className="flex items-center justify-center space-x-3">
                          <button
                            onClick={togglePauseRecording}
                            className="p-4 bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400 rounded-full transition"
                            title={isPaused ? 'Resume' : 'Pause'}
                          >
                            {isPaused ? <Play className="w-6 h-6" /> : <Pause className="w-6 h-6" />}
                          </button>
                          <button
                            onClick={stopRecording}
                            className="p-4 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-full transition"
                            title="Stop"
                          >
                            <Square className="w-6 h-6" />
                          </button>
                          <button
                            onClick={switchCamera}
                            className="p-4 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-full transition"
                            title="Switch Camera"
                          >
                            <Camera className="w-6 h-6" />
                          </button>
                        </div>
                      </div>
                    )}

                    {recordedBlob && recordedUrl && (
                      <div className="space-y-4">
                        <div className="bg-gray-800 rounded-lg p-4">
                          <div className="flex items-center justify-between mb-3">
                            <span className="text-white font-medium">Preview</span>
                            <span className="text-gray-400 text-sm">{formatTime(recordingTime)}</span>
                          </div>
                          <video
                            controls
                            src={recordedUrl}
                            className="w-full rounded-lg bg-black"
                            style={{ maxHeight: '300px' }}
                          />
                        </div>

                        <div className="flex space-x-3">
                          <button
                            onClick={cancelRecording}
                            className="flex-1 px-4 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition"
                          >
                            Re-record
                          </button>
                          <button
                            onClick={sendRecordedMessage}
                            className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-lg font-medium hover:from-blue-600 hover:to-cyan-600 transition"
                          >
                            Send
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Image Capture */}
                {newMessageType === 'image' && (
                  <div>
                    {permissionError && (
                      <div className="mb-4 p-3 bg-red-500/20 border border-red-500 rounded-lg text-red-400 text-sm">
                        {permissionError}
                      </div>
                    )}

                    {/* Hidden canvas for photo capture */}
                    <canvas ref={canvasRef} style={{ display: 'none' }} />

                    {!capturedImage && (
                      <div className="space-y-3">
                        {/* Camera Preview */}
                        <div className="bg-gray-800 rounded-lg p-4">
                          <div className="relative mb-4 bg-black rounded-lg overflow-hidden" style={{ aspectRatio: '4/3' }}>
                            <video
                              ref={videoPreviewRef}
                              autoPlay
                              muted
                              playsInline
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <button
                            onClick={takePhoto}
                            className="w-full py-3 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-lg font-medium hover:from-blue-600 hover:to-cyan-600 transition flex items-center justify-center"
                          >
                            <Camera className="w-5 h-5 mr-2" />
                            Take Photo
                          </button>
                        </div>
                        <button
                          onClick={switchCameraPhoto}
                          className="w-full py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-sm transition flex items-center justify-center"
                        >
                          {facingMode === 'user' ? (
                            <>
                              <Camera className="w-4 h-4 mr-2" />
                              Switch to Back Camera
                            </>
                          ) : (
                            <>
                              <User className="w-4 h-4 mr-2" />
                              Switch to Selfie Camera
                            </>
                          )}
                        </button>
                      </div>
                    )}

                    {capturedImage && (
                      <div className="space-y-4">
                        <div className="bg-gray-800 rounded-lg p-4">
                          <div className="flex items-center justify-between mb-3">
                            <span className="text-white font-medium">Preview</span>
                          </div>
                          <img
                            src={capturedImage}
                            alt="Captured"
                            className="w-full rounded-lg"
                          />
                        </div>

                        <div className="flex space-x-3">
                          <button
                            onClick={retakePhoto}
                            className="flex-1 px-4 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition"
                          >
                            Retake
                          </button>
                          <button
                            onClick={sendCapturedPhoto}
                            className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-lg font-medium hover:from-blue-600 hover:to-cyan-600 transition"
                          >
                            Send
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Inbox Modal */}
        {showInbox && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-gray-800 border-2 border-gray-600 rounded-lg shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
              <div className="bg-gradient-to-r from-purple-600 to-pink-600 px-4 py-3 rounded-t-md flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 rounded-full bg-red-500"></div>
                  <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                  <div className="w-3 h-3 rounded-full bg-green-500"></div>
                  <span className="text-white font-medium ml-2">
                    Inbox - All Messages ({messages.length})
                  </span>
                </div>
                <button
                  onClick={() => setShowInbox(false)}
                  className="w-6 h-6 flex items-center justify-center hover:bg-white/20 rounded transition"
                >
                  <X className="w-4 h-4 text-white" />
                </button>
              </div>

              <div className="p-6 bg-gray-900/95 overflow-y-auto max-h-[calc(90vh-60px)]">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {messages.map((message) => (
                    <div key={message.id}>
                      {renderMessageCard(message, true)}
                    </div>
                  ))}
                </div>

                {messages.length === 0 && (
                  <div className="text-center py-16">
                    <Inbox className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                    <p className="text-gray-400 text-lg">No messages yet</p>
                    <p className="text-gray-500 text-sm">Click "New Message" to send your first message</p>
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
