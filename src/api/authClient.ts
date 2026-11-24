/**
 * MollBazar API client: authentication, sessions and media uploads.
 *
 * The backend is this site's own PHP API on Ahost (public/api). It speaks the
 * Supabase wire protocol, so the supabase-js client is used as the HTTP client.
 */

import { createClient, type AuthChangeEvent, type Session } from '@supabase/supabase-js';
import * as tus from 'tus-js-client';
import { processAndCompressImage } from '../utils/avatarUtils';

/** A relative API path (the default, `/api`) always targets the current origin. */
function resolveApiUrl(raw: string): string {
  const value = raw.trim().replace(/\/$/, '');
  if (!value.startsWith('/')) return value;
  return typeof window !== 'undefined' ? `${window.location.origin}${value}` : `https://mollbazar.uz${value}`;
}

export const API_URL = resolveApiUrl(import.meta.env.VITE_API_URL || '/api');
/** Public, non-secret identifier sent as `apikey`; the PHP API treats it as "anonymous". */
export const API_PUBLIC_KEY = import.meta.env.VITE_API_PUBLIC_KEY || 'mollbazar-public-anon-key';

export const apiClient = createClient(API_URL, API_PUBLIC_KEY, {
  auth: {
    flowType: 'pkce',
    detectSessionInUrl: true,
    persistSession: true,
    autoRefreshToken: true,
  },
});

// Shared hosting caps a single PHP upload at 2 MB, so anything larger goes
// through resumable (tus) uploads. Chunks are sent with PATCH, which PHP's
// upload limits do not apply to; the host's firewall (ModSecurity) does reject
// raw request bodies above ~1-4 MB, so chunks stay at 1 MB (measured on Ahost).
const RESUMABLE_UPLOAD_THRESHOLD_BYTES = 1.5 * 1024 * 1024;
const RESUMABLE_CHUNK_BYTES = 1024 * 1024;

const PRODUCTION_AUTH_CALLBACK_URL = 'https://mollbazar.uz/auth/callback';

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
  if (lower.includes('email link is invalid') || lower.includes('otp_expired') || lower.includes('has expired')) {
    return "Havola eskirgan yoki allaqachon ishlatilgan. Yangi havola so'rang.";
  }
  if (lower.includes('should be different') || lower.includes('same_password')) {
    return 'Yangi parol eski paroldan farq qilishi kerak.';
  }
  if (lower.includes('password should be at least') || lower.includes('password is too short')) {
    return "Parol kamida 6 ta belgidan iborat bo'lishi kerak.";
  }
  if (lower.includes('signups not allowed') || lower.includes('signup_disabled')) {
    return "Hozircha yangi ro'yxatdan o'tish vaqtincha yopiq. Birozdan so'ng qayta urinib ko'ring.";
  }
  if (lower.includes('email') && lower.includes('invalid')) {
    return "Email manzil noto'g'ri formatda kiritilgan.";
  }
  if (lower.includes('weak password') || lower.includes('password_too_weak')) {
    return "Parol juda zaif. Harf, raqam va belgilardan foydalaning.";
  }
  if (lower.includes('network') || lower.includes('fetch') || lower.includes('failed to fetch')) {
    return "Internet aloqasi yo'q yoki server bilan bog'lanib bo'lmadi.";
  }
  if (lower.includes('database error') || lower.includes('db error') || lower.includes('duplicate key')) {
    return "Server xatoligi. Bu handle yoki email allaqachon band bo'lishi mumkin. Boshqa ma'lumot kiriting.";
  }

  return message;
}

export function subscribeToAuthState(
  callback: (event: AuthChangeEvent, session: Session | null) => void
): (() => void) {
  const { data } = apiClient.auth.onAuthStateChange(callback);
  return () => data.subscription.unsubscribe();
}

