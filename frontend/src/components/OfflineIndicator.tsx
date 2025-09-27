import React, { useState, useEffect } from 'react';
import { MdSignalWifiOff, MdSync, MdSyncProblem, MdClose } from 'react-icons/md';
import { offlineQueueService } from '../services/offlineQueueService';
import './OfflineIndicator.css';

interface OfflineIndicatorProps {
  showAsAlert?: boolean;
  compact?: boolean;
}

const OfflineIndicator: React.FC<OfflineIndicatorProps> = ({
  showAsAlert = false,
  compact = false
}) => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [queueLength, setQueueLength] = useState(0);
  const [syncInProgress, setSyncInProgress] = useState(false);
  const [showSyncNotification, setShowSyncNotification] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      if (queueLength > 0) {
        setShowSyncNotification(true);
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Update queue length periodically
    const updateQueueStatus = () => {
      setQueueLength(offlineQueueService.getQueueLength());
      setSyncInProgress(offlineQueueService.getSyncInProgress());
    };

    updateQueueStatus();
    const interval = setInterval(updateQueueStatus, 1000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, [queueLength]);

  const handleSync = () => {
    offlineQueueService.forceSync();
    setShowSyncNotification(false);
  };

  if (compact) {
    return (
      <div className="compact-offline">
        {!isOnline && (
          <span className="offline-chip">
            <MdSignalWifiOff className="chip-icon" />
            Offline
          </span>
        )}
        {queueLength > 0 && (
          <span className={`pending-chip ${syncInProgress ? 'syncing' : 'pending'}`} onClick={handleSync}>
            {syncInProgress ? <MdSync className="chip-icon" /> : <MdSyncProblem className="chip-icon" />}
            {queueLength} pending
          </span>
        )}
      </div>
    );
  }

  if (showAsAlert) {
    if (!isOnline) {
      return (
        <div className="alert-container">
          <div className="alert-warning">
            <p className="alert-text">You're currently offline. Some features may not be available.</p>
            <button className="alert-button" disabled>
              <MdSignalWifiOff />
              Offline
            </button>
          </div>
        </div>
      );
    }

    if (queueLength > 0) {
      return (
        <div className="alert-container">
          <div className="alert-info">
            <p className="alert-text">{queueLength} action{queueLength > 1 ? 's' : ''} queued for when you're back online.</p>
            <button className="alert-button" onClick={handleSync} disabled={syncInProgress}>
              {syncInProgress ? <MdSync /> : <MdSyncProblem />}
              {syncInProgress ? 'Syncing...' : `Sync ${queueLength} items`}
            </button>
          </div>
        </div>
      );
    }

    return null;
  }

  return (
    <>
      {/* Offline Status */}
      {!isOnline && (
        <div className="offline-status-bar">
          <MdSignalWifiOff className="status-icon" />
          <p className="status-text">You're offline. Actions will be synced when connection is restored.</p>
          {queueLength > 0 && (
            <span className="queued-chip">{queueLength} queued</span>
          )}
        </div>
      )}

      {/* Sync Notification */}
      {showSyncNotification && queueLength > 0 && (
        <div className="snackbar">
          <p className="alert-text">{queueLength} action{queueLength > 1 ? 's' : ''} ready to sync</p>
          <div className="snackbar-actions">
            <button className="sync-button" onClick={handleSync} disabled={syncInProgress}>
              {syncInProgress ? 'Syncing...' : 'Sync Now'}
            </button>
            <button className="close-button" onClick={() => setShowSyncNotification(false)}>
              <MdClose className="close-icon" />
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default OfflineIndicator;
