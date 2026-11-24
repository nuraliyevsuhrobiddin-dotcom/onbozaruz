import { useCallback, useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAgroStore } from '../../store/useAgroStore';
import { REGIONS } from '../../data/catalog';
import { MEDIA_MAX_SIZE_MB, VIDEO_SOURCE_MAX_SIZE_MB } from './constants';
import { canCompressVideoHere, compressVideo, preloadVideoCompressor } from '../../utils/videoCompress';
import { formatNumeric, formatPhone, isPhoneComplete, parseNumeric } from './formatting';
import { PRICE_UNITS, hasPriceAmount, priceUnitOf, type PriceUnit } from '../../utils/price';
import { regionFromIsoCode, regionFromPlace } from '../../utils/region';
import { clearDraft, createEmptyDraftValues, draftToForm, loadDraft, saveDraft } from './createPostDraft';
import { deleteListingMedia, uploadListingMedia } from '../../api/authClient';
import { hasCoordinates, type GeoPoint } from '../../utils/geo';

export const postSchema = z.object({
  title: z.string().min(5, 'Kamida 5 ta belgi kiriting'),
  category: z.string().min(1, 'Kategoriyani tanlang'),
  price: z.string().refine(hasPriceAmount, 'Narxni raqam bilan kiriting'),
  minOrder: z.string().min(1, 'Minimal buyurtmani kiriting'),
  location: z.string().min(2, 'Joylashuvni kiriting'),
  phone: z.string().refine(isPhoneComplete, "To'liq telefon raqamini kiriting"),
  telegram: z.string().optional(),
  condition: z.string().optional(),
  description: z.string().optional(),
});

export type PostFormData = z.infer<typeof postSchema>;
export type Step = 1 | 2 | 3 | 4;

/** What the create form shows about the picked video while it is being prepared. */
export interface VideoPrepInfo {
  status: 'working' | 'done' | 'kept';
  progress: number;
  before: number;
  after?: number;
}

/**
 * Background compression of the picked video. It starts as soon as the file is
 * chosen, so it is usually finished while the seller fills in the listing.
 * `result` never rejects except on abort: on any problem it resolves to the original file.
 */
interface VideoPrep {
  source: File;
  controller: AbortController;
  progress: number;
  onProgress: ((share: number) => void) | null;
  result: Promise<File>;
}

const DEFAULT_REGION = REGIONS[1] || 'Toshkent sh.';

