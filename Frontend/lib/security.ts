/**
 * Security utilities for input validation and sanitization
 */

// Input validation patterns
export const patterns = {
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  phone: /^\+?[1-9]\d{1,14}$/,
  url: /^https?:\/\/.+/,
  numeric: /^\d+$/,
  alphanumeric: /^[a-zA-Z0-9]+$/,
  parkingId: /^[a-zA-Z0-9-_]+$/,
} as const;

/**
 * Validates parking ID format
 */
export function validateParkingId(id: unknown): id is string {
  if (typeof id !== 'string') return false;
  if (id.length === 0 || id.length > 50) return false;
  return patterns.parkingId.test(id);
}

/**
 * Sanitizes string input to prevent XSS
 */
export function sanitizeInput(input: string): string {
  return input
    .replace(/[<>]/g, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+=/gi, '')
    .trim();
}

/**
 * Validates and sanitizes search query
 */
export function validateSearchQuery(query: string): string {
  if (typeof query !== 'string') return '';
  if (query.length > 100) return query.substring(0, 100);
  return sanitizeInput(query);
}

/**
 * Validates price value
 */
export function validatePrice(price: unknown): number | null {
  if (typeof price !== 'number') return null;
  if (isNaN(price) || !isFinite(price)) return null;
  if (price < 0 || price > 1000) return null;
  return Math.round(price * 100) / 100; // Round to 2 decimal places
}

/**
 * Validates area name
 * Supports Slovak characters (á, é, í, ó, ú, ý, ä, ô, č, ď, ľ, ň, š, ť, ž)
 */
export function validateAreaName(area: unknown): area is string {
  if (typeof area !== 'string') return false;
  if (area.length === 0 || area.length > 50) return false;
  // Allow Slovak characters including á, é, í, ó, ú, ý, ä, ô, č, ď, ľ, ň, š, ť, ž
  return /^[a-zA-Z0-9\sáéíóúýäôčďľňšťž-]+$/u.test(area);
}

/**
 * Rate limiting helper (simple in-memory implementation)
 */
class RateLimiter {
  private requests: Map<string, number[]> = new Map();
  private maxRequests: number;
  private windowMs: number;

  constructor(maxRequests: number = 10, windowMs: number = 60000) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
  }

  isAllowed(key: string): boolean {
    const now = Date.now();
    const requests = this.requests.get(key) || [];
    
    // Remove old requests outside the window
    const recentRequests = requests.filter((time) => now - time < this.windowMs);
    
    if (recentRequests.length >= this.maxRequests) {
      return false;
    }
    
    recentRequests.push(now);
    this.requests.set(key, recentRequests);
    return true;
  }

  reset(key: string): void {
    this.requests.delete(key);
  }
}

export const rateLimiter = new RateLimiter(20, 60000); // 20 requests per minute

/**
 * Secure storage wrapper (placeholder for actual secure storage implementation)
 */
export const secureStorage = {
  async setItem(key: string, value: string): Promise<void> {
    try {
      if (typeof key !== 'string' || key.length === 0) {
        throw new Error('Invalid key');
      }
      // In production, use expo-secure-store or similar
      // For now, this is a placeholder
      if (typeof window !== 'undefined') {
        localStorage.setItem(`secure_${key}`, value);
      }
    } catch (error) {
      console.error('Error storing secure data:', error);
      throw error;
    }
  },

  async getItem(key: string): Promise<string | null> {
    try {
      if (typeof key !== 'string' || key.length === 0) {
        return null;
      }
      if (typeof window !== 'undefined') {
        return localStorage.getItem(`secure_${key}`);
      }
      return null;
    } catch (error) {
      console.error('Error retrieving secure data:', error);
      return null;
    }
  },

  async removeItem(key: string): Promise<void> {
    try {
      if (typeof key !== 'string' || key.length === 0) {
        return;
      }
      if (typeof window !== 'undefined') {
        localStorage.removeItem(`secure_${key}`);
      }
    } catch (error) {
      console.error('Error removing secure data:', error);
    }
  },
};

