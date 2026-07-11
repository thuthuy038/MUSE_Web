import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { IPromotion } from '../interfaces/promotion';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class PromotionService {
  private apiUrl = 'https://server-testing-ymn9.onrender.com/api/promotions';

  constructor(private http: HttpClient) {}

  // Lấy tất cả khuyến mãi
  getPromotions(): Observable<IPromotion[]> {
    return this.http.get<IPromotion[]>(this.apiUrl);
  }

  // Lấy chi tiết khuyến mãi
  getPromotionById(id: string): Observable<IPromotion> {
    return this.http.get<IPromotion>(`${this.apiUrl}/${id}`);
  }

  // Tạo khuyến mãi
  createPromotion(promotion: IPromotion): Observable<any> {
    return this.http.post(this.apiUrl, promotion);
  }

  // Cập nhật khuyến mãi
  updatePromotion(id: string, promotion: IPromotion): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}`, promotion);
  }

  // Xóa khuyến mãi
  deletePromotion(id: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }

}
