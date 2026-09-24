import { useEffect, useLayoutEffect, useState } from 'react';
import { useAgroStore, type NavTab, type SubView } from '../store/useAgroStore';
import { encodeB2BHash, parseB2BHash } from '../utils/b2bRoute';

const navigationEvent = 'onbozar:navigate';
const specialRoute = () => window.location.pathname === '/auth/callback' ? 'callback'
  : window.location.pathname === '/privacy-policy' || window.location.hash === '#privacy-policy' ? 'privacy' : null;

/** URL changes restore the complete route atomically, without pushing it again. */
export function useAppNavigation() {
  const { activeTab, activeSubView, b2bRoute } = useAgroStore();
  const [special, setSpecial] = useState(specialRoute);

  useLayoutEffect(() => {
    const restoreRoute = () => {
      const nextSpecial = specialRoute();
      setSpecial(nextSpecial);
      if (nextSpecial) return;
      const [tab, ...rest] = window.location.hash.slice(1).split('/');
      const activeTab: NavTab = ['home', 'search', 'market', 'profile', 'admin'].includes(tab) ? tab as NavTab : 'home';
      const activeSubView: SubView = activeTab === 'profile' && ['edit-profile', 'orders', 'settings'].includes(rest[0])
        ? rest[0] as SubView : null;
      useAgroStore.setState({
        activeTab, activeSubView,
        ...(activeTab === 'market' ? { b2bRoute: parseB2BHash(rest) } : {}),
      });
    };
    restoreRoute();
    window.addEventListener('popstate', restoreRoute);
    window.addEventListener('hashchange', restoreRoute);
    window.addEventListener(navigationEvent, restoreRoute);
    return () => {
      window.removeEventListener('popstate', restoreRoute);
      window.removeEventListener('hashchange', restoreRoute);
      window.removeEventListener(navigationEvent, restoreRoute);
    };
  }, []);

  useEffect(() => {
    if (specialRoute()) return;
    const state = useAgroStore.getState();
    const hash = state.activeTab === 'market' ? `#market/${encodeB2BHash(state.b2bRoute)}`
      : `#${state.activeTab}${state.activeTab === 'profile' && state.activeSubView ? `/${state.activeSubView}` : ''}`;
    if (location.hash === hash) return;
    const historyState = { __onbozarFrom: location.hash };
    // The first route replaces the empty URL: Back should not visit Home twice.
    if (!location.hash) history.replaceState(historyState, '', hash);
    else history.pushState(historyState, '', hash);
  }, [activeTab, activeSubView, b2bRoute, special]);

  return { isAuthCallback: special === 'callback', isPrivacyPolicy: special === 'privacy' };
}

export function replaceAppRoute(url: string) {
  history.replaceState(null, '', url);
  window.dispatchEvent(new Event(navigationEvent));
}

export function navigateAppRoute(url: string) {
  history.pushState({ __onbozarFrom: location.hash }, '', url);
  window.dispatchEvent(new Event(navigationEvent));
}

/** Back buttons consume an existing profile entry; deep links use a safe fallback. */
export function backToProfile() {
  if (history.state?.__onbozarFrom === '#profile') history.back();
  else replaceAppRoute('/#profile');
}
