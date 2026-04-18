/**
 * useOfflineDetection hook
 * T-OFF-001: Tracks network connectivity via window online/offline events.
 *
 * Returns:
 *   isOnline   — current network state (mirrors navigator.onLine, updated live)
 *   wasOffline — latches to true the first time the app goes offline and stays
 *                true for the lifetime of the session
 */
import { useState, useEffect } from 'react';

export interface OfflineDetectionResult {
  isOnline: boolean;
  wasOffline: boolean;
}

export function useOfflineDetection(): OfflineDetectionResult {
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [wasOffline, setWasOffline] = useState<boolean>(
    typeof navigator !== 'undefined' ? !navigator.onLine : false
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleOnline = (): void => {
      setIsOnline(true);
    };

    const handleOffline = (): void => {
      setIsOnline(false);
      setWasOffline(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return { isOnline, wasOffline };
}
