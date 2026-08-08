import React, { useEffect } from 'react';
import { motion, AnimatePresence, type Transition } from 'framer-motion';
import { useAgroStore, type NavTab } from './store/useAgroStore';
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
import { subscribeToAuthState } from './api/authClient';

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
    setActiveTab,
    setActiveSubView,
    isAuthenticated,
    isAuthPromptOpen,
    loginUser,
    restoreSession,
    clearSession,
    setAuthPromptOpen,
  } = useAgroStore();
  const showHeader = activeTab !== 'search';
  const isAuthCallback = window.location.pathname === '/auth/callback';

  // All hooks MUST run before any early return (Rules of Hooks)
  useEffect(() => {
    hydrateFromApi();
  }, [hydrateFromApi]);

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

  useEffect(() => {
    if (!isAuthenticated) return;
    const validTabs: NavTab[] = ['home', 'search', 'market', 'profile'];

    const parseHash = (): NavTab => {
      const tab = window.location.hash.replace(/^#/, '') as NavTab;
      return validTabs.includes(tab) ? tab : 'home';
    };

    const handleHashChange = () => {
      const nextTab = parseHash();
      const currentTab = useAgroStore.getState().activeTab;
      if (nextTab !== currentTab) {
        setActiveTab(nextTab);
      }
    };

    const initialTab = parseHash();
    if (initialTab !== useAgroStore.getState().activeTab) {
      setActiveTab(initialTab);
    }

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [isAuthenticated, setActiveTab]);

  useEffect(() => {
    if (isAuthCallback) return;
    const nextHash = `#${activeTab}`;
    if (window.location.hash !== nextHash) {
      window.history.replaceState(null, '', nextHash);
    }
  }, [activeTab, isAuthCallback]);

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
            if (user.email.toLowerCase().trim() === 'onbozar@gmail.com') {
              setActiveTab('profile');
              setActiveSubView('admin-panel');
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

      {/* в”Ђв”Ђ Main Layout Area (Shifted right by sidebar width 80px) в”Ђв”Ђ */}
      <div className="flex-1 w-full lg:pl-[80px] flex justify-center">
        <div className="w-full max-w-[1100px] flex justify-center gap-5 px-2 sm:px-4 py-3 lg:py-5">
          {/* Main Feed / Content View */}
          <main className="flex-1 min-w-0 max-w-[600px] pb-32 lg:pb-10">
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
      <ProductDetailModal />
      <NotificationsDrawerModal />

      {/* Global Toast Micro-Interaction */}
      <Toast message={toastMessage} onClose={hideToast} />

      {/* Fullscreen Video Reels Viewer */}
      <VideoReelsViewer />

      {/* Category Explorer Modal */}
      <CategoryExplorerModal
        categoryId={selectedCategoryModalId}
        onClose={() => setSelectedCategoryModalId(null)}
      />
    </div>
  );
}


