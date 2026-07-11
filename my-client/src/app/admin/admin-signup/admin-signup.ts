import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { UserService } from '../../services/user';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-admin-signup',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-signup.html',
  styleUrls: ['./admin-signup.css']
})
export class AdminSignup {
  username = '';
  password = '';
  confirmPassword = '';
  securityCode = '';
  showPassword = false;
  showConfirmPassword = false;

  constructor(private router: Router, private userService: UserService) { }

  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
  }

  toggleConfirmPasswordVisibility() {
    this.showConfirmPassword = !this.showConfirmPassword;
  }

  goBackToLogin() {
    this.router.navigate(['/admin/login']);
  }

  onSubmit() {
    if (this.password !== this.confirmPassword) {
      alert('Mật khẩu không khớp');
      return;
    }
    // Kiểm tra security code 
    if (this.securityCode !== 'ADMIN123') {
      alert('Mã bảo mật không đúng');
      return;
    }
    this.userService.register({ name: this.username, emailOrPhone: this.username, password: this.password, role: 'admin' }).subscribe({
      next: () => {
        alert('Đăng ký admin thành công!');
        this.router.navigate(['/admin/login']);
      },
      error: (err: any) => alert(err.error?.message || 'Đăng ký thất bại')
    });
  }
}