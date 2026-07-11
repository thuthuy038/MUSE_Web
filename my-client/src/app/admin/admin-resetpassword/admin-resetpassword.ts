import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-admin-resetpassword',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-resetpassword.html',
  styleUrl: './admin-resetpassword.css',
})
export class AdminResetPassword {
  email: string = '';
  password: string = '';
  confirmPassword: string = '';
  securityCode: string = '';
  showPassword: boolean = false;
  showConfirmPassword: boolean = false;

  constructor(private router: Router) {}

  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
  }

  toggleConfirmPasswordVisibility() {
    this.showConfirmPassword = !this.showConfirmPassword;
  }

  onSubmit(): void {
    if (!this.email || !this.password || !this.confirmPassword || !this.securityCode) {
      alert('Vui lòng nhập đầy đủ thông tin!');
      return;
    }

    if (this.password !== this.confirmPassword) {
      alert('Mật khẩu không trùng khớp!');
      return;
    }

    alert('Mật khẩu đã được đặt lại. Vui lòng đăng nhập lại.');
    this.router.navigate(['/admin/login']);
  }

  goBack() {
    this.router.navigate(['/admin/login']);
  }
}
