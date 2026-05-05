import React, { useState, useCallback } from 'react';
import { Upload, X, Image as ImageIcon } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import { checkListingImageQuality } from '@/api/endpoints/listing';

interface ImageUploadProps {
  maxImages?: number;
  onImagesChange?: (images: File[]) => void;
}

const ImageUpload: React.FC<ImageUploadProps> = ({ 
  maxImages = 5, 
  onImagesChange 
}) => {
  const [images, setImages] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [qualityMessages, setQualityMessages] = useState<Array<{ verdict: 'accept' | 'warn'; text: string }>>([]);
  const [isCheckingQuality, setIsCheckingQuality] = useState(false);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const newFiles = acceptedFiles.slice(0, maxImages - images.length);
    
    if (newFiles.length === 0) return;

    setIsCheckingQuality(true);
    const acceptedAfterCheck: File[] = [];
    const acceptedMessages: Array<{ verdict: 'accept' | 'warn'; text: string }> = [];

    for (const file of newFiles) {
      try {
        const result = await checkListingImageQuality(file);
        acceptedAfterCheck.push(file);
        if (result.verdict === 'warn' || result.failures.length > 0) {
          const warningText = result.warnings.length > 0 ? result.warnings.join(' ') : 'Image quality can be improved.';
          acceptedMessages.push({
            verdict: 'warn',
            text: warningText,
          });
        } else {
          acceptedMessages.push({
            verdict: 'accept',
            text: 'Image quality looks good.',
          });
        }
      } catch (error) {
        // If check is unavailable, keep UX moving but show a warning.
        acceptedAfterCheck.push(file);
        acceptedMessages.push({
          verdict: 'warn',
          text:
            error instanceof Error
              ? `Quality check unavailable: ${error.message}`
              : 'Quality check unavailable.',
        });
      }
    }

    if (acceptedAfterCheck.length === 0) {
      setIsCheckingQuality(false);
      return;
    }

    const newImages = [...images, ...acceptedAfterCheck];
    setImages(newImages);

    // Create preview URLs
    const newPreviews = acceptedAfterCheck.map(file => URL.createObjectURL(file));
    setPreviews([...previews, ...newPreviews]);
    setQualityMessages([...qualityMessages, ...acceptedMessages]);

    // Call parent callback
    if (onImagesChange) {
      onImagesChange(newImages);
    }
    setIsCheckingQuality(false);
  }, [images, previews, qualityMessages, maxImages, onImagesChange]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp']
    },
    maxFiles: maxImages,
  });

  const removeImage = (index: number) => {
    const newImages = images.filter((_, i) => i !== index);
    const newPreviews = previews.filter((_, i) => i !== index);
    const newQualityMessages = qualityMessages.filter((_, i) => i !== index);
    
    setImages(newImages);
    setPreviews(newPreviews);
    setQualityMessages(newQualityMessages);
    
    // Revoke object URL to prevent memory leak
    URL.revokeObjectURL(previews[index]);
    
    if (onImagesChange) {
      onImagesChange(newImages);
    }
  };

  return (
    <div className="space-y-4">
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors
          ${isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}`}
      >
        <input {...getInputProps()} />
        <Upload className="mx-auto h-12 w-12 text-gray-400" />
        <p className="mt-2 text-sm text-gray-600">
          {isDragActive ? (
            "Drop images here..."
          ) : (
            "Drag & drop images here, or click to select"
          )}
        </p>
        <p className="text-xs text-gray-500 mt-1">
          Upload up to {maxImages} images (PNG, JPG, GIF, WEBP)
        </p>
        {isCheckingQuality ? (
          <p className="mt-2 text-xs text-blue-600">Checking image quality...</p>
        ) : null}
      </div>

      {/* Image Previews */}
      {previews.length > 0 && (
        <div className="grid grid-cols-3 md:grid-cols-5 gap-4">
          {previews.map((preview, index) => (
            <div key={index} className="relative group">
              <img
                src={preview}
                alt={`Preview ${index + 1}`}
                className="w-full h-32 object-cover rounded-lg"
              />
              <button
                type="button"
                onClick={() => removeImage(index)}
                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="h-4 w-4" />
              </button>
              <div className="text-xs text-gray-500 mt-1 truncate">
                {images[index]?.name}
              </div>
              <div
                className={`mt-1 text-[11px] leading-4 ${
                  qualityMessages[index]?.verdict === 'warn' ? 'text-amber-700' : 'text-emerald-700'
                }`}
              >
                {qualityMessages[index]?.text || ''}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Placeholders for remaining slots */}
      {previews.length > 0 && previews.length < maxImages && (
        <div className="grid grid-cols-3 md:grid-cols-5 gap-4">
          {Array.from({ length: maxImages - previews.length }).map((_, index) => (
            <div
              key={`placeholder-${index}`}
              className="border-2 border-dashed border-gray-200 rounded-lg h-32 flex items-center justify-center text-gray-400"
            >
              <ImageIcon className="h-8 w-8" />
            </div>
          ))}
        </div>
      )}

      {/* Image Count */}
      <div className="text-sm text-gray-500">
        {images.length} of {maxImages} images uploaded
      </div>
    </div>
  );
};

export default ImageUpload;