export function useCreatePostForm() {
  const {
    isCreateModalOpen,
    setCreateModalOpen,
    addPost,
    showToast,
    setActiveTab,
    currentUser,
    setUploadingPostStatus,
    categories,
  } = useAgroStore();
  const [step, setStep] = useState<Step>(1);
  const [selectedMediaFile, setSelectedMediaFile] = useState<File | null>(null);
  const [selectedMediaUrl, setSelectedMediaUrl] = useState('');
  const [selectedPosterUrl, setSelectedPosterUrl] = useState('');
  const [mediaType, setMediaType] = useState<'image' | 'video'>('image');
  const [mediaContentType, setMediaContentType] = useState('image/jpeg');
  const [mediaMode, setMediaMode] = useState<'image' | 'video'>('video');
  const [selectedRegion, setSelectedRegion] = useState(DEFAULT_REGION);
  const [priceUnitChoice, setPriceUnitChoice] = useState<PriceUnit>(PRICE_UNITS[0]);
  const [durationDays, setDurationDays] = useState<number | null>(30);
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [locationPoint, setLocationPoint] = useState<GeoPoint | null>(null);
  const locationRequestRef = useRef(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const prepRef = useRef<VideoPrep | null>(null);
  const [videoPrepInfo, setVideoPrepInfo] = useState<VideoPrepInfo | null>(null);

  const cancelVideoPrep = useCallback(() => {
    prepRef.current?.controller.abort();
    prepRef.current = null;
    setVideoPrepInfo(null);
  }, []);

  const startVideoPrep = useCallback((file: File): VideoPrep => {
    prepRef.current?.controller.abort();
    const controller = new AbortController();
    const prep: VideoPrep = { source: file, controller, progress: 0, onProgress: null, result: Promise.resolve(file) };
    let shownPercent = -1;
    const isCurrent = () => prepRef.current === prep;
    prep.result = compressVideo(file, {
      signal: controller.signal,
      onProgress: (share) => {
        prep.progress = share;
        prep.onProgress?.(share);
        const percent = Math.floor(share * 100);
        if (percent !== shownPercent && isCurrent()) {
          shownPercent = percent;
          setVideoPrepInfo({ status: 'working', progress: share, before: file.size });
        }
      },
    }).then((outcome) => {
      const ready = outcome.kind === 'compressed' ? outcome.video.file : file;
      if (isCurrent()) {
        setVideoPrepInfo({ status: outcome.kind === 'compressed' ? 'done' : 'kept', progress: 1, before: file.size, after: ready.size });
      }
      return ready;
    }, (error: unknown) => {
      if (controller.signal.aborted) throw error;
      // Compression is an optimisation: on any failure the original is uploaded.
      console.warn('[MollBazar] video compression skipped:', error);
      if (isCurrent()) setVideoPrepInfo({ status: 'kept', progress: 1, before: file.size, after: file.size });
      return file;
    });
    // An aborted preparation is simply dropped.
    prep.result.catch(() => {});
    prepRef.current = prep;
    setVideoPrepInfo({ status: 'working', progress: 0, before: file.size });
    return prep;
  }, []);

  // Leaving the page must not keep the phone's encoder busy.
  useEffect(() => () => prepRef.current?.controller.abort(), []);

  useEffect(() => {
    if (isCreateModalOpen) preloadVideoCompressor();
  }, [isCreateModalOpen]);

  const {
    register,
    watch,
    formState: { errors },
    reset,
    setValue,
    getValues,
    trigger,
  } = useForm<PostFormData>({
    resolver: zodResolver(postSchema),
    defaultValues: {
      title: '',
      category: '',
      price: '',
      minOrder: '',
      location: '',
      phone: '+998 ',
      telegram: '',
      condition: '',
      description: '',
    },
  });

  const formValues = watch();

  // ── Draft: modal ochilganda tiklash ──
  useEffect(() => {
    locationRequestRef.current += 1;
    setIsDetectingLocation(false);
    if (!isCreateModalOpen) return;
    const draft = loadDraft();
    setLocationPoint(hasCoordinates(draft) ? { latitude: draft.latitude, longitude: draft.longitude } : null);
    reset(draftToForm(draft || { ...createEmptyDraftValues(), updatedAt: 0 }));
    setSelectedRegion(draft?.selectedRegion || DEFAULT_REGION);
    if (draft) {
      // Old drafts may contain base64 media. Do not restore it: it can exceed
      // browser storage limits and must be selected again for a new upload.
      setSelectedMediaUrl('');
      setMediaType(draft.mediaType || 'image');
      setMediaContentType(draft.mediaType === 'video' ? 'video/webm' : 'image/jpeg');
      setMediaMode(draft.mediaMode || draft.mediaType || 'video');
      setDurationDays(draft.durationDays !== undefined ? draft.durationDays : 30);
    }
    // A listing location is only chosen by an explicit map or GPS action.
    setStep(1);
  }, [isCreateModalOpen, reset]);

  const draft = {
    title: formValues.title,
    category: formValues.category,
    price: formValues.price,
    minOrder: formValues.minOrder,
    location: formValues.location,
    latitude: locationPoint?.latitude,
    longitude: locationPoint?.longitude,
    phone: formValues.phone,
    telegram: formValues.telegram || '',
    condition: formValues.condition || '',
    description: formValues.description || '',
    selectedRegion,
    // Katta media fayl localStorage limitini tez to'ldiradi. Draftda faqat
    // forma qiymatlari saqlanadi; media oynani qayta ochganda qayta tanlanadi.
    mediaUrl: '',
    mediaType,
    mediaMode,
    durationDays,
  };

  // ── Draft: o'zgarganda saqlash ──
  useEffect(() => {
    if (!isCreateModalOpen) return;
    const timeout = window.setTimeout(() => saveDraft(draft), 300);
    return () => window.clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCreateModalOpen, selectedMediaUrl, selectedRegion, mediaType, mediaMode, durationDays, locationPoint, formValues]);

  // ── Media tanlash ──
  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const extension = file.name.split('.').pop()?.toLowerCase() || '';
      const videoTypeByExtension: Record<string, string> = {
        mp4: 'video/mp4',
        webm: 'video/webm',
        mov: 'video/quicktime',
      };
      const imageTypeByExtension: Record<string, string> = {
        jpg: 'image/jpeg',
        jpeg: 'image/jpeg',
        png: 'image/png',
        webp: 'image/webp',
        gif: 'image/gif',
      };
      // Some mobile browsers leave File.type blank, therefore a safe known
      // extension is accepted as a fallback and receives an explicit MIME type.
      const supportedImage = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type)
        || (!file.type && Boolean(imageTypeByExtension[extension]));
      const supportedVideo = ['video/mp4', 'video/webm', 'video/quicktime'].includes(file.type)
        || (!file.type && Boolean(videoTypeByExtension[extension]));
      const supported = supportedImage || supportedVideo;
      if (!supported) {
        showToast("Rasm yoki MP4 / WebM / MOV videoni tanlang.");
        e.target.value = '';
        return;
      }
      // Large phone videos are fine when this browser can compress them before upload.
      const maxMb = supportedVideo && canCompressVideoHere() ? VIDEO_SOURCE_MAX_SIZE_MB : MEDIA_MAX_SIZE_MB;
      if (file.size > maxMb * 1024 * 1024) {
        showToast(`Media hajmi ${maxMb} MB dan oshmasligi kerak`);
        e.target.value = '';
        return;
      }
      if (mediaMode === 'video' && !supportedVideo) {
        showToast('Video rejimida MP4, WebM yoki MOV video faylini tanlang.');
        e.target.value = '';
        return;
      }
      if (mediaMode === 'image' && !supportedImage) {
        showToast('Rasm rejimida rasm faylini tanlang.');
        e.target.value = '';
        return;
      }

      if (selectedMediaUrl.startsWith('blob:')) {
        URL.revokeObjectURL(selectedMediaUrl);
      }
      const previewUrl = URL.createObjectURL(file);
      setSelectedMediaFile(file);
      setSelectedMediaUrl(previewUrl);

      const selectedType = supportedVideo ? 'video' : 'image';
      if (selectedType === 'video') startVideoPrep(file);
      else cancelVideoPrep();
      setMediaType(selectedType);
      const standardContentType = selectedType === 'video'
        ? (videoTypeByExtension[extension] || file.type || 'video/mp4')
        : (imageTypeByExtension[extension] || file.type || 'image/jpeg');
      setMediaContentType(standardContentType);
      setMediaMode(selectedType);

      if (selectedType === 'video') {
        const video = document.createElement('video');
        video.muted = true;
        video.playsInline = true;
        video.preload = 'auto';
        video.crossOrigin = 'anonymous';

        // Attach invisibly to DOM so mobile Android Chromium allocates hardware decoder & paints
        video.style.position = 'fixed';
        video.style.top = '-9999px';
        video.style.left = '-9999px';
        video.style.width = '1px';
        video.style.height = '1px';
        video.style.opacity = '0';
        video.style.pointerEvents = 'none';
        document.body.appendChild(video);

        let captureTimes: number[] = [];
        let captureIndex = 0;
        let hasCapturedPoster = false;
        let fallbackPosterUrl = '';

        const cleanupVideo = () => {
          video.onloadedmetadata = null;
          video.onseeked = null;
          video.onerror = null;
          video.pause();
          video.removeAttribute('src');
          video.load();
          if (video.parentNode) {
            video.parentNode.removeChild(video);
          }
        };

        const seekToNextFrame = () => {
          if (hasCapturedPoster || captureIndex >= captureTimes.length) {
            if (!hasCapturedPoster && fallbackPosterUrl) {
              setSelectedPosterUrl(fallbackPosterUrl);
            }
            cleanupVideo();
            return;
          }
          const nextTime = captureTimes[captureIndex++];
          try {
            video.currentTime = nextTime;
          } catch {
            seekToNextFrame();
          }
        };

        const captureFrame = () => {
          if (hasCapturedPoster) return;
          try {
            if (!video.videoWidth || !video.videoHeight) {
              seekToNextFrame();
              return;
            }
            // Keep the video's aspect ratio; the longer side is at most 1280px.
            const scale = Math.min(1, 1280 / Math.max(video.videoWidth, video.videoHeight));
            const canvas = document.createElement('canvas');
            canvas.width = Math.round(video.videoWidth * scale);
            canvas.height = Math.round(video.videoHeight * scale);
            const ctx = canvas.getContext('2d');
            if (ctx && canvas.width > 0 && canvas.height > 0) {
              ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

              const dataUrl = canvas.toDataURL('image/jpeg', 0.82);
              if (dataUrl && dataUrl.length > 500) {
                if (!fallbackPosterUrl) fallbackPosterUrl = dataUrl;

                // Check brightness to reject a pitch black intro frame if another frame is available
                const sample = ctx.getImageData(0, 0, Math.min(canvas.width, 48), Math.min(canvas.height, 48)).data;
                let brightness = 0;
                let pixels = 0;
                for (let i = 0; i < sample.length; i += 16) {
                  brightness += sample[i] + sample[i + 1] + sample[i + 2];
                  pixels += 1;
                }
                if (pixels > 0 && brightness / (pixels * 3) < 8 && captureIndex < captureTimes.length) {
                  seekToNextFrame();
                  return;
                }

                hasCapturedPoster = true;
                setSelectedPosterUrl(dataUrl);
                cleanupVideo();
                return;
              }
            }
          } catch {
            // Try a later decoded frame before giving up.
          }
          seekToNextFrame();
        };

        video.onloadedmetadata = () => {
          const duration = Number.isFinite(video.duration) ? video.duration : 0;
          const maxTime = Math.max(0.1, duration - 0.15);
          // The poster is what viewers see before playback starts at 0s, so use
          // the earliest non-black frame: the switch to the playing video is then seamless.
          captureTimes = [0.1, 0.5, 1, duration * 0.15, duration * 0.35]
            .map((time) => Math.min(Math.max(time, 0.1), maxTime))
            .filter((time, index, all) => all.indexOf(time) === index);
          seekToNextFrame();
        };

        // Give the decoder one paint turn after the seek before drawing to canvas.
        video.onseeked = () => window.setTimeout(captureFrame, 80);
        video.onerror = () => {
          setSelectedPosterUrl('');
          cleanupVideo();
        };
        video.src = previewUrl;
        video.load();
      } else {
        setSelectedPosterUrl('');
      }
    },
    [cancelVideoPrep, mediaMode, selectedMediaUrl, showToast, startVideoPrep]
  );

  const removeMedia = useCallback(() => {
    cancelVideoPrep();
    if (selectedMediaUrl.startsWith('blob:')) {
      URL.revokeObjectURL(selectedMediaUrl);
    }
    setSelectedMediaFile(null);
    setSelectedMediaUrl('');
    setSelectedPosterUrl('');
    setMediaType('image');
    setMediaContentType('image/jpeg');
    setMediaMode('video');
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (cameraInputRef.current) cameraInputRef.current.value = '';
  }, [cancelVideoPrep, selectedMediaUrl]);

  // ── Joylashuv ──
  const getCurrentPosition = () =>
    new Promise<GeolocationPosition>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000,
      });
    });

  const handleDetectLocation = useCallback(async () => {
    if (!('geolocation' in navigator)) {
      showToast("Brauzeringiz avtomatik manzil olishni qo'llab-quvvatlamaydi");
      return;
    }
    const requestId = ++locationRequestRef.current;
    setIsDetectingLocation(true);
    try {
      const position = await getCurrentPosition();
      if (requestId !== locationRequestRef.current) return;
      const { latitude, longitude } = position.coords;
      const point = { latitude, longitude };
      if (!hasCoordinates(point)) throw new Error('Invalid location');
      setLocationPoint(point);
      let locationLabel = '';
      const controller = new AbortController();
      const timeout = window.setTimeout(() => controller.abort(), 6000);
      try {
        const response = await fetch(
          // Uzbek (Latin) names first, English as the fallback: never the browser's own language.
          `https://nominatim.openstreetmap.org/reverse?format=jsonv2&accept-language=uz,en&lat=${latitude}&lon=${longitude}`,
          { signal: controller.signal }
        );
        if (response.ok) {
          const data = await response.json();
          const address: Record<string, string | undefined> = data.address || {};
          // Inside cities the service sometimes puts a mahalla in "city"; skip to the district then.
          const place = [address.city, address.town, address.village, address.county, address.district, address.suburb]
            .find((name) => name && !/mahalla/i.test(name));
          const region = address.state || address.region;
          locationLabel =
            [place, region].filter((part, index, parts) => part && parts.indexOf(part) === index).join(', ') ||
            data.display_name || '';
          const matchedRegion =
            regionFromIsoCode(address['ISO3166-2-lvl4']) ?? regionFromPlace(region, place, locationLabel);
          if (matchedRegion && requestId === locationRequestRef.current) setSelectedRegion(matchedRegion);
        }
      } catch {
        // Reverse geocoding ishlamadi — manzil bo'sh qoladi, pastda qo'lda kiritish so'raladi.
      } finally {
        window.clearTimeout(timeout);
      }
      if (requestId !== locationRequestRef.current) return;
      if (locationLabel) {
        setValue('location', locationLabel, { shouldDirty: true, shouldValidate: true });
        showToast('Manzil avtomatik olindi');
      } else {
        // Xom "lat, lng" koordinatalarini hech qachon manzil sifatida ko'rsatmaymiz.
        showToast("Aniq manzilni avtomatik topib bo'lmadi. Iltimos, qo'lda kiriting");
      }
    } catch (error) {
      if (requestId !== locationRequestRef.current) return;
      const denied =
        typeof error === 'object' && error !== null && 'code' in error &&
        (error as { code?: number }).code === 1;
      showToast(
        denied
          ? 'Manzil olishga ruxsat berilmadi'
          : "Manzilni aniqlab bo'lmadi. Qayta urinib ko'ring"
      );
    } finally {
      if (requestId === locationRequestRef.current) setIsDetectingLocation(false);
    }
  }, [setValue, showToast]);

  const handleLocationPointChange = useCallback((point: GeoPoint) => {
    if (!hasCoordinates(point)) return;
    locationRequestRef.current += 1;
    setIsDetectingLocation(false);
    setLocationPoint(point);
  }, []);

  // ── Formatlash ──
  // The amount and the unit are picked separately; the stored price is "15,000 so'm/kg".
  const priceUnit = priceUnitOf(formValues.price) ?? priceUnitChoice;
  const priceAmount = formatNumeric(formValues.price || '');
  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const amount = formatNumeric(e.target.value);
    setValue('price', amount ? `${amount} ${priceUnit}` : '', { shouldValidate: true });
  };
  const handlePriceUnit = (unit: PriceUnit) => {
    setPriceUnitChoice(unit);
    const amount = formatNumeric(getValues('price') || '');
    if (amount) setValue('price', `${amount} ${unit}`, { shouldValidate: true });
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setValue('phone', formatPhone(e.target.value), { shouldValidate: true });
  };

  // ── Bosqichlar ──
  const canGoNext = () => {
    if (step === 1) return !!selectedMediaUrl;
    if (step === 2) return !!formValues.category;
    if (step === 3) {
      return !!(
        formValues.title &&
        hasPriceAmount(formValues.price) &&
        formValues.minOrder &&
        formValues.location &&
        hasCoordinates(locationPoint) &&
        isPhoneComplete(formValues.phone || '')
      );
    }
    return true;
  };

  const goNext = async () => {
    const fieldsByStep: Record<Exclude<Step, 1 | 2 | 4>, Array<keyof PostFormData>> = {
      3: ['title', 'price', 'minOrder', 'location', 'phone', 'telegram'],
    };
    if (step === 3 && !(await trigger(fieldsByStep[3]))) return;
    if (step === 3 && !hasCoordinates(locationPoint)) {
      showToast('Mahsulot turgan joyni xaritada belgilang');
      return;
    }
    if (step < 4) setStep((s) => (s + 1) as Step);
  };

  const goPrev = () => {
    if (step > 1) setStep((s) => (s - 1) as Step);
  };

  const handleCategorySelect = (catId: string) => {
    setValue('category', catId, { shouldValidate: true });
  };

  // ── Nashr qilish (Instagram-style background upload) ──
  const handlePublish = useCallback(
    async (data: PostFormData) => {
      const categoryObj = categories.find((c) => c.id === data.category);
      const numericPrice = parseNumeric(data.price);
      const now = Date.now();
      if (!currentUser || !selectedMediaUrl) {
        showToast("E'lon uchun akkaunt va media fayl kerak");
        return;
      }
      if (!hasCoordinates(locationPoint)) {
        showToast('Mahsulot turgan joyni xaritada belgilang');
        return;
      }

      // Ikki marta bosishdan himoya: agar allaqachon nashr jarayoni bo'lsa, chiqib ketamiz
      if (isPublishing) return;
      setIsPublishing(true);

      // Instagram-style UX: Nashr bosilgan zahoti modal yopiladi va Bosh sahifaga o'tiladi
      const postTitle = data.title.trim();
      const confirmedPoint = { ...locationPoint };
      const fileToUpload = selectedMediaFile || selectedMediaUrl;
      // The publish takes over the running preparation, so resetting the form
      // below does not cancel it.
      const videoPrep = mediaType === 'video' && selectedMediaFile
        ? (prepRef.current?.source === selectedMediaFile ? prepRef.current : startVideoPrep(selectedMediaFile))
        : null;
      prepRef.current = null;
      setVideoPrepInfo(null);
      const previewMediaUrl = selectedMediaUrl;
      const posterToUpload = selectedPosterUrl;
      const mediaTypeToUpload = mediaType;
      const mediaContentTypeToUpload = mediaContentType;
      const currentUserId = currentUser.id;
      const currentUserAvatar = currentUser.avatar || '';
      const sellerName = currentUser.businessName?.trim() || currentUser.name.trim() || currentUser.handle;
      // The region is added only when the place name does not already name one.
      const location = regionFromPlace(data.location)
        ? data.location.trim()
        : `${data.location.trim()}, ${selectedRegion}`;
      const expiresAt = durationDays
        ? new Date(now + durationDays * 24 * 60 * 60 * 1000).toISOString()
        : null;

      // Instantly close modal, switch tab to home feed & show top progress bar
      setCreateModalOpen(false);
      setActiveTab('home');
      setUploadingPostStatus({ isUploading: true, title: postTitle });

      // Reset form and draft
      clearDraft();
      reset({
        title: '',
        category: '',
        price: '',
        minOrder: '',
        location: '',
        phone: '+998 ',
        telegram: '',
        condition: '',
        description: '',
      });
      setStep(1);
      setSelectedMediaFile(null);
      setSelectedMediaUrl('');
      setSelectedPosterUrl('');
      setMediaType('image');
      setMediaContentType('image/jpeg');
      setSelectedRegion(DEFAULT_REGION);
      setLocationPoint(null);
      setDurationDays(30);

      // Background upload process
      let uploadedMediaUrl = '';
      let uploadedPosterUrl = '';
      try {
        let mediaToUpload: string | File = fileToUpload;
        let contentType = mediaContentTypeToUpload;
        if (videoPrep) {
          let shownPercent = -1;
          const showPreparing = (share: number) => {
            const percent = Math.floor(share * 100);
            if (percent === shownPercent) return;
            shownPercent = percent;
            setUploadingPostStatus({ isUploading: true, title: postTitle, stage: 'preparing', progress: share });
          };
          showPreparing(videoPrep.progress);
          videoPrep.onProgress = showPreparing;
          const ready = await videoPrep.result;
          videoPrep.onProgress = null;
          if (ready !== videoPrep.source) {
            mediaToUpload = ready;
            contentType = 'video/mp4';
          } else if (ready.size > MEDIA_MAX_SIZE_MB * 1024 * 1024) {
            throw new Error(`Video ${MEDIA_MAX_SIZE_MB} MB dan katta va bu telefonda uni kichraytirib bo'lmadi. Qisqaroq video tanlang.`);
          }
        }

        let extension = 'jpg';
        if (mediaTypeToUpload === 'video') {
          extension = contentType.includes('webm')
            ? 'webm'
            : contentType.includes('quicktime')
              ? 'mov'
              : 'mp4';
        } else {
          extension = contentType.includes('png') ? 'png' : contentType.includes('webp') ? 'webp' : 'jpg';
        }
        let shownUploadPercent = -1;
        setUploadingPostStatus({ isUploading: true, title: postTitle, stage: 'uploading', progress: 0 });
        const mediaUrl = await uploadListingMedia(
          mediaToUpload,
          `${currentUserId}/${now}-media.${extension}`,
          contentType,
          (share) => {
            const percent = Math.floor(share * 100);
            if (percent === shownUploadPercent) return;
            shownUploadPercent = percent;
            setUploadingPostStatus({ isUploading: true, title: postTitle, stage: 'uploading', progress: share });
          }
        );
        uploadedMediaUrl = mediaUrl;
        const posterUrl = posterToUpload
          ? await uploadListingMedia(posterToUpload, `${currentUserId}/${now}-poster.jpg`, 'image/jpeg')
          : undefined;
        uploadedPosterUrl = posterUrl || '';

        await addPost({
          id: `post-${now}`,
          userId: currentUserId,
          sellerId: currentUserId,
          sellerName,
          sellerAvatar: currentUserAvatar,
          verified: false,
          location,
          latitude: confirmedPoint.latitude,
          longitude: confirmedPoint.longitude,
          phone: data.phone,
          telegram: data.telegram?.trim() || undefined,
          title: postTitle,
          category: data.category,
          categoryName: categoryObj?.name || 'Boshqa',
          // A bare number gets the currency, so the feed never shows just "7,000".
          price: /[a-zA-ZЀ-ӿ]/.test(data.price) ? data.price.trim() : `${data.price.trim()} so'm`,
          numericPrice,
          minOrder: data.minOrder.trim(),
          type: mediaTypeToUpload,
          mediaUrl,
          posterUrl,
          likesCount: 0,
          commentsCount: 0,
          viewsCount: 0,
          isLiked: false,
          isSaved: false,
          date: 'Hozirgina',
          condition: data.condition?.trim(),
          description: data.description?.trim() || undefined,
          expiresAt,
        });

        // Upload finished successfully
        setUploadingPostStatus({ isUploading: false, isSuccess: true, title: postTitle });
        showToast("E'lon muvaffaqiyatli nashr qilindi! ✨");

        // Hide success progress bar after 3 seconds
        setTimeout(() => {
          setUploadingPostStatus(null);
        }, 3500);
      } catch (error: unknown) {
        // If media reached Storage but post creation (or poster upload) failed,
        // remove the orphaned objects so the profile/storage does not fill up.
        if (uploadedPosterUrl) void deleteListingMedia(uploadedPosterUrl);
        if (uploadedMediaUrl) void deleteListingMedia(uploadedMediaUrl);
        const message = error instanceof Error ? error.message : '';
        setUploadingPostStatus({
          isUploading: false,
          error: message || "E'lon joylanmadi. Aloqani tekshiring.",
        });
        showToast(
          message
            ? `E'lon saqlanmadi: ${message}`
            : "E'lon saqlanmadi. Internet aloqasi va server sozlamalarini tekshirib qayta urinib ko'ring."
        );
      } finally {
        if (previewMediaUrl.startsWith('blob:')) {
          URL.revokeObjectURL(previewMediaUrl);
        }
        setIsPublishing(false);
      }
    },
    [
      addPost,
      categories,
      currentUser,
      durationDays,
      isPublishing,
      locationPoint,
      mediaContentType,
      mediaType,
      reset,
      selectedMediaFile,
      selectedMediaUrl,
      selectedPosterUrl,
      selectedRegion,
      setActiveTab,
      setCreateModalOpen,
      setUploadingPostStatus,
      showToast,
      startVideoPrep,
    ]
  );

  // ── Submit: maydonlarni qo'lda tekshirish ──
  const onSubmit = useCallback(() => {
    // Ikki marta bosishdan himoya
    if (isPublishing) return;

    const values = getValues();

    // Qaysi maydon bo'sh ekanini aniqlash
    const missing: string[] = [];
    if (!selectedMediaUrl) missing.push('Rasm yoki video');
    if (!values.title || values.title.trim().length < 5) missing.push('Sarlavha (kamida 5 belgi)');
    if (!values.category) missing.push('Kategoriya');
    if (!hasPriceAmount(values.price)) missing.push('Narx');
    if (!values.minOrder || values.minOrder.trim().length < 1) missing.push('Min. buyurtma');
    if (!values.location || values.location.trim().length < 2) missing.push('Joylashuv');
    if (!hasCoordinates(locationPoint)) missing.push('Xaritadagi joylashuv');
    if (!values.phone || !isPhoneComplete(values.phone)) missing.push('Telefon raqami');

    if (missing.length > 0) {
      showToast(`To'ldirilmagan: ${missing.join(', ')}`);
      return;
    }

    void handlePublish(values as PostFormData);
  }, [getValues, handlePublish, isPublishing, locationPoint, selectedMediaUrl, showToast]);

  return {
    isCreateModalOpen,
    step,
    formValues,
    errors,
    register,
    setValue,
    selectedMediaUrl,
    selectedPosterUrl,
    mediaType,
    videoPrepInfo,
    selectedRegion,
    setSelectedRegion,
    durationDays,
    setDurationDays,
    isDetectingLocation,
    locationPoint,
    setLocationPoint: handleLocationPointChange,
    isPublishing,
    fileInputRef,
    cameraInputRef,
    handleFileChange,
    removeMedia,
    handlePriceChange,
    handlePriceUnit,
    priceAmount,
    priceUnit,
    handlePhoneChange,
    handleCategorySelect,
    handleDetectLocation,
    canGoNext,
    goNext,
    goPrev,
    onSubmit,
    handleClose: () => {
      if (isPublishing) return;
      removeMedia();
      setCreateModalOpen(false);
    },
    openGallery: () => fileInputRef.current?.click(),
    openCamera: () => cameraInputRef.current?.click(),
    mediaMode,
    setMediaMode,
  };
}
