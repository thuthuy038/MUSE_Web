import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UserService } from '../../services/user';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [FormsModule, CommonModule],
  templateUrl: './reset-password.html',
  styleUrl: './reset-password.css',
})
export class ResetPassword {
  step = 1;
  emailOrPhone = '';
  otp = '';
  newPassword = '';
  confirmPassword = '';

  constructor(private userService: UserService) {}

  // Bước 1: Gửi OTP
  handleStep1() {
    if (!this.emailOrPhone.trim()) {
      alert('Vui lòng nhập email hoặc số điện thoại!');
      return;
    }
    this.userService.sendOtp(this.emailOrPhone).subscribe({
      next: (res) => {
        alert('Mã OTP đã được gửi (mặc định 1234)');
        this.step = 2;
      },
      error: (err) => alert(err.error?.message || 'Không tìm thấy tài khoản')
    });
  }

  // Bước 2: Xác nhận OTP
  handleStep2() {
    if (!this.otp.trim()) {
      alert('Vui lòng nhập mã OTP!');
      return;
    }
    // OTP được kiểm tra ở backend, ở đây chỉ chuyển bước nếu thành công
    // Tạm thời chuyển bước 3, nhưng thực tế nên gọi API xác nhận OTP trước
    // Ở đây ta gọi luôn reset password ở bước 3
    this.step = 3;
  }

  // Bước 3: Đặt lại mật khẩu
  handleStep3() {
    if (!this.newPassword.trim() || !this.confirmPassword.trim()) {
      alert('Vui lòng nhập đầy đủ mật khẩu!');
      return;
    }
    if (this.newPassword !== this.confirmPassword) {
      alert('Mật khẩu xác nhận không khớp!');
      return;
    }
    this.userService.resetPassword(this.emailOrPhone, this.otp, this.newPassword).subscribe({
      next: () => {
        alert('Đặt lại mật khẩu thành công!');
        this.resetForm();
      },
      error: (err) => alert(err.error?.message || 'Đặt lại mật khẩu thất bại')
    });
  }

  resetForm() {
    this.step = 1;
    this.emailOrPhone = '';
    this.otp = '';
    this.newPassword = '';
    this.confirmPassword = '';
  }
}