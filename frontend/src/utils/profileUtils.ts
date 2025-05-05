/**
 * Normalizes profile picture data to a string URL
 */
export const normalizeProfilePicture = (profilePicture: any, username?: string): string => {
  // If username is provided and profile picture is missing or empty, always use username for avatar
  if (username && (!profilePicture || profilePicture === '')) {
    return `https://api.dicebear.com/7.x/initials/svg?seed=${username}`;
  }
  
  // Handle case when profilePicture is completely missing
  if (!profilePicture) {
    // Generate a fallback avatar using DiceBear API
    return username 
      ? `https://api.dicebear.com/7.x/initials/svg?seed=${username}`
      : `https://api.dicebear.com/7.x/identicon/svg?seed=${Math.random()}`;
  }
  
  // If it's a string, return directly
  if (typeof profilePicture === 'string') return profilePicture;
  
  // If it has a url property, return that
  if (profilePicture.url) return profilePicture.url;
  
  // If it's an object with type and url properties
  if (profilePicture.type !== undefined && profilePicture.url) {
    return profilePicture.url;
  }
  
  // Default fallback - generate a random avatar using DiceBear
  return username 
    ? `https://api.dicebear.com/7.x/initials/svg?seed=${username}`
    : `https://api.dicebear.com/7.x/identicon/svg?seed=${Math.random()}`;
}; 