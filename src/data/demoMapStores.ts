import type { B2BStorePublicMarker } from '../api/types';

// Approximate presentation locations, not real businesses or delivery addresses.
export const DEMO_MAP_STORES: B2BStorePublicMarker[] = [
  { district: 'Shahrisabz', latitude: 39.057, longitude: 66.827, businessType: 'supermarket', storeName: 'Shahrisabz savdo markazi' },
  { district: 'Shahrisabz', latitude: 39.066, longitude: 66.842, businessType: 'grocery', storeName: 'Shahrisabz meva-sabzavot' },
  { district: 'Shahrisabz', latitude: 39.043, longitude: 66.851, businessType: 'minimarket', storeName: 'Shahrisabz mini-market' },
  { district: 'Shahrisabz', latitude: 39.078, longitude: 66.815, businessType: 'cafe_restaurant', storeName: 'Shahrisabz kafesi' },
  { district: 'Kitob', latitude: 39.122, longitude: 66.877, businessType: 'supermarket', storeName: 'Kitob savdo markazi' },
  { district: 'Kitob', latitude: 39.134, longitude: 66.891, businessType: 'grocery', storeName: 'Kitob oziq-ovqat' },
  { district: 'Kitob', latitude: 39.112, longitude: 66.899, businessType: 'minimarket', storeName: 'Kitob mini-market' },
  { district: 'Kitob', latitude: 39.145, longitude: 66.865, businessType: 'construction', storeName: 'Kitob qurilish mollari' },
].map((store, index) => ({
  ...store,
  businessType: store.businessType as B2BStorePublicMarker['businessType'],
  id: `demo-map-store-${index + 1}`,
  storeName: `${store.storeName} (namuna)`,
  region: 'Qashqadaryo',
  description: "Taqdimot uchun namunaviy do'kon. Joylashuv taxminiy; haqiqiy savdo nuqtasi emas.",
  createdAt: '2026-10-20T00:00:00Z',
}));

export const isDemoMapStore = (store: B2BStorePublicMarker) => store.id.startsWith('demo-map-store-');
