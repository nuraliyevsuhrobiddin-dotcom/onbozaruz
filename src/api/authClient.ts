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

export const supabaseClient = isSupabaseConfigured
  ? createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!, {
      auth: {
        flowType: 'pkce',
        detectSessionInUrl: true,
        persistSession: true,
        autoRefreshToken: true,
      },
    })
  : null;

const supabase = supabaseClient;

const PRODUCTION_AUTH_CALLBACK_URL = 'https://www.onbozar.uz/auth/callback';

export function getAuthCallbackUrl(): string {
  if (typeof window === 'undefined') return PRODUCTION_AUTH_CALLBACK_URL;
  return `${window.location.origin}/auth/callback`;
}

export function translateAuthError(message: string): string {
  if (!message) return "Xatolik yuz berdi. Qayta urinib ko'ring.";
  const lower = message.toLowerCase();

  if (lower.includes('email not confirmed')) {
    return "Emailingiz hali tasdiqlanmagan. Iltimos, pochtangizga yuborilgan tasdiqlash havolasini bosing.";
  }
  if (lower.includes('invalid login credentials') || lower.includes('invalid_credentials')) {
    return "Email manzil yoki parol noto'g'ri. Qayta tekshirib kiriting.";
  }
  if (
    lower.includes('already registered') ||
    lower.includes('already exists') ||
    lower.includes('user_already_exists')
  ) {
    return "Ushbu email bilan allaqachon ro'yxatdan o'tilgan. Iltimos, tizimga kiring.";
  }
  if (
    lower.includes('rate limit') ||
    lower.includes('over_email_send_rate_limit') ||
    lower.includes('too many requests')
  ) {
    return "Email yuborish limiti oshib ketdi. Bir ozdan keyin qayta urinib ko'ring yoki kiring.";
  }
  if (
    lower.includes('token has expired') ||
    lower.includes('invalid flow state') ||
    lower.includes('pkce') ||
    lower.includes('code_verifier')
  ) {
    return "Tasdiqlash havolasi muddati tugagan yoki yaroqsiz. Qayta xat yuborish tugmasini bosing.";
  }
  if (lower.includes('password should be at least')) {
    return "Parol kamida 6 ta belgidan iborat bo'lishi kerak.";
  }

  return message;
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

  // Check if session is already active
  const initialSession = await supabase.auth.getSession();
  if (initialSession.data.session) return;

  const code = new URLSearchParams(window.location.search).get('code');
  if (code) {
    try {
      const exchange = await supabase.auth.exchangeCodeForSession(code);
      if (exchange.error) {
        // Re-check session in case auto-exchange in onAuthStateChange succeeded
        const recheck = await supabase.auth.getSession();
        if (recheck.data.session) return;
        throw new Error(translateAuthError(exchange.error.message));
      }
    } catch (error: unknown) {
      const recheck = await supabase.auth.getSession();
      if (recheck.data.session) return;
      const msg = error instanceof Error ? error.message : 'Tasdiqlash kodi yaroqsiz';
      throw new Error(translateAuthError(msg));
    }
  }

  const { data, error } = await supabase.auth.getSession();
  if (error) throw new Error(translateAuthError(error.message));
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
  if (!input) return '';
  if (typeof input === 'string' && (input.startsWith('http://') || input.startsWith('https://') || input.startsWith('data:'))) {
    return input;
  }

  let fileOrBlob: Blob;
  try {
    if (typeof input === 'string') {
      const response = await fetch(input);
      fileOrBlob = await response.blob();
    } else {
      fileOrBlob = input;
    }
  } catch (error: unknown) {
    console.warn('[uploadListingMedia] Error loading media:', error);
    // Error handled - return input as fallback
    return typeof input === 'string' ? input : '';
  }

  if (supabase) {
    try {
      const { error } = await supabase.storage.from('listing-media').upload(path, fileOrBlob, {
        contentType,
        upsert: true,
        cacheControl: '31536000',
      });

      if (!error) {
        return supabase.storage.from('listing-media').getPublicUrl(path).data.publicUrl;
      }
      console.warn('[uploadListingMedia] Supabase Storage upload warning:', error.message);
    } catch (err) {
      console.warn('[uploadListingMedia] Storage upload exception:', err);
    }
  }

  // Fallback: If Supabase Storage upload fails or is not available, convert image to Data URL if small, or create Object URL
  try {
    if (fileOrBlob.size < 3 * 1024 * 1024) {
      return await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = () => resolve(typeof input === 'string' ? input : URL.createObjectURL(fileOrBlob));
        reader.readAsDataURL(fileOrBlob);
      });
    }
  } catch {
    // Ignore fallback conversion failure
  }

  return typeof input === 'string' ? input : URL.createObjectURL(fileOrBlob);
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
  input: string | File,
  userId: string,
  target: 'avatar' | 'cover'
): Promise<string> {
  if (!input) return '';

  let fileOrBlob: Blob;
  let extension = 'jpg';
  let contentType = 'image/jpeg';

  if (typeof input === 'string') {
    if (input.startsWith('http://') || input.startsWith('https://')) {
      return input;
    }
    const response = await fetch(input);
    fileOrBlob = await response.blob();
    contentType = fileOrBlob.type || 'image/jpeg';
    if (contentType.includes('png')) extension = 'png';
    else if (contentType.includes('webp')) extension = 'webp';
  } else {
    fileOrBlob = input;
    contentType = input.type || 'image/jpeg';
    const fileExt = input.name.split('.').pop()?.toLowerCase();
    if (fileExt && ['jpg', 'jpeg', 'png', 'webp'].includes(fileExt)) {
      extension = fileExt;
    } else if (contentType.includes('png')) extension = 'png';
    else if (contentType.includes('webp')) extension = 'webp';
  }

  const path = `${userId}/profile-${target}-${Date.now()}.${extension}`;
  return uploadListingMedia(fileOrBlob, path, contentType);
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
  status?: 'active' | 'banned';
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
  successMessage?: string;
  requiresConfirmation?: boolean;
}

