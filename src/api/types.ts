/**
 * OnBozor domain types.
 *
 * Single source of truth for all API-level types.
 * UI components should import domain types from here.
 */

export interface Post {
  id: string;
  userId?: string;
  sellerId: string;
  sellerName: string;
  sellerAvatar: string;
  verified: boolean;
  location: string;
  phone: string;
  telegram?: string;
  title: string;
  category: string;
  categoryName: string;
  price: string;
  numericPrice: number;
  minOrder: string;
  type: 'image' | 'video';
  mediaUrl: string;
  posterUrl?: string;
  likesCount: number;
  commentsCount: number;
  viewsCount: number;
  isLiked?: boolean;
  isSaved?: boolean;
  date: string;
  condition?: string;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  image: string;
  count: string;
}

export type ApprovalStatus = 'pending' | 'approved' | 'rejected';
export type ProductSource = 'admin' | 'telegram_bot';

export interface Product {
  id: string;
  sellerId?: string;
  title: string;
  seller: string;
  verified: boolean;
  category: string;
  price: string;
  numericPrice: number;
  image: string;
  images?: string[];
  rating: number;
  reviewsCount: number;
  minOrder: string;
  discount?: string;
  location: string;
  telegram?: string;
  approvalStatus?: ApprovalStatus;
  source?: ProductSource;
  submittedBy?: string;
  submittedAt?: string;
  approvedAt?: string;
  rejectedAt?: string;
}

export interface Order {
  id: string;
  userId?: string;
  productName: string;
  sellerName: string;
  sellerPhone: string;
  image: string;
  totalPrice: string;
  quantity: string;
  status: string;
  statusStep: number;
  date: string;
}

export type CreatePostInput = Omit<Post, 'id' | 'likesCount' | 'commentsCount' | 'viewsCount' | 'isLiked' | 'isSaved'>;
export type CreateProductInput = Omit<Product, 'id' | 'rating' | 'reviewsCount'>;

export type NavTab = 'home' | 'search' | 'market' | 'profile';
export type SubView =
  | 'orders'
  | 'saved'
  | 'my-listings'
  | 'seller-panel'
  | 'admin-panel'
  | 'settings'
  | 'edit-profile'
  | null;
