import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  Post,
  Product,
  Order,
  Category,
  INITIAL_POSTS,
  INITIAL_PRODUCTS,
  INITIAL_ORDERS,
  CATEGORIES,
} from '../data/mockAgroData';
import { CreatePostInput, Notification, ProductReview } from '../api/types';
import type {
  BusinessProfile,
  SupplierProfile,
  Contract,
  B2BProduct,
  B2BOrder,
  B2BOrderStatus,
  B2BPaymentMethod,
  SupplierFinanceSummary,
  CreateSupplierProfileInput,
  CreateBusinessProfileInput,
  CreateB2BProductInput,
  B2BPlatformRequisites,
} from '../api/types';
import { type AuthUser, authClient, deleteListingMedia, isSupabaseConfigured } from '../api/authClient';
import { postsRepository } from '../api/repositories/postsRepository';
import { productsRepository } from '../api/repositories/productsRepository';
import { ordersRepository } from '../api/repositories/ordersRepository';
import { userInteractionsRepository } from '../api/repositories/userInteractionsRepository';
import { notificationsRepository } from '../api/repositories/notificationsRepository';
import { productReviewsRepository } from '../api/repositories/productReviewsRepository';
import { subscribeToNotifications } from '../api/notificationsRealtime';
import { playNotificationSound } from '../utils/notificationSound';
import { showDeviceNotification } from '../utils/deviceNotifications';
import { syncWebPushSubscription } from '../utils/webPush';
import { cacheManager } from '../utils/cacheManager';
import { adminRepository } from '../api/adminRepository';
import { b2bRepository, DEFAULT_PLATFORM_REQUISITES, type B2BDeliveryInfo, type CheckoutResult } from '../api/b2bRepository';
import { type B2BRoute } from '../utils/b2bRoute';
import { mapCategoryItemsToCategories } from '../utils/categoryScope';


export type NavTab = 'home' | 'search' | 'market' | 'profile' | 'admin';

let hydrationVersion = 0;

export type SubView =
  | 'orders'
  | 'saved'
  | 'settings'
  | 'edit-profile'
  | null;

interface AgroStoreState {
  posts: Post[];
  products: Product[];
  orders: Order[];
  categories: Category[];
  setCategories: (categories: Category[]) => void;
  activeTab: NavTab;
  activeSubView: SubView;
  savedPostIds: string[];
  likedPostIds: string[];
  followedSellerIds: string[];
  viewedPostIds: string[];

  // --- Offline & Cache state ---
  isHydrating: boolean;
  isOffline: boolean;
  isBackgroundFetching: boolean;
  fetchError: string | null;

  selectedSellerModal: {
    sellerId?: string;
    sellerName: string;
    sellerAvatar?: string;
    location?: string;
    phone?: string;
    telegram?: string;
    verified?: boolean;
    bio?: string;
  } | null;
  setSelectedSellerModal: (
    data: {
      sellerId?: string;
      sellerName: string;
      sellerAvatar?: string;
      location?: string;
      phone?: string;
      telegram?: string;
      verified?: boolean;
      bio?: string;
    } | null
  ) => void;

  isCreateModalOpen: boolean;

  isAuthPromptOpen: boolean;
  isNotificationsOpen: boolean;
  notifications: Notification[];
  unreadNotificationsCount: number;
  fetchNotifications: () => Promise<void>;
  markNotificationRead: (id: string) => Promise<void>;
  markAllNotificationsRead: () => Promise<void>;
  productReviews: Record<string, ProductReview[]>;
  fetchProductReviews: (productId: string) => Promise<void>;
  submitProductReview: (productId: string, rating: number, comment: string) => Promise<void>;
  commentPost: Post | null;
  sharePost: Post | null;
  productDetail: Product | Post | null;
  toastMessage: string | null;
  selectedCategoryModalId: string | null;
  pushNotification: Notification | null;
  clearPushNotification: () => void;

  uploadingPostStatus: { isUploading: boolean; title?: string; isSuccess?: boolean; error?: string } | null;
  setUploadingPostStatus: (status: { isUploading: boolean; title?: string; isSuccess?: boolean; error?: string } | null) => void;

  isVideoViewerOpen: boolean;
  videoViewerPosts: Post[];
  videoViewerStartIndex: number;
  isAdminUser: boolean;

  editModalItem: Post | Product | null;

  currentUser: AuthUser | null;
  isAuthenticated: boolean;
  /** True until the first restoreSession() resolves. Gates profile-dependent UI
   *  so a previous/stale session never renders before the real one is confirmed. */
  isAuthLoading: boolean;
  loginUser: (user: AuthUser) => Promise<void>;
  logoutUser: () => Promise<void>;
  clearSession: () => void;
  deleteAccount: () => Promise<void>;
  updateUserProfile: (updatedFields: Partial<AuthUser>) => Promise<void>;
  restoreSession: () => Promise<void>;

  setActiveTab: (tab: NavTab) => void;
  setActiveSubView: (subView: SubView) => void;
  toggleLikePost: (postId: string) => void;
  toggleSavePost: (postId: string) => void;
  incrementPostViews: (postId: string) => void;
  addPost: (newPost: Post) => Promise<void>;
  updatePost: (postId: string, updatedFields: Partial<Post>) => void;
  deletePost: (postId: string) => void;
  updateProduct: (productId: string, updatedFields: Partial<Product>) => void;
  deleteProduct: (productId: string) => void;
  addCommentToPost: (postId: string) => void;
  hydrateFromApi: () => Promise<void>;
  retryHydrate: () => void;

  approvePost: (postId: string) => void;
  rejectPost: (postId: string, reason?: string) => void;

  toggleFollowSeller: (sellerId: string, sellerName?: string) => void;

  setCreateModalOpen: (open: boolean) => void;
  setAuthPromptOpen: (open: boolean) => void;
  setEditModalItem: (item: Post | Product | null) => void;
  setNotificationsOpen: (open: boolean) => void;
  setCommentPost: (post: Post | null) => void;
  setSharePost: (post: Post | null) => void;
  setProductDetail: (item: Product | Post | null) => void;
  setSelectedCategoryModalId: (catId: string | null) => void;
  setIsAdminUser: (isAdmin: boolean) => void;
  showToast: (msg: string) => void;
  hideToast: () => void;
  showPushNotification: (n: Notification) => void;

  openVideoViewer: (posts: Post[], startIndex: number) => void;
  closeVideoViewer: () => void;

