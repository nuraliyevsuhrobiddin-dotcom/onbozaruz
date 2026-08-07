/**
 * Mock API server.
 *
 * Simulates a REST backend over the in-memory mockDb. It exposes the
 * same resource endpoints the real backend will expose, so swapping to
 * a real API later only means changing the transport in src/api/http.ts.
 */
import { delay, mockDb } from './mockDb';
import { CreatePostInput, CreateProductInput, Order, Post, Product } from './types';

export interface ApiError {
  status: number;
  message: string;
}

export type ApiResult<T> = { ok: true; data: T } | { ok: false; error: ApiError };

async function handle<T>(fn: () => T | Promise<T>): Promise<ApiResult<T>> {
  try {
    await delay();
    const data = await fn();
    return { ok: true, data };
  } catch (error) {
    return {
      ok: false,
      error: {
        status: 500,
        message: error instanceof Error ? error.message : 'Serverda xatolik yuz berdi',
      },
    };
  }
}

/** Builds a new Post id (kept deterministic-friendly for tests). */
const buildPostId = (now: number) => `post-${now}`;
const buildProductId = (now: number) => `prod-${now}`;

function assertExists<T>(item: T | undefined): asserts item is T {
  if (!item) throw new Error('Topilmadi (404)');
}

export const mockServer = {
  /** GET /posts */
  async listPosts(): Promise<ApiResult<Post[]>> {
    return handle(() => mockDb.posts.getAll());
  },

  /** GET /posts/:id */
  async getPost(id: string): Promise<ApiResult<Post>> {
    return handle(() => {
      const post = mockDb.posts.findById(id);
      assertExists(post);
      return post;
    });
  },

  /** POST /posts */
  async createPost(input: CreatePostInput): Promise<ApiResult<Post>> {
    return handle(() => {
      const now = Date.now();
      const post: Post = {
        ...input,
        id: buildPostId(now),
        likesCount: 0,
        commentsCount: 0,
        viewsCount: 0,
        isLiked: false,
        isSaved: false,
      };
      return mockDb.posts.insert(post);
    });
  },

  /** PATCH /posts/:id */
  async updatePost(id: string, patch: Partial<Post>): Promise<ApiResult<Post>> {
    return handle(() => {
      const updated = mockDb.posts.update(id, patch);
      assertExists(updated);
      return updated;
    });
  },

  /** DELETE /posts/:id */
  async deletePost(id: string): Promise<ApiResult<{ id: string }>> {
    return handle(() => {
      const deleted = mockDb.posts.deleteById(id);
      if (!deleted) throw new Error('Topilmadi (404)');
      return { id };
    });
  },

  /** GET /products */
  async listProducts(): Promise<ApiResult<Product[]>> {
    return handle(() => mockDb.products.getAll());
  },

  /** GET /products/:id */
  async getProduct(id: string): Promise<ApiResult<Product>> {
    return handle(() => {
      const product = mockDb.products.findById(id);
      assertExists(product);
      return product;
    });
  },

  /** POST /products */
  async createProduct(input: CreateProductInput): Promise<ApiResult<Product>> {
    return handle(() => {
      const product: Product = {
        ...input,
        id: buildProductId(Date.now()),
        rating: 0,
        reviewsCount: 0,
      };
      return mockDb.products.insert(product);
    });
  },

  /** PATCH /products/:id */
  async updateProduct(id: string, patch: Partial<Product>): Promise<ApiResult<Product>> {
    return handle(() => {
      const updated = mockDb.products.update(id, patch);
      assertExists(updated);
      return updated;
    });
  },

  /** DELETE /products/:id */
  async deleteProduct(id: string): Promise<ApiResult<{ id: string }>> {
    return handle(() => {
      const deleted = mockDb.products.deleteById(id);
      if (!deleted) throw new Error('Topilmadi (404)');
      return { id };
    });
  },

  /** GET /orders */
  async listOrders(): Promise<ApiResult<Order[]>> {
    return handle(() => mockDb.orders.getAll());
  },

  /** GET /orders/:id */
  async getOrder(id: string): Promise<ApiResult<Order>> {
    return handle(() => {
      const order = mockDb.orders.findById(id);
      assertExists(order);
      return order;
    });
  },

  /** POST /orders */
  async createOrder(input: Order): Promise<ApiResult<Order>> {
    return handle(() => mockDb.orders.insert(input));
  },

  /** PATCH /orders/:id */
  async updateOrder(id: string, patch: Partial<Order>): Promise<ApiResult<Order>> {
    return handle(() => {
      const updated = mockDb.orders.update(id, patch);
      assertExists(updated);
      return updated;
    });
  },

  /** GET /categories */
  async listCategories(): Promise<ApiResult<ReturnType<typeof mockDb.categories.getAll>>> {
    return handle(() => mockDb.categories.getAll());
  },
};

