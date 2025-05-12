import { useState, useCallback } from 'react';

interface UseImageSliderProps {
  totalImages: number;
  initialIndex?: number;
}

interface UseImageSliderReturn {
  currentIndex: number;
  next: () => void;
  prev: () => void;
  goTo: (index: number) => void;
  canGoNext: boolean;
  canGoPrev: boolean;
}

export const useImageSlider = ({ totalImages, initialIndex = 0 }: UseImageSliderProps): UseImageSliderReturn => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);

  const next = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % totalImages);
  }, [totalImages]);

  const prev = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + totalImages) % totalImages);
  }, [totalImages]);

  const goTo = useCallback((index: number) => {
    if (index >= 0 && index < totalImages) {
      setCurrentIndex(index);
    }
  }, [totalImages]);

  const canGoNext = currentIndex < totalImages - 1;
  const canGoPrev = currentIndex > 0;

  return {
    currentIndex,
    next,
    prev,
    goTo,
    canGoNext,
    canGoPrev,
  };
}; 