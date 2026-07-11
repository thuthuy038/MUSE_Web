export interface IPromotionCondition {
  minOrderValue?: number;
  discountValue?: number;
  discountType?: 'vnd' | 'percent';
  buyProductId?: string;
  buyQuantity?: number;
  giftProductId?: string;
  giftQuantity?: number;
  promoPrice?: number;
}