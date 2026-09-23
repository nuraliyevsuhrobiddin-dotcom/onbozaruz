import { useCallback, useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAgroStore } from '../../store/useAgroStore';
import { REGIONS } from '../../data/mockAgroData';
import { MEDIA_MAX_SIZE_MB } from './constants';
import { formatNumeric, formatPhone, isPhoneComplete, parseNumeric } from './formatting';
import { clearDraft, createEmptyDraftValues, draftToForm, loadDraft, saveDraft } from './createPostDraft';
import { deleteListingMedia, uploadListingMedia } from '../../api/authClient';
import { hasCoordinates, type GeoPoint } from '../../utils/geo';

export const postSchema = z.object({
  title: z.string().min(5, 'Kamida 5 ta belgi kiriting'),
  category: z.string().min(1, 'Kategoriyani tanlang'),
  price: z.string().min(2, 'Narxni kiriting'),
  minOrder: z.string().min(1, 'Minimal buyurtmani kiriting'),
  location: z.string().min(2, 'Joylashuvni kiriting'),
  phone: z.string().refine(isPhoneComplete, "To'liq telefon raqamini kiriting"),
  telegram: z.string().optional(),
  condition: z.string().optional(),
  description: z.string().optional(),
});

export type PostFormData = z.infer<typeof postSchema>;
export type Step = 1 | 2 | 3 | 4;

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
  const [durationDays, setDurationDays] = useState<number | null>(30);
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [locationPoint, setLocationPoint] = useState<GeoPoint | null>(null);
  const locationRequestRef = useRef(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

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
      if (file.size > MEDIA_MAX_SIZE_MB * 1024 * 1024) {
        showToast(`Media hajmi ${MEDIA_MAX_SIZE_MB} MB dan oshmasligi kerak`);
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
            const canvas = document.createElement('canvas');
            canvas.width = Math.min(video.videoWidth, 720);
            canvas.height = Math.min(video.videoHeight, 1280);
            const ctx = canvas.getContext('2d');
            if (ctx && canvas.width > 0 && canvas.height > 0) {
              ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

              const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
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
          captureTimes = [duration * 0.15, duration * 0.35, duration * 0.60, 0.1]
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
    [mediaMode, selectedMediaUrl, showToast]
  );

  const removeMedia = useCallback(() => {
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
  }, [selectedMediaUrl]);

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
          `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}`,
          { signal: controller.signal }
        );
        if (response.ok) {
          const data = await response.json();
          const address = data.address || {};
          const district =
            address.city || address.town || address.village || address.county || address.suburb;
          const region = address.state || address.region;
          locationLabel =
            [district, region].filter(Boolean).join(', ') || data.display_name || '';
          const matchedRegion = REGIONS.find(
            (item) =>
              item !== 'Barchasi' && locationLabel.toLowerCase().includes(item.toLowerCase())
          );
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
  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setValue('price', formatNumeric(e.target.value), { shouldValidate: true });
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
        formValues.price &&
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
      const previewMediaUrl = selectedMediaUrl;
      const posterToUpload = selectedPosterUrl;
      const mediaTypeToUpload = mediaType;
      const mediaContentTypeToUpload = mediaContentType;
      const currentUserId = currentUser.id;
      const currentUserAvatar = currentUser.avatar || '';
      const sellerName = currentUser.businessName?.trim() || currentUser.name.trim() || currentUser.handle;
      const location = data.location.toLowerCase().includes(selectedRegion.toLowerCase())
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
        let extension = 'jpg';
        if (mediaTypeToUpload === 'video') {
          extension = mediaContentTypeToUpload.includes('webm')
            ? 'webm'
            : mediaContentTypeToUpload.includes('quicktime')
              ? 'mov'
              : 'mp4';
        } else {
          extension = mediaContentTypeToUpload.includes('png') ? 'png' : mediaContentTypeToUpload.includes('webp') ? 'webp' : 'jpg';
        }
        const mediaUrl = await uploadListingMedia(
          fileToUpload,
          `${currentUserId}/${now}-media.${extension}`,
          mediaContentTypeToUpload
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
          price: data.price.trim(),
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
    if (!values.price || values.price.trim().length < 2) missing.push('Narx');
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