export async function completeAuthCallback(): Promise<void> {
  // Check if session is already active
  const initialSession = await apiClient.auth.getSession();
  if (initialSession.data.session) return;

  // ── Strategy 1: PKCE code exchange (?code=xxx) ──
  const code = new URLSearchParams(window.location.search).get('code');
  if (code) {
    try {
      const exchange = await apiClient.auth.exchangeCodeForSession(code);
      if (exchange.error) {
        // Re-check session in case auto-exchange in onAuthStateChange succeeded
        const recheck = await apiClient.auth.getSession();
        if (recheck.data.session) return;
        throw new Error(translateAuthError(exchange.error.message));
      }
      return; // Success via PKCE
    } catch (error: unknown) {
      const recheck = await apiClient.auth.getSession();
      if (recheck.data.session) return;
      const msg = error instanceof Error ? error.message : 'Tasdiqlash kodi yaroqsiz';
      throw new Error(translateAuthError(msg));
    }
  }

  // ── Strategy 2: Implicit grant hash fragment (#access_token=xxx) ──
  // Google OAuth sometimes returns tokens in the URL hash instead of query params
  const hashParams = new URLSearchParams(window.location.hash.replace('#', ''));
  const accessToken = hashParams.get('access_token');
  const refreshToken = hashParams.get('refresh_token');
  if (accessToken) {
    try {
      const { error: setErr } = await apiClient.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken || '',
      });
      if (setErr) {
        const recheck = await apiClient.auth.getSession();
        if (recheck.data.session) return;
        throw new Error(translateAuthError(setErr.message));
      }
      // Clear hash to avoid re-processing on page reload
      if (window.history.replaceState) {
        window.history.replaceState(null, '', window.location.pathname + window.location.search);
      }
      return; // Success via implicit flow
    } catch (error: unknown) {
      const recheck = await apiClient.auth.getSession();
      if (recheck.data.session) return;
      const msg = error instanceof Error ? error.message : 'Token yaroqsiz';
      throw new Error(translateAuthError(msg));
    }
  }

  // ── Final fallback: check if onAuthStateChange auto-populated the session ──
  const { data, error } = await apiClient.auth.getSession();
  if (error) throw new Error(translateAuthError(error.message));
  if (!data.session) {
    throw new Error('Tasdiqlash sessiyasi topilmadi. Havola muddati tugagan bo\'lishi mumkin.');
  }
}

export async function getAccessToken(): Promise<string | null> {
  const { data } = await apiClient.auth.getSession();
  return data.session?.access_token || null;
}

async function uploadResumableListingMedia(
  file: Blob,
  path: string,
  contentType: string,
  onProgress?: (share: number) => void
): Promise<string> {
  const { data, error } = await apiClient.auth.getSession();
  if (error || !data.session?.access_token) {
    throw new Error("Video yuklash uchun sessiya topilmadi. Qaytadan tizimga kiring.");
  }

  return new Promise<string>((resolve, reject) => {
    const upload = new tus.Upload(file, {
      endpoint: `${API_URL}/storage/v1/upload/resumable`,
      retryDelays: [0, 1_000, 3_000, 5_000, 10_000],
      chunkSize: RESUMABLE_CHUNK_BYTES,
      // Keep the creation POST empty: POST bodies are subject to post_max_size.
      uploadDataDuringCreation: false,
      removeFingerprintOnSuccess: true,
      headers: {
        authorization: `Bearer ${data.session.access_token}`,
        apikey: API_PUBLIC_KEY,
        'x-upsert': 'false',
      },
      metadata: {
        bucketName: 'listing-media',
        objectName: path,
        contentType,
        cacheControl: '31536000',
      },
      onError: (error) => reject(error),
      onProgress: (sent, total) => {
        if (total > 0) onProgress?.(sent / total);
      },
      onSuccess: () => {
        resolve(apiClient.storage.from('listing-media').getPublicUrl(path).data.publicUrl);
      },
    });

    upload.start();
  });
}

