import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  Post,
  Product,
  Order,
  INITIAL_POSTS,
  INITIAL_PRODUCTS,
  INITIAL_ORDERS,
} from '../data/mockAgroData';
import { CreatePostInput, CreateProductInput } from '../api/types';
import { type AuthUser, authClient, deleteListingMedia, isSupabaseConfigured } from '../api/authClient';
import { postsRepository } from '../api/repositories/postsRepository';
import { productsRepository } from '../api/repositories/productsRepository';
import { ordersRepository } from '../api/repositories/ordersRepository';
import { userInteractionsRepository } from '../api/repositories/userInteractionsRepository';
import { cacheManager } from '../utils/cacheManager';

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

export type CartItem = {
  product: Product;
  quantity: number;
};

interface AgroStoreState {
  posts: Post[];
  products: Product[];
  orders: Order[];
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

  isCreateModalOpen: boolean;
  isAuthPromptOpen: boolean;
  isNotificationsOpen: boolean;
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

  // --- Auth ---
  currentUser: AuthUser | null;
  isAuthenticated: boolean;
  loginUser: (user: AuthUser) => Promise<void>;
  logoutUser: () => Promise<void>;
  clearSession: () => void;
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
  addProduct: (newProduct: Product) => Promise<void>;
  updateProduct: (productId: string, updatedFields: Partial<Product>) => void;
  deleteProduct: (productId: string) => void;
  addOrder: (newOrder: Order) => Promise<void>;
  addCommentToPost: (postId: string) => void;
  addToCart: (product: Product) => void;
  updateCartQuantity: (productId: string, nextQuantity: number) => void;
  clearCart: () => void;
  hydrateFromApi: () => Promise<void>;
  retryHydrate: () => void;

  approveProduct: (productId: string) => void;
  rejectProduct: (productId: string) => void;

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

const ADMIN_EMAIL = 'nuraliyevsuhrobiddin@gmail.com';

export const useAgroStore = create<AgroStoreState>()(
  persist(
    (set, get) => {
      const initialUser = isSupabaseConfigured ? null : authClient.getCurrentUser();
      const initialIsAdmin = initialUser?.email?.toLowerCase().trim() === ADMIN_EMAIL;

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

      const cachedPostsResult = cacheManager.loadPostsCache();
      const cachedProductsResult = cacheManager.loadProductsCache();

      const initialPosts = cachedPostsResult?.posts?.length ? cachedPostsResult.posts : INITIAL_POSTS;
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

        savedPostIds: [],
        likedPostIds: [],
        followedSellerIds: [],
        viewedPostIds: [],

        isCreateModalOpen: false,
        isAuthPromptOpen: false,
        isNotificationsOpen: false,
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
          const isAdmin = user.email.toLowerCase().trim() === ADMIN_EMAIL;
          set({
            currentUser: user,
            isAuthenticated: true,
            isAdminUser: isAdmin,
          });

          await loadUserInteractions(user);
        },

        restoreSession: async () => {
          const restoredUser = await authClient.restoreSession();
          if (!restoredUser) return;

          const isAdmin = restoredUser.email.toLowerCase().trim() === ADMIN_EMAIL;
          set({
            currentUser: restoredUser,
            isAuthenticated: true,
            isAdminUser: isAdmin,
          });

          await loadUserInteractions(restoredUser);
        },

        logoutUser: async () => {
          await authClient.signOut();
          get().clearSession();
        },

        clearSession: () => set({
            currentUser: null,
            isAuthenticated: false,
            isAdminUser: false,
            // Reset user-specific state on logout
            savedPostIds: [],
            likedPostIds: [],
            followedSellerIds: [],
            viewedPostIds: [],
            cart: {},
            orders: [],
            posts: INITIAL_POSTS,
            activeSubView: null,
          }),

        updateUserProfile: async (updatedFields) => {
          const updatedUser = await authClient.updateUser(updatedFields);
          if (isSupabaseConfigured && !updatedUser) {
            throw new Error("Profil ma'lumotlarini serverda saqlab bo'lmadi");
          }
          set((state) => {
            const nextUser = updatedUser || (state.currentUser ? { ...state.currentUser, ...updatedFields } : null);
            const isAdmin = (nextUser?.email || '').toLowerCase().trim() === ADMIN_EMAIL;
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
        if (!get().isAdminUser) {
          throw new Error('Market mahsulotini faqat admin qo\'sha oladi');
        }

        const input: CreateProductInput = {
          title: newProduct.title,
          sellerId: newProduct.sellerId,
          seller: newProduct.seller,
          verified: newProduct.verified,
          category: newProduct.category,
          price: newProduct.price,
          numericPrice: newProduct.numericPrice,
          image: newProduct.image,
          images: newProduct.images,
          minOrder: newProduct.minOrder,
          discount: newProduct.discount,
          location: newProduct.location,
          telegram: newProduct.telegram,
          approvalStatus: newProduct.approvalStatus,
          source: newProduct.source,
          submittedBy: newProduct.submittedBy,
          submittedAt: newProduct.submittedAt,
          approvedAt: newProduct.approvedAt,
          rejectedAt: newProduct.rejectedAt,
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
      addOrder: async (newOrder) => {
        const created = await ordersRepository.create(newOrder);
        set((state) => ({ orders: [created, ...state.orders] }));
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
          const quantity = existing ? existing.quantity + 1 : 1;
          return {
            cart: { ...state.cart, [product.id]: { product, quantity } },
            toastMessage: "Savatga qo'shildi",
          };
        }),

      updateCartQuantity: (productId, nextQuantity) =>
        set((state) => {
          if (nextQuantity <= 0) {
            const { [productId]: _removed, ...rest } = state.cart;
            return { cart: rest };
          }
          return {
            cart: {
              ...state.cart,
              [productId]: { ...state.cart[productId], quantity: nextQuantity },
            },
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
              posts: markPostFlags(cachedPosts.posts, state.savedPostIds, state.likedPostIds),
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
          const [posts, products] = await Promise.all([
            postsRepository.list(),
            productsRepository.list(),
          ]);
          const state = get();
          const freshPosts = markPostFlags(posts, state.savedPostIds, state.likedPostIds);
          cacheManager.savePostsCache(freshPosts);
          cacheManager.saveProductsCache(products);
          set({
            posts: freshPosts,
            products,
            isHydrating: false,
            isOffline: false,
            fetchError: null,
            isBackgroundFetching: false,
          });
          if (state.isAuthenticated) {
            const orders = await ordersRepository.list();
            set({ orders });
          }
        } catch (err) {
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
    }),
  }
)
);
