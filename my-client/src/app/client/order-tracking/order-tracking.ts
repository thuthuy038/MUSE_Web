import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { OrderService } from '../../services/order';
import { CartService } from '../../services/cart';
import { ProductService } from '../../services/product';
import { UserService } from '../../services/user';
import { Router } from '@angular/router';

@Component({
  selector: 'app-order-tracking',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './order-tracking.html',
  styleUrls: ['./order-tracking.css']
})
export class OrderTracking implements OnInit {


  orders: any[] = [];
  filteredOrders: any[] = [];

  selectedStatus: string = 'Tất cả';
  loading = false;
  errorMessage: string = '';

  reviewedStatus: { [key: string]: boolean } = {};


  constructor(
    private orderService: OrderService,
    private cartService: CartService,
    private productService: ProductService,
    private userService: UserService,
    private router: Router
  ) { }

  ngOnInit() {
    this.loadOrders();
  }

  loadOrders() {
    const user = this.userService.currentUserValue;
    if (!user || !user._id) {
      console.error('Chưa đăng nhập hoặc không có userId');
      this.orders = [];
      this.filteredOrders = [];
      return;
    }

    this.loading = true;
    // Gọi service với userId
    this.orderService.getMyOrders(user._id).subscribe({
      next: (res: any[]) => {
        console.log('Orders:', res);
        this.orders = Array.isArray(res) ? res : [];
        this.checkAllReviews(user._id);
        this.applyFilter();
        this.loading = false;
      },
      error: (err) => {
        console.error('Lỗi tải đơn hàng:', err);
        this.orders = [];
        this.filteredOrders = [];
        this.loading = false;
        this.errorMessage = 'Không thể tải đơn hàng. Vui lòng thử lại sau.';
      }
    });
  }

  // Check xem các sản phẩm trong đơn 'Đã giao' đã được review chưa
  checkAllReviews(userId: string) {
    this.orders.forEach(order => {
      if (order.status === 'Đã giao') {
        order.items.forEach((item: any) => {
          const productId = item.productId?._id || item.productId;
          const orderDbId = order._id;
          const key = `${orderDbId}_${productId}`;

          fetch(`http://localhost:3000/api/reviews/check?userId=${userId}&productId=${productId}&orderId=${orderDbId}`)
            .then(res => res.json())
            .then(data => {
              this.reviewedStatus[key] = data.exists;
            })
            .catch(err => console.error("Lỗi check review:", err));
        });
      }
    });
  }

  getStatusText(status: string): string {
    switch (status) {
      case 'Đang xử lý':
        return 'Chờ xác nhận';
      case 'Đang giao':
        return 'Đang giao hàng';
      case 'Đã giao':
        return 'Giao hàng thành công | HOÀN THÀNH';
      case 'Đã hủy':
        return 'Đơn hàng đã bị huỷ';
      default:
        return status;
    }
  }

  filterStatus(status: string): void {
    this.selectedStatus = status;
    this.applyFilter();
  }

  applyFilter(): void {
    const safeOrders = Array.isArray(this.orders) ? this.orders : [];
    if (this.selectedStatus === 'Tất cả') {
      this.filteredOrders = safeOrders;
    } else {
      const statusMap: { [key: string]: string } = {
        'Đang xử lý': 'Đang xử lý',
        'Đang giao': 'Đang giao',
        'Đã giao': 'Đã giao',
        'Đã hủy': 'Đã hủy'
      };
      const dbStatus = statusMap[this.selectedStatus];
      if (dbStatus) {
        this.filteredOrders = safeOrders.filter(o => o?.status === dbStatus);
      } else {
        this.filteredOrders = safeOrders;
      }
    }
  }

  buyAgain(order: any): void {
    if (!order?.items) return;
    order.items.forEach((item: any) => {
      if (item?.productId) {
        this.productService.getProductById(item.productId).subscribe({
          next: (product: any) => {
            this.cartService.addProductToCart(
              product,
              item.size,
              item.color,
              item.quantity
            );
          },
          error: (err) => console.error('Lỗi lấy sản phẩm:', err)
        });
      }
    });
    alert('Đã thêm lại vào giỏ hàng!');
  }

  review(order: any): void {
    this.router.navigate(['/review'], { state: { order: order } });
  }

  cancelOrder(order: any): void {
    if (!order || order.status !== 'Đang xử lý') return;

    if (confirm('Bạn có chắc muốn huỷ đơn?')) {
      this.orderService.updateOrderStatus(order._id, 'Đã hủy').subscribe({
        next: () => {
          this.loadOrders();
        },
        error: (err) => {
          console.error('Lỗi huỷ đơn:', err);
          alert('Huỷ đơn thất bại');
        }
      });
    }
  }

  // Hàm kiểm tra xem CẢ ĐƠN HÀNG đã đánh giá xong chưa
  isOrderFullyReviewed(order: any): boolean {

    if (!order || !order.items) return false;

    return order.items.every((item: any) => {
      const productId = item.productId?._id || item.productId;
      return this.reviewedStatus[`${order._id}_${productId}`] === true;
    });
  }
  goToProduct(item: any): void {
    const productId = item.productId?._id || item.productId;
    if (!productId) return;

    this.router.navigate(['/productdetail', productId]);
  }
}