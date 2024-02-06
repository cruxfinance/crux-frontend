import React, { createContext, useContext, useState, useCallback, FunctionComponent, ReactNode } from 'react';

interface ScrollLockState {
  isLocked: boolean;
  scrollBarCompensation: number;
}

interface ScrollLockContextType extends ScrollLockState {
  lockScroll: () => void;
  unlockScroll: () => void;
}

const ScrollLockContext = createContext<ScrollLockContextType | undefined>(undefined);

const ScrollLockProvider: FunctionComponent<{ children: ReactNode }> = ({ children }) => {
  const [isLocked, setIsLocked] = useState(false);
  const [scrollBarCompensation, setScrollBarCompensation] = useState(0);

  const lockScroll = useCallback(() => {
    const html = document.documentElement;
    const body = document.body;
    const scrollbarWidth = window.innerWidth - body.offsetWidth;
    setScrollBarCompensation(scrollbarWidth);
    html.style.overflowY = 'hidden';
    body.style.paddingRight = `${scrollbarWidth}px`;
    setIsLocked(true);
  }, []);

  const unlockScroll = useCallback(() => {
    const html = document.documentElement;
    const body = document.body;
    html.style.overflowY = '';
    body.style.paddingRight = '';
    setIsLocked(false);
  }, []);

  const value = {
    isLocked,
    scrollBarCompensation,
    lockScroll,
    unlockScroll,
  };

  return (
    <ScrollLockContext.Provider value={value}>{children}</ScrollLockContext.Provider>
  );
};

const useScrollLock = (): ScrollLockContextType => {
  const context = useContext(ScrollLockContext);
  if (context === undefined) {
    throw new Error('useScrollLock must be used within a ScrollLockProvider');
  }
  return context;
};

export { ScrollLockProvider, useScrollLock };