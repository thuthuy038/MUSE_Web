import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UserService } from '../../services/user';

@Component({
  selector: 'app-admin-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-login.html',
  styleUrls: ['./admin-login.css']
})
export class AdminLogin {
  email = '';
  password = '';

  constructor(private userService: UserService, private router: Router) { }

  onSubmit() {
    this.userService.login(this.email, this.password).subscribe({
      next: (user) => {
        if (user.role === 'admin') {
          this.router.navigate(['/admin/account']);
        } else {
          alert('Bạn không có quyền truy cập admin');
          this.userService.logout();
        }
      },
      error: (err) => alert(err.error?.message || 'Đăng nhập thất bại')
    });
  }

  goToSignup() {
    this.router.navigate(['/admin/signup']);
  }

  goToReset() {
    this.router.navigate(['/admin/reset']);
  }
}