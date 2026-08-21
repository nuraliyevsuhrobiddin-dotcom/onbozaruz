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
  description?: string;
  status?: 'pending' | 'approved' | 'rejected';
  rejectionReason?: string;
  /** Muddati tugagan sana (ISO). null/undefined = cheksiz. */
  expiresAt?: string | null;
}

export type CategoryScope = 'post' | 'market' | 'both';

export interface Category {
  id: string;
  name: string;
  icon: string;
  image: string;
  count: string;
  /** Which area this category appears in. Missing/undefined is treated as 'both'. */
  scope?: CategoryScope;
}

export type ApprovalStatus = 'pending' | 'approved' | 'rejected';
export type ProductSource = 'admin' | 'telegram_bot' | 'user';

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
  description?: string;
  features?: string;
  phone?: string;
  telegram?: string;
  approvalStatus?: ApprovalStatus;
  source?: ProductSource;
  submittedBy?: string;
  submittedAt?: string;
  approvedAt?: string;
  rejectedAt?: string;
  /** Zaxiradagi miqdor. null/undefined = cheklanmagan (cheksiz). */
  stock?: number | null;
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
  /** Bitta xariddagi barcha buyurtmalarni birlashtirib ko'rsatish uchun. */
  groupId?: string;
}

export interface ProductReview {
  id: string;
  productId: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  rating: number;
  comment?: string;
  createdAt: string;
}

export type CreatePostInput = Omit<Post, 'id' | 'likesCount' | 'commentsCount' | 'viewsCount' | 'isLiked' | 'isSaved' | 'date'>;
export type CreateProductInput = Omit<Product, 'id' | 'rating' | 'reviewsCount'>;
export type CreateProductReviewInput = Omit<ProductReview, 'id' | 'createdAt'>;

export type NotificationType =
  | 'comment'
  | 'like'
  | 'order_status'
  | 'post_approved'
  | 'post_rejected'
  | 'product_approved'
  | 'product_rejected'
  | 'supplier_approved'
  | 'supplier_rejected'
  | 'supplier_suspended'
  | 'b2b_product_approved'
  | 'b2b_product_rejected'
  | 'b2b_new_order'
  | 'b2b_order_status';

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  targetType?: 'post' | 'order' | 'product' | 'supplier_profile' | 'b2b_product' | 'b2b_order' | '';
  targetId?: string;
  actorId?: string;
  actorName?: string;
  actorAvatar?: string;
  isRead: boolean;
  createdAt: string;
}

// =====================================================================
// B2B (Ulgurji savdo) — Supplier / Business Buyer / Commission
// =====================================================================

export type BusinessType =
  | 'grocery' | 'minimarket' | 'supermarket' | 'clothing' | 'pharmacy'
  | 'cafe_restaurant' | 'construction' | 'household' | 'other';

export type SupplierType = 'manufacturer' | 'importer' | 'distributor' | 'supplier';
export type SupplierVerificationStatus = 'pending' | 'approved' | 'rejected' | 'suspended';
export type ContractStatus = 'pending' | 'accepted' | 'rejected' | 'terminated';
export type B2BProductStatus = 'draft' | 'pending' | 'approved' | 'rejected' | 'inactive';
export type B2BOrderStatus =
  | 'pending' | 'supplier_confirmed' | 'preparing' | 'ready'
  | 'delivering' | 'delivered' | 'cancelled' | 'rejected';
export type B2BPaymentMethod = 'cash' | 'online';
export type B2BPaymentStatus = 'pending' | 'cash_pending' | 'cash_confirmed' | 'paid' | 'failed';

export interface BusinessProfile {
  id: string;
  userId: string;
  storeName: string;
  ownerName: string;
  phone: string;
  businessType: BusinessType;
  region?: string;
  district?: string;
  address?: string;
  latitude?: number | null;
  longitude?: number | null;
  description?: string;
  logoUrl?: string;
  cashbackBalance?: number;
  status: 'active' | 'suspended';
  createdAt: string;
}

export interface B2BStorePublicMarker {
  id: string;
  storeName: string;
  businessType: BusinessType;
  region: string;
  district: string;
  address?: string;
  latitude: number;
  longitude: number;
  logoUrl?: string;
  description?: string;
  createdAt: string;
}

export interface B2BDirectOffer {
  id: string;
  supplierId: string;
  supplierName: string;
  businessId: string;
  storeName: string;
  message: string;
  discountPercent?: number;
  products?: Array<{
    productId: string;
    productName: string;
    wholesalePrice: number;
    offerPrice: number;
    unit: string;
  }>;
  status: 'pending' | 'accepted' | 'declined';
  createdAt: string;
}

