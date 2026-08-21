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
  all: { label: 'Barchasi', color: '#111827', bg: 'bg-slate-900 text-white', border: 'border-slate-900', emoji: '🏬' },
  supermarket: { label: 'Supermarket', color: '#059669', bg: 'bg-emerald-50 text-emerald-700', border: 'border-emerald-500', emoji: '🛒' },
  minimarket: { label: 'Mini-market', color: '#2563EB', bg: 'bg-blue-50 text-blue-700', border: 'border-blue-500', emoji: '🏪' },
  grocery: { label: 'Oziq-ovqat', color: '#EA580C', bg: 'bg-orange-50 text-orange-700', border: 'border-orange-500', emoji: '🍎' },
  pharmacy: { label: 'Dorixona', color: '#E11D48', bg: 'bg-rose-50 text-rose-700', border: 'border-rose-500', emoji: '💊' },
  cafe_restaurant: { label: 'Kafe / Restoran', color: '#7C3AED', bg: 'bg-purple-50 text-purple-700', border: 'border-purple-500', emoji: '☕' },
  construction: { label: 'Qurilish', color: '#0D9488', bg: 'bg-teal-50 text-teal-700', border: 'border-teal-500', emoji: '🧱' },
  household: { label: 'Maishiy', color: '#4F46E5', bg: 'bg-indigo-50 text-indigo-700', border: 'border-indigo-500', emoji: '🧴' },
  other: { label: 'Boshqa', color: '#64748B', bg: 'bg-slate-50 text-slate-700', border: 'border-slate-400', emoji: '🏬' },
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
        width: 38px;
        height: 38px;
        background: ${meta.color};
        color: white;
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        box-shadow: 0 4px 14px rgba(0,0,0,0.35);
        border: 2.5px solid white;
        cursor: pointer;
        transition: transform 0.2s ease;
      ">
        <span style="
          transform: rotate(45deg);
          font-size: 16px;
          line-height: 1;
        ">${meta.emoji}</span>
      </div>
    `,
    iconSize: [38, 38],
    iconAnchor: [19, 38],
    popupAnchor: [0, -38],
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
      // Default center: Tashkent, Uzbekistan
      const map = L.map(mapContainerRef.current, {
        center: [41.2995, 69.2401],
        zoom: 12,
        zoomControl: false,
      });

      // Add CartoDB Positron / OSM tiles for crisp, modern look
      L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
        subdomains: 'abcd',
        maxZoom: 19,
      }).addTo(map);

      // Add zoom control at bottom-right
      L.control.zoom({ position: 'bottomright' }).addTo(map);

      const markersGroup = L.layerGroup().addTo(map);
      markersGroupRef.current = markersGroup;
      mapInstanceRef.current = map;
    }

    return () => {
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

    filteredStores.forEach((store) => {
      if (typeof store.latitude !== 'number' || typeof store.longitude !== 'number') return;

      const marker = L.marker([store.latitude, store.longitude], {
        icon: createCustomPin(store.businessType),
      });

      marker.on('click', () => {
        setSelectedStore(store);
        map.panTo([store.latitude, store.longitude], { animate: true, duration: 0.5 });
      });

      marker.addTo(markersGroup);
    });
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
            fillColor: '#DB2777',
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
        // Fallback to Tashkent center
        mapInstanceRef.current?.setView([41.2995, 69.2401], 12);
      }
    );
  };

  const handleOpenNavigation = (lat: number, lng: number) => {
    // Open in Yandex Maps or Google Maps
    window.open(`https://yandex.com/maps/?rtext=~${lat},${lng}&rtt=auto`, '_blank');
  };

  return (
    <div className="relative w-full h-[calc(100vh-60px)] md:h-screen flex flex-col select-none overflow-hidden bg-slate-100">
      {/* Top Floating Controls */}
      <div className="absolute top-3 left-3 right-3 z-30 space-y-2 pointer-events-none max-w-2xl mx-auto">
        {/* Navigation & Search Bar */}
        <div className="flex items-center gap-2 pointer-events-auto bg-white/95 backdrop-blur-md rounded-2xl p-2 shadow-lg border border-slate-200/80">
          <button
            onClick={() => setB2BRoute({ view: 'home' })}
            className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
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
              className="w-full bg-slate-100 rounded-xl pl-9 pr-8 py-2 text-xs font-semibold outline-none focus:ring-2 focus:ring-[#DB2777]/30"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <button
            onClick={handleLocateMe}
            className="p-2.5 rounded-xl bg-pink-50 hover:bg-pink-100 text-[#DB2777] transition-colors"
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
                className={`shrink-0 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-[#111827] text-white shadow-md scale-102'
                    : 'bg-white/95 backdrop-blur-md text-slate-700 hover:bg-white border border-slate-200/80'
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
      <div className="absolute top-28 left-4 z-20 pointer-events-none">
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/90 backdrop-blur-md shadow-md border border-slate-200 text-[11px] font-black text-slate-700">
          {isLoading
            ? <><Loader2 className="w-3.5 h-3.5 text-[#DB2777] animate-spin" /><span>Yuklanmoqda...</span></>
            : <><Store className="w-3.5 h-3.5 text-[#DB2777]" /><span>{filteredStores.length} ta do'kon xaritada</span></>}
        </span>
      </div>

      {/* Leaflet Map Canvas */}
      <div ref={mapContainerRef} className="w-full h-full z-10" />

      {/* Selected Store Bottom Sheet Card */}
      {selectedStore && (
        <div className="absolute bottom-4 left-3 right-3 z-30 max-w-lg mx-auto pointer-events-auto animate-in slide-in-from-bottom-5 duration-200">
          <div className="bg-white rounded-3xl p-4 sm:p-5 shadow-2xl border border-slate-200/90 space-y-3.5">
            {/* Header with Category Badge & Close */}
            <div className="flex items-start justify-between gap-2">
              <div className="space-y-1 min-w-0">
                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wide ${CATEGORY_PINS[selectedStore.businessType]?.bg || 'bg-slate-100 text-slate-700'}`}>
                  {CATEGORY_PINS[selectedStore.businessType]?.emoji} {CATEGORY_PINS[selectedStore.businessType]?.label || selectedStore.businessType}
                </span>
                <h3 className="font-black text-base sm:text-lg text-[#111827] truncate leading-tight">
                  {selectedStore.storeName}
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  {selectedStore.region}, {selectedStore.district} {selectedStore.address ? `· ${selectedStore.address}` : ''}
                </p>
              </div>

              <button
                onClick={() => setSelectedStore(null)}
                className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Description if any */}
            {selectedStore.description && (
              <p className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-2xl leading-relaxed">
                {selectedStore.description}
              </p>
            )}

            {/* Privacy Protection Notice & Cashback Promo */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div className="flex items-center gap-2 p-2.5 rounded-2xl bg-emerald-50/70 border border-emerald-200/60 text-emerald-900">
                <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="text-[11px] font-extrabold leading-tight">
                  Do'konga buyurtmada {b2bCashbackRate}% keshbek
                </span>
              </div>

              <div className="flex items-center gap-2 p-2.5 rounded-2xl bg-slate-100 text-slate-600">
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
                className="flex-1 py-3 px-4 rounded-2xl bg-[#DB2777] hover:bg-[#BE185D] text-white font-black text-xs sm:text-sm shadow-md flex items-center justify-center gap-2 transition-all hover:shadow-lg cursor-pointer"
              >
                <Send className="w-4 h-4" />
                <span>Maxsus taklif yuborish</span>
              </button>

              <button
                onClick={() => handleOpenNavigation(selectedStore.latitude, selectedStore.longitude)}
                className="py-3 px-3.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors shrink-0"
                title="Xaritada yo'l ko'rsatish"
              >
                <Navigation className="w-4 h-4" />
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
