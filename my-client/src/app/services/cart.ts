import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, map, Observable, combineLatest } from 'rxjs';
import { IProduct } from '../interfaces/product';
import { IVoucher } from '../interfaces/voucher';
import { ICartItem } from '../interfaces/cartitem';
import { AuthService } from './auth';

export interface CartTotals {
  subtotal: number;
  selectedSubtotal: number;
  discountAmount: number;
  discountPercentage: number;
  shippingFee: number;
  total: number;
  freeshipThreshold: number;
  remainingForFreeship: number;
  freeshipProgress: number;
}

export interface VoucherList {
  eligible: IVoucher[];
  ineligible: IVoucher[];
}

export interface ItemPromotion {
  promotionId: string;
  description: string;
  productId: string;
  minQuantity?: number;
  type: "percent" | "fixed";
  value: number;
}

const DEFAULT_SHIPPING_FEE = 30000;
const FREESHIP_THRESHOLD = 500000;

@Injectable({
  providedIn: 'root'
})
export class CartService {

  private cartItems$ = new BehaviorSubject<ICartItem[]>([]);
  private appliedVoucher$ = new BehaviorSubject<IVoucher | null>(null);
  private allVouchers$ = new BehaviorSubject<IVoucher[]>([]);
  private allPromotions$ = new BehaviorSubject<ItemPromotion[]>([]);
  private selectedCartItems$ = new BehaviorSubject<ICartItem[]>([]);
  private promotionMessages$ = new BehaviorSubject<string[]>([]);

  private apiUrl = 'http://localhost:3000/api/cart';

  public cartItems = this.cartItems$.asObservable();
  public appliedVoucher = this.appliedVoucher$.asObservable();
  public promotionMessages = this.promotionMessages$.asObservable();

  public processedCartItems$: Observable<ICartItem[]> = combineLatest([
    this.cartItems$,
    this.allPromotions$
  ]).pipe(
    map(([items, promotions]) => this.applyItemPromotions(items, promotions))
  );


  public processedSelectedItems$: Observable<ICartItem[]> = combineLatest([
    this.selectedCartItems$,
    this.allPromotions$
  ]).pipe(
    map(([items, promotions]) => this.applyItemPromotions(items, promotions))
  );

  public selectableCartItems$ = combineLatest([
    this.processedCartItems$,
    this.selectedCartItems$
  ]).pipe(
    map(([all, selected]) => {
      return all.map(item => ({
        ...item,
        isSelected: selected.some(s => s.id === item.id && s.size === item.size && s.color === item.color)
      }));
    })
  );

  public allSelected$ = combineLatest([
    this.cartItems$,
    this.selectedCartItems$
  ]).pipe(
    map(([all, selected]) => all.length > 0 && all.length === selected.length)
  );

  // 🔥 LOGIC SẮP XẾP VOUCHER HỜI NHẤT LÊN ĐẦU
  public voucherList$: Observable<VoucherList> = combineLatest([
    this.allVouchers$,
    this.processedSelectedItems$
  ]).pipe(
    map(([vouchers, processedSelectedItems]) => {
      const selectedSubtotal = processedSelectedItems.reduce((sum, item) => sum + (item.finalPrice * item.quantity), 0);
      const eligible: IVoucher[] = [];
      const ineligible: IVoucher[] = [];

      const getDiscountVal = (v: any) => {
        const cond = v.promotionId?.conditions?.[0];
        if (!cond) return 0;
        return cond.discountType === 'percent'
          ? selectedSubtotal * (cond.discountValue / 100)
          : (cond.discountValue || 0);
      };

      vouchers.forEach(voucher => {
        const v: any = voucher;
        const minSpend = v.promotionId?.conditions?.[0]?.minOrderValue || 0;
        if (selectedSubtotal >= minSpend) eligible.push(voucher);
        else ineligible.push(voucher);
      });

      // Sắp xếp giảm nhiều nhất lên trên cùng
      eligible.sort((a, b) => getDiscountVal(b) - getDiscountVal(a));

      return { eligible, ineligible };
    })
  );

  public totals$: Observable<CartTotals> = combineLatest([
    this.processedCartItems$,
    this.processedSelectedItems$,
    this.appliedVoucher$
  ]).pipe(
    map(([processedItems, processedSelectedItems, voucher]) => {
      const subtotal = processedItems.reduce((sum, item) => sum + (item.finalPrice * item.quantity), 0);
      const selectedSubtotal = processedSelectedItems.reduce((sum, item) => sum + (item.finalPrice * item.quantity), 0);
      let discountAmount = 0;
      let discountPercentage = 0;

      if (voucher) {
        const v: any = voucher;
        const cond = v.promotionId?.conditions?.[0];
        const minSpend = cond?.minOrderValue || 0;

        if (selectedSubtotal >= minSpend) {
          const vType = cond?.discountType;
          const vValue = cond?.discountValue;

          if (vType === 'percent') {
            discountAmount = selectedSubtotal * (vValue / 100);
            discountPercentage = vValue;
          } else {
            discountAmount = vValue || 0;
            discountPercentage = Math.round((discountAmount / selectedSubtotal) * 100) || 0;
          }
        }
      }

      const shippingFee = (selectedSubtotal >= FREESHIP_THRESHOLD || selectedSubtotal === 0) ? 0 : DEFAULT_SHIPPING_FEE;
      const total = selectedSubtotal - discountAmount + shippingFee;

      return {
        subtotal, selectedSubtotal, discountAmount, discountPercentage, shippingFee, total,
        freeshipThreshold: FREESHIP_THRESHOLD,
        remainingForFreeship: Math.max(0, FREESHIP_THRESHOLD - selectedSubtotal),
        freeshipProgress: Math.min(100, (selectedSubtotal / FREESHIP_THRESHOLD) * 100)
      };
    })
  );