export async function uploadListingMedia(
  input: string | File | Blob,
  path: string,
  contentType: string,
  onProgress?: (share: number) => void
): Promise<string> {
  if (!input) return '';
  if (typeof input === 'string' && (input.startsWith('http://') || input.startsWith('https://'))) {
    return input;
  }

  let fileOrBlob: Blob;
  try {
    fileOrBlob = typeof input === 'string' ? await (await fetch(input)).blob() : input;
  } catch {
    // Never save a local blob:/data: address as the listing's media URL.
    throw new Error("Faylni o'qib bo'lmadi. Uni qaytadan tanlang.");
  }

  let storageError = '';
  try {
    if (fileOrBlob.size > RESUMABLE_UPLOAD_THRESHOLD_BYTES) {
      return await uploadResumableListingMedia(fileOrBlob, path, contentType, onProgress);
    }
    // A named multipart field: PHP ignores file parts whose field name is empty.
    const body = new FormData();
    body.append('file', fileOrBlob, path.split('/').pop() || 'media');
    const { error } = await apiClient.storage.from('listing-media').upload(path, body, {
      contentType,
      // Every caller supplies a new path. Disabling upsert means a normal upload
      // only needs INSERT permission and can never replace someone else's file.
      upsert: false,
      cacheControl: '31536000',
    });
    if (!error) {
      return apiClient.storage.from('listing-media').getPublicUrl(path).data.publicUrl;
    }
    storageError = error.message;
  } catch (err) {
    storageError = err instanceof Error ? err.message : "Server bilan bog'lanib bo'lmadi";
  }

  const normalizedError = storageError.toLowerCase();
  if (normalizedError.includes('maximum allowed size') || normalizedError.includes('file size')) {
    throw new Error("Fayl hajmi 100 MB chegarasidan katta. Kichikroq video tanlang.");
  }
  if (normalizedError.includes('mime') || normalizedError.includes('content type')) {
    throw new Error("Bu fayl formati qabul qilinmadi. Rasm uchun JPG, PNG, WebP; video uchun MP4, WebM yoki MOV tanlang.");
  }
  if (normalizedError.includes('row-level security') || normalizedError.includes('new row violates')) {
    throw new Error("Media yuklash uchun qaytadan tizimga kiring.");
  }
  throw new Error(
    `Media yuklanmadi${storageError ? `: ${storageError}` : ''}. Internetni tekshirib, qayta urinib ko'ring.`
  );
}

export async function deleteListingMedia(urlOrPath: string): Promise<void> {
  if (!urlOrPath) return;
  try {
    let storagePath = urlOrPath;
    if (urlOrPath.includes('/listing-media/')) {
      storagePath = urlOrPath.split('/listing-media/')[1] || '';
    }
    if (storagePath && !storagePath.startsWith('http')) {
      await apiClient.storage.from('listing-media').remove([storagePath]);
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

  if (typeof input === 'string') {
    if (input.startsWith('http://') || input.startsWith('https://')) {
      return input;
    }
    const response = await fetch(input);
    fileOrBlob = await response.blob();
  } else {
    fileOrBlob = input;
  }

  // Compress and optimize avatar (square 512x512) or cover (max 1280px)
  try {
    fileOrBlob = await processAndCompressImage(fileOrBlob, {
      maxDimension: target === 'avatar' ? 512 : 1280,
      quality: 0.85,
      squareCrop: target === 'avatar',
    });
  } catch {
    // Fallback to original blob if canvas fails
  }

  const path = `${userId}/profile-${target}-${Date.now()}.webp`;
  return uploadListingMedia(fileOrBlob, path, 'image/webp');
}

export async function incrementPostViewsOnServer(postId: string): Promise<void> {
  const { error } = await apiClient.rpc('increment_post_views', { p_post_id: postId });
  if (error) throw new Error(`Ko'rishlar soni saqlanmadi: ${error.message}`);
}

// ---------- Types ----------
// B2B ro'yxatdan o'tish natijasida qo'shiladigan qiymatlar (supplier,
// business_buyer va h.k.) faqat ko'rsatish/yorliq uchun — haqiqiy huquq
// tekshiruvi supplier_profiles.verificationStatus / businessProfile orqali
// bo'ladi, bu maydon orqali emas.
export type UserRole =
  | 'seller' | 'buyer' | 'business'
  | 'business_buyer' | 'supplier' | 'manufacturer' | 'importer' | 'distributor';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  handle: string;
  phone: string;
  location?: string;
  businessName?: string;
  bio?: string;
  role?: UserRole;
  avatar?: string;
  cover?: string;
  website?: string;
  telegram?: string;
  lat?: number;
  lng?: number;
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
  role?: UserRole;
}

export interface AuthResult {
  ok: boolean;
  user?: AuthUser;
  error?: string;
  successMessage?: string;
  requiresConfirmation?: boolean;
}

export type OAuthProvider = 'google' | 'oneid';

async function signInWithProvider(provider: OAuthProvider): Promise<AuthResult> {
  if (provider === 'oneid') {
    return { ok: false, error: 'OneID integratsiyasi hali ulanmagan. Email yoki telefon orqali kiring.' };
  }

  const { error } = await apiClient.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: getAuthCallbackUrl() },
  });
  return error
    ? { ok: false, error: translateAuthError(error.message) }
    : { ok: true, successMessage: 'Google oynasi ochilmoqda...' };
}

