/**
 * OnBozor API public surface.
 *
 * Yagona kirish nuqtasi. Komponentlar/store faqat shu fayldan import qilishi kerak:
 *
 *   import { postsRepository, productsRepository, emailService } from '../api';
 *
 * Real backend tayyor bo'lganda mockServer uchun hech narsa o'zgartirilmaydi —
 * faqat src/api/http.ts ichidagi USE_MOCK_API flagini o'zgartirish yetarli.
 */
export * from './types';
export { ApiTransportError } from './http';
export { postsRepository } from './repositories/postsRepository';
export { productsRepository } from './repositories/productsRepository';
export { ordersRepository } from './repositories/ordersRepository';
export { categoriesRepository } from './repositories/categoriesRepository';
export { emailService } from './emailService';
