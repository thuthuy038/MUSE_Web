import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class LookbookService {
  private apiUrl = 'http://localhost:3000/api/lookbook';
 
  constructor(private http: HttpClient) {}

  getLookbooks(): Observable<any[]> {
    return this.http.get<any[]>(this.apiUrl);
  }

  saveLookbook(data: any): Observable<any> {
    return this.http.post(this.apiUrl, data);
  }

  deleteLookbook(id: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }

  // Thêm vào trong class LookbookService
getRecommend(productId: string): Observable<any> {
  return this.http.get(`${this.apiUrl}/recommend/${productId}`);
}
}