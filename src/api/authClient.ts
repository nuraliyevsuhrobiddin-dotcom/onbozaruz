/**
 * OnBozor Auth Client
 *
 * Supabase URL va ANON KEY bo'lsa — Supabase Auth ishlatiladi.
 * Bo'lmasa — localStorage asosidagi mock auth ishlatiladi.
 * Bu tuzilma real backendga o'tishni eng oson qiladi.
 */

import { createClient, type AuthChangeEvent, type Session } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const isSupabaseConfigured =
  !!SUPABASE_URL &&
  !!SUPABASE_ANON_KEY &&
  !SUPABASE_URL.includes('your-project-id') &&
  !SUPABASE_ANON_KEY.includes('your-supabase-anon-key');

const supabase = isSupabaseConfigured
  ? createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!, {
      auth: {
        flowType: 'pkce',
        detectSessionInUrl: true,
        persistSession: true,
        autoRefreshToken: true,
      },
    })
  : null;

const PRODUCTION_AUTH_CALLBACK_URL = 'https://onbozaruz.vercel.app/auth/callback';

export function getAuthCallbackUrl(): string {
  if (typeof window === 'undefined') return PRODUCTION_AUTH_CALLBACK_URL;

  const isLocalhost = ['localhost', '127.0.0.1'].includes(window.location.hostname);
  return isLocalhost
    ? `${window.location.origin}/auth/callback`
    : PRODUCTION_AUTH_CALLBACK_URL;
}

export function subscribeToAuthState(
  callback: (event: AuthChangeEvent, session: Session | null) => void
): (() => void) {
  if (!supabase) return () => undefined;

  const { data } = supabase.auth.onAuthStateChange(callback);
  return () => data.subscription.unsubscribe();
}

export async function completeAuthCallback(): Promise<void> {
  if (!supabase) throw new Error('Supabase sozlanmagan');

  const existingSession = await supabase.auth.getSession();
  if (existingSession.error) throw existingSession.error;
  // React StrictMode can run the callback effect twice in development. If the
  // first pass already redeemed the one-time PKCE code, keep the session.
  if (existingSession.data.session) return;

  const code = new URLSearchParams(window.location.search).get('code');
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) throw error;
  }

  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  if (!data.session) {
    throw new Error('Tasdiqlash sessiyasi topilmadi. Havola muddati tugagan bo\'lishi mumkin.');
  }
}

export async function getSupabaseAccessToken(): Promise<string | null> {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token || null;
}

export async function uploadListingMedia(
  input: string | File | Blob,
  path: string,
  contentType: string
): Promise<string> {
  if (!input || !supabase) {
    return typeof input === 'string' ? input : '';
  }

  let fileOrBlob: Blob;
  if (typeof input === 'string') {
    if (input.startsWith('http://') || input.startsWith('https://')) {
      return input;
    }
    const response = await fetch(input);
    fileOrBlob = await response.blob();
  } else {
    fileOrBlob = input;
  }

  const { error } = await supabase.storage.from('listing-media').upload(path, fileOrBlob, {
    contentType,
    upsert: true,
    cacheControl: '31536000',
  });

  if (error) {
    throw new Error(
      `Media yuklanmadi: ${error.message}. Supabase Storage fayl hajmi va ruxsatlarini tekshiring.`
    );
  }

  return supabase.storage.from('listing-media').getPublicUrl(path).data.publicUrl;
}

export async function deleteListingMedia(urlOrPath: string): Promise<void> {
  if (!urlOrPath || !supabase) return;
  try {
    let storagePath = urlOrPath;
    if (urlOrPath.includes('/listing-media/')) {
      storagePath = urlOrPath.split('/listing-media/')[1] || '';
    }
    if (storagePath && !storagePath.startsWith('http')) {
      await supabase.storage.from('listing-media').remove([storagePath]);
    }
  } catch {
    // Ignore storage deletion error if file does not exist.
  }
}

export async function uploadProfileMedia(
  dataUrl: string | File,
  userId: string,
  target: 'avatar' | 'cover'
): Promise<string> {
  return uploadListingMedia(
    dataUrl,
    `${userId}/profile-${target}-${Date.now()}.jpg`,
    'image/jpeg'
  );
}

export async function incrementPostViewsOnServer(postId: string): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase.rpc('increment_post_views', { p_post_id: postId });
  if (error) throw new Error(`Ko'rishlar soni saqlanmadi: ${error.message}`);
}

// ---------- Types ----------
export interface AuthUser {
  id: string;
  email: string;
  name: string;
  handle: string;
  phone: string;
  location?: string;
  businessName?: string;
  bio?: string;
  role?: 'seller' | 'buyer';
  avatar?: string;
  cover?: string;
  createdAt: string;
  isAdmin?: boolean;
}

