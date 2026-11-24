import { lazy, Suspense } from 'react';
import type { LocationPickerProps } from './LocationPickerMap';
import { loadChunk } from '../../utils/loadChunk';

// The map library (Leaflet) is loaded only when a location picker is shown,
// not with the first page load.
const LocationPickerMap = lazy(() => loadChunk(() => import('./LocationPickerMap')).then((m) => ({ default: m.LocationPickerMap })));

export function LocationPicker(props: LocationPickerProps) {
  return (
    <Suspense fallback={<div aria-busy="true" className="h-80 w-full animate-pulse rounded-xl bg-slate-100" />}>
      <LocationPickerMap {...props} />
    </Suspense>
  );
}
