import { Component } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-blog-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './blog-form.html',
  styleUrl: './blog-form.css',
})
export class BlogForm {

  blog:any = {
    title: '',
    content: '',
    image: '',
    date: ''
  }

  id:any = null

  constructor(
    private http: HttpClient,
    private route: ActivatedRoute,
    private router: Router
  ){}

  ngOnInit(){

    this.id = this.route.snapshot.paramMap.get('id')

    if(this.id){

      this.http.get(`http://localhost:3000/api/blogs/${this.id}`)
      .subscribe((data:any)=>{
        this.blog = data
      })

    }

  }

  saveBlog(){

    if(this.id){

      this.http.put(
        `http://localhost:3000/api/blogs/${this.id}`,
        this.blog
      ).subscribe(()=>{
        alert("Cập nhật thành công")
        this.router.navigate(['/blog-management'])
      })

    }else{

      this.http.post(
        `http://localhost:3000/api/blogs`,
        this.blog
      ).subscribe(()=>{
        alert("Thêm blog thành công")
        this.router.navigate(['/blog-management'])
      })

    }

  }

}