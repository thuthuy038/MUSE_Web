import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { IOrder } from '../interfaces/order';

@Injectable({ providedIn: 'root' })
export class OrderService {
  private orderUrl = 'https://server-testing-ymn9.onrender.com/api/orders';

  constructor(private http: HttpClient) { }

  createOrder(order: IOrder): Observable<IOrder> {
    return this.http.post<IOrder>(this.orderUrl, order);
  }

  getMyOrders(userId: string): Observable<IOrder[]> {
    return this.http.get<IOrder[]>(`${this.orderUrl}/myorders/${userId}`);
  }

  getOrder(_id: string): Observable<IOrder> {
    return this.http.get<IOrder>(`${this.orderUrl}/${_id}`);
  }

  // Admin
  getAllOrders(): Observable<IOrder[]> {
    return this.http.get<IOrder[]>(this.orderUrl);
  }

  updateOrderStatus(_id: string, status: string): Observable<IOrder> {
    return this.http.put<IOrder>(`${this.orderUrl}/${_id}/status`, { status });
  }
}