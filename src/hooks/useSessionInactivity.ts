import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';

// Default durations in milliseconds
const DEFAULT_INACTIVITY_LIMIT_MS = 30 * 60 * 1000; // 30 minutes
const WARNING_WINDOW_MS = 2 * 60 * 1000; // 2 minutes (prompt at 28 minutes of inactivity)
export interface UseSessionInactivityOptions {
  inactivityLimitMs?: number;
  warningWindowMs?: number;
  onLogout?: () => void;
}

export const useSessionInactivity = (options?: UseSessionInactivityOptions) => {
  const { userProfile, logout } = useAuth();
  const inactivityLimit = options?.inactivityLimitMs ?? DEFAULT_INACTIVITY_LIMIT_MS;
  const warningWindow = options?.warningWindowMs ?? WARNING_WINDOW_MS;
  const warningThreshold = Math.max(0, inactivityLimit - warningWindow);

  const [showWarningModal, setShowWarningModal] = useState<boolean>(false);
  const [remainingSeconds, setRemainingSeconds] = useState<number>(Math.floor(warningWindow / 1000));
  const [sessionExpiredNotice, setSessionExpiredNotice] = useState<string | null>(null);

  const lastActivityRef = useRef<number>(Date.now());
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isLoggingOutRef = useRef<boolean>(false);

  // Record user activity in-memory
  const recordActivity = useCallback(() => {
    if (!userProfile || isLoggingOutRef.current) return;
    lastActivityRef.current = Date.now();
  }, [userProfile]);

  // Manual extend session handler
  const extendSession = useCallback(() => {
    lastActivityRef.current = Date.now();
    setShowWarningModal(false);
    setRemainingSeconds(Math.floor(warningWindow / 1000));
  }, [warningWindow]);

  // Perform automatic logout
  const performAutoLogout = useCallback(async () => {
    if (isLoggingOutRef.current) return;
    isLoggingOutRef.current = true;
    setShowWarningModal(false);

    if (options?.onLogout) {
      options.onLogout();
    } else {
      await logout();
    }
    isLoggingOutRef.current = false;
  }, [logout, options]);

  // Manual logout now from warning prompt
  const handleLogoutNow = useCallback(async () => {
    setShowWarningModal(false);
    await logout();
  }, [logout]);

  // Set up event listeners for user interactions
  useEffect(() => {
    if (!userProfile) {
      setShowWarningModal(false);
      return;
    }

    // Initialize activity timestamp
    lastActivityRef.current = Date.now();

    // Debounced activity handler
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    const handleUserInteraction = () => {
      if (showWarningModal) return; // When warning modal is showing, require button confirmation
      if (debounceTimer) return;
      debounceTimer = setTimeout(() => {
        recordActivity();
        debounceTimer = null;
      }, 500);
    };

    const events = ['mousedown', 'mousemove', 'keydown', 'touchstart', 'scroll', 'click'];
    events.forEach(evt => {
      window.addEventListener(evt, handleUserInteraction, { passive: true });
    });

    // Periodic heartbeat check every 1 second
    timerRef.current = setInterval(() => {
      if (isLoggingOutRef.current) return;

      const currentTime = Date.now();
      const lastActive = lastActivityRef.current;
      const idleDuration = currentTime - lastActive;

      if (idleDuration >= inactivityLimit) {
        // Exceeded 30 minutes -> Auto logout
        performAutoLogout();
      } else if (idleDuration >= warningThreshold) {
        // Between 28 and 30 minutes -> Show warning prompt with countdown
        const msRemaining = Math.max(0, inactivityLimit - idleDuration);
        const secondsLeft = Math.ceil(msRemaining / 1000);
        setRemainingSeconds(secondsLeft);
        setShowWarningModal(true);
      } else {
        if (showWarningModal) {
          setShowWarningModal(false);
        }
      }
    }, 1000);

    return () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      if (timerRef.current) clearInterval(timerRef.current);
      events.forEach(evt => {
        window.removeEventListener(evt, handleUserInteraction);
      });
    };
  }, [userProfile, showWarningModal, warningThreshold, inactivityLimit, recordActivity, performAutoLogout]);

  return {
    showWarningModal,
    remainingSeconds,
    extendSession,
    logoutNow: handleLogoutNow,
    sessionExpiredNotice,
    clearExpiredNotice: () => setSessionExpiredNotice(null),
  };
};
