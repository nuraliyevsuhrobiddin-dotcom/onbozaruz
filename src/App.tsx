import React, { useEffect } from 'react';
import { motion, AnimatePresence, type Transition } from 'framer-motion';
import { useAgroStore, type NavTab, type SubView } from './store/useAgroStore';

import { InstagramHeader } from './components/InstagramHeader';
import { InstagramBottomNav } from './components/InstagramBottomNav';
import { DesktopLeftSidebar } from './components/DesktopLeftSidebar';
import { DesktopRightSidebar } from './components/DesktopRightSidebar';

import { HomeFeedView } from './views/HomeFeedView';
import { SearchExploreView } from './views/SearchExploreView';
import { MarketShopView } from './views/MarketShopView';
import { ProfileView } from './views/ProfileView';

import { CreatePostModal } from './components/CreatePostModal';
import { CommentSheetModal } from './components/CommentSheetModal';
import { ShareModal } from './components/ShareModal';
import { ContactSellerModal } from './components/ContactSellerModal';
import { ProductDetailModal } from './components/ProductDetailModal';
import { NotificationsDrawerModal } from './components/NotificationsDrawerModal';
import { Toast } from './components/ui/Toast';
import { VideoReelsViewer } from './components/VideoReelsViewer';
import { CategoryExplorerModal } from './components/CategoryExplorerModal';
import { EditListingModal } from './components/EditListingModal';
import { AuthView } from './views/AuthView';
import { AuthCallbackView } from './views/AuthCallbackView';
import { AdminView } from './views/AdminView';
import { SellerProfileModal } from './components/SellerProfileModal';
import { subscribeToAuthState } from './api/authClient';
import { InstallAppPrompt } from './components/InstallAppPrompt';



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
    setActiveTab,
    setActiveSubView,
    isAuthenticated,
    isAuthPromptOpen,
    loginUser,
    restoreSession,
    clearSession,
    setAuthPromptOpen,
  } = useAgroStore();
  const showHeader = activeTab !== 'search' && activeTab !== 'admin';

  const isAuthCallback = window.location.pathname === '/auth/callback';

  // All hooks MUST run before any early return (Rules of Hooks)
  useEffect(() => {
    hydrateFromApi();
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
      void restoreSession();
    });
  }, [clearSession, isAuthCallback, restoreSession]);

  // ─── Single Page App History & Phone Back Button Handler ─────────────────
  const { activeSubView } = useAgroStore();

  // Push new history state whenever activeTab or activeSubView changes
  useEffect(() => {
    if (isAuthCallback) return;

    const currentSubView = useAgroStore.getState().activeSubView;
    const nextHash = currentSubView ? `#${activeTab}/${currentSubView}` : `#${activeTab}`;

    if (window.location.hash !== nextHash) {
      window.history.pushState(
        { tab: activeTab, subView: currentSubView },
        '',
        nextHash
      );
    }
  }, [activeTab, activeSubView, isAuthCallback]);

  // Handle hardware / browser back button (popstate)
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      const state = event.state as { tab?: NavTab; subView?: SubView } | null;
      const { activeTab: currentTab, activeSubView: currentSubView } = useAgroStore.getState();

      // If state is provided from history pop
      if (state) {
        if (state.subView !== currentSubView) {
          setActiveSubView(state.subView || null);
        }
        if (state.tab && state.tab !== currentTab) {
          setActiveTab(state.tab);
        }
        return;
      }

      // Fallback if no history state (e.g. hash manually changed or direct back)
      if (currentSubView) {
        setActiveSubView(null);
      } else if (currentTab !== 'home') {
        setActiveTab('home');
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [setActiveSubView, setActiveTab]);


  if (isAuthCallback) {
    return (
      <AuthCallbackView
        onSuccess={(user) => {
          void loginUser(user).then(() => {
            window.history.replaceState(null, '', '/#home');
            window.location.reload();
          });
        }}
      />
    );
  }

  // Feed and search remain public. Registration is requested only for Market
  // and for creating a listing.
  if (isAuthPromptOpen && !isAuthenticated) {
    return (
      <AuthView
        onSuccess={(user) => {
          void loginUser(user).then(() => {
            // DB-sourced isAdmin — check after loginUser updates store
            const { isAdminUser } = useAgroStore.getState();
            if (isAdminUser) {
              setActiveTab('admin');
            } else {
              setActiveTab('profile');
            }
          });
          setAuthPromptOpen(false);
        }}
        onBack={() => setAuthPromptOpen(false)}
      />
    );
  }

  return (
    <div
      className="min-h-screen bg-[#F8F9FA] text-[#111111] antialiased flex flex-col"
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
      <div className="flex-1 w-full lg:pl-20 flex justify-center">
        <div className={`w-full flex justify-center gap-5 px-0 sm:px-4 py-1.5 sm:py-3 lg:py-5 ${activeTab === 'admin' ? 'max-w-none' : 'max-w-275'}`}>
          {/* Main Feed / Content View */}
          <main className={`flex-1 min-w-0 px-0 sm:px-0 mobile-content-bottom lg:pb-10 ${activeTab === 'admin' ? 'max-w-none' : 'max-w-150'}`}>
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
                  <MarketShopView />
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
                  <AdminView />
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
      <ContactSellerModal />
      <SellerProfileModal />
      <ProductDetailModal />

      <NotificationsDrawerModal />

      {/* Global Toast Micro-Interaction */}
      <Toast message={toastMessage} onClose={hideToast} />

      {/* Fullscreen Video Reels Viewer */}
      <VideoReelsViewer />

      <InstallAppPrompt />

      {/* Category Explorer Modal */}
      <CategoryExplorerModal
        categoryId={selectedCategoryModalId}
        onClose={() => setSelectedCategoryModalId(null)}
      />
    </div>
  );
}


