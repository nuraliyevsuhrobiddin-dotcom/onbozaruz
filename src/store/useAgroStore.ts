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
import { CreatePostInput, CreateProductInput, Notification, ProductReview } from '../api/types';
import { type AuthUser, authClient, deleteListingMedia, isSupabaseConfigured } from '../api/authClient';
import { postsRepository } from '../api/repositories/postsRepository';
import { productsRepository } from '../api/repositories/productsRepository';
import { ordersRepository } from '../api/repositories/ordersRepository';
import { userInteractionsRepository } from '../api/repositories/userInteractionsRepository';
import { notificationsRepository } from '../api/repositories/notificationsRepository';
import { productReviewsRepository } from '../api/repositories/productReviewsRepository';
import { subscribeToNotifications } from '../api/notificationsRealtime';
import { playNotificationSound } from '../utils/notificationSound';
import { cacheManager } from '../utils/cacheManager';
import { adminRepository } from '../api/adminRepository';


export type NavTab = 'home' | 'search' | 'market' | 'profile' | 'admin';

export type SubView =
  | 'orders'
  | 'saved'
  | 'my-listings'
  | 'seller-panel'
  | 'admin-panel'
  | 'settings'
  | 'edit-profile'
  | null;

export type CartItem = {
  product: Product;
  quantity: number;
};

interface AgroStoreState {
  posts: Post[];
  products: Product[];
  orders: Order[];
  categories: Category[];
  setCategories: (categories: Category[]) => void;
  cart: Record<string, CartItem>;
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
  contactSellerData: { name: string; phone: string; telegram?: string; title?: string } | null;
  productDetail: Product | Post | null;
  toastMessage: string | null;
  selectedCategoryModalId: string | null;

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
  addProduct: (newProduct: Partial<Product>) => Promise<void>;
  updateProduct: (productId: string, updatedFields: Partial<Product>) => void;
  deleteProduct: (productId: string) => void;
  addOrder: (newOrder: Order) => Promise<void>;
  updateOrderStatus: (orderId: string, status: string, statusStep: number) => Promise<void>;
  addCommentToPost: (postId: string) => void;
  addToCart: (product: Product) => void;
  updateCartQuantity: (productId: string, nextQuantity: number) => void;
  clearCart: () => void;
  hydrateFromApi: () => Promise<void>;
  retryHydrate: () => void;

  approveProduct: (productId: string) => void;
  rejectProduct: (productId: string) => void;

  approvePost: (postId: string) => void;
  rejectPost: (postId: string, reason?: string) => void;

  toggleFollowSeller: (sellerId: string, sellerName?: string) => void;

  setCreateModalOpen: (open: boolean) => void;
  setAuthPromptOpen: (open: boolean) => void;
  setEditModalItem: (item: Post | Product | null) => void;
  setNotificationsOpen: (open: boolean) => void;
  setCommentPost: (post: Post | null) => void;
  setSharePost: (post: Post | null) => void;
  setContactSellerData: (data: { name: string; phone: string; telegram?: string; title?: string } | null) => void;
  setProductDetail: (item: Product | Post | null) => void;
  setSelectedCategoryModalId: (catId: string | null) => void;
  setIsAdminUser: (isAdmin: boolean) => void;
  showToast: (msg: string) => void;
  hideToast: () => void;

  openVideoViewer: (posts: Post[], startIndex: number) => void;
  closeVideoViewer: () => void;
}

// ADMIN_EMAIL is kept only as a fallback for mock-mode (no Supabase). Real admin check comes from profiles.is_admin in DB.
const ADMIN_EMAIL = 'nuraliyevsuhrobiddin@gmail.com';

// Realtime subscription handle — lives outside Zustand state since it's a side-effect handle, not serializable.
let notificationsUnsubscribe: (() => void) | null = null;

function isNotificationSoundEnabled(): boolean {
  try {
    const saved = localStorage.getItem('onbozor-app-settings');
    if (!saved) return true;
    const parsed = JSON.parse(saved) as { pushNotifications?: boolean };
    return parsed.pushNotifications !== false;
  } catch {
    return true;
  }
}

// E'lon muddati: expiresAt yo'q (cheksiz) yoki hali kelmagan bo'lsa — faol.
function isPostActive(post: Post): boolean {
  return !post.expiresAt || new Date(post.expiresAt).getTime() > Date.now();
}

