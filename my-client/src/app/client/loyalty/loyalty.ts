import { Component, OnInit } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { Router } from '@angular/router';
import { UserService } from '../../services/user';
import { OrderService } from '../../services/order';
import { RouterModule } from '@angular/router';
import { IOrder } from '../../interfaces/order';

@Component({
  selector: 'app-loyalty',
  standalone: true,
  imports: [CommonModule, DecimalPipe, RouterModule],
  templateUrl: './loyalty.html',
  styleUrls: ['./loyalty.css'],
})
export class Loyalty implements OnInit {
  constructor(
    private router: Router,
    private userService: UserService,
    private orderService: OrderService
  ) { }

  avatarSrc: string = 'assets/images/account/Generic_avatar.png';
  totalSpent: number = 0;
  level: string = '';
  orders: any[] = [];

  ngOnInit() {
    this.loadUserData();
  }

  loadUserData() {
    // Lấy avatar từ user profile
    this.userService.getProfile().subscribe({
      next: (user) => {
        if (user.avatar) {
          this.avatarSrc = typeof user.avatar === 'string'
            ? user.avatar
            : (user.avatar?.url || 'assets/images/account/Generic_avatar.png');
        }
      },
      error: (err) => console.error('Lỗi lấy profile:', err)
    });

    // Lấy userId từ currentUser
    const currentUser = this.userService.currentUserValue;
    if (!currentUser || !currentUser._id) {
      console.error('Không tìm thấy user id');
      return;
    }

    // Lấy danh sách đơn hàng với userId
    this.orderService.getMyOrders(currentUser._id).subscribe({
      next: (orders: IOrder[]) => {
        // Lọc các đơn hàng không bị hủy (nếu status là 'Đã hủy' thì loại)
        const validOrders = orders.filter(o => o.status !== 'Đã hủy');
        // Tính tổng chi tiêu (dùng totalPrice)
        this.totalSpent = validOrders.reduce((sum, o) => sum + (o.totalPrice ?? 0), 0);
        this.calculateLevel();

        // Tạo dữ liệu hiển thị cho bảng
        this.orders = validOrders.map((o, index) => {
          const firstItem = o.items?.[0];
          const productName = firstItem ? firstItem.name : 'N/A';
          const itemCount = o.items?.length || 0;
          const displayProduct = itemCount > 1
            ? `${productName} +${itemCount - 1} sản phẩm`
            : productName;

          // Tính điểm (10.000đ = 1 điểm) dựa trên totalPrice
          const points = Math.floor((o.totalPrice ?? 0) / 10000);

          return {
            code: o._id ? o._id.slice(-6).toUpperCase() : 'N/A',
            date: o.createdAt ? new Date(o.createdAt).toLocaleDateString('vi-VN') : '',
            product: displayProduct,
            quantity: itemCount,
            total: o.totalPrice ?? 0,
            point: points
          };
        });
      },
      error: (err) => console.error('Lỗi lấy đơn hàng:', err)
    });
  }

  calculateLevel() {
    if (this.totalSpent < 1000000) {
      this.level = 'PINK';
    } else if (this.totalSpent <= 5000000) {
      this.level = 'SILVER';
    } else {
      this.level = 'GOLDEN';
    }
  }

  logout() {
    this.userService.logout();
    this.router.navigate(['/login']);
  }
}