/**
 * Download path resolution utilities
 * Implements priority-based download path resolution as documented
 */

/**
 * Resolves the download path for a profile variant using priority-based logic.
 * 
 * Priority order:
 * 1. Variant-specific downloadPath
 * 2. Computed from variant file path
 * 3. Profile-level downloadPath
 * 4. Profile directory (fallback)
 * 
 * @param {Object} profile - The profile index object
 * @param {Object|null} selectedVariant - The selected variant object (optional)
 * @returns {string} The resolved download path
 */
export function resolveDownloadPath(profile, selectedVariant = null) {
  // Priority 1: Variant has explicit downloadPath
  if (selectedVariant?.downloadPath) {
    return selectedVariant.downloadPath;
  }
  
  // Priority 2: Build from variant file path
  if (selectedVariant?.file) {
    return `/gm-profile-database/profiles/${profile.name}/${selectedVariant.file}`;
  }
  
  // Priority 3: Profile-level downloadPath (may be folder)
  if (profile.downloadPath) {
    return profile.downloadPath;
  }
  
  // Priority 4: Default to profile directory
  return `/gm-profile-database/profiles/${profile.name}/`;
}

/**
 * Checks if a path is a folder (ends with /) or a file (ends with .json)
 * 
 * @param {string} path - The path to check
 * @returns {boolean} True if folder, false if file
 */
export function isFolder(path) {
  return path.endsWith('/');
}

/**
 * Gets the filename from a path
 * 
 * @param {string} path - The file path
 * @returns {string} The filename
 */
export function getFilename(path) {
  return path.split('/').pop() || path;
}
