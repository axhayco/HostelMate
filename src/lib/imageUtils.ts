// ─── Image Fallback & Utility System ──────────────────────────────────────────

export const HOSTEL_FALLBACK_IMAGES = [
  "https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=800&q=80", // Modern Bunk Bed
  "https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=800&q=80", // Cozy Suite
  "https://images.unsplash.com/photo-1566665797739-1674de7a421a?auto=format&fit=crop&w=800&q=80", // Premium Bedroom
  "https://images.unsplash.com/photo-1618773928121-c32242e63f39?auto=format&fit=crop&w=800&q=80", // Luxury Room
  "https://images.unsplash.com/photo-1595526114035-0d45ed16cfbf?auto=format&fit=crop&w=800&q=80", // Bright Dormitory
  "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=800&q=80", // Student Residency
  "https://images.unsplash.com/photo-1540518614846-7ede433c5173?auto=format&fit=crop&w=800&q=80", // Clean PG Room
  "https://images.unsplash.com/photo-1512918728675-ed5a9ecdebfd?auto=format&fit=crop&w=800&q=80", // Modern Interior
  "https://images.unsplash.com/photo-1598928506311-c55ded91a20c?auto=format&fit=crop&w=800&q=80", // Contemporary Space
  "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=800&q=80", // Warm Living
];

export const DEFAULT_AVATAR_IMAGE =
  "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80";

/**
 * Default fallback used when no key is available to derive a unique image.
 */
export const DEFAULT_HOSTEL_IMAGE = HOSTEL_FALLBACK_IMAGES[0];

/**
 * Returns a deterministic unique fallback image for a given key (e.g. hostel id or name).
 * Different keys will reliably map to different images in the array.
 */
export function getHostelFallbackImage(key?: string): string {
  if (!key) return HOSTEL_FALLBACK_IMAGES[0];
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = key.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % HOSTEL_FALLBACK_IMAGES.length;
  return HOSTEL_FALLBACK_IMAGES[index];
}

/**
 * Image onError handler: swaps the broken src with a unique fallback derived from
 * the image's alt text (hostel name), ensuring distinct images per card.
 */
export function handleImageError(
  event: React.SyntheticEvent<HTMLImageElement, Event>,
  customFallback?: string
): void {
  const target = event.currentTarget;
  const key = target.alt || target.dataset.id || target.src;
  const fallback = customFallback || getHostelFallbackImage(key);
  // Prevent infinite loop if fallback itself fails
  if (target.src !== fallback) {
    target.src = fallback;
  }
}