async function restoreSession(): Promise<AuthUser | null> {
  const { data, error } = await apiClient.auth.getUser();
  if (error && (error.name === 'AuthRetryableFetchError' || (error.status ?? 0) >= 500)) {
    throw new Error(translateAuthError(error.message));
  }
  if (error || !data.user) return null;

  const user = data.user;
  const meta = user.user_metadata as Record<string, string> | undefined;
  const { data: existingProfile, error: profileError } = await apiClient
    .from('profiles').select('*').eq('id', user.id).maybeSingle();
  if (profileError) throw new Error(translateAuthError(profileError.message));
  let profile = existingProfile;

  // A failed read is not a missing profile. Never overwrite an existing row
  // with stale signup metadata after a transient network/RLS failure.
  if (!profile) {
    const { data: createdProfile, error: createError } = await apiClient.from('profiles').insert({
      id: user.id,
      email: user.email || '',
      name: meta?.name || (user.email || '').split('@')[0],
      handle: meta?.handle || (user.email || '').split('@')[0],
      phone: meta?.phone || '',
      location: meta?.location || '',
      business_name: meta?.businessName || '',
      role: meta?.role || 'seller',
      updated_at: new Date().toISOString(),
    }).select('*').single();
    if (createError?.code === '23505') {
      const retry = await apiClient.from('profiles').select('*').eq('id', user.id).single();
      if (retry.error) throw new Error(translateAuthError(retry.error.message));
      profile = retry.data;
    } else {
      if (createError) throw new Error(translateAuthError(createError.message));
      profile = createdProfile;
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
    role: (profile?.role as UserRole) || (meta?.role as UserRole) || 'seller',
    website: profile?.website || '',
    telegram: profile?.telegram || '',
    createdAt: user.created_at || new Date().toISOString(),
    isAdmin: Boolean(profile?.is_admin),
    status: (profile?.status as 'active' | 'banned') || 'active',
  };
}

async function updateUser(fields: Partial<AuthUser>): Promise<AuthUser | null> {
  const { data: sessionData, error: sessionError } = await apiClient.auth.getUser();
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
      website: fields.website,
      telegram: fields.telegram,
      updated_at: new Date().toISOString(),
    }).filter(([, value]) => value !== undefined)
  );

  // update (not upsert): the profile row always exists by now — handle_new_user()
  // creates it at signup. Upsert would also require satisfying the INSERT policy's
  // WITH CHECK for no reason, since we're never actually inserting here.
  const { data, error } = await apiClient
    .from('profiles')
    .update(profileUpdate)
    .eq('id', userId)
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
    role: (data.role as UserRole) || 'seller',
    avatar: data.avatar_url || '',
    cover: data.cover_url || '',
    website: data.website || '',
    telegram: data.telegram || '',
    createdAt: data.created_at || new Date().toISOString(),
    isAdmin: Boolean(data.is_admin),
    status: (data.status as 'active' | 'banned') || 'active',
  };
}

