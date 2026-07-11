import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { BlogService } from '../../services/blog';
import { IBlog } from '../../interfaces/blog';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-blog-detail',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './blog-detail.html',
  styleUrls: ['./blog-detail.css']
})
export class BlogDetail implements OnInit {

  blog!: IBlog;

  constructor(
    private route: ActivatedRoute,
    private blogService: BlogService
  ) { }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id')!;

    this.blogService.getBlogById(id).subscribe(res => {
      this.blog = res;
    });
  }

  getImage(id: string) {
    return `http://localhost:3000/api/images/${id}`;

  }
  goBack() {
    window.history.back();
  }
}