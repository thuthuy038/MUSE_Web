import { Component, OnInit } from '@angular/core';
import { BlogService } from '../../services/blog';
import { IBlog } from '../../interfaces/blog';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

@Component({
  selector: 'app-blog',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './blog.html',
  styleUrls: ['./blog.css'],
})
export class Blog implements OnInit {

  blogs: IBlog[] = [];

  constructor(
    private blogService: BlogService,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.blogService.getBlogs().subscribe(res => {
      this.blogs = res;
    });
  }

  // 🔥 navigate
  goToDetail(id?: string) {
    if (!id) return;
    this.router.navigate(['/blog', id]);
  }

  // 🔥 image
  getImage(id: string) {
    return `http://localhost:3000/api/images/${id}`;
  }

  // 🔥 cắt nội dung
  shortContent(content: string, length: number = 120) {
    return content.length > length
      ? content.substring(0, length) + '...'
      : content;
  }
}