// ---------- Auth ----------
async function signUp(fields: SignUpFields): Promise<AuthResult> {
  try {
    const cleanEmail = fields.email.trim().toLowerCase();
    const cleanPhone = fields.phone.trim();
    if (!cleanEmail && !cleanPhone) {
      return { ok: false, error: "Email manzil yoki telefon raqamini kiriting." };
    }
    const cleanHandle = fields.handle
      .trim()
      .toLowerCase()
      .replace(/^@/, '')
      .replace(/[^a-z0-9_]/g, '') || `user_${Date.now().toString().slice(-5)}`;

    // The UI currently exposes email registration, but keeping this explicit
    // also makes the existing phone flow safe to enable when an SMS provider
    // is configured. An empty email must never be sent as a phone signup.
    const contact = cleanEmail
      ? { email: cleanEmail }
      : { phone: cleanPhone };
    const { data, error } = await apiClient.auth.signUp({
      ...contact,
      password: fields.password,
      options: {
        emailRedirectTo: getAuthCallbackUrl(),
        data: {
          name: fields.name.trim(),
          handle: cleanHandle,
          phone: cleanPhone,
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

    if (Array.isArray(data.user.identities) && data.user.identities.length === 0) {
      return {
        ok: false,
        error: "Ushbu email bilan allaqachon ro'yxatdan o'tilgan. Iltimos, tizimga kiring.",
      };
    }

    if (data.session) {
      try {
        await apiClient.from('profiles').upsert({
          id: data.user.id,
          email: data.user.email || cleanEmail || '',
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
        email: data.user.email || cleanEmail || '',
        name: fields.name.trim(),
        handle: cleanHandle,
        phone: fields.phone.trim(),
        location: fields.location || '',
        businessName: fields.businessName || '',
        role: fields.role || 'seller',
        createdAt: data.user.created_at,
        status: 'active',
      };
      return { ok: true, user };
    }

    return {
      ok: true,
      requiresConfirmation: true,
      successMessage: "Ro'yxatdan o'tish muvaffaqiyatli! Emailingizga tasdiqlash havolasi yuborildi.",
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Server bilan bog'lanib bo'lmadi";
    return { ok: false, error: translateAuthError(message) };
  }
}

async function signIn(email: string, password: string): Promise<AuthResult> {
  try {
    const cleanIdentifier = email.trim().toLowerCase();
    const credentials = cleanIdentifier.includes('@')
      ? { email: cleanIdentifier, password }
      : { phone: cleanIdentifier, password };
    const { data, error } = await apiClient.auth.signInWithPassword(credentials);

    if (error) return { ok: false, error: translateAuthError(error.message) };
    if (!data.user) return { ok: false, error: 'Foydalanuvchi topilmadi' };

    const user = await restoreSession();
    if (!user) return { ok: false, error: 'Profil ma\'lumotlarini yuklab bo\'lmadi' };

    return { ok: true, user };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Tizimga kirishda xatolik yuz berdi';
    return { ok: false, error: translateAuthError(message) };
  }
}

async function resendConfirmationEmail(email: string): Promise<AuthResult> {
  const { error } = await apiClient.auth.resend({
    type: 'signup',
    email: email.trim().toLowerCase(),
    options: { emailRedirectTo: getAuthCallbackUrl() },
  });
  return error
    ? { ok: false, error: translateAuthError(error.message) }
    : { ok: true, successMessage: 'Tasdiqlash havolasi qayta yuborildi.' };
}

async function signOut(): Promise<void> {
  const { error } = await apiClient.auth.signOut();
  if (error) throw new Error(translateAuthError(error.message));
}

async function deleteAccount(): Promise<void> {
  const { data: sessionData, error: sessionError } = await apiClient.auth.getSession();
  const accessToken = sessionData.session?.access_token;
  const userId = sessionData.session?.user?.id;
  if (sessionError || !accessToken || !userId) {
    throw new Error("Akkauntni o'chirish uchun qaytadan tizimga kiring.");
  }

  const response = await fetch('/api/account/delete', {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const result = await response.json().catch(() => ({})) as { ok?: boolean; error?: string };
  // Only the authenticated server can delete auth.users and its dependants.
  // Deleting profiles locally neither deletes the login nor proves success.
  if (!response.ok || result.ok !== true) {
    throw new Error(result.error || "Akkauntni o'chirib bo'lmadi. Keyinroq qayta urinib ko'ring.");
  }

  await apiClient.auth.signOut();
}

// ---------- Public Auth API ----------
export const authClient = {
  signUp,
  signIn,
  signInWithProvider,
  resendConfirmationEmail,
  signOut,
  restoreSession,
  updateUser,
  deleteAccount,
};
