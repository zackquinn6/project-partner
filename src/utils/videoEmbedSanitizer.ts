/**
 * Safely parse video embed HTML and extract sanitized iframe URLs
 * Prevents XSS attacks by validating and whitelisting video domains
 */

const ALLOWED_VIDEO_DOMAINS = [
  'youtube.com',
  'www.youtube.com',
  'youtu.be',
  'youtube-nocookie.com',
  'www.youtube-nocookie.com',
  'vimeo.com',
  'player.vimeo.com'
];

/**
 * Extract and validate iframe URL from embed HTML
 * Returns null if URL is invalid or from untrusted domain
 */
export const getSafeEmbedUrl = (embedHtml: string): string | null => {
  if (!embedHtml || typeof embedHtml !== 'string') {
    return null;
  }

  try {
    // Extract src URL from iframe tag
    const srcMatch = embedHtml.match(/src=["']([^"']+)["']/i);
    if (!srcMatch || !srcMatch[1]) {
      return null;
    }

    const urlString = srcMatch[1];
    
    // Parse URL and validate
    const url = new URL(urlString);
    
    // Check if domain is in whitelist
    const isAllowed = ALLOWED_VIDEO_DOMAINS.some(domain => 
      url.hostname === domain || url.hostname.endsWith('.' + domain)
    );
    
    if (!isAllowed) {
      console.warn('Video embed from untrusted domain blocked:', url.hostname);
      return null;
    }

    // Ensure HTTPS protocol
    if (url.protocol !== 'https:') {
      console.warn('Non-HTTPS video embed blocked');
      return null;
    }

    return url.toString();
  } catch (error) {
    console.error('Failed to parse video embed URL:', error);
    return null;
  }
};

/**
 * Check if a video URL is from a trusted domain
 */
export const isAllowedVideoDomain = (url: string): boolean => {
  try {
    const parsedUrl = new URL(url);
    return ALLOWED_VIDEO_DOMAINS.some(domain => 
      parsedUrl.hostname === domain || parsedUrl.hostname.endsWith('.' + domain)
    );
  } catch {
    return false;
  }
};
