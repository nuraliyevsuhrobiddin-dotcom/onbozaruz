export interface AgroPurchaseRequest {
  id: string;
  userId: string;
  buyerName: string;
  title: string;
  category: string;
  variety: string;
  quantity: number;
  reservedQuantity: number;
  unit: string;
  targetPrice: number | null;
  neededBy: string;
  location: string;
  latitude: number;
  longitude: number;
  deliveryMethod: 'pickup' | 'delivery' | 'either';
  description: string;
  status: 'open' | 'closed';
  createdAt: string;
}
export type CreateAgroRequestInput = Omit<AgroPurchaseRequest, 'id' | 'userId' | 'buyerName' | 'reservedQuantity' | 'status' | 'createdAt'>;
export type AgroOfferStatus = 'proposed' | 'accepted' | 'ready' | 'delivering' | 'completed' | 'declined' | 'cancelled';
export interface AgroOfferTerms {
  quantity: number;
  unitPrice: number;
  deliveryDate: string;
  deliveryMethod: 'pickup' | 'delivery';
  message: string;
}
export interface AgroOffer extends AgroOfferTerms {
  id: string;
  requestId: string | null;
  productId: string | null;
  productName: string;
  unit: string;
  buyerUserId: string;
  sellerUserId: string;
  buyerName: string;
  sellerName: string;
  proposedBy: string;
  status: AgroOfferStatus;
  version: number;
  createdAt: string;
  updatedAt: string;
}
export type CreateAgroOfferInput = AgroOfferTerms & ({ requestId: string; productId?: never } | { productId: string; requestId?: never });
export type AgroOfferAction = 'accept' | 'decline' | 'counter' | 'ready' | 'deliver' | 'complete' | 'cancel';