export interface SignUpFields {
  email: string;
  password: string;
  name: string;
  handle: string;
  phone: string;
  location?: string;
  businessName?: string;
  role?: 'seller' | 'buyer';
}

export interface AuthResult {
  ok: boolean;
  user?: AuthUser;
  error?: string;
}

// ---------- Mock Auth (localStorage) ----------
const MOCK_USERS_KEY = 'onbozor-auth-users';
const MOCK_SESSION_KEY = 'onbozor-auth-session';

function getMockUsers(): Record<string, { password: string; user: AuthUser }> {
  try {
    return JSON.parse(localStorage.getItem(MOCK_USERS_KEY) || '{}');
  } catch {
    return {};
  }
}

function saveMockUsers(users: Record<string, { password: string; user: AuthUser }>) {
  localStorage.setItem(MOCK_USERS_KEY, JSON.stringify(users));
}

function getMockSession(): AuthUser | null {
  try {
    return JSON.parse(localStorage.getItem(MOCK_SESSION_KEY) || 'null');
  } catch {
    return null;
  }
}

function saveMockSession(user: AuthUser | null) {
  if (user) {
    localStorage.setItem(MOCK_SESSION_KEY, JSON.stringify(user));
  } else {
    localStorage.removeItem(MOCK_SESSION_KEY);
  }
}

// ---------- Mock Auth Implementation ----------
async function mockSignUp(fields: SignUpFields): Promise<AuthResult> {
  await new Promise((r) => setTimeout(r, 600)); // simulate network
  const users = getMockUsers();
  const key = fields.email.toLowerCase().trim();

  if (users[key]) {
    return { ok: false, error: 'Bu email bilan ro\'yxatdan o\'tilgan. Iltimos kiring.' };
  }

  const cleanHandle = fields.handle
    .trim()
    .toLowerCase()
    .replace(/^@/, '')
    .replace(/[^a-z0-9_]/g, '') || `user_${Date.now().toString().slice(-5)}`;

  const user: AuthUser = {
    id: `user-${Date.now()}`,
    email: key,
    name: fields.name.trim(),
    handle: cleanHandle,
    phone: fields.phone.trim(),
    location: fields.location || '',
    businessName: fields.businessName || '',
    role: fields.role || 'seller',
    bio: fields.businessName ? `${fields.businessName} rasmiy va tasdiqlangan agro sahifasi` : '',
    createdAt: new Date().toISOString(),
  };

  users[key] = { password: fields.password, user };
  saveMockUsers(users);
  saveMockSession(user);

  return { ok: true, user };
}

async function mockSignIn(email: string, password: string): Promise<AuthResult> {
  await new Promise((r) => setTimeout(r, 600)); // simulate network
  const users = getMockUsers();
  const key = email.toLowerCase().trim();
  const record = users[key];

  if (!record) {
    return { ok: false, error: 'Bu email topilmadi. Iltimos ro\'yxatdan o\'ting.' };
  }
  if (record.password !== password) {
    return { ok: false, error: 'Parol noto\'g\'ri. Qayta urinib ko\'ring.' };
  }

  saveMockSession(record.user);
  return { ok: true, user: record.user };
}

async function mockSignOut(): Promise<void> {
  await new Promise((r) => setTimeout(r, 200));
  saveMockSession(null);
}

function mockGetCurrentUser(): AuthUser | null {
  return getMockSession();
}

async function supabaseRestoreSession(): Promise<AuthUser | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;

  const user = data.user;
  const meta = user.user_metadata as Record<string, string> | undefined;
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();

  return {
    id: user.id,
    email: user.email || '',
    name: profile?.name || meta?.name || '',
    handle: profile?.handle || meta?.handle || (user.email || '').split('@')[0],
    phone: profile?.phone || meta?.phone || '',
    location: profile?.location || meta?.location || '',
    businessName: profile?.business_name || meta?.businessName || '',
    bio: profile?.bio || '',
    avatar: profile?.avatar_url || '',
    cover: profile?.cover_url || '',
    role: (profile?.role as 'seller' | 'buyer') || (meta?.role as 'seller' | 'buyer') || 'seller',
    createdAt: user.created_at || new Date().toISOString(),
  };
}

async function supabaseUpdateUser(fields: Partial<AuthUser>): Promise<AuthUser | null> {
  if (!supabase) return null;
  const { data: sessionData, error: sessionError } = await supabase.auth.getUser();
  if (sessionError || !sessionData.user) return null;

  const userId = sessionData.user.id;
  const profileUpdate = Object.fromEntries(
    Object.entries({
      email: fields.email,
      name: fields.name,
      handle: fields.handle,
      phone: fields.phone,
      location: fields.location,
      business_name: fields.businessName,
      bio: fields.bio,
      role: fields.role,
      avatar_url: fields.avatar,
      cover_url: fields.cover,
    }).filter(([, value]) => value !== undefined)
  );

  const { data, error } = await supabase
    .from('profiles')
    .update(profileUpdate)
    .eq('id', userId)
    .select()
    .single();

  if (error || !data) return null;

  return {
    id: data.id,
    email: data.email,
    name: data.name || '',
    handle: data.handle || '',
    phone: data.phone || '',
    location: data.location || '',
    businessName: data.business_name || '',
    bio: data.bio || '',
    role: (data.role as 'seller' | 'buyer') || 'seller',
    avatar: data.avatar_url || '',
    cover: data.cover_url || '',
    createdAt: data.created_at,
  };
}

