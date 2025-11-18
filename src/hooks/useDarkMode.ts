'use client';

import { useState, useEffect } from 'react';

export function useDarkMode() {
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    // Check localStorage and system preference on mount
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    const shouldUseDarkMode = savedTheme === 'dark' || (!savedTheme && prefersDark);
    setIsDarkMode(shouldUseDarkMode);
    
    if (shouldUseDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    // Listen for theme changes from other components (like Nav)
    const handleThemeChange = () => {
      const currentTheme = localStorage.getItem('theme');
      const newDarkMode = currentTheme === 'dark';
      setIsDarkMode(newDarkMode);
      
      if (newDarkMode) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    };

    // Listen for custom themeChange event
    window.addEventListener('themeChange', handleThemeChange);
    // Also listen for darkModeToggle event with detail
    const handleDarkModeToggle = (event: Event) => {
      const customEvent = event as CustomEvent<boolean>;
      if (customEvent.detail !== undefined) {
        setIsDarkMode(customEvent.detail);
      } else {
        handleThemeChange();
      }
    };
    window.addEventListener('darkModeToggle', handleDarkModeToggle);

    return () => {
      window.removeEventListener('themeChange', handleThemeChange);
      window.removeEventListener('darkModeToggle', handleDarkModeToggle);
    };
  }, []);

  const toggleDarkMode = () => {
    const newDarkMode = !isDarkMode;
    setIsDarkMode(newDarkMode);
    
    if (newDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }

    // Emit custom events for other components
    window.dispatchEvent(new CustomEvent('themeChange'));
    window.dispatchEvent(new CustomEvent('darkModeToggle', { detail: newDarkMode }));
  };

  return { isDarkMode, toggleDarkMode };
}

