import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ICategory } from '../interfaces/category';

@Injectable({ providedIn: 'root' })
export class CategoryService {

  private categoriesUrl = 'http://localhost:3000/api/categories';

  constructor(private http: HttpClient) {}

  getCategories(): Observable<ICategory[]> {
    return this.http.get<ICategory[]>(this.categoriesUrl);
  }

  /** Lấy danh mục theo ID */
  getCategoryById(id: string): Observable<ICategory> {
    return this.http.get<ICategory>(`${this.categoriesUrl}/${id}`);
  }

  /** Tạo danh mục */
  createCategory(data: any): Observable<ICategory> {
    return this.http.post<ICategory>(this.categoriesUrl, data);
  }

  /** Cập nhật danh mục */
  updateCategory(id: string, data: any): Observable<ICategory> {
    return this.http.patch<ICategory>(`${this.categoriesUrl}/${id}`, data);
  }

  /** Xóa danh mục */
  deleteCategory(id: string): Observable<any> {
    return this.http.delete(`${this.categoriesUrl}/${id}`);
  }

   /** Upload banner */
  uploadBanner(id: string, formData: FormData): Observable<any> {
    return this.http.post(`${this.categoriesUrl}/${id}/banner`, formData);
  }

  /** Xóa banner */
  deleteBanner(id: string, fileId: string): Observable<any> {
    return this.http.delete(`${this.categoriesUrl}/${id}/banner/${fileId}`);
  }

}