export type OAuthProvider = 'google' | 'oneid';

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
  const key = (fields.email || fields.phone).toLowerCase().trim();

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

async function supabaseSignInWithProvider(provider: OAuthProvider): Promise<AuthResult> {
  if (!supabase) return { ok: false, error: 'Ijtimoiy kirish hozircha sozlanmagan.' };
  if (provider === 'oneid') {
    return { ok: false, error: 'OneID integratsiyasi hali ulanmagan. Email yoki telefon orqali kiring.' };
  }

  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: getAuthCallbackUrl() },
  });
  return error
    ? { ok: false, error: translateAuthError(error.message) }
    : { ok: true, successMessage: 'Google oynasi ochilmoqda...' };
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

  // If profile is missing in DB (e.g. trigger failed or unconfirmed user logged in), auto-create
  if (!profile) {
    try {
      const cleanHandle = meta?.handle || (user.email || '').split('@')[0];
      await supabase.from('profiles').upsert({
        id: user.id,
        email: user.email || '',
        name: meta?.name || (user.email || '').split('@')[0],
        handle: cleanHandle,
        phone: meta?.phone || '',
        location: meta?.location || '',
        business_name: meta?.businessName || '',
        role: meta?.role || 'seller',
        updated_at: new Date().toISOString(),
      });
    } catch {
      // Ignore fallback insert error
    }
  }

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
    isAdmin: profile?.is_admin ?? (user.email?.toLowerCase().trim() === 'nuraliyevsuhrobiddin@gmail.com'),
    status: (profile?.status as 'active' | 'banned') || 'active',
  };
}

async function supabaseUpdateUser(fields: Partial<AuthUser>): Promise<AuthUser | null> {
  if (!supabase) return null;
  const { data: sessionData, error: sessionError } = await supabase.auth.getUser();
  if (sessionError || !sessionData.user) {
    throw new Error('Sessiya topilmadi. Qaytadan kiring.');
  }

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
      updated_at: new Date().toISOString(),
    }).filter(([, value]) => value !== undefined)
  );

  const { data, error } = await supabase
    .from('profiles')
    .upsert({ id: userId, email: sessionData.user.email || fields.email || '', ...profileUpdate })
    .select()
    .single();

  if (error || !data) {
    throw new Error(error?.message || "Profil ma'lumotlarini saqlashda server xatoligi yuz berdi");
  }

  return {
    id: data.id,
    email: data.email || sessionData.user.email || '',
    name: data.name || '',
    handle: data.handle || '',
    phone: data.phone || '',
    location: data.location || '',
    businessName: data.business_name || '',
    bio: data.bio || '',
    role: (data.role as 'seller' | 'buyer') || 'seller',
    avatar: data.avatar_url || '',
    cover: data.cover_url || '',
    createdAt: data.created_at || new Date().toISOString(),
    isAdmin: Boolean(data.is_admin),
    status: (data.status as 'active' | 'banned') || 'active',
  };
}

