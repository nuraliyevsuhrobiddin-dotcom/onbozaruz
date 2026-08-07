/**
 * In-memory mock database.
 *
 * Seeds itself from the static mock data set (src/data/mockAgroData)
 * and exposes simple collection helpers. It mimics what a real backend
 * database would do, so swapping to a real API later only requires
 * replacing the transport layer (src/api/http.ts), not the consumers.
 */
import {
  CATEGORIES,
  INITIAL_POSTS,
  INITIAL_PRODUCTS,
  INITIAL_ORDERS,
} from '../data/mockAgroData';
import { Category, Order, Post, Product } from './types';

class MockCollection<T extends { id: string }> {
  private items: T[];

  constructor(initial: T[]) {
    this.items = [...initial];
  }

  getAll(): T[] {
    return [...this.items];
  }

  findById(id: string): T | undefined {
    return this.items.find((item) => item.id === id);
  }

  insert(item: T): T {
    this.items.unshift(item);
    return item;
  }

  update(id: string, patch: Partial<T>): T | undefined {
    const index = this.items.findIndex((item) => item.id === id);
    if (index === -1) return undefined;
    this.items[index] = { ...this.items[index], ...patch };
    return this.items[index];
  }

  deleteById(id: string): boolean {
    const index = this.items.findIndex((item) => item.id === id);
    if (index === -1) return false;
    this.items.splice(index, 1);
    return true;
  }
}

/**
 * Simulated network latency. Keeps UI skeletons working and mimics
 * a real backend round-trip. Set to 0 for instant responses.
 */
const MOCK_LATENCY_MS = 120;

export const mockDb = {
  posts: new MockCollection<Post>(INITIAL_POSTS),
  products: new MockCollection<Product>(INITIAL_PRODUCTS),
  orders: new MockCollection<Order>(INITIAL_ORDERS),
  categories: new MockCollection<Category>(CATEGORIES),
  latencyMs: MOCK_LATENCY_MS,
};

/**
 * Waits for the simulated network delay.
 * Resolves immediately when latency is 0.
 */
export function delay(ms: number = mockDb.latencyMs): Promise<void> {
  if (ms <= 0) return Promise.resolve();
  return new Promise((resolve) => setTimeout(resolve, ms));
}
