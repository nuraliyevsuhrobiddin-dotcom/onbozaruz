import { useCallback, useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAgroStore } from '../../store/useAgroStore';
import { CATEGORIES, REGIONS } from '../../data/mockAgroData';
import { MEDIA_MAX_SIZE_MB } from './constants';
import { formatNumeric, formatPhone, parseNumeric } from './formatting';
import { clearDraft, draftToForm, loadDraft, saveDraft } from './createPostDraft';
import { uploadListingMedia } from '../../api/authClient';

export const postSchema = z.object({
  title: z.string().min(5, 'Kamida 5 ta belgi kiriting'),
  category: z.string().min(1, 'Kategoriyani tanlang'),
  price: z.string().min(2, 'Narxni kiriting'),
  minOrder: z.string().min(1, 'Minimal buyurtmani kiriting'),
  location: z.string().min(2, 'Joylashuvni kiriting'),
  phone: z.string().min(6, "Telefon raqamini kiriting"),
  telegram: z.string().min(2, "Telegram foydalanuvchi nomini kiriting"),
  condition: z.string().optional(),
});

export type PostFormData = z.infer<typeof postSchema>;
export type Step = 1 | 2 | 3 | 4;

const DEFAULT_REGION = REGIONS[1] || 'Toshkent sh.';

