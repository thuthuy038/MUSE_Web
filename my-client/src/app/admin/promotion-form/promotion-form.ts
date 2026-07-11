import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { PromotionService } from '../../services/promotion';
import { ProductService } from '../../services/product';
import { VoucherService } from '../../services/voucher';

@Component({
  selector: 'app-promotion-form',
  imports: [CommonModule, FormsModule],
  templateUrl: './promotion-form.html',
  styleUrl: './promotion-form.css',
})
export class PromotionForm {

  promotionType = 'order';
  promotionMethod = '';
  promotionId: string | null = null;
  promotion: any = {};

  conditions: any[] = [];

  showProductPopup = false;
  products: any[] = [];
  keyword = '';

  selectedConditionIndex = 0;
  selectedField = '';

  voucherConfig = {
    quantity: 0,
    prefix: '',
    suffix: ''
  };

  vouchers: any[] = [];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private promotionService: PromotionService,
    private productService: ProductService,
    private voucherService: VoucherService
  ) { }

  ngOnInit() {
    this.promotionId = this.route.snapshot.paramMap.get('id');

    if (this.promotionId) {
      this.loadPromotion();
    } else {
      this.initConditions();
      this.onChangePromotionType();
    }
  }

  /* ================= LOAD ================= */

  loadPromotion() {
    this.promotionService.getPromotionById(this.promotionId!)
      .subscribe({
        next: (res: any) => {

          this.promotion = res;

          this.promotionType = res.promotionType;
          this.promotionMethod = res.promotionMethod;
          this.conditions = res.conditions || [];

          this.promotion.startDate = res.startDate?.substring(0, 10);
          this.promotion.endDate = res.endDate?.substring(0, 10);

          this.loadVouchers();
        },
        error: () => alert('Không tải được chương trình')
      });
  }

  loadVouchers() {
    //  Đảm bảo có promotionId
    if (!this.promotionId) {
      console.log('Chưa có promotionId, không thể load voucher');
      this.vouchers = [];
      return;
    }

    this.voucherService.getByPromotion(this.promotionId)
      .subscribe({
        next: (res: any) => {
          this.vouchers = res;
          console.log('Đã tải voucher:', this.vouchers);
        },
        error: (err) => {
          console.error('Lỗi tải voucher:', err);
          this.vouchers = [];
        }
      });
  }

  /* ================= CONDITIONS ================= */

  onChangePromotionType() {
    this.promotionMethod =
      this.promotionType === 'order'
        ? 'discountOrder'
        : 'buyXGetY';

    this.initConditions();
  }

  onChangeMethod() {
    this.initConditions();
  }

  initConditions() {
    this.conditions = [this.createCondition()];
  }

  createCondition() {
    return {
      minOrderValue: 0,
      discountValue: 0,
      discountType: 'vnd',
      giftProduct: null,
      buyProduct: null,
      quantity: 1
    };
  }

  addCondition() {
    this.conditions.push(this.createCondition());
  }

  removeCondition(index: number) {
    if (confirm('Bạn có chắc muốn xóa?')) {
      this.conditions.splice(index, 1);
      alert('Đã xóa!');
    }
  }

  /* ================= PRODUCT POPUP ================= */

  openProductPopup(index: number, field: string) {
    this.selectedConditionIndex = index;
    this.selectedField = field;
    this.showProductPopup = true;
    this.loadProducts();
  }

  loadProducts() {
    this.productService.getProducts().subscribe({
      next: (res: any) => this.products = res
    });
  }

  filteredProducts() {
    return this.products.filter(p =>
      p.name.toLowerCase().includes(this.keyword.toLowerCase())
    );
  }

  selectProduct(product: any) {
    this.conditions[this.selectedConditionIndex][this.selectedField] = product;
    this.showProductPopup = false;
  }

  closePopup() {
    this.showProductPopup = false;
  }

  /* ================= SAVE ================= */

  savePromotion() {

    console.log("CLICK SAVE");

    if (!this.promotion.name) {
      alert('Vui lòng nhập tên chương trình');
      return;
    }

    if (!this.promotion.startDate || !this.promotion.endDate) {
      alert('Vui lòng chọn ngày');
      return;
    }

    const data = {
      ...this.promotion,

      promotionType: this.promotionType,
      promotionMethod: this.promotionMethod,

      startDate: new Date(this.promotion.startDate),
      endDate: new Date(this.promotion.endDate),

      conditions: this.conditions.map(c => ({
        minOrderValue: Number(c.minOrderValue),

        discountValue: Number(c.discountValue),
        discountType: c.discountType || 'vnd',

        giftProductId: c.giftProduct?._id || null,
        giftQuantity: Number(c.quantity) || 0,

        buyProductId: c.buyProduct?._id || null,
        buyQuantity: Number(c.quantity) || 0
      })),

      voucher: this.voucherConfig
    };

    console.log("DATA:", data);

    if (this.promotionId) {
      // UPDATE
      this.promotionService.updatePromotion(this.promotionId, data)
        .subscribe({
          next: () => {
            alert('Cập nhật thành công');
            this.loadVouchers();
          },
          error: (err) => {
            console.error(err);
            alert(err.error?.message || 'Lỗi server');
          }
        });

    } else {

      this.promotionService.createPromotion(data)
        .subscribe({
          next: (res: any) => {
            alert('Tạo thành công');

            if (res && res._id) {
              this.promotionId = res._id;
              this.loadVouchers();
            } else if (res && res.data && res.data._id) {
              this.promotionId = res.data._id;
              this.loadVouchers();
            }
          },
          error: (err) => {
            console.error("UPDATE ERROR", err);
            alert(err.error?.message || 'Lỗi server');
          }
        });
    }
  }

  cancel() {
    this.router.navigate(['/admin/promotion-management']);
  }
}