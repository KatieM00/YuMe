import React, { useState, useEffect } from 'react';
import { X, Upload, Loader, ChevronLeft, ChevronRight, Grid, Layers, MapPin, Image as ImageIcon, CheckCircle } from 'lucide-react';
import { uploadFile, uploadFromUrl, createMediaItem, getFileType, MediaMetadata } from '../lib/mediaService';
import {
  checkGooglePhotosConnection,
  getAllGooglePhotosAlbums,
  getAllAlbumMediaItems,
  getDownloadUrl,
  extractMetadata,
  type GooglePhotosAlbum,
  type GooglePhotosMediaItem,
} from '../lib/googlePhotosService';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadComplete: () => void;
}

interface UploadedFile {
  file?: File;
  url?: string;
  storagePath: string;
  publicUrl: string;
  fileName: string;
  fileType: 'image' | 'video';
  mimeType: string;
  fileSize: number | null;
  metadata: MediaMetadata;
}

type UploadStep = 'select' | 'upload-type' | 'upload' | 'metadata' | 'complete';
type UploadType = 'individual' | 'carousel';
type ImportSource = 'local' | 'google-photos';

export function UploadModal({ isOpen, onClose, onUploadComplete }: UploadModalProps) {
  const [step, setStep] = useState<UploadStep>('select');
  const [uploadType, setUploadType] = useState<UploadType>('individual');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [currentMetadataIndex, setCurrentMetadataIndex] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [carouselMetadata, setCarouselMetadata] = useState<MediaMetadata>({});

  // Import source state
  const [importSource, setImportSource] = useState<ImportSource>('local');
  const [googlePhotosConnected, setGooglePhotosConnected] = useState(false);

  // Google Photos state
  const [albums, setAlbums] = useState<GooglePhotosAlbum[]>([]);
  const [selectedAlbum, setSelectedAlbum] = useState<GooglePhotosAlbum | null>(null);
  const [googlePhotosItems, setGooglePhotosItems] = useState<GooglePhotosMediaItem[]>([]);
  const [selectedGooglePhotosItems, setSelectedGooglePhotosItems] = useState<Set<string>>(new Set());
  const [isLoadingAlbums, setIsLoadingAlbums] = useState(false);

  // Location search state
  const [locationQuery, setLocationQuery] = useState('');
  const [locationSuggestions, setLocationSuggestions] = useState<any[]>([]);
  const [isSearchingLocation, setIsSearchingLocation] = useState(false);
  const [showLocationSuggestions, setShowLocationSuggestions] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState('');

  const MAX_CAROUSEL_ITEMS = 10;
  const mapboxToken = import.meta.env.VITE_MAPBOX_TOKEN;
  const hasMapboxToken = mapboxToken && mapboxToken !== '';

  // Location search function
  const searchLocation = async (query: string) => {
    if (!query.trim() || !hasMapboxToken) {
      setLocationSuggestions([]);
      return;
    }

    setIsSearchingLocation(true);
    try {
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
          query
        )}.json?access_token=${mapboxToken}&limit=5&types=place,locality,region,country`
      );
      const data = await response.json();

      if (data.features) {
        setLocationSuggestions(data.features);
        setShowLocationSuggestions(true);
      }
    } catch (err) {
      console.error('Geocoding error:', err);
    } finally {
      setIsSearchingLocation(false);
    }
  };

  // Debounce location search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (locationQuery) {
        searchLocation(locationQuery);
      } else {
        setLocationSuggestions([]);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [locationQuery]);

  const selectLocationSuggestion = (placeName: string) => {
    setSelectedLocation(placeName);
    setLocationQuery(placeName);
    setLocationSuggestions([]);
    setShowLocationSuggestions(false);
  };

  // Check Google Photos connection when modal opens
  useEffect(() => {
    if (isOpen) {
      checkGooglePhotosStatus();
    }
  }, [isOpen]);

  const checkGooglePhotosStatus = async () => {
    try {
      const connection = await checkGooglePhotosConnection();
      setGooglePhotosConnected(connection.connected);
    } catch (err) {
      console.error('Error checking Google Photos connection:', err);
      setGooglePhotosConnected(false);
    }
  };

  // Load Google Photos albums when switching to Google Photos tab
  const loadGooglePhotosAlbums = async () => {
    setIsLoadingAlbums(true);
    setError(null);
    try {
      const allAlbums = await getAllGooglePhotosAlbums();
      setAlbums(allAlbums);
    } catch (err) {
      console.error('Error loading albums:', err);
      setError('Failed to load Google Photos albums. Please try again.');
    } finally {
      setIsLoadingAlbums(false);
    }
  };

  // Load media items from selected album
  const loadAlbumMedia = async (album: GooglePhotosAlbum) => {
    setSelectedAlbum(album);
    setIsLoadingAlbums(true);
    setError(null);
    try {
      const items = await getAllAlbumMediaItems(album.id);
      setGooglePhotosItems(items);
    } catch (err) {
      console.error('Error loading album media:', err);
      setError('Failed to load photos from album.');
    } finally {
      setIsLoadingAlbums(false);
    }
  };

  // Toggle selection of Google Photos item
  const toggleGooglePhotoSelection = (itemId: string) => {
    setSelectedGooglePhotosItems((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  };

  const handleGooglePhotosUpload = async () => {
    setIsUploading(true);
    setError(null);

    try {
      const itemsToUpload = googlePhotosItems.filter(item =>
        selectedGooglePhotosItems.has(item.id)
      );

      const uploaded: UploadedFile[] = [];

      for (const item of itemsToUpload) {
        const downloadUrl = getDownloadUrl(item);
        const uploadedFile = await uploadFromUrl(downloadUrl, item.filename);
        const metadata = extractMetadata(item);

        uploaded.push({
          storagePath: uploadedFile.path,
          publicUrl: uploadedFile.url,
          fileName: item.filename,
          fileType: item.mimeType.startsWith('video/') ? 'video' : 'image',
          mimeType: item.mimeType,
          fileSize: 0,
          metadata: {
            description: metadata.description || '',
            location: metadata.location || '',
            taken_date: metadata.takenDate || undefined,
          },
        });
      }

      setUploadedFiles(uploaded);
      setStep('metadata');
    } catch (err) {
      console.error('Error uploading from Google Photos:', err);
      setError('Failed to import photos. Please try again.');
      setStep('select');
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const allFiles = Array.from(e.target.files);
      const MAX_VIDEO_SIZE = 100 * 1024 * 1024; // 100MB
      const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB

      const validFiles: File[] = [];
      const errors: string[] = [];

      allFiles.forEach((file) => {
        if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
          errors.push(`${file.name}: Unsupported file type`);
          return;
        }

        const isVideo = file.type.startsWith('video/');
        const maxSize = isVideo ? MAX_VIDEO_SIZE : MAX_IMAGE_SIZE;

        if (file.size > maxSize) {
          const sizeMB = (file.size / 1024 / 1024).toFixed(2);
          const maxSizeMB = (maxSize / 1024 / 1024).toFixed(0);
          errors.push(`${file.name}: File too large (${sizeMB}MB). Max ${maxSizeMB}MB for ${isVideo ? 'videos' : 'images'}`);
          return;
        }

        validFiles.push(file);
      });

      setSelectedFiles(validFiles);

      if (errors.length > 0) {
        setError(errors.join('\n'));
      } else {
        setError(null);
      }
    }
  };

  const handleUploadTypeSelection = () => {
    if (selectedFiles.length === 0) {
      setError('Please select files first');
      return;
    }

    if (selectedFiles.length === 1) {
      // Skip upload type selection for single file
      setUploadType('individual');
      handleUpload('individual');
    } else if (selectedFiles.length > MAX_CAROUSEL_ITEMS) {
      setError(`Carousel limited to ${MAX_CAROUSEL_ITEMS} items. You selected ${selectedFiles.length} files.`);
    } else {
      setStep('upload-type');
    }
  };

  const handleUpload = async (type?: UploadType) => {
    const finalUploadType = type || uploadType;
    setIsUploading(true);
    setError(null);
    setStep('upload');

    try {
      const uploaded: UploadedFile[] = [];

      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        const { path, url } = await uploadFile(file);

        uploaded.push({
          file,
          storagePath: path,
          publicUrl: url,
          fileName: file.name,
          fileType: getFileType(file.type),
          mimeType: file.type,
          fileSize: file.size,
          metadata: {},
        });
      }

      setUploadedFiles(uploaded);
      setStep('metadata');
      setCurrentMetadataIndex(0);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
      setStep('select');
    } finally {
      setIsUploading(false);
    }
  };

  const handleMetadataSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    if (uploadType === 'carousel') {
      // Save carousel metadata
      const metadata: MediaMetadata = {
        description: formData.get('description') as string || undefined,
        location: locationQuery || undefined,
        taken_date: formData.get('taken_date') as string || undefined,
      };
      setCarouselMetadata(metadata);
      await saveCarousel(metadata);
    } else {
      // Individual upload - save current file's metadata
      const metadata: MediaMetadata = {
        description: formData.get('description') as string || undefined,
        location: locationQuery || undefined,
        taken_date: formData.get('taken_date') as string || undefined,
      };

      const updatedFiles = [...uploadedFiles];
      updatedFiles[currentMetadataIndex].metadata = metadata;
      setUploadedFiles(updatedFiles);

      // Move to next file or complete
      if (currentMetadataIndex < uploadedFiles.length - 1) {
        const newIndex = currentMetadataIndex + 1;
        setCurrentMetadataIndex(newIndex);
        // Load location for next file
        setLocationQuery(updatedFiles[newIndex].metadata.location || '');
      } else {
        await saveIndividualMedia();
      }
    }
  };

  const handlePrevious = () => {
    if (currentMetadataIndex > 0) {
      const newIndex = currentMetadataIndex - 1;
      setCurrentMetadataIndex(newIndex);
      // Load location for previous file
      if (uploadType === 'individual') {
        setLocationQuery(uploadedFiles[newIndex].metadata.location || '');
      }
    }
  };

  const handleSkipMetadata = () => {
    if (uploadType === 'carousel') {
      saveCarousel({});
    } else if (currentMetadataIndex < uploadedFiles.length - 1) {
      const newIndex = currentMetadataIndex + 1;
      setCurrentMetadataIndex(newIndex);
      // Load location for next file
      setLocationQuery(uploadedFiles[newIndex].metadata.location || '');
    } else {
      saveIndividualMedia();
    }
  };

  // Load location when step changes to metadata
  useEffect(() => {
    if (step === 'metadata') {
      if (uploadType === 'carousel') {
        setLocationQuery(carouselMetadata.location || '');
      } else if (currentFile) {
        setLocationQuery(currentFile.metadata.location || '');
      }
    }
  }, [step, uploadType, currentMetadataIndex]);

  const saveCarousel = async (metadata: MediaMetadata) => {
    setIsUploading(true);
    setError(null);

    try {
      // Generate a unique carousel ID using crypto.randomUUID()
      const carouselId = crypto.randomUUID();

      for (let i = 0; i < uploadedFiles.length; i++) {
        const file = uploadedFiles[i];
        await createMediaItem(
          file.storagePath,
          file.publicUrl,
          file.fileName,
          file.fileType,
          file.mimeType,
          file.fileSize,
          metadata,
          carouselId,
          i
        );
      }

      setStep('complete');
      setTimeout(() => {
        handleClose();
        onUploadComplete();
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save carousel');
    } finally {
      setIsUploading(false);
    }
  };

  const saveIndividualMedia = async () => {
    setIsUploading(true);
    setError(null);

    try {
      for (let i = 0; i < uploadedFiles.length; i++) {
        const file = uploadedFiles[i];
        await createMediaItem(
          file.storagePath,
          file.publicUrl,
          file.fileName,
          file.fileType,
          file.mimeType,
          file.fileSize,
          file.metadata
        );
      }

      setStep('complete');
      setTimeout(() => {
        handleClose();
        onUploadComplete();
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save media');
    } finally {
      setIsUploading(false);
    }
  };

  const handleClose = () => {
    setStep('select');
    setUploadType('individual');
    setImportSource('local');
    setSelectedFiles([]);
    setUploadedFiles([]);
    setCurrentMetadataIndex(0);
    setCarouselMetadata({});
    setError(null);
    setLocationQuery('');
    setLocationSuggestions([]);
    setSelectedLocation('');
    setShowLocationSuggestions(false);
    // Reset Google Photos state
    setAlbums([]);
    setSelectedAlbum(null);
    setGooglePhotosItems([]);
    setSelectedGooglePhotosItems(new Set());
    onClose();
  };

  if (!isOpen) return null;

  const currentFile = uploadedFiles[currentMetadataIndex];

  return (
    <div
      className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={handleClose}
    >
      <div
        className="bg-gray-900 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden border border-gray-700 flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Step: Select Files */}
        {step === 'select' && (
          <>
            <div className="p-4 border-b border-gray-700 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">Add Media</h2>
              <button
                onClick={handleClose}
                className="w-8 h-8 bg-gray-800 hover:bg-gray-700 rounded-full flex items-center justify-center transition"
              >
                <X className="w-4 h-4 text-white" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-gray-700">
              <button
                onClick={() => setImportSource('local')}
                className={`flex-1 px-4 py-3 text-sm font-medium transition ${
                  importSource === 'local'
                    ? 'text-blue-400 border-b-2 border-blue-400 bg-blue-500/10'
                    : 'text-gray-400 hover:text-gray-300'
                }`}
              >
                From Computer
              </button>
              {googlePhotosConnected && (
                <button
                  onClick={() => {
                    setImportSource('google-photos');
                    if (albums.length === 0) {
                      loadGooglePhotosAlbums();
                    }
                  }}
                  className={`flex-1 px-4 py-3 text-sm font-medium transition ${
                    importSource === 'google-photos'
                      ? 'text-purple-400 border-b-2 border-purple-400 bg-purple-500/10'
                      : 'text-gray-400 hover:text-gray-300'
                  }`}
                >
                  From Google Photos
                </button>
              )}
            </div>

            <div className="p-6 space-y-4">
              {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm whitespace-pre-line">
                  {error}
                </div>
              )}

              {/* Local File Upload */}
              {importSource === 'local' && (
                <>
                  <label className="block p-8 border-2 border-dashed border-gray-700 rounded-lg hover:border-blue-500 transition-colors cursor-pointer bg-gray-800/30">
                    <input
                      type="file"
                      multiple
                      accept="image/*,video/*"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                    <Upload className="w-10 h-10 mx-auto mb-3 text-gray-500" />
                    <p className="text-center text-sm text-gray-300 font-medium">
                      Click to select files
                    </p>
                    <p className="text-center text-xs text-gray-500 mt-1">
                      Images and videos supported
                    </p>
                  </label>

                  {selectedFiles.length > 0 && (
                    <div>
                      <p className="text-sm font-medium text-gray-300 mb-2">
                        Selected {selectedFiles.length} file(s):
                      </p>
                      <div className="max-h-32 overflow-y-auto space-y-1">
                        {selectedFiles.map((file, index) => (
                          <div key={index} className="text-sm text-gray-400 truncate bg-gray-800/50 px-3 py-1.5 rounded">
                            {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <button
                    onClick={handleUploadTypeSelection}
                    disabled={isUploading || selectedFiles.length === 0}
                    className="w-full px-4 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed font-medium text-sm"
                  >
                    Continue
                  </button>
                </>
              )}

              {/* Google Photos Import */}
              {importSource === 'google-photos' && (
                <>
                  {!googlePhotosConnected && (
                    <div className="text-center py-12">
                      <p className="text-gray-400 mb-2">Connect Google Photos to import photos</p>
                      <p className="text-gray-500 text-sm">Go to Settings to connect your account</p>
                    </div>
                  )}

                  {googlePhotosConnected && isLoadingAlbums && (
                    <div className="flex flex-col items-center justify-center py-12">
                      <Loader className="w-8 h-8 text-purple-500 animate-spin mb-3" />
                      <p className="text-gray-400">Loading albums...</p>
                    </div>
                  )}

                  {googlePhotosConnected && !isLoadingAlbums && !selectedAlbum && albums.length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold text-gray-300 mb-3">Select an Album</h3>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-h-96 overflow-y-auto">
                        {albums.map((album) => (
                          <button
                            key={album.id}
                            onClick={() => loadAlbumMedia(album)}
                            className="flex flex-col items-center p-3 bg-gray-800 hover:bg-gray-700 rounded-lg transition border border-gray-700"
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
                            <p className="text-white text-xs font-medium text-center line-clamp-2">{album.title}</p>
                            <p className="text-gray-400 text-xs mt-1">{album.mediaItemsCount} items</p>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {googlePhotosConnected && !isLoadingAlbums && selectedAlbum && (
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <button
                          onClick={() => {
                            setSelectedAlbum(null);
                            setGooglePhotosItems([]);
                            setSelectedGooglePhotosItems(new Set());
                          }}
                          className="text-purple-400 hover:text-purple-300 text-sm"
                        >
                          ← Back to albums
                        </button>
                        <h3 className="text-sm font-semibold text-gray-300">{selectedAlbum.title}</h3>
                      </div>
                      <div className="grid grid-cols-3 md:grid-cols-4 gap-2 max-h-96 overflow-y-auto">
                        {googlePhotosItems.map((item) => (
                          <button
                            key={item.id}
                            onClick={() => toggleGooglePhotoSelection(item.id)}
                            className={`relative aspect-square rounded-lg overflow-hidden border-2 transition ${
                              selectedGooglePhotosItems.has(item.id)
                                ? 'border-purple-500 ring-2 ring-purple-500/50'
                                : 'border-gray-700 hover:border-gray-600'
                            }`}
                          >
                            <img
                              src={`${item.baseUrl}=w200-h200-c`}
                              alt={item.filename}
                              className="w-full h-full object-cover"
                            />
                            {selectedGooglePhotosItems.has(item.id) && (
                              <div className="absolute top-1 right-1 bg-purple-500 rounded-full p-0.5">
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
                      <button
                        onClick={() => {
                          // Continue with Google Photos import
                          setStep('upload');
                          handleGooglePhotosUpload();
                        }}
                        disabled={selectedGooglePhotosItems.size === 0}
                        className="w-full px-4 py-3 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed font-medium text-sm mt-4"
                      >
                        Continue ({selectedGooglePhotosItems.size} selected)
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </>
        )}

        {/* Step: Upload Type Selection */}
        {step === 'upload-type' && (
          <>
            <div className="p-4 border-b border-gray-700 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">How do you want to upload?</h2>
              <button
                onClick={() => setStep('select')}
                className="w-8 h-8 bg-gray-800 hover:bg-gray-700 rounded-full flex items-center justify-center transition"
              >
                <X className="w-4 h-4 text-white" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => {
                    setUploadType('individual');
                    handleUpload('individual');
                  }}
                  className="p-6 border-2 border-gray-700 rounded-lg hover:border-blue-500 hover:bg-gray-800/50 transition-all bg-gray-800/30 text-left"
                >
                  <Grid className="w-8 h-8 mb-3 text-blue-400" />
                  <p className="text-sm text-gray-300 font-medium mb-1">Individual</p>
                  <p className="text-xs text-gray-500">
                    Upload each file separately with unique details
                  </p>
                </button>

                <button
                  onClick={() => {
                    setUploadType('carousel');
                    handleUpload('carousel');
                  }}
                  className="p-6 border-2 border-gray-700 rounded-lg hover:border-purple-500 hover:bg-gray-800/50 transition-all bg-gray-800/30 text-left"
                >
                  <Layers className="w-8 h-8 mb-3 text-purple-400" />
                  <p className="text-sm text-gray-300 font-medium mb-1">Carousel</p>
                  <p className="text-xs text-gray-500">
                    Group {selectedFiles.length} files together (max {MAX_CAROUSEL_ITEMS})
                  </p>
                </button>
              </div>
            </div>
          </>
        )}

        {/* Step: Uploading */}
        {step === 'upload' && (
          <div className="p-12 text-center">
            <Loader className="w-12 h-12 mx-auto mb-4 text-blue-500 animate-spin" />
            <p className="text-gray-400">Uploading your files...</p>
          </div>
        )}

        {/* Step: Add Metadata */}
        {step === 'metadata' && currentFile && (
          <div className="grid md:grid-cols-2 flex-1 min-h-0">
            {/* Left: Preview */}
            <div className="flex items-center justify-center relative bg-black min-h-0 p-4">
              {currentFile.fileType === 'image' ? (
                <img
                  src={currentFile.publicUrl}
                  alt={currentFile.fileName}
                  className="max-w-full max-h-full object-contain"
                />
              ) : (
                <video
                  src={currentFile.publicUrl}
                  controls
                  className="max-w-full max-h-full object-contain"
                />
              )}
            </div>

            {/* Right: Metadata Form */}
            <div className="p-4 flex flex-col overflow-y-auto overflow-x-hidden">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-base font-semibold text-white">
                  {uploadType === 'carousel'
                    ? `Carousel Details (${uploadedFiles.length} items)`
                    : `Add Details (${currentMetadataIndex + 1}/${uploadedFiles.length})`}
                </h2>
                <button
                  onClick={handleClose}
                  className="w-8 h-8 bg-gray-800 hover:bg-gray-700 rounded-full flex items-center justify-center transition"
                >
                  <X className="w-4 h-4 text-white" />
                </button>
              </div>

              {uploadType === 'carousel' && (
                <div className="mb-3 p-2 bg-purple-500/10 border border-purple-500/30 rounded-lg">
                  <p className="text-xs text-purple-300">
                    These details will apply to all {uploadedFiles.length} items in the carousel
                  </p>
                </div>
              )}

              <form key={currentMetadataIndex} onSubmit={handleMetadataSubmit} className="space-y-3 flex-1 flex flex-col">
                <div>
                  <label className="block mb-1.5 text-xs font-medium text-gray-300">
                    Description (optional)
                  </label>
                  <textarea
                    name="description"
                    defaultValue={uploadType === 'carousel' ? carouselMetadata.description : currentFile.metadata.description}
                    placeholder="Add a description..."
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={3}
                  />
                </div>

                <div className="relative">
                  <label className="block mb-1.5 text-xs font-medium text-gray-300">
                    Where was this taken? (optional)
                  </label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <input
                      type="text"
                      name="location"
                      value={locationQuery}
                      onChange={(e) => {
                        setLocationQuery(e.target.value);
                        setSelectedLocation('');
                      }}
                      onFocus={() => {
                        if (locationSuggestions.length > 0) setShowLocationSuggestions(true);
                      }}
                      placeholder="Search for a location..."
                      className="w-full pl-10 pr-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    {isSearchingLocation && (
                      <Loader className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 animate-spin" />
                    )}
                  </div>

                  {/* Location suggestions dropdown */}
                  {showLocationSuggestions && locationSuggestions.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-gray-800 border border-gray-700 rounded-lg shadow-xl max-h-48 overflow-y-auto">
                      {locationSuggestions.map((suggestion: any, index: number) => (
                        <button
                          key={index}
                          type="button"
                          onClick={() => selectLocationSuggestion(suggestion.place_name)}
                          className="w-full text-left px-3 py-2 hover:bg-gray-700 text-white text-sm border-b border-gray-700 last:border-b-0"
                        >
                          <MapPin className="inline w-3 h-3 mr-2 text-gray-500" />
                          {suggestion.place_name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block mb-1.5 text-xs font-medium text-gray-300">
                    Date (optional)
                  </label>
                  <input
                    type="date"
                    name="taken_date"
                    defaultValue={uploadType === 'carousel' ? carouselMetadata.taken_date : currentFile.metadata.taken_date}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="flex gap-2 pt-3 mt-auto">
                  {uploadType === 'individual' && currentMetadataIndex > 0 && (
                    <button
                      type="button"
                      onClick={handlePrevious}
                      className="px-3 py-2 border border-gray-700 text-gray-300 rounded-lg hover:bg-gray-800 transition text-xs flex items-center"
                    >
                      <ChevronLeft className="w-4 h-4 mr-1" />
                      Previous
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleSkipMetadata}
                    className="flex-1 px-4 py-2 border border-gray-700 text-gray-300 rounded-lg hover:bg-gray-800 transition font-medium text-sm"
                  >
                    Skip
                  </button>
                  <button
                    type="submit"
                    disabled={isUploading}
                    className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition disabled:bg-gray-600 font-medium text-sm flex items-center justify-center"
                  >
                    {uploadType === 'carousel' ? (
                      'Finish'
                    ) : currentMetadataIndex < uploadedFiles.length - 1 ? (
                      <>
                        Next
                        <ChevronRight className="w-4 h-4 ml-1" />
                      </>
                    ) : (
                      'Finish'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Step: Complete */}
        {step === 'complete' && (
          <div className="p-12 text-center">
            <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-8 h-8 text-green-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <p className="text-xl font-semibold text-white">All set!</p>
            <p className="text-gray-400 mt-2">
              {uploadType === 'carousel'
                ? `Carousel with ${uploadedFiles.length} items uploaded successfully`
                : `${uploadedFiles.length} file(s) uploaded successfully`}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
