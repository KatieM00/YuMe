import { useState, useEffect } from 'react';
import { X, Loader, Image as ImageIcon, CheckCircle, AlertCircle } from 'lucide-react';
import {
  getAllGooglePhotosAlbums,
  getAllAlbumMediaItems,
  getDownloadUrl,
  extractMetadata,
  type GooglePhotosAlbum,
  type GooglePhotosMediaItem,
} from '../lib/googlePhotosService';
import { uploadFromUrl, createMediaItem } from '../lib/mediaService';

interface GooglePhotosImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportComplete: () => void;
}

interface ImportProgress {
  total: number;
  current: number;
  currentFileName: string;
  status: 'idle' | 'loading_albums' | 'selecting' | 'importing' | 'completed' | 'error';
  error?: string;
}

export default function GooglePhotosImportModal({ isOpen, onClose, onImportComplete }: GooglePhotosImportModalProps) {
  const [albums, setAlbums] = useState<GooglePhotosAlbum[]>([]);
  const [selectedAlbum, setSelectedAlbum] = useState<GooglePhotosAlbum | null>(null);
  const [mediaItems, setMediaItems] = useState<GooglePhotosMediaItem[]>([]);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [progress, setProgress] = useState<ImportProgress>({
    total: 0,
    current: 0,
    currentFileName: '',
    status: 'idle',
  });

  useEffect(() => {
    if (isOpen) {
      loadAlbums();
    } else {
      // Reset state when modal closes
      setAlbums([]);
      setSelectedAlbum(null);
      setMediaItems([]);
      setSelectedItems(new Set());
      setProgress({
        total: 0,
        current: 0,
        currentFileName: '',
        status: 'idle',
      });
    }
  }, [isOpen]);

  const loadAlbums = async () => {
    setProgress({ total: 0, current: 0, currentFileName: '', status: 'loading_albums' });
    try {
      const allAlbums = await getAllGooglePhotosAlbums();
      setAlbums(allAlbums);
      setProgress({ total: 0, current: 0, currentFileName: '', status: 'selecting' });
    } catch (err) {
      console.error('Error loading albums:', err);
      setProgress({
        total: 0,
        current: 0,
        currentFileName: '',
        status: 'error',
        error: 'Failed to load Google Photos albums. Please make sure you\'re connected.',
      });
    }
  };

  const loadAlbumMediaItems = async (album: GooglePhotosAlbum) => {
    setSelectedAlbum(album);
    setProgress({ total: 0, current: 0, currentFileName: '', status: 'loading_albums' });
    try {
      const items = await getAllAlbumMediaItems(album.id);
      setMediaItems(items);
      setProgress({ total: 0, current: 0, currentFileName: '', status: 'selecting' });
    } catch (err) {
      console.error('Error loading album media:', err);
      setProgress({
        total: 0,
        current: 0,
        currentFileName: '',
        status: 'error',
        error: 'Failed to load photos from album.',
      });
    }
  };

  const toggleSelectItem = (itemId: string) => {
    setSelectedItems((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  };

  const selectAllItems = () => {
    setSelectedItems(new Set(mediaItems.map((item) => item.id)));
  };

  const deselectAllItems = () => {
    setSelectedItems(new Set());
  };

  const handleImport = async () => {
    if (selectedItems.size === 0) {
      return;
    }

    const itemsToImport = mediaItems.filter((item) => selectedItems.has(item.id));
    setProgress({
      total: itemsToImport.length,
      current: 0,
      currentFileName: '',
      status: 'importing',
    });

    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < itemsToImport.length; i++) {
      const item = itemsToImport[i];
      setProgress((prev) => ({
        ...prev,
        current: i + 1,
        currentFileName: item.filename,
      }));

      try {
        // Get the download URL for the media item
        const downloadUrl = getDownloadUrl(item);

        // Upload the file from URL to our Supabase storage
        const uploadedFile = await uploadFromUrl(downloadUrl, item.filename);

        // Extract metadata
        const metadata = extractMetadata(item);

        // Create media item in database
        await createMediaItem({
          storage_path: uploadedFile.storage_path,
          public_url: uploadedFile.public_url,
          file_name: item.filename,
          file_type: item.mimeType.startsWith('video/') ? 'video' : 'image',
          mime_type: item.mimeType,
          file_size: 0, // Google Photos API doesn't provide file size
          description: metadata.description,
          location: metadata.location,
          taken_date: metadata.takenDate,
        });

        successCount++;
      } catch (err) {
        console.error(`Error importing ${item.filename}:`, err);
        errorCount++;
      }
    }

    if (errorCount === 0) {
      setProgress({
        total: itemsToImport.length,
        current: itemsToImport.length,
        currentFileName: '',
        status: 'completed',
      });
      // Wait a bit to show success message, then close and refresh
      setTimeout(() => {
        onImportComplete();
        onClose();
      }, 2000);
    } else {
      setProgress({
        total: itemsToImport.length,
        current: successCount,
        currentFileName: '',
        status: 'error',
        error: `Imported ${successCount} of ${itemsToImport.length} items. ${errorCount} failed.`,
      });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col border border-gray-700">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <h2 className="text-lg font-semibold text-white">Import from Google Photos</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-800 rounded-lg transition"
            disabled={progress.status === 'importing'}
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {/* Loading Albums */}
          {progress.status === 'loading_albums' && (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <Loader className="w-8 h-8 text-blue-500 animate-spin" />
              <p className="text-gray-400">Loading albums...</p>
            </div>
          )}

          {/* Error State */}
          {progress.status === 'error' && (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <AlertCircle className="w-12 h-12 text-red-500" />
              <p className="text-red-400 text-center">{progress.error}</p>
              <button
                onClick={loadAlbums}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition"
              >
                Try Again
              </button>
            </div>
          )}

          {/* Album Selection */}
          {progress.status === 'selecting' && !selectedAlbum && (
            <div>
              <h3 className="text-sm font-semibold text-gray-300 mb-4">Select an Album</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {albums.map((album) => (
                  <button
                    key={album.id}
                    onClick={() => loadAlbumMediaItems(album)}
                    className="flex flex-col items-center p-4 bg-gray-800 hover:bg-gray-700 rounded-lg transition border border-gray-700"
                  >
                    {album.coverPhotoBaseUrl ? (
                      <img
                        src={`${album.coverPhotoBaseUrl}=w200-h200-c`}
                        alt={album.title}
                        className="w-full aspect-square object-cover rounded-lg mb-2"
                      />
                    ) : (
                      <div className="w-full aspect-square bg-gray-700 rounded-lg mb-2 flex items-center justify-center">
                        <ImageIcon className="w-8 h-8 text-gray-500" />
                      </div>
                    )}
                    <p className="text-white text-sm font-medium text-center line-clamp-2">{album.title}</p>
                    <p className="text-gray-400 text-xs mt-1">{album.mediaItemsCount} items</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Photo Selection */}
          {progress.status === 'selecting' && selectedAlbum && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <button
                    onClick={() => {
                      setSelectedAlbum(null);
                      setMediaItems([]);
                      setSelectedItems(new Set());
                    }}
                    className="text-blue-400 hover:text-blue-300 text-sm"
                  >
                    ← Back to albums
                  </button>
                  <h3 className="text-sm font-semibold text-gray-300 mt-2">{selectedAlbum.title}</h3>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={selectAllItems}
                    className="px-3 py-1.5 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 rounded-md text-xs transition"
                  >
                    Select All
                  </button>
                  <button
                    onClick={deselectAllItems}
                    className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-md text-xs transition"
                  >
                    Deselect All
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
                {mediaItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => toggleSelectItem(item.id)}
                    className={`relative aspect-square rounded-lg overflow-hidden border-2 transition ${
                      selectedItems.has(item.id)
                        ? 'border-blue-500 ring-2 ring-blue-500/50'
                        : 'border-gray-700 hover:border-gray-600'
                    }`}
                  >
                    <img
                      src={`${item.baseUrl}=w200-h200-c`}
                      alt={item.filename}
                      className="w-full h-full object-cover"
                    />
                    {selectedItems.has(item.id) && (
                      <div className="absolute top-1 right-1 bg-blue-500 rounded-full p-0.5">
                        <CheckCircle className="w-4 h-4 text-white" />
                      </div>
                    )}
                    {item.mimeType.startsWith('video/') && (
                      <div className="absolute bottom-1 left-1 bg-black/70 px-1.5 py-0.5 rounded text-[10px] text-white">
                        VIDEO
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Importing Progress */}
          {progress.status === 'importing' && (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <Loader className="w-12 h-12 text-blue-500 animate-spin" />
              <div className="text-center">
                <p className="text-white font-medium">
                  Importing {progress.current} of {progress.total}
                </p>
                <p className="text-gray-400 text-sm mt-1">{progress.currentFileName}</p>
              </div>
              <div className="w-full max-w-md bg-gray-800 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-blue-500 h-full transition-all duration-300"
                  style={{ width: `${(progress.current / progress.total) * 100}%` }}
                />
              </div>
            </div>
          )}

          {/* Completed */}
          {progress.status === 'completed' && (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <CheckCircle className="w-12 h-12 text-green-500" />
              <div className="text-center">
                <p className="text-white font-medium">Import Complete!</p>
                <p className="text-gray-400 text-sm mt-1">
                  Successfully imported {progress.total} {progress.total === 1 ? 'item' : 'items'}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {progress.status === 'selecting' && selectedAlbum && (
          <div className="p-4 border-t border-gray-700 flex items-center justify-between">
            <p className="text-gray-400 text-sm">
              {selectedItems.size} {selectedItems.size === 1 ? 'item' : 'items'} selected
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={onClose}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition"
              >
                Cancel
              </button>
              <button
                onClick={handleImport}
                disabled={selectedItems.size === 0}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Import {selectedItems.size > 0 && `(${selectedItems.size})`}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