  // --- B2B (ulgurji savdo) ---
  b2bRoute: B2BRoute;
  setB2BRoute: (route: B2BRoute) => void;
  businessProfile: BusinessProfile | null;
  supplierProfile: SupplierProfile | null;
  fetchOwnB2BProfiles: () => Promise<void>;
  registerSupplier: (input: CreateSupplierProfileInput) => Promise<void>;
  registerBusinessBuyer: (input: CreateBusinessProfileInput) => Promise<void>;
  b2bContract: Contract | null;
  fetchOwnB2BContract: () => Promise<void>;
  respondToB2BContract: (accept: boolean) => Promise<void>;
  b2bCart: Record<string, { product: B2BProduct; quantity: number }>;
  addToB2BCart: (product: B2BProduct) => void;
  updateB2BCartQuantity: (productId: string, nextQuantity: number) => void;
  clearB2BCart: () => void;
  checkoutB2BCart: (delivery: B2BDeliveryInfo, paymentMethod: B2BPaymentMethod, cashbackUsed?: number) => Promise<CheckoutResult>;
  b2bCashbackRate: number;
  b2bCashbackBalance: number;
  platformRequisites: B2BPlatformRequisites;
  fetchB2BCashbackBalance: () => Promise<void>;
  fetchB2BCashbackRate: () => Promise<void>;
  setB2BCashbackRate: (rate: number) => Promise<void>;
  fetchPlatformRequisites: () => Promise<void>;
  setPlatformRequisites: (req: Partial<B2BPlatformRequisites>) => Promise<void>;
  b2bOrders: B2BOrder[];
  fetchB2BOrders: () => Promise<void>;
  supplierB2BOrders: B2BOrder[];
  fetchSupplierB2BOrders: () => Promise<void>;
  supplierUpdateB2BOrderStatus: (orderId: string, status: B2BOrderStatus, rejectionReason?: string) => Promise<void>;
  supplierConfirmB2BCashPayment: (orderId: string) => Promise<void>;
  ownB2BProducts: B2BProduct[];
  fetchOwnB2BProducts: () => Promise<void>;
  submitB2BProduct: (input: CreateB2BProductInput) => Promise<void>;
  updateOwnB2BProduct: (id: string, patch: Partial<CreateB2BProductInput>) => Promise<void>;
  deleteOwnB2BProduct: (id: string) => Promise<void>;
  supplierFinanceSummary: SupplierFinanceSummary | null;
  fetchOwnSupplierFinanceSummary: (sinceIso?: string) => Promise<void>;
}

// ADMIN_EMAIL is kept only as a fallback for mock-mode (no Supabase). Real admin check comes from profiles.is_admin in DB.
const ADMIN_EMAIL = 'nuraliyevsuhrobiddin@gmail.com';

// Realtime subscription handle — lives outside Zustand state since it's a side-effect handle, not serializable.
let notificationsUnsubscribe: (() => void) | null = null;

type NotificationPreferences = {
  pushNotifications: boolean;
  orderUpdates: boolean;
  marketingMessages: boolean;
};

function getNotificationPreferences(): NotificationPreferences {
  const defaults: NotificationPreferences = {
    pushNotifications: true,
    orderUpdates: true,
    marketingMessages: false,
  };

  if (typeof window === 'undefined') return defaults;

  try {
    const saved = localStorage.getItem('onbozor-app-settings');
    if (!saved) return defaults;
    const parsed = JSON.parse(saved) as Partial<NotificationPreferences>;
    return {
      pushNotifications: parsed.pushNotifications !== false,
      orderUpdates: parsed.orderUpdates !== false,
      marketingMessages: parsed.marketingMessages === true,
    };
  } catch {
    return defaults;
  }
}

function shouldPresentNotification(notification: Notification): boolean {
  const settings = getNotificationPreferences();
  if (!settings.pushNotifications) return false;

  const isOrderUpdate = notification.type === 'order_status'
    || notification.type === 'b2b_new_order'
    || notification.type === 'b2b_order_status';
  if (isOrderUpdate && !settings.orderUpdates) return false;

  return notification.type !== 'broadcast' || settings.marketingMessages;
}

function mergeNotifications(current: Notification[], incoming: Notification[]): Notification[] {
  const byId = new Map<string, Notification>();
  [...current, ...incoming].forEach((notification) => {
    const existing = byId.get(notification.id);
    // A local read acknowledgement must not be overwritten by an older fetch.
    byId.set(notification.id, existing?.isRead && !notification.isRead
      ? { ...notification, isRead: true }
      : notification);
  });

  return [...byId.values()]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 100);
}

function countUnreadNotifications(notifications: Notification[]): number {
  return notifications.filter((notification) => !notification.isRead).length;
}

// E'lon muddati: expiresAt yo'q (cheksiz) yoki hali kelmagan bo'lsa — faol.
function isPostActive(post: Post): boolean {
  return !post.expiresAt || new Date(post.expiresAt).getTime() > Date.now();
}

function filterActivePosts(posts: Post[]): Post[] {
  return posts.filter(isPostActive);
}

function getNotificationTargetUrl(n: Notification): string {
  if (n.targetType === 'b2b_order' && n.targetId) return `#market/order/${n.targetId}`;
  if (n.targetType === 'b2b_product' && n.targetId) return `#market/product/${n.targetId}`;
  if (n.targetType === 'supplier_profile') return '#market/dashboard';
  if (n.targetType === 'order') return '#profile/orders';
  return '#home';
}

