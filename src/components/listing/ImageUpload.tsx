import React, { useState, useCallback } from 'react';
import { Upload, X, Image as ImageIcon } from 'lucide-react';
import { useDropzone } from 'react-dropzone';

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

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newFiles = acceptedFiles.slice(0, maxImages - images.length);
    
    if (newFiles.length === 0) return;

    const newImages = [...images, ...newFiles];
    setImages(newImages);

    // Create preview URLs
    const newPreviews = newFiles.map(file => URL.createObjectURL(file));
    setPreviews([...previews, ...newPreviews]);

    // Call parent callback
    if (onImagesChange) {
      onImagesChange(newImages);
    }
  }, [images, previews, maxImages, onImagesChange]);

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
    
    setImages(newImages);
    setPreviews(newPreviews);
    
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