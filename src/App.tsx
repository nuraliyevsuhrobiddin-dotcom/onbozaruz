import { useCallback, useEffect } from 'react';
import { motion, AnimatePresence, type Transition } from 'framer-motion';
import { useAgroStore, type NavTab, type SubView } from './store/useAgroStore';

import { InstagramHeader } from './components/InstagramHeader';
import { InstagramBottomNav } from './components/InstagramBottomNav';
import { DesktopLeftSidebar } from './components/DesktopLeftSidebar';
import { DesktopRightSidebar } from './components/DesktopRightSidebar';

import { HomeFeedView } from './views/HomeFeedView';
import { SearchExploreView } from './views/SearchExploreView';
import { B2BView } from './views/B2BView';
import { ProfileView } from './views/ProfileView';
import { parseB2BHash, encodeB2BHash } from './utils/b2bRoute';

import { CreatePostModal } from './components/CreatePostModal';
import { CommentSheetModal } from './components/CommentSheetModal';
import { ShareModal } from './components/ShareModal';
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
    setB2BRoute,
    b2bRoute,
    activeSubView,
  } = useAgroStore();
  const isMarketMap = activeTab === 'market' && b2bRoute.view === 'map';
  const showHeader = activeTab !== 'search' && activeTab !== 'admin' && !isMarketMap;

  const isAuthCallback = window.location.pathname === '/auth/callback';

  // All hooks MUST run before any early return (Rules of Hooks)
  useEffect(() => {
    hydrateFromApi();
  }, [hydrateFromApi]);

  // Derives {activeTab, activeSubView/b2bRoute} from window.location.hash —
  // shared by the initial mount parse and the popstate "no history state"
  // fallback, so both agree on what a given hash means instead of the
  // fallback blindly resetting to home.
  const applyHashRoute = useCallback(() => {
    const hash = window.location.hash.slice(1); // Remove '#'
    const [tab, ...rest] = hash.split('/');
    if (tab && (tab === 'home' || tab === 'search' || tab === 'market' || tab === 'profile' || tab === 'admin')) {
      setActiveTab(tab as NavTab);
      if (tab === 'market') {
        setB2BRoute(parseB2BHash(rest));
      } else if (rest[0]) {
        setActiveSubView(rest[0] as SubView);
      }
    } else {
      setActiveTab('home');
    }
  }, [setActiveTab, setActiveSubView, setB2BRoute]);

  // ─── Parse initial route from URL hash ──────────────────────────────────
  useEffect(() => {
    if (isAuthCallback) return;
    if (!window.location.hash.slice(1)) return;
    applyHashRoute();
  }, [isAuthCallback, applyHashRoute]);

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
  // Push new history state whenever activeTab/activeSubView/b2bRoute changes.
  // Reads activeTab from getState() (not the destructured hook value) —
  // when this effect and the hash-parse mount effect fire in the same
  // commit, the hook value here is still last render's stale snapshot even
  // though the store itself already has the new tab, which previously made
  // this push the wrong (stale) tab into history right after a deep link.
  useEffect(() => {
    if (isAuthCallback) return;

    const state = useAgroStore.getState();
    const nextHash = state.activeTab === 'market'
      ? `#market/${encodeB2BHash(state.b2bRoute)}`
      : (state.activeSubView ? `#${state.activeTab}/${state.activeSubView}` : `#${state.activeTab}`);

    if (window.location.hash !== nextHash) {
      window.history.pushState(
        { tab: state.activeTab, subView: state.activeSubView, b2bRoute: state.b2bRoute },
        '',
        nextHash
      );
    }
  }, [activeTab, activeSubView, b2bRoute, isAuthCallback]);

  // Handle hardware / browser back button (popstate)
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      const state = event.state as { tab?: NavTab; subView?: SubView; b2bRoute?: import('./utils/b2bRoute').B2BRoute } | null;

      // If state is provided from history pop
      if (state) {
        const { activeTab: currentTab, activeSubView: currentSubView } = useAgroStore.getState();
        if (state.tab === 'market' && state.b2bRoute) {
          setB2BRoute(state.b2bRoute);
        } else if (state.subView !== currentSubView) {
          setActiveSubView(state.subView || null);
        }
        if (state.tab && state.tab !== currentTab) {
          setActiveTab(state.tab);
        }
        return;
      }

      // Fallback if no history state (e.g. hash manually changed, a history
      // entry from before this app pushed state, or a browser/automation
      // quirk firing popstate on load) — re-derive the route from the
      // current hash instead of blindly resetting to home, which would
      // otherwise clobber a valid deep link (e.g. #market/dashboard).
      applyHashRoute();
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [setActiveSubView, setActiveTab, setB2BRoute, applyHashRoute]);


  if (isAuthCallback) {
    return (
      <AuthCallbackView
        onSuccess={(user) => {
          void loginUser(user).then(() => {
            window.history.replaceState(null, '', '/#profile');
            setActiveTab('profile');
            setActiveSubView('edit-profile');
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
              setActiveSubView('edit-profile');
            }
          });
          setAuthPromptOpen(false);
        }}
        onBack={() => {
          setAuthPromptOpen(false);
          setActiveSubView(null);
          setActiveTab('home');
          window.dispatchEvent(new Event('onbozor:reset-feed'));
        }}
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
        <div className={`w-full flex justify-center gap-5 ${isMarketMap ? 'px-0 py-0 max-w-none' : 'px-0 sm:px-4 py-1.5 sm:py-3 lg:py-5'} ${activeTab === 'admin' || isMarketMap ? 'max-w-none' : 'max-w-275'}`}>
          {/* Main Feed / Content View */}
          <main className={`flex-1 min-w-0 px-0 sm:px-0 ${isMarketMap ? 'pb-0 lg:pb-0 max-w-none' : 'mobile-content-bottom lg:pb-10'} ${activeTab === 'admin' || isMarketMap ? 'max-w-none' : 'max-w-150'}`}>
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
                  <B2BView />
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
