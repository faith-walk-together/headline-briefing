import { useCallback, useEffect, useRef } from 'react';
import { useUIStore } from '@/store/useUIStore';

export function useScrollTabVisibility() {
  const setIsScrolling = useUIStore((state) => state.setIsScrolling);
  const stopTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimer = useCallback(() => {
    if (stopTimeoutRef.current) {
      clearTimeout(stopTimeoutRef.current);
      stopTimeoutRef.current = null;
    }
  }, []);

  const handleScrollStart = useCallback(() => {
    clearTimer();
    setIsScrolling(true);
  }, [clearTimer, setIsScrolling]);

  const handleScrollStop = useCallback(() => {
    clearTimer();
    stopTimeoutRef.current = setTimeout(() => {
      setIsScrolling(false);
    }, 180);
  }, [clearTimer, setIsScrolling]);

  useEffect(() => {
    return () => {
      clearTimer();
      setIsScrolling(false);
    };
  }, [clearTimer, setIsScrolling]);

  return {
    onScrollBeginDrag: handleScrollStart,
    onMomentumScrollBegin: handleScrollStart,
    onScrollEndDrag: handleScrollStop,
    onMomentumScrollEnd: handleScrollStop,
  };
}

