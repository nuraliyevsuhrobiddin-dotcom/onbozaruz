// Serve with VITE_SUPABASE_URL=https://your-project-id.supabase.co,
// VITE_SUPABASE_ANON_KEY=your-supabase-anon-key and VITE_USE_MOCK_API=true.
// Open /tests/account-flows.html. Real accounts and email are never used.
import React, { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from '../src/App';
import { AuthView } from '../src/views/AuthView';
import { authClient, isSupabaseConfigured, type AuthResult, type AuthUser } from '../src/api/authClient';
import { useAgroStore } from '../src/store/useAgroStore';
import { navigateAppRoute } from '../src/hooks/useAppNavigation';
import '../src/index.css';

const results: string[] = [];
const delay = (ms = 30) => new Promise(resolve => setTimeout(resolve, ms));
function assert(value: unknown, message: string): asserts value { if (!value) throw new Error(message); }
async function until(check: () => boolean, message: string) {
  const start = performance.now();
  while (!check()) { if (performance.now() - start > 7000) throw new Error(message); await delay(); }
}
const text = () => document.getElementById('root')!.textContent || '';
const button = (label: string) => [...document.querySelectorAll<HTMLButtonElement>('button')]
  .find(item => item.getClientRects().length && (item.textContent?.trim() === label || item.getAttribute('aria-label') === label));
async function click(label: string) {
  await until(() => Boolean(button(label)), `Missing button: ${label}`);
  button(label)!.click(); await delay();
}
async function fill(selector: string, value: string) {
  const input = document.querySelector<HTMLInputElement>(selector);
  assert(input, `Missing input: ${selector}`);
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, value);
  input.dispatchEvent(new Event('input', { bubbles: true })); await delay();
}
const submit = () => document.querySelector('form')!.requestSubmit();
async function backTo(hash: string) {
  history.back();
  await until(() => location.hash === hash, `Back did not reach ${hash}`);
  await delay(300);
}
function pass(message: string) { results.push(message); }