export const useAgroStore = create<AgroStoreState>()(
  persist(
    (set, get) => {
      const initialUser = isSupabaseConfigured ? null : authClient.getCurrentUser();
      const initialIsAdmin = initialUser
        ? Boolean(initialUser.isAdmin) || initialUser.email?.toLowerCase().trim() === ADMIN_EMAIL
        : !isSupabaseConfigured; // Enable admin mode by default in mock/development mode

      async function loadUserInteractions(user: AuthUser) {
        try {
          const [savedPostIds, likedPostIds] = await Promise.all([
            userInteractionsRepository.listSavedPostIds(user.id),
            userInteractionsRepository.listLikedPostIds(user.id),
          ]);

          set((state) => ({
            savedPostIds,
            likedPostIds,
            posts: state.posts.map((post) => ({
              ...post,
              isSaved: savedPostIds.includes(post.id),
              isLiked: likedPostIds.includes(post.id),
            })),
          }));
        } catch {
          // Keep local state if backend interaction load fails.
        }
      }

      function receiveNotification(notification: Notification) {
        const presentOnDevice = shouldPresentNotification(notification);
        let isNew = false;

        set((state) => {
          isNew = !state.notifications.some((item) => item.id === notification.id);
          const notifications = mergeNotifications(state.notifications, [notification]);
          return {
            notifications,
            unreadNotificationsCount: countUnreadNotifications(notifications),
            ...(isNew && presentOnDevice ? { pushNotification: notification } : {}),
          };
        });

        if (isNew && presentOnDevice) {
          playNotificationSound();
          void showDeviceNotification({
            title: notification.title,
            body: notification.body,
            id: notification.id,
            url: getNotificationTargetUrl(notification),
          });
        }
      }

      async function fetchNotificationsList() {
        try {
          const rows = await notificationsRepository.list();
          set((state) => {
            const notifications = mergeNotifications(state.notifications, rows);
            return {
              notifications,
              unreadNotificationsCount: countUnreadNotifications(notifications),
            };
          });
        } catch {
          // Keep previously loaded notifications if the fetch fails.
        }
      }

      function startNotificationsSubscription(userId: string) {
        notificationsUnsubscribe?.();
        notificationsUnsubscribe = subscribeToNotifications(userId, receiveNotification);
      }

      const cachedPostsResult = cacheManager.loadPostsCache();
      const cachedProductsResult = cacheManager.loadProductsCache();

      const initialPosts = filterActivePosts(
        cachedPostsResult?.posts?.length ? cachedPostsResult.posts : INITIAL_POSTS
      );
      const initialProducts = cachedProductsResult?.products?.length ? cachedProductsResult.products : INITIAL_PRODUCTS;

      const markPostFlags = (posts: Post[], savedPostIds: string[], likedPostIds: string[]) =>
        posts.map((post) => ({
          ...post,
          isSaved: savedPostIds.includes(post.id),
          isLiked: likedPostIds.includes(post.id),
        }));

      return {
        posts: initialPosts,
        products: initialProducts,
        orders: INITIAL_ORDERS,
        categories: CATEGORIES,
        setCategories: (categories) => set({ categories }),
        activeTab: 'home',
        activeSubView: null,
        isAdminUser: initialIsAdmin,

        // --- Offline & Cache state ---
        isHydrating: true,
        isOffline: typeof navigator !== 'undefined' ? !navigator.onLine : false,
        isBackgroundFetching: false,
        fetchError: null,

        // --- Auth: restore session from localStorage ---
        currentUser: initialUser,
        isAuthenticated: !!initialUser,
        // Mock mode resolves the session synchronously above; Supabase mode
        // must wait for the first restoreSession() round-trip before we know
        // who (if anyone) is really signed in.
        isAuthLoading: isSupabaseConfigured,

        savedPostIds: [],
        likedPostIds: [],
        followedSellerIds: [],
        viewedPostIds: [],

        selectedSellerModal: null,
        setSelectedSellerModal: (data) => set({ selectedSellerModal: data }),

        isCreateModalOpen: false,

        isAuthPromptOpen: false,
        isNotificationsOpen: false,
        notifications: [],
        unreadNotificationsCount: 0,
        productReviews: {},
        commentPost: null,
        sharePost: null,
        productDetail: null,
        toastMessage: null,
        selectedCategoryModalId: null,
        pushNotification: null,
        uploadingPostStatus: null,

        isVideoViewerOpen: false,
        videoViewerPosts: [],
        videoViewerStartIndex: 0,

        setActiveTab: (tab) =>
          set((state) => {
            if (tab === 'profile' && !state.isAuthenticated) {
              return { isAuthPromptOpen: true };
            }
            return { activeTab: tab, activeSubView: null };
          }),
        setActiveSubView: (subView) => set({ activeSubView: subView }),

        // --- Auth actions ---
        loginUser: async (user: AuthUser) => {
          // isAdmin comes from DB profiles.is_admin field (set in authClient restoreSession/signIn)
          const isAdmin = Boolean(user.isAdmin) || (!isSupabaseConfigured && user.email.toLowerCase().trim() === ADMIN_EMAIL);

          // Only wipe personal state when this is actually a different account
          // than whatever was previously active in this browser tab — otherwise
          // a redundant login call (e.g. re-auth as yourself) would blow away
          // an in-progress cart for no reason.
          const isNewUser = get().currentUser?.id !== user.id;

          set({
            currentUser: user,
            isAuthenticated: true,
            isAdminUser: isAdmin,
            isAuthLoading: false,
            ...(isNewUser
              ? {
                  savedPostIds: [],
                  likedPostIds: [],
                  followedSellerIds: [],
                  viewedPostIds: [],
                  orders: [],
                  notifications: [],
                  unreadNotificationsCount: 0,
                  b2bCart: {},
                  businessProfile: null,
                  supplierProfile: null,
                  b2bContract: null,
                  b2bOrders: [],
                  supplierB2BOrders: [],
                  ownB2BProducts: [],
                  supplierFinanceSummary: null,
                  b2bRoute: { view: 'home' as const },
                }
              : {}),
          });

          await Promise.all([
            loadUserInteractions(user),
            get().hydrateFromApi(),
          ]);
          startNotificationsSubscription(user.id);
          void fetchNotificationsList();
          void get().fetchOwnB2BProfiles();
          void syncWebPushSubscription();
        },

        restoreSession: async () => {
          const restoredUser = await authClient.restoreSession();

          if (!restoredUser) {
            // No valid session on the server. If the app still thinks someone
            // is logged in (e.g. a stale/expired session persisted from a
            // previous visit), that stale identity must not keep showing —
            // clear it the same way an explicit logout would.
            if (get().isAuthenticated) {
              get().clearSession();
            }
            set({ isAuthLoading: false });
            return;
          }

          // isAdmin sourced from profiles.is_admin in Supabase DB — not from email string
          const isAdmin = Boolean(restoredUser.isAdmin) || (!isSupabaseConfigured && restoredUser.email.toLowerCase().trim() === ADMIN_EMAIL);
          const isNewUser = get().currentUser?.id !== restoredUser.id;

          set({
            currentUser: restoredUser,
            isAuthenticated: true,
            isAdminUser: isAdmin,
            isAuthLoading: false,
            ...(isNewUser
              ? {
                  savedPostIds: [],
                  likedPostIds: [],
                  followedSellerIds: [],
                  viewedPostIds: [],
                  orders: [],
                  notifications: [],
                  unreadNotificationsCount: 0,
                  b2bCart: {},
                  businessProfile: null,
                  supplierProfile: null,
                  b2bContract: null,
                  b2bOrders: [],
                  supplierB2BOrders: [],
                  ownB2BProducts: [],
                  supplierFinanceSummary: null,
                  b2bRoute: { view: 'home' as const },
                }
              : {}),
          });

          await loadUserInteractions(restoredUser);
          if (get().posts.length === 0) {
            void get().hydrateFromApi();
          }
          startNotificationsSubscription(restoredUser.id);
          void fetchNotificationsList();
          void get().fetchOwnB2BProfiles();
          void syncWebPushSubscription();
        },

        logoutUser: async () => {
          await authClient.signOut();
          get().clearSession();
        },

        deleteAccount: async () => {
          await authClient.deleteAccount();
          get().clearSession();
          set({ toastMessage: "Akkauntingiz muvaffaqiyatli o'chirildi" });
        },

        clearSession: () => {
          notificationsUnsubscribe?.();
          notificationsUnsubscribe = null;

          try {
            // Clean user draft & profile keys in localStorage
            for (let i = localStorage.length - 1; i >= 0; i--) {
              const key = localStorage.key(i);
              if (key && (key.startsWith('onbozor-draft-') || key.startsWith('onbozor-profile-'))) {
                localStorage.removeItem(key);
              }
            }
          } catch {
            // Ignore
          }

          set((state) => ({
            currentUser: null,
            isAuthenticated: false,
            isAdminUser: false,
            isAuthLoading: false,
            // Reset user-specific state on logout
            savedPostIds: [],
            likedPostIds: [],
            followedSellerIds: [],
            viewedPostIds: [],
            orders: [],
            notifications: [],
            unreadNotificationsCount: 0,
            b2bCart: {},
            businessProfile: null,
            supplierProfile: null,
            b2bContract: null,
            b2bOrders: [],
            supplierB2BOrders: [],
            ownB2BProducts: [],
            supplierFinanceSummary: null,
            b2bRoute: { view: 'home' as const },
            // Keep public listings active for guests; just reset personal flags:
            posts: state.posts.map((p) => ({ ...p, isSaved: false, isLiked: false })),
            activeSubView: null,
          }));
          if (get().posts.length === 0) {
            void get().hydrateFromApi();
          }
        },

        updateUserProfile: async (updatedFields) => {
          const updatedUser = await authClient.updateUser(updatedFields);
          if (isSupabaseConfigured && !updatedUser) {
            throw new Error("Profil ma'lumotlarini serverda saqlab bo'lmadi");
          }
          set((state) => {
            const nextUser = updatedUser || (state.currentUser ? { ...state.currentUser, ...updatedFields } : null);
            // Preserve isAdmin from DB — don't derive from email on update
            const isAdmin = Boolean(nextUser?.isAdmin) || (!isSupabaseConfigured && (nextUser?.email || '').toLowerCase().trim() === ADMIN_EMAIL);
            return {
              currentUser: nextUser,
              isAdminUser: isAdmin,
              toastMessage: "Profil ma'lumotlari muvaffaqiyatli saqlandi!",
            };
          });
        },

      toggleLikePost: (postId) => {
        const state = get();
        if (isSupabaseConfigured && !state.currentUser) {
          set({ toastMessage: 'Layk bosish uchun tizimga kiring' });
          return;
        }
        const isLiked = state.likedPostIds.includes(postId);
        const nextLikedIds = isLiked
          ? state.likedPostIds.filter((id) => id !== postId)
          : [...state.likedPostIds, postId];
        const nextPosts = state.posts.map((post) =>
          post.id === postId
            ? { ...post, isLiked: !isLiked, likesCount: Math.max(0, post.likesCount + (isLiked ? -1 : 1)) }
            : post
        );

        set({ likedPostIds: nextLikedIds, posts: nextPosts });

        if (state.currentUser && isSupabaseConfigured) {
          const userId = state.currentUser.id;
          const likePromise = isLiked
            ? userInteractionsRepository.removeLikedPost(userId, postId)
            : userInteractionsRepository.addLikedPost(userId, postId);

          // likes_count boshqa foydalanuvchining postini UPDATE qilishni talab qiladi
          // va RLS buni ataylab taqiqlaydi. Like holati liked_posts orqali saqlanadi.
          likePromise.catch(() => {
            set((currentState) => {
              const restoreLikedIds = isLiked
                ? [...currentState.likedPostIds, postId]
                : currentState.likedPostIds.filter((id) => id !== postId);
              const restorePosts = currentState.posts.map((post) =>
                post.id === postId
                  ? { ...post, isLiked, likesCount: Math.max(0, post.likesCount + (isLiked ? 1 : -1)) }
                  : post
              );
              return {
                likedPostIds: restoreLikedIds,
                posts: restorePosts,
                toastMessage: 'Layk saqlashda xatolik yuz berdi. Iltimos qayta urinib ko‘ring.',
              };
            });
          });
        }
      },

      toggleSavePost: (postId) => {
        const state = get();
        const isSaved = state.savedPostIds.includes(postId);
        const nextSavedIds = isSaved
          ? state.savedPostIds.filter((id) => id !== postId)
          : [...state.savedPostIds, postId];
        const nextPosts = state.posts.map((post) =>
          post.id === postId ? { ...post, isSaved: !isSaved } : post
        );

        set({
          savedPostIds: nextSavedIds,
          posts: nextPosts,
          toastMessage: isSaved ? "Saqlanganlardan o'chirildi" : "Saqlanganlarga qo'shildi",
        });

        if (state.currentUser && isSupabaseConfigured) {
          const userId = state.currentUser.id;
          const request = isSaved
            ? userInteractionsRepository.removeSavedPost(userId, postId)
            : userInteractionsRepository.addSavedPost(userId, postId);

          request.catch(() => {
            set((currentState) => {
              const revertSavedIds = isSaved
                ? [...currentState.savedPostIds, postId]
                : currentState.savedPostIds.filter((id) => id !== postId);
              const revertPosts = currentState.posts.map((post) =>
                post.id === postId ? { ...post, isSaved } : post
              );
              return {
                savedPostIds: revertSavedIds,
                posts: revertPosts,
                toastMessage: 'Saqlanganlardan saqlashda xatolik yuz berdi. Iltimos qayta urinib ko‘ring.',
              };
            });
          });
        }
      },

      incrementPostViews: (postId) => {
        const state = get();
        if (state.viewedPostIds.includes(postId)) {
          return;
        }

        set({
          viewedPostIds: [...state.viewedPostIds, postId],
          posts: state.posts.map((post) =>
            post.id === postId
              ? { ...post, viewsCount: (post.viewsCount || 0) + 1 }
              : post
          ),
        });

        postsRepository.incrementViews(postId).catch(() => {
          // Server xatosida lokal UI ishlashda davom etadi.
        });
      },

      toggleFollowSeller: (sellerId, sellerName = 'Sotuvchi') =>
        set((state) => {
          if (!state.isAuthenticated) {
            return {
              isAuthPromptOpen: true,
              toastMessage: "Obuna bo'lish uchun avval tizimga kiring",
            };
          }
          if (state.currentUser?.id === sellerId) return state;
          const isFollowing = state.followedSellerIds.includes(sellerId);
          const nextFollowed = isFollowing
            ? state.followedSellerIds.filter((id) => id !== sellerId)
            : [...state.followedSellerIds, sellerId];
          return {
            followedSellerIds: nextFollowed,
            toastMessage: isFollowing
              ? `${sellerName} obunasi bekor qilindi`
              : `${sellerName} ga muvaffaqiyatli obuna bo'lindingiz!`,
          };
        }),

      addPost: async (newPost) => {
        const input: CreatePostInput = {
          userId: newPost.userId || newPost.sellerId,
          sellerId: newPost.sellerId,
          sellerName: newPost.sellerName,
          sellerAvatar: newPost.sellerAvatar,
          verified: newPost.verified,
          location: newPost.location,
          latitude: newPost.latitude ?? null,
          longitude: newPost.longitude ?? null,
          phone: newPost.phone,
          telegram: newPost.telegram,
          title: newPost.title,
          category: newPost.category,
          categoryName: newPost.categoryName,
          price: newPost.price,
          numericPrice: newPost.numericPrice,
          minOrder: newPost.minOrder,
          type: newPost.type,
          mediaUrl: newPost.mediaUrl,
          posterUrl: newPost.posterUrl,
          condition: newPost.condition,
          description: newPost.description,
          expiresAt: newPost.expiresAt,
        };

        // Faqat server postni qabul qilgandan keyin e'lon lentaga qo'shiladi.
        // Shunday qilib tarmoq xatosi “muvaffaqiyatli” deb ko'rsatilmaydi.
        const created = await postsRepository.create(input);
        set((state) => {
          const nextPosts = [created, ...state.posts];
          cacheManager.savePostsCache(nextPosts);
          return { posts: nextPosts };
        });
      },
      editModalItem: null,
      setEditModalItem: (item) => set({ editModalItem: item }),

      deletePost: (postId) => {
        const stateBeforeDelete = get();
        const targetPost = stateBeforeDelete.posts.find((p) => p.id === postId);
        const isOwner = Boolean(
          stateBeforeDelete.currentUser && targetPost && (
            targetPost.userId === stateBeforeDelete.currentUser.id ||
            targetPost.sellerId === stateBeforeDelete.currentUser.id
          )
        );
        if (!stateBeforeDelete.isAdminUser && !isOwner) {
          set({ toastMessage: "Faqat e'lon egasi uni o'chira oladi." });
          return;
        }
        set((state) => {
          const nextPosts = state.posts.filter((p) => p.id !== postId);
          cacheManager.savePostsCache(nextPosts);
          return {
            posts: nextPosts,
            productDetail: state.productDetail?.id === postId ? null : state.productDetail,
            toastMessage: "E'lon muvaffaqiyatli o'chirildi",
          };
        });
        postsRepository.remove(postId)
          .then(() => {
            if (targetPost?.mediaUrl) void deleteListingMedia(targetPost.mediaUrl);
            if (targetPost?.posterUrl) void deleteListingMedia(targetPost.posterUrl);
          })
          .catch((err: Error) => {
            set({ toastMessage: `E'lonni serverdan o'chirishda xatolik: ${err.message || 'Tarmoq xatosi'}` });
          });
      },

      updatePost: (postId, updatedFields) => {
        const stateBeforeUpdate = get();
        const targetPost = stateBeforeUpdate.posts.find((p) => p.id === postId);
        const isOwner = Boolean(
          stateBeforeUpdate.currentUser && targetPost && (
            targetPost.userId === stateBeforeUpdate.currentUser.id ||
            targetPost.sellerId === stateBeforeUpdate.currentUser.id
          )
        );
        if (!stateBeforeUpdate.isAdminUser && !isOwner) {
          set({ toastMessage: "Faqat e'lon egasi uni tahrirlay oladi." });
          return;
        }
        set((state) => {
          const nextPosts = state.posts.map((p) =>
            p.id === postId ? { ...p, ...updatedFields } : p
          );
          const nextDetail = state.productDetail?.id === postId
            ? { ...state.productDetail, ...updatedFields }
            : state.productDetail;
          cacheManager.savePostsCache(nextPosts);
          return {
            posts: nextPosts,
            productDetail: nextDetail as Post | Product | null,
            editModalItem: null,
            toastMessage: "E'lon tahrirlandi va saqlandi!",
          };
        });
        postsRepository.update(postId, updatedFields).catch((err: Error) => {
          set({ toastMessage: `Serverda saqlanmadi: ${err.message || 'Xatolik'}` });
        });
      },

      deleteProduct: (productId) => {
        if (!get().isAdminUser) {
          set({ toastMessage: "Mahsulotni o'chirish faqat Admin paneli orqali amalga oshiriladi!" });
          return;
        }
        const targetProduct = get().products.find((p) => p.id === productId);
        set((state) => {
          const nextProducts = state.products.filter((p) => p.id !== productId);
          cacheManager.saveProductsCache(nextProducts);
          return {
            products: nextProducts,
            productDetail: state.productDetail?.id === productId ? null : state.productDetail,
            toastMessage: "Mahsulot muvaffaqiyatli o'chirildi",
          };
        });
        productsRepository.remove(productId)
          .then(() => {
            if (targetProduct?.image) void deleteListingMedia(targetProduct.image);
            if (targetProduct?.images) {
              targetProduct.images.forEach((img) => void deleteListingMedia(img));
            }
          })
          .catch((err: Error) => {
            set({ toastMessage: `Mahsulotni serverdan o'chirishda xatolik: ${err.message || 'Tarmoq xatosi'}` });
          });
      },

      updateProduct: (productId, updatedFields) => {
        if (!get().isAdminUser) {
          set({ toastMessage: "Mahsulotni tahrirlash faqat Admin paneli orqali amalga oshiriladi!" });
          return;
        }
        set((state) => {
          const nextProducts = state.products.map((p) =>
            p.id === productId ? { ...p, ...updatedFields } : p
          );
          const nextDetail = state.productDetail?.id === productId
            ? { ...state.productDetail, ...updatedFields }
            : state.productDetail;
          return {
            products: nextProducts,
            productDetail: nextDetail as Post | Product | null,
            editModalItem: null,
            toastMessage: "Mahsulot tahrirlandi va saqlandi!",
          };
        });
        productsRepository.update(productId, updatedFields).catch((err: Error) => {
          set({ toastMessage: `Serverda saqlanmadi: ${err.message || 'Xatolik'}` });
        });
      },

      approvePost: (postId) => {
        set((state) => ({
          posts: state.posts.map((p) =>
            p.id === postId ? { ...p, status: 'approved' } : p
          ),
          toastMessage: "E'lon tasdiqlandi va nashr qilindi!",
        }));
        // Supabase update (adminRepository.updatePostModeration) is called from the tab component
      },

      rejectPost: (postId, reason) => {
        set((state) => ({
          posts: state.posts.map((p) =>
            p.id === postId
              ? { ...p, status: 'rejected', ...(reason ? { rejectionReason: reason } : {}) }
              : p
          ),
          toastMessage: reason ? `E'lon rad etildi: ${reason}` : "E'lon rad etildi",
        }));
      },

      addCommentToPost: (postId) =>
        set((state) => ({
          posts: state.posts.map((p) =>
            p.id === postId ? { ...p, commentsCount: p.commentsCount + 1 } : p
          ),
        })),

      hydrateFromApi: async () => {
        const requestVersion = ++hydrationVersion;
        // Step 1: Cache dan darhol o'qi (Stale-While-Revalidate)
        const cachedPosts = cacheManager.loadPostsCache();
        const cachedProducts = cacheManager.loadProductsCache();
        const hasCache = !!(cachedPosts?.posts?.length || cachedProducts?.products?.length);

        if (hasCache) {
          // Cache mavjud: darhol ko'rsat, isHydrating false qil
          const state = get();
          if (cachedPosts?.posts?.length) {
            set({
              posts: filterActivePosts(markPostFlags(cachedPosts.posts, state.savedPostIds, state.likedPostIds)),
              isHydrating: false,
            });
          }
          if (cachedProducts?.products?.length) {
            set({ products: cachedProducts.products, isHydrating: false });
          }
        }

        // Step 2: Background da Supabase dan yangiliklari olib kel
        set({ isBackgroundFetching: true });
        try {
          const [posts, products, dbCategories] = await Promise.all([
            postsRepository.list(),
            productsRepository.list(),
            adminRepository.getCategories().catch(() => []),
          ]);
          if (requestVersion !== hydrationVersion) return;

          // DB categories are authoritative (admin-edited name/icon/scope/
          // active-status must win over the static defaults) — the static
          // CATEGORIES list is only used to backfill cover images and as a
          // fallback before any DB row exists for a given id.
          if (dbCategories && dbCategories.length > 0) {
            set({ categories: mapCategoryItemsToCategories(dbCategories) });
          }

          const state = get();
          // Server postlarini lokal ko'rish/like/saqlash ma'lumotlari bilan birlashtirish.
          // Server ko'rish sonini lokal nusxa bilan solishtirish:
          // ikkisidan kattaroqni ishlatamiz (boshqa sessiyalardagi ko'rishlar ham hisoblanadi).
          const localPostsMap = new Map(state.posts.map((p) => [p.id, p]));
          const freshPosts = posts.map((serverPost) => {
            const localPost = localPostsMap.get(serverPost.id);
            return {
              ...serverPost,
              isSaved: state.savedPostIds.includes(serverPost.id),
              isLiked: state.likedPostIds.includes(serverPost.id),
              // Ko'rish soni: server va lokal o'rtasida kattaroqni ol
              viewsCount: Math.max(
                serverPost.viewsCount || 0,
                localPost?.viewsCount || 0
              ),
            };
          });
          // Optimistic/local moderation items should remain visible in the owner's profile
          // until the backend includes them; marketplace consumers can still filter by status.
          const localOnlyPending = state.posts.filter((localPost) =>
            localPost.status === 'pending' && !freshPosts.some((serverPost) => serverPost.id === localPost.id)
          );
          const mergedPosts = [...localOnlyPending, ...freshPosts];
          const finalPosts = filterActivePosts(mergedPosts.length > 0 ? mergedPosts : INITIAL_POSTS);
          const finalProducts = products.length > 0 ? products : INITIAL_PRODUCTS;
          cacheManager.savePostsCache(finalPosts);
          cacheManager.saveProductsCache(finalProducts);
          set({
            posts: finalPosts,
            products: finalProducts,
            isHydrating: false,
            isOffline: false,
            fetchError: null,
            isBackgroundFetching: false,
          });
          if (state.isAuthenticated) {
            const orders = await ordersRepository.list();
            set({ orders });
          }
        } catch (error: any) {
          if (requestVersion !== hydrationVersion) return;
          console.warn('Failed to hydrate data:', error?.message || error);
          // Network xatosi: cache ko'rsatilayotgan bo'lsa, foydalanuvchi hech nima sezmaydi
          const isOfflineNow = typeof navigator !== 'undefined' ? !navigator.onLine : false;
          set({
            isHydrating: false,
            isBackgroundFetching: false,
            isOffline: isOfflineNow,
            fetchError: hasCache ? null : (isOfflineNow ? 'offline' : 'network_error'),
          });
        }
      },

      retryHydrate: () => {
        set({ fetchError: null });
        void get().hydrateFromApi();
      },

      setCreateModalOpen: (open) =>
        set((state) =>
          open && !state.isAuthenticated
            ? { isAuthPromptOpen: true }
            : { isCreateModalOpen: open }
        ),
      setAuthPromptOpen: (open) => set({ isAuthPromptOpen: open }),
      setNotificationsOpen: (open) => set({ isNotificationsOpen: open }),

      fetchNotifications: async () => {
        if (!get().currentUser) return;
        await fetchNotificationsList();
      },

      markNotificationRead: async (id) => {
        const target = get().notifications.find((n) => n.id === id);
        if (!target || target.isRead) return;
        set((state) => {
          const notifications = state.notifications.map((n) => (n.id === id ? { ...n, isRead: true } : n));
          return { notifications, unreadNotificationsCount: countUnreadNotifications(notifications) };
        });
        try {
          await notificationsRepository.markRead(id);
        } catch {
          // Restore only this notification if the server rejected the update.
          set((state) => {
            const notifications = state.notifications.map((n) => (n.id === id ? target : n));
            return { notifications, unreadNotificationsCount: countUnreadNotifications(notifications) };
          });
        }
      },

      markAllNotificationsRead: async () => {
        const unreadIds = new Set(get().notifications.filter((n) => !n.isRead).map((n) => n.id));
        if (unreadIds.size === 0) return;
        set((state) => {
          const notifications = state.notifications.map((n) => (unreadIds.has(n.id) ? { ...n, isRead: true } : n));
          return { notifications, unreadNotificationsCount: countUnreadNotifications(notifications) };
        });
        try {
          await notificationsRepository.markAllRead();
        } catch {
          // Keep the UI truthful when the bulk request could not be persisted.
          set((state) => {
            const notifications = state.notifications.map((n) => (
              unreadIds.has(n.id) ? { ...n, isRead: false } : n
            ));
            return { notifications, unreadNotificationsCount: countUnreadNotifications(notifications) };
          });
        }
      },

      fetchProductReviews: async (productId) => {
        try {
          const reviews = await productReviewsRepository.list(productId);
          set((state) => ({
            productReviews: { ...state.productReviews, [productId]: reviews },
          }));
        } catch {
          // Sharhlar yuklanmasa ham mahsulot sahifasi ishlashda davom etadi.
        }
      },

      submitProductReview: async (productId, rating, comment) => {
        const { currentUser } = get();
        if (!currentUser) {
          set({ toastMessage: 'Sharh qoldirish uchun tizimga kiring' });
          return;
        }
        const review = await productReviewsRepository.create({
          productId,
          userId: currentUser.id,
          userName: currentUser.businessName?.trim() || currentUser.name || currentUser.handle,
          userAvatar: currentUser.avatar || '',
          rating,
          comment: comment.trim(),
        });
        set((state) => ({
          productReviews: {
            ...state.productReviews,
            [productId]: [review, ...(state.productReviews[productId] || [])],
          },
          toastMessage: 'Sharhingiz uchun rahmat!',
        }));
      },

      setCommentPost: (post) => set({ commentPost: post }),
      setSharePost: (post) => set({ sharePost: post }),
      setProductDetail: (item) => set({ productDetail: item }),
      setSelectedCategoryModalId: (catId) => set({ selectedCategoryModalId: catId }),
      setUploadingPostStatus: (status) => set({ uploadingPostStatus: status }),
      setIsAdminUser: (isAdmin: boolean) => set({ isAdminUser: isAdmin }),
      showToast: (msg) => set({ toastMessage: msg }),
      hideToast: () => set({ toastMessage: null }),
      showPushNotification: (n) => {
        receiveNotification(n);
      },
      clearPushNotification: () => set({ pushNotification: null }),

      openVideoViewer: (posts, startIndex) =>
        set({ isVideoViewerOpen: true, videoViewerPosts: posts, videoViewerStartIndex: startIndex }),
      closeVideoViewer: () =>
        set({ isVideoViewerOpen: false, videoViewerPosts: [], videoViewerStartIndex: 0 }),

      // --- B2B (ulgurji savdo) ---
      b2bRoute: { view: 'home' },
      setB2BRoute: (route) => set({ b2bRoute: route }),

      businessProfile: null,
      supplierProfile: null,
      fetchOwnB2BProfiles: async () => {
        if (!get().isAuthenticated) return;
        try {
          const [businessProfile, supplierProfile] = await Promise.all([
            b2bRepository.fetchOwnBusinessProfile(),
            b2bRepository.fetchOwnSupplierProfile(),
          ]);
          set({
            businessProfile,
            supplierProfile,
            b2bCashbackBalance: businessProfile?.cashbackBalance ?? 0,
          });
          if (businessProfile) {
            void get().fetchB2BCashbackBalance();
          }
        } catch {
          // Tarmoq xatosi bo'lsa — lokal holat oldingidek qoladi.
        }
        void get().fetchB2BCashbackRate();
      },

      registerSupplier: async (input) => {
        const supplierProfile = await b2bRepository.registerSupplier(input);
        set({ supplierProfile, toastMessage: "Ariza yuborildi — admin tasdiqlaguncha kuting" });
      },

      registerBusinessBuyer: async (input) => {
        const businessProfile = await b2bRepository.registerBusinessBuyer(input);
        set({ businessProfile, toastMessage: "Biznes profil yaratildi" });
      },

      b2bContract: null,
      fetchOwnB2BContract: async () => {
        const supplierProfile = get().supplierProfile;
        if (!supplierProfile) return;
        const b2bContract = await b2bRepository.fetchOwnContract(supplierProfile.id);
        set({ b2bContract });
      },
      respondToB2BContract: async (accept) => {
        const contract = get().b2bContract;
        if (!contract) return;
        await b2bRepository.respondToContract(contract.id, accept);
        set({
          b2bContract: { ...contract, status: accept ? 'accepted' : 'rejected', acceptedAt: accept ? new Date().toISOString() : contract.acceptedAt },
          toastMessage: accept ? "Shartnoma qabul qilindi" : "Shartnoma rad etildi",
        });
      },

      b2bCart: {},
      addToB2BCart: (product) =>
        set((state) => {
          const existing = state.b2bCart[product.id];
          const desired = existing ? existing.quantity + 1 : Math.max(1, product.moq);
          if (desired > product.availableQty) {
            return { toastMessage: `Faqat ${product.availableQty} ${product.unit} qoldi` };
          }
          return {
            b2bCart: { ...state.b2bCart, [product.id]: { product, quantity: desired } },
            toastMessage: "Savatga qo'shildi",
          };
        }),
      updateB2BCartQuantity: (productId, nextQuantity) =>
        set((state) => {
          if (nextQuantity <= 0) {
            const { [productId]: _removed, ...rest } = state.b2bCart;
            return { b2bCart: rest };
          }
          const existing = state.b2bCart[productId];
          if (!existing) return {};
          const clamped = Math.min(Math.max(nextQuantity, existing.product.moq), existing.product.availableQty);
          return {
            b2bCart: { ...state.b2bCart, [productId]: { ...existing, quantity: clamped } },
            ...(clamped !== nextQuantity
              ? { toastMessage: clamped === existing.product.moq ? `Minimal buyurtma: ${existing.product.moq} ${existing.product.unit}` : `Faqat ${existing.product.availableQty} ${existing.product.unit} qoldi` }
              : {}),
          };
        }),
      clearB2BCart: () => set({ b2bCart: {} }),
      b2bCashbackRate: b2bRepository.getB2BCashbackRate(),
      b2bCashbackBalance: 0,
      fetchB2BCashbackBalance: async () => {
        const businessProfile = get().businessProfile;
        if (!businessProfile) return;
        const bal = await b2bRepository.fetchBuyerCashbackBalance(businessProfile.id);
        set({ b2bCashbackBalance: bal });
      },
      setB2BCashbackRate: async (rate: number) => {
        await b2bRepository.setB2BCashbackRate(rate);
        set({ b2bCashbackRate: rate, toastMessage: `Keshbek foizi ${rate}% ga o'zgartirildi` });
      },
      fetchB2BCashbackRate: async () => {
        const rate = await b2bRepository.fetchB2BCashbackRate();
        set({ b2bCashbackRate: rate });
      },
      platformRequisites: DEFAULT_PLATFORM_REQUISITES,
      fetchPlatformRequisites: async () => {
        const req = await b2bRepository.fetchPlatformRequisites();
        set({ platformRequisites: req });
      },
      setPlatformRequisites: async (patch) => {
        await b2bRepository.setPlatformRequisites(patch);
        const req = await b2bRepository.fetchPlatformRequisites();
        set({ platformRequisites: req, toastMessage: "To'lov rekvizitlari yangilandi" });
      },
      checkoutB2BCart: async (delivery, paymentMethod, cashbackUsed = 0) => {
        const { b2bCart, businessProfile } = get();
        if (!businessProfile) throw new Error("Avval biznes profilingizni to'ldiring");
        const cartLines = Object.values(b2bCart);
        if (cartLines.length === 0) throw new Error("Savat bo'sh");

        // Keshbek yechish endi har bir supplier buyurtmasi bilan BITTA
        // tranzaksiyada (repository/RPC ichida) atomik — shu yerda alohida
        // yechish shart emas va muvaffaqiyatsiz buyurtmalar uchun mablag'
        // hech qachon yechilmaydi.
        const result: CheckoutResult = await b2bRepository.checkoutB2BCart(businessProfile.id, cartLines, paymentMethod, delivery, cashbackUsed);

        set((state) => {
          const nextCart = { ...state.b2bCart };
          for (const line of cartLines) {
            if (result.succeededSupplierIds.includes(line.product.supplierId)) {
              delete nextCart[line.product.id];
            }
          }
          return { b2bCart: nextCart };
        });
        void get().fetchB2BOrders();
        void get().fetchB2BCashbackBalance();
        return result;
      },

      b2bOrders: [],
      fetchB2BOrders: async () => {
        if (!get().isAuthenticated) return;
        const b2bOrders = await b2bRepository.listB2BOrdersForBuyer();
        set({ b2bOrders });
      },

      supplierB2BOrders: [],
      fetchSupplierB2BOrders: async () => {
        const supplierProfile = get().supplierProfile;
        if (!supplierProfile) return;
        const supplierB2BOrders = await b2bRepository.listB2BOrdersForSupplier(supplierProfile.id);
        set({ supplierB2BOrders });
      },
      supplierUpdateB2BOrderStatus: async (orderId, status, rejectionReason) => {
        await b2bRepository.supplierUpdateOrderStatus(orderId, status, rejectionReason);
        set((state) => ({
          supplierB2BOrders: state.supplierB2BOrders.map((o) => o.id === orderId ? { ...o, status, rejectionReason: rejectionReason ?? o.rejectionReason } : o),
          toastMessage: "Buyurtma holati yangilandi",
        }));
      },
      supplierConfirmB2BCashPayment: async (orderId) => {
        await b2bRepository.supplierConfirmCashPayment(orderId);

        // Haqiqiy hisoblangan keshbek summasini serverdan (RPC yozgan
        // cashback_earned) qayta o'qiymiz — mijoz tomonda taxmin qilmaymiz,
        // chunki foiz b2b_config'da o'zgargan bo'lishi mumkin.
        let cashbackMsg = '';
        try {
          const order = await b2bRepository.getB2BOrder(orderId);
          if (order && order.cashbackEarned && order.cashbackEarned > 0) {
            const fmt = (v: number) => `${v.toLocaleString('uz-UZ')} so'm`;
            cashbackMsg = `🎉 ${order.orderNumber} buyurtmasi uchun +${fmt(order.cashbackEarned)} keshbek hisobingizga tushdi!`;
          }
        } catch {
          // Xabar matni muhim emas — asosiy amal (tasdiqlash) allaqachon muvaffaqiyatli bo'ldi.
        }

        set((state) => ({
          supplierB2BOrders: state.supplierB2BOrders.map((o) =>
            o.id === orderId ? { ...o, paymentStatus: 'cash_confirmed' } : o
          ),
          toastMessage: cashbackMsg || "✅ Naqd to'lov tasdiqlandi. Keshbek hisobga o'tkazildi!",
        }));

        // Refresh buyer cashback balance (so HomeView badge updates if same session)
        try {
          await get().fetchB2BCashbackBalance();
        } catch {
          // Non-critical
        }
      },

      ownB2BProducts: [],
      fetchOwnB2BProducts: async () => {
        const supplierProfile = get().supplierProfile;
        if (!supplierProfile) return;
        const ownB2BProducts = await b2bRepository.listOwnB2BProducts(supplierProfile.id);
        set({ ownB2BProducts });
      },
      submitB2BProduct: async (input) => {
        const created = await b2bRepository.submitB2BProduct(input);
        set((state) => ({
          ownB2BProducts: [created, ...state.ownB2BProducts],
          toastMessage: "Mahsulot moderatsiyaga yuborildi",
        }));
      },
      updateOwnB2BProduct: async (id, patch) => {
        await b2bRepository.updateB2BProduct(id, patch);
        set((state) => ({
          ownB2BProducts: state.ownB2BProducts.map((p) => p.id === id ? { ...p, ...patch } as B2BProduct : p),
          toastMessage: "Mahsulot yangilandi",
        }));
      },
      deleteOwnB2BProduct: async (id) => {
        await b2bRepository.deleteB2BProduct(id);
        set((state) => ({
          ownB2BProducts: state.ownB2BProducts.filter((p) => p.id !== id),
          toastMessage: "Mahsulot o'chirildi",
        }));
      },

      supplierFinanceSummary: null,
      fetchOwnSupplierFinanceSummary: async (sinceIso) => {
        const supplierProfile = get().supplierProfile;
        if (!supplierProfile) return;
        const supplierFinanceSummary = await b2bRepository.fetchSupplierFinanceSummary(supplierProfile.id, sinceIso);
        set({ supplierFinanceSummary });
      },
    };
  },
  {
    name: 'onbozor-agro-store',
    partialize: (state) => ({
      b2bCart: state.b2bCart,
      savedPostIds: state.savedPostIds,
      likedPostIds: state.likedPostIds,
      followedSellerIds: state.followedSellerIds,
      // In Supabase mode, currentUser/isAuthenticated must never be trusted
      // from a locally-persisted copy — restoreSession() re-derives them from
      // a real, freshly-validated session on every load. Persisting a stale
      // copy here is exactly what let one account's data flash (or, if
      // restoreSession ever failed silently, permanently stick) on another
      // account's screen. Mock mode has its own separate session store
      // (onbozor-auth-session), so it's unaffected by this.
      ...(isSupabaseConfigured
        ? {}
        : { currentUser: state.currentUser, isAuthenticated: state.isAuthenticated }),
    }),
  }
)
);

// Muddati tugagan e'lonlarni faol ro'yxatdan olib tashlaydi — sahifa ochiq
// turgan paytda ham (masalan, "1 kunlik" e'lon kun davomida tugab qolsa).
if (typeof window !== 'undefined') {
  setInterval(() => {
    const state = useAgroStore.getState();
    const active = filterActivePosts(state.posts);
    if (active.length !== state.posts.length) {
      useAgroStore.setState({ posts: active });
    }
  }, 60000);
}
