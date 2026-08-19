import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  ArrowLeft,
  Image as ImageIcon,
  Video,
  Upload,
  MapPin,
  Phone,
  Tag,
  DollarSign,
  FileText,
  CheckCircle2,
  ChevronDown,
  Sparkles,
  AlignLeft,
  PackageCheck,
  LayoutGrid,
  Camera,
  LocateFixed,
  Clock,
  Loader2,
  Trash2,
  Apple,
  Wheat,
  Tractor,
  Beef,
  Sprout,
  Leaf,
  Package,
  Hexagon,
} from 'lucide-react';
import { useCreatePostForm } from './create/useCreatePostForm';
import { REGIONS } from '../data/mockAgroData';
import { CONDITION_QUICK, DURATION_OPTIONS, MIN_ORDER_QUICK, PRICE_QUICK } from './create/constants';
import { VideoPlayer } from './ui/VideoPlayer';
import { useAgroStore } from '../store/useAgroStore';

const categoryIconMap = {
  apple: Apple,
  wheat: Wheat,
  tractor: Tractor,
  beef: Beef,
  sprout: Sprout,
  leaf: Leaf,
  package: Package,
  honey: Hexagon,
};

const getCategoryIcon = (icon: string) =>
  categoryIconMap[icon as keyof typeof categoryIconMap] || Tag;

const STEPS = [
  { num: 1, label: 'Media', icon: LayoutGrid },
  { num: 2, label: 'Kategoriya', icon: Tag },
  { num: 3, label: "Ma'lumot", icon: FileText },
  { num: 4, label: 'Nashr', icon: PackageCheck },
];

const inputBase =
  'w-full bg-slate-100 rounded-[14px] px-3.5 py-3 text-[13px] text-slate-900 placeholder-slate-400 outline-none focus:ring-2 transition-all';

const inputError = 'ring-2 ring-red-300 bg-red-50';
const inputOk = 'focus:ring-[#E53935]/30';

/** Tez tanlash tugmasi */
const QuickChip: React.FC<{
  label: string;
  isActive: boolean;
  onPick: () => void;
}> = ({ label, isActive, onPick }) => (
  <button
    type="button"
    onClick={onPick}
    className={`shrink-0 rounded-full px-3 py-1.5 text-[11px] font-bold transition-all ${
      isActive
        ? 'bg-[#111827] text-white shadow-sm'
        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
    }`}
  >
    {label}
  </button>
);

