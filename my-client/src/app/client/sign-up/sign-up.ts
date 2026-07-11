import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { UserService } from '../../services/user';

@Component({
  selector: 'app-sign-up',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './sign-up.html',
  styleUrls: ['./sign-up.css']
})
export class SignUp {
  user = {
    firstName: '',
    lastName: '',
    gender: 'male',
    emailOrPhone: '',
    password: ''
  };
  confirmPassword = '';

  constructor(private userService: UserService, private router: Router) { }

  onSubmit() {
    if (this.user.password !== this.confirmPassword) {
      alert('Mật khẩu không khớp!');
      return;
    }
    const name = `${this.user.firstName} ${this.user.lastName}`.trim();
    const payload = {
      name,
      emailOrPhone: this.user.emailOrPhone,
      password: this.user.password
    };
    this.userService.register(payload).subscribe({
      next: () => {
        alert('Đăng ký thành công!');
        this.router.navigate(['/login']);
      },
      error: (err) => alert(err.error?.message || 'Đăng ký thất bại')
    });
  }
}