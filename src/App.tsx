import { lazy, Suspense, useCallback, useEffect } from 'react';
import { motion, AnimatePresence, type Transition } from 'framer-motion';
import { useAgroStore } from './store/useAgroStore';

import { InstagramHeader } from './components/InstagramHeader';
import { InstagramBottomNav } from './components/InstagramBottomNav';
import { DesktopLeftSidebar } from './components/DesktopLeftSidebar';
import { DesktopRightSidebar } from './components/DesktopRightSidebar';

import { HomeFeedView } from './views/HomeFeedView';
import { SearchExploreView } from './views/SearchExploreView';
import { ProfileView } from './views/ProfileView';
import { useAppNavigation, replaceAppRoute } from './hooks/useAppNavigation';
import { useOverlayNavigation } from './hooks/useOverlayNavigation';

import { CreatePostModal } from './components/CreatePostModal';
import { CommentSheetModal } from './components/CommentSheetModal';
import { ShareModal } from './components/ShareModal';
import { ProductDetailModal } from './components/ProductDetailModal';
import { NotificationsDrawerModal } from './components/NotificationsDrawerModal';
import { PushNotificationBanner } from './components/ui/PushNotificationBanner';
import { Toast } from './components/ui/Toast';
import { VideoReelsViewer } from './components/VideoReelsViewer';
import { CategoryExplorerModal } from './components/CategoryExplorerModal';
import { EditListingModal } from './components/EditListingModal';
import { AuthView } from './views/AuthView';
import { AuthCallbackView } from './views/AuthCallbackView';
import { ResetPasswordView } from './views/ResetPasswordView';
import { SellerProfileModal } from './components/SellerProfileModal';
import { subscribeToAuthState } from './api/authClient';
import { InstallAppPrompt } from './components/InstallAppPrompt';
import { AppIconNotice } from './components/AppIconNotice';
import { postsRepository } from './api/repositories/postsRepository';
import { useViewerLocation } from './store/useViewerLocation';
import { loadChunk } from './utils/loadChunk';

// Rarely opened screens load on demand, so the first visit downloads less
// (the admin charts alone were ~100 KB gzipped for every visitor).
const B2BView = lazy(() => loadChunk(() => import('./views/B2BView')).then((m) => ({ default: m.B2BView })));
const AdminView = lazy(() => loadChunk(() => import('./views/AdminView')).then((m) => ({ default: m.AdminView })));
const PrivacyPolicyView = lazy(() => loadChunk(() => import('./views/PrivacyPolicyView')).then((m) => ({ default: m.PrivacyPolicyView })));
const ViewLoading = () => <div aria-busy="true" className="min-h-[60vh]" />;



const pageVariants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
};

const pageTransition: Transition = {
  duration: 0.2,
  ease: 'easeInOut',
};

