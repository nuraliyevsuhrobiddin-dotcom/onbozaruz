/**
 * Product reviews repository.
 *
 * Only place that knows how to fetch/create product reviews.
 * Consumers (store/views) depend on this interface, never on http internals.
 */
import { api } from '../http';
import { CreateProductReviewInput, ProductReview } from '../types';

export const productReviewsRepository = {
  /** GET /product_reviews?productId=eq.X */
  list: (productId: string) =>
    api.get<ProductReview[]>('/product_reviews', { params: { productId } }),

  /** POST /product_reviews */
  create: (input: CreateProductReviewInput) =>
    api.post<ProductReview>('/product_reviews', input),
};
