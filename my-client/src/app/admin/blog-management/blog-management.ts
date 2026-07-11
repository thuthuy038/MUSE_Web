import { Component } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-blog-management',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './blog-management.html',
  styleUrls: ['./blog-management.css']
})
export class BlogManagement {

  blogs: any[] = [];
  allBlogs: any[] = [];

  currentPage = 1;
  itemsPerPage = 5;

  searchText = '';

  showForm = false;
  showDateFilter = false;
  showYearFilter = false;

  selectedDate = '';
  startYear: any;
  endYear: any;

  previewImage: any = null;
  selectedFile: any = null;

  selectedBlogs: string[] = [];

  showDeletePopup = false;
  blogToDelete: any = null;

  isUploading = false;

  blogForm: any = {
    title: '',
    content: '',
    image: '',
    author: '',
    date: ''
  };

  constructor(private http: HttpClient) {}

  ngOnInit() {
    this.loadBlogs();
  }

  // ================= LOAD =================
  loadBlogs() {
    this.http.get<any>('http://localhost:3000/api/blogs')
      .subscribe({
        next: (data) => {
          this.blogs = data;
          this.allBlogs = data;
        },
        error: (err) => console.log(err)
      });
  }

  // ================= UPLOAD =================
  uploadImage(file: any) {
    const formData = new FormData();
    formData.append('image', file);

    this.isUploading = true;

    this.http.post<any>('http://localhost:3000/api/upload', formData)
      .subscribe({
        next: (res) => {
          console.log("UPLOAD RES:", res);

          // 🔥 FIX CỨNG: ép string
          this.blogForm.image = res.fileId?.toString();

          this.isUploading = false;
        },
        error: (err) => {
          console.log(err);
          this.isUploading = false;
        }
      });
  }

  // ================= ADD =================
  addBlog() {
    this.blogForm = {
      title: '',
      content: '',
      image: '',
      author: '',
      date: new Date().toISOString().split('T')[0]
    };

    this.previewImage = null;
    this.selectedFile = null;
    this.showForm = true;
  }

  // ================= EDIT =================
  editBlog(blog: any) {
    this.blogForm = { ...blog };

    if (blog.image) {
      this.previewImage = 'http://localhost:3000/api/images/' + blog.image;
    } else {
      this.previewImage = null;
    }

    this.showForm = true;
  }

  // ================= CHỌN ẢNH =================
  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (!file) return;

    this.selectedFile = file;

    // preview
    const reader = new FileReader();
    reader.onload = () => {
      this.previewImage = reader.result;
    };
    reader.readAsDataURL(file);

    // upload
    this.uploadImage(file);
  }

  // ================= SAVE =================
  saveBlog() {

    console.log("SAVE IMAGE:", this.blogForm.image);

    if (this.isUploading) {
      alert("Ảnh đang upload, đợi xíu 😭");
      return;
    }

    if (!this.blogForm.image) {
      alert("Chưa có ảnh 😭");
      return;
    }

    const blogData = {
      title: this.blogForm.title,
      content: this.blogForm.content,
      author: this.blogForm.author,
      date: this.blogForm.date,
      image: this.blogForm.image
    };

    if (this.blogForm._id) {

      this.http.put(
        `http://localhost:3000/api/blogs/${this.blogForm._id}`,
        blogData
      ).subscribe({
        next: () => {
          this.loadBlogs();
          this.showForm = false;
          this.previewImage = null;
        },
        error: (err) => console.log(err)
      });

    } else {

      this.http.post(
        'http://localhost:3000/api/blogs',
        blogData
      ).subscribe({
        next: () => {
          this.loadBlogs();
          this.showForm = false;
          this.previewImage = null;
        },
        error: (err) => console.log(err)
      });

    }
  }

  // ================= DELETE =================
  deleteBlog(id: string) {
    this.blogToDelete = id;
    this.showDeletePopup = true;
  }

  confirmDelete() {
    this.http.delete(`http://localhost:3000/api/blogs/${this.blogToDelete}`)
      .subscribe({
        next: () => {
          this.loadBlogs();
          this.showDeletePopup = false;
        },
        error: (err) => console.log(err)
      });
  }

  cancelDelete() {
    this.showDeletePopup = false;
  }

  // ================= SELECT =================
  toggleSelect(id: string, event: any) {
    if (event.target.checked) {
      if (!this.selectedBlogs.includes(id)) {
        this.selectedBlogs.push(id);
      }
    } else {
      this.selectedBlogs =
        this.selectedBlogs.filter(b => b !== id);
    }
  }

  toggleSelectAll(event: any) {
    if (event.target.checked) {
      this.selectedBlogs = this.blogs.map(b => b._id);
    } else {
      this.selectedBlogs = [];
    }
  }

  deleteSelected() {
    if (!confirm('Xóa các bài viết đã chọn?')) return;

    this.selectedBlogs.forEach(id => {
      this.http.delete(`http://localhost:3000/api/blogs/${id}`)
        .subscribe(() => {
          this.loadBlogs();
        });
    });

    this.selectedBlogs = [];
  }

  // ================= PAGINATION =================
  get paginatedBlogs() {
    const start = (this.currentPage - 1) * this.itemsPerPage;
    return this.blogs.slice(start, start + this.itemsPerPage);
  }

  get totalPages() {
    return Math.ceil(this.blogs.length / this.itemsPerPage);
  }

  changePage(page: number) {
    this.currentPage = page;
  }

  prevPage() {
    if (this.currentPage > 1) this.currentPage--;
  }

  nextPage() {
    if (this.currentPage < this.totalPages) this.currentPage++;
  }

  // ================= SEARCH =================
  filterBlogs() {
    const text = this.searchText.toLowerCase();

    this.blogs = this.allBlogs.filter(blog =>
      blog.title.toLowerCase().includes(text) ||
      blog.author.toLowerCase().includes(text)
    );

    this.currentPage = 1;
  }

  // ================= SORT =================
  sortDateAsc() {
    this.blogs = [...this.blogs].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
  }

  sortDateDesc() {
    this.blogs = [...this.blogs].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }

  // ================= FILTER =================
  filterByDate() {
    if (!this.selectedDate) return;

    this.blogs = this.allBlogs.filter(
      blog => blog.date === this.selectedDate
    );

    this.showDateFilter = false;
    this.currentPage = 1;
  }

  filterByYearRange() {
    if (!this.startYear || !this.endYear) return;

    this.blogs = this.allBlogs.filter(blog => {
      const year = new Date(blog.date).getFullYear();
      return year >= this.startYear && year <= this.endYear;
    });

    this.showYearFilter = false;
    this.currentPage = 1;
  }

  resetFilter() {
    this.blogs = [...this.allBlogs];
    this.searchText = '';
    this.currentPage = 1;
  }

  get startItem() {
    return (this.currentPage - 1) * this.itemsPerPage + 1;
  }

  get endItem() {
    const end = this.currentPage * this.itemsPerPage;
    return end > this.blogs.length ? this.blogs.length : end;
  }

  get visiblePages() {
    const maxPages = 5;

    let start = Math.max(this.currentPage - 2, 1);
    let end = start + maxPages - 1;

    if (end > this.totalPages) {
      end = this.totalPages;
      start = Math.max(end - maxPages + 1, 1);
    }

    return Array(end - start + 1)
      .fill(0)
      .map((_, i) => start + i);
  }

}