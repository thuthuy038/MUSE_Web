import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { NotificationComponent } from '../notification/notification';
import { UserService } from '../../services/user';
import { IUser } from '../../interfaces/user';

@Component({
  selector: 'app-ad-header',
  standalone: true,
  imports: [CommonModule, RouterModule, NotificationComponent],
  templateUrl: './ad-header.html',
  styleUrls: ['./ad-header.css']
})
export class AdHeaderComponent implements OnInit {
  adminData: IUser | null = null;
  showUserMenu = false;
  apiUrl = 'https://server-testing-ymn9.onrender.com';

  constructor(
    private router: Router,
    private userService: UserService
  ) { }

  ngOnInit(): void {
    this.loadAdminData();

    this.userService.currentUser$.subscribe(user => {
      if (user && user.role === 'admin') {
        this.adminData = user;
      }
    });
  }

  loadAdminData(): void {
    const currentUser = this.userService.currentUserValue;

    if (currentUser && currentUser.role === 'admin') {
      this.adminData = currentUser;
      this.formatAvatar();
    } else {
      // Gọi API lấy profile nếu chưa có
      this.userService.getProfile().subscribe({
        next: (data) => {
          if (data.role === 'admin') {
            this.adminData = data;
            this.formatAvatar();
          }
        },
        error: (error) => {
          console.error('Lỗi tải thông tin admin:', error);
        }
      });
    }
  }

  formatAvatar(): void {
    if (this.adminData?.avatar) {
      const avatar = this.adminData.avatar;
      if (typeof avatar === 'object' && avatar.url) {
        this.adminData.avatar = avatar.url.startsWith('/api')
          ? `${this.apiUrl}${avatar.url}`
          : avatar.url;
      }
    }
  }

  onImageError(): void {
    if (this.adminData) {
      this.adminData.avatar = undefined;
    }
  }

  getAvatarInitial(): string {
    if (this.adminData?.name) {
      return this.adminData.name.charAt(0).toUpperCase();
    }
    return 'A';
  }

  getFullName(): string {
    return this.adminData?.name || 'Administrator';
  }

  getEmail(): string {
    return this.adminData?.email || 'admin@example.com';
  }

  toggleUserMenu(): void {
    this.showUserMenu = !this.showUserMenu;
  }

  closeUserMenu(): void {
    this.showUserMenu = false;
  }

  logout(): void {
    this.userService.logout();
    this.router.navigate(['/admin/login']);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.user-wrapper')) {
      this.showUserMenu = false;
    }
  }
}