import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UserService } from '../../services/user';
import { Router, RouterModule } from '@angular/router';
import { firstValueFrom } from 'rxjs'; 

@Component({
  selector: 'app-admin-account',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './admin-account.html',
  styleUrls: ['./admin-account.css'],
})
export class AdminAccount implements OnInit {
  firstName: string = '';
  lastName: string = '';
  email: string = '';
  avatarUrl: string = 'https://i.pravatar.cc/150?u=admin';
  selectedFile: File | null = null;
  uploadLoading = false;

  constructor(
    private userService: UserService,
    private router: Router
  ) {}

  ngOnInit() {
    this.loadAdminProfile();
  }

  loadAdminProfile() {
    this.userService.getProfile().subscribe({
      next: (data) => {
        if (data.name) {
          const parts = data.name.trim().split(' ');
          if (parts.length > 1) {
            this.firstName = parts.slice(0, -1).join(' ');
            this.lastName = parts[parts.length - 1];
          } else {
            this.firstName = parts[0];
            this.lastName = '';
          }
        }
        this.email = data.email;

        if (data.avatar) {
          if (typeof data.avatar === 'string') {
            this.avatarUrl = data.avatar;
          } else if (data.avatar.url) {
            this.avatarUrl = data.avatar.url.startsWith('/api') 
              ? `https://server-testing-ymn9.onrender.com${data.avatar.url}` 
              : data.avatar.url;
          }
        } else {
          this.avatarUrl = 'https://i.pravatar.cc/150?u=admin';
        }
      },
      error: (err) => console.error('Lỗi tải profile:', err)
    });
  }

  onFileSelected(event: any) {
    const file = event.target?.files && event.target.files[0];
    if (!file) return;
    this.selectedFile = file;
    const reader = new FileReader();
    reader.onload = () => {
      this.avatarUrl = reader.result as string;
    };
    reader.readAsDataURL(file);
  }

  removeAvatar() {
    this.avatarUrl = 'https://i.pravatar.cc/150?u=admin';
    this.selectedFile = null;
  }

  async uploadAvatar(): Promise<boolean> {
    if (!this.selectedFile) return true;

    this.uploadLoading = true;
    const formData = new FormData();
    formData.append('avatar', this.selectedFile);

    try {
      const updatedUser = await firstValueFrom(this.userService.uploadAvatar(formData));
      
       if (updatedUser.avatar) {
        if (typeof updatedUser.avatar === 'string') {
          this.avatarUrl = updatedUser.avatar;
        } else if (updatedUser.avatar.url) {
          this.avatarUrl = updatedUser.avatar.url.startsWith('/api')
            ? `https://server-testing-ymn9.onrender.com${updatedUser.avatar.url}`
            : updatedUser.avatar.url;
        }
      }
      
      this.selectedFile = null;
      this.uploadLoading = false;
      return true;
    } catch (error) {
      console.error('Upload avatar lỗi:', error);
      this.uploadLoading = false;
      return false;
    }
  }

  changePassword() {
    this.router.navigate(['/admin/reset']);
  }

  async saveProfile() {
    // Upload avatar trước nếu có
    if (this.selectedFile) {
      const uploadSuccess = await this.uploadAvatar();
      if (!uploadSuccess) {
        alert('Upload ảnh thất bại');
        return;
      }
    }

    // Cập nhật thông tin cơ bản
    const updateData = {
      name: `${this.firstName} ${this.lastName}`.trim(),
      email: this.email
    };

    this.userService.updateProfile(updateData).subscribe({
      next: (updatedUser) => {
        alert('Cập nhật thông tin thành công!');
        // Cập nhật lại email nếu có thay đổi
        this.email = updatedUser.email;
        if (updatedUser.name) {
          const parts = updatedUser.name.trim().split(' ');
          if (parts.length > 1) {
            this.firstName = parts.slice(0, -1).join(' ');
            this.lastName = parts[parts.length - 1];
          } else {
            this.firstName = parts[0];
            this.lastName = '';
          }
        }
      },
      error: (err) => {
        alert(err.error?.message || 'Cập nhật thất bại');
      }
    });
  }

  logout() {
    this.userService.logout();
    this.router.navigate(['/admin/login']);
  }
}