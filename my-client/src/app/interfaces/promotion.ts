import { IPromotionCondition } from "./promotion-condition";
import { IVoucherConfig } from "./voucher-config";

export interface IPromotion {
    _id?: string;
    code: string;
    name: string;
    description?: string;
    status: 'active' | 'inactive';
    promotionType: 'order' | 'product';
    promotionMethod:
    | 'discountOrder'
    | 'giftOrder'
    | 'buyXGetY'
    | 'quantityDiscount';
    conditions: IPromotionCondition[];
    startDate: Date;
    endDate: Date;
    applyBirthday?: boolean;
    dayOfMonth?: number[];
    startHour?: string;
    endHour?: string;
    voucher?: IVoucherConfig;
    notCombineOther?: boolean;
    createdAt?: Date;
    updatedAt?: Date;
}