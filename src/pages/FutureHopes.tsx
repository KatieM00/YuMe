import { useState, useEffect } from 'react';
import { Plus, Image, Type, List, X } from 'lucide-react';

interface ScrapbookItem {
  id: number;
  type: 'image' | 'text' | 'goal';
  content: string;
  position: { x: number; y: number };
  color?: string;
}

export default function FutureHopes() {
  const [items, setItems] = useState<ScrapbookItem[]>([
    {
      id: 1,
      type: 'text',
      content: 'Build our dream home together',
      position: { x: 50, y: 50 },
      color: 'bg-gradient-to-br from-blue-500 to-cyan-500',
    },
    {
      id: 2,
      type: 'goal',
      content: 'Visit every continent together',
      position: { x: 400, y: 100 },
      color: 'bg-gradient-to-br from-green-500 to-teal-500',
    },
    {
      id: 3,
      type: 'image',
      content: 'bg-gradient-to-br from-pink-400 to-red-500',
      position: { x: 150, y: 300 },
    },
    {
      id: 4,
      type: 'text',
      content: 'Grow old together, watching sunsets',
      position: { x: 600, y: 250 },
      color: 'bg-gradient-to-br from-orange-500 to-pink-500',
    },
    {
      id: 5,
      type: 'goal',
      content: 'Learn to cook all our favorite dishes',
      position: { x: 100, y: 500 },
      color: 'bg-gradient-to-br from-yellow-500 to-orange-500',
    },
  ]);

  const [showAddModal, setShowAddModal] = useState(false);
  const [newItemType, setNewItemType] = useState<'image' | 'text' | 'goal'>('text');
  const [newItemContent, setNewItemContent] = useState('');

  useEffect(() => {
    const saved = localStorage.getItem('yumeFutureHopes');
    if (saved) {
      setItems(JSON.parse(saved));
    }
  }, []);

  const saveToStorage = (updatedItems: ScrapbookItem[]) => {
    localStorage.setItem('yumeFutureHopes', JSON.stringify(updatedItems));
  };

  const colors = [
    'bg-gradient-to-br from-blue-500 to-cyan-500',
    'bg-gradient-to-br from-green-500 to-teal-500',
    'bg-gradient-to-br from-pink-500 to-red-500',
    'bg-gradient-to-br from-orange-500 to-yellow-500',
    'bg-gradient-to-br from-purple-500 to-pink-500',
  ];

  const addNewItem = () => {
    if (newItemContent.trim() || newItemType === 'image') {
      const newItem: ScrapbookItem = {
        id: Date.now(),
        type: newItemType,
        content: newItemType === 'image' ? colors[Math.floor(Math.random() * colors.length)] : newItemContent,
        position: { x: Math.random() * 400 + 50, y: Math.random() * 300 + 100 },
        color: newItemType !== 'image' ? colors[Math.floor(Math.random() * colors.length)] : undefined,
      };
      const updated = [...items, newItem];
      setItems(updated);
      saveToStorage(updated);
      setNewItemContent('');
      setShowAddModal(false);
    }
  };

  const deleteItem = (id: number) => {
    const updated = items.filter((item) => item.id !== id);
    setItems(updated);
    saveToStorage(updated);
  };

  return (
    <div className="min-h-screen p-4 md:p-8 relative overflow-hidden">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8 relative z-10">
          <h1 className="text-3xl md:text-4xl font-bold text-white">Future Hopes</h1>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-lg font-medium hover:from-blue-600 hover:to-cyan-600 transition"
          >
            <Plus className="w-5 h-5" />
            <span>Add Item</span>
          </button>
        </div>

        <div className="relative bg-gray-900/30 rounded-2xl border border-gray-700 p-8" style={{ minHeight: '800px' }}>
          <div className="absolute inset-0 bg-gradient-to-br from-gray-900/50 via-transparent to-gray-900/50 rounded-2xl"></div>

          {items.map((item) => (
            <div
              key={item.id}
              className="absolute cursor-move group"
              style={{
                left: `${item.position.x}px`,
                top: `${item.position.y}px`,
              }}
            >
              {item.type === 'image' && (
                <div className="relative">
                  <div className={`w-48 h-48 ${item.content} rounded-lg shadow-2xl transform rotate-2 group-hover:rotate-0 transition flex items-center justify-center`}>
                    <Image className="w-12 h-12 text-white/30" />
                  </div>
                  <button
                    onClick={() => deleteItem(item.id)}
                    className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
                  >
                    <X className="w-4 h-4 text-white" />
                  </button>
                </div>
              )}

              {item.type === 'text' && (
                <div className="relative">
                  <div className={`${item.color} p-4 rounded-lg shadow-2xl max-w-xs transform -rotate-1 group-hover:rotate-0 transition`}>
                    <p className="text-white font-medium">{item.content}</p>
                  </div>
                  <button
                    onClick={() => deleteItem(item.id)}
                    className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
                  >
                    <X className="w-4 h-4 text-white" />
                  </button>
                </div>
              )}

              {item.type === 'goal' && (
                <div className="relative">
                  <div className={`${item.color} p-4 rounded-lg shadow-2xl max-w-xs transform rotate-1 group-hover:rotate-0 transition`}>
                    <div className="flex items-start space-x-2">
                      <div className="w-5 h-5 rounded-full border-2 border-white mt-0.5 flex-shrink-0"></div>
                      <p className="text-white font-medium">{item.content}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => deleteItem(item.id)}
                    className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
                  >
                    <X className="w-4 h-4 text-white" />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>

        {showAddModal && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-gray-900 rounded-2xl max-w-md w-full p-6 border border-gray-700">
              <h2 className="text-2xl font-bold text-white mb-4">Add to Scrapbook</h2>

              <div className="flex space-x-2 mb-4">
                <button
                  onClick={() => setNewItemType('image')}
                  className={`flex-1 flex flex-col items-center justify-center py-4 rounded-lg transition ${
                    newItemType === 'image'
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                  }`}
                >
                  <Image className="w-6 h-6 mb-1" />
                  <span className="text-sm">Image</span>
                </button>
                <button
                  onClick={() => setNewItemType('text')}
                  className={`flex-1 flex flex-col items-center justify-center py-4 rounded-lg transition ${
                    newItemType === 'text'
                      ? 'bg-blue-500 text-white'
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
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                  }`}
                >
                  <List className="w-6 h-6 mb-1" />
                  <span className="text-sm">Goal</span>
                </button>
              </div>

              {newItemType === 'image' ? (
                <div className="border-2 border-dashed border-gray-700 rounded-xl p-8 text-center hover:border-blue-500 transition cursor-pointer mb-4">
                  <Image className="w-12 h-12 text-gray-600 mx-auto mb-2" />
                  <p className="text-gray-400">Click to upload image</p>
                  <p className="text-gray-600 text-sm mt-1">or drag and drop</p>
                </div>
              ) : (
                <textarea
                  value={newItemContent}
                  onChange={(e) => setNewItemContent(e.target.value)}
                  placeholder={newItemType === 'goal' ? 'Enter your goal...' : 'Enter your text...'}
                  className="w-full h-32 px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none mb-4"
                />
              )}

              <div className="flex space-x-2">
                <button
                  onClick={addNewItem}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-lg font-medium hover:from-blue-600 hover:to-cyan-600 transition"
                >
                  Add
                </button>
                <button
                  onClick={() => {
                    setShowAddModal(false);
                    setNewItemContent('');
                  }}
                  className="px-4 py-3 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
