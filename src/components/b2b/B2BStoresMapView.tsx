import React, { useEffect, useRef, useState, useMemo } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  ArrowLeft,
  Search,
  Crosshair,
  Store,
  ShieldCheck,
  Navigation,
  Send,
  X,
  Sparkles,
  Loader2,
} from 'lucide-react';
import { useAgroStore } from '../../store/useAgroStore';
import { b2bRepository } from '../../api/b2bRepository';
import { B2BStorePublicMarker } from '../../api/types';
import { B2BSendOfferModal } from './B2BSendOfferModal';

const CATEGORY_PINS: Record<string, { label: string; color: string; bg: string; border: string; emoji: string }> = {
  all: { label: 'Barchasi', color: '#3B82F6', bg: 'bg-blue-50 text-blue-700 border-blue-200', border: 'border-blue-500', emoji: '🏬' },
  supermarket: { label: 'Supermarket', color: '#10B981', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200', border: 'border-emerald-500', emoji: '🛒' },
  minimarket: { label: 'Mini-market', color: '#3B82F6', bg: 'bg-blue-50 text-blue-700 border-blue-200', border: 'border-blue-500', emoji: '🏪' },
  grocery: { label: 'Oziq-ovqat', color: '#F97316', bg: 'bg-orange-50 text-orange-700 border-orange-200', border: 'border-orange-500', emoji: '🍎' },
  pharmacy: { label: 'Dorixona', color: '#EC4899', bg: 'bg-pink-50 text-pink-700 border-pink-200', border: 'border-pink-500', emoji: '💊' },
  cafe_restaurant: { label: 'Kafe / Restoran', color: '#8B5CF6', bg: 'bg-purple-50 text-purple-700 border-purple-200', border: 'border-purple-500', emoji: '☕' },
  construction: { label: 'Qurilish', color: '#14B8A6', bg: 'bg-teal-50 text-teal-700 border-teal-200', border: 'border-teal-500', emoji: '🧱' },
  household: { label: 'Maishiy', color: '#6366F1', bg: 'bg-indigo-50 text-indigo-700 border-indigo-200', border: 'border-indigo-500', emoji: '🧴' },
  other: { label: 'Boshqa', color: '#64748B', bg: 'bg-slate-100 text-slate-700 border-slate-200', border: 'border-slate-400', emoji: '🏬' },
};

function createCustomPin(type: string): L.DivIcon {
  const meta = CATEGORY_PINS[type] || CATEGORY_PINS.other;
  return L.divIcon({
    className: 'custom-b2b-marker',
    html: `
      <div style="
        position: relative;
        display: flex;
        align-items: center;
        justify-content: center;
        width: 36px;
        height: 36px;
        background: ${meta.color};
        color: white;
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        box-shadow: 0 4px 14px rgba(0,0,0,0.25);
        border: 2px solid #FFFFFF;
        cursor: pointer;
        transition: transform 0.2s ease;
      ">
        <span style="
          transform: rotate(45deg);
          font-size: 15px;
          line-height: 1;
        ">${meta.emoji}</span>
      </div>
    `,
    iconSize: [36, 36],
    iconAnchor: [18, 36],
    popupAnchor: [0, -36],
  });
}

export const B2BStoresMapView: React.FC = () => {
  const { setB2BRoute, b2bCashbackRate } = useAgroStore();
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersGroupRef = useRef<L.LayerGroup | null>(null);

  const [stores, setStores] = useState<B2BStorePublicMarker[]>([]);
  const [selectedStore, setSelectedStore] = useState<B2BStorePublicMarker | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isOfferModalOpen, setIsOfferModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Load stores from repository
  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    b2bRepository.listStoresForMap().then((data) => {
      if (isMounted) {
        setStores(data);
        setIsLoading(false);
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  // Filter stores based on category & search query
  const filteredStores = useMemo(() => {
    return stores.filter((store) => {
      const matchCat = selectedCategory === 'all' || store.businessType === selectedCategory;
      const matchSearch =
        searchQuery.trim() === '' ||
        store.storeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        store.region.toLowerCase().includes(searchQuery.toLowerCase()) ||
        store.district.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [stores, selectedCategory, searchQuery]);

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [41.2995, 69.2401],
        zoom: 12,
        zoomControl: false,
      });

      L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
        subdomains: 'abcd',
        maxZoom: 19,
      }).addTo(map);

      L.control.zoom({ position: 'bottomright' }).addTo(map);

      const markersGroup = L.layerGroup().addTo(map);
      markersGroupRef.current = markersGroup;
      mapInstanceRef.current = map;

      setTimeout(() => {
        map.invalidateSize();
      }, 200);
    }

    const handleResize = () => {
      mapInstanceRef.current?.invalidateSize();
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Update Markers on filteredStores change
  useEffect(() => {
    const map = mapInstanceRef.current;
    const markersGroup = markersGroupRef.current;
    if (!map || !markersGroup) return;

    markersGroup.clearLayers();

    const validStores = filteredStores.filter(
      (store) => typeof store.latitude === 'number' && typeof store.longitude === 'number'
    );

    validStores.forEach((store) => {
      const marker = L.marker([store.latitude, store.longitude], {
        icon: createCustomPin(store.businessType),
      });

      marker.on('click', () => {
        setSelectedStore(store);
        map.panTo([store.latitude, store.longitude], { animate: true, duration: 0.5 });
      });

      marker.addTo(markersGroup);
    });

    if (validStores.length === 1) {
      map.setView([validStores[0].latitude, validStores[0].longitude], 13, { animate: true });
    } else if (validStores.length > 1) {
      const bounds = L.latLngBounds(validStores.map((s) => [s.latitude, s.longitude] as [number, number]));
      map.fitBounds(bounds, { padding: [60, 60], maxZoom: 13 });
    }
  }, [filteredStores]);

  // Locate User GPS
  const handleLocateMe = () => {
    if (!navigator.geolocation || !mapInstanceRef.current) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        if (mapInstanceRef.current) {
          mapInstanceRef.current.setView([latitude, longitude], 14, { animate: true });
          L.circleMarker([latitude, longitude], {
            radius: 8,
            fillColor: '#3B82F6',
            color: '#ffffff',
            weight: 2,
            opacity: 1,
            fillOpacity: 0.9,
          })
            .addTo(mapInstanceRef.current)
            .bindPopup('Sizning joylashuvingiz')
            .openPopup();
        }
      },
      () => {
        mapInstanceRef.current?.setView([41.2995, 69.2401], 12);
      }
    );
  };

  const handleOpenNavigation = (lat: number, lng: number) => {
    window.open(`https://yandex.com/maps/?rtext=~${lat},${lng}&rtt=auto`, '_blank');
  };

  return (
    <div className="relative w-full h-[calc(100dvh-4.25rem)] lg:h-[calc(100vh)] flex flex-col select-none overflow-hidden bg-slate-100">
      {/* Top Floating Controls */}
      <div className="absolute top-2.5 sm:top-4 left-2.5 right-2.5 sm:left-4 sm:right-4 z-30 space-y-2 pointer-events-none max-w-2xl mx-auto">
        {/* Navigation & Search Bar */}
        <div className="flex items-center gap-2 pointer-events-auto bg-white/95 backdrop-blur-md rounded-2xl p-1.5 sm:p-2 shadow-lg border border-slate-200/80">
          <button
            onClick={() => setB2BRoute({ view: 'home' })}
            className="p-2 sm:p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 transition-colors cursor-pointer border border-slate-200"
            title="Orqaga"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Do'kon nomi yoki tuman..."
              className="w-full bg-slate-100/80 rounded-xl pl-9 pr-8 py-2 text-xs sm:text-sm font-semibold outline-none focus:ring-2 focus:ring-blue-500/30 text-slate-800 placeholder:text-slate-400 border border-slate-200"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <button
            onClick={handleLocateMe}
            className="p-2 sm:p-2.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-600 border border-blue-200 transition-colors cursor-pointer"
            title="Mening joylashuvim"
          >
            <Crosshair className="w-5 h-5" />
          </button>
        </div>

        {/* Category Filter Pills */}
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar py-0.5 pointer-events-auto">
          {Object.entries(CATEGORY_PINS).map(([key, cat]) => {
            const isSelected = selectedCategory === key;
            return (
              <button
                key={key}
                onClick={() => setSelectedCategory(key)}
                className={`shrink-0 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer backdrop-blur-md border ${
                  isSelected
                    ? 'bg-blue-500 text-white border-blue-500 shadow-blue-500/25 scale-102'
                    : 'bg-white/95 text-slate-700 hover:bg-white border-slate-200 hover:text-slate-900'
                }`}
              >
                <span>{cat.emoji}</span>
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Stores Count Pill */}
      <div className="absolute top-26 sm:top-28 left-3 sm:left-4 z-20 pointer-events-none">
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/95 backdrop-blur-md shadow-md border border-slate-200 text-[11px] font-black text-slate-700">
          {isLoading ? (
            <>
              <Loader2 className="w-3.5 h-3.5 text-blue-600 animate-spin" />
              <span>Yuklanmoqda...</span>
            </>
          ) : (
            <>
              <Store className="w-3.5 h-3.5 text-blue-600" />
              <span>{filteredStores.length} ta do'kon</span>
            </>
          )}
        </span>
      </div>

      {/* Leaflet Map Canvas */}
      <div ref={mapContainerRef} className="w-full h-full z-10" />

      {/* Selected Store Bottom Sheet Card */}
      {selectedStore && (
        <div className="absolute bottom-[calc(4.5rem+env(safe-area-inset-bottom))] lg:bottom-6 left-2.5 right-2.5 sm:left-4 sm:right-4 z-30 max-w-lg mx-auto pointer-events-auto animate-in slide-in-from-bottom-5 duration-200">
          <div className="bg-white rounded-3xl p-4 sm:p-5 shadow-2xl border border-slate-200 space-y-3 max-h-[55vh] overflow-y-auto">
            {/* Header with Category Badge & Close */}
            <div className="flex items-start justify-between gap-2">
              <div className="space-y-1 min-w-0">
                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${CATEGORY_PINS[selectedStore.businessType]?.bg || 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                  {CATEGORY_PINS[selectedStore.businessType]?.emoji} {CATEGORY_PINS[selectedStore.businessType]?.label || selectedStore.businessType}
                </span>
                <h3 className="font-black text-base sm:text-lg text-slate-900 truncate leading-tight">
                  {selectedStore.storeName}
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  {selectedStore.region}, {selectedStore.district} {selectedStore.address ? `· ${selectedStore.address}` : ''}
                </p>
              </div>

              <button
                onClick={() => setSelectedStore(null)}
                className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors shrink-0 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Description if any */}
            {selectedStore.description && (
              <p className="text-xs text-slate-600 bg-slate-50 border border-slate-200 p-2.5 rounded-2xl leading-relaxed">
                {selectedStore.description}
              </p>
            )}

            {/* Privacy Protection Notice & Cashback Promo */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div className="flex items-center gap-2 p-2.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700">
                <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="text-[11px] font-extrabold leading-tight">
                  Do'konga buyurtmada {b2bCashbackRate}% keshbek
                </span>
              </div>

              <div className="flex items-center gap-2 p-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-slate-600">
                <ShieldCheck className="w-4 h-4 text-slate-500 shrink-0" />
                <span className="text-[10px] font-bold leading-tight">
                  Aloqa ma'lumotlari xavfsiz saqlanadi
                </span>
              </div>
            </div>

            {/* Actions: Send B2B Offer & Navigation */}
            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={() => setIsOfferModalOpen(true)}
                className="flex-1 py-3.5 px-4 rounded-2xl bg-blue-500 hover:bg-blue-600 text-white font-black text-xs sm:text-sm shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2 transition-all cursor-pointer border border-blue-400/30"
              >
                <Send className="w-4 h-4" />
                <span>Maxsus taklif yuborish</span>
              </button>

              <button
                onClick={() => handleOpenNavigation(selectedStore.latitude, selectedStore.longitude)}
                className="py-3.5 px-4 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors shrink-0 cursor-pointer"
                title="Xaritada yo'l ko'rsatish"
              >
                <Navigation className="w-4 h-4 text-blue-600" />
                <span className="hidden sm:inline">Marshrut</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Send Offer Modal */}
      {isOfferModalOpen && selectedStore && (
        <B2BSendOfferModal
          store={selectedStore}
          onClose={() => setIsOfferModalOpen(false)}
        />
      )}
    </div>
  );
};
