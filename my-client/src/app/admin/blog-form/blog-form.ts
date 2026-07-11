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

      this.http.get(`https://server-testing-ymn9.onrender.com/api/blogs/${this.id}`)
      .subscribe((data:any)=>{
        this.blog = data
      })

    }

  }

  saveBlog(){

    if(this.id){

      this.http.put(
        `https://server-testing-ymn9.onrender.com/api/blogs/${this.id}`,
        this.blog
      ).subscribe(()=>{
        alert("Cập nhật thành công")
        this.router.navigate(['/blog-management'])
      })

    }else{

      this.http.post(
        `https://server-testing-ymn9.onrender.com/api/blogs`,
        this.blog
      ).subscribe(()=>{
        alert("Thêm blog thành công")
        this.router.navigate(['/blog-management'])
      })

    }

  }

}