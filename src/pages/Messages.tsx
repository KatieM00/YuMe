import { useState, useEffect, useRef } from 'react';
import { Plus, Pin, Image, Mic, Video, X, Inbox, Trash2, XCircle, Play, Pause, Square, Camera } from 'lucide-react';

interface Message {
  id: number;
  from: string;
  to: string;
  type: 'text' | 'voice' | 'video' | 'image';
  content: string;
  timestamp: string;
  reactions: string[];
  status: 'active' | 'dismissed' | 'pinned';
  position: { x: number; y: number };
}

const reactions = [
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
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      from: 'Katie',
      to: 'Nassos',
      type: 'text',
      content: 'I miss you so much! Can\'t wait until we\'re together again.',
      timestamp: '2024-11-10 14:30',
      reactions: ['♥️'],
      status: 'pinned',
      position: { x: 50, y: 50 },
    },
    {
      id: 2,
      from: 'Nassos',
      to: 'Katie',
      type: 'text',
      content: 'Just booked our summer trip! Greece here we come!',
      timestamp: '2024-11-09 18:45',
      reactions: ['♥️', '🎉'],
      status: 'pinned',
      position: { x: 400, y: 150 },
    },
    {
      id: 3,
      from: 'Sofia',
      to: 'Alex',
      type: 'voice',
      content: 'Voice message: "Good morning my love..."',
      timestamp: '2024-11-08 08:15',
      reactions: ['😍'],
      status: 'active',
      position: { x: 100, y: 300 },
    },
  ]);

  const [showNewMessage, setShowNewMessage] = useState(false);
  const [showInbox, setShowInbox] = useState(false);
  const [newMessageContent, setNewMessageContent] = useState('');
  const [newMessageType, setNewMessageType] = useState<'text' | 'voice' | 'video' | 'image'>('text');
  const [expandedReactions, setExpandedReactions] = useState<number | null>(null);

  // Recording states
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [recordedUrl, setRecordedUrl] = useState<string | null>(null);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const videoPreviewRef = useRef<HTMLVideoElement | null>(null);

  // Migrate old messages from isPinned to status
  useEffect(() => {
    const saved = localStorage.getItem('yumeMessages');
    if (saved) {
      const parsedMessages = JSON.parse(saved);
      const migratedMessages = parsedMessages.map((msg: any) => {
        if ('isPinned' in msg && !('status' in msg)) {
          return {
            ...msg,
            status: msg.isPinned ? 'pinned' : 'active',
            isPinned: undefined,
          };
        }
        return msg;
      });
      setMessages(migratedMessages);
      saveToStorage(migratedMessages);
    }
  }, []);

  const saveToStorage = (updatedMessages: Message[]) => {
    localStorage.setItem('yumeMessages', JSON.stringify(updatedMessages));
  };

  const addReaction = (messageId: number, reaction: string) => {
    const updated = messages.map((msg) =>
      msg.id === messageId
        ? {
            ...msg,
            reactions: msg.reactions.includes(reaction)
              ? msg.reactions.filter((r) => r !== reaction)
              : [...msg.reactions, reaction],
          }
        : msg
    );
    setMessages(updated);
    saveToStorage(updated);
  };

  const togglePin = (messageId: number) => {
    const updated = messages.map((msg) =>
      msg.id === messageId
        ? { ...msg, status: msg.status === 'pinned' ? 'active' : 'pinned' }
        : msg
    );
    setMessages(updated);
    saveToStorage(updated);
  };

  const dismissMessage = (messageId: number) => {
    const updated = messages.map((msg) =>
      msg.id === messageId && msg.status !== 'pinned'
        ? { ...msg, status: 'dismissed' as const }
        : msg
    );
    setMessages(updated);
    saveToStorage(updated);
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

  const addNewMessage = () => {
    if (newMessageContent.trim() && wordCount <= MAX_WORDS) {
      const newMessage: Message = {
        id: Date.now(),
        from: 'You',
        to: 'Them',
        type: newMessageType,
        content: newMessageContent,
        timestamp: new Date().toLocaleString(),
        reactions: [],
        status: 'active',
        position: { x: Math.random() * 300 + 50, y: Math.random() * 200 + 100 },
      };
      const updated = [...messages, newMessage];
      setMessages(updated);
      saveToStorage(updated);
      setNewMessageContent('');
      setShowNewMessage(false);
    }
  };

  const deleteMessage = (messageId: number) => {
    if (confirm('Are you sure you want to permanently delete this message?')) {
      const updated = messages.filter((msg) => msg.id !== messageId);
      setMessages(updated);
      saveToStorage(updated);
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

      const constraints = isVideo
        ? {
            video: { facingMode },
            audio: true
          }
        : { audio: true };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      // Show video preview for video recording
      if (isVideo && videoPreviewRef.current) {
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

  // Convert blob to base64
  const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  // Send recorded message
  const sendRecordedMessage = async () => {
    if (!recordedBlob) return;

    try {
      const base64 = await blobToBase64(recordedBlob);

      // Check file size (warn if > 5MB)
      const sizeMB = recordedBlob.size / (1024 * 1024);
      if (sizeMB > 5) {
        if (!confirm(`This recording is ${sizeMB.toFixed(1)}MB. Large files may cause performance issues. Continue?`)) {
          return;
        }
      }

      const newMessage: Message = {
        id: Date.now(),
        from: 'You',
        to: 'Them',
        type: newMessageType,
        content: base64,
        timestamp: new Date().toLocaleString(),
        reactions: [],
        status: 'active',
        position: { x: Math.random() * 300 + 50, y: Math.random() * 200 + 100 },
      };

      const updated = [...messages, newMessage];
      setMessages(updated);
      saveToStorage(updated);

      // Reset recording state
      if (recordedUrl) {
        URL.revokeObjectURL(recordedUrl);
      }
      setRecordedBlob(null);
      setRecordedUrl(null);
      setRecordingTime(0);
      setShowNewMessage(false);
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
  const switchCamera = () => {
    setFacingMode((prev) => (prev === 'user' ? 'environment' : 'user'));
    if (isRecording) {
      stopRecording();
    }
  };

  // Format recording time
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Cleanup on unmount or when closing modal
  useEffect(() => {
    return () => {
      cleanupRecording();
      if (recordedUrl) {
        URL.revokeObjectURL(recordedUrl);
      }
    };
  }, [recordedUrl]);

  // Filter messages for dashboard: only active and pinned
  const dashboardMessages = messages.filter(
    (msg) => msg.status === 'active' || msg.status === 'pinned'
  );

  // Render message card
  const renderMessageCard = (message: Message, showDelete: boolean = false) => {
    const isExpanded = expandedReactions === message.id;
    const visibleReactions = isExpanded ? reactions : reactions.slice(0, 4);

    return (
      <div className="bg-gray-800 border-2 border-gray-600 rounded-lg shadow-2xl max-w-sm w-full">
        <div className="bg-gradient-to-r from-blue-600 to-cyan-600 px-4 py-2 rounded-t-md flex items-center justify-between cursor-move">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
            <span className="text-white text-sm font-medium ml-2">
              {message.from} → {message.to}
            </span>
          </div>
          <div className="flex items-center space-x-1">
            {showDelete ? (
              <button
                onClick={() => deleteMessage(message.id)}
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
            {message.content.startsWith('data:') ? (
              <audio
                controls
                src={message.content}
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
            {message.content.startsWith('data:') ? (
              <video
                controls
                src={message.content}
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
          <div className="mb-3 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg aspect-video flex items-center justify-center">
            <Image className="w-12 h-12 text-white/50" />
          </div>
        )}

        <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
          <span>{message.timestamp}</span>
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
                onClick={() => addReaction(message.id, reaction.icon)}
                className={`w-8 h-8 rounded-full flex items-center justify-center transition ${
                  message.reactions.includes(reaction.icon)
                    ? 'bg-blue-500/30 ring-2 ring-blue-500'
                    : 'bg-gray-800 hover:bg-gray-700'
                }`}
              >
                <span className="text-sm">{reaction.icon}</span>
              </button>
            ))}
            {reactions.length > 4 && (
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
            onClick={() => togglePin(message.id)}
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

        {/* Desktop: Scattered absolute positioning */}
        <div className="hidden md:block relative">
          {dashboardMessages.map((message) => (
            <div
              key={message.id}
              className="absolute"
              style={{
                left: `${message.position.x}px`,
                top: `${message.position.y}px`,
                zIndex: 1,
              }}
            >
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
                  onClick={() => setShowNewMessage(false)}
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
                        setNewMessageType(option.type as any);
                        cancelRecording();
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
                        <button
                          onClick={startRecording}
                          className="w-full py-12 bg-gray-800 border-2 border-dashed border-gray-600 rounded-lg hover:border-blue-500 hover:bg-gray-800/50 transition flex flex-col items-center justify-center"
                        >
                          <Video className="w-12 h-12 text-blue-400 mb-3" />
                          <span className="text-white font-medium">Start Recording</span>
                          <span className="text-gray-400 text-sm mt-1">Max 60 seconds</span>
                        </button>
                        <button
                          onClick={switchCamera}
                          className="w-full py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-sm transition flex items-center justify-center"
                        >
                          <Camera className="w-4 h-4 mr-2" />
                          Switch to {facingMode === 'user' ? 'Back' : 'Front'} Camera
                        </button>
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
                          </div>
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

                {/* Image Upload - Placeholder */}
                {newMessageType === 'image' && (
                  <div className="py-12 text-center text-gray-400">
                    <Image className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>Image upload coming soon...</p>
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