export default function App() {
  const {
    activeTab,
    toastMessage,
    hideToast,
    selectedCategoryModalId,
    setSelectedCategoryModalId,
    hydrateFromApi,
    retryHydrate,
    isAuthenticated,
    isAuthPromptOpen,
    loginUser,
    restoreSession,
    clearSession,
    setAuthPromptOpen,
    b2bRoute,
  } = useAgroStore();
  const isMarketMap = activeTab === 'market' && b2bRoute.view === 'map';
  const showHeader = activeTab !== 'search' && activeTab !== 'admin' && !isMarketMap;

  const { isAuthCallback, isPasswordReset, isPrivacyPolicy } = useAppNavigation();
  const dismissAuth = useOverlayNavigation(isAuthPromptOpen && !isAuthenticated, () => setAuthPromptOpen(false));
  const handleAuthSuccess = useCallback(async (user: Parameters<typeof loginUser>[0], isNewUser = false) => {
    // Where to go next: a new account fills in its profile; signing in from the
    // Profile tab opens the profile; signing in from an action (follow, contact,
    // new listing...) returns to that same place.
    const state = useAgroStore.getState();
    const destination = isNewUser ? '/#profile/edit-profile'
      : state.authWantsProfile || !state.isAuthPromptOpen ? '/#profile' : null;
    // The sign-in screen disappears as soon as the user is set, while loginUser
    // is still loading: choosing the page first avoids flashing the home feed.
    if (destination && state.isAuthPromptOpen) replaceAppRoute(destination);
    await loginUser(user);
    if (useAgroStore.getState().currentUser?.id !== user.id) return;
    if (useAgroStore.getState().isAdminUser) replaceAppRoute('/#admin');
    else if (destination) replaceAppRoute(destination);
    setAuthPromptOpen(false);
  }, [loginUser, setAuthPromptOpen]);
  const sharedPostId = new URLSearchParams(window.location.search).get('post');

  useEffect(() => {
    if (!sharedPostId || isAuthCallback || isPrivacyPolicy) return;
    let cancelled = false;
    void postsRepository.get(sharedPostId).then(post => {
      if (cancelled) return;
      const store = useAgroStore.getState();
      if (!post || (post.status && post.status !== 'approved') || (post.expiresAt && Date.parse(post.expiresAt) <= Date.now())) {
        store.showToast("E'lon topilmadi yoki muddati tugagan");
        return;
      }
      if (post.type === 'video') store.openVideoViewer([post], 0);
      else store.setProductDetail(post);
    }).catch(() => {
      if (!cancelled) useAgroStore.getState().showToast("E'lonni ochib bo‘lmadi. Havola yoki internet aloqasini tekshiring.");
    });
    return () => { cancelled = true; };
  }, [sharedPostId, isAuthCallback, isPrivacyPolicy]);

  // All hooks MUST run before any early return (Rules of Hooks)
  useEffect(() => {
    hydrateFromApi();
    return useViewerLocation.subscribe((state, previous) => {
      if (state.point?.latitude !== previous.point?.latitude || state.point?.longitude !== previous.point?.longitude) void hydrateFromApi();
    });
  }, [hydrateFromApi]);

  // Online/Offline holat kuzatuvchisi
  useEffect(() => {
    const handleOnline = () => {
      useAgroStore.setState({ isOffline: false });
      retryHydrate(); // Internet qaytganda avtomatik yangilash
    };
    const handleOffline = () => {
      useAgroStore.setState({ isOffline: true });
    };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [retryHydrate]);

  useEffect(() => {
    if (!isAuthCallback) {
      void restoreSession();
    }

    return subscribeToAuthState((event, session) => {
      if (event === 'SIGNED_OUT') {
        clearSession();
        return;
      }
      if (!session) return;
      // While the sign-in screen is open, it completes the sign-in itself and
      // picks the next page. Restoring the session here as well raced it: the
      // screen closed before its success handler ran and the user stayed on the
      // home feed. Fall back to restoring only if it did not finish.
      if (event === 'SIGNED_IN' && useAgroStore.getState().isAuthPromptOpen) {
        window.setTimeout(() => {
          if (!useAgroStore.getState().isAuthenticated) void restoreSession();
        }, 1500);
        return;
      }
      void restoreSession();
    });
  }, [clearSession, isAuthCallback, restoreSession]);

  // ─── Single Page App History & Phone Back Button Handler ─────────────────
  if (isPrivacyPolicy) {
    return (
      <Suspense fallback={<ViewLoading />}>
        <PrivacyPolicyView
          onBack={() => {
            if (history.state?.__mollbazarFrom) history.back();
            else replaceAppRoute('/#home');
          }}
        />
      </Suspense>
    );
  }

  if (isAuthCallback) {
    return (
      <AuthCallbackView
        onSuccess={handleAuthSuccess}
      />
    );
  }

  if (isPasswordReset) {
    return (
      <ResetPasswordView
        onDone={async (user) => {
          await handleAuthSuccess(user);
          useAgroStore.getState().showToast('Parolingiz yangilandi');
        }}
        onRequestNewLink={() => {
          replaceAppRoute('/#home');
          setAuthPromptOpen(true);
        }}
      />
    );
  }

  // Feed and search remain public. Registration is requested only for Market
  // and for creating a listing.
  if (isAuthPromptOpen && !isAuthenticated) {
    return (
      <AuthView
        onSuccess={handleAuthSuccess}
        onBack={dismissAuth}
      />
    );
  }

  return (
    <div
      className="app-shell min-h-screen bg-[#F8F9FA] text-[#111111] antialiased flex flex-col"
      style={{ fontFamily: "'Inter', system-ui, -apple-system, sans-serif" }}
    >
      {/* в”Ђв”Ђ Fixed Desktop Left Sidebar (260px) в”Ђв”Ђ */}
      <DesktopLeftSidebar />

      {/* в”Ђв”Ђ Mobile Header (Hidden on Desktop) в”Ђв”Ђ */}
      <div className="lg:hidden">
        <AnimatePresence mode="wait">
          {showHeader && (
            <motion.div
              key="mobile-header"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.2 }}
            >
              <InstagramHeader />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ─── Main Layout Area (Shifted right by sidebar width 80px) ─── */}
      <div className="desktop-content flex-1 w-full flex justify-center">
        <div className={`w-full flex items-start justify-center gap-5 lg:gap-10 ${isMarketMap ? 'px-0 py-0 max-w-none' : 'px-0 sm:px-4 lg:px-8 py-1.5 sm:py-3 lg:py-8'} ${activeTab === 'admin' || isMarketMap ? 'max-w-none' : activeTab === 'home' ? 'max-w-[1000px]' : 'max-w-[1040px]'}`}>
          {/* Main Feed / Content View */}
          <main id="main-content" className={`flex-1 min-w-0 px-0 sm:px-0 ${isMarketMap ? 'pb-0 lg:pb-0 max-w-none' : 'mobile-content-bottom lg:pb-10'} ${activeTab === 'home' ? 'max-w-[600px]' : 'max-w-none'}`}>
            <AnimatePresence mode="wait">
              {activeTab === 'home' && (
                <motion.div
                  key="home"
                  variants={pageVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  transition={pageTransition}
                >
                  <HomeFeedView />
                </motion.div>
              )}

              {activeTab === 'search' && (
                <motion.div
                  key="search"
                  variants={pageVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  transition={pageTransition}
                >
                  <SearchExploreView />
                </motion.div>
              )}

              {activeTab === 'market' && (
                <motion.div
                  key="market"
                  variants={pageVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  transition={pageTransition}
                >
                  <Suspense fallback={<ViewLoading />}><B2BView /></Suspense>
                </motion.div>
              )}

              {activeTab === 'profile' && (
                <motion.div
                  key="profile"
                  variants={pageVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  transition={pageTransition}
                >
                  <ProfileView />
                </motion.div>
              )}

              {activeTab === 'admin' && (
                <motion.div
                  key="admin"
                  variants={pageVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  transition={pageTransition}
                >
                  <Suspense fallback={<ViewLoading />}><AdminView /></Suspense>
                </motion.div>
              )}
            </AnimatePresence>
          </main>

          {/* в”Ђв”Ђ Desktop Right Sticky Sidebar (Hidden on Mobile) в”Ђв”Ђ */}
          {activeTab === 'home' && <DesktopRightSidebar />}
        </div>
      </div>

      {/* в”Ђв”Ђ Mobile Bottom Navigation (Hidden on Desktop) в”Ђв”Ђ */}
      <div className="lg:hidden">
        <InstagramBottomNav />
      </div>

      {/* Global Modals & Drawers */}
      <CreatePostModal />
      <EditListingModal />
      <CommentSheetModal />
      <ShareModal />
      <SellerProfileModal />
      <ProductDetailModal />

      <NotificationsDrawerModal />

      {/* SMS / Top Dropdown Push Notification Banner */}
      <PushNotificationBanner />

      {/* Global Toast Micro-Interaction */}
      <Toast message={toastMessage} onClose={hideToast} />

      {/* Fullscreen Video Reels Viewer */}
      <VideoReelsViewer />

      <InstallAppPrompt />
      <AppIconNotice />

      {/* Category Explorer Modal */}
      <CategoryExplorerModal
        categoryId={selectedCategoryModalId}
        onClose={() => setSelectedCategoryModalId(null)}
      />
    </div>
  );
}