export const CreatePostModal: React.FC = () => {
  const { categories } = useAgroStore();
  const {
    isCreateModalOpen,
    step,
    formValues,
    errors,
    register,
    setValue,
    selectedMediaUrl,
    mediaType,
    selectedRegion,
    setSelectedRegion,
    durationDays,
    setDurationDays,
    isDetectingLocation,
    isPublishing,
    fileInputRef,
    cameraInputRef,
    handleFileChange,
    removeMedia,
    handlePriceChange,
    handlePhoneChange,
    handleCategorySelect,
    handleDetectLocation,
    canGoNext,
    goNext,
    goPrev,
    onSubmit,
    handleClose,
    openGallery,
    openCamera,
    mediaMode,
    setMediaMode,
  } = useCreatePostForm();

  return (
    <AnimatePresence>
      {isCreateModalOpen && (
        <>
          {/* Desktop backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={handleClose}
            className="hidden lg:block fixed inset-0 z-[299] bg-black/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 10 }}
            transition={{ duration: 0.2 }}
            className="fixed z-[300] flex flex-col bg-white
              inset-0 mobile-modal-shell
              lg:inset-auto lg:top-1/2 lg:left-1/2 lg:-translate-x-1/2 lg:-translate-y-1/2
              lg:w-[480px] lg:max-h-[88vh] lg:rounded-[24px] lg:shadow-2xl lg:overflow-hidden"
            style={{ fontFamily: "'Inter', system-ui, sans-serif" }}
          >
            {/* Hidden file inputs */}
            <input
              type="file"
              ref={fileInputRef}
              accept={mediaMode === 'video' ? 'video/mp4,video/webm' : 'image/*'}
              onChange={handleFileChange}
              className="hidden"
            />
            <input
              type="file"
              ref={cameraInputRef}
              accept={mediaMode === 'video' ? 'video/mp4,video/webm' : 'image/*'}
              capture="environment"
              onChange={handleFileChange}
              className="hidden"
            />

            {/* Top Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-white shrink-0">
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={step === 1 ? handleClose : goPrev}
                className="w-9 h-9 rounded-full flex items-center justify-center text-slate-600 hover:bg-slate-100 transition-colors"
              >
                {step === 1 ? <X className="w-5 h-5" /> : <ArrowLeft className="w-5 h-5" />}
              </motion.button>

              <div className="text-center">
                <h2 className="font-black text-[15px] text-[#111111]">Yangi E'lon</h2>
                <p className="text-[11px] text-slate-400 font-medium">
                  {STEPS.find((s) => s.num === step)?.label}
                </p>
              </div>

              {step < 4 ? (
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={goNext}
                  disabled={!canGoNext()}
                  className={`px-4 py-2 rounded-[14px] text-[13px] font-black transition-all ${
                    canGoNext()
                      ? 'bg-[#E53935] text-white shadow-sm'
                      : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                  }`}
                >
                  Keyingi
                </motion.button>
              ) : (
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={onSubmit}
                  disabled={isPublishing}
                  className="px-4 py-2 rounded-[14px] text-[13px] font-black bg-[#E53935] text-white shadow-sm disabled:opacity-60 disabled:cursor-wait"
                >
                  {isPublishing ? (
                    <Loader2 className="w-4 h-4 animate-spin inline-block" />
                  ) : (
                    'Nashr'
                  )}
                </motion.button>
              )}
            </div>

            {/* Step Progress Bar */}
            <div className="flex gap-1 px-4 pt-2 pb-1 shrink-0">
              {STEPS.map((s) => (
                <div
                  key={s.num}
                  className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                    step >= s.num ? 'bg-[#E53935]' : 'bg-slate-100'
                  }`}
                />
              ))}
            </div>

            {/* Step Indicators */}
            <div className="flex items-center justify-between px-4 pb-2 shrink-0">
              {STEPS.map((s) => {
                const Icon = s.icon;
                const isActive = step === s.num;
                const isDone = step > s.num;
                return (
                  <div key={s.num} className="flex flex-col items-center gap-0.5">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                        isActive
                          ? 'bg-[#E53935] text-white scale-110 shadow-md'
                          : isDone
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-slate-100 text-slate-400'
                      }`}
                    >
                      {isDone ? (
                        <CheckCircle2 className="w-4 h-4" />
                      ) : (
                        <Icon className="w-4 h-4" />
                      )}
                    </div>
                    <span
                      className={`text-[10px] font-bold ${
                        isActive ? 'text-[#E53935]' : isDone ? 'text-emerald-600' : 'text-slate-400'
                      }`}
                    >
                      {s.label}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Step Content */}
            <div className="flex-1 overflow-y-auto no-scrollbar">
              <AnimatePresence mode="wait">
                {/* STEP 1: Media */}
                {step === 1 && (
                  <motion.div
                    key="step1"
                    initial={{ opacity: 0, x: 30 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -30 }}
                    transition={{ duration: 0.2 }}
                    className="p-4 space-y-4"
                  >
                    {/* Upload mode selector */}
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setMediaMode('video')}
                          className={`px-3 py-2 rounded-full text-[12px] font-black transition-colors ${
                            mediaMode === 'video'
                              ? 'bg-[#E53935] text-white shadow-sm'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          Video
                        </button>
                        <button
                          type="button"
                          onClick={() => setMediaMode('image')}
                          className={`px-3 py-2 rounded-full text-[12px] font-black transition-colors ${
                            mediaMode === 'image'
                              ? 'bg-[#111827] text-white shadow-sm'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          Rasm
                        </button>
                      </div>
                      <p className="text-[11px] text-slate-500">Asosi e'lonlar uchun videoni tanlash tavsiya etiladi.</p>
                    </div>

                    {/* Main upload area */}
                    <div
                      onClick={openGallery}
                      className={`relative w-full rounded-[24px] border-2 border-dashed transition-all cursor-pointer overflow-hidden flex flex-col items-center justify-center group ${
                        selectedMediaUrl
                          ? 'border-transparent aspect-[9/16] max-h-[500px]'
                          : 'border-slate-200 hover:border-slate-300 bg-slate-50 aspect-[4/3]'
                      }`}
                    >
                      {selectedMediaUrl ? (
                        <>
                          {mediaType === 'video' ? (
                            <div className="w-full h-full">
                              <VideoPlayer src={selectedMediaUrl} fit="cover" />
                            </div>
                          ) : (
                            <img
                              src={selectedMediaUrl}
                              alt="Preview"
                              className="w-full h-full object-cover"
                            />
                          )}
                          {/* Overlay on hover */}
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all flex items-center justify-center">
                            <div className="opacity-0 group-hover:opacity-100 transition-all bg-white/90 backdrop-blur-sm px-4 py-2.5 rounded-full flex items-center gap-2 shadow-lg">
                              <Upload className="w-4 h-4 text-[#111111]" />
                              <span className="text-[13px] font-black text-[#111111]">Almashtirish</span>
                            </div>
                          </div>
                          {/* Media type badge */}
                          <div className="absolute top-3 left-3 bg-black/70 backdrop-blur-sm text-white px-2.5 py-1 rounded-full text-[11px] font-bold flex items-center gap-1.5">
                            {mediaType === 'video' ? (
                              <>
                                <Video className="w-3.5 h-3.5" />
                                <span>Video</span>
                              </>
                            ) : (
                              <>
                                <ImageIcon className="w-3.5 h-3.5" />
                                <span>Rasm</span>
                              </>
                            )}
                          </div>
                          {/* Remove media */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              removeMedia();
                            }}
                            className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/60 hover:bg-[#E53935] text-white flex items-center justify-center backdrop-blur-sm transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      ) : (
                        <div className="text-center space-y-3 px-6 py-8">
                          <div className="w-20 h-20 rounded-[20px] bg-slate-100 flex items-center justify-center mx-auto group-hover:scale-110 transition-transform">
                            <ImageIcon className="w-10 h-10 text-slate-400" />
                          </div>
                          <div>
                            <p className="font-extrabold text-[15px] text-[#111111]">Galereya yoki Kamera</p>
                            <p className="text-[12px] text-slate-400 mt-1">
                              {mediaMode === 'video' ? 'Video fayl tanlang (MP4 / MOV)' : 'Rasm fayl tanlang (JPG / PNG)'}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 justify-center text-[11px] text-slate-400 font-medium">
                            {mediaMode === 'video' ? (
                              <>
                                <span className="bg-slate-100 px-2 py-1 rounded-full">MP4</span>
                                <span className="bg-slate-100 px-2 py-1 rounded-full">MOV</span>
                              </>
                            ) : (
                              <>
                                <span className="bg-slate-100 px-2 py-1 rounded-full">JPG</span>
                                <span className="bg-slate-100 px-2 py-1 rounded-full">PNG</span>
                              </>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Two action buttons */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <motion.button
                        whileTap={{ scale: 0.97 }}
                        onClick={openGallery}
                        className="py-3.5 rounded-[16px] bg-slate-100 hover:bg-slate-200 text-[#111111] font-bold text-[13px] flex items-center justify-center gap-2 transition-colors"
                      >
                        <LayoutGrid className="w-4 h-4 text-slate-500" />
                        Galereya
                      </motion.button>
                      <motion.button
                        whileTap={{ scale: 0.97 }}
                        onClick={openCamera}
                        className="py-3.5 rounded-[16px] bg-[#111111] hover:bg-[#222] text-white font-bold text-[13px] flex items-center justify-center gap-2 transition-colors"
                      >
                        <Camera className="w-4 h-4" />
                        Kamera
                      </motion.button>
                    </div>

                    {selectedMediaUrl && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-emerald-50 border border-emerald-200 rounded-[16px] p-3 flex items-center gap-3"
                      >
                        <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                        <div>
                          <p className="font-bold text-[13px] text-emerald-800">
                            {mediaType === 'video' ? 'Video tanlandi!' : 'Rasm tanlandi!'}
                          </p>
                          <p className="text-[11px] text-emerald-600">Keyingisi: Kategoriya tanlang</p>
                        </div>
                      </motion.div>
                    )}

                    {!selectedMediaUrl && (
                      <div className="bg-amber-50 border border-amber-200 rounded-[16px] p-3 flex items-center gap-3">
                        <Sparkles className="w-5 h-5 text-amber-500 shrink-0" />
                        <p className="text-[12px] text-amber-700 font-medium">
                          Video qo'shsangiz ko'proq mijoz jalb qilasiz.
                        </p>
                      </div>
                    )}
                  </motion.div>
                )}

                {/* STEP 2: Category */}
                {step === 2 && (
                  <motion.div
                    key="step2"
                    initial={{ opacity: 0, x: 30 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -30 }}
                    transition={{ duration: 0.2 }}
                    className="p-4 space-y-4"
                  >
                    <div>
                      <h3 className="font-black text-[15px] text-[#111111]">Kategoriya tanlang</h3>
                      <p className="text-[12px] text-slate-400 mt-0.5">Mahsulotingiz qaysi turkumga kiradi?</p>
                    </div>

                    <div className="grid grid-cols-2 gap-2.5">
                      {categories.filter((c) => c.id !== 'all').map((c) => {
                        const isSelected = formValues.category === c.id;
                        const CategoryIcon = getCategoryIcon(c.icon);
                        return (
                          <motion.button
                            key={c.id}
                            whileTap={{ scale: 0.97 }}
                            onClick={() => handleCategorySelect(c.id)}
                            className={`p-3.5 rounded-[18px] border-2 text-left flex items-center gap-3 transition-all ${
                              isSelected
                                ? 'border-[#E53935] bg-red-50 shadow-md'
                                : 'border-slate-100 bg-white hover:border-slate-200 hover:bg-slate-50'
                            }`}
                          >
                            <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                              isSelected ? 'bg-red-100 text-[#E53935]' : 'bg-slate-100 text-slate-500'
                            }`}>
                              <CategoryIcon className="h-5 w-5" />
                            </span>
                            <div className="flex-1 min-w-0">
                              <p className={`text-[13px] font-bold truncate ${isSelected ? 'text-[#E53935]' : 'text-[#111111]'}`}>
                                {c.name}
                              </p>
                              <p className="text-[11px] text-slate-400">{c.count}</p>
                            </div>
                            {isSelected && (
                              <CheckCircle2 className="w-4 h-4 text-[#E53935] shrink-0" />
                            )}
                          </motion.button>
                        );
                      })}
                    </div>

                    {/* Region selector */}
                    <div className="space-y-2 pt-2">
                      <h3 className="font-black text-[13px] text-[#111111]">Viloyat</h3>
                      <div className="relative">
                        <MapPin className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 z-10" />
                        <select
                          value={selectedRegion}
                          onChange={(e) => setSelectedRegion(e.target.value)}
                          className="w-full bg-slate-100 border-0 rounded-[14px] pl-9 pr-8 py-3 text-[13px] text-slate-900 font-medium outline-none appearance-none cursor-pointer focus:ring-2 focus:ring-[#E53935]/30"
                        >
                          {REGIONS.filter((r) => r !== 'Barchasi').map((reg) => (
                            <option key={reg} value={reg}>
                              {reg}
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* STEP 3: Details */}
                {step === 3 && (
                  <motion.div
                    key="step3"
                    initial={{ opacity: 0, x: 30 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -30 }}
                    transition={{ duration: 0.2 }}
                    className="p-4 space-y-3"
                  >
                    <div>
                      <h3 className="font-black text-[15px] text-[#111111]">Mahsulot ma'lumotlari</h3>
                      <p className="text-[12px] text-slate-400 mt-0.5">To'liq ma'lumot berish ko'proq xaridor jalb qiladi</p>
                    </div>

                    {/* Title */}
                    <div className="space-y-1">
                      <label className="text-[12px] font-bold text-slate-600 flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-slate-400" />
                        E'lon sarlavhasi *
                      </label>
                      <textarea
                        rows={3}
                        placeholder="Masalan: Yangi uzilgan Farg'ona olmasi, eksportbop, A'lo sifat..."
                        {...register('title')}
                        className={`${inputBase} ${errors.title ? inputError : inputOk}`}
                      />
                      {errors.title && (
                        <p className="text-[11px] text-red-500 font-medium">{errors.title.message}</p>
                      )}
                    </div>

                    {/* Price */}
                    <div className="space-y-1">
                      <label className="text-[12px] font-bold text-slate-600 flex items-center gap-1.5">
                        <DollarSign className="w-3.5 h-3.5 text-slate-400" />
                        Narx *
                      </label>
                      <input
                        type="text"
                        inputMode="numeric"
                        placeholder="5,000 so'm/kg"
                        value={formValues.price}
                        onChange={handlePriceChange}
                        className={`${inputBase} ${errors.price ? inputError : inputOk}`}
                      />
                      <div className="flex gap-1.5 overflow-x-auto no-scrollbar py-1">
                        {PRICE_QUICK.map((suffix) => (
                          <QuickChip
                            key={suffix}
                            label={suffix}
                            isActive={formValues.price.toLowerCase().endsWith(suffix.toLowerCase())}
                            onPick={() => {
                              const digits = formValues.price.replace(/[^0-9]/g, '');
                              const next = digits ? `${Number(digits).toLocaleString('en-US')} ${suffix}` : suffix;
                              setValue('price', next, { shouldValidate: true });
                            }}
                          />
                        ))}
                      </div>
                      {errors.price && (
                        <p className="text-[11px] text-red-500">{errors.price.message}</p>
                      )}
                    </div>

                    {/* Min Order */}
                    <div className="space-y-1">
                      <label className="text-[12px] font-bold text-slate-600">
                        Min. buyurtma *
                      </label>
                      <input
                        type="text"
                        placeholder="100 kg"
                        value={formValues.minOrder}
                        onChange={(e) => setValue('minOrder', e.target.value, { shouldValidate: true })}
                        className={`${inputBase} ${errors.minOrder ? inputError : inputOk}`}
                      />
                      <div className="flex gap-1.5 overflow-x-auto no-scrollbar py-1">
                        {MIN_ORDER_QUICK.map((option) => (
                          <QuickChip
                            key={option}
                            label={option}
                            isActive={formValues.minOrder === option}
                            onPick={() => setValue('minOrder', option, { shouldValidate: true })}
                          />
                        ))}
                      </div>
                      {errors.minOrder && (
                        <p className="text-[11px] text-red-500">{errors.minOrder.message}</p>
                      )}
                    </div>

                    {/* Location & Phone */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <label className="text-[12px] font-bold text-slate-600 flex items-center gap-1.5">
                            <MapPin className="w-3.5 h-3.5 text-slate-400" />
                            Joylashuv *
                          </label>
                          <button
                            type="button"
                            onClick={handleDetectLocation}
                            disabled={isDetectingLocation}
                            className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-black text-emerald-700 transition-colors hover:bg-emerald-100 disabled:cursor-wait disabled:opacity-70"
                          >
                            {isDetectingLocation ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <LocateFixed className="w-3 h-3" />
                            )}
                            Avtomatik aniqlash
                          </button>
                        </div>
                        <input
                          type="text"
                          placeholder="Manzilingiz avtomatik aniqlanadi"
                          value={formValues.location}
                          onChange={(e) => setValue('location', e.target.value, { shouldValidate: true })}
                          className={`${inputBase} ${errors.location ? inputError : inputOk}`}
                        />
                        {errors.location && (
                          <p className="text-[11px] text-red-500">{errors.location.message}</p>
                        )}
                      </div>
                      <div className="space-y-1">
                        <label className="text-[12px] font-bold text-slate-600 flex items-center gap-1.5">
                          <Phone className="w-3.5 h-3.5 text-slate-400" />
                          Telefon *
                        </label>
                        <input
                          type="tel"
                          placeholder="+998 90 123 45 67"
                          value={formValues.phone}
                          onChange={handlePhoneChange}
                          className={`${inputBase} ${errors.phone ? inputError : inputOk}`}
                        />
                        {errors.phone && (
                          <p className="text-[11px] text-red-500">{errors.phone.message}</p>
                        )}
                      </div>

                      <div className="space-y-1">
                        <label className="text-[12px] font-bold text-slate-600 flex items-center gap-1.5">
                          <span className="text-slate-400">@</span>
                          Telegram foydalanuvchi nomi <span className="text-slate-400 font-normal">(ixtiyoriy)</span>
                        </label>
                        <input
                          type="text"
                          placeholder="@alisher_agro"
                          value={formValues.telegram || ''}
                          onChange={(e) => setValue('telegram', e.target.value, { shouldValidate: true })}
                          className={`${inputBase} ${errors.telegram ? inputError : inputOk}`}
                        />
                        {errors.telegram && (
                          <p className="text-[11px] text-red-500">{errors.telegram.message}</p>
                        )}
                      </div>
                    </div>

                    {/* Condition */}
                    <div className="space-y-1">
                      <label className="text-[12px] font-bold text-slate-600">
                        Mahsulot holati <span className="text-slate-400 font-normal">(ixtiyoriy)</span>
                      </label>
                      <input
                        type="text"
                        placeholder="A'lo sifat, yangi uzilgan..."
                        value={formValues.condition || ''}
                        onChange={(e) => setValue('condition', e.target.value)}
                        className={`${inputBase} focus:ring-[#E53935]/30`}
                      />
                      <div className="flex gap-1.5 overflow-x-auto no-scrollbar py-1">
                        {CONDITION_QUICK.map((option) => (
                          <QuickChip
                            key={option}
                            label={option}
                            isActive={formValues.condition === option}
                            onPick={() =>
                              setValue(
                                'condition',
                                formValues.condition === option ? '' : option
                              )
                            }
                          />
                        ))}
                      </div>
                    </div>

                    {/* Muddat */}
                    <div className="space-y-1">
                      <label className="text-[12px] font-bold text-slate-600 flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        E'lon muddati
                      </label>
                      <div className="flex gap-1.5 overflow-x-auto no-scrollbar py-1">
                        {DURATION_OPTIONS.map((option) => (
                          <QuickChip
                            key={option.label}
                            label={option.label}
                            isActive={durationDays === option.days}
                            onPick={() => setDurationDays(option.days)}
                          />
                        ))}
                      </div>
                      <p className="text-[10px] text-slate-400 font-medium">
                        Muddat tugagach e'lon avtomatik ro'yxatdan olib tashlanadi.
                      </p>
                    </div>

                    {/* Description */}
                    <div className="space-y-1">
                      <label className="text-[12px] font-bold text-slate-600 flex items-center gap-1.5">
                        <AlignLeft className="w-3.5 h-3.5 text-slate-400" />
                        Tavsif <span className="text-slate-400 font-normal">(ixtiyoriy)</span>
                      </label>
                      <textarea
                        rows={3}
                        placeholder="Mahsulot haqida batafsil: hosil sifati, yetkazib berish sharti, qadoqlash va h.k."
                        value={formValues.description || ''}
                        onChange={(e) => setValue('description', e.target.value)}
                        className={`${inputBase} focus:ring-[#E53935]/30`}
                      />
                    </div>

                    <div className="bg-blue-50 border border-blue-200 rounded-[14px] p-3 flex items-start gap-2.5">
                      <Sparkles className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
                      <p className="text-[11px] text-blue-700 font-medium leading-relaxed">
                        Joylashuv e'lon oynasi ochilganda avtomatik aniqlanadi. Kerak bo'lsa uni qo'lda tahrirlashingiz mumkin.
                      </p>
                    </div>
                  </motion.div>
                )}

                {/* STEP 4: Preview & Publish */}
                {step === 4 && (
                  <motion.div
                    key="step4"
                    initial={{ opacity: 0, x: 30 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -30 }}
                    transition={{ duration: 0.2 }}
                    className="p-4 space-y-4"
                  >
                    <div>
                      <h3 className="font-black text-[15px] text-[#111111]">Ko'rib chiqing va nashr qiling</h3>
                      <p className="text-[12px] text-slate-400 mt-0.5">E'loningiz qanday ko'rinishini tekshiring</p>
                    </div>

                    {/* Preview card */}
                    <div className="bg-white rounded-[20px] border border-slate-200 overflow-hidden shadow-md">
                      {/* Media preview */}
                      {selectedMediaUrl ? (
                        <div
                          className={`relative w-full bg-slate-900 overflow-hidden ${
                            mediaType === 'video' ? 'aspect-[9/16] max-h-[400px]' : 'aspect-[4/5] max-h-[350px]'
                          }`}
                        >
                          {mediaType === 'video' ? (
                            <VideoPlayer src={selectedMediaUrl} fit="cover" />
                          ) : (
                            <img src={selectedMediaUrl} alt="Preview" className="w-full h-full object-cover" />
                          )}
                          <div className="absolute top-3 left-3 bg-[#111111]/90 text-[#22C55E] px-3 py-1.5 rounded-full text-[12px] font-extrabold shadow-md">
                            {formValues.price || 'Narx'}
                          </div>
                          <div className="absolute top-3 right-3 bg-[#E53935]/90 text-white px-2.5 py-1 rounded-full text-[11px] font-bold">
                            {categories.find((c) => c.id === formValues.category)?.name || 'Kategoriya'}
                          </div>
                        </div>
                      ) : (
                        <div className="aspect-[4/5] max-h-[250px] bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center">
                          <div className="text-center">
                            <ImageIcon className="w-12 h-12 text-slate-300 mx-auto mb-2" />
                            <p className="text-[12px] text-slate-400 font-medium">Media tanlanmagan</p>
                          </div>
                        </div>
                      )}

                      {/* Info */}
                      <div className="p-4 space-y-2.5">
                        <div>
                          <p className="font-extrabold text-[14px] text-[#111111] leading-snug">
                            {formValues.title || "Sarlavha yo'q"}
                          </p>
                        </div>

                        {formValues.description && (
                          <p className="text-[12px] text-slate-500 leading-relaxed line-clamp-3">
                            {formValues.description}
                          </p>
                        )}

                        <div className="flex items-center gap-1.5 text-[12px] text-slate-500 font-medium">
                          <MapPin className="w-3.5 h-3.5 text-slate-400" />
                          <span>
                            {formValues.location
                              ? `${formValues.location}, ${selectedRegion}`
                              : "Joylashuv yo'q"}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 text-[12px] text-slate-500 font-medium">
                          <Phone className="w-3.5 h-3.5 text-slate-400" />
                          <span>{formValues.phone || "Telefon yo'q"}</span>
                        </div>

                        <div className="flex items-center gap-1.5 text-[12px] text-slate-500 font-medium">
                          <span className="text-slate-400 font-bold">@</span>
                          <span>{formValues.telegram ? formValues.telegram.trim() : "Telegram yo'q"}</span>
                        </div>

                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="bg-emerald-100 text-emerald-700 px-2.5 py-1 rounded-full text-[11px] font-bold">
                            Min: {formValues.minOrder || '-'}
                          </span>
                          <span className="bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full text-[11px] font-bold">
                            Muddat: {DURATION_OPTIONS.find((o) => o.days === durationDays)?.label || 'Cheksiz'}
                          </span>
                          {formValues.condition && (
                            <span className="bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full text-[11px] font-bold">
                              Sifat: {formValues.condition}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Publish CTA */}
                    <motion.button
                      whileTap={{ scale: 0.97 }}
                      onClick={onSubmit}
                      disabled={isPublishing}
                      className="w-full py-4 rounded-[18px] bg-[#E53935] hover:bg-[#d32f2f] text-white font-black text-[15px] flex items-center justify-center gap-3 shadow-lg transition-colors disabled:opacity-70 disabled:cursor-wait"
                    >
                      {isPublishing ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          <span>Nashr qilinmoqda...</span>
                        </>
                      ) : (
                        <>
                          <PackageCheck className="w-5 h-5" />
                          <span>E'lonni Nashr Qilish</span>
                        </>
                      )}
                    </motion.button>

                    <p className="text-[11px] text-slate-400 text-center font-medium">
                      E'lon nashr bo'lishi bilan barcha foydalanuvchilarga ko'rinadi
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
