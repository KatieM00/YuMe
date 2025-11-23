import { useState, useEffect } from 'react';
import { Plus, Pin, Image, Mic, Video, X, Inbox, Trash2, XCircle } from 'lucide-react';

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

  const addNewMessage = () => {
    if (newMessageContent.trim()) {
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

  // Filter messages for dashboard: only active and pinned
  const dashboardMessages = messages.filter(
    (msg) => msg.status === 'active' || msg.status === 'pinned'
  );

  // Render message card
  const renderMessageCard = (message: Message, showDelete: boolean = false) => (
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
        {showDelete && (
          <button
            onClick={() => deleteMessage(message.id)}
            className="w-6 h-6 flex items-center justify-center hover:bg-white/20 rounded transition"
          >
            <Trash2 className="w-4 h-4 text-white" />
          </button>
        )}
      </div>

      <div className="p-4 bg-gray-900/95 backdrop-blur-sm">
        {message.type === 'text' && (
          <p className="text-gray-200 mb-3">{message.content}</p>
        )}
        {message.type === 'voice' && (
          <div className="flex items-center space-x-3 mb-3 bg-gray-800/50 rounded-lg p-3">
            <Mic className="w-5 h-5 text-blue-400" />
            <div className="flex-1 h-1 bg-gray-700 rounded-full">
              <div className="w-1/3 h-full bg-blue-500 rounded-full"></div>
            </div>
            <span className="text-gray-400 text-xs">0:15</span>
          </div>
        )}
        {message.type === 'video' && (
          <div className="mb-3 bg-gray-800/50 rounded-lg p-3 text-center">
            <Video className="w-8 h-8 text-blue-400 mx-auto mb-2" />
            <p className="text-gray-400 text-sm">Video message</p>
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

        <div className="flex items-center justify-between border-t border-gray-700 pt-3 mb-3">
          <div className="flex items-center space-x-1 flex-wrap">
            {reactions.map((reaction) => (
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

        {!showDelete && message.status !== 'pinned' && (
          <button
            onClick={() => dismissMessage(message.id)}
            className="w-full py-2 bg-gray-800 hover:bg-gray-700 text-gray-400 rounded-lg transition flex items-center justify-center space-x-2"
          >
            <XCircle className="w-4 h-4" />
            <span className="text-sm">Dismiss</span>
          </button>
        )}
      </div>
    </div>
  );

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
                      onClick={() => setNewMessageType(option.type as any)}
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

                <textarea
                  value={newMessageContent}
                  onChange={(e) => setNewMessageContent(e.target.value)}
                  placeholder="Type your message..."
                  className="w-full h-32 px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />

                <button
                  onClick={addNewMessage}
                  className="w-full mt-4 px-4 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-lg font-medium hover:from-blue-600 hover:to-cyan-600 transition"
                >
                  Send Message
                </button>
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
