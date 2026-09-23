import { useEffect, useId, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { LocateFixed, MapPin } from 'lucide-react';
import { GeoPoint, hasCoordinates } from '../../utils/geo';

interface LocationPickerProps {
  value: GeoPoint | null;
  onChange: (point: GeoPoint) => void;
  label?: string;
  description?: string;
}

/** A point is confirmed only by a map tap, marker drag, GPS request or coordinate submission. */
export function LocationPicker({ value, onChange, label = 'Xaritada joylashuvni belgilang', description = 'Xaritaga bosing yoki belgini suring. E’londa shu joy ko‘rinadi; uy manzili o‘rniga xo‘jalik yoki uchrashuv joyini tanlashingiz mumkin.' }: LocationPickerProps) {
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const changeRef = useRef(onChange);
  const aliveRef = useRef(true);
  const id = useId();
  const [latitude, setLatitude] = useState(value?.latitude.toString() ?? '');
  const [longitude, setLongitude] = useState(value?.longitude.toString() ?? '');
  const [error, setError] = useState('');
  const [locating, setLocating] = useState(false);
  changeRef.current = onChange;
  const selectedLatitude = value?.latitude;
  const selectedLongitude = value?.longitude;

  useEffect(() => {
    aliveRef.current = true;
    if (!container.current) return;
    const map = L.map(container.current, { scrollWheelZoom: false }).setView([41.3, 64.5], 5);
    mapRef.current = map;
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map);
    map.on('click', (event: L.LeafletMouseEvent) => {
      const point = { latitude: event.latlng.lat, longitude: event.latlng.wrap().lng };
      if (hasCoordinates(point)) { setError(''); changeRef.current(point); }
    });
    const observer = new ResizeObserver(() => map.invalidateSize());
    observer.observe(container.current);
    const frame = requestAnimationFrame(() => map.invalidateSize());
    return () => {
      aliveRef.current = false;
      cancelAnimationFrame(frame);
      observer.disconnect();
      map.off();
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const selected = { latitude: selectedLatitude, longitude: selectedLongitude };
    if (!hasCoordinates(selected)) {
      markerRef.current?.remove();
      markerRef.current = null;
      setLatitude(''); setLongitude('');
      return;
    }
    setLatitude(selected.latitude.toString()); setLongitude(selected.longitude.toString());
    if (!map) return;
    const point: L.LatLngExpression = [selected.latitude, selected.longitude];
    if (!markerRef.current) {
      const icon = L.divIcon({ className: '', html: '<span style="display:block;width:24px;height:24px;border-radius:50%;background:#15803d;border:3px solid white;box-shadow:0 0 0 2px #15803d"></span>', iconSize: [24, 24], iconAnchor: [12, 12] });
      const marker = L.marker(point, { icon, draggable: true, title: 'Tanlangan joy — surib o‘zgartiring' }).addTo(map);
      marker.on('dragend', () => {
        const position = marker.getLatLng();
        const next = { latitude: position.lat, longitude: position.wrap().lng };
        if (hasCoordinates(next)) { setError(''); changeRef.current(next); }
      });
      markerRef.current = marker;
    } else markerRef.current.setLatLng(point);
    map.setView(point, Math.max(map.getZoom(), 13));
  }, [selectedLatitude, selectedLongitude]);

  const locate = () => {
    setError('');
    if (!navigator.geolocation) { setError('GPS mavjud emas. Xaritadan yoki koordinatalar orqali tanlang.'); return; }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(({ coords }) => {
      if (!aliveRef.current) return;
      setLocating(false);
      const point = { latitude: coords.latitude, longitude: coords.longitude };
      if (hasCoordinates(point)) changeRef.current(point);
      else setError('GPS natijasi noto‘g‘ri. Xaritadan tanlang.');
    }, () => {
      if (!aliveRef.current) return;
      setLocating(false);
      setError('GPS ruxsati berilmadi yoki joy aniqlanmadi. Xaritadan yoki koordinatalar orqali tanlang.');
    }, { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 });
  };

  const confirmCoordinates = () => {
    const point = { latitude: Number(latitude), longitude: Number(longitude) };
    if (!latitude.trim() || !longitude.trim() || !hasCoordinates(point)) {
      setError('Kenglik −90…90, uzunlik −180…180 oralig‘ida bo‘lishi kerak.'); return;
    }
    setError(''); changeRef.current(point);
  };

  return <section className="space-y-3" aria-labelledby={`${id}-title`}>
    <h3 id={`${id}-title`} className="flex items-center gap-2 text-sm font-bold text-slate-800"><MapPin size={16} className="text-green-700" />{label}</h3>
    <p className="text-xs leading-relaxed text-slate-600">{description}</p>
    <div ref={container} className="relative z-0 h-56 w-full overflow-hidden rounded-xl border border-slate-200" aria-label="Joylashuv tanlash xaritasi" />
    <button type="button" onClick={locate} disabled={locating} className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-green-700 bg-green-50 px-3 text-sm font-semibold text-green-800 disabled:opacity-60"><LocateFixed size={16} />{locating ? 'Joy aniqlanmoqda…' : 'Hozirgi joylashuvim'}</button>
    <details className="text-xs text-slate-600"><summary className="min-h-11 cursor-pointer py-3.5 font-semibold">Koordinatalarni qo‘lda kiritish</summary><div className="mt-2 grid grid-cols-2 gap-2">
      <label htmlFor={`${id}-lat`}>Kenglik<input id={`${id}-lat`} inputMode="decimal" type="number" min={-90} max={90} step="any" value={latitude} onChange={e => { setLatitude(e.target.value); setError(''); }} className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-2 text-sm" /></label>
      <label htmlFor={`${id}-lng`}>Uzunlik<input id={`${id}-lng`} inputMode="decimal" type="number" min={-180} max={180} step="any" value={longitude} onChange={e => { setLongitude(e.target.value); setError(''); }} className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-2 text-sm" /></label>
      <button type="button" onClick={confirmCoordinates} className="col-span-2 min-h-11 rounded-lg bg-slate-100 font-bold text-slate-800">Koordinatalarni tasdiqlash</button>
    </div></details>
    {hasCoordinates(value) && <p className="text-xs font-semibold text-green-800">Tanlandi: {value.latitude.toFixed(5)}, {value.longitude.toFixed(5)}</p>}
    {error && <p role="alert" className="text-xs text-red-700">{error}</p>}
  </section>;
}
