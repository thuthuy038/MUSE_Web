import { Component, OnInit } from '@angular/core';
import { CurrencyPipe, CommonModule, DecimalPipe } from '@angular/common';
import { Router } from '@angular/router';
import { WishlistService } from '../../services/wishlist';
import { IProduct } from '../../interfaces/product';

@Component({
  selector: 'app-wishlist',
  standalone: true,
  imports: [CurrencyPipe, CommonModule, DecimalPipe],
  templateUrl: './wishlist.html',
  styleUrls: ['./wishlist.css'],
})
export class Wishlist implements OnInit {
  wishlist: IProduct[] = [];
  pagedWishlist: IProduct[] = [];

  pageSize = 4;
  currentPage = 1;
  totalPages: number[] = [];

  constructor(
    private wishlistService: WishlistService,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.wishlistService.wishlist$.subscribe(products => {
      this.wishlist = products;
      this.setupPagination();
    });
  }

  private setupPagination(): void {
    const count = Math.max(1, Math.ceil(this.wishlist.length / this.pageSize));
    this.totalPages = Array.from({ length: count }, (_, i) => i + 1);
    this.applyPage();
  }

  private applyPage(): void {
    const start = (this.currentPage - 1) * this.pageSize;
    this.pagedWishlist = this.wishlist.slice(start, start + this.pageSize);
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages.length) return;
    this.currentPage = page;
    this.applyPage();
  }

  removeFromWishlist(product: IProduct): void {
    this.wishlistService.removeFromWishlist(product._id).subscribe({
      next: () => {
        // Cập nhật UI sau khi xóa thành công
        this.wishlist = this.wishlist.filter(p => p._id !== product._id);
        this.setupPagination();
      },
      error: (err) => console.error(err)
    });
  }

  goToDetail(product: IProduct): void {
    this.router.navigate(['productdetail', product._id]);
  }

  // Xử lý ảnh GridFS
  getImageUrl(img: any): string {
    if (!img) return 'assets/images/no-image.png';
    if (typeof img === 'object' && img.url) {
      return 'https://server-testing-ymn9.onrender.com' + img.url;
    }
    if (typeof img === 'string') {
      return img.startsWith('http') ? img : 'https://server-testing-ymn9.onrender.com' + img;
    }
    return 'assets/images/no-image.png';
  }
}