import { Component, Input, OnInit } from '@angular/core';
import { CommonModule, CurrencyPipe, DecimalPipe } from '@angular/common';
import { WishlistService } from '../../services/wishlist';
import { IProduct } from '../../interfaces/product';
import { UserService } from '../../services/user';

@Component({
  selector: 'app-product',
  standalone: true,
  imports: [CommonModule, CurrencyPipe, DecimalPipe],
  templateUrl: './product.html',
  styleUrls: ['./product.css'],
})
export class Product implements OnInit {

  @Input() product!: IProduct | any;
  
  isFavorite = false;

  constructor(private wishlistService: WishlistService, private userService: UserService) { }


  ngOnInit() {
    this.isFavorite = this.wishlistService.isFavorite(this.product._id);
    this.wishlistService.wishlist$.subscribe(() => {
      this.isFavorite = this.wishlistService.isFavorite(this.product._id);
    });

  }

  toggleFavorite(event: Event) {
    event.preventDefault();
    event.stopPropagation();
    if (!this.userService.isLoggedIn()) {
      alert('Vui lòng đăng nhập để thêm vào danh sách yêu thích');
      return;
    }

    this.isFavorite = !this.isFavorite;
    if (this.isFavorite) {
      this.wishlistService.addToWishlist(this.product._id).subscribe({
        error: (err) => {
          console.error(err);
          // Nếu lỗi, rollback UI
          this.isFavorite = false;
          alert('Không thể thêm vào wishlist. Vui lòng thử lại sau.');
        },
      })
    } else {
      this.wishlistService.removeFromWishlist(this.product._id).subscribe({
        error: (err) => {
          console.error(err);
          // Nếu lỗi, rollback UI
          this.isFavorite = true;
          alert('Không thể xóa khỏi wishlist. Vui lòng thử lại sau.');
        },
      });
    }
  }

  getImageUrl(img: any) {
    return 'https://server-testing-ymn9.onrender.com' + img.url;
  }
}
