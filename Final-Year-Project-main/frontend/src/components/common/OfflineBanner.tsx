import React, { useState, useEffect } from 'react';
import { WifiOff, AlertTriangle, X } from 'lucide-react';

export const OfflineBanner: React.FC = () => {
  const [isOffline, setIsOffline] = useState<boolean>(() => {
    return typeof navigator !== 'undefined' ? !navigator.onLine : false;
  });
  const [dismissed, setDismissed] = useState<boolean>(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      setDismissed(false);
    };

    const handleOffline = () => {
      setIsOffline(true);
      setDismissed(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!isOffline || dismissed) {
    return null;
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className="bg-amber-950/80 border-b border-amber-800/60 text-amber-200 px-4 py-2.5 text-xs flex items-center justify-between shadow-md transition-all animate-fade-in"
    >
      <div className="flex items-center space-x-2.5 max-w-5xl mx-auto flex-1">
        <WifiOff className="w-4 h-4 text-amber-400 shrink-0" />
        <span className="font-semibold text-white">
          Offline Mode Active:
        </span>
        <span className="text-amber-200/90">
          The application shell and cached pages are available. AI translation, speech recognition, and database sync require an active internet connection.
        </span>
      </div>
      <button
        onClick={() => setDismissed(true)}
        aria-label="Dismiss offline notification"
        className="text-amber-400 hover:text-white p-1 rounded-md hover:bg-amber-900/50 transition-colors ml-2"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};
