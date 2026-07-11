import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router'; 
import { CartService, CartTotals, VoucherList } from '../../services/cart';
import { ProductService } from '../../services/product';
import { Observable, map, BehaviorSubject, combineLatest, take } from 'rxjs'; 
import { Breadcrumb } from '../breadcrumb/breadcrumb';
import { IProduct } from '../../interfaces/product';
import { ICartItem } from '../../interfaces/cartitem';
import { IVoucher } from '../../interfaces/voucher';
import { Product } from '../product/product';

interface SelectableCartItem extends ICartItem {
    isSelected: boolean;
}

@Component({
  selector: 'app-cart',
  standalone: true,
  imports: [CommonModule, RouterLink, Breadcrumb, Product], 
  templateUrl: './cart.html',
  styleUrl: './cart.css'
})
export class CartComponent implements OnInit {

    selectableCartItems$: Observable<SelectableCartItem[]>; 
    totals$: Observable<CartTotals>;
    recommendations$: Observable<IProduct[]>;
    voucherList$: Observable<VoucherList>;
    appliedVoucher$: Observable<IVoucher | null>;
    allSelected$: Observable<boolean>; 

    private itemSelections = new BehaviorSubject<{ [key: string]: boolean }>({}); 

    constructor(
        private cartService: CartService,
        private productService: ProductService, 
        private router: Router
    ) {
        this.totals$ = this.cartService.totals$;
        this.appliedVoucher$ = this.cartService.appliedVoucher;
        this.voucherList$ = this.cartService.voucherList$;
        this.recommendations$ = this.productService.getProducts().pipe(
            map((res: any[]) => {
                return res
                    .filter(p => p !== null)
                    .sort(() => 0.5 - Math.random())
                    .slice(0, 8);
            })
        );

        this.selectableCartItems$ = combineLatest([
            this.cartService.processedCartItems$,
            this.itemSelections
        ]).pipe(
            map(([items, selections]) => {
                const isInitialLoad = Object.keys(selections).length === 0;
                return items.map(item => {
                    const key = this.getItemKey(item.id, item.size, item.color);
                    return {
                        ...item,
                        isSelected: isInitialLoad ? true : (selections[key] !== false) 
                    };
                });
            }),
        );
        
        this.selectableCartItems$.subscribe(items => {
            const selectedItems = items
                .filter(item => item.isSelected) 
                .map(item => ({ 
                    id: item.id,
                    name: item.name,
                    size: item.size,
                    color: item.color, 
                    quantity: item.quantity,
                    image: item.image,
                    originalPrice: item.originalPrice,
                    finalPrice: item.finalPrice,
                    appliedPromotion: item.appliedPromotion
                }) as ICartItem);
                
            this.cartService.updateSelectedItems(selectedItems); 
        });

        this.allSelected$ = this.selectableCartItems$.pipe(
            map(items => items.length > 0 && items.every(item => item.isSelected))
        );
    }

    ngOnInit(): void { 
      this.itemSelections.next(this.itemSelections.getValue());
    }

    private getItemKey(itemId: string, size: string, color: string): string {
      return `${itemId}-${size}-${color}`;
    }

    toggleSelection(itemId: string, size: string, color: string, event: Event): void {
      const checked = (event.target as HTMLInputElement).checked;
      const key = this.getItemKey(itemId, size, color);
      const currentSelections = this.itemSelections.getValue();
      this.itemSelections.next({ ...currentSelections, [key]: checked });
    }

    updateQuantity(itemId: string, size: string, color: string, newQuantity: number): void {
      this.cartService.updateQuantity(itemId, size, color, newQuantity);
    }

    removeItem(itemId: string, size: string, color: string): void {
      this.cartService.removeItem(itemId, size, color);
    }

    goToProductDetail(productId: string): void {
      this.router.navigate(['/productdetail', productId]);
    }
    
    toggleSelectAll(event: Event): void {
        const isChecked = (event.target as HTMLInputElement).checked;
        this.selectableCartItems$.pipe(take(1)).subscribe(items => {
            const newSelections: { [key: string]: boolean } = {};
            for (const item of items) {
                const key = this.getItemKey(item.id, item.size, item.color);
                newSelections[key] = isChecked;
            }
            this.itemSelections.next(newSelections);
        });
    }

    selectVoucher(code: string): void {
        const result = this.cartService.applyVoucher(code);
        if (!result.success) {
            alert(result.message);
        }
    }

    removeVoucher(): void {
        this.cartService.removeVoucher();
    }

    applyDiscountFromInput(inputElement: HTMLInputElement): void {
        const code = inputElement.value;
        const result = this.cartService.applyVoucher(code); 
        if (result.success) {
            inputElement.value = '';
        } else {
            alert(result.message);
        }
    }
}