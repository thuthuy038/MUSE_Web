import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private guestIdKey = 'guest_id';

  getUserId(): string | null {
    // Kiểm tra người dùng đã đăng nhập chưa
    const userStr = sessionStorage.getItem('currentUser');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        if (user && user._id) {
          return user._id;
        }
      } catch (e) {}
    }
    // Nếu chưa, tạo guest id
    let guestId = localStorage.getItem(this.guestIdKey);
    if (!guestId) {
      guestId = 'guest_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      localStorage.setItem(this.guestIdKey, guestId);
    }
    return guestId;
  }

  isLoggedIn(): boolean {
    return !!sessionStorage.getItem('currentUser');
  }

  logout(): void {
    localStorage.removeItem(this.guestIdKey);
    sessionStorage.removeItem('currentUser');
  }
}