export interface GeoPoint { latitude: number; longitude: number }
export type OptionalGeoPoint = { latitude?: number | null; longitude?: number | null };
export function hasCoordinates(point: OptionalGeoPoint | null | undefined): point is GeoPoint {
  return !!point && typeof point.latitude === 'number' && Number.isFinite(point.latitude) && Math.abs(point.latitude) <= 90
    && typeof point.longitude === 'number' && Number.isFinite(point.longitude) && Math.abs(point.longitude) <= 180;
}
/** Straight-line distance, never a road distance or travel-time estimate. */
export function distanceKm(a: GeoPoint, b: GeoPoint): number {
  const rad = Math.PI / 180;
  const x = Math.sin((b.latitude - a.latitude) * rad / 2) ** 2
    + Math.cos(a.latitude * rad) * Math.cos(b.latitude * rad) * Math.sin((b.longitude - a.longitude) * rad / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(Math.min(1, Math.max(0, x))));
}
export function sortNearby<T extends OptionalGeoPoint>(items: T[], origin: GeoPoint | null): T[] {
  if (!hasCoordinates(origin)) return [...items];
  return items.map((item, index) => ({item, index, distance: hasCoordinates(item) ? distanceKm(origin, item) : Infinity}))
    .sort((a,b) => (a.distance === b.distance ? a.index-b.index : a.distance-b.distance)).map(entry => entry.item);
}
export function formatDistance(km: number): string {
  return `${km < 1 ? Math.round(km * 1000) + ' m' : km.toLocaleString('uz-UZ', {maximumFractionDigits:1}) + ' km'} atrofida`;
}
