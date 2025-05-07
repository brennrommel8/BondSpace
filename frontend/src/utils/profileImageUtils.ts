/**
 * Utility functions for handling profile images with caching and preloading
 */

// Default avatar (embedded base64 to avoid network requests)
export const DEFAULT_AVATAR = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDIwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CiAgPGNpcmNsZSBjeD0iMTAwIiBjeT0iMTAwIiByPSIxMDAiIGZpbGw9IiNFMkU4RjAiLz4KICA8Y2lyY2xlIGN4PSIxMDAiIGN5PSI4NSIgcj0iMzUiIGZpbGw9IiM5NEE1QkIiLz4KICA8cGF0aCBkPSJNMTAwIDE0NUMxMzQgMTQ1IDE2MCAxNjAgMTYwIDE5MEgxOEMxOCAxNjAuNSA2NS4xODk2IDE0NSAxMDAgMTQ1WiIgZmlsbD0iIzk0QTVCQiIvPgo8L3N2Zz4K';

// Cache for profile pictures
const profilePictureCache = new Map<string, string>();

// Set of URLs currently being loaded
const loadingUrls = new Set<string>();

// Queue for loading images
const loadingQueue: string[] = [];

// Maximum number of concurrent image loads
const MAX_CONCURRENT_LOADS = 5;

// Function to process the loading queue
const processLoadingQueue = () => {
  while (loadingQueue.length > 0 && loadingUrls.size < MAX_CONCURRENT_LOADS) {
    const url = loadingQueue.shift();
    if (url && !loadingUrls.has(url)) {
      loadingUrls.add(url);
      const img = new Image();
      img.onload = () => {
        loadingUrls.delete(url);
        processLoadingQueue();
      };
      img.onerror = () => {
        loadingUrls.delete(url);
        processLoadingQueue();
      };
      img.src = url;
    }
  }
};

/**
 * Gets the URL for a profile picture, handling different format types and providing a fallback
 * Also manages caching and preloading
 *
 * @param profilePicture The profile picture value from the API
 * @param username Optional username for fallback avatar generation
 * @returns A valid image URL
 */
export const getProfileImageUrl = (profilePicture: unknown, username?: string): string => {
  // If null or undefined, return default
  if (!profilePicture) {
    return username 
      ? `https://api.dicebear.com/7.x/initials/svg?seed=${username}`
      : DEFAULT_AVATAR;
  }
  
  let imageUrl: string;
  
  // If it's a string, use it directly
  if (typeof profilePicture === 'string') {
    imageUrl = profilePicture;
  } 
  // If it's an object with a url property
  else if (typeof profilePicture === 'object' && profilePicture !== null) {
    const profileObj = profilePicture as any;
    imageUrl = profileObj.url || DEFAULT_AVATAR;
  } else {
    return username 
      ? `https://api.dicebear.com/7.x/initials/svg?seed=${username}`
      : DEFAULT_AVATAR;
  }

  // Check cache first
  if (profilePictureCache.has(imageUrl)) {
    return profilePictureCache.get(imageUrl)!;
  }

  // Add to cache
  profilePictureCache.set(imageUrl, imageUrl);

  // Add to loading queue if not already loading
  if (!loadingUrls.has(imageUrl)) {
    loadingQueue.push(imageUrl);
    processLoadingQueue();
  }

  return imageUrl;
};

/**
 * Preloads multiple profile pictures efficiently
 * 
 * @param profilePictures Array of profile picture objects or URLs
 * @param usernames Optional array of usernames for fallback avatars
 */
export const preloadProfilePictures = (profilePictures: unknown[], usernames?: string[]) => {
  profilePictures.forEach((picture, index) => {
    const username = usernames?.[index];
    getProfileImageUrl(picture, username);
  });
};

/**
 * Clears the profile picture cache
 */
export const clearProfilePictureCache = () => {
  profilePictureCache.clear();
}; 