import { useState, useEffect } from 'react';
import { Plus, Heart, Smile, Flame, Star, Pin, Image, Mic, Video, X } from 'lucide-react';

interface Message {
  id: number;
  from: string;
  to: string;
  type: 'text' | 'voice' | 'video' | 'image';
  content: string;
  timestamp: string;
  reactions: string[];
  isPinned: boolean;
  position: { x: number; y: number };
}

const reactions = [
  { icon: '❤️', label: 'heart' },
  { icon: '😁', label: 'smile' },
  { icon: '🔥', label: 'fire' },
  { icon: '⭐', label: 'star' },
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
      reactions: ['❤️'],
      isPinned: true,
      position: { x: 50, y: 50 },
    },
    {
      id: 2,
      from: 'Nassos',
      to: 'Katie',
      type: 'text',
      content: 'Just booked our summer trip! Greece here we come!',
      timestamp: '2024-11-09 18:45',
      reactions: ['❤️', '🔥'],
      isPinned: true,
      position: { x: 400, y: 150 },
    },
    {
      id: 3,
      from: 'Sofia',
      to: 'Alex',
      type: 'voice',
      content: 'Voice message: "Good morning my love..."',
      timestamp: '2024-11-08 08:15',
      reactions: ['😁'],
      isPinned: false,
      position: { x: 100, y: 300 },
    },
  ]);

  const [showNewMessage, setShowNewMessage] = useState(false);
  const [newMessageContent, setNewMessageContent] = useState('');
  const [newMessageType, setNewMessageType] = useState<'text' | 'voice' | 'video' | 'image'>('text');
  const [draggedMessage, setDraggedMessage] = useState<number | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem('yumeMessages');
    if (saved) {
      setMessages(JSON.parse(saved));
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
      msg.id === messageId ? { ...msg, isPinned: !msg.isPinned } : msg
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
        isPinned: false,
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
    const updated = messages.filter((msg) => msg.id !== messageId);
    setMessages(updated);
    saveToStorage(updated);
  };

  return (
    <div className="min-h-screen p-4 md:p-8 relative overflow-hidden">
      <div className="max-w-7xl mx-auto relative" style={{ minHeight: '600px' }}>
        <div className="flex items-center justify-between mb-8 relative z-10">
          <h1 className="text-3xl md:text-4xl font-bold text-white">Messages</h1>
          <button
            onClick={() => setShowNewMessage(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-lg font-medium hover:from-blue-600 hover:to-cyan-600 transition"
          >
            <Plus className="w-5 h-5" />
            <span>New Message</span>
          </button>
        </div>

        <div className="relative">
          {messages.map((message) => (
            <div
              key={message.id}
              className="absolute"
              style={{
                left: `${message.position.x}px`,
                top: `${message.position.y}px`,
                zIndex: draggedMessage === message.id ? 50 : 1,
              }}
            >
              <div className="bg-gray-800 border-2 border-gray-600 rounded-lg shadow-2xl max-w-sm">
                <div className="bg-gradient-to-r from-blue-600 to-cyan-600 px-4 py-2 rounded-t-md flex items-center justify-between cursor-move">
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 rounded-full bg-red-500"></div>
                    <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                    <div className="w-3 h-3 rounded-full bg-green-500"></div>
                    <span className="text-white text-sm font-medium ml-2">
                      {message.from} → {message.to}
                    </span>
                  </div>
                  <button
                    onClick={() => deleteMessage(message.id)}
                    className="w-6 h-6 flex items-center justify-center hover:bg-white/20 rounded transition"
                  >
                    <X className="w-4 h-4 text-white" />
                  </button>
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
                  </div>

                  <div className="flex items-center justify-between border-t border-gray-700 pt-3">
                    <div className="flex items-center space-x-1">
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
                        message.isPinned
                          ? 'bg-yellow-500/30 text-yellow-400'
                          : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                      }`}
                    >
                      <Pin className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

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
      </div>
    </div>
  );
}
