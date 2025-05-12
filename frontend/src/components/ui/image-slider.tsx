import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useImageSlider } from '@/hooks/useImageSlider';
import { cn } from '@/lib/utils';
import { Button } from './button';

interface ImageSliderProps {
  images: Array<{
    url: string;
    type: string;
  }>;
  className?: string;
}

export const ImageSlider = ({ images, className }: ImageSliderProps) => {
  const { currentIndex, next, prev, goTo, canGoNext, canGoPrev } = useImageSlider({
    totalImages: images.length,
  });

  if (images.length === 0) return null;

  return (
    <div className={cn('relative group max-w-3xl mx-auto', className)}>
      {/* Main Image */}
      <div className="relative aspect-[16/9] w-full overflow-hidden rounded-lg">
        <img
          src={images[currentIndex].url}
          alt={`Post image ${currentIndex + 1}`}
          className="w-full h-full object-contain bg-gray-50"
        />
      </div>

      {/* Navigation Buttons */}
      {images.length > 1 && (
        <>
          {/* Previous Button */}
          {canGoPrev && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute left-3 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={prev}
            >
              <ChevronLeft className="h-6 w-6" />
            </Button>
          )}

          {/* Next Button */}
          {canGoNext && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-3 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={next}
            >
              <ChevronRight className="h-6 w-6" />
            </Button>
          )}

          {/* Image Indicators */}
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-2">
            {images.map((_, index) => (
              <button
                key={index}
                className={cn(
                  'w-2 h-2 rounded-full transition-all',
                  currentIndex === index
                    ? 'bg-white scale-125'
                    : 'bg-white/50 hover:bg-white/75'
                )}
                onClick={() => goTo(index)}
              />
            ))}
          </div>

          {/* Image Counter */}
          <div className="absolute top-3 right-3 bg-black/50 text-white px-2 py-1 rounded-full text-sm">
            {currentIndex + 1} / {images.length}
          </div>
        </>
      )}
    </div>
  );
}; 