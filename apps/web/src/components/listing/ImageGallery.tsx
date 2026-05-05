import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, ZoomIn, Maximize2 } from 'lucide-react';

interface ImageGalleryProps {
  images: string[] | File[]; // Can be URLs or File objects
  maxDisplay?: number;
}

const ImageGallery: React.FC<ImageGalleryProps> = ({ 
  images = [], 
  maxDisplay = 6 
}) => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isZoomed, setIsZoomed] = useState(false);

  // Convert File objects to URLs if needed
  const imageUrls = images.map(img => 
    typeof img === 'string' ? img : URL.createObjectURL(img)
  );

  const handlePrevious = () => {
    setSelectedIndex(prev => (prev > 0 ? prev - 1 : imageUrls.length - 1));
  };

  const handleNext = () => {
    setSelectedIndex(prev => (prev < imageUrls.length - 1 ? prev + 1 : 0));
  };

  const handleThumbnailClick = (index: number) => {
    setSelectedIndex(index);
  };

  if (imageUrls.length === 0) {
    return (
      <div className="w-full h-96 bg-gray-200 rounded-xl flex items-center justify-center">
        <div className="text-center">
          <div className="text-gray-400 text-lg">No Images Available</div>
          <div className="text-gray-400 text-sm mt-2">Upload photos to showcase your item</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Main Image Display */}
      <div className="relative bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="relative aspect-video w-full">
          <img
            src={imageUrls[selectedIndex]}
            alt={`Listing image ${selectedIndex + 1}`}
            className={`w-full h-full object-contain cursor-${isZoomed ? 'zoom-out' : 'zoom-in'} transition-all duration-300`}
            onClick={() => setIsZoomed(!isZoomed)}
            style={{
              transform: isZoomed ? 'scale(1.5)' : 'scale(1)',
              transformOrigin: 'center',
            }}
          />
          
          {/* Navigation Arrows */}
          {imageUrls.length > 1 && (
            <>
              <button
                onClick={handlePrevious}
                className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-white/80 hover:bg-white p-2 rounded-full shadow-lg"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                onClick={handleNext}
                className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-white/80 hover:bg-white p-2 rounded-full shadow-lg"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </>
          )}
          
          {/* Zoom Button */}
          <button
            onClick={() => setIsZoomed(!isZoomed)}
            className="absolute top-4 right-4 bg-white/80 hover:bg-white p-2 rounded-full shadow-lg"
          >
            {isZoomed ? (
              <Maximize2 className="h-5 w-5" />
            ) : (
              <ZoomIn className="h-5 w-5" />
            )}
          </button>
          
          {/* Image Counter */}
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black/70 text-white px-3 py-1 rounded-full text-sm">
            {selectedIndex + 1} / {imageUrls.length}
          </div>
        </div>
      </div>

      {/* Thumbnail Strip */}
      {imageUrls.length > 1 && (
        <div className="flex space-x-2 overflow-x-auto pb-2">
          {imageUrls.slice(0, maxDisplay).map((url, index) => (
            <button
              key={index}
              onClick={() => handleThumbnailClick(index)}
              className={`flex-shrink-0 w-20 h-20 rounded-lg border-2 overflow-hidden ${
                selectedIndex === index 
                  ? 'border-primary-600 ring-2 ring-primary-200' 
                  : 'border-gray-300 hover:border-gray-400'
              }`}
            >
              <img
                src={url}
                alt={`Thumbnail ${index + 1}`}
                className="w-full h-full object-cover"
              />
            </button>
          ))}
          
          {imageUrls.length > maxDisplay && (
            <div className="flex-shrink-0 w-20 h-20 rounded-lg border-2 border-gray-300 flex items-center justify-center text-gray-500">
              +{imageUrls.length - maxDisplay} more
            </div>
          )}
        </div>
      )}

    </div>
  );
};

export default ImageGallery;
