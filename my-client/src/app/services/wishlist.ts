import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { UserService } from './user';
import { IProduct } from '../interfaces/product';

@Injectable({ providedIn: 'root' })
export class WishlistService {
  private apiUrl = 'http://localhost:3000/api/users/wishlist';
  private wishlistSubject = new BehaviorSubject<IProduct[]>([]);
  public wishlist$ = this.wishlistSubject.asObservable();

  constructor(private http: HttpClient, private userService: UserService) {
    // Tự động tải wishlist khi user đăng nhập
    this.userService.currentUser$.subscribe(user => {
      if (user) {
        this.loadWishlist().subscribe();
      } else {
        this.wishlistSubject.next([]);
      }
    });
  }

  loadWishlist(): Observable<IProduct[]> {
    return this.http.get<IProduct[]>(this.apiUrl).pipe(
      tap(products => this.wishlistSubject.next(products))
    );
  }

  addToWishlist(productId: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/${productId}`, {}).pipe(
      tap(() => this.loadWishlist().subscribe()) // reload danh sách
    );
  }

  removeFromWishlist(productId: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${productId}`).pipe(
      tap(() => this.loadWishlist().subscribe())
    );
  }

  isFavorite(productId: string): boolean {
    return this.wishlistSubject.value.some(p => p._id === productId);
  }
}