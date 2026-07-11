import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { UserService } from '../../services/user';

@Component({
  selector: 'app-account',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './account.html',
  styleUrls: ['./account.css']
})
export class Account implements OnInit {
  user: any = {
    name: '',
    email: '',
    phone: '',
    gender: 'male',
    birthday: null,
    googleId: null,
    facebookId: null,
    addresses: []
  };
  avatarSrc = 'assets/images/account/Generic_avatar.png';
  loading = false;
  selectedFile: File | null = null;

  defaultAddressString: string = 'Chưa có địa chỉ';

  birthDay: number | null = null;
  birthMonth: number | null = null;
  birthYear: number | null = null;

  days: number[] = Array.from({ length: 31 }, (_, i) => i + 1);
  months: number[] = Array.from({ length: 12 }, (_, i) => i + 1);
  years: number[] = Array.from({ length: 100 }, (_, i) => new Date().getFullYear() - i);

  constructor(
    private userService: UserService,
    private router: Router
  ) { }

  ngOnInit() {
    this.loadUserProfile();
  }

  private getAvatarUrl(avatar: any): string {
    const defaultAvatar = 'assets/images/account/Generic_avatar.png';
    if (!avatar) return defaultAvatar;

    let rawUrl: string | null = null;
    if (typeof avatar === 'object' && avatar.url) {
      rawUrl = avatar.url;
    } else if (typeof avatar === 'string') {
      rawUrl = avatar;
    }

    if (!rawUrl) return defaultAvatar;

    // Sửa lỗi ghép base URL
    const baseUrl = 'https://server-testing-ymn9.onrender.com';
    if (rawUrl.startsWith(baseUrl)) {
      const afterBase = rawUrl.substring(baseUrl.length);
      if (afterBase.startsWith('http://') || afterBase.startsWith('https://')) {
        rawUrl = afterBase;
      }
    }

    // Nếu là URL tuyệt đối
    if (rawUrl.startsWith('http://') || rawUrl.startsWith('https://')) {
      // Nếu là Google, dùng proxy để tránh CORS
      if (rawUrl.includes('lh3.googleusercontent.com')) {
        return `https://server-testing-ymn9.onrender.com/api/auth/proxy-image?url=${encodeURIComponent(rawUrl)}`;
      }
      return rawUrl;
    }

    // Nếu là đường dẫn tương đối từ server
    if (rawUrl.startsWith('/api')) {
      return `https://server-testing-ymn9.onrender.com${rawUrl}`;
    }

    return rawUrl;
  }

  loadUserProfile() {
    this.userService.getProfile().subscribe({
      next: (data) => {
        this.user = { ...this.user, ...data };
        this.user.googleId = data.googleId || null;
        this.user.facebookId = data.facebookId || null;

        console.log('Avatar raw:', data.avatar);
        this.avatarSrc = this.getAvatarUrl(data.avatar);
        console.log('Avatar src:', this.avatarSrc);

        // Xử lý địa chỉ mặc định
        if (data.addresses && data.addresses.length > 0) {
          const defaultAddr = data.addresses.find((a: any) => a.isDefault) || data.addresses[0];
          this.defaultAddressString = `${defaultAddr.street}, ${defaultAddr.ward}, ${defaultAddr.district}, ${defaultAddr.province}`;
        } else {
          this.defaultAddressString = 'Chưa có địa chỉ';
        }

        // Xử lý ngày sinh
        if (data.birthday) {
          const bday = new Date(data.birthday);
          this.user.birthday = bday.toISOString().split('T')[0];
          this.birthDay = bday.getDate();
          this.birthMonth = bday.getMonth() + 1;
          this.birthYear = bday.getFullYear();
        }
      },
      error: (err) => {
        console.error(err);
        if (err.status === 401) {
          this.logout();
        }
      }
    });
  }

  onBirthdayChange() {
    if (this.birthDay && this.birthMonth && this.birthYear) {
      const monthStr = this.birthMonth < 10 ? `0${this.birthMonth}` : `${this.birthMonth}`;
      const dayStr = this.birthDay < 10 ? `0${this.birthDay}` : `${this.birthDay}`;
      this.user.birthday = `${this.birthYear}-${monthStr}-${dayStr}`;
    }
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;
    this.selectedFile = input.files[0];
    const reader = new FileReader();
    reader.onload = () => {
      this.avatarSrc = reader.result as string;
    };
    reader.readAsDataURL(this.selectedFile);
  }

  updateProfile() {
    this.loading = true;
    const formData = new FormData();
    formData.append('name', this.user.name);
    formData.append('phone', this.user.phone || '');
    formData.append('gender', this.user.gender);
    formData.append('email', this.user.email);
    if (this.user.birthday) {
      formData.append('birthday', this.user.birthday);
    }
    if (this.selectedFile) {
      formData.append('avatar', this.selectedFile);
    }

    this.userService.updateProfile(formData).subscribe({
      next: () => {
        alert('Cập nhật thành công!');
        this.loadUserProfile();
        this.loading = false;
        this.selectedFile = null;
      },
      error: (err) => {
        alert(err.error?.message || 'Cập nhật thất bại');
        this.loading = false;
      }
    });
  }

  logout() {
    this.userService.logout();
    this.router.navigate(['/login']);
  }
}