/**
 * Utility functions for handling profile images
 */

// Default avatar (embedded base64 to avoid network requests)
export const DEFAULT_AVATAR = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDIwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CiAgPGNpcmNsZSBjeD0iMTAwIiBjeT0iMTAwIiByPSIxMDAiIGZpbGw9IiNFMkU4RjAiLz4KICA8Y2lyY2xlIGN4PSIxMDAiIGN5PSI4NSIgcj0iMzUiIGZpbGw9IiM5NEE1QkIiLz4KICA8cGF0aCBkPSJNMTAwIDE0NUMxMzQgMTQ1IDE2MCAxNjAgMTYwIDE5MEgxOEMxOCAxNjAuNSA2NS4xODk2IDE0NSAxMDAgMTQ1WiIgZmlsbD0iIzk0QTVCQiIvPgo8L3N2Zz4K';

/**
 * Gets the URL for a profile picture, handling different format types and providing a fallback
 *
 * @param profilePicture The profile picture value from the API
 * @returns A valid image URL
 */
export const getProfileImageUrl = (profilePicture: unknown): string => {
  // If null or undefined, return default
  if (!profilePicture) {
    return DEFAULT_AVATAR;
  }
  
  // If it's a string, use it directly
  if (typeof profilePicture === 'string') {
    return profilePicture;
  }
  
  // If it's an object with a url property
  if (typeof profilePicture === 'object' && profilePicture !== null) {
    const profileObj = profilePicture as any;
    
    // Return the URL if it exists
    if (profileObj.url) {
      return profileObj.url;
    }
  }
  
  // Default fallback
  return DEFAULT_AVATAR;
}; 