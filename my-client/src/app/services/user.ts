import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { tap, map } from 'rxjs/operators';
import { IUser } from '../interfaces/user';
import { CartEventsService } from './cartevent';

@Injectable({ providedIn: 'root' })
export class UserService {
  private apiUrl = 'https://server-testing-ymn9.onrender.com/api/auth';
  private usersApiUrl = 'https://server-testing-ymn9.onrender.com/api/users';
  private currentUserSubject = new BehaviorSubject<IUser | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  constructor(private http: HttpClient, private cartEvents: CartEventsService) {
    const stored = sessionStorage.getItem('currentUser');
    if (stored) this.currentUserSubject.next(JSON.parse(stored));
  }

  get currentUserValue(): IUser | null {
    return this.currentUserSubject.value;
  }

  register(userData: { name: string; emailOrPhone: string; password: string; role?: string }): Observable<IUser> {
    return this.http.post<IUser>(`${this.apiUrl}/register`, userData).pipe(
      tap(user => {
        sessionStorage.setItem('currentUser', JSON.stringify(user));
        this.currentUserSubject.next(user);
        this.mergeGuestCart(user._id);
      })
    );
  }

  login(email: string, password: string): Observable<IUser> {
    return this.http.post<IUser>(`${this.apiUrl}/login`, { email, password }).pipe(
      tap(user => {
        sessionStorage.setItem('currentUser', JSON.stringify(user));
        this.currentUserSubject.next(user);
        this.mergeGuestCart(user._id);
      })
    );
  }

  logout(): void {
    sessionStorage.removeItem('currentUser');
    this.currentUserSubject.next(null);
    localStorage.removeItem('guest_id');
    this.cartEvents.emitRefreshCart();
  }

  private mergeGuestCart(userId: string): void {
    const guestId = localStorage.getItem('guest_id');
    if (guestId) {
      this.http.post('https://server-testing-ymn9.onrender.com/api/cart/merge', { guestId, userId }).subscribe({
        next: () => {
          localStorage.removeItem('guest_id');
          this.cartEvents.emitRefreshCart();
        },
        error: (err) => console.error('Merge cart failed:', err)
      });
    } else {
      this.cartEvents.emitRefreshCart();
    }
  }

  /**
   * Xử lý avatar từ backend thành URL hợp lý để hiển thị
   */
  private processAvatar(avatar: any): string | null {
    if (!avatar) return null;

    let rawUrl: string | null = null;
    if (typeof avatar === 'object' && avatar.url) {
      rawUrl = avatar.url;
    } else if (typeof avatar === 'string') {
      rawUrl = avatar;
    }

    if (!rawUrl) return null;

    // Xử lý trường hợp bị ghép base URL sai (http://localhost:3000https://...)
    const baseUrl = 'https://server-testing-ymn9.onrender.com';
    if (rawUrl.startsWith(baseUrl)) {
      const afterBase = rawUrl.substring(baseUrl.length);
      if (afterBase.startsWith('http://') || afterBase.startsWith('https://')) {
        rawUrl = afterBase;
      }
    }

    // Nếu là URL tuyệt đối
    if (rawUrl.startsWith('http://') || rawUrl.startsWith('https://')) {
      return rawUrl;
    }

    // Nếu là đường dẫn tương đối từ server
    if (rawUrl.startsWith('/api')) {
      return `${baseUrl}${rawUrl}`;
    }

    // Các trường hợp khác (ví dụ ảnh trong assets)
    return rawUrl;
  }

  /**
   * Áp dụng xử lý avatar cho user object
   */
  private handleUserAvatar(user: any): IUser {
    if (!user) return user;
    const processedAvatar = this.processAvatar(user.avatar);
    return { ...user, avatar: processedAvatar || null };
  }

  getProfile(): Observable<IUser> {
    return this.http.get<IUser>(`${this.apiUrl}/profile`).pipe(
      map(user => this.handleUserAvatar(user))
    );
  }

  updateProfile(data: Partial<IUser> | FormData): Observable<IUser> {
    return this.http.put<IUser>(`${this.apiUrl}/profile`, data).pipe(
      map(user => this.handleUserAvatar(user)),
      tap(user => {
        const current = this.currentUserSubject.value;
        if (current) {
          const updated = { ...current, ...user };
          sessionStorage.setItem('currentUser', JSON.stringify(updated));
          this.currentUserSubject.next(updated);
        }
      })
    );
  }

  isLoggedIn(): boolean {
    return !!this.currentUserSubject.value;
  }

  getToken(): string | null {
    return this.currentUserSubject.value?.token || null;
  }

  addAddress(userId: string, addressData: any): Observable<any> {
    return this.http.post(`https://server-testing-ymn9.onrender.com/api/address/add/${userId}`, addressData);
  }

  // ===== Admin / Users CRUD =====
  getCustomers(): Observable<IUser[]> {
    return this.http.get<IUser[]>(`${this.usersApiUrl}/customers`);
  }

  getUserById(id: string): Observable<IUser> {
    const token = this.getToken();
    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);
    return this.http.get<IUser>(`${this.usersApiUrl}/${id}`, { headers }).pipe(
      map(user => this.handleUserAvatar(user))
    );
  }

  createUser(data: Partial<IUser> & Record<string, unknown>): Observable<IUser> {
    return this.http.post<IUser>(`${this.usersApiUrl}`, data);
  }

  updateUser(id: string, data: Partial<IUser> & Record<string, unknown>): Observable<IUser> {
    return this.http.put<IUser>(`${this.usersApiUrl}/${id}`, data);
  }

  deleteUser(id: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.usersApiUrl}/${id}`);
  }

  uploadAvatar(formData: FormData): Observable<any> {
    const userId = this.currentUserValue?._id;
    if (!userId) throw new Error('User not logged in');
    return this.http.post(`https://server-testing-ymn9.onrender.com/api/users/${userId}/avatar`, formData);
  }

  getUserByCode(code: string): Observable<any> {
    const token = this.getToken();
    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);
    return this.http.get(`${this.usersApiUrl}/code/${code}`, { headers });
  }

  sendOtp(emailOrPhone: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/send-otp`, { emailOrPhone });
  }

  resetPassword(emailOrPhone: string, otp: string, newPassword: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/reset-password`, { emailOrPhone, otp, newPassword });
  }
}