async function run() {
  assert(!isSupabaseConfigured, 'Run only on an isolated mock server. Real auth is configured.');
  await authClient.signOut();
  useAgroStore.getState().clearSession();
  // Keep navigation/UI under test, avoiding unrelated background repositories.
  useAgroStore.setState({
    isAdminUser: false, isHydrating: false,
    hydrateFromApi: async () => { useAgroStore.setState({ isHydrating: false }); },
    fetchOwnB2BProfiles: async () => {},
    fetchB2BOrders: async () => {}, fetchSupplierB2BOrders: async () => {},
  });
  history.replaceState(null, '', '#search');
  let root = createRoot(document.getElementById('root')!);
  root.render(<StrictMode><App /></StrictMode>);
  await until(() => Boolean(document.querySelector('input[placeholder^="Qidiruv:"]')), 'Search deep link rendered the wrong page');
  await click('Profil');
  await until(() => Boolean(document.querySelector('#auth-email')), 'Auth did not open');
  await backTo('#search');
  assert(!document.querySelector('#auth-email'), 'Browser Back left auth open');
  await click('Profil'); await click('Ortga');
  await until(() => !document.querySelector('#auth-email'), 'Visible Back left auth open');
  assert(location.hash === '#search', 'Auth Back discarded the originating page');
  pass('Guest auth: browser and visible Back restore the originating Search page');

  await click('Profil');
  submit(); await delay();
  assert(Boolean(document.querySelector('[role="alert"]')), 'Empty login did not show validation');
  await click("Ro'yxatdan o'tish");
  await fill('#auth-name', 'Regression Market');
  const email = `qa-${Date.now()}@example.test`;
  await fill('#auth-email', email); await fill('#auth-password', 'LocalTest2026!');
  await click("Parolni ko'rsatish");
  assert(document.querySelector<HTMLInputElement>('#auth-password')!.type === 'text', 'Show password failed');
  await click('Parolni yashirish');
  submit();
  await until(() => text().includes('Profilni tahrirlash'), 'Signup did not reach profile editor');
  assert(location.hash === '#profile/edit-profile', 'Signup URL is wrong');
  const account = useAgroStore.getState().currentUser!;
  assert(account.email === email, 'Wrong account after signup');
  pass('Registration validates fields, toggles password visibility, and opens the new profile');

  await fill('input[placeholder="anvar_agro"]', 'bad handle!'); submit(); await delay();
  assert(text().includes('Username 2'), 'Invalid handle was silently transformed');
  await fill('input[placeholder="anvar_agro"]', 'regression_market');
  await fill('input[placeholder="Masalan: Anvar Savdo"]', 'Updated Market');
  submit();
  await until(() => location.hash === '#profile' && text().includes('Updated Market'), 'Profile save failed');
  assert(useAgroStore.getState().currentUser?.name === 'Updated Market', 'Saved profile state is stale');
  await click('Qidiruv'); await delay(300); await click('Profil');
  await click('Tahrirlash'); await click('Orqaga');
  await until(() => location.hash === '#profile', 'Editor Back failed');
  await backTo('#search');
  assert(useAgroStore.getState().activeTab === 'search', 'Visible Back created a history loop');
  history.forward();
  await until(() => location.hash === '#profile', 'Forward failed');
  pass('Profile saves, rejects invalid usernames, and Back/Forward avoid edit-page loops');

  await click('Sozlamalar');
  await click("Akkauntni butunlay o'chirish");
  await until(() => Boolean(document.querySelector('[role="dialog"]')), 'Delete dialog did not open');
  assert(button("O'chirish")?.disabled, 'Delete is enabled without confirmation');
  await backTo('#profile/settings');
  await until(() => !document.querySelector('[role="dialog"]'), 'Back did not close the delete dialog');
  await click("Akkauntni butunlay o'chirish"); await click('Bekor qilish');
  await until(() => !document.querySelector('[role="dialog"]'), 'Cancel did not close dialog');
  await backTo('#profile');
  pass('Delete dialog requires confirmation; Back and Cancel consume their history entries');

  await click('Sozlamalar');
  const privacy = document.querySelector<HTMLAnchorElement>('a[href="#privacy-policy"]')!;
  privacy.click();
  await until(() => location.hash === '#privacy-policy', 'Privacy link failed');
  await backTo('#profile/settings');
  assert(text().includes('Sozlamalar'), 'Privacy Back did not restore Settings');
  // Simulate opening a notification/deep link from another tab.
  navigateAppRoute('/#market/cart'); await delay(300);
  navigateAppRoute('/#profile/orders'); await delay(300);
  await backTo('#market/cart');
  history.forward(); await until(() => useAgroStore.getState().activeSubView === 'orders', 'Forward lost profile subview');
  assert(useAgroStore.getState().activeTab === 'profile', 'Forward lost profile tab');
  pass('Privacy, B2B, profile orders, deep links and browser Forward restore complete routes');

  navigateAppRoute('/#home'); await delay(300);
  await click('Bildirishnomalar');
  await until(() => Boolean(document.querySelector('[role="dialog"]')), 'Notifications did not open');
  await click('Yopish'); await delay(300);
  assert(document.body.style.overflow !== 'hidden', 'Closing a sheet left body scrolling locked');
  pass('Notifications open/close and release the body scroll lock');

  // Late session/profile results must not resurrect the signed-out account.
  const restore = authClient.restoreSession;
  let finishRestore!: (user: AuthUser | null) => void;
  authClient.restoreSession = () => new Promise(resolve => { finishRestore = resolve; });
  const pending = useAgroStore.getState().restoreSession();
  localStorage.setItem('onbozor-create-post-draft', 'private draft');
  useAgroStore.getState().clearSession(); finishRestore(account); await pending;
  assert(!useAgroStore.getState().currentUser && !useAgroStore.getState().isAuthenticated, 'Late restore resurrected the old account');
  assert(!localStorage.getItem('onbozor-create-post-draft'), 'Logout retained the old account draft');
  authClient.restoreSession = async () => { throw new Error('offline'); };
  useAgroStore.setState({ isAuthLoading: true });
  await useAgroStore.getState().restoreSession();
  assert(!useAgroStore.getState().isAuthLoading, 'Failed restore left an infinite profile spinner');
  authClient.restoreSession = restore;
  pass('Logout removes drafts; stale or failed session requests cannot restore old identity or hang loading');
  root.unmount();

  // Controlled API errors exercise paths that do not occur in the demo backend.
  const signUp = authClient.signUp;
  const resend = authClient.resendConfirmationEmail;
  const google = authClient.signInWithProvider;
  const signIn = authClient.signIn;
  authClient.signUp = async () => ({ ok: true, requiresConfirmation: true });
  authClient.resendConfirmationEmail = async () => { throw new TypeError('Failed to fetch'); };
  let successCount = 0;
  root = createRoot(document.getElementById('root')!);
  root.render(<StrictMode><AuthView onSuccess={() => { successCount++; }} /></StrictMode>);
  await click("Ro'yxatdan o'tish");
  await fill('#auth-name', 'Confirmation Test'); await fill('#auth-email', 'confirm@example.test'); await fill('#auth-password', 'LocalTest2026!');
  submit(); await until(() => text().includes('Emailni tasdiqlang'), 'Confirmation state failed');
  await click('Xat kelmadimi? Qayta yuborish');
  await until(() => Boolean(document.querySelector('[role="alert"]')), 'Resend error is invisible');
  assert(!button('Xat kelmadimi? Qayta yuborish')?.disabled, 'Resend stayed permanently disabled');
  authClient.resendConfirmationEmail = async () => ({ ok: true, successMessage: 'Retry succeeded' });
  await click('Xat kelmadimi? Qayta yuborish');
  await until(() => text().includes('Retry succeeded'), 'Resend could not recover');
  pass('Email confirmation resend shows network errors and can recover on retry');

  await click('Tasdiqladim, kirish');
  authClient.signInWithProvider = async () => { throw new TypeError('Failed to fetch'); };
  await click('Google orqali kirish');
  await until(() => Boolean(document.querySelector('[role="alert"]')), 'Google error is invisible');
  assert(!button('Google orqali kirish')?.disabled, 'Google failure left loading stuck');
  let requests = 0;
  let finishLogin!: (value: AuthResult) => void;
  authClient.signIn = () => { requests++; return new Promise(resolve => { finishLogin = resolve; }); };
  submit(); submit(); await delay();
  assert(requests === 1, 'Double submission made multiple auth requests');
  assert(button("Ro'yxatdan o'tish")?.disabled, 'Mode can change while request is pending');
  root.unmount(); finishLogin({ ok: true, user: account }); await delay();
  assert(successCount === 0, 'An abandoned login redirected after Back/unmount');
  pass('Google failure resets loading; duplicate submissions and late login redirects are prevented');
  authClient.signUp = signUp; authClient.resendConfirmationEmail = resend;
  authClient.signInWithProvider = google; authClient.signIn = signIn;
  await authClient.deleteAccount(); // Deletes only the locally generated demo user.
}

run().then(() => {
  document.getElementById('results')!.textContent = `PASS\n${results.join('\n')}`;
  document.documentElement.dataset.testResult = 'pass';
}).catch(error => {
  document.getElementById('results')!.textContent = `FAIL: ${error.message}\n${results.join('\n')}`;
  document.documentElement.dataset.testResult = 'fail';
  console.error(error);
});
