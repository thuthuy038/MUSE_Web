import { Injectable } from '@angular/core'
import { HttpClient } from '@angular/common/http'
import { Observable } from 'rxjs'
import { Banner } from '../interfaces/banner'

@Injectable({
  providedIn: 'root'
})

export class BannerService {

  private api = 'http://localhost:3000/api/banners'

  constructor(private http: HttpClient) {}

  getBanners(): Observable<Banner[]> {
    return this.http.get<Banner[]>(this.api)
  }

  deleteBanner(id: string) {
    return this.http.delete(`${this.api}/${id}`)
  }

  updateBanner(id: string, data: Banner) {
    return this.http.put(`${this.api}/${id}`, data)
  }

}