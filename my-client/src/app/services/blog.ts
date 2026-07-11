import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { IBlog } from '../interfaces/blog';

@Injectable({
  providedIn: 'root'
})
export class BlogService {

  api = "https://server-testing-ymn9.onrender.com/api/blogs";

  constructor(private http: HttpClient) {}

  getBlogs(){
    return this.http.get<IBlog[]>(this.api);
  }

  // 🔥 thêm cái này
  getBlogById(id: string) {
    return this.http.get<IBlog>(`${this.api}/${id}`);
  }

}