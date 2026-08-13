/**
 * Domain types are centralized in src/api/types.
 * This file re-exports them so existing UI imports keep working
 * and there is a single source of truth for the whole app.
 *
 * PRODUCTION NOTE: INITIAL_POSTS, INITIAL_PRODUCTS, INITIAL_ORDERS are empty.
 * Real data comes from the backend API (Supabase or your custom REST server).
 * Set VITE_USE_MOCK_API=true in .env.local to use in-memory mock data during development.
 */
import type { Category, Order, Post, Product } from '../api/types';
export type { Category, Order, Post, Product } from '../api/types';

export const REGIONS = [
  "Barchasi",
  "Toshkent sh.",
  "Toshkent v.",
  "Farg'ona",
  "Andijon",
  "Namangan",
  "Samarqand",
  "Buxoro",
  "Xorazm",
  "Surxondaryo",
  "Qashqadaryo",
  "Jizzax",
  "Sirdaryo",
  "Navoiy",
  "Qoraqalpog'iston R.",
];

export const CATEGORIES: Category[] = [
  {
    id: 'all',
    name: 'Barchasi',
    icon: 'wheat',
    image: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=400&auto=format&fit=crop&q=80',
    count: '',
  },
  {
    id: 'fruits',
    name: 'Meva-Sabzavot',
    icon: 'apple',
    image: 'https://images.unsplash.com/photo-1610832958506-aa56368176cf?w=400&auto=format&fit=crop&q=80',
    count: '',
  },
  {
    id: 'grains',
    name: "G'alla & Don",
    icon: 'wheat',
    image: 'https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=400&auto=format&fit=crop&q=80',
    count: '',
  },
  {
    id: 'machinery',
    name: 'Texnika',
    icon: 'tractor',
    image: 'https://images.unsplash.com/photo-1592194996308-7b43878e84a6?w=400&auto=format&fit=crop&q=80',
    count: '',
  },
  {
    id: 'livestock',
    name: 'Chorva',
    icon: 'beef',
    image: 'https://images.unsplash.com/photo-1516467508483-a7212febe31a?w=400&auto=format&fit=crop&q=80',
    count: '',
  },
  {
    id: 'seeds',
    name: "Urug' & O'g'it",
    icon: 'sprout',
    image: 'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=400&auto=format&fit=crop&q=80',
    count: '',
  },
  {
    id: 'greenhouse',
    name: 'Issiqxona',
    icon: 'leaf',
    image: 'https://images.unsplash.com/photo-1585664811087-47f65abbad64?w=400&auto=format&fit=crop&q=80',
    count: '',
  },
  {
    id: 'apiary',
    name: 'Asal',
    icon: 'honey',
    image: 'https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=400&auto=format&fit=crop&q=80',
    count: '',
  },
  {
    id: 'logistics',
    name: 'Logistika',
    icon: 'package',
    image: 'https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?w=400&auto=format&fit=crop&q=80',
    count: '',
  },
];

// Empty initial seed data to ensure the app does not ship demo listings.
export const INITIAL_POSTS: Post[] = [];

export const INITIAL_PRODUCTS: Product[] = [];

export const INITIAL_ORDERS: Order[] = [];
