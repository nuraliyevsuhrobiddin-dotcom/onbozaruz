/**
 * E'lon draft ma'lumotlarini localStorage'da saqlash va tiklash.
 * Foydalanuvchi oynani yopsa ham kiritgan ma'lumotlari yo'qolmaydi.
 */
import { formatPhone } from './formatting';

export interface PostDraft {
  title: string;
  category: string;
  price: string;
  minOrder: string;
  location: string;
  phone: string;
  telegram: string;
  condition: string;
  selectedRegion: string;
  mediaUrl: string;
  mediaType: 'image' | 'video';
  mediaMode: 'image' | 'video';
  updatedAt: number;
}

const DRAFT_KEY = 'onbozor-create-post-draft';

const EMPTY_DRAFT: Omit<PostDraft, 'updatedAt'> = {
  title: '',
  category: '',
  price: '',
  minOrder: '',
  location: '',
  phone: '',
  telegram: '',
  condition: '',
  selectedRegion: '',
  mediaUrl: '',
  mediaType: 'image',
  mediaMode: 'video',
};

export function loadDraft(): PostDraft | null {
  try {
    const raw = window.localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PostDraft;
    if (!parsed || typeof parsed !== 'object') return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveDraft(draft: Omit<PostDraft, 'updatedAt'>): void {
  try {
    const value: PostDraft = { ...draft, updatedAt: Date.now() };
    window.localStorage.setItem(DRAFT_KEY, JSON.stringify(value));
  } catch {
    // localStorage to'la yoki mavjud bo'lmasa — jim o'tkazib yuboramiz.
  }
}

export function clearDraft(): void {
  try {
    window.localStorage.removeItem(DRAFT_KEY);
  } catch {
    // Eski brauzerlarda localStorage xato berishi mumkin.
  }
}

/** Draftni formaga moslab qaytaradi. */
export function draftToForm(draft: PostDraft) {
  return {
    title: draft.title,
    category: draft.category,
    price: draft.price,
    minOrder: draft.minOrder,
    location: draft.location,
    phone: draft.phone,
    telegram: draft.telegram,
    condition: draft.condition,
  };
}

/** Bo'sh draft (yangi e'lon uchun boshlang'ich qiymat). */
export function createEmptyDraftValues() {
  return { ...EMPTY_DRAFT, phone: formatPhone('') };
}
