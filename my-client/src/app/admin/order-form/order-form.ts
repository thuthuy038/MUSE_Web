import { Component, OnInit } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { UserService } from '../../services/user';

@Component({
  selector: 'app-order-form',
  standalone: true,
  imports: [CommonModule, HttpClientModule, FormsModule],
  templateUrl: './order-form.html',
  styleUrl: './order-form.css'
})
export class OrderForm implements OnInit {
  order: any = null;
  private apiUrl = 'http://localhost:3000/api/orders';
  customerCode: string = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private http: HttpClient,
    private location: Location,
    private toastr: ToastrService,
    private userService: UserService
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.loadOrderDetail(id);}
  }

loadOrderDetail(id: string) {
  this.http.get(`${this.apiUrl}/${id}`).subscribe((data: any) => {
    this.order = data;

    // Lấy mã khách hàng từ userId (ObjectId) nếu có
    const userId = this.order?.userId;
    if (userId && userId.match(/^[0-9a-fA-F]{24}$/)) { // kiểm tra ObjectId hợp lệ
      this.userService.getUserById(userId).subscribe({
        next: (user) => {
          this.customerCode = user.code;
        },
        error: () => {
          this.customerCode = userId; // fallback
        }
      });
    } else if (this.order.customerId) {
      this.customerCode = this.order.customerId;
    } else {
      this.customerCode = userId || 'N/A'; // hiển thị guestId nếu có
    }

    // Xử lý items 
    if (this.order && this.order.items) {
      this.order.items.forEach((item: any) => {
        item.originalSize = item.originalSize || item.size;
        item.originalColor = item.originalColor || item.color;
      });
    }
  });
}

  viewCustomerProfile() {
    const userId = this.order?.userId || this.order?.customerId;
    if (userId) {
      this.router.navigate(['/admin/user-edit', userId]);
    } else {
      this.toastr.warning('Không có mã khách hàng để xem profile');
    }
  }

  updateStatus() {
    this.saveOrder();
  }

  calculateTotal() {
    if (!this.order) return;
    const subTotal = this.order.items.reduce((total: number, item: any) => {
      return total + (item.price * item.quantity);
    }, 0);
    this.order.totalPrice = subTotal + (this.order.shippingMethod.fee || 0) - (this.order.promotion.discountAmount || 0);
  }

  saveOrder() {
    if (!this.order) return;
    this.calculateTotal();
    const idParam = this.order.id || this.order._id;
    if (!idParam || idParam === '') {
      // Tạo mới
      this.http.post(this.apiUrl, this.order).subscribe({
        next: () => {
          this.toastr.success('Tạo đơn hàng thành công!');
          this.router.navigate(['/admin/order-management']);
        },
        error: () => this.toastr.error('Lỗi tạo đơn hàng!')
      });
    } else {
      // Cập nhật
      this.http.put(`${this.apiUrl}/${idParam}`, this.order).subscribe({
        next: () => this.toastr.success('Cập nhật thành công!'),
        error: () => this.toastr.error('Lỗi cập nhật!')
      });
    }
  }

  goBack() { this.location.back(); }
}