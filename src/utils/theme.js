/**
 * Theme management utilities
 * Handles DaisyUI theme switching and persistence
 */

export const AVAILABLE_THEMES = ['light', 'dark', 'coffee', 'nord'];
export const DEFAULT_THEME = 'light';
export const STORAGE_KEY = 'gaggimate-daisyui-theme';

/**
 * Gets the current theme from localStorage or returns default
 * 
 * @returns {string} Current theme name
 */
export function getCurrentTheme() {
  if (typeof window === 'undefined') return DEFAULT_THEME;
  
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && AVAILABLE_THEMES.includes(stored)) {
      return stored;
    }
  } catch (error) {
    console.warn('Failed to read theme from localStorage:', error);
  }
  
  return DEFAULT_THEME;
}

/**
 * Sets the theme and persists to localStorage
 * 
 * @param {string} theme - Theme name to set
 * @returns {boolean} Success status
 */
export function setTheme(theme) {
  if (!AVAILABLE_THEMES.includes(theme)) {
    console.warn(`Invalid theme: ${theme}`);
    return false;
  }
  
  try {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(STORAGE_KEY, theme);
    return true;
  } catch (error) {
    console.error('Failed to set theme:', error);
    return false;
  }
}

/**
 * Initializes theme on page load
 * Should be called as early as possible to prevent flash
 */
export function initTheme() {
  const theme = getCurrentTheme();
  if (typeof document !== 'undefined') {
    document.documentElement.setAttribute('data-theme', theme);
  }
}

/**
 * Gets theme display name
 * 
 * @param {string} theme - Theme key
 * @returns {string} Display name
 */
export function getThemeDisplayName(theme) {
  const names = {
    light: 'Light',
    dark: 'Dark',
    coffee: 'Coffee',
    nord: 'Nord'
  };
  return names[theme] || theme;
}
