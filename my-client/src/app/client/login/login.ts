import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { UserService } from '../../services/user';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './login.html',
  styleUrls: ['./login.css']
})
export class Login implements OnInit {
  email = '';
  password = '';
  showPassword = false;

  constructor(private userService: UserService, private router: Router, private route: ActivatedRoute) {}

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      if (params['oauth'] === 'blocked') {
        alert('Tài khoản Google của bạn đã bị khóa. Vui lòng liên hệ admin.');
      } else if (params['oauth'] === 'failed') {
        alert('Đăng nhập Google thất bại.');
      }
    });}

  onSubmit() {
  if (!this.email || !this.password) {
    alert('Vui lòng nhập email và mật khẩu');
    return;
  }
  this.userService.login(this.email, this.password).subscribe({
    next: (user) => {
      if (user.role === 'admin') {
        alert('Tài khoản admin không được đăng nhập tại đây. Vui lòng dùng form đăng nhập dành cho admin.');
        this.userService.logout(); // Xóa token vừa lưu
        // Không chuyển hướng, giữ nguyên trang login
      } else {
        alert('Đăng nhập thành công!');
        this.router.navigate(['/']);
      }
    },
    error: (err) => alert(err.error?.message || 'Đăng nhập thất bại')
  });
}

  goToSignup() {
    this.router.navigate(['/sign-up']);
  }

  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
  }

  goToAdminLogin() {
    this.router.navigate(['/admin/login']);
  }
}