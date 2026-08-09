/**
 * OnBozor Cache Manager (Offline-First Architecture)
 *
 * Persists posts and products metadata in localStorage.
 * Prevents base64 bloat by cleaning inline media before caching.
 * Provides TTL checking and stale-while-revalidate strategy.
 */
import { Post, Product } from '../api/types';

const POSTS_CACHE_KEY = 'agro_posts_cache_v1';
const PRODUCTS_CACHE_KEY = 'agro_products_cache_v1';
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes TTL

export interface CachePayload<T> {
  data: T[];
  timestamp: number;
  version: number;
}

/** Sanitize post objects to strip base64 dataURLs before storing in localStorage */
function sanitizePostsForCache(posts: Post[]): Post[] {
  return posts.map((post) => {
    const isBase64Media = post.mediaUrl && post.mediaUrl.startsWith('data:');
    const isBase64Poster = post.posterUrl && post.posterUrl.startsWith('data:');
    return {
      ...post,
      mediaUrl: isBase64Media ? '' : post.mediaUrl,
      posterUrl: isBase64Poster ? '' : post.posterUrl,
    };
  });
}

function sanitizeProductsForCache(products: Product[]): Product[] {
  return products.map((product) => {
    const isBase64Image = product.image && product.image.startsWith('data:');
    return {
      ...product,
      image: isBase64Image ? '' : product.image,
      images: product.images?.filter((img) => !img.startsWith('data:')),
    };
  });
}

export const cacheManager = {
  savePostsCache(posts: Post[]): void {
    try {
      const sanitized = sanitizePostsForCache(posts);
      const payload: CachePayload<Post> = {
        data: sanitized,
        timestamp: Date.now(),
        version: 1,
      };
      localStorage.setItem(POSTS_CACHE_KEY, JSON.stringify(payload));
    } catch {
      // Ignore quota error if localStorage is full.
    }
  },

  loadPostsCache(): { posts: Post[]; isStale: boolean; timestamp: number } | null {
    try {
      const raw = localStorage.getItem(POSTS_CACHE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as CachePayload<Post>;
      if (!parsed || !Array.isArray(parsed.data) || parsed.data.length === 0) {
        return null;
      }
      const age = Date.now() - (parsed.timestamp || 0);
      const isStale = age > CACHE_TTL_MS;
      return {
        posts: parsed.data,
        isStale,
        timestamp: parsed.timestamp || Date.now(),
      };
    } catch {
      return null;
    }
  },

  saveProductsCache(products: Product[]): void {
    try {
      const sanitized = sanitizeProductsForCache(products);
      const payload: CachePayload<Product> = {
        data: sanitized,
        timestamp: Date.now(),
        version: 1,
      };
      localStorage.setItem(PRODUCTS_CACHE_KEY, JSON.stringify(payload));
    } catch {
      // Ignore quota error.
    }
  },

  loadProductsCache(): { products: Product[]; isStale: boolean; timestamp: number } | null {
    try {
      const raw = localStorage.getItem(PRODUCTS_CACHE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as CachePayload<Product>;
      if (!parsed || !Array.isArray(parsed.data) || parsed.data.length === 0) {
        return null;
      }
      const age = Date.now() - (parsed.timestamp || 0);
      const isStale = age > CACHE_TTL_MS;
      return {
        products: parsed.data,
        isStale,
        timestamp: parsed.timestamp || Date.now(),
      };
    } catch {
      return null;
    }
  },

  clearAllCache(): void {
    try {
      localStorage.removeItem(POSTS_CACHE_KEY);
      localStorage.removeItem(PRODUCTS_CACHE_KEY);
    } catch {
      // Ignore
    }
  },
};
