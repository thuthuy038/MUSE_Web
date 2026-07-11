import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { IProduct } from '../interfaces/product';

@Injectable({
  providedIn: 'root'
})
export class ProductService {
  private productsUrl = 'http://localhost:3000/api/products';
  private ordersUrl = 'http://localhost:3000/api/orders';

  constructor(private http: HttpClient) { }

  /** Lấy tất cả sản phẩm */
  getProducts(): Observable<IProduct[]> {
    return this.http.get<IProduct[]>(this.productsUrl);
  }

  /** Đồng bộ sold */
  syncSold(): Observable<any> {
    return this.http.post(`${this.ordersUrl}/sync-sold`, {});
  }

  /** Kiểm tra sold */
  checkSold(): Observable<any> {
    return this.http.get(`${this.ordersUrl}/check-sold`);
  }

  /** Lọc sản phẩm theo danh mục */
  getProductsByCategory(category: string): Observable<IProduct[]> {
    return this.http.get<IProduct[]>(this.productsUrl).pipe(
      map(products => products.filter(p => p.category === category))
    );
  }

  /** Lấy sản phẩm theo ID */
  getProductById(id: string): Observable<IProduct> {
    return this.http.get<IProduct>(`${this.productsUrl}/${id}`);
  }

  createProduct(data: any) {
    return this.http.post(this.productsUrl, data)
  }

  updateProduct(id: any, data: any) {
    return this.http.patch(`${this.productsUrl}/${id}`, data)
  }

  deleteProduct(id: string): Observable<any> {
    return this.http.delete(`${this.productsUrl}/${id}`);
  }

  uploadImages(productId: string, formData: FormData) {

    return this.http.post(
      `http://localhost:3000/api/products/${productId}/images`,
      formData
    )

  }
 
  deleteImage(productId: string, fileId: string) {

    return this.http.delete(
      `http://localhost:3000/api/products/${productId}/images/${fileId}`
    )

  }

}