export interface B2BCashbackTransaction {
  id: string;
  businessId: string;
  storeName: string;
  orderId?: string;
  orderNumber?: string;
  supplierName?: string;
  orderAmount?: number;
  cashbackRate: number;
  amount: number;
  type: 'earned' | 'redeemed' | 'withdrawn' | 'admin_bonus';
  status: 'completed' | 'pending' | 'rejected';
  payoutDetails?: string; // bank card or account number if withdrawal
  description: string;
  createdAt: string;
}

export interface BusinessAddress {
  id: string;
  businessId: string;
  label?: string;
  storeName?: string;
  phone?: string;
  region?: string;
  district?: string;
  address: string;
  deliveryNote?: string;
  latitude?: number | null;
  longitude?: number | null;
  isDefault?: boolean;
}

export interface SupplierProfile {
  id: string;
  userId: string;
  companyName: string;
  supplierType: SupplierType;
  ownerName: string;
  phone: string;
  email?: string;
  region?: string;
  district?: string;
  address?: string;
  latitude?: number | null;
  longitude?: number | null;
  description?: string;
  categories: string[];
  taxId?: string;
  logoUrl?: string;
  verificationStatus: SupplierVerificationStatus;
  rejectionReason?: string;
  commissionRate: number;
  createdAt: string;
}

export interface Contract {
  id: string;
  supplierId: string;
  contractVersion: string;
  commissionRate: number;
  status: ContractStatus;
  acceptedAt?: string | null;
  terminatedAt?: string | null;
  terminationReason?: string;
  createdAt: string;
}

export interface B2BProduct {
  id: string;
  supplierId: string;
  name: string;
  brand?: string;
  category: string;
  description?: string;
  sku?: string;
  images: string[];
  videoUrl?: string;
  wholesalePrice: number;
  moq: number;
  availableQty: number;
  unit: string;
  packaging?: string;
  deliveryAvailable: boolean;
  deliveryRegions: string[];
  status: B2BProductStatus;
  rejectionReason?: string;
  createdAt: string;
  // Ro'yxat/kartochka ko'rinishida ishlatish uchun — repository join orqali to'ldiradi.
  supplierName?: string;
  supplierVerified?: boolean;
}

export interface B2BOrderItem {
  id: string;
  orderId: string;
  productId?: string | null;
  productName: string;
  productImage?: string;
  unit: string;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
}

export interface B2BOrder {
  id: string;
  orderNumber: string;
  businessId: string;
  supplierId: string;
  buyerUserId: string;
  subtotal: number;
  deliveryFee: number;
  total: number;
  paymentMethod: B2BPaymentMethod;
  paymentStatus: B2BPaymentStatus;
  status: B2BOrderStatus;
  rejectionReason?: string;
  commissionRate: number;
  commissionAmount: number;
  supplierAmount: number;
  deliveryStoreName?: string;
  deliveryPhone?: string;
  deliveryRegion?: string;
  deliveryDistrict?: string;
  deliveryAddress: string;
  deliveryNote?: string;
  cashbackEarned?: number;
  cashbackUsed?: number;
  createdAt: string;
  items?: B2BOrderItem[];
  // Ro'yxat ko'rinishlari uchun — repository join orqali to'ldiradi.
  supplierName?: string;
  businessName?: string;
}

export interface CommissionLedgerEntry {
  id: string;
  orderId: string;
  supplierId: string;
  grossAmount: number;
  commissionRate: number;
  commissionAmount: number;
  supplierAmount: number;
  paymentMethod: B2BPaymentMethod;
  status: 'pending' | 'settled' | 'voided';
  createdAt: string;
}

export interface SupplierFinanceSummary {
  grossSales: number;
  totalCommission: number;
  netAmount: number;
  completedOrders: number;
  pendingOrders: number;
  cashOrders: number;
  onlineOrders: number;
}

export type CreateSupplierProfileInput = Omit<SupplierProfile, 'id' | 'userId' | 'verificationStatus' | 'rejectionReason' | 'commissionRate' | 'createdAt'>;
export type CreateBusinessProfileInput = Omit<BusinessProfile, 'id' | 'userId' | 'status' | 'createdAt'>;
export type CreateB2BProductInput = Omit<B2BProduct, 'id' | 'status' | 'rejectionReason' | 'createdAt' | 'supplierName' | 'supplierVerified'>;

export interface B2BPlatformRequisites {
  adminCardNumber: string;
  adminCardHolder: string;
  adminBankAccount: string;
  adminBankMfo: string;
  adminBankName: string;
  adminPaymentPhone: string;
  adminPaymentInstructions: string;
}

