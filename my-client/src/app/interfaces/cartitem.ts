export interface ICartItem {
  id: string;        // đổi từ number sang string
  name: string;
  size: string;
  color: string;
  quantity: number;
  image: string;
  originalPrice: number;
  finalPrice: number;
  appliedPromotion: string | null;
}