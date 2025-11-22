import React, { useState } from 'react';
import { X, Upload, Link as LinkIcon, Loader } from 'lucide-react';
import { uploadFile, uploadFromUrl, createMediaItem, getFileType, MediaMetadata } from '../lib/mediaService';

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

type UploadStep = 'select' | 'upload' | 'metadata' | 'complete';

export function UploadModal({ isOpen, onClose, onUploadComplete }: UploadModalProps) {
  const [step, setStep] = useState<UploadStep>('select');
  const [uploadMethod, setUploadMethod] = useState<'device' | 'url'>('device');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [googlePhotosUrls, setGooglePhotosUrls] = useState<string>('');
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [currentMetadataIndex, setCurrentMetadataIndex] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    console.log('[UploadModal] File input changed', e.target.files);
    if (e.target.files) {
      const allFiles = Array.from(e.target.files);
      console.log('[UploadModal] All selected files:', allFiles.map(f => ({ name: f.name, type: f.type, size: f.size })));

      const files = allFiles.filter((file) => {
        return file.type.startsWith('image/') || file.type.startsWith('video/');
      });

      console.log('[UploadModal] Filtered files (images/videos only):', files.map(f => ({ name: f.name, type: f.type })));
      setSelectedFiles(files);
      setError(null);
    }
  };

  const handleUpload = async () => {
    setIsUploading(true);
    setError(null);
    setStep('upload');

    try {
      const uploaded: UploadedFile[] = [];

      if (uploadMethod === 'device') {
        // Upload files from device
        for (const file of selectedFiles) {
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
      } else {
        // Upload from Google Photos URLs
        const urls = googlePhotosUrls
          .split('\n')
          .map((url) => url.trim())
          .filter((url) => url.length > 0);

        for (let i = 0; i < urls.length; i++) {
          const url = urls[i];
          const fileName = `google-photos-${Date.now()}-${i}.jpg`;
          const { path, url: publicUrl } = await uploadFromUrl(url, fileName);

          uploaded.push({
            url,
            storagePath: path,
            publicUrl,
            fileName,
            fileType: 'image', // Assume images from Google Photos
            mimeType: 'image/jpeg',
            fileSize: null,
            metadata: {},
          });
        }
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

    const metadata: MediaMetadata = {
      description: formData.get('description') as string || undefined,
      location: formData.get('location') as string || undefined,
      taken_date: formData.get('taken_date') as string || undefined,
    };

    // Update current file's metadata
    const updatedFiles = [...uploadedFiles];
    updatedFiles[currentMetadataIndex].metadata = metadata;
    setUploadedFiles(updatedFiles);

    // Move to next file or complete
    if (currentMetadataIndex < uploadedFiles.length - 1) {
      setCurrentMetadataIndex(currentMetadataIndex + 1);
    } else {
      // All metadata collected, save to database
      await saveAllMedia();
    }
  };

  const handleSkipMetadata = () => {
    if (currentMetadataIndex < uploadedFiles.length - 1) {
      setCurrentMetadataIndex(currentMetadataIndex + 1);
    } else {
      saveAllMedia();
    }
  };

  const saveAllMedia = async () => {
    setIsUploading(true);
    setError(null);

    try {
      for (const file of uploadedFiles) {
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
    setUploadMethod('device');
    setSelectedFiles([]);
    setGooglePhotosUrls('');
    setUploadedFiles([]);
    setCurrentMetadataIndex(0);
    setError(null);
    onClose();
  };

  if (!isOpen) return null;

  const currentFile = uploadedFiles[currentMetadataIndex];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-gray-700">
        <div className="p-6 border-b border-gray-700 flex items-center justify-between sticky top-0 bg-gray-900">
          <h2 className="text-2xl font-semibold text-white">
            {step === 'select' && 'Add Media'}
            {step === 'upload' && 'Uploading...'}
            {step === 'metadata' && `Add Details (${currentMetadataIndex + 1}/${uploadedFiles.length})`}
            {step === 'complete' && 'Upload Complete!'}
          </h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-200 transition-colors"
            disabled={isUploading}
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6">
          {error && (
            <div className="mb-4 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400">
              {error}
            </div>
          )}

          {/* Step 1: Select Upload Method */}
          {step === 'select' && (
            <div className="space-y-6">
              <div className="flex gap-4">
                <button
                  onClick={() => setUploadMethod('device')}
                  className={`flex-1 p-4 border-2 rounded-lg transition-all ${
                    uploadMethod === 'device'
                      ? 'border-blue-500 bg-blue-500/10'
                      : 'border-gray-700 hover:border-gray-600'
                  }`}
                >
                  <Upload className="w-8 h-8 mx-auto mb-2 text-blue-500" />
                  <p className="font-medium text-white">Upload from Device</p>
                </button>
                <button
                  onClick={() => setUploadMethod('url')}
                  className={`flex-1 p-4 border-2 rounded-lg transition-all ${
                    uploadMethod === 'url'
                      ? 'border-blue-500 bg-blue-500/10'
                      : 'border-gray-700 hover:border-gray-600'
                  }`}
                >
                  <LinkIcon className="w-8 h-8 mx-auto mb-2 text-blue-500" />
                  <p className="font-medium text-white">Google Photos URL</p>
                </button>
              </div>

              {uploadMethod === 'device' ? (
                <div>
                  <label className="block w-full p-8 border-2 border-dashed border-gray-700 rounded-lg hover:border-blue-500 transition-colors cursor-pointer bg-gray-800/30">
                    <input
                      type="file"
                      multiple
                      accept="image/*,video/*"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                    <Upload className="w-12 h-12 mx-auto mb-4 text-gray-500" />
                    <p className="text-center text-gray-300">
                      Click to select files or drag and drop
                    </p>
                    <p className="text-center text-sm text-gray-500 mt-2">
                      Images and videos supported
                    </p>
                  </label>
                  {selectedFiles.length > 0 && (
                    <div className="mt-4">
                      <p className="text-sm font-medium text-gray-300 mb-2">
                        Selected {selectedFiles.length} file(s):
                      </p>
                      <ul className="space-y-1">
                        {selectedFiles.map((file, index) => (
                          <li key={index} className="text-sm text-gray-400 truncate">
                            {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ) : (
                <div>
                  <label className="block mb-2 text-sm font-medium text-gray-300">
                    Google Photos URLs (one per line)
                  </label>
                  <textarea
                    value={googlePhotosUrls}
                    onChange={(e) => setGooglePhotosUrls(e.target.value)}
                    placeholder="https://lh3.googleusercontent.com/..."
                    className="w-full h-32 px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="mt-2 text-sm text-gray-500">
                    Paste Google Photos share URLs, one per line
                  </p>
                </div>
              )}

              <button
                onClick={handleUpload}
                disabled={
                  isUploading ||
                  (uploadMethod === 'device' && selectedFiles.length === 0) ||
                  (uploadMethod === 'url' && googlePhotosUrls.trim().length === 0)
                }
                className="w-full px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed font-medium"
              >
                {isUploading ? 'Uploading...' : 'Upload'}
              </button>
            </div>
          )}

          {/* Step 2: Uploading */}
          {step === 'upload' && (
            <div className="text-center py-12">
              <Loader className="w-12 h-12 mx-auto mb-4 text-blue-500 animate-spin" />
              <p className="text-gray-400">Uploading your files...</p>
            </div>
          )}

          {/* Step 3: Add Metadata */}
          {step === 'metadata' && currentFile && (
            <div>
              {/* Preview */}
              <div className="mb-6">
                {currentFile.fileType === 'image' ? (
                  <img
                    src={currentFile.publicUrl}
                    alt={currentFile.fileName}
                    className="w-full h-64 object-cover rounded-lg"
                  />
                ) : (
                  <video
                    src={currentFile.publicUrl}
                    controls
                    className="w-full h-64 rounded-lg"
                  />
                )}
              </div>

              <form onSubmit={handleMetadataSubmit} className="space-y-4">
                <div>
                  <label className="block mb-2 text-sm font-medium text-gray-300">
                    Description (optional)
                  </label>
                  <textarea
                    name="description"
                    defaultValue={currentFile.metadata.description}
                    placeholder="Add a description..."
                    className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={3}
                  />
                </div>

                <div>
                  <label className="block mb-2 text-sm font-medium text-gray-300">
                    Location (optional)
                  </label>
                  <input
                    type="text"
                    name="location"
                    defaultValue={currentFile.metadata.location}
                    placeholder="Where was this taken?"
                    className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block mb-2 text-sm font-medium text-gray-300">
                    Date (optional)
                  </label>
                  <input
                    type="date"
                    name="taken_date"
                    defaultValue={currentFile.metadata.taken_date}
                    className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={handleSkipMetadata}
                    className="flex-1 px-6 py-3 border border-gray-700 text-gray-300 rounded-lg hover:bg-gray-800 transition-colors font-medium"
                  >
                    Skip
                  </button>
                  <button
                    type="submit"
                    disabled={isUploading}
                    className="flex-1 px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:bg-gray-600 font-medium"
                  >
                    {currentMetadataIndex < uploadedFiles.length - 1 ? 'Next' : 'Finish'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Step 4: Complete */}
          {step === 'complete' && (
            <div className="text-center py-12">
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
                {uploadedFiles.length} file(s) uploaded successfully
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