// ---------- Supabase Auth (real backend) ----------
async function supabaseSignUp(fields: SignUpFields): Promise<AuthResult> {
  try {
    if (!supabase) return { ok: false, error: 'Supabase sozlanmagan' };

    const { data, error } = await supabase.auth.signUp({
      email: fields.email,
      password: fields.password,
      options: {
        emailRedirectTo: getAuthCallbackUrl(),
        data: {
          name: fields.name,
          handle: fields.handle,
          phone: fields.phone,
          location: fields.location,
          businessName: fields.businessName,
          role: fields.role,
        },
      },
    });

    if (error) {
      const normalized = error.message.toLowerCase().includes('rate limit')
        ? "Email yuborish limiti tugagan. Bir ozdan keyin qayta urinib ko'ring yoki Supabase Auth sozlamalarida SMTP ulang."
        : error.message;
      return { ok: false, error: normalized };
    }
    if (!data.user) return { ok: false, error: 'Foydalanuvchi yaratilmadi.' };

    if (!data.session) {
      return {
        ok: false,
        error: "Ro'yxatdan o'tish muvaffaqiyatli. Emailingizga yuborilgan tasdiqlash havolasini bosing, keyin kiring.",
      };
    }

    const user: AuthUser = {
      id: data.user.id,
      email: data.user.email || fields.email,
      name: fields.name.trim(),
      handle: fields.handle || fields.email.split('@')[0],
      phone: fields.phone.trim(),
      location: fields.location || '',
      businessName: fields.businessName || '',
      role: fields.role || 'seller',
      createdAt: data.user.created_at,
    };
    return { ok: true, user };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Supabase ulanishda xatolik yuz berdi';
    return { ok: false, error: message };
  }
}

async function supabaseSignIn(email: string, password: string): Promise<AuthResult> {
  try {
    if (!supabase) return { ok: false, error: 'Supabase sozlanmagan' };

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) return { ok: false, error: error.message };
    if (!data.user) return { ok: false, error: 'Kirish muvaffaqiyatsiz.' };

    const meta = data.user.user_metadata as Record<string, string> | undefined;
    const user: AuthUser = {
      id: data.user.id,
      email: data.user.email || email,
      name: meta?.name || '',
      handle: meta?.handle || (data.user.email || email).split('@')[0],
      phone: meta?.phone || '',
      location: meta?.location || '',
      businessName: meta?.businessName || '',
      role: (meta?.role as 'seller' | 'buyer') || 'seller',
      createdAt: data.user.created_at,
    };
    return { ok: true, user };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Supabase ulanishda xatolik yuz berdi';
    return { ok: false, error: message };
  }
}

async function supabaseSignOut(): Promise<void> {
  try {
    if (supabase) {
      await supabase.auth.signOut();
    }
  } catch {
    // Ignore signout errors
  }
}


// ---------- Unified Auth API ----------
export const authClient = {
  async signUp(fields: SignUpFields): Promise<AuthResult> {
    if (isSupabaseConfigured) return supabaseSignUp(fields);
    return mockSignUp(fields);
  },

  async signIn(email: string, password: string): Promise<AuthResult> {
    if (isSupabaseConfigured) return supabaseSignIn(email, password);
    return mockSignIn(email, password);
  },

  async signOut(): Promise<void> {
    if (isSupabaseConfigured) return supabaseSignOut();
    return mockSignOut();
  },

  async restoreSession(): Promise<AuthUser | null> {
    if (isSupabaseConfigured) return supabaseRestoreSession();
    return mockGetCurrentUser();
  },

  async updateUser(fields: Partial<AuthUser>): Promise<AuthUser | null> {
    if (isSupabaseConfigured) {
      return supabaseUpdateUser(fields);
    }

    const current = getMockSession();
    if (!current) return null;
    const updated: AuthUser = { ...current, ...fields };
    saveMockSession(updated);

    const users = getMockUsers();
    const key = updated.email.toLowerCase().trim();
    if (users[key]) {
      users[key].user = updated;
      saveMockUsers(users);
    }
    return updated;
  },

  getCurrentUser(): AuthUser | null {
    if (isSupabaseConfigured) return null; // Supabase session async — store'dan o'qiladi
    return mockGetCurrentUser();
  },
};
