import { Injectable } from '@angular/core'
import { HttpClient } from '@angular/common/http'
import { Observable } from 'rxjs'

@Injectable({
  providedIn: 'root'
})

export class ReviewService {

  private apiUrl = 'https://server-testing-ymn9.onrender.com/api/reviews'

  constructor(private http: HttpClient) { }

  getReviews(): Observable<any> {
    return this.http.get<any>(this.apiUrl)
  }

  getReviewsByProduct(productId: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/product/${productId}`)
  }

  createReview(data: any): Observable<any> {
    return this.http.post<any>(this.apiUrl, data)
  }

}