  constructor(private http: HttpClient, private authService: AuthService) {
    this.loadCartFromDb();
  }

  loadCartFromDb() {
    const userId = this.authService.getUserId();
    if (!userId) {
      this.cartItems$.next([]);
      return;
    }
    this.http.get<any>(`${this.apiUrl}/${userId}`).subscribe(res => {
      if (res) {
        const items = res.items || (res.cart && res.cart.items) || [];
        const mappedItems = items.map((item: any) => ({
          ...item,
          id: item.productId,
          finalPrice: item.price,
          originalPrice: item.price
        }));
        this.cartItems$.next(mappedItems);
        this.allVouchers$.next(res.eligibleVouchers || []);
        this.promotionMessages$.next(res.promotionMessages || []);
      }
    });
  }

  addProductToCart(product: IProduct, size: string, color: string, quantity: number): void {
    const price = product.discountPercent > 0 ? (product.price * (1 - product.discountPercent / 100)) : product.price;
    const cartData = {
      userId: this.authService.getUserId(),
      productId: product._id,
      name: product.name,
      image: product.images[0],
      size, color, quantity, price
    };
    this.http.post(`${this.apiUrl}/add`, cartData).subscribe(() => this.loadCartFromDb());
  }

  updateQuantity(itemId: string, size: string, color: string, newQuantity: number): void {
    if (newQuantity < 1) { this.removeItem(itemId, size, color); return; }
    const item = this.cartItems$.getValue().find(i => i.id === itemId && i.size === size && i.color === color);
    if (item) {
      const updateData = {
        userId: this.authService.getUserId(),
        productId: itemId,
        size, color,
        quantity: newQuantity - item.quantity,
        price: item.originalPrice,
        name: item.name,
        image: item.image
      };
      this.http.post(`${this.apiUrl}/add`, updateData).subscribe(() => this.loadCartFromDb());
    }
  }

  removeItem(itemId: string, size: string, color: string): void {
    const userId = this.authService.getUserId();
    if (!userId) return;
    this.http.delete(`${this.apiUrl}/remove/${userId}/${itemId}/${size}/${color}`).subscribe(() => {
      this.loadCartFromDb();
      const updatedSelected = this.selectedCartItems$.getValue().filter(item => !(item.id === itemId && item.size === size && item.color === color));
      this.selectedCartItems$.next(updatedSelected);
    });
  }

  removePaidItems(): void {
    const selectedItems = this.selectedCartItems$.getValue();
    selectedItems.forEach(item => this.removeItem(item.id, item.size, item.color));
    this.selectedCartItems$.next([]);
    this.appliedVoucher$.next(null);
  }


  private applyItemPromotions(items: ICartItem[], promotions: ItemPromotion[]): ICartItem[] {
    return items.map(item => {
      const promotion = promotions.find(p => p.productId === item.id);
      let finalPrice = item.originalPrice;
      let appliedPromotion: string | null = null;
      if (promotion) {
        const meetsMinQuantity = promotion.minQuantity ? item.quantity >= promotion.minQuantity : true;
        if (meetsMinQuantity) {
          if (promotion.type === 'percent') finalPrice = item.originalPrice * (1 - promotion.value);
          else if (promotion.type === 'fixed') finalPrice = Math.max(0, item.originalPrice - promotion.value);
          appliedPromotion = promotion.description;
        }
      }
      return { ...item, finalPrice, appliedPromotion };
    });
  }


  applyVoucher(code: string): { success: boolean, message: string } {
    const codeUpper = code.trim().toUpperCase();
    const voucher = this.allVouchers$.getValue().find(v => v.code === codeUpper);
    if (!voucher) return { success: false, message: 'Mã không tồn tại hoặc không hợp lệ.' };

    this.appliedVoucher$.next(voucher);
    return { success: true, message: `Áp dụng thành công!` };
  }

  removeVoucher(): void {
    this.appliedVoucher$.next(null);
  }

  toggleSelection(itemId: string, size: string, color: string, event: any): void {
    const isChecked = event.target.checked;
    const currentSelected = this.selectedCartItems$.getValue();
    if (isChecked) {
      const item = this.cartItems$.getValue().find(i => i.id === itemId && i.size === size && i.color === color);
      if (item) this.selectedCartItems$.next([...currentSelected, item]);
    } else {
      this.selectedCartItems$.next(currentSelected.filter(i => !(i.id === itemId && i.size === size && i.color === color)));
    }
  }

  toggleSelectAll(event: any): void {
    const isChecked = event.target.checked;
    this.selectedCartItems$.next(isChecked ? this.cartItems$.getValue() : []);
  }


  // Thêm hàm này vào file cart.ts (Service)
  updateSelectedItems(items: ICartItem[]): void {
    this.selectedCartItems$.next(items);
  }
}