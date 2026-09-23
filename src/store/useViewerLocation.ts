import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { hasCoordinates, type GeoPoint } from '../utils/geo';

interface ViewerLocationState {
  point: GeoPoint | null;
  label: string;
  setLocation: (point: GeoPoint, label?: string) => void;
  clearLocation: () => void;
}
/** Only a user-confirmed browsing location is saved on this device; never published as a profile address. */
export const useViewerLocation = create<ViewerLocationState>()(persist((set) => ({
  point: null, label: '',
  setLocation: (point, label = 'Tanlangan joy') => {
    if (!hasCoordinates(point)) throw new Error('Xaritadagi nuqta noto‘g‘ri');
    set({point: {latitude:point.latitude, longitude:point.longitude}, label});
  },
  clearLocation: () => set({point:null,label:''}),
}), { name: 'onbozar-viewer-location', partialize: state => ({ point: state.point, label: state.label }),
  merge: (persisted, current) => {
    const saved = persisted as Partial<ViewerLocationState> | undefined;
    return {...current, point: hasCoordinates(saved?.point) ? saved.point : null, label: typeof saved?.label === 'string' ? saved.label : ''};
  },
}));