function filterActivePosts(posts: Post[]): Post[] {
  return posts.filter(isPostActive);
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

      async function fetchNotificationsList() {
        try {
          const rows = await notificationsRepository.list();
          const sorted = [...rows].sort(
            (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
          set({
            notifications: sorted,
            unreadNotificationsCount: sorted.filter((n) => !n.isRead).length,
          });
        } catch {
          // Keep previously loaded notifications if the fetch fails.
        }
      }

      function startNotificationsSubscription(userId: string) {
        notificationsUnsubscribe?.();
        notificationsUnsubscribe = subscribeToNotifications(userId, (notification) => {
          set((state) => ({
            notifications: [notification, ...state.notifications],
            unreadNotificationsCount: state.unreadNotificationsCount + 1,
          }));
          if (isNotificationSoundEnabled()) playNotificationSound();
        });
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
        cart: {},
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
        contactSellerData: null,
        productDetail: null,
        toastMessage: null,
        selectedCategoryModalId: null,
        uploadingPostStatus: null,

        isVideoViewerOpen: false,
        videoViewerPosts: [],
        videoViewerStartIndex: 0,

        setActiveTab: (tab) =>
          set((state) => {
            if ((tab === 'market' || tab === 'profile') && !state.isAuthenticated) {
              return { isAuthPromptOpen: true };
            }
            return { activeTab: tab, activeSubView: null };
          }),
        setActiveSubView: (subView) =>
          set((state) => {
            if (subView === 'admin-panel' && !state.isAdminUser) {
              return {
                activeSubView: null,
                toastMessage: "⛔ Boshqaruv paneliga faqat admin (nuraliyevsuhrobiddin@gmail.com) kirishi mumkin!",
              };
            }
            return { activeSubView: subView };
          }),

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
                  cart: {},
                  savedPostIds: [],
                  likedPostIds: [],
                  followedSellerIds: [],
                  viewedPostIds: [],
                  orders: [],
                  notifications: [],
                  unreadNotificationsCount: 0,
                }
              : {}),
          });

          await Promise.all([
            loadUserInteractions(user),
            get().hydrateFromApi(),
          ]);
          void fetchNotificationsList();
          startNotificationsSubscription(user.id);
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
                  cart: {},
                  savedPostIds: [],
                  likedPostIds: [],
                  followedSellerIds: [],
                  viewedPostIds: [],
                  orders: [],
                  notifications: [],
                  unreadNotificationsCount: 0,
                }
              : {}),
          });

          await loadUserInteractions(restoredUser);
          if (get().posts.length === 0) {
            void get().hydrateFromApi();
          }
          void fetchNotificationsList();
          startNotificationsSubscription(restoredUser.id);
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
            cart: {},
            orders: [],
            notifications: [],
            unreadNotificationsCount: 0,
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

      toggleFollowSeller: (sellerId, sellerName = 'Fermer') =>
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
        if (!get().isAdminUser) {
          set({ toastMessage: "E'lonni o'chirish faqat Admin paneli orqali amalga oshiriladi!" });
          return;
        }
        const targetPost = get().posts.find((p) => p.id === postId);
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
        if (!get().isAdminUser) {
          set({ toastMessage: "E'lonni tahrirlash faqat Admin paneli orqali amalga oshiriladi!" });
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

      addProduct: async (newProduct) => {
        const { isAdminUser, currentUser } = get();
        const canSubmit = isAdminUser || currentUser?.role === 'business';
        if (!canSubmit) {
          throw new Error('Market mahsulotini faqat admin yoki Biznes akkaunt qo\'sha oladi.');
        }

        const input: CreateProductInput = {
          title: newProduct.title || '',
          sellerId: newProduct.sellerId,
          seller: newProduct.seller || '',
          verified: newProduct.verified ?? false,
          category: newProduct.category || '',
          price: newProduct.price || '',
          numericPrice: newProduct.numericPrice ?? 0,
          image: newProduct.image || '',
          images: newProduct.images,
          minOrder: newProduct.minOrder || '',
          discount: newProduct.discount,
          location: newProduct.location || '',
          phone: newProduct.phone,
          telegram: newProduct.telegram,
          description: newProduct.description,
          features: newProduct.features,
          approvalStatus: newProduct.approvalStatus,
          source: newProduct.source,
          submittedBy: newProduct.submittedBy,
          submittedAt: newProduct.submittedAt,
          approvedAt: newProduct.approvedAt,
          rejectedAt: newProduct.rejectedAt,
          stock: newProduct.stock,
        };

        const created = await productsRepository.create(input);
        set((state) => ({
          products: [created, ...state.products],
          toastMessage:
            newProduct.approvalStatus === 'pending'
              ? "E'lon tasdiqlash navbatiga qo'shildi"
              : "Marketga yangi mahsulot qo'shildi",
        }));
      },

      approveProduct: (productId) => {
        const patch: Partial<Product> = {
          approvalStatus: 'approved',
          approvedAt: new Date().toISOString(),
          rejectedAt: undefined,
        };

        set((state) => ({
          products: state.products.map((product) =>
            product.id === productId ? { ...product, ...patch } : product
          ),
          toastMessage: "E'lon marketga joylandi",
        }));

        productsRepository.update(productId, patch).catch(() => {
          // Offline holatda tasdiq lokal qoladi.
        });
      },

      rejectProduct: (productId) => {
        const patch: Partial<Product> = {
          approvalStatus: 'rejected',
          rejectedAt: new Date().toISOString(),
        };

        set((state) => ({
          products: state.products.map((product) =>
            product.id === productId ? { ...product, ...patch } : product
          ),
          toastMessage: "E'lon rad qilindi",
        }));

        productsRepository.update(productId, patch).catch(() => {
          // Offline holatda rad etish lokal qoladi.
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

      addOrder: async (newOrder) => {

        const created = await ordersRepository.create(newOrder);
        set((state) => ({ orders: [created, ...state.orders] }));
      },

      updateOrderStatus: async (orderId, status, statusStep) => {
        set((state) => ({
          orders: state.orders.map((order) =>
            order.id === orderId ? { ...order, status, statusStep } : order
          ),
        }));
      },

      addCommentToPost: (postId) =>
        set((state) => ({
          posts: state.posts.map((p) =>
            p.id === postId ? { ...p, commentsCount: p.commentsCount + 1 } : p
          ),
        })),

      addToCart: (product) =>
        set((state) => {
          const existing = state.cart[product.id];
          const desired = existing ? existing.quantity + 1 : 1;
          const inStock = product.stock == null || desired <= product.stock;
          if (!inStock) {
            return { toastMessage: `Faqat ${product.stock} dona qoldi` };
          }
          return {
            cart: { ...state.cart, [product.id]: { product, quantity: desired } },
            toastMessage: "Savatga qo'shildi",
          };
        }),

      updateCartQuantity: (productId, nextQuantity) =>
        set((state) => {
          if (nextQuantity <= 0) {
            const { [productId]: _removed, ...rest } = state.cart;
            return { cart: rest };
          }
          const existing = state.cart[productId];
          const stock = existing?.product.stock;
          const clamped = stock == null ? nextQuantity : Math.min(nextQuantity, stock);
          return {
            cart: {
              ...state.cart,
              [productId]: { ...state.cart[productId], quantity: clamped },
            },
            ...(clamped < nextQuantity ? { toastMessage: `Faqat ${stock} dona qoldi` } : {}),
          };
        }),

      clearCart: () => set({ cart: {} }),

      hydrateFromApi: async () => {
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

          // Combine DB categories with static CATEGORIES to preserve standard icons/ids
          if (dbCategories && dbCategories.length > 0) {
            const combinedCats: import('../api/types').Category[] = [
              ...CATEGORIES,
              ...dbCategories
                .filter((c) => c.isActive && !CATEGORIES.some((cat) => cat.id === c.id))
                .map((c) => ({ id: c.id, name: c.name, icon: c.icon || 'tag', image: '', count: '0' })),
            ];
            set({ categories: combinedCats });
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
        set((state) => ({
          notifications: state.notifications.map((n) => (n.id === id ? { ...n, isRead: true } : n)),
          unreadNotificationsCount: Math.max(0, state.unreadNotificationsCount - 1),
        }));
        try {
          await notificationsRepository.markRead(id);
        } catch {
          // Local state is already updated optimistically; ignore server failure.
        }
      },

      markAllNotificationsRead: async () => {
        const unread = get().notifications.filter((n) => !n.isRead);
        if (unread.length === 0) return;
        set((state) => ({
          notifications: state.notifications.map((n) => ({ ...n, isRead: true })),
          unreadNotificationsCount: 0,
        }));
        try {
          await Promise.all(unread.map((n) => notificationsRepository.markRead(n.id)));
        } catch {
          // Local state is already updated optimistically; ignore partial server failures.
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
      setContactSellerData: (data) => set({ contactSellerData: data }),
      setProductDetail: (item) => set({ productDetail: item }),
      setSelectedCategoryModalId: (catId) => set({ selectedCategoryModalId: catId }),
      setUploadingPostStatus: (status) => set({ uploadingPostStatus: status }),
      setIsAdminUser: (isAdmin: boolean) => set({ isAdminUser: isAdmin }),
      showToast: (msg) => set({ toastMessage: msg }),
      hideToast: () => set({ toastMessage: null }),

      openVideoViewer: (posts, startIndex) =>
        set({ isVideoViewerOpen: true, videoViewerPosts: posts, videoViewerStartIndex: startIndex }),
      closeVideoViewer: () =>
        set({ isVideoViewerOpen: false, videoViewerPosts: [], videoViewerStartIndex: 0 }),
    };
  },
  {
    name: 'onbozor-agro-store',
    partialize: (state) => ({
      cart: state.cart,
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
