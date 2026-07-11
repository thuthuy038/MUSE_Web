import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class VoucherService {

  private apiUrl = 'https://server-testing-ymn9.onrender.com/api/vouchers';

  constructor(private http: HttpClient) { }

  // Lấy voucher theo promotion
  getByPromotion(promotionId: string) {
    return this.http.get(`${this.apiUrl}/promotion/${promotionId}`);
  }

  // Áp dụng voucher
  applyVoucher(data: any) {
    return this.http.post(`${this.apiUrl}/apply`, data);
  }

  // (optional) lấy tất cả voucher
  getAll() {
    return this.http.get(this.apiUrl);
  }
}