// ---------- Supabase Auth (real backend) ----------
async function supabaseSignUp(fields: SignUpFields): Promise<AuthResult> {
  try {
    if (!supabase) return { ok: false, error: 'Supabase sozlanmagan' };

    const cleanEmail = fields.email.trim().toLowerCase();
    const cleanHandle = fields.handle
      .trim()
      .toLowerCase()
      .replace(/^@/, '')
      .replace(/[^a-z0-9_]/g, '') || `user_${Date.now().toString().slice(-5)}`;

    const contact = cleanEmail.includes('@')
      ? { email: cleanEmail }
      : { phone: cleanEmail };
    const { data, error } = await supabase.auth.signUp({
      ...contact,
      password: fields.password,
      options: {
        emailRedirectTo: getAuthCallbackUrl(),
        data: {
          name: fields.name.trim(),
          handle: cleanHandle,
          phone: fields.phone.trim() || (cleanEmail.includes('@') ? '' : cleanEmail),
          location: fields.location || '',
          businessName: fields.businessName || '',
          role: fields.role || 'seller',
        },
      },
    });

    if (error) {
      return { ok: false, error: translateAuthError(error.message) };
    }
    if (!data.user) return { ok: false, error: 'Foydalanuvchi yaratilmadi.' };

    // Check if account already exists (Supabase returns empty identities array in that case)
    if (Array.isArray(data.user.identities) && data.user.identities.length === 0) {
      return {
        ok: false,
        error: "Ushbu email bilan allaqachon ro'yxatdan o'tilgan. Iltimos, tizimga kiring.",
      };
    }

    // Update profile table directly if session is created immediately
    if (data.session) {
      try {
        await supabase.from('profiles').upsert({
          id: data.user.id,
          email: data.user.email || cleanEmail,
          name: fields.name.trim(),
          handle: cleanHandle,
          phone: fields.phone.trim(),
          location: fields.location || '',
          business_name: fields.businessName || '',
          role: fields.role || 'seller',
          updated_at: new Date().toISOString(),
        });
      } catch {
        // Fallback to trigger
      }

      const user: AuthUser = {
        id: data.user.id,
        email: data.user.email || cleanEmail,
        name: fields.name.trim(),
        handle: cleanHandle,
        phone: fields.phone.trim(),
        location: fields.location || '',
        businessName: fields.businessName || '',
        role: fields.role || 'seller',
        createdAt: data.user.created_at,
      };
      return { ok: true, user };
    }

    // Confirmation email sent case
    return {
      ok: true,
      requiresConfirmation: true,
      successMessage: "Ro'yxatdan o'tish muvaffaqiyatli! Emailingizga tasdiqlash havolasi yuborildi.",
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Supabase ulanishda xatolik yuz berdi';
    return { ok: false, error: translateAuthError(message) };
  }
}

async function supabaseSignIn(email: string, password: string): Promise<AuthResult> {
  try {
    if (!supabase) return { ok: false, error: 'Supabase sozlanmagan' };

    const cleanIdentifier = email.trim().toLowerCase();
    const credentials = cleanIdentifier.includes('@')
      ? { email: cleanIdentifier, password }
      : { phone: cleanIdentifier, password };
    const { data, error } = await supabase.auth.signInWithPassword(credentials);

    if (error) return { ok: false, error: translateAuthError(error.message) };
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
    return { ok: false, error: translateAuthError(message) };
  }
}

async function supabaseResendConfirmation(email: string): Promise<AuthResult> {
  try {
    if (!supabase) return { ok: false, error: 'Supabase sozlanmagan' };

    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: email.trim().toLowerCase(),
      options: {
        emailRedirectTo: getAuthCallbackUrl(),
      },
    });

    if (error) return { ok: false, error: translateAuthError(error.message) };

    return {
      ok: true,
      successMessage: "Tasdiqlash havolasi emailingizga qayta yuborildi! Pochtani va Spam papkasini tekshiring.",
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Supabase ulanishda xatolik yuz berdi';
    return { ok: false, error: translateAuthError(message) };
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

  async signInWithProvider(provider: OAuthProvider): Promise<AuthResult> {
    if (isSupabaseConfigured) return supabaseSignInWithProvider(provider);
    return provider === 'oneid'
      ? { ok: false, error: 'OneID integratsiyasi hali ulanmagan.' }
      : { ok: false, error: 'Google kirishi demo rejimida mavjud emas. Email yoki telefon orqali kiring.' };
  },

  async resendConfirmationEmail(email: string): Promise<AuthResult> {
    if (isSupabaseConfigured) return supabaseResendConfirmation(email);
    return { ok: true, successMessage: "Mock rejimida email tasdiqlash talab etilmaydi." };
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
