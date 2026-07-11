import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterLink, RouterModule } from '@angular/router';
import { IProduct, IVariant } from '../../interfaces/product';
import { ProductService } from '../../services/product';
import { CommonModule } from '@angular/common';
import { CartService } from '../../services/cart';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { Product } from '../product/product';
import { ReviewService } from '../../services/review';
import { SafeHtmlPipe } from '../../pipes/safe-html.pipe';

@Component({
  selector: 'app-product-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterModule, HttpClientModule, Product, SafeHtmlPipe],
  templateUrl: './product-detail.html',
  styleUrls: ['./product-detail.css']
})
export class ProductDetail implements OnInit {

  product!: IProduct;

  images: string[] = [];
  colors: string[] = [];
  sizes: string[] = [];

  selectedImage: string = '';
  selectedColor: string = '';
  selectedSize: string = '';

  quantity: number = 1;

  relatedProducts: IProduct[] = [];

  lookbookProducts: any[] = [];

  reviews: any[] = [];
  reviewLoading: boolean = false;
  reviewStats = {
    total: 0,
    average: 0,
    distribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 } as Record<number, number>
  };

  reviewFilter: string = 'all';
  filteredReviews: any[] = [];

  displayLimit: number = 5;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private productService: ProductService,
    private cartService: CartService,
    private reviewService: ReviewService,
    private http: HttpClient
  ) { }

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (id) {
        this.loadProduct(id);
        this.loadReviews(id);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    });
  }

  loadProduct(id: string) {
    this.productService.getProductById(id).subscribe((res: any) => {
      this.product = {
        ...res,
        images: res.images?.map((img: any) =>
         `https://server-testing-ymn9.onrender.com${img.url}`
        ) || []
      };

      this.images = this.product.images;
      this.colors = [...new Set(this.product.variants.map((v: IVariant) => v.color))];
      this.sizes = [...new Set(this.product.variants.map((v: IVariant) => v.size))];

      this.selectedImage = this.images[0];
      this.selectedColor = this.colors[0];
      this.selectedSize = this.sizes[0];

      this.loadLookbook(id);

      this.loadRelatedProducts();
    });
  }
  // Mở ảnh lớn
  openImageModal(imageUrl: string) {
    // Có thể tạo modal hoặc mở tab mới
   window.open('https://server-testing-ymn9.onrender.com' + imageUrl, '_blank');
  }
  loadLookbook(productId: string) {
    // Gọi đúng địa chỉ api/lookbook/recommend
   this.http.get<any>(`https://server-testing-ymn9.onrender.com/api/lookbook/recommend/${productId}`)
      .subscribe({
        next: (res) => {
          console.log('Dữ liệu từ API Lookbook:', res);

          // Kiểm tra đúng cấu trúc res.matchingItems
          if (res && res.matchingItems && res.matchingItems.length > 0) {
            this.lookbookProducts = res.matchingItems.map((p: any) => {

              // 1. Phải gán đúng tên displayImage để HTML hiển thị được ảnh
              const imgUrl = (p.images && p.images.length > 0)
               ? `https://server-testing-ymn9.onrender.com${p.images[0].url}`
                : 'assets/images/no-image.png';

              // 2. Phải tính discountPrice để HTML hiển thị được giá giảm
              const finalPrice = p.discountPercent > 0
                ? p.price * (1 - p.discountPercent / 100)
                : p.price;

              return {
                ...p,
                displayImage: imgUrl,      // <--- Biến này cực quan trọng cho HTML
                discountPrice: finalPrice  // <--- Biến này cực quan trọng cho HTML
              };
            });
            console.log('Danh sách phối đồ sau khi xử lý:', this.lookbookProducts);
          } else {
            this.lookbookProducts = [];
          }
        },
        error: (err) => {
          console.error('Lỗi gọi API Lookbook:', err);
          this.lookbookProducts = [];
        }
      });
  }

  loadReviews(productId: string) {
    this.reviewLoading = true;
    this.reviewService.getReviewsByProduct(productId).subscribe({
      next: (res: any) => {
        console.log('Reviews từ API:', res);

        // Xử lý dữ liệu reviews
        let reviewsData = [];
        if (res && res.data) {
          reviewsData = res.data;
        } else if (Array.isArray(res)) {
          reviewsData = res;
        } else if (res && res.reviews) {
          reviewsData = res.reviews;
        } else {
          reviewsData = [];
        }

        this.reviews = reviewsData;
        this.calculateReviewStats();
        this.applyReviewFilter();
        this.reviewLoading = false;
      },
      error: (err) => {
        console.error('Lỗi load reviews:', err);
        this.reviews = [];
        this.reviewLoading = false;
      }
    });
  }

  loadMoreReviews() {
    this.displayLimit += 5;
  }

  // ✅ THÊM: Tính toán thống kê đánh giá
  calculateReviewStats() {
    this.reviewStats.total = this.reviews.length;

    if (this.reviews.length === 0) {
      this.reviewStats.average = 0;
      this.reviewStats.distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
      return;
    }

    const sum = this.reviews.reduce((acc, r) => acc + (r.rating || 0), 0);
    this.reviewStats.average = sum / this.reviews.length;

    // Tính phân bố số sao
    this.reviewStats.distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    this.reviews.forEach(r => {
      const rating = Math.floor(r.rating || 0);
      if (rating >= 1 && rating <= 5) {
        this.reviewStats.distribution[rating as keyof typeof this.reviewStats.distribution]++;
      }
    });
  }

  applyReviewFilter() {
    if (this.reviewFilter === 'all') {
      this.filteredReviews = [...this.reviews];
    } else if (this.reviewFilter === 'photo') {
      this.filteredReviews = this.reviews.filter(r => r.images && r.images.length > 0);
    } else {
      const rating = parseInt(this.reviewFilter);
      this.filteredReviews = this.reviews.filter(r => Math.floor(r.rating || 0) === rating);
    }
  }

  setReviewFilter(filter: string) {
    this.reviewFilter = filter;
    this.applyReviewFilter();
  }
  // Tạo mảng số nguyên để lặp trong template
  range(n: number): number[] {
    return Array(n).fill(0).map((_, i) => i);
  }

  // Làm tròn số sao để hiển thị sao đầy
  getFullStars(rating: number): number {
    return Math.floor(rating);
  }

  // Kiểm tra có nửa sao không
  hasHalfStar(rating: number): boolean {
    return rating % 1 >= 0.5;
  }

  // Số sao trống
  getEmptyStars(rating: number): number {
    const fullStars = Math.floor(rating);
    const hasHalf = rating % 1 >= 0.5;
    return 5 - fullStars - (hasHalf ? 1 : 0);
  }

  // THÊM: Lấy phần trăm cho progress bar (đã có nhưng đảm bảo)
  getRatingPercentage(rating: number): number {
    if (this.reviewStats.total === 0) return 0;
    return (this.reviewStats.distribution[rating as keyof typeof this.reviewStats.distribution] / this.reviewStats.total) * 100;
  }

  loadRelatedProducts() {
    this.productService.getProducts().subscribe((res: any[]) => {
      this.relatedProducts = res
        .filter(p =>
          p.category === this.product.category &&
          p._id !== this.product._id
        )
        .slice(0, 6); // Để nguyên object gốc, không map lại images
    });
  }

  getFinalPrice(): number {
    return this.product.price * (1 - this.product.discountPercent / 100);
  }

  getStock(): number {
    const found = this.product.variants.find((v: IVariant) =>
      v.size === this.selectedSize &&
      v.color === this.selectedColor
    );
    return found ? found.quantity : 0;
  }

  isSizeAvailable(size: string): boolean {
    return this.product.variants.some((v: IVariant) =>
      v.size === size &&
      v.color === this.selectedColor &&
      v.quantity > 0
    );
  }

  increase() {
    if (this.quantity < this.getStock()) this.quantity++;
  }

  decrease() {
    if (this.quantity > 1) this.quantity--;
  }

  addToCart() {
    if (!this.selectedSize || !this.selectedColor) {
      alert('Vui lòng chọn Size và Màu sắc sản phẩm!');
      return;
    }

    if (this.getStock() <= 0) {
      alert('Sản phẩm với lựa chọn này hiện đã hết hàng!');
      return;
    }

    // Gọi service để lưu vào BehaviorSubject
    this.cartService.addProductToCart(
      this.product,
      this.selectedSize,
      this.selectedColor,
      this.quantity
    );

    alert('Đã thêm sản phẩm vào giỏ hàng thành công!');
  }

  buyNow() {
    this.addToCart();
    this.router.navigate(['/cart']);
  }
}