export function useCreatePostForm() {
  const { isCreateModalOpen, setCreateModalOpen, addPost, addProduct, showToast, setActiveTab, currentUser } =
    useAgroStore();
  const [step, setStep] = useState<Step>(1);
  const [selectedMediaUrl, setSelectedMediaUrl] = useState('');
  const [selectedPosterUrl, setSelectedPosterUrl] = useState('');
  const [mediaType, setMediaType] = useState<'image' | 'video'>('image');
  const [mediaContentType, setMediaContentType] = useState('image/jpeg');
  const [mediaMode, setMediaMode] = useState<'image' | 'video'>('video');
  const [selectedRegion, setSelectedRegion] = useState(DEFAULT_REGION);
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const shouldDetectLocationRef = useRef(false);
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
    },
  });

  const formValues = watch();

  // ── Draft: modal ochilganda tiklash ──
  useEffect(() => {
    if (!isCreateModalOpen) return;
    const draft = loadDraft();
    if (draft) {
      reset(draftToForm(draft));
      setSelectedRegion(draft.selectedRegion || DEFAULT_REGION);
      // Old drafts may contain base64 media. Do not restore it: it can exceed
      // browser storage limits and must be selected again for a new upload.
      setSelectedMediaUrl('');
      setMediaType(draft.mediaType || 'image');
      setMediaContentType(draft.mediaType === 'video' ? 'video/webm' : 'image/jpeg');
      setMediaMode(draft.mediaMode || draft.mediaType || 'video');
    }
    // Yangi e'lon uchun manzilni foydalanuvchi ruxsati bilan avtomatik olamiz.
    // Mavjud draftdagi qo'lda yozilgan manzilni hech qachon almashtirmaymiz.
    shouldDetectLocationRef.current = !draft?.location;
    setStep(1);
  }, [isCreateModalOpen, reset]);

  const draft = {
    title: formValues.title,
    category: formValues.category,
    price: formValues.price,
    minOrder: formValues.minOrder,
    location: formValues.location,
    phone: formValues.phone,
    telegram: formValues.telegram || '',
    condition: formValues.condition || '',
    selectedRegion,
    // Katta media fayl localStorage limitini tez to'ldiradi. Draftda faqat
    // forma qiymatlari saqlanadi; media oynani qayta ochganda qayta tanlanadi.
    mediaUrl: '',
    mediaType,
    mediaMode,
  };

  // ── Draft: o'zgarganda saqlash ──
  useEffect(() => {
    if (!isCreateModalOpen) return;
    const timeout = window.setTimeout(() => saveDraft(draft), 300);
    return () => window.clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCreateModalOpen, selectedMediaUrl, selectedRegion, mediaType, formValues]);

  // ── Media tanlash ──
  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const supportedImage = file.type.startsWith('image/');
      const supportedVideo = ['video/mp4', 'video/webm'].includes(file.type);
      const supported = supportedImage || supportedVideo;
      if (!supported) {
        showToast("Rasm yoki MP4 / WebM videoni tanlang. MOV va HEVC formatlari hamma brauzerda ishlamaydi.");
        e.target.value = '';
        return;
      }
      if (file.size > MEDIA_MAX_SIZE_MB * 1024 * 1024) {
        showToast(`Media hajmi ${MEDIA_MAX_SIZE_MB} MB dan oshmasligi kerak`);
        e.target.value = '';
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        const result = typeof reader.result === 'string' ? reader.result : '';
        if (!result) {
          showToast("Media faylni o'qib bo'lmadi");
          return;
        }
        setSelectedMediaUrl(result);
        const selectedType = file.type.startsWith('video') ? 'video' : 'image';
        setMediaType(selectedType);
        setMediaContentType(file.type || (selectedType === 'video' ? 'video/webm' : 'image/jpeg'));
        setMediaMode(selectedType);
        if (selectedType === 'video') {
          const video = document.createElement('video');
          video.src = result;
          video.muted = true;
          video.playsInline = true;
          video.onloadeddata = () => {
            const canvas = document.createElement('canvas');
            canvas.width = video.videoWidth || 360;
            canvas.height = video.videoHeight || 640;
            const context = canvas.getContext('2d');
            if (context) {
              context.drawImage(video, 0, 0, canvas.width, canvas.height);
              setSelectedPosterUrl(canvas.toDataURL('image/jpeg', 0.78));
            }
            URL.revokeObjectURL(video.src);
          };
          video.onerror = () => setSelectedPosterUrl('');
        } else {
          setSelectedPosterUrl('');
        }
      };
      reader.onerror = () => showToast("Media faylni o'qib bo'lmadi");
      reader.readAsDataURL(file);
    },
    [showToast]
  );

  const removeMedia = useCallback(() => {
    setSelectedMediaUrl('');
    setSelectedPosterUrl('');
    setMediaType('image');
    setMediaContentType('image/jpeg');
    setMediaMode('video');
  }, []);

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
    setIsDetectingLocation(true);
    try {
      const position = await getCurrentPosition();
      const { latitude, longitude } = position.coords;
      let locationLabel = `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
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
            [district, region].filter(Boolean).join(', ') || data.display_name || locationLabel;
          const matchedRegion = REGIONS.find(
            (item) =>
              item !== 'Barchasi' && locationLabel.toLowerCase().includes(item.toLowerCase())
          );
          if (matchedRegion) setSelectedRegion(matchedRegion);
        }
      } catch {
        // Koordinatalar yetarli — reverse geocoding ishlamasa ham davom etamiz.
      } finally {
        window.clearTimeout(timeout);
      }
      setValue('location', locationLabel, { shouldDirty: true, shouldValidate: true });
      showToast('Manzil avtomatik olindi');
    } catch (error) {
      const denied =
        typeof error === 'object' && error !== null && 'code' in error &&
        (error as { code?: number }).code === 1;
      showToast(
        denied
          ? 'Manzil olishga ruxsat berilmadi'
          : "Manzilni aniqlab bo'lmadi. Qayta urinib ko'ring"
      );
    } finally {
      setIsDetectingLocation(false);
    }
  }, [setValue, showToast]);

  useEffect(() => {
    if (
      !isCreateModalOpen ||
      !shouldDetectLocationRef.current ||
      isDetectingLocation ||
      formValues.location
    ) {
      return;
    }

    shouldDetectLocationRef.current = false;
    void handleDetectLocation();
  }, [formValues.location, handleDetectLocation, isCreateModalOpen, isDetectingLocation]);

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
        formValues.phone &&
        formValues.telegram?.trim().length >= 2
      );
    }
    return true;
  };

  const goNext = async () => {
    const fieldsByStep: Record<Exclude<Step, 1 | 2 | 4>, Array<keyof PostFormData>> = {
      3: ['title', 'price', 'minOrder', 'location', 'phone', 'telegram'],
    };
    if (step === 3 && !(await trigger(fieldsByStep[3]))) return;
    if (step < 4) setStep((s) => (s + 1) as Step);
  };

  const goPrev = () => {
    if (step > 1) setStep((s) => (s - 1) as Step);
  };

  const handleCategorySelect = (catId: string) => {
    setValue('category', catId, { shouldValidate: true });
  };

  // ── Nashr qilish ──
  const handlePublish = useCallback(
    async (data: PostFormData) => {
      const categoryObj = CATEGORIES.find((c) => c.id === data.category);
      const numericPrice = parseNumeric(data.price);
      const now = Date.now();
      if (!currentUser || !selectedMediaUrl) {
        showToast("E'lon uchun akkaunt va media fayl kerak");
        return;
      }
      setIsPublishing(true);

      try {
        const mediaUrl = await uploadListingMedia(
          selectedMediaUrl,
          `${currentUser.id}/${now}-media.${mediaContentType.split('/')[1] || 'bin'}`,
          mediaContentType
        );
        const posterUrl = selectedPosterUrl
          ? await uploadListingMedia(selectedPosterUrl, `${currentUser.id}/${now}-poster.jpg`, 'image/jpeg')
          : undefined;
        const location = data.location.toLowerCase().includes(selectedRegion.toLowerCase())
          ? data.location.trim()
          : `${data.location.trim()}, ${selectedRegion}`;
        const sellerName = currentUser.businessName?.trim() || currentUser.name.trim() || currentUser.handle;

        await addPost({
        id: `post-${now}`,
        sellerId: currentUser.id,
        sellerName,
        sellerAvatar: currentUser.avatar || '',
        verified: false,
        location,
        phone: data.phone,
        telegram: data.telegram?.trim() || undefined,
        title: data.title.trim(),
        category: data.category,
        categoryName: categoryObj?.name || 'Boshqa',
        price: data.price.trim(),
        numericPrice,
        minOrder: data.minOrder.trim(),
        type: mediaType,
        mediaUrl,
        posterUrl,
        likesCount: 0,
        commentsCount: 0,
        viewsCount: 0,
        isLiked: false,
        isSaved: false,
        date: 'Hozirgina',
        condition: data.condition?.trim(),
        });

      // Video uchun yaratilgan poster Market kartasida muqova sifatida ishlaydi.
      await addProduct({
        id: `prod-${now}`,
        sellerId: currentUser.id,
        submittedBy: currentUser.id,
        title: data.title.trim(),
        seller: sellerName,
        verified: false,
        category: data.category,
        price: data.price.trim(),
        numericPrice,
        image: mediaType === 'video' ? posterUrl || '/logo.png' : mediaUrl,
        images: mediaType === 'video' && posterUrl ? [posterUrl] : undefined,
        rating: 0,
        reviewsCount: 0,
        minOrder: data.minOrder.trim(),
        location,
      });

        clearDraft();
        setIsPublishing(false);
        showToast("E'lon muvaffaqiyatli nashr qilindi!");
        setCreateModalOpen(false);
        setActiveTab('home');
        reset({
          title: '',
          category: '',
          price: '',
          minOrder: '',
          location: '',
          phone: '+998 ',
          telegram: '',
          condition: '',
        });
        setStep(1);
        setSelectedMediaUrl('');
        setSelectedPosterUrl('');
        setMediaType('image');
        setMediaContentType('image/jpeg');
        setSelectedRegion(DEFAULT_REGION);
      } catch (error: unknown) {
        setIsPublishing(false);
        const message = error instanceof Error ? error.message : '';
        showToast(
          message
            ? `E'lon saqlanmadi: ${message}`
            : "E'lon saqlanmadi. Internet aloqasi va server sozlamalarini tekshirib qayta urinib ko'ring."
        );
      }
    },
    [
      addPost,
      addProduct,
      currentUser,
      mediaType,
      mediaContentType,
      reset,
      selectedMediaUrl,
      selectedPosterUrl,
      selectedRegion,
      setActiveTab,
      setCreateModalOpen,
      showToast,
    ]
  );

  // ── Submit: maydonlarni qo'lda tekshirish ──
  const onSubmit = useCallback(() => {
    const values = getValues();

    // Qaysi maydon bo'sh ekanini aniqlash
    const missing: string[] = [];
    if (!selectedMediaUrl) missing.push('Rasm yoki video');
    if (!values.title || values.title.trim().length < 5) missing.push('Sarlavha (kamida 5 belgi)');
    if (!values.category) missing.push('Kategoriya');
    if (!values.price || values.price.trim().length < 2) missing.push('Narx');
    if (!values.minOrder || values.minOrder.trim().length < 1) missing.push('Min. buyurtma');
    if (!values.location || values.location.trim().length < 2) missing.push('Joylashuv');
    if (!values.phone || values.phone.replace(/\D/g, '').length < 9) missing.push('Telefon raqami');
    if (!values.telegram || values.telegram.trim().length < 2) missing.push('Telegram');

    if (missing.length > 0) {
      showToast(`To'ldirilmagan: ${missing.join(', ')}`);
      return;
    }

    void handlePublish(values as PostFormData);
  }, [getValues, handlePublish, selectedMediaUrl, showToast]);

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
    handleClose: () => setCreateModalOpen(false),
    openGallery: () => fileInputRef.current?.click(),
    openCamera: () => cameraInputRef.current?.click(),
    mediaMode,
    setMediaMode,
  };
}
